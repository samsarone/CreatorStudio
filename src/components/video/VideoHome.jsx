import React, { useEffect, useState, useRef } from 'react';
import CommonContainer from '../common/CommonContainer.tsx';
import FrameToolbar from './toolbars/frame_toolbar/index.jsx';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CURRENT_EDITOR_VIEW, FRAME_TOOLBAR_VIEW } from '../../constants/Types.ts';
import { getHeaders } from '../../utils/web.jsx';
import VideoEditorContainer from './VideoEditorContainer.jsx';
import AddAudioDialog from './util/AddAudioDialog.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { debounce } from './util/debounce.jsx';
import AuthContainer from '../auth/AuthContainer.jsx';
import LoadingImage from './util/LoadingImage.jsx';
import AssistantHome from '../assistant/AssistantHome.jsx';
import { getImagePreloaderWorker } from './workers/imagePreloaderWorkerSingleton'; // Import the worker singleton
import FrameToolbarMinimal from './toolbars/FrameToolbarMinimal.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { FaCheck } from 'react-icons/fa';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';


import FrameToolbarHorizontal from './toolbars/frame_toolbar/FrameToolbarHorizontal.jsx';

import ScreenLoader from './util/ScreenLoader.jsx';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

export default function VideoHome(props) {
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
  const [displayZoomType, setDisplayZoomType] = useState('fit'); // fit or fill
  const [stageZoomScale, setStageZoomScale] = useState(1);

  const [sessionMetadata, setSessionMetadata] = useState(null);

  const [minimalToolbarDisplay, setMinimalToolbarDisplay] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(null);

  const [applyAudioDucking, setApplyAudioDucking] = useState(true);

  const [isGuestSession, setIsGuestSession] = useState(false);

  // update current layer on update layers
  const [toggleUpdateCurrentLayer, setToggleUpdateCurrentLayer] = useState(false);
  const [currentLayerToBeUpdated, setCurrentLayerToBeUpdated] = useState(-1);

  const [isVideoPreviewPlaying, setIsVideoPreviewPlaying] = useState(false);
  const [isReorderPending, setIsReorderPending] = useState(false);

  const [downloadLink, setDownloadLink] = useState(null);

  const [preloadedLayerIds, setPreloadedLayerIds] = useState(new Set());

  let { id } = useParams();

  const { user, getUserAPI } = useUser();

  const [isUpdateLayerPending, setIsUpdateLayerPending] = useState(false);


  const [canvasProcessLoading, setCanvasProcessLoading] = useState(false);

  const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
  const STATIC_CDN_URL = import.meta.env.VITE_STATIC_CDN_URL;




  useEffect(() => {
    // Reset all state variables
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
    setDisplayZoomType('fit'); // Reset zoom type
    setStageZoomScale(getFitZoomScale()); // Reset zoom scale
    setMinimalToolbarDisplay(true);
    setAspectRatio(null);
    setApplyAudioDucking(true);
    setToggleUpdateCurrentLayer(false);
    setCurrentLayerToBeUpdated(-1);

    // Now, load any default values from localStorage into state
    const defaultModel = localStorage.getItem("defaultModel") || 'DALLE3';
    const defaultSceneDuration = parseFloat(localStorage.getItem("defaultSceneDuration")) || 2;
    const defaultApplyAudioDucking = localStorage.getItem("applyAudioDucking") !== 'false'; // defaults to true
    const defaultZoomType = localStorage.getItem("displayZoomType") || 'fit';
    const defaultMinimalToolbarDisplay = localStorage.getItem("minimalToolbarDisplay") !== 'false'; // defaults to true

    // If you have state variables for these, set them
    setApplyAudioDucking(defaultApplyAudioDucking);
    setDisplayZoomType(defaultZoomType);
    setMinimalToolbarDisplay(defaultMinimalToolbarDisplay);
    setStageZoomScale(defaultZoomType === 'fit' ? getFitZoomScale() : 1);

    // If you need to pass these defaults to other components or use them in functions, make sure they're updated
    setVideoSessionDetails(prevDetails => ({
      ...prevDetails,
      defaultModel: defaultModel,
      defaultSceneDuration: defaultSceneDuration,
      applyAudioDucking: defaultApplyAudioDucking,
    }));
  }, [id]);

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

    if (currentLayerToBeUpdated !== null) {
      setCurrentLayer(layers[currentLayerToBeUpdated]);
      setSelectedLayerIndex(currentLayerToBeUpdated);
      setLayerListRequestAdded(true);
    }
  }, [currentLayerToBeUpdated]);


  const showLoginDialog = () => {
    const loginComponent = (

      <AuthContainer />
    );
    openAlertDialog(loginComponent);
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
    setStageZoomScale(fitZoomScale);

  }, [aspectRatio]);

  const setSelectedLayer = (layer) => {
    if (!layer || !layer._id) {
      return;
    }
    const index = layers.findIndex(l => l._id === layer._id);
    setSelectedLayerIndex(index);
    setCurrentLayer(layer);
    const newLayerSeek = Math.floor(layer.durationOffset * 30);
    // setCurrentLayerSeek(newLayerSeek);
  }

  useEffect(() => {
    if (!isLayerSeeking && currentLayer) {
      const newLayerSeek = Math.floor(currentLayer.durationOffset * 30);
      setCurrentLayerSeek(newLayerSeek);
    }

  }, [currentLayer]);



  useEffect(() => {
    if (videoSessionDetails) {
      setApplyAudioDucking(videoSessionDetails.applyAudioDucking);
    }
  }, [videoSessionDetails]);

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
      setLayers(layers);
      setCurrentLayer(layers[0]);
      setSelectedLayerIndex(0);
      setAspectRatio(sessionDetails.aspectRatio);

      if (sessionDetails.videoGenerationPending) {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      }

      const downloadLink = sessionDetails.remoteURL ? `${PROCESSOR_API_URL}/${sessionDetails.videoLink}` : null;

      setDownloadLink(downloadLink);

      let totalDuration = 0;
      layers.forEach(layer => {
        totalDuration += layer.duration;
      });
      setTotalDuration(totalDuration);
      let isLayerPending = false;
      layers.forEach(layer => {
        if (layer.imageSession && layer.imageSession.generationStatus === 'PENDING') {
          isLayerPending = true;
        }
      });

      setIsLayerGenerationPending(isLayerPending);
      setGenerationImages(sessionDetails.generations);
      setSessionMessages(sessionDetails.sessionMessages);
    }).catch(function (err) {
      console.log("Error fetching session details:", err);
      localStorage.removeItem("authToken");
      window.location.href = '/';
    })
  }, [id]);

  const prevCurrentLayerSeekRef = useRef(currentLayerSeek);


  useEffect(() => {
    if (!currentLayer) {
      return;
    }
    const fps = 30;
    const currentLayerDuration = currentLayer.duration;
    const currentLayerDurationOffset = currentLayer.durationOffset;
    const currentLayerStartFrame = Math.floor(currentLayerDurationOffset * fps);
    const currentLayerEndFrame = Math.floor((currentLayerDuration + currentLayerDurationOffset) * fps);

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
        } else {
          console.log("No more layers to switch to");
        }
      }
    } else if (currentLayerSeek < prevCurrentLayerSeek) {
      // Moving backward
      if (currentLayerSeek < currentLayerStartFrame) {
        const prevLayerIndex = layers.findIndex(layer => layer._id === currentLayer._id) - 1;
        if (prevLayerIndex >= 0) {
          setCurrentLayer(layers[prevLayerIndex]);
          setSelectedLayerIndex(prevLayerIndex);
        } else {
          console.log("Already at the first layer");
        }
      }
    }

    // Update the ref with the current value
    prevCurrentLayerSeekRef.current = currentLayerSeek;

  }, [currentLayerSeek, layers]);





  useEffect(() => {
    if (currentLayer && currentLayer.imageSession && currentLayer.imageSession.activeItemList) {
      const activeList = currentLayer.imageSession.activeItemList.map(function (item) {
        return { ...item, isHidden: false };
      });
      setActiveItemList(activeList);
      // const newLayerSeek = Math.floor(currentLayer.durationOffset * 30);
      //setCurrentLayerSeek(newLayerSeek);
    } else {
      setActiveItemList([]);
    }
  }, [currentLayer]);

  // Image Preloading Worker Setup
  useEffect(() => {
    if (layers && layers.length > 0) {
      const imagePreloaderWorker = getImagePreloaderWorker();

      imagePreloaderWorker.onmessage = function (e) {
        // console.log('Images preloaded:', e.data.fetchedImages);
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
        console.error('Error updating layers order:', error);

        setCanvasProcessLoading(false);
      });
  };

  const pollForLayersUpdate = () => {
    if (polling) return; // Check if already polling
    setPolling(true); // Set polling status to true

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const timer = setInterval(() => {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/refresh_session_layers`, { id: id }, headers).then((dataRes) => {
        const frameResponse = dataRes.data;
        if (frameResponse) {
          const newLayers = frameResponse.layers;
          let layersUpdated = false;
          let isGenerationPending = false;
          let updatedLayers = [...layers];

          for (let i = 0; i < newLayers.length; i++) {
            if (!layers[i]) {
              continue;
            }

            if (layers[i].imageSession && layers[i].imageSession.generationStatus !== newLayers[i].imageSession.generationStatus) {
              updatedLayers[i] = newLayers[i];
              layersUpdated = true;
            }
            if (layers[i].imageSession && newLayers[i].imageSession.generationStatus === 'PENDING') {
              isGenerationPending = true;
            }
          }

          if (layersUpdated && currentLayer) {
            setLayers(updatedLayers);
            let isCurrentLayerPending = currentLayer.imageSession.generationStatus === 'PENDING';
            if (isCurrentLayerPending) {
              const newCurrentLayer = updatedLayers.find(layer => layer._id === currentLayer._id);
              if (newCurrentLayer.imageSession.generationStatus === 'COMPLETED') {
                // setCurrentLayer(newCurrentLayer);
              }
            }
          }

          if (!isGenerationPending) {
            clearInterval(timer);
            setPolling(false); // Reset polling status
          }
        }
      });
    }, 1000);
  }

  const startVideoRenderPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const timer = setInterval(() => {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/get_render_video_status`, { id: id }, headers).then((dataRes) => {
        const renderData = dataRes.data;
        const renderStatus = renderData.status;
        if (renderStatus === 'COMPLETED') {
          clearInterval(timer);
          const sessionData = renderData.session;

          let videoLink;
          if (sessionData.remoteURL) {
            videoLink = sessionData.remoteURL;
          } else {
            videoLink = `${PROCESSOR_API_URL}/${sessionData.videoLink}`;
          }


          setRenderedVideoPath(`${videoLink}`);
          setDownloadVideoDisplay(true);
          setIsVideoGenerating(false);
          setIsCanvasDirty(false);
          setDownloadLink(videoLink);

        }
      });
    }, 3000);
  }

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

  const submitRenderVideo = () => {

    if (isGuestSession) {
      axios.post(`${PROCESSOR_API_URL}/video_sessions/request_render_guest_video`, { id: id }).then((dataRes) => {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      });

    } else {
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }


      axios.post(`${PROCESSOR_API_URL}/video_sessions/request_render_video`, { id: id }, headers).then((dataRes) => {
        setIsVideoGenerating(true);
        startVideoRenderPoll();
      });
    }
  }

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

      // Let FrameToolbar know the server accepted changes 
      // so we can clear "isDirty" states on that side:
      return { success: true, serverLayers: returnedLayers };
    } catch (error) {
      console.error("Error updating all audio layers:", error);
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

  if (!videoSessionDetails) {
    return <LoadingImage />;
  }

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
          if (sessionData.audio) {
            const audioFileTrack = `${PROCESSOR_API_URL}/video/audio/${sessionData.audio}`;
            setAudioFileTrack(audioFileTrack);
          }
          closeAlertDialog();
        })
        .catch(error => {
          console.error('Error adding audio to project:', error);
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

  const debouncedUpdateSessionLayerActiveItemList = debounce((newActiveItemList) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }


    const reqPayload = {
      sessionId: id,
      activeItemList: newActiveItemList,
      layerId: currentLayer._id.toString(),
      aspectRatio: videoSessionDetails.aspectRatio,
    };

    setActiveItemList(newActiveItemList);

    axios.post(`${PROCESSOR_API_URL}/video_sessions/update_active_item_list`, reqPayload, headers).then((response) => {
      const videoSessionData = response.data;
      const { session, layer } = videoSessionData;

      const newActiveItemList = layer.imageSession.activeItemList;

      setVideoSessionDetails(session);
      setCurrentLayer(layer);
      setActiveItemList(layer.imageSession.activeItemList);

      // Merge updated layer back into layers array
      const updatedLayerIndex = layers.findIndex((l) => l._id === layer._id);
      if (updatedLayerIndex > -1) {
        const newLayers = [...layers];
        newLayers[updatedLayerIndex] = layer;
        setLayers(newLayers);
      }

      setIsCanvasDirty(true);
    }).catch(function (err) {
      console.error('Error updating active item list:', err);
    });


  }, 5);

  const updateSessionLayerActiveItemList = (newActiveItemList) => {



    //setActiveItemList(newActiveItemList);
    if (currentEditorView !== CURRENT_EDITOR_VIEW.SHOW_ANIMATE_DISPLAY) {
      debouncedUpdateSessionLayerActiveItemList(newActiveItemList);
    }
  };

  const updateSessionLayerActiveItemListAnimations = (newActiveItemList) => {
    //setActiveItemList(newActiveItemList);
    if (currentEditorView !== CURRENT_EDITOR_VIEW.SHOW_ANIMATE_DISPLAY) {
      debouncedUpdateSessionLayerActiveItemList(newActiveItemList);
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
    toast.success(<div> Reapplying syncronized animation beats!</div>, {
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
    toast.success(<div> Reapplying syncronized layers beats!</div>, {
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
    toast.success(<div>Reapplying syncronized layers and animation beats!</div>, {
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
      toast.success(<div>Audio layer updated!</div>, {
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


      toast.success(<div>Audio layer removed!</div>, {
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

      toast.success(<div>Audio layers updated!</div>, {
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
      console.error("No layerId found in form data.");
      return;
    }

    // Parse combinedLayerId into layerId and itemId
    const underscoreIndex = combinedLayerId.indexOf('_');
    if (underscoreIndex === -1) {
      console.error("Invalid layerId format. Expected 'layerId_itemId'.");
      return;
    }

    const layerId = combinedLayerId.substring(0, underscoreIndex);
    const itemId = combinedLayerId.substring(underscoreIndex + 1);

    // Find the target layer
    const layerIndex = layers.findIndex((l) => l._id.toString() === layerId.toString());
    if (layerIndex === -1) {
      console.error("Layer not found:", layerId);
      return;
    }

    // Copy layer to avoid direct state mutation
    const updatedLayer = { ...layers[layerIndex] };

    if (!updatedLayer.imageSession || !updatedLayer.imageSession.activeItemList) {
      console.error("No active items in selected layer:", layerId);
      return;
    }

    // Find the text item within the layer
    const itemIndex = updatedLayer.imageSession.activeItemList.findIndex(
      (item) => item.id.toString() === itemId.toString()
    );

    if (itemIndex === -1) {
      console.error("Text item not found:", itemId);
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
      console.error('Error adding layer:', err);
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
      const { session, layer } = resData;


      const layers = session.layers;

      const newLayerIndex = layers.findIndex(l => l._id.toString() === layer._id.toString());



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
      console.error('Error removing layer:', err);
      setCanvasProcessLoading(false);
    })
  }

  const publishVideoSession = (payload) => {

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }


    const payloadTags = payload.tags.split(',');
    payload.tags = payloadTags;
    payload.aspectRatio = aspectRatio;

    axios.post(`${PROCESSOR_API_URL}/video_sessions/publish_session`, payload, headers).then((dataRes) => {
      const sessionData = dataRes.data;
      setVideoSessionDetails(sessionData);
    });
  }

  const updateCurrentActiveLayer = (imageItem) => {

    // stripe any query params from the image src
    const src = imageItem.src.split('?')[0];
    const imageItemNew = { ...imageItem, src: src };
    const newActiveItemList = activeItemList.concat(imageItem);
    debouncedUpdateSessionLayerActiveItemList();
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

    const newLayerSeek = Math.floor(layerData.durationOffset * 30);
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
    setCurrentLayerToBeUpdated(updatedLayerIndex);
  };



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

  const submitAssistantQuery = (query) => {

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setIsAssistantQueryGenerating(true);
    axios.post(`${PROCESSOR_API_URL}/assistants/submit_assistant_query`, { id: id, query: query }, headers).then((response) => {
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
    axios.post(`${PROCESSOR_API_URL}/video_sessions/regenerate_frames`, { sessionId: id }, headers).then((response) => {
      const videoSessionData = response.data;
      toast.success('Requested regeneration of frames.');
      setIsCanvasDirty(true);
      setIsVideoGenerating(false);

    });
  }




  const toggleStageZoom = () => {
    if (displayZoomType === 'fit') {
      setDisplayZoomType('fill');
      setStageZoomScale(1);
    } else {
      setDisplayZoomType('fit');
      const fitZoomScale = getFitZoomScale();
      setStageZoomScale(fitZoomScale);
    }

  }



  const onToggleMinimalFrameToolbarDisplay = () => {
    setMinimalToolbarDisplay(!minimalToolbarDisplay);
  }



  const applyAudioTrackVisualizerToProject = () => {
    toast.success(<div><FaCheck className='inline-flex mr-2' />  Requested apply audio visualizer to project!</div>, {
      position: "bottom-center",
      className: "custom-toast",
    });

    const headers = getHeaders();
    axios.post(`${PROCESSOR_API_URL}/video_sessions/apply_audio_track_visualizer`, { id: id }, headers).then((response) => {
      const resData = response.data;

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
        updateCurrentLayerInSessionList={updateCurrentLayerInSessionList}
        updateCurrentLayerAndLayerList={updateCurrentLayerAndLayerList}
        totalDuration={totalDuration}
        isUpdateLayerPending={isUpdateLayerPending}
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        audioLayers={audioLayers}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
        setAudioLayers={setAudioLayers}

        setIsLayerSeeking={setIsLayerSeeking}

        setSelectedLayerIndex={setSelectedLayerIndex}
        setSelectedLayer={setSelectedLayer}





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
          applySynchronizeLayersToBeats={applySynchronizeLayersToBeats}
          applySynchronizeLayersAndAnimationsToBeats={applySynchronizeLayersAndAnimationsToBeats}
          applyAudioTrackVisualizerToProject={applyAudioTrackVisualizerToProject}
          onLayersOrderChange={updateSessionLayersOrder}
          updateSessionLayersOnServer={updateSessionLayersOnServer}
          updateChangesToActiveSessionLayers={updateChangesToActiveSessionLayers}
          isGuestSession={isGuestSession}
          regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
          publishVideoSession={publishVideoSession}
          generateMeta={generateMeta}
          sessionMetadata={sessionMetadata}
          updateAllAudioLayersOneShot={updateAllAudioLayersOneShot}
        />
      </div>
    )
  }
  if (displayZoomType === 'fill') {
    return (
      <CommonContainer
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
      >
        <div className='m-auto'>
          <div className='block'>
            {frameToolbarDisplay}
            <div className='w-[98%] bg-cyber-black inline-block'>
              {editorContainerDisplay}
            </div>
            <AssistantHome
              submitAssistantQuery={submitAssistantQuery}
              sessionMessages={sessionMessages}
              isAssistantQueryGenerating={isAssistantQueryGenerating}
            />
          </div>
        </div>
      </CommonContainer>
    )
  }

  return (
    <CommonContainer
      isVideoPreviewPlaying={isVideoPreviewPlaying}
      setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
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
              applySynchronizeLayersToBeats={applySynchronizeLayersToBeats}
              applySynchronizeLayersAndAnimationsToBeats={applySynchronizeLayersAndAnimationsToBeats}
              applyAudioTrackVisualizerToProject={applyAudioTrackVisualizerToProject}
              onLayersOrderChange={updateSessionLayersOrder}
              updateSessionLayersOnServer={updateSessionLayersOnServer}
              regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
              publishVideoSession={publishVideoSession}
              generateMeta={generateMeta}
              sessionMetadata={sessionMetadata}
              isGuestSession={isGuestSession}
              updateAllAudioLayersOneShot={updateAllAudioLayersOneShot}
            />
          </div>
          <div className='w-[90%] bg-cyber-black inline-block'>

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
              />
            </div>
          </div>
          <AssistantHome
            submitAssistantQuery={submitAssistantQuery}
            sessionMessages={sessionMessages}
            isAssistantQueryGenerating={isAssistantQueryGenerating}
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
