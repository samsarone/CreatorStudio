import React, { useState } from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import SingleSelect from '../../../common/SingleSelect.jsx'; // <-- Update path as needed

export default function VideoAiVideoOptionsViewer(props) {
  const {
    currentLayer,
    onDeleteLayer,
    removeVideoLayer,
    currentLayerHasSpeechLayer,
    requestLipSyncToSpeech,
    requestAddSyncedSoundEffect
  } = props;

  const [showSoundEffectPrompt, setShowSoundEffectPrompt] = useState(false);
  const [soundEffectPrompt, setSoundEffectPrompt] = useState('');

  // Lip sync options
  const lipSyncOptions = [
    { label: 'HummingBird Lip Sync', value: 'HUMMINGBIRDLIPSYNC' },
    { label: 'Latent Sync', value: 'LATENTSYNC' },
    { label: 'Sync Lip Sync', value: 'SYNCLIPSYNC' },
    { label: 'Kling Lip Sync', value: 'KLINGLIPSYNC' },
    {label: 'Creatify Lip Sync', value: 'CREATIFYLIPSYNC' }
  ];
  const [selectedLipSyncOption, setSelectedLipSyncOption] = useState(lipSyncOptions[0]);

  // NEW: Sound effect options + selection
  const soundEffectOptions = [
    { label: 'MMAudio V2', value: 'MMAUDIOV2' },
    { label: 'Mirelo AI', value: 'MIRELOAI' }
  ];
  const [selectedSoundEffectOption, setSelectedSoundEffectOption] = useState(soundEffectOptions[0]);

  const handleDeleteLayer = () => {
    if (removeVideoLayer) {
      removeVideoLayer(currentLayer);
    }
  };

  const handleRequestLipSync = () => {
    if (requestLipSyncToSpeech && selectedLipSyncOption) {
      requestLipSyncToSpeech(selectedLipSyncOption.value);
    }
  };

  const handleRequestSoundEffect = () => {
    setShowSoundEffectPrompt((prev) => !prev);
  };

  const handleSoundEffectSubmit = () => {
    if (requestAddSyncedSoundEffect) {
      const payload = {
        prompt: soundEffectPrompt,
        // Pass the selected model value with the request
        model: selectedSoundEffectOption?.value
      };
      requestAddSyncedSoundEffect(payload);
    }
    setShowSoundEffectPrompt(false);
    setSoundEffectPrompt('');
  };

  const lipSyncOptionViewer = currentLayerHasSpeechLayer ? (
    <div className="mb-4 flex flex-col items-center">
      <div className="text-sm mb-2">Lip Sync</div>
      <div className="w-48 mb-2">
        <SingleSelect
          options={lipSyncOptions}
          value={selectedLipSyncOption}
          onChange={setSelectedLipSyncOption}
          classNamePrefix="lipSyncSelect"
          isSearchable={false}
        />
      </div>
      <SecondaryButton onClick={handleRequestLipSync}>
        Request Lip Sync
      </SecondaryButton>
    </div>
  ) : (
    <div className="mb-2 text-sm">
      <p>Create a speech layer</p>
      <p>to generate lipsync</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center mt-2 mx-auto">
      {/* Lip Sync Section */}
      {lipSyncOptionViewer}

      {/* Sound Effect Section */}
      <div className="mt-2 mb-2 flex flex-col items-center">
        <div className="text-sm mb-2">Sound Effect</div>

        {/* NEW: Sound effect model select */}
        <div className="w-48 mb-2">
          <SingleSelect
            options={soundEffectOptions}
            value={selectedSoundEffectOption}
            onChange={setSelectedSoundEffectOption}
            classNamePrefix="soundEffectSelect"
            isSearchable={false}
          />
        </div>

        <SecondaryButton onClick={handleRequestSoundEffect}>
          Request Sound Effect
        </SecondaryButton>

        {showSoundEffectPrompt && (
          <div className="flex flex-col items-center mt-2 w-full">
            <textarea
              className="w-48 text-sm p-1 bg-gray-800 border border-gray-300 rounded"
              placeholder="Enter prompt for effect"
              value={soundEffectPrompt}
              onChange={(e) => setSoundEffectPrompt(e.target.value)}
            />
            <SecondaryButton
              onClick={handleSoundEffectSubmit}
              extraClasses="mt-2"
            >
              Submit
            </SecondaryButton>
          </div>
        )}
      </div>

      {/* Delete Button */}
      <div className="mt-4 mb-2">
        <SecondaryButton
          onClick={handleDeleteLayer}
          extraClasses="bg-red-500 hover:bg-red-600"
        >
          Delete Video Layer
        </SecondaryButton>
      </div>
    </div>
  );
}
