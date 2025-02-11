// LayerSpeechPreview.js
import React from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import SpeechSelectToolbar from './SpeechSelectToolbar';

export default function LayerSpeechPreview(props) {
  const {
    audioLayers,
    onAddAll,
    onBack,
    submitAddTrackToProject,
    colorMode,
  } = props;

  return (
    <div>
      {/* Header with "Back" and "Add All" buttons */}
      <div className="flex justify-between items-center mb-2">
        <SecondaryButton onClick={onBack}>
          <FaArrowLeft className="inline mr-2" /> Back
        </SecondaryButton>
        <SecondaryButton onClick={onAddAll}>
          <FaCheck className="inline mr-2" /> Add All
        </SecondaryButton>
      </div>

      {/* Display each audio layer using SpeechSelectToolbar */}
      {audioLayers.map((layer, index) => (
        <div key={index} className="mb-4">
          <SpeechSelectToolbar
            audioLayer={layer}
            submitAddTrackToProject={submitAddTrackToProject}
            setCurrentCanvasAction={() => {}}
            colorMode={colorMode}
          />
        </div>
      ))}
    </div>
  );
}