// ProgressIndicator.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import './mobileStyles.css';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import AddCreditsDialog from "../account/AddCreditsDialog.jsx";
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';

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
const getCurrentStep = (status, t) => {
  if (!status) return null;

  const stepsOrder = [
    { key: 'prompt_generation', label: t('progress.generatingPrompt') },
    { key: 'image_generation', label: t('progress.generatingImage') },
    { key: 'audio_generation', label: t('progress.generatingAudio') },
    { key: 'ai_video_generation', label: t('progress.generatingAiVideo') },
    { key: 'lip_sync_generation', label: t('progress.generatingLipSync') },
    { key: 'sound_effect_generation', label: t('progress.generatingSoundEffects') },
    { key: 'frame_generation', label: t('progress.generatingFrames') },
    { key: 'video_generation', label: t('progress.finalVideoGeneration') },
  ];

  for (const step of stepsOrder) {
    if (status[step.key] !== 'COMPLETED') {
      return step.label;
    }
  }

  return t('progress.allStepsCompleted');
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
  const { t } = useLocalization();


  const progressPercentage = useMemo(
    () => getProgressPercentage(expressGenerationStatus),
    [expressGenerationStatus]
  );

  const currentStep = useMemo(
    () => getCurrentStep(expressGenerationStatus, t),
    [expressGenerationStatus, t]
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
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d] shadow-[0_10px_28px_rgba(0,0,0,0.35)]'
      : 'bg-white/95 text-slate-900 border border-[#d7deef] shadow-sm';
  const progressTrack = colorMode === 'dark' ? 'bg-[#1f2a3d]' : 'bg-slate-200';
  const errorPanel =
    colorMode === 'dark'
      ? 'bg-rose-900/50 text-rose-100 border border-rose-700/60'
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
              {t("common.viewInStudio")}
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
            {t("progress.videoUnsupported")}
          </video>

        </div>
      )}
    </div>
  );
}
