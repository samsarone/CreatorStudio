// src/components/util/RangeOverlaySlider.js
import React, { useEffect, useState, useRef } from 'react';
import ReactSlider from 'react-slider';

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
        thumbClassName="thumb"
        trackClassName="track"
        min={min}
        max={max}
        value={sliderValues}
        onChange={handleSliderChange}
        renderThumb={(props) => <div {...props} />}
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
