// DualThumbSlider.js
import React, { useEffect, useState } from 'react';
import ReactSlider from 'react-slider';

export default function DualThumbSlider({ min, max, value, onChange }) {
  const [sliderValues, setSliderValues] = useState(value);

  const handleSliderChange = (values) => {
    setSliderValues(values);
    onChange(values);
  };

  useEffect(() => {
    setSliderValues(value);
  }, [value]);

  return (
    <ReactSlider
      className='dual-thumb-slider'
      thumbClassName='thumb'
      trackClassName='track'
      min={min}
      max={max}
      value={sliderValues}
      onChange={handleSliderChange}
      renderThumb={(props, state) => <div {...props}></div>}
      orientation="vertical"
    />
  );
}
