import React, { useEffect, useMemo, useState } from 'react';
import { FaBolt, FaCut, FaTimes } from 'react-icons/fa';
import { useColorMode } from '../../../../../contexts/ColorMode.jsx';

const DEFAULT_SPEED_MULTIPLIER = 1.5;
const MIN_SPEED_MULTIPLIER = 1.25;
const MAX_SPEED_MULTIPLIER = 8;
const SPEED_MULTIPLIER_STEP = 0.25;
const DISPLAY_FRAMES_PER_SECOND = 30;

function getToolLabel(activeTool) {
  if (!activeTool) {
    return 'Choose action';
  }

  if (activeTool.type === 'REMOVE') {
    return 'Cut';
  }

  return `${activeTool.speedMultiplier || DEFAULT_SPEED_MULTIPLIER}x`;
}

function formatFrameRange(rangeFrames = [], framesPerSecond = DISPLAY_FRAMES_PER_SECOND) {
  if (!Array.isArray(rangeFrames) || rangeFrames.length < 2) {
    return '0.0s to 0.0s';
  }

  const startSeconds = Math.max(0, Number(rangeFrames[0]) || 0) / framesPerSecond;
  const endSeconds = Math.max(startSeconds, Number(rangeFrames[1]) || 0) / framesPerSecond;

  return `${startSeconds.toFixed(1)}s to ${endSeconds.toFixed(1)}s`;
}

function getOperationSummaryLabel(operation, framesPerSecond = DISPLAY_FRAMES_PER_SECOND) {
  const operationLabel = operation?.type === 'REMOVE'
    ? 'Cut'
    : `Speed ${Number(operation?.speedMultiplier || DEFAULT_SPEED_MULTIPLIER).toFixed(2).replace(/\.00$/, '')}x`;
  const rangeLabel = formatFrameRange([
    Math.round((Number(operation?.startTime) || 0) * framesPerSecond),
    Math.round((Number(operation?.endTime) || 0) * framesPerSecond),
  ], framesPerSecond);

  return `${operationLabel} · ${rangeLabel}`;
}

function ActionButton({
  children,
  isActive = false,
  onClick,
  title,
  colorMode,
  disabled = false,
}) {
  const surfaceClassName = isActive
    ? (colorMode === 'dark'
      ? 'bg-cyan-500/22 border-cyan-300/55 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
      : 'bg-sky-100 border-sky-400/55 text-sky-700 shadow-[0_0_18px_rgba(14,165,233,0.12)]')
    : (colorMode === 'dark'
      ? 'bg-[#111a2f] border-[#1f2a3d] text-slate-300 hover:bg-[#16213a]'
      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100');

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center justify-center rounded-xl border px-3 py-2 text-[11px] font-semibold transition disabled:opacity-50 ${surfaceClassName}`}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </button>
  );
}

export default function SelectedVideoTrackDisplay(props) {
  const {
    selectedVideoTrack,
    activeTool,
    onSelectTool,
    onSpeedMultiplierChange,
    selectedRangeFrames = [0, 1],
    draftOperations = [],
    pendingOperations = [],
    onAddDraft,
    onRemoveDraft,
    onClearDrafts,
    onApplyDrafts,
    isBusy = false,
  } = props;
  const { colorMode } = useColorMode();
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    setFeedbackMessage('');
  }, [selectedVideoTrack?.layerId]);

  const isSpeedToolActive = activeTool?.type === 'SPEED';
  const isCutToolActive = activeTool?.type === 'REMOVE';
  const resolvedSpeedMultiplier = isSpeedToolActive
    ? Math.min(
      MAX_SPEED_MULTIPLIER,
      Math.max(MIN_SPEED_MULTIPLIER, Number(activeTool?.speedMultiplier) || DEFAULT_SPEED_MULTIPLIER)
    )
    : DEFAULT_SPEED_MULTIPLIER;

  const statusText = useMemo(() => {
    if (selectedVideoTrack?.videoEditPending) {
      return selectedVideoTrack.videoEditTaskMessage || 'Processing';
    }
    if (selectedVideoTrack?.videoEditStatus === 'FAILED') {
      return selectedVideoTrack.videoEditError || 'Edit failed';
    }
    if (draftOperations.length > 0) {
      return `${draftOperations.length} staged change${draftOperations.length === 1 ? '' : 's'}. Click Update to apply them.`;
    }
    if (!activeTool) {
      return 'Choose an action, drag the lane range, then add it to the update list.';
    }
    return `Selection ready for ${getToolLabel(activeTool)} on ${formatFrameRange(selectedRangeFrames)}.`;
  }, [
    activeTool,
    draftOperations.length,
    selectedRangeFrames,
    selectedVideoTrack?.videoEditError,
    selectedVideoTrack?.videoEditPending,
    selectedVideoTrack?.videoEditStatus,
    selectedVideoTrack?.videoEditTaskMessage,
  ]);

  const statusClassName = selectedVideoTrack?.videoEditPending
    ? 'text-cyan-300'
    : selectedVideoTrack?.videoEditStatus === 'FAILED'
      ? 'text-rose-400'
      : colorMode === 'dark'
        ? 'text-slate-300'
        : 'text-slate-500';

  const toolbarSurfaceClassName = colorMode === 'dark'
    ? 'bg-[#0b1224]/80 border border-[#1f2a3d]'
    : 'bg-white/80 border border-slate-200 shadow-sm';
  const subLabelClassName = colorMode === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const inputSurfaceClassName = colorMode === 'dark'
    ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100'
    : 'bg-white border border-slate-200 text-slate-700';
  const secondaryButtonClassName = colorMode === 'dark'
    ? 'border border-[#31405e] bg-[#111a2f] text-slate-200 hover:bg-[#16213a]'
    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100';
  const destructiveButtonClassName = colorMode === 'dark'
    ? 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/18'
    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100';

  const handleAddDraftClick = async () => {
    const response = await onAddDraft?.();
    if (response?.success === false) {
      setFeedbackMessage(response.error || 'Unable to stage this selection.');
      return;
    }
    setFeedbackMessage('Selection staged. Click Update when ready.');
  };

  const handleApplyDraftsClick = async () => {
    const response = await onApplyDrafts?.();
    if (response?.success === false) {
      setFeedbackMessage(response.error || 'Unable to apply staged changes.');
      return;
    }
    setFeedbackMessage('');
  };

  return (
    <div className={`ml-2 flex min-h-[64px] w-full flex-wrap items-start justify-between gap-3 rounded-2xl px-3 py-3 ${toolbarSurfaceClassName}`}>
      <div className="min-w-0 flex-1">
        <div className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${subLabelClassName}`}>
          {selectedVideoTrack?.assetLabel || 'Video layer'}
        </div>
        <div className={`text-[11px] ${statusClassName}`}>
          {statusText}
        </div>
        {feedbackMessage ? (
          <div className={`mt-1 text-[10px] ${colorMode === 'dark' ? 'text-amber-200' : 'text-amber-700'}`}>
            {feedbackMessage}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-[320px] flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            colorMode={colorMode}
            isActive={isSpeedToolActive}
            disabled={isBusy}
            onClick={() => onSelectTool?.({
              type: 'SPEED',
              speedMultiplier: resolvedSpeedMultiplier,
            })}
            title="Speed up the selected range"
          >
            <FaBolt className="text-[10px]" />
            Speed Up
          </ActionButton>

          <ActionButton
            colorMode={colorMode}
            isActive={isCutToolActive}
            disabled={isBusy}
            onClick={() => onSelectTool?.({
              type: 'REMOVE',
              speedMultiplier: 1,
            })}
            title="Remove the selected range"
          >
            <FaCut className="text-[10px]" />
            Cut Out
          </ActionButton>

          <div className={`text-[10px] font-medium ${subLabelClassName}`}>
            Selection: {formatFrameRange(selectedRangeFrames)}
          </div>
        </div>

        {isSpeedToolActive && (
          <div className="flex flex-wrap items-center gap-3">
            <label className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${subLabelClassName}`}>
              Speed
            </label>
            <input
              type="range"
              min={MIN_SPEED_MULTIPLIER}
              max={MAX_SPEED_MULTIPLIER}
              step={SPEED_MULTIPLIER_STEP}
              value={resolvedSpeedMultiplier}
              disabled={isBusy}
              onChange={(event) => onSpeedMultiplierChange?.(Number(event.target.value))}
              className="h-2 w-[180px] cursor-pointer accent-cyan-400"
            />
            <input
              type="number"
              min={MIN_SPEED_MULTIPLIER}
              max={MAX_SPEED_MULTIPLIER}
              step={SPEED_MULTIPLIER_STEP}
              value={resolvedSpeedMultiplier}
              disabled={isBusy}
              onChange={(event) => onSpeedMultiplierChange?.(Number(event.target.value))}
              className={`w-[78px] rounded-lg px-2 py-1 text-[11px] ${inputSurfaceClassName}`}
            />
            <div className={`text-[11px] font-semibold ${statusClassName}`}>
              {resolvedSpeedMultiplier.toFixed(2).replace(/\.00$/, '')}x
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBusy || !activeTool}
            onClick={handleAddDraftClick}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold transition disabled:opacity-50 ${secondaryButtonClassName}`}
          >
            Add Selection
          </button>
          <button
            type="button"
            disabled={isBusy || draftOperations.length === 0}
            onClick={onClearDrafts}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold transition disabled:opacity-50 ${destructiveButtonClassName}`}
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isBusy || draftOperations.length === 0}
            onClick={handleApplyDraftsClick}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold transition disabled:opacity-50 ${
              colorMode === 'dark'
                ? 'bg-cyan-400 text-[#041420] hover:bg-cyan-300'
                : 'bg-sky-600 text-white hover:bg-sky-500'
            }`}
          >
            Update
          </button>

          {pendingOperations.length > 0 && (
            <div className={`text-[10px] font-medium ${subLabelClassName}`}>
              {pendingOperations.length} pending
            </div>
          )}
        </div>

        {draftOperations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {draftOperations.map((operation) => (
              <div
                key={operation.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium ${
                  colorMode === 'dark'
                    ? 'bg-[#111a2f] text-slate-200 border border-[#1f2a3d]'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{getOperationSummaryLabel(operation)}</span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveDraft?.(operation.id)}
                  className="inline-flex items-center justify-center rounded-full opacity-70 transition hover:opacity-100 disabled:opacity-40"
                  title="Remove staged change"
                >
                  <FaTimes className="text-[9px]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
