import React, { useEffect, useState } from 'react';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import TextareaAutosize from 'react-textarea-autosize';
import { IMAGE_MODEL_PRICES } from '../../../constants/ModelPrices.jsx';
import { IMAGE_GENERAITON_MODEL_TYPES } from "../../../constants/Types.ts";

export default function PromptViewer(props) {
  const {
    currentDefaultPrompt,
    submitGenerateRecreateRequest,
    showCreateNewPrompt,
    isGenerationPending,
    aspectRatio,
  } = props;

  // Track whether to retry on failure
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  // Prompt text
  const [promptText, setPromptText] = useState(currentDefaultPrompt);
  // Selected model
  const [selectedModel, setSelectedModel] = useState(IMAGE_GENERAITON_MODEL_TYPES[0].key);
  // Selected image style, if the model supports it
  const [selectedImageStyle, setSelectedImageStyle] = useState(null);

  // ─────────────────────────────────────────────────────────
  //  On mount, try to load default model from localStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const storageModel = localStorage.getItem('defaultImageModel');
    if (storageModel) {
      setSelectedModel(storageModel);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Whenever the selected model changes, see if it has imageStyles.
  //  If it does, load from localStorage or default to the first style.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find((m) => m.key === selectedModel);
    if (modelDef?.imageStyles?.length) {
      const localKey = `defaultImageStyle_${selectedModel}`;
      const storedStyle = localStorage.getItem(localKey);

      // If we have a stored style that still exists in this model's array, use it
      const isValidStoredStyle = modelDef.imageStyles.includes(storedStyle);
      if (storedStyle && isValidStoredStyle) {
        setSelectedImageStyle(storedStyle);
      } else {
        // Otherwise, default to the first style in the array
        setSelectedImageStyle(modelDef.imageStyles[0]);
      }
    } else {
      // This model doesn't have an imageStyles array
      setSelectedImageStyle(null);
    }
  }, [selectedModel]);

  // ─────────────────────────────────────────────────────────
  //  Handle changes
  // ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setPromptText(e.target.value);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('defaultImageModel', newModel);
  };

  const handleImageStyleChange = (e) => {
    const newStyle = e.target.value;
    setSelectedImageStyle(newStyle);
    const localKey = `defaultImageStyle_${selectedModel}`;
    localStorage.setItem(localKey, newStyle);
  };

  // ─────────────────────────────────────────────────────────
  //  Submitting (Regenerate)
  // ─────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedModel,
      // If you also want to send retryOnFailure:
      retryOnFailure,
    };

    // If model supports imageStyles, attach the user’s chosen style
    const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find((m) => m.key === selectedModel);
    if (modelDef?.imageStyles?.length && selectedImageStyle) {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateRecreateRequest(payload);
  };

  // ─────────────────────────────────────────────────────────
  //  Pricing
  // ─────────────────────────────────────────────────────────
  const modelPricing = IMAGE_MODEL_PRICES.find((m) => m.key === selectedModel);
  const priceObj = modelPricing
    ? modelPricing.prices.find((price) => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  // Build the model dropdown
  const modelOptionMap = IMAGE_GENERAITON_MODEL_TYPES.map((model) => (
    <option key={model.key} value={model.key}>
      {model.name}
    </option>
  ));

  return (
    <div className="flex flex-col items-center space-y-2 bg-neutral-800 p-2 rounded-lg">
      {/* ───────────── Display Cost & Retry Option ───────────── */}
      <div className="w-full">
        <div className="text-xs font-semibold text-gray-300">
          Incurs <span className="text-blue-300">{modelPrice} Credits</span>
          <label className="ml-2 items-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={retryOnFailure}
              onChange={(e) => setRetryOnFailure(e.target.checked)}
            />
            <span className="ml-1 text-xs font-semibold">Retry on fail</span>
          </label>
        </div>
      </div>

      {/* ───────────── Model Selection ───────────── */}
      <div className="flex w-full mt-2 mb-2">
        <div className="inline-flex w-[25%]">
          <div className="text-xs font-bold">Model</div>
        </div>
        <select
          onChange={handleModelChange}
          value={selectedModel}
          className="w-[75%] p-2 border rounded bg-[#171717] text-[#fafafa]"
        >
          {modelOptionMap}
        </select>
      </div>

      {/* ───────────── Image Style Dropdown (if model has imageStyles) ───────────── */}
      {(() => {
        const modelDef = IMAGE_GENERAITON_MODEL_TYPES.find((m) => m.key === selectedModel);
        if (modelDef?.imageStyles?.length) {
          return (
            <div className="flex w-full mt-2 mb-2">
              <div className="inline-flex w-[25%]">
                <div className="text-xs font-bold">Image Style</div>
              </div>
              <select
                onChange={handleImageStyleChange}
                value={selectedImageStyle || ''}
                className="w-[75%] p-2 border rounded bg-[#171717] text-[#fafafa]"
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

      {/* ───────────── Prompt Textarea ───────────── */}
      <TextareaAutosize
        className="text-left max-h-64 overflow-y-auto w-full px-2 py-2 border rounded bg-[#171717] text-[#fafafa]"
        value={promptText}
        onChange={handleInputChange}
        minRows={3}
        maxRows={10}
        style={{ resize: 'none' }}
      />

      {/* ───────────── Action Buttons ───────────── */}
      <div className="flex space-x-4">
        <SecondaryButton
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleSubmit}
          isPending={isGenerationPending}
        >
          Regenerate
        </SecondaryButton>

        <SecondaryButton
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={showCreateNewPrompt}
          isPending={isGenerationPending}
        >
          New
        </SecondaryButton>
      </div>
    </div>
  );
}
