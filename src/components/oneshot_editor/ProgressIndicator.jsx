// ProgressIndicator.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import './mobileStyles.css';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import AddCreditsDialog from "../account/AddCreditsDialog.jsx";
import { useColorMode } from '../../contexts/ColorMode.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

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

  const { colorMode } = useColorMode();


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
      <div>
         <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
         
        <AddCreditsDialog purchaseCreditsForUser={purchaseCreditsForUser}
        
        
        
        />
      </div>
    );
  };

  let videoActualLink = videoLink;
  if (videoLink && !videoLink.startsWith('http')) {
    videoActualLink = `${PROCESSOR_API_URL}/${videoLink}`;
  }

  const panelShell =
    colorMode === 'dark'
      ? 'bg-slate-950/80 text-slate-100 border border-white/10 shadow-[0_6px_24px_rgba(15,23,42,0.4)]'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const progressTrack = colorMode === 'dark' ? 'bg-white/10' : 'bg-slate-200';
  const errorPanel =
    colorMode === 'dark'
      ? 'bg-red-900/70 text-red-200 border border-red-800/70'
      : 'bg-red-50 text-red-700 border border-red-200';

  return (
    <div className={`${panelShell} rounded-2xl p-4 pt-3 transition-shadow duration-200`}>

      {/* Error message display */}
      {errorMessage && (
        <div className={`${errorPanel} p-3 rounded-xl mb-3`}>
          {errorMessage.error}

          <div>
            <button
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
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
          <div className={`w-full ${progressTrack} rounded-full overflow-hidden mr-4 h-3`}>
            <div
              className="h-full bg-blue-500 transition-all duration-300"
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
