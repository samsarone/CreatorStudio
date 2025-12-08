import React from "react";
import CommonButton from "../../common/CommonButton.tsx";
import { IMAGE_EDIT_MODEL_TYPES } from "../../../constants/Types.ts";
import { useColorMode } from "../../../contexts/ColorMode.jsx";
import RangeSlider from '../../editor/utils/RangeSlider.jsx';

export default function ImageEditGenerator(props) {
  const { promptText, setPromptText, submitOutpaintRequest,
    selectedEditModel, setSelectedEditModel,
    selectedEditModelValue,
    isOutpaintPending, outpaintError,
    editBrushWidth, setEditBrushWidth
  } = props;
  const { colorMode } = useColorMode();



  const modelOptionMap = IMAGE_EDIT_MODEL_TYPES.map((model) => {
    return (
      <option key={model.key} value={model.key} selected={model.key === selectedEditModel}>
        {model.name}
      </option>
    )
  })



  const setSelectedModelDisplay = (evt) => {
    setSelectedEditModel(evt.target.value);
  }

  let editOptionsDisplay = <span />;

  const inputShell =
    colorMode === "dark"
      ? "bg-slate-900/60 text-slate-100 border border-white/10"
      : "bg-white text-slate-900 border border-slate-200 shadow-sm";



  if (selectedEditModelValue && selectedEditModelValue.editType === 'inpaint') {
    editOptionsDisplay = (
      <RangeSlider editBrushWidth={editBrushWidth} setEditBrushWidth={setEditBrushWidth} />
    )
  }

  if (selectedEditModel === "SDXL") {

    editOptionsDisplay = (<div className="grid grid-cols-3 gap-1">
      <div>
        <input type="text" className={`${inputShell} w-[96%] px-3 py-2 rounded-md`} name="guidanceScale" defaultValue={5} />
        <div className="text-xs ">
          Guidance
        </div>
      </div>
      <div>
        <input type="text" className={`${inputShell} w-[96%] px-3 py-2 rounded-md`} name="numInferenceSteps" defaultValue={30} />
        <div className="text-xs">
          Inference
        </div>
      </div>
      <div>

        <input type="text" className={`${inputShell} w-[96%] px-3 py-2 rounded-md`} name="strength" defaultValue={0.99} />
        <div className="text-xs">
          Strength
        </div>
      </div>

    </div>);
  }

  const errorDisplay = outpaintError ? (
    <div className="text-red-500 text-center text-sm">
      {outpaintError}
    </div>
  ) : null;

  let promptTextArea = null;



  if (selectedEditModelValue.isPromptEnabled) {
    promptTextArea = (
      <textarea
        name="promptText"
        onChange={(evt) => setPromptText((evt.target.value))}
        className={`${inputShell} w-full m-auto px-3 py-3 rounded-xl bg-transparent`}
      />
    )
  }

  return (
    <div>
      <form onSubmit={submitOutpaintRequest}>
        <div className=" w-full mt-2 mb-2">
          <div className="block">
            <div className="text-xs font-bold">
              Model
            </div>
            <select onChange={setSelectedModelDisplay} className={`${inputShell} inline-flex w-[75%] rounded-md px-3 py-2 bg-transparent`}>
              {modelOptionMap}
            </select>
          </div>
          <div>

          </div>
          <div className="block">
            {editOptionsDisplay}
          </div>
        </div>

        <div>

        </div>

        {promptTextArea}
        <div className="text-center">
          <CommonButton type="submit" isPending={isOutpaintPending}>
            Submit
          </CommonButton>
        </div>
      </form>
      {errorDisplay}
    </div>
  )
}
