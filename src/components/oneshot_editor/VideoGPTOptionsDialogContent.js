// VideoGPTOptionsDialogContent.jsx

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import CommonButton from '../common/CommonButton.tsx';
import SingleSelect from '../common/SingleSelect.js';

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

  return (
    <div className="relative p-4">
      {/* Dialog Header with Close Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Video Options</h2>
        <FaTimes
          className="cursor-pointer text-xl hover:text-red-500"
          onClick={closeAlertDialog}
        />
      </div>

      {/* First row: Duration & Aspect Ratio */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Duration Column */}
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Duration</h3>
          <SingleSelect
            options={durationOptions}
            value={localDurationOption}
            onChange={handleDurationChange}
          />
        </div>

        {/* Aspect Ratio Column */}
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Aspect Ratio</h3>
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
          <h3 className="font-semibold mb-2">Image Generation Model</h3>
          <SingleSelect
            options={expressImageModels}
            value={localImageModel}
            onChange={handleImageModelChange}
          />
        </div>

        {/* Video Model Column */}
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Video Generation Model</h3>
          <SingleSelect
            options={expressVideoModels}
            value={localVideoModel}
            onChange={handleVideoModelChange}
          />
        </div>
      </div>

      {/* Submit/Close Button */}
      <div className="text-right mt-4">
        <CommonButton onClick={handleSubmit}>Close</CommonButton>
      </div>
    </div>
  );
}
