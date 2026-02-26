import React, { useState, useEffect } from "react";
import { FaQuestionCircle } from "react-icons/fa";
import CommonButton from "../../../common/CommonButton.tsx";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";
import TextareaAutosize from "react-textarea-autosize";
import { Tooltip } from "react-tooltip";
import {
  getModelPriceForAspect,
  getVideoGenerationModelDropdownData,
  getVideoGenerationModelMeta,
} from "../../util/videoGenerationModelOptions.js";
import "react-tooltip/dist/react-tooltip.css";

export default function OverlayPromptGenerateVideo(props) {
  const {
    videoPromptText,
    setVideoPromptText,
    submitGenerateNewVideoRequest,
    aiVideoGenerationPending,
    selectedVideoGenerationModel,
    setSelectedVideoGenerationModel,
    generationError,
    aspectRatio,
    onCloseOverlay,
    activeItemList,
  } = props;

  const { colorMode } = useColorMode();
  const selectShell =
    colorMode === "dark"
      ? "bg-slate-900/60 text-slate-100 border border-white/10"
      : "bg-white text-slate-900 border border-slate-200 shadow-sm";
  const textareaShell =
    colorMode === "dark"
      ? "bg-slate-900/60 text-slate-100 border border-white/10"
      : "bg-white text-slate-900 border border-slate-200 shadow-sm";
  const chipShell =
    colorMode === "dark"
      ? "bg-slate-900/40 border border-white/10 text-slate-300 hover:bg-slate-900/60"
      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50";

  // -----------------------------
  const {
    hasImageItem,
    availableModels,
    availableModelKeys,
    availableModelKeysSignature,
  } = getVideoGenerationModelDropdownData({
    activeItemList,
  });

  const modelOptions = availableModels.map((model) => (
    <option key={model.key} value={model.key}>
      {model.name}
    </option>
  ));

  const {
    modelDef: selectedModelDef,
    pricing: selectedModelPricing,
    supportsImageToVideo: isImageToVideoModel,
    supportsTextToVideo: isTextToVideoModel,
  } = getVideoGenerationModelMeta(selectedVideoGenerationModel);
  const useImgToVidSettings = isImageToVideoModel && hasImageItem;
  const useImgOnlySettings =
    isImageToVideoModel && !isTextToVideoModel && hasImageItem;

  // -----------------------------
  // Local state & Local Storage
  // -----------------------------
  // For image-to-video advanced options
  const [useStartFrame, setUseStartFrame] = useState(() => {
    const stored = localStorage.getItem("defaultVideoStartFrame");
    return stored === null ? true : stored === "true";
  });
  const [useEndFrame, setUseEndFrame] = useState(() => {
    const stored = localStorage.getItem("defaultVideoEndFrame");
    return stored === null ? true : stored === "true";
  });
  const [combineLayers, setCombineLayers] = useState(() => {
    const stored = localStorage.getItem("combineLayers");
    return stored === "true";
  });
  const [clipLayerToAiVideo, setClipLayerToAiVideo] = useState(() => {
    const stored = localStorage.getItem("clipLayerToAiVideo");
    return stored === "true";
  });

  const [optimizePrompt, setOptimizePrompt] = useState(false);

  // For duration-based pricing
  const [selectedDuration, setSelectedDuration] = useState(null);

  // Model sub-type (if available on the selected model)
  const [selectedModelSubType, setSelectedModelSubType] = useState("");

  // -----------------------------
  //  Ensure the selected model is valid, preferring localStorage or first option
  // -----------------------------
  useEffect(() => {
    if (availableModelKeys.length === 0) return;

    const storedModel = localStorage.getItem("defaultVideoModel");
    const fallbackModel = storedModel && availableModelKeys.includes(storedModel)
      ? storedModel
      : availableModelKeys[0];

    if (
      selectedVideoGenerationModel &&
      availableModelKeys.includes(selectedVideoGenerationModel)
    ) {
      return;
    }

    if (fallbackModel && fallbackModel !== selectedVideoGenerationModel) {
      setSelectedVideoGenerationModel(fallbackModel);
    }
  }, [
    availableModelKeysSignature,
    selectedVideoGenerationModel,
    setSelectedVideoGenerationModel,
  ]);



  // -----------------------------
  //  Whenever `selectedVideoGenerationModel` changes
  // -----------------------------
  useEffect(() => {
    if (selectedVideoGenerationModel === "SDVIDEO") {
      setUseEndFrame(false);
    }

    if (
      selectedVideoGenerationModel === "HAILUO" ||
      selectedVideoGenerationModel === "HAIPER2.0"
    ) {
      const storedOptimizePrompt = localStorage.getItem("defaultOptimizePrompt");
      setOptimizePrompt(storedOptimizePrompt === "true");
    } else {
      setOptimizePrompt(false);
    }

    // Handle durations
    if (selectedModelPricing?.units?.length > 0) {
      const storedDuration = localStorage.getItem(
        "defaultDurationFor" + selectedVideoGenerationModel
      );
      if (
        storedDuration &&
        selectedModelPricing.units.includes(parseInt(storedDuration))
      ) {
        setSelectedDuration(parseInt(storedDuration));
      } else {
        setSelectedDuration(selectedModelPricing.units[0]);
      }
    } else {
      setSelectedDuration(null);
    }

    // If the new model has subTypes, set default or fetch from local storage
    if (selectedModelDef?.modelSubTypes?.length > 0) {
      const localStoreSubType = localStorage.getItem(
        "defaultModelSubTypeFor_" + selectedVideoGenerationModel
      );
      if (
        localStoreSubType &&
        selectedModelDef.modelSubTypes.includes(localStoreSubType)
      ) {
        setSelectedModelSubType(localStoreSubType);
      } else {
        setSelectedModelSubType(selectedModelDef.modelSubTypes[0]);
      }
    } else {
      setSelectedModelSubType("");
    }
  }, [selectedVideoGenerationModel, selectedModelPricing, selectedModelDef]);

  // -----------------------------
  //  Handlers
  // -----------------------------
  const handleModelChange = (evt) => {
    const newModel = evt.target.value;

    setSelectedVideoGenerationModel(newModel);
    localStorage.setItem("defaultVideoModel", newModel);
  };

  const handleDurationChange = (e) => {
    const duration = parseInt(e.target.value);
    setSelectedDuration(duration);
    localStorage.setItem(
      "defaultDurationFor" + selectedVideoGenerationModel,
      duration.toString()
    );
  };

  const handleStartFrameChange = (e) => {
    const checked = e.target.checked;
    setUseStartFrame(checked);
    localStorage.setItem("defaultVideoStartFrame", String(checked));
  };

  const handleEndFrameChange = (e) => {
    const checked = e.target.checked;
    setUseEndFrame(checked);
    localStorage.setItem("defaultVideoEndFrame", String(checked));
  };

  const handleClipLayerChange = (e) => {
    const checked = e.target.checked;
    setClipLayerToAiVideo(checked);
    localStorage.setItem("clipLayerToAiVideo", String(checked));
  };

  const handleCombineLayersChange = (e) => {
    const checked = e.target.checked;
    setCombineLayers(checked);
    localStorage.setItem("combineLayers", String(checked));
  };

  const handleOptimizePromptChange = (checked) => {
    setOptimizePrompt(checked);
    localStorage.setItem("defaultOptimizePrompt", String(checked));
  };

  const handleModelSubTypeChange = (e) => {
    const subType = e.target.value;
    setSelectedModelSubType(subType);
    localStorage.setItem(
      "defaultModelSubTypeFor_" + selectedVideoGenerationModel,
      subType
    );
  };

  const handleSubmit = () => {
    if (modelOptions.length === 0) return;

    const payload = {
      // Only relevant if it’s an img-to-vid model
      useStartFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? true
          : useImgOnlySettings
          ? useStartFrame
          : false,
      useEndFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? false
          : useImgOnlySettings
          ? useEndFrame
          : false,
      combineLayers: useImgToVidSettings ? combineLayers : false,
      clipLayerToAiVideo: useImgToVidSettings ? clipLayerToAiVideo : false,
    };

    // If HAILUO / HAIPER2.0, add prompt optimization
    if (
      selectedVideoGenerationModel === "HAILUO" ||
      selectedVideoGenerationModel === "HAIPER2.0"
    ) {
      payload.usePromptOptimizer = optimizePrompt;
    }

    // Add durations
    if (selectedDuration !== null) {
      payload.duration = selectedDuration;
    }

    // Model sub-type if available
    if (selectedModelDef?.modelSubTypes?.length > 0) {
      payload.modelSubType = selectedModelSubType;
    }

    // Invoke parent submission with the final payload
    submitGenerateNewVideoRequest(payload);
  };

  // -----------------------------
  // Pricing
  // -----------------------------
  const pricingForSelectedModel = selectedModelPricing;
  const priceObj = getModelPriceForAspect(pricingForSelectedModel, aspectRatio);
  let modelPrice = priceObj ? priceObj.price : 0;

  // Adjust price if there are multiple duration units
  if (pricingForSelectedModel?.units && selectedDuration !== null) {
    // The cost multiplier is based on the index of the selected duration
    const unitIndex = pricingForSelectedModel.units.findIndex(
      (u) => u.toString() === selectedDuration.toString()
    );
    // If found, multiply
    if (unitIndex >= 0) modelPrice *= unitIndex + 1;
  }

  // Error display
  const errorDisplay = generationError && (
    <div className="text-red-500 text-center text-sm mt-2">{generationError}</div>
  );

  return (
    <div className="relative p-2 space-y-3">
      {/* Top row: Model selection + cost tooltip */}
      <div className={`flex w-full flex-wrap justify-center items-center gap-3 rounded-lg px-3 py-2 ${colorMode === "dark" ? "bg-slate-900/60 border border-white/10" : "bg-white border border-slate-200 shadow-sm"}`}>
        {/* Model label + cost tooltip */}
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold flex items-center">
            Model
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} Credits`}
            >
              <FaQuestionCircle className="ml-1 text-xs" />
            </a>
            <Tooltip id="modelCostTooltip" place="right" effect="solid" />
          </div>
          <select
            onChange={handleModelChange}
            className={`${selectShell} rounded-md px-2.5 py-1.5 bg-transparent`}
            value={selectedVideoGenerationModel}
            disabled={modelOptions.length === 0}
          >
            {modelOptions}
          </select>
        </div>

        {/* Model subType (if any) */}
        {selectedModelDef?.modelSubTypes?.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="text-xs font-semibold">Scene Type</div>
            <select
              value={selectedModelSubType}
              onChange={handleModelSubTypeChange}
              className={`${selectShell} rounded-md px-2.5 py-1.5 bg-transparent`}
            >
              {selectedModelDef.modelSubTypes.map((subType) => (
                <option key={subType} value={subType}>
                  {subType}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Duration (if pricing info has units) */}
        {pricingForSelectedModel?.units && (
          <div className="flex items-center space-x-2">
            <div className="text-xs font-semibold">Duration</div>
            <select
              onChange={handleDurationChange}
              className={`${selectShell} rounded-md px-2.5 py-1.5 bg-transparent`}
              value={selectedDuration || ""}
            >
              {pricingForSelectedModel.units.map((u) => (
                <option key={u} value={u}>
                  {u} s
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Second row: checkboxes (only relevant for certain models) */}
      <div className={`flex flex-wrap items-center gap-2.5 px-1 text-xs ${colorMode === "dark" ? "text-slate-200" : "text-slate-600"}`}>
        {useImgOnlySettings && (
          <label
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer ${useStartFrame ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={useStartFrame}
              onChange={handleStartFrameChange}
            />
            <span>Use start frame</span>
          </label>
        )}

        {useImgOnlySettings && (
          <label
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer ${useEndFrame ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={useEndFrame}
              onChange={handleEndFrameChange}
            />
            <span>Use end frame</span>
          </label>
        )}

        {useImgToVidSettings && (
          <label
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer ${combineLayers ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={combineLayers}
              onChange={handleCombineLayersChange}
            />
            <span>Combine layers</span>
          </label>
        )}

        {useImgToVidSettings && (
          <label
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer ${clipLayerToAiVideo ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={clipLayerToAiVideo}
              onChange={handleClipLayerChange}
            />
            <span>Clip to AI video</span>
          </label>
        )}

        {(selectedVideoGenerationModel === "HAILUO" || selectedVideoGenerationModel === "HAIPER2.0") && (
          <label
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer ${optimizePrompt ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={optimizePrompt}
              onChange={(e) => handleOptimizePromptChange(e.target.checked)}
            />
            <span>Optimize prompt</span>
          </label>
        )}
      </div>

      {/* Prompt Textarea (hide if it's SDVIDEO, which doesn't use text prompt) */}
      {selectedVideoGenerationModel !== "SDVIDEO" && (
        <TextareaAutosize
          onChange={(evt) => setVideoPromptText(evt.target.value)}
          placeholder="Describe the motion, pacing, and cinematic details you want…"
          className={`${textareaShell} w-full px-2.5 py-2 rounded-lg bg-transparent`}
          minRows={2}
          value={videoPromptText}
        />
      )}

      {/* Submit Button */}
      <div className="text-center mt-1.5">
        <CommonButton
          onClick={handleSubmit}
          isPending={aiVideoGenerationPending}
          isDisabled={modelOptions.length === 0}
        >
          Submit
        </CommonButton>
      </div>

      {/* Error display */}
      {errorDisplay}
    </div>
  );
}
