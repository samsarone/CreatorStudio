import React, { useEffect, useState } from "react";
import CommonButton from "../../../common/CommonButton.tsx";
import { IMAGE_GENERAITON_MODEL_TYPES } from "../../../../constants/Types.ts";
import { useColorMode } from "../../../../contexts/ColorMode.jsx";
import { IMAGE_MODEL_PRICES } from "../../../../constants/ModelPrices.jsx";
import TextareaAutosize from "react-textarea-autosize";
import ImagePayloadAspectRatioSelector from "../../../image/ImagePayloadAspectRatioSelector.jsx";
import { imageAspectRatioOptions } from "../../../../constants/ImageAspectRatios.js";

import { FaCheck, FaQuestionCircle } from "react-icons/fa";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

export default function OverlayPromptGenerator(props) {
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
    setAspectRatio,
    canvasDimensions,
    layoutMode = "square",
    showAspectRatioSelector = false,
    editorVariant = "videoStudio",
  } = props;

  const { colorMode } = useColorMode();
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [isCharacterImage, setIsCharacterImage] = useState(false);
  const [selectedImageStyle, setSelectedImageStyle] = useState(null);

  const isPortraitLayout = layoutMode === "portrait";
  const isLandscapeLayout = layoutMode === "landscape";
  const isImageStudioPrompt = editorVariant === "imageStudio";
  const selectShell =
    colorMode === "dark"
      ? "bg-slate-950 text-slate-100 border border-slate-700"
      : "bg-slate-50 text-slate-900 border border-slate-200 shadow-sm";
  const textareaShell =
    colorMode === "dark"
      ? "bg-slate-950 text-slate-100 border border-slate-700"
      : "bg-slate-50 text-slate-900 border border-slate-200 shadow-sm";
  const checkboxText =
    colorMode === "dark" ? "text-slate-200" : "text-slate-600";
  const fieldLabelClassName =
    colorMode === "dark"
      ? "text-xs font-semibold text-slate-200"
      : "text-xs font-semibold text-slate-700";
  const fieldLayoutClassName = isImageStudioPrompt
    ? "flex w-full flex-col gap-3"
    : isLandscapeLayout
    ? "grid w-full grid-cols-2 gap-3"
    : "flex w-full flex-col gap-3";
  const controlGroupClassName = "flex w-full min-w-0 items-center gap-3";
  const optionRowClassName = isImageStudioPrompt
    ? "flex flex-wrap items-center gap-2"
    : "flex flex-wrap items-center justify-end gap-2";
  const optionChipBase =
    colorMode === "dark"
      ? "bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-900"
      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white";
  const optionChipActive =
    colorMode === "dark"
      ? "bg-slate-900 border border-slate-500 text-white"
      : "bg-slate-100 border border-slate-300 text-slate-900";
  const optionIndicatorBase =
    colorMode === "dark"
      ? "border-slate-600 bg-slate-950 text-slate-200"
      : "border-slate-300 bg-white text-slate-700";
  const optionIndicatorActive =
    colorMode === "dark"
      ? "border-slate-400 bg-slate-100 text-slate-900"
      : "border-slate-400 bg-slate-900 text-white";

  useEffect(() => {
    const storedDefaultModel = localStorage.getItem("defaultModel");
    if (storedDefaultModel) {
      setSelectedGenerationModel(storedDefaultModel);
    }
  }, [setSelectedGenerationModel]);

  useEffect(() => {
    if (!selectedGenerationModel) return;

    const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find(
      (model) => model.key === selectedGenerationModel
    );
    if (modelDef?.imageStyles?.length) {
      const localKey = `defaultImageStyle_${selectedGenerationModel}`;
      const storedStyle = localStorage.getItem(localKey);
      const isValidStyle = modelDef.imageStyles.includes(storedStyle);

      if (storedStyle && isValidStyle) {
        setSelectedImageStyle(storedStyle);
      } else {
        setSelectedImageStyle(modelDef.imageStyles[0]);
      }
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedGenerationModel]);

  const modelPricing = IMAGE_MODEL_PRICES.find(
    (model) => model.key === selectedGenerationModel
  );
  const priceObj = modelPricing
    ? modelPricing.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;
  const selectedModelDefinition = IMAGE_GENERAITON_MODEL_TYPES.find(
    (model) => model.key === selectedGenerationModel
  );

  const setSelectedModelDisplay = (evt) => {
    const newModel = evt.target.value;
    setSelectedGenerationModel(newModel);
    localStorage.setItem("defaultModel", newModel);
  };

  const handleImageStyleChange = (event) => {
    const newStyle = event.target.value;
    setSelectedImageStyle(newStyle);
    const localKey = `defaultImageStyle_${selectedGenerationModel}`;
    localStorage.setItem(localKey, newStyle);
  };

  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedGenerationModel,
      retryOnFailure,
      isCharacterImage,
      aspectRatio,
    };

    if (selectedModelDefinition?.imageStyles?.length && selectedImageStyle) {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateNewRequest(payload);
  };

  const errorDisplay = generationError ? (
    <div className="text-center text-sm text-red-500">{generationError}</div>
  ) : null;

  return (
    <div className="w-full space-y-3">
      <div className={fieldLayoutClassName}>
        <div className={controlGroupClassName}>
          <div
            className={`${fieldLabelClassName} flex shrink-0 items-center gap-1 whitespace-nowrap`}
          >
            <span>Model</span>
            <a
              data-tooltip-id="modelCostTooltip"
              data-tooltip-content={`Currently selected model cost: ${modelPrice} Credits`}
            >
              <FaQuestionCircle className="text-[11px]" />
            </a>
            <Tooltip id="modelCostTooltip" place="right" effect="solid" />
          </div>
          <select
            onChange={setSelectedModelDisplay}
            className={`${selectShell} min-w-0 flex-1 rounded-md px-2.5 py-2`}
            value={selectedGenerationModel}
          >
            {IMAGE_GENERAITON_MODEL_TYPES.map((model) => (
              <option key={model.key} value={model.key}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {selectedModelDefinition?.imageStyles?.length ? (
          <div className={controlGroupClassName}>
            <div className={`${fieldLabelClassName} shrink-0 whitespace-nowrap`}>
              Style
            </div>
            <select
              onChange={handleImageStyleChange}
              value={selectedImageStyle || ""}
              className={`${selectShell} min-w-0 flex-1 rounded-md px-2.5 py-2`}
            >
              {selectedModelDefinition.imageStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {showAspectRatioSelector ? (
        <div className="w-full">
          <ImagePayloadAspectRatioSelector
            label="Generation ratio"
            value={aspectRatio}
            onChange={setAspectRatio}
            options={imageAspectRatioOptions}
            canvasDimensions={canvasDimensions}
            compactInline
          />
        </div>
      ) : null}

      <div className={`${optionRowClassName} ${checkboxText}`}>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            retryOnFailure ? optionChipActive : optionChipBase
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={retryOnFailure}
            onChange={(event) => setRetryOnFailure(event.target.checked)}
          />
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[9px] ${
              retryOnFailure ? optionIndicatorActive : optionIndicatorBase
            }`}
          >
            {retryOnFailure ? <FaCheck /> : null}
          </span>
          <span className="flex items-center gap-1">
            Retry
            <a
              data-tooltip-id="retryOnFailTooltip"
              data-tooltip-content="Retry generation if it fails up to 3 times with prompt variants"
            >
              <FaQuestionCircle className="text-[10px] opacity-70" />
            </a>
            <Tooltip id="retryOnFailTooltip" place="right" effect="solid" />
          </span>
        </label>

        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            isCharacterImage ? optionChipActive : optionChipBase
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={isCharacterImage}
            onChange={(event) => setIsCharacterImage(event.target.checked)}
          />
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[9px] ${
              isCharacterImage ? optionIndicatorActive : optionIndicatorBase
            }`}
          >
            {isCharacterImage ? <FaCheck /> : null}
          </span>
          <span className="flex items-center gap-1">
            Speaker scene
            <a
              data-tooltip-id="characterImageTooltip"
              data-tooltip-content="Generate an image from the POV of the main character in the prompt."
            >
              <FaQuestionCircle className="text-[10px] opacity-70" />
            </a>
            <Tooltip id="characterImageTooltip" place="right" effect="solid" />
          </span>
        </label>
      </div>

      <TextareaAutosize
        onChange={(event) => setPromptText(event.target.value)}
        placeholder="Describe your prompt to generate an image"
        className={`${textareaShell} w-full rounded-lg px-3 py-2`}
        minRows={isPortraitLayout ? 3 : 2}
        value={promptText}
      />

      <div
        className={`flex pt-1 ${
          isPortraitLayout ? "justify-stretch" : "justify-end"
        }`}
      >
        <CommonButton
          onClick={handleSubmit}
          isPending={isGenerationPending}
          extraClasses={isPortraitLayout ? "w-full" : "min-w-[140px]"}
        >
          Submit
        </CommonButton>
      </div>

      {errorDisplay}
    </div>
  );
}
