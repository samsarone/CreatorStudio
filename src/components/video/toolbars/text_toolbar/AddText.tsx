import React, { useState, useEffect } from 'react';
import CommonButton from "../../../common/CommonButton.tsx";
import { useColorMode } from '../../../../contexts/ColorMode.jsx';
import SingleSelect from '../../../common/SingleSelect.jsx';
import TextareaAutosize from 'react-textarea-autosize';
import { CgColorPicker } from "react-icons/cg";
import { HexColorPicker } from "react-colorful";

import {
  FaAlignCenter, FaAlignLeft, FaAlignRight,
  FaBold, FaItalic, FaUnderline, FaChevronDown, FaTimes
} from "react-icons/fa";

const fontOptions = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Lucida Console', label: 'Lucida Console' },
  { value: 'Gill Sans', label: 'Gill Sans' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Sans-Serif', label: 'Sans-Serif' },
  { value: 'Serif', label: 'Serif' }
];

export default function AddText(props) {
  const { setAddText, submitAddText, addText, textConfig, setTextConfig } = props;
  const {
    fontSize = 32,
    fontFamily = 'Arial',
    fillColor = '#000000',
    strokeColor = '#ffffff',
    strokeWidth = 1,
    bold = false,
    italic = false,
    underline = false,
    textAlign = 'center',
    lineHeight = 1.2
  } = textConfig;
  const { colorMode } = useColorMode();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Because we manage fillColor/strokeColor in local state, we separate them out,
  // but still rely on textConfig for final submission.
  const [localFillColor, setLocalFillColor] = useState(fillColor);
  const [localStrokeColor, setLocalStrokeColor] = useState(strokeColor);

  // For controlling which color picker is open: "fill", "stroke" or null
  const [colorPickerType, setColorPickerType] = useState(null);

  const formElementBG =
    colorMode === "dark" ? "bg-gray-800 text-neutral-50" : "bg-gray-100 text-neutral-800";
  const textElementBG =
    colorMode === "dark"
      ? "bg-gray-800 text-neutral-50"
      : "bg-gray-100 text-neutral-800 border-gray-600 border-2";

  const buttonClasses = (active) => (active ? 'bg-blue-500 text-white' : formElementBG);

  const handleFontSizeChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 1;
    if (val > 100) val = 100;
    setTextConfig({ ...textConfig, fontSize: val });
  };

  const handleFontFamilyChange = (option) => {
    setTextConfig({ ...textConfig, fontFamily: option.value });
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  const toggleStyle = (style) => {
    const newValue = !textConfig[style];
    setTextConfig({ ...textConfig, [style]: newValue });
  };

  const setAlignment = (alignment) => {
    setTextConfig({ ...textConfig, textAlign: alignment });
  };

  const applyColorChange = (color) => {
    if (colorPickerType === 'fill') {
      setLocalFillColor(color);
    } else if (colorPickerType === 'stroke') {
      setLocalStrokeColor(color);
    }
  };

  const closeColorPicker = () => {
    if (colorPickerType === 'fill') {
      setTextConfig({ ...textConfig, fillColor: localFillColor });
    } else if (colorPickerType === 'stroke') {
      setTextConfig({ ...textConfig, strokeColor: localStrokeColor });
    }
    setColorPickerType(null);
  };

  const submitChanges = () => {
    // Ensure final colors are set in textConfig
    setTextConfig({ ...textConfig, fillColor: localFillColor, strokeColor: localStrokeColor });
    submitAddText();
  };

  const pickFillColor = () => {
    setColorPickerType('fill');
  };

  const pickStrokeColor = () => {
    setColorPickerType('stroke');
  };

  const updateText = (evt) => {
    const textValue = evt.target.value;
    setAddText(textValue);
  };

  /**
   * Load from localStorage on mount
   */
  useEffect(() => {
    const storedFontSize = localStorage.getItem('selected_text_config_fontSize');
    const storedFontFamily = localStorage.getItem('selected_text_config_fontFamily');
    const storedFillColor = localStorage.getItem('selected_text_config_fillColor');
    const storedStrokeColor = localStorage.getItem('selected_text_config_strokeColor');
    const storedStrokeWidth = localStorage.getItem('selected_text_config_strokeWidth');
    const storedBold = localStorage.getItem('selected_text_config_bold');
    const storedItalic = localStorage.getItem('selected_text_config_italic');
    const storedUnderline = localStorage.getItem('selected_text_config_underline');
    const storedTextAlign = localStorage.getItem('selected_text_config_textAlign');
    const storedLineHeight = localStorage.getItem('selected_text_config_lineHeight');
    const storedAddText = localStorage.getItem('selected_text_config_addText');

    // Update textConfig if these values exist
    setTextConfig((prev) => ({
      ...prev,
      fontSize: storedFontSize ? parseInt(storedFontSize, 10) : prev.fontSize,
      fontFamily: storedFontFamily || prev.fontFamily,
      fillColor: storedFillColor || prev.fillColor,
      strokeColor: storedStrokeColor || prev.strokeColor,
      strokeWidth: storedStrokeWidth ? parseInt(storedStrokeWidth, 10) : prev.strokeWidth,
      bold: storedBold === 'true' ? true : prev.bold,
      italic: storedItalic === 'true' ? true : prev.italic,
      underline: storedUnderline === 'true' ? true : prev.underline,
      textAlign: storedTextAlign || prev.textAlign,
      lineHeight: storedLineHeight ? parseFloat(storedLineHeight) : prev.lineHeight,
    }));

    // Also update local color states
    if (storedFillColor) setLocalFillColor(storedFillColor);
    if (storedStrokeColor) setLocalStrokeColor(storedStrokeColor);

    // If there's saved text, update addText
    if (storedAddText) {
      setAddText(storedAddText);
    }
  }, [setTextConfig, setAddText]);

  /**
   * Save to localStorage whenever textConfig or addText changes
   */
  useEffect(() => {
    localStorage.setItem('selected_text_config_fontSize', textConfig.fontSize.toString());
    localStorage.setItem('selected_text_config_fontFamily', textConfig.fontFamily);
    localStorage.setItem('selected_text_config_fillColor', localFillColor);
    localStorage.setItem('selected_text_config_strokeColor', localStrokeColor);
    localStorage.setItem('selected_text_config_strokeWidth', textConfig.strokeWidth.toString());
    localStorage.setItem('selected_text_config_bold', textConfig.bold?.toString());
    localStorage.setItem('selected_text_config_italic', textConfig.italic?.toString());
    localStorage.setItem('selected_text_config_underline', textConfig.underline?.toString());
    localStorage.setItem('selected_text_config_textAlign', textConfig.textAlign);
    localStorage.setItem('selected_text_config_lineHeight', textConfig.lineHeight?.toString());
    localStorage.setItem('selected_text_config_addText', addText || '');
  }, [
    textConfig.fontSize,
    textConfig.fontFamily,
    textConfig.strokeWidth,
    textConfig.bold,
    textConfig.italic,
    textConfig.underline,
    textConfig.textAlign,
    textConfig.lineHeight,
    localFillColor,
    localStrokeColor,
    addText,
    textConfig
  ]);

  return (
    <div>
      {/* Row 1: Font Size and Font Family */}
      <div className='grid grid-cols-2 gap-2 mb-2'>
        <div>
          <div className='text-xs mb-1'>Font Size </div>
          <input
            type="number"
            min="1"
            max="100"
            value={fontSize}
            onChange={handleFontSizeChange}
            className={`${formElementBG} w-full p-2 rounded`}
          />
        </div>
        <div>
          <div className='text-xs mb-1'>Font Family</div>
          <SingleSelect
            value={fontOptions.find(option => option.value === fontFamily)}
            onChange={handleFontFamilyChange}
            options={fontOptions}
            className={`w-full p-2 rounded ${formElementBG}`}
          />
        </div>
      </div>

      {/* Row 2: Advanced toggle */}
      <div className='flex justify-end mb-2'>
        <button onClick={toggleAdvanced} className='text-xs underline flex items-center'>
          Advanced <FaChevronDown className='inline-block ml-1' />
        </button>
      </div>

      {showAdvanced && (
        <div className='mb-2 border p-2 rounded'>
          {/* Advanced Row 1: Fill and Stroke */}
          <div className='grid grid-cols-2 gap-1 mb-2'>
            <div className='col-span-1'>
              <button
                onClick={pickFillColor}
                className='text-xs mb-1 inline-flex items-center space-x-1 focus:outline-none'
              >
                <span>Fill</span>
                <CgColorPicker />
              </button>
              <input
                type="text"
                value={localFillColor}
                onChange={(e) => setLocalFillColor(e.target.value)}
                className={`${formElementBG} w-full p-2 rounded`}
              />
            </div>

            <div className='col-span-1'>
              <button
                onClick={pickStrokeColor}
                className='text-xs mb-1 inline-flex items-center space-x-1 focus:outline-none'
              >
                <span>Stroke</span>
                <CgColorPicker />
              </button>
              <input
                type="text"
                value={localStrokeColor}
                onChange={(e) => setLocalStrokeColor(e.target.value)}
                className={`${formElementBG} w-full p-2 rounded`}
              />
            </div>
          </div>

          {/* Advanced Row 2: Stroke Width, Line Height */}
          <div className='grid grid-cols-2 gap-1 mb-2'>
            <div>
              <div className='text-xs mb-1'>Stroke Width</div>
              <input
                type="number"
                min="0"
                value={strokeWidth}
                onChange={(e) => setTextConfig({
                  ...textConfig,
                  strokeWidth: parseInt(e.target.value, 10) || 0
                })}
                className={`${formElementBG} w-full p-2 rounded`}
              />
            </div>

            <div>
              <div className='text-xs mb-1'>Line Height</div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setTextConfig({
                  ...textConfig,
                  lineHeight: parseFloat(e.target.value) || 0
                })}
                className={`${formElementBG} w-full p-2 rounded`}
              />
            </div>
          </div>

          {/* Advanced Row 3: Text Styles and Alignment */}
          <div className='grid grid-cols-2 gap-1 mb-2'>
            <div>
              <div className='text-xs mb-1'>Text Styles</div>
              <div className='flex space-x-1 mb-2 '>
                <button
                  onClick={() => toggleStyle('bold')}
                  className={`${buttonClasses(bold)} p-1 rounded`}
                >
                  <FaBold />
                </button>
                <button
                  onClick={() => toggleStyle('italic')}
                  className={`${buttonClasses(italic)} p-1 rounded`}
                >
                  <FaItalic />
                </button>
                <button
                  onClick={() => toggleStyle('underline')}
                  className={`${buttonClasses(underline)} p-1 rounded`}
                >
                  <FaUnderline />
                </button>
              </div>
            </div>
            <div>
              {/* 
                If you need alignment, uncomment. 
                <div className='text-xs mb-1'>Text Alignment</div>
                <div className='flex space-x-1'>
                  <button
                    onClick={() => setAlignment('left')}
                    className={`${buttonClasses(textAlign === 'left')} p-1 rounded`}
                  >
                    <FaAlignLeft />
                  </button>
                  <button
                    onClick={() => setAlignment('center')}
                    className={`${buttonClasses(textAlign === 'center')} p-1 rounded`}
                  >
                    <FaAlignCenter />
                  </button>
                  <button
                    onClick={() => setAlignment('right')}
                    className={`${buttonClasses(textAlign === 'right')} p-1 rounded`}
                  >
                    <FaAlignRight />
                  </button>
                </div>
              */}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Textarea */}
      <TextareaAutosize
        value={addText || ''}
        onChange={updateText}
        className={`${textElementBG} w-full p-4 rounded-lg mt-2`}
        minRows={3}
        placeholder='Enter text here...'
      />

      {/* Row 4: Submit Button */}
      <div className='text-center mt-2'>
        <CommonButton onClick={submitChanges}>
          Submit
        </CommonButton>
      </div>

      {/* Color Picker Dialog */}
      {colorPickerType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-neutral-900 p-4 rounded">
            <button
              className="absolute top-2 right-2 text-white"
              onClick={closeColorPicker}
            >
              <FaTimes />
            </button>
            <HexColorPicker
              color={colorPickerType === 'fill' ? localFillColor : localStrokeColor}
              onChange={applyColorChange}
            />
            <div className='text-center mt-2'>
              <CommonButton onClick={closeColorPicker}>
                Done
              </CommonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
