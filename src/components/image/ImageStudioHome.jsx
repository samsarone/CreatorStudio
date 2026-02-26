import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { FaCheck, FaTimes } from 'react-icons/fa';

import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { getHeaders } from '../../utils/web.jsx';
import {
  CURRENT_TOOLBAR_VIEW,
  TOOLBAR_ACTION_VIEW,
  IMAGE_EDIT_MODEL_TYPES,
} from '../../constants/Types.ts';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';
import { imageAspectRatioOptions } from '../../constants/ImageAspectRatios.js';

import CommonContainer from '../common/CommonContainer.tsx';
import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import LoadingImage from '../video/util/LoadingImage.jsx';
import LoadingImageBase from '../video/util/LoadingImageBase.jsx';
import VideoCanvasContainer from '../video/editor/VideoCanvasContainer.jsx';
import ImageLibraryHome from '../library/image/ImageLibraryHome.jsx';
import ImageEditorToolbar from './ImageEditorToolbar.jsx';
import ImageUploadDialog from './ImageUploadDialog.jsx';
import ImageDownloadDialog from './ImageDownloadDialog.jsx';

import 'react-toastify/dist/ReactToastify.css';
import '../video/toolbars/editorToolbar.css';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
const IMAGE_LIBRARY_PAGE_SIZE = 40;

export default function ImageStudioHome() {
  const { id } = useParams();
  const { colorMode } = useColorMode();
  const { getUserAPI } = useUser();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();

  const [sessionDetails, setSessionDetails] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(null);
  const [activeItemList, setActiveItemList] = useState([]);
  const [generationImages, setGenerationImages] = useState([]);
  const [globalLibraryImages, setGlobalLibraryImages] = useState([]);
  const [isGlobalLibraryLoading, setIsGlobalLibraryLoading] = useState(false);
  const [globalLibraryError, setGlobalLibraryError] = useState(null);
  const [globalLibraryPagination, setGlobalLibraryPagination] = useState({
    page: 1,
    pageSize: IMAGE_LIBRARY_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [aspectRatio, setAspectRatio] = useState('1:1');

  const [promptText, setPromptText] = useState('');
  const [selectedGenerationModel, setSelectedGenerationModel] = useState('NANOBANANAPRO');
  const [selectedEditModel, setSelectedEditModel] = useState(
    'NANOBANANAPROEDIT'
  );
  const [selectedEditModelValue, setSelectedEditModelValue] = useState(
    IMAGE_EDIT_MODEL_TYPES.find((model) => model.key === selectedEditModel)
  );

  const [currentView, setCurrentView] = useState(CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY);
  const [currentCanvasAction, setCurrentCanvasAction] = useState(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);

  const [editBrushWidth, setEditBrushWidth] = useState(25);
  const [editMasklines, setEditMaskLines] = useState([]);

  const [isGenerationPending, setIsGenerationPending] = useState(false);
  const [isOutpaintPending, setIsOutpaintPending] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [outpaintError, setOutpaintError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedLayerType, setSelectedLayerType] = useState(null);
  const [buttonPositions, setButtonPositions] = useState([]);
  const [selectedLayerSelectShape, setSelectedLayerSelectShape] = useState(null);

  const [pencilWidth, setPencilWidth] = useState(10);
  const [pencilColor, setPencilColor] = useState('#000000');
  const [eraserWidth, setEraserWidth] = useState(30);

  const [fillColor, setFillColor] = useState(colorMode === 'dark' ? '#e9edf7' : '#0b1226');
  const [strokeColor, setStrokeColor] = useState(colorMode === 'dark' ? '#e9edf7' : '#0b1226');

  const canvasRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const canvasSurfaceRef = useRef(null);
  const [canvasDisplayScale, setCanvasDisplayScale] = useState(1);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: null, height: null });
  const [isCanvasDragActive, setIsCanvasDragActive] = useState(false);
  const [isCanvasDropProcessing, setIsCanvasDropProcessing] = useState(false);
  const canvasDragDepthRef = useRef(0);

  const generationPollIntervalRef = useRef(null);
  const outpaintPollIntervalRef = useRef(null);

  const showLoginDialog = () => {
    const redirectPath = id ? `/image/studio/${id}` : '/image/studio';
    openAlertDialog(<AuthContainer redirectTo={redirectPath} />, undefined, false, AUTH_DIALOG_OPTIONS);
  };

  useEffect(() => {
    setSelectedEditModelValue(
      IMAGE_EDIT_MODEL_TYPES.find((model) => model.key === selectedEditModel)
    );
  }, [selectedEditModel]);

  useEffect(() => {
    if (
      currentView !== CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY ||
      (selectedEditModelValue && selectedEditModelValue.editType !== 'inpaint')
    ) {
      setEditMaskLines([]);
    }
  }, [currentView, selectedEditModelValue]);

  useEffect(() => {
    if (!id) return;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .get(`${PROCESSOR_API_URL}/image_sessions/session_details?id=${id}`, headers)
      .then((response) => {
        const session = response.data;
        setSessionDetails(session);
        setAspectRatio(session?.aspectRatio || '1:1');
        setGenerationImages(session?.generations || []);
        const firstLayer = session?.layers?.[0] || null;
        setCurrentLayer(firstLayer);
        if (firstLayer?.imageSession?.activeItemList) {
          setActiveItemList(firstLayer.imageSession.activeItemList);
        } else {
          setActiveItemList([]);
        }
      })
      .catch(() => {
        toast.error(
          <div>
            <FaTimes /> Unable to load image session.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  }, [id]);

  useEffect(() => {
    setGlobalLibraryImages([]);
    setIsGlobalLibraryLoading(false);
    setGlobalLibraryError(null);
    setGlobalLibraryPagination({
      page: 1,
      pageSize: IMAGE_LIBRARY_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  }, [id]);

  useEffect(() => {
    if (currentLayer?.imageSession?.activeItemList) {
      setActiveItemList(currentLayer.imageSession.activeItemList);
    } else {
      setActiveItemList([]);
    }
  }, [currentLayer?._id]);

  useEffect(() => {
    return () => {
      if (generationPollIntervalRef.current) clearTimeout(generationPollIntervalRef.current);
      if (outpaintPollIntervalRef.current) clearTimeout(outpaintPollIntervalRef.current);
    };
  }, []);

  const updateSessionLayerActiveItemList = (newActiveItemList) => {
    if (!currentLayer) return;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const payload = {
      sessionId: id,
      layerId: currentLayer._id.toString(),
      activeItemList: newActiveItemList,
    };
    axios
      .post(`${PROCESSOR_API_URL}/image_sessions/update_active_item_list`, payload, headers)
      .then((response) => {
        const { session, layer } = response.data || {};
        if (session) {
          setSessionDetails(session);
          setGenerationImages(session.generations || []);
        }
        if (layer) {
          setCurrentLayer(layer);
          if (layer?.imageSession?.activeItemList) {
            setActiveItemList(layer.imageSession.activeItemList);
          }
        }
      })
      .catch(() => {});
  };

  const toggleHideItemInLayer = useCallback(
    (itemId) => {
      if (!itemId) return;
      const updatedItemList = activeItemList.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          isHidden: !item.isHidden,
        };
      });

      const selectedItem = updatedItemList.find((item) => item.id === itemId);
      if (selectedId === itemId && selectedItem?.isHidden) {
        setSelectedId(null);
      }

      setActiveItemList(updatedItemList);
      updateSessionLayerActiveItemList(updatedItemList);
    },
    [activeItemList, selectedId, updateSessionLayerActiveItemList]
  );

  const setUploadURL = useCallback(
    (data, options = {}) => {
      const { closeDialog = true } = options;
      if (!data) return;
      const uploads = Array.isArray(data) ? data : [data];
      if (!uploads.length) return;

      const newItemList = [...activeItemList];
      let nextIndex = newItemList.length;
      let addedCount = 0;

      uploads.forEach((entry) => {
        if (!entry?.url) return;
        const newItemId = `item_${nextIndex}`;
        nextIndex += 1;
        newItemList.push({
          src: entry.url,
          id: newItemId,
          type: 'image',
          x: entry.x,
          y: entry.y,
          width: entry.width,
          height: entry.height,
          source: 'upload',
        });
        addedCount += 1;
      });

      if (newItemList.length === activeItemList.length) {
        return;
      }

      setActiveItemList(newItemList);
      updateSessionLayerActiveItemList(newItemList);
      if (closeDialog) {
        closeAlertDialog();
      }
      toast.success(
        <div>
          <FaCheck className="inline-flex mr-2" />{` ${addedCount} image${addedCount > 1 ? 's' : ''} uploaded.`}
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
    },
    [activeItemList, closeAlertDialog, updateSessionLayerActiveItemList]
  );

  const openUploadDialog = useCallback(() => {
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <ImageUploadDialog setUploadURL={setUploadURL} aspectRatio={aspectRatio} />
      </div>
    );
  }, [aspectRatio, closeAlertDialog, openAlertDialog, setUploadURL]);

  const isSupportedImageFile = useCallback((file) => {
    if (!file) return false;
    const fileName = file.name ? file.name.toLowerCase() : '';
    const isHeicFile = fileName.endsWith('.heic') || fileName.endsWith('.heif');
    const isWebpFile = fileName.endsWith('.webp');
    return Boolean(file.type && file.type.startsWith('image/')) || isHeicFile || isWebpFile;
  }, []);

  const resolveDroppedImagePlacement = useCallback(
    (dataUrl) =>
      new Promise((resolve, reject) => {
        if (!dataUrl) {
          reject(new Error('Missing data URL'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvasDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
          const stageWidth = canvasDimensions.width;
          const stageHeight = canvasDimensions.height;
          const scale = Math.min(stageWidth / img.width, stageHeight / img.height, 1);
          const imageWidth = Math.round(img.width * scale);
          const imageHeight = Math.round(img.height * scale);
          const x = (stageWidth - imageWidth) / 2;
          const y = (stageHeight - imageHeight) / 2;

          resolve({
            url: dataUrl,
            width: imageWidth,
            height: imageHeight,
            x,
            y,
          });
        };
        img.onerror = () => reject(new Error('Unable to read image'));
        img.src = dataUrl;
      }),
    [aspectRatio]
  );

  const processCanvasDropFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const validFiles = files.filter(isSupportedImageFile);
      if (!validFiles.length) {
        toast.error(
          <div>
            <FaTimes /> Please drop a supported image file.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
        return;
      }

      setIsCanvasDropProcessing(true);
      try {
        const dataUrls = await Promise.all(
          validFiles.map(
            (file) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result);
                reader.onerror = () => reject(new Error('Upload failed.'));
                reader.readAsDataURL(file);
              })
          )
        );

        const placements = await Promise.all(
          dataUrls.filter(Boolean).map((dataUrl) => resolveDroppedImagePlacement(dataUrl))
        );
        if (!placements.length) {
          throw new Error('No placements available');
        }

        setUploadURL(placements.length === 1 ? placements[0] : placements, {
          closeDialog: false,
        });
      } catch (error) {
        toast.error(
          <div>
            <FaTimes /> Upload failed. Please try another image.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      } finally {
        setIsCanvasDropProcessing(false);
      }
    },
    [isSupportedImageFile, resolveDroppedImagePlacement, setUploadURL]
  );

  const hasDraggedFiles = useCallback((dataTransfer) => {
    if (!dataTransfer?.types) return false;
    return Array.from(dataTransfer.types).includes('Files');
  }, []);

  const handleCanvasDragEnter = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!hasDraggedFiles(event.dataTransfer)) return;
      canvasDragDepthRef.current += 1;
      setIsCanvasDragActive(true);
    },
    [hasDraggedFiles]
  );

  const handleCanvasDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!hasDraggedFiles(event.dataTransfer)) return;
      event.dataTransfer.dropEffect = 'copy';
    },
    [hasDraggedFiles]
  );

  const handleCanvasDragLeave = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      canvasDragDepthRef.current = Math.max(canvasDragDepthRef.current - 1, 0);
      if (canvasDragDepthRef.current === 0) {
        setIsCanvasDragActive(false);
      }
    },
    []
  );

  const handleCanvasDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      canvasDragDepthRef.current = 0;
      setIsCanvasDragActive(false);
      const files = event.dataTransfer?.files;
      if (!files?.length) return;
      await processCanvasDropFiles(files);
    },
    [processCanvasDropFiles]
  );

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

    toast.success(
      <div>
        <FaCheck className="inline-flex mr-2" /> Image added from library.
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

  const fetchImageLibraryAssets = useCallback(
    async (page = 1) => {
      if (!id) return;
      const headers = getHeaders();
      if (!headers) {
        showLoginDialog();
        return;
      }

      setIsGlobalLibraryLoading(true);
      setGlobalLibraryError(null);
      try {
        const response = await axios.get(`${PROCESSOR_API_URL}/image_sessions/library_assets`, {
          ...headers,
          params: {
            sessionId: id,
            page,
            limit: IMAGE_LIBRARY_PAGE_SIZE,
          },
        });
        const responseData = response?.data || {};
        const currentAssets = Array.isArray(responseData.currentSessionAssets)
          ? responseData.currentSessionAssets
          : [];
        const globalAssets = Array.isArray(responseData.globalSessionAssets)
          ? responseData.globalSessionAssets
          : [];
        const pagination = responseData.pagination || {};

        setGenerationImages(currentAssets);
        setGlobalLibraryImages(globalAssets);
        setGlobalLibraryPagination({
          page: Number.isFinite(pagination.page) ? pagination.page : Number(page) || 1,
          pageSize: Number.isFinite(pagination.pageSize)
            ? pagination.pageSize
            : IMAGE_LIBRARY_PAGE_SIZE,
          totalItems: Number.isFinite(pagination.totalItems) ? pagination.totalItems : globalAssets.length,
          totalPages: Number.isFinite(pagination.totalPages) ? pagination.totalPages : 1,
          hasNextPage: Boolean(pagination.hasNextPage),
          hasPreviousPage: Boolean(pagination.hasPreviousPage),
        });
      } catch (error) {
        setGlobalLibraryError(error?.message || 'Unable to load global library assets.');
      } finally {
        setIsGlobalLibraryLoading(false);
      }
    },
    [id]
  );

  const openImageLibrary = useCallback(() => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_LIBRARY_DISPLAY);
    fetchImageLibraryAssets(1);
  }, [fetchImageLibraryAssets]);

  const submitGenerateRequest = async (payload) => {
    if (!currentLayer) return;
    setIsGenerationPending(true);
    setGenerationError(null);
    if (generationPollIntervalRef.current) {
      clearTimeout(generationPollIntervalRef.current);
      generationPollIntervalRef.current = null;
    }
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const requestPayload = {
      ...payload,
      videoSessionId: id,
      layerId: currentLayer._id.toString(),
      aspectRatio,
      model: 'NANOBANANAPRO',
    };

    axios
      .post(`${PROCESSOR_API_URL}/image_sessions/request_generate`, requestPayload, headers)
      .then(() => {
        startGenerationPoll();
        toast.success(
          <div>
            <FaCheck className="inline-flex mr-2" /> Generation request submitted.
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
            <FaTimes /> Generation request failed.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const submitGenerateNewRequest = async (payload) => {
    await submitGenerateRequest(payload);
  };

  const exportBaseGroup = async () => {
    const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = stageDimensions.width;
    canvas.height = stageDimensions.height;
    const ctx = canvas.getContext('2d');

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

    for (const item of activeItemList || []) {
      if (item.isHidden) continue;
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
        } catch (_) {}
      }
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const renderActiveItemCanvas = useCallback(async () => {
    const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = stageDimensions.width;
    canvas.height = stageDimensions.height;
    const ctx = canvas.getContext('2d');

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

    for (const item of activeItemList || []) {
      if (item.isHidden) continue;
      ctx.save();
      const { x = 0, y = 0, width = 0, height = 0, rotation } = item;
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
        } catch (_) {}
      } else if (item.type === 'text') {
        const fontSize = item.config?.fontSize || 40;
        ctx.fillStyle = item.config?.fillColor || '#000000';
        ctx.font = `${fontSize}px ${item.config?.fontFamily || 'Arial'}`;
        ctx.textAlign = item.config?.align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.text || '', 0, 0);
      } else if (item.type === 'shape') {
        const config = item.config || {};
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
          if (strokeWidth > 0) {
            ctx.strokeRect(shapeX, shapeY, shapeWidth, shapeHeight);
          }
        } else if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(shapeX + radius, shapeY + radius, radius, 0, 2 * Math.PI);
          ctx.fill();
          if (strokeWidth > 0) {
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    return canvas;
  }, [activeItemList, aspectRatio]);

  const triggerDownload = (canvas, suffix = '') => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    const dateStr = new Date().toISOString().replace(/:/g, '-');
    const label = suffix ? `_${suffix}` : '';
    link.download = `image_${dateStr}${label}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImageSimple = useCallback(async () => {
    const baseCanvas = await renderActiveItemCanvas();
    if (!baseCanvas) return;
    triggerDownload(baseCanvas);
  }, [renderActiveItemCanvas]);

  const downloadImageAdvanced = useCallback(
    async ({ mode, scale, width, height }) => {
      const baseCanvas = await renderActiveItemCanvas();
      if (!baseCanvas) return;
      let outputCanvas = baseCanvas;

      if (mode === 'scale') {
        const safeScale = Math.min(Math.max(scale || 1, 1), 4);
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = Math.round(baseCanvas.width * safeScale);
        outputCanvas.height = Math.round(baseCanvas.height * safeScale);
        const ctx = outputCanvas.getContext('2d');
        ctx.drawImage(baseCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
        triggerDownload(outputCanvas, `${safeScale}x`);
        return;
      }

      if (mode === 'custom') {
        const safeWidth = Math.max(1, Math.floor(width || 0));
        const safeHeight = Math.max(1, Math.floor(height || 0));
        const maxWidth = baseCanvas.width * 4;
        const maxHeight = baseCanvas.height * 4;

        if (safeWidth > maxWidth || safeHeight > maxHeight) {
          toast.error(
            <div>
              <FaTimes /> Max custom resolution is 4× the canvas size.
            </div>,
            {
              position: 'bottom-center',
              className: 'custom-toast',
            }
          );
          return;
        }

        outputCanvas = document.createElement('canvas');
        outputCanvas.width = safeWidth;
        outputCanvas.height = safeHeight;
        const ctx = outputCanvas.getContext('2d');
        const scaleFactor = Math.max(safeWidth / baseCanvas.width, safeHeight / baseCanvas.height);
        const scaledWidth = baseCanvas.width * scaleFactor;
        const scaledHeight = baseCanvas.height * scaleFactor;
        const offsetX = (safeWidth - scaledWidth) / 2;
        const offsetY = (safeHeight - scaledHeight) / 2;
        ctx.drawImage(baseCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
        triggerDownload(outputCanvas, `${safeWidth}x${safeHeight}`);
      }
    },
    [renderActiveItemCanvas]
  );

  const openAdvancedDownloadDialog = useCallback(() => {
    const { width, height } = getCanvasDimensionsForAspectRatio(aspectRatio);
    openAlertDialog(
      <ImageDownloadDialog
        baseWidth={width}
        baseHeight={height}
        aspectRatio={aspectRatio}
        aspectRatioOptions={imageAspectRatioOptions}
        onDownload={async (payload) => {
          await downloadImageAdvanced(payload);
          closeAlertDialog();
        }}
        onClose={closeAlertDialog}
      />
    );
  }, [aspectRatio, closeAlertDialog, downloadImageAdvanced, openAlertDialog]);

  const exportMaskedGroupAsBlackAndWhite = async () => {
    const baseStage = canvasRef.current?.getStage?.();
    if (!baseStage) return null;
    const baseLayer = baseStage.getLayers()[0];
    const maskGroup = baseLayer.findOne((node) => node.id() === 'maskGroup');

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = baseStage.width();
    offscreenCanvas.height = baseStage.height();
    const ctx = offscreenCanvas.getContext('2d');

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
        maskData[i] = 255;
        maskData[i + 1] = 255;
        maskData[i + 2] = 255;
        maskData[i + 3] = 255;
      } else {
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
  };

  const submitOutpaintRequest = async (evt) => {
    evt.preventDefault();
    if (!currentLayer) return;
    setIsOutpaintPending(true);
    if (outpaintPollIntervalRef.current) {
      clearTimeout(outpaintPollIntervalRef.current);
      outpaintPollIntervalRef.current = null;
    }

    const baseImageData = await exportBaseGroup();
    let maskImageData;

    if (selectedEditModelValue && selectedEditModelValue.editType === 'inpaint') {
      maskImageData = await exportMaskedGroupAsBlackAndWhite();
    }

    const formData = new FormData(evt.target);
    const promptValue = formData.get('promptText');
    const guidanceScale = formData.get('guidanceScale');
    const numInferenceSteps = formData.get('numInferenceSteps');
    const strength = formData.get('strength');

    const payload = {
      image: baseImageData,
      sessionId: id,
      layerId: currentLayer._id.toString(),
      prompt: promptValue,
      model: 'NANOBANANAPROEDIT',
      guidanceScale,
      numInferenceSteps,
      strength,
      aspectRatio,
    };
    const inputImageUrls = activeItemList
      .filter((item) => item?.type === 'image' && item?.src && !item?.isHidden)
      .map((item) => (typeof item.src === 'string' ? item.src.trim() : ''))
      .filter(Boolean);
    const uniqueInputImageUrls = [...new Set(inputImageUrls)];
    if (uniqueInputImageUrls.length > 1) {
      payload.image_urls = [...uniqueInputImageUrls].reverse();
    }
    if (maskImageData) {
      payload.maskImage = maskImageData;
    }

    setOutpaintError(null);
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .post(`${PROCESSOR_API_URL}/image_sessions/request_edit_image`, payload, headers)
      .then(() => {
        startOutpaintPoll();
        toast.success(
          <div>
            <FaCheck className="inline-flex mr-2" /> Edit request submitted.
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
            <FaTimes /> Edit request failed.
          </div>,
          {
            position: 'bottom-center',
            className: 'custom-toast',
          }
        );
      });
  };

  const startGenerationPoll = async () => {
    if (!currentLayer) return;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const selectedLayerId = currentLayer._id.toString();
    const pollStatusData = await axios.get(
      `${PROCESSOR_API_URL}/image_sessions/generate_status?id=${id}&layerId=${selectedLayerId}`,
      headers
    );
    const pollStatus = pollStatusData.data;

    if (pollStatus.status === 'COMPLETED') {
      const layerData = pollStatus.layer;
      const generationImages = pollStatus.generationImages;
      const generatedImageUrlName = layerData.imageSession.activeGeneratedImage;
      const timestamp = Date.now();
      const generatedURL = `/generations/${generatedImageUrlName}?${timestamp}`;

      const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const itemId = `item_${activeItemList.length}`;
      const newItemList = [
        ...activeItemList,
        {
          src: generatedURL,
          id: itemId,
          type: 'image',
          x: 0,
          y: 0,
          width: stageDimensions.width,
          height: stageDimensions.height,
        },
      ];

      setActiveItemList(newItemList);
      setCurrentLayer(layerData);
      setIsGenerationPending(false);
      setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
      if (generationImages && generationImages.length > 0) {
        setGenerationImages(generationImages);
      }
      updateSessionLayerActiveItemList(newItemList);
      getUserAPI();
      return;
    }

    if (pollStatus.status === 'FAILED') {
      setIsGenerationPending(false);
      setGenerationError(pollStatus.generationError || 'Generation failed.');
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
    }

    generationPollIntervalRef.current = setTimeout(() => {
      startGenerationPoll();
    }, 1000);
  };

  const startOutpaintPoll = async () => {
    if (!currentLayer) return;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const selectedLayerId = currentLayer._id.toString();
    const pollStatusData = await axios.get(
      `${PROCESSOR_API_URL}/image_sessions/edit_status?id=${id}&layerId=${selectedLayerId}`,
      headers
    );
    const pollStatusDataResponse = pollStatusData.data;

    if (pollStatusDataResponse.status === 'COMPLETED') {
      const updatedLayer = pollStatusDataResponse.layer;
      const imageSession = updatedLayer.imageSession;
      const generatedImageUrlName = imageSession.activeEditedImage;
      const generatedURL = `${generatedImageUrlName}`;
      const stageDimensions = getCanvasDimensionsForAspectRatio(aspectRatio);
      const itemId = `item_${activeItemList.length}`;
      const newItemList = [
        ...activeItemList,
        {
          src: generatedURL,
          id: itemId,
          type: 'image',
          x: 0,
          y: 0,
          width: stageDimensions.width,
          height: stageDimensions.height,
        },
      ];

      const generationImages = pollStatusDataResponse.generationImages;
      if (generationImages && generationImages.length > 0) {
        setGenerationImages(generationImages);
      }

      setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
      setActiveItemList(newItemList);
      setCurrentLayer(updatedLayer);
      setIsOutpaintPending(false);
      updateSessionLayerActiveItemList(newItemList);
      toast.success(
        <div>
          <FaCheck className="inline-flex mr-2" /> Edit complete.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    }

    if (pollStatusDataResponse.status === 'FAILED') {
      setIsOutpaintPending(false);
      setOutpaintError('Edit failed.');
      toast.error(
        <div>
          <FaTimes /> Edit failed.
        </div>,
        {
          position: 'bottom-center',
          className: 'custom-toast',
        }
      );
      getUserAPI();
      return;
    }

    outpaintPollIntervalRef.current = setTimeout(() => {
      startOutpaintPoll();
    }, 1000);
  };

  const handleAspectRatioChange = (nextRatio) => {
    setAspectRatio(nextRatio);
    localStorage.setItem('defaultImageAspectRatio', nextRatio);
    if (!id) return;
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    axios
      .post(
        `${PROCESSOR_API_URL}/image_sessions/update_aspect_ratio`,
        { sessionId: id, aspectRatio: nextRatio },
        headers
      )
      .then((response) => {
        const session = response.data?.session || response.data;
        if (session) {
          setSessionDetails(session);
          if (session?.layers?.[0]) {
            setCurrentLayer(session.layers[0]);
          }
        }
      })
      .catch(() => {});
  };

  const updateCanvasDisplayScale = useCallback(() => {
    const viewportNode = canvasViewportRef.current;
    const surfaceNode = canvasSurfaceRef.current;
    if (!viewportNode || !surfaceNode) return;

    const viewportWidth = viewportNode.clientWidth;
    const viewportHeight = viewportNode.clientHeight;
    const surfaceWidth = surfaceNode.offsetWidth;
    const surfaceHeight = surfaceNode.offsetHeight;

    if (!viewportWidth || !viewportHeight || !surfaceWidth || !surfaceHeight) return;

    const horizontalPadding = 24;
    const verticalPadding = 24;
    const availableWidth = Math.max(viewportWidth - horizontalPadding, 1);
    const availableHeight = Math.max(viewportHeight - verticalPadding, 1);
    const nextScale = Math.min(1, availableWidth / surfaceWidth, availableHeight / surfaceHeight);
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;

    setCanvasDisplayScale((prevScale) =>
      Math.abs(prevScale - safeScale) < 0.001 ? prevScale : safeScale
    );

    const nextWidth = Math.max(1, Math.floor(surfaceWidth * safeScale));
    const nextHeight = Math.max(1, Math.floor(surfaceHeight * safeScale));
    setCanvasDisplaySize((prevSize) =>
      prevSize.width === nextWidth && prevSize.height === nextHeight
        ? prevSize
        : { width: nextWidth, height: nextHeight }
    );
  }, []);

  const isCanvasStudioDisplay =
    Boolean(currentLayer && sessionDetails) &&
    currentLayer?.imageSession?.generationStatus !== 'PENDING' &&
    currentCanvasAction !== TOOLBAR_ACTION_VIEW.SHOW_LIBRARY_DISPLAY;

  useEffect(() => {
    if (!isCanvasStudioDisplay) {
      setCanvasDisplayScale(1);
      setCanvasDisplaySize({ width: null, height: null });
      setIsCanvasDragActive(false);
      setIsCanvasDropProcessing(false);
      canvasDragDepthRef.current = 0;
      return;
    }

    const recalc = () => updateCanvasDisplayScale();
    const frameId = window.requestAnimationFrame(recalc);

    window.addEventListener('resize', recalc);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(recalc);
      if (canvasViewportRef.current) {
        resizeObserver.observe(canvasViewportRef.current);
      }
      if (canvasSurfaceRef.current) {
        resizeObserver.observe(canvasSurfaceRef.current);
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', recalc);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isCanvasStudioDisplay, aspectRatio, updateCanvasDisplayScale]);

  let viewDisplay = <span />;
  if (!currentLayer || !sessionDetails) {
    viewDisplay = (
      <div className="w-full h-[80vh] flex items-center justify-center text-sm">
        Loading image session...
      </div>
    );
  } else if (currentLayer.imageSession?.generationStatus === 'PENDING') {
    viewDisplay = <LoadingImage />;
  } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_LIBRARY_DISPLAY) {
    viewDisplay = (
      <div className="w-full h-full flex flex-col">
        <ImageLibraryHome
          generationImages={generationImages}
          globalGenerationImages={globalLibraryImages}
          globalPagination={globalLibraryPagination}
          onGlobalPageChange={fetchImageLibraryAssets}
          isGlobalLoading={isGlobalLibraryLoading}
          globalError={globalLibraryError}
          selectImageFromLibrary={selectImageFromLibrary}
          showStudioBackButton
          onBackToStudio={resetImageLibrary}
        />
      </div>
    );
  } else {
    const canvasInternalLoading = isGenerationPending || isOutpaintPending;
    const canvasSurface =
      colorMode === 'dark'
        ? 'bg-[#0f1629] border border-[#1f2a3d] shadow-[0_20px_50px_rgba(0,0,0,0.55)]'
        : 'bg-[#f1f5f9] border border-slate-300 shadow-[0_18px_40px_rgba(15,23,42,0.18)]';
    const canvasDropSurfaceHighlight = isCanvasDragActive
      ? colorMode === 'dark'
        ? 'ring-2 ring-[#46bfff] bg-[#13203a]'
        : 'ring-2 ring-rose-400 bg-rose-50'
      : '';
    const canvasDropHintText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const shouldScaleCanvas = canvasDisplayScale < 0.999;
    const scaledCanvasWrapperStyle =
      shouldScaleCanvas && canvasDisplaySize.width && canvasDisplaySize.height
        ? {
            width: `${canvasDisplaySize.width}px`,
            height: `${canvasDisplaySize.height}px`,
          }
        : undefined;
    const scaledCanvasSurfaceStyle = shouldScaleCanvas
      ? {
          transform: `scale(${canvasDisplayScale})`,
          transformOrigin: 'top left',
          willChange: 'transform',
        }
      : undefined;

    viewDisplay = (
      <div className="mt-4 inline-block relative" style={scaledCanvasWrapperStyle}>
        <div className={`mb-2 text-xs ${canvasDropHintText}`}>Drag an drop an image to upload</div>
        <div
          ref={canvasSurfaceRef}
          className={`relative ${canvasSurface} ${canvasDropSurfaceHighlight} rounded-xl p-4 pb-8 inline-block cursor-pointer transition-colors duration-150`}
          style={scaledCanvasSurfaceStyle}
          onDragEnter={handleCanvasDragEnter}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {(canvasInternalLoading || isCanvasDropProcessing) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <LoadingImageBase />
            </div>
          )}
          {isCanvasDragActive && !isCanvasDropProcessing && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-rose-400/70 bg-rose-400/10 text-sm font-medium text-rose-500">
              Drop image to upload
            </div>
          )}
          <VideoCanvasContainer
            ref={canvasRef}
            sessionDetails={sessionDetails}
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
            applyFilter={() => {}}
            applyFinalFilter={() => {}}
            onChange={() => {}}
            pencilColor={pencilColor}
            pencilWidth={pencilWidth}
            eraserWidth={eraserWidth}
            sessionId={id}
            selectedLayerId={currentLayer?._id?.toString?.() || ''}
            exportAnimationFrames={() => {}}
            currentLayerSeek={0}
            currentLayer={currentLayer}
            updateSessionActiveItemList={updateSessionLayerActiveItemList}
            selectedLayerSelectShape={selectedLayerSelectShape}
            setCurrentView={setCurrentView}
            isLayerSeeking={false}
            setEnableSegmentationMask={() => {}}
            enableSegmentationMask={false}
            segmentationData={[]}
            setSegmentationData={() => {}}
            isExpressGeneration={false}
            removeVideoLayer={() => {}}
            aspectRatio={aspectRatio}
            isAIVideoGenerationPending={false}
            toggleStageZoom={() => {}}
            stageZoomScale={1}
            requestRegenerateSubtitles={() => {}}
            displayZoomType="normal"
            aiVideoLayer={null}
            aiVideoLayerType={null}
            requestRegenerateAnimations={() => {}}
            requestRealignLayers={() => {}}
            totalDuration={0}
            selectedEditModelValue={selectedEditModelValue}
            createTextLayer={() => {}}
            requestRealignToAiVideoAndLayers={() => {}}
            requestLipSyncToSpeech={() => {}}
            setPromptText={setPromptText}
            promptText={promptText}
            submitGenerateRequest={submitGenerateRequest}
            isGenerationPending={isGenerationPending}
            selectedGenerationModel={selectedGenerationModel}
            setSelectedGenerationModel={setSelectedGenerationModel}
            generationError={generationError}
            submitGenerateNewRequest={submitGenerateNewRequest}
            isUpdateLayerPending={false}
            setSelectedVideoGenerationModel={() => {}}
            selectedVideoGenerationModel={null}
            submitGenerateNewVideoRequest={() => {}}
            videoPromptText=""
            setVideoPromptText={() => {}}
            openUploadDialog={openUploadDialog}
            rightPanelView={currentView}
            downloadCurrentFrame={() => {}}
          />
        </div>
      </div>
    );
  }

  const mainWorkspaceShell =
    colorMode === 'dark'
      ? 'bg-[#0b1021] text-slate-100'
      : 'bg-gradient-to-br from-[#e9edf7] via-[#eef3fb] to-white text-slate-900';
  const toolbarShell =
    colorMode === 'dark'
      ? 'bg-[#0f1629] border-l border-[#1f2a3d] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
      : 'bg-white border-l border-slate-200 shadow-sm';
  const canvasViewportOverflow = 'overflow-auto';

  return (
    <CommonContainer>
      <div className={`${mainWorkspaceShell} block min-h-screen`}>
        <div
          ref={canvasViewportRef}
          className={`text-center w-[82%] inline-block h-[100vh] m-auto mb-8 align-top ${canvasViewportOverflow}`}
        >
          {viewDisplay}
        </div>
        <div className={`w-[18%] inline-block align-top pt-[60px] ${toolbarShell}`}>
          <ImageEditorToolbar
            currentViewDisplay={currentView}
            setCurrentViewDisplay={setCurrentView}
            promptText={promptText}
            setPromptText={setPromptText}
            submitGenerateNewRequest={submitGenerateNewRequest}
            isGenerationPending={isGenerationPending}
            selectedGenerationModel={selectedGenerationModel}
            setSelectedGenerationModel={setSelectedGenerationModel}
            generationError={generationError}
            submitOutpaintRequest={submitOutpaintRequest}
            selectedEditModel={selectedEditModel}
            setSelectedEditModel={setSelectedEditModel}
            selectedEditModelValue={selectedEditModelValue}
            isOutpaintPending={isOutpaintPending}
            outpaintError={outpaintError}
            editBrushWidth={editBrushWidth}
            setEditBrushWidth={setEditBrushWidth}
            showUploadAction={openUploadDialog}
            onShowLibrary={openImageLibrary}
            aspectRatio={aspectRatio}
            aspectRatioOptions={imageAspectRatioOptions}
            onAspectRatioChange={handleAspectRatioChange}
            onDownloadSimple={downloadImageSimple}
            onDownloadAdvanced={openAdvancedDownloadDialog}
            activeItemList={activeItemList}
            setActiveItemList={setActiveItemList}
            updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            hideItemInLayer={toggleHideItemInLayer}
          />
          <ToastContainer
            position="bottom-center"
            autoClose={5000}
            hideProgressBar
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
      </div>
    </CommonContainer>
  );
}
