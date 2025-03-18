// VolumeEnvelopeTrack.js
import React, { useRef, useEffect } from 'react';

export default function VolumeEnvelopeTrack({ audioLayer, onVolumeEnvelopeChange, totalDuration }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Initialize canvas drawing here...
  }, [audioLayer.volumeEnvelope]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = (x / canvas.width) * totalDuration;
    const volume = 1 - y / canvas.height;

    // Update the volumeEnvelope with the new point
    const newVolumeEnvelope = [...audioLayer.volumeEnvelope, { time, volume }];
    // Sort the envelope points by time
    newVolumeEnvelope.sort((a, b) => a.time - b.time);

    onVolumeEnvelopeChange(newVolumeEnvelope);
  };

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={50}
      onClick={handleCanvasClick}
      style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
    ></canvas>
  );
}

