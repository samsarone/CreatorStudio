import React, { useState, useEffect } from "react";
import { FaTimes, FaQuestionCircle } from "react-icons/fa";
import CommonButton from "../../../common/CommonButton.tsx";
import { VIDEO_GENERATION_MODEL_TYPES } from "../../../../constants/Types.ts";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";
import TextareaAutosize from "react-textarea-autosize";
import { VIDEO_MODEL_PRICES } from "../../../../constants/ModelPrices.jsx";
import { Tooltip } from "react-tooltip";
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

  // -----------------------------
  // Filter out only text-to-video models & check if they have pricing for the current aspect ratio
  // -----------------------------
  const textToVidModels = VIDEO_GENERATION_MODEL_TYPES.filter(
    (m) => m.isTextToVidModel
  );

  const modelOptions = textToVidModels
    .map((model) => {
      // Confirm we have a pricing entry for this aspect ratio
      const pricing = VIDEO_MODEL_PRICES.find((p) => p.key === model.key);

      if (!pricing) return null;
      const hasAspectRatio = pricing.prices.some(
        (priceObj) => aspectRatio && priceObj.aspectRatio === aspectRatio
      );

      if (!hasAspectRatio) return null;

      return (
        <option key={model.key} value={model.key}>
          {model.name}
        </option>
      );
    })
    .filter(Boolean);

  // Identify the selected model definition
  const selectedModelDef = VIDEO_GENERATION_MODEL_TYPES.find(
    (m) => m.key === selectedVideoGenerationModel
  );

  const isImgToVidModel = selectedModelDef?.isImgToVidModel || false;
  const isTextToVidModel = selectedModelDef?.isTextToVidModel || false;

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
    const availableKeys = modelOptions.map((option) => option.props.value);
    if (availableKeys.length === 0) return;

    const storedModel = localStorage.getItem("defaultVideoModel");
    const fallbackModel = storedModel && availableKeys.includes(storedModel)
      ? storedModel
      : availableKeys[0];

    if (
      selectedVideoGenerationModel &&
      availableKeys.includes(selectedVideoGenerationModel)
    ) {
      return;
    }

    if (fallbackModel && fallbackModel !== selectedVideoGenerationModel) {
      setSelectedVideoGenerationModel(fallbackModel);
    }
  }, [modelOptions, selectedVideoGenerationModel, setSelectedVideoGenerationModel]);



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
    const modelPricing = VIDEO_MODEL_PRICES.find(
      (p) => p.key === selectedVideoGenerationModel
    );
    if (modelPricing?.units?.length > 0) {
      const storedDuration = localStorage.getItem(
        "defaultDurationFor" + selectedVideoGenerationModel
      );
      if (
        storedDuration &&
        modelPricing.units.includes(parseInt(storedDuration))
      ) {
        setSelectedDuration(parseInt(storedDuration));
      } else {
        setSelectedDuration(modelPricing.units[0]);
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
  }, [selectedVideoGenerationModel]);

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
    const payload = {
      // Only relevant if it’s an img-to-vid model
      useStartFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? true
          : isImgToVidModel && !isTextToVidModel
          ? useStartFrame
          : false,
      useEndFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? false
          : isImgToVidModel && !isTextToVidModel
          ? useEndFrame
          : false,
      combineLayers,
      clipLayerToAiVideo,
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
  const pricingForSelectedModel = VIDEO_MODEL_PRICES.find(
    (m) => m.key === selectedVideoGenerationModel
  );
  const priceObj = pricingForSelectedModel
    ? pricingForSelectedModel.prices.find(
        (price) => price.aspectRatio === aspectRatio
      )
    : null;
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
    <div className="relative p-3 space-y-4">
      <div className={`text-xs ${colorMode === "dark" ? "text-slate-300" : "text-slate-500"}`}>
        Generate an image first to unlock more video model options and controls.
      </div>

      {/* Top row: Model selection + cost tooltip */}
      <div className={`flex w-full flex-wrap justify-center items-center gap-4 rounded-xl px-4 py-3 ${colorMode === "dark" ? "bg-slate-900/60 border border-white/10" : "bg-white border border-slate-200 shadow-sm"}`}>
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
            className={`${selectShell} rounded-md px-3 py-2 bg-transparent`}
            value={selectedVideoGenerationModel}
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
              className={`${selectShell} rounded-md px-3 py-2 bg-transparent`}
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
              className={`${selectShell} rounded-md px-3 py-2 bg-transparent`}
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
      <div className={`flex flex-wrap items-center gap-3 px-1 text-xs ${colorMode === "dark" ? "text-slate-200" : "text-slate-600"}`}>
        {isImgToVidModel && !isTextToVidModel && (
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-150 cursor-pointer ${useStartFrame ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
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

        {isImgToVidModel && !isTextToVidModel && (
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-150 cursor-pointer ${useEndFrame ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
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

        {isImgToVidModel && (
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-150 cursor-pointer ${combineLayers ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
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

        {isImgToVidModel && (
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-150 cursor-pointer ${clipLayerToAiVideo ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
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
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-150 cursor-pointer ${optimizePrompt ? (colorMode === "dark" ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-indigo-500/10 border-indigo-200 text-indigo-600") : chipShell}`}
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
          className={`${textareaShell} w-full px-3 py-3 rounded-xl bg-transparent`}
          minRows={3}
          value={videoPromptText}
        />
      )}

      {/* Submit Button */}
      <div className="text-center mt-2">
        <CommonButton onClick={handleSubmit} isPending={aiVideoGenerationPending}>
          Submit
        </CommonButton>
      </div>

      {/* Error display */}
      {errorDisplay}
    </div>
  );
}
