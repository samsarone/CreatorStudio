import React, { useState } from 'react';
import ImageLibraryHome from './image/ImageLibraryHome';
import MusicLibraryHome from './audio/MusicLibraryHome';
import SceneLibraryHome from './aivideo/SceneLibraryHome';
import VideoLibraryHome from './video/VideoLibraryHome';
import GenerationsGalleryPanel from '../generations/GenerationsGalleryPanel.jsx';
import { FaChevronCircleLeft, FaSpinner } from 'react-icons/fa';
import { useColorMode } from '../../contexts/ColorMode';
import './library.css';

const LIBRARY_TABS = ['Generations', 'Image', 'Audio', 'Video', 'Scenes'];

export default function LibraryHome(props) {
  const { resetImageLibrary, onSelectVideo, isSelectButtonDisabled } = props;
  const [selectedOption, setSelectedOption] = useState('Generations');
  const { colorMode } = useColorMode();

  const isLoading = isSelectButtonDisabled;

  const renderContent = () => {
    switch (selectedOption) {
      case 'Generations':
        return (
          <GenerationsGalleryPanel
            embedded
            title="Generations"
            subtitle="A panorama wall of image and video generations. Video tiles stay on preview clips until you open the render."
            onSelectImage={props.selectImageFromLibrary}
            onSelectVideo={onSelectVideo}
            isSelectButtonDisabled={isSelectButtonDisabled}
          />
        );
      case 'Image':
        return <ImageLibraryHome {...props} />;
      case 'Audio':
        return <MusicLibraryHome {...props} />;
      case 'Video':
        return <VideoLibraryHome {...props} onSelectVideo={onSelectVideo} />;
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
    Generations: 'Global Generations',
    Image: 'Image Library',
    Audio: 'Audio Library',
    Video: 'Video Library',
    Scenes: 'Scene Library',
  };

  const panelSurface = colorMode === 'dark'
    ? 'border border-[#1f2a3d] bg-[#07101f] text-slate-100'
    : 'border border-slate-200 bg-slate-50 text-slate-900';
  const toolbarSurface = colorMode === 'dark'
    ? 'border-b border-[#1f2a3d] bg-[#0b1224]/95'
    : 'border-b border-slate-200 bg-white/95';
  const backButtonSurface = colorMode === 'dark'
    ? 'border border-[#31405e] bg-[#111a2f] text-slate-100 hover:bg-[#16213a]'
    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100';
  const inactiveTabSurface = colorMode === 'dark'
    ? 'border border-[#1f2a3d] bg-[#0f1629] text-slate-300 hover:bg-[#16213a]'
    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100';
  const activeTabSurface = colorMode === 'dark'
    ? 'border border-cyan-400/30 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20'
    : 'border border-sky-300 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white shadow';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`library-home mt-[60px] flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] ${panelSurface}`}>
      <div className={`sticky top-0 z-10 px-4 py-4 backdrop-blur ${toolbarSurface}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${backButtonSurface}`}
            >
              <FaChevronCircleLeft className="text-base" />
              Back
            </button>

            <div className="min-w-0">
              <div className="text-lg font-semibold">Library</div>
              <div className={`text-xs ${mutedText}`}>
                {headings[selectedOption]}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {LIBRARY_TABS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedOption(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedOption === option ? activeTabSurface : inactiveTabSurface
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {renderContent()}

        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 opacity-50">
            <FaSpinner className="text-white text-4xl animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
