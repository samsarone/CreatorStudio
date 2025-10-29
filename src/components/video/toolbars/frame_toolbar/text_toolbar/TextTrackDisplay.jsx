import React, { useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import { FaGripLines } from 'react-icons/fa6';
import './textTrackDisplay.css';
import TextAnimationTrackDisplay from './TextAnimationTrackDisplay.jsx';

const TextTrackDisplay = (props) => {
  const {
    textItemLayer,
    onUpdate,
    selectedFrameRange,
    setTextTrackDisplayAsSelected,
    newSelectedTextAnimation,
    showTextTrackAnimations,
    onAnimationSelect,
    isDisplaySelected,
    updateTrackAnimationBoundariesForTextLayer,
    parentLayerStartFrame,
    parentLayerEndFrame,
  } = props;

  const [textItemInState, setTextItemInState] = useState(textItemLayer);
  const [selectedAnimationInTextTrack, setSelectedAnimationInTextTrack] = useState(null);

  useEffect(() => {
    setTextItemInState(textItemLayer);
  }, [textItemLayer]);

  const textItemId = textItemLayer.id;
  const [min, max] = selectedFrameRange;

  const [sliderValues, setSliderValues] = useState([
    textItemLayer.startFrame,
    textItemLayer.endFrame,
  ]);

  const trackRef = useRef(null);

  const handleChange = (value) => {
    if (value[0] < parentLayerStartFrame) {
      value[0] = parentLayerStartFrame;
    }

    if (value[1] > parentLayerEndFrame) {
      value[1] = parentLayerEndFrame;
    }

    setSliderValues(value);
    const [newStartFrame, newEndFrame] = value;
    const newStartTime = newStartFrame / 30;
    const newEndTime = newEndFrame / 30;

    if (onUpdate) {
      onUpdate(newStartTime, newEndTime);
    }
  };

  const textTrackClicked = (e) => {
    e.stopPropagation();
    // Select this text track
    if (setTextTrackDisplayAsSelected) {
      setTextTrackDisplayAsSelected(textItemLayer);
    }
    // Clear any selected animation since user clicked on main text track
    if (onAnimationSelect) {
      onAnimationSelect(null, textItemLayer);
    }
  };

  let sliderTrackClass = 'track';
  if (isDisplaySelected) {
    sliderTrackClass = 'user-selected-track';
  }

  const renderTrack = (props, state) => {
    const { key, className, style, ...trackProps } = props;
    return (
      <div
        key={key}
        {...trackProps}
        ref={trackRef}
        style={style}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={textTrackClicked}
        className={`track text_track-${textItemId} ${className ?? ''}`}
      />
    );
  };

  let animationSliders = null;
  if (showTextTrackAnimations && textItemLayer && textItemLayer.animations) {
    animationSliders = textItemLayer.animations.map((animation, index) => (
      <TextAnimationTrackDisplay
        key={`index_${animation.id}`}
        selectedFrameRange={selectedFrameRange}
        textItemLayer={textItemLayer}
        {...props}
        selectedAnimationInTextTrack={selectedAnimationInTextTrack}
        selectedAnimation={animation}
        updateTrackAnimationBoundaries={(start, end) => {
          updateTrackAnimationBoundariesForTextLayer(animation, start, end);
        }}
        onAnimationSelect={(animation) => {
          // When an animation is clicked, select it
          setSelectedAnimationInTextTrack(animation);
          if (onAnimationSelect) {
            onAnimationSelect(animation, textItemLayer);
          }
        }}
      />
    ));
  }

  return (
    <span className='text-track-slider-component'>
      <ReactSlider
        className='vertical-slider mr-1 ml-1'
        thumbClassName='thumb train-thumb'
        trackClassName={sliderTrackClass}
        orientation='vertical'
        min={min}
        max={max}
        value={sliderValues}
        onChange={handleChange}
        pearling
        renderTrack={renderTrack}
        onBeforeChange={(value) => {
          // When the user starts dragging, select this text track
          if (setTextTrackDisplayAsSelected) {
            setTextTrackDisplayAsSelected(textItemLayer);
          }
          // Clear any selected animation
          if (onAnimationSelect) {
            onAnimationSelect(null);
          }
        }}
        renderThumb={(props, state) => {
          const { key, style, ...thumbProps } = props;
          return (
            <div key={key} {...thumbProps} style={style}>
              <FaGripLines />
            </div>
          );
        }}
      />
      {animationSliders}
    </span>
  );
};

export default TextTrackDisplay;
