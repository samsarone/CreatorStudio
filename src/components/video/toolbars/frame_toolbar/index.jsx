// FrameToolbar.js
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';
import CommonButton from '../../../common/CommonButton.tsx';
import './toolbar.css';
import './baseToolbar.css';
import ReactSlider from 'react-slider';
import {
  FaCheck,
  FaChevronRight,
  FaTimes,
  FaChevronUp,
  FaChevronDown,
  FaCopy,
  FaDownload,
} from 'react-icons/fa';
import AudioOptionsDialog from '../audio/AudioOptionsDialog.jsx';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import CommonDropdownButton from "../../../common/CommonDropdownButton.tsx";
import PublicPrimaryButton from '../../../common/buttons/PrimaryPublicButton.tsx';

import ReactDOM from 'react-dom';

import SecondaryButton from '../../../common/SecondaryButton.tsx';
import DualThumbSlider from '../../util/DualThumbSlider.jsx';
import TimeRuler from '../../util/TimeRuler.jsx';
import RangeOverlaySlider from './RangeOverlaySlider.jsx';
import { FRAME_TOOLBAR_VIEW } from '../../../../constants/Types.ts';
import AudioTrackSlider from '../../util/AudioTrackSlider.jsx';
import DropdownButton from '../../util/DropdownButton.jsx';
import { useAlertDialog } from '../../../../contexts/AlertDialogContext.jsx';
import { useUser } from '../../../../contexts/UserContext.jsx';
import BatchPrompt from '../../util/BatchPrompt.jsx';
import TextTrackDisplay from './text_toolbar/TextTrackDisplay.jsx';
import VisualTrackDisplay from './visual_toolbar/VisualTrackDisplay.jsx';
import SelectedVisualTrackDisplay from './visual_toolbar/SelectedVisualTrackDisplay.jsx';
import VideoTrackDisplay from './video_toolbar/VideoTrackDisplay.jsx';
import SelectedVideoTrackDisplay from './video_toolbar/SelectedVideoTrackDisplay.jsx';

import { createPortal } from 'react-dom';
import { FaChevronLeft, FaEye } from 'react-icons/fa6';
import { FaRedo } from 'react-icons/fa';
import SelectedTextToolbarDisplay from './text_toolbar/SelectedTextToolbarDisplay.jsx';
import PublishOptionsDialog from './PublishOptionsDialog.jsx';
import _ from 'lodash';
import {
  buildAudioLayerVolumeAutomationPoints,
  clampAudioVolumeValue,
  normalizeAudioLayerType,
} from '../../util/audioPreviewDucking.js';
import {
  frameToViewportValue,
  getViewportGeometryFrameRange,
  viewportValueToFrame,
} from '../../util/viewportGeometry.js';
const MAX_VISIBLE_LAYERS = 10;
const MIN_LAYER_HEIGHT = 20; // in pixels
const VISUAL_TRACK_DISPLAY_FRAMES_PER_SECOND = 30;
const VIDEO_EDIT_DEFAULT_SPEED_MULTIPLIER = 1.5;
const VIDEO_EDIT_MIN_SPEED_MULTIPLIER = 1.25;
const VIDEO_EDIT_MAX_SPEED_MULTIPLIER = 8;
const MAX_GRID_SNAP_POINTS = 12;
const GRID_SNAP_TOLERANCE_FRAMES = 3;
const GRID_STEP_FRAMES = [
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  90,
  150,
  300,
  450,
  600,
  900,
  1800,
  3600,
  5400,
  7200,
];
const SCENE_POPUP_WIDTH = 150;
const SCENE_POPUP_GAP = 10;
const SCENE_TRANSITION_PRESET_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'dissolve', label: 'Dissolve' },
];

function resolveAudioTrackId(audioTrack) {
  return audioTrack?._id?.toString?.() || audioTrack?._id || audioTrack?.id || null;
}

function sanitizeAudioTrackText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatAudioTrackTypeLabel(value) {
  const normalizedType = normalizeAudioLayerType(value);

  switch (normalizedType) {
    case 'music':
      return 'Music';
    case 'speech':
      return 'Speech';
    case 'sound_effect':
      return 'Sound Effect';
    case 'lip_sync':
      return 'Lip Sync';
    case 'background_music':
      return 'Background Music';
    case 'user_video':
      return 'User Video';
    default:
      if (!normalizedType) {
        return 'Audio';
      }

      return normalizedType
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function getAudioTrackPromptText(audioTrack = {}) {
  const prompt = sanitizeAudioTrackText(audioTrack?.prompt);
  if (prompt) {
    return prompt;
  }

  return sanitizeAudioTrackText(audioTrack?.description);
}

function getAudioTrackDisplayTitle(audioTrack = {}) {
  const title = sanitizeAudioTrackText(audioTrack?.title);
  const promptText = getAudioTrackPromptText(audioTrack);
  const speakerName = sanitizeAudioTrackText(audioTrack?.speakerCharacterName)
    || sanitizeAudioTrackText(audioTrack?.speaker);
  const typeLabel = formatAudioTrackTypeLabel(audioTrack?.generationType);
  const hasDistinctTitle = title
    && (!promptText || title.toLowerCase() !== promptText.toLowerCase());
  const normalizedType = normalizeAudioLayerType(audioTrack?.generationType);

  if (normalizedType === 'speech' || normalizedType === 'lip_sync') {
    return (hasDistinctTitle ? title : '') || speakerName || typeLabel;
  }

  if (normalizedType === 'music') {
    return (hasDistinctTitle ? title : '') || 'Music';
  }

  return (hasDistinctTitle ? title : '') || typeLabel;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function allocateLayerHeights(layers = [], availableHeight, minimumHeight = MIN_LAYER_HEIGHT) {
  const visibleLayerCount = Array.isArray(layers) ? layers.length : 0;
  const safeAvailableHeight = Math.max(0, Math.floor(Number(availableHeight) || 0));

  if (visibleLayerCount === 0) {
    return [];
  }

  if (safeAvailableHeight === 0) {
    return new Array(visibleLayerCount).fill(0);
  }

  const totalDuration = layers.reduce(
    (accumulator, layer) => accumulator + Math.max(0, Number(layer?.duration) || 0),
    0,
  );
  const baseMinimumHeight = Math.min(
    Math.max(0, Number(minimumHeight) || 0),
    safeAvailableHeight / visibleLayerCount,
  );
  const baseHeightBudget = baseMinimumHeight * visibleLayerCount;
  const distributableHeight = Math.max(0, safeAvailableHeight - baseHeightBudget);
  const weights = totalDuration > 0
    ? layers.map((layer) => Math.max(0, Number(layer?.duration) || 0) / totalDuration)
    : new Array(visibleLayerCount).fill(1 / visibleLayerCount);
  const rawHeights = weights.map((weight) => (
    baseMinimumHeight + (distributableHeight * weight)
  ));
  const resolvedHeights = rawHeights.map((height) => Math.floor(height));
  let remainingPixels = safeAvailableHeight - resolvedHeights.reduce(
    (accumulator, height) => accumulator + height,
    0,
  );

  const remainders = rawHeights
    .map((height, index) => ({
      index,
      remainder: height - Math.floor(height),
    }))
    .sort((left, right) => (
      right.remainder - left.remainder || left.index - right.index
    ));

  let remainderIndex = 0;
  while (remainingPixels > 0 && remainders.length > 0) {
    const targetIndex = remainders[remainderIndex % remainders.length].index;
    resolvedHeights[targetIndex] += 1;
    remainingPixels -= 1;
    remainderIndex += 1;
  }

  return resolvedHeights;
}

function buildLayerPixelLayout(
  layers = [],
  visibleLayerDurationFramesById = {},
  availableHeight = 0,
  displayFramesPerSecond = 30,
) {
  const layerHeightsInPixels = allocateLayerHeights(
    layers.map((layer) => {
      const layerId = layer?._id?.toString?.() || layer?._id;
      return {
        duration: visibleLayerDurationFramesById[layerId]
          ?? Math.max(1, Math.round((Number(layer?.duration) || 0) * displayFramesPerSecond)),
      };
    }),
    availableHeight,
  );

  let nextTop = 0;
  const layerLayoutById = layers.reduce((accumulator, layer, index) => {
    const layerId = layer?._id?.toString?.() || layer?._id || `${index}`;
    const height = Math.max(0, layerHeightsInPixels[index] ?? 0);

    accumulator[layerId] = {
      top: nextTop,
      height,
      bottom: nextTop + height,
    };

    nextTop += height;
    return accumulator;
  }, {});

  return {
    layerHeightsInPixels,
    layerLayoutById,
  };
}

function pickGridStepFrames(viewRangeFrames, targetLineCount = 10) {
  const safeRange = Math.max(1, Math.round(viewRangeFrames) || 1);
  const safeTargetCount = Math.max(4, Math.round(targetLineCount) || 10);
  const minimumStepFrames = Math.max(1, safeRange / safeTargetCount);

  return GRID_STEP_FRAMES.find((candidate) => candidate >= minimumStepFrames)
    || Math.max(1, Math.ceil(minimumStepFrames));
}

function getMinorGridStepFrames(majorStepFrames) {
  if (!Number.isFinite(majorStepFrames) || majorStepFrames <= 1) {
    return null;
  }

  const smallerCandidates = GRID_STEP_FRAMES.filter(
    (candidate) => candidate < majorStepFrames
  );

  if (smallerCandidates.length === 0) {
    return Math.max(1, Math.round(majorStepFrames / 2));
  }

  const targetMinorStep = Math.max(1, majorStepFrames / 4);

  return smallerCandidates.reduce((closestCandidate, candidate) => (
    Math.abs(candidate - targetMinorStep) < Math.abs(closestCandidate - targetMinorStep)
      ? candidate
      : closestCandidate
  ), smallerCandidates[smallerCandidates.length - 1]);
}

function buildGridLineOffsets(rangeStartFrame, rangeEndFrame, stepFrames) {
  if (
    !Number.isFinite(rangeStartFrame)
    || !Number.isFinite(rangeEndFrame)
    || !Number.isFinite(stepFrames)
    || stepFrames <= 0
    || rangeEndFrame <= rangeStartFrame
  ) {
    return [];
  }

  const visibleFrameRange = rangeEndFrame - rangeStartFrame;
  const firstAlignedFrame = Math.ceil(rangeStartFrame / stepFrames) * stepFrames;
  const offsets = [];

  for (let frame = firstAlignedFrame; frame < rangeEndFrame; frame += stepFrames) {
    if (frame <= rangeStartFrame || frame >= rangeEndFrame) {
      continue;
    }

    offsets.push(
      clampPercent(((frame - rangeStartFrame) / visibleFrameRange) * 100)
    );
  }

  return offsets;
}

function buildGridLineFrames(rangeStartFrame, rangeEndFrame, stepFrames) {
  if (
    !Number.isFinite(rangeStartFrame)
    || !Number.isFinite(rangeEndFrame)
    || !Number.isFinite(stepFrames)
    || stepFrames <= 0
    || rangeEndFrame <= rangeStartFrame
  ) {
    return [];
  }

  const firstAlignedFrame = Math.ceil(rangeStartFrame / stepFrames) * stepFrames;
  const frames = [];

  for (let frame = firstAlignedFrame; frame < rangeEndFrame; frame += stepFrames) {
    if (frame <= rangeStartFrame || frame >= rangeEndFrame) {
      continue;
    }

    frames.push(frame);
  }

  return frames;
}

function isVisualLayerItem(item) {
  return item?.type === 'image' || item?.type === 'shape';
}

function getVisualTrackAssetLabel(item) {
  if (!item) {
    return 'Visual';
  }
  if (item.type === 'image') {
    return item.is_base_image ? 'Base image' : 'Image';
  }
  if (item.type === 'shape') {
    const shapeName = item.shape ? `${item.shape}` : 'shape';
    return `${shapeName} shape`;
  }
  return 'Visual';
}

function buildVisualTrackDisplayList(layers, framesPerSecond) {
  if (!Array.isArray(layers) || layers.length === 0) {
    return [];
  }

  const resolvedFramesPerSecond = Number(framesPerSecond) || VISUAL_TRACK_DISPLAY_FRAMES_PER_SECOND;
  const visualTrackItems = [];

  layers.forEach((layer, layerIndex) => {
    const activeItemList = Array.isArray(layer?.imageSession?.activeItemList)
      ? layer.imageSession.activeItemList
      : [];

    const parentLayerStartFrame = Math.max(
      0,
      Math.round((Number(layer?.durationOffset) || 0) * resolvedFramesPerSecond)
    );
    const parentLayerDurationFrames = Math.max(
      1,
      Math.round((Number(layer?.duration) || 0) * resolvedFramesPerSecond)
    );
    const parentLayerEndFrame = parentLayerStartFrame + parentLayerDurationFrames;

    activeItemList.forEach((item, itemIndex) => {
      if (!isVisualLayerItem(item)) {
        return;
      }

      const configuredFrameOffset = Number(item?.config?.frameOffset);
      const configuredFrameDuration = Number(item?.config?.frameDuration);

      const relativeStartFrame = Number.isFinite(configuredFrameOffset)
        ? Math.max(0, Math.round(configuredFrameOffset))
        : 0;
      const relativeEndFrame = Number.isFinite(configuredFrameDuration) && configuredFrameDuration > 0
        ? relativeStartFrame + Math.round(configuredFrameDuration)
        : parentLayerDurationFrames;
      const clampedRelativeEndFrame = Math.max(
        relativeStartFrame + 1,
        Math.min(relativeEndFrame, parentLayerDurationFrames)
      );

      const startFrame = parentLayerStartFrame + relativeStartFrame;
      const endFrame = parentLayerStartFrame + clampedRelativeEndFrame;

      visualTrackItems.push({
        ...item,
        layerId: layer._id,
        layerIndex,
        itemIndex,
        trackKey: `${layer._id}_${item.id}`,
        assetLabel: getVisualTrackAssetLabel(item),
        parentLayerStartFrame,
        parentLayerEndFrame,
        parentLayerDurationFrames,
        startFrame,
        endFrame,
        startTime: startFrame / resolvedFramesPerSecond,
        endTime: endFrame / resolvedFramesPerSecond,
        duration: (endFrame - startFrame) / resolvedFramesPerSecond,
      });
    });
  });

  return visualTrackItems;
}

function getVideoTrackSourceMeta(layer = {}) {
  if (layer?.lipSyncVideoLayer || layer?.hasLipSyncVideoLayer) {
    return {
      sourceType: 'lip_sync',
      assetLabel: 'Lip sync video',
      shortLabel: 'LS',
    };
  }

  if (layer?.soundEffectVideoLayer || layer?.hasSoundEffectVideoLayer) {
    return {
      sourceType: 'sound_effect',
      assetLabel: 'Sound FX video',
      shortLabel: 'FX',
    };
  }

  if (layer?.userVideoLayer || layer?.hasUserVideoLayer || layer?.userVideoGenerationPending) {
    return {
      sourceType: 'user_video',
      assetLabel: 'Uploaded video',
      shortLabel: 'UP',
    };
  }

  if (layer?.aiVideoLayer || layer?.hasAiVideoLayer || layer?.aiVideoGenerationPending) {
    return {
      sourceType: 'ai_video',
      assetLabel: 'AI video',
      shortLabel: 'AI',
    };
  }

  return null;
}

function buildVideoOperationDisplayList(operations = [], trackStartFrame = 0, displayFramesPerSecond = 30, status = 'draft') {
  if (!Array.isArray(operations) || operations.length === 0) {
    return [];
  }

  return operations.map((operation, index) => {
    const startTime = Math.max(0, Number(operation?.startTime) || 0);
    const endTime = Math.max(startTime + (1 / displayFramesPerSecond), Number(operation?.endTime) || 0);
    const startFrame = trackStartFrame + Math.max(0, Math.round(startTime * displayFramesPerSecond));
    const endFrame = trackStartFrame + Math.max(
      startFrame + 1,
      Math.round(endTime * displayFramesPerSecond),
    );

    return {
      id: operation?.id || `${status}_${index}`,
      type: typeof operation?.type === 'string' ? operation.type.toUpperCase() : 'REMOVE',
      startTime,
      endTime,
      speedMultiplier: Number(operation?.speedMultiplier) > 1 ? Number(operation.speedMultiplier) : 1,
      startFrame,
      endFrame,
      status,
    };
  });
}

function buildVideoTrackDisplayList(layers, displayFramesPerSecond = 30) {
  if (!Array.isArray(layers) || layers.length === 0) {
    return [];
  }

  return layers.flatMap((layer, layerIndex) => {
    const sourceMeta = getVideoTrackSourceMeta(layer);
    if (!sourceMeta) {
      return [];
    }

    const trackStartFrame = Math.max(
      0,
      Math.round((Number(layer?.durationOffset) || 0) * displayFramesPerSecond)
    );
    const durationFrames = Math.max(
      1,
      Math.round((Number(layer?.duration) || 0) * displayFramesPerSecond)
    );
    const trackEndFrame = trackStartFrame + durationFrames;
    const layerId = layer?._id?.toString?.() || `${layerIndex}`;
    const pendingOperations = buildVideoOperationDisplayList(
      layer?.videoEditPendingOperations,
      trackStartFrame,
      displayFramesPerSecond,
      'pending'
    );

    return [{
      layerId,
      layerIndex,
      trackKey: `video_${layerId}`,
      assetLabel: sourceMeta.assetLabel,
      shortLabel: sourceMeta.shortLabel,
      sourceType: sourceMeta.sourceType,
      startFrame: trackStartFrame,
      endFrame: trackEndFrame,
      startTime: trackStartFrame / displayFramesPerSecond,
      endTime: trackEndFrame / displayFramesPerSecond,
      duration: durationFrames / displayFramesPerSecond,
      durationFrames,
      videoEditPending: Boolean(layer?.videoEditPending),
      videoEditStatus: layer?.videoEditStatus || 'INIT',
      videoEditError: layer?.videoEditError || null,
      videoEditTaskId: layer?.videoEditTaskId || null,
      videoEditTaskMessage: layer?.videoEditTaskMessage || null,
      pendingOperations,
    }];
  });
}

function buildLayerFrameMetadata(layers = [], displayFramesPerSecond = 30) {
  let fallbackStartFrame = 0;

  return layers.map((layer, index) => {
    const durationFrames = Math.max(
      1,
      Math.round((Number(layer?.duration) || 0) * displayFramesPerSecond)
    );
    const configuredStartFrame = Number.isFinite(Number(layer?.durationOffset))
      ? Math.max(0, Math.round(Number(layer.durationOffset) * displayFramesPerSecond))
      : null;
    const startFrame = configuredStartFrame ?? fallbackStartFrame;
    const endFrame = startFrame + durationFrames;

    fallbackStartFrame = endFrame;

    return {
      layer,
      originalIndex: index,
      startFrame,
      endFrame,
      durationFrames,
    };
  });
}

function clampVideoEditRange(rawRange, durationFrames) {
  const safeDurationFrames = Math.max(1, Math.round(durationFrames) || 1);
  const rawStartFrame = Array.isArray(rawRange) ? Math.round(Number(rawRange[0]) || 0) : 0;
  const rawEndFrame = Array.isArray(rawRange) ? Math.round(Number(rawRange[1]) || 0) : safeDurationFrames;
  const nextStartFrame = Math.min(Math.max(rawStartFrame, 0), safeDurationFrames - 1);
  const nextEndFrame = Math.max(
    nextStartFrame + 1,
    Math.min(Math.max(rawEndFrame, 1), safeDurationFrames),
  );

  return [nextStartFrame, nextEndFrame];
}

function getVideoEditOperationTimesFromFrames({
  startFrame,
  endFrame,
  durationFrames,
  durationSeconds,
  displayFramesPerSecond = 30,
}) {
  const safeDurationFrames = Math.max(1, Math.round(durationFrames) || 1);
  const safeDurationSeconds = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
    ? Number(durationSeconds)
    : safeDurationFrames / displayFramesPerSecond;
  const safeFrameDurationSeconds = 1 / displayFramesPerSecond;
  const clampedStartFrame = Math.min(
    Math.max(Math.round(Number(startFrame) || 0), 0),
    safeDurationFrames - 1,
  );
  const clampedEndFrame = Math.max(
    clampedStartFrame + 1,
    Math.min(Math.round(Number(endFrame) || safeDurationFrames), safeDurationFrames),
  );

  const startTime = Math.max(
    0,
    Math.min(
      clampedStartFrame / displayFramesPerSecond,
      Math.max(0, safeDurationSeconds - safeFrameDurationSeconds),
    ),
  );
  const rawEndTime = clampedEndFrame / displayFramesPerSecond;
  const endTime = clampedEndFrame >= safeDurationFrames
    ? safeDurationSeconds
    : Math.min(safeDurationSeconds, rawEndTime);

  return {
    startTime: Math.round(startTime * 1000) / 1000,
    endTime: Math.round(Math.max(startTime + safeFrameDurationSeconds, endTime) * 1000) / 1000,
  };
}

function areVideoEditToolsEqual(leftTool, rightTool) {
  if (!leftTool || !rightTool) {
    return false;
  }

  if (leftTool.type !== rightTool.type) {
    return false;
  }

  if (leftTool.type === 'SPEED') {
    return Number(leftTool.speedMultiplier) === Number(rightTool.speedMultiplier);
  }

  return true;
}

export default function FrameToolbar(props) {
  const {
    layers,
    setSelectedLayer,
    submitRenderVideo,
    setLayerDuration,
    currentLayerSeek,
    setCurrentLayerSeek,
    isLayerSeeking,
    renderedVideoPath,
    sessionId,
    updateSessionLayer,
    setIsLayerSeeking,
    isVideoGenerating,
    showAudioTrackView,
    frameToolbarView,
    audioLayers,
    removeAudioLayer,
    addLayerToComposition,
    copyCurrentLayerBelow,
    removeSessionLayer,
    addLayersViaPromptList,
    defaultSceneDuration,
    updateChangesToActiveSessionLayers,
    downloadLink,
    submitRegenerateFrames,
    applyAudioDucking,
    sceneTransitionPreset = 'none',
    onSceneTransitionPresetChange,
    onApplyAudioDuckingChange,
    selectedLayerIndex,
    setSelectedLayerIndex,
    regenerateVideoSessionSubtitles,
    requestRealignLayers,
    cancelPendingRender,
    publishVideoSession,
    unpublishVideoSession,
    updateLayerVisualItem,
    deleteLayerVisualItem,
    duplicateAudioLayer,
    isGuestSession,
    updateAllAudioLayersOneShot,
    requestVideoLayerEdit,
    isSessionPublished,
    renderCompletedThisSession,
    isRenderPending,
    isCanvasDirty,
    isUpdateLayerPending,
    isVideoPreviewPlaying = false,
    framesPerSecond = 16,

  } = props;


  const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
  const DISPLAY_FRAMES_PER_SECOND = 30;
  const numericFramesPerSecond = Number(framesPerSecond);
  const sessionFramesPerSecond = numericFramesPerSecond === 30
    ? 30
    : numericFramesPerSecond === 24
      ? 24
      : 16;

  const secondsToDisplayFrames = (value) => Math.max(
    0,
    Math.round((Number(value) || 0) * DISPLAY_FRAMES_PER_SECOND),
  );
  const displayFramesToSeconds = (value) => (Number(value) || 0) / DISPLAY_FRAMES_PER_SECOND;
  const actualFramesToDisplayFrames = (value) => Math.max(
    0,
    Math.round(((Number(value) || 0) / sessionFramesPerSecond) * DISPLAY_FRAMES_PER_SECOND),
  );
  const displayFramesToActualFrames = (value) => Math.max(
    0,
    Math.round(((Number(value) || 0) / DISPLAY_FRAMES_PER_SECOND) * sessionFramesPerSecond),
  );


  const { colorMode } = useColorMode();

  const bgColor =
    colorMode === 'light'
      ? 'bg-white/72 text-slate-900 border border-slate-200/90 shadow-sm backdrop-blur-md'
      : 'bg-[#0f1629]/72 text-slate-100 border border-[#1f2a3d]/90 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md';
  const bg2Color =
    colorMode === 'light'
      ? 'bg-white/60 border border-slate-200/90 backdrop-blur-md'
      : 'bg-[#111a2f]/60 border border-[#1f2a3d]/90 backdrop-blur-md';
  let bg3Color =
    colorMode === 'light'
      ? 'bg-slate-50 border border-slate-200'
      : 'bg-[#0f172a] border border-[#1f2a3d]';
  const panelShellSurface =
    colorMode === 'light'
      ? 'bg-white/68 backdrop-blur-md'
      : 'bg-[#0b1224]/68 backdrop-blur-md';
  const panelBodySurface =
    colorMode === 'light'
      ? 'bg-white/62 backdrop-blur-sm'
      : 'bg-[#0b1224]/62 backdrop-blur-sm';
  const bgSelectedColor =
    colorMode === 'light'
      ? 'bg-sky-50 border-sky-400/70'
      : 'bg-[#102033] border-cyan-300/55';
  const textColor = colorMode === 'light' ? 'text-slate-800' : 'text-slate-100';
  const layerRowBaseColor =
    colorMode === 'light'
      ? 'bg-slate-50 border-slate-300/80'
      : 'bg-[#0e1728] border-[#324157]/85';

  const totalDuration = useMemo(() => {
    if (!Array.isArray(layers) || layers.length === 0) {
      return 0;
    }

    return layers.reduce((maximumEndTime, layer) => {
      const layerStart = Math.max(0, Number(layer?.durationOffset) || 0);
      const layerDuration = Math.max(0, Number(layer?.duration) || 0);
      return Math.max(maximumEndTime, layerStart + layerDuration);
    }, 0);
  }, [layers]);
  const [highlightBoundaries, setHighlightBoundaries] = useState({ start: 0, height: 0 });
  const totalDurationInFrames = Math.max(0, secondsToDisplayFrames(totalDuration));
  const disabledMenuClass = isRenderPending ? 'pending-disabled-shell' : '';
  const layerFrameMetadata = useMemo(
    () => buildLayerFrameMetadata(layers, DISPLAY_FRAMES_PER_SECOND),
    [layers, DISPLAY_FRAMES_PER_SECOND]
  );

  const [openPopupLayerIndex, setOpenPopupLayerIndex] = useState(null);
  const [, setClipStart] = useState(false);
  const [, setClipEnd] = useState(false);

  const [clipStartValue, setClipStartValue] = useState(0);
  const [clipEndValue, setClipEndValue] = useState(0);
  const [pendingDuration, setPendingDuration] = useState(null);
  const [durationChanged, setDurationChanged] = useState(false);



  const [showTextTrackAnimations, setShowTextTrackAnimations] = useState(false);
  const [showVerticalWaveform, setShowVerticalWaveform] = useState(false);
  const [isDuplicatingAudioTrack, setIsDuplicatingAudioTrack] = useState(false);

  const [selectedAudioTrackDisplay, setSelectedAudioTrackDisplay] = useState(null);
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState(false);
  const [promptDropdownPosition, setPromptDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 420,
  });
  const [promptCopyState, setPromptCopyState] = useState('idle');

  const [currentLayerActionSuperView, setCurrentLayerActionSuperView] = useState("AUDIO");

  const [showSelectedAudioExtraOptionsToolbar, setShowSelectedAudioExtraOptionsToolbar] = useState(false);
  const [selectedAudioVisualizationMode, setSelectedAudioVisualizationMode] = useState('waveform');
  const [selectedAudioVolumePointId, setSelectedAudioVolumePointId] = useState(null);
  const [audioWaveformVisibilityByTrackId, setAudioWaveformVisibilityByTrackId] = useState({});


  const [newSelectedTextAnimation, setNewSelectedTextAnimation] = useState(null);


  const [selectedTextTrackDisplay, setSelectedTextTrackDisplay] = useState(null);


  const [selectedAnimation, setSelectedAnimation] = useState(null);

  const [pendingLayerUpdates, setPendingLayerUpdates] = useState([]);


  const [renderDropdownOpen, setRenderDropdownOpen] = useState(false);
  const { user } = useUser();

  const selectedLayerData = selectedLayerIndex >= 0 ? layers[selectedLayerIndex] : null;
  const persistedClipStartDisplayFrames = useMemo(
    () => actualFramesToDisplayFrames(
      selectedLayerData?.clipStart ? selectedLayerData?.clipStartFrames : 0
    ),
    [selectedLayerData, sessionFramesPerSecond]
  );
  const persistedClipEndDisplayFrames = useMemo(
    () => actualFramesToDisplayFrames(
      selectedLayerData?.clipEnd ? selectedLayerData?.clipEndFrames : 0
    ),
    [selectedLayerData, sessionFramesPerSecond]
  );
  const savedVisibleLayerDurationInFrames = useMemo(
    () => Math.max(1, secondsToDisplayFrames(selectedLayerData?.duration || 0)),
    [selectedLayerData]
  );
  const currentVisibleLayerDurationInFrames = useMemo(() => {
    const effectiveDuration = durationChanged && pendingDuration != null
      ? pendingDuration
      : selectedLayerData?.duration;
    return Math.max(1, secondsToDisplayFrames(effectiveDuration || 0));
  }, [durationChanged, pendingDuration, selectedLayerData]);
  const trimDisplayRange = useMemo(() => {
    const displayRangeMax = Math.max(1, savedVisibleLayerDurationInFrames);
    const trimmedStartDelta = Math.max(
      0,
      Math.round(clipStartValue) - persistedClipStartDisplayFrames,
    );
    const trimmedEndDelta = Math.max(
      0,
      Math.round(clipEndValue) - persistedClipEndDisplayFrames,
    );
    const displayStart = Math.min(
      trimmedStartDelta,
      Math.max(0, displayRangeMax - 1),
    );
    const unclampedDisplayEnd = displayRangeMax - trimmedEndDelta;
    const displayEnd = Math.max(
      displayStart + 1,
      Math.min(displayRangeMax, unclampedDisplayEnd),
    );

    return {
      displayRangeMax,
      displayStart,
      displayEnd,
    };
  }, [
    clipEndValue,
    clipStartValue,
    persistedClipEndDisplayFrames,
    persistedClipStartDisplayFrames,
    savedVisibleLayerDurationInFrames,
  ]);
  const trimDragBaselineRef = useRef(null);



  // ... other state and code

  const onAnimationSelect = (animation, textItemLayer) => {


    setTextTrackDisplayAsSelected(textItemLayer);

    // This sets the selected animation state when a TextAnimationTrackDisplay is clicked.
    setSelectedAnimation(animation);
  };


  const updateTrackAnimationBoundariesForTextLayer = (animation, start, end) => {
    if (!selectedTextTrackDisplay) return;

    // Clone layers
    const updatedLayers = [...layers];

    // Find the layer associated with the selected text track
    const layerIndex = updatedLayers.findIndex((l) => l._id === selectedTextTrackDisplay.layerId);
    if (layerIndex === -1) return;

    const layer = { ...updatedLayers[layerIndex] };
    const itemList = [...layer.imageSession.activeItemList];

    // Find the text item
    const itemIndex = itemList.findIndex((item) => item.id === selectedTextTrackDisplay.id);
    if (itemIndex === -1) return;

    const updatedItem = { ...itemList[itemIndex] };

    if (updatedItem.animations && updatedItem.animations.length > 0) {
      // Find the animation to update
      const animIndex = updatedItem.animations.findIndex((anim) => anim.id === animation.id);
      if (animIndex > -1) {
        const updatedAnimation = { ...updatedItem.animations[animIndex] };
        updatedAnimation.startFrame = start;
        updatedAnimation.endFrame = end;

        // Replace the animation in the array
        const updatedAnimations = [...updatedItem.animations];
        updatedAnimations[animIndex] = updatedAnimation;
        updatedItem.animations = updatedAnimations;

        // Update item in itemList
        itemList[itemIndex] = updatedItem;
        layer.imageSession.activeItemList = itemList;
        updatedLayers[layerIndex] = layer;

        // Update state
        // Update selectedAnimation to reflect the new boundaries
        if (selectedAnimation && selectedAnimation.id === animation.id) {
          setSelectedAnimation(updatedAnimation);
        }

        // Update selectedTextTrackDisplay with the new animations
        const updatedTextTrackDisplay = {
          ...selectedTextTrackDisplay,
          animations: updatedAnimations,
        };
        setSelectedTextTrackDisplay(updatedTextTrackDisplay);


        setPendingLayerUpdates([layer]);

      }
    }
  };



  const parentRef = useRef(null);
  const portalNodeRef = useRef(null);
  const promptDropdownRef = useRef(null);
  const promptDropdownButtonRef = useRef(null);
  const copyPromptTimeoutRef = useRef(null);




  useEffect(() => {
    if (frameToolbarView !== FRAME_TOOLBAR_VIEW.EXPANDED) {
      setIsGridVisible(false);
    }
  }, [frameToolbarView]);

  useEffect(() => {
    if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
      setCurrentLayerActionSuperView('AUDIO');
    }
  }, [frameToolbarView]);


  useEffect(() => {
    // Create the portal container when the component mounts
    const portalNode = document.createElement('div');
    portalNode.id = 'draggable-portal';
    document.body.appendChild(portalNode);
    portalNodeRef.current = portalNode;

    return () => {
      // Clean up the portal container when the component unmounts
      document.body.removeChild(portalNode);
    };
  }, []);

  const updateHighlightBoundary = (selectedLayerId) => {

    const selectedLayerElement = layerRefs.current[selectedLayerId];

    if (selectedLayerElement) {
      const parentElement = parentRef.current;
      const parentRect = parentElement.getBoundingClientRect();
      const selectedRect = selectedLayerElement.getBoundingClientRect();
      const safeParentHeight = Math.max(0, parentRect.height || 0);
      const startPixels = Math.floor(
        clamp(selectedRect.top - parentRect.top, 0, safeParentHeight)
      );
      const endPixels = Math.ceil(
        clamp(selectedRect.bottom - parentRect.top, startPixels, safeParentHeight)
      );
      const heightPixels = Math.max(0, endPixels - startPixels);

      setHighlightBoundaries({ start: startPixels, height: heightPixels });
    }
  };

  const [audioTrackListDisplay, setAudioTrackListDisplay] = useState([]);
  const pendingSelectedAudioLayerIdRef = useRef(null);
  const [visualTrackListDisplay, setVisualTrackListDisplay] = useState([]);
  const [videoTrackListDisplay, setVideoTrackListDisplay] = useState([]);
  const [layerViewportHeight, setLayerViewportHeight] = useState(0);
  const [videoEditDraftOperationsByLayer, setVideoEditDraftOperationsByLayer] = useState({});
  const [videoEditRangeByLayer, setVideoEditRangeByLayer] = useState({});
  const [videoActiveToolByLayer, setVideoActiveToolByLayer] = useState({});
  const previousVideoEditStateByLayerRef = useRef({});

  useEffect(() => {
    setAudioTrackListDisplay((previousAudioTracks) => {
      const selectedTrackId = pendingSelectedAudioLayerIdRef.current
        || previousAudioTracks.find((audioTrack) => audioTrack.isDisplaySelected || audioTrack.isSelected)?._id?.toString?.()
        || null;

      const visibleAudioDisplay = Array.isArray(audioLayers)
        ? audioLayers.map((audioTrack) => {
          const audioTrackId = audioTrack?._id?.toString?.() || audioTrack?._id || null;
          return {
            ...audioTrack,
            isDisplaySelected: Boolean(
              selectedTrackId
              && audioTrackId
              && audioTrackId.toString() === selectedTrackId.toString()
            ),
            isDirty: false,
          };
        })
        : [];

      if (selectedTrackId && visibleAudioDisplay.some((audioTrack) => audioTrack.isDisplaySelected)) {
        pendingSelectedAudioLayerIdRef.current = null;
      }

      return visibleAudioDisplay;
    });
  }, [audioLayers]);

  useEffect(() => {
    setAudioWaveformVisibilityByTrackId((previousValue) => {
      const nextValue = {};
      let hasChanges = false;

      audioTrackListDisplay.forEach((audioTrack) => {
        const trackId = resolveAudioTrackId(audioTrack);
        if (!trackId) {
          return;
        }

        const isVisible = previousValue[trackId] ?? true;
        nextValue[trackId] = isVisible;

        if (!(trackId in previousValue)) {
          hasChanges = true;
        }
      });

      if (!hasChanges && Object.keys(previousValue).length === Object.keys(nextValue).length) {
        return previousValue;
      }

      return nextValue;
    });
  }, [audioTrackListDisplay]);

  useEffect(() => {
    const nextVisualTracks = buildVisualTrackDisplayList(
      layers,
      DISPLAY_FRAMES_PER_SECOND,
    );

    setVisualTrackListDisplay((prevVisualTracks) => {
      const previousTrackMap = new Map(
        prevVisualTracks.map((track) => [track.trackKey, track])
      );

      return nextVisualTracks.map((track) => {
        const previousTrack = previousTrackMap.get(track.trackKey);
        const shouldPreservePendingTiming = previousTrack?.isDirty || previousTrack?.isSaving;
        const mergedTrack = shouldPreservePendingTiming
          ? {
            ...track,
            startFrame: previousTrack.startFrame,
            endFrame: previousTrack.endFrame,
            startTime: previousTrack.startTime,
            endTime: previousTrack.endTime,
            duration: previousTrack.duration,
          }
          : track;
        const persistedStartFrame = shouldPreservePendingTiming
          ? (previousTrack?.persistedStartFrame ?? track.startFrame)
          : track.startFrame;
        const persistedEndFrame = shouldPreservePendingTiming
          ? (previousTrack?.persistedEndFrame ?? track.endFrame)
          : track.endFrame;

        return {
          ...mergedTrack,
          persistedStartFrame,
          persistedEndFrame,
          isDisplaySelected: previousTrack?.isDisplaySelected ?? false,
          isDirty: previousTrack?.isDirty ?? false,
          isSaving: previousTrack?.isSaving ?? false,
          saveError: previousTrack?.saveError ?? null,
        };
      });
    });
  }, [layers, DISPLAY_FRAMES_PER_SECOND]);

  useEffect(() => {
    const nextVideoTracks = buildVideoTrackDisplayList(
      layers,
      DISPLAY_FRAMES_PER_SECOND,
    );

    setVideoTrackListDisplay((previousVideoTracks) => {
      const previousTrackMap = new Map(
        previousVideoTracks.map((track) => [track.layerId, track])
      );

      return nextVideoTracks.map((track) => ({
        ...track,
        isDisplaySelected: previousTrackMap.get(track.layerId)?.isDisplaySelected ?? false,
      }));
    });
  }, [layers, DISPLAY_FRAMES_PER_SECOND]);

  useEffect(() => {
    const validLayerIds = new Set(videoTrackListDisplay.map((track) => track.layerId));

    setVideoEditDraftOperationsByLayer((previousValue) => {
      const nextValue = {};
      Object.entries(previousValue || {}).forEach(([layerId, operations]) => {
        if (validLayerIds.has(layerId)) {
          nextValue[layerId] = operations;
        }
      });
      return nextValue;
    });

    setVideoEditRangeByLayer((previousValue) => {
      const nextValue = {};
      Object.entries(previousValue || {}).forEach(([layerId, range]) => {
        if (validLayerIds.has(layerId)) {
          nextValue[layerId] = range;
        }
      });
      return nextValue;
    });

    setVideoActiveToolByLayer((previousValue) => {
      const nextValue = {};
      Object.entries(previousValue || {}).forEach(([layerId, toolConfig]) => {
        if (validLayerIds.has(layerId)) {
          nextValue[layerId] = toolConfig;
        }
      });
      return nextValue;
    });
  }, [videoTrackListDisplay]);

  useEffect(() => {
    const completedLayerIds = videoTrackListDisplay
      .filter((track) => {
        const previousTrackState = previousVideoEditStateByLayerRef.current[track.layerId];
        return Boolean(
          previousTrackState?.videoEditPending
          && !track.videoEditPending
          && track.videoEditStatus !== 'FAILED'
        );
      })
      .map((track) => track.layerId);

    if (completedLayerIds.length > 0) {
      setVideoActiveToolByLayer((previousValue) => {
        let hasChanges = false;
        const nextValue = { ...previousValue };

        completedLayerIds.forEach((layerId) => {
          if (nextValue[layerId]) {
            delete nextValue[layerId];
            hasChanges = true;
          }
        });

        return hasChanges ? nextValue : previousValue;
      });

      setVideoEditRangeByLayer((previousValue) => {
        let hasChanges = false;
        const nextValue = { ...previousValue };

        completedLayerIds.forEach((layerId) => {
          if (nextValue[layerId]) {
            delete nextValue[layerId];
            hasChanges = true;
          }
        });

        return hasChanges ? nextValue : previousValue;
      });
    }

    previousVideoEditStateByLayerRef.current = videoTrackListDisplay.reduce((accumulator, track) => {
      accumulator[track.layerId] = {
        videoEditPending: Boolean(track.videoEditPending),
        videoEditStatus: track.videoEditStatus || 'INIT',
      };
      return accumulator;
    }, {});
  }, [videoTrackListDisplay]);


  const dirtyCount = useMemo(
    () => audioTrackListDisplay.filter((track) => track.isDirty).length,
    [audioTrackListDisplay]
  );
  const selectedAudioTrack = useMemo(
    () =>
      audioTrackListDisplay.find(
        (audioTrack) => audioTrack.isDisplaySelected || audioTrack.isSelected
      ),
    [audioTrackListDisplay]
  );
  const selectedAudioTrackId = useMemo(
    () => resolveAudioTrackId(selectedAudioTrack),
    [selectedAudioTrack]
  );
  const selectedAudioTrackPrompt = useMemo(
    () => getAudioTrackPromptText(selectedAudioTrack),
    [selectedAudioTrack]
  );
  const selectedAudioTrackDisplayTitle = useMemo(
    () => getAudioTrackDisplayTitle(selectedAudioTrack),
    [selectedAudioTrack]
  );
  const selectedAudioTrackTypeLabel = useMemo(
    () => formatAudioTrackTypeLabel(selectedAudioTrack?.generationType),
    [selectedAudioTrack]
  );
  const shouldShowSelectedAudioTrackTypeLabel = useMemo(() => {
    const normalizedDisplayTitle = sanitizeAudioTrackText(selectedAudioTrackDisplayTitle).toLowerCase();
    const normalizedTypeLabel = sanitizeAudioTrackText(selectedAudioTrackTypeLabel).toLowerCase();

    return Boolean(normalizedTypeLabel && normalizedTypeLabel !== normalizedDisplayTitle);
  }, [selectedAudioTrackDisplayTitle, selectedAudioTrackTypeLabel]);
  const selectedAudioTrackMetadata = useMemo(() => {
    if (!selectedAudioTrack) {
      return [];
    }

    const metadataItems = [];
    const speakerName = sanitizeAudioTrackText(selectedAudioTrack?.speakerCharacterName)
      || sanitizeAudioTrackText(selectedAudioTrack?.speaker);
    const ttsProvider = sanitizeAudioTrackText(selectedAudioTrack?.ttsProvider);

    if (speakerName) {
      metadataItems.push({ label: 'Voice', value: speakerName });
    }

    if (ttsProvider) {
      metadataItems.push({ label: 'Provider', value: ttsProvider });
    }

    return metadataItems;
  }, [selectedAudioTrack]);
  const audioTrackById = useMemo(
    () => audioTrackListDisplay.reduce((trackMap, audioTrack) => {
      const trackId = resolveAudioTrackId(audioTrack);
      if (trackId) {
        trackMap.set(trackId.toString(), audioTrack);
      }
      return trackMap;
    }, new Map()),
    [audioTrackListDisplay]
  );
  const selectedVisualTrack = useMemo(
    () =>
      visualTrackListDisplay.find(
        (visualTrack) => visualTrack.isDisplaySelected
      ),
    [visualTrackListDisplay]
  );
  const selectedVideoTrack = useMemo(
    () =>
      videoTrackListDisplay.find(
        (videoTrack) => videoTrack.isDisplaySelected
      ),
    [videoTrackListDisplay]
  );
  const canDuplicateSelectedAudioTrack = useMemo(() => {
    if (!selectedAudioTrack || typeof duplicateAudioLayer !== 'function') {
      return false;
    }

    if (typeof selectedAudioTrack.selectedLocalAudioLink === 'string' && selectedAudioTrack.selectedLocalAudioLink.trim()) {
      return true;
    }

    if (typeof selectedAudioTrack.selectedRemoteAudioLink === 'string' && selectedAudioTrack.selectedRemoteAudioLink.trim()) {
      return true;
    }

    if (Array.isArray(selectedAudioTrack.localAudioLinks) && selectedAudioTrack.localAudioLinks.some((link) => typeof link === 'string' && link.trim())) {
      return true;
    }

    if (Array.isArray(selectedAudioTrack.remoteAudioLinks) && selectedAudioTrack.remoteAudioLinks.some((link) => typeof link === 'string' && link.trim())) {
      return true;
    }

    return Array.isArray(selectedAudioTrack.remoteAudioData) && selectedAudioTrack.remoteAudioData.some((audioData) => (
      typeof audioData?.audio_url === 'string' && audioData.audio_url.trim()
    ));
  }, [duplicateAudioLayer, selectedAudioTrack]);
  const selectedAudioVolumePoints = useMemo(
    () => (selectedAudioTrack
      ? buildAudioLayerVolumeAutomationPoints(selectedAudioTrack)
      : []),
    [selectedAudioTrack]
  );
  const selectedAudioVolumePoint = useMemo(() => {
    if (!selectedAudioVolumePoints.length) {
      return null;
    }

    return selectedAudioVolumePoints.find((point) => point.id === selectedAudioVolumePointId)
      || selectedAudioVolumePoints[0];
  }, [selectedAudioVolumePointId, selectedAudioVolumePoints]);

  useEffect(() => {
    if (!selectedAudioTrack) {
      setSelectedAudioVolumePointId(null);
      return;
    }

    if (!selectedAudioTrack.manualVolumeAdjustmentEnabled) {
      setSelectedAudioVolumePointId(null);
      return;
    }

    if (
      !selectedAudioVolumePointId
      || !selectedAudioVolumePoint
      || !selectedAudioVolumePoints.some((point) => point.id === selectedAudioVolumePoint.id)
    ) {
      setSelectedAudioVolumePointId(selectedAudioVolumePoints[0]?.id || null);
    }
  }, [selectedAudioTrack, selectedAudioVolumePoint, selectedAudioVolumePointId, selectedAudioVolumePoints]);

  const getDefaultVideoEditRangeForTrack = (track, anchorFrame = null) => {
    const maximumPreviewRange = Math.max(
      1,
      Math.round(DISPLAY_FRAMES_PER_SECOND * 1.5)
    );
    const trackDurationFrames = Math.max(1, track?.durationFrames || 1);
    const trackStartFrame = Math.max(0, Math.round(Number(track?.startFrame) || 0));
    const hasAnchorFrame = Number.isFinite(anchorFrame);
    const anchoredStartFrame = hasAnchorFrame
      ? Math.min(
        Math.max(Math.round(Number(anchorFrame) || 0) - trackStartFrame, 0),
        Math.max(0, trackDurationFrames - 1),
      )
      : 0;

    return [
      anchoredStartFrame,
      Math.min(
        trackDurationFrames,
        anchoredStartFrame + maximumPreviewRange,
      ),
    ];
  };
  const ensureVideoEditRangeForTrack = (track, anchorFrame = currentLayerSeek) => {
    if (!track?.layerId) {
      return;
    }

    setVideoEditRangeByLayer((previousValue) => {
      if (previousValue[track.layerId]) {
        return previousValue;
      }

      return {
        ...previousValue,
        [track.layerId]: clampVideoEditRange(
          getDefaultVideoEditRangeForTrack(track, anchorFrame),
          track?.durationFrames,
        ),
      };
    });
  };
  const selectedVideoRangeFrames = useMemo(() => {
    if (!selectedVideoTrack) {
      return [0, 1];
    }

    const savedRange = videoEditRangeByLayer[selectedVideoTrack.layerId];
    return clampVideoEditRange(
      savedRange || getDefaultVideoEditRangeForTrack(selectedVideoTrack, currentLayerSeek),
      selectedVideoTrack.durationFrames,
    );
  }, [currentLayerSeek, selectedVideoTrack, videoEditRangeByLayer]);
  const selectedVideoDraftOperations = useMemo(() => {
    if (!selectedVideoTrack) {
      return [];
    }
    return Array.isArray(videoEditDraftOperationsByLayer[selectedVideoTrack.layerId])
      ? videoEditDraftOperationsByLayer[selectedVideoTrack.layerId]
      : [];
  }, [selectedVideoTrack, videoEditDraftOperationsByLayer]);
  const selectedVideoPendingOperations = useMemo(() => (
    Array.isArray(selectedVideoTrack?.pendingOperations)
      ? selectedVideoTrack.pendingOperations
      : []
  ), [selectedVideoTrack]);
  const videoDraftDisplayByLayer = useMemo(() => {
    const nextDraftMap = {};

    videoTrackListDisplay.forEach((track) => {
      const draftOperations = Array.isArray(videoEditDraftOperationsByLayer[track.layerId])
        ? videoEditDraftOperationsByLayer[track.layerId]
        : [];

      nextDraftMap[track.layerId] = buildVideoOperationDisplayList(
        draftOperations,
        track.startFrame,
        DISPLAY_FRAMES_PER_SECOND,
        'draft'
      );
    });

    return nextDraftMap;
  }, [DISPLAY_FRAMES_PER_SECOND, videoEditDraftOperationsByLayer, videoTrackListDisplay]);
  const selectedVideoActiveTool = useMemo(() => {
    if (!selectedVideoTrack) {
      return null;
    }

    return videoActiveToolByLayer[selectedVideoTrack.layerId] || null;
  }, [selectedVideoTrack, videoActiveToolByLayer]);

  const resetPromptCopyState = () => {
    if (copyPromptTimeoutRef.current) {
      clearTimeout(copyPromptTimeoutRef.current);
      copyPromptTimeoutRef.current = null;
    }
    setPromptCopyState('idle');
  };

  const closePromptDropdown = () => {
    setIsPromptDropdownOpen(false);
    resetPromptCopyState();
  };

  const togglePromptDropdown = (event) => {
    event.stopPropagation();

    if (isPromptDropdownOpen) {
      closePromptDropdown();
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const dropdownWidth = Math.max(
      280,
      Math.min(520, window.innerWidth - viewportPadding * 2)
    );
    const estimatedDropdownHeight = 280;
    const shouldOpenAbove =
      buttonRect.bottom + estimatedDropdownHeight > window.innerHeight - viewportPadding;
    const topPosition = shouldOpenAbove
      ? Math.max(viewportPadding, buttonRect.top - estimatedDropdownHeight - 8)
      : Math.min(
        window.innerHeight - estimatedDropdownHeight - viewportPadding,
        buttonRect.bottom + 8
      );
    const leftPosition = Math.min(
      Math.max(viewportPadding, buttonRect.left),
      Math.max(viewportPadding, window.innerWidth - dropdownWidth - viewportPadding)
    );

    setPromptDropdownPosition({
      top: topPosition,
      left: leftPosition,
      width: dropdownWidth,
    });
    setIsPromptDropdownOpen(true);
    resetPromptCopyState();
  };

  const copyPromptToClipboard = async () => {
    if (!selectedAudioTrackPrompt) {
      return;
    }

    let copied = false;

    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedAudioTrackPrompt);
        copied = true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = selectedAudioTrackPrompt;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          copied = document.execCommand('copy');
        } catch (error) {
          copied = false;
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      copied = false;
    }

    resetPromptCopyState();
    setPromptCopyState(copied ? 'copied' : 'failed');
    copyPromptTimeoutRef.current = setTimeout(() => {
      setPromptCopyState('idle');
    }, 1600);
  };

  useEffect(() => {
    if (!isPromptDropdownOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event) => {
      if (promptDropdownRef.current?.contains(event.target)) {
        return;
      }
      if (promptDropdownButtonRef.current?.contains(event.target)) {
        return;
      }
      closePromptDropdown();
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePromptDropdown();
      }
    };

    const closeOnViewportChange = () => closePromptDropdown();

    document.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [isPromptDropdownOpen]);

  useEffect(() => {
    if ((!selectedAudioTrack || !selectedAudioTrackPrompt) && isPromptDropdownOpen) {
      closePromptDropdown();
    }
  }, [selectedAudioTrack, selectedAudioTrackPrompt, isPromptDropdownOpen]);

  useEffect(() => {
    if (frameToolbarView !== FRAME_TOOLBAR_VIEW.EXPANDED) {
      closePromptDropdown();
    }
  }, [frameToolbarView]);

  useEffect(() => {
    if (currentLayerActionSuperView !== 'AUDIO' && isPromptDropdownOpen) {
      closePromptDropdown();
    }
  }, [currentLayerActionSuperView, isPromptDropdownOpen]);

  useEffect(() => {
    return () => {
      if (copyPromptTimeoutRef.current) {
        clearTimeout(copyPromptTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (durationChanged) {
      return;
    }

    if (!selectedLayerData) {
      setClipStart(false);
      setClipEnd(false);
      setClipStartValue(0);
      setClipEndValue(0);
      return;
    }

    setClipStart(persistedClipStartDisplayFrames > 0);
    setClipEnd(persistedClipEndDisplayFrames > 0);
    setClipStartValue(persistedClipStartDisplayFrames);
    setClipEndValue(persistedClipEndDisplayFrames);
  }, [
    durationChanged,
    persistedClipEndDisplayFrames,
    persistedClipStartDisplayFrames,
    selectedLayerData,
  ]);

  useEffect(() => {
    if (!openPopupLayerIdRef.current) {
      return;
    }

    const resolvedLayerIndex = layers.findIndex(
      (layer) => layer?._id?.toString?.() === openPopupLayerIdRef.current
    );

    if (resolvedLayerIndex === -1) {
      openPopupLayerIdRef.current = null;
      if (openPopupLayerIndex !== null) {
        setOpenPopupLayerIndex(null);
      }
      return;
    }

    if (openPopupLayerIndex !== resolvedLayerIndex) {
      setOpenPopupLayerIndex(resolvedLayerIndex);
    }
  }, [layers, openPopupLayerIndex]);

  // State to manage visible layers
  const [visibleLayersStartIndex, setVisibleLayersStartIndex] = useState(0);

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();


  const [selectedFrameRange, setSelectedFrameRange] = useState([0, totalDurationInFrames]);
  const [gridSnapPoints, setGridSnapPoints] = useState([]);

  const [isDragging, setIsDragging] = useState(false);


  // State for grid visibility
  const [isGridVisible, setIsGridVisible] = useState(false);
  const openPopupLayerIdRef = useRef(null);

  const restoreSelectedLayerChrome = (preferredLayerId = null) => {
    const fallbackLayerId =
      preferredLayerId
      || openPopupLayerIdRef.current
      || layers[selectedLayerIndex]?._id?.toString?.()
      || null;

    if (!fallbackLayerId) {
      return;
    }

    requestAnimationFrame(() => {
      updateHighlightBoundary(fallbackLayerId);
    });
  };

  const onDragEnd = (result) => {
    setIsDragging(false);
    if (isRenderPending) {
      restoreSelectedLayerChrome();
      return;
    }

    if (!result.destination) {
      restoreSelectedLayerChrome();
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Map visibleLayers indices to layers indices using unique IDs.
    const movedLayer = visibleLayers[sourceIndex];
    const destinationLayer = visibleLayers[destinationIndex];

    if (!movedLayer || !destinationLayer) {
      restoreSelectedLayerChrome();
      return;
    }

    const movedLayerIndexInLayers = layers.findIndex(
      (layer) => layer._id === movedLayer._id
    );
    const destinationLayerIndexInLayers = layers.findIndex(
      (layer) => layer._id === destinationLayer._id
    );

    if (movedLayerIndexInLayers === destinationLayerIndexInLayers) {
      restoreSelectedLayerChrome(movedLayer?._id?.toString?.() || null);
      return;
    }

    // Create a new layers array.
    const newLayersOrder = Array.from(layers);

    // Remove the item from its original position.
    const [removed] = newLayersOrder.splice(movedLayerIndexInLayers, 1);

    // Insert the item at the new position.
    newLayersOrder.splice(destinationLayerIndexInLayers, 0, removed);

    const movedLayerId = movedLayer?._id?.toString?.() || null;
    const selectedLayerId = layers[selectedLayerIndex]?._id?.toString?.() || null;
    const shouldKeepPopupOnMovedLayer = openPopupLayerIdRef.current === movedLayerId;

    if (movedLayerId && (shouldKeepPopupOnMovedLayer || selectedLayerId === movedLayerId)) {
      setSelectedLayerIndex(destinationLayerIndexInLayers);
      setSelectedLayer(removed);
      setOpenPopupLayerIndex(destinationLayerIndexInLayers);
      openPopupLayerIdRef.current = movedLayerId;
    }

    // If there's a callback prop for layers order change, call it.
    if (props.onLayersOrderChange) {
      props.onLayersOrderChange(newLayersOrder, movedLayer._id);
    }

    restoreSelectedLayerChrome(
      movedLayerId && (shouldKeepPopupOnMovedLayer || selectedLayerId === movedLayerId)
        ? movedLayerId
        : selectedLayerId
    );
  };



  const allVisibleLayerMetadata = useMemo(() => {
    const [startFrame, endFrame] = selectedFrameRange;

    return layerFrameMetadata.filter((layerMeta) => (
      layerMeta.endFrame > startFrame && layerMeta.startFrame < endFrame
    ));
  }, [layerFrameMetadata, selectedFrameRange]);

  useEffect(() => {
    setVisibleLayersStartIndex((previousIndex) => {
      const maxStartIndex = Math.max(0, allVisibleLayerMetadata.length - MAX_VISIBLE_LAYERS);
      return Math.min(previousIndex, maxStartIndex);
    });
  }, [allVisibleLayerMetadata.length]);

  const displayedVisibleLayerMetadata = useMemo(() => (
    allVisibleLayerMetadata.slice(
      visibleLayersStartIndex,
      visibleLayersStartIndex + MAX_VISIBLE_LAYERS,
    )
  ), [allVisibleLayerMetadata, visibleLayersStartIndex]);
  const visibleLayers = useMemo(
    () => displayedVisibleLayerMetadata.map((layerMeta) => layerMeta.layer),
    [displayedVisibleLayerMetadata],
  );
  const visibleLayerDurationFramesById = useMemo(() => {
    const [visibleStartFrame, visibleEndFrame] = selectedFrameRange;

    return displayedVisibleLayerMetadata.reduce((accumulator, layerMeta) => {
      const layerId = layerMeta.layer?._id?.toString?.() || layerMeta.layer?._id || `${layerMeta.originalIndex}`;
      accumulator[layerId] = Math.max(
        1,
        Math.min(layerMeta.endFrame, visibleEndFrame) - Math.max(layerMeta.startFrame, visibleStartFrame),
      );
      return accumulator;
    }, {});
  }, [displayedVisibleLayerMetadata, selectedFrameRange]);
  const resolvedLayerViewportHeight = layerViewportHeight > 0
    ? layerViewportHeight
    : (parentRef.current?.clientHeight || 500);
  const visibleLayerPixelLayout = useMemo(() => (
    buildLayerPixelLayout(
      visibleLayers,
      visibleLayerDurationFramesById,
      resolvedLayerViewportHeight,
      DISPLAY_FRAMES_PER_SECOND,
    )
  ), [
    DISPLAY_FRAMES_PER_SECOND,
    resolvedLayerViewportHeight,
    visibleLayerDurationFramesById,
    visibleLayers,
  ]);
  const displayedLayerViewportGeometry = useMemo(() => {
    let nextPixelStart = 0;
    const segments = displayedVisibleLayerMetadata.map((layerMeta, index) => {
      const layerId = layerMeta.layer?._id?.toString?.() || layerMeta.layer?._id || `${layerMeta.originalIndex}`;
      const frameStart = Math.max(selectedFrameRange[0], layerMeta.startFrame);
      const frameEnd = Math.max(
        frameStart + 1,
        Math.min(selectedFrameRange[1], layerMeta.endFrame),
      );
      const pixelHeight = Math.max(0, visibleLayerPixelLayout.layerHeightsInPixels[index] ?? 0);
      const segment = {
        layerId: layerId.toString(),
        frameStart,
        frameEnd,
        pixelStart: nextPixelStart,
        pixelEnd: nextPixelStart + pixelHeight,
        pixelHeight,
      };

      nextPixelStart += pixelHeight;
      return segment;
    });

    return {
      segments,
      totalPixels: nextPixelStart,
      frameStart: segments[0]?.frameStart ?? selectedFrameRange[0],
      frameEnd: segments[segments.length - 1]?.frameEnd ?? selectedFrameRange[1],
    };
  }, [displayedVisibleLayerMetadata, selectedFrameRange, visibleLayerPixelLayout.layerHeightsInPixels]);
  const displayedFrameRange = useMemo(
    () => getViewportGeometryFrameRange(displayedLayerViewportGeometry),
    [displayedLayerViewportGeometry],
  );
  const displayedVisibleLayerIdSet = useMemo(() => new Set(
    displayedVisibleLayerMetadata.map((layerMeta) => (
      layerMeta.layer?._id?.toString?.() || layerMeta.layer?._id || null
    )).filter(Boolean)
  ), [displayedVisibleLayerMetadata]);
  const visibleLayerLayoutById = useMemo(() => (
    displayedLayerViewportGeometry.segments.reduce((accumulator, segment) => {
      accumulator[segment.layerId] = {
        top: segment.pixelStart,
        height: segment.pixelHeight,
        bottom: segment.pixelEnd,
      };
      return accumulator;
    }, {})
  ), [displayedLayerViewportGeometry]);


  // Animation States
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(null); // 'prev' or 'next'
  const [incomingVisibleLayers, setIncomingVisibleLayers] = useState([]);

  const layerRefs = useRef({}); // Add this line to store refs to layer items
  const [popupPosition, setPopupPosition] = useState({
    top: '50%',
    left: '100px',
    transform: 'translateY(-50%)',
  });

  const [isExpandedTrackView, setIsExpandedTrackView] = useState(false);


  // Refs for layers
  const currentLayersRef = useRef(null);
  const incomingLayersRef = useRef(null);

  // Popup ref
  const popupRef = useRef(null);

  const computeScenePopupPosition = useCallback((layerRect, popupHeight) => {
    if (!layerRect) {
      return null;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const safePopupHeight = Math.max(70, Number(popupHeight) || 0);
    const maxLeft = Math.max(
      SCENE_POPUP_GAP,
      viewportWidth - SCENE_POPUP_WIDTH - SCENE_POPUP_GAP,
    );
    const maxTop = Math.max(
      SCENE_POPUP_GAP,
      viewportHeight - safePopupHeight - SCENE_POPUP_GAP,
    );

    return {
      top: `${clamp(layerRect.top, SCENE_POPUP_GAP, maxTop)}px`,
      left: `${clamp(layerRect.right + SCENE_POPUP_GAP, SCENE_POPUP_GAP, maxLeft)}px`,
      transform: 'translateY(0)',
    };
  }, []);

  const updateScenePopupPosition = useCallback((layerId, layerRect = null) => {
    if (!layerId) {
      return;
    }

    const resolvedLayerRect = layerRect || layerRefs.current[layerId]?.getBoundingClientRect?.();
    const nextPopupPosition = computeScenePopupPosition(
      resolvedLayerRect,
      durationChanged ? 110 : 70,
    );

    if (nextPopupPosition) {
      setPopupPosition(nextPopupPosition);
    }
  }, [computeScenePopupPosition, durationChanged]);

  // Compute whether we can navigate further
  const canGoPrev = visibleLayersStartIndex > 0;
  const canGoNext = visibleLayersStartIndex + MAX_VISIBLE_LAYERS < allVisibleLayerMetadata.length;

  // Handle Previous Click
  const handlePrevClick = () => {
    if (!canGoPrev || isAnimating) return;

    const numLayersToMove = Math.min(3, visibleLayersStartIndex);
    const newStartIndex = visibleLayersStartIndex - numLayersToMove;
    const newVisibleLayers = allVisibleLayerMetadata
      .slice(newStartIndex, newStartIndex + MAX_VISIBLE_LAYERS)
      .map((layerMeta) => layerMeta.layer);

    setIncomingVisibleLayers(newVisibleLayers);
    setAnimationDirection('prev');
    setIsAnimating(true);
  };

  // Handle Next Click
  const handleNextClick = () => {
    if (!canGoNext || isAnimating) return;

    const numLayersToMove = Math.min(
      3,
      allVisibleLayerMetadata.length - (visibleLayersStartIndex + MAX_VISIBLE_LAYERS)
    );
    const newStartIndex = visibleLayersStartIndex + numLayersToMove;
    const newVisibleLayers = allVisibleLayerMetadata
      .slice(newStartIndex, newStartIndex + MAX_VISIBLE_LAYERS)
      .map((layerMeta) => layerMeta.layer);

    setIncomingVisibleLayers(newVisibleLayers);
    setAnimationDirection('next');
    setIsAnimating(true);
  };



  // Replace useEffect with useLayoutEffect
  useLayoutEffect(() => {


    if (layers && layers[selectedLayerIndex]) {
      const selectedLayerId = layers[selectedLayerIndex]._id.toString();

      if (layerRefs.current[selectedLayerId]) {
        updateHighlightBoundary(selectedLayerId);
      }
    }
  }, [selectedLayerIndex, selectedFrameRange,
    frameToolbarView,
    layers,

  ]);


  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    setLayerViewportHeight(parent.clientHeight || 0);

    const observer = new ResizeObserver(() => {
      setLayerViewportHeight(parent.clientHeight || 0);

      if (layers && layers[selectedLayerIndex]) {
        const selectedLayerId = layers[selectedLayerIndex]._id.toString();


        setTimeout(() => {
          updateHighlightBoundary(selectedLayerId);
        }, [200]);

      }
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [parentRef, layers, selectedLayerIndex]);


  useEffect(() => {
    setHighlightBoundaries(null);
  }, [isExpandedTrackView, layers, totalDurationInFrames]);

  useEffect(() => {
    setGridSnapPoints([]);
  }, [sessionId]);



  // Effect to handle the animation transition
  useEffect(() => {
    if (isAnimating && incomingVisibleLayers.length > 0) {
      const height = parentRef.current.clientHeight;

      // Start positions
      const currentStartY = 0;
      const incomingStartY = animationDirection === 'next' ? height : -height;

      // End positions
      const currentEndY = animationDirection === 'next' ? -height : height;
      const incomingEndY = 0;

      // Apply initial positions
      currentLayersRef.current.style.transform = `translateY(${currentStartY}px)`;
      incomingLayersRef.current.style.transform = `translateY(${incomingStartY}px)`;

      // Trigger reflow to ensure the browser picks up the starting positions
      void currentLayersRef.current.offsetWidth;

      // Apply transition
      currentLayersRef.current.style.transition = 'transform 0.5s ease-in-out';
      incomingLayersRef.current.style.transition = 'transform 0.5s ease-in-out';

      // Apply end positions
      currentLayersRef.current.style.transform = `translateY(${currentEndY}px)`;
      incomingLayersRef.current.style.transform = `translateY(${incomingEndY}px)`;

      const timer = setTimeout(() => {
        // After animation duration, update the visible layers
        const nextVisibleLayersStartIndex = Math.max(
          0,
          animationDirection === 'next'
            ? Math.min(
              visibleLayersStartIndex + 3,
              Math.max(0, allVisibleLayerMetadata.length - MAX_VISIBLE_LAYERS)
            )
            : Math.max(0, visibleLayersStartIndex - 3)
        );
        const nextVisibleLayerWindow = allVisibleLayerMetadata.slice(
          nextVisibleLayersStartIndex,
          nextVisibleLayersStartIndex + MAX_VISIBLE_LAYERS
        );

        setVisibleLayersStartIndex(nextVisibleLayersStartIndex);
        setIsAnimating(false);
        setAnimationDirection(null);
        setIncomingVisibleLayers([]);

        // Reset styles
        currentLayersRef.current.style.transform = '';
        currentLayersRef.current.style.transition = '';
        incomingLayersRef.current.style.transform = '';
        incomingLayersRef.current.style.transition = '';

        // Reset currentLayerSeek and selectedLayerIndex if out of range
        const isSelectionStillVisible = nextVisibleLayerWindow.some(
          (layerMeta) => layerMeta.originalIndex === selectedLayerIndex
        );
        const nextSelectedLayerMeta = nextVisibleLayerWindow[0] || null;

        if (!isSelectionStillVisible && nextSelectedLayerMeta) {
          setSelectedLayerIndex(nextSelectedLayerMeta.originalIndex);
          setSelectedLayer(nextSelectedLayerMeta.layer);
        }

        // Adjust currentLayerSeek to the start of the new visible range
        if (!isLayerSeeking && nextSelectedLayerMeta) {
          setCurrentLayerSeek(nextSelectedLayerMeta.startFrame);
        }
      }, 500); // Duration should match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [
    isAnimating,
    incomingVisibleLayers,
    animationDirection,
    allVisibleLayerMetadata,
    visibleLayersStartIndex,
    selectedLayerIndex,
    setSelectedLayerIndex,
    setSelectedLayer,
    setCurrentLayerSeek,
    isLayerSeeking,
  ]);

  useEffect(() => {
    const [startFrame, endFrame] = selectedFrameRange;

    // Adjust currentLayerSeek if it moves out of the new visible range
    if (!isLayerSeeking && (currentLayerSeek < startFrame || currentLayerSeek > endFrame)) {
      setCurrentLayerSeek(startFrame);
    }

  }, [selectedFrameRange, currentLayerSeek, isLayerSeeking, setCurrentLayerSeek]);




  useEffect(() => {
    const [startFrame, endFrame] = selectedFrameRange;
    let newEndFrame = endFrame;

    if (endFrame <= 0 && totalDurationInFrames > 0) {
      newEndFrame = totalDurationInFrames;
    } else {
      newEndFrame = Math.min(endFrame, totalDurationInFrames);
    }

    // Optionally, ensure startFrame does not exceed newEndFrame
    let newStartFrame = startFrame;
    if (newStartFrame >= newEndFrame) {
      newStartFrame = Math.max(0, newEndFrame - 1);
    }

    if (newStartFrame !== startFrame || newEndFrame !== endFrame) {
      setSelectedFrameRange([newStartFrame, newEndFrame]);
    }
  }, [totalDurationInFrames, layers]);



  const toggleShowExpandedTrackView = () => {



    setIsExpandedTrackView(!isExpandedTrackView);
    showAudioTrackView();
  }

  const normalizeViewRangeSelection = (rangeValues) => {
    const safeMaximumFrame = Math.max(1, totalDurationInFrames);
    const rawStartFrame = Array.isArray(rangeValues) ? Math.round(Number(rangeValues[0]) || 0) : 0;
    const rawEndFrame = Array.isArray(rangeValues)
      ? Math.round(Number(rangeValues[1]) || safeMaximumFrame)
      : safeMaximumFrame;
    const nextStartFrame = Math.min(Math.max(rawStartFrame, 0), Math.max(0, safeMaximumFrame - 1));
    const nextEndFrame = Math.max(nextStartFrame + 1, Math.min(rawEndFrame, safeMaximumFrame));

    return [nextStartFrame, nextEndFrame];
  };

  const handleViewRangeSliderChange = (val) => {
    const normalizedRange = normalizeViewRangeSelection(val);

    setSelectedFrameRange((previousRange) => (
      previousRange[0] === normalizedRange[0] && previousRange[1] === normalizedRange[1]
        ? previousRange
        : normalizedRange
    ));
  };

  const handleViewRangeSliderCommit = (val) => {
    const normalizedRange = normalizeViewRangeSelection(val);
    setSelectedFrameRange((previousRange) => (
      previousRange[0] === normalizedRange[0] && previousRange[1] === normalizedRange[1]
        ? previousRange
        : normalizedRange
    ));
  };



  const applySelectedLayerDurationRange = (value) => {
    const baseline = trimDragBaselineRef.current || {
      durationInFrames: currentVisibleLayerDurationInFrames,
      clipStartValue: Math.max(0, clipStartValue),
      clipEndValue: Math.max(0, clipEndValue),
      displayRangeMax: trimDisplayRange.displayRangeMax,
      displayStartFrame: trimDisplayRange.displayStart,
      displayEndFrame: trimDisplayRange.displayEnd,
    };
    const baselineDurationInFrames = Math.max(1, baseline.durationInFrames);
    const minFrame = 0;
    const maxFrame = Math.max(1, baseline.displayRangeMax ?? baselineDurationInFrames);
    const nextStartFrame = Math.min(
      Math.max(Math.round(value[0]), minFrame),
      Math.max(minFrame, maxFrame - 1),
    );
    const nextEndFrame = Math.min(
      Math.max(Math.round(value[1]), nextStartFrame + 1),
      maxFrame,
    );

    const startDelta = nextStartFrame - (baseline.displayStartFrame ?? 0);
    const endDelta = (baseline.displayEndFrame ?? maxFrame) - nextEndFrame;
    const nextClipStartValue = Math.max(0, baseline.clipStartValue + startDelta);
    const nextClipEndValue = Math.max(0, baseline.clipEndValue + endDelta);

    setClipStart(nextClipStartValue > 0);
    setClipEnd(nextClipEndValue > 0);
    setClipStartValue(nextClipStartValue);
    setClipEndValue(nextClipEndValue);

    const newDurationInFrames = nextEndFrame - nextStartFrame;
    setPendingDuration(displayFramesToSeconds(newDurationInFrames));
    setDurationChanged(true);
  };

  const layerDurationUpdated = (val) => {
    applySelectedLayerDurationRange(val);
  };

  const captureTrimDragBaseline = () => {
    trimDragBaselineRef.current = {
      durationInFrames: currentVisibleLayerDurationInFrames,
      clipStartValue: Math.max(0, clipStartValue),
      clipEndValue: Math.max(0, clipEndValue),
      displayRangeMax: trimDisplayRange.displayRangeMax,
      displayStartFrame: trimDisplayRange.displayStart,
      displayEndFrame: trimDisplayRange.displayEnd,
    };
  };

  const clearTrimDragBaseline = () => {
    trimDragBaselineRef.current = null;
  };

  const layerDurationCellUpdated = (value, index) => {

    setPendingDuration(parseFloat(value));
    setDurationChanged(true);
  };


  const onUpdateDuration = () => {
    const newDuration = pendingDuration;
    setLayerDuration(newDuration, selectedLayerIndex);
    let layer = layers[selectedLayerIndex];
    layer.duration = newDuration;

    const clipPayload = {
      clipStart: clipStartValue > 0,
      clipEnd: clipEndValue > 0,
      clipStartFrames: displayFramesToActualFrames(clipStartValue),
      clipEndFrames: displayFramesToActualFrames(clipEndValue),
    };
    updateSessionLayer(layer, clipPayload);

    if (pendingDuration != null) {
      clearTrimDragBaseline();
      setPendingDuration(null);
      setDurationChanged(false);
      setOpenPopupLayerIndex(null);
    }
  };


  const onClosePopup = () => {
    openPopupLayerIdRef.current = null;
    clearTrimDragBaseline();
    setPendingDuration(null);
    setDurationChanged(false);
    setOpenPopupLayerIndex(null);
  };

  const removeLayer = (index) => {
    if (!layers || layers.length === 0) return;
    openPopupLayerIdRef.current = null;
    removeSessionLayer(index);
    clearTrimDragBaseline();
    setPendingDuration(null);
    setDurationChanged(false);
    setOpenPopupLayerIndex(null); // Close the popup when layer is removed
  };


  const setSelectedLayerDurationRange = (val) => {
    applySelectedLayerDurationRange(val);
  };




  useLayoutEffect(() => {
    if (openPopupLayerIndex !== null) {
      const popupLayerId = layers[openPopupLayerIndex]?._id?.toString?.();
      updateScenePopupPosition(popupLayerId);
    }
  }, [openPopupLayerIndex, layers, layerViewportHeight, updateScenePopupPosition]);

  useEffect(() => {
    if (openPopupLayerIndex === null) {
      return undefined;
    }

    const repositionPopup = () => {
      const popupLayerId = layers[openPopupLayerIndex]?._id?.toString?.();
      updateScenePopupPosition(popupLayerId);
    };

    window.addEventListener('resize', repositionPopup);
    document.addEventListener('scroll', repositionPopup, true);

    return () => {
      window.removeEventListener('resize', repositionPopup);
      document.removeEventListener('scroll', repositionPopup, true);
    };
  }, [openPopupLayerIndex, layers, updateScenePopupPosition]);



  const updateAudioLayerFromSlider = (audioLayerId, startTime, endTime, duration) => {

    const updatedAudioTrackListDisplay = audioTrackListDisplay.map((audioTrack) => {
      if (audioTrack._id === audioLayerId) {
        return {
          ...audioTrack,
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          isDirty: true,
        };
      } else {
        return {
          ...audioTrack,
        };
      }
    });
    setAudioTrackListDisplay(updatedAudioTrackListDisplay);

  }


  const handleVolumeChangeHandler = (e, trackId) => {
    const newVolume = parseFloat(e.target.value);
    setAudioTrackListDisplay((prev) =>
      prev.map((track) =>
        track._id === trackId
          ? { ...track, volume: newVolume, isDirty: true }
          : track
      )
    );
  };

  const handleStartTimeChangeHandler = (e, trackId) => {
    const newStart = parseFloat(e.target.value);
    setAudioTrackListDisplay((prev) =>
      prev.map((track) =>
        track._id === trackId
          ? { ...track, startTime: newStart, isDirty: true }
          : track
      )
    );
  };

  const handleEndTimeChangeHandler = (e, trackId) => {
    const newEnd = parseFloat(e.target.value);
    setAudioTrackListDisplay((prev) =>
      prev.map((track) =>
        track._id === trackId
          ? { ...track, endTime: newEnd, isDirty: true }
          : track
      )
    );
  };

  const updateAudioTrackDraftById = (trackId, updater) => {
    if (!trackId) {
      return;
    }

    setAudioTrackListDisplay((prevAudioTracks) => prevAudioTracks.map((track) => {
      if (resolveAudioTrackId(track)?.toString() !== trackId.toString()) {
        return track;
      }

      const nextTrack = typeof updater === 'function'
        ? updater(track)
        : { ...track, ...(updater || {}) };

      return {
        ...nextTrack,
        isDirty: true,
      };
    }));
  };

  const updateSelectedAudioTrackDraft = (updater) => {
    if (!selectedAudioTrackId) {
      return;
    }

    updateAudioTrackDraftById(selectedAudioTrackId, updater);
  };

  const toggleSelectedAudioAdvancedOptions = () => {
    setShowSelectedAudioExtraOptionsToolbar((previousValue) => !previousValue);
  };

  const handleSelectedAudioVisualizerToggle = () => {
    setShowVerticalWaveform((previousValue) => !previousValue);
    if (!showSelectedAudioExtraOptionsToolbar) {
      setShowSelectedAudioExtraOptionsToolbar(true);
    }
  };

  const setAudioWaveformVisibilityForTrack = (trackId, nextVisible) => {
    if (!trackId) {
      return;
    }

    setAudioWaveformVisibilityByTrackId((previousValue) => ({
      ...previousValue,
      [trackId]: Boolean(nextVisible),
    }));
  };

  const handleAudioManualVolumeToggle = (trackId, nextEnabled) => {
    const audioTrack = audioTrackById.get(trackId?.toString?.() ?? trackId);
    if (!audioTrack) {
      return;
    }

    updateAudioTrackDraftById(trackId, (track) => ({
      ...track,
      manualVolumeAdjustmentEnabled: nextEnabled,
      startVolume: clampAudioVolumeValue(track.startVolume, track.volume),
      endVolume: clampAudioVolumeValue(track.endVolume, track.volume),
      timestampedVolumes: Array.isArray(track.timestampedVolumes) ? track.timestampedVolumes : [],
    }));

    if (nextEnabled) {
      setShowSelectedAudioExtraOptionsToolbar(true);
      setShowVerticalWaveform(true);
      setAudioWaveformVisibilityForTrack(trackId, true);
      setAudioRangeSliderDisplayAsSelected(trackId);
      setSelectedAudioVolumePointId('start');
      return;
    }

    if (selectedAudioTrackId?.toString() === trackId?.toString()) {
      setSelectedAudioVolumePointId(null);
    }
  };

  const handleSelectedAudioManualVolumeToggle = (event) => {
    if (!selectedAudioTrackId) {
      return;
    }

    handleAudioManualVolumeToggle(
      selectedAudioTrackId,
      Boolean(event?.target?.checked),
    );
  };

  const handleAudioVolumePointChange = (trackId, pointId, nextVolumeValue) => {
    const audioTrack = audioTrackById.get(trackId?.toString?.() ?? trackId);
    if (!audioTrack || !pointId) {
      return;
    }

    const normalizedVolume = clampAudioVolumeValue(nextVolumeValue, audioTrack.volume);

    updateAudioTrackDraftById(trackId, (track) => {
      if (pointId === 'start') {
        return {
          ...track,
          startVolume: normalizedVolume,
        };
      }

      if (pointId === 'end') {
        return {
          ...track,
          endVolume: normalizedVolume,
        };
      }

      const existingPoints = Array.isArray(track.timestampedVolumes) ? track.timestampedVolumes : [];
      const nextTimestampedVolumes = existingPoints.map((point) => (
        point.id === pointId
          ? {
            ...point,
            volume: normalizedVolume,
          }
          : point
      ));

      return {
        ...track,
        timestampedVolumes: nextTimestampedVolumes,
      };
    });
  };

  const handleSelectedAudioVolumePointChange = (nextVolumeValue) => {
    if (!selectedAudioTrackId || !selectedAudioVolumePoint) {
      return;
    }

    handleAudioVolumePointChange(selectedAudioTrackId, selectedAudioVolumePoint.id, nextVolumeValue);
  };

  const handleAudioVolumePointCreate = (trackId, timeSeconds) => {
    const audioTrack = audioTrackById.get(trackId?.toString?.() ?? trackId);
    if (!audioTrack) {
      return;
    }

    const trackDuration = Math.max(0, Number(audioTrack.duration) || 0);
    if (!trackDuration) {
      return;
    }

    const normalizedTime = clamp(timeSeconds, 0, trackDuration);
    if (normalizedTime <= 0.0001) {
      setAudioRangeSliderDisplayAsSelected(trackId);
      setSelectedAudioVolumePointId('start');
      return;
    }

    if (normalizedTime >= trackDuration - 0.0001) {
      setAudioRangeSliderDisplayAsSelected(trackId);
      setSelectedAudioVolumePointId('end');
      return;
    }

    const nextPointId = `point_${Date.now()}_${Math.round(normalizedTime * 1000)}`;
    const nextPoint = {
      id: nextPointId,
      time: Number(normalizedTime.toFixed(4)),
      volume: clampAudioVolumeValue(audioTrack.volume, audioTrack.volume),
    };

    updateAudioTrackDraftById(trackId, (track) => {
      const existingPoints = Array.isArray(track.timestampedVolumes) ? track.timestampedVolumes : [];
      const nextTimestampedVolumes = [...existingPoints, nextPoint].sort((leftPoint, rightPoint) => leftPoint.time - rightPoint.time);
      return {
        ...track,
        timestampedVolumes: nextTimestampedVolumes,
      };
    });

    setAudioRangeSliderDisplayAsSelected(trackId);
    setSelectedAudioVolumePointId(nextPointId);
  };

  const handleSelectedAudioVolumePointCreate = (timeSeconds) => {
    if (!selectedAudioTrackId) {
      return;
    }

    handleAudioVolumePointCreate(selectedAudioTrackId, timeSeconds);
  };

  const handleAudioVolumePointDelete = (trackId, pointId) => {
    if (!trackId || !pointId) {
      return;
    }

    updateAudioTrackDraftById(trackId, (track) => ({
      ...track,
      timestampedVolumes: (Array.isArray(track.timestampedVolumes) ? track.timestampedVolumes : [])
        .filter((point) => point.id !== pointId),
    }));
  };

  const handleSelectedAudioVolumePointDelete = () => {
    if (!selectedAudioTrackId || !selectedAudioVolumePoint || selectedAudioVolumePoint.fixed) {
      return;
    }

    handleAudioVolumePointDelete(selectedAudioTrackId, selectedAudioVolumePoint.id);
    setSelectedAudioVolumePointId('start');
  };

  const resetAudioTrackVolumeAutomation = (trackId) => {
    if (!trackId) {
      return;
    }

    updateAudioTrackDraftById(trackId, (track) => ({
      ...track,
      startVolume: clampAudioVolumeValue(track.volume, track.volume),
      endVolume: clampAudioVolumeValue(track.volume, track.volume),
      timestampedVolumes: [],
    }));
  };

  const resetSelectedAudioVolumeAutomation = () => {
    if (!selectedAudioTrackId) {
      return;
    }

    resetAudioTrackVolumeAutomation(selectedAudioTrackId);
    setSelectedAudioVolumePointId('start');
  };


  const onUpdateAllAudioLayers = async () => {
    // We’re about to send the entire array:
    const response = await updateAllAudioLayersOneShot(audioTrackListDisplay);
    if (response.success) {
      // The server accepted the changes and returned 
      // the “official” updated audio layer objects:
      const officialLayers = response.serverLayers;
      // We can now re-initialize local state to match 
      // the server's final version. (No longer dirty.)
      const merged = officialLayers.map((layer) => ({
        ...layer,
        isDirty: false,
      }));
      setAudioTrackListDisplay(merged);
    } else {
      
      alert("Failed to update! See console.");
    }
  };

  const duplicateSelectedAudioTrack = async () => {
    if (!selectedAudioTrack || !canDuplicateSelectedAudioTrack || isDuplicatingAudioTrack) {
      return;
    }

    setIsDuplicatingAudioTrack(true);
    try {
      const response = await duplicateAudioLayer(selectedAudioTrack);
      const duplicatedAudioLayerId = response?.duplicatedAudioLayerId;
      if (response?.success && duplicatedAudioLayerId) {
        pendingSelectedAudioLayerIdRef.current = duplicatedAudioLayerId.toString();
        setSelectedAudioTrackDisplay(duplicatedAudioLayerId.toString());
      }
    } finally {
      setIsDuplicatingAudioTrack(false);
    }
  };



  const showSelectedAudioTrack = () => {
    const hasAudioLayers = audioTrackListDisplay.length > 0;
    const manualVolumeAdjustmentEnabled = Boolean(selectedAudioTrack?.manualVolumeAdjustmentEnabled);
    const selectedPointLabel = selectedAudioVolumePoint
      ? (selectedAudioVolumePoint.kind === 'start'
        ? 'Start'
        : selectedAudioVolumePoint.kind === 'end'
        ? 'End'
          : 'Point')
      : 'Point';
    const audioToolbarSurface =
      colorMode === 'light'
        ? 'bg-white/72 border border-slate-200 shadow-sm backdrop-blur-md'
        : 'bg-[#0b1224]/68 border border-[#1f2a3d] backdrop-blur-md';
    const compactInputClassName =
      colorMode === 'light'
        ? 'h-8 w-[56px] rounded-lg border border-slate-200 bg-white/88 px-2 py-1 text-[11px] text-slate-700'
        : 'h-8 w-[56px] rounded-lg border border-[#1f2a3d] bg-[#111a2f]/82 px-2 py-1 text-[11px] text-slate-100';
    const updateButtonClassName =
      colorMode === 'light'
        ? 'bg-sky-600 text-white hover:bg-sky-500'
        : 'bg-cyan-400 text-[#041420] hover:bg-cyan-300';
    const removeButtonClassName =
      colorMode === 'light'
        ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
        : 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/18';
    const duplicateButtonClassName =
      colorMode === 'light'
        ? 'border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100'
        : 'border border-[#2a3953] bg-[#111a2f]/82 text-slate-100 hover:bg-[#17223a]';
    const advancedButtonClassName = showSelectedAudioExtraOptionsToolbar
      ? (colorMode === 'light'
        ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
        : 'border border-cyan-500/40 bg-cyan-500/12 text-cyan-200')
      : duplicateButtonClassName;
    const secondarySurfaceClassName =
      colorMode === 'light'
        ? 'border border-slate-200 bg-slate-50/90 text-slate-700'
        : 'border border-[#253248] bg-[#0f172a]/82 text-slate-100';
    const pillBaseClassName = 'inline-flex h-8 items-center justify-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition';
    const activePillClassName =
      colorMode === 'light'
        ? 'border border-sky-200 bg-sky-50 text-sky-700'
        : 'border border-cyan-500/40 bg-cyan-500/12 text-cyan-200';
    const audioStatusDotClass = dirtyCount > 0
      ? (colorMode === 'light'
        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
        : 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]')
      : (colorMode === 'light' ? 'bg-slate-300' : 'bg-slate-600');
    const audioStatusTitle = dirtyCount > 0
      ? `${dirtyCount} audio update${dirtyCount === 1 ? '' : 's'} pending`
      : 'Audio workspace';
    const metadataLabelClassName =
      colorMode === 'light'
        ? 'text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500'
        : 'text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400';
    const metadataValueClassName =
      colorMode === 'light'
        ? 'text-xs text-slate-700'
        : 'text-xs text-slate-200';
    const promptPreviewClassName =
      colorMode === 'light'
        ? 'border border-slate-200 bg-white/90 hover:bg-slate-50'
        : 'border border-[#2a3953] bg-[#111a2f]/82 hover:bg-[#17223a]';
    const promptCopyButtonClassName =
      colorMode === 'light'
        ? 'border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100'
        : 'border border-[#2a3953] bg-[#111a2f]/82 text-slate-100 hover:bg-[#17223a]';
    const toolbarDividerClassName =
      colorMode === 'light' ? 'bg-slate-200' : 'bg-[#253248]';
    const inlineInputClassName =
      colorMode === 'light'
        ? 'h-7 w-[54px] bg-transparent px-0 text-right text-[11px] font-semibold text-slate-700 outline-none'
        : 'h-7 w-[54px] bg-transparent px-0 text-right text-[11px] font-semibold text-slate-100 outline-none';
    const compactPromptCopyButtonClassName =
      promptCopyState === 'copied'
        ? activePillClassName
        : promptCopyState === 'failed'
          ? removeButtonClassName
          : promptCopyButtonClassName;

    return (
      <div className={`flex w-full max-w-full flex-col gap-1.5 overflow-hidden rounded-2xl px-2 py-1.5 ${audioToolbarSurface}`}>
        <div className='flex min-w-0 justify-center overflow-x-auto pb-[2px]'>
          <div className='flex min-w-max items-center gap-1.5'>
            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${audioStatusDotClass}`}
              title={audioStatusTitle}
              aria-label={audioStatusTitle}
            />

            {selectedAudioTrack ? (
              <button
                type="button"
                onClick={duplicateSelectedAudioTrack}
                disabled={!canDuplicateSelectedAudioTrack || isDuplicatingAudioTrack}
                title="Duplicate audio layer"
                aria-label="Duplicate audio layer"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] transition disabled:opacity-50 ${duplicateButtonClassName}`}
              >
                <FaCopy />
              </button>
            ) : null}

            <button
              type="button"
              onClick={toggleSelectedAudioAdvancedOptions}
              title="Audio tools"
              aria-label="Audio tools"
              disabled={!hasAudioLayers}
              className={`inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 ${advancedButtonClassName}`}
            >
              Tools
            </button>

            <button
              type="button"
              onClick={onUpdateAllAudioLayers}
              disabled={dirtyCount === 0}
              title="Update all audio layers"
              aria-label="Update all audio layers"
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] transition disabled:opacity-50 ${updateButtonClassName}`}
            >
              <FaCheck />
            </button>

            {selectedAudioTrack ? (
              <button
                type="button"
                title="Remove audio layer"
                aria-label="Remove audio layer"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] transition ${removeButtonClassName}`}
                onClick={() => removeAudioLayer(selectedAudioTrack)}
              >
                <FaTimes />
              </button>
            ) : null}
          </div>
        </div>

        {selectedAudioTrack ? (
          <div className='overflow-x-auto pb-[2px]'>
            <div className='flex min-w-max items-center gap-1.5'>
              <div
                className={`inline-flex h-8 max-w-[220px] shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold ${secondarySurfaceClassName}`}
                title={selectedAudioTrackDisplayTitle}
              >
                <span className='min-w-0 truncate'>{selectedAudioTrackDisplayTitle}</span>
              </div>

              <div className={`inline-flex h-8 shrink-0 items-center overflow-hidden rounded-lg ${secondarySurfaceClassName}`}>
                <label className='inline-flex h-full items-center gap-1.5 px-2' title="Start time">
                  <span className={metadataLabelClassName}>In</span>
                  <input
                    type="number"
                    value={selectedAudioTrack.startTime}
                    className={inlineInputClassName}
                    onChange={(e) => handleStartTimeChangeHandler(e, selectedAudioTrack._id)}
                    aria-label="Start time"
                  />
                </label>
                <div className={`h-4 w-px shrink-0 ${toolbarDividerClassName}`} />
                <label className='inline-flex h-full items-center gap-1.5 px-2' title="End time">
                  <span className={metadataLabelClassName}>Out</span>
                  <input
                    type="number"
                    value={selectedAudioTrack.endTime}
                    className={inlineInputClassName}
                    onChange={(e) => handleEndTimeChangeHandler(e, selectedAudioTrack._id)}
                    aria-label="End time"
                  />
                </label>
                <div className={`h-4 w-px shrink-0 ${toolbarDividerClassName}`} />
                <label className='inline-flex h-full items-center gap-1.5 px-2' title="Layer volume">
                  <span className={metadataLabelClassName}>Vol</span>
                  <input
                    type="number"
                    value={selectedAudioTrack.volume}
                    className={inlineInputClassName}
                    onChange={(e) => handleVolumeChangeHandler(e, selectedAudioTrack._id)}
                    aria-label="Layer volume"
                  />
                </label>
              </div>

              {shouldShowSelectedAudioTrackTypeLabel ? (
                <div
                  className={`inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${secondarySurfaceClassName}`}
                  title={selectedAudioTrackTypeLabel}
                >
                  {selectedAudioTrackTypeLabel}
                </div>
              ) : null}

              {selectedAudioTrackMetadata.map((item) => (
                <div
                  key={item.label}
                  className={`inline-flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-lg px-2 ${secondarySurfaceClassName}`}
                  title={`${item.label}: ${item.value}`}
                >
                  <span className={metadataLabelClassName}>{item.label}</span>
                  <span className={`${metadataValueClassName} min-w-0 truncate`}>{item.value}</span>
                </div>
              ))}

              {selectedAudioTrackPrompt ? (
                <>
                  <button
                    ref={promptDropdownButtonRef}
                    type="button"
                    onClick={togglePromptDropdown}
                    className={`inline-flex h-8 min-w-[220px] max-w-[360px] shrink-0 items-center gap-2 overflow-hidden rounded-lg px-2.5 text-left transition ${promptPreviewClassName}`}
                    title={selectedAudioTrackPrompt}
                  >
                    <span className={`${metadataLabelClassName} shrink-0`}>Prompt</span>
                    <span className='min-w-0 flex-1 truncate text-xs'>
                      {selectedAudioTrackPrompt}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={copyPromptToClipboard}
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] transition ${compactPromptCopyButtonClassName}`}
                    title={
                      promptCopyState === 'copied'
                        ? 'Prompt copied'
                        : promptCopyState === 'failed'
                          ? 'Copy failed'
                          : 'Copy prompt'
                    }
                    aria-label="Copy prompt"
                  >
                    {promptCopyState === 'copied' ? (
                      <FaCheck />
                    ) : promptCopyState === 'failed' ? (
                      <FaTimes />
                    ) : (
                      <FaCopy />
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSelectedAudioExtraOptionsToolbar ? (
          <div className='overflow-x-auto pb-[2px]'>
            <div className='flex min-w-max items-center gap-1.5'>
              <label
                className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  showVerticalWaveform ? activePillClassName : secondarySurfaceClassName
                }`}
                title="Show waveform lanes beside enabled audio layers"
              >
                <input
                  type="checkbox"
                  checked={showVerticalWaveform}
                  onChange={handleSelectedAudioVisualizerToggle}
                />
                Wave
              </label>

              {showVerticalWaveform ? (
                <>
                  <button
                    type="button"
                    className={`${pillBaseClassName} ${selectedAudioVisualizationMode === 'waveform' ? activePillClassName : secondarySurfaceClassName}`}
                    onClick={() => setSelectedAudioVisualizationMode('waveform')}
                  >
                    Wave
                  </button>
                  <button
                    type="button"
                    className={`${pillBaseClassName} ${selectedAudioVisualizationMode === 'spectrogram' ? activePillClassName : secondarySurfaceClassName}`}
                    onClick={() => setSelectedAudioVisualizationMode('spectrogram')}
                  >
                    Spec
                  </button>
                  {audioTrackListDisplay.map((audioTrack, index) => {
                    const trackId = resolveAudioTrackId(audioTrack);
                    if (!trackId) {
                      return null;
                    }

                    const isVisible = audioWaveformVisibilityByTrackId[trackId] !== false;
                    const isActive = selectedAudioTrackId === trackId;

                    return (
                      <label
                        key={`audio-waveform-toggle-${trackId}`}
                        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                          isActive ? activePillClassName : secondarySurfaceClassName
                        }`}
                        title={`Show waveform for layer ${index + 1}`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(event) => setAudioWaveformVisibilityForTrack(trackId, event.target.checked)}
                        />
                        {`L${index + 1}`}
                      </label>
                    );
                  })}
                </>
              ) : null}

              {selectedAudioTrack ? (
                <label
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    manualVolumeAdjustmentEnabled ? activePillClassName : secondarySurfaceClassName
                  }`}
                  title="Edit per-point volume automation for the selected audio layer"
                >
                  <input
                    type="checkbox"
                    checked={manualVolumeAdjustmentEnabled}
                    onChange={handleSelectedAudioManualVolumeToggle}
                  />
                  Points
                </label>
              ) : null}

              {selectedAudioTrack && manualVolumeAdjustmentEnabled ? (
                <>
                  <div className={`inline-flex h-8 shrink-0 items-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${secondarySurfaceClassName}`}>
                    {selectedPointLabel}
                  </div>
                  <input
                    type="number"
                    value={selectedAudioVolumePoint?.volume ?? selectedAudioTrack.volume}
                    className={compactInputClassName}
                    onChange={(e) => handleSelectedAudioVolumePointChange(e.target.value)}
                    title="Selected fade point volume"
                    aria-label="Selected fade point volume"
                  />
                  <button
                    type="button"
                    className={`inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${secondarySurfaceClassName}`}
                    onClick={resetSelectedAudioVolumeAutomation}
                  >
                    Reset
                  </button>
                  {!selectedAudioVolumePoint?.fixed ? (
                    <button
                      type="button"
                      className={`inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${secondarySurfaceClassName}`}
                      onClick={handleSelectedAudioVolumePointDelete}
                    >
                      Delete
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };



  // Inside FrameToolbar.js

  const newTextAnimationSelected = (animationObject) => {
    // Find the highest animation_x ID currently in the selectedTextTrackDisplay
    const currentAnimations = selectedTextTrackDisplay.animations || [];

    let maxIdNum = 0;
    currentAnimations.forEach(anim => {
      if (anim.id) {
        const match = anim.id.match(/^animation_(\d+)$/);
        if (match && parseInt(match[1], 10) > maxIdNum) {
          maxIdNum = parseInt(match[1], 10);
        }
      }
    });

    // The new animation ID will be the next integer
    const newAnimationId = `animation_${maxIdNum + 1}`;

    const newAnimationObject = {
      id: newAnimationId, // Assign the unique ID
      type: animationObject.value,
      startFrame: selectedTextTrackDisplay.startFrame,
      endFrame: selectedTextTrackDisplay.endFrame,
      isPending: true,
    };

    // Update the selectedTextTrackDisplay
    const updatedAnimations = selectedTextTrackDisplay.animations
      ? [...selectedTextTrackDisplay.animations, newAnimationObject]
      : [newAnimationObject];

    const updatedSelectedTextTrackDisplay = {
      ...selectedTextTrackDisplay,
      animations: updatedAnimations,
    };

    // Find the layer and update its animations
    const layerIndex = layers.findIndex(
      (layer) => layer._id === selectedTextTrackDisplay.layerId
    );

    if (layerIndex > -1) {
      const layer = { ...layers[layerIndex] };
      const itemList = [...layer.imageSession.activeItemList];

      const itemIndex = itemList.findIndex(
        (item) => item.id === selectedTextTrackDisplay.id
      );

      if (itemIndex > -1) {
        const updatedItem = {
          ...itemList[itemIndex],
          animations: updatedAnimations,
        };
        itemList[itemIndex] = updatedItem;
        layer.imageSession.activeItemList = itemList;
        updateSessionLayer(layer);
      }
    }

    setShowTextTrackAnimations(true);

    setSelectedTextTrackDisplay(updatedSelectedTextTrackDisplay);
    setNewSelectedTextAnimation(newAnimationObject);
  };


  const removeAnimationLayer = (animationToRemove, textTrackItem) => {
    const layerId = textTrackItem.layerId;
    const itemId = textTrackItem.id;

    const updatedLayers = [...layers];
    const layerIndex = updatedLayers.findIndex((l) => l._id === layerId);
    if (layerIndex > -1) {
      const layer = { ...updatedLayers[layerIndex] };
      const itemList = [...layer.imageSession.activeItemList];
      const itemIndex = itemList.findIndex((item) => item.id === itemId);

      if (itemIndex > -1) {
        const updatedItem = { ...itemList[itemIndex] };
        if (updatedItem.animations && updatedItem.animations.length > 0) {
          // Remove the specified animation
          updatedItem.animations = updatedItem.animations.filter(
            (anim) => anim !== animationToRemove
          );

          // Reorder the IDs in ascending order after removal
          // Sort the animations by their current numeric suffix, then reassign.
          let sortedAnimations = [...updatedItem.animations];

          // Extract numeric parts and sort
          sortedAnimations.sort((a, b) => {
            const aNum = a.id ? parseInt(a.id.replace('animation_', ''), 10) : 0;
            const bNum = b.id ? parseInt(b.id.replace('animation_', ''), 10) : 0;
            return aNum - bNum;
          });

          // Reassign IDs sequentially: animation_1, animation_2, ...
          sortedAnimations = sortedAnimations.map((anim, idx) => ({
            ...anim,
            id: `animation_${idx + 1}`,
          }));

          updatedItem.animations = sortedAnimations;
          itemList[itemIndex] = updatedItem;
          layer.imageSession.activeItemList = itemList;
          updatedLayers[layerIndex] = layer;
          updateSessionLayer(layer);
        }
      }
    }
  };



  const removeTextLayer = (textTrackId) => {


    const [firstPart, ...rest] = textTrackId.split('_'); // Split without limit
    const layerId = firstPart; // First part is the layerId
    const itemId = rest.join('_'); // Join the remaining parts to get itemId

    // Find the layer by layerId
    const layerIndex = layers.findIndex((l) => l._id.toString() === layerId);

    if (layerIndex > -1) {
      const updatedLayers = [...layers];
      const layer = { ...updatedLayers[layerIndex] };
      const itemList = [...layer.imageSession.activeItemList];

      // Find the text item by itemId
      const itemIndex = itemList.findIndex((item) => item.id.toString() === itemId);


      if (itemIndex > -1) {
        // Remove the text item
        itemList.splice(itemIndex, 1);
        layer.imageSession.activeItemList = itemList;
        updatedLayers[layerIndex] = layer;


        updateSessionLayer(layer);
      }
    }
  };


  const handleTextToolbarBackClick = () => {
    // Reset the text toolbar view:
    setSelectedTextTrackDisplay(null);
    setSelectedAnimation(null);
    setShowTextTrackAnimations(false);

    // If you also want to unselect layers:
    //  setSelectedLayerIndex(null);
    //   setSelectedLayer(null);
  };



  const showSelectedTextTrack = () => {

    if (!selectedTextTrackDisplay) {
      return <span />;
    }
    return (
      <SelectedTextToolbarDisplay selectedTextTrack={selectedTextTrackDisplay}
        newTextAnimationSelected={newTextAnimationSelected}
        bgColor={bgColor} textColor={textColor}
        setShowTextTrackAnimations={setShowTextTrackAnimations}
        showTextTrackAnimations={showTextTrackAnimations}
        handleSaveChanges={handleSaveChanges}
        updateChangesToActiveSessionLayers={updateChangesToActiveSessionLayers}
        removeTextLayer={removeTextLayer}
        removeAnimationLayer={removeAnimationLayer}
        selectedAnimation={selectedAnimation}
        handleTextToolbarBackClick={handleTextToolbarBackClick}
        onBackClicked={handleTextToolbarBackClick}

      />
    )


  }

  const viewRangeStart = selectedFrameRange?.[0] ?? 0;
  const viewRangeEnd = selectedFrameRange?.[1] ?? 0;
  const hasValidViewRange =
    Number.isFinite(viewRangeStart) &&
    Number.isFinite(viewRangeEnd) &&
    viewRangeEnd > viewRangeStart;
  const safeViewRange = hasValidViewRange
    ? [viewRangeStart, viewRangeEnd]
    : [0, Math.max(totalDurationInFrames, 1)];
  const clampedLayerSeek = Math.min(
    Math.max(currentLayerSeek ?? safeViewRange[0], safeViewRange[0]),
    safeViewRange[1]
  );
  const hasUsableFrameRange = hasValidViewRange && totalDurationInFrames > 0;
  const viewFrameSpan = Math.max(1, safeViewRange[1] - safeViewRange[0]);
  const hasDisplayedLayerViewportGeometry = Array.isArray(displayedLayerViewportGeometry?.segments)
    && displayedLayerViewportGeometry.segments.length > 0;
  const displayedLayerViewportTotalPixels = hasDisplayedLayerViewportGeometry
    ? Math.max(1, Number(displayedLayerViewportGeometry?.totalPixels) || 1)
    : 1;
  const frameToSeekSliderValue = (frame) => (
    hasDisplayedLayerViewportGeometry
      ? frameToViewportValue(frame, displayedLayerViewportGeometry)
      : Number(frame) || 0
  );
  const seekSliderValueToFrame = (value) => (
    hasDisplayedLayerViewportGeometry
      ? viewportValueToFrame(value, displayedLayerViewportGeometry)
      : Number(value) || 0
  );
  const seekSliderMin = hasDisplayedLayerViewportGeometry ? 0 : safeViewRange[0];
  const seekSliderMax = hasDisplayedLayerViewportGeometry
    ? displayedLayerViewportTotalPixels
    : safeViewRange[1];
  const currentSeekSliderValue = Math.max(
    seekSliderMin,
    Math.min(seekSliderMax, frameToSeekSliderValue(clampedLayerSeek)),
  );
  const majorGridStepFrames = useMemo(
    () => pickGridStepFrames(viewFrameSpan, 10),
    [viewFrameSpan]
  );
  const minorGridStepFrames = useMemo(
    () => getMinorGridStepFrames(majorGridStepFrames),
    [majorGridStepFrames]
  );
  const majorGridLineFrames = useMemo(() => (
    hasUsableFrameRange
      ? buildGridLineFrames(viewRangeStart, viewRangeEnd, majorGridStepFrames)
      : []
  ), [hasUsableFrameRange, majorGridStepFrames, viewRangeEnd, viewRangeStart]);
  const minorGridLineOffsets = useMemo(() => {
    if (!hasUsableFrameRange || !minorGridStepFrames) {
      return [];
    }

    const majorOffsetSet = new Set(
      majorGridLineFrames.map((frame) => frame.toFixed(4))
    );

    return buildGridLineFrames(viewRangeStart, viewRangeEnd, minorGridStepFrames)
      .filter((frame) => !majorOffsetSet.has(frame.toFixed(4)))
      .map((frame) => (
        hasDisplayedLayerViewportGeometry
          ? clampPercent(
            (frameToViewportValue(frame, displayedLayerViewportGeometry)
              / displayedLayerViewportTotalPixels) * 100
          )
          : clampPercent(((frame - safeViewRange[0]) / viewFrameSpan) * 100)
      ));
  }, [
    displayedLayerViewportGeometry,
    displayedLayerViewportTotalPixels,
    hasDisplayedLayerViewportGeometry,
    hasUsableFrameRange,
    majorGridLineFrames,
    minorGridStepFrames,
    safeViewRange,
    viewFrameSpan,
  ]);
  const majorGridLineOffsets = useMemo(() => (
    majorGridLineFrames.map((frame) => (
      hasDisplayedLayerViewportGeometry
        ? clampPercent(
          (frameToViewportValue(frame, displayedLayerViewportGeometry)
            / displayedLayerViewportTotalPixels) * 100
        )
        : clampPercent(((frame - safeViewRange[0]) / viewFrameSpan) * 100)
    ))
  ), [
    displayedLayerViewportGeometry,
    displayedLayerViewportTotalPixels,
    hasDisplayedLayerViewportGeometry,
    majorGridLineFrames,
    safeViewRange,
    viewFrameSpan,
  ]);
  const currentSeekGridOffset = hasUsableFrameRange
    ? (
      hasDisplayedLayerViewportGeometry
        ? clampPercent(
          (frameToViewportValue(clampedLayerSeek, displayedLayerViewportGeometry)
            / displayedLayerViewportTotalPixels) * 100
        )
        : clampPercent(((clampedLayerSeek - safeViewRange[0]) / viewFrameSpan) * 100)
    )
    : null;
  const gridOverlayThemeStyle = useMemo(() => (
    colorMode === 'dark'
      ? {
        '--action-grid-surface-top': 'rgba(15, 23, 42, 0.2)',
        '--action-grid-surface-bottom': 'rgba(2, 6, 23, 0.3)',
        '--action-grid-line-major': 'rgba(125, 211, 252, 0.26)',
        '--action-grid-line-major-glow': 'rgba(34, 211, 238, 0.18)',
        '--action-grid-line-minor': 'rgba(148, 163, 184, 0.11)',
        '--action-grid-line-focus': 'rgba(248, 113, 113, 0.9)',
        '--action-grid-line-focus-glow': 'rgba(248, 113, 113, 0.42)',
        '--action-grid-snap-rail': 'rgba(248, 113, 113, 0.45)',
        '--action-grid-snap-surface': 'rgba(15, 23, 42, 0.92)',
        '--action-grid-snap-border': 'rgba(248, 113, 113, 0.28)',
        '--action-grid-snap-text': 'rgb(254, 226, 226)',
        '--action-grid-snap-dot': 'rgb(248, 113, 113)',
      }
      : {
        '--action-grid-surface-top': 'rgba(255, 255, 255, 0.16)',
        '--action-grid-surface-bottom': 'rgba(226, 232, 240, 0.22)',
        '--action-grid-line-major': 'rgba(37, 99, 235, 0.18)',
        '--action-grid-line-major-glow': 'rgba(14, 165, 233, 0.12)',
        '--action-grid-line-minor': 'rgba(100, 116, 139, 0.1)',
        '--action-grid-line-focus': 'rgba(220, 38, 38, 0.78)',
        '--action-grid-line-focus-glow': 'rgba(248, 113, 113, 0.22)',
        '--action-grid-snap-rail': 'rgba(220, 38, 38, 0.34)',
        '--action-grid-snap-surface': 'rgba(255, 255, 255, 0.94)',
        '--action-grid-snap-border': 'rgba(248, 113, 113, 0.26)',
        '--action-grid-snap-text': 'rgb(127, 29, 29)',
        '--action-grid-snap-dot': 'rgb(220, 38, 38)',
      }
  ), [colorMode]);
  const visibleGridSnapPoints = useMemo(() => (
    gridSnapPoints
      .filter((snapPoint) => (
        snapPoint.frame >= safeViewRange[0]
        && snapPoint.frame <= safeViewRange[1]
      ))
      .map((snapPoint) => ({
        ...snapPoint,
        offset: hasDisplayedLayerViewportGeometry
          ? clampPercent(
            (frameToViewportValue(snapPoint.frame, displayedLayerViewportGeometry)
              / displayedLayerViewportTotalPixels) * 100
          )
          : clampPercent(((snapPoint.frame - safeViewRange[0]) / viewFrameSpan) * 100),
      }))
  ), [
    displayedLayerViewportGeometry,
    displayedLayerViewportTotalPixels,
    gridSnapPoints,
    hasDisplayedLayerViewportGeometry,
    safeViewRange,
    viewFrameSpan,
  ]);

  let layerSelectOverlay = null;

  const sliderStartRange = 0;
  const sliderEndRange = Math.max(1, trimDisplayRange.displayRangeMax);
  const hasDurationRange = sliderEndRange > sliderStartRange;
  const safeSliderMax = Math.max(sliderEndRange, sliderStartRange + 1);
  const sliderValues = [
    Math.min(trimDisplayRange.displayStart, Math.max(0, safeSliderMax - 1)),
    hasDurationRange
      ? Math.max(
        Math.min(trimDisplayRange.displayEnd, safeSliderMax),
        Math.min(trimDisplayRange.displayStart + 1, safeSliderMax),
      )
      : safeSliderMax,
  ];

  if (
    !isDragging &&
    highlightBoundaries &&
    highlightBoundaries.height > 0 &&
    hasDurationRange &&
    hasUsableFrameRange
  ) {
    layerSelectOverlay = (
      <div
        className='layer-select-overlay absolute w-full z-10 left-0'
        style={{
          top: '0',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <div
          className='absolute'
          style={{
            top: `${highlightBoundaries.start}px`,
            left: '0',
            width: '100%',
            height: `${highlightBoundaries.height}px`,
          }}
        >
          <RangeOverlaySlider
            onChange={setSelectedLayerDurationRange}
            min={sliderStartRange}
            max={safeSliderMax}
            value={sliderValues}
            highlightBoundaries={highlightBoundaries}
            layerDurationUpdated={layerDurationUpdated}
            onBeforeChange={captureTrimDragBaseline}
            onAfterChange={clearTrimDragBaseline}
          />
        </div>
      </div>
    );
  }


  // Prepare layersList with current and incoming layers
  let layersList = <span />;

  const setUserSelectedLayer = (e, originalIndex, layer) => {
    e.stopPropagation();
    const nextLayerId = layer?._id?.toString?.() || null;
    const currentSelectedLayerId = layers[selectedLayerIndex]?._id?.toString?.() || null;
    const isSameLayerSelection = nextLayerId && currentSelectedLayerId === nextLayerId;
    const renderedLayerSegment = displayedLayerViewportGeometry.segments.find(
      (segment) => segment.layerId === nextLayerId
    );
    const fallbackLayerStartFrame = layerFrameMetadata.find(
      (layerMeta) => layerMeta.originalIndex === originalIndex
    )?.startFrame;
    const nextLayerSeekFrame = Number.isFinite(renderedLayerSegment?.frameStart)
      ? renderedLayerSegment.frameStart
      : fallbackLayerStartFrame;

    setSelectedLayerIndex(originalIndex);
    setSelectedLayer(layer);
    if (Number.isFinite(nextLayerSeekFrame)) {
      setCurrentLayerSeek(nextLayerSeekFrame);
    }
    openPopupLayerIdRef.current = nextLayerId;
    updateScenePopupPosition(nextLayerId, e.currentTarget?.getBoundingClientRect?.());
    setOpenPopupLayerIndex(originalIndex);

    if (isSameLayerSelection) {
      restoreSelectedLayerChrome(nextLayerId);
      return;
    }

    clearTrimDragBaseline();
    setPendingDuration(null);
    setDurationChanged(false);
  }

  if (visibleLayers.length > 0) {
    const renderLayers = (layersToRender, keyPrefix) => {
      const parentHeight = parentRef.current ? parentRef.current.clientHeight : 500; // Default height if null
      const layerHeightsInPixels = keyPrefix === 'current'
        ? visibleLayerPixelLayout.layerHeightsInPixels
        : buildLayerPixelLayout(
          layersToRender,
          visibleLayerDurationFramesById,
          parentHeight,
          DISPLAY_FRAMES_PER_SECOND,
        ).layerHeightsInPixels;

      return layersToRender.map((layer, index) => {
        const originalIndex = layers.findIndex((l) => l._id === layer._id);
        const layerDuration = layer.duration; // in seconds
        const layerHeightInPixels = layerHeightsInPixels[index] ?? 0;

        const layerSurfaceClass = selectedLayerIndex === originalIndex
          ? bgSelectedColor
          : layerRowBaseColor;

        const layerId = layer._id.toString();

        return (
          <Draggable
            key={layer._id}
            draggableId={layer._id.toString()}
            index={index}
            className="layer-draggable-item"
            isDragDisabled={isRenderPending}
          >
            {(provided, snapshot) => {
              const layerItem = (
                <div
                  ref={(el) => {
                    if (el) {
                      layerRefs.current[layerId] = el;
                    } else {
                      delete layerRefs.current[layerId];
                    }
                    provided.innerRef(el);
                  }}
                  {...provided.draggableProps}
                  data-scene-layer-body="true"
                  className={`layer-scene-item group ${layerSurfaceClass} ${index > 0 ? '-mt-px' : ''} ml-1 mr-1 cursor-pointer border relative overflow-hidden rounded-[3px] shadow-none`}
                  style={{
                    height: `${layerHeightInPixels}px`,
                    maxHeight: `${layerHeightInPixels}px`,
                    boxSizing: 'border-box', // Include borders in height
                    ...provided.draggableProps.style,
                  }}
                  onMouseDown={(e) => {
                    if (e.button !== 0) {
                      return;
                    }
                    setUserSelectedLayer(e, originalIndex, layer);
                  }}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
                      selectedLayerIndex === originalIndex
                        ? (colorMode === 'light' ? 'bg-sky-300/90' : 'bg-cyan-200/70')
                        : (colorMode === 'light' ? 'bg-white/80' : 'bg-slate-200/8')
                    }`}
                  />
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 h-px ${
                      selectedLayerIndex === originalIndex
                        ? (colorMode === 'light' ? 'bg-sky-500/80' : 'bg-cyan-300/80')
                        : (colorMode === 'light' ? 'bg-slate-300/95' : 'bg-[#41526a]')
                    }`}
                  />
                  {/* Labels */}
                  <div className='absolute top-1 left-1 text-xs'>
                    <div className='text-xs font-bold mb-4'>{originalIndex + 1}</div>
                    <div>{layerDuration ? layerDuration.toFixed(1) : '3'}s</div>
                  </div>
                  <div
                    {...provided.dragHandleProps}
                    data-layer-reorder-handle="true"
                    className='absolute right-0 top-0 h-full w-[14px] flex items-center justify-center cursor-grab active:cursor-grabbing z-20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    title='Drag to reorder scene'
                  >
                    <div className='h-[32px] w-[4px] rounded-full bg-slate-400/60 shadow-[0_0_12px_rgba(148,163,184,0.35)]' />
                  </div>
                </div>
              );

              // If the item is being dragged, render it into the portal
              if (snapshot.isDragging && portalNodeRef.current) {
                return ReactDOM.createPortal(layerItem, portalNodeRef.current);
              }

              // Otherwise, render it normally
              return layerItem;
            }}
          </Draggable>
        );
      });
    };



    // Update layersList rendering
    layersList = (
      <DragDropContext
        onDragStart={() => {
          setIsDragging(true);
          setHighlightBoundaries({ start: 0, height: 0 });
        }}
        onDragEnd={onDragEnd}
      >
        <Droppable droppableId="layersDroppable" direction="vertical">
          {(provided, snapshot) => (
            <div
              className='layers-container relative h-full w-full overflow-hidden'
              style={{
                position: 'relative',
                height: '100%',
                width: '100%',
              }}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {/* Current Layers */}
              <div
                className='current-layers absolute top-0 left-0 w-full h-full overflow-hidden'
                ref={currentLayersRef}
              >
                {renderLayers(visibleLayers, 'current')}
                {provided.placeholder}
              </div>

              {/* Incoming Layers */}
              {isAnimating && incomingVisibleLayers.length > 0 && (
                <div
                  className='incoming-layers absolute top-0 left-0 w-full h-full overflow-hidden'
                  ref={incomingLayersRef}
                >
                  {renderLayers(incomingVisibleLayers, 'incoming')}
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );

  }

  const showBatchLayerDialog = () => {
    openAlertDialog(
      <div>
        <FaTimes className='absolute top-2 right-2 cursor-pointer' onClick={closeAlertDialog} />
        <BatchPrompt
          submitPromptList={submitPromptList}
          defaultSceneDuration={defaultSceneDuration}
        />
      </div>
    );
  };

  const setAudioRangeSliderDisplayAsSelected = (selectedLayerId) => {
    // set all layhers as isDisplaySelected to false
    let newAudioLayers = audioTrackListDisplay.map(function (item) {
      if (item._id.toString() !== selectedLayerId) {
        return {
          ...item,
          isDisplaySelected: false,
        }
      } else {
        return {
          ...item,
          isDisplaySelected: true,
        }
      }
    });



    setSelectedAudioTrackDisplay(selectedLayerId);

    setAudioTrackListDisplay(newAudioLayers);

  }

  const setVisualTrackDisplayAsSelected = (selectedTrackKey) => {
    const selectedTrack = visualTrackListDisplay.find((track) => track.trackKey === selectedTrackKey);

    if (selectedTrack && Number.isInteger(selectedTrack.layerIndex)) {
      setSelectedLayerIndex(selectedTrack.layerIndex);
      setSelectedLayer(layers[selectedTrack.layerIndex]);
      setCurrentLayerSeek(selectedTrack.startFrame);
    }

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) => ({
        ...track,
        isDisplaySelected: track.trackKey === selectedTrackKey,
      }))
    );
  };

  const setVideoTrackDisplayAsSelected = (selectedLayerId) => {
    const selectedTrack = videoTrackListDisplay.find((track) => track.layerId === selectedLayerId);

    if (selectedTrack && Number.isInteger(selectedTrack.layerIndex)) {
      setSelectedLayerIndex(selectedTrack.layerIndex);
      setSelectedLayer(layers[selectedTrack.layerIndex]);
      setCurrentLayerSeek(selectedTrack.startFrame);
    }

    setVideoTrackListDisplay((previousVideoTracks) =>
      previousVideoTracks.map((track) => ({
        ...track,
        isDisplaySelected: track.layerId === selectedLayerId,
      }))
    );
  };

  const updateSelectedVideoEditRange = (nextRange) => {
    if (!selectedVideoTrack) {
      return;
    }

    const clampedRange = clampVideoEditRange(
      nextRange,
      selectedVideoTrack.durationFrames,
    );

    setVideoEditRangeByLayer((previousValue) => ({
      ...previousValue,
      [selectedVideoTrack.layerId]: clampedRange,
    }));
  };

  const applyVideoEditForTrack = async (track, toolConfig, rangeFrames) => {
    if (
      !track
      || track.videoEditPending
      || typeof requestVideoLayerEdit !== 'function'
      || !toolConfig
    ) {
      return {
        success: false,
        error: 'Choose a video action first.',
      };
    }

    const [startFrame, endFrame] = clampVideoEditRange(
      rangeFrames,
      track.durationFrames,
    );
    const { startTime, endTime } = getVideoEditOperationTimesFromFrames({
      startFrame,
      endFrame,
      durationFrames: track.durationFrames,
      durationSeconds: track.duration,
      displayFramesPerSecond: DISPLAY_FRAMES_PER_SECOND,
    });

    const nextOperation = {
      id: `video_edit_${Date.now()}_${Math.round(Math.random() * 100000)}`,
      type: toolConfig.type,
      startTime,
      endTime,
      speedMultiplier: toolConfig.type === 'SPEED'
        ? Math.max(2, Number(toolConfig.speedMultiplier) || 2)
        : 1,
    };

    return requestVideoLayerEdit({
      layerId: track.layerId,
      operations: [nextOperation],
    });
  };

  const applySelectedVideoEditSelection = async () => {
    if (!selectedVideoTrack || selectedVideoTrack.videoEditPending) {
      return {
        success: false,
        error: 'Wait for the current video update to finish before applying another change.',
      };
    }

    if (!selectedVideoActiveTool) {
      return {
        success: false,
        error: 'Choose a video action first.',
      };
    }

    const response = await applyVideoEditForTrack(
      selectedVideoTrack,
      selectedVideoActiveTool,
      selectedVideoRangeFrames,
    );

    if (response?.success) {
      setVideoEditDraftOperationsByLayer((previousValue) => ({
        ...previousValue,
        [selectedVideoTrack.layerId]: [],
      }));
    }

    return response;
  };

  const handleSelectedVideoToolChange = (toolConfig) => {
    if (!selectedVideoTrack || !toolConfig) {
      return;
    }

    const currentTool = videoActiveToolByLayer[selectedVideoTrack.layerId] || null;

    if (!areVideoEditToolsEqual(currentTool, toolConfig)) {
      ensureVideoEditRangeForTrack(selectedVideoTrack, currentLayerSeek);
    }

    setVideoActiveToolByLayer((previousValue) => {
      const currentLayerTool = previousValue[selectedVideoTrack.layerId] || null;

      if (areVideoEditToolsEqual(currentLayerTool, toolConfig)) {
        const nextValue = { ...previousValue };
        delete nextValue[selectedVideoTrack.layerId];
        return nextValue;
      }

      return {
        ...previousValue,
        [selectedVideoTrack.layerId]: toolConfig,
      };
    });
  };

  const updateSelectedVideoSpeedMultiplier = (nextMultiplier) => {
    if (!selectedVideoTrack) {
      return;
    }

    const sanitizedMultiplier = Math.min(
      VIDEO_EDIT_MAX_SPEED_MULTIPLIER,
      Math.max(
        VIDEO_EDIT_MIN_SPEED_MULTIPLIER,
        Math.round((Number(nextMultiplier) || VIDEO_EDIT_DEFAULT_SPEED_MULTIPLIER) * 100) / 100
      )
    );

    setVideoActiveToolByLayer((previousValue) => ({
      ...previousValue,
      [selectedVideoTrack.layerId]: {
        type: 'SPEED',
        speedMultiplier: sanitizedMultiplier,
      },
    }));
  };

  const handleSelectedVideoRangeCommit = (nextRange) => {
    if (!selectedVideoTrack) {
      return;
    }

    const clampedRange = clampVideoEditRange(
      nextRange,
      selectedVideoTrack.durationFrames,
    );
    updateSelectedVideoEditRange(clampedRange);
  };

  const queueSelectedVideoOperation = () => {
    if (!selectedVideoTrack || selectedVideoTrack.videoEditPending) {
      return {
        success: false,
        error: 'Wait for the current video update to finish before staging another change.',
      };
    }

    if (!selectedVideoActiveTool) {
      return {
        success: false,
        error: 'Choose a video action first.',
      };
    }

    const [startFrame, endFrame] = selectedVideoRangeFrames;
    if (endFrame <= startFrame) {
      return {
        success: false,
        error: 'Select a valid range first.',
      };
    }
    const { startTime, endTime } = getVideoEditOperationTimesFromFrames({
      startFrame,
      endFrame,
      durationFrames: selectedVideoTrack.durationFrames,
      durationSeconds: selectedVideoTrack.duration,
      displayFramesPerSecond: DISPLAY_FRAMES_PER_SECOND,
    });

    const nextOperation = {
      id: `video_edit_${Date.now()}_${Math.round(Math.random() * 100000)}`,
      type: selectedVideoActiveTool.type,
      startTime,
      endTime,
      speedMultiplier: selectedVideoActiveTool.type === 'SPEED'
        ? Math.max(
          VIDEO_EDIT_MIN_SPEED_MULTIPLIER,
          Number(selectedVideoActiveTool.speedMultiplier) || VIDEO_EDIT_DEFAULT_SPEED_MULTIPLIER
        )
        : 1,
    };

    const existingOperations = Array.isArray(videoEditDraftOperationsByLayer[selectedVideoTrack.layerId])
      ? videoEditDraftOperationsByLayer[selectedVideoTrack.layerId]
      : [];

    const overlapsExistingOperation = existingOperations.some((operation) => (
      nextOperation.startTime < Number(operation?.endTime || 0)
      && nextOperation.endTime > Number(operation?.startTime || 0)
    ));

    if (overlapsExistingOperation) {
      return {
        success: false,
        error: 'Staged video changes cannot overlap. Adjust the range or clear an existing staged change.',
      };
    }

    setVideoEditDraftOperationsByLayer((previousValue) => {
      const currentOperations = Array.isArray(previousValue[selectedVideoTrack.layerId])
        ? previousValue[selectedVideoTrack.layerId]
        : [];
      const nextOperations = [...currentOperations, nextOperation].sort(
        (leftOperation, rightOperation) => leftOperation.startTime - rightOperation.startTime
      );

      return {
        ...previousValue,
        [selectedVideoTrack.layerId]: nextOperations,
      };
    });

    return { success: true };
  };

  const removeSelectedVideoDraftOperation = (operationId) => {
    if (!selectedVideoTrack) {
      return;
    }

    setVideoEditDraftOperationsByLayer((previousValue) => ({
      ...previousValue,
      [selectedVideoTrack.layerId]: (
        Array.isArray(previousValue[selectedVideoTrack.layerId])
          ? previousValue[selectedVideoTrack.layerId]
          : []
      ).filter((operation) => operation.id !== operationId),
    }));
  };

  const clearSelectedVideoDraftOperations = () => {
    if (!selectedVideoTrack) {
      return;
    }

    setVideoEditDraftOperationsByLayer((previousValue) => ({
      ...previousValue,
      [selectedVideoTrack.layerId]: [],
    }));
  };

  const applySelectedVideoEditOperations = async () => {
    if (
      !selectedVideoTrack
      || selectedVideoTrack.videoEditPending
      || typeof requestVideoLayerEdit !== 'function'
      || selectedVideoDraftOperations.length === 0
    ) {
      return {
        success: false,
        error: 'Add at least one staged video change before clicking Apply.',
      };
    }

    const response = await requestVideoLayerEdit({
      layerId: selectedVideoTrack.layerId,
      operations: selectedVideoDraftOperations,
    });

    if (response?.success) {
      setVideoEditDraftOperationsByLayer((previousValue) => ({
        ...previousValue,
        [selectedVideoTrack.layerId]: [],
      }));
    }

    return response;
  };

  const updateVisualTrackFromSlider = (trackKey, startFrame, endFrame) => {
    const normalizedStartFrame = Math.round(startFrame);
    const normalizedEndFrame = Math.round(endFrame);

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) => {
        if (track.trackKey !== trackKey) {
          return {
            ...track,
            isDisplaySelected: false,
          };
        }

        const persistedStartFrame = Number.isFinite(track.persistedStartFrame)
          ? track.persistedStartFrame
          : track.startFrame;
        const persistedEndFrame = Number.isFinite(track.persistedEndFrame)
          ? track.persistedEndFrame
          : track.endFrame;

        return {
          ...track,
          startFrame: normalizedStartFrame,
          endFrame: normalizedEndFrame,
          startTime: normalizedStartFrame / DISPLAY_FRAMES_PER_SECOND,
          endTime: normalizedEndFrame / DISPLAY_FRAMES_PER_SECOND,
          duration: (normalizedEndFrame - normalizedStartFrame) / DISPLAY_FRAMES_PER_SECOND,
          isDirty:
            normalizedStartFrame !== persistedStartFrame
            || normalizedEndFrame !== persistedEndFrame,
          isSaving: false,
          saveError: null,
          isDisplaySelected: true,
        };
      })
    );
  };

  const saveVisualTrackTiming = async (trackKeyOrTrack, startFrame, endFrame) => {
    const targetTrack = typeof trackKeyOrTrack === 'string'
      ? visualTrackListDisplay.find((track) => track.trackKey === trackKeyOrTrack)
      : trackKeyOrTrack;
    if (!targetTrack || targetTrack.isSaving || typeof updateLayerVisualItem !== 'function') {
      return;
    }

    const targetTrackKey = targetTrack.trackKey;

    const resolvedStartFrame = Number.isFinite(startFrame)
      ? Math.round(startFrame)
      : targetTrack.startFrame;
    const resolvedEndFrame = Number.isFinite(endFrame)
      ? Math.round(endFrame)
      : targetTrack.endFrame;

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) =>
        track.trackKey === targetTrackKey
          ? {
            ...track,
            startFrame: resolvedStartFrame,
            endFrame: resolvedEndFrame,
            startTime: resolvedStartFrame / DISPLAY_FRAMES_PER_SECOND,
            endTime: resolvedEndFrame / DISPLAY_FRAMES_PER_SECOND,
            duration: (resolvedEndFrame - resolvedStartFrame) / DISPLAY_FRAMES_PER_SECOND,
            isSaving: true,
            saveError: null,
          }
          : track
      )
    );

    const response = await updateLayerVisualItem({
      layerId: targetTrack.layerId,
      itemId: targetTrack.id,
      startFrame: resolvedStartFrame,
      endFrame: resolvedEndFrame,
    });

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) =>
        track.trackKey === targetTrackKey
          ? {
            ...track,
            persistedStartFrame: response?.success ? resolvedStartFrame : track.persistedStartFrame,
            persistedEndFrame: response?.success ? resolvedEndFrame : track.persistedEndFrame,
            isDirty: response?.success ? false : track.isDirty,
            isSaving: false,
            saveError: response?.success ? null : 'Failed to save changes',
          }
          : track
      )
    );
  };

  const deleteSelectedVisualTrack = async (trackToDelete = selectedVisualTrack) => {
    if (!trackToDelete || trackToDelete.isSaving || typeof deleteLayerVisualItem !== 'function') {
      return;
    }

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) =>
        track.trackKey === trackToDelete.trackKey
          ? {
            ...track,
            isSaving: true,
            saveError: null,
          }
          : track
      )
    );

    const response = await deleteLayerVisualItem({
      layerId: trackToDelete.layerId,
      itemId: trackToDelete.id,
    });

    if (response?.success) {
      setVisualTrackListDisplay((prevVisualTracks) =>
        prevVisualTracks.filter((track) => track.trackKey !== trackToDelete.trackKey)
      );
      return;
    }

    setVisualTrackListDisplay((prevVisualTracks) =>
      prevVisualTracks.map((track) =>
        track.trackKey === trackToDelete.trackKey
          ? {
            ...track,
            isSaving: false,
            saveError: 'Failed to delete item',
          }
          : track
      )
    );
  };

  const setTextTrackDisplayAsSelected = (selectedTextItem) => {
    // Select the text track
    setSelectedTextTrackDisplay(selectedTextItem);
    // Clear any previously selected animation since we are now focusing on the text track level
    setSelectedAnimation(null);
  };

  const showAddedAudioTracks = () => {
    const [visibleStartFrame, visibleEndFrame] = displayedFrameRange;

    // Filter audio tracks within the visible range
    const visibleAudioLayers = audioTrackListDisplay.filter((audioTrack) => {
      const audioStartFrame = audioTrack.startTime * 30;
      const audioEndFrame = audioTrack.endTime * 30;
      const connectedLayerId = audioTrack?.connectedLayerId?.toString?.() || audioTrack?.connectedLayerId || null;

      if (connectedLayerId && !displayedVisibleLayerIdSet.has(connectedLayerId.toString())) {
        return false;
      }

      return audioEndFrame >= visibleStartFrame && audioStartFrame <= visibleEndFrame;
    });

    return visibleAudioLayers.map(function (audioTrack) {

      const audioStartFrame = audioTrack.startTime * 30;
      const audioEndFrame = audioTrack.endTime * 30;
      const audioTrackId = resolveAudioTrackId(audioTrack);
      const shouldShowTrackWaveform = Boolean(
        showSelectedAudioExtraOptionsToolbar
        && showVerticalWaveform
        && audioTrackId
        && audioWaveformVisibilityByTrackId[audioTrackId] !== false
      );
      const volumeAutomationPoints = buildAudioLayerVolumeAutomationPoints(audioTrack);

      let isStartVisible = audioStartFrame >= visibleStartFrame;
      let isEndVisible = audioEndFrame <= visibleEndFrame;

      return <AudioTrackSlider
        key={audioTrack._id}
        audioTrack={audioTrack}
        onUpdate={updateAudioLayerFromSlider}
        selectedFrameRange={displayedFrameRange}
        viewportGeometry={displayedLayerViewportGeometry}
        isStartVisible={isStartVisible}
        isEndVisible={isEndVisible}
        setAudioRangeSliderDisplayAsSelected={setAudioRangeSliderDisplayAsSelected}
        totalDuration={totalDuration}
        showWaveformOverlay={shouldShowTrackWaveform}
        visualizationMode={selectedAudioVisualizationMode}
        manualVolumeAdjustmentEnabled={Boolean(audioTrack.manualVolumeAdjustmentEnabled)}
        volumeAutomationPoints={volumeAutomationPoints}
        selectedVolumePointId={selectedAudioTrackId === audioTrackId ? selectedAudioVolumePointId : null}
        onSelectVolumePoint={(pointId) => {
          if (!audioTrackId) {
            return;
          }
          setAudioRangeSliderDisplayAsSelected(audioTrackId);
          setSelectedAudioVolumePointId(pointId);
        }}
        onCreateVolumePoint={(timeSeconds) => {
          if (!audioTrackId) {
            return;
          }
          handleAudioVolumePointCreate(audioTrackId, timeSeconds);
        }}
      />
    });
  };

  const showSelectedVisualTrack = () => {
    if (!selectedVisualTrack) {
      return <span />;
    }

    return (
      <SelectedVisualTrackDisplay
        selectedVisualTrack={selectedVisualTrack}
        onSave={saveVisualTrackTiming}
        onDelete={deleteSelectedVisualTrack}
      />
    );
  };

  const showSelectedVideoTrack = () => {
    if (!selectedVideoTrack) {
      return <span />;
    }

    return (
      <SelectedVideoTrackDisplay
        selectedVideoTrack={selectedVideoTrack}
        activeTool={selectedVideoActiveTool}
        onSelectTool={handleSelectedVideoToolChange}
        onSpeedMultiplierChange={updateSelectedVideoSpeedMultiplier}
        selectedRangeFrames={selectedVideoRangeFrames}
        draftOperations={selectedVideoDraftOperations}
        pendingOperations={selectedVideoPendingOperations}
        onApplySelection={applySelectedVideoEditSelection}
        onAddDraft={queueSelectedVideoOperation}
        onRemoveDraft={removeSelectedVideoDraftOperation}
        onClearDrafts={clearSelectedVideoDraftOperations}
        onApplyDrafts={applySelectedVideoEditOperations}
        isBusy={Boolean(
          selectedVideoTrack.videoEditPending
          || isUpdateLayerPending
          || isRenderPending
        )}
      />
    );
  };

  const visibleVideoTracks = useMemo(() => {
    const [visibleStartFrame, visibleEndFrame] = displayedFrameRange;

    return videoTrackListDisplay.filter((videoTrack) => (
      displayedVisibleLayerIdSet.has(videoTrack.layerId)
      && (
      videoTrack.endFrame >= visibleStartFrame
      && videoTrack.startFrame <= visibleEndFrame
      )
    ));
  }, [displayedFrameRange, displayedVisibleLayerIdSet, videoTrackListDisplay]);

  const showAddedVisualTracks = () => {
    const [visibleStartFrame, visibleEndFrame] = displayedFrameRange;

    const visibleVisualTracks = visualTrackListDisplay.filter((visualTrack) => (
      displayedVisibleLayerIdSet.has(visualTrack.layerId?.toString?.() || visualTrack.layerId)
      && (
      visualTrack.endFrame >= visibleStartFrame
      && visualTrack.startFrame <= visibleEndFrame
      )
    ));

    if (visibleVisualTracks.length === 0) {
      return (
        <div className="flex items-start px-3 py-4 text-[11px] text-slate-400">
          No image or shape items in the visible range.
        </div>
      );
    }

    return visibleVisualTracks.map((visualTrack) => {
      const isStartVisible = visualTrack.startFrame >= visibleStartFrame;
      const isEndVisible = visualTrack.endFrame <= visibleEndFrame;

      return (
        <VisualTrackDisplay
          key={visualTrack.trackKey}
          visualTrackItem={visualTrack}
          onUpdate={updateVisualTrackFromSlider}
          selectedFrameRange={displayedFrameRange}
          viewportGeometry={displayedLayerViewportGeometry}
          isDisplaySelected={Boolean(visualTrack.isDisplaySelected)}
          isStartVisible={isStartVisible}
          isEndVisible={isEndVisible}
          parentLayerStartFrame={visualTrack.parentLayerStartFrame}
          parentLayerEndFrame={visualTrack.parentLayerEndFrame}
          setVisualTrackDisplayAsSelected={setVisualTrackDisplayAsSelected}
        />
      );
    });
  };

  const showAddedVideoTracks = () => {
    if (visibleVideoTracks.length === 0) {
      return (
        <div className="flex items-start px-3 py-4 text-[11px] text-slate-400">
          No video layers in the visible range.
        </div>
      );
    }

    return visibleVideoTracks.map((videoTrack) => {
      const combinedOperationDisplayList = [
        ...(videoDraftDisplayByLayer[videoTrack.layerId] || []),
        ...(Array.isArray(videoTrack.pendingOperations) ? videoTrack.pendingOperations : []),
      ].sort((leftOperation, rightOperation) => leftOperation.startFrame - rightOperation.startFrame);

      return (
        <React.Fragment key={videoTrack.trackKey}>
          <VideoTrackDisplay
            videoTrackItem={videoTrack}
            selectedFrameRange={displayedFrameRange}
            visibleLayerLayout={visibleLayerLayoutById[videoTrack.layerId] || null}
            isDisplaySelected={Boolean(videoTrack.isDisplaySelected)}
            showSelectionHandles={Boolean(
              videoTrack.isDisplaySelected
              && selectedVideoActiveTool
              && selectedVideoTrack?.layerId === videoTrack.layerId
            )}
            setVideoTrackDisplayAsSelected={setVideoTrackDisplayAsSelected}
            operationDisplayList={combinedOperationDisplayList}
            selectedLocalRangeFrames={selectedVideoRangeFrames}
            onSelectionChange={updateSelectedVideoEditRange}
            onSelectionCommit={handleSelectedVideoRangeCommit}
            isBusy={Boolean(
              videoTrack.videoEditPending
              || isUpdateLayerPending
              || isRenderPending
            )}
          />
        </React.Fragment>
      );
    });
  };

  // Inside FrameToolbar.js

  const showAddedTextTracks = () => {
    const [visibleStartFrame, visibleEndFrame] = displayedFrameRange;

    let textItemLayers = [];

    let visibleLayersWithTextItems = visibleLayers.filter((layer) => {
      let layerActiveItems = layer.imageSession.activeItemList;


      if (layerActiveItems && layerActiveItems.length > 0) {
        let layerTextItems = layerActiveItems.filter((item) => {
          if (item.type === 'text' && item.subType !== 'subtitle') {



            if (typeof item.startFrame === 'undefined' || typeof item.endFrame === 'undefined') {
              item.startFrame = layer.durationOffset * 30;
              item.endFrame = (layer.durationOffset + layer.duration) * 30;
            }
            const itemStartFrame = Math.round(Number(item.startFrame) || 0);
            const itemEndFrame = Math.max(
              itemStartFrame + 1,
              Math.round(Number(item.endFrame) || itemStartFrame + 1),
            );

            if (itemEndFrame < visibleStartFrame || itemStartFrame > visibleEndFrame) {
              return false;
            }
            const layerStartTime = layer.durationOffset;
            const layerEndTime = layer.durationOffset + layer.duration;
            const parentLayerStartFrame = layerStartTime * 30;
            const parentLayerEndFrame = layerEndTime * 30;
            const textItemObject = {
              ...item,
              startFrame: itemStartFrame,
              endFrame: itemEndFrame,
              layerId: layer._id,
              parentLayerStartFrame: parentLayerStartFrame,
              parentLayerEndFrame: parentLayerEndFrame,
            }
            textItemLayers.push(textItemObject);
            return true;
          }
        });

        if (layerTextItems && layerTextItems.length > 0) {
          return true;

        }


      }
    });

    if (textItemLayers.length === 0) {
      return (
        <div className="flex items-start px-3 py-4 text-[11px] text-slate-400">
          No text items in the visible range.
        </div>
      );
    }

    return textItemLayers.map((textItemLayer, index) => {
      let isTextTrackSelected = false;
      if (textItemLayer && selectedTextTrackDisplay && textItemLayer.layerId === selectedTextTrackDisplay.layerId && textItemLayer.id === selectedTextTrackDisplay.id) {
        isTextTrackSelected = true;
      }

      return <TextTrackDisplay
        key={`text_item_${index}`}
        textItemLayer={textItemLayer}
        totalDuration={totalDuration}
        selectedFrameRange={displayedFrameRange}
        viewportGeometry={displayedLayerViewportGeometry}

        setTextTrackDisplayAsSelected={setTextTrackDisplayAsSelected}
        newSelectedTextAnimation={newSelectedTextAnimation}
        showTextTrackAnimations={showTextTrackAnimations}
        isDisplaySelected={isTextTrackSelected}
        onUpdate={updateTextItemTime}
        handleSaveChanges={handleSaveChanges}
        onAnimationSelect={onAnimationSelect}
        updateTrackAnimationBoundariesForTextLayer={updateTrackAnimationBoundariesForTextLayer}
        parentLayerStartFrame={textItemLayer.parentLayerStartFrame}
        parentLayerEndFrame={textItemLayer.parentLayerEndFrame}
      />

    });


  };




  const updateTextItemTime = (newStartTime, newEndTime) => {


    const newStartFrame = Math.ceil(newStartTime * 30);
    const newEndFrame = Math.ceil(newEndTime * 30);

    if (!selectedTextTrackDisplay) {
      return;
    }

    let currentSelectedTextLayer = _.cloneDeep(selectedTextTrackDisplay);



    currentSelectedTextLayer.startFrame = newStartFrame;
    currentSelectedTextLayer.endFrame = newEndFrame;
    currentSelectedTextLayer.startTime = newStartTime;
    currentSelectedTextLayer.endTime = newEndTime;

    setSelectedTextTrackDisplay(currentSelectedTextLayer);

    const selectedTextLayerId = currentSelectedTextLayer.layerId;

    const selectedTextItemId = currentSelectedTextLayer.id;

    let selectedTextLayer = _.cloneDeep(layers.find((layer) => layer._id === selectedTextLayerId));
    let selectedTextLayerActiveItemList = _.cloneDeep(selectedTextLayer.imageSession.activeItemList);

    let selectedTextItemIndexInActiveItemList = selectedTextLayerActiveItemList.findIndex((item) => item.id === selectedTextItemId);


    if (selectedTextItemIndexInActiveItemList > -1) {

      let updatedItem = _.cloneDeep(selectedTextLayerActiveItemList[selectedTextItemIndexInActiveItemList]);
      updatedItem.startFrame = newStartFrame;
      updatedItem.endFrame = newEndFrame;
      updatedItem.startTime = newStartTime;
      updatedItem.endTime = newEndTime;
      selectedTextLayerActiveItemList[selectedTextItemIndexInActiveItemList] = updatedItem;
      selectedTextLayer.imageSession.activeItemList = selectedTextLayerActiveItemList;


      setPendingLayerUpdates([selectedTextLayer]);
    }

  }

  const handleSaveChanges = () => {


    // Apply pending changes to backend/store
    if (pendingLayerUpdates && pendingLayerUpdates.length > 0) {
      // For simplicity, assume we only need to update one layer at a time
      // If multiple changes are accumulated, handle them accordingly
      // If pendingLayerUpdates is a full array of layers (all updated), call updateSessionLayer for each updated layer:
      pendingLayerUpdates.forEach((lyr) => {


        updateSessionLayer(lyr);
      });
      setPendingLayerUpdates([]); // Clear pending changes after save
    }
  };





  const submitPromptList = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const promptList = formData.get('promptList');
    const promptListArray = promptList
      .split('\n')
      .filter((prompt) => prompt.trim() !== '');
    const duration = formData.get('duration');
    const payload = {
      promptList: promptListArray,
      duration: duration,
    };
    addLayersViaPromptList(payload);
    closeAlertDialog();
  };

  const isExpandedToolbarView = frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED;
  const timeRulerWidthPx = isExpandedToolbarView ? 54 : 34;
  const timelineRailStyle = {
    '--time-ruler-width': `${timeRulerWidthPx}px`,
    '--time-ruler-padding-x': isExpandedToolbarView ? '2px' : '1px',
    '--time-ruler-gap': isExpandedToolbarView ? '4px' : '2px',
    '--time-ruler-mark-width': isExpandedToolbarView ? '8px' : '5px',
    '--time-ruler-font-size': isExpandedToolbarView ? '10px' : '9px',
  };
  const collapsedToolbarWidth = 'min(10vw, 128px)';
  const frameToolbarInsetStyle = {
    left: '16px',
    top: '56px',
    bottom: '0px',
  };
  let containerWdidth = 'z-1 opacity-100';
  if (isExpandedToolbarView) {
    containerWdidth = 'min-w-[50%] max-w-[90%] z-[102]';
  } else {
    frameToolbarInsetStyle.width = collapsedToolbarWidth;
  }

  let trackViewDisplay = <span />;
  let selectedTrackViewDisplay = <span />;

  if (isExpandedToolbarView) {
    if (currentLayerActionSuperView === 'SETTINGS') {
      trackViewDisplay = <span />;
      selectedTrackViewDisplay = <span />;
    }
    if (currentLayerActionSuperView === 'AUDIO') {
      trackViewDisplay = showAddedAudioTracks();
      selectedTrackViewDisplay = showSelectedAudioTrack();
    }
    if (currentLayerActionSuperView === 'VIDEO') {
      trackViewDisplay = (
        <div className='text-track-container'>
          {showAddedVideoTracks()}
        </div>
      );
      selectedTrackViewDisplay = showSelectedVideoTrack();
    }
    if (currentLayerActionSuperView === 'IMAGE') {
      trackViewDisplay = (
        <div className='text-track-container'>
          {showAddedVisualTracks()}
        </div>
      );
      selectedTrackViewDisplay = showSelectedVisualTrack();
    }
    if (currentLayerActionSuperView === 'TEXT') {
      trackViewDisplay = (
        <div className='text-track-container'>
          {showAddedTextTracks()}
        </div>
      );
      selectedTrackViewDisplay = showSelectedTextTrack();
    }
  }

  const collapsedToggleSurface =
    colorMode === 'dark'
      ? 'bg-[#111a2f]/78 text-slate-100 border border-[#1f2a3d]/90 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md'
      : 'bg-white/80 text-slate-700 border border-slate-200 shadow-sm backdrop-blur-md';
  const expandedToggleSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629]/78 text-slate-100 border border-[#1f2a3d]/90 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-md'
      : 'bg-white/80 text-slate-700 border border-slate-200 shadow-sm backdrop-blur-md';
  let expandButtonLabel = (
    <button
      type="button"
      onClick={toggleShowExpandedTrackView}
      className={`inline-flex h-[40px] w-[24px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-150 ${collapsedToggleSurface}`}
      aria-label="Expand toolbar"
      title="Expand toolbar"
    >
      <FaChevronRight className='text-[11px]' />
    </button>
  );

  const [showUpdateLayerPortal, setShowUpdateLayerPortal] = useState(true);

  const toggleViewSceneUpdate = () => {
    setShowUpdateLayerPortal(!showUpdateLayerPortal);
  };

  if (isExpandedToolbarView) {
    expandButtonLabel = (
      <button
        type="button"
        onClick={toggleShowExpandedTrackView}
        className={`inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150 ${expandedToggleSurface}`}
      >
        <FaChevronLeft className='text-[11px]' />
        <span>Collapse</span>
      </button>
    );
  }

  const textActiveColor = showUpdateLayerPortal
    ? (colorMode === 'dark' ? 'text-slate-100' : 'text-indigo-600')
    : (colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500');
  const sceneCardClassName = colorMode === 'dark'
    ? 'bg-[#0f172a]/70 border border-[#1f2a3d]/90 text-slate-100'
    : 'bg-white/70 border border-slate-200/90 text-slate-700 shadow-sm';
  const panelSectionClassName = colorMode === 'dark'
    ? 'bg-[#111a2f]/58 border border-[#1f2a3d]/90'
    : 'bg-white/58 border border-slate-200/90 shadow-sm';
  const sceneButtonClassName = colorMode === 'dark'
    ? 'inline-flex cursor-pointer rounded-md px-1.5 py-1 text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-50'
    : 'inline-flex cursor-pointer rounded-md px-1.5 py-1 text-slate-600 transition hover:bg-slate-200/80 disabled:opacity-50';
  const gridToggleClassName = colorMode === 'dark'
    ? 'inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200 shadow-[0_12px_28px_rgba(2,6,23,0.34)] backdrop-blur-md transition hover:border-cyan-400/30'
    : 'inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-md transition hover:border-sky-300/70';
  const gridToggleInputClassName = colorMode === 'dark'
    ? 'h-4 w-4 rounded border-slate-600 bg-slate-900/90 text-cyan-400 focus:ring-2 focus:ring-cyan-400/35 focus:ring-offset-0'
    : 'h-4 w-4 rounded border-slate-300 bg-white text-sky-500 focus:ring-2 focus:ring-sky-400/35 focus:ring-offset-0';
  const dropdownButtonDisplay = (
    <DropdownButton
      addLayerToComposition={addLayerToComposition}
      copyCurrentLayerBelow={copyCurrentLayerBelow}
      showBatchLayerDialog={showBatchLayerDialog}
      buttonLabel="Layer"
      compact={true}
      menuAlign={isExpandedToolbarView ? 'right' : 'left'}
      fullWidth={!isExpandedToolbarView}
      fitMenuToTrigger={!isExpandedToolbarView}
    />
  );

  const toolbarHeaderControls = (
    <div
      className='flex w-full items-center gap-1.5'
      onClick={(event) => event.stopPropagation()}
    >
      <div className={`min-w-0 ${isExpandedToolbarView ? 'shrink-0' : 'flex-1'} ${disabledMenuClass}`}>
        {dropdownButtonDisplay}
      </div>
      <div className='shrink-0'>
        {expandButtonLabel}
      </div>
    </div>
  );

  let topSubToolbar = <span />;

  let showGridsView = <span />;
  if (isExpandedToolbarView) {
    showGridsView = (
      <label className={gridToggleClassName}>
        <input
          type="checkbox"
          className={gridToggleInputClassName}
          checked={isGridVisible}
          onChange={(e) => setIsGridVisible(e.target.checked)}
        />
        <span>Grid</span>
      </label>
    );
  }

  const formatGridSnapPointLabel = (frame) => {
    const totalSeconds = Math.max(0, displayFramesToSeconds(frame));

    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(1).padStart(4, '0');
      return `${minutes}:${seconds}`;
    }

    return `${totalSeconds.toFixed(totalSeconds >= 10 ? 1 : 2)}s`;
  };

  const rememberGridSnapPoint = (frame) => {
    const nextFrame = Math.round(
      Number.isFinite(frame) ? frame : clampedLayerSeek
    );

    setGridSnapPoints((previousPoints) => {
      if (previousPoints.some((snapPoint) => (
        Math.abs(snapPoint.frame - nextFrame) <= GRID_SNAP_TOLERANCE_FRAMES
      ))) {
        return previousPoints;
      }

      const nextPoints = [
        ...previousPoints,
        {
          id: `grid_snap_${Date.now()}_${nextFrame}`,
          frame: nextFrame,
        },
      ].sort((leftPoint, rightPoint) => leftPoint.frame - rightPoint.frame);

      if (nextPoints.length <= MAX_GRID_SNAP_POINTS) {
        return nextPoints;
      }

      return nextPoints.slice(nextPoints.length - MAX_GRID_SNAP_POINTS);
    });
  };

  const removeGridSnapPoint = (snapPointId) => {
    setGridSnapPoints((previousPoints) => (
      previousPoints.filter((snapPoint) => snapPoint.id !== snapPointId)
    ));
  };

  const seekToGridSnapPoint = (frame) => {
    handleSeekBarChange(Math.round(frame));
  };

  let expandedTopRowActionDisplay = <span />;
  let expandedBottomRowActionDisplay = <span />;

  const isAnonymousGuest = !user?._id;
  const resolvedDownloadLink = renderedVideoPath || downloadLink;
  const hasExistingRender = Boolean(resolvedDownloadLink);
  const canCancelPendingRender = Boolean(isRenderPending && typeof cancelPendingRender === 'function');
  const hasPendingSceneChanges = Boolean(isCanvasDirty);
  const shouldShowDropdown = !isAnonymousGuest && hasExistingRender && !canCancelPendingRender;
  const shouldDownloadOnMain = (
    !canCancelPendingRender
    && !hasPendingSceneChanges
    && renderCompletedThisSession
    && hasExistingRender
  );
  const dropdownMainLabel = shouldDownloadOnMain ? "Download" : "Render";

  let prevDownloadLink = <span />;

  if (resolvedDownloadLink) {
    const dateNowStr = new Date().toISOString().replace(/:/g, '-');
    prevDownloadLink = (
      <SecondaryButton extraClasses='!m-0'>
        <a
          href={resolvedDownloadLink}
          download={`Rendition_${dateNowStr}.mp4`}
          className='text-xs underline'
        >
          <FaDownload className='inline-flex' /> Previous
        </a>
      </SecondaryButton>
    );
  }

  let renderButtonExtraClasss = '';
  if (isVideoGenerating) {
    renderButtonExtraClasss = '!pl-4 !pr-4';
  }
  const isRenderActionDisabled = Boolean(isUpdateLayerPending || isRenderPending);
  const shouldShowRenderPendingSpinner = Boolean(isVideoGenerating);





  const extraProps = {
    sessionId: sessionId,
  }

  const showPublishOptionsDialog = () => {

    openAlertDialog(
      <div>

        <div>
          <FaTimes
            className='absolute right-2 top-2 cursor-pointer'
            onClick={closeAlertDialog}
          />
        </div>
        <PublishOptionsDialog
          onClose={closeAlertDialog}

          onSubmit={(payload) => {
            // On form submit, close the dialog
            closeAlertDialog();

            // Then call your publish logic with these values
            publishVideoSession(payload);
          }}
          extraProps={extraProps}
        />
      </div>
    );
  };

  let additionalActionToolbar = <span />;
  if (resolvedDownloadLink) {
    // additionalActionToolbar = (
    //   <div className='mt-2'>
    //     <div >
    //       <SecondaryButton onClick={publishVideoSession} >
    //         Publish
    //       </SecondaryButton>
    //     </div>
    //   </div>
    // )
  }

  const submitDownloadVideo = () => {
    if (!resolvedDownloadLink) {
      return;
    }
    const a = document.createElement('a');
    a.href = resolvedDownloadLink;
    a.download = `Rendition_${new Date().toISOString()}.mp4`;
    a.click();

  }

  const dropdownItems = [];
  if (shouldDownloadOnMain) {
    dropdownItems.push({
      label: "Render again",
      onClick: submitRenderVideo,
    });
  } else if (resolvedDownloadLink) {
    dropdownItems.push({
      label: "Download",
      onClick: submitDownloadVideo,
    });
  }

  if (isSessionPublished) {
    dropdownItems.push({
      label: "Unpublish",
      onClick: () => {
        if (typeof unpublishVideoSession === 'function') {
          unpublishVideoSession();
        }
      },
    });
  } else {
    dropdownItems.push({
      label: "Publish",
      onClick: () => {
        // open your Publish dialog
        showPublishOptionsDialog();
      },
    });
  }

  let submitRenderDisplay = (
    <div>
      <CommonButton
        onClick={submitRenderVideo}
        isPending={shouldShowRenderPendingSpinner}
        isDisabled={isRenderActionDisabled}
        extraClasses={renderButtonExtraClasss}
      >
        Render
      </CommonButton>
    </div>
  );

  let btnLeftMargin = 'ml-1';

  if (canCancelPendingRender) {
    const cancelButtonClasses = colorMode === 'light'
      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
      : 'border border-[#31405e] bg-[#111a2f] text-slate-200 hover:bg-[#16213a]';
    submitRenderDisplay = (
      <div className='inline-flex items-center gap-2'>
        <div>
          <CommonButton
            onClick={submitRenderVideo}
            isPending={shouldShowRenderPendingSpinner}
            isDisabled={true}
            extraClasses={renderButtonExtraClasss}
          >
            Render
          </CommonButton>
        </div>
        <button
          type="button"
          onClick={cancelPendingRender}
          className={`inline-flex items-center justify-center rounded-lg px-2 py-2 shadow-[0_6px_14px_rgba(3,12,28,0.2)] transition-all duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 ${cancelButtonClasses}`}
          title="Cancel render"
          aria-label="Cancel render"
        >
          <FaTimes />
        </button>
      </div>
    );
  } else if (isAnonymousGuest && resolvedDownloadLink) {
    submitRenderDisplay = (
      <div>
        <PublicPrimaryButton
          onClick={submitDownloadVideo}
          isPending={shouldShowRenderPendingSpinner}
          isDisabled={isRenderActionDisabled}
          extraClasses={renderButtonExtraClasss}
        >
          Download
        </PublicPrimaryButton>
      </div>
    )
    btnLeftMargin = 'ml-0';
  } else if (shouldShowDropdown) {
    submitRenderDisplay = (
      <div className="relative inline-block text-left">
        <CommonDropdownButton
          mainLabel={dropdownMainLabel}
          onMainClick={shouldDownloadOnMain ? submitDownloadVideo : submitRenderVideo}
          isPending={shouldShowRenderPendingSpinner}
          isDisabled={isRenderActionDisabled}
          dropdownItems={dropdownItems}
          extraClasses="my-extra-class-names"
        />
      </div>
    );
  }


  let submitRenderFullActionDisplay = submitRenderDisplay;

  const showAdditionOptionsDialog = () => {
    openAlertDialog(
      <div>
        <div>
          <FaTimes
            className='absolute right-2 top-2 cursor-pointer'
            onClick={closeAlertDialog}
          />
        </div>
        <AudioOptionsDialog
          regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
          requestRealignLayers={requestRealignLayers}
          applyAudioDucking={applyAudioDucking}
          onApplyAudioDuckingChange={onApplyAudioDuckingChange}
          closeDialog={closeAlertDialog}
        />
      </div>
    );
  };

  const additionalOptionsDropdownItems = [
    {
      label: showVerticalWaveform ? 'Hide Layer Waveforms' : 'Show Layer Waveforms',
      onClick: () => setShowVerticalWaveform(!showVerticalWaveform),
    },
  ];

  const expandedTopSecondaryActionDisplay = (
    <div className='flex flex-wrap items-center gap-2'>
      <SecondaryButton onClick={submitRegenerateFrames} extraClasses='!m-0 !px-2 !py-1 text-xs'>
        <div>
          {' '}
          <FaRedo className='inline-flex' /> frames
        </div>
      </SecondaryButton>

      {prevDownloadLink}

      <CommonDropdownButton
        mainLabel="Additional Options"
        onMainClick={showAdditionOptionsDialog}
        isPending={false}
        isDisabled={false}
        allowAnonymous={true}
        compact={true}
        dropdownItems={additionalOptionsDropdownItems}
        extraClasses="!m-0"
      />
    </div>
  );

  const settingsStatLabelClassName = colorMode === 'dark'
    ? 'text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400'
    : 'text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500';
  const settingsStatValueClassName = colorMode === 'dark'
    ? 'mt-1 text-sm font-semibold text-slate-100'
    : 'mt-1 text-sm font-semibold text-slate-900';
  const settingsHintClassName = colorMode === 'dark'
    ? 'text-[11px] text-slate-400'
    : 'text-[11px] text-slate-500';
  const settingsToggleRowClassName = colorMode === 'dark'
    ? 'flex items-center justify-between gap-3 rounded-xl border border-[#24324a] bg-[#0f172a]/70 px-3 py-2 text-sm text-slate-100'
    : 'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700';
  const settingsPillBaseClassName = 'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold transition';
  const settingsPillActiveClassName = colorMode === 'dark'
    ? 'bg-cyan-400 text-[#041420]'
    : 'bg-sky-500 text-white';
  const settingsPillIdleClassName = colorMode === 'dark'
    ? 'bg-[#111a2f] text-slate-300 hover:bg-[#16213a]'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  const settingsActionButtonClasses = colorMode === 'dark'
    ? 'inline-flex items-center justify-center rounded-xl border border-[#2a3953] bg-[#111a2f]/82 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-[#17223a]'
    : 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100';
  const settingsSummaryCardClassName = `${panelSectionClassName} rounded-2xl p-3`;
  const promptDropdownSurfaceClassName = colorMode === 'dark'
    ? 'border border-[#24324a] bg-[#08111d]/95 text-slate-100 shadow-[0_18px_45px_rgba(0,0,0,0.45)]'
    : 'border border-slate-200 bg-white/98 text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.18)]';
  const selectedSceneLabel = selectedLayerIndex >= 0
    ? `Scene ${selectedLayerIndex + 1}`
    : 'No scene selected';
  const activeSceneTransitionPreset = SCENE_TRANSITION_PRESET_OPTIONS.some(
    (option) => option.value === sceneTransitionPreset
  )
    ? sceneTransitionPreset
    : 'none';
  const settingsViewRangeLabel = hasUsableFrameRange
    ? `${displayFramesToSeconds(safeViewRange[0]).toFixed(1)}s - ${displayFramesToSeconds(safeViewRange[1]).toFixed(1)}s`
    : 'Unavailable';
  const sessionSyncStatus = isRenderPending
    ? 'Rendering'
    : isUpdateLayerPending
      ? 'Updating'
      : hasPendingSceneChanges
        ? 'Pending changes'
        : 'Ready';
  const settingsTrackViewDisplay = (
    <div className='text-track-container'>
      <div className='flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-y-auto px-3 py-3'>
        <div className='grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4'>
          <div className={settingsSummaryCardClassName}>
            <div className={settingsStatLabelClassName}>Scene</div>
            <div className={settingsStatValueClassName}>{selectedSceneLabel}</div>
          </div>
          <div className={settingsSummaryCardClassName}>
            <div className={settingsStatLabelClassName}>Scenes Total</div>
            <div className={settingsStatValueClassName}>{layers.length}</div>
          </div>
          <div className={settingsSummaryCardClassName}>
            <div className={settingsStatLabelClassName}>Timeline</div>
            <div className={settingsStatValueClassName}>{totalDuration.toFixed(1)}s</div>
          </div>
          <div className={settingsSummaryCardClassName}>
            <div className={settingsStatLabelClassName}>Status</div>
            <div className={settingsStatValueClassName}>{sessionSyncStatus}</div>
          </div>
        </div>

        <div className='grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'>
          <div className={`${settingsSummaryCardClassName} min-w-0`}>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <div className={settingsStatLabelClassName}>Workspace</div>
                <div className={settingsStatValueClassName}>Editor Options</div>
              </div>
              <div className={settingsHintClassName}>
                View range {settingsViewRangeLabel}
              </div>
            </div>

            <div className='mt-3 grid min-w-0 gap-2'>
              <div className={settingsToggleRowClassName}>
                <div>
                  <div>Scene transitions</div>
                  <div className={settingsHintClassName}>Centered across each scene cut during render.</div>
                </div>
                <div className='flex flex-wrap items-center justify-end gap-2'>
                  {SCENE_TRANSITION_PRESET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${settingsPillBaseClassName} ${activeSceneTransitionPreset === option.value ? settingsPillActiveClassName : settingsPillIdleClassName}`}
                      onClick={() => onSceneTransitionPresetChange?.(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className={settingsToggleRowClassName}>
                <div>
                  <div>Timeline grid</div>
                  <div className={settingsHintClassName}>Add timing guides behind the layer lanes.</div>
                </div>
                <input
                  type="checkbox"
                  className={gridToggleInputClassName}
                  checked={isGridVisible}
                  onChange={(event) => setIsGridVisible(event.target.checked)}
                />
              </label>

              <label className={settingsToggleRowClassName}>
                <div>
                  <div>Scene quick editor</div>
                  <div className={settingsHintClassName}>Open inline scene controls beside the selected scene.</div>
                </div>
                <input
                  type="checkbox"
                  className={gridToggleInputClassName}
                  checked={showUpdateLayerPortal}
                  onChange={(event) => setShowUpdateLayerPortal(event.target.checked)}
                />
              </label>

              <label className={settingsToggleRowClassName}>
                <div>
                  <div>Show layer waveforms</div>
                  <div className={settingsHintClassName}>Display a waveform or spectral strip beside each enabled audio layer.</div>
                </div>
                <input
                  type="checkbox"
                  className={gridToggleInputClassName}
                  checked={showVerticalWaveform}
                  onChange={(event) => {
                    const nextValue = Boolean(event.target.checked);
                    setShowVerticalWaveform(nextValue);
                    if (nextValue && !showSelectedAudioExtraOptionsToolbar) {
                      setShowSelectedAudioExtraOptionsToolbar(true);
                    }
                  }}
                />
              </label>

              <label className={settingsToggleRowClassName}>
                <div>
                  <div>Enable audio ducking</div>
                  <div className={settingsHintClassName}>Lower music and background layers under speech or narration.</div>
                </div>
                <input
                  type="checkbox"
                  className={gridToggleInputClassName}
                  checked={Boolean(applyAudioDucking)}
                  onChange={(event) => onApplyAudioDuckingChange(event.target.checked)}
                />
              </label>
            </div>

            {showVerticalWaveform ? (
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <span className={settingsHintClassName}>Waveform style</span>
                <button
                  type="button"
                  className={`${settingsPillBaseClassName} ${selectedAudioVisualizationMode === 'waveform' ? settingsPillActiveClassName : settingsPillIdleClassName}`}
                  onClick={() => setSelectedAudioVisualizationMode('waveform')}
                >
                  Waveform
                </button>
                <button
                  type="button"
                  className={`${settingsPillBaseClassName} ${selectedAudioVisualizationMode === 'spectrogram' ? settingsPillActiveClassName : settingsPillIdleClassName}`}
                  onClick={() => setSelectedAudioVisualizationMode('spectrogram')}
                >
                  Spectrogram
                </button>
              </div>
            ) : null}

            {showVerticalWaveform && !selectedAudioTrack ? (
              <div className='mt-3 rounded-xl border border-dashed border-slate-400/30 px-3 py-2 text-[11px] text-slate-400'>
                Waveform lanes appear beside each enabled audio layer in the Audio tab.
              </div>
            ) : null}
          </div>

          <div className={`${settingsSummaryCardClassName} min-w-0`}>
            <div className={settingsStatLabelClassName}>Legacy Actions</div>
            <div className={settingsStatValueClassName}>Session Harnesses</div>

            <div className='mt-3 flex flex-wrap gap-2'>
              <SecondaryButton onClick={submitRegenerateFrames} extraClasses='!m-0 !px-3 !py-2 text-xs'>
                <div>
                  <FaRedo className='inline-flex' /> Regenerate Frames
                </div>
              </SecondaryButton>

              <button
                type="button"
                className={settingsActionButtonClasses}
                onClick={showAdditionOptionsDialog}
              >
                Audio Options
              </button>

              {resolvedDownloadLink ? (
                <button
                  type="button"
                  className={settingsActionButtonClasses}
                  onClick={submitDownloadVideo}
                >
                  Download Render
                </button>
              ) : null}
            </div>

            <div className='mt-4 grid gap-2'>
              <div className={settingsToggleRowClassName}>
                <span>Default scene duration</span>
                <span className='font-semibold'>{defaultSceneDuration || 0}s</span>
              </div>
              <div className={settingsToggleRowClassName}>
                <span>Scene transition</span>
                <span className='font-semibold'>
                  {SCENE_TRANSITION_PRESET_OPTIONS.find((option) => option.value === activeSceneTransitionPreset)?.label || 'None'}
                </span>
              </div>
              <div className={settingsToggleRowClassName}>
                <span>Timeline FPS</span>
                <span className='font-semibold'>{framesPerSecond}</span>
              </div>
              <div className={settingsToggleRowClassName}>
                <span>Current render</span>
                <span className='font-semibold'>{hasExistingRender ? 'Available' : 'Not rendered yet'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isExpandedToolbarView && currentLayerActionSuperView === 'SETTINGS') {
    trackViewDisplay = settingsTrackViewDisplay;
  }

  if (isExpandedToolbarView) {
    submitRenderFullActionDisplay = (
      <div className='inline-flex max-w-full flex-wrap items-center gap-2'>
        <div className='inline-flex shrink-0'>
          {submitRenderDisplay}
        </div>
        <div className={`inline-flex shrink-0 ${disabledMenuClass}`}>
          {dropdownButtonDisplay}
        </div>
      </div>
    );
    topSubToolbar = <span />;
    if (currentLayerActionSuperView === 'SETTINGS') {
      expandedTopRowActionDisplay = (
        <div className='flex max-w-full flex-wrap items-center justify-end gap-1.5'>
          <div className={`inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold ${sceneCardClassName}`}>
            <span>Scenes</span>
            <button
              type="button"
              className={sceneButtonClassName}
              onClick={canGoPrev ? handlePrevClick : undefined}
              disabled={!canGoPrev}
            >
              <FaChevronUp />
            </button>
            <button
              type="button"
              className={sceneButtonClassName}
              onClick={canGoNext ? handleNextClick : undefined}
              disabled={!canGoNext}
            >
              <FaChevronDown />
            </button>
            <button
              type="button"
              className={`${sceneButtonClassName} ${textActiveColor}`}
              onClick={toggleViewSceneUpdate}
              aria-label="Toggle scene portal"
            >
              <FaEye />
            </button>
          </div>

          {showGridsView}
        </div>
      );
      expandedBottomRowActionDisplay = (
        <div className='flex max-w-full flex-wrap items-center justify-end gap-1.5'>
          {expandedTopSecondaryActionDisplay}
        </div>
      );
    } else {
      expandedTopRowActionDisplay = (
        <div className='flex max-w-full flex-wrap items-center justify-end gap-1.5'>
          {showGridsView}
        </div>
      );
      expandedBottomRowActionDisplay = (
        <div className='min-w-0 max-w-full overflow-visible'>
          {selectedTrackViewDisplay}
        </div>
      );
    }
  } else {
    submitRenderFullActionDisplay = (
      <div className='flex w-full flex-col items-stretch gap-1'>
        <div className='flex w-full items-stretch justify-between gap-1.5'>
          <div
            className='inline-flex min-w-0'
            onClick={(event) => event.stopPropagation()}
          >
            {submitRenderDisplay}
          </div>
          {!canCancelPendingRender ? expandButtonLabel : null}
        </div>
        <div
          className={`w-full ${disabledMenuClass}`}
          onClick={(event) => event.stopPropagation()}
        >
          {dropdownButtonDisplay}
        </div>
      </div>
    );
  }

  const handleSeekBarChange = (value) => {
    const nextFrame = Math.max(0, Math.round(Number(value) || 0));
    setCurrentLayerSeek(nextFrame);
    const selectedLayerMeta = layerFrameMetadata.find((layerMeta) => (
      nextFrame >= layerMeta.startFrame && nextFrame < layerMeta.endFrame
    )) || layerFrameMetadata[layerFrameMetadata.length - 1];

    if (!selectedLayerMeta) {
      return;
    }

    setSelectedLayerIndex(selectedLayerMeta.originalIndex);
    setSelectedLayer(selectedLayerMeta.layer);
  };





  // Hide the popup when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (parentRef.current?.contains(event.target)) {
        return;
      }

      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        openPopupLayerIndex !== null &&
        !durationChanged // Do not close if duration has changed
      ) {
        openPopupLayerIdRef.current = null;
        setOpenPopupLayerIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopupLayerIndex, durationChanged]);

  let buttonGroupMT = 'mt-0.5';
  if (isExpandedToolbarView) {
    buttonGroupMT = 'mt-0';
  }

  let trackSliderML = 'ml-[12px]';
  if (isExpandedToolbarView) {
    trackSliderML = 'ml-[10px]';
  }

  let rangeScaleML = 'ml-0';
  if (isExpandedToolbarView) {
    rangeScaleML = 'ml-1';
  }


  let layerActionCurrentView = <span />;

  if (isExpandedToolbarView) {
    // Define the base class name for the tab buttons
    const baseTabClassName =
      'inline-flex items-center justify-center rounded-lg px-2 py-1 text-[10px] font-semibold cursor-pointer expanded-menu-item transition-colors duration-150';

    // Conditional class for the "Audio" tab
    const audioTabClassName = `${currentLayerActionSuperView === 'AUDIO'
      ? 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white'
      : 'bg-gray-700/80 text-gray-300'
      } ${baseTabClassName}`;

    const imageTabClassName = `${currentLayerActionSuperView === 'IMAGE'
      ? 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white'
      : 'bg-gray-700/80 text-gray-300'
      } ${baseTabClassName}`;
    const videoTabClassName = `${currentLayerActionSuperView === 'VIDEO'
      ? 'bg-gradient-to-r from-gray-900 via-cyan-900 to-gray-900 text-white'
      : 'bg-gray-700/80 text-gray-300'
      } ${baseTabClassName}`;

    // Conditional class for the "Text" tab
    const textTabClassName = `${currentLayerActionSuperView === 'TEXT'
      ? 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white'
      : 'bg-gray-700/80 text-gray-300'
      } ${baseTabClassName}`;
    const settingsTabClassName = `${currentLayerActionSuperView === 'SETTINGS'
      ? 'bg-gradient-to-r from-gray-900 via-emerald-900 to-gray-900 text-white'
      : 'bg-gray-700/80 text-gray-300'
      } ${baseTabClassName}`;

    // Update the JSX to use the computed class names
    layerActionCurrentView = (
      <div className="flex flex-wrap items-center justify-start gap-1.5">
        {/* Audio Tab */}
        <div
          className={audioTabClassName}
          onClick={() => setCurrentLayerActionSuperView('AUDIO')}
        >
          <div>Audio</div>
        </div>
        <div
          className={videoTabClassName}
          onClick={() => setCurrentLayerActionSuperView('VIDEO')}
        >
          <div>Video</div>
        </div>
        <div
          className={imageTabClassName}
          onClick={() => setCurrentLayerActionSuperView('IMAGE')}
        >
          <div>Image</div>
        </div>
        {/* Text Tab */}
        <div
          className={textTabClassName}
          onClick={() => setCurrentLayerActionSuperView('TEXT')}
        >
          <div>Text</div>
        </div>
        <div
          className={settingsTabClassName}
          onClick={() => setCurrentLayerActionSuperView('SETTINGS')}
        >
          <div>Settings</div>
        </div>
      </div>
    );
  }


  return (
    <div
      className={`shadow-lg m-auto fixed ${containerWdidth} ${textColor} ${panelShellSurface}
       text-left toolbar-container overflow-visible`}
      aria-disabled={isRenderPending}
      style={frameToolbarInsetStyle}
    >
      <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <div className={`relative z-[240] w-full shrink-0 overflow-visible pb-1 border-r-2 ${bgColor} border-stone-600`}>
          {isExpandedToolbarView ? (
            <div className='flex min-w-0 flex-col gap-2 px-2 pt-2 pb-1'>
              <div className='flex min-w-0 items-start gap-2'>
                <div className={`min-w-0 shrink-0 ${disabledMenuClass}`}>
                  {layerActionCurrentView}
                </div>
                <div className='ml-auto min-w-0 flex-1 overflow-visible'>
                  <div className='flex min-w-0 flex-wrap items-center justify-end gap-1.5'>
                    {expandedTopRowActionDisplay}
                  </div>
                </div>
              </div>

              <div className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2'>
                <div className='min-w-0 shrink-0'>
                  {toolbarHeaderControls}
                </div>
                <div className='min-w-0 overflow-visible'>
                  <div className='flex min-w-0 flex-wrap items-center justify-end gap-1.5'>
                    {expandedBottomRowActionDisplay}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className='cursor-pointer px-1 pt-0.5'
              onClick={toggleShowExpandedTrackView}
            >
              <div className='btn-container flex w-full items-center pr-1 mb-1'>
                <div className='flex w-full max-w-full items-center'>
                  {toolbarHeaderControls}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className={`relative z-0 min-h-0 h-full w-full overflow-hidden flex flex-row pl-1 ${panelBodySurface}`}
          style={timelineRailStyle}
        >
          {isGridVisible && hasUsableFrameRange && (
            <div
              className='pointer-events-none absolute inset-y-0 left-0 z-[3] overflow-hidden'
              style={{ right: `${timeRulerWidthPx}px` }}
            >
              <div className='action-view-grid-overlay h-full w-full' style={gridOverlayThemeStyle}>
                {minorGridLineOffsets.map((offset) => (
                  <div
                    key={`minor-grid-${offset.toFixed(4)}`}
                    className='action-view-grid-line action-view-grid-line--minor'
                    style={{ top: `${offset}%` }}
                  />
                ))}
                {majorGridLineOffsets.map((offset) => (
                  <div
                    key={`major-grid-${offset.toFixed(4)}`}
                    className='action-view-grid-line action-view-grid-line--major'
                    style={{ top: `${offset}%` }}
                  />
                ))}
                {isVideoPreviewPlaying && Number.isFinite(currentSeekGridOffset) && (
                  <div
                    className='action-view-grid-line action-view-grid-line--focus'
                    style={{ top: `${currentSeekGridOffset}%` }}
                  />
                )}
                {visibleGridSnapPoints.map((snapPoint) => (
                  <div
                    key={snapPoint.id}
                    className='action-view-grid-snap-point'
                    style={{ top: `${snapPoint.offset}%` }}
                  >
                    <button
                      type="button"
                      className='action-view-grid-snap-button pointer-events-auto'
                      onClick={() => seekToGridSnapPoint(snapPoint.frame)}
                      title={`Jump to ${formatGridSnapPointLabel(snapPoint.frame)}`}
                    >
                      <span className='action-view-grid-snap-dot' />
                      <span>{formatGridSnapPointLabel(snapPoint.frame)}</span>
                    </button>
                    <button
                      type="button"
                      className='action-view-grid-snap-remove pointer-events-auto'
                      onClick={(event) => {
                        event.stopPropagation();
                        removeGridSnapPoint(snapPoint.id);
                      }}
                      aria-label={`Remove saved point ${formatGridSnapPointLabel(snapPoint.frame)}`}
                      title='Remove saved point'
                    >
                      <FaTimes className='text-[8px]' />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='relative z-[2] text-xs font-bold basis-1/4 min-h-0'>
            <div className='relative h-full min-h-0'>
              {/* Previous and Next buttons */}
              <div className='relative h-full min-h-0 w-full overflow-hidden' ref={parentRef}>
                {layersList}
                {layerSelectOverlay}
              </div>
            </div>
          </div>
          <div className='relative z-[2] basis-3/4 min-h-0'>
            <div className='flex flex-row h-full min-h-0'>
	              <div className={`inline-flex h-full min-h-0 ${trackSliderML}`}>
                {hasUsableFrameRange ? (
                  <ReactSlider
                    key={`slider_layer_seek`}
                    className="modern-vertical-slider-seek"
                    thumbClassName="thumb"
                    trackClassName="track"
                    orientation="vertical"
                    min={seekSliderMin}
                    max={seekSliderMax}
                    value={currentSeekSliderValue}
                    onChange={(value) => {
                      handleSeekBarChange(seekSliderValueToFrame(value));
                    }}
                    onBeforeChange={() => setIsLayerSeeking(true)}
                    onAfterChange={(value) => {
                      const resolvedFrame = Math.max(
                        0,
                        Math.round(seekSliderValueToFrame(value)),
                      );
                      setIsLayerSeeking(false);
                      if (isGridVisible) {
                        rememberGridSnapPoint(resolvedFrame);
                      }
                    }}
                  />
                ) : (
                  <div className="w-[30px]" />
                )}
              </div>

              {trackViewDisplay}



              <div className={`inline-flex dual-thumb-shell h-full min-h-0 w-[30px] ${rangeScaleML}`}>
                {hasUsableFrameRange ? (
                  <DualThumbSlider
                    min={0}
                    max={Math.max(1, totalDurationInFrames)}
                    value={selectedFrameRange}
                    onChange={handleViewRangeSliderChange}
                    onAfterChange={handleViewRangeSliderCommit}
                  />
                ) : (
                  <div className="w-[30px]" />
                )}
              </div>

              <div className='relative z-[4] inline-flex h-full min-h-0'>
                <TimeRuler
                  totalDuration={totalDuration}
                  visibleStartTime={viewRangeStart / 30}
                  visibleEndTime={viewRangeEnd / 30}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {openPopupLayerIndex !== null && showUpdateLayerPortal && !isRenderPending &&
        createPortal(
          <div
            className={`fixed z-[200] p-1 rounded-lg ${bg3Color} shadow-lg border border-neutral-500`}
            style={{
              top: popupPosition.top, // Use the calculated top position
              left: popupPosition.left,
              transform: popupPosition.transform, // Remove the translateY(-50%)
              width: `${SCENE_POPUP_WIDTH}px`,

              height: durationChanged ? '110px' : '70px',

            }}
            onClick={(e) => e.stopPropagation()}
            ref={popupRef}
          >
            <div className='relative text-center h-full'>
              <div className='absolute right-[1px] top-0'>
                <button onClick={onClosePopup}>
                  <FaEye className={`text-neutral-100 text-sm`} />
                </button>
              </div>
              <div className='block w-[120px] text-left mt-1 pl-1'>
                <input
                  type='number'
                  value={
                    pendingDuration != null
                      ? pendingDuration
                      : layers[openPopupLayerIndex].duration
                  }
                  onChange={(e) =>
                    layerDurationCellUpdated(e.target.value, openPopupLayerIndex)
                  }
                className={`w-[120px] 
                    inline-block border border-neutral-100 pl-1 rounded-lg ${textColor} ${bg2Color} pr-[1px] ${durationChanged ? 'highlight' : ''
                    }`}
                />
                <label className='inline-block text-xs text-slate-200 ml-[-30px]'>s</label>
              </div>
              {durationChanged && (
                <div className='mt-1 mb-2'>
                  <button
                    onClick={onUpdateDuration}
                  className={`px-4 py-2 mt-1 text-xs text-slate-100 rounded bg-[#111a2f] border border-[#1f2a3d] m-auto ${durationChanged ? 'highlight' : ''
                      }`}
                  >
                    Update
                  </button>
                </div>
              )}
              <div className='mt-auto absolute bottom-1 left-0 right-0'>
                <button
                  onClick={() => removeLayer(openPopupLayerIndex)}
                  className='px-3 py-1 text-xs rounded w-[80px] bg-red-900 text-neutral-100 hover:bg-red-800'
                >
                  <div className='flex m-auto'>
                    <div className='inline-flex'>
                      Remove
                    </div>

                    <FaTimes className='inline-flex mt-1' />
                  </div>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {isPromptDropdownOpen && selectedAudioTrackPrompt
        ? createPortal(
          <div
            ref={promptDropdownRef}
            className={`fixed z-[260] rounded-2xl p-3 ${promptDropdownSurfaceClassName}`}
            style={{
              top: promptDropdownPosition.top,
              left: promptDropdownPosition.left,
              width: promptDropdownPosition.width,
              maxWidth: 'calc(100vw - 24px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className={settingsStatLabelClassName}>Prompt</div>
                <div className='mt-1 truncate text-sm font-semibold' title={selectedAudioTrackDisplayTitle}>
                  {selectedAudioTrackDisplayTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={copyPromptToClipboard}
                className={settingsActionButtonClasses}
              >
                <FaCopy className='mr-1 text-[11px]' />
                {promptCopyState === 'copied'
                  ? 'Copied'
                  : promptCopyState === 'failed'
                    ? 'Retry'
                    : 'Copy prompt'}
              </button>
            </div>
            <div className='mt-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6'>
              {selectedAudioTrackPrompt}
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  );
}
