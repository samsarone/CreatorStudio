import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useColorMode } from '../../../contexts/ColorMode.jsx';

const POINT_HIT_RADIUS = 12;
const AUDIO_BUFFER_CACHE = new Map();

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

async function loadDecodedAudioBuffer(audioUrl) {
  if (!audioUrl) {
    return null;
  }

  const cachedValue = AUDIO_BUFFER_CACHE.get(audioUrl);
  if (cachedValue) {
    return cachedValue;
  }

  const bufferPromise = (async () => {
    let audioContext;

    try {
      const { data } = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
      });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return await audioContext.decodeAudioData(data.slice(0));
    } finally {
      if (audioContext && typeof audioContext.close === 'function') {
        audioContext.close().catch(() => {});
      }
    }
  })();

  AUDIO_BUFFER_CACHE.set(audioUrl, bufferPromise);

  try {
    return await bufferPromise;
  } catch (error) {
    AUDIO_BUFFER_CACHE.delete(audioUrl);
    throw error;
  }
}

function getWindowMetrics(channelData, startIndex, endIndex) {
  let peak = 0;
  let totalPower = 0;
  let sampleCount = 0;

  for (let index = startIndex; index < endIndex; index += 1) {
    const sample = channelData[index] || 0;
    const absoluteSample = Math.abs(sample);
    peak = Math.max(peak, absoluteSample);
    totalPower += sample * sample;
    sampleCount += 1;
  }

  if (sampleCount === 0) {
    return { peak: 0, rms: 0 };
  }

  return {
    peak,
    rms: Math.sqrt(totalPower / sampleCount),
  };
}

function getSpectrogramWindow(channelData, centerIndex, windowSize, binCount) {
  const halfWindow = Math.floor(windowSize / 2);
  const spectrum = new Array(binCount).fill(0);

  for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
    let real = 0;
    let imaginary = 0;

    for (let sampleIndex = 0; sampleIndex < windowSize; sampleIndex += 1) {
      const sourceIndex = clamp(centerIndex - halfWindow + sampleIndex, 0, channelData.length - 1);
      const windowWeight = 0.5 - (0.5 * Math.cos((2 * Math.PI * sampleIndex) / Math.max(windowSize - 1, 1)));
      const sample = (channelData[sourceIndex] || 0) * windowWeight;
      const angle = (2 * Math.PI * binIndex * sampleIndex) / windowSize;
      real += sample * Math.cos(angle);
      imaginary -= sample * Math.sin(angle);
    }

    spectrum[binIndex] = Math.sqrt((real * real) + (imaginary * imaginary)) / windowSize;
  }

  return spectrum;
}

function getSpectrogramColor(intensity, colorMode) {
  const safeIntensity = clamp(intensity, 0, 1);

  if (colorMode === 'light') {
    const hue = 206 - (safeIntensity * 24);
    const saturation = 78 + (safeIntensity * 12);
    const lightness = 94 - (safeIntensity * 54);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  const hue = 196 - (safeIntensity * 22);
  const saturation = 78 + (safeIntensity * 10);
  const lightness = 12 + (safeIntensity * 54);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getPointMetrics(points, width, height, visibleLayerStartSeconds, visibleLayerDurationSeconds, volumeScaleMax) {
  const safeDuration = Math.max(visibleLayerDurationSeconds, 0.0001);
  const drawableWidth = Math.max(6, width - 4);
  const safeVolumeScaleMax = Math.max(volumeScaleMax, 1);

  return points
    .filter((point) => {
      const time = Number(point?.time);
      return Number.isFinite(time)
        && time >= visibleLayerStartSeconds - 0.0001
        && time <= visibleLayerStartSeconds + visibleLayerDurationSeconds + 0.0001;
    })
    .map((point) => ({
      ...point,
      x: 2 + (clamp(Number(point.volume), 0, safeVolumeScaleMax) / safeVolumeScaleMax) * drawableWidth,
      y: clamp(((Number(point.time) - visibleLayerStartSeconds) / safeDuration) * height, 0, height),
    }));
}

function drawWaveform({
  ctx,
  width,
  height,
  audioBuffer,
  sourceWindowStartSeconds,
  sourceWindowDurationSeconds,
  colorMode,
}) {
  const channelData = audioBuffer.getChannelData(0);
  const startSample = Math.max(0, Math.floor(sourceWindowStartSeconds * audioBuffer.sampleRate));
  const endSample = Math.min(
    channelData.length,
    Math.max(startSample + 1, Math.ceil((sourceWindowStartSeconds + sourceWindowDurationSeconds) * audioBuffer.sampleRate)),
  );
  const sliceLength = Math.max(1, endSample - startSample);
  const rowCount = Math.max(18, Math.min(220, Math.floor(height)));
  const samplesPerRow = Math.max(32, Math.floor(sliceLength / rowCount));
  const centerX = width / 2;
  const maxHalfWidth = Math.max(3, (width / 2) - 1.5);

  ctx.strokeStyle = colorMode === 'light' ? 'rgba(37,99,235,0.16)' : 'rgba(103,232,249,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const windowStartIndex = startSample + Math.floor((rowIndex / rowCount) * sliceLength);
    const windowEndIndex = Math.min(endSample, windowStartIndex + samplesPerRow);
    const { peak, rms } = getWindowMetrics(channelData, windowStartIndex, windowEndIndex);
    const barWidth = clamp(Math.max(peak, rms * 1.45) * maxHalfWidth, 1.5, maxHalfWidth);
    const barHeight = Math.max(1.2, height / rowCount);
    const y = rowIndex * barHeight;

    ctx.fillStyle = colorMode === 'light'
      ? `rgba(37,99,235,${clamp(0.22 + (rms * 0.64), 0.22, 0.88)})`
      : `rgba(56,189,248,${clamp(0.26 + (rms * 0.7), 0.26, 0.94)})`;
    ctx.fillRect(centerX - barWidth, y, barWidth * 2, Math.max(1.4, barHeight - 0.35));
  }
}

function drawSpectrogram({
  ctx,
  width,
  height,
  audioBuffer,
  sourceWindowStartSeconds,
  sourceWindowDurationSeconds,
  colorMode,
}) {
  const channelData = audioBuffer.getChannelData(0);
  const startSample = Math.max(0, Math.floor(sourceWindowStartSeconds * audioBuffer.sampleRate));
  const endSample = Math.min(
    channelData.length,
    Math.max(startSample + 1, Math.ceil((sourceWindowStartSeconds + sourceWindowDurationSeconds) * audioBuffer.sampleRate)),
  );
  const sliceLength = Math.max(1, endSample - startSample);
  const sliceCount = Math.max(18, Math.min(220, Math.floor(height)));
  const binCount = Math.max(5, Math.min(12, Math.floor(width / 2)));
  const rowHeight = height / sliceCount;
  const binWidth = width / binCount;
  const windowSize = 96;

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex += 1) {
    const centerIndex = startSample + Math.floor((sliceIndex / sliceCount) * sliceLength);
    const spectrum = getSpectrogramWindow(channelData, centerIndex, windowSize, binCount);
    const maxValue = Math.max(...spectrum, 0.0001);

    spectrum.forEach((value, binIndex) => {
      const intensity = Math.pow(value / maxValue, 0.6);
      ctx.fillStyle = getSpectrogramColor(intensity, colorMode);
      ctx.fillRect(
        binIndex * binWidth,
        sliceIndex * rowHeight,
        Math.max(1, binWidth + 0.3),
        Math.max(1, rowHeight + 0.3),
      );
    });
  }
}

function drawAutomation(ctx, pointMetrics, selectedPointId, colorMode) {
  if (!pointMetrics.length) {
    return;
  }

  const lineColor = colorMode === 'light' ? '#1d4ed8' : '#67e8f9';
  const selectedColor = colorMode === 'light' ? '#0f172a' : '#f8fafc';
  const borderColor = colorMode === 'light' ? '#ffffff' : '#081120';

  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = colorMode === 'light' ? 0 : 8;
  ctx.shadowColor = colorMode === 'light' ? 'transparent' : 'rgba(103,232,249,0.28)';
  ctx.beginPath();
  pointMetrics.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();

  pointMetrics.forEach((point) => {
    const size = point.id === selectedPointId ? 5.4 : 4.3;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = point.id === selectedPointId ? selectedColor : lineColor;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  });
}

export default function AudioTrackWaveformOverlay({
  audioUrl,
  visualizationMode = 'waveform',
  manualVolumeAdjustmentEnabled = false,
  volumeAutomationPoints = [],
  selectedVolumePointId = null,
  onSelectVolumePoint,
  onCreateVolumePoint,
  onActivate,
  trackDurationSeconds = 0,
  visibleLayerStartSeconds = 0,
  visibleLayerDurationSeconds = 0,
  sourceWindowStartSeconds = 0,
  sourceWindowDurationSeconds = 0,
  volumeScaleMax = 100,
  isSelected = false,
}) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const { colorMode } = useColorMode();
  const [audioBuffer, setAudioBuffer] = useState(null);

  useEffect(() => {
    if (!audioUrl) {
      setAudioBuffer(null);
      return undefined;
    }

    let isDisposed = false;

    loadDecodedAudioBuffer(audioUrl)
      .then((nextAudioBuffer) => {
        if (!isDisposed) {
          setAudioBuffer(nextAudioBuffer || null);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setAudioBuffer(null);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) {
      return undefined;
    }

    const renderCanvas = () => {
      const width = Math.max(12, host.clientWidth || 12);
      const height = Math.max(8, host.clientHeight || 8);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const overlayBackground = ctx.createLinearGradient(0, 0, width, height);
      if (colorMode === 'light') {
        overlayBackground.addColorStop(0, isSelected ? 'rgba(224,231,255,0.84)' : 'rgba(255,255,255,0.72)');
        overlayBackground.addColorStop(1, isSelected ? 'rgba(191,219,254,0.76)' : 'rgba(226,232,240,0.62)');
      } else {
        overlayBackground.addColorStop(0, isSelected ? 'rgba(30,41,59,0.88)' : 'rgba(15,23,42,0.74)');
        overlayBackground.addColorStop(1, isSelected ? 'rgba(15,23,42,0.96)' : 'rgba(15,23,42,0.82)');
      }
      ctx.fillStyle = overlayBackground;
      ctx.fillRect(0, 0, width, height);

      if (audioBuffer && sourceWindowDurationSeconds > 0.0001) {
        if (visualizationMode === 'spectrogram') {
          drawSpectrogram({
            ctx,
            width,
            height,
            audioBuffer,
            sourceWindowStartSeconds,
            sourceWindowDurationSeconds,
            colorMode,
          });
        } else {
          drawWaveform({
            ctx,
            width,
            height,
            audioBuffer,
            sourceWindowStartSeconds,
            sourceWindowDurationSeconds,
            colorMode,
          });
        }
      }

      if (manualVolumeAdjustmentEnabled) {
        const pointMetrics = getPointMetrics(
          volumeAutomationPoints,
          width,
          height,
          visibleLayerStartSeconds,
          visibleLayerDurationSeconds,
          volumeScaleMax,
        );
        drawAutomation(ctx, pointMetrics, selectedVolumePointId, colorMode);
      }
    };

    renderCanvas();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', renderCanvas);
      return () => {
        window.removeEventListener('resize', renderCanvas);
      };
    }

    const resizeObserver = new ResizeObserver(renderCanvas);
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    audioBuffer,
    colorMode,
    isSelected,
    manualVolumeAdjustmentEnabled,
    selectedVolumePointId,
    sourceWindowDurationSeconds,
    sourceWindowStartSeconds,
    trackDurationSeconds,
    visibleLayerDurationSeconds,
    visibleLayerStartSeconds,
    visualizationMode,
    volumeAutomationPoints,
    volumeScaleMax,
  ]);

  const handleClick = (event) => {
    onActivate?.();

    if (!manualVolumeAdjustmentEnabled || !canvasRef.current || visibleLayerDurationSeconds <= 0.0001) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const pointMetrics = getPointMetrics(
      volumeAutomationPoints,
      rect.width,
      rect.height,
      visibleLayerStartSeconds,
      visibleLayerDurationSeconds,
      volumeScaleMax,
    );

    const existingPoint = pointMetrics.find((point) => {
      const deltaX = point.x - clickX;
      const deltaY = point.y - clickY;
      return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)) <= POINT_HIT_RADIUS;
    });

    if (existingPoint) {
      onSelectVolumePoint?.(existingPoint.id);
      return;
    }

    const nextPointTime = visibleLayerStartSeconds + clamp(
      (clickY / Math.max(rect.height, 1)) * visibleLayerDurationSeconds,
      0,
      visibleLayerDurationSeconds,
    );
    onCreateVolumePoint?.(nextPointTime);
  };

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden rounded-full">
      <canvas
        ref={canvasRef}
        className={`h-full w-full ${manualVolumeAdjustmentEnabled ? 'cursor-crosshair' : 'cursor-pointer'}`}
        onClick={handleClick}
      />
    </div>
  );
}
