import React, { useState, useEffect } from 'react';
import ReactSlider from 'react-slider';
import { FaDiamond } from 'react-icons/fa6';
import './textAnimationTrackDisplay.css';

export default function TextAnimationTrackDisplay(props) {
  const {
    selectedFrameRange,
    selectedAnimation,
    onAnimationSelect, 
    updateTrackAnimationBoundaries,
    selectedAnimationInTextTrack,
    textItemLayer
  } = props;

  const [min, max] = selectedFrameRange;
  const [sliderValues, setSliderValues] = useState([0, 0]);
  const [isDragging, setIsDragging] = useState(false);

  const isAnimationSelected = selectedAnimationInTextTrack === selectedAnimation;

  useEffect(() => {
    if (selectedAnimation) {
      setSliderValues([selectedAnimation.startFrame, selectedAnimation.endFrame]);
    }
  }, [selectedAnimation]);

  const handleTrackMouseDown = (e) => {
    // Prevent track clicks from moving the slider
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTrackClick = (e) => {
    e.stopPropagation();
    if (onAnimationSelect) {
      onAnimationSelect(selectedAnimation);
    }
  };

  let sliderTrackClass = "track";
  if (isAnimationSelected) {
    sliderTrackClass = "user-selected-track";
  }


  return (
    <ReactSlider
      className={`vertical-slider text-animation-track-slider mr-1 ml-1`}
      thumbClassName=""

      orientation="vertical"
      min={min}
      max={max}
      trackClassName={sliderTrackClass}
      value={sliderValues}
      onChange={(value) => {
        setSliderValues(value);
      }}
      onBeforeChange={() => setIsDragging(true)}
      onAfterChange={(value) => {
        setIsDragging(false);
        if (updateTrackAnimationBoundaries) {
          updateTrackAnimationBoundaries(value[0], value[1]);
        }
      }}
      renderTrack={(props) => (
        <div
          {...props}
          className={`track text-animation-track ${isAnimationSelected ? 'animation-selected' : ''} ${props.className}`}
          onMouseDown={handleTrackMouseDown}
          onClick={handleTrackClick}
        />
      )}
      renderThumb={(props) => (
        <div
          {...props}
          onClick={(e) => {
            e.stopPropagation();
            handleTrackClick(e); // Selecting on thumb click as well
          }}
        >
          <FaDiamond className='text-xs mt-[-2px]'/>
        </div>
      )}
    />
  );
}
