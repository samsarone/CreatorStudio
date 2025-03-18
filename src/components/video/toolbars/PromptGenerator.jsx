import React, { useState, useEffect } from "react";
import CommonButton from "../../common/CommonButton.tsx";
import { IMAGE_GENERAITON_MODEL_TYPES, RECRAFT_IMAGE_STYLES } from "../../../constants/Types.ts";
import { IMAGE_MODEL_PRICES } from "../../../constants/ModelPrices.jsx";
import { useColorMode } from "../../../contexts/ColorMode.jsx";
import TextareaAutosize from 'react-textarea-autosize';
import { FaQuestionCircle } from "react-icons/fa";

import 'react-tooltip/dist/react-tooltip.css';
import { Tooltip } from 'react-tooltip';

export default function PromptGenerator(props) {
  const {
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

  const { colorMode } = useColorMode();

  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [isCharacterImage, setIsCharacterImage] = useState(false);

  // For RECRAFT
  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    if (selectedGenerationModel === "RECRAFTV3" || selectedGenerationModel === "RECRAFT20B") {
      const defaultRecraftModel = localStorage.getItem("defaultRecraftModel");
      return defaultRecraftModel ? defaultRecraftModel : RECRAFT_IMAGE_STYLES[0];
    }
    return null;
  });

  useEffect(() => {
    if (selectedGenerationModel === "RECRAFTV3" || selectedGenerationModel === "RECRAFT20B") {
      const defaultRecraftModel = localStorage.getItem("defaultRecraftModel");
      setSelectedImageStyle(defaultRecraftModel || RECRAFT_IMAGE_STYLES[0]);
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedGenerationModel]);

  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark"
      ? "bg-gray-800"
      : "bg-gray-200 border-gray-600 border-2";

  // --- Compute cost for the selected model + aspect ratio ---
  const pricingInfo = IMAGE_MODEL_PRICES.find((m) => m.key === selectedGenerationModel);
  const priceObj = pricingInfo
    ? pricingInfo.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  // Handle selection of generation model
  const setSelectedModelDisplay = (evt) => {
    const newModel = evt.target.value;
    setSelectedGenerationModel(newModel);
    localStorage.setItem("defaultImageModel", newModel);
  };

  // Handle style selection for RECRAFT
  const handleImageStyleChange = (e) => {
    const newStyle = e.target.value;
    setSelectedImageStyle(newStyle);
    if (selectedGenerationModel === "RECRAFTV3" || selectedGenerationModel === "RECRAFT20B") {
      localStorage.setItem("defaultRecraftModel", newStyle);
    }
  };

  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedGenerationModel,
      retryOnFailure,
      isCharacterImage,
    };
    if (selectedGenerationModel === "RECRAFTV3" || selectedGenerationModel === "RECRAFT20B") {
      payload.imageStyle = selectedImageStyle;
    }
    submitGenerateNewRequest(payload);
  };

  const errorDisplay = generationError && (
    <div className="text-red-500 text-center text-sm">{generationError}</div>
  );

  return (
    <div>
      {/* Model Selection */}
      <div className="flex w-full mt-2 mb-2">
        <div className="inline-flex w-[25%] items-center">
          <div className="text-xs font-bold flex items-center">
            Model
            <a data-tooltip-id="modelCostTooltip" data-tooltip-content={` Currently selected model cost\n: ${modelPrice} Credits`}>
            <FaQuestionCircle
              className="ml-1 mr-1"
              data-tip
              data-for="modelCostTooltip"
            />
            </a>
            {/* Single Tooltip showing cost of currently selected model */}
            <Tooltip id="modelCostTooltip" place="right" effect="solid">

            </Tooltip>
          </div>
        </div>
        <select
          onChange={setSelectedModelDisplay}
          className={`${selectBG} inline-flex w-[75%]`}
          value={selectedGenerationModel}
        >
          {IMAGE_GENERAITON_MODEL_TYPES.map((model) => (
            <option key={model.key} value={model.key}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Image Style for RECRAFT only */}
      {(selectedGenerationModel === "RECRAFTV3" || selectedGenerationModel === "RECRAFT20B") && (
        <div className="flex w-full mt-2 mb-2">
          <div className="inline-flex w-[25%]">
            <div className="text-xs font-bold">Image Style</div>
          </div>
          <select
            onChange={handleImageStyleChange}
            value={selectedImageStyle || ""}
            className={`${selectBG} inline-flex w-[75%]`}
          >
            {RECRAFT_IMAGE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Retry on fail + Character Image checkboxes */}
      <div className="w-full mb-2">
        <div className="text-xs font-semibold flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={retryOnFailure}
              onChange={(e) => setRetryOnFailure(e.target.checked)}
            />
            <span className="ml-1 text-xs font-semibold">
              Fail Retry
              <a data-tooltip-id="retryOnFailTooltip" data-tooltip-content="Retry generation if it fails">
                <FaQuestionCircle
                  className="ml-1 inline-flex"
                  data-tip
                  data-for="retryOnFailTooltip"
                />
              </a>
              {/* Single Tooltip showing cost of currently selected model */}
              <Tooltip id="retryOnFailTooltip" place="right" effect="solid">
                Retry generation if it fails  
              </Tooltip>
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={isCharacterImage}
              onChange={(e) => setIsCharacterImage(e.target.checked)}
            />
            <span className="ml-1 text-xs font-semibold">Speaker 
              <a data-tooltip-id="characterImageTooltip" data-tooltip-content="Generate an image of a character speaking the prompt">
                <FaQuestionCircle
                  className="ml-1 inline-flex"
                  data-tip
                  data-for="characterImageTooltip"
                />
              </a>
              {/* Single Tooltip showing cost of currently selected model */}
              <Tooltip id="characterImageTooltip" place="right" effect="solid">
                Generate an image of a character speaking the prompt
              </Tooltip>  
            </span>
          </label>
        </div>
      </div>

      {/* Prompt Textarea */}
      <TextareaAutosize
        onChange={(evt) => setPromptText(evt.target.value)}
        placeholder="Add prompt text here"
        className={`${textBG} w-full m-auto p-4 rounded-lg`}
        minRows={3}
        value={promptText}
      />

      {/* Submit Button */}
      <div className="text-center">
        <CommonButton onClick={handleSubmit} isPending={isGenerationPending}>
          Submit
        </CommonButton>
      </div>

      {errorDisplay}
    </div>
  );
}
