import React, { useState } from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import SingleSelect from '../../../common/SingleSelect.js'; // <-- Update path as needed

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


  // 2) Define options for SingleSelect
  const lipSyncOptions = [
    { label: 'Latent Sync', value: 'LATENTSYNC' },
    { label: 'Sync Lip Sync', value: 'SYNCLIPSYNC' },
  ];

  // 1) Define state for the lip sync selection
  const [selectedLipSyncOption, setSelectedLipSyncOption] = useState(lipSyncOptions[0]);


  const handleDeleteLayer = () => {
    if (removeVideoLayer) {
      removeVideoLayer(currentLayer);
    }
  };

  // 3) Modify lip sync request handler to include the selected value
  const handleRequestLipSync = () => {
    if (requestLipSyncToSpeech && selectedLipSyncOption) {
      // Pass the selected sync option as the second argument
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
      };
      requestAddSyncedSoundEffect(payload);
    }
    setShowSoundEffectPrompt(false);
    setSoundEffectPrompt('');
  };

  // 4) Conditionally render lip sync UI if this is a character
  const lipSyncOptionViewer = currentLayerHasSpeechLayer ? (
      <div className="mb-4 flex flex-col items-center">
        {/* SingleSelect for lip sync type */}
        <div className='text-sm mb-2'>
          Lip Sync
        </div>
        <div className="w-48 mb-2">
          <SingleSelect
            options={lipSyncOptions}
            value={selectedLipSyncOption}
            onChange={setSelectedLipSyncOption}
            classNamePrefix="lipSyncSelect"
            isSearchable={false}
          />
        </div>

        {/* Request Lip Sync button */}
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
      <div className="mt-2 mb-2">
        <SecondaryButton onClick={handleRequestSoundEffect}>
          Request Sound Effect
        </SecondaryButton>
        {showSoundEffectPrompt && (
          <div className="flex flex-col items-center mt-2">
            <textarea
              className="text-sm p-1 bg-gray-800 border border-gray-300 rounded"
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
