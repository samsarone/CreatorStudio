// DualThumbSlider.js
import React, { useEffect, useMemo, useState } from 'react';
import ReactSlider from 'react-slider';

export default function DualThumbSlider({ min, max, value, onChange, onAfterChange }) {
  const [sliderValues, setSliderValues] = useState(() => (
    Array.isArray(value) ? value : [min, max]
  ));

  const sliderSpan = max - min;
  const safeMax = sliderSpan === 0 ? min + 1 : max;

  const sanitizeValues = (values) => (
    Array.isArray(values)
      ? values.map((val) => {
        if (!Number.isFinite(val)) return min;
        const clamped = Math.min(Math.max(val, min), max);
        return sliderSpan === 0 ? min : clamped;
      })
      : values
  );

  const handleSliderChange = (values) => {
    const sanitizedValues = sanitizeValues(values);
    setSliderValues(sanitizedValues);

    if (sliderSpan !== 0 && typeof onChange === 'function') {
      onChange(sanitizedValues);
    }
  };

  const handleSliderAfterChange = (values) => {
    const sanitizedValues = sanitizeValues(values);
    setSliderValues(sanitizedValues);

    if (sliderSpan !== 0 && typeof onAfterChange === 'function') {
      onAfterChange(sanitizedValues);
    }
  };

  useEffect(() => {
    if (Array.isArray(value)) {
      const sanitizedValues = value.map((val) => (
        Number.isFinite(val) ? val : min
      ));
      setSliderValues(sanitizedValues);
    }
  }, [value, min]);

  const displayValues = useMemo(() => {
    if (!Array.isArray(sliderValues)) return sliderValues;
    return sliderValues.map((val) => {
      if (!Number.isFinite(val)) return min;
      if (sliderSpan === 0) return min;
      return Math.min(Math.max(val, min), safeMax);
    });
  }, [sliderValues, min, safeMax, sliderSpan]);

  return (
    <ReactSlider
      className='dual-thumb-slider'
      thumbClassName='thumb'
      trackClassName='track'
      min={min}
      max={safeMax}
      value={displayValues}
      minDistance={1}
      pearling
      onChange={handleSliderChange}
      onAfterChange={handleSliderAfterChange}
      renderThumb={(props) => {
        const { key, ...thumbProps } = props;
        return <div key={key} {...thumbProps} />;
      }}
      orientation="vertical"
    />
  );
}
