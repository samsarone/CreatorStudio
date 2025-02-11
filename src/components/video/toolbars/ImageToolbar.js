import React, { useState, useEffect } from 'react';
import { FaChevronCircleDown, FaChevronCircleUp, FaTimesCircle } from 'react-icons/fa';
import Konva from 'konva';
import Select from 'react-select';
import { GiHorizontalFlip, GiVerticalFlip } from "react-icons/gi";

const filters = [
  { label: 'Blur', value: Konva.Filters.Blur, min: 0, max: 20, step: 1 },
  { label: 'Brighten', value: Konva.Filters.Brighten, min: -1, max: 1, step: 0.01 },
  { label: 'Contrast', value: Konva.Filters.Contrast, min: -1, max: 1, step: 0.01 },
  { label: 'Grayscale', value: Konva.Filters.Grayscale, min: 0, max: 1, step: 1 },
  { label: 'HSL', value: Konva.Filters.HSL, min: -1, max: 1, step: 0.01 },
  { label: 'Invert', value: Konva.Filters.Invert, min: 0, max: 1, step: 1 },
  { label: 'Pixelate', value: Konva.Filters.Pixelate, min: 1, max: 20, step: 1 },
  { label: 'Posterize', value: Konva.Filters.Posterize, min: 1, max: 20, step: 1 },
  { label: 'Sepia', value: Konva.Filters.Sepia, min: 0, max: 1, step: 1 },
  { label: 'Solarize', value: Konva.Filters.Solarize, min: 0, max: 1, step: 1 },
  { label: 'RGBA', value: Konva.Filters.RGBA, min: 0, max: 1, step: 0.01 }
];

export default function ImageToolbar(props) {
  const { pos, moveItem, index, applyFilter, removeItem, colorMode, flipImageVertical,
    flipImageHorizontal, itemId, applyFinalFilter, updateTargetActiveLayerConfig,
  } = props;

  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterValue, setFilterValue] = useState(0);
  const [xValue, setXValue] = useState(0);
  const [yValue, setYValue] = useState(0);
  const [widthValue, setWidthValue] = useState(0);
  const [heightValue, setHeightValue] = useState(0);

  useEffect(() => {
    // Fetch current item properties to initialize the input values
    const currentItem = props.activeItemList.find(item => item.id === itemId);
    if (currentItem) {
      setXValue(currentItem.x);
      setYValue(currentItem.y);
      setWidthValue(currentItem.width);
      setHeightValue(currentItem.height);
    }
  }, [itemId, props.activeItemList]);

  const handleFilterChange = (selectedOption) => {
    setSelectedFilter(selectedOption);
    setFilterValue(selectedOption.min); // Reset the filter value
    applyFilter(index, selectedOption.value, selectedOption.min); // Apply filter with initial value
  };

  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    setFilterValue(value);
    if (selectedFilter) {
      applyFilter(index, selectedFilter.value, value);
    }
  };

  const handleSliderChangeEnd = (e) => {
    const value = parseFloat(e.target.value);
    if (selectedFilter) {
      applyFinalFilter(index, selectedFilter.value, value);
    }
  };

  const handleInputChange = (e, type) => {
    const value = parseInt(e.target.value, 10);
    switch (type) {
      case 'x':
        setXValue(value);
        break;
      case 'y':
        setYValue(value);
        break;
      case 'width':
        setWidthValue(value);
        break;
      case 'height':
        setHeightValue(value);
        break;
      default:
        break;
    }
  };

  const handleInputBlur = (type) => {
    const newConfig = {
      x: xValue,
      y: yValue,
      width: widthValue,
      height: heightValue,
    };
    updateTargetActiveLayerConfig(itemId, newConfig);
  };

  const iconColor = colorMode === 'dark' ? 'text-neutral-200' : 'text-grey-800';

  const bgColor = colorMode === 'dark' ? `bg-gray-900` : `bg-neutral-300`;

  const textColor = colorMode === 'dark' ? `text-white` : `text-black`;


  let posX = pos.x;
  if (posX < 0) {
    posX = 0;
  }
  let posY = pos.y;
  if (posY < 0) {
    posY = 0;
  } 

  return (
    <div key={pos.id} style={{
      position: 'absolute', left: posX, top: posY, background: "#030712",
      width: "512px", borderRadius: "5px", padding: "5px", paddingTop: "1px", paddingBottom: "1px", display: "flex", flexDirection: "column", alignItems: "center",
      zIndex: 100
    }}>
      <div className='flex flex-row w-full'>
        <div className='basis-1/2'>
          <div className='grid grid-cols-4'>
            <div>
              <input
                type="number"
                value={xValue}
                onChange={(e) => handleInputChange(e, 'x')}
                onBlur={() => handleInputBlur('x')}
                placeholder="X"
                className={`w-full rounded-sm p-1 pr-0 ${bgColor} ${textColor} text-sm`}
              />
              <div className='text-xs text-center'>
                X
              </div>
            </div>
            <div>
              <input
                type="number"
                value={yValue}
                onChange={(e) => handleInputChange(e, 'y')}
                onBlur={() => handleInputBlur('y')}
                placeholder="Y"
                className={`w-full rounded-sm p-1 pr-0 ${bgColor} ${textColor} text-sm` }
              />
              <div className='text-xs text-center'>
                Y
              </div>
            </div>
            <div>
              <input
                type="number"
                value={widthValue}
                onChange={(e) => handleInputChange(e, 'width')}
                onBlur={() => handleInputBlur('width')}
                placeholder="W"
                className={`w-full rounded-sm p-1 pr-0 ${bgColor} ${textColor} text-sm`}
              />
              <div className='text-xs text-center'>
                W
              </div>
            </div>
            <div>
              <input
                type="number"
                value={heightValue}
                onChange={(e) => handleInputChange(e, 'height')}
                onBlur={() => handleInputBlur('height')}
                placeholder="H"
                className={`w-full rounded-sm p-1 pr-0 ${bgColor} ${textColor} text-sm`}
              />
              <div className='text-xs text-center'>
                H
              </div>
            </div>
          </div>
        </div>
        <div className='basis-1/4'>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <button onClick={() => moveItem(index, -1)}>
              <FaChevronCircleDown className={`${iconColor} mt-2 text-xl cursor-hover`} />
            </button>
            <button onClick={() => moveItem(index, 1)} style={{ marginLeft: '10px' }}>
              <FaChevronCircleUp className={`${iconColor} mt-2 text-xl cursor-hover`} />
            </button>
          </div>
        </div>
        <div className='basis-1/4'>
          <Select
            options={filters}
            onChange={handleFilterChange}
            placeholder="Filter"
            styles={{
              control: (provided) => ({
                ...provided,
                marginBottom: '10px',
                width: '100%',
                backgroundColor: colorMode === 'dark' ? '#1a202c' : '#f7fafc',
                color: colorMode === 'dark' ? 'white' : 'black',
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 9999,
                backgroundColor: colorMode === 'dark' ? '#1a202c' : '#f7fafc',
                color: colorMode === 'dark' ? 'white' : 'black',
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected ? (colorMode === 'dark' ? '#2d3748' : '#e2e8f0') : (colorMode === 'dark' ? '#1a202c' : '#f7fafc'),
                color: colorMode === 'dark' ? 'white' : 'black',
                '&:hover': {
                  backgroundColor: colorMode === 'dark' ? '#2d3748' : '#e2e8f0',
                },
              }),
              singleValue: (provided) => ({
                ...provided,
                color: colorMode === 'dark' ? 'white' : 'black',
              }),
              placeholder: (provided) => ({
                ...provided,
                color: colorMode === 'dark' ? 'white' : 'black',
              }),
            }}
          />
          {selectedFilter && (
            <input
              type="range"
              min={selectedFilter.min}
              max={selectedFilter.max}
              step={selectedFilter.step}
              value={filterValue}
              onChange={handleSliderChange}
              onMouseUp={handleSliderChangeEnd}
              onTouchEnd={handleSliderChangeEnd}
              style={{ width: '100%' }}
            />
          )}
        </div>
        <div className='basis-1/4 flex'>
          <GiVerticalFlip className={`${iconColor} mr-2 mt-2 text-xl cursor-hover inline-flex`} onClick={() => flipImageVertical(itemId)} />
          <GiHorizontalFlip className={`${iconColor} mr-2 mt-2 text-xl cursor-hover inline-flex`} onClick={() => flipImageHorizontal(itemId)} />
          <FaTimesCircle className={`${iconColor} ml-4 mt-2 text-xl cursor-hover`} onClick={() => removeItem(index)} />
        </div>
      </div>
    </div>
  );
}
