import React, { useEffect, useMemo, useState } from 'react';
import ReactSlider from 'react-slider';
import { FaGripLines } from 'react-icons/fa6';
import { useColorMode } from '../../../../../contexts/ColorMode.jsx';

function getTrackPalette(visualTrackItem, isDisplaySelected, colorMode) {
  const isShape = visualTrackItem?.type === 'shape';

  if (colorMode === 'light') {
    return {
      base: '#e2e8f0',
      active: isDisplaySelected
        ? (isShape ? 'rgba(217, 119, 6, 0.45)' : 'rgba(37, 99, 235, 0.35)')
        : (isShape ? 'rgba(245, 158, 11, 0.28)' : 'rgba(59, 130, 246, 0.22)'),
      border: isShape ? 'rgba(180, 83, 9, 0.55)' : 'rgba(29, 78, 216, 0.45)',
    };
  }

  return {
    base: '#0f172a',
    active: isDisplaySelected
      ? (isShape ? 'rgba(245, 158, 11, 0.48)' : 'rgba(59, 130, 246, 0.42)')
      : (isShape ? 'rgba(217, 119, 6, 0.35)' : 'rgba(37, 99, 235, 0.3)'),
    border: isShape ? 'rgba(251, 191, 36, 0.55)' : 'rgba(96, 165, 250, 0.55)',
  };
}

function clampTrackRange(rawValue, parentLayerStartFrame, parentLayerEndFrame) {
  const startBoundary = Math.max(0, Math.round(parentLayerStartFrame));
  const endBoundary = Math.max(startBoundary + 1, Math.round(parentLayerEndFrame));

  const nextStart = Math.min(
    Math.max(Math.round(rawValue[0]), startBoundary),
    endBoundary - 1,
  );
  const nextEnd = Math.max(
    Math.min(Math.round(rawValue[1]), endBoundary),
    nextStart + 1,
  );

  return [nextStart, nextEnd];
}

export default function VisualTrackDisplay(props) {
  const {
    visualTrackItem,
    onUpdate,
    onCommit,
    selectedFrameRange,
    setVisualTrackDisplayAsSelected,
    isDisplaySelected,
    isStartVisible,
    isEndVisible,
    parentLayerStartFrame,
    parentLayerEndFrame,
  } = props;

  const { colorMode } = useColorMode();
  const [min, max] = selectedFrameRange;

  const visibleSliderValues = useMemo(() => {
    const clampedStart = Math.max(min, Math.min(max, visualTrackItem.startFrame));
    const clampedEnd = Math.max(
      clampedStart + 1,
      Math.min(max, visualTrackItem.endFrame),
    );

    return [clampedStart, clampedEnd];
  }, [
    max,
    min,
    visualTrackItem.endFrame,
    visualTrackItem.startFrame,
  ]);

  const [sliderValues, setSliderValues] = useState(visibleSliderValues);

  useEffect(() => {
    setSliderValues(visibleSliderValues);
  }, [visibleSliderValues]);

  const palette = useMemo(
    () => getTrackPalette(visualTrackItem, isDisplaySelected, colorMode),
    [colorMode, isDisplaySelected, visualTrackItem]
  );

  const selectTrack = (event) => {
    if (event) {
      event.stopPropagation();
    }
    if (setVisualTrackDisplayAsSelected) {
      setVisualTrackDisplayAsSelected(visualTrackItem.trackKey);
    }
  };

  const handleChange = (value) => {
    const [absoluteStart, absoluteEnd] = clampTrackRange(
      value,
      parentLayerStartFrame,
      parentLayerEndFrame,
    );

    setSliderValues([
      Math.max(min, absoluteStart),
      Math.min(max, absoluteEnd),
    ]);

    if (onUpdate) {
      onUpdate(visualTrackItem.trackKey, absoluteStart, absoluteEnd);
    }
  };

  const handleAfterChange = (value) => {
    const [absoluteStart, absoluteEnd] = clampTrackRange(
      value,
      parentLayerStartFrame,
      parentLayerEndFrame,
    );

    if (onCommit) {
      onCommit(visualTrackItem.trackKey, absoluteStart, absoluteEnd);
    }
  };

  const renderTrack = (trackProps, state) => {
    const { key, className, style, ...restTrackProps } = trackProps;
    const isActiveTrack = state.index === 1;

    return (
      <div
        key={key}
        {...restTrackProps}
        className={`track rounded-full ${className ?? ''}`}
        style={{
          ...style,
          backgroundColor: isActiveTrack ? palette.active : palette.base,
          border: isActiveTrack ? `1px solid ${palette.border}` : 'none',
          width: isActiveTrack ? '10px' : '8px',
          cursor: isActiveTrack ? 'pointer' : 'default',
        }}
        onClick={selectTrack}
        title={`${visualTrackItem.assetLabel} · ${visualTrackItem.id}`}
      />
    );
  };

  return (
    <span className="inline-flex justify-center w-[26px] mx-[1px]">
      <ReactSlider
        className="vertical-slider mr-1 ml-1"
        orientation="vertical"
        min={min}
        max={max}
        value={sliderValues}
        onChange={handleChange}
        onAfterChange={handleAfterChange}
        onBeforeChange={selectTrack}
        pearling
        renderTrack={renderTrack}
        renderThumb={(thumbProps, state) => {
          const { index } = state;
          const shouldRenderThumb =
            (index === 0 && isStartVisible) || (index === 1 && isEndVisible);

          if (!shouldRenderThumb) {
            return null;
          }

          const { key, className, style, ...restThumbProps } = thumbProps;

          return (
            <div
              key={key}
              {...restThumbProps}
              className={`flex items-center justify-center rounded-full border shadow w-5 h-3 ${
                colorMode === 'dark'
                  ? 'bg-white border-white/40 text-slate-800'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
              } ${className ?? ''}`}
              style={style}
              title={`${visualTrackItem.assetLabel} · ${visualTrackItem.id}`}
            >
              <FaGripLines />
            </div>
          );
        }}
      />
    </span>
  );
}
