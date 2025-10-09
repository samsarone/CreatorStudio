// VideoGPTOptionsDialogContent.jsx

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import CommonButton from '../common/CommonButton.tsx';
import SingleSelect from '../common/SingleSelect.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';

export default function VideoGPTOptionsDialogContent({
  // Values and setters coming from the parent
  selectedDurationOption,
  setSelectedDurationOption,
  selectedAspectRatioOption,
  setSelectedAspectRatioOption,
  selectedImageModel,
  setSelectedImageModel,        // Pass in the parent's setter for image model
  selectedVideoModel,
  setSelectedVideoModel,        // Pass in the parent's setter for video model

  durationOptions,
  aspectRatioOptions,
  expressImageModels,
  expressVideoModels,

  closeAlertDialog
}) {
  //
  // Child has local states mirroring the parent's states.
  // We initialize them on mount from the parent props.
  //
  const [localDurationOption, setLocalDurationOption] = useState(selectedDurationOption);
  const [localAspectRatioOption, setLocalAspectRatioOption] = useState(selectedAspectRatioOption);
  const [localImageModel, setLocalImageModel] = useState(selectedImageModel);
  const [localVideoModel, setLocalVideoModel] = useState(selectedVideoModel);
  const { colorMode } = useColorMode();

  // On mount or whenever the *props themselves* change,
  // sync them into local state if desired:
  useEffect(() => {
    setLocalDurationOption(selectedDurationOption);
  }, [selectedDurationOption]);

  useEffect(() => {
    setLocalAspectRatioOption(selectedAspectRatioOption);
  }, [selectedAspectRatioOption]);

  useEffect(() => {
    setLocalImageModel(selectedImageModel);
  }, [selectedImageModel]);

  useEffect(() => {
    setLocalVideoModel(selectedVideoModel);
  }, [selectedVideoModel]);

  //
  // Now, whenever the user changes something in this dialog,
  // we update both the local state *and* call the parent's setter
  // so the parent is immediately updated.
  //
  const handleDurationChange = (option) => {
    setLocalDurationOption(option);
    setSelectedDurationOption(option);
  };

  const handleAspectRatioChange = (option) => {
    setLocalAspectRatioOption(option);
    setSelectedAspectRatioOption(option);
  };

  const handleImageModelChange = (option) => {
    setLocalImageModel(option);
    setSelectedImageModel(option);
  };

  const handleVideoModelChange = (option) => {
    setLocalVideoModel(option);
    setSelectedVideoModel(option);
  };

  //
  // If you want a "Close/OK" button in the child that ultimately finalizes
  // these changes, you can just close after setting them. Since we are
  // already updating parent’s states on change, you can keep “handleSubmit” simple:
  //
  const handleSubmit = () => {
    // The parent's states are already up to date, so we just close:
    closeAlertDialog();
  };

  const dialogShell =
    colorMode === 'dark'
      ? 'bg-slate-950/90 text-slate-100 border border-white/10 shadow-[0_20px_60px_rgba(8,15,40,0.65)]'
      : 'bg-white text-slate-900 border border-slate-200 shadow-xl shadow-slate-200/70';
  const sectionLabel = colorMode === 'dark' ? 'text-slate-200' : 'text-slate-700';
  const closeButton =
    colorMode === 'dark'
      ? 'text-slate-300 hover:text-red-300 focus:ring-red-400/40'
      : 'text-slate-500 hover:text-red-500 focus:ring-red-400/40';

  return (
    <div className={`relative p-5 sm:p-6 rounded-2xl transition-shadow duration-200 ${dialogShell}`}>
      {/* Dialog Header with Close Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Video Options</h2>
        <FaTimes
          className={`cursor-pointer text-xl transition-colors duration-150 ${closeButton}`}
          onClick={closeAlertDialog}
        />
      </div>

      {/* First row: Duration & Aspect Ratio */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Duration Column */}
        <div className="flex-1">
          <h3 className={`text-sm font-medium mb-2 ${sectionLabel}`}>Duration</h3>
          <SingleSelect
            options={durationOptions}
            value={localDurationOption}
            onChange={handleDurationChange}
          />
        </div>

        {/* Aspect Ratio Column */}
        <div className="flex-1">
          <h3 className={`text-sm font-medium mb-2 ${sectionLabel}`}>Aspect Ratio</h3>
          <SingleSelect
            options={aspectRatioOptions}
            value={localAspectRatioOption}
            onChange={handleAspectRatioChange}
          />
        </div>
      </div>

      {/* Second row: Image & Video Model */}
      <div className="flex flex-col md:flex-row gap-4 mt-4">
        {/* Image Model Column */}
        <div className="flex-1">
          <h3 className={`text-sm font-medium mb-2 ${sectionLabel}`}>Image Generation Model</h3>
          <SingleSelect
            options={expressImageModels}
            value={localImageModel}
            onChange={handleImageModelChange}
          />
        </div>

        {/* Video Model Column */}
        <div className="flex-1">
          <h3 className={`text-sm font-medium mb-2 ${sectionLabel}`}>Video Generation Model</h3>
          <SingleSelect
            options={expressVideoModels}
            value={localVideoModel}
            onChange={handleVideoModelChange}
          />
        </div>
      </div>

      {/* Submit/Close Button */}
      <div className="text-right mt-5">
        <CommonButton onClick={handleSubmit}>
          Close
        </CommonButton>
      </div>
    </div>
  );
}
