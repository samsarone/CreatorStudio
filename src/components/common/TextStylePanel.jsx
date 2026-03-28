import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaChevronCircleDown,
  FaChevronCircleUp,
  FaItalic,
  FaTrash,
  FaUnderline,
} from 'react-icons/fa';

import { useColorMode } from '../../contexts/ColorMode.jsx';
import CommonButton from './CommonButton.tsx';
import SingleSelect from './SingleSelect.jsx';

export const TEXT_FONT_OPTIONS = [
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
  { value: 'Serif', label: 'Serif' },
];

const DEFAULT_TEXT_STYLE_DRAFT = {
  text: '',
  fontSize: 32,
  fontFamily: 'Arial',
  fillColor: '#000000',
  strokeColor: '#ffffff',
  strokeWidth: 0,
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'center',
  lineHeight: 1.2,
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}){1,2}$/i;

function isValidHexColor(value) {
  return HEX_COLOR_PATTERN.test(`${value || ''}`.trim());
}

function getSafeColorValue(value, fallback) {
  return isValidHexColor(value) ? value : fallback;
}

export function buildTextStyleDraft(value = {}) {
  return {
    ...DEFAULT_TEXT_STYLE_DRAFT,
    ...value,
    text: `${value?.text ?? DEFAULT_TEXT_STYLE_DRAFT.text}`,
  };
}

export function mapTextDraftToConfig(value = {}) {
  const draft = buildTextStyleDraft(value);
  const { text, ...config } = draft;
  return config;
}

export function mapTextItemToDraft(item) {
  return buildTextStyleDraft({
    text: item?.text || '',
    ...(item?.config || {}),
  });
}

function IconToggleButton({ active, onClick, children, title, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition ${className} ${active ? 'border-transparent' : ''}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ onClick, icon, label, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function TextStylePanel(props) {
  const {
    value,
    onChange,
    onSubmit,
    submitLabel = 'Add text',
    submitDisabled = false,
    showSubmitButton = true,
    editorVariant = 'videoStudio',
    header = 'Text',
    helperText = null,
    layerActions = [],
  } = props;

  const { colorMode } = useColorMode();
  const isImageStudio = editorVariant === 'imageStudio';
  const draft = buildTextStyleDraft(value);

  const fieldSurface =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100'
      : 'bg-white border border-slate-200 text-slate-900';
  const cardSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629] border border-[#1f2a3d] text-slate-100'
      : 'bg-slate-50 border border-slate-200 text-slate-900';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const activeToggle =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white shadow-[0_10px_22px_rgba(244,63,94,0.24)]'
      : 'bg-rose-500 text-white shadow-sm';
  const inactiveToggle =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border-[#1f2a3d] text-slate-200 hover:bg-[#17233d]'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
  const destructiveAction =
    colorMode === 'dark'
      ? 'bg-rose-500/12 border-rose-400/35 text-rose-100 hover:bg-rose-500/18'
      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
  const neutralAction =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border-[#1f2a3d] text-slate-200 hover:bg-[#17233d]'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
  const inputClassName = `w-full rounded-xl px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${fieldSurface}`;
  const sectionTitleClass = `mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${mutedText}`;

  const updateDraft = (changes) => {
    if (typeof onChange !== 'function') return;
    onChange(buildTextStyleDraft({ ...draft, ...changes }));
  };

  const updateNumericField = (field, rawValue, fallback, { min = null, max = null, step = null } = {}) => {
    const parsedValue = step ? parseFloat(rawValue) : parseInt(rawValue, 10);
    let nextValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
    if (typeof min === 'number') {
      nextValue = Math.max(min, nextValue);
    }
    if (typeof max === 'number') {
      nextValue = Math.min(max, nextValue);
    }
    updateDraft({ [field]: nextValue });
  };

  const styleButtons = [
    {
      key: 'bold',
      active: draft.bold,
      title: 'Bold',
      icon: <FaBold />,
    },
    {
      key: 'italic',
      active: draft.italic,
      title: 'Italic',
      icon: <FaItalic />,
    },
    {
      key: 'underline',
      active: draft.underline,
      title: 'Underline',
      icon: <FaUnderline />,
    },
  ];

  const alignmentButtons = [
    { key: 'left', icon: <FaAlignLeft />, title: 'Align left' },
    { key: 'center', icon: <FaAlignCenter />, title: 'Align center' },
    { key: 'right', icon: <FaAlignRight />, title: 'Align right' },
  ];

  const safeFillColor = getSafeColorValue(draft.fillColor, '#000000');
  const safeStrokeColor = getSafeColorValue(draft.strokeColor, '#ffffff');

  return (
    <div className={`flex flex-col ${isImageStudio ? 'gap-4' : 'gap-3'}`}>
      <div>
        <div className={`${isImageStudio ? 'text-base' : 'text-sm'} font-semibold`}>{header}</div>
        {helperText ? <div className={`mt-1 text-xs ${mutedText}`}>{helperText}</div> : null}
      </div>

      <div>
        <div className={sectionTitleClass}>Content</div>
        <TextareaAutosize
          minRows={isImageStudio ? 4 : 3}
          value={draft.text}
          onChange={(event) => updateDraft({ text: event.target.value })}
          placeholder="Enter text"
          className={`${inputClassName} min-h-[96px] resize-none`}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
        <div>
          <div className={sectionTitleClass}>Font</div>
          <SingleSelect
            value={TEXT_FONT_OPTIONS.find((option) => option.value === draft.fontFamily) || TEXT_FONT_OPTIONS[0]}
            onChange={(option) => updateDraft({ fontFamily: option?.value || DEFAULT_TEXT_STYLE_DRAFT.fontFamily })}
            options={TEXT_FONT_OPTIONS}
          />
        </div>
        <div>
          <div className={sectionTitleClass}>Size</div>
          <input
            type="number"
            min="1"
            max="240"
            value={draft.fontSize}
            onChange={(event) => updateNumericField('fontSize', event.target.value, 16, { min: 1, max: 240 })}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardSurface} rounded-2xl p-3`}>
          <div className={sectionTitleClass}>Text Color</div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={safeFillColor}
              onChange={(event) => updateDraft({ fillColor: event.target.value })}
              className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-transparent p-1"
            />
            <div className={`rounded-xl px-3 py-2 text-sm font-medium ${fieldSurface}`}>
              {safeFillColor.toUpperCase()}
            </div>
          </div>
        </div>

        <div className={`${cardSurface} rounded-2xl p-3`}>
          <div className={sectionTitleClass}>Outline</div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={safeStrokeColor}
              onChange={(event) => updateDraft({ strokeColor: event.target.value })}
              className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-transparent p-1"
            />
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm font-medium ${fieldSurface}`}>
                {draft.strokeWidth > 0 ? safeStrokeColor.toUpperCase() : 'Off'}
              </div>
              <input
                type="number"
                min="0"
                max="40"
                value={draft.strokeWidth}
                onChange={(event) => updateNumericField('strokeWidth', event.target.value, 0, { min: 0, max: 40 })}
                className={`${inputClassName} w-[84px] text-center`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={sectionTitleClass}>Style</div>
          <div className="grid grid-cols-3 gap-2">
            {styleButtons.map((button) => (
              <IconToggleButton
                key={button.key}
                title={button.title}
                active={button.active}
                onClick={() => updateDraft({ [button.key]: !draft[button.key] })}
                className={button.active ? activeToggle : inactiveToggle}
              >
                {button.icon}
              </IconToggleButton>
            ))}
          </div>
        </div>

        <div>
          <div className={sectionTitleClass}>Align</div>
          <div className="grid grid-cols-3 gap-2">
            {alignmentButtons.map((button) => (
              <IconToggleButton
                key={button.key}
                title={button.title}
                active={draft.textAlign === button.key}
                onClick={() => updateDraft({ textAlign: button.key })}
                className={draft.textAlign === button.key ? activeToggle : inactiveToggle}
              >
                {button.icon}
              </IconToggleButton>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={sectionTitleClass}>Line Height</div>
          <input
            type="number"
            min="0.6"
            max="3"
            step="0.1"
            value={draft.lineHeight}
            onChange={(event) => updateNumericField('lineHeight', event.target.value, 1.2, { min: 0.6, max: 3, step: 0.1 })}
            className={inputClassName}
          />
        </div>

        <div className={`${cardSurface} rounded-2xl p-3`}>
          <div className={sectionTitleClass}>Preview</div>
          <div
            className={`rounded-xl px-3 py-3 text-sm ${fieldSurface}`}
            style={{
              fontFamily: draft.fontFamily,
              fontSize: `${Math.max(14, Math.min(draft.fontSize, 28))}px`,
              color: safeFillColor,
              WebkitTextStroke:
                draft.strokeWidth > 0
                  ? `${Math.max(0.4, Math.min(draft.strokeWidth, 3))}px ${safeStrokeColor}`
                  : '0 transparent',
              fontWeight: draft.bold ? 700 : 400,
              fontStyle: draft.italic ? 'italic' : 'normal',
              textDecoration: draft.underline ? 'underline' : 'none',
              textAlign: draft.textAlign,
              lineHeight: draft.lineHeight,
            }}
          >
            {draft.text || 'Sample text'}
          </div>
        </div>
      </div>

      {layerActions.length > 0 ? (
        <div>
          <div className={sectionTitleClass}>Layer Actions</div>
          <div className={`grid gap-2 ${layerActions.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {layerActions.map((action) => (
              <ActionButton
                key={action.label}
                onClick={action.onClick}
                icon={
                  action.icon === 'backward' ? (
                    <FaChevronCircleDown className="text-base" />
                  ) : action.icon === 'forward' ? (
                    <FaChevronCircleUp className="text-base" />
                  ) : (
                    <FaTrash className="text-base" />
                  )
                }
                label={action.label}
                className={action.intent === 'danger' ? destructiveAction : neutralAction}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showSubmitButton ? (
        <div className="pt-1">
          <CommonButton onClick={onSubmit} isDisabled={submitDisabled}>
            {submitLabel}
          </CommonButton>
        </div>
      ) : null}
    </div>
  );
}
