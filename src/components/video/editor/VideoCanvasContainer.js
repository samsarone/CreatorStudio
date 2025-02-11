import VideoCanvas from "./VideoCanvas";
import React, { forwardRef, useEffect, useState, useRef } from "react";
import { CURRENT_TOOLBAR_VIEW, TOOLBAR_ACTION_VIEW } from '../../../constants/Types.ts';
import { STAGE_DIMENSIONS } from '../../../constants/Image.js';
import { generateCursor, generatePencilCursor } from "../util/GenerateSVG.js";
import Konva from 'konva';

import {
  applyGlitchEffect
} from '../../../utils/frame_animation/GlitchUtils.js';
import { applyBloomEffect } from '../../../utils/frame_animation/BloomUtils.js';



const VideoCanvasContainer = forwardRef((props, ref) => {
  const { sessionDetails, activeItemList, setActiveItemList, currentView,
    setCurrentView, editBrushWidth, editMasklines, setEditMaskLines, currentCanvasAction,
    setCurrentCanvasAction, setSelectedId, selectedId, buttonPositions,
    setButtonPositions, selectedLayerType, setSelectedLayerType, applyFilter,
    onChange, pencilColor, pencilWidth, eraserWidth, sessionId, selectedFrameId,
    exportAnimationFrames, currentLayer, currentLayerSeek, updateSessionActiveItemList,
    selectedLayerSelectShape, isLayerSeeking, applyFinalFilter, isExpressGeneration,
    stageZoomScale, selectedEditModelValue, createTextLayer, requestRealignToAiVideoAndLayers,
    requestLipSyncToSpeech
  } = props;


  
  const shapeSelectTransformerCircleRef = useRef();
  const shapeSelectTransformerRectangleRef = useRef();

  const [eraserLayer, setEraserLayer] = useState(null);
  const [isShapeVisible, setIsShapeVisible] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [showEraser, setShowEraser] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [showPencil, setShowPencil] = useState(false);
  const [pencilLines, setPencilLines] = useState([]);
  const [shapeSelectToolbarVisible, setShapeSelectToolbarVisible] = useState(false);
  const [shapeSelectToolbarPosition, setShapeSelectToolbarPosition] = useState({ x: 0, y: 0 });

  const [paintToolbarVisible, setPaintToolbarVisible] = useState(false);
  const [paintToolbarPosition, setPaintToolbarPosition] = useState({ x: 0, y: 0 });
  const [toolbarShapeProps, setToolbarShapeProps] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    radius: 0
  });

  const [shapeSet, setShapeSet] = useState(false);

  const showEraserRef = useRef(showEraser);
  const showPencilRef = useRef(showPencil);
  const editMasklinesRef = useRef(editMasklines);
  const eraserWidthRef = useRef(eraserWidth);
  const animationRefs = useRef({});
  const initialParamsRef = useRef({});
  const [hoveredObject, setHoveredObject] = useState(null);
  const [segmentation, setSegmentation] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);

  const [eraserToolbarVisible, setEraserToolbarVisible] = useState(false);
  const [eraserToolbarPosition, setEraserToolbarPosition] = useState({ x: 0, y: 0 });

  const [tempTopNode, setTempTopNode] = useState(null);


  useEffect(() => {
    const stage = ref.current.getStage();

    const positions = activeItemList.map(item => {
      if (!item.id) {
        return;
      }
      const itemId = item.id.toString();
      const node = stage.findOne(`#${itemId}`);
      if (node) {
        const absPos = node.getClientRect({ skipTransform: false, skipShadow: false, skipStroke: false });
        return { id: item.id, x: absPos.x + 30, y: absPos.y + 30 };
      }
      return null;
    }).filter(Boolean);



    setButtonPositions(positions);
  }, [activeItemList, ref, selectedId]);


  useEffect(() => {
    initialParamsRef.current = {};
  }, [currentLayer]);


  useEffect(() => {
    const FPS = 30;
    const { duration, durationOffset } = currentLayer;
    const elapsedTime = (currentLayerSeek / FPS) * 1000; // Convert to milliseconds
    const stage = ref.current.getStage();
    const layer = stage.findOne("#baseGroup");
    if (!layer) return;
    activeItemList.forEach(item => {
      const node = layer.findOne(`#${item.id}`);
      if (node) {
        applyAnimationsToNode(node, item, elapsedTime, duration, durationOffset);
      }
    });
  }, [currentLayerSeek, currentLayer, activeItemList]);
  


  useEffect(() => {
    showEraserRef.current = showEraser;
    showPencilRef.current = showPencil;
    editMasklinesRef.current = editMasklines;
    eraserWidthRef.current = eraserWidth;
  }, [showEraser, showPencil, editMasklines, eraserWidth]);


  useEffect(() => {
    setShowMask(false);
    setShowEraser(false);
    const stage = ref.current.getStage();
    const container = stage.container();
    if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY && selectedEditModelValue && selectedEditModelValue.editType === 'inpaint') {
      setEditMaskLines([]);
      setShowMask(true);
      container.style.cursor = generateCursor(editBrushWidth);
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      setShowEraser(true);
      container.style.cursor = generateCursor(eraserWidthRef.current);
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY) {
      setShowPencil(true);
      container.style.cursor = generatePencilCursor(20);
    } else {
      setEditMaskLines([]);
      container.style.cursor = 'default';
    }
  }, [currentView, currentCanvasAction, selectedEditModelValue]);

  useEffect(() => {
    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      const stage = ref.current.getStage();
      const container = stage.container();
      container.style.cursor = generateCursor(eraserWidth);
    }
  }, [eraserWidth]);


  const previousActionViewRef = useRef();

  useEffect(() => {
    if (previousActionViewRef.current === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY && currentCanvasAction !== TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      setEraserToolbarPosition(null);
      setEraserToolbarVisible(false);
      replaceTopLayer();
    }
  }, [currentCanvasAction]);



  const replaceEraserImage = () => {
    replaceTopLayer();
    setEraserToolbarVisible(false);
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    setCurrentCanvasAction(null);
  }

  const duplicateEraserImage = () => {
    duplicateTopLayer();
    setEraserToolbarVisible(false);
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    setCurrentCanvasAction(null);
  }

  const resetEraserImage = () => {
    const stage = ref.current.getStage();
    if (eraserLayer) {
      eraserLayer.destroy();
      setEraserLayer(null);
      if (tempTopNode) {
        const layer = stage.findOne('#baseGroup');
        layer.add(tempTopNode);
        tempTopNode.show();
        setTempTopNode(null);
        layer.draw();
      }
    }
    setEraserToolbarVisible(false);
    setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    setCurrentCanvasAction(null);
  };

  useEffect(() => {
    if (previousActionViewRef.current === CURRENT_TOOLBAR_VIEW.SHOW_PENCIL_DISPLAY && currentView !== CURRENT_TOOLBAR_VIEW.SHOW_PENCIL_DISPLAY) {

      const stage = ref.current.getStage();
      const pencilGroup = stage.findOne('#pencilGroup');
      if (pencilGroup) {


        const dataURL = pencilGroup.toDataURL();
        const imageObj = new window.Image();
        imageObj.onload = () => {
          const groupClientRect = pencilGroup.getClientRect();
          const newItem = {
            id: `item_${activeItemList.length}`,
            type: 'image',
            src: dataURL,
            x: groupClientRect.x,
            y: groupClientRect.y,
            width: groupClientRect.width,
            height: groupClientRect.height,
          };
          const newItemList = [...activeItemList, newItem];



          setActiveItemList(newItemList);
          pencilGroup.off();
          pencilGroup.destroy();
          setShowPencil(false);
          updateSessionActiveItemList(newItemList)
        };
        imageObj.src = dataURL;
      }
    }
    if (previousActionViewRef.current !== currentCanvasAction) {
      previousActionViewRef.current = currentCanvasAction;
    }
  }, [currentCanvasAction, currentView]);




  const handleLayerMouseDown = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY && (selectedLayerSelectShape === 'rectangle' || selectedLayerSelectShape === 'circle')) {
      if (!shapeSet) {
        startPosRef.current = point;
        setIsDrawing(true);
        setToolbarShapeProps({ x: point.x, y: point.y, radius: 0 });
      }
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      const point = stage.getPointerPosition();
      const topShape = stage.getIntersection(point);
      if (topShape) {
        const topItemParentId = topShape.getParent().attrs.id;
        const topItemParentNode = stage.findOne(`#${topItemParentId}`);
        if (topItemParentNode) {
          let newEraserLayer;
          if (eraserLayer) {
            newEraserLayer = eraserLayer;
          } else {
            newEraserLayer = new Konva.Layer();
            const clonedItem = topItemParentNode.clone();
            clonedItem.attrs.id = 'originalShape';
            clonedItem.hide();
            setTempTopNode(topItemParentNode.clone());
            topItemParentNode.destroy();
            const clonedItemChild = clonedItem.children[0];
            newEraserLayer.add(clonedItemChild);
            stage.add(newEraserLayer);
            setEraserLayer(newEraserLayer);
          }
          setHandlersForLayer(newEraserLayer);
          newEraserLayer.on('mousedown', () => {
            if (showEraserRef.current) setHandlersForLayer(newEraserLayer);
            setEraserToolbarPosition(null);
            setEraserToolbarVisible(false);
          });

          function setHandlersForLayer(newEraserLayer) {
            newEraserLayer.on('mousemove', (e) => {
              const eraserRadius = eraserWidthRef.current ? eraserWidthRef.current / 2 : eraserWidth / 2;
              const point = stage.getPointerPosition();
              const eraserShape = new Konva.Circle({
                x: point.x,
                y: point.y,
                radius: eraserRadius / 2,
                fill: 'black',
                globalCompositeOperation: 'destination-out',
                id: 'eraserCircle'
              });
              newEraserLayer.add(eraserShape);
              newEraserLayer.batchDraw();
            });
            newEraserLayer.on('mouseup', () => {
              const boundingBox = newEraserLayer.getClientRect();
              setEraserToolbarPosition({ x: boundingBox.x, y: boundingBox.y + 50 });
              setEraserToolbarVisible(true);
              setIsPainting(false);
              setEraserLayer(newEraserLayer);
              newEraserLayer.off('mousemove');
              newEraserLayer.off('mouseup');
            });
          }
        }
      }
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY) {
      setIsPainting(true);
      setPaintToolbarVisible(false);
      const pos = e.target.getStage().getPointerPosition();
      setPencilLines([...pencilLines, { points: [pos.x, pos.y], stroke: pencilColor, strokeWidth: pencilWidth }]);
    } else {
      setIsPainting(true);
      const pos = e.target.getStage().getPointerPosition();
      addLine([pos.x, pos.y, pos.x, pos.y]);
    }
  };

  const handleLayerMouseMove = (e) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (isDrawing && !shapeSet) {
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;

      if (selectedLayerSelectShape === 'rectangle') {
        const newProps = {
          ...toolbarShapeProps,
          x: Math.min(startX, pointerPosition.x),
          y: Math.min(startY, pointerPosition.y),
          width: Math.abs(pointerPosition.x - startX),
          height: Math.abs(pointerPosition.y - startY),
        };
        setToolbarShapeProps(newProps);
      } else if (selectedLayerSelectShape === 'circle') {
        const newProps = {
          ...toolbarShapeProps,
          x: startX,
          y: startY,
          radius: Math.sqrt(
            (pointerPosition.x - startX) ** 2 + (pointerPosition.y - startY) ** 2
          ),
        };
        setToolbarShapeProps(newProps);
      }

      return;
    }
    if (!isPainting) return;
    const point = stage.getPointerPosition();
    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY && eraserLayer) {
      const eraserRadius = eraserWidthRef.current ? eraserWidthRef.current / 2 : eraserWidth / 2;
      const eraserShape = new Konva.Circle({
        x: point.x,
        y: point.y,
        radius: eraserRadius,
        fill: 'black',
        globalCompositeOperation: 'destination-out'
      });
      eraserLayer.add(eraserShape);
      eraserLayer.batchDraw();
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY) {
      let lastLine = pencilLines[pencilLines.length - 1];
      if (lastLine) {
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        setPencilLines(pencilLines.slice(0, -1).concat(lastLine));
      }
    } else if (editMasklinesRef.current.length > 0) {
      let lastLine = editMasklinesRef.current[editMasklinesRef.current.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      setEditMaskLines(editMasklinesRef.current.slice(0, -1).concat(lastLine));
    }
  };

  const handleLayerMouseUp = () => {
    setIsPainting(false);
    setIsDrawing(false);

    if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY && (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_SELECT_SHAPE_DISPLAY)) {
      const stage = ref.current.getStage();
      const layer = stage.findOne('#shapeSelectToolbar');
      if (layer) {
        let newYPos = layer.attrs.y > 40 ? layer.attrs.y - 40 : layer.attrs.y;
        setShapeSelectToolbarVisible(true);
        setShapeSelectToolbarPosition({ x: layer.attrs.x, y: newYPos });
        if (toolbarShapeProps.radius > 0 || toolbarShapeProps.width > 0 || toolbarShapeProps.height > 0) {
          setShapeSet(true);
        }
      }
    } else {
      setShapeSet(false);
      setShapeSelectToolbarVisible(false);
    }

    if (currentView === CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY && currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY) {
      setPaintToolbarVisible(true);
      setPaintToolbarPosition({ x: toolbarShapeProps.x, y: toolbarShapeProps.y + 40 });
    }
  };



  const addLine = (points) => {
    setEditMaskLines([...editMasklines, { points, stroke: 'white', strokeWidth: editBrushWidth }]);
  };


  function applyAnimationsToNode(node, item, elapsedTime, duration, durationOffset) {
    if (!item.animations) return;
  
    const FPS = 30; // Frames per second, same as in backend
    const totalLayerDuration = duration * 1000; // Convert to milliseconds
  
    item.animations.forEach(animation => {
      const { type, params, frameDuration, frameOffset } = animation;
  
      if (!params || !type) return;
  
      // Determine animation start and end times
      let startTime, endTime;
  
      if (frameOffset !== undefined && frameDuration !== undefined) {
        const durationOffsetEffective = durationOffset * 1000;
        startTime = durationOffsetEffective + (frameOffset * (1000 / FPS));
        endTime = startTime + (frameDuration * (1000 / FPS));
      } else {
        // Use default layer duration
        startTime = durationOffset * 1000;
        endTime = startTime + totalLayerDuration;
      }
  
      const animationElapsed = elapsedTime - startTime;
      const totalAnimationDuration = endTime - startTime;
  
      // Only process animation if current time is within animation boundaries
      if (animationElapsed >= 0 && animationElapsed <= totalAnimationDuration) {
        const t = animationElapsed / totalAnimationDuration; // Progress ratio [0,1]
  
        switch (type) {
          case 'zoom':
            // Apply zoom animation
            const { startScale = 100, endScale = 100 } = params;
            const scale = (startScale + (endScale - startScale) * t) / 100;
            node.scaleX(scale);
            node.scaleY(scale);
            break;
  
          case 'slide':
            // Apply slide animation
            const { startX = node.x(), endX = node.x(), startY = node.y(), endY = node.y() } = params;
            const translateX = startX + (endX - startX) * t;
            const translateY = startY + (endY - startY) * t;
            node.x(translateX);
            node.y(translateY);
            break;
  
          case 'rotate':
            // Apply rotate animation
            const { startAngle = 0, endAngle = 360, rotationSpeed } = params;
            let angle;
            if (rotationSpeed) {
              // Continuous rotation based on rotation speed
              angle = t * rotationSpeed * 360;
            } else {
              // Rotation from startAngle to endAngle
              angle = startAngle + (endAngle - startAngle) * t;
            }
            node.rotation(angle);
            break;
  
          case 'fade':
            // Apply fade animation
            const { startFade = 100, endFade = 100 } = params;
            const opacity = (startFade + (endFade - startFade) * t) / 100;
            node.opacity(opacity);
            break;
  
          case 'orbit':
            // Apply orbit animation
            const { centerX, centerY, radius, startAngle: orbitStartAngle = 0, endAngle: orbitEndAngle = 360 } = params;
            const currentAngle = orbitStartAngle + (orbitEndAngle - orbitStartAngle) * t;
            const radians = (currentAngle * Math.PI) / 180;
            const orbitX = centerX + radius * Math.cos(radians);
            const orbitY = centerY + radius * Math.sin(radians);
            node.x(orbitX);
            node.y(orbitY);
            break;
          // Add other custom animations here (e.g., snowfall, light_transition)
          default:
            applyCustomAnimation(node, animation, t);
            break;
        }
      } else {
        // Handle static animations if needed
        applyStaticAnimation(node, type, params);
      }
    });
  }

  function applyCustomAnimation(node, animation, t) {
    const { type, params } = animation;
  
    switch (type) {
      case 'glitch':
        applyGlitchEffect(node, params, t);
        break;
      case 'bloom':
        applyBloomEffect(node, params, t);
        break;
      case 'snowfall':
      case 'light_transition':
      case 'hologram':
      case 'nebula':
      case 'particle':
      case 'lens_flare':
        console.warn(`Unsupported custom animation type: ${type}`);
        break;
      default:
        console.warn(`Unknown custom animation type: ${type}`);
        break;
    }
  }

  
  
  
  function applyStaticAnimation(node, type, params) {
    switch (type) {
      case 'zoom':
        const { endScale = 100 } = params;
        node.scaleX(endScale / 100);
        node.scaleY(endScale / 100);
        break;
  
      case 'rotate':
        const { endAngle = 0 } = params;
        node.rotation(endAngle);
        break;
  
      case 'slide':
        const { endX = node.x(), endY = node.y() } = params;
        node.x(endX);
        node.y(endY);
        break;
  
      case 'fade':
        const { endFade = 100 } = params;
        node.opacity(endFade / 100);
        break;
  
      default:
        break;
    }
  }
  
  const replaceTopLayer = () => {
    const stage = ref.current.getStage();
    const layer1 = stage.children[1];
    if (layer1) {
      const eraserLayerImage = layer1.children[0];
      const eraserImageSrc = eraserLayerImage.attrs.src;
      const boundingBox = eraserLayerImage.getClientRect();
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = boundingBox.width;
      offscreenCanvas.height = boundingBox.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      offscreenCtx.drawImage(
        layer1.toCanvas(),
        boundingBox.x, boundingBox.y,
        boundingBox.width, boundingBox.height,
        0, 0,
        boundingBox.width, boundingBox.height
      );
      const eraserShapes = eraserLayer.children.filter((child) => child.attrs.id === 'eraserCircle');
      eraserShapes.forEach(shape => {
        const shapeClientRect = shape.getClientRect();
        offscreenCtx.clearRect(
          shapeClientRect.x - boundingBox.x,
          shapeClientRect.y - boundingBox.y,
          shapeClientRect.width,
          shapeClientRect.height
        );
      });
      const dataURL = offscreenCanvas.toDataURL();
      const imageObj = new window.Image();
      imageObj.onload = () => {
        const newItem = {
          id: `item_${activeItemList.length - 1}`,
          type: 'image',
          src: dataURL,
          width: imageObj.width / stageZoomScale,
          height: imageObj.height / stageZoomScale,
          x: boundingBox.x / stageZoomScale,
          y: boundingBox.y / stageZoomScale,
        };
        const newActiveItemList = activeItemList.slice(0, -1).concat(newItem);
        setActiveItemList(newActiveItemList);
        eraserLayer.off();
        eraserLayer.destroy();
        setEraserLayer(null);
        updateSessionActiveItemList(newActiveItemList);

        setSelectedId(null); /// CHECK THIS
      };
      imageObj.src = dataURL;
    }
  }

  const duplicateTopLayer = () => {
    const stage = ref.current.getStage();
    const layer0 = stage.children[0];
    if (eraserLayer) {
      const boundingBox = eraserLayer.getClientRect();
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = boundingBox.width;
      offscreenCanvas.height = boundingBox.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      offscreenCtx.drawImage(
        stage.toCanvas(),
        boundingBox.x, boundingBox.y,
        boundingBox.width, boundingBox.height,
        0, 0,
        boundingBox.width, boundingBox.height
      );
      const eraserShapes = eraserLayer.children.filter((child) => child.attrs.id === 'eraserCircle');
      eraserShapes.forEach(shape => {
        const shapeClientRect = shape.getClientRect();
        offscreenCtx.clearRect(
          shapeClientRect.x - boundingBox.x,
          shapeClientRect.y - boundingBox.y,
          shapeClientRect.width,
          shapeClientRect.height
        );
      });
      const dataURL = offscreenCanvas.toDataURL();
      const imageObj = new window.Image();
      imageObj.onload = () => {
        const newItem = {
          id: `item_${activeItemList.length}`,
          type: 'image',
          src: dataURL,
          width: imageObj.width,
          height: imageObj.height,
          x: boundingBox.x,
          y: boundingBox.y,
        };
        const newActiveItemList = [...activeItemList, newItem];
        setActiveItemList(newActiveItemList);
        updateSessionActiveItemList(newActiveItemList);
        eraserLayer.off();
        eraserLayer.destroy();
        setEraserLayer(null);
      };
      imageObj.src = dataURL;
    }
  }


  const flipImageHorizontal = (id) => {
    const stage = ref.current.getStage();
    const imageNode = stage.findOne(`#${id}`);
    if (!imageNode) {
      return;
    }

    // Flip the image horizontally
    imageNode.scaleX(imageNode.scaleX() * -1);
    stage.batchDraw();

    // Convert the updated image node to a data URL
    const updatedImageDataUrl = imageNode.toDataURL();

    // Update the activeItemList with the new data URL
    const updatedItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          src: updatedImageDataUrl,
        };
      }
      return item;
    });

    setActiveItemList(updatedItemList);

    // Send a backend request to update the session layer
    updateSessionActiveItemList(updatedItemList);
  };

  const flipImageVertical = (id) => {
    const stage = ref.current.getStage();
    const imageNode = stage.findOne(`#${id}`);
    if (!imageNode) {
      return;
    }

    // Flip the image vertically
    imageNode.scaleY(imageNode.scaleY() * -1);
    stage.batchDraw();

    // Convert the updated image node to a data URL
    const updatedImageDataUrl = imageNode.toDataURL();

    // Update the activeItemList with the new data URL
    const updatedItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          src: updatedImageDataUrl,
        };
      }
      return item;
    });

    setActiveItemList(updatedItemList);

    // Send a backend request to update the session layer
    updateSessionActiveItemList(updatedItemList);
  };

  const onCopyShapeLayer = () => {
    setIsShapeVisible(false);
    setShapeSelectToolbarVisible(false);
    const stage = ref.current.getStage();
    const shape = stage.findOne("#shapeSelectToolbar");
    let transformer;
    if (shape) {
      if (shape.attrs.type === 'circle') {
        transformer = shapeSelectTransformerCircleRef.current; // Add this line to get transformer reference
      } else if (shape.attrs.type === 'rectangle') {
        transformer = shapeSelectTransformerRectangleRef.current; // Add this line to get transformer reference
      }
      if (transformer) {
        transformer.hide(); // Hide transformer boundaries
      }
      const boundingBox = shape.getClientRect();
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = boundingBox.width;
      offscreenCanvas.height = boundingBox.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      shape.hide();
      offscreenCtx.drawImage(
        stage.toCanvas(),
        boundingBox.x, boundingBox.y,
        boundingBox.width, boundingBox.height,
        0, 0,
        boundingBox.width, boundingBox.height
      );
      if (shape.attrs.type === 'circle') {
        const shapeRadius = shape.attrs.radius;
        const centerX = boundingBox.width / 2;
        const centerY = boundingBox.height / 2;
        const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const data = imageData.data;
        for (let y = 0; y < offscreenCanvas.height; y++) {
          for (let x = 0; x < offscreenCanvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > shapeRadius) {
              const index = (y * offscreenCanvas.width + x) * 4;
              data[index + 3] = 0;
            }
          }
        }
        offscreenCtx.putImageData(imageData, 0, 0);
      }
      const dataURL = offscreenCanvas.toDataURL();
      const imageObj = new window.Image();
      imageObj.onload = () => {
        const newItem = {
          id: `item_${activeItemList.length}`,
          type: 'image',
          src: dataURL,
          width: imageObj.width / stageZoomScale,
          height: imageObj.height / stageZoomScale,
          x: boundingBox.x / stageZoomScale,
          y: boundingBox.y / stageZoomScale,
        };

        const newActiveItemList = [...activeItemList, newItem];

        setActiveItemList(newActiveItemList);
        updateSessionActiveItemList(newActiveItemList);
        if (transformer) {
          transformer.show(); // Show transformer boundaries again
        }
      };
      imageObj.src = dataURL;
    }
  };

  const onReplaceShapeLayer = () => {
    setIsShapeVisible(false);
    setShapeSelectToolbarVisible(false);
    const stage = ref.current.getStage();
    const shape = stage.findOne("#shapeSelectToolbar");
    let transformer;

    if (shape) {
      if (shape.attrs.type === 'circle') {
        transformer = shapeSelectTransformerCircleRef.current; // Add this line to get transformer reference
      } else if (shape.attrs.type === 'rectangle') {
        transformer = shapeSelectTransformerRectangleRef.current; // Add this line to get transformer reference
      }
      if (transformer) {
        transformer.hide(); // Hide transformer boundaries
      }
      const boundingBox = shape.getClientRect();
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = boundingBox.width;
      offscreenCanvas.height = boundingBox.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      shape.hide();
      offscreenCtx.drawImage(
        stage.toCanvas(),
        boundingBox.x, boundingBox.y,
        boundingBox.width, boundingBox.height,
        0, 0,
        boundingBox.width, boundingBox.height
      );
      if (shape.attrs.type === 'circle') {
        const shapeRadius = shape.attrs.radius;
        const centerX = boundingBox.width / 2;
        const centerY = boundingBox.height / 2;
        const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const data = imageData.data;
        for (let y = 0; y < offscreenCanvas.height; y++) {
          for (let x = 0; x < offscreenCanvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > shapeRadius) {
              const index = (y * offscreenCanvas.width + x) * 4;
              data[index + 3] = 0;
            }
          }
        }
        offscreenCtx.putImageData(imageData, 0, 0);
      }
      const dataURL = offscreenCanvas.toDataURL();
      const imageObj = new window.Image();
      imageObj.onload = () => {
        const newItem = {
          id: `item_${activeItemList.length - 1}`,
          type: 'image',
          src: dataURL,
          width: imageObj.width / stageZoomScale,
          height: imageObj.height / stageZoomScale,
          x: boundingBox.x / stageZoomScale,
          y: boundingBox.y / stageZoomScale,
        };

        let prevActiveList = [...activeItemList];
        prevActiveList[prevActiveList.length - 1] = newItem;
        setActiveItemList(prevActiveList);
        updateSessionActiveItemList(prevActiveList);
        if (transformer) {
          transformer.show(); // Show transformer boundaries again
        }
        setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
      };
      imageObj.src = dataURL;
    }
  };

  const handleResetShapeLayer = () => {
    setIsShapeVisible(false);
    setShapeSelectToolbarVisible(false);
  };


  const removeSelectedItem = () => {


    const newList = activeItemList.filter((item) => item.id !== selectedId);

    const reorderedItems = newList.map((item, newIndex) => ({
      ...item,
      id: `item_${newIndex}`
    }));

 
    setActiveItemList(reorderedItems);
    updateSessionActiveItemList(reorderedItems);
  }


  const removeItem = (index) => {



    const newList = [...activeItemList];
    newList.splice(index, 1);

    // Reorder the IDs of the remaining items
    const reorderedItems = newList.map((item, newIndex) => ({
      ...item,
      id: `item_${newIndex}`
    }));
    

    setActiveItemList(reorderedItems);
    updateSessionActiveItemList(reorderedItems);
  }

  const updateTargetActiveLayerConfig = (id, newConfig, updateState = true) => {



    
    const scaledNewConfig = {
      ...newConfig,
      x: newConfig.x / stageZoomScale,
      y: newConfig.y / stageZoomScale,
      width: newConfig.width / stageZoomScale,
      height: newConfig.height / stageZoomScale,

    }



    const newItem = activeItemList.find((item) => item.id === id);

    
    if (newItem.type === 'image') {
      newItem.x = scaledNewConfig.x;
      newItem.y = scaledNewConfig.y;
      newItem.width = scaledNewConfig.width;
      newItem.height = scaledNewConfig.height;
    }

    
    const newActiveItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...scaledNewConfig,
        };
      }
      return item;
    });
    if (updateState) {
      setActiveItemList(newActiveItemList);
    }
    updateSessionActiveItemList(newActiveItemList);
  }



  const updateTargetImageActiveLayerConfig = (id, newConfig, updateState = true) => {


    const newActiveItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...newConfig,
        };
      }
      return item;
    });
    if (updateState) {
      setActiveItemList(newActiveItemList);
    }
    updateSessionActiveItemList(newActiveItemList);
  }


  const updateTargetShapeActiveLayerConfig = (id, newConfig) => {



    const newWidth = newConfig.width / stageZoomScale;

    let scaledNewConfig = {
      ...newConfig,
      x: newConfig.x / stageZoomScale,
      y: newConfig.y / stageZoomScale,
    }
    if (newConfig.width) {
      scaledNewConfig.width = newConfig.width / stageZoomScale;
    }
    if (newConfig.height) {
      scaledNewConfig.height = newConfig.height / stageZoomScale;
    }
    if (newConfig.fontSize) {
      scaledNewConfig.fontSize = newConfig.fontSize / stageZoomScale;
    }

    const newActiveItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          config: {
            ...item.config,
            ...scaledNewConfig,
          },
        };
      }
      return item;
    });

    setActiveItemList(newActiveItemList);
    updateSessionActiveItemList(newActiveItemList);
  }



  const updateTargetTextActiveLayerConfig = (id, newConfig) => {


    const stage = ref.current.getStage();

    
    const textNode = stage.findOne(`#${id}`);
    if (!textNode) {
      console.error(`No text node found with id ${id}`);
      return;
    }
  
    const boundingBox = textNode.getClientRect();
  
    let centerX = boundingBox.x + boundingBox.width / 2;
    let centerY = boundingBox.y + boundingBox.height / 2;
  
    const newWidth = newConfig.width / stageZoomScale;
  
    const newHeight = newConfig.height / stageZoomScale;

  
    let scaledNewConfig = {
      ...newConfig,
      x: centerX / stageZoomScale,
      y: centerY / stageZoomScale,
      width: newWidth,
      height: newHeight,
    };
    if (newConfig.width) {
      scaledNewConfig.width = newConfig.width / stageZoomScale;
    }
    if (newConfig.height) {
      scaledNewConfig.height = newConfig.height / stageZoomScale;
    }
    if (newConfig.fontSize) {
      scaledNewConfig.fontSize = newConfig.fontSize / stageZoomScale;
    }
  

    const newActiveItemList = activeItemList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          config: {
            ...item.config,
            ...scaledNewConfig,
          },
        };
      }
      return item;
    });
  
    setActiveItemList(newActiveItemList);
    updateSessionActiveItemList(newActiveItemList);
  };




  const addPaintImage = () => {
    const stage = ref.current.getStage();
    const pencilGroup = stage.findOne('#pencilGroup');
    if (pencilGroup) {

      const dataURL = pencilGroup.toDataURL();
      const imageObj = new window.Image();
      imageObj.onload = () => {
        const groupClientRect = pencilGroup.getClientRect();
        const newItem = {
          id: `item_${activeItemList.length}`,
          type: 'image',
          src: dataURL,
        x: groupClientRect.x / stageZoomScale,
        y: groupClientRect.y / stageZoomScale,
        width: groupClientRect.width / stageZoomScale,
        height: groupClientRect.height / stageZoomScale,
        };
        const newItemList = [...activeItemList, newItem];
        setActiveItemList(newItemList);
        pencilGroup.off();
        pencilGroup.destroy();
        setShowPencil(false);
        updateSessionActiveItemList(newItemList);
      };
      imageObj.src = dataURL;
      setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY);
      setPaintToolbarVisible(false);
      setCurrentView(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    }
  };

  const resetPaintImage = () => {
    const stage = ref.current.getStage();
    const paintLayer = stage.findOne('#pencilGroup');
    if (paintLayer) {
      paintLayer.destroyChildren();
      paintLayer.draw();
    }
    setPaintToolbarVisible(false);
  };



  
  return (
    <div>
      <VideoCanvas
        {...props}
        ref={ref}
        applyAnimationsToNode={applyAnimationsToNode}
        replaceTopLayer={replaceTopLayer}
        duplicateTopLayer={duplicateTopLayer}
        eraserLayer={eraserLayer}
        setEraserLayer={setEraserLayer}
        flipImageVertical={flipImageVertical}
        flipImageHorizontal={flipImageHorizontal}
        onCopyShapeLayer={onCopyShapeLayer}
        onReplaceShapeLayer={onReplaceShapeLayer}
        handleResetShapeLayer={handleResetShapeLayer}
        removeItem={removeItem}
        removeSelectedItem={removeSelectedItem}
        updateTargetActiveLayerConfig={updateTargetActiveLayerConfig}
        updateTargetShapeActiveLayerConfig={updateTargetShapeActiveLayerConfig}
        updateTargetTextActiveLayerConfig={updateTargetTextActiveLayerConfig}
        addPaintImage={addPaintImage}
        resetPaintImage={resetPaintImage}
        shapeSelectTransformerCircleRef={shapeSelectTransformerCircleRef}
        shapeSelectTransformerRectangleRef={shapeSelectTransformerRectangleRef}
        addLine={addLine}
        handleLayerMouseDown={handleLayerMouseDown}
        handleLayerMouseMove={handleLayerMouseMove}
        handleLayerMouseUp={handleLayerMouseUp}
        resetEraserImage={resetEraserImage}
        replaceEraserImage={replaceEraserImage}
        duplicateEraserImage={duplicateEraserImage}
        showEraser={showEraser}
        showMask={showMask}
        showPencil={showPencil}
        pencilLines={pencilLines}
        overlayImage={overlayImage}
        shapeSelectToolbarVisible={shapeSelectToolbarVisible}
        shapeSelectToolbarPosition={shapeSelectToolbarPosition}
        paintToolbarVisible={paintToolbarVisible}
        paintToolbarPosition={paintToolbarPosition}
        toolbarShapeProps={toolbarShapeProps}
        setToolbarShapeProps={setToolbarShapeProps}
        isDrawing={isDrawing}
        shapeSet={shapeSet}
        setShapeSet={setShapeSet}
        startPosRef={startPosRef}
        hoveredObject={hoveredObject}
        eraserWidthRef={eraserWidthRef}
        eraserToolbarPosition={eraserToolbarPosition}
        eraserToolbarVisible={eraserToolbarVisible}
        isExpressGeneration={isExpressGeneration}
        createTextLayer={createTextLayer}
        updateTargetImageActiveLayerConfig={updateTargetImageActiveLayerConfig}
        requestRealignToAiVideoAndLayers={requestRealignToAiVideoAndLayers}
        requestLipSyncToSpeech={requestLipSyncToSpeech}
      />

    </div>
  )
});

export default VideoCanvasContainer;