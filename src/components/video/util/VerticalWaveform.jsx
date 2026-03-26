import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useColorMode } from '../../../contexts/ColorMode.jsx';

const MIN_CANVAS_HEIGHT = 148;
const POINT_HIT_RADIUS = 14;
const PLOT_PADDING = {
  top: 24,
  right: 16,
  bottom: 24,
  left: 16,
};

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function resolveAudioEditorDuration(audioTrack = {}, audioBuffer = null) {
  const explicitDuration = Number(audioTrack?.duration);
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
    return explicitDuration;
  }

  return Number.isFinite(audioBuffer?.duration) ? audioBuffer.duration : 0;
}

function formatSecondsLabel(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0.0s';
  }

  if (numericValue < 10) {
    return `${numericValue.toFixed(1)}s`;
  }

  return `${numericValue.toFixed(0)}s`;
}

function resolvePlotRect(width, height) {
  const left = PLOT_PADDING.left;
  const top = PLOT_PADDING.top;
  const right = width - PLOT_PADDING.right;
  const bottom = height - PLOT_PADDING.bottom;

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function fillRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
  ctx.fill();
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
    return {
      peak: 0,
      rms: 0,
    };
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

function resolveWaveformBarFill(ctx, colorMode, plotRect) {
  const gradient = ctx.createLinearGradient(plotRect.left, plotRect.top, plotRect.right, plotRect.bottom);
  if (colorMode === 'light') {
    gradient.addColorStop(0, 'rgba(56,189,248,0.52)');
    gradient.addColorStop(0.5, 'rgba(37,99,235,0.82)');
    gradient.addColorStop(1, 'rgba(30,64,175,0.58)');
    return gradient;
  }

  gradient.addColorStop(0, 'rgba(56,189,248,0.52)');
  gradient.addColorStop(0.45, 'rgba(34,211,238,0.94)');
  gradient.addColorStop(1, 'rgba(14,165,233,0.66)');
  return gradient;
}

function resolveSpectrogramColor(intensity, colorMode) {
  const safeIntensity = clamp(intensity, 0, 1);
  if (colorMode === 'light') {
    const hue = 210 - (safeIntensity * 34);
    const saturation = 72 + (safeIntensity * 18);
    const lightness = 96 - (safeIntensity * 56);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  const hue = 204 - (safeIntensity * 22);
  const saturation = 72 + (safeIntensity * 14);
  const lightness = 8 + (safeIntensity * 58);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function drawEditorBackdrop({
  ctx,
  width,
  height,
  plotRect,
  colorMode,
  duration,
}) {
  const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
  if (colorMode === 'light') {
    backgroundGradient.addColorStop(0, '#f8fbff');
    backgroundGradient.addColorStop(1, '#edf6ff');
  } else {
    backgroundGradient.addColorStop(0, '#06101f');
    backgroundGradient.addColorStop(1, '#09182a');
  }

  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  const innerGradient = ctx.createLinearGradient(plotRect.left, plotRect.top, plotRect.right, plotRect.bottom);
  if (colorMode === 'light') {
    innerGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    innerGradient.addColorStop(1, 'rgba(219,234,254,0.68)');
  } else {
    innerGradient.addColorStop(0, 'rgba(15,23,42,0.82)');
    innerGradient.addColorStop(1, 'rgba(8,23,45,0.72)');
  }
  ctx.fillStyle = innerGradient;
  fillRoundedRect(ctx, 8, 8, width - 16, height - 16, 18);

  const verticalDivisions = Math.max(4, Math.min(8, Math.round(duration / 2) || 4));
  for (let index = 0; index <= verticalDivisions; index += 1) {
    const x = plotRect.left + ((index / verticalDivisions) * plotRect.width);
    ctx.strokeStyle = colorMode === 'light'
      ? (index % 2 === 0 ? 'rgba(59,130,246,0.16)' : 'rgba(148,163,184,0.12)')
      : (index % 2 === 0 ? 'rgba(34,211,238,0.16)' : 'rgba(71,85,105,0.18)');
    ctx.lineWidth = index % 2 === 0 ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x, plotRect.top);
    ctx.lineTo(x, plotRect.bottom);
    ctx.stroke();
  }

  for (let index = 0; index <= 4; index += 1) {
    const y = plotRect.top + ((index / 4) * plotRect.height);
    ctx.strokeStyle = colorMode === 'light'
      ? 'rgba(148,163,184,0.12)'
      : 'rgba(71,85,105,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotRect.left, y);
    ctx.lineTo(plotRect.right, y);
    ctx.stroke();
  }
}

function drawWaveform({
  ctx,
  plotRect,
  audioBuffer,
  audioStartSeconds,
  audioDurationSeconds,
  colorMode,
}) {
  const channelData = audioBuffer.getChannelData(0);
  const startSample = Math.max(0, Math.floor(audioStartSeconds * audioBuffer.sampleRate));
  const endSample = Math.min(
    channelData.length,
    Math.max(startSample + 1, Math.ceil((audioStartSeconds + audioDurationSeconds) * audioBuffer.sampleRate)),
  );
  const sliceLength = Math.max(1, endSample - startSample);
  const segmentCount = Math.max(64, Math.min(220, Math.floor(plotRect.width / 3.6)));
  const samplesPerSegment = Math.max(48, Math.floor(sliceLength / segmentCount));
  const barWidth = Math.max(1.8, (plotRect.width / segmentCount) * 0.76);
  const centerY = plotRect.top + (plotRect.height * 0.58);
  const maxAmplitudeHeight = plotRect.height * 0.34;

  ctx.fillStyle = resolveWaveformBarFill(ctx, colorMode, plotRect);
  ctx.shadowBlur = colorMode === 'light' ? 0 : 10;
  ctx.shadowColor = colorMode === 'light' ? 'transparent' : 'rgba(34,211,238,0.28)';

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const windowStartIndex = startSample + Math.floor((segmentIndex / segmentCount) * sliceLength);
    const windowEndIndex = Math.min(endSample, windowStartIndex + samplesPerSegment);
    const { peak, rms } = getWindowMetrics(channelData, windowStartIndex, windowEndIndex);
    const normalizedAmplitude = Math.pow(Math.max(peak, rms * 1.45), 0.78);
    const barHeight = clamp(normalizedAmplitude * maxAmplitudeHeight, 3, maxAmplitudeHeight);
    const x = plotRect.left + ((segmentIndex + 0.5) / segmentCount) * plotRect.width;
    const y = centerY - barHeight;

    fillRoundedRect(ctx, x - (barWidth / 2), y, barWidth, barHeight * 2, Math.min(4, barWidth / 2));
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = colorMode === 'light' ? 'rgba(30,64,175,0.16)' : 'rgba(125,211,252,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotRect.left, centerY);
  ctx.lineTo(plotRect.right, centerY);
  ctx.stroke();
}

function drawSpectrogram({
  ctx,
  plotRect,
  audioBuffer,
  audioStartSeconds,
  audioDurationSeconds,
  colorMode,
}) {
  const channelData = audioBuffer.getChannelData(0);
  const startSample = Math.max(0, Math.floor(audioStartSeconds * audioBuffer.sampleRate));
  const endSample = Math.min(
    channelData.length,
    Math.max(startSample + 1, Math.ceil((audioStartSeconds + audioDurationSeconds) * audioBuffer.sampleRate)),
  );
  const sliceLength = Math.max(1, endSample - startSample);
  const sliceCount = Math.max(56, Math.min(180, Math.floor(plotRect.width / 3.2)));
  const binCount = Math.max(18, Math.min(42, Math.floor(plotRect.height / 3.4)));
  const sliceWidth = plotRect.width / sliceCount;
  const binHeight = plotRect.height / binCount;
  const windowSize = 128;

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex += 1) {
    const centerIndex = startSample + Math.floor((sliceIndex / sliceCount) * sliceLength);
    const spectrum = getSpectrogramWindow(channelData, centerIndex, windowSize, binCount);
    const maxValue = Math.max(...spectrum, 0.0001);

    spectrum.forEach((value, binIndex) => {
      const intensity = Math.pow(value / maxValue, 0.58);
      ctx.fillStyle = resolveSpectrogramColor(intensity, colorMode);
      ctx.fillRect(
        plotRect.left + (sliceIndex * sliceWidth),
        plotRect.bottom - ((binIndex + 1) * binHeight),
        Math.max(1, sliceWidth + 0.5),
        Math.max(1, binHeight + 0.5),
      );
    });
  }
}

function getPointMetrics(points = [], plotRect, duration, volumeScaleMax) {
  const safeDuration = Math.max(duration, 0.0001);
  const safeVolumeScaleMax = Math.max(volumeScaleMax, 1);

  return points.map((point) => ({
    ...point,
    x: plotRect.left + (clamp(Number(point.time), 0, safeDuration) / safeDuration) * plotRect.width,
    y: plotRect.bottom - (clamp(Number(point.volume), 0, safeVolumeScaleMax) / safeVolumeScaleMax) * plotRect.height,
  }));
}

function drawVolumeAutomation({
  ctx,
  points,
  selectedPointId,
  colorMode,
  plotRect,
}) {
  if (!Array.isArray(points) || points.length === 0) {
    return;
  }

  const automationColor = colorMode === 'light' ? '#1d4ed8' : '#67e8f9';
  const automationGlowColor = colorMode === 'light' ? 'rgba(37,99,235,0.18)' : 'rgba(103,232,249,0.24)';
  const accentColor = colorMode === 'light' ? '#ffffff' : '#06101f';
  const selectedColor = colorMode === 'light' ? '#0f172a' : '#f8fafc';

  ctx.save();
  ctx.strokeStyle = automationColor;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = automationGlowColor;
  ctx.beginPath();
  points.forEach((point, pointIndex) => {
    if (pointIndex === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }

    ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();

  const selectedPoint = points.find((point) => point.id === selectedPointId);
  if (selectedPoint) {
    ctx.strokeStyle = colorMode === 'light' ? 'rgba(29,78,216,0.18)' : 'rgba(103,232,249,0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(selectedPoint.x, plotRect.top);
    ctx.lineTo(selectedPoint.x, plotRect.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  points.forEach((point) => {
    const size = point.id === selectedPointId ? 7.5 : 6;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = point.id === selectedPointId ? selectedColor : automationColor;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  });
}

export default function VerticalWaveform({
  audioUrl,
  audioTrack = null,
  visualizationMode = 'waveform',
  volumeAutomationPoints = [],
  selectedVolumePointId = null,
  manualVolumeAdjustmentEnabled = false,
  onSelectVolumePoint,
  onCreateVolumePoint,
}) {
  const canvasRef = useRef(null);
  const parentRef = useRef(null);
  const { colorMode } = useColorMode();
  const [audioBuffer, setAudioBuffer] = useState(null);

  const editorDuration = resolveAudioEditorDuration(audioTrack, audioBuffer);
  const audioWindowStartSeconds = Number.isFinite(Number(audioTrack?.sourceTrimStartTime))
    ? Math.max(0, Number(audioTrack.sourceTrimStartTime))
    : 0;
  const audioWindowDurationSeconds = audioBuffer
    ? Math.max(0.0001, Math.min(editorDuration || audioBuffer.duration, Math.max(0, audioBuffer.duration - audioWindowStartSeconds)))
    : Math.max(0.0001, editorDuration);
  const volumeScaleMax = Math.max(
    100,
    Number(audioTrack?.volume) || 0,
    ...volumeAutomationPoints.map((point) => Number(point?.volume) || 0),
  );
  const trackLabel = audioTrack?.prompt || audioTrack?.generationType || 'Audio';

  useEffect(() => {
    if (!audioUrl) {
      setAudioBuffer(null);
      return undefined;
    }

    let isDisposed = false;
    const abortController = new AbortController();

    const fetchAudioBuffer = async () => {
      let audioContext;

      try {
        const { data } = await axios.get(audioUrl, {
          responseType: 'arraybuffer',
          signal: abortController.signal,
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decodedBuffer = await audioContext.decodeAudioData(data.slice(0));

        if (!isDisposed) {
          setAudioBuffer(decodedBuffer);
        }
      } catch {
        if (!abortController.signal.aborted && !isDisposed) {
          setAudioBuffer(null);
        }
      } finally {
        if (audioContext && typeof audioContext.close === 'function') {
          audioContext.close().catch(() => {});
        }
      }
    };

    fetchAudioBuffer();

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;
    if (!canvas || !parent) {
      return undefined;
    }

    const renderCanvas = () => {
      const width = Math.max(240, parent.clientWidth || 240);
      const height = Math.max(MIN_CANVAS_HEIGHT, parent.clientHeight || MIN_CANVAS_HEIGHT);
      const devicePixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      const plotRect = resolvePlotRect(width, height);
      drawEditorBackdrop({
        ctx,
        width,
        height,
        plotRect,
        colorMode,
        duration: editorDuration,
      });

      if (!audioBuffer) {
        ctx.fillStyle = colorMode === 'light' ? 'rgba(15,23,42,0.56)' : 'rgba(226,232,240,0.72)';
        ctx.font = '500 12px sans-serif';
        ctx.fillText('Audio preview unavailable', plotRect.left, plotRect.top + 14);
        return;
      }

      if (visualizationMode === 'spectrogram') {
        drawSpectrogram({
          ctx,
          plotRect,
          audioBuffer,
          audioStartSeconds: audioWindowStartSeconds,
          audioDurationSeconds: audioWindowDurationSeconds,
          colorMode,
        });
      } else {
        drawWaveform({
          ctx,
          plotRect,
          audioBuffer,
          audioStartSeconds: audioWindowStartSeconds,
          audioDurationSeconds: audioWindowDurationSeconds,
          colorMode,
        });
      }

      const pointMetrics = getPointMetrics(
        volumeAutomationPoints,
        plotRect,
        editorDuration,
        volumeScaleMax,
      );

      if (manualVolumeAdjustmentEnabled && pointMetrics.length > 0) {
        drawVolumeAutomation({
          ctx,
          points: pointMetrics,
          selectedPointId: selectedVolumePointId,
          colorMode,
          plotRect,
        });
      }
    };

    renderCanvas();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', renderCanvas);
      return () => {
        window.removeEventListener('resize', renderCanvas);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      renderCanvas();
    });
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    audioBuffer,
    colorMode,
    editorDuration,
    audioWindowDurationSeconds,
    audioWindowStartSeconds,
    manualVolumeAdjustmentEnabled,
    selectedVolumePointId,
    visualizationMode,
    volumeAutomationPoints,
    volumeScaleMax,
  ]);

  const handleCanvasClick = (event) => {
    if (!manualVolumeAdjustmentEnabled || !canvasRef.current || !editorDuration) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const plotRect = resolvePlotRect(rect.width, rect.height);

    const interactivePointMetrics = getPointMetrics(
      volumeAutomationPoints,
      plotRect,
      editorDuration,
      volumeScaleMax,
    );

    const existingPoint = interactivePointMetrics.find((point) => {
      const deltaX = point.x - x;
      const deltaY = point.y - y;
      return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)) <= POINT_HIT_RADIUS;
    });

    if (existingPoint) {
      onSelectVolumePoint?.(existingPoint.id);
      return;
    }

    const normalizedTime = clamp(
      ((x - plotRect.left) / Math.max(plotRect.width, 1)) * editorDuration,
      0,
      editorDuration,
    );
    onCreateVolumePoint?.(normalizedTime);
  };

  return (
    <div
      ref={parentRef}
      className={`relative h-full min-h-[148px] w-full overflow-hidden rounded-[22px] border shadow-[0_16px_36px_rgba(2,6,23,0.14)] ${
        colorMode === 'dark'
          ? 'border-[#17304d] bg-[#07111f]'
          : 'border-[#dbeafe] bg-[#f6fbff]'
      }`}
      title={`${trackLabel} visualization`}
    >
      <canvas
        ref={canvasRef}
        className={`h-full w-full ${manualVolumeAdjustmentEnabled ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleCanvasClick}
      />

      <div className={`pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
        colorMode === 'dark'
          ? 'bg-[#0f172a]/88 text-slate-200'
          : 'bg-white/90 text-slate-600'
      }`}>
        <span>{visualizationMode === 'spectrogram' ? 'Spectrogram' : 'Waveform'}</span>
        <span className={colorMode === 'dark' ? 'text-cyan-300/80' : 'text-sky-600/80'}>{formatSecondsLabel(editorDuration)}</span>
      </div>

      <div className={`pointer-events-none absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] ${
        colorMode === 'dark'
          ? 'bg-[#0f172a]/82 text-slate-300'
          : 'bg-white/88 text-slate-500'
      }`}>
        trim {formatSecondsLabel(audioWindowStartSeconds)}
      </div>

      <div className={`pointer-events-none absolute bottom-3 left-3 rounded-full px-3 py-1 text-[10px] ${
        colorMode === 'dark'
          ? 'bg-[#0f172a]/82 text-slate-300'
          : 'bg-white/88 text-slate-500'
      }`}>
        {trackLabel}
      </div>

      <div className={`pointer-events-none absolute bottom-3 right-3 rounded-full px-3 py-1 text-[10px] ${
        colorMode === 'dark'
          ? 'bg-[#0f172a]/82 text-cyan-200'
          : 'bg-white/90 text-sky-700'
      }`}>
        {manualVolumeAdjustmentEnabled ? 'Click the lane to add or select fade diamonds' : 'Enable manual fade to place diamonds'}
      </div>
    </div>
  );
}
