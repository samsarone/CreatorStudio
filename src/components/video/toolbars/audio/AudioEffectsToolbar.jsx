// AudioEffectsToolbar.js

import React, { useState } from 'react';
import {
  FaSave,
  FaMusic,
  FaSlidersH,
  FaWaveSquare,
  FaFilter,
  FaMicrophoneAlt,
  FaItalic,
  FaCompressAlt,
} from 'react-icons/fa';
import * as Tone from 'tone';

const AudioEffectsToolbar = ({ selectedAudioTrack, onSaveAudioEffects }) => {
  const [tempo, setTempo] = useState(1.0); // 1.0 is normal speed
  const [reverb, setReverb] = useState(0);
  const [echo, setEcho] = useState(0);
  const [lowPassCutoff, setLowPassCutoff] = useState(20000); // Max frequency
  const [distortion, setDistortion] = useState(0);
  const [detune, setDetune] = useState(0);
  const [chorusDepth, setChorusDepth] = useState(0);

  const handleSave = async () => {
    // Function to apply transformations and save audio
    // Process the audio using Tone.js and pass the processed audio back via onSaveAudioEffects

    // Prepare the audio processing chain
    const player = new Tone.Player(selectedAudioTrack.audioUrl).toDestination();

    // Tempo/Pitch Shift (Time Stretching)
    player.playbackRate = tempo;

    const effects = [];

    // Reverb
    if (reverb > 0) {
      const reverbEffect = new Tone.Reverb(reverb).toDestination();
      effects.push(reverbEffect);
    }

    // Echo/Delay
    if (echo > 0) {
      const delay = new Tone.FeedbackDelay(echo).toDestination();
      effects.push(delay);
    }

    // Low-Pass Filter
    if (lowPassCutoff < 20000) {
      const filter = new Tone.Filter(lowPassCutoff, 'lowpass').toDestination();
      effects.push(filter);
    }

    // Distortion
    if (distortion > 0) {
      const distortionEffect = new Tone.Distortion(distortion).toDestination();
      effects.push(distortionEffect);
    }

    // Pitch Correction/Detuning
    if (detune !== 0) {
      player.detune = detune;
    }

    // Chorus
    if (chorusDepth > 0) {
      const chorus = new Tone.Chorus(4, 2.5, chorusDepth).toDestination();
      effects.push(chorus);
    }

    // Connect effects in chain
    if (effects.length > 0) {
      player.chain(...effects, Tone.Destination);
    } else {
      player.connect(Tone.Destination);
    }

    // Render the processed audio
    await Tone.loaded();
    const duration = player.buffer.duration / tempo; // Adjusted duration

    // Start offline rendering
    const renderedBuffer = await Tone.Offline(() => {
      // Schedule the player
      player.start(0);
    }, duration);

    // Convert to blob
    const arrayBuffer = renderedBuffer.getChannelData(0).buffer;
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });

    // Pass the processed audio back to parent
    onSaveAudioEffects(audioBlob);
  };

  return (
    <div className='p-4 bg-[#0f1629] text-slate-100 border border-[#1f2a3d] rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.35)]'>
      <div className='flex items-center mb-4'>
        <FaMusic className='mr-2' />
        <h3 className='text-lg font-bold'>Audio Effects</h3>
      </div>
      <div className='grid grid-cols-2 gap-4'>
        {/* Tempo/Pitch Shift */}
        <div>
          <label className='flex items-center'>
            <FaSlidersH className='mr-2' />
            Tempo/Pitch Shift
          </label>
          <input
            type='range'
            min='0.5'
            max='1.5'
            step='0.01'
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Value: {tempo}</div>
        </div>
        {/* Reverb */}
        <div>
          <label className='flex items-center'>
            <FaWaveSquare className='mr-2' />
            Reverb
          </label>
          <input
            type='range'
            min='0'
            max='10'
            step='0.1'
            value={reverb}
            onChange={(e) => setReverb(parseFloat(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Value: {reverb}</div>
        </div>
        {/* Low-Pass Filter */}
        <div>
          <label className='flex items-center'>
            <FaFilter className='mr-2' />
            Low-Pass Filter
          </label>
          <input
            type='range'
            min='20'
            max='20000'
            step='1'
            value={lowPassCutoff}
            onChange={(e) => setLowPassCutoff(parseFloat(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Cutoff Frequency: {lowPassCutoff} Hz</div>
        </div>
        {/* Distortion */}
        <div>
          <label className='flex items-center'>
            <FaMicrophoneAlt className='mr-2' />
            Distortion
          </label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={distortion}
            onChange={(e) => setDistortion(parseFloat(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Value: {distortion}</div>
        </div>
        {/* Pitch Correction/Detuning */}
        <div>
          <label className='flex items-center'>
            <FaItalic className='mr-2' />
            Detune
          </label>
          <input
            type='range'
            min='-1200'
            max='1200'
            step='1'
            value={detune}
            onChange={(e) => setDetune(parseInt(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Value: {detune} cents</div>
        </div>
        {/* Chorus */}
        <div>
          <label className='flex items-center'>
            <FaCompressAlt className='mr-2' />
            Chorus
          </label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={chorusDepth}
            onChange={(e) => setChorusDepth(parseFloat(e.target.value))}
            className='w-full'
          />
          <div className='text-sm'>Depth: {chorusDepth}</div>
        </div>
      </div>
      <button
        onClick={handleSave}
        className='mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
      >
        <FaSave className='inline mr-2' />
        Save
      </button>
    </div>
  );
};

export default AudioEffectsToolbar;
