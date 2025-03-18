import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { getHeaders } from '../../../utils/web';
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function MusicLibraryHome({ onSelectMusic, hideSelectButton }) {
  const [libraryData, setLibraryData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 50;

  const [playingSongId, setPlayingSongId] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    fetchLibraryData();
    // Cleanup function to pause audio when component unmounts
    return () => {
      audioRef.current.pause();
    };
  }, [currentPage, searchTerm]);

  const fetchLibraryData = () => {
    const headers = getHeaders();

    axios
      .get(
        `${API_SERVER}/audio/user_music_library?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`,
        headers
      )
      .then(function (dataRes) {
        const libraryData = dataRes.data.items;
        setLibraryData(libraryData);
        setTotalPages(dataRes.data.totalPages);
      })
      .catch(function (error) {
        console.error('Error fetching library data:', error);
      });
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
    if (playingSongId === item._id) {
      // Pause if the same song is clicked
      audioRef.current.pause();
      setPlayingSongId(null);
    } else {
      // Pause any currently playing song
      audioRef.current.pause();

      // Set new audio source
      audioRef.current = new Audio(`${API_SERVER}/${item.url}`);
      audioRef.current.play();
      setPlayingSongId(item._id);

      // Reset playingSongId when the song ends
      audioRef.current.onended = () => {
        setPlayingSongId(null);
      };
    }
  };

  const handleDownload = (item) => {
    const link = document.createElement('a');
    link.href = `${API_SERVER}/${item.url}`;
    link.download = `${item.title || 'Song'}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelect = (item) => {
    if (onSelectMusic) {
      onSelectMusic(item);
    }
  };

  const bgColor = colorMode === 'dark' ? 'bg-gray-800' : 'bg-gray-200';


  return (
    <div className={`${bgColor} min-h-screen h-auto text-white`}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Music Library</h1>
        <div className="flex items-center">
          {/* Pagination Controls */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-700 rounded-l disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-4 py-1 bg-gray-800">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-700 rounded-r disabled:opacity-50"
          >
            Next
          </button>
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className="ml-4 px-3 py-1 bg-gray-800 border border-gray-600 rounded focus:outline-none"
          />
        </div>
      </div>
      {/* Grid Display */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {libraryData.map((item, idx) => (
          <div key={item._id} className="bg-gray-800 p-4 rounded">
            {/* Play/Pause and Download Buttons */}
            <div className="mb-2 flex justify-between items-center">
              <button
                className="bg-neutral-800 hover:bg-neutral-900 px-3 py-2 rounded-full"
                onClick={() => handlePlayPause(item)}
              >
                {playingSongId === item._id ? (
                  <FaPause className="text-white" />
                ) : (
                  <FaPlay className="text-white" />
                )}
              </button>
              <button
                className="bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-full"
                onClick={() => handleDownload(item)}
              >
                <FaDownload className="text-white" />
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
                  className="inline-block bg-gray-700 text-sm px-2 py-1 rounded mr-1 mt-1"
                >
                  {tag}
                </span>
              ))}
            </div>
            {/* Select Button */}
            {!hideSelectButton && (
              <button
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded"
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
