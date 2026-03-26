import React, { useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import { FaGripLines } from 'react-icons/fa6';
import './audioTrack/audioTrackSlider.css';
import AudioLevelsTrackSlider from './AudioLevelsTrackSlider';
import { useColorMode } from '../../../contexts/ColorMode.jsx';

const DISPLAY_FRAMES_PER_SECOND = 30;

function getAudioTrackFrameBounds(audioTrack) {
  const parsedStartTime = Number(audioTrack?.startTime);
  const parsedEndTime = Number(audioTrack?.endTime);
  const parsedDuration = Number(audioTrack?.duration);

  const startTime = Number.isFinite(parsedStartTime) ? parsedStartTime : 0;
  const fallbackEndTime = startTime + (
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? parsedDuration
      : 0
  );
  const endTime = Number.isFinite(parsedEndTime) && parsedEndTime >= startTime
    ? parsedEndTime
    : fallbackEndTime;

  return {
    startFrame: startTime * DISPLAY_FRAMES_PER_SECOND,
    endFrame: endTime * DISPLAY_FRAMES_PER_SECOND,
  };
}

const AudioTrackSlider = (props) => {
  const { audioTrack, onUpdate, selectedFrameRange, isStartVisible, isEndVisible,
    setAudioRangeSliderDisplayAsSelected, 
    totalDuration
   } = props;

  const audioTrackId = audioTrack._id;
  const { colorMode } = useColorMode();
  const [min, max] = selectedFrameRange;

  const [audioDuration, setAudioDuration] = useState(0);
  const [sliderValues, setSliderValues] = useState([0, 0]);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [sliderHeight, setSliderHeight] = useState(0);

  const trackRef = useRef(null);


  useEffect(() => {
    const audio = new Audio(audioTrack.url);

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.src = '';
    };
  }, [audioTrack.url]);

  useEffect(() => {
    const { startFrame: resolvedStartFrame, endFrame: resolvedEndFrame } =
      getAudioTrackFrameBounds(audioTrack);
    const startFrame = Math.max(min, Math.min(max, resolvedStartFrame));
    const endFrame = Math.max(startFrame, Math.max(min, Math.min(max, resolvedEndFrame)));

    setSliderValues([startFrame, endFrame]);
  }, [audioTrack.startTime, audioTrack.endTime, audioTrack.duration, min, max]);


  const handleChange = (value) => {
    if (!isDraggingRange) {
      const [prevStartFrame, prevEndFrame] = sliderValues;
      const [newStartFrame, newEndFrame] = value;
  
      const trackId = audioTrack._id || audioTrack.id;
  
      if (newStartFrame !== prevStartFrame && newEndFrame === prevEndFrame) {
        // Start thumb moved
        const newStartTime = newStartFrame / DISPLAY_FRAMES_PER_SECOND;
        const newEndTime = audioTrack.endTime; // Keep endTime the same
        const newDuration = newEndTime - newStartTime;
        onUpdate(trackId, newStartTime, newEndTime, newDuration);
      } else if (newEndFrame !== prevEndFrame && newStartFrame === prevStartFrame) {
        // End thumb moved
        const newStartTime = audioTrack.startTime; // Keep startTime the same
        const newEndTime = newEndFrame / DISPLAY_FRAMES_PER_SECOND;
        const newDuration = newEndTime - newStartTime;
        onUpdate(trackId, newStartTime, newEndTime, newDuration);
      } else if (newStartFrame !== prevStartFrame && newEndFrame !== prevEndFrame) {
        // Both thumbs moved
        const newStartTime = newStartFrame / DISPLAY_FRAMES_PER_SECOND;
        const newEndTime = newEndFrame / DISPLAY_FRAMES_PER_SECOND;
        const newDuration = newEndTime - newStartTime;
        onUpdate(trackId, newStartTime, newEndTime, newDuration);
      }
  
      setSliderValues(value);
    }
  };
  

  const handleRangeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (trackRef.current) {
      setSliderHeight(trackRef.current.clientHeight);
    } else {
      
      return;
    }
    setIsDraggingRange(true);
    setDragStartY(e.clientY);
  };

  useEffect(() => {
    if (!isDraggingRange) return;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - dragStartY;

      if (sliderHeight === 0) return;

      const sliderRange = max - min;
      const deltaValue = (deltaY / sliderHeight) * sliderRange;

      setSliderValues(([start, end]) => {
        let newStart = start + deltaValue;
        let newEnd = end + deltaValue;

        // Clamp values within min and max
        newStart = Math.max(min, Math.min(max - (end - start), newStart));
        newEnd = newStart + (end - start);

        setDragStartY(e.clientY);

        const newStartTime = newStart / DISPLAY_FRAMES_PER_SECOND;
        const newEndTime = newEnd / DISPLAY_FRAMES_PER_SECOND;
        const newDuration = newEndTime - newStartTime;
        const trackId = audioTrack._id || audioTrack.id;
        onUpdate(trackId, newStartTime, newEndTime, newDuration);

        return [newStart, newEnd];
      });
    };

    const handleMouseUp = () => {
      setIsDraggingRange(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDraggingRange,
    dragStartY,
    sliderHeight,
    min,
    max,
    onUpdate,
    audioTrack._id,
    audioTrack.id,
  ]);

  const audioRangeSliderClicked = (e) => {
    setAudioRangeSliderDisplayAsSelected(audioTrackId);
  }

  const renderTrack = (props, state) => {
    const baseTrackStyle = {
      backgroundColor: colorMode === 'dark' ? '#0f172a' : '#e2e8f0',
    };
    const activeTrackStyle = {
      backgroundColor: audioTrack.isDisplaySelected
        ? (colorMode === 'dark' ? 'rgba(129,140,248,0.45)' : 'rgba(79,70,229,0.25)')
        : (colorMode === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.4)'),
    };

    if (state.index === 1) {
      const { key, className, style, ...trackProps } = props;
      return (
        <div
          key={key}
          {...trackProps}
          ref={trackRef}
          onMouseDown={handleRangeMouseDown}

          onClick={(e) => {
            // Your custom click handling logic
            audioRangeSliderClicked(e);
            // Optionally stop propagation if needed
             e.stopPropagation();
          }}

          className={`track rounded-full audio_range_track-${audioTrackId} ${className ?? ''}`}
          style={{ ...style, ...activeTrackStyle }}
        />
      );
    } else {
      const { key, style, ...trackProps } = props;
      return (
        <div
          key={key}
          {...trackProps}
          className={`track rounded-full audio_range_track-${audioTrackId}`}
          style={{ ...style, ...baseTrackStyle }}
        />
      );
    }
  };

  let audioLevelsDisplaySlider = <span />;
  if (audioTrack.isAudioLevelsDisplaySelected) {
    audioLevelsDisplaySlider = (
      <AudioLevelsTrackSlider />
    )
  }

  return (
<>
    <ReactSlider
      className="vertical-slider audio-track-slider-component mr-1 ml-1" 
      orientation="vertical"
      min={min}
      max={max}
      value={sliderValues}
      onChange={handleChange}
      onClick={audioRangeSliderClicked}
      pearling
      renderThumb={(props, state) => {
        const { index } = state;
        const shouldRenderThumb =
          (index === 0 && isStartVisible) || (index === 1 && isEndVisible);

        if (shouldRenderThumb) {
          const { key, className, style, ...thumbProps } = props;
          return (
            <div
              key={key}
              {...thumbProps}
              className={`flex items-center justify-center rounded-full border shadow w-5 h-3 ${
                colorMode === 'dark'
                  ? 'bg-white border-white/40 text-slate-800'
                  : 'bg-indigo-500 border-indigo-200 text-white'
              } ${className ?? ''}`}
              style={style}
            >
              <FaGripLines />
            </div>
          );
        }

        // Do not render the thumb
        return null;
      }}
      renderTrack={renderTrack}
    />


{audioTrack.isAudioLevelsDisplaySelected && (
  <AudioLevelsTrackSlider />
)}
</>

  );
};

export default AudioTrackSlider;
