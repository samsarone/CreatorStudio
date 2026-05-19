// ProgressIndicator.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaPause, FaPlay, FaSpinner, FaStepForward, FaTimes } from 'react-icons/fa';
import './mobileStyles.css';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import AddCreditsDialog from "../account/AddCreditsDialog.jsx";
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';
import StepImageReviewPanel from './StepImageReviewPanel.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
const STATIC_ASSET_BASE_URL = (
  import.meta.env.VITE_STATIC_CDN_URL ||
  'https://static.samsar.one'
).replace(/\/+$/, '');
const PREVIEW_MUSIC_DUCKED_VOLUME_RATIO = 0.225;
const PREVIEW_MEDIA_PRELOAD_TIMEOUT_MS = 15000;
const PREVIEW_AUDIO_SEEK_TOLERANCE_SECONDS = 0.12;
const PREVIEW_VIDEO_SEEK_TOLERANCE_SECONDS = 0.12;
const PREVIEW_VIDEO_METADATA_READY_STATE = 1;
const PREVIEW_VIDEO_FRAME_READY_STATE = 2;
const USER_RESOURCES_PREFIX = 'user_resources/';
const previewVisualReadyCache = new Set();
const previewVisualPreloadPromises = new Map();

const STAGE_ORDER = [
  'prompt_generation',
  'image_generation',
  'speech_generation',
  'music_generation',
  'audio_generation',
  'ai_video_generation',
  'lip_sync_generation',
  'sound_effect_generation',
  'narrator_avatar_generation',
  'frame_generation',
  'video_generation',
];

const STAGE_LABELS = {
  prompt_generation: 'Generating prompt',
  image_generation: 'Generating images',
  speech_generation: 'Generating speech',
  music_generation: 'Generating music',
  audio_generation: 'Generating audio',
  ai_video_generation: 'Generating video clips',
  lip_sync_generation: 'Generating lip sync',
  sound_effect_generation: 'Generating sound effects',
  narrator_avatar_generation: 'Generating narrator avatar',
  frame_generation: 'Rendering frames',
  video_generation: 'Rendering final video',
};

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAssetUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const relativePath = trimmed.replace(/^\/+/, '');
  if (relativePath.startsWith(USER_RESOURCES_PREFIX)) {
    return `${STATIC_ASSET_BASE_URL}/${relativePath}`;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    try {
      const parsedUrl = new URL(trimmed);
      const pathname = parsedUrl.pathname.replace(/^\/+/, '');
      if (pathname.startsWith(USER_RESOURCES_PREFIX)) {
        return `${STATIC_ASSET_BASE_URL}/${pathname}${parsedUrl.search || ''}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  return `${PROCESSOR_API_URL}/${trimmed.replace(/^\/+/, '')}`;
}

function normalizeStatus(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function isCompletedStatus(value) {
  const normalized = normalizeStatus(value);
  return normalized === 'COMPLETED' || normalized === 'SUCCESS' || normalized === 'SUCCEEDED' || normalized === 'DONE';
}

function getStatusMap(expressGenerationStatus, generationStatusDetails) {
  if (expressGenerationStatus && typeof expressGenerationStatus === 'object') {
    return expressGenerationStatus;
  }
  return generationStatusDetails?.session?.stages || {};
}

function getProgressPercentage(status, generationStatusDetails) {
  const completedStages = Array.isArray(generationStatusDetails?.session?.completedStages)
    ? generationStatusDetails.session.completedStages
    : null;
  if (completedStages && completedStages.length > 0) {
    return Math.min(100, (completedStages.length / STAGE_ORDER.length) * 100);
  }
  if (!status || Object.keys(status).length === 0) return 0;
  const stageKeys = STAGE_ORDER.filter((stage) => status[stage] !== undefined);
  const keys = stageKeys.length ? stageKeys : Object.keys(status);
  const completedTasks = keys.filter((key) => isCompletedStatus(status[key])).length;
  return (completedTasks / keys.length) * 100;
}

function getStageLabel(stage, t) {
  if (!stage) return null;
  const translationMap = {
    prompt_generation: t('progress.generatingPrompt'),
    image_generation: t('progress.generatingImage'),
    audio_generation: t('progress.generatingAudio'),
    ai_video_generation: t('progress.generatingAiVideo'),
    lip_sync_generation: t('progress.generatingLipSync'),
    sound_effect_generation: t('progress.generatingSoundEffects'),
    frame_generation: t('progress.generatingFrames'),
    video_generation: t('progress.finalVideoGeneration'),
  };
  return translationMap[stage] || STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
}

function getCurrentStep(status, t, generationStatusDetails) {
  const explicitLabel =
    generationStatusDetails?.current_step_label ||
    generationStatusDetails?.step?.current_step_label ||
    generationStatusDetails?.session?.currentStage;
  if (explicitLabel && !STAGE_ORDER.includes(explicitLabel)) {
    return explicitLabel;
  }

  const explicitStage =
    generationStatusDetails?.current_step ||
    generationStatusDetails?.step?.current_step ||
    generationStatusDetails?.session?.currentStage;
  if (explicitStage) {
    return getStageLabel(explicitStage, t);
  }

  if (!status) return null;
  for (const stage of STAGE_ORDER) {
    if (status[stage] !== undefined && !isCompletedStatus(status[stage])) {
      return getStageLabel(stage, t);
    }
  }
  return t('progress.allStepsCompleted');
}

function resolveSegmentEnd(startTime, duration, endTime, fallbackDuration) {
  if (endTime !== null && endTime > startTime) return endTime;
  if (duration !== null && duration > 0) return startTime + duration;
  return startTime + fallbackDuration;
}

function resolveLayerPreviewAsset(layer = {}) {
  const candidates = [
    { type: 'video', stage: 'lip_sync_generation', url: layer.lipSyncVideo?.url },
    { type: 'video', stage: 'sound_effect_generation', url: layer.soundEffectVideo?.url },
    { type: 'video', stage: 'ai_video_generation', url: layer.aiVideo?.url },
    { type: 'video', stage: 'user_video', url: layer.userVideo?.url },
    { type: layer.preview?.type || 'image', stage: layer.preview?.stage, url: layer.preview?.url },
    { type: 'image', stage: 'image_generation', url: layer.image?.url },
  ];
  return candidates.find((candidate) => normalizeAssetUrl(candidate.url)) || null;
}

function buildVisualSegments(sessionPreview) {
  const layers = Array.isArray(sessionPreview?.layers) ? sessionPreview.layers : [];
  const globalVideos = Array.isArray(sessionPreview?.globalVideos) ? sessionPreview.globalVideos : [];
  const layerSegments = layers
    .map((layer, index) => {
      const asset = resolveLayerPreviewAsset(layer);
      const url = normalizeAssetUrl(asset?.url);
      if (!url) return null;
      const startTime = Math.max(0, normalizeNumber(layer.startTime, 0));
      const duration = normalizeNumber(layer.duration, null);
      const endTime = resolveSegmentEnd(startTime, duration, normalizeNumber(layer.endTime, null), 4);
      return {
        key: `layer-${layer.id || index}`,
        title: layer.prompt || `Scene ${index + 1}`,
        type: asset.type === 'video' ? 'video' : 'image',
        stage: asset.stage || layer.preview?.stage || 'image_generation',
        status: layer.preview?.status || layer.image?.status || layer.aiVideo?.status || null,
        startTime,
        endTime,
        duration: Math.max(0.2, endTime - startTime),
        url,
      };
    })
    .filter(Boolean);

  const globalVideoSegments = globalVideos
    .map((video, index) => {
      const url = normalizeAssetUrl(video.url);
      if (!url) return null;
      const startTime = Math.max(0, normalizeNumber(video.startTime, 0));
      const duration = normalizeNumber(video.duration, null);
      const endTime = resolveSegmentEnd(startTime, duration, normalizeNumber(video.endTime, null), 4);
      return {
        key: `global-video-${video.id || index}`,
        title: video.title || `Video ${index + 1}`,
        type: 'video',
        stage: 'ai_video_generation',
        status: video.status,
        startTime,
        endTime,
        duration: Math.max(0.2, endTime - startTime),
        url,
      };
    })
    .filter(Boolean);

  return [...layerSegments, ...globalVideoSegments]
    .sort((left, right) => left.startTime - right.startTime);
}

function buildAudioSegments(sessionPreview) {
  const audioLayers = [
    ...(Array.isArray(sessionPreview?.audioLayers) ? sessionPreview.audioLayers : []),
    ...(Array.isArray(sessionPreview?.globalAudioLayers) ? sessionPreview.globalAudioLayers : []),
  ];

  return audioLayers
    .map((layer, index) => {
      const url = normalizeAssetUrl(layer.url);
      if (!url) return null;
      const startTime = Math.max(0, normalizeNumber(layer.startTime, 0));
      const duration = normalizeNumber(layer.duration, null);
      const endTime = resolveSegmentEnd(startTime, duration, normalizeNumber(layer.endTime, null), 4);
      const type = typeof layer.type === 'string' ? layer.type.toLowerCase() : 'audio';
      const volumeValue = normalizeNumber(layer.volume, 1);
      const volume = Math.max(0, Math.min(1, volumeValue > 1 ? volumeValue / 100 : volumeValue));
      return {
        key: `audio-${layer.id || index}`,
        title: layer.prompt || layer.speakerCharacterName || layer.speaker || `${type} ${index + 1}`,
        type,
        status: layer.status,
        startTime,
        endTime,
        duration: Math.max(0.2, endTime - startTime),
        sourceTrimStartTime: Math.max(0, normalizeNumber(layer.sourceTrimStartTime, 0)),
        volume,
        url,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.startTime - right.startTime);
}

function resolveTimelineDuration(sessionPreview, visualSegments, audioSegments) {
  const explicitDuration = normalizeNumber(sessionPreview?.duration, null);
  if (explicitDuration && explicitDuration > 0) return explicitDuration;
  const ends = [...visualSegments, ...audioSegments].map((segment) => segment.endTime).filter(Number.isFinite);
  return ends.length ? Math.max(...ends) : 0;
}

function findActiveVisualSegment(segments, previewTime) {
  if (!segments.length) return null;
  return (
    segments.find((segment) => previewTime >= segment.startTime && previewTime < segment.endTime) ||
    [...segments].reverse().find((segment) => previewTime >= segment.startTime) ||
    segments[0]
  );
}

function isSpeechAudio(segment) {
  return segment?.type === 'speech' || segment?.type === 'voice' || segment?.type === 'voiceover';
}

function isSegmentActiveAtTime(segment, previewTime) {
  return previewTime >= segment.startTime && previewTime < segment.endTime;
}

function resolveAudioVolume(segment, audioSegments, previewTime) {
  const baseVolume = segment.volume ?? 1;
  if (isSpeechAudio(segment)) return baseVolume;
  const hasActiveSpeech = audioSegments.some((candidate) => (
    candidate.key !== segment.key &&
    isSpeechAudio(candidate) &&
    isSegmentActiveAtTime(candidate, previewTime)
  ));
  return hasActiveSpeech ? baseVolume * PREVIEW_MUSIC_DUCKED_VOLUME_RATIO : baseVolume;
}

function formatTime(seconds) {
  const normalized = Math.max(0, normalizeNumber(seconds, 0));
  const minutes = Math.floor(normalized / 60);
  const wholeSeconds = Math.floor(normalized % 60);
  return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}`;
}

function normalizePreviewAspectRatio(sessionPreview) {
  const value =
    sessionPreview?.aspectRatio ||
    sessionPreview?.aspect_ratio ||
    sessionPreview?.input?.aspect_ratio;
  return value === '9:16' ? '9:16' : '16:9';
}

function getPreviewVisualCacheKey(segment) {
  if (!segment?.url) return null;
  return `${segment.type || 'media'}:${segment.url}`;
}

function markPreviewVisualReady(cacheKey) {
  if (!cacheKey) return;
  previewVisualReadyCache.add(cacheKey);
  previewVisualPreloadPromises.delete(cacheKey);
}

function preloadPreviewImage(url, cacheKey) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      markPreviewVisualReady(cacheKey);
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(finish).catch(finish);
        return;
      }
      finish();
    };
    image.onerror = finish;
    timeoutId = window.setTimeout(finish, PREVIEW_MEDIA_PRELOAD_TIMEOUT_MS);
    image.src = url;

    if (image.complete) {
      finish();
    }
  });
}

function preloadPreviewVideo(url, cacheKey) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', finish);
      video.removeEventListener('canplay', finish);
      video.removeEventListener('error', finish);
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Ignore cleanup failures from detached media elements.
      }
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      markPreviewVisualReady(cacheKey);
      resolve();
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', finish);
    video.addEventListener('canplay', finish);
    video.addEventListener('error', finish);
    timeoutId = window.setTimeout(finish, PREVIEW_MEDIA_PRELOAD_TIMEOUT_MS);
    video.src = url;
    video.load();
  });
}

function preloadPreviewVisualSegment(segment) {
  const cacheKey = getPreviewVisualCacheKey(segment);
  if (!cacheKey || previewVisualReadyCache.has(cacheKey)) {
    return Promise.resolve();
  }
  if (previewVisualPreloadPromises.has(cacheKey)) {
    return previewVisualPreloadPromises.get(cacheKey);
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    markPreviewVisualReady(cacheKey);
    return Promise.resolve();
  }

  const promise = segment.type === 'video'
    ? preloadPreviewVideo(segment.url, cacheKey)
    : preloadPreviewImage(segment.url, cacheKey);
  previewVisualPreloadPromises.set(cacheKey, promise);
  return promise;
}

export default function ProgressIndicator(props) {
  const {
    isGenerationPending,
    isGenerationWaitingForApproval,
    isProcessingNextStep,
    expressGenerationStatus,
    generationStatusDetails,
    videoLink,
    errorMessage,
    canProcessNextStep = false,
    canReviewStepImages = false,
    purchaseCreditsForUser,
    viewInStudio,
    getSessionImageLayers,
    onProcessNextStep,
    onSelectStepImage,
    onRegenerateStepImage,
  } = props;

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const [hasCalledGetSessionImageLayers, setHasCalledGetSessionImageLayers] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [visualPreloadVersion, setVisualPreloadVersion] = useState(0);
  const [activeVideoReadyKey, setActiveVideoReadyKey] = useState(null);
  const audioRefs = useRef(new Map());
  const activeVideoRef = useRef(null);
  const { colorMode } = useColorMode();
  const { t } = useLocalization();

  const statusMap = useMemo(
    () => getStatusMap(expressGenerationStatus, generationStatusDetails),
    [expressGenerationStatus, generationStatusDetails],
  );
  const progressPercentage = useMemo(
    () => getProgressPercentage(statusMap, generationStatusDetails),
    [generationStatusDetails, statusMap],
  );
  const hasProgressStatus = useMemo(
    () => (
      Object.keys(statusMap || {}).length > 0 ||
      Array.isArray(generationStatusDetails?.session?.completedStages)
    ),
    [generationStatusDetails, statusMap],
  );
  const currentStep = useMemo(
    () => getCurrentStep(statusMap, t, generationStatusDetails),
    [generationStatusDetails, statusMap, t],
  );
  const sessionPreview = generationStatusDetails?.session || null;
  const visualSegments = useMemo(() => buildVisualSegments(sessionPreview), [sessionPreview]);
  const audioSegments = useMemo(() => buildAudioSegments(sessionPreview), [sessionPreview]);
  const timelineDuration = useMemo(
    () => resolveTimelineDuration(sessionPreview, visualSegments, audioSegments),
    [audioSegments, sessionPreview, visualSegments],
  );
  const hasTimelinePreview = visualSegments.length > 0 || audioSegments.length > 0;
  const activeVisualSegment = useMemo(
    () => findActiveVisualSegment(visualSegments, previewTime),
    [previewTime, visualSegments],
  );
  const activeVisualCacheKey = getPreviewVisualCacheKey(activeVisualSegment);
  const activeVisualRenderKey = activeVisualSegment
    ? `${activeVisualSegment.key}-${activeVisualSegment.stage}-${activeVisualSegment.url}`
    : null;
  const isVisualSegmentPreloaded = useCallback((segment) => {
    // visualPreloadVersion intentionally forces recalculation after async preloads settle.
    const cacheKey = getPreviewVisualCacheKey(segment);
    return !cacheKey || previewVisualReadyCache.has(cacheKey);
  }, [visualPreloadVersion]);
  const isPreviewMediaReadyAtTime = useCallback((time) => {
    const segmentAtTime = findActiveVisualSegment(visualSegments, time);
    return isVisualSegmentPreloaded(segmentAtTime);
  }, [isVisualSegmentPreloaded, visualSegments]);
  const isActiveVisualPreloaded = isVisualSegmentPreloaded(activeVisualSegment);
  const isActiveVideoElementReady = activeVisualSegment?.type !== 'video'
    || activeVideoReadyKey === activeVisualRenderKey
    || (activeVideoRef.current?.readyState ?? 0) >= PREVIEW_VIDEO_FRAME_READY_STATE;
  const isActiveVisualReady = !activeVisualSegment
    || (isActiveVisualPreloaded && isActiveVideoElementReady);
  const previewAspectRatio = normalizePreviewAspectRatio(sessionPreview);
  const isPortraitPreview = previewAspectRatio === '9:16';
  const aspectRatio = isPortraitPreview ? '9 / 16' : '16 / 9';
  const previewFrameStyle = {
    aspectRatio,
    width: isPortraitPreview
      ? 'min(100%, 31.5vh, 292px)'
      : 'min(100%, 78vh, 640px)',
    maxHeight: isPortraitPreview
      ? 'min(56vh, 520px)'
      : 'min(44vh, 360px)',
  };

  useEffect(() => {
    if (
      statusMap?.image_generation === 'COMPLETED' &&
      !hasCalledGetSessionImageLayers
    ) {
      // getSessionImageLayers?.();
      setHasCalledGetSessionImageLayers(true);
    }
  }, [
    statusMap?.image_generation,
    hasCalledGetSessionImageLayers,
    getSessionImageLayers,
  ]);

  useEffect(() => {
    if (!timelineDuration || previewTime <= timelineDuration) return;
    setPreviewTime(0);
  }, [previewTime, timelineDuration]);

  useEffect(() => {
    if (!visualSegments.length) return undefined;
    let isMounted = true;
    visualSegments.forEach((segment) => {
      preloadPreviewVisualSegment(segment).then(() => {
        if (isMounted) {
          setVisualPreloadVersion((version) => version + 1);
        }
      });
    });
    setVisualPreloadVersion((version) => version + 1);
    return () => {
      isMounted = false;
    };
  }, [visualSegments]);

  useEffect(() => {
    if (activeVisualSegment?.type !== 'video') {
      setActiveVideoReadyKey(null);
      return;
    }
    const element = activeVideoRef.current;
    setActiveVideoReadyKey(
      (element?.readyState ?? 0) >= PREVIEW_VIDEO_FRAME_READY_STATE
        ? activeVisualRenderKey
        : null
    );
  }, [activeVisualRenderKey, activeVisualSegment?.type]);

  useEffect(() => {
    if (!hasTimelinePreview || !timelineDuration || !isPreviewPlaying || videoLink || !isActiveVisualReady) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setPreviewTime((current) => {
        const next = current + 0.25;
        const nextTime = next >= timelineDuration ? 0 : next;
        return isPreviewMediaReadyAtTime(nextTime) ? nextTime : current;
      });
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [
    hasTimelinePreview,
    isActiveVisualReady,
    isPreviewMediaReadyAtTime,
    isPreviewPlaying,
    timelineDuration,
    videoLink,
  ]);

  useEffect(() => {
    const canPlayPreviewMedia = isPreviewPlaying && !videoLink && isActiveVisualReady;
    audioSegments.forEach((segment) => {
      const element = audioRefs.current.get(segment.key);
      if (!element) return;
      const isActive = isSegmentActiveAtTime(segment, previewTime);
      if (!isActive || !canPlayPreviewMedia) {
        element.pause();
        return;
      }
      const localTime = Math.max(0, previewTime - segment.startTime + segment.sourceTrimStartTime);
      if (Math.abs(element.currentTime - localTime) > PREVIEW_AUDIO_SEEK_TOLERANCE_SECONDS) {
        element.currentTime = localTime;
      }
      element.volume = Math.max(0, Math.min(1, resolveAudioVolume(segment, audioSegments, previewTime)));
      if (element.paused) {
        element.play().catch(() => undefined);
      }
    });
  }, [audioSegments, isActiveVisualReady, isPreviewPlaying, previewTime, videoLink]);

  useEffect(() => {
    const element = activeVideoRef.current;
    if (!element || activeVisualSegment?.type !== 'video') return;
    const localTime = Math.max(0, previewTime - activeVisualSegment.startTime);
    if (
      (element.readyState ?? 0) >= PREVIEW_VIDEO_METADATA_READY_STATE &&
      Math.abs(element.currentTime - localTime) > PREVIEW_VIDEO_SEEK_TOLERANCE_SECONDS
    ) {
      element.currentTime = localTime;
    }
    if (isPreviewPlaying && !videoLink && isActiveVisualReady) {
      element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }, [activeVisualSegment, isActiveVisualReady, isPreviewPlaying, previewTime, videoLink]);

  const handleActiveVideoReady = useCallback((event) => {
    const element = event.currentTarget;
    if (!element || activeVisualSegment?.type !== 'video') {
      setActiveVideoReadyKey(activeVisualRenderKey);
      return;
    }
    const localTime = Math.max(0, previewTime - activeVisualSegment.startTime);
    if (
      (element.readyState ?? 0) >= PREVIEW_VIDEO_METADATA_READY_STATE &&
      Math.abs(element.currentTime - localTime) > PREVIEW_VIDEO_SEEK_TOLERANCE_SECONDS
    ) {
      element.currentTime = localTime;
      if (element.seeking) return;
    }
    setActiveVideoReadyKey(activeVisualRenderKey);
  }, [activeVisualRenderKey, activeVisualSegment, previewTime]);

  const handleActiveVideoWaiting = useCallback(() => {
    setActiveVideoReadyKey(null);
  }, []);

  const handleActiveImageReady = useCallback(() => {
    markPreviewVisualReady(activeVisualCacheKey);
    setVisualPreloadVersion((version) => version + 1);
  }, [activeVisualCacheKey]);

  const registerAudioRef = useCallback((key, element) => {
    if (element) {
      audioRefs.current.set(key, element);
    } else {
      audioRefs.current.delete(key);
    }
  }, []);

  const showBuyCreditsDialog = () => {
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <AddCreditsDialog purchaseCreditsForUser={purchaseCreditsForUser} />
      </div>
    );
  };

  const videoActualLink = normalizeAssetUrl(videoLink);

  const panelShell =
    colorMode === 'dark'
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d] shadow-[0_10px_28px_rgba(0,0,0,0.35)]'
      : 'bg-white/95 text-slate-900 border border-[#d7deef] shadow-sm';
  const progressTrack = colorMode === 'dark' ? 'bg-[#1f2a3d]' : 'bg-slate-200';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const timelineTrack = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-100';
  const errorPanel =
    colorMode === 'dark'
      ? 'bg-rose-900/50 text-rose-100 border border-rose-700/60'
      : 'bg-red-50 text-red-700 border border-red-200';
  const waitingPanel =
    colorMode === 'dark'
      ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
      : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <div className={`${panelShell} rounded-2xl p-4 pt-3 transition-shadow duration-200`}>
      {errorMessage && (
        <div className={`${errorPanel} p-3 rounded-xl mb-3`}>
          {errorMessage.error}
          <div>
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
              onClick={viewInStudio}
            >
              {t("common.viewInStudio")}
            </button>
          </div>
        </div>
      )}

      {(isGenerationPending || isGenerationWaitingForApproval) && hasProgressStatus ? (
        <div className="clear-both mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className={`w-full ${progressTrack} rounded-full overflow-hidden h-3`}>
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-sm whitespace-nowrap">
            {Math.round(progressPercentage)}% - {currentStep || 'Preparing generation'}
          </div>
        </div>
      ) : expressGenerationStatus === null && !videoLink && !hasTimelinePreview ? (
        <div className="flex justify-center items-center h-48">
          <FaSpinner className="animate-spin text-4xl" />
        </div>
      ) : null}

      {isGenerationWaitingForApproval && canProcessNextStep && onProcessNextStep && (
        <div className={`mt-4 rounded-xl border p-3 ${waitingPanel}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Images are ready for review</div>
              <p className="mt-1 text-xs opacity-80">
                Continue when the preview is ready to move into image-to-video generation.
              </p>
            </div>
            <button
              type="button"
              onClick={onProcessNextStep}
              disabled={isProcessingNextStep}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessingNextStep ? <FaSpinner className="animate-spin" /> : <FaStepForward />}
              {isProcessingNextStep ? 'Continuing...' : 'Generate video'}
            </button>
          </div>
        </div>
      )}

      {isGenerationWaitingForApproval && canReviewStepImages && (
        <StepImageReviewPanel
          sessionPreview={sessionPreview}
          colorMode={colorMode}
          onSelectImage={onSelectStepImage}
          onRegenerateImage={onRegenerateStepImage}
        />
      )}

      {hasTimelinePreview && !videoLink && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Timeline preview</div>
              <div className={`mt-0.5 text-xs ${mutedText}`}>
                {sessionPreview?.previewStage ? getStageLabel(sessionPreview.previewStage, t) : currentStep}
              </div>
            </div>
            <div className={`text-xs tabular-nums ${mutedText}`}>
              {formatTime(previewTime)} / {formatTime(timelineDuration)}
            </div>
          </div>

          <div
            className={`mx-auto flex items-center justify-center overflow-hidden rounded-xl ${timelineTrack} ring-1 ${colorMode === 'dark' ? 'ring-white/10' : 'ring-slate-200'}`}
            style={previewFrameStyle}
          >
            {activeVisualSegment?.url ? (
              activeVisualSegment.type === 'video' ? (
                <div className="relative h-full w-full">
                  <video
                    key={activeVisualRenderKey}
                    ref={activeVideoRef}
                    src={activeVisualSegment.url}
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={handleActiveVideoReady}
                    onCanPlay={handleActiveVideoReady}
                    onSeeked={handleActiveVideoReady}
                    onError={handleActiveVideoReady}
                    onWaiting={handleActiveVideoWaiting}
                    onStalled={handleActiveVideoWaiting}
                    className={`h-full w-full object-contain transition-opacity duration-150 ${isActiveVisualReady ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!isActiveVisualReady && (
                    <div className={`absolute inset-0 flex items-center justify-center gap-2 text-sm ${mutedText}`}>
                      <FaSpinner className="animate-spin" />
                      Loading preview media
                    </div>
                  )}
                </div>
              ) : isActiveVisualReady ? (
                <img
                  src={activeVisualSegment.url}
                  alt={activeVisualSegment.title || 'Generated preview'}
                  onLoad={handleActiveImageReady}
                  onError={handleActiveImageReady}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center gap-2 text-sm ${mutedText}`}>
                  <FaSpinner className="animate-spin" />
                  Loading preview media
                </div>
              )
            ) : (
              <div className={`flex h-full w-full items-center justify-center text-sm ${mutedText}`}>
                Waiting for preview assets
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewPlaying((playing) => !playing)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                colorMode === 'dark'
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <input
              type="range"
              min="0"
              max={Math.max(0.1, timelineDuration)}
              step="0.1"
              value={Math.min(previewTime, Math.max(0.1, timelineDuration))}
              onChange={(event) => setPreviewTime(Number(event.target.value))}
              className="w-full"
              aria-label="Preview timeline"
            />
          </div>

          <div className="mt-3 space-y-2">
            {visualSegments.length > 0 && (
              <div>
                <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Visuals</div>
                <div className={`relative h-9 overflow-hidden rounded-lg ${timelineTrack}`}>
                  {visualSegments.map((segment) => {
                    const left = timelineDuration > 0 ? (segment.startTime / timelineDuration) * 100 : 0;
                    const width = timelineDuration > 0 ? (segment.duration / timelineDuration) * 100 : 100;
                    return (
                      <div
                        key={segment.key}
                        className="absolute top-1 h-7 rounded-md bg-indigo-500/80 px-2 text-[11px] font-semibold leading-7 text-white"
                        style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                        title={segment.title}
                      >
                        <span className="block truncate">{segment.type === 'video' ? 'Video' : 'Image'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {audioSegments.length > 0 && (
              <div>
                <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Audio</div>
                <div className={`relative h-9 overflow-hidden rounded-lg ${timelineTrack}`}>
                  {audioSegments.map((segment) => {
                    const left = timelineDuration > 0 ? (segment.startTime / timelineDuration) * 100 : 0;
                    const width = timelineDuration > 0 ? (segment.duration / timelineDuration) * 100 : 100;
                    return (
                      <div
                        key={segment.key}
                        className={`absolute top-1 h-7 rounded-md px-2 text-[11px] font-semibold leading-7 text-white ${
                          isSpeechAudio(segment) ? 'bg-emerald-500/80' : 'bg-cyan-500/80'
                        }`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                        title={segment.title}
                      >
                        <span className="block truncate">{isSpeechAudio(segment) ? 'Speech' : 'Audio'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="hidden">
            {audioSegments.map((segment) => (
              <audio
                key={segment.key}
                ref={(element) => registerAudioRef(segment.key, element)}
                src={segment.url}
                preload="auto"
              />
            ))}
          </div>
        </div>
      )}

      {videoActualLink && !isGenerationPending && (
        <div className="mt-5 clear-both">
          <div
            className={`mx-auto overflow-hidden rounded-xl ${timelineTrack} ring-1 ${colorMode === 'dark' ? 'ring-white/10' : 'ring-slate-200'}`}
            style={previewFrameStyle}
          >
            <video controls className="h-full w-full object-contain">
              <source src={`${videoActualLink}`} type="video/mp4" />
              {t("progress.videoUnsupported")}
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
