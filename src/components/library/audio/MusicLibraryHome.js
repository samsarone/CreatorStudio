import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { getHeaders } from '../../../utils/web';
import { useColorMode } from '../../../contexts/ColorMode';

const API_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function MusicLibraryHome({ onSelectMusic, hideSelectButton }) {
  const [libraryData, setLibraryData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingSongId, setPlayingSongId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());
  const { colorMode } = useColorMode();

  // --- Color-mode based Tailwind classes ---
  const containerBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-200';
  const containerText = colorMode === 'dark' ? 'text-white' : 'text-black';
  const toolbarBorder = colorMode === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const paginationButtonBg = colorMode === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  const paginationSpanBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const searchInputBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const searchInputBorder = colorMode === 'dark' ? 'border-gray-600' : 'border-gray-400';

  const cardBg = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const neutralButtonBg = colorMode === 'dark'
    ? 'bg-neutral-800 hover:bg-neutral-900'
    : 'bg-neutral-200 hover:bg-neutral-300';
  const neutralButtonBg2 = colorMode === 'dark'
    ? 'bg-neutral-800 hover:bg-neutral-700'
    : 'bg-neutral-200 hover:bg-neutral-100';
  const selectButtonBg = colorMode === 'dark'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-blue-400 hover:bg-blue-500';

  const tagBg = colorMode === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  const iconColor = colorMode === 'dark' ? 'text-white' : 'text-black';
  // -----------------------------------------

  const itemsPerPage = 50;

  useEffect(() => {
    const fetchLibraryData = async () => {
      const headers = getHeaders();
      try {
        const response = await axios.get(
          `${API_SERVER}/audio/user_music_library?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
            searchTerm
          )}`,
          headers
        );
        const fetchedData = response.data.items;
        setLibraryData(fetchedData);
        setTotalPages(response.data.totalPages);
      } catch (error) {
        console.error('Error fetching library data:', error);
      }
    };

    fetchLibraryData();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const audio = audioRef.current;

    // Attach event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setPlayingSongId(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  const handlePlayPause = (item) => {
    const audio = audioRef.current;
    // If the same song is clicked and it's currently playing, pause it
    if (playingSongId === item._id) {
      audio.pause();
      setPlayingSongId(null);
    } else {
      // If another song is playing, pause it first
      if (playingSongId) {
        audio.pause();
      }
      // Set new audio source
      audio.src = `${API_SERVER}/${item.url}`;
      // Play the new song
      audio
        .play()
        .then(() => {
          setPlayingSongId(item._id);
        })
        .catch((error) => {
          console.error('Error playing audio:', error);
        });
    }
  };

  const handleDownload = async (item) => {
    try {
      // Fetch the file data as a blob
      const response = await axios.get(`${API_SERVER}/${item.url}`, {
        responseType: 'blob',
      });
      // Create a blob URL
      const blobUrl = URL.createObjectURL(response.data);
      // Create an anchor element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${item.title || 'Song'}.mp3`);
      // Append the link to the body
      document.body.appendChild(link);
      // Trigger the download
      link.click();
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading the file:', error);
    }
  };

  const handleSelect = (item) => {
    if (onSelectMusic) {
      onSelectMusic(item);
    }
  };

  const handleSeekChange = (e) => {
    const newTime = Number(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? '0' + minutes : minutes}:${
      seconds < 10 ? '0' + seconds : seconds
    }`;
  };

  return (
    <div className={`${containerBg} min-h-screen h-auto ${containerText}`}>
      {/* Top Toolbar */}
      <div className={`flex items-center justify-between p-4 border-b ${toolbarBorder}`}>
        <h1 className="text-2xl font-bold">Music Library</h1>
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
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {libraryData.map((item, idx) => (
          <div key={item._id} className={`${cardBg} p-4 rounded`}>
            {/* Play/Pause and Download Buttons */}
            <div className="mb-2 flex items-center">
              <button
                className={`${neutralButtonBg} px-3 py-2 rounded-full`}
                onClick={() => handlePlayPause(item)}
              >
                {playingSongId === item._id ? (
                  <FaPause className={iconColor} />
                ) : (
                  <FaPlay className={iconColor} />
                )}
              </button>

              {/* Seek Bar and Time Display (only if this song is playing) */}
              {playingSongId === item._id && (
                <div className="flex-1 mx-3 flex items-center">
                  <span className="text-sm">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="mx-2 flex-1"
                  />
                  <span className="text-sm">{formatTime(duration)}</span>
                </div>
              )}

              <button
                className={`${neutralButtonBg2} px-3 py-2 rounded-full`}
                onClick={() => handleDownload(item)}
              >
                <FaDownload className={iconColor} />
              </button>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold">
              {item.title || `Song Title ${idx + 1}`}
            </h2>

            {/* Tags */}
            <div className="mt-2">
              {(item.tags && item.tags.length > 0 ? item.tags : ['No Tags']).map((tag) => (
                <span
                  key={tag}
                  className={`inline-block ${tagBg} text-sm px-2 py-1 rounded mr-1 mt-1`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Select Button */}
            {!hideSelectButton && (
              <button
                className={`mt-4 w-full ${selectButtonBg} px-3 py-2 rounded`}
                onClick={() => handleSelect(item)}
              >
                Select
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
