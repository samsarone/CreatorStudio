import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaCheck,
  FaItalic,
  FaTrash,
  FaUnderline,
} from 'react-icons/fa';

import SingleSelect from '../../../common/SingleSelect.jsx';
import {
  TEXT_FONT_OPTIONS,
  buildTextStyleDraft,
  mapTextDraftToStyleConfig,
  mapTextItemToDraft,
  persistTextStyleConfig,
} from '../../../common/TextStylePanel.jsx';

function IconButton({ active, onClick, title, children, colorMode }) {
  const className = active
    ? 'bg-rose-500 text-white border-transparent'
    : colorMode === 'dark'
      ? 'bg-[#111a2f] border-[#1f2a3d] text-slate-200 hover:bg-[#17233d]'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-full items-center justify-center rounded-xl border text-sm transition ${className}`}
    >
      {children}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
  fieldSurface,
  safeFallback,
}) {
  const safeValue = value || safeFallback;

  return (
    <div className={`rounded-2xl p-2.5 ${fieldSurface}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={onChange}
          className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
        <div className="min-w-0 flex-1 truncate rounded-lg bg-black/10 px-2 py-2 text-xs font-medium uppercase">
          {safeValue}
        </div>
      </div>
    </div>
  );
}

export default function TextToolbar(props) {
  const {
    pos,
    removeItem,
    colorMode,
    itemId,
    updateTargetTextActiveLayerConfig,
    activeItemList,
    onPersistTextStyle,
    editorVariant = 'videoStudio',
  } = props;

  const isImageStudio = editorVariant === 'imageStudio';
  const activeTextItem = useMemo(
    () => activeItemList?.find((item) => item.id === itemId && item.type === 'text') || null,
    [activeItemList, itemId]
  );
  const activeTextItemSignature = useMemo(
    () => (activeTextItem ? JSON.stringify(mapTextItemToDraft(activeTextItem)) : null),
    [activeTextItem]
  );

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!activeTextItem) {
      setDraft(null);
      setIsDirty(false);
      return;
    }

    setDraft(mapTextItemToDraft(activeTextItem));
    setIsDirty(false);
  }, [activeTextItem, activeTextItemSignature]);

  const persistSharedStyle = useCallback(
    (draftToPersist) => {
      const normalizedDraft = buildTextStyleDraft(draftToPersist);
      persistTextStyleConfig(normalizedDraft);

      if (typeof onPersistTextStyle === 'function') {
        onPersistTextStyle(mapTextDraftToStyleConfig(normalizedDraft));
      }
    },
    [onPersistTextStyle]
  );

  const commitDraft = useCallback(() => {
    if (!draft || !activeTextItem || typeof updateTargetTextActiveLayerConfig !== 'function') {
      return;
    }

    const normalizedDraft = buildTextStyleDraft(draft);
    updateTargetTextActiveLayerConfig(itemId, {
      text: `${normalizedDraft.text || ''}`,
      styleValueSpace: 'raw',
      fontFamily: normalizedDraft.fontFamily,
      fontSize: Number.isFinite(Number(normalizedDraft.fontSize)) ? Number(normalizedDraft.fontSize) : 32,
      fillColor: normalizedDraft.fillColor,
      strokeColor: normalizedDraft.strokeColor,
      strokeWidth: Number.isFinite(Number(normalizedDraft.strokeWidth)) ? Number(normalizedDraft.strokeWidth) : 0,
      bold: Boolean(normalizedDraft.bold),
      italic: Boolean(normalizedDraft.italic),
      underline: Boolean(normalizedDraft.underline),
      textAlign: normalizedDraft.textAlign || 'center',
      lineHeight: Number.isFinite(Number(normalizedDraft.lineHeight)) ? Number(normalizedDraft.lineHeight) : 1.2,
    });
    persistSharedStyle(normalizedDraft);
    setDraft(normalizedDraft);
    setIsDirty(false);
  }, [activeTextItem, draft, itemId, persistSharedStyle, updateTargetTextActiveLayerConfig]);

  const updateDraft = useCallback((changes) => {
    setDraft((prev) => buildTextStyleDraft({ ...(prev || {}), ...changes }));
    setIsDirty(true);
  }, []);

  const updateNumericField = useCallback(
    (field, rawValue, fallback, { min = null, max = null, float = false } = {}) => {
      const parsedValue = float ? parseFloat(rawValue) : parseInt(rawValue, 10);
      let nextValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
      if (typeof min === 'number') {
        nextValue = Math.max(min, nextValue);
      }
      if (typeof max === 'number') {
        nextValue = Math.min(max, nextValue);
      }
      updateDraft({ [field]: nextValue });
    },
    [updateDraft]
  );

  if (!activeTextItem || !draft) {
    return null;
  }

  const toolbarSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629] border border-[#1f2a3d] text-slate-100 shadow-[0_18px_42px_rgba(2,6,23,0.45)]'
      : 'bg-white border border-slate-200 text-slate-900 shadow-[0_18px_36px_rgba(15,23,42,0.16)]';
  const fieldSurface =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100'
      : 'bg-slate-50 border border-slate-200 text-slate-900';
  const inputClassName = `w-full rounded-xl px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${fieldSurface}`;
  const actionButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white hover:bg-rose-400 disabled:bg-[#17233d] disabled:text-slate-500'
      : 'bg-rose-500 text-white hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400';
  const deleteButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500/12 border border-rose-400/30 text-rose-100 hover:bg-rose-500/18'
      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100';

  return (
    <div
      key={`toolbar_${pos.id}`}
      className={`${toolbarSurface} absolute rounded-[22px] p-3`}
      style={{
        left: pos.x,
        top: pos.y,
        width: isImageStudio ? '320px' : '300px',
        maxWidth: 'calc(100vw - 40px)',
        zIndex: 100,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Text
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={commitDraft}
            disabled={!isDirty}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${actionButtonClass}`}
            title="Update text"
          >
            <FaCheck />
            <span>Update</span>
          </button>
          <button
            type="button"
            onClick={() => removeItem?.()}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${deleteButtonClass}`}
            title="Delete text"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <TextareaAutosize
            minRows={2}
            value={draft.text || ''}
            onChange={(event) => updateDraft({ text: event.target.value })}
            className={`${inputClassName} min-h-[72px] resize-none`}
            placeholder="Edit text"
          />
        </div>

        <div className="col-span-2">
          <SingleSelect
            value={TEXT_FONT_OPTIONS.find((option) => option.value === draft.fontFamily) || TEXT_FONT_OPTIONS[0]}
            onChange={(option) => updateDraft({ fontFamily: option?.value || 'Arial' })}
            options={TEXT_FONT_OPTIONS}
          />
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Size
          </div>
          <input
            type="number"
            min="1"
            max="240"
            value={draft.fontSize}
            onChange={(event) => updateNumericField('fontSize', event.target.value, 32, { min: 1, max: 240 })}
            className={inputClassName}
            title="Font size"
          />
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Line
          </div>
          <input
            type="number"
            min="0.6"
            max="3"
            step="0.1"
            value={draft.lineHeight}
            onChange={(event) => updateNumericField('lineHeight', event.target.value, 1.2, {
              min: 0.6,
              max: 3,
              float: true,
            })}
            className={inputClassName}
            title="Line height"
          />
        </div>

        <ColorField
          label="Text"
          value={draft.fillColor}
          onChange={(event) => updateDraft({ fillColor: event.target.value })}
          fieldSurface={fieldSurface}
          safeFallback="#ffffff"
        />

        <div className={`rounded-2xl p-2.5 ${fieldSurface}`}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Outline
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.strokeColor || '#ffffff'}
              onChange={(event) =>
                updateDraft({
                  strokeColor: event.target.value,
                  strokeWidth: draft.strokeWidth > 0 ? draft.strokeWidth : 1,
                })
              }
              className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              title="Outline color"
            />
            <input
              type="number"
              min="0"
              max="40"
              value={draft.strokeWidth}
              onChange={(event) => updateNumericField('strokeWidth', event.target.value, 0, { min: 0, max: 40 })}
              className={`${inputClassName} px-2 text-center`}
              title="Outline width"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Style
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconButton
              active={draft.bold}
              onClick={() => updateDraft({ bold: !draft.bold })}
              title="Bold"
              colorMode={colorMode}
            >
              <FaBold />
            </IconButton>
            <IconButton
              active={draft.italic}
              onClick={() => updateDraft({ italic: !draft.italic })}
              title="Italic"
              colorMode={colorMode}
            >
              <FaItalic />
            </IconButton>
            <IconButton
              active={draft.underline}
              onClick={() => updateDraft({ underline: !draft.underline })}
              title="Underline"
              colorMode={colorMode}
            >
              <FaUnderline />
            </IconButton>
          </div>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Align
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconButton
              active={draft.textAlign === 'left'}
              onClick={() => updateDraft({ textAlign: 'left' })}
              title="Align left"
              colorMode={colorMode}
            >
              <FaAlignLeft />
            </IconButton>
            <IconButton
              active={draft.textAlign === 'center'}
              onClick={() => updateDraft({ textAlign: 'center' })}
              title="Align center"
              colorMode={colorMode}
            >
              <FaAlignCenter />
            </IconButton>
            <IconButton
              active={draft.textAlign === 'right'}
              onClick={() => updateDraft({ textAlign: 'right' })}
              title="Align right"
              colorMode={colorMode}
            >
              <FaAlignRight />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
