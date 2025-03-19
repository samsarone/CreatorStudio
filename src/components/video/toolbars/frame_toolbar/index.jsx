// FrameToolbar.js
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';
import CommonButton from '../../../common/CommonButton.tsx';
import './toolbar.css';
import './baseToolbar.css';
import ReactSlider from 'react-slider';
import {
  FaChevronRight,
  FaTimes,
  FaChevronUp,
  FaChevronDown,
  FaDownload,
} from 'react-icons/fa';
import AudioOptionsDialog from '../audio/AudioOptionsDialog.jsx';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import CommonDropdownButton from "../../../common/CommonDropdownButton.tsx";

import ReactDOM from 'react-dom';

import SecondaryButton from '../../../common/SecondaryButton.tsx';
import VerticalWaveform from '../../util/VerticalWaveform.jsx';
import DualThumbSlider from '../../util/DualThumbSlider.jsx';
import TimeRuler from '../../util/TimeRuler.jsx';
import RangeOverlaySlider from './RangeOverlaySlider.jsx';
import { CURRENT_TOOLBAR_VIEW, FRAME_TOOLBAR_VIEW } from '../../../../constants/Types.ts';
import AudioTrackSlider from '../../util/AudioTrackSlider.jsx';
import DropdownButton from '../../util/DropdownButton.jsx';
import { useAlertDialog } from '../../../../contexts/AlertDialogContext.jsx';
import BatchPrompt from '../../util/BatchPrompt.jsx';
import TextTrackDisplay from './text_toolbar/TextTrackDisplay.jsx';

import { createPortal } from 'react-dom';
import { FaChevronLeft, FaEye } from 'react-icons/fa6';
import { FaRedo } from 'react-icons/fa';
import SelectedTextToolbarDisplay from './text_toolbar/SelectedTextToolbarDisplay.jsx';
import PublishOptionsDialog from './PublishOptionsDialog.jsx';
import _ from 'lodash';
const MAX_VISIBLE_LAYERS = 10;
const MIN_LAYER_HEIGHT = 20; // in pixels

export default function FrameToolbar(props) {
  const {
    layers,
    setSelectedLayer,
    submitRenderVideo,
    setLayerDuration,
    currentLayerSeek,
    setCurrentLayerSeek,
    isLayerSeeking,
    downloadVideoDisplay,
    renderedVideoPath,
    sessionId,
    updateSessionLayer,
    setIsLayerSeeking,
    isVideoGenerating,
    showAudioTrackView,
    frameToolbarView,
    audioLayers,
    updateAudioLayer,
    removeAudioLayer,
    handleVolumeChange,
    handleStartTimeChange,
    handleEndTimeChange,
    updateChangesToActiveAudioLayers,
    addLayerToComposition,
    copyCurrentLayerBelow,
    removeSessionLayer,
    addLayersViaPromptList,
    defaultSceneDuration,
    isCanvasDirty,
    updateChangesToActiveSessionLayers,
    downloadLink,
    submitRegenerateFrames,
    applySynchronizeAnimationsToBeats,
    applySynchronizeLayersToBeats,
    applySynchronizeLayersAndAnimationsToBeats,
    applyAudioTrackVisualizerToProject,
    selectedLayerIndex,
    setSelectedLayerIndex,
    regenerateVideoSessionSubtitles,
    publishVideoSession,
    generateMeta,

    sessionMetadata,

  } = props;


  const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;


  const totalDuration = useMemo(() => {
    if (layers && layers.length > 0) {


      return layers.reduce((acc, layer) => acc + layer.duration, 0);
    }
  }, [layers]);

  const { colorMode } = useColorMode();

  const bgColor = colorMode === 'light' ? 'bg-cyber-white' : 'bg-gray-800';
  const bg2Color = colorMode === 'light' ? 'bg-stone-200' : 'bg-gray-700';
  let bg3Color = colorMode === 'light' ? 'bg-neutral-100' : 'bg-neutral-800';
  const bgSelectedColor =
    colorMode === 'light' ? 'bg-stone-200 shadow-lg' : 'bg-stone-950 shadow-lg';
  const textColor = colorMode === 'light' ? 'text-cyber-black' : 'text-neutral-100';
  const borderColor = colorMode === 'light' ? 'border-gray-300' : 'border-gray-600';

  const [highlightBoundaries, setHighlightBoundaries] = useState({ start: 0, height: 0 });
  const totalDurationInFrames = Math.floor(totalDuration * 30); // Convert total duration to frames (30 fps)
  const [startSelectDurationInFrames, setStartSelectDurationInFrames] = useState(0);
  const [endSelectDurationInFrames, setEndSelectDurationInFrames] = useState(0);

  const [openPopupLayerIndex, setOpenPopupLayerIndex] = useState(null);

  const [visibleStartTime, setVisibleStartTime] = useState(0);
  const [visibleEndTime, setVisibleEndTime] = useState(totalDuration);

  const [isAudioDuckingEnabled, setIsAudioDuckingEnabled] = useState(false);

  const [dragAmount, setDragAmount] = useState(0);

  const [clipStart, setClipStart] = useState(false);
  const [clipEnd, setClipEnd] = useState(false);

  const [clipStartValue, setClipStartValue] = useState(0);
  const [clipEndValue, setClipEndValue] = useState(0);



  const [showTextTrackAnimations, setShowTextTrackAnimations] = useState(false);

  const [selectedAudioTrackDisplay, setSelectedAudioTrackDisplay] = useState(null);

  const [effectiveVisibleDisplaySliderRange, setEffectiveVisibleDisplaySliderRange] = useState([
    0,
    totalDurationInFrames,
  ]);


  const [currentLayerActionSuperView, setCurrentLayerActionSuperView] = useState("AUDIO");

  const [showSelectedAudioExtraOptionsToolbar, setShowSelectedAudioExtraOptionsToolbar] = useState(false);


  const [newSelectedTextAnimation, setNewSelectedTextAnimation] = useState(null);


  const [selectedTextTrackDisplay, setSelectedTextTrackDisplay] = useState(null);


  const [selectedAnimation, setSelectedAnimation] = useState(null);

  const [pendingLayerUpdates, setPendingLayerUpdates] = useState([]);


  const [renderDropdownOpen, setRenderDropdownOpen] = useState(false);



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




  useEffect(() => {
    if (frameToolbarView !== FRAME_TOOLBAR_VIEW.EXPANDED) {
      setIsGridVisible(false);
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

      const startPixels = selectedRect.top - parentRect.top;
      const heightPixels = selectedRect.height;



      setHighlightBoundaries({ start: startPixels, height: heightPixels });
    }
  };

  const [audioTrackListDisplay, setAudioTrackListDisplay] = useState([]);

  useEffect(() => {

    if (audioLayers && audioLayers.length > 0) {


      const visibleAudioDisplay = audioLayers.map((audioTrack, index) => {
        return {
          ...audioTrack,
          isDisplaySelected: false,
        }
      });
      setAudioTrackListDisplay(visibleAudioDisplay);

    }
  }, [audioLayers]);


  // State to manage visible layers
  const [visibleLayersStartIndex, setVisibleLayersStartIndex] = useState(0);

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();


  const [selectedFrameRange, setSelectedFrameRange] = useState([0, totalDurationInFrames]);

  const [isDragging, setIsDragging] = useState(false);


  // State for grid visibility
  const [isGridVisible, setIsGridVisible] = useState(false);

  // Compute grid line positions
  const [gridLinePositionsInPixels, setGridLinePositionsInPixels] = useState([]);


  const onDragEnd = (result) => {
    setIsDragging(false);

    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Map visibleLayers indices to layers indices using unique IDs.
    const movedLayer = visibleLayers[sourceIndex];
    const destinationLayer = visibleLayers[destinationIndex];

    const movedLayerIndexInLayers = layers.findIndex(
      (layer) => layer._id === movedLayer._id
    );
    const destinationLayerIndexInLayers = layers.findIndex(
      (layer) => layer._id === destinationLayer._id
    );

    if (movedLayerIndexInLayers === destinationLayerIndexInLayers) {
      return;
    }

    // Create a new layers array.
    const newLayersOrder = Array.from(layers);

    // Remove the item from its original position.
    const [removed] = newLayersOrder.splice(movedLayerIndexInLayers, 1);

    // Insert the item at the new position.
    newLayersOrder.splice(destinationLayerIndexInLayers, 0, removed);

    // If there's a callback prop for layers order change, call it.
    if (props.onLayersOrderChange) {
      props.onLayersOrderChange(newLayersOrder, movedLayer._id);
    }
  };



  // Memoize visibleLayers to prevent unnecessary re-renders
  const visibleLayers = useMemo(() => {
    // Compute cumulative start frames
    const cumulativeStartFrames = [];
    let totalFrames = 0;
    layers.forEach((layer) => {
      cumulativeStartFrames.push(totalFrames);
      totalFrames += layer.duration * 30; // Convert to frames
    });

    // Find layers that overlap with selectedFrameRange
    const [startFrame, endFrame] = selectedFrameRange;

    const newVisibleLayers = [];
    for (let i = 0; i < layers.length; i++) {
      const layerStartFrame = cumulativeStartFrames[i];
      const layerEndFrame = layerStartFrame + layers[i].duration * 30;
      if (layerEndFrame > startFrame && layerStartFrame < endFrame) {
        newVisibleLayers.push(layers[i]);
      }
    }

    return newVisibleLayers;
  }, [layers, selectedFrameRange]);


  // Animation States
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(null); // 'prev' or 'next'
  const [incomingVisibleLayers, setIncomingVisibleLayers] = useState([]);

  const layerRefs = useRef({}); // Add this line to store refs to layer items
  const [popupPosition, setPopupPosition] = useState({ top: '50%', transform: 'translateY(-50%)' });

  // New state variables for duration change
  const [pendingDuration, setPendingDuration] = useState(null);
  const [durationChanged, setDurationChanged] = useState(false);

  const [isExpandedTrackView, setIsExpandedTrackView] = useState(false);


  // Refs for layers
  const currentLayersRef = useRef(null);
  const incomingLayersRef = useRef(null);

  // Popup ref
  const popupRef = useRef(null);

  // Compute whether we can navigate further
  const canGoPrev = visibleLayersStartIndex > 0;
  const canGoNext = visibleLayersStartIndex + MAX_VISIBLE_LAYERS < layers.length;

  // Handle Previous Click
  const handlePrevClick = () => {
    if (!canGoPrev || isAnimating) return;

    const numLayersToMove = Math.min(3, visibleLayersStartIndex);
    const newStartIndex = visibleLayersStartIndex - numLayersToMove;
    const newVisibleLayers = layers.slice(newStartIndex, newStartIndex + MAX_VISIBLE_LAYERS);

    setIncomingVisibleLayers(newVisibleLayers);
    setAnimationDirection('prev');
    setIsAnimating(true);
  };

  // Handle Next Click
  const handleNextClick = () => {
    if (!canGoNext || isAnimating) return;

    const numLayersToMove = Math.min(
      3,
      layers.length - (visibleLayersStartIndex + MAX_VISIBLE_LAYERS)
    );
    const newStartIndex = visibleLayersStartIndex + numLayersToMove;
    const newVisibleLayers = layers.slice(newStartIndex, newStartIndex + MAX_VISIBLE_LAYERS);

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
  }, [selectedLayerIndex, effectiveVisibleDisplaySliderRange,
    frameToolbarView,
    layers,

  ]);


  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
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
    if (parentRef.current && visibleLayers && visibleLayers.length > 0) {
      const parentHeight = parentRef.current.clientHeight;
      const totalVisibleDuration = visibleLayers.reduce(
        (acc, layer) => acc + layer.duration,
        0
      );

      let cumulativeHeight = 0;
      const positions = [];
      const borderHeight = 2; // Adjust if your borders have different sizes

      visibleLayers.forEach((layer) => {
        const layerHeightPercentage = layer.duration / totalVisibleDuration;
        const layerHeightInPixels = layerHeightPercentage * parentHeight - borderHeight;

        positions.push(cumulativeHeight);
        cumulativeHeight += layerHeightInPixels + borderHeight; // Include borders in cumulativeHeight
      });

      positions.push(cumulativeHeight);
      setGridLinePositionsInPixels(positions);
    }
  }, [parentRef.current, visibleLayers, frameToolbarView]); // Add frameToolbarView


  useEffect(() => {
    setHighlightBoundaries(null);
  }, [isExpandedTrackView, layers, totalDurationInFrames]);



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
        setVisibleLayersStartIndex((prevIndex) =>
          animationDirection === 'next' ? prevIndex + 3 : prevIndex - 3
        );
        setIsAnimating(false);
        setAnimationDirection(null);
        setIncomingVisibleLayers([]);

        // Reset styles
        currentLayersRef.current.style.transform = '';
        currentLayersRef.current.style.transition = '';
        incomingLayersRef.current.style.transform = '';
        incomingLayersRef.current.style.transition = '';

        // Reset currentLayerSeek and selectedLayerIndex if out of range
        const newSelectedIndex =
          animationDirection === 'next'
            ? visibleLayersStartIndex + 3
            : visibleLayersStartIndex - 3;

        if (
          selectedLayerIndex < newSelectedIndex ||
          selectedLayerIndex >= newSelectedIndex + MAX_VISIBLE_LAYERS
        ) {
          setSelectedLayerIndex(newSelectedIndex);
          setSelectedLayer(layers[newSelectedIndex]);
        }

        // Adjust currentLayerSeek to the start of the new visible range
        if (!isLayerSeeking) {
          const visibleStartTime = layers
            .slice(0, newSelectedIndex)
            .reduce((acc, layer) => acc + layer.duration, 0);
          setCurrentLayerSeek(Math.floor(visibleStartTime * 30));
        }
      }, 500); // Duration should match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [
    isAnimating,
    incomingVisibleLayers,
    animationDirection,
    visibleLayersStartIndex,
    layers,
    selectedLayerIndex,
    setSelectedLayerIndex,
    setSelectedLayer,
    setCurrentLayerSeek,
    isLayerSeeking,
  ]);

  useEffect(() => {
    const [startFrame, endFrame] = selectedFrameRange;


    const visibleStartTime = startFrame / 30;
    const visibleEndTime = endFrame / 30;

    setEffectiveVisibleDisplaySliderRange([startFrame, endFrame]);

    // Set visible start and end times in seconds
    setVisibleStartTime(visibleStartTime);
    setVisibleEndTime(visibleEndTime);

    // Adjust currentLayerSeek if it moves out of the new visible range
    if (!isLayerSeeking && (currentLayerSeek < startFrame || currentLayerSeek > endFrame)) {
      setCurrentLayerSeek(startFrame);
    }

  }, [selectedFrameRange, currentLayerSeek, isLayerSeeking, isExpandedTrackView,
    totalDurationInFrames, layers]);




  useEffect(() => {
    const [startFrame, endFrame] = selectedFrameRange;
    let newEndFrame = endFrame;

    // Ensure endFrame does not exceed totalDurationInFrames

    newEndFrame = totalDurationInFrames;

    // Optionally, ensure startFrame does not exceed newEndFrame
    let newStartFrame = startFrame;
    if (newStartFrame > newEndFrame) {
      newStartFrame = 0; // or set to newEndFrame, depending on your needs
    }

    if (newStartFrame !== startFrame || newEndFrame !== endFrame) {
      setSelectedFrameRange([newStartFrame, newEndFrame]);
    }
  }, [totalDurationInFrames, layers]);



  useEffect(() => {
    if (selectedLayerIndex >= 0 && parentRef.current && visibleLayers.length > 0) {
      const selectedLayerId = layers[selectedLayerIndex]._id.toString();
      const selectedLayerElement = layerRefs.current[selectedLayerId];
      if (selectedLayerElement) {
        updateLayerDurations();
      }
    }
  }, [dragAmount, selectedLayerIndex, layers, visibleLayers]);



  const toggleShowExpandedTrackView = () => {



    setIsExpandedTrackView(!isExpandedTrackView);
    showAudioTrackView();
  }

  const updateLayerDurations = () => {
    if (selectedLayerIndex >= 0 && visibleLayers && visibleLayers.length > 0) {
      // Find the selected layer ID
      const selectedLayerId = layers[selectedLayerIndex]._id;

      // Find the index of the selected layer in visibleLayers
      const visibleLayerIndex = visibleLayers.findIndex(layer => layer._id === selectedLayerId);

      if (visibleLayerIndex >= 0) {
        // Calculate start duration using visibleLayers up to the selected layer
        const startDuration = visibleLayers
          .slice(0, visibleLayerIndex)
          .reduce((acc, layer) => acc + layer.duration, 0);

        const currentLayerDuration =
          pendingDuration != null ? pendingDuration : visibleLayers[visibleLayerIndex].duration;

        setStartSelectDurationInFrames(startDuration * 30);
        const endDurationInFrames = (startDuration + currentLayerDuration) * 30;


        setEndSelectDurationInFrames(Math.floor(endDurationInFrames));

      } else {
        // If the selected layer is not in visibleLayers
        setStartSelectDurationInFrames(0);
        setEndSelectDurationInFrames(0);
      }
    }
  };



  const previousSnappedStartFrameRef = useRef(selectedFrameRange[0]);
  const previousSnappedEndFrameRef = useRef(selectedFrameRange[1]);

  const handleViewRangeSliderChange = (val) => {
    // Precompute cumulative start and end frames
    const cumulativeStartFrames = [];
    const cumulativeEndFrames = [];
    let totalFrames = 0;

    layers.forEach(layer => {
      cumulativeStartFrames.push(totalFrames);
      totalFrames += layer.duration * 30; // Convert duration to frames
      cumulativeEndFrames.push(totalFrames);
    });

    // For val[0], find the cumulative start frame to snap to
    const startFrame = val[0];
    let snappedStartFrame = cumulativeStartFrames[0];
    for (let i = 0; i < cumulativeStartFrames.length; i++) {
      if (cumulativeStartFrames[i] <= startFrame) {
        snappedStartFrame = cumulativeStartFrames[i];
      } else {
        break;
      }
    }

    // For val[1], find the cumulative end frame to snap to
    const endFrame = val[1];
    let snappedEndFrame = cumulativeEndFrames[cumulativeEndFrames.length - 1];
    for (let i = 0; i < cumulativeEndFrames.length; i++) {
      if (cumulativeEndFrames[i] >= endFrame) {
        snappedEndFrame = cumulativeEndFrames[i];
        break;
      }
    }

    // Update only if the snapped values have changed
    if (
      snappedStartFrame !== previousSnappedStartFrameRef.current ||
      snappedEndFrame !== previousSnappedEndFrameRef.current
    ) {
      previousSnappedStartFrameRef.current = snappedStartFrame;
      previousSnappedEndFrameRef.current = snappedEndFrame;

      setSelectedFrameRange([snappedStartFrame, snappedEndFrame]);
    }
  };



  const layerDurationUpdated = (val) => {
    const newDurationInFrames = val[1] - val[0];
    const newDuration = newDurationInFrames / 30;

    setPendingDuration(newDuration);
    setDurationChanged(true);
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

    // Here is where we now include clipStart
    const clipPayload = {
      clipStart: clipStart,
      clipEnd: clipEnd,
      clipStartFrames: clipStartValue,
      clipEndFrames: clipEndValue,
    }
    updateSessionLayer(layer, clipPayload);  // <--- pass it along

    if (pendingDuration != null) {
      setPendingDuration(null);
      setDurationChanged(false);
      setOpenPopupLayerIndex(null);
    }
  };


  const onClosePopup = () => {
    setPendingDuration(null);
    setDurationChanged(false);
    setOpenPopupLayerIndex(null);
  };

  const removeLayer = (index) => {
    if (!layers || layers.length === 0) return;
    removeSessionLayer(index);
    setPendingDuration(null);
    setDurationChanged(false);
    setOpenPopupLayerIndex(null); // Close the popup when layer is removed
  };


  const setSelectedLayerDurationRange = (val) => {

    const newStartFrame = val[0];
    const newEndFrame = val[1];


    if (newStartFrame !== startSelectDurationInFrames) {
      setClipStart(true);
      const clipStartValue = Math.floor(newStartFrame - startSelectDurationInFrames);

      setClipStartValue(clipStartValue)
    } else {
      setClipStart(false);
    }
    if (newEndFrame !== endSelectDurationInFrames) {


      const clipEndValue = Math.floor(endSelectDurationInFrames - newEndFrame);
      if (clipEndValue > 0) {

        setClipEnd(true);

        setClipEndValue(clipEndValue)
      }

    } else {
      setClipEnd(false);
    }

    const newDurationInFrames = newEndFrame - newStartFrame;
    const newDuration = newDurationInFrames / 30;

    setPendingDuration(newDuration);
    setDurationChanged(true);
  };




  useEffect(() => {
    if (openPopupLayerIndex !== null) {
      // Identify which layer is selected in the *entire* layers array
      const popupLayerId = layers[openPopupLayerIndex]._id.toString();

      // Find that same layer inside the visibleLayers array.
      const foundIndexInVisibleLayers = visibleLayers.findIndex(
        (vl) => vl._id.toString() === popupLayerId
      );

      // If it’s not found, we can’t position properly
      if (foundIndexInVisibleLayers === -1) return;

      // Get the DOM rect of the clicked layer
      const layerElement = layerRefs.current[popupLayerId];
      if (!layerElement) return;

      const rect = layerElement.getBoundingClientRect();

      // By default, position “next to” the layer. For instance:
      const defaultLeft = rect.right + 10;
      // Or any offset that makes sense for “next to”
      const defaultTop = rect.top + window.scrollY;

      // Decide if the layer is among the last two in the *visible* list
      const isLast =
        foundIndexInVisibleLayers >= visibleLayers.length - 1;

      if (isLast) {
        // For the last two, align the portal to the top of the layer.
        setPopupPosition({
          top: `${defaultTop - 50}px`,
          left: `${defaultLeft}px`,
          transform: 'translateY(0)',
        });
      } else {
        // For everything else, position the popup “next to” the layer.
        setPopupPosition({
          top: `${defaultTop}px`,
          left: `${defaultLeft}px`,
          transform: 'translateY(0)',
        });
      }
    }
  }, [openPopupLayerIndex, visibleLayers, layers]);




  const setSelectedLayerToBeDragged = () => {


  }

  const handleVolumeChangeHandler = (e, selectedTrackId) => {

    const payload = {
      newVolume: parseFloat(e.target.value),
      selectedTrackId: selectedTrackId,

    }

    handleVolumeChange(payload);
  }

  const handleStartTimeChangeHandler = (e, selectedTrackId) => {



    const payload = {
      newStartTime: parseFloat(e.target.value),
      selectedTrackId: selectedTrackId,

    }
    handleStartTimeChange(payload);
  }

  const handleEndTimeChangeHandler = (e, selectedTrackId) => {

    const payload = {
      newEndTime: parseFloat(e.target.value),
      selectedTrackId: selectedTrackId,
    }
    handleEndTimeChange(payload);
  }


  const showSelectedAudioTrack = () => {
    const selectedAudioTrack = audioTrackListDisplay.find(
      (audioTrack) => audioTrack.isDisplaySelected || audioTrack.isSelected
    );

    if (!selectedAudioTrack) {
      return <span />;
    }

    // Only first 4 words of the prompt
    const shortPrompt = selectedAudioTrack.prompt
      ? selectedAudioTrack.prompt.split(' ').slice(0, 4).join(' ') + '...'
      : '';

    return (
      <div className="flex">
        <form onSubmit={updateChangesToActiveAudioLayers} className="w-full">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Audio Type (uppercase + bold) */}

            <div>

              <span className="uppercase font-bold text-blue-300 text-xs block">
                {selectedAudioTrack.generationType}
              </span>

              {/* Speaker (if available) */}
              {selectedAudioTrack.speakerCharacterName && (
                <span className="italic text-neutral-400">
                  {selectedAudioTrack.speakerCharacterName}
                </span>
              )}
            </div>

            {/* Short Prompt */}
            {shortPrompt && (
              <span className="text-neutral-200 text-xs w-16">"{shortPrompt}"</span>
            )}



            {/* Hidden input to pass the layer ID */}
            <input
              type="hidden"
              name="layerId"
              value={selectedAudioTrack._id.toString()}
            />

            {/* Start Time */}
            <label className="inline-block font-semibold">S:</label>
            <input
              type="number"
              value={selectedAudioTrack.startTime}
              className={`w-[40px] ${bgColor} rounded-sm p-1`}
              onChange={(e) => handleStartTimeChangeHandler(e, selectedAudioTrack._id)}
            />

            {/* End Time */}
            <label className="inline-block font-semibold">E:</label>
            <input
              type="number"
              value={selectedAudioTrack.endTime}
              className={`w-[40px] ${bgColor} rounded-sm p-1`}
              onChange={(e) => handleEndTimeChangeHandler(e, selectedAudioTrack._id)}
            />

            {/* Volume */}
            <label className="inline-block font-semibold">V:</label>
            <input
              type="number"
              defaultValue={selectedAudioTrack.volume}
              className={`w-[40px] ${bgColor} rounded-sm p-1`}
              onChange={(e) => handleVolumeChangeHandler(e, selectedAudioTrack._id)}
            />

            {/* Update */}
            <SecondaryButton type="submit" extraClasses="px-2 py-1">
              Update
            </SecondaryButton>

            {/* Remove */}
            <button
              type="button"
              className="bg-red-800 text-white px-2 py-1 rounded-sm flex items-center  inline-flex"
              onClick={() => removeAudioLayer(selectedAudioTrack)}
            >
              <FaTimes className="mr-1" />
              Remove
            </button>
          </div>
        </form>
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

  let layerSelectOverlay = null;

  // Calculate totalVisibleDuration and totalVisibleDurationInFrames
  const totalVisibleDuration = visibleLayers.reduce((acc, layer) => acc + layer.duration, 0);
  const totalVisibleDurationInFrames = Math.floor(totalVisibleDuration * 30);


  let sliderStartRange = startSelectDurationInFrames > 0 ? startSelectDurationInFrames : 0;
  let sliderEndRange = totalVisibleDurationInFrames;



  if (!isDragging && highlightBoundaries && highlightBoundaries.height > 0) {
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
          className='absolute w-full'
          style={{
            top: `${highlightBoundaries.start}px`,
            bottom: '0',
          }}
        >
          <RangeOverlaySlider
            onChange={setSelectedLayerDurationRange}
            min={sliderStartRange}
            max={sliderEndRange}
            value={[startSelectDurationInFrames, endSelectDurationInFrames]}
            highlightBoundaries={highlightBoundaries}
            layerDurationUpdated={layerDurationUpdated}
            onDragAmountChange={(amount) => {
              setDragAmount(amount);
            }}
            onBeforeChange={setSelectedLayerToBeDragged}
          />
        </div>
      </div>
    );
  }


  // Prepare layersList with current and incoming layers
  let layersList = <span />;

  const setUserSelectedLayer = (e, originalIndex, layer) => {

    e.stopPropagation();
    setSelectedLayerIndex(originalIndex);
    setSelectedLayer(layer);
    setOpenPopupLayerIndex(originalIndex);
    setPendingDuration(null);
  }

  if (visibleLayers.length > 0) {
    const totalVisibleDuration = visibleLayers.reduce(
      (acc, layer) => acc + layer.duration,
      0
    );


    const renderLayers = (layersToRender, keyPrefix) => {
      const parentHeight = parentRef.current ? parentRef.current.clientHeight : 500; // Default height if null

      return layersToRender.map((layer, index) => {
        const originalIndex = layers.findIndex((l) => l._id === layer._id);
        const layerDuration = layer.duration; // in seconds
        let layerHeightPercentage = 0;

        if (totalVisibleDuration > 0) {
          layerHeightPercentage = layerDuration / totalVisibleDuration;
        }

        // Calculate pixel height
        const layerHeightInPixels = layerHeightPercentage * parentHeight;

        const bgSelected = selectedLayerIndex === originalIndex ? bgSelectedColor : '';

        const layerId = layer._id.toString();

        return (
          <Draggable key={layer._id} draggableId={layer._id.toString()} index={index} className="layer-draggable-item">
            {(provided, snapshot) => {
              const layerItem = (
                <div
                  ref={(el) => {
                    layerRefs.current[layerId] = el;
                    provided.innerRef(el);
                  }}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`${bg3Color} ${bgSelected} ml-1 mr-1 cursor-pointer border-t ${borderColor} border-b ${borderColor} relative`}
                  style={{
                    height: `${layerHeightInPixels}px`,
                    maxHeight: `${layerHeightInPixels}px`,
                    boxSizing: 'border-box', // Include borders in height
                    ...provided.draggableProps.style,
                  }}
                  onClick={(e) => {
                    setUserSelectedLayer(e, originalIndex, layer);
                  }}
                >
                  {/* Labels */}
                  <div className='absolute top-1 left-1 text-xs'>
                    <div className='text-xs font-bold mb-4'>{originalIndex + 1}</div>
                    <div>{layerDuration ? layerDuration.toFixed(1) : '3'}s</div>
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
              className='layers-container relative h-full w-full '
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
                className='current-layers absolute top-0 left-0 w-full h-full'
                ref={currentLayersRef}
              >
                {renderLayers(visibleLayers, 'current')}
                {provided.placeholder}
              </div>

              {/* Incoming Layers */}
              {isAnimating && incomingVisibleLayers.length > 0 && (
                <div
                  className='incoming-layers absolute top-0 left-0 w-full h-full'
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


  const [showVerticalWaveform, setShowVerticalWaveform] = useState(false);

  const musicAudioLayer = audioLayers.find((layer) => layer.generationType === 'music');



  const audioLocalLink = musicAudioLayer ? musicAudioLayer.selectedLocalAudioLink : null;

  const audioUrl = `${PROCESSOR_API_URL}/${audioLocalLink}`;


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


  const setTextTrackDisplayAsSelected = (selectedTextItem) => {
    // Select the text track
    setSelectedTextTrackDisplay(selectedTextItem);
    // Clear any previously selected animation since we are now focusing on the text track level
    setSelectedAnimation(null);
  };

  const showAddedAudioTracks = () => {
    const [visibleStartFrame, visibleEndFrame] = selectedFrameRange;

    // Convert frames to seconds
    const visibleStartTime = visibleStartFrame / 30;
    const visibleEndTime = visibleEndFrame / 30;

    // Filter audio tracks within the visible range
    const visibleAudioLayers = audioTrackListDisplay.filter((audioTrack) => {
      const audioStartFrame = audioTrack.startTime * 30;
      const audioEndFrame = audioTrack.endTime * 30;
      return audioEndFrame >= visibleStartFrame || audioStartFrame <= visibleEndFrame;
    });

    return visibleAudioLayers.map(function (audioTrack) {

      const audioStartFrame = audioTrack.startTime * 30;
      const audioEndFrame = audioTrack.endTime * 30;

      let isStartVisible = audioStartFrame >= visibleStartFrame;
      let isEndVisible = audioEndFrame <= visibleEndFrame;

      return <AudioTrackSlider
        key={audioTrack._id}
        audioTrack={audioTrack}
        onUpdate={updateAudioLayer}
        selectedFrameRange={selectedFrameRange} // Pass the visible range here
        isStartVisible={isStartVisible}
        isEndVisible={isEndVisible}
        setAudioRangeSliderDisplayAsSelected={setAudioRangeSliderDisplayAsSelected}
        totalDuration={totalDuration}
      />
    });
  };

  // Inside FrameToolbar.js

  const showAddedTextTracks = () => {

    let textItemLayers = [];

    let visibleLayersWithTextItems = layers.filter((layer) => {
      let layerActiveItems = layer.imageSession.activeItemList;


      if (layerActiveItems && layerActiveItems.length > 0) {
        let layerTextItems = layerActiveItems.filter((item) => {
          if (item.type === 'text' && item.subType !== 'subtitle') {



            if (typeof item.startFrame === 'undefined' || typeof item.endFrame === 'undefined') {
              item.startFrame = layer.durationOffset * 30;
              item.endFrame = (layer.durationOffset + layer.duration) * 30;
            }
            const layerStartTime = layer.durationOffset;
            const layerEndTime = layer.durationOffset + layer.duration;
            const parentLayerStartFrame = layerStartTime * 30;
            const parentLayerEndFrame = layerEndTime * 30;
            const textItemObject = {
              ...item,
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

    return textItemLayers.map((textItemLayer, index) => {
      let isTextTrackSelected = false;
      if (textItemLayer && selectedTextTrackDisplay && textItemLayer.layerId === selectedTextTrackDisplay.layerId && textItemLayer.id === selectedTextTrackDisplay.id) {
        isTextTrackSelected = true;
      }

      return <TextTrackDisplay
        key={`text_item_${index}`}
        textItemLayer={textItemLayer}
        totalDuration={totalDuration}
        selectedFrameRange={selectedFrameRange}

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

  let containerWdidth = 'w-[10%] z-1 opacity-100';
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    containerWdidth = 'min-w-[50%] max-w-[90%] overflow-x-auto z-[102]';
  }

  let audioTrackViewDisplay = <span />;
  let audioSelectedTrackViewDisplay = <span />;

  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    if (currentLayerActionSuperView === 'AUDIO') {
      audioTrackViewDisplay = showAddedAudioTracks();
      audioSelectedTrackViewDisplay = showSelectedAudioTrack();
    }
    if (currentLayerActionSuperView === 'TEXT') {
      audioTrackViewDisplay =
        <span className='text-track-container'>
          {showAddedTextTracks()}
        </span>


      audioSelectedTrackViewDisplay = showSelectedTextTrack();
    }
  }

  let mtop = 'mt-[52px]';
  let expandButtonLabel = (
    <div className='relative w-full cursor-pointer pb-1 block  bg-neutral-900'>
      <div className='inline-block'>Expand</div>
      <FaChevronRight className='inline-block ml-1 mr-1 text-xs font-bold mt-[-2px] ' />
    </div>
  );

  const [showUpdateLayerPortal, setShowUpdateLayerPortal] = useState(true);


  const toggleViewSceneUpdate = () => {
    setShowUpdateLayerPortal(!showUpdateLayerPortal);
  }

  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    expandButtonLabel = (

      <div className='absolute right-0 top-0 w-32 cursor-pointer pb-1 block  bg-neutral-950 '>
        <FaChevronLeft className='inline-block ml-1 mr-1 text-xs font-bold mt-[-2px] ' />
        <div className='inline-block'>Collapse</div>
      </div>

    );
  }

  let textActiveColor = 'text-neutral-900';
  if (showUpdateLayerPortal) {
    textActiveColor = 'text-neutral-100';
  }



  let topSubToolbar = (
    <div className='flex flex-row w-full'>
      <div className={`basis-3/4 font-bold ml-0 text-sm mt-1`}>
        <div>Scenes</div>
        <div>
          <FaChevronUp
            className={`inline-flex ${canGoPrev ? '' : 'opacity-50 cursor-not-allowed'}`}
            onClick={canGoPrev ? handlePrevClick : null}
          />
          <FaChevronDown
            className={`inline-flex ${canGoNext ? '' : 'opacity-50 cursor-not-allowed'}`}
            onClick={canGoNext ? handleNextClick : null}
          />
          <FaEye className={`inline-flex ml-2 cursor-pointer ${textActiveColor}`} onClick={toggleViewSceneUpdate} />

        </div>
      </div>

      <div className='basis-1/4'>
        <DropdownButton
          addLayerToComposition={addLayerToComposition}
          copyCurrentLayerBelow={copyCurrentLayerBelow}
          showBatchLayerDialog={showBatchLayerDialog}
        />
      </div>
    </div>
  );


  let showGridsView = <span />;
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    showGridsView = (
      <div className='inline-block  ml-2 pt-1'>
        <input
          type="checkbox"
          className='inline-flex'
          checked={isGridVisible}
          onChange={(e) => setIsGridVisible(e.target.checked)}
        />
        <label className='text-xs inline-flex ml-2'>Grids</label>
      </div>
    );
  }


  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    topSubToolbar = (
      <div className='flex flex-row w-full'>
        <div className='basis-1/4 font-bold ml-0 text-sm mt-1'>
          <div className="inline-flex">


            <div>Scenes</div>
            <div>
              <FaChevronUp
                className={`inline-flex ${canGoPrev ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={canGoPrev ? handlePrevClick : null}
              />
              <FaChevronDown
                className={`inline-flex ${canGoNext ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={canGoNext ? handleNextClick : null}
              />
            </div>
          </div>
          {showGridsView}
        </div>
        <div className='basis-3/4'>
          {audioSelectedTrackViewDisplay}
        </div>

        <div className='float-right'>
          <DropdownButton
            addLayerToComposition={addLayerToComposition}
            copyCurrentLayerBelow={copyCurrentLayerBelow}
            showBatchLayerDialog={showBatchLayerDialog}
          />
        </div>

      </div>
    )

  }

  let prevDownloadLink = <span />;

  if (downloadLink) {
    const dateNowStr = new Date().toISOString().replace(/:/g, '-');
    prevDownloadLink = (
      <SecondaryButton>
        <a
          href={downloadLink}
          download={`Rendition_${dateNowStr}.mp4`}
          className='text-xs underline mt-2 mb-1 ml-2'
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
  if (downloadLink) {
    additionalActionToolbar = (
      <div className='mt-2'>
        <div >
          <SecondaryButton onClick={publishVideoSession} >
            Publish
          </SecondaryButton>
        </div>
      </div>
    )
  }

  const submitDownloadVideo = () => {
    const a = document.createElement('a');
    a.href = downloadLink;
    a.download = `Rendition_${new Date().toISOString()}.mp4`;
    a.click();

  }

  const dropdownItems = [];
  if (downloadLink) {
    dropdownItems.push({
      label: "Download",
      onClick: () => {
        // e.g., force a programmatic download or do nothing 
        // Typically you'd just do an <a href> but if you want a manual approach:
        const a = document.createElement('a');
        a.href = downloadLink;
        a.download = `Rendition_${new Date().toISOString()}.mp4`;
        a.click();
      },
    });
  }

  dropdownItems.push({
    label: "Publish",
    onClick: () => {
      // open your Publish dialog
      showPublishOptionsDialog();
    },
  });

  let submitRenderDisplay = (
    <div>
      <CommonButton onClick={submitRenderVideo} isPending={isVideoGenerating} extraClasses={renderButtonExtraClasss}>
        Render
      </CommonButton>
    </div>
  );

  if (renderedVideoPath && !isCanvasDirty) {


    submitRenderDisplay = (
      <div>

        <CommonDropdownButton
          mainLabel="Download"
          onMainClick={submitDownloadVideo}
          isPending={isVideoGenerating}
          dropdownItems={dropdownItems}
          extraClasses="my-extra-class-names"
        />

      </div>
    );
  } else if (downloadLink) {
    submitRenderDisplay = (
      <div className="relative inline-block text-left">
        <CommonDropdownButton
          mainLabel="Render"
          onMainClick={submitRenderVideo}
          isPending={isVideoGenerating}
          dropdownItems={dropdownItems}
          extraClasses="my-extra-class-names"
        />
      </div>
    );

  }


  let submitRenderFullActionDisplay = submitRenderDisplay;

  const handleAudioOptionsSubmit = ({ isAudioDucking, syncAnimations, syncLayers, applyAudioVisualizer }) => {
    setIsAudioDuckingEnabled(isAudioDucking);

    if (syncAnimations && syncLayers) {
      applySynchronizeLayersAndAnimationsToBeats();
    } else if (syncAnimations) {
      applySynchronizeAnimationsToBeats();
    } else if (syncLayers) {
      applySynchronizeLayersToBeats();
    } else if (applyAudioVisualizer) {
      applyAudioTrackVisualizerToProject();
    }
    closeAlertDialog();
  };

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
          onSubmit={handleAudioOptionsSubmit}
          initialDucking={isAudioDuckingEnabled}
          closeDialog={closeAlertDialog}
          regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
        />
      </div>
    );
  };

  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    submitRenderFullActionDisplay = (
      <div className='flex'>
        <div className='inline-flex'>{submitRenderDisplay}</div>
        <div className='inline-flex'>
          <div className='grid grid-cols-4'>
            <SecondaryButton onClick={submitRegenerateFrames}>
              <div>
                {' '}
                <FaRedo className='inline-flex' /> frames
              </div>
            </SecondaryButton>

            {prevDownloadLink}

            <SecondaryButton onClick={() => setShowVerticalWaveform(!showVerticalWaveform)}>
              {showVerticalWaveform ? 'Hide Waveform' : 'Show Waveform'}
            </SecondaryButton>


            <SecondaryButton onClick={showAdditionOptionsDialog}>
              Additional Options
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  const handleSeekBarChange = (value) => {
    setCurrentLayerSeek(value);

    // Compute cumulative start frames
    const cumulativeStartFrames = [];
    let totalFrames = 0;
    layers.forEach((layer) => {
      cumulativeStartFrames.push(totalFrames);
      totalFrames += layer.duration * 30; // Convert duration to frames
    });

    // Find the layer corresponding to the current seek position
    let layerIndex = layers.length - 1; // Default to last layer
    for (let i = 0; i < cumulativeStartFrames.length; i++) {
      const layerStart = cumulativeStartFrames[i];
      const layerEnd = layerStart + layers[i].duration * 30;
      if (value >= layerStart && value < layerEnd) {
        layerIndex = i;
        break;
      }
    }

    setSelectedLayerIndex(layerIndex);
    setSelectedLayer(layers[layerIndex]);
  };





  // Hide the popup when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        openPopupLayerIndex !== null &&
        !durationChanged // Do not close if duration has changed
      ) {
        setOpenPopupLayerIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopupLayerIndex, durationChanged]);

  let mtContainer = 'mt-[50px]';
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    mtContainer = 'mt-0';
  }

  let sliderContainerHeight = 'h-[74vh]';
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    sliderContainerHeight = 'h-[82vh]';
  }

  let buttonGroupMT = 'mt-2';
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    buttonGroupMT = 'mt-2';
  }

  let trackSliderML = 'ml-[30px]';
  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    trackSliderML = 'ml-[10px]';
  }


  const gridLines = gridLinePositionsInPixels.map((position, index) => (
    <div
      key={index}
      style={{
        position: 'absolute',
        top: `${position}px`,
        left: '0.25rem', // Matches 'ml-1'
        width: 'calc(50vw)', // Subtracts 'ml-1' and 'mr-1'
        borderTop: '1px solid gray',
        pointerEvents: 'none',
      }}
    />
  ));



  let layerActionCurrentView = <span />;

  if (frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED) {
    // Define the base class name for the tab buttons
    const baseTabClassName =
      'ml-2 mr-2 pt-2 rounded-b-lg cursor-pointer expanded-menu-item';

    // Conditional class for the "Audio" tab
    const audioTabClassName = `${currentLayerActionSuperView === 'AUDIO'
      ? 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white'
      : 'bg-gray-700 text-gray-300'
      } ${baseTabClassName}`;

    // Conditional class for the "Text" tab
    const textTabClassName = `${currentLayerActionSuperView === 'TEXT'
      ? 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white'
      : 'bg-gray-700 text-gray-300'
      } ${baseTabClassName}`;

    // Update the JSX to use the computed class names
    layerActionCurrentView = (
      <div className="">
        <div className="grid grid-cols-3 h-8">
          {/* Audio Tab */}
          <div
            className={audioTabClassName}
            onClick={() => setCurrentLayerActionSuperView('AUDIO')}
          >
            <div className="text-xs font-bold">Audio</div>
          </div>
          {/* Text Tab */}
          <div
            className={textTabClassName}
            onClick={() => setCurrentLayerActionSuperView('TEXT')}
          >
            <div className="text-xs font-bold">Text</div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      className={` shadow-lg m-auto fixed top-0 ${containerWdidth} ${textColor}
       text-left left-0 toolbar-container `}
    >
      <div className={`${mtContainer}`}>
        <div className={`w-full pb-1 border-r-2 ${bgColor} border-stone-600`}>
          <div>
            <div className=' m-auto text-center'>
              {layerActionCurrentView}
              <div onClick={toggleShowExpandedTrackView} className='m-auto'>
                {expandButtonLabel}
              </div>
            </div>

            <div className='btn-container flex-w-full ml-2 mb-1'>
              <div className={`basis-1/2 inline-flex ${buttonGroupMT}`}>
                {submitRenderFullActionDisplay}
              </div>
            </div>

            <div>
              <div className={`flex w-full ${bg2Color} p-1`}>
                <div className='inline-flex w-full'>
                  {topSubToolbar}
                </div>
              </div>
            </div>
          </div>

          <div className={`${sliderContainerHeight} w-full flex flex-row pl-1`}>
            <div className='text-xs font-bold basis-1/4'>
              <div className='relative h-full'>
                {/* Previous and Next buttons */}
                <div className='relative h-full w-full overflow-y-clip' ref={parentRef}>
                  {layersList}
                  {layerSelectOverlay}


                  {isGridVisible && (
                    <div
                      className='grid-overlay absolute top-0 left-0 w-full h-full pointer-events-none'
                      style={{ zIndex: 1 }}
                    >
                      {gridLines}
                    </div>
                  )}


                </div>
              </div>
            </div>
            <div className='basis-3/4'>
              <div className='flex flex-row h-full'>
                {showVerticalWaveform && audioUrl && frameToolbarView === FRAME_TOOLBAR_VIEW.EXPANDED && (
                  <div className='inline-flex h-full'>
                    <VerticalWaveform
                      audioUrl={audioUrl}
                      totalDuration={totalDuration}
                      viewRange={effectiveVisibleDisplaySliderRange}
                    />
                  </div>
                )}

                <div className={`inline-flex h-full ${trackSliderML}`}>


                  <ReactSlider
                    key={`slider_layer_seek`}
                    className="modern-vertical-slider-seek"
                    thumbClassName="thumb"
                    trackClassName="track"
                    orientation="vertical"
                    min={effectiveVisibleDisplaySliderRange[0]}
                    max={effectiveVisibleDisplaySliderRange[1]}
                    value={currentLayerSeek}
                    onChange={(value) => {
                      handleSeekBarChange(value);
                    }}
                    onBeforeChange={() => setIsLayerSeeking(true)}
                    onAfterChange={() => setIsLayerSeeking(false)}
                  />
                </div>

                {audioTrackViewDisplay}



                <div className='inline-flex dual-thumb h-auto w-[30px] ml-1'>
                  <DualThumbSlider
                    key={`dk_${totalDurationInFrames}`}
                    min={0}
                    max={totalDurationInFrames}
                    value={effectiveVisibleDisplaySliderRange}
                    onChange={handleViewRangeSliderChange}
                  />
                </div>

                <div className='inline-flex h-full'>
                  <TimeRuler
                    totalDuration={totalDuration}
                    visibleStartTime={visibleStartTime}
                    visibleEndTime={visibleEndTime}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openPopupLayerIndex !== null && showUpdateLayerPortal &&
        createPortal(
          <div
            className={`fixed z-[200] p-1 rounded-lg ${bg3Color} shadow-lg border border-neutral-500`}
            style={{
              top: popupPosition.top, // Use the calculated top position
              left: '100px',
              transform: popupPosition.transform, // Remove the translateY(-50%)
              width: '150px',

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
                <label className='inline-block text-xs text-white ml-[-30px]'>s</label>
              </div>
              {durationChanged && (
                <div className='mt-1 mb-2'>
                  <button
                    onClick={onUpdateDuration}
                    className={`px-4 py-2 mt-1 text-xs text-white rounded bg-gray-900 m-auto ${durationChanged ? 'highlight' : ''
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
    </div>
  );
}
