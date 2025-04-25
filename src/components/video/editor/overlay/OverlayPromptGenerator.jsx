import React, { useState, useEffect } from "react";
import CommonButton from "../../../common/CommonButton.tsx";
import { IMAGE_GENERAITON_MODEL_TYPES, RECRAFT_IMAGE_STYLES , IDEOGRAM_IMAGE_STYLES } from "../../../../constants/Types.ts";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";
import { IMAGE_MODEL_PRICES } from "../../../../constants/ModelPrices.jsx";
import TextareaAutosize from "react-textarea-autosize";

import { FaQuestionCircle } from "react-icons/fa";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

export default function OverlayPromptGenerator(props) {
  const {
    promptText,
    setPromptText,
    submitGenerateRequest, // (unused but kept in props to match existing usage)
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    currentDefaultPrompt, // (unused but kept in props to match existing usage)
    submitGenerateNewRequest,
    aspectRatio,
  } = props;

  const { colorMode } = useColorMode();

  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [isCharacterImage, setIsCharacterImage] = useState(false);

  // For RECRAFT
  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    if (
      selectedGenerationModel === "RECRAFTV3" ||
      selectedGenerationModel === "RECRAFT20B"
    ) {
      const defaultRecraftModel = localStorage.getItem("defaultRecraftModel");
      return defaultRecraftModel || RECRAFT_IMAGE_STYLES[0];
    }
    if (selectedGenerationModel === 'IDEOGRAMV2') {
      const defaultIdeogramModel = localStorage.getItem("defaultIdeogramModel");
      return defaultIdeogramModel || IDEOGRAM_IMAGE_STYLES[0];
    }
    return null;
  });

  useEffect(() => {
    if (
      selectedGenerationModel === "RECRAFTV3" ||
      selectedGenerationModel === "RECRAFT20B"
    ) {
      const defaultRecraftModel = localStorage.getItem("defaultRecraftModel");
      setSelectedImageStyle(defaultRecraftModel || RECRAFT_IMAGE_STYLES[0]);
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedGenerationModel]);

  // Determine theme-based styling
  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark" ? "bg-gray-800" : "bg-gray-200 border-gray-600 border-2";

  // Compute cost for the selected model + aspect ratio
  const modelPricing = IMAGE_MODEL_PRICES.find(
    (model) => model.key === selectedGenerationModel
  );
  const priceObj = modelPricing
    ? modelPricing.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  // Handle changes to model
  const setSelectedModelDisplay = (evt) => {
    const newModel = evt.target.value;
    setSelectedGenerationModel(newModel);
    localStorage.setItem("defaultModel", newModel);
  };

  // Handle changes to RECRAFT style
  const handleImageStyleChange = (e) => {
    const newStyle = e.target.value;
    setSelectedImageStyle(newStyle);
    if (
      selectedGenerationModel === "RECRAFTV3" ||
      selectedGenerationModel === "RECRAFT20B"
    ) {
      localStorage.setItem("defaultRecraftModel", newStyle);
    }
  };

  // Handle submission
  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedGenerationModel,
      retryOnFailure,
      isCharacterImage,
    };

    if (
      selectedGenerationModel === "RECRAFTV3" ||
      selectedGenerationModel === "RECRAFT20B"
    ) {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateNewRequest(payload);
  };

  // Error display
  const errorDisplay = generationError && (
    <div className="text-red-500 text-center text-sm">{generationError}</div>
  );


  return (
    <div>
      {/* Model + Style row */}
      <div className="flex w-full mt-2 mb-2 justify-center items-center space-x-4 shadow-lg">
        {/* Model Selection */}
        <div className="flex items-center space-x-2">
          <div className="text-md font-bold flex items-center">
             Model
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} Credits`}
            >
              <FaQuestionCircle
                className="ml-1 "
                data-tip
                data-for="modelCostTooltip"
              />
            </a>
            <Tooltip id="modelCostTooltip" place="right" effect="solid" />
          </div>
          <select
            onChange={setSelectedModelDisplay}
            className={`${selectBG} p-1 rounded`}
            value={selectedGenerationModel}
          >
            {IMAGE_GENERAITON_MODEL_TYPES.map((model) => (
              <option key={model.key} value={model.key}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Image Style Selection (if RECRAFT) */}
        {(selectedGenerationModel === "RECRAFTV3" ||
          selectedGenerationModel === "RECRAFT20B") && (
          <div className="flex items-center space-x-2">
            <div className="text-xs font-bold">Image Style</div>
            <select
              onChange={handleImageStyleChange}
              value={selectedImageStyle || ""}
              className={`${selectBG} p-1 rounded`}
            >
              {RECRAFT_IMAGE_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="inline-flex items-center ml-4 space-x-4">
          {/* Retry on fail */}
          <label className="flex items-center text-xs font-semibold">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={retryOnFailure}
              onChange={(e) => setRetryOnFailure(e.target.checked)}
            />
            <span className="ml-1 flex items-center">
              Retry on fail
              <a
                data-tooltip-id="retryOnFailTooltip"
                data-tooltip-content="Retry generation if it fails upto 3 times with variants of the prompt"
              >
                <FaQuestionCircle
                  className="ml-1"
                  data-tip
                  data-for="retryOnFailTooltip"
                />
              </a>
              <Tooltip id="retryOnFailTooltip" place="right" effect="solid" />
            </span>
          </label>

          {/* Speaker / Character Image */}
          <label className="flex items-center text-xs font-semibold">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={isCharacterImage}
              onChange={(e) => setIsCharacterImage(e.target.checked)}
            />
            <span className="ml-1 flex items-center">
              Speaker Scene
              <a
                data-tooltip-id="characterImageTooltip"
                data-tooltip-content="Generate an image from the POV of the main character in the prompt."
              >
                <FaQuestionCircle
                  className="ml-1"
                  data-tip
                  data-for="characterImageTooltip"
                />
              </a>
              <Tooltip id="characterImageTooltip" place="right" effect="solid" />
            </span>
          </label>
        </div>

      {/* Prompt Textarea */}
      <TextareaAutosize
        onChange={(evt) => setPromptText(evt.target.value)}
        placeholder="Describe your prompt to generate an image"
        className={`${textBG} w-full m-auto p-2 rounded-lg`}
        minRows={2}
        value={promptText}
      />

      {/* Submit + Checkboxes row */}
      <div className="text-center mt-2">
        <CommonButton onClick={handleSubmit} isPending={isGenerationPending}>
          Submit
        </CommonButton>

      </div>

      {/* Error Display */}
      {errorDisplay}
    </div>
  );
}
