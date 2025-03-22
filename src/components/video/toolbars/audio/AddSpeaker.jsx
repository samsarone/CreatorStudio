import React, { useState } from 'react';
import CommonButton from '../../../common/CommonButton.tsx';
// Import your SpeechProviderSelect just like in DefaultSpeechProviderSelect:
import SpeechProviderSelect from './SpeechProviderSelect.jsx';

export default function AddSpeaker(props) {
  const {
    onAddNewSpeaker,
    onCancel,
    existingSpeakers,
    bgColor,
    text2Color,
    // Optional extras:
    playMusicPreviewForSpeaker,
    currentlyPlayingSpeaker,
    colorMode,
  } = props;

  const [speakerName, setSpeakerName] = useState('');
  const [error, setError] = useState('');


  const [ttsProvider, setTtsProvider] = useState({ value: 'OPENAI', label: 'OpenAI' });


  const [speakerType, setSpeakerType] = useState(null);

  /** Called by <SpeechProviderSelect/> when TTS provider changes */
  const handleTtsProviderChange = (selectedOption) => {
    setTtsProvider(selectedOption);
    // Reset speaker when provider changes
    setSpeakerType(null);
  };

  /** Called by <SpeechProviderSelect/> when speaker/voice changes */
  const handleSpeakerChange = (selectedOption) => {
    setTtsProvider(selectedOption.provider);
    setSpeakerType(selectedOption);
  };

  const handleSave = async () => {
    // 1) Basic validations
    if (!speakerName.trim()) {
      setError('Please enter a speaker name.');
      return;
    }
    if (existingSpeakers.some(s => s.toLowerCase() === speakerName.toLowerCase())) {
      setError('Speaker name already exists.');
      return;
    }
    if (!ttsProvider) {
      setError('Please select a TTS Provider.');
      return;
    }
    if (!speakerType) {
      setError('Please select a speaker/voice.');
      return;
    }

    setError('');

    // 2) Build your new speaker object. Adjust keys as needed:
    const newSpeaker = {
      speaker: speakerType.value,      // internal ID or short name
      actor: speakerName,        // display name in your UI
      speakerCharacterName: speakerName,
      subType: 'character',
      provider: ttsProvider,     // e.g. 'OPENAI','ELEVEN','AZURE', etc.
    };

    onAddNewSpeaker(newSpeaker);
  };

  return (
    <div className={`border p-2 mt-3 rounded ${bgColor} ${text2Color}`}>


      {error && <div className="text-red-500 text-xs mt-1 mb-2">{error}</div>}

      {/* Speaker name field */}
      <div className="mb-2">
        <label className="block text-xs mb-1">New Speaker Name</label>
        <input
          type="text"
          className={`w-full p-1 rounded border border-slate-300 ${bgColor} ${text2Color}`}
          value={speakerName}
          onChange={(e) => setSpeakerName(e.target.value)}
        />

      </div>

      {/* Reuse the same <SpeechProviderSelect> from DefaultSpeechProviderSelect */}
      <div className="mb-2">
        <label className="block text-xs mb-1">Voice Option</label>
        <SpeechProviderSelect
          ttsProvider={ttsProvider}
          onTtsProviderChange={handleTtsProviderChange}
          speakerType={speakerType}
          onSpeakerChange={handleSpeakerChange}
          playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
          currentlyPlayingSpeaker={currentlyPlayingSpeaker}
          colorMode={colorMode}
        />
      </div>

      <div className="flex justify-end space-x-2 mt-3">
        <CommonButton type="button" onClick={onCancel}>
          Back
        </CommonButton>
        <CommonButton type="button" onClick={handleSave}>
          Save
        </CommonButton>
      </div>
    </div>
  );
}
