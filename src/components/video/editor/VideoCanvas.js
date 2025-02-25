import React, { forwardRef, useEffect, useState, useRef, useContext, useCallback } from "react";
import { Stage, Layer, Group, Line, Image as KonvaImage, Rect } from 'react-konva';

import { useColorMode } from '../../../contexts/ColorMode.js';
import { CURRENT_TOOLBAR_VIEW, TOOLBAR_ACTION_VIEW } from '../../../constants/Types.ts';

import { getStageDimensions } from '../../../constants/Image.js';
import DraggableToolbarRectangle from "../toolbars/toolbar_shapes/DraggableToolbarRectangle.js";
import DraggableToolbarCircle from "../toolbars/toolbar_shapes/DraggableToolbarCircle.js";
import { generateCursor } from "../util/GenerateSVG.js";
import axios from 'axios';
import debounce from 'lodash/debounce';
import { isTypeSelectable } from '../util/ImageUtils.js';
import VideoUnderlay from '../util/VideoUnderlay.js';
import CanvasToolbar from "./CanvasToolbar.js";
import { ActiveRenderItem } from './CanvasUtils.js';
import VideoCanvasOverlay from './overlay/VideoCanvasOverlay.js';
import CanvasLoaderTransparent from '../util/loader/CanvasLoaderTransparent.js';

import { getCanvasDimensionsForAspectRatio } from '../../../utils/canvas.js';
import VideoCanvasGridOverlay from './overlay/VideoCanvasGridOverlay.js'; // Make sure the path is correct

import { NavCanvasControlContext } from '../../../contexts/NavCanvasControlContext.js';
import './videoCanvas.css';


const FPS = 30;



const SELECTABLE_TYPES = ['SHOW_DEFAULT_DISPLAY',
  'SHOW_CURSOR_SELECT_DISPLAY',
  'SHOW_ANIMATE_DISPLAY',
  'SHOW_UPLOAD_DISPLAY',
  'SHOW_LAYERS_DISPLAY',
  'SHOW_SELECT_DISPLAY'];
const PROCESSOR_API_URL = process.env.REACT_APP_PROCESSOR_API;
const IMAGE_SERVER_API_URL = process.env.REACT_APP_IMAGE_SERVER_API;

const VideoCanvas = forwardRef((props: any, ref: any) => {
  const {
    activeItemList, setActiveItemList, currentView, editBrushWidth, editMasklines, currentCanvasAction,
    setCurrentCanvasAction, setSelectedId, selectedId, buttonPositions, setButtonPositions, selectedLayerType,
    setSelectedLayerType, applyFilter, onChange, sessionId, selectedFrameId, currentLayer,
    updateSessionActiveItemList, selectedLayerSelectShape, isLayerSeeking, applyFinalFilter, flipImageVertical,
    flipImageHorizontal, onCopyShapeLayer, onReplaceShapeLayer, handleResetShapeLayer, removeItem,
    updateTargetActiveLayerConfig, updateTargetShapeActiveLayerConfig, addPaintImage, resetPaintImage,
    shapeSelectTransformerCircleRef, shapeSelectTransformerRectangleRef, replaceEraserImage, duplicateEraserImage,
    handleLayerMouseDown, handleLayerMouseMove, handleLayerMouseUp, resetEraserImage, showMask, eraserToolbarVisible,
    eraserToolbarPosition, eraserWidthRef, toolbarShapeProps, setToolbarShapeProps, paintToolbarPosition,
    paintToolbarVisible, isDrawing, shapeSet, showPencil, pencilLines, overlayImage, shapeSelectToolbarVisible,
    shapeSelectToolbarPosition, enableSegmentationMask, segmentationData, setSegmentationData,
    isExpressGeneration, currentLayerSeek, removeVideoLayer, aspectRatio, isAIVideoGenerationPending,
    toggleStageZoom, stageZoomScale, displayZoomType, requestRegenerateSubtitles, aiVideoLayer,
    requestRegenerateAnimations, removeSelectedItem, requestRealignLayers, totalDuration,
    updateTargetTextActiveLayerConfig, createTextLayer, updateTargetImageActiveLayerConfig,
    downloadCurrentFrame, requestRealignToAiVideoAndLayers,
    promptText, setPromptText, selectedGenerationModel, setSelectedGenerationModel,
    requestLipSyncToSpeech, aiVideoLayerType,
    generationError, currentDefaultPrompt, submitGenerateNewRequest,
    isGenerationPending, isUpdateLayerPending,
    submitGenerateNewVideoRequest, aiVideoGenerationPending,
    selectedVideoGenerationModel, setSelectedVideoGenerationModel,
    videoPromptText, setVideoPromptText, promptTextVideo, setPromptTextVideo,
  

  } = props;

  const [stageDimensions, setStageDimensions] = useState(null);





  const durationOffset = currentLayer.durationOffset;

  const [maskImage, setMaskImage] = useState(null);
  const [maskData, setMaskData] = useState(null);
  const [shadedArea, setShadedArea] = useState(null);
  const [boundingBoxes, setBoundingBoxes] = useState([]);
  const [selectedBbox, setSelectedBbox] = useState(null);

  const [maskBaseImageId, setMaskBaseImageId] = useState(null);

  const [isOperationLoading, setIsOperationLoading] = useState(false);

  const [showAddRemoveMaskedItemButton, setShowAddRemoveMaskedItemButton] = useState(false);


  const [showOverlayPromptGenerator, setShowOverlayPromptGenerator] = useState(true);


  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1024, height: 1024 });



  const {
    setIsExpressGeneration,
    setSessionId,
    setDisplayZoomType,
    setStageZoomScale,
    setDownloadCurrentFrame,
    setToggleStageZoom,
    setRequestRegenerateSubtitles,
    setRequestRegenerateAnimations,
    setRequestRealignLayers,
    setCanvasActualDimensions,
    setTotalEffectiveDuration,
    setRequestRealignToAiVideoAndLayers,
    expressGenerativeVideoRequired,

    showGridOverlay,

  } = useContext(NavCanvasControlContext);


  console.log("SHOW GRI OVERLAY", showGridOverlay);


  useEffect(() => {
    const newDimensions = getStageDimensions(aspectRatio);
    setStageDimensions(newDimensions);
  }, [aspectRatio]);

  useEffect(() => {
    setTotalEffectiveDuration(totalDuration);
  }, [totalDuration]);

  useEffect(() => {
    if (aspectRatio) {
      let canvasDimensions;
      if (aspectRatio === '1:1') {
        canvasDimensions = {
          width: 1024,
          height: 1024
        }
      } else if (aspectRatio === '16:9') {
        canvasDimensions = {
          width: 1792,
          height: 1024
        }
      } else if (aspectRatio === '9:16') {
        canvasDimensions = {
          width: 1024,
          height: 1792
        }
      }
      setCanvasActualDimensions(canvasDimensions);
    }

  }, [aspectRatio]);


  useEffect(() => {
    setRequestRealignToAiVideoAndLayers(() => requestRealignToAiVideoAndLayers);
  }, [requestRealignToAiVideoAndLayers]);

  useEffect(() => {
    setIsExpressGeneration(isExpressGeneration);
  }, [isExpressGeneration]);

  useEffect(() => {
    setRequestRealignLayers(() => requestRealignLayers);
  }, [requestRealignLayers]);


  useEffect(() => {
    setSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    setDisplayZoomType(displayZoomType);
  }, [displayZoomType]);


  useEffect(() => {
    setDownloadCurrentFrame(() => downloadCurrentFrame);
  }, [downloadCurrentFrame]);

  useEffect(() => {
    setToggleStageZoom(() => toggleStageZoom);
  }, [toggleStageZoom]);

  useEffect(() => {
    setRequestRegenerateSubtitles(() => requestRegenerateSubtitles);
  }, [requestRegenerateSubtitles]);

  useEffect(() => {
    setRequestRegenerateAnimations(() => requestRegenerateAnimations);
  }, [requestRegenerateAnimations]);




  useEffect(() => {
    if (aspectRatio === '16:9') {
      setCanvasDimensions({ width: 1792 * stageZoomScale, height: 1024 * stageZoomScale });
    } else if (aspectRatio === '9:16') {
      setCanvasDimensions({ width: 1024 * stageZoomScale, height: 1792 * stageZoomScale });
    } else {
      setCanvasDimensions({ width: 1024, height: 1024 });
    }
  }, [aspectRatio, displayZoomType, stageZoomScale]);
  useEffect(() => {
    if (currentCanvasAction === 'SHOW_SMART_SELECT_DISPLAY' && enableSegmentationMask && selectedBbox) {
      setShowAddRemoveMaskedItemButton(true);
    } else {
      setShowAddRemoveMaskedItemButton(false);
    }
  }, [currentCanvasAction, selectedBbox]);

  useEffect(() => {
    if (currentCanvasAction === 'SHOW_SMART_SELECT_DISPLAY' && enableSegmentationMask) {
      loadSegmentationMask();
    }
  }, [currentCanvasAction, segmentationData]);

  const loadSegmentationMask = async () => {
    const maskData = segmentationData;

    if (!maskData || maskData.length === 0) {
      return;
    }
    setMaskData(maskData);

    const boxes = maskData.map((mask) => mask.bbox);
    setBoundingBoxes(boxes); // Update the state with bounding box data

    // set setMaskBaseImageId to top image
    const topItem = activeItemList
      .filter(item => item.id.startsWith('item_'))
      .sort((a, b) => {
        const idA = parseInt(a.id.replace('item_', ''), 10);
        const idB = parseInt(b.id.replace('item_', ''), 10);
        return idB - idA;
      })[0];

    setMaskBaseImageId(topItem.id);

  };



  useEffect(() => {
    const stage = ref.current.getStage();
    const container = stage.container();
    if (currentCanvasAction === 'MOVE') {
      container.style.cursor = 'grab';
    } else if (currentCanvasAction === 'RESIZE') {
      container.style.cursor = 'nwse-resize';
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      container.style.cursor = generateCursor(eraserWidthRef.current);
    } else {
      container.style.cursor = 'default';
    }
  }, [currentCanvasAction]);

  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? `bg-gray-900` : `bg-neutral-300`;
  const textColor = colorMode === 'dark' ? `text-white` : `text-black`;

  const selectLayer = (item) => {


    if (item.config) setSelectedId(item.id);
    if (item.type === 'image') {
      setSelectedLayerType('image');
    } else if (item.type === 'text') {
      setSelectedLayerType('text');
    } else if (item.type === 'shape') {
      setSelectedLayerType('shape');
    }
  };

  if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
    const stage = ref.current.getStage();
    const container = stage.container();
    container.style.cursor = generateCursor(eraserWidthRef.current);
  }

  if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_EDIT_MASK_DISPLAY) {
    const stage = ref.current.getStage();
    const container = stage.container();
    container.style.cursor = generateCursor(editBrushWidth);
  }

  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= activeItemList.length) return; // Out of bounds, do nothing

    const newList = [...activeItemList];

    // Swap the items
    const temp = newList[newIndex];
    newList[newIndex] = newList[index];
    newList[index] = temp;

    // Swap their IDs
    const tempId = newList[newIndex].id;
    newList[newIndex].id = newList[index].id;
    newList[index].id = tempId;

    setActiveItemList(newList);
    updateSessionActiveItemList(newList); // Make sure to update the session active item list
  };

  const setSelectedLayer = (item) => {
    setSelectedId(item.id);
    if (item.type === 'image') {
      setSelectedLayerType('image');
    } else if (item.type === 'text') {
      setSelectedLayerType('text');
    } else if (item.type === 'shape') {
      setSelectedLayerType('shape');
    }
  };

  const updateToolbarButtonPosition = (id, x, y) => {

    setButtonPositions((prevPositions) =>
      prevPositions.map((pos) =>
        pos.id === id ? { ...pos, x: x + 30, y: y + 30 } : pos
      )
    );
  };

  const isDraggable = isTypeSelectable(currentView, currentCanvasAction);

  const previousViewRef = useRef();

  useEffect(() => {
    if (previousViewRef.current === CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY && currentView !== CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY) {
      setCurrentCanvasAction(null);
    }
    previousViewRef.current = currentView;
  }, [currentView]);

  let imageStackList = <span />;

  if (activeItemList && activeItemList.length > 0) {

    imageStackList = activeItemList.map((item, index) => {
      if (item.isHidden) {
        return null;
      }

      let itemId = item._id ? item._id : item.id;
      return <ActiveRenderItem
        currentLayerSeek={currentLayerSeek}
        item={item}
        index={index}
        selectedId={selectedId}
        setSelectedLayer={setSelectedLayer}
        setSelectedId={setSelectedId}
        selectedFrameId={selectedFrameId}
        showMask={showMask}
        updateToolbarButtonPosition={updateToolbarButtonPosition}
        isDraggable={isDraggable}
        updateTargetActiveLayerConfig={updateTargetActiveLayerConfig}
        isLayerSeeking={isLayerSeeking}
        selectLayer={selectLayer}
        updateTargetShapeActiveLayerConfig={updateTargetShapeActiveLayerConfig}
        updateTargetTextActiveLayerConfig={updateTargetTextActiveLayerConfig}
        onChange={onChange}
        sessionId={sessionId}
        durationOffset={currentLayer.durationOffset}
        stageZoomScale={stageZoomScale}
        aspectRatio={aspectRatio}
        key={`item_${sessionId}_${selectedFrameId}_${itemId}`}
        createTextLayer={createTextLayer}
      />
    }).filter(Boolean);
  }

  let currentShapeSelectDisplay = null;

  if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY) {
    if (selectedLayerSelectShape === 'circle') {
      currentShapeSelectDisplay = (
        <DraggableToolbarCircle
          shapeProps={toolbarShapeProps}
          setShapeProps={setToolbarShapeProps}
          id="shapeSelectToolbar"
          isDrawing={isDrawing}
          shapeSet={shapeSet}
          transformerRef={shapeSelectTransformerCircleRef}
        />)
    } else if (selectedLayerSelectShape === 'rectangle') {
      currentShapeSelectDisplay = (
        <DraggableToolbarRectangle
          shapeProps={toolbarShapeProps}
          setShapeProps={setToolbarShapeProps}
          id="shapeSelectToolbar"
          isDrawing={isDrawing}
          shapeSet={shapeSet}
          transformerRef={shapeSelectTransformerRectangleRef}
        />
      );
    }
  }

  const addNewItem = (newItem) => {

    const newActiveItemList = [...activeItemList, newItem];
    setActiveItemList(newActiveItemList);
    updateSessionActiveItemList(newActiveItemList);
    //  setSelectedId(newItem.id); // Ensure the new item is selected
    //  setSelectedLayerType(newItem.type); // Ensure the new item is set to the correct layer type
  };

  const handleMouseOver = (e) => {
    if (ref && ref.current) {
      const stage = ref.current.getStage();
      const pointerPosition = stage.getPointerPosition();
      if (!currentLayer || !maskData) return;
      setShadedArea(null);
    }
  };

  const handleBoundingBoxClick = async (e, bbox, segmentation) => {
    e.cancelBubble = true; // Prevent the click from propagating to other elements
    try {
      // Fetch segmentation data from the API
      const payload = {
        counts: segmentation.counts,
        size: segmentation.size,
        bbox: bbox,
      }
      const response = await axios.post(`${PROCESSOR_API_URL}/video_sessions/segmentation_image`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.mask_image) {
        const base64Image = `data:image/png;base64,${response.data.mask_image}`;
        const [x, y, width, height] = bbox;

        const imageObj = new Image();
        imageObj.onload = () => {
          const maskPreviewImage = {
            src: imageObj,
            x: x,
            y: y,
            width: width,
            height: height,
          };
          setMaskImage(maskPreviewImage);
          setSelectedBbox({ bbox, segmentation });
        };
        imageObj.src = base64Image;
      }
    } catch (error) {
      console.error('Error fetching segmentation data:', error);
    }
  };

  const getImageDataFromCanvas = (imageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0);
    return ctx.getImageData(0, 0, imageElement.width, imageElement.height);
  };

  const handleCanvasClick = (e) => {
    const stage = ref.current.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Find bounding boxes that contain the click point and save their indices
    const containingBoxes = boundingBoxes.map((bbox, index) => {
      const [x, y, width, height] = bbox;
      if (
        pointerPosition.x >= x &&
        pointerPosition.x <= x + width &&
        pointerPosition.y >= y &&
        pointerPosition.y <= y + height
      ) {
        return { bbox, index };
      }
      return null;
    }).filter(item => item !== null);

    if (containingBoxes.length > 0) {
      // Existing logic for handling bounding box click
      const smallestBox = containingBoxes.reduce((smallest, item) => {
        const [x, y, width, height] = item.bbox;
        const area = width * height;
        if (!smallest || area < smallest.area) {
          return { ...item, area };
        }
        return smallest;
      }, null);

      const { bbox, index } = smallestBox;
      const { segmentation } = maskData[index];
      handleBoundingBoxClick(e, bbox, segmentation);
    } else {
      // No bounding boxes were clicked. Check if the click target is the stage itself.
      // If yes, this means no item was clicked. We then unselect all items.
      if (e.target === stage) {
        setSelectedId(null);
        setSelectedLayerType(null);
      }
    }
  };


  const handleAddButtonClick = () => {
    const stage = ref.current.getStage();
    const imageNode = stage.findOne(`#${maskBaseImageId}`);
    if (!imageNode || !imageNode.image()) {
      console.error('No valid image node found.');
      return;
    }

    const imageElement = imageNode.image();
    const imageData = getImageDataFromCanvas(imageElement);

    const maskImageElement = maskImage ? maskImage.src : null;
    if (maskImageElement) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskImage.width;
      maskCanvas.height = maskImage.height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.drawImage(maskImageElement, 0, 0);

      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      createMaskImage(imageData, maskData, selectedBbox.bbox, (newItem) => {
        // setSelectedId(newItem.id);
        // setSelectedLayer(newItem);
        /// setSelectedBbox(null); // Hide the toolbar
      });
    }
  };

  const handleRemoveButtonClick = () => {
    const stage = ref.current.getStage();
    const imageNode = stage.findOne(`#${maskBaseImageId}`);
    if (!imageNode || !imageNode.image()) {
      console.error('No valid image node found.');
      return;
    }

    const imageElement = imageNode.image();
    const imageData = getImageDataFromCanvas(imageElement);

    const maskImageElement = maskImage ? maskImage.src : null;
    if (maskImageElement) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskImage.width;
      maskCanvas.height = maskImage.height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.drawImage(maskImageElement, 0, 0);

      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      const topItem = activeItemList.find(item => item.id === maskBaseImageId);

      removeMaskImage(imageData, maskData, selectedBbox.bbox, topItem, (newItem) => {
        setSelectedId(newItem.id);
        setSelectedLayerType(newItem.type);
        setSelectedBbox(null); // Hide the toolbar
      });
    }
  };

  const removeMaskImage = (imageData, maskData, bbox, topItem, callback) => {
    const [x, y, width, height] = bbox;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = imageData.width;
    offscreenCanvas.height = imageData.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.putImageData(imageData, 0, 0);

    const extractedData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const sourceX = x + i;
        const sourceY = y + j;
        const maskIndex = (j * width + i) * 4; // maskData is in RGBA format
        const extractIndex = (sourceY * extractedData.width + sourceX) * 4;

        if (maskData.data[maskIndex + 3] !== 0) { // Check alpha channel of the maskData
          extractedData.data[extractIndex] = 0; // R
          extractedData.data[extractIndex + 1] = 0; // G
          extractedData.data[extractIndex + 2] = 0; // B
          extractedData.data[extractIndex + 3] = 0; // A
        }
      }
    }

    offscreenCtx.putImageData(extractedData, 0, 0);
    const dataURL = offscreenCanvas.toDataURL();

    const imageObj = new Image();
    imageObj.onload = () => {
      const newItem = {
        id: maskBaseImageId, // Keep the same ID
        type: 'image',
        src: imageObj.src,
        x: topItem.x,
        y: topItem.y,
        width: topItem.width,
        height: topItem.height,
      };

      const newActiveItemList = activeItemList.map(item => item.id === maskBaseImageId ? newItem : item);
      setActiveItemList(newActiveItemList);
      updateSessionActiveItemList(newActiveItemList);

      if (callback) callback(newItem); // Call the callback with the new item
    };
    imageObj.src = dataURL;
  };

  const createMaskImage = (imageData, maskData, bbox, callback) => {
    const [x, y, width, height] = bbox;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    const extractedData = new ImageData(width, height);

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const sourceX = x + i;
        const sourceY = y + j;
        const maskIndex = (j * width + i) * 4; // maskData is in RGBA format
        const imageIndex = (sourceY * imageData.width + sourceX) * 4;
        const extractIndex = (j * width + i) * 4;

        if (maskData.data[maskIndex + 3] !== 0) { // Check alpha channel of the maskData
          extractedData.data[extractIndex] = imageData.data[imageIndex]; // R
          extractedData.data[extractIndex + 1] = imageData.data[imageIndex + 1]; // G
          extractedData.data[extractIndex + 2] = imageData.data[imageIndex + 2]; // B
          extractedData.data[extractIndex + 3] = 255; // A
        } else {
          extractedData.data[extractIndex + 3] = 0; // Fully transparent
        }
      }
    }

    offscreenCtx.putImageData(extractedData, 0, 0);
    const dataURL = offscreenCanvas.toDataURL();

    const imageObj = new Image();
    imageObj.onload = () => {
      const newItem = {
        id: `item_${activeItemList.length}`,
        type: 'image',
        src: imageObj.src,
        x: x,
        y: y,
        width: width,
        height: height,
      };

      addNewItem(newItem);
      if (callback) callback(newItem); // Call the callback with the new item
    };
    imageObj.src = dataURL;
  };

  const debouncedHandleMouseOver = debounce((e) => {
    handleMouseOver(e);
  }, 100);


  // let canvasVideoUnderlay = <span />;

  const currentRelativeFrame = currentLayerSeek - (durationOffset * FPS);

  const currentRelateiveTimeStamp = currentRelativeFrame ? currentRelativeFrame / FPS : 0;



  let canvasVideoUnderlay = (
    <div className='absolute pt-0 pl-0 '>
      <VideoUnderlay aiVideoLayer={aiVideoLayer} currentLayerSeek={currentRelateiveTimeStamp}
        removeVideoLayer={removeVideoLayer} canvasDimensions={canvasDimensions}
        requestLipSyncToSpeech={requestLipSyncToSpeech}
        aiVideoLayerType={aiVideoLayerType} />
    </div>
  )


  let canvasActionOverlay = <span />;
  if (activeItemList.length === 0 && !aiVideoLayer && showOverlayPromptGenerator) {

    canvasActionOverlay = <VideoCanvasOverlay activeItemList={activeItemList}
      promptText={promptText}
      setPromptText={setPromptText}

      isGenerationPending={isGenerationPending}
      selectedGenerationModel={selectedGenerationModel}
      setSelectedGenerationModel={setSelectedGenerationModel}
      generationError={generationError}
      currentDefaultPrompt={currentDefaultPrompt}
      submitGenerateNewRequest={submitGenerateNewRequest}
      aspectRatio={aspectRatio}

      videoPromptText={videoPromptText}
      setVideoPromptText={setVideoPromptText}

      aiVideoGenerationPending={aiVideoGenerationPending}
      selectedVideoGenerationModel={selectedVideoGenerationModel}
      setSelectedVideoGenerationModel={setSelectedVideoGenerationModel}

      submitGenerateNewVideoRequest={submitGenerateNewVideoRequest}

 

      onCloseOverlay={() => {
        setShowOverlayPromptGenerator(false);
      }}

    />;

  }

    let canvasInternalLoading = <span />;

    let canvasGridOverlay = <span />;
    if (showGridOverlay) {
      canvasGridOverlay = <VideoCanvasGridOverlay canvasDimensions={canvasDimensions} />;

    }
    if (isUpdateLayerPending) {

      const canvasWidth = getCanvasDimensionsForAspectRatio(aspectRatio).width;
      canvasInternalLoading = (
        <div className={`absolute t-0 w-full pt-[150px]   z-10`}>
          <CanvasLoaderTransparent />
        </div>
      );
    }
 
  return (
    <div className={`m-auto relative  ${textColor} pb-8 shadow-lg mt-4 pt-[60px] pl-0 pr-0`}
      style={{
        display: 'inline-block',
        boxSizing: 'border-box',
      }}
    >
      {canvasVideoUnderlay}
      {canvasInternalLoading}
      {canvasGridOverlay}
      <Stage width={canvasDimensions.width} height={canvasDimensions.height} ref={ref} id="samsar-konva-stage"
        onMouseMove={debouncedHandleMouseOver} onClick={handleCanvasClick}
        style={{
          border: '2px solid stone-300',
          boxSizing: 'border-box',
          padding: 0,
          margin: 0,
          backgroundColor: '#111827',
        }}
      >
        <Layer onMouseDown={handleLayerMouseDown} onMouseMove={handleLayerMouseMove} onMouseUp={handleLayerMouseUp}>
          <Group id="baseGroup">
            {imageStackList}
          </Group>

          {currentCanvasAction === 'SHOW_SMART_SELECT_DISPLAY' && boundingBoxes.map((bbox, index) => (
            <Rect
              key={index}
              x={bbox[0]}
              y={bbox[1]}
              width={bbox[2]}
              height={bbox[3]}
              stroke="red"
              strokeWidth={2}
              id={`bbox_rect_${index}`}
            />
          ))}

          {showMask && (
            <Group id="maskGroup">
              {editMasklines.map((line, i) => (
                <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} />
              ))}
            </Group>
          )}
          {showPencil && (
            <Group id="pencilGroup">
              {pencilLines.map((line, i) => (
                <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} />
              ))}
            </Group>
          )}
          {overlayImage && (
            <KonvaImage
              image={overlayImage}
              x={0}
              y={0}
              width={stageDimensions.width}
              height={stageDimensions.height}
              opacity={0.6}
            />
          )}
          {maskImage && (
            <KonvaImage
              image={maskImage.src}
              x={maskImage.x}
              y={maskImage.y}
              width={maskImage.width}
              height={maskImage.height}
              opacity={0.6}
            />
          )}
          {shadedArea && (
            <Group>
              <Line points={shadedArea} fill="rgba(0, 0, 0, 0.5)" closed />
            </Group>
          )}
          {currentShapeSelectDisplay}
        </Layer>
      </Stage>

      <CanvasToolbar
        buttonPositions={buttonPositions}
        selectedId={selectedId}
        selectedLayerType={selectedLayerType}
        moveItem={moveItem}
        applyFilter={applyFilter}
        applyFinalFilter={applyFinalFilter}
        colorMode={colorMode}
        removeItem={removeItem}
        removeSelectedItem={removeSelectedItem}
        flipImageHorizontal={flipImageHorizontal}
        flipImageVertical={flipImageVertical}
        updateTargetActiveLayerConfig={updateTargetActiveLayerConfig}
        updateTargetShapeActiveLayerConfig={updateTargetShapeActiveLayerConfig}
        activeItemList={activeItemList}
        eraserToolbarVisible={eraserToolbarVisible}
        eraserToolbarPosition={eraserToolbarPosition}
        replaceEraserImage={replaceEraserImage}
        duplicateEraserImage={duplicateEraserImage}
        resetEraserImage={resetEraserImage}
        shapeSelectToolbarVisible={shapeSelectToolbarVisible}
        shapeSelectToolbarPosition={shapeSelectToolbarPosition}
        handleResetShapeLayer={handleResetShapeLayer}
        onCopyShapeLayer={onCopyShapeLayer}
        onReplaceShapeLayer={onReplaceShapeLayer}
        paintToolbarVisible={paintToolbarVisible}
        paintToolbarPosition={paintToolbarPosition}
        addPaintImage={addPaintImage}
        resetPaintImage={resetPaintImage}
        updateTargetImageActiveLayerConfig={updateTargetImageActiveLayerConfig}
      />
      {showAddRemoveMaskedItemButton && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-2 rounded-lg shadow-lg z-50">
          <button className="mr-4" onClick={handleAddButtonClick}>Add</button>
          <button onClick={handleRemoveButtonClick}>Remove</button>
        </div>
      )}
      {isAIVideoGenerationPending && (
        <div className="animation-overlay">
          <div className="spinner"></div>
        </div>
      )}
      {canvasActionOverlay}

    </div>
  );
});

export default VideoCanvas;
