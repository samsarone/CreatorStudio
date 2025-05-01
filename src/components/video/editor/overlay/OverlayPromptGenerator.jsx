import React, { useState, useEffect } from "react";
import CommonButton from "../../../common/CommonButton.tsx";
import { IMAGE_GENERAITON_MODEL_TYPES } from "../../../../constants/Types.ts";
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
    submitGenerateRequest, // (unused in this snippet, but kept for compatibility)
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    currentDefaultPrompt, // (unused in this snippet, but kept for compatibility)
    submitGenerateNewRequest,
    aspectRatio,
  } = props;

  const { colorMode } = useColorMode();

  // Checkboxes
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [isCharacterImage, setIsCharacterImage] = useState(false);

  // Single unified "imageStyle" for any model that has an `imageStyles` array
  const [selectedImageStyle, setSelectedImageStyle] = useState(null);

  // ─────────────────────────────────────────────────────────
  //  On mount, ensure we pick a default model from localStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    // The code below references 'defaultModel' from localStorage
    // If you prefer 'defaultImageModel', change accordingly:
    const storedDefaultModel = localStorage.getItem("defaultModel");
    if (storedDefaultModel) {
      setSelectedGenerationModel(storedDefaultModel);
    }
    // If there's no stored model, we stick with whichever is set by parent props
  }, [setSelectedGenerationModel]);

  // ─────────────────────────────────────────────────────────
  //  Whenever the selected model changes, check if it has imageStyles.
  //  If so, load from localStorage or default to the first style.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGenerationModel) return;

    const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedGenerationModel
    );
    if (modelDef?.imageStyles?.length) {
      const localKey = `defaultImageStyle_${selectedGenerationModel}`;
      const storedStyle = localStorage.getItem(localKey);

      // If we have a stored style that still exists in this model's array, use it
      const isValidStyle = modelDef.imageStyles.includes(storedStyle);
      if (storedStyle && isValidStyle) {
        setSelectedImageStyle(storedStyle);
      } else {
        // Otherwise default to the first style in the array
        setSelectedImageStyle(modelDef.imageStyles[0]);
      }
    } else {
      // No imageStyles for this model
      setSelectedImageStyle(null);
    }
  }, [selectedGenerationModel]);

  // ─────────────────────────────────────────────────────────
  //  Theme-based styling
  // ─────────────────────────────────────────────────────────
  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark" ? "bg-gray-800" : "bg-gray-200 border-gray-600 border-2";

  // ─────────────────────────────────────────────────────────
  //  Compute cost for the selected model + aspect ratio
  // ─────────────────────────────────────────────────────────
  const modelPricing = IMAGE_MODEL_PRICES.find(
    (model) => model.key === selectedGenerationModel
  );
  const priceObj = modelPricing
    ? modelPricing.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  // ─────────────────────────────────────────────────────────
  //  Handle changes to model
  // ─────────────────────────────────────────────────────────
  const setSelectedModelDisplay = (evt) => {
    const newModel = evt.target.value;
    setSelectedGenerationModel(newModel);
    localStorage.setItem("defaultModel", newModel);
  };

  // ─────────────────────────────────────────────────────────
  //  Handle changes to image style
  // ─────────────────────────────────────────────────────────
  const handleImageStyleChange = (e) => {
    const newStyle = e.target.value;
    setSelectedImageStyle(newStyle);
    const localKey = `defaultImageStyle_${selectedGenerationModel}`;
    localStorage.setItem(localKey, newStyle);
  };

  // ─────────────────────────────────────────────────────────
  //  Handle submission
  // ─────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedGenerationModel,
      retryOnFailure,
      isCharacterImage,
    };

    // If model has imageStyles & user selected one, attach it
    const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedGenerationModel
    );
    if (modelDef?.imageStyles?.length && selectedImageStyle) {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateNewRequest(payload);
  };

  // ─────────────────────────────────────────────────────────
  //  Render error, if any
  // ─────────────────────────────────────────────────────────
  const errorDisplay = generationError && (
    <div className="text-red-500 text-center text-sm">{generationError}</div>
  );

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* ───────────────────────── Model + Style row ───────────────────────── */}
      <div className="flex w-full mt-2 mb-2 justify-center items-center space-x-4 shadow-lg">
        {/* Model Selection */}
        <div className="flex items-center space-x-2">
          <div className="text-md font-bold flex items-center">
            Model
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} Credits`}
            >
              <FaQuestionCircle className="ml-1" />
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

        {/* If the current model has an imageStyles array, show the dropdown */}
        {(() => {
          const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find(
            (m) => m.key === selectedGenerationModel
          );
          if (modelDef?.imageStyles?.length) {
            return (
              <div className="flex items-center space-x-2">
                <div className="text-xs font-bold">Image Style</div>
                <select
                  onChange={handleImageStyleChange}
                  value={selectedImageStyle || ""}
                  className={`${selectBG} p-1 rounded`}
                >
                  {modelDef.imageStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* ───────────────────────── Checkboxes (Retry/Speaker) ───────────────────────── */}
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
              data-tooltip-content="Retry generation if it fails up to 3 times with prompt variants"
            >
              <FaQuestionCircle className="ml-1" />
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
              <FaQuestionCircle className="ml-1" />
            </a>
            <Tooltip id="characterImageTooltip" place="right" effect="solid" />
          </span>
        </label>
      </div>

      {/* ───────────────────────── Prompt Textarea ───────────────────────── */}
      <TextareaAutosize
        onChange={(evt) => setPromptText(evt.target.value)}
        placeholder="Describe your prompt to generate an image"
        className={`${textBG} w-full m-auto p-2 rounded-lg mt-2`}
        minRows={2}
        value={promptText}
      />

      {/* ───────────────────────── Submit Button ───────────────────────── */}
      <div className="text-center mt-2">
        <CommonButton onClick={handleSubmit} isPending={isGenerationPending}>
          Submit
        </CommonButton>
      </div>

      {/* ───────────────────────── Error Display ───────────────────────── */}
      {errorDisplay}
    </div>
  );
}
