import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FaCheck, FaSlidersH, FaTrash } from 'react-icons/fa';

import TextStylePanel, {
  buildTextStyleDraft,
  mapTextDraftToConfig,
  mapTextDraftToStyleConfig,
  mapTextItemToDraft,
  persistTextStyleConfig,
} from '../../../common/TextStylePanel.jsx';
import CanvasActionOptionsDialog from '../../../editor/utils/CanvasActionOptionsDialog.jsx';
import { useAlertDialog } from '../../../../contexts/AlertDialogContext.jsx';

function EditTextOptionsDialog({
  initialDraft,
  editorVariant,
  onClose,
  onDraftChange,
  onSubmit,
  onDelete,
}) {
  const [dialogDraft, setDialogDraft] = useState(() => buildTextStyleDraft(initialDraft));

  const handleDialogDraftChange = (nextDraft) => {
    const resolvedDraft = buildTextStyleDraft(nextDraft);
    setDialogDraft(resolvedDraft);
    onDraftChange(resolvedDraft);
  };

  return (
    <CanvasActionOptionsDialog
      title="Text options"
      subtitle="Update text content, wrap behavior, bounding box, typography, and advanced layout."
      badge="Selected text"
      onClose={onClose}
      maxWidth="820px"
    >
      <TextStylePanel
        value={dialogDraft}
        onChange={handleDialogDraftChange}
        onSubmit={() => onSubmit(dialogDraft)}
        submitLabel="Update"
        submitDisabled={!`${dialogDraft.text || ''}`.trim()}
        editorVariant={editorVariant}
        header="Text"
        density="comfortable"
        layerActions={[
          {
            label: 'Delete',
            icon: 'trash',
            intent: 'danger',
            onClick: onDelete,
          },
        ]}
      />
    </CanvasActionOptionsDialog>
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

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
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

  const commitDraft = useCallback(
    (draftOverride = draft, options = {}) => {
      if (!draftOverride || !activeTextItem || typeof updateTargetTextActiveLayerConfig !== 'function') {
        return;
      }

      const normalizedDraft = buildTextStyleDraft(draftOverride);
      updateTargetTextActiveLayerConfig(itemId, {
        text: `${normalizedDraft.text || ''}`,
        styleValueSpace: 'raw',
        ...mapTextDraftToConfig(normalizedDraft),
      });
      persistSharedStyle(normalizedDraft);
      setDraft(normalizedDraft);
      setIsDirty(false);

      if (options.closeDialog) {
        closeAlertDialog();
      }
    },
    [
      activeTextItem,
      closeAlertDialog,
      draft,
      itemId,
      persistSharedStyle,
      updateTargetTextActiveLayerConfig,
    ]
  );

  const updateDraft = useCallback((changes) => {
    setDraft((prev) => buildTextStyleDraft({ ...(prev || {}), ...changes }));
    setIsDirty(true);
  }, []);

  const handleDelete = useCallback(() => {
    closeAlertDialog();
    removeItem?.();
  }, [closeAlertDialog, removeItem]);

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
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const actionButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white hover:bg-rose-400 disabled:bg-[#17233d] disabled:text-slate-500'
      : 'bg-rose-500 text-white hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400';
  const secondaryButtonClass =
    colorMode === 'dark'
      ? 'border border-[#273956] bg-[#111a2f] text-slate-100 hover:bg-[#172642]'
      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const deleteButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500/12 border border-rose-400/30 text-rose-100 hover:bg-rose-500/18'
      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100';
  const wrapButtonClass = draft.autoWrap
    ? 'bg-blue-600 text-white hover:bg-blue-500'
    : secondaryButtonClass;
  const toolbarWidth = isImageStudio ? 360 : 340;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const toolbarLeft = Math.max(
    12,
    Math.min(Number(pos?.x) || 12, viewportWidth - toolbarWidth - 24)
  );
  const toolbarTop = Math.max(12, Math.min(Number(pos?.y) || 12, viewportHeight - 260));

  const showTextOptionsDialog = () => {
    openAlertDialog(
      <EditTextOptionsDialog
        initialDraft={draft}
        editorVariant={editorVariant}
        onClose={closeAlertDialog}
        onDraftChange={updateDraft}
        onSubmit={(nextDraft) => commitDraft(nextDraft, { closeDialog: true })}
        onDelete={handleDelete}
      />,
      undefined,
      true,
      { hideCloseButton: true, hideBorder: true, fullBleed: true, centerContent: true }
    );
  };

  return (
    <div
      key={`toolbar_${pos.id}`}
      className={`${toolbarSurface} absolute rounded-[20px] p-3`}
      style={{
        left: toolbarLeft,
        top: toolbarTop,
        width: `${toolbarWidth}px`,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(72vh, 420px)',
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Text
          </div>
          <div className={`mt-0.5 text-[11px] ${mutedText}`}>
            {draft.autoWrap ? 'Wrap on' : 'Wrap off'} · {draft.width} x {draft.height}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${deleteButtonClass}`}
          title="Delete text"
        >
          <FaTrash />
        </button>
      </div>

      <TextareaAutosize
        minRows={2}
        value={draft.text || ''}
        onChange={(event) => updateDraft({ text: event.target.value })}
        className={`mb-3 min-h-[76px] w-full resize-none rounded-xl px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${fieldSurface}`}
        placeholder="Edit text"
      />

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => updateDraft({ autoWrap: !draft.autoWrap })}
          className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${wrapButtonClass}`}
          title="Toggle word wrap"
        >
          Wrap
        </button>
        <button
          type="button"
          onClick={showTextOptionsDialog}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${secondaryButtonClass}`}
          title="Text options"
        >
          <FaSlidersH />
          <span>Options</span>
        </button>
        <button
          type="button"
          onClick={() => commitDraft()}
          disabled={!isDirty || !`${draft.text || ''}`.trim()}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${actionButtonClass}`}
          title="Update text"
        >
          <FaCheck />
          <span>Update</span>
        </button>
      </div>
    </div>
  );
}
