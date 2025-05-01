import React, { useState, useEffect } from "react";
import CommonButton from "../../common/CommonButton.tsx";
import {
  IMAGE_GENERAITON_MODEL_TYPES,
  RECRAFT_IMAGE_STYLES,
  IDEOGRAM_IMAGE_STYLES,
} from "../../../constants/Types.ts";
import { IMAGE_MODEL_PRICES } from "../../../constants/ModelPrices.jsx";
import { useColorMode } from "../../../contexts/ColorMode.jsx";
import TextareaAutosize from "react-textarea-autosize";
import { FaQuestionCircle } from "react-icons/fa";
import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";

export default function PromptGenerator(props) {
  const {
    promptText,
    setPromptText,
    submitGenerateNewRequest,
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    aspectRatio,
  } = props;

  const { colorMode } = useColorMode();

  // Whether to retry if generation fails:
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  // Whether it’s a “character speaker” type image:
  const [isCharacterImage, setIsCharacterImage] = useState(false);

  // ------------------------------------------------------------------
  // Track the user-selected image style (if model has an imageStyles array)
  // ------------------------------------------------------------------
  const [selectedImageStyle, setSelectedImageStyle] = useState(null);

  // Whenever the model changes, check if it has `imageStyles`. If so, load from
  // local storage or default to the first style. If not, set to null.
  useEffect(() => {
    if (!selectedGenerationModel) return;

    // Find the model definition from IMAGE_GENERAITON_MODEL_TYPES
    const modelDefinition = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedGenerationModel
    );

    if (modelDefinition?.imageStyles?.length) {
      // We’ll store/retrieve the style in localStorage using a key that’s unique to this model:
      const localStorageKey = `defaultImageStyle_${selectedGenerationModel}`;
      const storedStyle = localStorage.getItem(localStorageKey);

      // If we have a stored style that is still valid for this model, use it
      const isValidStoredStyle = modelDefinition.imageStyles.includes(storedStyle);
      if (storedStyle && isValidStoredStyle) {
        setSelectedImageStyle(storedStyle);
      } else {
        // Otherwise, default to the first style in the array
        setSelectedImageStyle(modelDefinition.imageStyles[0]);
      }
    } else {
      // This model doesn’t have imageStyles
      setSelectedImageStyle(null);
    }
  }, [selectedGenerationModel]);

  // ------------------------------------------------------------------
  // UI style helpers
  // ------------------------------------------------------------------
  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG =
    colorMode === "dark"
      ? "bg-gray-800"
      : "bg-gray-200 border-gray-600 border-2";

  // ------------------------------------------------------------------
  // Find the cost of the current model + aspect ratio, if any
  // ------------------------------------------------------------------
  const pricingInfo = IMAGE_MODEL_PRICES.find(
    (m) => m.key === selectedGenerationModel
  );
  const priceObj = pricingInfo
    ? pricingInfo.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  // ------------------------------------------------------------------
  // Handle user selecting a new model from the dropdown
  // ------------------------------------------------------------------
  const handleModelChange = (evt) => {
    const newModel = evt.target.value;
    setSelectedGenerationModel(newModel);
    localStorage.setItem("defaultImageModel", newModel);
  };

  // ------------------------------------------------------------------
  // Handle user changing the image style (when model has imageStyles)
  // ------------------------------------------------------------------
  const handleImageStyleChange = (evt) => {
    const newStyle = evt.target.value;
    setSelectedImageStyle(newStyle);

    // Save in localStorage so next time user picks this model, we recall it
    const localStorageKey = `defaultImageStyle_${selectedGenerationModel}`;
    localStorage.setItem(localStorageKey, newStyle);
  };

  // ------------------------------------------------------------------
  // On “Submit” click, build the payload and call `submitGenerateNewRequest`
  // ------------------------------------------------------------------
  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedGenerationModel,
      retryOnFailure,
      isCharacterImage,
    };
    // If the selected model has an imageStyles array, include imageStyle
    const modelDefinition = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedGenerationModel
    );
    if (modelDefinition?.imageStyles?.length && selectedImageStyle) {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateNewRequest(payload);
  };

  // Show any generation error
  const errorDisplay = generationError && (
    <div className="text-red-500 text-center text-sm">{generationError}</div>
  );

  return (
    <div>
      {/* ------------------ Model Selection ------------------ */}
      <div className="flex w-full mt-2 mb-2">
        <div className="inline-flex w-[25%] items-center">
          <div className="text-xs font-bold flex items-center">
            Model
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} credits`}
            >
              <FaQuestionCircle className="ml-1 mr-1" />
            </a>
            {/* Tooltip for cost */}
            <Tooltip id="modelCostTooltip" place="right" effect="solid" />
          </div>
        </div>
        <select
          onChange={handleModelChange}
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

      {/* ------------------ Image Style Dropdown ------------------ */}
      {(() => {
        // Check if currently selected model has imageStyles
        const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find(
          (m) => m.key === selectedGenerationModel
        );
        if (modelDef?.imageStyles?.length) {
          return (
            <div className="flex w-full mt-2 mb-2">
              <div className="inline-flex w-[25%]">
                <div className="text-xs font-bold">Image Style</div>
              </div>
              <select
                onChange={handleImageStyleChange}
                value={selectedImageStyle || ""}
                className={`${selectBG} inline-flex w-[75%]`}
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

      {/* ------------------ Retry on Failure & Character Image ------------------ */}
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
              <a
                data-tooltip-id="retryOnFailTooltip"
                data-tooltip-content="Retry generation if it fails"
              >
                <FaQuestionCircle className="ml-1 inline-flex" />
              </a>
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
            <span className="ml-1 text-xs font-semibold">
              Speaker
              <a
                data-tooltip-id="characterImageTooltip"
                data-tooltip-content="Generate an image of a character speaking the prompt"
              >
                <FaQuestionCircle className="ml-1 inline-flex" />
              </a>
              <Tooltip id="characterImageTooltip" place="right" effect="solid">
                Generate an image of a character speaking the prompt
              </Tooltip>
            </span>
          </label>
        </div>
      </div>

      {/* ------------------ Prompt Textarea ------------------ */}
      <TextareaAutosize
        onChange={(evt) => setPromptText(evt.target.value)}
        placeholder="Add prompt text here"
        className={`${textBG} w-full m-auto p-4 rounded-lg`}
        minRows={3}
        value={promptText}
      />

      {/* ------------------ Submit Button ------------------ */}
      <div className="text-center">
        <CommonButton onClick={handleSubmit} isPending={isGenerationPending}>
          Submit
        </CommonButton>
      </div>

      {errorDisplay}
    </div>
  );
}
