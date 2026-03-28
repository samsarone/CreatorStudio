import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaItalic,
  FaTrash,
  FaUnderline,
} from 'react-icons/fa';

import SingleSelect from '../../../common/SingleSelect.jsx';
import {
  TEXT_FONT_OPTIONS,
  buildTextStyleDraft,
  mapTextItemToDraft,
} from '../../../common/TextStylePanel.jsx';

function IconButton({ active, onClick, title, children, colorMode }) {
  const className = active
    ? colorMode === 'dark'
      ? 'bg-rose-500 text-white border-transparent'
      : 'bg-rose-500 text-white border-transparent'
    : colorMode === 'dark'
      ? 'bg-[#111a2f] border-[#1f2a3d] text-slate-200 hover:bg-[#17233d]'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition ${className}`}
    >
      {children}
    </button>
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
    editorVariant = 'videoStudio',
  } = props;

  const isImageStudio = editorVariant === 'imageStudio';
  const activeTextItem = useMemo(
    () => activeItemList?.find((item) => item.id === itemId && item.type === 'text') || null,
    [activeItemList, itemId]
  );
  const activeTextIndex = useMemo(
    () => activeItemList?.findIndex((item) => item.id === itemId) ?? -1,
    [activeItemList, itemId]
  );

  const [draft, setDraft] = useState(null);
  const lastCommittedDraftRef = useRef(null);

  const commitDraft = useCallback(
    (draftToCommit) => {
      if (!draftToCommit || !activeTextItem || typeof updateTargetTextActiveLayerConfig !== 'function') {
        return;
      }

      const normalizedDraft = buildTextStyleDraft(draftToCommit);
      const draftSignature = JSON.stringify(normalizedDraft);
      if (draftSignature === lastCommittedDraftRef.current) {
        return;
      }

      updateTargetTextActiveLayerConfig(itemId, {
        text: `${normalizedDraft.text || ''}`,
        x: Number.isFinite(Number(normalizedDraft.x)) ? Number(normalizedDraft.x) : activeTextItem.config?.x,
        y: Number.isFinite(Number(normalizedDraft.y)) ? Number(normalizedDraft.y) : activeTextItem.config?.y,
        fontFamily: normalizedDraft.fontFamily,
        fontSize: Number.isFinite(Number(normalizedDraft.fontSize)) ? Number(normalizedDraft.fontSize) : 16,
        fillColor: normalizedDraft.fillColor,
        strokeColor: normalizedDraft.strokeColor,
        strokeWidth: Number.isFinite(Number(normalizedDraft.strokeWidth)) ? Number(normalizedDraft.strokeWidth) : 0,
        bold: Boolean(normalizedDraft.bold),
        italic: Boolean(normalizedDraft.italic),
        underline: Boolean(normalizedDraft.underline),
        textAlign: normalizedDraft.textAlign || 'center',
        lineHeight: Number.isFinite(Number(normalizedDraft.lineHeight)) ? Number(normalizedDraft.lineHeight) : 1.2,
        positionMode: 'center',
      });
      lastCommittedDraftRef.current = draftSignature;
    },
    [activeTextItem, itemId, updateTargetTextActiveLayerConfig]
  );

  useEffect(() => {
    if (!activeTextItem) {
      setDraft(null);
      lastCommittedDraftRef.current = null;
      return;
    }

    const nextDraft = mapTextItemToDraft(activeTextItem);
    setDraft(nextDraft);
    lastCommittedDraftRef.current = JSON.stringify(nextDraft);
  }, [activeTextItem]);

  useEffect(() => {
    if (!draft || !activeTextItem || typeof updateTargetTextActiveLayerConfig !== 'function') {
      return undefined;
    }

    const draftSignature = JSON.stringify(draft);
    if (draftSignature === lastCommittedDraftRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      commitDraft(draft);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commitDraft, draft, activeTextItem]);

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
      : 'bg-white border border-slate-200 text-slate-900';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const deleteButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500/12 border border-rose-400/30 text-rose-100 hover:bg-rose-500/18'
      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100';

  const inputClassName = `h-10 rounded-xl px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${fieldSurface}`;

  const updateDraft = (changes) => {
    setDraft((prev) => buildTextStyleDraft({ ...(prev || {}), ...changes }));
  };

  const updateNumericField = (field, rawValue, fallback, { min = null, max = null, float = false } = {}) => {
    const parsedValue = float ? parseFloat(rawValue) : parseInt(rawValue, 10);
    let nextValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
    if (typeof min === 'number') {
      nextValue = Math.max(min, nextValue);
    }
    if (typeof max === 'number') {
      nextValue = Math.min(max, nextValue);
    }
    updateDraft({ [field]: nextValue });
  };

  return (
    <div
      key={`toolbar_${pos.id}`}
      className={`${toolbarSurface} absolute rounded-[20px] p-3`}
      style={{
        left: pos.x,
        top: pos.y,
        width: isImageStudio ? '860px' : '760px',
        maxWidth: 'calc(100vw - 40px)',
        zIndex: 100,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={draft.text || ''}
            onChange={(event) => updateDraft({ text: event.target.value })}
            onBlur={(event) => commitDraft({ ...draft, text: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDraft({ ...draft, text: event.currentTarget.value });
                event.currentTarget.blur();
              }
            }}
            placeholder="Edit text"
            className={`${inputClassName} w-full leading-5`}
          />
        </div>

        <div className="w-[170px] shrink-0">
          <SingleSelect
            value={TEXT_FONT_OPTIONS.find((option) => option.value === draft.fontFamily) || TEXT_FONT_OPTIONS[0]}
            onChange={(option) => updateDraft({ fontFamily: option?.value || 'Arial' })}
            options={TEXT_FONT_OPTIONS}
          />
        </div>

        <input
          type="number"
          min="1"
          max="240"
          value={draft.fontSize}
          onChange={(event) => updateNumericField('fontSize', event.target.value, 16, { min: 1, max: 240 })}
          className={`${inputClassName} w-[78px] shrink-0 text-center`}
          title="Font size"
        />

        <div className={`flex h-10 items-center gap-2 rounded-xl px-2 ${fieldSurface}`}>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Text</span>
          <input
            type="color"
            value={draft.fillColor || '#000000'}
            onChange={(event) => updateDraft({ fillColor: event.target.value })}
            className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Text color"
          />
        </div>

        <div className={`flex h-10 items-center gap-2 rounded-xl px-2 ${fieldSurface}`}>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Outline</span>
          <input
            type="color"
            value={draft.strokeColor || '#ffffff'}
            onChange={(event) => updateDraft({ strokeColor: event.target.value })}
            className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Outline color"
          />
          <input
            type="number"
            min="0"
            max="40"
            value={draft.strokeWidth}
            onChange={(event) => updateNumericField('strokeWidth', event.target.value, 0, { min: 0, max: 40 })}
            className={`${inputClassName} w-[64px] px-2 text-center`}
            title="Outline width"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
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

        <div className="ml-auto flex items-center gap-2">
          <div className={`flex h-10 items-center gap-2 rounded-xl px-2 ${fieldSurface}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>X</span>
            <input
              type="number"
              value={draft.x ?? 0}
              onChange={(event) => updateNumericField('x', event.target.value, 0)}
              className="w-[74px] bg-transparent text-center text-sm focus:outline-none"
              title="Horizontal position"
            />
          </div>

          <div className={`flex h-10 items-center gap-2 rounded-xl px-2 ${fieldSurface}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Y</span>
            <input
              type="number"
              value={draft.y ?? 0}
              onChange={(event) => updateNumericField('y', event.target.value, 0)}
              className="w-[74px] bg-transparent text-center text-sm focus:outline-none"
              title="Vertical position"
            />
          </div>

          <button
            type="button"
            onClick={() => removeItem(activeTextIndex)}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${deleteButtonClass}`}
            title="Delete text"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </div>
  );
}
