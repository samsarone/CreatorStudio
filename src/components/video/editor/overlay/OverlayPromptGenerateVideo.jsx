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
  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark"
      ? "bg-gray-800"
      : "bg-gray-200 border-gray-600 border-2";

  // -----------------------------
  // Filter out only text-to-video models & check if they have pricing for the current aspect ratio
  // -----------------------------
  const textToVidModels = VIDEO_GENERATION_MODEL_TYPES.filter(
    (m) => !m.isImgToVidModel
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
  //  On first mount: pick default model from localStorage or first option
  // -----------------------------
useEffect(() => {
  const defaultModel =
    localStorage.getItem("defaultVideoModel") ||
    (modelOptions.length > 0 ? modelOptions[0].props.value : "");

  if (
    defaultModel &&
    defaultModel !== selectedVideoGenerationModel // prevent unnecessary re-setting
  ) {
    setSelectedVideoGenerationModel(defaultModel);
  }

  if (defaultModel === "HAILUO" || defaultModel === "HAIPER2.0") {
    const storedOptimizePrompt = localStorage.getItem("defaultOptimizePrompt");
    setOptimizePrompt(storedOptimizePrompt === "true");
  }

  const modelPricing = VIDEO_MODEL_PRICES.find((p) => p.key === defaultModel);
  if (modelPricing?.units?.length > 0) {
    const storedDuration = localStorage.getItem("defaultDurationFor" + defaultModel);
    if (storedDuration && modelPricing.units.includes(parseInt(storedDuration))) {
      setSelectedDuration(parseInt(storedDuration));
    } else {
      setSelectedDuration(modelPricing.units[0]);
    }
  }
}, [modelOptions]);



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
          : isImgToVidModel
          ? useStartFrame
          : false,
      useEndFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? false
          : isImgToVidModel
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
    <div className="relative p-2">
      {/* Close Button */}

      <div className="text-white text-xs">
        Generate an image first to see more model options.
      </div>
      {/* Top row: Model selection + cost tooltip */}
      <div className="flex w-full mt-2 mb-2 justify-center items-center space-x-4 shadow-lg p-3 rounded">
        {/* Model label + cost tooltip */}
        <div className="flex items-center space-x-2">
          <div className="text-md font-bold flex items-center">
            Model
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} Credits`}
            >
              <FaQuestionCircle
                className="ml-1"
                data-tip
                data-for="modelCostTooltip"
              />
            </a>
            <Tooltip id="modelCostTooltip" place="right" effect="solid" />
          </div>
          <select
            onChange={handleModelChange}
            className={`${selectBG} p-1 rounded`}
            value={selectedVideoGenerationModel}
          >
            {modelOptions}
          </select>
        </div>

        {/* Model subType (if any) */}
        {selectedModelDef?.modelSubTypes?.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="text-xs font-bold">Scene Type</div>
            <select
              value={selectedModelSubType}
              onChange={handleModelSubTypeChange}
              className={`${selectBG} p-1 rounded`}
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
            <div className="text-xs font-bold">Duration</div>
            <select
              onChange={handleDurationChange}
              className={`${selectBG} p-1 rounded`}
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
      <div className="flex flex-wrap items-center mb-2 space-x-4 px-1">
        {/* Start frame / End frame for Img-to-Vid */}



      </div>

      {/* Prompt Textarea (hide if it's SDVIDEO, which doesn't use text prompt) */}
      {selectedVideoGenerationModel !== "SDVIDEO" && (
        <TextareaAutosize
          onChange={(evt) => setVideoPromptText(evt.target.value)}
          placeholder="Add prompt text here"
          className={`${textBG} w-full p-2 rounded-lg`}
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
