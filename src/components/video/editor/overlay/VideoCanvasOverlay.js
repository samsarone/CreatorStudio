import React from 'react';
import OverlayPromptGenerator from './OverlayPromptGenerator'; // <-- Update your import path
import { FaTimes } from 'react-icons/fa';

export default function VideoCanvasOverlay(props) {
  const {
    activeItemList,
    onCloseOverlay,
    // Props for PromptGenerator - ensure they are passed down from parent
    promptText,
    setPromptText,
    submitGenerateRequest,
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    currentDefaultPrompt,
    submitGenerateNewRequest,
    aspectRatio,
  } = props;

  // If the activeItemList is empty, we show our "Generate Image" prompt
  if (!activeItemList || activeItemList.length === 0) {

    let topH = 'top-[50vh]';
    if (aspectRatio === '9:16') {
      topH = 'top-[60vh]';
    }
    return (
      <div
        className={`
          absolute ${topH} left-1/2 transform -translate-x-1/2 
          z-10
          bg-black bg-opacity-60 backdrop-blur-sm
          flex flex-row items-center justify-center 
          space-x-4
          px-4 py-2
          rounded-lg
          shadow-md
          m-auto
           opacity-80
           min-w-[512px]
        `}
      >
        <button
          onClick={onCloseOverlay}
          className="absolute top-4 right-4 text-white hover:text-gray-300"
        >
          <FaTimes size={18} />
        </button>

        <OverlayPromptGenerator
          promptText={promptText}
          setPromptText={setPromptText}
          submitGenerateRequest={submitGenerateRequest}
          isGenerationPending={isGenerationPending}
          selectedGenerationModel={selectedGenerationModel}
          setSelectedGenerationModel={setSelectedGenerationModel}
          generationError={generationError}
          currentDefaultPrompt={currentDefaultPrompt}
          submitGenerateNewRequest={submitGenerateNewRequest}
          aspectRatio={aspectRatio}
        />

      </div>
    );
  }

  // Otherwise, no overlay
  return null;
}
