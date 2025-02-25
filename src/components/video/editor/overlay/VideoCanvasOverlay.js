import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

import OverlayPromptGenerator from "./OverlayPromptGenerator";
import OverlayPromptGenerateVideo from "./OverlayPromptGenerateVideo";

export default function VideoCanvasOverlay(props) {
  const {
    activeItemList,
    onCloseOverlay,
    // Existing image-generation props
    promptText,
    setPromptText,
    submitGenerateRequest,         // unused but kept for consistency
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    currentDefaultPrompt,
    submitGenerateNewRequest,
    aspectRatio,

    // New video-generation props
    videoPromptText,
    setVideoPromptText,
    submitGenerateNewVideoRequest,
    aiVideoGenerationPending,
    // We'll reuse the same generationError if you like, or keep a separate error prop
    selectedVideoGenerationModel,
    setSelectedVideoGenerationModel,
  } = props;

  // Tab for toggling between "Generate Image" vs "Generate Video"
  const [selectedTab, setSelectedTab] = useState("image"); // default is "image"

  let overlayVidPrompt = <span />;
  if (aspectRatio !== '1:1') {
    overlayVidPrompt = (
      <OverlayPromptGenerateVideo
        videoPromptText={videoPromptText}
        setVideoPromptText={setVideoPromptText}
        aiVideoGenerationPending={aiVideoGenerationPending}
        selectedVideoGenerationModel={selectedVideoGenerationModel}
        setSelectedVideoGenerationModel={setSelectedVideoGenerationModel}
        generationError={generationError}
        currentDefaultPrompt={currentDefaultPrompt}
        submitGenerateNewVideoRequest={submitGenerateNewVideoRequest}
        aspectRatio={aspectRatio}
        onCloseOverlay={onCloseOverlay}
      />
    )
  }

  // If the activeItemList is empty, show our tabbed prompt overlay
  if (!activeItemList || activeItemList.length === 0) {
    let topH = "top-[50vh]";
    if (aspectRatio === "9:16") {
      topH = "top-[60vh]";
    }

    return (
      <div
        className={`
          absolute ${topH} left-1/2 transform -translate-x-1/2 
          z-10
          bg-black bg-opacity-60 backdrop-blur-sm
          flex flex-col items-center 
          px-4 py-2
          rounded-lg
          shadow-md
          min-w-[512px]
        `}
      >
        {/* Close Button */}
        <button
          onClick={onCloseOverlay}
          className="absolute top-4 right-4 text-white hover:text-gray-300"
        >
          <FaTimes size={18} />
        </button>

        {/* Tab Buttons */}
        <div className="flex space-x-4 mb-2">
          <button
            className={`px-4 py-1 rounded 
               ${selectedTab === "image" ? "bg-blue-800 text-white shadow-xs" : "bg-gray-800 shadow-none"}`}
            onClick={() => setSelectedTab("image")}
          >
            Generate Image
          </button>
          <button
            className={`px-4 py-1 rounded 
               ${selectedTab === "video" ? "bg-blue-800 text-white shadow-xs" : "bg-gray-800 shadow-none"}`}
            onClick={() => setSelectedTab("video")}
          >
            Generate Video
          </button>
        </div>

        {/* Conditionally Render Image Prompt or Video Prompt */}
        {selectedTab === "image" ? (
          <OverlayPromptGenerator
            promptText={promptText}
            setPromptText={setPromptText}
            // For images
            submitGenerateRequest={submitGenerateRequest}
            isGenerationPending={isGenerationPending}
            selectedGenerationModel={selectedGenerationModel}
            setSelectedGenerationModel={setSelectedGenerationModel}
            generationError={generationError}
            currentDefaultPrompt={currentDefaultPrompt}
            submitGenerateNewRequest={submitGenerateNewRequest}
            aspectRatio={aspectRatio}
          />
        ) : (
          <div>

            {overlayVidPrompt}
          </div>
        )}
      </div>
    );
  }

  // Otherwise, no overlay if we have active items
  return null;
}
