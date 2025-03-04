import React, { useState } from "react";
import CommonButton from "../../../common/CommonButton.tsx";
import SecondaryButton from "../../../common/SecondaryButton.tsx";

const AudioOptionsDialog = ({
  onSubmit,
  initialDucking = false,

  isExpressGeneration,
  showAddSubtitlesDialog,




  regenerateVideoSessionSubtitles,


}) => {
  const [isAudioDucking, setIsAudioDucking] = useState(initialDucking);
  const [syncAnimations, setSyncAnimations] = useState(false);
  const [syncLayers, setSyncLayers] = useState(false);

  const [applyAudioVisualizer, setApplyAudioVisualizer] = useState(false);
  const [visualizerOptions, setVisualizerOptions] = useState({
    bars: 50, // Example option: number of bars in the visualizer
    colorScheme: 'default', // Example option: color scheme
  });


  const handleAudioDuckingChange = (e) => {
    setIsAudioDucking(e.target.checked);
  };

  const handleSyncAnimationsChange = (e) => {
    setSyncAnimations(e.target.checked);
  };

  const handleSyncLayersChange = (e) => {
    setSyncLayers(e.target.checked);
  };

  const handleSubmit = (e) => {
    e.preventDefault();


    const payload = {
      isAudioDucking,
      syncAnimations,
      syncLayers,
      applyAudioVisualizer
    };


    onSubmit(payload);

  };


  const handleApplyAudioVisualizerChange = (e) => {
    setApplyAudioVisualizer(e.target.checked);
  };

  const handleVisualizerOptionsChange = (e) => {
    setVisualizerOptions({
      ...visualizerOptions,
      [e.target.name]: e.target.value,
    });
  };


  let subtitlesTextDisplay = null;
            
  if (isExpressGeneration) {
    subtitlesTextDisplay = (
      <div>
        <SecondaryButton onClick={showAddSubtitlesDialog}>
          Express Ops
        </SecondaryButton>
      </div>
    );
  } else {
    subtitlesTextDisplay = (
      <div>
        <SecondaryButton onClick={regenerateVideoSessionSubtitles}>
          Regenerate Subs
        </SecondaryButton>
      </div>
    )
  }



  return (
    <form onSubmit={handleSubmit}>


      <div className="mb-4">

        <div>
          <div className="mb-4 mt-4">
            {subtitlesTextDisplay}
          </div>
        </div>
        <label className="block mb-2">Beat Synchronization</label>
        <div className="flex items-center">
          <label className="flex items-center mr-4">
            <input
              type="checkbox"
              checked={syncAnimations}
              onChange={handleSyncAnimationsChange}
              className="mr-2"
            />
            Sync Animations to Beats
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={syncLayers}
              onChange={handleSyncLayersChange}
              className="mr-2"
            />
            Sync Layers to Beats
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-2">Audio Visualizer</label>
        <div className="flex items-center">
          <label className="flex items-center mr-4">
            <input
              type="checkbox"
              checked={applyAudioVisualizer}
              onChange={handleApplyAudioVisualizerChange}
              className="mr-2"
            />
            Apply Audio Visualizer
          </label>
        </div>
        {applyAudioVisualizer && (
          <div className="mt-2">
            <label className="block mb-1">Visualizer Options:</label>
            <div className="flex items-center">
              <label className="mr-4">
                Bars:
                <input
                  type="number"
                  name="bars"
                  value={visualizerOptions.bars}
                  onChange={handleVisualizerOptionsChange}
                  className="ml-2"
                />
              </label>
              <label>
                Color Scheme:
                <select
                  name="colorScheme"
                  value={visualizerOptions.colorScheme}
                  onChange={handleVisualizerOptionsChange}
                  className="ml-2"
                >
                  <option value="default">Default</option>
                  <option value="rainbow">Rainbow</option>
                  <option value="fire">Fire</option>
                  {/* Add more options as needed */}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>


      <div className="flex justify-end">
        <CommonButton type="submit">Submit</CommonButton>
      </div>
    </form>
  );
};

export default AudioOptionsDialog;
