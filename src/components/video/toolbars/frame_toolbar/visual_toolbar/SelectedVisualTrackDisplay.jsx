import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function SelectedVisualTrackDisplay(props) {
  const {
    selectedVisualTrack,
    onDelete,
  } = props;

  if (!selectedVisualTrack) {
    return <span />;
  }

  const startTime = (selectedVisualTrack.startTime || 0).toFixed(2);
  const endTime = (selectedVisualTrack.endTime || 0).toFixed(2);
  const durationTime = Math.max(
    0,
    (selectedVisualTrack.endTime || 0) - (selectedVisualTrack.startTime || 0),
  ).toFixed(2);

  let statusLabel = '';
  let statusClassName = 'text-neutral-400';
  if (selectedVisualTrack.isSaving) {
    statusLabel = 'Saving...';
    statusClassName = 'text-blue-300';
  } else if (selectedVisualTrack.saveError) {
    statusLabel = 'Save failed';
    statusClassName = 'text-red-300';
  } else if (selectedVisualTrack.isDirty) {
    statusLabel = 'Unsaved';
    statusClassName = 'text-amber-300';
  }

  return (
    <div className="flex flex-nowrap items-center w-full gap-4 text-xs">
      <div className="flex flex-col justify-center min-w-[140px]">
        <span className="uppercase font-bold text-emerald-300 text-xs">
          {selectedVisualTrack.assetLabel}
        </span>
        <span className="text-neutral-300">
          {selectedVisualTrack.id}
        </span>
        <span className="text-neutral-400">
          Layer {selectedVisualTrack.layerIndex + 1}
        </span>
      </div>

      <div className="flex flex-row items-center gap-4">
        <div className="flex flex-col">
          <span className="font-semibold">Start</span>
          <span>{startTime}s</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">End</span>
          <span>{endTime}s</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Duration</span>
          <span>{durationTime}s</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {statusLabel && (
          <span className={`font-semibold ${statusClassName}`}>
            {statusLabel}
          </span>
        )}

        <button
          type="button"
          className="bg-red-800 text-white px-2 py-1 rounded-sm inline-flex items-center gap-1 disabled:opacity-60"
          onClick={() => onDelete?.(selectedVisualTrack)}
          disabled={selectedVisualTrack.isSaving}
        >
          <FaTimes />
          Delete
        </button>
      </div>
    </div>
  );
}
