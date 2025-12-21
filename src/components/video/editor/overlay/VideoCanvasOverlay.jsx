import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

import { useColorMode } from "../../../../contexts/ColorMode";
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

  const { colorMode } = useColorMode();

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
    let topH = "top-[40vh]";
    if (aspectRatio === "9:16") {
      topH = "top-[60vh]";
    }

    const overlaySurface =
      colorMode === "dark"
        ? "bg-[#0f1629]/95 text-slate-100 border border-[#1f2a3d] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        : "bg-white/90 text-slate-900 border border-slate-200 shadow-xl shadow-slate-200/60";
    const tabBase =
      colorMode === "dark"
        ? "bg-[#111a2f] text-slate-300 border border-[#1f2a3d] hover:text-white"
        : "bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900";
    const tabActive =
      colorMode === "dark"
        ? "bg-rose-500/20 text-rose-100 border border-rose-400/30 shadow-sm"
        : "bg-indigo-500/10 text-indigo-600 border border-indigo-200 shadow-sm";
    const closeButtonColor =
      colorMode === "dark"
        ? "text-slate-300 hover:text-rose-200"
        : "text-slate-500 hover:text-slate-800";

    return (
      <div
        className={`
          absolute ${topH} left-1/2 transform -translate-x-1/2 
          z-10
          ${overlaySurface} backdrop-blur
          flex flex-col items-center
          px-4 py-2
          rounded-2xl
          min-w-[512px]
        `}
      >
        {/* Close Button */}
        <button
          onClick={onCloseOverlay}
          className={`absolute top-4 right-4 transition-colors duration-150 ${closeButtonColor}`}
        >
          <FaTimes size={18} />
        </button>

        {/* Tab Buttons */}
        <div className="flex space-x-3 mb-2">
          <button
            className={`px-4 py-1.5 rounded-full transition-colors duration-150 ${selectedTab === "image" ? tabActive : tabBase}`}
            onClick={() => setSelectedTab("image")}
          >
            Generate Image
          </button>
          <button
            className={`px-4 py-1.5 rounded-full transition-colors duration-150 ${selectedTab === "video" ? tabActive : tabBase}`}
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
