import React from "react";
import CommonButton from "../../common/CommonButton.tsx";
import { IMAGE_GENERAITON_MODEL_TYPES } from "../../../constants/Types.ts";
import { useColorMode } from "../../../contexts/ColorMode.jsx";
import TextareaAutosize from 'react-textarea-autosize';

export default function PromptGenerator(props) {
  const { promptText, setPromptText, submitGenerateRequest, isGenerationPending,
     selectedGenerationModel, setSelectedGenerationModel, generationError,
     currentDefaultPrompt, submitGenerateNewRequest,     aspectRatio } = props;

  const { colorMode } = useColorMode();

  const selectShell =
    colorMode === "dark"
      ? "bg-slate-900/60 text-slate-100 border border-white/10"
      : "bg-white text-slate-900 border border-slate-200 shadow-sm";
  const textareaShell =
    colorMode === "dark"
      ? "bg-slate-900/60 text-slate-100 border border-white/10"
      : "bg-white text-slate-900 border border-slate-200 shadow-sm";

  const modelOptionMap = IMAGE_GENERAITON_MODEL_TYPES.map((model) => {
    return (
      <option key={model.key} value={model.key} selected={model.key === selectedGenerationModel}>
        {model.name}
      </option>
    );
  });

  const setSelectedModelDisplay = (evt) => {
    setSelectedGenerationModel(evt.target.value);
  };

  const errorDisplay = generationError ? (
    <div className="text-red-500 text-center text-sm">
      {generationError}
    </div>
  ) : null;

  return (
    <div>
      <div className="flex w-full mt-2 mb-2">
        <div className="inline-flex w-[25%]">
          <div className="text-xs font-bold">
            Model
          </div>
        </div>
        <select onChange={setSelectedModelDisplay} className={`${selectShell} inline-flex w-[75%] rounded-md px-3 py-2 bg-transparent`}>
          {modelOptionMap}
        </select>
      </div>

      <TextareaAutosize
        onChange={(evt) => setPromptText(evt.target.value)}
        placeholder="Add prompt text here"
        className={`${textareaShell} w-full m-auto px-3 py-3 rounded-xl bg-transparent`}
        minRows={3}
      />

      <div className="text-center">
        <CommonButton onClick={submitGenerateNewRequest} isPending={isGenerationPending}>
          Submit
        </CommonButton>
      </div>
      {errorDisplay}
    </div>
  );
}
