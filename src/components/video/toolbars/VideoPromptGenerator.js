import React, { useState, useEffect } from "react";
import CommonButton from "../../common/CommonButton.tsx";
import { VIDEO_GENERATION_MODEL_TYPES } from "../../../constants/Types.ts";
import { useColorMode } from "../../../contexts/ColorMode.js";
import TextareaAutosize from 'react-textarea-autosize';
import { VIDEO_MODEL_PRICES } from "../../../constants/ModelPrices.js";

export default function VideoPromptGenerator(props) {
  const {
    videoPromptText,
    setVideoPromptText,
    submitGenerateRequest,
    aiVideoGenerationPending,
    selectedVideoGenerationModel,
    setSelectedVideoGenerationModel,
    generationError,
    currentDefaultPrompt,
    submitGenerateNewVideoRequest,
    aspectRatio,
  } = props;

  const { colorMode } = useColorMode();

  const selectBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";
  const textBG = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200 border-gray-600 border-2";

  console.log("AI VIDEO GENERATION PENDING " + aiVideoGenerationPending);
  

  const modelOptionMap = VIDEO_GENERATION_MODEL_TYPES.map(function (model) {
    if (aspectRatio && aspectRatio !== '16:9') {
      if (model.key === 'HAILUO') {
        return null;
      } else {
        return (
          <option key={model.key} value={model.key}>
            {model.name}
          </option>
        )
      }
    } else {
      return (
        <option key={model.key} value={model.key}>
          {model.name}
        </option>
      )
    }
  }).filter(Boolean);

  // Load initial state from localStorage
  const [useStartFrame, setUseStartFrame] = useState(() => {
    const storedStartFrame = localStorage.getItem('defaultVideoStartFrame');
    return storedStartFrame === null ? true : storedStartFrame === 'true';
  });
  const [useEndFrame, setUseEndFrame] = useState(() => {
    const storedEndFrame = localStorage.getItem('defaultVideoEndFrame');
    return storedEndFrame === null ? true : storedEndFrame === 'true';
  });
  const [combineLayers, setCombineLayers] = useState(() => {
    const storedCombineLayers = localStorage.getItem('combineLayers');
    return storedCombineLayers === null ? false : storedCombineLayers === 'true';
  });
  const [clipLayerToAiVideo, setClipLayerToAiVideo] = useState(() => {
    const storedClipLayer = localStorage.getItem('clipLayerToAiVideo');
    return storedClipLayer === null ? false : storedClipLayer === 'true';
  });
  const [optimizePrompt, setOptimizePrompt] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);

  // Set defaults from localStorage or use initial values
  useEffect(() => {
    const defaultModel = localStorage.getItem('defaultVideoModel') || VIDEO_GENERATION_MODEL_TYPES[0].key;
    setSelectedVideoGenerationModel(defaultModel);

    if (defaultModel === 'HAILUO' || defaultModel === 'HAIPER2.0') {
      const storedOptimizePrompt = localStorage.getItem('defaultOptimizePrompt');
      setOptimizePrompt(storedOptimizePrompt === 'true');
    } else {
      setOptimizePrompt(false);
    }

    const modelPricing = VIDEO_MODEL_PRICES.find(model => model.key === defaultModel);
    if (modelPricing && modelPricing.units && modelPricing.units.length > 0) {
      // Set selectedDuration to first unit or from localStorage
      const storedDuration = localStorage.getItem('defaultDurationFor' + defaultModel);
      if (storedDuration && modelPricing.units.includes(parseInt(storedDuration))) {
        setSelectedDuration(parseInt(storedDuration));
      } else {
        setSelectedDuration(modelPricing.units[0]);
      }
    } else {
      setSelectedDuration(null);
    }
  }, [setSelectedVideoGenerationModel]);

  const setSelectedModelDisplay = (evt) => {
    const newModel = evt.target.value;
    setSelectedVideoGenerationModel(newModel);
    localStorage.setItem('defaultVideoModel', newModel);

    if (newModel === 'SDVIDEO') {
      setUseEndFrame(false); // Ensure end frame is false for SDVIDEO
    }

    if (newModel === 'HAILUO' || newModel === 'HAIPER2.0') {
      const storedOptimizePrompt = localStorage.getItem('defaultOptimizePrompt');
      setOptimizePrompt(storedOptimizePrompt === 'true');
    } else {
      setOptimizePrompt(false);
    }

    const modelPricing = VIDEO_MODEL_PRICES.find(model => model.key === newModel);
    if (modelPricing && modelPricing.units && modelPricing.units.length > 0) {
      // Set selectedDuration to first unit or from localStorage
      const storedDuration = localStorage.getItem('defaultDurationFor' + newModel);
      if (storedDuration && modelPricing.units.includes(parseInt(storedDuration))) {
        setSelectedDuration(parseInt(storedDuration));
      } else {
        setSelectedDuration(modelPricing.units[0]);
      }
    } else {
      setSelectedDuration(null);
    }
  };

  const handleDurationChange = (e) => {
    const duration = parseInt(e.target.value);
    setSelectedDuration(duration);
    localStorage.setItem('defaultDurationFor' + selectedVideoGenerationModel, duration.toString());
  };

  const handleSubmit = () => {
    const payload = {
      useStartFrame: selectedVideoGenerationModel === 'SDVIDEO' ? true : useStartFrame,
      useEndFrame: selectedVideoGenerationModel === 'SDVIDEO' ? false : useEndFrame,
      combineLayers,
      clipLayerToAiVideo,
    };

    // Add optimizePrompt to the payload if model is HAILUO or HAIPER2.0
    if (selectedVideoGenerationModel === 'HAILUO' || selectedVideoGenerationModel === 'HAIPER2.0') {
      payload.usePromptOptimizer = optimizePrompt;
    }

    // Add selectedDuration to payload if it exists
    if (selectedDuration !== null) {
      payload.duration = selectedDuration;
    }

    submitGenerateNewVideoRequest(payload);
  };

  const handleStartFrameChange = (e) => {
    const checked = e.target.checked;
    setUseStartFrame(checked);
    localStorage.setItem('defaultVideoStartFrame', checked.toString());
  };

  const handleEndFrameChange = (e) => {
    const checked = e.target.checked;
    setUseEndFrame(checked);
    localStorage.setItem('defaultVideoEndFrame', checked.toString());
  };

  const handleClipLayerChange = (e) => {
    const checked = e.target.checked;
    setClipLayerToAiVideo(checked);
    localStorage.setItem('clipLayerToAiVideo', checked.toString());
  };

  const submitOptimizePromptToggle = (checked) => {
    localStorage.setItem('defaultOptimizePrompt', checked.toString());
    setOptimizePrompt(checked);
  };

  // Calculate expected cost
  const modelPricing = VIDEO_MODEL_PRICES.find(model => model.key === selectedVideoGenerationModel);
  const priceObj = modelPricing ? modelPricing.prices.find(price => price.aspectRatio === aspectRatio) : null;
  let modelPrice = priceObj ? priceObj.price : 0;

  // Adjust price based on selected duration
  if (modelPricing && modelPricing.units && selectedDuration !== null) {
    const unitIndex = modelPricing.units.findIndex(unit => unit.toString() === selectedDuration.toString());
    const generationCostMultiplier = unitIndex + 1;
    modelPrice = modelPrice * generationCostMultiplier;
  }

  const errorDisplay = generationError ? (
    <div className="text-red-500 text-center text-sm">
      {generationError}
    </div>
  ) : null;

  return (
    <div>
      <div className="flex w-full mb-2 flex-col">
        <div className="w-full">
          <div className="text-xs font-semibold text-gray-300">
            This action will incur <span className="text-blue-300">{modelPrice} Credits</span>
          </div>
        </div>

        {/* Start Frame Checkbox */}
        <div className="flex w-full items-center mt-2 flex-wrap">
          <label className="inline-flex items-center text-sm mr-4">
            <input
              type="checkbox"
              checked={useStartFrame}
              onChange={handleStartFrameChange}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-xs">Start frame</span>
          </label>

          {/* End Frame Checkbox (Hidden for SDVIDEO) */}
          {(selectedVideoGenerationModel === 'LUMA' || selectedVideoGenerationModel === 'RUNWAYML') && (
            <label className="inline-flex items-center text-sm mr-4">
              <input
                type="checkbox"
                checked={useEndFrame}
                onChange={handleEndFrameChange}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs">End frame</span>
            </label>
          )}

          {/* Clip Layer to Video Duration Checkbox */}
          <label className="inline-flex items-center text-sm mr-4">
            <input
              type="checkbox"
              checked={clipLayerToAiVideo}
              onChange={handleClipLayerChange}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-xs">Trim Scene</span>
          </label>

          {/* Optimize Prompt Checkbox for HAILUO and HAIPER2.0 */}
          {(selectedVideoGenerationModel === 'HAILUO' || selectedVideoGenerationModel === 'HAIPER2.0') && (
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

        {/* Model and Duration Selectors */}
        {selectedVideoGenerationModel === 'RUNWAYML' || selectedVideoGenerationModel === 'HAIPER2.0' ? (
          // For RUNWAYML and HAIPER2.0, labels below the form elements and form elements cover entire area
          <>
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

            {modelPricing && modelPricing.units && (
              <>
                <div className="flex w-full items-center mt-2">
                  <select
                    onChange={handleDurationChange}
                    className={`${selectBG} w-full border border-gray-300 rounded-md p-1`}
                    value={selectedDuration}
                  >
                    {modelPricing.units.map((unit) => (
                      <option key={unit} value={unit}>{unit} seconds</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full text-sm font-bold mt-1">Duration</div>
              </>
            )}
          </>
        ) : (
          // For other models, labels next to form elements
          <div className="flex w-full items-center mt-2">
            <div className="w-[25%] text-sm font-bold">Model</div>
            <select
              onChange={setSelectedModelDisplay}
              className={`${selectBG} ${modelPricing && modelPricing.units ? 'w-[35%]' : 'w-[75%]'} border border-gray-300 rounded-md p-1`}
              value={selectedVideoGenerationModel}
            >
              {modelOptionMap}
            </select>
            {modelPricing && modelPricing.units && (
              <>
                <div className="w-[15%] text-sm font-bold text-right pr-3">Duration</div>
                <select
                  onChange={handleDurationChange}
                  className={`${selectBG} w-[25%] border border-gray-300 rounded-md p-1`}
                  value={selectedDuration}
                >
                  {modelPricing.units.map((unit) => (
                    <option key={unit} value={unit}>{unit} seconds</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Textarea (Hidden for SDVIDEO) */}
      {selectedVideoGenerationModel !== 'SDVIDEO' && (
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