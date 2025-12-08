import React, { useState } from 'react';
import ImageLibraryHome from './image/ImageLibraryHome';
import MusicLibraryHome from './audio/MusicLibraryHome'; // Adjust the import path as needed
import SceneLibraryHome from './aivideo/SceneLibraryHome';
import { FaChevronCircleLeft, FaSpinner } from 'react-icons/fa';
import { useColorMode } from '../../contexts/ColorMode';
import './library.css'; // If you have shared styles

export default function LibraryHome(props) {
  const { resetImageLibrary, onSelectVideo, isSelectButtonDisabled } = props;
  const [selectedOption, setSelectedOption] = useState('Image');
  const { colorMode } = useColorMode();

  // We’ll use isSelectButtonDisabled as our "loading" state:
  const isLoading = isSelectButtonDisabled;

  const renderContent = () => {
    switch (selectedOption) {
      case 'Image':
        return <ImageLibraryHome {...props} />;
      case 'Music':
        return <MusicLibraryHome {...props} />;
      case 'Scenes':
        return <SceneLibraryHome {...props} onSelectVideo={onSelectVideo} />;
      default:
        return null;
    }
  };

  const handleBack = () => {
    resetImageLibrary();
  };

  const headings = {
    Image: 'Image Library',
    Music: 'Music Library',
    Scenes: 'Scene Library',
  };

  // Color mode styling
  const textColor = colorMode === 'dark' ? 'text-white' : 'text-black';
  const bgColor = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-200';

  return (
    <div className={`library-home mt-[60px] flex flex-col ${textColor} ${bgColor}`}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-900 bg-gray-800">
        {/* Back Button */}
        <button onClick={handleBack} className="flex items-center text-lg">
          <FaChevronCircleLeft className="mr-2" />
          Back
        </button>

        {/* Heading */}
        <h2 className="text-lg font-bold">{headings[selectedOption]}</h2>

        {/* Options */}
        <div className="flex space-x-2">
          {['Image', 'Music', 'Scenes'].map((option) => (
            <button
              key={option}
              onClick={() => setSelectedOption(option)}
              className={`px-3 py-1 rounded ${
                selectedOption === option
                  ? 'bg-gray-200 text-neutral-800'
                  : 'bg-gray-900 text-white border border-neutral-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Content + Loading Overlay */}
      <div className="relative">
        {/* 1) Main content */}
        {renderContent()}

        {/* 2) Conditional Overlay */}
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 opacity-50">
            <FaSpinner className="text-white text-4xl animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
