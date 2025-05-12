import React, { useState, useEffect } from "react";
import CommonButton from "../../common/CommonButton.tsx";
import {
  VIDEO_GENERATION_MODEL_TYPES,
  PIXVERRSE_VIDEO_STYLES,
} from "../../../constants/Types.ts";
import { useColorMode } from "../../../contexts/ColorMode.jsx";
import TextareaAutosize from "react-textarea-autosize";
import { VIDEO_MODEL_PRICES } from "../../../constants/ModelPrices.jsx";

export default function VideoPromptGenerator(props) {
  const {
    videoPromptText,
    setVideoPromptText,
    submitGenerateNewVideoRequest,
    aiVideoGenerationPending,
    selectedVideoGenerationModel,
    setSelectedVideoGenerationModel,
    generationError,
    aspectRatio,
  } = props;

  const { colorMode } = useColorMode();
  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark"
      ? "bg-gray-800"
      : "bg-gray-200 border-gray-600 border-2";

  // Build <option> list by checking if the model has a price for the selected aspect ratio
  const modelOptionMap = VIDEO_GENERATION_MODEL_TYPES
    .map((model) => {
      const pricing = VIDEO_MODEL_PRICES.find((p) => p.key === model.key);
      // If no pricing entry or no match for this aspect ratio, skip
      if (!pricing) return null;
      const hasAspectRatio = pricing.prices.some(
        (priceObj) => priceObj.aspectRatio === aspectRatio
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

  // ------------------
  //  Local Storage Defaults
  // ------------------
  const [useStartFrame, setUseStartFrame] = useState(() => {
    const storedStartFrame = localStorage.getItem("defaultVideoStartFrame");
    return storedStartFrame === null ? true : storedStartFrame === "true";
  });
  const [useEndFrame, setUseEndFrame] = useState(() => {
    const storedEndFrame = localStorage.getItem("defaultVideoEndFrame");
    return storedEndFrame === null ? true : storedEndFrame === "true";
  });
  const [combineLayers, setCombineLayers] = useState(() => {
    const storedCombineLayers = localStorage.getItem("combineLayers");
    return storedCombineLayers === null ? false : storedCombineLayers === "true";
  });
  const [clipLayerToAiVideo, setClipLayerToAiVideo] = useState(() => {
    const storedClipLayer = localStorage.getItem("clipLayerToAiVideo");
    return storedClipLayer === null ? false : storedClipLayer === "true";
  });

  // If the selected model is "HAILUO" or "HAIPER2.0", we can allow "Optimize Prompt"
  const [optimizePrompt, setOptimizePrompt] = useState(false);

  // Duration state
  const [selectedDuration, setSelectedDuration] = useState(null);

  /**
   * NEW: We also want to show sub-styles if the model is Pixverse.
   * If the model has `modelSubTypes` (for others like "HAIPER2.0") we show those.
   **/
  const [selectedModelSubType, setSelectedModelSubType] = useState("");

  // ------------------
  //  useEffect for initial values
  // ------------------
  useEffect(() => {
    // Set the default model from localStorage or first available model
    const defaultModel =
      localStorage.getItem("defaultVideoModel") ||
      (modelOptionMap.length > 0 ? modelOptionMap[0].props.value : "");
    setSelectedVideoGenerationModel(defaultModel);

    if (defaultModel === "HAILUO" || defaultModel === "HAIPER2.0") {
      const storedOptimizePrompt = localStorage.getItem("defaultOptimizePrompt");
      setOptimizePrompt(storedOptimizePrompt === "true");
    } else {
      setOptimizePrompt(false);
    }

    const modelPricing = VIDEO_MODEL_PRICES.find(
      (model) => model.key === defaultModel
    );
    if (modelPricing && modelPricing.units && modelPricing.units.length > 0) {
      // Set selectedDuration from localStorage or default to the first
      const storedDuration = localStorage.getItem("defaultDurationFor" + defaultModel);
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
  }, [modelOptionMap, setSelectedVideoGenerationModel]);

  // ------------------
  //  Whenever `selectedVideoGenerationModel` changes
  // ------------------
  useEffect(() => {
    // If new model is "SDVIDEO", we turn off end frame
    if (selectedVideoGenerationModel === "SDVIDEO") {
      setUseEndFrame(false);
    }

    // If new model is "HAILUO" or "HAIPER2.0", set optimizePrompt from storage
    if (
      selectedVideoGenerationModel === "HAILUO" ||
      selectedVideoGenerationModel === "HAIPER2.0"
    ) {
      const storedOptimizePrompt = localStorage.getItem("defaultOptimizePrompt");
      setOptimizePrompt(storedOptimizePrompt === "true");
    } else {
      setOptimizePrompt(false);
    }

    // Reset or set the duration (based on local storage or first unit) for the newly selected model
    const modelPricing = VIDEO_MODEL_PRICES.find(
      (model) => model.key === selectedVideoGenerationModel
    );
    if (modelPricing && modelPricing.units && modelPricing.units.length > 0) {
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

    /**
     * UPDATED SUB-TYPE LOGIC:
     * 1) If the selected model is PIXVERSE (e.g. "PIXVERSEI2V", "PIXVERSEI2VFAST"),
     *    we'll show the PIXVERRSE_VIDEO_STYLES array as sub-types.
     * 2) Else if `modelSubTypes` are defined, use those.
     * 3) Otherwise, reset the sub-type to "".
     */
    const newModelDef = VIDEO_GENERATION_MODEL_TYPES.find(
      (m) => m.key === selectedVideoGenerationModel
    );
    if (
      selectedVideoGenerationModel.startsWith("PIXVERSE") // e.g. PIXVERSEI2V or PIXVERSEI2VFAST
    ) {
      // Load from localStorage or default to first Pixverse style
      const localStoreSubType = localStorage.getItem(
        "defaultModelSubTypeFor_" + selectedVideoGenerationModel
      );
      if (
        localStoreSubType &&
        PIXVERRSE_VIDEO_STYLES.includes(localStoreSubType)
      ) {
        setSelectedModelSubType(localStoreSubType);
      } else {
        setSelectedModelSubType(PIXVERRSE_VIDEO_STYLES[0]);
      }
    } else if (newModelDef?.modelSubTypes?.length) {
      // Attempt localStorage or default to first subType in array
      const localStoreSubType = localStorage.getItem(
        "defaultModelSubTypeFor_" + selectedVideoGenerationModel
      );
      if (
        localStoreSubType &&
        newModelDef.modelSubTypes.includes(localStoreSubType)
      ) {
        setSelectedModelSubType(localStoreSubType);
      } else {
        setSelectedModelSubType(newModelDef.modelSubTypes[0]);
      }
    } else {
      setSelectedModelSubType("");
    }
  }, [selectedVideoGenerationModel]);

  // ------------------
  //  Handlers
  // ------------------
  const setSelectedModelDisplay = (evt) => {
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
    localStorage.setItem("defaultVideoStartFrame", checked.toString());
  };

  const handleEndFrameChange = (e) => {
    const checked = e.target.checked;
    setUseEndFrame(checked);
    localStorage.setItem("defaultVideoEndFrame", checked.toString());
  };

  const handleClipLayerChange = (e) => {
    const checked = e.target.checked;
    setClipLayerToAiVideo(checked);
    localStorage.setItem("clipLayerToAiVideo", checked.toString());
  };

  const submitOptimizePromptToggle = (checked) => {
    setOptimizePrompt(checked);
    localStorage.setItem("defaultOptimizePrompt", checked.toString());
  };

  // Save the sub-type to local storage whenever changed
  const handleModelSubTypeChange = (e) => {
    const subType = e.target.value;
    setSelectedModelSubType(subType);
    localStorage.setItem(
      "defaultModelSubTypeFor_" + selectedVideoGenerationModel,
      subType
    );
  };

  const handleSubmit = () => {
    // Build a payload to pass to your generation request
    const payload = {
      useStartFrame:
        selectedVideoGenerationModel === "SDVIDEO"
          ? true
          : isImgToVidModel
          ? useStartFrame
          : false,
      useEndFrame: false,
      combineLayers,
      clipLayerToAiVideo,
    };

    // Add optimizePrompt to the payload if model is HAILUO or HAIPER2.0
    if (
      selectedVideoGenerationModel === "HAILUO" ||
      selectedVideoGenerationModel === "HAIPER2.0"
    ) {
      payload.usePromptOptimizer = optimizePrompt;
    }

    // Add selectedDuration if it exists
    if (selectedDuration !== null) {
      payload.duration = selectedDuration;
    }

    // Add model sub-type if any
    if (selectedModelSubType) {
      payload.modelSubType = selectedModelSubType;
    }

    submitGenerateNewVideoRequest(payload);
  };

  // ------------------
  //  Pricing
  // ------------------
  const modelPricing = VIDEO_MODEL_PRICES.find(
    (model) => model.key === selectedVideoGenerationModel
  );
  // Find price for the currently selected aspect ratio
  const priceObj = modelPricing
    ? modelPricing.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  let modelPrice = priceObj ? priceObj.price : 0;

  // Adjust price based on selected duration
  if (modelPricing?.units && selectedDuration !== null) {
    const unitIndex = modelPricing.units.findIndex(
      (unit) => unit.toString() === selectedDuration.toString()
    );
    const generationCostMultiplier = unitIndex + 1;
    modelPrice = modelPrice * generationCostMultiplier;
  }

  const errorDisplay = generationError ? (
    <div className="text-red-500 text-center text-sm">{generationError}</div>
  ) : null;

  console.log(selectedVideoGenerationModel);
  
  return (
    <div>
      <div className="flex w-full mb-2 flex-col">
        <div className="w-full">
          <div className="text-xs font-semibold text-gray-300">
            This action will incur{" "}
            <span className="text-blue-300">{modelPrice} Credits</span>
          </div>
        </div>

        {/* Start / End Frame & Trim Scene Checkboxes (only if model is img-to-vid) */}
        <div className="flex w-full items-center mt-2 flex-wrap">
          {isImgToVidModel && (
            <>
              {/* Start Frame Checkbox */}
              <label className="inline-flex items-center text-sm mr-4">
                <input
                  type="checkbox"
                  checked={useStartFrame}
                  onChange={handleStartFrameChange}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-xs">Start frame</span>
              </label>

            </>
          )}

          {/* Optimize Prompt Checkbox for HAILUO and HAIPER2.0 */}
          {(selectedVideoGenerationModel === "HAILUO" ||
            selectedVideoGenerationModel === "HAIPER2.0") && (
            <label className="inline-flex items-center text-xs mr-4">
              <input
                type="checkbox"
                checked={optimizePrompt}
                onChange={(e) => submitOptimizePromptToggle(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs">Optimize Prompt</span>
            </label>
          )}
        </div>

        {/* Model Select */}
        <div className="flex w-full items-center mt-2">
          <select
            onChange={setSelectedModelDisplay}
            className={`${selectBG} w-full border border-gray-300 rounded-md p-1`}
            value={selectedVideoGenerationModel}
          >
            {modelOptionMap}
          </select>
        </div>
        <div className="w-full text-sm font-bold mt-1">Model</div>

        {/* Duration Select (if pricing info) */}
        {modelPricing?.units && (
          <>
            <div className="flex w-full items-center mt-2">
              <select
                onChange={handleDurationChange}
                className={`${selectBG} w-full border border-gray-300 rounded-md p-1`}
                value={selectedDuration || ""}
              >
                {modelPricing.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit} seconds
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full text-sm font-bold mt-1">Duration</div>
          </>
        )}



        {selectedVideoGenerationModel.startsWith("PIXVERSE") ? (
          <>
            <div className="flex w-full items-center mt-2">
              <select
                value={selectedModelSubType}
                onChange={handleModelSubTypeChange}
                className={`${selectBG} w-full border border-gray-300 rounded-md p-1`}
              >
                {PIXVERRSE_VIDEO_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full text-sm font-bold mt-1">Pixverse Style</div>
          </>
        ) : selectedModelDef?.modelSubTypes?.length > 0 ? (
          <>
            <div className="flex w-full items-center mt-2">
              <select
                value={selectedModelSubType}
                onChange={handleModelSubTypeChange}
                className={`${selectBG} w-full border border-gray-300 rounded-md p-1`}
              >
                {selectedModelDef.modelSubTypes.map((subType) => (
                  <option key={subType} value={subType}>
                    {subType}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full text-sm font-bold mt-1">Scene Type</div>
          </>
        ) : null}
      </div>

      {/* Textarea (Hidden for SDVIDEO) */}
      {selectedVideoGenerationModel !== "SDVIDEO" && (
        <TextareaAutosize
          onChange={(evt) => setVideoPromptText(evt.target.value)}
          placeholder="Add prompt text here"
          className={`${textBG} w-full m-auto p-4 rounded-lg`}
          minRows={3}
          value={videoPromptText}
        />
      )}

      <div className="text-center">
        <CommonButton onClick={handleSubmit} isPending={aiVideoGenerationPending}>
          Submit
        </CommonButton>
      </div>

      {errorDisplay}
    </div>
  );
}
