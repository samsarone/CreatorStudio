import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { getHeaders } from '../../../utils/web';
import { useColorMode } from '../../../contexts/ColorMode';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

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

  // Palette aligned with account styling
  const textColor = colorMode === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const borderColor = colorMode === 'dark' ? 'border-[#1f2a3d]' : 'border-slate-200';
  const cardBg = colorMode === 'dark' ? 'bg-[#0f1629]' : 'bg-white';
  const headerBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-50';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const surfaceButton = colorMode === 'dark'
    ? 'bg-[#0b1224] hover:bg-[#0f1629]'
    : 'bg-white hover:bg-slate-100';
  const selectButtonBg = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90';
  const tagBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-100';
  const iconColor = colorMode === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const sliderAccent = colorMode === 'dark' ? '#6366f1' : '#2563eb';
  const sliderTrack = colorMode === 'dark' ? '#1f2a3d' : '#e2e8f0';

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
    <div className={`space-y-4 ${textColor}`}>
      {/* Top Toolbar */}
      <div className={`rounded-2xl border ${borderColor} ${cardBg} p-4 shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <h1 className="text-2xl font-bold">Music Library</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center rounded-lg border overflow-hidden ${borderColor}`}>
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-3 py-2 text-sm font-semibold border-r ${borderColor} ${surfaceButton} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Prev
            </button>
            <span className={`px-4 py-2 text-sm ${headerBg}`}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 text-sm font-semibold border-l ${borderColor} ${surfaceButton} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Next
            </button>
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className={`px-3 py-2 text-sm rounded-lg border ${borderColor} ${surfaceButton} focus:outline-none`}
          />
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
        {libraryData.map((item, idx) => (
          <div key={item._id} className={`rounded-xl border ${borderColor} ${cardBg} p-4 shadow-sm`}>
            {/* Play/Pause and Download Buttons */}
            <div className="mb-3 flex items-center gap-2">
              <button
                className={`px-3 py-2 rounded-full border ${borderColor} ${surfaceButton}`}
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
                <div className="flex-1 mx-2 flex items-center gap-2">
                  <span className="text-sm">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="flex-1 appearance-none h-2 rounded-full"
                    style={{
                      accentColor: sliderAccent,
                      background: `linear-gradient(to right, ${sliderAccent} 0%, ${sliderAccent} ${(duration ? (currentTime / duration) : 0) * 100}%, ${sliderTrack} ${(duration ? (currentTime / duration) : 0) * 100}%, ${sliderTrack} 100%)`,
                    }}
                  />
                  <span className="text-sm">{formatTime(duration)}</span>
                </div>
              )}

              <button
                className={`px-3 py-2 rounded-full border ${borderColor} ${surfaceButton}`}
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
                className={`mt-4 w-full ${selectButtonBg} px-3 py-2 rounded-lg font-semibold shadow`}
                onClick={() => handleSelect(item)}
              >
                Select
              </button>
            )}
            {hideSelectButton && (
              <p className={`mt-3 text-xs ${mutedText}`}>Click play to preview and download.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
