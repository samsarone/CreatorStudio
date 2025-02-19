// ProgressIndicator.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import './mobileStyles.css';
import { useAlertDialog } from '../../contexts/AlertDialogContext.js';
import AddCreditsDialog from "../account/AddCreditsDialog.js";

const PROCESSOR_API_URL = process.env.REACT_APP_PROCESSOR_API;

// Calculate the overall progress percentage
const getProgressPercentage = (status) => {
  if (!status) return 0;
  const totalTasks = Object.keys(status).length;
  const completedTasks = Object.values(status)
    .filter((state) => state === 'COMPLETED').length;
  return (completedTasks / totalTasks) * 100;
};

// Return the first step that is *not* completed (i.e., the "current" step)
const getCurrentStep = (status) => {
  if (!status) return null;

  const stepsOrder = [
    { key: 'prompt_generation', label: 'Generating Prompt' },
    { key: 'image_generation', label: 'Generating Image' },
    { key: 'audio_generation', label: 'Generating Audio' },
    { key: 'ai_video_generation', label: 'Generating AI Video' },
    { key: 'lip_sync_generation', label: 'Generating Lip Sync' },
    { key: 'sound_effect_generation', label: 'Generating Sound Effects' },
    { key: 'frame_generation', label: 'Generating Frames' },
    { key: 'video_generation', label: 'Final Video Generation' },
  ];

  for (const step of stepsOrder) {
    if (status[step.key] !== 'COMPLETED') {
      return step.label;
    }
  }

  return 'All steps completed';
};

export default function ProgressIndicator(props) {
  const {
    isGenerationPending,
    expressGenerationStatus,
    videoLink,
    errorMessage,
    purchaseCreditsForUser,
    viewInStudio,
    getSessionImageLayers,
  } = props;

  const { openAlertDialog } = useAlertDialog();
  const [hasCalledGetSessionImageLayers, setHasCalledGetSessionImageLayers] = useState(false);

  const progressPercentage = useMemo(
    () => getProgressPercentage(expressGenerationStatus),
    [expressGenerationStatus]
  );

  const currentStep = useMemo(
    () => getCurrentStep(expressGenerationStatus),
    [expressGenerationStatus]
  );

  useEffect(() => {
    // If/when you want to call getSessionImageLayers, you can do so here
    if (
      expressGenerationStatus?.image_generation === 'COMPLETED' &&
      !hasCalledGetSessionImageLayers
    ) {
      // getSessionImageLayers?.();
      setHasCalledGetSessionImageLayers(true);
    }
  }, [
    expressGenerationStatus?.image_generation,
    hasCalledGetSessionImageLayers,
    getSessionImageLayers
  ]);

  const showBuyCreditsDialog = () => {
    openAlertDialog(
      <AddCreditsDialog purchaseCreditsForUser={purchaseCreditsForUser()} />
    );
  };

  let videoActualLink = videoLink;
  if (!videoLink.startsWith('http')) { 
    videoActualLink = `${PROCESSOR_API_URL}/${videoLink}`;
  }
  return (
    <div className="bg-stone-950 p-4 pt-1 rounded text-white">

      {/* Error message display */}
      {errorMessage && (
        <div className="bg-red-800 p-2 rounded mb-2">
          {errorMessage.error}

          <div>
            <button
              className="text-red-300 mt-1 hover:underline"
              onClick={viewInStudio}
            >
              View in Studio
            </button>
          </div>  
        </div>
      )}

      {/* Generation in progress */}
      {isGenerationPending && expressGenerationStatus ? (
        <div className="clear-both mt-4 flex items-center">
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded overflow-hidden mr-4">
            <div
              className="h-4 bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Single line: Percentage + Current Step */}
          <div className="text-sm whitespace-nowrap">
            {Math.round(progressPercentage)}% - {currentStep}
          </div>
        </div>
      ) : expressGenerationStatus === null ? (
        // If we have no expressGenerationStatus yet, show a spinner
        <div className="flex justify-center items-center h-48">
          <FaSpinner className="animate-spin text-4xl" />
        </div>
      ) : null}

      {/* Completed => show video */}
      {videoLink && !isGenerationPending && (
        <div className="mt-5 clear-both">

          <video controls className="md:w-[512px] w-full mx-auto max-h-[300px]">
            <source src={`${videoActualLink}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

        </div>
      )}
    </div>
  );
}
