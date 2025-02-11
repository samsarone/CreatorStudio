// CustomBottomArrow.js
import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

const CustomBottomArrow = ({ className, style, onClick, onNextClick }) => {
  const handleClick = () => {
    if (onNextClick) onNextClick(); // Execute custom action
    if (onClick) onClick(); // Execute default slider action
  };

  return (
    <div
      className={`samsar-slider-arrow ${className}`}
      style={{ ...style, top: '600px' }}
      onClick={handleClick}
      aria-label="Next Slide"
    >
      <FaChevronDown className='text-xl m-auto' />
    </div>
  );
};

export default CustomBottomArrow;