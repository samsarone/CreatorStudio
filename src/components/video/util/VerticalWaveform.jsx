import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useColorMode } from '../../../contexts/ColorMode';
import { useDebounce } from 'use-debounce';

const VerticalWaveform = ({ audioUrl, totalDuration, viewRange }) => {
  const canvasRef = useRef(null);
  const parentRef = useRef(null);
  const { colorMode } = useColorMode();

  const graphColor = colorMode === 'light' ? '#2563eb' : '#f8fafc';
  const backgroundShade = colorMode === 'light' ? '#f8fafc' : '#020617';

  // Debounce viewRange
  const [debouncedViewRange] = useDebounce(viewRange, 200); // Debounce delay in milliseconds

  useEffect(() => {
    const fetchAndDrawAudio = async () => {
      const { data } = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.decodeAudioData(data, (buffer) => {
        drawWaveform(buffer);
      });
    };

    const drawWaveform = (audioBuffer) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const parentHeight = parentRef.current.clientHeight;
      canvas.width = parentRef.current.clientWidth;
      canvas.height = parentHeight;

      const { width, height } = canvas;

      const sampleRate = audioBuffer.sampleRate;
      const [viewStart, viewEnd] = debouncedViewRange.map(v => v / 30); // Use debounced viewRange
      const startSample = Math.floor(viewStart * sampleRate);
      const endSample = Math.min(audioBuffer.length, Math.ceil(viewEnd * sampleRate));
      const channelData = audioBuffer.getChannelData(0).slice(startSample, endSample);

      ctx.fillStyle = backgroundShade;
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1;
      ctx.strokeStyle = graphColor;

      ctx.beginPath();
      const step = channelData.length / height;

      for (let i = 0; i < height; i++) {
        const amplitude = channelData[Math.floor(i * step)];
        const x = amplitude * width / 2 + width / 2;
        const y = height - i;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    fetchAndDrawAudio();
  }, [audioUrl, totalDuration, debouncedViewRange]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const parent = parentRef.current;
      canvas.height = parent.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div
      ref={parentRef}
      className={`h-[82vh] w-full relative rounded-xl overflow-hidden shadow-sm ${
        colorMode === 'dark'
          ? 'bg-[#0f1629] border border-[#1f2a3d]'
          : 'bg-slate-50 border border-slate-200'
      }`}
    >
      <canvas ref={canvasRef} width="120" />
    </div>
  );
};

export default VerticalWaveform;
