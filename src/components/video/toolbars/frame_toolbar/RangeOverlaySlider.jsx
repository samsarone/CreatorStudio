// src/components/util/RangeOverlaySlider.js
import React, { useEffect, useState, useRef } from 'react';
import ReactSlider from 'react-slider';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';

export default function RangeOverlaySlider({
  min,
  max,
  value,
  onChange,
  highlightBoundaries,
  layerDurationUpdated,
  onDragAmountChange, // Add this prop
  onBeforeChange, onAfterChange 
}) {
  const [sliderValues, setSliderValues] = useState(value);
  const [initialValue, setInitialValue] = useState(null);
  const sliderRef = useRef(null);
  const { colorMode } = useColorMode();

  // Define constants for minimum duration
  const MIN_LAYER_DURATION = 0.1; // Minimum layer duration in seconds
  const FPS = 30; // Frames per second
  const MIN_DISTANCE_IN_FRAMES = MIN_LAYER_DURATION * FPS; // Minimum distance between thumbs in frames

  const handleSliderChange = (values, index) => {
    // Update internal slider values
    setSliderValues(values);

    // Call the parent onChange handler
    onChange(values);


  };

  const handleMouseDown = (event) => {
    event.stopPropagation();
    if (onBeforeChange) onBeforeChange();
  };

  // Update sliderValues only when not dragging
  useEffect(() => {
    if (initialValue === null) {
      setSliderValues(value);
    }
  }, [value]);

  const { height } = highlightBoundaries;


  return (
    <div
      style={{
        height: `100%`,
      }}
      onMouseDown={handleMouseDown}
    >
      <ReactSlider
        ref={sliderRef}
        className={`range-overlay-slider h-full m-auto`}
        min={min}
        max={max}
        value={sliderValues}
        onChange={handleSliderChange}
        renderThumb={(props) => {
          const { key, className, style, ...thumbProps } = props;
          return (
            <div
              key={key}
              {...thumbProps}
              className={className}
              style={style}
            />
          );
        }}
        renderTrack={(props, state) => {
          const isActiveSegment = state.index === 1;
          const classes = `track rounded-full ${
            isActiveSegment
              ? colorMode === 'dark'
                ? 'bg-indigo-500/35'
                : 'bg-sky-300/60'
              : colorMode === 'dark'
                ? 'bg-slate-900/50'
                : 'bg-slate-200'
          }`;

          const { key, className: incomingClass, style, ...trackProps } = props;
          return (
            <div
              key={key}
              {...trackProps}
              className={`${classes} ${incomingClass ?? ''}`}
              style={style}
            />
          );
        }}
        onBeforeChange={() => {
          setInitialValue(sliderValues);
        }}
        onAfterChange={() => {
          // Reset initial value after dragging
          setInitialValue(null);
          // Reset drag amount
          if (onDragAmountChange) {
            onDragAmountChange(0);
          }
          if (layerDurationUpdated) {
            layerDurationUpdated(sliderValues);
          }
        }}
        orientation="vertical"
        minDistance={MIN_DISTANCE_IN_FRAMES}
        style={{ height: '100%', pointerEvents: 'auto' }}
      />
    </div>
  );
}
