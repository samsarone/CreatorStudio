import React from "react";
import { FaPencilAlt, FaEraser, FaUpload, FaSave, FaCrosshairs } from "react-icons/fa";
import { CURRENT_TOOLBAR_VIEW } from "../../../constants/Types.ts";
import { useColorMode } from "../../../contexts/ColorMode.jsx";

export default function ActionToolbar(props) {
  const { setCurrentAction, setCurrentViewDisplay, showMoveAction, showResizeAction,
    showSaveAction, showUploadAction,

    pencilWidth,
    setPencilWidth,
    pencilColor,
    setPencilColor,
    eraserWidth,
    setEraserWidth,
    pencilOptionsVisible,
    setPencilOptionsVisible,
    eraserOptionsVisible,
    setEraserOptionsVisible,
    cursorSelectOptionVisible,
    setCursorSelectOptionVisible,
  } = props;

  const { colorMode } = useColorMode();



  const baseShell =
    colorMode === 'dark'
      ? 'bg-cyber-black border-blue-900 text-white'
      : 'bg-white text-slate-800 border border-slate-200 shadow-sm';

  const optionShell =
    colorMode === 'dark'
      ? 'bg-gray-900/70 border border-white/10'
      : 'bg-white border border-slate-100 shadow-sm';

  const optionSelected =
    colorMode === 'dark'
      ? 'bg-slate-800 text-white'
      : 'bg-indigo-50 text-indigo-600 border border-indigo-200';

  const accentColor = colorMode === 'dark' ? '#6366f1' : '#2563eb';
  const trackColor = colorMode === 'dark' ? '#1f2937' : '#e2e8f0';

  const getSliderStyle = (value: number, min: number, max: number) => {
    const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
    const percent = ((safeValue - min) / (max - min)) * 100;
    return {
      accentColor,
      background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percent}%, ${trackColor} ${percent}%, ${trackColor} 100%)`,
      height: '8px',
      borderRadius: '9999px',
      outline: 'none',
      transition: 'background 0.25s ease',
    };
  };

  const togglePencilOptions = () => {
    setPencilOptionsVisible(!pencilOptionsVisible);
    setEraserOptionsVisible(false);
    setCursorSelectOptionVisible(false);
  };

  const toggleEraserOptions = () => {
    setEraserOptionsVisible(!eraserOptionsVisible);
    setPencilOptionsVisible(false);
    setCursorSelectOptionVisible(false);

  };

  const showTemplateAction = () => {
    setPencilOptionsVisible(false);
    setEraserOptionsVisible(false);
    setCursorSelectOptionVisible(false);
    setCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_TEMPLATES_DISPLAY)
  }

  const toggleCursorSelectOptions = () => {
    setCursorSelectOptionVisible(!cursorSelectOptionVisible);
    setPencilOptionsVisible(false);
    setEraserOptionsVisible(false);
  };



  return (
    <div className={`border-r-2 ${baseShell} h-full m-auto fixed top-0 overflow-auto w-[5%]`}>
      <div className="h-[60%]">
        <div className=" mt-[80px]">
          <div className={`text-center m-auto align-center mt-4 mb-4 pt-2 pb-2 rounded-lg transition-colors duration-150 ${cursorSelectOptionVisible ? optionSelected : optionShell}`}>
            <FaCrosshairs className="text-2xl m-auto cursor-pointer" onClick={toggleCursorSelectOptions} />
            <div className="text-[10px] tracking-tight m-auto text-center">
              Select
            </div>
          </div>


          <div className={`text-center m-auto align-center mt-4 mb-4 pt-2 pb-2 rounded-lg transition-colors duration-150 ${pencilOptionsVisible ? optionSelected : optionShell}`}>
            <FaPencilAlt className="text-2xl m-auto cursor-pointer" onClick={togglePencilOptions} />
            <div className="text-[10px] tracking-tight m-auto text-center">
              Pencil
            </div>
            {pencilOptionsVisible && (
              <div className="static mt-2 rounded-lg p-3 space-y-2 bg-black/10 dark:bg-white/10">
                <label className="block mb-2">Width:</label>
                <input type="range" min="1" max="50"
                  className="w-full appearance-none rounded-full"
                  value={pencilWidth}
                  onChange={(e) => setPencilWidth(e.target.value)}
                  style={getSliderStyle(Number(pencilWidth), 1, 50)}
                />
                <label className="block mt-2 mb-2">Color:</label>
                <input type="color" value={pencilColor} onChange={(e) => setPencilColor(e.target.value)} />
              </div>
            )}
          </div>

          <div className={`text-center m-auto align-center mt-4 mb-4 pt-2 pb-2 rounded-lg transition-colors duration-150 ${eraserOptionsVisible ? optionSelected : optionShell}`}>
            <FaEraser className="text-2xl m-auto cursor-pointer" onClick={toggleEraserOptions} />
            <div className="text-[10px] tracking-tight m-auto text-center">
              Magic Eraser
            </div>
            {eraserOptionsVisible && (
              <div className="static mt-2 rounded-lg p-3 bg-black/10 dark:bg-white/10">
                <label className="block mb-2">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  className="w-full appearance-none rounded-full"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(e.target.value)}
                  style={getSliderStyle(Number(eraserWidth), 1, 100)}
                />
              </div>
            )}
          </div>


        </div>
      </div>
      <div>
        <div className="text-center m-auto align-center mt-4 mb-4">
          <FaUpload className="text-2xl m-auto cursor-pointer" onClick={() => showUploadAction()} />
          <div className="text-[12px] tracking-tight m-auto text-center">
            Upload
          </div>
        </div>
      </div>
      <div>
        <div className="text-center m-auto align-center mt-4 mb-4">
          <FaSave className="text-2xl m-auto cursor-pointer" onClick={() => showSaveAction()} />
          <div className="text-[12px] tracking-tight m-auto text-center">
            Save
          </div>
        </div>
      </div>
    </div>
  );
}
