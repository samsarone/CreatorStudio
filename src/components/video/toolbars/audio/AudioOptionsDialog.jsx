import React from "react";
import SecondaryButton from "../../../common/SecondaryButton.tsx";
import CommonButton from "../../../common/CommonButton.tsx";

const AudioOptionsDialog = ({
  regenerateVideoSessionSubtitles,
  requestRealignLayers,
  applyAudioDucking = true,
  onApplyAudioDuckingChange,
  closeDialog,
}) => {
  const handleRegenerateSubs = () => {
    regenerateVideoSessionSubtitles();
    if (closeDialog) {
      closeDialog();
    }
  };

  const handleRealignLayers = () => {
    requestRealignLayers();
    if (closeDialog) {
      closeDialog();
    }
  };

  const handleAudioDuckingChange = (evt) => {
    if (typeof onApplyAudioDuckingChange === 'function') {
      onApplyAudioDuckingChange(evt.target.checked);
    }
  };

  return (
    <div>
      <div className="mb-4 mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applyAudioDucking}
            onChange={handleAudioDuckingChange}
          />
          <span>Apply Audio Ducking</span>
        </label>
        <div className="mt-1 text-xs opacity-75">
          Lower music automatically while speech or sound effects are playing during render.
        </div>
      </div>
      <div className="mb-4 mt-4">
        <SecondaryButton onClick={handleRegenerateSubs}>
          Regenerate Subs
        </SecondaryButton>
      </div>
      <div className="mb-4">
        <CommonButton onClick={handleRealignLayers}>
          Realign layers
        </CommonButton>
      </div>
    </div>
  );
};

export default AudioOptionsDialog;
