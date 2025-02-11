import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode';
import { getHeaders } from '../../../utils/web'; // Adjust the path as needed

const API_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function SceneLibraryHome(props) {
  const { hideSelectButton, onSelectVideo, isSelectButtonDisabled } = props;
  const [libraryData, setLibraryData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [trimScenes, setTrimScenes] = useState({}); // track trim checkbox
  const videoRefs = useRef({});

  const { colorMode } = useColorMode();
  const itemsPerPage = 12; // Adjust as needed

  // --- Define color-based Tailwind classes ---
  // Container (parent) background & text
  const containerBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-200';
  const containerText = colorMode === 'dark' ? 'text-white' : 'text-black';

  // Border color (top toolbar)
  const borderColor = colorMode === 'dark' ? 'border-gray-700' : 'border-gray-300';

  // Pagination button backgrounds
  const paginationButtonBg = colorMode === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  // Pagination span background
  const paginationSpanBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';

  // Search input background/border
  const searchInputBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const searchInputBorder = colorMode === 'dark' ? 'border-gray-600' : 'border-gray-400';

  // Grid item card background
  const itemBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';

  // Play/Pause button background
  const playPauseButtonBg = colorMode === 'dark'
    ? 'bg-neutral-800 hover:bg-neutral-900'
    : 'bg-neutral-200 hover:bg-neutral-300';

  // Icon color
  const iconColor = colorMode === 'dark' ? 'text-white' : 'text-black';

  // Subtext color (for model/prompt)
  const subTextColor = colorMode === 'dark' ? 'text-gray-400' : 'text-gray-600';

  // Download button background
  const downloadButtonBg = colorMode === 'dark'
    ? 'bg-neutral-800 hover:bg-neutral-700'
    : 'bg-neutral-200 hover:bg-neutral-100';

  // Select button gradient (adjust as needed)
  const selectButtonGradient = colorMode === 'dark'
    ? 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 hover:bg-purple-700'
    : 'bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 hover:bg-purple-300';
  // -------------------------------------------

  useEffect(() => {
    fetchLibraryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm]);

  const fetchLibraryData = async () => {
    const headers = getHeaders();
    try {
      const response = await axios.get(
        `${API_SERVER}/ai_video/user_video_library?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
          searchTerm
        )}`,
        headers
      );
      const data = response.data.items;
      setLibraryData(data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching video library data:', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePlayPause = (videoId) => {
    const videoElement = videoRefs.current[videoId];
    if (!videoElement) return;

    if (playingVideoId === videoId) {
      // Pause
      videoElement.pause();
      setPlayingVideoId(null);
    } else {
      // Pause any currently playing video
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId].pause();
      }
      // Play this one
      videoElement.play();
      setPlayingVideoId(videoId);
      videoElement.onended = () => {
        setPlayingVideoId(null);
      };
    }
  };

  const handleDownload = (item) => {
    const link = document.createElement('a');
    link.href = `${API_SERVER}/${item.url}`;
    link.download = `${item.description || 'Video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelect = (item) => {
    if (onSelectVideo) {
      const payload = {
        video: item,
        trimScene: trimScenes[item._id] || false,
      };
      onSelectVideo(payload);
    }
  };

  const handleTrimChange = (videoId) => {
    setTrimScenes((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  return (
    <div className={`${containerBg} ${containerText} relative library-home-container mb-4 pb-4`}>
      {/* Top Toolbar */}
      <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
        <div className="flex items-center">
          {/* Pagination Controls */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 ${paginationButtonBg} rounded-l disabled:opacity-50`}
          >
            Prev
          </button>
          <span className={`px-4 py-1 ${paginationSpanBg}`}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 ${paginationButtonBg} rounded-r disabled:opacity-50`}
          >
            Next
          </button>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className={`ml-4 px-3 py-1 ${searchInputBg} border ${searchInputBorder} rounded focus:outline-none`}
          />
        </div>
      </div>

      {/* Grid Display */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-auto overflow-auto">
        {libraryData.map((item) => (
          <div key={item._id} className={`${itemBg} p-4 rounded`}>
            {/* Video Thumbnail + Play/Pause Button */}
            <div className="relative">
              <video
                ref={(el) => {
                  videoRefs.current[item._id] = el;
                }}
                src={`${API_SERVER}/${item.url}`}
                className="w-full h-48 object-cover rounded cursor-pointer"
                controls={false}
                preload="metadata"
                onClick={() => handlePlayPause(item._id)}
              />
              <button
                className={`absolute bottom-2 right-2 ${playPauseButtonBg} p-2 rounded-full`}
                onClick={() => handlePlayPause(item._id)}
              >
                {playingVideoId === item._id ? (
                  <FaPause className={iconColor} />
                ) : (
                  <FaPlay className={iconColor} />
                )}
              </button>
            </div>
            {/* Description */}
            <h2 className="mt-2 text-lg font-semibold">
              {item.description || 'No Description'}
            </h2>
            {/* Model and Prompt */}
            <p className={`text-sm ${subTextColor}`}>
              Model: {item.model || 'Unknown'}
            </p>
            <p className={`text-sm ${subTextColor}`}>
              Prompt: {item.prompt || 'No Prompt'}
            </p>

            {/* Download and Select Buttons */}
            <div className="mt-2 flex justify-between items-center">
              <button
                className={`${downloadButtonBg} px-3 py-2 rounded`}
                onClick={() => handleDownload(item)}
              >
                <FaDownload className={iconColor} />
              </button>

              {!hideSelectButton && (
                <div className="flex items-center">
                  <label className="text-xs mr-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={trimScenes[item._id] || false}
                      onChange={() => handleTrimChange(item._id)}
                      className="mr-1"
                    />
                    Trim
                  </label>
                  <button
                    className={`${selectButtonGradient} px-3 py-2 rounded`}
                    onClick={() => handleSelect(item)}
                    disabled={isSelectButtonDisabled}
                  >
                    Select
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
