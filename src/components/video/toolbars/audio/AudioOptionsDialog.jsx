import React from "react";
import SecondaryButton from "../../../common/SecondaryButton.tsx";
import CommonButton from "../../../common/CommonButton.tsx";

const AudioOptionsDialog = ({
  regenerateVideoSessionSubtitles,
  requestRealignLayers,
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

  return (
    <div>
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
