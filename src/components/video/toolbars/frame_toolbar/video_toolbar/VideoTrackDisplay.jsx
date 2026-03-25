import React, { useMemo } from 'react';
import ReactSlider from 'react-slider';
import { useColorMode } from '../../../../../contexts/ColorMode.jsx';

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function getOperationPalette(operation, colorMode) {
  const isSpeedOperation = operation?.type === 'SPEED';

  if (colorMode === 'light') {
    return isSpeedOperation
      ? {
        fill: operation?.status === 'pending' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(14, 165, 233, 0.24)',
        border: operation?.status === 'pending' ? 'rgba(37, 99, 235, 0.5)' : 'rgba(2, 132, 199, 0.52)',
      }
      : {
        fill: operation?.status === 'pending' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)',
        border: operation?.status === 'pending' ? 'rgba(225, 29, 72, 0.48)' : 'rgba(239, 68, 68, 0.45)',
      };
  }

  return isSpeedOperation
    ? {
      fill: operation?.status === 'pending' ? 'rgba(37, 99, 235, 0.28)' : 'rgba(6, 182, 212, 0.28)',
      border: operation?.status === 'pending' ? 'rgba(96, 165, 250, 0.52)' : 'rgba(103, 232, 249, 0.52)',
    }
    : {
      fill: operation?.status === 'pending' ? 'rgba(225, 29, 72, 0.28)' : 'rgba(244, 63, 94, 0.28)',
      border: operation?.status === 'pending' ? 'rgba(253, 164, 175, 0.52)' : 'rgba(251, 113, 133, 0.52)',
    };
}

function clampSelectionRange(range, durationFrames) {
  const safeDurationFrames = Math.max(1, Math.round(durationFrames) || 1);
  const rawStart = Array.isArray(range) ? Math.round(Number(range[0]) || 0) : 0;
  const rawEnd = Array.isArray(range) ? Math.round(Number(range[1]) || 0) : safeDurationFrames;
  const nextStart = Math.min(Math.max(rawStart, 0), safeDurationFrames - 1);
  const nextEnd = Math.max(nextStart + 1, Math.min(rawEnd, safeDurationFrames));
  return [nextStart, nextEnd];
}

export default function VideoTrackDisplay(props) {
  const {
    videoTrackItem,
    selectedFrameRange,
    isDisplaySelected = false,
    showSelectionHandles = false,
    setVideoTrackDisplayAsSelected,
    operationDisplayList = [],
    selectedLocalRangeFrames,
    onSelectionChange,
    onSelectionCommit,
    isBusy = false,
  } = props;
  const { colorMode } = useColorMode();
  const [visibleStartFrame, visibleEndFrame] = selectedFrameRange;
  const visibleFrameRange = Math.max(1, visibleEndFrame - visibleStartFrame);

  const trackTopPercent = clampPercent(
    ((videoTrackItem.startFrame - visibleStartFrame) / visibleFrameRange) * 100
  );
  const trackBottomPercent = clampPercent(
    ((videoTrackItem.endFrame - visibleStartFrame) / visibleFrameRange) * 100
  );
  const trackHeightPercent = Math.max(1, trackBottomPercent - trackTopPercent);
  const normalizedSelectionRange = clampSelectionRange(
    selectedLocalRangeFrames,
    videoTrackItem.durationFrames,
  );

  const visibleOperations = useMemo(() => (
    operationDisplayList.filter((operation) => (
      operation?.endFrame >= visibleStartFrame && operation?.startFrame <= visibleEndFrame
    ))
  ), [operationDisplayList, visibleEndFrame, visibleStartFrame]);

  const railSurface = colorMode === 'dark'
    ? 'bg-slate-950/70 border border-slate-800'
    : 'bg-slate-100 border border-slate-200';
  const inactiveTrackSurface = colorMode === 'dark'
    ? 'bg-gradient-to-b from-[#1f2937] to-[#111827] border border-slate-700/80'
    : 'bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-300';
  const activeTrackSurface = colorMode === 'dark'
    ? 'bg-gradient-to-b from-cyan-500/20 via-sky-500/24 to-indigo-500/22 border border-cyan-300/40 shadow-[0_0_18px_rgba(34,211,238,0.14)]'
    : 'bg-gradient-to-b from-cyan-100 via-sky-100 to-indigo-100 border border-sky-400/40 shadow-[0_0_18px_rgba(14,165,233,0.12)]';
  const labelClassName = colorMode === 'dark' ? 'text-slate-300' : 'text-slate-500';
  const selectedRing = isDisplaySelected
    ? (colorMode === 'dark' ? 'ring-2 ring-cyan-300/55' : 'ring-2 ring-sky-400/55')
    : '';

  const handleSelect = (event) => {
    event.stopPropagation();
    setVideoTrackDisplayAsSelected?.(videoTrackItem.layerId);
  };

  return (
    <button
      type="button"
      className={`relative mr-2 inline-flex h-full w-[42px] min-w-[42px] items-stretch justify-center rounded-[24px] border-0 bg-transparent px-2 py-2 transition ${selectedRing}`}
      onClick={handleSelect}
      title={`${videoTrackItem.assetLabel} on layer ${videoTrackItem.layerIndex + 1}`}
    >
      <div className={`relative h-full w-full rounded-[20px] ${railSurface}`}>
        <div
          className={`absolute left-1/2 w-[16px] -translate-x-1/2 rounded-[18px] ${isDisplaySelected ? activeTrackSurface : inactiveTrackSurface}`}
          style={{
            top: `${trackTopPercent}%`,
            height: `${trackHeightPercent}%`,
          }}
        >
          {isDisplaySelected && showSelectionHandles && (
            <div className="absolute inset-0 px-[2px] py-[4px]">
              <ReactSlider
                min={0}
                max={Math.max(1, videoTrackItem.durationFrames)}
                value={normalizedSelectionRange}
                minDistance={1}
                pearling
                orientation="vertical"
                className="video-diamond-slider"
                thumbClassName="video-diamond-thumb"
                trackClassName="video-diamond-track"
                onChange={onSelectionChange}
                onAfterChange={onSelectionCommit}
                disabled={isBusy}
              />
            </div>
          )}
        </div>

        {visibleOperations.map((operation) => {
          const operationPalette = getOperationPalette(operation, colorMode);
          const operationTopPercent = clampPercent(
            ((operation.startFrame - visibleStartFrame) / visibleFrameRange) * 100
          );
          const operationBottomPercent = clampPercent(
            ((operation.endFrame - visibleStartFrame) / visibleFrameRange) * 100
          );
          const operationHeightPercent = Math.max(1, operationBottomPercent - operationTopPercent);

          return (
            <div
              key={operation.id}
              className="pointer-events-none absolute left-1/2 z-[3] w-[24px] -translate-x-1/2"
              style={{
                top: `${operationTopPercent}%`,
                height: `${operationHeightPercent}%`,
              }}
            >
              <div
                className="absolute left-1/2 top-0 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
                style={{
                  background: operationPalette.fill,
                  border: `1px solid ${operationPalette.border}`,
                }}
              />
              <div
                className="absolute left-1/2 top-0 h-full w-[10px] -translate-x-1/2 rounded-full"
                style={{
                  background: operationPalette.fill,
                  borderLeft: `1px solid ${operationPalette.border}`,
                  borderRight: `1px solid ${operationPalette.border}`,
                }}
              />
              <div
                className="absolute left-1/2 bottom-0 h-[10px] w-[10px] -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px]"
                style={{
                  background: operationPalette.fill,
                  border: `1px solid ${operationPalette.border}`,
                }}
              />
            </div>
          );
        })}

        <div className="pointer-events-none absolute left-1/2 top-2 z-[4] -translate-x-1/2">
          <div className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${labelClassName}`}>
            {videoTrackItem.shortLabel}
          </div>
        </div>

        {videoTrackItem.videoEditPending && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-[4] h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.65)]" />
        )}
      </div>
    </button>
  );
}
