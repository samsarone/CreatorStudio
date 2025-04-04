import React, { useEffect, useState } from 'react';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import TextareaAutosize from 'react-textarea-autosize';
import { IMAGE_MODEL_PRICES } from '../../../constants/ModelPrices.jsx';
import { IMAGE_GENERAITON_MODEL_TYPES } from "../../../constants/Types.ts";
import { RECRAFT_IMAGE_STYLES } from "../../../constants/Types.ts";

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
    
  const [promptText, setPromptText] = useState(currentDefaultPrompt);
  const [selectedModel, setSelectedModel] = useState(IMAGE_GENERAITON_MODEL_TYPES[0].key);
  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    if (selectedModel === 'RECRAFTV3'  || selectedModel === 'RECRAFT20B') {
      const defaultRecraftModel = localStorage.getItem('defaultRecraftModel');
      if (defaultRecraftModel) {
        return defaultRecraftModel;
      } else {
        return RECRAFT_IMAGE_STYLES[0];
      }
    } else {
      return null;
    }
  });

  useEffect(() => {
    let storageModel = localStorage.getItem('defaultImageModel');
    if (storageModel && storageModel !== undefined) {
      setSelectedModel(storageModel);
    }
  }, []);

  useEffect(() => {
    if (selectedModel === 'RECRAFTV3'  || selectedModel === 'RECRAFT20B') {
      const defaultRecraftModel = localStorage.getItem('defaultRecraftModel');
      if (defaultRecraftModel) {
        setSelectedImageStyle(defaultRecraftModel);
      } else {
        setSelectedImageStyle(RECRAFT_IMAGE_STYLES[0]);
      }
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedModel]);

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

    if (selectedModel === 'RECRAFTV3'  || selectedModel === 'RECRAFT20B') {
      localStorage.setItem('defaultRecraftModel', newStyle);
    }
  };

  const handleSubmit = () => {
    const payload = {
      prompt: promptText,
      model: selectedModel,
    };

    if (selectedModel === 'RECRAFTV3'  || selectedModel === 'RECRAFT20B') {
      payload.imageStyle = selectedImageStyle;
    }

    submitGenerateRecreateRequest(payload);
  };

  const modelOptionMap = IMAGE_GENERAITON_MODEL_TYPES.map((model) => (
    <option key={model.key} value={model.key}>
      {model.name}
    </option>
  ));

  const modelPricing = IMAGE_MODEL_PRICES.find(model => model.key === selectedModel);
  const priceObj = modelPricing
    ? modelPricing.prices.find(price => price.aspectRatio === aspectRatio)
    : null;
  const modelPrice = priceObj ? priceObj.price : 0;

  return (
    <div className="flex flex-col items-center space-y-2 bg-neutral-800 p-2 rounded-lg">
      {/* Expected Cost Display */}
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

      {/* Model Selection Dropdown */}
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

      {/* Image Style Selection Dropdown (only for RECRAFTV3) */}
      {(selectedModel === 'RECRAFTV3'  || selectedModel === 'RECRAFT20B') && (
        <div className="flex w-full mt-2 mb-2">
          <div className="inline-flex w-[25%]">
            <div className="text-xs font-bold">Image Style</div>
          </div>
          <select
            onChange={handleImageStyleChange}
            value={selectedImageStyle}
            className="w-[75%] p-2 border rounded bg-[#171717] text-[#fafafa]"
          >
            {RECRAFT_IMAGE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prompt Textarea */}
      <TextareaAutosize
        className="text-left max-h-64 overflow-y-auto w-full px-2 py-2 border rounded bg-[#171717] text-[#fafafa]"
        value={promptText}
        onChange={handleInputChange}
        minRows={3}
        maxRows={10}
        style={{ resize: 'none' }}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <SecondaryButton
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleSubmit}
          isPending={isGenerationPending}
        >
          Regenerate
        </SecondaryButton>
        <SecondaryButton
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={showCreateNewPrompt}
          isPending={isGenerationPending}
        >
          New
        </SecondaryButton>
      </div>
    </div>
  );
}