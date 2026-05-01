import React, { useState } from 'react';
import CommonButton from '../../../common/CommonButton.tsx';
import SingleSelect from '../../../common/SingleSelect.jsx';
import SpeechProviderSelect from './SpeechProviderSelect.jsx';

const TTS_PROVIDER_OPTIONS = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ELEVENLABS', label: 'ElevenLabs' },
];

export default function AddSpeaker(props) {
  const {
    onAddNewSpeaker,
    onCancel,
    existingSpeakers = [],
    bgColor,
    text2Color,
    // Optional extras:
    playMusicPreviewForSpeaker,
    currentlyPlayingSpeaker,
    colorMode,
    sizeVariant = "default",
  } = props;
  const isSidebarPanel =
    sizeVariant === "sidebarCollapsed" || sizeVariant === "sidebarExpanded";

  const [speakerName, setSpeakerName] = useState('');
  const [error, setError] = useState('');


  const [ttsProvider, setTtsProvider] = useState(TTS_PROVIDER_OPTIONS[0]);


  const [speakerType, setSpeakerType] = useState(null);
  const isSidebarCollapsed = sizeVariant === "sidebarCollapsed";
  const panelClass = isSidebarPanel
    ? `mt-3 rounded-lg ${bgColor} p-3 ${text2Color}`
    : `mt-3 rounded-lg border p-3 ${bgColor} ${text2Color}`;
  const fieldLabelClass = `mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] ${text2Color}`;
  const inputClass = `w-full rounded-lg ${bgColor} ${text2Color} px-3 py-2 text-sm leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20`;
  const sidebarButtonClass = isSidebarPanel
    ? '!m-0 !min-h-[38px] !w-full !px-4 !py-2 text-xs'
    : '!m-0 !min-h-[38px] !px-4 !py-2 text-xs';
  const providerValue = ttsProvider?.value || 'OPENAI';

  const handleTtsProviderChange = (selectedOption) => {
    setTtsProvider(selectedOption || TTS_PROVIDER_OPTIONS[0]);
    setSpeakerType(null);
  };

  const handleSpeakerChange = (selectedOption) => {
    setSpeakerType(selectedOption);
  };

  const handleSave = async () => {
    const normalizedSpeakerName = speakerName.trim();

    if (!normalizedSpeakerName) {
      setError('Please enter a speaker name.');
      return;
    }
    if (existingSpeakers.some(s => s.toLowerCase() === normalizedSpeakerName.toLowerCase())) {
      setError('Speaker name already exists.');
      return;
    }
    if (!providerValue) {
      setError('Please select a TTS Provider.');
      return;
    }
    if (!speakerType) {
      setError('Please select a speaker/voice.');
      return;
    }

    setError('');

    const newSpeaker = {
      speaker: speakerType.value,
      actor: normalizedSpeakerName,
      speakerCharacterName: normalizedSpeakerName,
      subType: 'character',
      provider: speakerType.provider || providerValue,
    };

    onAddNewSpeaker(newSpeaker);
  };

  return (
    <div className={panelClass}>


      {error && <div className="text-red-500 text-xs mt-1 mb-2">{error}</div>}

      <div className="mb-3">
        <label className={fieldLabelClass}>Speaker name</label>
        <input
          type="text"
          className={inputClass}
          value={speakerName}
          onChange={(e) => setSpeakerName(e.target.value)}
          placeholder="Character name"
        />

      </div>

      <div className="mb-3">
        <label className={fieldLabelClass}>Provider</label>
        <SingleSelect
          name="ttsProvider"
          options={TTS_PROVIDER_OPTIONS}
          value={ttsProvider}
          onChange={handleTtsProviderChange}
          isSearchable={false}
          truncateLabels={isSidebarCollapsed}
        />
      </div>

      <div className="mb-2">
        <label className={fieldLabelClass}>Voice</label>
        <SpeechProviderSelect
          name="speakerVoice"
          placeholder={`Select ${ttsProvider?.label || 'provider'} voice...`}
          speakerType={speakerType}
          onSpeakerChange={handleSpeakerChange}
          playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
          currentlyPlayingSpeaker={currentlyPlayingSpeaker}
          colorMode={colorMode}
          compactLayout={!isSidebarCollapsed && isSidebarPanel}
          truncateLabels={isSidebarCollapsed}
          providerFilter={providerValue}
          showProviderLabel={false}
        />
      </div>

      <div className={`mt-3 ${isSidebarPanel ? 'grid grid-cols-1 gap-2' : 'flex justify-end space-x-2'}`}>
        <CommonButton
          type="button"
          onClick={onCancel}
          extraClasses={sidebarButtonClass}
        >
          Back
        </CommonButton>
        <CommonButton
          type="button"
          onClick={handleSave}
          extraClasses={sidebarButtonClass}
        >
          Save
        </CommonButton>
      </div>
    </div>
  );
}
