import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import CommonContainer from '../common/CommonContainer.tsx';
import FrameToolbar from './toolbars/frame_toolbar/index.jsx';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CURRENT_EDITOR_VIEW, FRAME_TOOLBAR_VIEW } from '../../constants/Types.ts';
import { getHeaders, clearAuthData } from '../../utils/web.jsx';
import VideoEditorContainer from './VideoEditorContainer.jsx';
import AddAudioDialog from './util/AddAudioDialog.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { debounce } from './util/debounce.jsx';
import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import AssistantHome from '../assistant/AssistantHome.jsx';
import { getImagePreloaderWorker } from './workers/imagePreloaderWorkerSingleton'; // Import the worker singleton
import FrameToolbarMinimal from './toolbars/FrameToolbarMinimal.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { FaCheck } from 'react-icons/fa';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';
import { NavCanvasControlContext } from '../../contexts/NavCanvasControlContext.jsx';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';
import { normalizeActiveTextItemListForCanvas } from '../../constants/TextConfig.jsx';


import FrameToolbarHorizontal from './toolbars/frame_toolbar/FrameToolbarHorizontal.jsx';

import ScreenLoader from './util/ScreenLoader.jsx';
import StudioSkeletonLoader from './util/StudioSkeletonLoader.jsx';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
const DEFAULT_SCENE_TRANSITION_PRESET = 'none';
const VALID_SCENE_TRANSITION_PRESETS = new Set(['none', 'fade', 'dissolve']);
const DISPLAY_FRAMES_PER_SECOND = 30;
const VIDEO_CANVAS_ZOOM_MODE_STORAGE_KEY = 'videoCanvasZoomMode';
const VIDEO_CANVAS_ZOOM_SCALE_STORAGE_KEY = 'videoCanvasZoomScale';
const CANVAS_ZOOM_STEP_RATIO = 0.25;
const MIN_CANVAS_ZOOM_RATIO = 0.5;
const MAX_CANVAS_ZOOM_RATIO = 4;

function clampCanvasZoomScale(nextScale, fitZoomScale = 1) {
  const safeBaseScale = Math.max(Number(fitZoomScale) || 1, 0.01);
  const minScale = safeBaseScale * MIN_CANVAS_ZOOM_RATIO;
  const maxScale = safeBaseScale * MAX_CANVAS_ZOOM_RATIO;
  return Math.min(Math.max(Number(nextScale) || safeBaseScale, minScale), maxScale);
}

function normalizeSceneTransitionPreset(value) {
  if (typeof value !== 'string') {
    return DEFAULT_SCENE_TRANSITION_PRESET;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalizedValue === 'crossfade' || normalizedValue === 'cross_fade') {
    return 'dissolve';
  }

  return VALID_SCENE_TRANSITION_PRESETS.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_SCENE_TRANSITION_PRESET;
}

function isActiveUserVideoUploadTask(task) {
  return task?.status === 'UPLOADING' || task?.status === 'PROCESSING';
}

function secondsToDisplayFrames(value) {
  return Math.max(
    0,
    Math.round((Number(value) || 0) * DISPLAY_FRAMES_PER_SECOND),
  );
}

function getLayerDisplayFrameRange(layer) {
  const startFrame = secondsToDisplayFrames(layer?.durationOffset);
  const durationFrames = Math.max(1, secondsToDisplayFrames(layer?.duration));

  return {
    startFrame,
    endFrame: startFrame + durationFrames,
  };
}

export default function VideoHome(props) {
  const {
    setZoomCanvasIn,
    setZoomCanvasOut,
    setResetCanvasZoom,
    setCanvasZoomPercent,
    setCanZoomInCanvas,
    setCanZoomOutCanvas,
  } = useContext(NavCanvasControlContext);
  const [videoSessionDetails, setVideoSessionDetails] = useState(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [currentLayer, setCurrentLayer] = useState({});
  const [layers, setLayers] = useState([]);
  const [frames, setFrames] = useState([]);
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const [currentLayerSeek, setCurrentLayerSeek] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLayerGenerationPending, setIsLayerGenerationPending] = useState(false);
  const [audioFileTrack, setAudioFileTrack] = useState(null);
  const [currentEditorView, setCurrentEditorView] = useState(CURRENT_EDITOR_VIEW.VIEW);
  const [downloadVideoDisplay, setDownloadVideoDisplay] = useState(false);
  const [renderedVideoPath, setRenderedVideoPath] = useState(null);
  const [activeItemList, setActiveItemList] = useState([]);
  const [isLayerSeeking, setIsLayerSeeking] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [frameToolbarView, setFrameToolbarView] = useState(FRAME_TOOLBAR_VIEW.DEFAULT);
  const [audioLayers, setAudioLayers] = useState([]);
  const [isAudioLayerDirty, setIsAudioLayerDirty] = useState(false);
  const [generationImages, setGenerationImages] = useState([]);
  const [layerListRequestAdded, setLayerListRequestAdded] = useState(false);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);
  const [isAssistantQueryGenerating, setIsAssistantQueryGenerating] = useState(false);
  const [polling, setPolling] = useState(false); // New state variable to track polling status
  const [displayZoomType, setDisplayZoomType] = useState('fit'); // fit or manual
  const [stageZoomScale, setStageZoomScale] = useState(1);

  const [sessionMetadata, setSessionMetadata] = useState(null);

  const [minimalToolbarDisplay, setMinimalToolbarDisplay] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(null);

  const [applyAudioDucking, setApplyAudioDucking] = useState(true);
  const [sceneTransitionPreset, setSceneTransitionPreset] = useState(DEFAULT_SCENE_TRANSITION_PRESET);

  const [isGuestSession, setIsGuestSession] = useState(false);

  // update current layer on update layers
  const [toggleUpdateCurrentLayer, setToggleUpdateCurrentLayer] = useState(false);
  const [currentLayerToBeUpdated, setCurrentLayerToBeUpdated] = useState(-1);

  const [isVideoPreviewPlaying, setIsVideoPreviewPlaying] = useState(false);
  const [isReorderPending, setIsReorderPending] = useState(false);

  const [downloadLink, setDownloadLink] = useState(null);

  const [preloadedLayerIds, setPreloadedLayerIds] = useState(new Set());
  const [renderCompletedThisSession, setRenderCompletedThisSession] = useState(false);
  const renderPollTimerRef = useRef(null);
  const layerPollTimerRef = useRef(null);
  const layersRef = useRef([]);
  const currentLayerRef = useRef({});
  const activeItemListRef = useRef([]);
  const previousSyncedLayerIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const videoSessionDetailsRef = useRef(null);
  const latestActiveItemListSaveRequestRef = useRef(0);
  const debouncedUpdateSessionLayerActiveItemListRef = useRef(null);
  const assistantFrameCaptureRef = useRef(null);

  let { id } = useParams();

  const { user, getUserAPI } = useUser();
  const { t } = useLocalization();

  const [isUpdateLayerPending, setIsUpdateLayerPending] = useState(false);


  const [canvasProcessLoading, setCanvasProcessLoading] = useState(false);

  const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
  const STATIC_CDN_URL = import.meta.env.VITE_STATIC_CDN_URL;

  const hasPendingFrameOrLayerGeneration = (sessionData) => {
    if (!sessionData) {
      return false;
    }

    if (sessionData.frameGenerationPending) {
      return true;
    }

    const sessionLayers = Array.isArray(sessionData.layers) ? sessionData.layers : [];
    return sessionLayers.some((layer) => (
      layer?.frameGenerationPending
      || layer?.aiVideoFrameGenerationPending
      || layer?.imageSession?.generationStatus === 'PENDING'
      || layer?.aiVideoGenerationPending
      || layer?.lipSyncGenerationPending
      || layer?.soundEffectGenerationPending
      || layer?.userVideoGenerationPending
      || layer?.videoEditPending
      || isActiveUserVideoUploadTask(layer?.userVideoUploadTask)
    ));
  };

  const hasBlockingLayerGenerationForRender = (sessionData) => {
    if (!sessionData) {
      return false;
    }

    const sessionLayers = Array.isArray(sessionData.layers) ? sessionData.layers : [];
    return sessionLayers.some((layer) => (
      layer?.imageSession?.generationStatus === 'PENDING'
      || layer?.aiVideoGenerationPending
      || layer?.lipSyncGenerationPending
      || layer?.soundEffectGenerationPending
      || layer?.userVideoGenerationPending
      || layer?.videoEditPending
      || isActiveUserVideoUploadTask(layer?.userVideoUploadTask)
    ));
  };

  const stopLayerPolling = () => {
    if (layerPollTimerRef.current) {
      clearInterval(layerPollTimerRef.current);
      layerPollTimerRef.current = null;
    }
    setPolling(false);
  };




  useEffect(() => {
    // Reset all state variables
    if (layerPollTimerRef.current) {
      clearInterval(layerPollTimerRef.current);
      layerPollTimerRef.current = null;
    }
    setVideoSessionDetails(null);
    setSelectedLayerIndex(0);
    setCurrentLayer({});
    setLayers([]);
    setFrames([]);
    setCurrentLayerSeek(0);
    setTotalDuration(0);
    setIsLayerGenerationPending(false);
    setAudioFileTrack(null);
    setCurrentEditorView(CURRENT_EDITOR_VIEW.VIEW);
    setDownloadVideoDisplay(false);
    setRenderedVideoPath(null);
    setActiveItemList([]);
    setIsLayerSeeking(false);
    setIsVideoGenerating(false);
    setFrameToolbarView(FRAME_TOOLBAR_VIEW.DEFAULT);
    setAudioLayers([]);
    setIsAudioLayerDirty(false);
    setGenerationImages([]);
    setLayerListRequestAdded(false);
    setIsCanvasDirty(false);
    setPolling(false); // Reset polling status
    setDisplayZoomType('fit'); // Reset zoom mode
    setStageZoomScale(getFitZoomScale()); // Reset zoom scale
    setMinimalToolbarDisplay(true);
    setAspectRatio(null);
    setApplyAudioDucking(true);
    setSceneTransitionPreset(DEFAULT_SCENE_TRANSITION_PRESET);
    setToggleUpdateCurrentLayer(false);
    setCurrentLayerToBeUpdated(-1);
    setRenderCompletedThisSession(false);

    // Now, load any default values from localStorage into state
    const defaultModel = localStorage.getItem("defaultModel") || 'DALLE3';
    const defaultSceneDuration = parseFloat(localStorage.getItem("defaultSceneDuration")) || 2;
    const defaultApplyAudioDucking = localStorage.getItem("applyAudioDucking") !== 'false'; // defaults to true
    const defaultMinimalToolbarDisplay = localStorage.getItem("minimalToolbarDisplay") !== 'false'; // defaults to true
    const storedZoomMode = localStorage.getItem(VIDEO_CANVAS_ZOOM_MODE_STORAGE_KEY);
    const storedZoomScaleValue = Number(localStorage.getItem(VIDEO_CANVAS_ZOOM_SCALE_STORAGE_KEY));
    const normalizedZoomMode = storedZoomMode === 'manual' ? 'manual' : 'fit';
    const fitZoomScale = getFitZoomScale();

    // If you have state variables for these, set them
    setApplyAudioDucking(defaultApplyAudioDucking);
    setMinimalToolbarDisplay(defaultMinimalToolbarDisplay);
    setDisplayZoomType(normalizedZoomMode);
    setStageZoomScale(
      normalizedZoomMode === 'manual' && Number.isFinite(storedZoomScaleValue)
        ? clampCanvasZoomScale(storedZoomScaleValue, fitZoomScale)
        : fitZoomScale
    );

    // If you need to pass these defaults to other components or use them in functions, make sure they're updated
    setVideoSessionDetails(prevDetails => ({
      ...prevDetails,
      defaultModel: defaultModel,
      defaultSceneDuration: defaultSceneDuration,
      applyAudioDucking: defaultApplyAudioDucking,
      sceneTransitionPreset: DEFAULT_SCENE_TRANSITION_PRESET,
    }));
  }, [id]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    currentLayerRef.current = currentLayer;
  }, [currentLayer]);

  useEffect(() => {
    activeItemListRef.current = activeItemList;
  }, [activeItemList]);

  useEffect(() => {
    sessionIdRef.current = id;
  }, [id]);

  useEffect(() => {
    videoSessionDetailsRef.current = videoSessionDetails;
  }, [videoSessionDetails]);

  useEffect(() => {
    if (!isCanvasDirty || !renderCompletedThisSession) {
      return;
    }

    setRenderCompletedThisSession(false);
  }, [isCanvasDirty, renderCompletedThisSession]);

  useEffect(() => {
    if (layers && layers.length > 0) {
      const hiddenContainer = document.getElementById('hidden-video-container');

      layers.forEach(layer => {

        if (layer && layer.aiVideoLayer) {

          const videoSrc = `${PROCESSOR_API_URL}/${layer.aiVideoLayer}`;
          const video = document.createElement('video');
          video.src = videoSrc;
          video.preload = 'none';
          video.style.display = 'none'; // Hide the video

          hiddenContainer.appendChild(video);
        } else if (layer && layer.userVideoLayer) {
          const videoSrc = `${PROCESSOR_API_URL}${layer.userVideoLayer}`;
          const video = document.createElement('video');
          video.src = videoSrc;
          video.preload = 'none';
          video.style.display = 'none';

          hiddenContainer.appendChild(video);
        }
      });

    }
  }, [layers]);







  useEffect(() => {
    if (!currentLayer) return;

    // Create a hidden container if not existing
    let hiddenContainer = document.getElementById('hidden-video-container');
    if (!hiddenContainer) {
      hiddenContainer = document.createElement('div');
      hiddenContainer.id = 'hidden-video-container';
      hiddenContainer.style.display = 'none';
      document.body.appendChild(hiddenContainer);
    }


    preloadLayerAiVideoLayer(currentLayer);

  }, [currentLayer]);




  const generateMeta = async () => {

    const payload = {
      sessionId: id,
    };

    const headers = getHeaders();

    const resData = await axios.post(`${PROCESSOR_API_URL}/video_sessions/generate_meta`, payload, headers);

    const sessionMeta = resData.data;

    setSessionMetadata(sessionMeta);
  }




  // --------------
  // HELPER: Preload
  // --------------
  const preloadVideo = (src, container) => {
    const videoEl = document.createElement('video');
    videoEl.src = src;
    // For truly minimal overhead, consider 'metadata' or 'none'
    videoEl.preload = 'metadata';
    videoEl.style.display = 'none';
    container.appendChild(videoEl);
  };

  function preloadLayerAiVideoLayer(layer) {
    if (!layer) return;
    const hiddenContainer = document.getElementById('hidden-video-container');
    if (!hiddenContainer) return;

    // Don’t re-preload the same layer if we already did
    if (preloadedLayerIds.has(layer._id)) return;

    // Mark this layer as preloaded
    setPreloadedLayerIds((prev) => new Set(prev).add(layer._id));

    // AI video
    if (layer.hasAiVideoLayer && layer.aiVideoLayer) {
      const videoURL = layer.aiVideoRemoteLink
        ? `${STATIC_CDN_URL}/${layer.aiVideoRemoteLink}`
        : `${PROCESSOR_API_URL}/${layer.aiVideoLayer}`;

      preloadVideo(videoURL, hiddenContainer);
    }

    // Lip sync video
    if (layer.hasLipSyncVideoLayer && layer.lipSyncVideoLayer) {
      const videoURL = layer.lipSyncRemoteLink
        ? `${STATIC_CDN_URL}/${layer.lipSyncRemoteLink}`
        : `${PROCESSOR_API_URL}/${layer.lipSyncVideoLayer}`;
      preloadVideo(videoURL, hiddenContainer);
    }

    // Sound effect video
    if (layer.hasSoundEffectVideoLayer && layer.soundEffectVideoLayer) {
      const videoURL = layer.soundEffectRemoteLink
        ? `${STATIC_CDN_URL}/${layer.soundEffectRemoteLink}`
        : `${PROCESSOR_API_URL}/${layer.soundEffectVideoLayer}`;
      preloadVideo(videoURL, hiddenContainer);
    }

    if (layer.hasUserVideoLayer && layer.userVideoLayer) {
      const videoURL = layer.userVideoRemoteLink
        ? `${STATIC_CDN_URL}/${layer.userVideoRemoteLink}`
        : `${PROCESSOR_API_URL}${layer.userVideoLayer}`;
      preloadVideo(videoURL, hiddenContainer);
    }
  }

  // ----------------------------------------------------------------
  // 1) Ensure the current layer's video is loaded FIRST (immediately)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!currentLayer) return;

    let hiddenContainer = document.getElementById('hidden-video-container');
    if (!hiddenContainer) {
      hiddenContainer = document.createElement('div');
      hiddenContainer.id = 'hidden-video-container';
      hiddenContainer.style.display = 'none';
      document.body.appendChild(hiddenContainer);
    }

    // Preload current layer only
    preloadLayerAiVideoLayer(currentLayer);

  }, [currentLayer]); // every time the current layer changes

  // ---------------------------------------------------------------------------
  // 2) Then load the *nearby* layers (e.g. ±2) using requestIdleCallback (if available)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // If we have no layers or invalid selection, do nothing
    if (!layers || layers.length === 0 || selectedLayerIndex == null) return;

    // Create container if needed
    let hiddenContainer = document.getElementById('hidden-video-container');
    if (!hiddenContainer) {
      hiddenContainer = document.createElement('div');
      hiddenContainer.id = 'hidden-video-container';
      hiddenContainer.style.display = 'none';
      document.body.appendChild(hiddenContainer);
    }

    // Figure out which indices to preload. For example ±2 from current
    // (Adjust the “2” as needed, or add more advanced logic for your timeline.)
    const indicesToPreload = [];
    for (let offset = -2; offset <= 2; offset++) {
      const idx = selectedLayerIndex + offset;
      if (idx < 0 || idx >= layers.length) continue;
      // Already preloaded or it is the current layer?
      if (idx === selectedLayerIndex) continue;
      indicesToPreload.push(idx);
    }

    let i = 0;
    function scheduleNext() {
      if (i >= indicesToPreload.length) return;

      // Use requestIdleCallback if the browser supports it
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          const layerIndex = indicesToPreload[i];
          preloadLayerAiVideoLayer(layers[layerIndex]);
          i++;
          scheduleNext();
        });
      } else {
        // fallback: just do it immediately
        const layerIndex = indicesToPreload[i];
        preloadLayerAiVideoLayer(layers[layerIndex]);
        i++;
        scheduleNext();
      }
    }
    scheduleNext();

  }, [layers, selectedLayerIndex, preloadedLayerIds]);




  useEffect(() => {
    if (
      Array.isArray(layers) &&
      typeof currentLayerToBeUpdated === 'number' &&
      currentLayerToBeUpdated >= 0 &&
      currentLayerToBeUpdated < layers.length
    ) {
      setCurrentLayer(layers[currentLayerToBeUpdated]);
      setSelectedLayerIndex(currentLayerToBeUpdated);
      setLayerListRequestAdded(true);
    }
  }, [currentLayerToBeUpdated, layers]);


  const showLoginDialog = () => {
    const loginComponent = (

      <AuthContainer />
    );
    openAlertDialog(loginComponent, undefined, false, AUTH_DIALOG_OPTIONS);
  };

  useEffect(() => {

    if (layers && layers.length > 0) {
      const hiddenContainer = document.getElementById('hidden-video-container');

      layers.forEach(layer => {


        if (layer.imageSession && layer.imageSession.activeItemList) {
          const imageItems = layer.imageSession.activeItemList.filter(i => i.type === 'image');
          imageItems.forEach(item => {
            const img = new Image();
            img.src = item.src.startsWith('http') ? item.src : `${PROCESSOR_API_URL}/${item.src}`;
            img.style.display = 'none'; // Hide the image
            //   hiddenContainer.appendChild(img);
          });
        }
      });
    }
  }, [layers]);

  useEffect(() => {
    if (layerListRequestAdded) {
      if (videoSessionDetails && !videoSessionDetails.isExpressGeneration) {
        //  pollForLayersUpdate();
      }
    }
  }, [layerListRequestAdded, layers]);

  useEffect(() => {
    if (layerPollTimerRef.current) {
      clearInterval(layerPollTimerRef.current);
      layerPollTimerRef.current = null;
    }
    setVideoSessionDetails(null);
    setSelectedLayerIndex(0);
    setCurrentLayer({});
    setLayers([]);
    setFrames([]);
    setCurrentLayerSeek(0);
    setTotalDuration(0);
    setIsLayerGenerationPending(false);
    setAudioFileTrack(null);
    setCurrentEditorView(CURRENT_EDITOR_VIEW.VIEW);
    setDownloadVideoDisplay(false);
    setRenderedVideoPath(null);
    setActiveItemList([]);
    setIsLayerSeeking(false);
    setIsVideoGenerating(false);
    setFrameToolbarView(FRAME_TOOLBAR_VIEW.DEFAULT);
    setAudioLayers([]);
    setIsAudioLayerDirty(false);
    setGenerationImages([]);
    setLayerListRequestAdded(false);
    setIsCanvasDirty(false);
    setPolling(false); // Reset polling status
  }, [id]);


  const getFitZoomScale = () => {
    if (aspectRatio === '1:1') {
      return 1;
    } else if (aspectRatio === '16:9') {
      return 0.56;
    } else if (aspectRatio === '9:16') {
      return 0.7;
    } else {
      return 1;
    }
  }

  useEffect(() => {
    const fitZoomScale = getFitZoomScale();
    if (displayZoomType === 'fit') {
      setStageZoomScale(fitZoomScale);
    }
  }, [aspectRatio, displayZoomType]);

  useEffect(() => {
    localStorage.setItem(
      VIDEO_CANVAS_ZOOM_MODE_STORAGE_KEY,
      displayZoomType === 'manual' ? 'manual' : 'fit'
    );
    localStorage.setItem(VIDEO_CANVAS_ZOOM_SCALE_STORAGE_KEY, String(stageZoomScale));
  }, [displayZoomType, stageZoomScale]);

  const zoomCanvasIn = useCallback(() => {
    const fitZoomScale = getFitZoomScale();
    const stepSize = fitZoomScale * CANVAS_ZOOM_STEP_RATIO;
    setDisplayZoomType('manual');
    setStageZoomScale((prevScale) => clampCanvasZoomScale(prevScale + stepSize, fitZoomScale));
  }, [aspectRatio]);

  const zoomCanvasOut = useCallback(() => {
    const fitZoomScale = getFitZoomScale();
    const stepSize = fitZoomScale * CANVAS_ZOOM_STEP_RATIO;
    setDisplayZoomType('manual');
    setStageZoomScale((prevScale) => clampCanvasZoomScale(prevScale - stepSize, fitZoomScale));
  }, [aspectRatio]);

  const resetCanvasZoom = useCallback(() => {
    const fitZoomScale = getFitZoomScale();
    setDisplayZoomType('fit');
    setStageZoomScale(fitZoomScale);
  }, [aspectRatio]);

  const toggleStageZoom = resetCanvasZoom;
  const fitZoomScale = getFitZoomScale();
  const canvasZoomPercent = Math.round((stageZoomScale / Math.max(fitZoomScale, 0.01)) * 100);
  const canZoomInCanvas =
    stageZoomScale < clampCanvasZoomScale(fitZoomScale * MAX_CANVAS_ZOOM_RATIO, fitZoomScale) - 0.001;
  const canZoomOutCanvas =
    stageZoomScale > clampCanvasZoomScale(fitZoomScale * MIN_CANVAS_ZOOM_RATIO, fitZoomScale) + 0.001;

  useEffect(() => {
    setZoomCanvasIn(() => zoomCanvasIn);
    setZoomCanvasOut(() => zoomCanvasOut);
    setResetCanvasZoom(() => resetCanvasZoom);
  }, [resetCanvasZoom, setResetCanvasZoom, setZoomCanvasIn, setZoomCanvasOut, zoomCanvasIn, zoomCanvasOut]);

  useEffect(() => {
    setCanvasZoomPercent(canvasZoomPercent);
    setCanZoomInCanvas(canZoomInCanvas);
    setCanZoomOutCanvas(canZoomOutCanvas);
  }, [
    canvasZoomPercent,
    canZoomInCanvas,
    canZoomOutCanvas,
    setCanvasZoomPercent,
    setCanZoomInCanvas,
    setCanZoomOutCanvas,
  ]);

  const setSelectedLayer = (layer) => {
    if (!layer || !layer._id) {
      return;
    }
    const index = layers.findIndex(l => l._id === layer._id);
    setSelectedLayerIndex(index);
    setCurrentLayer(layer);
    const { startFrame: newLayerSeek } = getLayerDisplayFrameRange(layer);
    // setCurrentLayerSeek(newLayerSeek);
  }

  useEffect(() => {
    if (isLayerSeeking || !currentLayer) {
      return;
    }

    const {
      startFrame: newLayerSeek,
      endFrame: currentLayerEndFrame,
    } = getLayerDisplayFrameRange(currentLayer);
    const resolvedCurrentLayerSeek = Number(currentLayerSeek);
    const isSeekWithinCurrentLayer = Number.isFinite(resolvedCurrentLayerSeek)
      && resolvedCurrentLayerSeek >= newLayerSeek
      && resolvedCurrentLayerSeek < currentLayerEndFrame;

    if (!isSeekWithinCurrentLayer) {
      setCurrentLayerSeek(newLayerSeek);
    }
  }, [currentLayer, currentLayerSeek, isLayerSeeking]);



  useEffect(() => {
    if (videoSessionDetails) {
      const defaultApplyAudioDucking = localStorage.getItem("applyAudioDucking") !== 'false';
      const resolvedApplyAudioDucking = typeof videoSessionDetails.applyAudioDucking === 'boolean'
        ? videoSessionDetails.applyAudioDucking
        : defaultApplyAudioDucking;
      setApplyAudioDucking(resolvedApplyAudioDucking);
      setSceneTransitionPreset(
        normalizeSceneTransitionPreset(videoSessionDetails.sceneTransitionPreset)
      );
    }
  }, [videoSessionDetails]);

  const handleApplyAudioDuckingChange = (nextValue) => {
    const resolvedValue = Boolean(nextValue);
    localStorage.setItem("applyAudioDucking", resolvedValue ? 'true' : 'false');
    setApplyAudioDucking(resolvedValue);
    setIsCanvasDirty(true);
    setVideoSessionDetails((prevDetails) => {
      if (!prevDetails) {
        return prevDetails;
      }

      return {
        ...prevDetails,
        applyAudioDucking: resolvedValue,
      };
    });

    if (isGuestSession) {
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      return;
    }

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_defaults`, {
      sessionId: id,
      defaults: {
        applyAudioDucking: resolvedValue,
      },
    }, headers).catch(() => {});
  };

  const handleSceneTransitionPresetChange = (nextValue) => {
    const resolvedPreset = normalizeSceneTransitionPreset(nextValue);
    setSceneTransitionPreset(resolvedPreset);
    setIsCanvasDirty(true);
    setVideoSessionDetails((prevDetails) => {
      if (!prevDetails) {
        return prevDetails;
      }

      return {
        ...prevDetails,
        sceneTransitionPreset: resolvedPreset,
      };
    });

    if (isGuestSession) {
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      return;
    }

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_defaults`, {
      sessionId: id,
      defaults: {
        sceneTransitionPreset: resolvedPreset,
      },
    }, headers).catch(() => {});
  };

  useEffect(() => {
    const headers = getHeaders();

    axios.get(`${PROCESSOR_API_URL}/video_sessions/session_details?id=${id}`, headers).then((dataRes) => {
      const sessionDetails = dataRes.data;


      if (sessionDetails.audio) {
        const audioFileTrack = `${PROCESSOR_API_URL}/video/audio/${sessionDetails.audio}`;
        setAudioFileTrack(audioFileTrack);
      }
      setVideoSessionDetails(sessionDetails);
      setIsGuestSession(sessionDetails.isGuestSession);
      const layers = sessionDetails.layers;
      const initialLayerIndex = Math.max(
        0,
        layers.findIndex((layer) => (
          isActiveUserVideoUploadTask(layer?.userVideoUploadTask)
          || layer?.userVideoGenerationPending
          || layer?.videoEditPending
        ))
      );
      setLayers(layers);
      setCurrentLayer(layers[initialLayerIndex] || layers[0]);
      setSelectedLayerIndex(initialLayerIndex);
      setAspectRatio(sessionDetails.aspectRatio);
      setAudioLayers(sessionDetails.audioLayers || []);

      if (sessionDetails.videoGenerationPending) {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      }

      const downloadLink = sessionDetails.remoteURL?.length
        ? sessionDetails.remoteURL
        : sessionDetails.videoLink
          ? `${PROCESSOR_API_URL}/${sessionDetails.videoLink}`
          : null;

      setDownloadLink(downloadLink);
      if (downloadLink) {
        setRenderedVideoPath(downloadLink);
        setDownloadVideoDisplay(true);
        setRenderCompletedThisSession(false);
      }

      let totalDuration = 0;
      layers.forEach(layer => {
        totalDuration += layer.duration;
      });
      setTotalDuration(totalDuration);
      setIsLayerGenerationPending(hasPendingFrameOrLayerGeneration(sessionDetails));
      setGenerationImages(sessionDetails.generations);
      setSessionMessages(sessionDetails.sessionMessages);
    }).catch(function (err) {
      clearAuthData();
      window.location.href = '/';
    })
  }, [id]);

  const prevCurrentLayerSeekRef = useRef(currentLayerSeek);


  useEffect(() => {
    if (!currentLayer) {
      return;
    }
    const {
      startFrame: currentLayerStartFrame,
      endFrame: currentLayerEndFrame,
    } = getLayerDisplayFrameRange(currentLayer);

    if (currentLayerStartFrame > currentLayerEndFrame) {
      return;
    }

    const prevCurrentLayerSeek = prevCurrentLayerSeekRef.current;

    if (currentLayerSeek > prevCurrentLayerSeek) {
      // Moving forward
      if (currentLayerSeek >= currentLayerEndFrame) {
        const nextLayerIndex = layers.findIndex(layer => layer._id === currentLayer._id) + 1;
        if (nextLayerIndex < layers.length) {
          setCurrentLayer(layers[nextLayerIndex]);
          setSelectedLayerIndex(nextLayerIndex);
        }
      }
    } else if (currentLayerSeek < prevCurrentLayerSeek) {
      // Moving backward
      if (currentLayerSeek < currentLayerStartFrame) {
        const prevLayerIndex = layers.findIndex(layer => layer._id === currentLayer._id) - 1;
        if (prevLayerIndex >= 0) {
          setCurrentLayer(layers[prevLayerIndex]);
          setSelectedLayerIndex(prevLayerIndex);
        }
      }
    }

    // Update the ref with the current value
    prevCurrentLayerSeekRef.current = currentLayerSeek;

  }, [currentLayerSeek, layers]);





  useEffect(() => {
    const currentLayerId = currentLayer?._id?.toString?.() || null;
    const shouldReuseLocalTextConfig =
      currentLayerId && previousSyncedLayerIdRef.current === currentLayerId;

    if (currentLayer && currentLayer.imageSession && currentLayer.imageSession.activeItemList) {
      const activeList = normalizeActiveTextItemListForCanvas(
        currentLayer.imageSession.activeItemList,
        getCanvasDimensionsForAspectRatio(videoSessionDetails?.aspectRatio),
        shouldReuseLocalTextConfig ? activeItemListRef.current : [],
        { preferFallbackTextConfig: shouldReuseLocalTextConfig }
      ).map(function (item) {
        return { ...item, isHidden: false };
      });
      setActiveItemList(activeList);
      // const newLayerSeek = Math.floor(currentLayer.durationOffset * 30);
      //setCurrentLayerSeek(newLayerSeek);
    } else {
      setActiveItemList([]);
    }
    previousSyncedLayerIdRef.current = currentLayerId;
  }, [currentLayer]);

  // Image Preloading Worker Setup
  useEffect(() => {
    if (layers && layers.length > 0) {
      const imagePreloaderWorker = getImagePreloaderWorker();

      imagePreloaderWorker.onmessage = function (e) {
        // 
      };

      imagePreloaderWorker.postMessage({ layers });

      return () => {
        imagePreloaderWorker.terminate();
      };
    }
  }, [layers]);

  const toggleHideItemInLayer = (itemId) => {
    const updatedActiveItemList = activeItemList.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isHidden: !item.isHidden,
        };
      }
      return item;
    });
    setActiveItemList(updatedActiveItemList);
  }

  useEffect(() => {
    if (isLayerGenerationPending) {
      pollForLayersUpdate();
    }
  }, [isLayerGenerationPending]);

  useEffect(() => {
    if (currentLayer && currentLayer.imageSession && currentLayer.imageSession.generationStatus === 'PENDING') {
      const currentLayerListData = layers.find((layer) => (layer._id.toString() === currentLayer._id.toString()));
      if (currentLayerListData.imageSession.generationStatus === 'COMPLETED') {
        setCurrentLayer(currentLayerListData);
      }
    }

  }, [layers, currentLayer]);


  const updateSessionLayersOrder = (newLayersOrder, updatedLayerId) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setCanvasProcessLoading(true);


    const newLayerIds = newLayersOrder.map(layer => layer._id);

    const reqPayload = {
      sessionId: id,
      layers: newLayerIds,
    };

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_layers_order`, reqPayload, headers)
      .then((response) => {
        // Handle successful update
        const videoSessionData = response.data;
        const updatedLayers = videoSessionData.layers;

        const updatedLayerIndex = updatedLayers.findIndex(layer => layer._id === updatedLayerId);


        // Use updateCurrentLayerAndLayerList to update layers and selected layer
        updateCurrentLayerAndLayerList(updatedLayers, updatedLayerIndex);

        setCanvasProcessLoading(false);

        setIsCanvasDirty(true); // If needed
      })
      .catch((error) => {
        // Handle error
        

        setCanvasProcessLoading(false);
      });
  };

  const pollForLayersUpdate = () => {
    if (polling || layerPollTimerRef.current) return; // Check if already polling
    setPolling(true); // Set polling status to true

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      setPolling(false);
      return;
    }

    const timer = setInterval(() => {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/refresh_session_layers`, { id: id }, headers).then((dataRes) => {
        const frameResponse = dataRes.data;
        if (frameResponse) {
          const newLayers = Array.isArray(frameResponse.layers) ? frameResponse.layers : [];
          const isGenerationPending = hasPendingFrameOrLayerGeneration(frameResponse);
          const previousLayers = layersRef.current;
          let layersUpdated = newLayers.length !== previousLayers.length;

          if (!layersUpdated) {
            for (let i = 0; i < newLayers.length; i++) {
              const prevLayer = previousLayers[i];
              const nextLayer = newLayers[i];
              if (!prevLayer || !nextLayer) {
                layersUpdated = true;
                break;
              }

              const didImageStatusChange =
                prevLayer?.imageSession?.generationStatus !== nextLayer?.imageSession?.generationStatus;
              const didFrameStatusChange =
                prevLayer?.frameGenerationPending !== nextLayer?.frameGenerationPending
                || prevLayer?.aiVideoFrameGenerationPending !== nextLayer?.aiVideoFrameGenerationPending;
              const didVideoTaskChange =
                prevLayer?.aiVideoGenerationPending !== nextLayer?.aiVideoGenerationPending
                || prevLayer?.lipSyncGenerationPending !== nextLayer?.lipSyncGenerationPending
                || prevLayer?.soundEffectGenerationPending !== nextLayer?.soundEffectGenerationPending
                || prevLayer?.userVideoGenerationPending !== nextLayer?.userVideoGenerationPending
                || prevLayer?.videoEditPending !== nextLayer?.videoEditPending
                || prevLayer?.videoEditStatus !== nextLayer?.videoEditStatus
                || prevLayer?.videoEditError !== nextLayer?.videoEditError
                || prevLayer?.videoEditTaskId !== nextLayer?.videoEditTaskId
                || prevLayer?.videoEditTaskMessage !== nextLayer?.videoEditTaskMessage
                || JSON.stringify(prevLayer?.videoEditPendingOperations || [])
                  !== JSON.stringify(nextLayer?.videoEditPendingOperations || [])
                || prevLayer?.userVideoGenerationStatus !== nextLayer?.userVideoGenerationStatus
                || prevLayer?.userVideoLayer !== nextLayer?.userVideoLayer
                || prevLayer?.userVideoGenerationError !== nextLayer?.userVideoGenerationError
                || prevLayer?.userVideoUploadTaskId !== nextLayer?.userVideoUploadTaskId
                || prevLayer?.userVideoUploadTask?.status !== nextLayer?.userVideoUploadTask?.status
                || prevLayer?.userVideoUploadTask?.uploadedBytes !== nextLayer?.userVideoUploadTask?.uploadedBytes
                || prevLayer?.userVideoUploadTask?.uploadedChunks !== nextLayer?.userVideoUploadTask?.uploadedChunks
                || prevLayer?.userVideoUploadTask?.message !== nextLayer?.userVideoUploadTask?.message;

              if (didImageStatusChange || didFrameStatusChange || didVideoTaskChange) {
                layersUpdated = true;
                break;
              }
            }
          }

          if (layersUpdated) {
            setLayers(newLayers);
            setVideoSessionDetails(frameResponse);
            setAudioLayers(frameResponse.audioLayers || []);
            if (Number.isFinite(frameResponse.totalDuration)) {
              setTotalDuration(frameResponse.totalDuration);
            }

            if (currentLayerRef.current?._id) {
              const refreshedCurrentLayer = newLayers.find(
                (layer) => layer._id === currentLayerRef.current._id
              );
              if (refreshedCurrentLayer) {
                setCurrentLayer(refreshedCurrentLayer);
              }
            }
          }

          setIsLayerGenerationPending(isGenerationPending);

          if (!isGenerationPending) {
            stopLayerPolling();
          }
        }
      }).catch(() => {
        stopLayerPolling();
      });
    }, 1000);

    layerPollTimerRef.current = timer;
  }

  const startVideoRenderPoll = () => {
    setRenderCompletedThisSession(false);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    if (renderPollTimerRef.current) {
      clearInterval(renderPollTimerRef.current);
      renderPollTimerRef.current = null;
    }

    const timer = setInterval(() => {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/get_render_video_status`, { id: id }, headers).then((dataRes) => {
        const renderData = dataRes.data || {};
        const renderStatus = renderData.status;
        const sessionData = renderData.session;

        if (sessionData) {
          setVideoSessionDetails(sessionData);
        }

        if (renderStatus === 'PENDING') {
          setIsVideoGenerating(true);
          return;
        }

        clearInterval(timer);
        renderPollTimerRef.current = null;
        setIsVideoGenerating(false);

        if (renderStatus === 'COMPLETED' && sessionData) {
          const videoLink = sessionData.remoteURL
            ? sessionData.remoteURL
            : `${PROCESSOR_API_URL}/${sessionData.videoLink}`;

          setRenderedVideoPath(`${videoLink}`);
          setDownloadVideoDisplay(true);
          setIsCanvasDirty(false);
          setDownloadLink(videoLink);
          setRenderCompletedThisSession(true);
          toast.success(<div>{t("studio.notifications.renderFinished")}</div>, {
            position: "bottom-center",
            className: "custom-toast",
          });
          return;
        }

        if (renderStatus === 'FAILED') {
          toast.error(renderData.generationError || sessionData?.generationError || 'Video render failed.', {
            position: "bottom-center",
            className: "custom-toast",
          });
        }

        setVideoSessionDetails((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            videoGenerationPending: false,
            expressGenerationPending: false,
          };
        });
      }).catch(() => {
        clearInterval(timer);
        renderPollTimerRef.current = null;
        setIsVideoGenerating(false);
      });
    }, 3000);

    renderPollTimerRef.current = timer;
  }

  const stopVideoRenderPoll = () => {
    if (renderPollTimerRef.current) {
      clearInterval(renderPollTimerRef.current);
      renderPollTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (videoSessionDetails && videoSessionDetails.audioLayers) {
      const audioLayerMap = videoSessionDetails.audioLayers.filter(layer => layer && layer.isEnabled).map(audioLayer => ({
        isSelected: false,
        ...audioLayer
      }));
      setAudioLayers(audioLayerMap);
    }
  }, [videoSessionDetails]);

  useEffect(() => {



    if (selectedLayerIndex && selectedLayerIndex === layers.length - 1) {

      setSelectedLayer(layers[selectedLayerIndex]);
    }
  }, [layers, selectedLayerIndex]);

  const requestVideoLayerEdit = async ({ layerId, operations }) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return { success: false };
    }

    try {
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/request_video_layer_edit`,
        {
          sessionId: id,
          layerId,
          operations,
        },
        headers
      );

      const sessionData = response?.data?.session;
      const updatedLayers = Array.isArray(sessionData?.layers) ? sessionData.layers : [];
      const updatedLayer = updatedLayers.find(
        (layer) => layer?._id?.toString?.() === layerId?.toString?.()
      );

      if (sessionData) {
        setVideoSessionDetails(sessionData);
        setLayers(updatedLayers);
        setIsLayerGenerationPending(true);
        setIsCanvasDirty(true);
        if (updatedLayer) {
          setCurrentLayer(updatedLayer);
        }
      }

      pollForLayersUpdate();

      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Video edit queued
        </div>,
        {
          position: "bottom-center",
          className: "custom-toast",
        }
      );

      return {
        success: true,
        session: sessionData,
        layer: updatedLayer,
      };
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to queue the video edit.', {
        position: "bottom-center",
        className: "custom-toast",
      });
      return {
        success: false,
        error,
      };
    }
  };

  const submitRenderVideo = () => {
    if (isUpdateLayerPending) {
      toast.error('Please wait for the scene update to finish before rendering.', {
        position: "bottom-center",
        className: "custom-toast",
      });
      return;
    }
    if (hasBlockingLayerGenerationForRender(videoSessionDetails)) {
      toast.error('Wait for the current layer processing to finish before rendering.', {
        position: "bottom-center",
        className: "custom-toast",
      });
      return;
    }

    setRenderCompletedThisSession(false);
    const renderPayload = {
      id,
      applyAudioDucking,
      sceneTransitionPreset,
    };

    if (isGuestSession) {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/request_render_guest_video`, renderPayload).then((dataRes) => {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      });

    } else {
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }


      axios.post(`${PROCESSOR_API_URL}/video_sessions/request_render_video`, renderPayload, headers).then((dataRes) => {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      });
    }
  }

  const cancelPendingRender = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/cancel_pending_render`, { id }, headers)
      .then((response) => {
        stopVideoRenderPoll();
        setIsVideoGenerating(false);
        if (response?.data?.session) {
          setVideoSessionDetails(response.data.session);
        } else {
          setVideoSessionDetails((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              videoGenerationPending: false,
              expressGenerationPending: false,
            };
          });
        }
        toast.success("Render cancelled", {
          position: "bottom-center",
          className: "custom-toast",
        });
      })
      .catch(() => {
      });
  };

  const setLayerDuration = (value, index) => {
    const newLayers = layers;
    newLayers[index].duration = parseFloat(value);
    setLayers(newLayers);
    let totalDuration = 0;
    newLayers.forEach(layer => {
      totalDuration += layer.duration;
    });
    // setTotalDuration(totalDuration);
  }


  const updateAllAudioLayersOneShot = async (updatedAudioLayers) => {
    try {
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }

      const payload = {
        sessionId: id,
        audioLayers: updatedAudioLayers
      };
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/update_all_audio_layers`,
        payload,
        headers
      );

      const { audioLayers: returnedLayers } = response.data;
      // Update local state with the “official” audioLayers from the server
      setAudioLayers(returnedLayers);
      setIsCanvasDirty(true);

      // Let FrameToolbar know the server accepted changes 
      // so we can clear "isDirty" states on that side:
      return { success: true, serverLayers: returnedLayers };
    } catch (error) {
      
      return { success: false, error };
    }
  };

  const duplicateAudioLayer = async (audioLayer) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return { success: false };
    }

    try {
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/duplicate_audio_layer`,
        {
          sessionId: id,
          audioLayerId: audioLayer?._id?.toString?.() || audioLayer?._id,
        },
        headers
      );

      const sessionDetails = response?.data?.sessionDetails;
      const duplicatedAudioLayer = response?.data?.audioLayer;
      if (sessionDetails) {
        setVideoSessionDetails(sessionDetails);
        setIsCanvasDirty(true);
      }

      toast.success('Audio layer duplicated', {
        position: 'bottom-center',
        className: 'custom-toast',
      });

      return {
        success: true,
        duplicatedAudioLayerId: duplicatedAudioLayer?._id?.toString?.() || duplicatedAudioLayer?._id || null,
      };
    } catch (error) {
      toast.error('Unable to duplicate audio layer', {
        position: 'bottom-center',
        className: 'custom-toast',
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    let totalDuration = 0;
    if (!layers) {
      return;
    }
    layers.forEach(layer => {
      totalDuration += layer.duration;
    });
    setTotalDuration(totalDuration);
  }, [layers]);

  useEffect(() => {
    return () => {
      if (layerPollTimerRef.current) {
        clearInterval(layerPollTimerRef.current);
        layerPollTimerRef.current = null;
      }
      stopVideoRenderPoll();
    };
  }, []);

  const fps = 30;
  const frameDurationMs = 1000 / fps;
  const totalDurationInFrames = totalDuration * fps;

  const setNewSeek = (newSeek) => {
    setCurrentLayerSeek(newSeek);
  };

  const addAudioToProject = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataURL = reader.result;
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }

      const payload = {
        id,
        dataURL,
      }
      axios.post(`${PROCESSOR_API_URL}/video_sessions/add_audio`, payload, headers)
        .then(response => {
          const sessionData = response.data;
          setVideoSessionDetails(sessionData);
          setIsCanvasDirty(true);
          if (sessionData.audio) {
            const audioFileTrack = `${PROCESSOR_API_URL}/video/audio/${sessionData.audio}`;
            setAudioFileTrack(audioFileTrack);
          }
          closeAlertDialog();
        })
        .catch(error => {
          
        });
    };
    reader.readAsDataURL(file);
  }

  const showAddAudioToProjectDialog = () => {
    openAlertDialog(
      <AddAudioDialog addAudioToProject={addAudioToProject} />,
    )
  }



  const setFrameEditDisplay = (frame) => {
    const layerID = frame.layerId;
    const layerItem = layers.find(layer => layer._id === layerID);
    setSelectedLayer(layerItem);
    setCurrentEditorView(CURRENT_EDITOR_VIEW.EDIT);
  }

  const toggleFrameDisplayType = () => {
    if (currentEditorView === CURRENT_EDITOR_VIEW.VIEW) {
      setCurrentEditorView(CURRENT_EDITOR_VIEW.EDIT);
    } else {
      setCurrentEditorView(CURRENT_EDITOR_VIEW.VIEW);
    }
  }

  const startPlayFrames = () => {
    const audio = audioFileTrack ? new Audio(audioFileTrack) : null;
    if (audio) {
      audio.load();
    }

    let currentFrameIndex = 0;
    const frameRate = 1000 / 30;

    const updateFrame = () => {
      if (currentFrameIndex >= frames.length) {
        clearInterval(playbackInterval);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        return;
      }
      setCurrentLayerSeek(currentFrameIndex);
      currentFrameIndex++;
    };

    if (audio) {
      audio.play();
    }

    const playbackInterval = setInterval(updateFrame, frameRate);
  };

  if (!debouncedUpdateSessionLayerActiveItemListRef.current) {
    debouncedUpdateSessionLayerActiveItemListRef.current = debounce((newActiveItemList) => {
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }

      const currentLayerSnapshot = currentLayerRef.current;
      const currentSessionId = sessionIdRef.current;
      const sessionDetailsSnapshot = videoSessionDetailsRef.current;
      const requestLayerId = currentLayerSnapshot?._id?.toString?.();

      if (!currentSessionId || !requestLayerId) {
        return;
      }

      const requestId = latestActiveItemListSaveRequestRef.current + 1;
      latestActiveItemListSaveRequestRef.current = requestId;

      const reqPayload = {
        sessionId: currentSessionId,
        activeItemList: newActiveItemList,
        layerId: requestLayerId,
        aspectRatio: sessionDetailsSnapshot?.aspectRatio,
      };

      setActiveItemList(newActiveItemList);

      axios
        .post(`${PROCESSOR_API_URL}/video_sessions/update_active_item_list`, reqPayload, headers)
        .then((response) => {
          if (requestId !== latestActiveItemListSaveRequestRef.current) {
            return;
          }

          const videoSessionData = response.data;
          const { session, layer } = videoSessionData || {};
          const updatedLayerId = layer?._id?.toString?.();

          if (session) {
            setVideoSessionDetails(session);
          }

          if (updatedLayerId) {
            const nextLayers = [...layersRef.current];
            const updatedLayerIndex = nextLayers.findIndex(
              (existingLayer) => existingLayer?._id?.toString?.() === updatedLayerId
            );

            if (updatedLayerIndex > -1) {
              nextLayers[updatedLayerIndex] = layer;
              setLayers(nextLayers);
            }
          }

          if (
            updatedLayerId
            && currentLayerRef.current?._id?.toString?.() === requestLayerId
            && updatedLayerId === requestLayerId
          ) {
            setCurrentLayer(layer);
            setActiveItemList(
              normalizeActiveTextItemListForCanvas(
                layer?.imageSession?.activeItemList || [],
                getCanvasDimensionsForAspectRatio(session?.aspectRatio || sessionDetailsSnapshot?.aspectRatio),
                newActiveItemList,
                { preferFallbackTextConfig: true }
              )
            );
          }

          setIsCanvasDirty(true);
        })
        .catch(function (err) {
          
        });
    }, 5);
  }

  const syncSessionAfterLayerItemMutation = (sessionData, updatedLayer) => {
    if (!sessionData) {
      return;
    }

    const updatedLayers = Array.isArray(sessionData.layers) ? sessionData.layers : [];
    setVideoSessionDetails(sessionData);
    setLayers(updatedLayers);
    setIsLayerGenerationPending(hasPendingFrameOrLayerGeneration(sessionData));

    if (!updatedLayer?._id) {
      return;
    }

    if (currentLayer?._id?.toString?.() === updatedLayer._id.toString()) {
      setCurrentLayer(updatedLayer);
      setActiveItemList(updatedLayer.imageSession?.activeItemList || []);
      return;
    }

    const refreshedCurrentLayer = updatedLayers.find(
      (layer) => layer?._id?.toString?.() === currentLayer?._id?.toString?.()
    );
    if (refreshedCurrentLayer) {
      setCurrentLayer(refreshedCurrentLayer);
    }
  };

  const updateSessionLayerActiveItemList = (newActiveItemList) => {



    //setActiveItemList(newActiveItemList);
    if (currentEditorView !== CURRENT_EDITOR_VIEW.SHOW_ANIMATE_DISPLAY) {
      debouncedUpdateSessionLayerActiveItemListRef.current?.(newActiveItemList);
    }
  };

  const updateSessionLayerActiveItemListAnimations = (newActiveItemList) => {
    //setActiveItemList(newActiveItemList);
    if (currentEditorView !== CURRENT_EDITOR_VIEW.SHOW_ANIMATE_DISPLAY) {
      debouncedUpdateSessionLayerActiveItemListRef.current?.(newActiveItemList);
    }
  };

  const updateLayerVisualItem = async ({ layerId, itemId, startFrame, endFrame }) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return { success: false };
    }

    try {
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/update_layer_visual_item`,
        {
          sessionId: id,
          layerId,
          itemId,
          startFrame,
          endFrame,
        },
        headers
      );

      syncSessionAfterLayerItemMutation(response.data?.session, response.data?.layer);
      setIsCanvasDirty(true);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      toast.error('Failed to update image or shape timing');
      return {
        success: false,
        error,
      };
    }
  };

  const deleteLayerVisualItem = async ({ layerId, itemId }) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return { success: false };
    }

    try {
      const response = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/delete_layer_visual_item`,
        {
          sessionId: id,
          layerId,
          itemId,
        },
        headers
      );

      syncSessionAfterLayerItemMutation(response.data?.session, response.data?.layer);
      setIsCanvasDirty(true);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      toast.error('Failed to delete image or shape item');
      return {
        success: false,
        error,
      };
    }
  };

  const showAudioTrackView = () => {
    if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
      setFrameToolbarView(FRAME_TOOLBAR_VIEW.DEFAULT);
    } else {
      setFrameToolbarView(FRAME_TOOLBAR_VIEW.EXPANDED);
    }
  }


  const applySynchronizeAnimationsToBeats = () => {
    toast.success(<div>{t("studio.notifications.applySyncAnimationBeats")}</div>, {
      position: "bottom-center",
      className: "custom-toast",
    });


    const headers = getHeaders();
    axios.post(`${PROCESSOR_API_URL}/video_sessions/apply_auto_synchronize_animations_to_beats`, { id: id }, headers).then((dataRes) => {
      const sessionData = dataRes.data;
      setVideoSessionDetails(sessionData);
      setIsCanvasDirty(true);

    });

  }


  const applySynchronizeLayersToBeats = () => {
    toast.success(<div>{t("studio.notifications.applySyncLayersBeats")}</div>, {
      position: "bottom-center",
      className: "custom-toast",
    });


    const headers = getHeaders();
    axios.post(`${PROCESSOR_API_URL}/video_sessions/apply_auto_synchronize_layers_to_beats`, { id: id }, headers).then((dataRes) => {
      const sessionData = dataRes.data;
      setVideoSessionDetails(sessionData);
      setIsCanvasDirty(true);
    });
  }

  const applySynchronizeLayersAndAnimationsToBeats = () => {
    toast.success(<div>{t("studio.notifications.applySyncLayersAndAnimations")}</div>, {
      position: "bottom-center",
      className: "custom-toast",
    });

    const headers = getHeaders();
    axios.post(`${PROCESSOR_API_URL}/video_sessions/apply_auto_synchronize_layers_to_animations_and_beats`, { id: id }, headers).then((dataRes) => {
      const sessionData = dataRes.data;
      setVideoSessionDetails(sessionData);
      setIsCanvasDirty(true);


    });
  }


  const updateAudioLayer = (audioLayerId, startTime, endTime, duration) => {



    const updatedAudioLayers = audioLayers.map(audioLayer => {
      if (audioLayer._id.toString() === audioLayerId.toString()) {
        audioLayer.startTime = startTime;
        audioLayer.isSelected = true;
        audioLayer.endTime = endTime;
        audioLayer.duration = duration;
        audioLayer.isDirty = true;
      } else {
        audioLayer.isSelected = false;
        audioLayer.isDirty = false;
      }
      return audioLayer;
    });

    setAudioLayers(updatedAudioLayers);
    setIsAudioLayerDirty(true);

  };


  const persistAudioLayerUpdate = () => {


    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const reqPayload = {
      sessionId: id,
      audioLayers: audioLayers,
    };
    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_audio_layers`, reqPayload, headers).then((response) => {
      setIsAudioLayerDirty(false);
      setIsCanvasDirty(true);
      toast.success(<div>{t("studio.notifications.audioLayerUpdated")}</div>, {
        position: "bottom-center",
        className: "custom-toast",
      });

      const resData = response.data;

      const { audioLayers } = resData;
      setAudioLayers(audioLayers);
    });

  }



  const removeAudioLayer = (audioLayer) => {

    const updatedAudioLayers = audioLayers.filter(ad => ad._id.toString() !== audioLayer._id.toString());
    setAudioLayers(updatedAudioLayers);
    setIsAudioLayerDirty(true);

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const audioLayerId = audioLayer._id.toString();
    const reqPayload = {
      sessionId: id,
      audioLayers: updatedAudioLayers,
      audioLayerId: audioLayerId
    };
    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_audio_layers`, reqPayload, headers).then((response) => {
      setIsAudioLayerDirty(false);
      setIsCanvasDirty(true);

      const resData = response.data;


      const { audioLayers } = resData;
      setAudioLayers(audioLayers);


      toast.success(<div>{t("studio.notifications.audioLayerRemoved")}</div>, {
        position: "bottom-center",
        className: "custom-toast",
      });
    });
  }

  const updateChangesToActiveAudioLayers = (e) => {
    e.preventDefault();
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }


    const formData = new FormData(e.target);

    // Retrieve the layerId from the hidden input
    const layerId = formData.get('layerId');
    const reqPayload = {
      sessionId: id,
      audioLayers: audioLayers,
      audioLayerId: layerId
    };

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_audio_layers`, reqPayload, headers).then((response) => {
      setIsAudioLayerDirty(false);
      setIsCanvasDirty(true);

      const resData = response.data;

      const { audioLayers } = resData;
      setAudioLayers(audioLayers);

      toast.success(<div>{t("studio.notifications.audioLayersUpdated")}</div>, {
        position: "bottom-center",
        className: "custom-toast",
      });
    });
  }


  // Inside VideoHome component


  const updateChangesToActiveSessionLayers = (e) => {



    e.preventDefault();
    const formData = new FormData(e.target);

    // Extract data from the form
    const combinedLayerId = formData.get('layerId'); // e.g. "someLayerId_textItemId"
    const startTime = parseFloat(formData.get('startTime'));
    const endTime = parseFloat(formData.get('endTime'));

    if (!combinedLayerId) {
      
      return;
    }

    // Parse combinedLayerId into layerId and itemId
    const underscoreIndex = combinedLayerId.indexOf('_');
    if (underscoreIndex === -1) {
      
      return;
    }

    const layerId = combinedLayerId.substring(0, underscoreIndex);
    const itemId = combinedLayerId.substring(underscoreIndex + 1);

    // Find the target layer
    const layerIndex = layers.findIndex((l) => l._id.toString() === layerId.toString());
    if (layerIndex === -1) {
      
      return;
    }

    // Copy layer to avoid direct state mutation
    const updatedLayer = { ...layers[layerIndex] };

    if (!updatedLayer.imageSession || !updatedLayer.imageSession.activeItemList) {
      
      return;
    }

    // Find the text item within the layer
    const itemIndex = updatedLayer.imageSession.activeItemList.findIndex(
      (item) => item.id.toString() === itemId.toString()
    );

    if (itemIndex === -1) {
      
      return;
    }

    const updatedItem = { ...updatedLayer.imageSession.activeItemList[itemIndex] };

    // Convert times to frames
    const fps = 30;
    const newStartFrame = Math.round(startTime * fps);
    const newEndFrame = Math.round(endTime * fps);

    // Update item frames and duration based on startTime/endTime
    updatedItem.startFrame = newStartFrame;
    updatedItem.endFrame = newEndFrame;

    updatedItem.startTime = startTime;
    updatedItem.endTime = endTime;

    // The frameOffset is relative to the layer's durationOffset
    const layerStartFrame = Math.floor(updatedLayer.durationOffset * fps);
    updatedItem.frameOffset = newStartFrame - layerStartFrame;
    updatedItem.frameDuration = newEndFrame - newStartFrame;

    // Update the item in the layer
    updatedLayer.imageSession.activeItemList[itemIndex] = updatedItem;

    // Now update the activeItemList on the server
    // Instead of calling updateSessionLayer, we call updateSessionLayerActiveItemList
    const newActiveItemList = [...updatedLayer.imageSession.activeItemList];

    // This function is already defined in VideoHome and will handle the API call.
    updateSessionLayerActiveItemList(newActiveItemList);

    // Optionally, update local activeItemList state immediately
    setActiveItemList(newActiveItemList);
  };






  const addLayerToComposition = (position) => {

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setCanvasProcessLoading(true);

    const currentLayerIndex = layers.findIndex(layer => layer._id === currentLayer._id);

    const payload = {
      sessionId: id,
      duration: videoSessionDetails.defaultSceneDuration ? videoSessionDetails.defaultSceneDuration : 2,
      position: position,
      currentLayerIndex: currentLayerIndex,
    };



    axios.post(`${PROCESSOR_API_URL}/video_sessions/add_layer`, payload, headers).then((dataRes) => {
      const resData = dataRes.data;

      const videoSessionDetails = resData.session;
      const newLayers = videoSessionDetails.layers;
      const newLayer = resData.layer;
      const newLayerIndex = newLayers.findIndex(layer => layer._id === newLayer._id);

      updateCurrentLayerAndLayerList(newLayers, newLayerIndex);
      setIsCanvasDirty(true);
      setCanvasProcessLoading(false);
    }).catch(function (err) {
      
      setCanvasProcessLoading(false);
    });
  }



  const copyCurrentLayerBelow = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const newLayer = { ...currentLayer, _id: undefined };

    const currentIndex = layers.findIndex((layer) => layer._id === currentLayer._id);
    const newLayerIndex = currentIndex + 1;

    const payload = {
      sessionId: id,
      newLayer,
      index: newLayerIndex,
    };

    axios.post(`${PROCESSOR_API_URL}/video_sessions/copy_layer`, payload, headers).then((dataRes) => {
      const resData = dataRes.data;
      const videoSessionDetails = resData.videoSession;
      const newLayers = videoSessionDetails.layers;

      setLayers(newLayers);
      setSelectedLayerIndex(newLayerIndex);
      setCurrentLayer(newLayers[newLayerIndex]);
      setIsCanvasDirty(true);
    });
  };

  const updateSessionLayer = (newLayer, clipPayload) => {
    setIsUpdateLayerPending(true);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const reqPayload = {
      sessionId: id,
      layer: newLayer,
      clipData: clipPayload
    };

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_layer`, reqPayload, headers).then((response) => {
      const resData = response.data;
      const { session, layer, audioLayers: updatedAudioLayers } = resData;


      const layers = session.layers;
      const authoritativeAudioLayers = (updatedAudioLayers || session.audioLayers || [])
        .filter((audioLayer) => audioLayer && audioLayer.isEnabled)
        .map((audioLayer) => ({
          isSelected: false,
          isDirty: false,
          ...audioLayer,
        }));

      const newLayerIndex = layers.findIndex(l => l._id.toString() === layer._id.toString());



      setVideoSessionDetails(session);
      setAudioLayers(authoritativeAudioLayers);
      updateCurrentLayerAndLayerList(layers, newLayerIndex);

      setIsUpdateLayerPending(false);

      setIsCanvasDirty(true);
    });
  } // Adjust the delay as needed

  const removeSessionLayer = (layerIndex) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setCanvasProcessLoading(true);

    const layerId = layers[layerIndex]._id.toString();
    const reqPayload = {
      sessionId: id,
      layerId: layerId
    }
    axios.post(`${PROCESSOR_API_URL}/video_sessions/remove_layer`, reqPayload, headers).then((response) => {
      const videoSessionDataResponse = response.data;
      const videoSessionData = videoSessionDataResponse.videoSession;
      const updatedLayers = videoSessionData.layers;
      let newLayerIndex = layerIndex > 0 ? layerIndex - 1 : 0;
      setLayers(updatedLayers);
      setCurrentLayer(updatedLayers[newLayerIndex]);
      setSelectedLayerIndex(newLayerIndex);
      setIsCanvasDirty(true);
      setCanvasProcessLoading(false);
    }).catch(function (err) {
      
      setCanvasProcessLoading(false);
    })
  }

  const publishVideoSession = (payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const normalizedTags = typeof payload.tags === 'string'
      ? payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : Array.isArray(payload.tags)
        ? payload.tags.map((tag) => tag.trim()).filter(Boolean)
        : [];

    const sessionLanguage =
      typeof payload.sessionLanguage === 'string' && payload.sessionLanguage.trim().length > 0
        ? payload.sessionLanguage.trim()
        : typeof videoSessionDetails?.sessionLanguage === 'string' &&
          videoSessionDetails.sessionLanguage.trim().length > 0
          ? videoSessionDetails.sessionLanguage.trim()
          : typeof videoSessionDetails?.language === 'string' &&
            videoSessionDetails.language.trim().length > 0
            ? videoSessionDetails.language.trim()
            : null;

    const languageString =
      typeof payload.languageString === 'string' && payload.languageString.trim().length > 0
        ? payload.languageString.trim()
        : typeof videoSessionDetails?.languageString === 'string' &&
          videoSessionDetails.languageString.trim().length > 0
          ? videoSessionDetails.languageString.trim()
          : null;

    const publishPayload = {
      ...payload,
      tags: normalizedTags,
      aspectRatio: aspectRatio,
      ispublishedVideo: true,
    };
    if (sessionLanguage) {
      publishPayload.sessionLanguage = sessionLanguage;
    }
    if (languageString) {
      publishPayload.languageString = languageString;
    }

    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/publish_session`, publishPayload, headers)
      .then((response) => {
        const publicationData = response.data;
        setVideoSessionDetails((prevDetails) => {
          if (!prevDetails) {
            return prevDetails;
          }

          return {
            ...prevDetails,
            ispublishedVideo: true,
            publishedTitle: publishPayload.title,
            publishedDescription: publishPayload.description,
            publishedTags: normalizedTags,
            publishedAspectRatio: publishPayload.aspectRatio,
            publishedVideoURL: publicationData?.videoURL || prevDetails.publishedVideoURL || prevDetails.remoteURL,
            publishedAt: publicationData?.updatedAt || prevDetails.publishedAt || new Date().toISOString(),
          };
        });
      })
      .catch((error) => {
        
      });
  }

  const unpublishVideoSession = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const sessionId = (videoSessionDetails?._id || id) ?? null;
    if (!sessionId) {
      return;
    }

    const confirmation = window.confirm('Are you sure you want to unpublish this video?');
    if (!confirmation) {
      return;
    }

    axios
      .post(
        `${PROCESSOR_API_URL}/video_sessions/unpublish_session`,
        { sessionId },
        headers
      )
      .then(() => {
        setVideoSessionDetails((prevDetails) => {
          if (!prevDetails) {
            return prevDetails;
          }

          return {
            ...prevDetails,
            ispublishedVideo: false,
            publishedTitle: null,
            publishedDescription: null,
            publishedTags: [],
            publishedAspectRatio: null,
            publishedVideoURL: null,
            publishedAt: null,
            publishedOriginalPrompt: null,
            publishedSplashImage: null,
            publishedImageModel: null,
            publishedVideoModel: null,
            publishedPublicationId: null,
          };
        });
      })
      .catch((error) => {
        
      });
  };

  const updateCurrentActiveLayer = (imageItem) => {

    // stripe any query params from the image src
    const src = imageItem.src.split('?')[0];
    const imageItemNew = { ...imageItem, src: src };
    const newActiveItemList = activeItemList.concat(imageItemNew);
    debouncedUpdateSessionLayerActiveItemListRef.current?.(newActiveItemList);
  }

  const addLayersViaPromptList = (payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const { promptList, duration } = payload;

    const localPayloadModel = localStorage.getItem("defaultModel");


    let payloadModel = 'DALLE3';
    if (localPayloadModel) {
      payloadModel = localPayloadModel;
    }
    const reqPayload = {
      sessionId: id,
      promptList: promptList,
      duration: duration,
      aspectRatio: aspectRatio,
      model: payloadModel,
    };




    setLayerListRequestAdded(false);
    axios.post(`${PROCESSOR_API_URL}/video_sessions/add_layers_via_prompt_list`, reqPayload, headers).then((response) => {
      const videoSessionDataResponse = response.data;
      const videoSessionData = videoSessionDataResponse.videoSession;
      const previousLength = layers.length; // Calculate the previous length

      setVideoSessionDetails(videoSessionData);
      const updatedLayers = videoSessionData.layers;
      setLayers(updatedLayers);
      setLayerListRequestAdded(true);
      setSelectedLayerIndex(previousLength); // Set selected index to the first item of the new prompt list
      setCurrentLayer(updatedLayers[previousLength + 1]);
      setIsCanvasDirty(true);
    });
  }

  const updateLayerMask = (layerData) => {
    let layerDataNew = Object.assign({}, currentLayer, { segmentation: layerData.segmentation })
    setCurrentLayer(layerDataNew);
  }

  const resetLayerMask = () => {
    let layerDataNew = Object.assign({}, currentLayer, { segmentation: null })
    // setCurrentLayer(layerDataNew);
  }

  const updateCurrentLayer = (layerData) => {
    const layerId = layerData._id.toString();


    const updatedLayers = layers.map(layer => {
      if (layer._id.toString() === layerId) {
        return layerData;
      }
      return layer;
    });


    setLayers(updatedLayers);
    setCurrentLayer(layerData);

    const { startFrame: newLayerSeek } = getLayerDisplayFrameRange(layerData);
    if (!isLayerSeeking) {
      setCurrentLayerSeek(newLayerSeek);
    }
    // setCurrentLayerSeek(newLayerSeek);

  }

  const updateCurrentLayerInSessionList = (layerData) => {
    setCurrentLayer(layerData);
  }



  const updateCurrentLayerAndLayerList = (layerList, updatedLayerIndex) => {
    setLayers(layerList);

    if (
      Array.isArray(layerList) &&
      typeof updatedLayerIndex === 'number' &&
      updatedLayerIndex >= 0 &&
      updatedLayerIndex < layerList.length
    ) {
      setCurrentLayer(layerList[updatedLayerIndex]);
      setSelectedLayerIndex(updatedLayerIndex);
      setLayerListRequestAdded(true);
    }

    setCurrentLayerToBeUpdated(updatedLayerIndex);
  };

  const setAssistantFrameCapture = useCallback((captureFn) => {
    assistantFrameCaptureRef.current = typeof captureFn === 'function' ? captureFn : null;
  }, []);

  const getAssistantFrameImageData = useCallback(async () => {
    if (typeof assistantFrameCaptureRef.current !== 'function') {
      return null;
    }

    return await assistantFrameCaptureRef.current();
  }, []);

  if (!videoSessionDetails) {
    return <StudioSkeletonLoader />;
  }



  const startAssistantQueryPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const timer = setInterval(() => {
      axios.get(`${PROCESSOR_API_URL}/assistants/assistant_query_status?id=${id}`, headers).then((dataRes) => {
        const assistantQueryData = dataRes.data;
        const assistantQueryStatus = assistantQueryData.status;
        if (assistantQueryStatus === 'COMPLETED') {
          const sessionData = assistantQueryData.sessionDetails;
          clearInterval(timer);
          const assistantQueryResponse = assistantQueryData.response;
          setSessionMessages(sessionData.sessionMessages);
          setIsAssistantQueryGenerating(false);
        }
      });
    }, 1000);

  }

  const submitAssistantQuery = (query, options = {}) => {

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setIsAssistantQueryGenerating(true);
    axios.post(`${PROCESSOR_API_URL}/assistants/submit_assistant_query`, {
      id: id,
      query: query,
      frameImage: options?.frameImage || null,
    }, headers).then((response) => {
      const assistantResponse = response.data;
      startAssistantQueryPoll();
    }).catch(function (err) {
      setIsAssistantQueryGenerating(false);
    });
  }

  const applyAnimationToAllLayers = (animationData, animationType) => {
    const updatedLayers = layers.map(layer => {
      if (layer.imageSession && layer.imageSession.activeItemList) {
        const updatedActiveItemList = layer.imageSession.activeItemList.map(item => {
          if (item.type === 'image') {
            let animations = item.animations || [];
            const existingAnimationIndex = animations.findIndex(animation => animation.type === animationType);
            if (existingAnimationIndex !== -1) {
              animations[existingAnimationIndex] = {
                type: animationType,
                params: animationData
              };
            } else {
              animations.push({
                type: animationType,
                params: animationData
              });
            }
            return {
              ...item,
              animations: animations
            };
          }
          return item;
        });
        return {
          ...layer,
          imageSession: {
            ...layer.imageSession,
            activeItemList: updatedActiveItemList
          }
        };
      }
      return layer;
    });

    setLayers(updatedLayers);
    updateSessionLayersOnServer(updatedLayers);
  };

  const updateSessionLayersOnServer = (updatedLayers) => {


    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const reqPayload = {
      sessionId: id,
      layers: updatedLayers
    };

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_layers`, reqPayload, headers).then((response) => {
      const videoSessionData = response.data;
      setLayers(videoSessionData.layers);
      setIsCanvasDirty(true);
    });
  };

  const submitRegenerateFrames = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    axios.post(`${PROCESSOR_API_URL}/video_sessions/regenerate_frames`, { sessionId: id }, headers).then((response) => {
      const videoSessionData = response.data;
      if (videoSessionData?.layers) {
        setLayers(videoSessionData.layers);
        setVideoSessionDetails(videoSessionData);
      }
      toast.success(t("studio.notifications.framesRegenerationRequested"));
      setIsCanvasDirty(true);
      setIsVideoGenerating(false);
      stopLayerPolling();
      setIsLayerGenerationPending(false);
    }).catch((error) => {
      toast.error(error?.response?.data?.error || 'Failed to request frame regeneration');
    });
  }

  const onToggleMinimalFrameToolbarDisplay = () => {
    setMinimalToolbarDisplay(!minimalToolbarDisplay);
  }



  const applyAudioTrackVisualizerToProject = () => {
    toast.success(<div><FaCheck className='inline-flex mr-2' />  {t("studio.notifications.audioVisualizerRequested")}</div>, {
      position: "bottom-center",
      className: "custom-toast",
    });

    const headers = getHeaders();
    axios.post(`${PROCESSOR_API_URL}/video_sessions/apply_audio_track_visualizer`, { id: id }, headers).then((response) => {
      const resData = response.data;
      setIsCanvasDirty(true);

    });

  }



  const regenerateVideoSessionSubtitles = () => {
    const headers = getHeaders();
    setCanvasProcessLoading(true);

    axios.post(`${PROCESSOR_API_URL}/video_sessions/request_regenerate_subtitles`, { sessionId: id, realignAudio: true }, headers).then((response) => {
      const videoSessionData = response.data;
      setVideoSessionDetails(videoSessionData);
      setIsCanvasDirty(true);
      setCanvasProcessLoading(false);
    });
  }

  const requestRealignLayers = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setCanvasProcessLoading(true);
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_realign_layers`, { sessionId: id }, headers)
      .then((response) => {
        if (response?.data?.session) {
          setVideoSessionDetails(response.data.session);
        }
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> {t("studio.notifications.realignLayersToAiVideoRequested")}
          </div>,
          {
            position: "bottom-center",
            className: "custom-toast",
          }
        );
        setIsCanvasDirty(true);
      })
      .catch(() => {
      })
      .finally(() => {
        setCanvasProcessLoading(false);
      });
  }

  const isVideoRenderPending = Boolean(isVideoGenerating || videoSessionDetails?.videoGenerationPending);


  const editorContainerDisplay = (
    <div className=''>
      <VideoEditorContainer
        selectedLayerIndex={selectedLayerIndex}
        layers={layers}
        key={`layer_canvas_${selectedLayerIndex}`}
        currentLayerSeek={currentLayerSeek}
        currentEditorView={currentEditorView}
        setCurrentEditorView={setCurrentEditorView}
        toggleFrameDisplayType={toggleFrameDisplayType}
        setFrameEditDisplay={setFrameEditDisplay}
        currentLayer={currentLayer}
        setCurrentLayerSeek={setCurrentLayerSeek}
        updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
        updateSessionLayerActiveItemListAnimations={updateSessionLayerActiveItemListAnimations}
        activeItemList={activeItemList}
        setActiveItemList={setActiveItemList}
        isLayerSeeking={isLayerSeeking}
        showAddAudioToProjectDialog={showAddAudioToProjectDialog}
        generationImages={generationImages}
        setGenerationImages={setGenerationImages}
        updateCurrentActiveLayer={updateCurrentActiveLayer}
        videoSessionDetails={videoSessionDetails}
        setVideoSessionDetails={setVideoSessionDetails}
        toggleHideItemInLayer={toggleHideItemInLayer}
        updateLayerMask={updateLayerMask}
        resetLayerMask={resetLayerMask}
        pollForLayersUpdate={pollForLayersUpdate}
        setIsCanvasDirty={setIsCanvasDirty}
        updateCurrentLayer={updateCurrentLayer}
        applyAnimationToAllLayers={applyAnimationToAllLayers}
        isExpressGeneration={videoSessionDetails.isExpressGeneration}
        aspectRatio={videoSessionDetails.aspectRatio}
        displayZoomType={displayZoomType}
        toggleStageZoom={toggleStageZoom}
        stageZoomScale={stageZoomScale}
        zoomCanvasIn={zoomCanvasIn}
        zoomCanvasOut={zoomCanvasOut}
        resetCanvasZoom={resetCanvasZoom}
        canvasZoomPercent={canvasZoomPercent}
        canZoomInCanvas={canZoomInCanvas}
        canZoomOutCanvas={canZoomOutCanvas}
        updateCurrentLayerInSessionList={updateCurrentLayerInSessionList}
        updateCurrentLayerAndLayerList={updateCurrentLayerAndLayerList}
        totalDuration={totalDuration}
        isUpdateLayerPending={isUpdateLayerPending}
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        applyAudioDucking={applyAudioDucking}
        audioLayers={audioLayers}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
        setAudioLayers={setAudioLayers}
        isRenderPending={isVideoRenderPending}

        setIsLayerSeeking={setIsLayerSeeking}

        setSelectedLayerIndex={setSelectedLayerIndex}
        setSelectedLayer={setSelectedLayer}
        onAssistantFrameCaptureChange={setAssistantFrameCapture}





      />




    </div>
  );


  let frameToolbarDisplay = null;

  if (minimalToolbarDisplay) {
    frameToolbarDisplay = (
      <div className='w-[2%] inline-block'>
        <FrameToolbarMinimal
          onToggleDisplay={onToggleMinimalFrameToolbarDisplay} />
      </div>
    )
  } else {
    frameToolbarDisplay = (
      <div className='w-[14%] inline-block'>
        <FrameToolbar
          layers={layers}
          setSelectedLayerIndex={setSelectedLayerIndex}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          setLayerDuration={setLayerDuration}
          selectedLayerIndex={selectedLayerIndex}
          setCurrentLayerSeek={setNewSeek}
          currentLayerSeek={currentLayerSeek}
          submitRenderVideo={submitRenderVideo}
          totalDuration={totalDuration}
          showAddAudioToProjectDialog={showAddAudioToProjectDialog}
          audioFileTrack={audioFileTrack}
          setSelectedLayer={setSelectedLayer}
          startPlayFrames={startPlayFrames}
          renderedVideoPath={renderedVideoPath}
          downloadVideoDisplay={downloadVideoDisplay}
          sessionId={id}
          updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
          updateSessionLayer={updateSessionLayer}
          setIsLayerSeeking={setIsLayerSeeking}
          isLayerSeeking={isLayerSeeking}
          isVideoGenerating={isVideoGenerating}
          showAudioTrackView={showAudioTrackView}
          frameToolbarView={frameToolbarView}
          audioLayers={audioLayers}
          updateAudioLayer={updateAudioLayer}
          isAudioLayerDirty={isAudioLayerDirty}
          removeAudioLayer={removeAudioLayer}
          updateChangesToActiveAudioLayers={updateChangesToActiveAudioLayers}
          addLayerToComposition={addLayerToComposition}
          copyCurrentLayerBelow={copyCurrentLayerBelow}
          removeSessionLayer={removeSessionLayer}
          addLayersViaPromptList={addLayersViaPromptList}
          defaultSceneDuration={videoSessionDetails.defaultSceneDuration}
          isCanvasDirty={isCanvasDirty}
          downloadLink={downloadLink}
          submitRegenerateFrames={submitRegenerateFrames}
          applySynchronizeAnimationsToBeats={applySynchronizeAnimationsToBeats}
          applyAudioDucking={applyAudioDucking}
          sceneTransitionPreset={sceneTransitionPreset}
          onSceneTransitionPresetChange={handleSceneTransitionPresetChange}
          onApplyAudioDuckingChange={handleApplyAudioDuckingChange}
          applySynchronizeLayersToBeats={applySynchronizeLayersToBeats}
          applySynchronizeLayersAndAnimationsToBeats={applySynchronizeLayersAndAnimationsToBeats}
          applyAudioTrackVisualizerToProject={applyAudioTrackVisualizerToProject}
          onLayersOrderChange={updateSessionLayersOrder}
          updateSessionLayersOnServer={updateSessionLayersOnServer}
          updateChangesToActiveSessionLayers={updateChangesToActiveSessionLayers}
          isGuestSession={isGuestSession}
          regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
          updateLayerVisualItem={updateLayerVisualItem}
          deleteLayerVisualItem={deleteLayerVisualItem}
          duplicateAudioLayer={duplicateAudioLayer}
          publishVideoSession={publishVideoSession}
          unpublishVideoSession={unpublishVideoSession}
          isSessionPublished={Boolean(videoSessionDetails?.ispublishedVideo)}
          generateMeta={generateMeta}
          sessionMetadata={sessionMetadata}
          updateAllAudioLayersOneShot={updateAllAudioLayersOneShot}
          requestVideoLayerEdit={requestVideoLayerEdit}
          renderCompletedThisSession={renderCompletedThisSession}
          isRenderPending={isVideoRenderPending}
          isUpdateLayerPending={isUpdateLayerPending}
          isVideoPreviewPlaying={isVideoPreviewPlaying}
          requestRealignLayers={requestRealignLayers}
          cancelPendingRender={cancelPendingRender}
          framesPerSecond={videoSessionDetails?.framesPerSecond || 24}
        />
      </div>
    )
  }
  return (
    <CommonContainer
      isVideoPreviewPlaying={isVideoPreviewPlaying}
      setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
      isRenderPending={isVideoRenderPending}
    >
      <div className='m-auto'>
        <div className='block'>
          <div className='w-[10%] inline-block'>
            <FrameToolbar
              layers={layers}
              setSelectedLayerIndex={setSelectedLayerIndex}
              currentLayer={currentLayer}
              setCurrentLayer={setCurrentLayer}
              setLayerDuration={setLayerDuration}
              selectedLayerIndex={selectedLayerIndex}
              setCurrentLayerSeek={setNewSeek}
              currentLayerSeek={currentLayerSeek}
              submitRenderVideo={submitRenderVideo}
              totalDuration={totalDuration}
              showAddAudioToProjectDialog={showAddAudioToProjectDialog}
              audioFileTrack={audioFileTrack}
              setSelectedLayer={setSelectedLayer}
              startPlayFrames={startPlayFrames}
              renderedVideoPath={renderedVideoPath}
              downloadVideoDisplay={downloadVideoDisplay}
              sessionId={id}
              updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
              updateSessionLayer={updateSessionLayer}
              setIsLayerSeeking={setIsLayerSeeking}
              isLayerSeeking={isLayerSeeking}
              isVideoGenerating={isVideoGenerating}
              showAudioTrackView={showAudioTrackView}
              frameToolbarView={frameToolbarView}
              audioLayers={audioLayers}
              updateAudioLayer={updateAudioLayer}
              isAudioLayerDirty={isAudioLayerDirty}
              removeAudioLayer={removeAudioLayer}
              updateChangesToActiveAudioLayers={updateChangesToActiveAudioLayers}
              updateChangesToActiveSessionLayers={updateChangesToActiveSessionLayers}
              updateLayerVisualItem={updateLayerVisualItem}
              deleteLayerVisualItem={deleteLayerVisualItem}
              addLayerToComposition={addLayerToComposition}
              copyCurrentLayerBelow={copyCurrentLayerBelow}
              removeSessionLayer={removeSessionLayer}
              addLayersViaPromptList={addLayersViaPromptList}
              defaultSceneDuration={videoSessionDetails.defaultSceneDuration}
              isCanvasDirty={isCanvasDirty}
              downloadLink={downloadLink}
              submitRegenerateFrames={submitRegenerateFrames}
              applySynchronizeAnimationsToBeats={applySynchronizeAnimationsToBeats}
              applyAudioDucking={applyAudioDucking}
              sceneTransitionPreset={sceneTransitionPreset}
              onSceneTransitionPresetChange={handleSceneTransitionPresetChange}
              onApplyAudioDuckingChange={handleApplyAudioDuckingChange}
              applySynchronizeLayersToBeats={applySynchronizeLayersToBeats}
              applySynchronizeLayersAndAnimationsToBeats={applySynchronizeLayersAndAnimationsToBeats}
              applyAudioTrackVisualizerToProject={applyAudioTrackVisualizerToProject}
              onLayersOrderChange={updateSessionLayersOrder}
              updateSessionLayersOnServer={updateSessionLayersOnServer}
              regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
              duplicateAudioLayer={duplicateAudioLayer}
              publishVideoSession={publishVideoSession}
              unpublishVideoSession={unpublishVideoSession}
              isSessionPublished={Boolean(videoSessionDetails?.ispublishedVideo)}
              generateMeta={generateMeta}
              sessionMetadata={sessionMetadata}
              isGuestSession={isGuestSession}
              updateAllAudioLayersOneShot={updateAllAudioLayersOneShot}
              requestVideoLayerEdit={requestVideoLayerEdit}
              renderCompletedThisSession={renderCompletedThisSession}
              isRenderPending={isVideoRenderPending}
              isUpdateLayerPending={isUpdateLayerPending}
              isVideoPreviewPlaying={isVideoPreviewPlaying}
              requestRealignLayers={requestRealignLayers}
              cancelPendingRender={cancelPendingRender}
              framesPerSecond={videoSessionDetails?.framesPerSecond || 24}
            />
          </div>
          <div className='w-[90%] bg-[#0f1629] inline-block rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.35)]'>

            {canvasProcessLoading && (
              <div className="absolute z-10 top-0 left-0 w-full h-full flex items-center justify-center  bg-opacity-50">
                <ScreenLoader />

              </div>
            )}
            {editorContainerDisplay}
            <div className="sticky bottom-0 w-[82%]">
              <FrameToolbarHorizontal
                key={`layers-${layers.length}`}
                layers={layers}
                selectedLayerIndex={selectedLayerIndex}
                setSelectedLayerIndex={setSelectedLayerIndex}
                setSelectedLayer={setSelectedLayer}
                totalDuration={totalDuration}
                currentLayerSeek={currentLayerSeek}
                setCurrentLayerSeek={setNewSeek}
                onLayersOrderChange={updateSessionLayersOrder}
                submitRenderVideo={submitRenderVideo}
                isVideoGenerating={isVideoGenerating}
                downloadLink={downloadLink}
                isGuestSession={isGuestSession}
                setIsLayerSeeking={setIsLayerSeeking}
                isRenderPending={isVideoRenderPending}
              />
            </div>
          </div>
          <AssistantHome
            submitAssistantQuery={submitAssistantQuery}
            sessionId={id}
            sessionMessages={sessionMessages}
            onSessionMessagesChange={setSessionMessages}
            onAssistantQueryGeneratingChange={setIsAssistantQueryGenerating}
            isAssistantQueryGenerating={isAssistantQueryGenerating}
            getFrameImageData={getAssistantFrameImageData}
          />
        </div>
        <div id="hidden-video-container" style={{ 'display': 'none' }}></div>
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          className="custom-toast-container"
          toastClassName="custom-toast"
          bodyClassName="custom-toast-body"
        />


      </div>
    </CommonContainer>
  );
}
