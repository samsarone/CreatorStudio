import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Konva from 'konva';
import { useUser } from '../../contexts/UserContext.js';
import { useAlertDialog } from '../../contexts/AlertDialogContext.js';
import { useColorMode } from '../../contexts/ColorMode.js';
import { getHeaders } from '../../utils/web.js';
import {
  CURRENT_TOOLBAR_VIEW,
  CANVAS_ACTION,
  TOOLBAR_ACTION_VIEW,
  IMAGE_GENERAITON_MODEL_TYPES,
  IMAGE_EDIT_MODEL_TYPES
} from '../../constants/Types.ts';
import { STAGE_DIMENSIONS } from '../../constants/Image.js';
import UploadImageDialog from '../editor/utils/UploadImageDialog.js';
import VideoCanvasContainer from './editor/VideoCanvasContainer.js';
import VideoEditorToolbar from './toolbars/VideoEditorToolbar.js'
import LoadingImage from './util/LoadingImage.js';
import LoadingImageTransparent from './util/LoadingImageTransparent.js';
import { getTextConfigForCanvas } from '../../constants/TextConfig.js';

import LibraryHome from '../library/LibraryHome.js';
import AuthContainer from '../auth/AuthContainer.js';
import VideoEditorToolbarMinimal from './toolbars/VideoEditorToolbarMinimal.js';
import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.js';

const PROCESSOR_API_URL = process.env.REACT_APP_PROCESSOR_API;
const STATIC_CDN_URL = process.env.REACT_APP_STATIC_CDN_URL;

export default function VideoEditorContainer(props) {
  const {
    selectedLayerId,
    currentLayerSeek,
    currentLayer,
    updateSessionLayerActiveItemList,
    updateSessionLayerActiveItemListAnimations,
    activeItemList,
    setActiveItemList,
    isLayerSeeking,
    showAddAudioToProjectDialog,
    generationImages,
    updateCurrentActiveLayer,
    videoSessionDetails,
    setVideoSessionDetails,
    toggleHideItemInLayer,
    pollForLayersUpdate,
    setIsCanvasDirty,
    updateCurrentLayer,
    applyAnimationToAllLayers,
    setGenerationImages,
    isExpressGeneration,
    aspectRatio,
    displayZoomType,
    toggleStageZoom,
    stageZoomScale,
    updateCurrentLayerInSessionList,
    updateCurrentLayerAndLayerList,
    totalDuration,
    isUpdateLayerPending,
  } = props;

  const [segmentationData, setSegmentationData] = useState([]);
  const [currentLayerDefaultPrompt, setCurrentLayerDefaultPrompt] = useState('');

  // 1) State to store the current AI video URL and type
  const [aiVideoLayer, setAiVideoLayer] = useState(null);
  const [aiVideoLayerType, setAiVideoLayerType] = useState(null);

  const [movieSoundList, setMovieSoundList] = useState([]);

  const [movieVisualList, setMovieVisualList] = useState([]);
  const [movieGenSpeakers, setMovieGenSpeakers] = useState([]);

  useEffect(() => {

    if (videoSessionDetails && videoSessionDetails.movieResourceList) {
      const { scenes, sounds } = videoSessionDetails.movieResourceList;
      setMovieSoundList(sounds);
      setMovieVisualList(scenes);
      setMovieGenSpeakers(videoSessionDetails.movieGenSpeakers);

    }
  }, [videoSessionDetails]);


  let { id } = useParams();
  if (!id) {
    id = props.id;
  }

  const showLoginDialog = () => {
    const loginComponent = <AuthContainer />;
    openAlertDialog(loginComponent);
  };

  const generationPollIntervalRef = useRef(null);
  const outpaintPollIntervalRef = useRef(null);
  const audioGenerationPollIntervalRef = useRef(null);
  const maskGenerationPollIntervalRef = useRef(null);
  const aiVideoGenerationPollIntervalRef = useRef(null);
  const layeredAudioGenerationPollIntervalRef = useRef(null);


  const [aiVideoPollType, setAiVideoPollType] = useState(null);

  // Helpers to return full video URLs based on which link is available
  const getAIVideoLink = () => {
    if (!currentLayer || !currentLayer.aiVideoLayer) return null;
    return currentLayer.aiVideoRemoteLink
      ? `${STATIC_CDN_URL}/${currentLayer.aiVideoRemoteLink}`
      : `${PROCESSOR_API_URL}${currentLayer.aiVideoLayer}`;
  };

  const getLipSyncVideoLink = () => {
    if (!currentLayer || !currentLayer.lipSyncVideoLayer) return null;
    return currentLayer.lipSyncRemoteLink
      ? `${STATIC_CDN_URL}/${currentLayer.lipSyncRemoteLink}`
      : `${PROCESSOR_API_URL}${currentLayer.lipSyncVideoLayer}`;
  };

  const getSoundEffectVideoLink = () => {
    if (!currentLayer || !currentLayer.soundEffectVideoLayer) return null;
    return currentLayer.soundEffectRemoteLink
      ? `${STATIC_CDN_URL}/${currentLayer.soundEffectRemoteLink}`
      : `${PROCESSOR_API_URL}${currentLayer.soundEffectVideoLayer}`;
  };

  // On each currentLayer change, figure out which AI video layer to use
  useEffect(() => {
    if (!currentLayer) {
      setAiVideoLayer(null);
      setAiVideoLayerType(null);
      return;
    }

    if (currentLayer.hasLipSyncVideoLayer && currentLayer.lipSyncVideoLayer) {
      setAiVideoLayer(getLipSyncVideoLink());
      setAiVideoLayerType('lip_sync');
    } else if (currentLayer.hasSoundEffectVideoLayer && currentLayer.soundEffectVideoLayer) {
      setAiVideoLayer(getSoundEffectVideoLink());
      setAiVideoLayerType('sound_effect');
    } else if (currentLayer.hasAiVideoLayer && currentLayer.aiVideoLayer) {
      setAiVideoLayer(getAIVideoLink());
      setAiVideoLayerType('ai_video');
    } else {
      setAiVideoLayer(null);
      setAiVideoLayerType(null);
    }

    if (currentLayer.lipSyncGenerationPending) {
      setAiVideoPollType('lip_sync');

    } else if (currentLayer.soundEffectGenerationPending) {
      setAiVideoPollType('sound_effect');

    } else if (currentLayer.aiVideoGenerationPending && currentLayer.layerAiVideoType === 'ai_video') {
      setAiVideoPollType('ai_video');

    }

  }, [currentLayer]);


  useEffect(() => {
    if (!aiVideoPollType) {
      // No poll type means nothing to do
      return;
    }
    // If aiVideoPollType is set, then start polling

    startAIVideoLayerGenerationPoll();
  }, [aiVideoPollType]);


  // Preload hidden <video> once we set aiVideoLayer
  useEffect(() => {
    if (aiVideoLayer) {
      const hiddenContainer = document.getElementById('hidden-video-container');
      const video = document.createElement('video');
      video.src = aiVideoLayer;
      video.preload = 'auto';
      video.style.display = 'none';
      hiddenContainer.appendChild(video);
    }
  }, [aiVideoLayer]);

  useEffect(() => {
    if (currentLayer && currentLayer.segmentation) {
      setSegmentationData(currentLayer.segmentation);
    }

    if (currentLayer && currentLayer.imageSession && currentLayer.imageSession.generationStatus === 'PENDING') {
      pollForLayersUpdate();
    }
    let currentDefaultPrompt = '';
    if (currentLayer && currentLayer.prompt) {
      currentDefaultPrompt = currentLayer.prompt;
    }
    setCurrentLayerDefaultPrompt(currentDefaultPrompt);

    return () => {
      if (generationPollIntervalRef.current) clearInterval(generationPollIntervalRef.current);
      if (outpaintPollIntervalRef.current) clearInterval(outpaintPollIntervalRef.current);
      if (maskGenerationPollIntervalRef.current) clearInterval(maskGenerationPollIntervalRef.current);
      if (aiVideoGenerationPollIntervalRef.current) clearInterval(aiVideoGenerationPollIntervalRef.current);
      if (layeredAudioGenerationPollIntervalRef.current) clearInterval(layeredAudioGenerationPollIntervalRef.current);
    };
  }, [currentLayer]);

  const [promptText, setPromptText] = useState("");
  const [videoPromptText, setVideoPromptText] = useState("");
  const [selectedVideoGenerationModel, setSelectedVideoGenerationModel] = useState('LUMA');
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedAllocation, setSelectedAllocation] = useState(300);
  const [isTemplateSelectViewSelected, setIsTemplateSelectViewSelected] = useState(false);
  const [templateOptionList, setTemplateOptionList] = useState([]);
  const [editBrushWidth, setEditBrushWidth] = useState(25);
  const [editMasklines, setEditMaskLines] = useState([]);
  const [currentView, setCurrentView] = useState(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
  const [currentCanvasAction, setCurrentCanvasAction] = useState(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);

  const [selectedGenerationModel, setSelectedGenerationModel] = useState(() => {
    const defaultModel = localStorage.getItem('defaultModel');
    return defaultModel && defaultModel !== undefined ? defaultModel : IMAGE_GENERAITON_MODEL_TYPES[0].key;
  });
  const [selectedEditModel, setSelectedEditModel] = useState(IMAGE_EDIT_MODEL_TYPES[0].key);

  const [isGenerationPending, setIsGenerationPending] = useState(false);
  const [isOutpaintPending, setIsOutpaintPending] = useState(false);
  const [isPublicationPending, setIsPublicationPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { colorMode } = useColorMode();
  const initFillColor = colorMode === 'dark' ? '#f5f5f5' : '#030712';
  const [fillColor, setFillColor] = useState(initFillColor);
  const [strokeColor, setStrokeColor] = useState(initFillColor);
  const [strokeWidthValue, setStrokeWidthValue] = useState(2);
  const [buttonPositions, setButtonPositions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLayerType, setSelectedLayerType] = useState(null);
  const [pencilWidth, setPencilWidth] = useState(10);
  const [pencilColor, setPencilColor] = useState('#000000');
  const [eraserWidth, setEraserWidth] = useState(30);
  const [eraserOptionsVisible, setEraserOptionsVisible] = useState(false);
  const [cursorSelectOptionVisible, setCursorSelectOptionVisible] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [outpaintError, setOutpaintError] = useState(null);
  const [selectedLayerSelectShape, setSelectedLayerSelectShape] = useState(null);
  const [audioGenerationPending, setAudioGenerationPending] = useState(false);
  const [enableSegmentationMask, setEnableSegmentationMask] = useState(false);
  const [canvasActionLoading, setCanvasActionLoading] = useState(false);
  const [isAIVideoGenerationPending, setIsAIVideoGenerationPending] = useState(false);
  const [isSelectButtonDisabled, setIsSelectButtonDisabled] = useState(false);
  const [currentLayerHasSpeechLayer, setCurrentLayerHasSpeechLayer] = useState(false);
  const { openAlertDialog, closeAlertDialog, setIsAlertActionPending } = useAlertDialog();
  const { user, getUserAPI } = useUser();

  const [showCreateNewPromptDisplay, setShowCreateNewPromptDisplay] = useState(false);
  const showCreateNewPrompt = () => {
    setShowCreateNewPromptDisplay(true);
  };

  const setCurrentViewDisplay = (view) => {
    setCurrentView(view);
  };




  // Text config
  const [textConfig, setTextConfig] = useState(null);
  useEffect(() => {
    if (aspectRatio) {
      const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const defaultDimensions = getTextConfigForCanvas(textConfig, canvasDimensions);
      setTextConfig(defaultDimensions);
    }
  }, [aspectRatio]);

  useEffect(() => {
    setIsAlertActionPending(isPublicationPending);
  }, [isPublicationPending]);

  const canvasRef = useRef(null);
  const maskGroupRef = useRef(null);

  useEffect(() => {
    if (aspectRatio) {
      const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const canvasMidX = canvasDimensions.width / 2;
      const canvasMidY = canvasDimensions.height / 2;
      setTextConfig((prev) =>
        prev ? { ...prev, x: canvasMidX, y: canvasMidY } : { x: canvasMidX, y: canvasMidY }
      );
    }
  }, [aspectRatio]);

  // Check if current layer has any speech within its time range
  useEffect(() => {
    if (currentLayer && videoSessionDetails) {
      const currentLayerStartTime = currentLayer.durationOffset;
      const currentLayerEndTime = currentLayer.durationOffset + currentLayer.duration;

      const { audioLayers } = videoSessionDetails;
      const audioSpeechLayerOverlaps = audioLayers.some((audioLayer) => {
        const audioLayerStartTime = audioLayer.startTime;
        const audioLayerEndTime = audioLayer.endTime;

        // Check if there's any overlap
        const ovelapAudio = (
          audioLayerStartTime < currentLayerEndTime &&
          audioLayerEndTime > currentLayerStartTime && audioLayer.generationType === 'speech'
        );

        return ovelapAudio;
      });

      setCurrentLayerHasSpeechLayer(audioSpeechLayerOverlaps);
    }
  }, [currentLayer, videoSessionDetails]);


  // Example showing usage for uploading images
  const setUploadURL = useCallback(
    (data) => {
      if (!data) return;
      const newItemId = `item_${activeItemList.length}`;
      const newItem = {
        src: data.url,
        id: newItemId,
        type: 'image',
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      };
      const newItemList = [...activeItemList, newItem];
      setActiveItemList(newItemList);
      updateSessionLayerActiveItemList(newItemList);
      closeAlertDialog();
      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Image uploaded successfully!
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
    },
    [activeItemList]
  );

  useEffect(() => {
    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      setSelectedId(null);
    }
  }, [currentCanvasAction]);

  const resetCurrentView = () => {
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
  };

  const prevLengthRef = useRef(activeItemList.length);
  const [isIntermediateSaving, setIsIntermediateSaving] = useState(false);

  useEffect(() => {
    const currentLength = activeItemList.length;
    if (prevLengthRef.current !== currentLength) {
      if (!isIntermediateSaving) {
        setIsIntermediateSaving(true);
      }
    }
    prevLengthRef.current = currentLength;
  }, [activeItemList.length, isIntermediateSaving]);

  /******************************************************
   *                    GENERATION METHODS
   ******************************************************/

  // Submit new generation request
  const submitGenerateRequest = async (payload) => {
    setIsGenerationPending(true);
    setGenerationError(null);

    payload.aspectRatio = aspectRatio;

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_generate`, payload, headers)
      .then((resData) => {
        const response = resData.data;
        const updatedPrompt = response.prompt;
        if (payload.isRecreateRequest) {
          setCurrentLayerDefaultPrompt(updatedPrompt);
        }
        startGenerationPoll();
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Generation request submitted successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch((error) => {
        setIsGenerationPending(false);
        setGenerationError(error.message);
        toast.error(
          <div>
            <FaTimes /> Failed to submit generation request.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const submitGenerateNewRequest = async (inputPayload) => {
    const payload = {
      ...inputPayload,
      prompt: promptText,
      videoSessionId: id,
      model: selectedGenerationModel,
      layerId: currentLayer._id.toString(),
    };
    await submitGenerateRequest(payload);
  };

  const submitGenerateRecreateRequest = async (payload) => {
    payload = {
      ...payload,
      videoSessionId: id,
      model: payload.model ? payload.model : selectedGenerationModel,
      layerId: currentLayer._id.toString(),
      skipApplyThemeToPrompt: true,
      isRecreateRequest: true,
    };
    await submitGenerateRequest(payload);
  };

  /********************************
   *      IMAGE EDIT/OUTPAINT
   ********************************/
  const [selectedEditModelValue, setSelectedEditModelValue] = useState(
    IMAGE_EDIT_MODEL_TYPES.find((model) => model.key === selectedEditModel)
  );
  useEffect(() => {
    setSelectedEditModelValue(
      IMAGE_EDIT_MODEL_TYPES.find((model) => model.key === selectedEditModel)
    );
  }, [selectedEditModel]);

  // Clear the mask lines if we exit the inpaint mode
  useEffect(() => {
    if (
      currentView !== CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY ||
      (selectedEditModelValue && selectedEditModelValue.editType !== 'inpaint')
    ) {
      setEditMaskLines([]);
    }
  }, [currentView, selectedEditModelValue]);

  // Export items in activeItemList onto a canvas
  async function exportBaseGroup() {
    const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = stageDimensions.width;
    canvas.height = stageDimensions.height;
    const ctx = canvas.getContext('2d');

    // Helper: load an image
    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        if (!src.startsWith('data:')) {
          img.crossOrigin = 'Anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src.startsWith('http') ? src : `${PROCESSOR_API_URL}/${src}`;
      });

    for (const item of currentLayer.imageSession.activeItemList || []) {
      ctx.save();
      const { x, y, width, height, rotation, scaleX = 1, scaleY = 1 } = item;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(x, y);

      if (rotation) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);
      }

      if (item.type === 'image') {
        const imgSrc = item.src.startsWith('data:')
          ? item.src
          : `${PROCESSOR_API_URL}/${item.src}`;
        try {
          const img = await loadImage(imgSrc);
          ctx.drawImage(img, 0, 0, width, height);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      } else if (item.type === 'text') {
        const fontSize = item.config.fontSize || 40;
        ctx.fillStyle = item.config.fillColor || '#000000';
        ctx.font = `${fontSize}px ${item.config.fontFamily || 'Arial'}`;
        ctx.textAlign = item.config.align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.text, 0, 0);
      } else if (item.type === 'shape') {
        const config = item.config;
        const shapeX = config.x || 0;
        const shapeY = config.y || 0;
        const shapeWidth = config.width || 0;
        const shapeHeight = config.height || 0;
        const radius = config.radius || 0;
        const strokeWidth = config.strokeWidth || 1;

        ctx.fillStyle = config.fillColor || '#000000';
        ctx.strokeStyle = config.strokeColor || '#000000';
        ctx.lineWidth = strokeWidth;

        if (item.shape === 'rectangle') {
          ctx.fillRect(shapeX, shapeY, shapeWidth, shapeHeight);
          ctx.strokeRect(shapeX, shapeY, shapeWidth, shapeHeight);
        } else if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(shapeX + radius, shapeY + radius, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  // Download current frame
  const downloadCurrentFrame = async () => {
    const isPremiumUser = user.isPremiumUser;
    const waterMarkImage = 'wm.png';

    const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = stageDimensions.width;
    canvas.height = stageDimensions.height;
    const ctx = canvas.getContext('2d');

    const loadLocalImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = `/${src}`;
      });

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src.startsWith('http') ? src : `${PROCESSOR_API_URL}/${src}`;
      });

    // Draw each item
    for (const item of currentLayer.imageSession.activeItemList || []) {
      ctx.save();
      const { x, y, width, height, rotation, scaleX = 1, scaleY = 1 } = item;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(x, y);
      if (rotation) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);
      }
      if (item.type === 'image') {
        const imgSrc = item.src.startsWith('data:')
          ? item.src
          : `${PROCESSOR_API_URL}/${item.src}`;
        try {
          const img = await loadImage(imgSrc);
          ctx.drawImage(img, 0, 0, width, height);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      } else if (item.type === 'text') {
        const fontSize = item.config.fontSize || 40;
        ctx.fillStyle = item.config.fillColor || '#000000';
        ctx.font = `${fontSize}px ${item.config.fontFamily || 'Arial'}`;
        ctx.textAlign = item.config.align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.text, 0, 0);
      } else if (item.type === 'shape') {
        const config = item.config;
        const shapeX = config.x || 0;
        const shapeY = config.y || 0;
        const shapeWidth = config.width || 0;
        const shapeHeight = config.height || 0;
        const radius = config.radius || 0;
        const strokeWidth = config.strokeWidth || 1;

        ctx.fillStyle = config.fillColor || '#000000';
        ctx.strokeStyle = config.strokeColor || '#000000';
        ctx.lineWidth = strokeWidth;
        if (item.shape === 'rectangle') {
          ctx.fillRect(shapeX, shapeY, shapeWidth, shapeHeight);
          ctx.strokeRect(shapeX, shapeY, shapeWidth, shapeHeight);
        } else if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(shapeX + radius, shapeY + radius, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Non-premium: add watermark
    if (!isPremiumUser) {
      try {
        const watermarkImg = await loadLocalImage(waterMarkImage);
        const padding = 16;
        const x = canvas.width - watermarkImg.width - padding / 2;
        const y = canvas.height - watermarkImg.height - padding;
        ctx.drawImage(watermarkImg, x, y, watermarkImg.width, watermarkImg.height);
      } catch (error) {
        console.error('Error loading watermark image:', error);
      }
    }

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'frame.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export a masked version of the group if inpaint is used, converting lines to black/white.
  async function exportMaskedGroupAsBlackAndWhite() {
    const baseStage = canvasRef.current;
    const baseLayer = baseStage.getLayers()[0];
    const maskGroup = baseLayer.findOne((node) => node.id() === 'maskGroup');

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = baseStage.width();
    offscreenCanvas.height = baseStage.height();
    const ctx = offscreenCanvas.getContext('2d');

    // Hide transformers before exporting
    const transformers = baseStage.find('Transformer');
    const transformerVisibility = [];
    transformers.forEach((tr) => {
      transformerVisibility.push(tr.visible());
      tr.visible(false);
    });

    const baseCanvas = await baseStage.toCanvas({ pixelRatio: 1 });
    transformers.forEach((tr, index) => {
      tr.visible(transformerVisibility[index]);
    });

    const baseCtx = baseCanvas.getContext('2d');
    const baseImageData = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
    const imageData = baseImageData.data;

    const maskImageData = ctx.createImageData(baseCanvas.width, baseCanvas.height);
    const maskData = maskImageData.data;

    for (let i = 0; i < imageData.length; i += 4) {
      const alpha = imageData[i + 3];
      if (alpha === 0) {
        // Transparent -> white
        maskData[i] = 255;
        maskData[i + 1] = 255;
        maskData[i + 2] = 255;
        maskData[i + 3] = 255;
      } else {
        // Opaque -> black
        maskData[i] = 0;
        maskData[i + 1] = 0;
        maskData[i + 2] = 0;
        maskData[i + 3] = 255;
      }
    }
    ctx.putImageData(maskImageData, 0, 0);

    if (maskGroup) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'white';
      maskGroup.children.forEach((line) => {
        ctx.beginPath();
        const points = line.points();
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          ctx.lineTo(points[i], points[i + 1]);
        }
        ctx.closePath();
        ctx.fill();
      });
    }
    return offscreenCanvas.toDataURL('image/png');
  }

  // Submit an outpaint/inpaint request
  const submitOutpaintRequest = async (evt) => {
    evt.preventDefault();
    setIsOutpaintPending(true);

    const baseImageData = await exportBaseGroup();
    let maskImageData;

    if (selectedEditModelValue && selectedEditModelValue.editType === 'inpaint') {
      maskImageData = await exportMaskedGroupAsBlackAndWhite();
    }

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const guidanceScale = formData.get('guidanceScale');
    const numInferenceSteps = formData.get('numInferenceSteps');
    const strength = formData.get('strength');

    const payload = {
      image: baseImageData,
      sessionId: id,
      layerId: currentLayer._id.toString(),
      prompt: promptText,
      model: selectedEditModel,
      guidanceScale,
      numInferenceSteps,
      strength,
      aspectRatio,
    };
    if (maskImageData) {
      payload['maskImage'] = maskImageData;
    }

    setOutpaintError(null);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_edit_image`, payload, headers)
      .then(() => {
        startOutpaintPoll();
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Edit request submitted successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch((error) => {
        setOutpaintError(error.message);
        toast.error(
          <div>
            <FaTimes /> Failed to submit edit request.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  // Poll for generation status
  async function startGenerationPoll() {
    const selectedLayerId = currentLayer._id.toString();
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const pollStatusData = await axios.get(
      `${PROCESSOR_API_URL}/video_sessions/generate_status?id=${id}&layerId=${selectedLayerId}`,
      headers
    );
    const pollStatus = pollStatusData.data;

    if (pollStatus.status === 'COMPLETED') {
      const layerData = pollStatus.layer;
      const layerList = pollStatus.layers;
      const updatedLayerIndex = layerList.findIndex(
        (layer) => layer._id.toString() === layerData._id.toString()
      );
      const imageSession = layerData.imageSession;

      setCurrentLayerDefaultPrompt(layerData.prompt);
      setShowCreateNewPromptDisplay(false);

      const generationImages = pollStatus.generationImages;
      if (generationImages && generationImages.length > 0) {
        setGenerationImages(generationImages);
      }
      const generatedImageUrlName = imageSession.activeGeneratedImage;
      const timestamp = Date.now();
      const generatedURL = `/generations/${generatedImageUrlName}?${timestamp}`;

      // Append the new generated image
      const item_id = `item_${activeItemList.length}`;
      const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const nImageList = [
        ...activeItemList,
        {
          src: generatedURL,
          id: item_id,
          type: 'image',
          x: 0,
          y: 0,
          width: stageDimensions.width,
          height: stageDimensions.height,
        },
      ];

      setActiveItemList(nImageList);
      setIsGenerationPending(false);
      setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Generation completed successfully!
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      updateCurrentLayerAndLayerList(layerList, updatedLayerIndex);
      setIsCanvasDirty(true);
      getUserAPI();
      return;
    } else if (pollStatus.status === 'FAILED') {
      setIsGenerationPending(false);
      setGenerationError(pollStatus.generationError);
      setCanvasActionLoading(false);
      toast.error(
        <div>
          <FaTimes /> Generation failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    } else {
      generationPollIntervalRef.current = setTimeout(() => {
        startGenerationPoll();
      }, 1000);
    }
  }

  // Poll for outpaint status
  async function startOutpaintPoll() {
    const selectedLayerId = currentLayer._id.toString();
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const pollStatusData = await axios.get(
      `${PROCESSOR_API_URL}/video_sessions/edit_status?id=${id}&layerId=${selectedLayerId}`,
      headers
    );
    const pollStatus = pollStatusData.data;

    if (pollStatus.status === 'COMPLETED') {
      const layerData = pollStatus.layer;
      const imageSession = layerData.imageSession;
      const newActiveItemList = imageSession.activeItemList;
      const generatedImageUrlName = imageSession.activeEditedImage;
      const generatedURL = `${generatedImageUrlName}`;
      const item_id = `item_${activeItemList.length}`;
      const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const nImageList = [
        ...activeItemList,
        {
          src: generatedURL,
          id: item_id,
          type: 'image',
          x: 0,
          y: 0,
          width: stageDimensions.width,
          height: stageDimensions.height,
        },
      ];

      const generationImages = pollStatus.generationImages;
      if (generationImages && generationImages.length > 0) {
        setGenerationImages(generationImages);
      }
      setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
      setActiveItemList(nImageList);
      setIsOutpaintPending(false);
      setIsCanvasDirty(true);
      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Edit completed successfully!
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    } else if (pollStatus.status === 'FAILED') {
      setIsOutpaintPending(false);
      setOutpaintError('Failed to generate outpaint');
      toast.error(
        <div>
          <FaTimes /> Outpaint failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    } else {
      outpaintPollIntervalRef.current = setTimeout(() => {
        startOutpaintPoll();
      }, 1000);
    }
  }

  // SMART selection (mask generation)
  useEffect(() => {
    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_SMART_SELECT_DISPLAY) {
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }
      const originalStage = canvasRef.current.getStage();
      const clonedStage = originalStage.clone();

      // remove BBox rects or transformers
      clonedStage
        .find((node) => node.id().startsWith('bbox_rect_'))
        .forEach((node) => {
          node.destroy();
        });
      clonedStage.find('Transformer').forEach((transformer) => {
        transformer.destroy();
      });
      clonedStage.draw();

      const dataURL = clonedStage.toDataURL();
      const layerId = currentLayer._id.toString();
      const sessionPayload = {
        image: dataURL,
        sessionId: id,
        layerId: layerId,
      };

      if (activeItemList.length === 0) {
        return;
      }
      if (activeItemList.length > 1) {
        const newItemId = `item_${activeItemList.length}`;
        const newItem = {
          src: dataURL,
          id: newItemId,
          type: 'image',
          x: 0,
          y: 0,
          width: STAGE_DIMENSIONS.width,
          height: STAGE_DIMENSIONS.height,
        };
        const newItemList = [...activeItemList, newItem];
        setActiveItemList(newItemList);
        updateSessionLayerActiveItemList(newItemList);
      }
      setEnableSegmentationMask(false);

      axios
        .post(`${PROCESSOR_API_URL}/video_sessions/request_generate_mask`, sessionPayload, headers)
        .then(function () {
          startMaskGenerationPoll();
          setEnableSegmentationMask(true);
          setCanvasActionLoading(true);
          toast.success(
            <div>
              <FaCheck className='inline-flex mr-2' /> Mask generation request submitted
              successfully!
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
        })
        .catch(() => {
          toast.error(
            <div>
              <FaTimes /> Failed to submit mask generation request.
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
        });
    }
  }, [currentCanvasAction]);

  const startMaskGenerationPoll = () => {
    const sessionId = id;
    axios
      .get(`${PROCESSOR_API_URL}/video_sessions/generate_mask_status?sessionId=${sessionId}`)
      .then((response) => {
        const maskGeneration = response.data;
        if (maskGeneration.status === 'COMPLETED') {
          const sessionData = maskGeneration.session;
          setVideoSessionDetails(sessionData);
          const layerData = sessionData.layers.find(
            (layer) => layer._id.toString() === currentLayer._id.toString()
          );
          const segmentationData = layerData.segmentation;
          setSegmentationData(segmentationData);
          setCanvasActionLoading(false);
          setIsCanvasDirty(true);
          toast.success(
            <div>
              <FaCheck className='inline-flex mr-2' /> Mask generation completed successfully!
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
        } else {
          maskGenerationPollIntervalRef.current = setTimeout(() => {
            startMaskGenerationPoll();
          }, 1000);
        }
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to generate mask.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  /***********************************************
   *            TEMPLATE / LIBRARY
   ***********************************************/
  const showTemplatesSelect = () => {
    setIsTemplateSelectViewSelected(!isTemplateSelectViewSelected);
  };
  const addImageItemToActiveList = (payload) => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
    updateCurrentActiveLayer(payload);
  };
  const getRemoteTemplateData = (page) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .get(`${PROCESSOR_API_URL}/utils/template_list?page=${page}`, headers)
      .then((response) => {
        setTemplateOptionList(response.data);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Templates loaded successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to load templates.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };
  const submitTemplateSearch = (query) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .get(`${PROCESSOR_API_URL}/utils/search_template?query=${query}`, headers)
      .then((response) => {
        setTemplateOptionList(response.data);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Template search completed successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to search templates.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const addImageToCanvas = (templateOption) => {
    const templateURL = `${PROCESSOR_API_URL}/templates/mm_final/${templateOption}`;
    const newId = `item_${activeItemList.length}`;
    const nImageList = [
      ...activeItemList,
      { src: templateURL, id: newId, type: 'image' },
    ];
    setActiveItemList(nImageList);
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    updateSessionLayerActiveItemList(nImageList);
  };

  /************************************************
   *            TEXT / SHAPES
   ************************************************/
  const addTextBoxToCanvas = (payload) => {
    const nImageList = [
      ...activeItemList,
      { ...payload, id: `item_${activeItemList.length}` },
    ];

    // If any item is an image with a query param in src, remove it
    const listPayload = nImageList.map((imageItem) => {
      if (imageItem.type === 'image') {
        const imageSrc = imageItem.src;
        const questionMarkIndex = imageSrc.indexOf('?');
        const imageSrcFormatted =
          questionMarkIndex !== -1 ? imageSrc.slice(0, questionMarkIndex) : imageSrc;
        return { ...imageItem, src: imageSrcFormatted };
      }
      return imageItem;
    });

    setActiveItemList(nImageList);
    updateSessionLayerActiveItemList(listPayload);
  };

  const createTextLayer = async (payload) => {
    const apiPayload = {
      sessionId: id,
      layerId: currentLayer._id.toString(),
      textItem: payload,
    };
    const headers = getHeaders();
    const resData = await axios.post(
      `${PROCESSOR_API_URL}/video_sessions/add_text_to_active_list`,
      apiPayload,
      headers
    );
    const responsePayload = resData.data;
    const layerData = responsePayload.layer;
    const newActiveItemList = layerData.imageSession.activeItemList;
    setActiveItemList(newActiveItemList);
  };

  const setSelectedShape = (shapeKey) => {
    let shapeConfig;
    if (shapeKey === 'dialog') {
      shapeConfig = {
        x: 512,
        y: 200,
        width: 100,
        height: 50,
        fillColor: fillColor,
        strokeColor: strokeColor,
        strokeWidth: strokeWidthValue,
        pointerX: 512,
        pointerY: 270,
        xRadius: 50,
        yRadius: 20,
      };
    } else {
      shapeConfig = {
        x: 512,
        y: 200,
        width: 200,
        height: 200,
        fillColor: fillColor,
        radius: 70,
        strokeColor: strokeColor,
        strokeWidth: strokeWidthValue,
      };
    }
    const newId = `item_${activeItemList.length}`;
    const currentLayerList = [
      ...activeItemList,
      {
        type: 'shape',
        shape: shapeKey,
        config: shapeConfig,
        id: newId,
      },
    ];
    setActiveItemList(currentLayerList);
    setSelectedId(newId);
    updateSessionLayerActiveItemList(currentLayerList);
  };

  /*************************************************
   *                   FILTERS
   *************************************************/
  const applyFilter = (index, filter, value) => {
    const nodeId = `item_${index}`;
    const stage = canvasRef.current.getStage();
    const imageNode = stage.findOne(`#${nodeId}`);
    if (!imageNode) return;
    imageNode.cache();
    imageNode.filters([filter]);

    switch (filter) {
      case Konva.Filters.Blur:
        imageNode.blurRadius(value);
        break;
      case Konva.Filters.Brighten:
        imageNode.brightness(value);
        break;
      case Konva.Filters.Contrast:
        imageNode.contrast(value);
        break;
      case Konva.Filters.HSL:
        imageNode.hue(value * 360);
        break;
      case Konva.Filters.Pixelate:
        imageNode.pixelSize(Math.round(value));
        break;
      case Konva.Filters.Posterize:
        imageNode.levels(Math.round(value));
        break;
      case Konva.Filters.RGBA:
        imageNode.alpha(value);
        break;
      default:
        // grayscale, invert, sepia, etc. have no extra param
        break;
    }
    stage.batchDraw();
  };

  const applyFinalFilter = async (index, filter, value) => {
    const nodeId = `item_${index}`;
    const stage = canvasRef.current.getStage();
    const imageNode = stage.findOne(`#${nodeId}`);
    if (!imageNode) return;

    imageNode.cache();
    imageNode.filters([filter]);
    switch (filter) {
      case Konva.Filters.Blur:
        imageNode.blurRadius(value);
        break;
      case Konva.Filters.Brighten:
        imageNode.brightness(value);
        break;
      case Konva.Filters.Contrast:
        imageNode.contrast(value);
        break;
      case Konva.Filters.HSL:
        imageNode.hue(value * 360);
        break;
      case Konva.Filters.Pixelate:
        imageNode.pixelSize(Math.round(value));
        break;
      case Konva.Filters.Posterize:
        imageNode.levels(Math.round(value));
        break;
      case Konva.Filters.RGBA:
        imageNode.alpha(value);
        break;
      default:
        break;
    }

    stage.batchDraw();
    const updatedImageDataUrl = imageNode.toDataURL();
    const updatedItemList = activeItemList.map((item, idx) => {
      if (idx === index) {
        return { ...item, src: updatedImageDataUrl };
      }
      return item;
    });

    setActiveItemList(updatedItemList);
    updateSessionLayerActiveItemList(updatedItemList);
  };

  const handleBubbleChange = () => { };

  const combineCurrentLayerItems = async () => {
    const stage = canvasRef.current.getStage();
    const transformers = stage.find('Transformer');
    transformers.forEach((tr) => tr.visible(false));
    const masks = stage.find('#maskGroup, #pencilGroup');
    masks.forEach((mask) => mask.visible(false));

    const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const combinedImageDataUrl = stage.toDataURL({ pixelRatio: 2 });
    const combinedItem = {
      src: combinedImageDataUrl,
      id: `item_0`,
      type: 'image',
      x: 0,
      y: 0,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
    };
    const updatedItemList = [combinedItem];
    setActiveItemList(updatedItemList);
    updateSessionLayerActiveItemList(updatedItemList);
    setSelectedId('item_0');
  };

  /**********************************************
   *          AUDIO / MUSIC GENERATION
   **********************************************/
  const submitGenerateMusicRequest = (payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    payload.sessionId = id;
    axios
      .post(`${PROCESSOR_API_URL}/audio/request_generate_audio`, payload, headers)
      .then((response) => {
        setAudioGenerationPending(true);
        startAudioGenerationPoll(response.data);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Audio generation request submitted successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to submit audio generation request.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const startAudioGenerationPoll = async () => {
    const sessionId = id;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const pollStatusData = await axios.get(
      `${PROCESSOR_API_URL}/audio/generate_status?sessionId=${sessionId}`,
      headers
    );
    const pollStatus = pollStatusData.data;

    if (pollStatus.generationStatus === 'COMPLETED') {

      
      setVideoSessionDetails(pollStatus.videoSession);
      setAudioGenerationPending(false);
      const { generationType } = pollStatus;
      if (generationType === 'music') {
        setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_MUSIC_DISPLAY);
      } else if (generationType === 'sound') {
        setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SOUND_DISPLAY);
      } else if (generationType === 'speech') {
        setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SPEECH_DISPLAY);
      }
      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Audio generation completed successfully!
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    } else if (pollStatus.generationStatus === 'FAILED') {
      setAudioGenerationPending(false);
      toast.error(
        <div>
          <FaTimes /> Audio generation failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    } else {
      audioGenerationPollIntervalRef.current = setTimeout(() => {
        startAudioGenerationPoll();
      }, 2000);
    }
  };

  const submitAddBatchTrackToProject = (payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const sessionId = id;
    let requestPayload = {
      sessionId,
      audioLayers: payload,
    };


    axios
      .post(`${PROCESSOR_API_URL}/audio/add_track_list_to_project`, requestPayload, headers)
      .then((response) => {
        const sessionData = response.data;
        if (sessionData && sessionData.videoSession) {
          setVideoSessionDetails(sessionData.videoSession);
          setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
          toast.success(
            <div>
              <FaCheck className='inline-flex mr-2' /> Track added to project successfully!
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
          setIsCanvasDirty(true);
        }
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to add track to project.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const submitAddTrackToProject = (index, payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    console.log("GONNA ADD TRACK");
    console.log(payload);

    const sessionId = id;
    const audioLayers = videoSessionDetails.audioLayers;
    const latestAudioLayer = audioLayers[audioLayers.length - 1];
    const layerId = latestAudioLayer._id.toString();

    let requestPayload = {
      sessionId,
      trackIndex: index,
      ...payload,
    };
    if (!requestPayload.audioLayerId) {
      requestPayload.audioLayerId = layerId;
    }

    console.log("GONNA ADD TRACK");
    console.log(requestPayload);


    axios
      .post(`${PROCESSOR_API_URL}/audio/add_track_to_project`, requestPayload, headers)
      .then((response) => {
        const sessionData = response.data;
        if (sessionData && sessionData.videoSession) {
          setVideoSessionDetails(sessionData.videoSession);
          setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
          toast.success(
            <div>
              <FaCheck className='inline-flex mr-2' /> Track added to project successfully!
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
          setIsCanvasDirty(true);
        }
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to add track to project.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const selectImageFromLibrary = (imageItem) => {
    const newItemId = `item_${activeItemList.length}`;
    const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const newItem = {
      src: imageItem,
      id: newItemId,
      type: 'image',
      x: 0,
      y: 0,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
    };
    const newItemList = [...activeItemList, newItem];
    setActiveItemList(newItemList);
    updateSessionLayerActiveItemList(newItemList);
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);

    currentLayer.imageSession.activeItemList = newItemList;
    updateCurrentLayer(currentLayer);

    toast.success(
      <div>
        <FaCheck className='inline-flex mr-2' /> Image added from library successfully!
      </div>,
      {
        position: 'bottom-center',
        className: 'custom-toast',
      }
    );
  };

  const resetImageLibrary = () => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
  };

  // removeAiVideoLayer now includes the layer type in the payload
  const removeAIVideoLayer = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = {
      sessionId: id,
      layerId: currentLayer._id.toString(),
      aiVideoLayerType, // pass the currently active AI video layer type
    };

    const responseData = await axios.post(`${PROCESSOR_API_URL}/video_sessions/remove_ai_video_layer`, payload, headers);
    const removeResponse = responseData.data;
    if (removeResponse) {
      const { session, layer } = removeResponse;
      const layerList = session.layers;
      const currentNewLayerIndex = layerList.findIndex(
        (l) => l._id.toString() === layer._id.toString()
      );
      updateCurrentLayerAndLayerList(layerList, currentNewLayerIndex);
      setActiveItemList(layer.imageSession.activeItemList);
      if (layer.hasAiVideoLayer) {
        setAiVideoLayer(layer.aiVideoLayer);
        setAiVideoLayerType(layer.aiVideoLayerType);
      } else {
        setAiVideoLayer(null);
        setAiVideoLayerType(null);
      }
    }
  };

  // Sync / realign helpers
  const requestRegenerateSubtitles = async () => {
    toast.success(
      <div>
        <FaCheck className='inline-flex mr-2' /> Requested regenerate subtitles.
      </div>,
      {
        position: 'bottom-center',
        className: 'custom-toast',
      }
    );
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = { sessionId: id, realignAudio: true };
    axios.post(`${PROCESSOR_API_URL}/video_sessions/request_regenerate_subtitles`, payload, headers).then(() => {
      setIsCanvasDirty(true);
    });
  };

  const requestReAlignLayersToSpeechAndRegenerateSubtitles = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = { sessionId: id, realignAudio: true };
    axios.post(`${PROCESSOR_API_URL}/video_sessions/request_realign_layers_to_speech_and_regen_sub`, payload, headers)
      .then(() => {
        setIsCanvasDirty(true);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Request to realign layers to speech submitted
            successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const requestRealignToAiVideoAndLayers = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = { sessionId: id };
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_realign_to_ai_video_and_layers`, payload, headers)
      .then(() => {
        setIsCanvasDirty(true);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Request to realign layers to AI video submitted
            successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const requestRegenerateAnimations = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = { sessionId: id };
    toast.success(
      <div>
        <FaCheck className='inline-flex mr-2' /> Request to regenerate animations submitted
        successfully!
      </div>,
      {
        position: 'bottom-center',
        className: 'custom-toast',
      }
    );
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_regenerate_animations`, payload, headers)
      .then(() => {
        setIsCanvasDirty(true);
      });
  };

  const requestLipSyncToSpeech = (selectedModel) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setIsAIVideoGenerationPending(true);
    const payload = {
      videoSessionId: id,
      sessionId: id,
      layerId: currentLayer._id.toString(),
      model: selectedModel
    };

    setAiVideoPollType(null);

    axios.post(`${PROCESSOR_API_URL}/video_sessions/request_lip_sync_to_speech`, payload, headers).then((resData) => {

      const response = resData.data;

      const { session, layer } = response;
      const newLayers = session.layers;
      const currentLayerIndex = newLayers.findIndex(
        (l) => l._id.toString() === layer._id.toString()
      );
      updateCurrentLayerAndLayerList(newLayers, currentLayerIndex);
      setAiVideoPollType('lip_sync');


      toast.success(
        <div>
          <FaCheck className='inline-flex mr-2' /> Generation request submitted successfully!
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
    });
  };

  // Add audio from library
  const requestAddAudioLayerFromLibrary = (audioItem) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = {
      sessionId: id,
      audioItem,
    };
    axios.post(`${PROCESSOR_API_URL}/video_sessions/add_audio_from_library`, payload, headers).then((dataRes) => {
      const response = dataRes.data;
      const sessionDetails = response.sessionDetails;
      if (sessionDetails) {
        setVideoSessionDetails(sessionDetails);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Audio added to project successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        resetImageLibrary();
      }
    });
  };

  // Add selected AI video to layer
  const addSelectedAiVideoToLayer = (payload) => {
    setIsSelectButtonDisabled(true);
    const { video, trimScene, model } = payload;

    console.log("ADD VIDEO");
    console.log(video);
    
    const videoURL = video.url;

    const requestPayload = {
      sessionId: id,
      videoURL,
      trimScene,
      layerId: currentLayer._id.toString(),
      videoModel: video.model,
    };
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      setIsSelectButtonDisabled(false);
      return;
    }
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/add_ai_video_layer`, requestPayload, headers)
      .then((dataRes) => {
        const response = dataRes.data;
        setIsSelectButtonDisabled(false);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Video added to project successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        resetImageLibrary();

        const { session, layer } = response;
        const newLayers = session.layers;
        const currentLayerIndex = newLayers.findIndex(
          (l) => l._id.toString() === layer._id.toString()
        );
        updateCurrentLayerAndLayerList(newLayers, currentLayerIndex);

        // Decide which link to set
        if (layer.hasLipSyncVideoLayer && layer.lipSyncVideoLayer) {
          setAiVideoLayerType('lip_sync');
          setAiVideoLayer(layer.lipSyncRemoteLink
            ? `${STATIC_CDN_URL}/${layer.lipSyncRemoteLink}`
            : `${PROCESSOR_API_URL}${layer.lipSyncVideoLayer}`);
        } else if (layer.hasSoundEffectVideoLayer && layer.soundEffectVideoLayer) {
          setAiVideoLayerType('sound_effect');
          setAiVideoLayer(layer.soundEffectRemoteLink
            ? `${STATIC_CDN_URL}/${layer.soundEffectRemoteLink}`
            : `${PROCESSOR_API_URL}${layer.soundEffectVideoLayer}`);
        } else if (layer.hasAiVideoLayer && layer.aiVideoLayer) {
          setAiVideoLayerType('ai_video');
          setAiVideoLayer(layer.aiVideoRemoteLink
            ? `${STATIC_CDN_URL}/${layer.aiVideoRemoteLink}`
            : `${PROCESSOR_API_URL}${layer.aiVideoLayer}`);
        } else {
          setAiVideoLayer(null);
          setAiVideoLayerType(null);
        }
      })
      .catch(() => {
        setIsSelectButtonDisabled(false);
      });
  };

  // Submit layered speech
  const submitGenerateLayeredSpeechRequest = (data) => {
    const payload = {
      ...data,
      fontSize: 40,
      fontColor: '#f5f5f5',
      fontFamily: 'Times New Roman',
      backgroundColor: '#030712',
      videoSessionId: id,
    };
    const numLayers = data.promptList.length;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setAudioGenerationPending(true);
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_generate_layered_speech`, payload, headers)
      .then(() => {
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Layered speech generation request submitted
            successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        // poll method
        numAudioLayersToPollRef.current = numLayers;
        startLayeredAudioGenerationPoll();
      })
      .catch(() => {
        setAudioGenerationPending(false);
        toast.error(
          <div>
            <FaTimes /> Failed to submit layered speech generation request.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const numAudioLayersToPollRef = useRef(0);
  const startLayeredAudioGenerationPoll = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const numLayers = numAudioLayersToPollRef.current;
    try {
      const pollStatusData = await axios.get(
        `${PROCESSOR_API_URL}/audio/layered_speech_generate_status?sessionId=${id}&numLayers=${numLayers}`,
        headers
      );
      const pollStatus = pollStatusData.data;
      if (pollStatus.generationStatus === 'COMPLETED') {
        setVideoSessionDetails(pollStatus.videoSession);
        setAudioGenerationPending(false);
        setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SPEECH_LAYERED_DISPLAY);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Layered speech generation completed
            successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        getUserAPI();
        return;
      } else if (pollStatus.generationStatus === 'FAILED') {
        setAudioGenerationPending(false);
        toast.error(
          <div>
            <FaTimes /> Layered speech generation failed.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        getUserAPI();
        return;
      } else {
        layeredAudioGenerationPollIntervalRef.current = setTimeout(() => {
          startLayeredAudioGenerationPoll();
        }, 1000);
      }
    } catch (error) {
      console.error('Error in startLayeredAudioGenerationPoll:', error);
      setAudioGenerationPending(false);
      toast.error(
        <div>
          <FaTimes /> Layered speech generation failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
    }
  };

  // Submit advanced session theme
  const [isUpdateDefaultsPending, setIsUpdateDefaultsPending] = useState(false);
  const submitUpdateSessionDefaults = (defaultPayload) => {
    setIsUpdateDefaultsPending(true);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return Promise.reject(new Error('No headers'));
    }
    const payload = {
      sessionId: id,
      defaults: defaultPayload,
    };
    return axios
      .post(`${PROCESSOR_API_URL}/video_sessions/update_defaults`, payload, headers)
      .then((response) => {
        const updatedSession = response.data;
        const sessionData = updatedSession.videoSession;
        setVideoSessionDetails(sessionData);
        setIsUpdateDefaultsPending(false);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Session defaults updated successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch((error) => {
        toast.error(
          <div>
            <FaTimes /> Failed to update session defaults.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        setIsUpdateDefaultsPending(false);
        return Promise.reject(error);
      });
  };

  // Setting advanced theme
  const setAdvancedSessionTheme = (payload) => {
    setIsUpdateDefaultsPending(true);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    payload = {
      sessionId: id,
      aspectRatio,
      ...payload,
    };
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/set_advanced_theme`, payload, headers)
      .then((response) => {
        const updatedSessionContainer = response.data;
        const updatedSession = updatedSessionContainer.sessionDetails;
        setVideoSessionDetails(updatedSession);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Advanced theme updated successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        setIsUpdateDefaultsPending(false);
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to update advanced theme.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        setIsUpdateDefaultsPending(false);
      });
  };

  // Poll for AI video generation
  const startAIVideoLayerGenerationPoll = async () => {


    const selectedLayerId = currentLayer._id.toString();
    const payload = {
      sessionId: id,
      layerId: selectedLayerId,
      aiVideoLayerType: aiVideoPollType,
    };



    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (!aiVideoPollType) {
      // setIsAIVideoGenerationPending(false);
      return;
    }
    const pollResData = await axios.post(
      `${PROCESSOR_API_URL}/video_sessions/generate_ai_video_status`,
      payload,
      headers
    );
    const pollRes = pollResData.data;
    if (pollRes.status === 'COMPLETED') {
      const sessionData = pollRes.session;


      setIsAIVideoGenerationPending(false);
      const layerData = sessionData.layers.find(
        (layer) => layer._id.toString() === selectedLayerId
      );

      const newLayers = sessionData.layers;
      const updatedLayerIndex = newLayers.findIndex(
        (layer) => layer._id.toString() === selectedLayerId
      );
      // Preload the hidden <video>
      const hiddenContainer = document.getElementById('hidden-video-container');
      const videoSrc = `${STATIC_CDN_URL}/${layerData.aiVideoRemoteLink}`;
      const video = document.createElement('video');
      video.src = videoSrc;
      video.preload = 'auto';
      video.style.display = 'none';
      hiddenContainer.appendChild(video);

      updateCurrentLayerAndLayerList(newLayers, updatedLayerIndex);
      setIsCanvasDirty(true);
      getUserAPI();
    } else if (pollRes.status === 'FAILED') {
      setIsAIVideoGenerationPending(false);
      toast.error(
        <div>
          <FaTimes /> AI Video generation failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
    } else {
      aiVideoGenerationPollIntervalRef.current = setTimeout(() => {
        startAIVideoLayerGenerationPoll();
      }, 1000);
    }
  };

  // Submit new AI video request
  const submitGenerateNewAIVideoRequest = (requestConfig) => {
    setIsAIVideoGenerationPending(true);
    const payload = {
      model: selectedVideoGenerationModel,
      prompt: videoPromptText,
      currentLayerId: currentLayer._id.toString(),
      videoSessionId: id,
      aspectRatio,
      ...requestConfig,
    };
    setGenerationError(null);

    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setAiVideoPollType(null);


    console.log("PAYLOAD");
    console.log(payload);
    
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/request_generate_custom_video`, payload, headers)
      .then((resData) => {
        const response = resData.data;

        setAiVideoPollType('ai_video');

        const { session, layer } = response;
        const newLayers = session.layers;
        const currentLayerIndex = newLayers.findIndex(
          (l) => l._id.toString() === layer._id.toString()
        );
        updateCurrentLayerAndLayerList(newLayers, currentLayerIndex);
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> Generation request submitted successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch((error) => {
        setGenerationError(error.message);
        toast.error(
          <div>
            <FaTimes /> Failed to submit generation request.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const [mimialEditorDisplay, setMinimalEditorDisplay] = useState(true);
  const onToggleEditorMinimalDisplay = () => {
    setMinimalEditorDisplay(!mimialEditorDisplay);
  };

  const requestAddSyncedSoundEffect = (payload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const reqPayload = {
      sessionId: id,
      currentLayerId: currentLayer._id.toString(),
      model: 'MMAUDIOV2',
      ...payload,
    };
    setAiVideoPollType(null);

    setIsAIVideoGenerationPending(true);
    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/add_synced_sound_effect`, reqPayload, headers)
      .then(() => {
        setAiVideoPollType('sound_effect');
        startAIVideoLayerGenerationPoll();
      });
  };

  const updateMovieGenSpeakers = (updatedSpeakers) => {
    console.log("FEE GOO");
    console.log(updatedSpeakers);
    
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = {
      sessionId: id,
      speakers: updatedSpeakers,
    };

    console.log("GONNA UPDATE MOVIE GEN SPEAKERS");
    console.log(movieGenSpeakers);

    console.log("GEEEEEEEEEEE");


    axios
      .post(`${PROCESSOR_API_URL}/video_sessions/update_movie_gen_speakers`, payload, headers)
      .then(() => {
        toast.success(
          <div>
            <FaCheck className='inline-flex mr-2' /> MovieGen speakers updated successfully!
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Failed to update MovieGen speakers.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  }


  let viewDisplay = <span />;
  if (currentLayer && currentLayer.imageSession && currentLayer.imageSession.activeItemList) {
    if (currentLayer.imageSession.generationStatus === 'PENDING') {
      viewDisplay = <LoadingImage />;
    } else {
      if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_LIBRARY_DISPLAY) {
        viewDisplay = (
          <LibraryHome
            generationImages={generationImages}
            addImageItemToActiveList={addImageItemToActiveList}
            selectImageFromLibrary={selectImageFromLibrary}
            resetImageLibrary={resetImageLibrary}
            onSelectMusic={requestAddAudioLayerFromLibrary}
            onSelectVideo={addSelectedAiVideoToLayer}
            isSelectButtonDisabled={isSelectButtonDisabled}
          />
        );
      } else {
        // Show the Konva-based canvas
        let canvasInternalLoading = <span />;
        if (canvasActionLoading) {
          const canvasWidth = getCanvasDimensionsForAspectRatio(aspectRatio).width;
          canvasInternalLoading = (
            <div className={`absolute t-0 pt-[150px] w-[${canvasWidth}px]  z-10`}>
              <LoadingImageTransparent />
            </div>
          );
        }
        viewDisplay = (
          <div>
            {canvasInternalLoading}
            <VideoCanvasContainer
              ref={canvasRef}
              maskGroupRef={maskGroupRef}
              sessionDetails={videoSessionDetails}
              activeItemList={activeItemList}
              setActiveItemList={setActiveItemList}
              editBrushWidth={editBrushWidth}
              currentView={currentView}
              editMasklines={editMasklines}
              setEditMaskLines={setEditMaskLines}
              currentCanvasAction={currentCanvasAction}
              setCurrentCanvasAction={setCurrentCanvasAction}
              fillColor={fillColor}
              strokeColor={strokeColor}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              buttonPositions={buttonPositions}
              setButtonPositions={setButtonPositions}
              selectedLayerType={selectedLayerType}
              setSelectedLayerType={setSelectedLayerType}
              applyFilter={applyFilter}
              applyFinalFilter={applyFinalFilter}
              onChange={handleBubbleChange}
              pencilColor={pencilColor}
              pencilWidth={pencilWidth}
              eraserWidth={eraserWidth}
              sessionId={id}
              selectedLayerId={selectedLayerId}
              exportAnimationFrames={() => { }}
              currentLayerSeek={currentLayerSeek}
              currentLayer={currentLayer}
              updateSessionActiveItemList={updateSessionLayerActiveItemList}
              selectedLayerSelectShape={selectedLayerSelectShape}
              setCurrentView={setCurrentView}
              isLayerSeeking={isLayerSeeking}
              setEnableSegmentationMask={setEnableSegmentationMask}
              enableSegmentationMask={enableSegmentationMask}
              segmentationData={segmentationData}
              setSegmentationData={setSegmentationData}
              isExpressGeneration={isExpressGeneration}
              removeVideoLayer={removeAIVideoLayer}
              aspectRatio={aspectRatio}
              isAIVideoGenerationPending={isAIVideoGenerationPending}
              toggleStageZoom={toggleStageZoom}
              stageZoomScale={stageZoomScale}
              requestRegenerateSubtitles={requestRegenerateSubtitles}
              displayZoomType={displayZoomType}
              aiVideoLayer={aiVideoLayer}
              aiVideoLayerType={aiVideoLayerType}
              requestRegenerateAnimations={requestRegenerateAnimations}
              requestRealignLayers={requestReAlignLayersToSpeechAndRegenerateSubtitles}
              totalDuration={totalDuration}
              selectedEditModelValue={selectedEditModelValue}
              downloadCurrentFrame={downloadCurrentFrame}
              createTextLayer={createTextLayer}
              requestRealignToAiVideoAndLayers={requestRealignToAiVideoAndLayers}
              requestLipSyncToSpeech={requestLipSyncToSpeech}
              setPromptText={setPromptText}
              promptText={promptText}
              submitGenerateRequest={submitGenerateRequest}
              isGenerationPending={isGenerationPending}
              selectedGenerationModel={selectedGenerationModel}
              setSelectedGenerationModel={setSelectedGenerationModel}
              generationError={generationError}

              submitGenerateNewRequest={submitGenerateNewRequest}
              isUpdateLayerPending={isUpdateLayerPending}


            />
          </div>
        );
      }
    }
  }



  const editorToolbarExpanded = (
    <VideoEditorToolbar
      promptText={promptText}
      setPromptText={setPromptText}
      setVideoPromptText={setVideoPromptText}
      videoPromptText={videoPromptText}
      submitGenerateRequest={submitGenerateRequest}
      submitOutpaintRequest={submitOutpaintRequest}
      showAttestationDialog={() => { }}
      selectedChain={selectedChain}
      setSelectedChain={setSelectedChain}
      selectedAllocation={selectedAllocation}
      setSelectedAllocation={setSelectedAllocation}
      showTemplatesSelect={showTemplatesSelect}
      addTextBoxToCanvas={addTextBoxToCanvas}
      showMask={false}
      setShowMask={() => { }}
      editBrushWidth={editBrushWidth}
      setEditBrushWidth={setEditBrushWidth}
      setCurrentViewDisplay={setCurrentViewDisplay}
      currentViewDisplay={currentView}
      textConfig={textConfig}
      setTextConfig={setTextConfig}
      activeItemList={activeItemList}
      setActiveItemList={setActiveItemList}
      selectedGenerationModel={selectedGenerationModel}
      setSelectedGenerationModel={setSelectedGenerationModel}
      selectedEditModel={selectedEditModel}
      setSelectedEditModel={setSelectedEditModel}
      isGenerationPending={isGenerationPending}
      isOutpaintPending={isOutpaintPending}
      isPublicationPending={isPublicationPending}
      setSelectedShape={setSelectedShape}
      fillColor={fillColor}
      setFillColor={setFillColor}
      strokeColor={strokeColor}
      setStrokeColor={setStrokeColor}
      strokeWidthValue={strokeWidthValue}
      setStrokeWidthValue={setStrokeWidthValue}
      generationError={generationError}
      outpaintError={outpaintError}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      aiVideoLayerType={aiVideoLayerType}
      exportAnimationFrames={() => { }}
      showMoveAction={() => { }}
      showResizeAction={() => { }}
      showSaveAction={() => { }}
      showUploadAction={() => {
        setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
        openAlertDialog(
          <UploadImageDialog
            setUploadURL={setUploadURL}
            aspectRatio={aspectRatio}
          />
        );
      }}
      pencilWidth={pencilWidth}
      setPencilWidth={setPencilWidth}
      pencilColor={pencilColor}
      setPencilColor={setPencilColor}
      eraserWidth={eraserWidth}
      setEraserWidth={setEraserWidth}
      cursorSelectOptionVisible={cursorSelectOptionVisible}
      setCursorSelectOptionVisible={setCursorSelectOptionVisible}
      setCurrentCanvasAction={setCurrentCanvasAction}
      currentCanvasAction={currentCanvasAction}
      selectedLayerSelectShape={selectedLayerSelectShape}
      setSelectedLayerSelectShape={setSelectedLayerSelectShape}
      updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
      updateSessionLayerActiveItemListAnimations={updateSessionLayerActiveItemListAnimations}
      eraserOptionsVisible={eraserOptionsVisible}
      submitGenerateMusicRequest={submitGenerateMusicRequest}
      audioLayers={videoSessionDetails.audioLayers}
      audioGenerationPending={audioGenerationPending}
      submitAddTrackToProject={submitAddTrackToProject}
      combineCurrentLayerItems={combineCurrentLayerItems}
      showAddAudioToProjectDialog={showAddAudioToProjectDialog}
      sessionDetails={videoSessionDetails}
      submitUpdateSessionDefaults={submitUpdateSessionDefaults}
      isUpdateDefaultsPending={isUpdateDefaultsPending}
      hideItemInLayer={toggleHideItemInLayer}
      applyAnimationToAllLayers={applyAnimationToAllLayers}
      submitGenerateLayeredSpeechRequest={submitGenerateLayeredSpeechRequest}
      currentDefaultPrompt={currentLayerDefaultPrompt}
      submitGenerateRecreateRequest={submitGenerateRecreateRequest}
      submitGenerateNewRequest={submitGenerateNewRequest}
      setShowCreateNewPromptDisplay={setShowCreateNewPromptDisplay}
      showCreateNewPromptDisplay={showCreateNewPromptDisplay}
      showCreateNewPrompt={showCreateNewPrompt}
      submitGenerateNewVideoRequest={submitGenerateNewAIVideoRequest}
      selectedVideoGenerationModel={selectedVideoGenerationModel}
      setSelectedVideoGenerationModel={setSelectedVideoGenerationModel}
      aiVideoGenerationPending={isAIVideoGenerationPending}
      aspectRatio={aspectRatio}
      setAdvancedSessionTheme={setAdvancedSessionTheme}
      requestAddAudioLayerFromLibrary={requestAddAudioLayerFromLibrary}
      selectedEditModelValue={selectedEditModelValue}
      submitAddBatchTrackToProject={submitAddBatchTrackToProject}
      currentLayer={currentLayer}
      requestLipSyncToSpeech={requestLipSyncToSpeech}
      removeVideoLayer={removeAIVideoLayer}
      isSelectButtonDisabled={isSelectButtonDisabled}
      currentLayerHasSpeechLayer={currentLayerHasSpeechLayer}
      requestAddSyncedSoundEffect={requestAddSyncedSoundEffect}

      movieSoundList={movieSoundList}
      movieVisualList={movieVisualList}
      movieGenSpeakers={movieGenSpeakers}
      updateMovieGenSpeakers={updateMovieGenSpeakers}
    />
  )


  if (displayZoomType === 'fill') {
    let editorToolbarDisplay = <span />;
    if (mimialEditorDisplay) {
      editorToolbarDisplay = (
        <div className='w-[2%] inline-block bg-gray-800 '>
          <VideoEditorToolbarMinimal onToggleDisplay={onToggleEditorMinimalDisplay} />
        </div>
      );
    } else {
      editorToolbarDisplay = (
        <div className='w-[18%] inline-block bg-cyber-black '>
          {editorToolbarExpanded}
          <ToastContainer
            position='bottom-center'
            autoClose={5000}
            hideProgressBar
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            className='custom-toast-container'
            toastClassName='custom-toast'
            bodyClassName='custom-toast-body'
          />
        </div>
      );
    }

    return (
      <div className='block'>
        <div className='text-center w-[98%] inline-block h-[100vh] overflow-scroll m-auto mb-8 '>
          {viewDisplay}
        </div>
        {editorToolbarDisplay}
        <ToastContainer
          position='bottom-center'
          autoClose={5000}
          hideProgressBar
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          className='custom-toast-container'
          toastClassName='custom-toast'
          bodyClassName='custom-toast-body'
        />
      </div>
    );
  }

  return (
    <div className='block'>
      <div className='text-center w-[82%] inline-block h-[100vh] overflow-scroll m-auto mb-8 '>
        {viewDisplay}
      </div>
      <div className='w-[18%] inline-block bg-cyber-black '>
        {editorToolbarExpanded}
      </div>
    </div>
  );
}
