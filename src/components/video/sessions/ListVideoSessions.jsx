import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getHeaders } from '../../../utils/web';
import { useNavigate } from 'react-router-dom';
import OverflowContainer from '../../common/OverflowContainer.tsx';
import ShowNewUserIntroDisplay from './ShowNewUserIntroDisplay';
import { useColorMode } from '../../../contexts/ColorMode.jsx';

import SingleSelect from '../../common/SingleSelect'; // adjust path as needed

const PROCESSOR_API = import.meta.env.VITE_PROCESSOR_API;

// Options for the filters
const renderTypeOptions = [
  { value: 'All', label: 'All' },
  { value: 'Rendered', label: 'Rendered' },
  { value: 'Pending', label: 'Pending' },
];

const aspectRatioOptions = [
  { value: 'All', label: 'All' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

export default function ListVideoSessions() {
  const [sessionList, setSessionList] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30); // Show 30 items per page by default
  const [totalPages, setTotalPages] = useState(1);

  const [renderType, setRenderType] = useState('All');
  const [aspectRatio, setAspectRatio] = useState('All');

  const [showIntroDisplay, setShowIntroDisplay] = useState(false);

  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'bg-gray-900' : 'bg-neutral-300';
  const textColor = colorMode === 'dark' ? 'text-white' : 'text-black';

  // On mount, load defaults from localStorage if present
  useEffect(() => {
    const storedRenderType = localStorage.getItem('defaultSessionSelectRenderType');
    const storedAspectRatio = localStorage.getItem('defaultSessionSelectAspectRatio');
    const storedPage = localStorage.getItem('currentSessionsPage');

    if (storedRenderType) {
      setRenderType(storedRenderType);
    }
    if (storedAspectRatio) {
      setAspectRatio(storedAspectRatio);
    }
    if (storedPage) {
      setPage(parseInt(storedPage, 10));
    }
  }, []);

  // Fetch sessions whenever page, limit, renderType, aspectRatio change
  useEffect(() => {
    // Save current page to localStorage
    localStorage.setItem('currentSessionsPage', page.toString());

    const headers = getHeaders();
    axios
      .get(
        `${PROCESSOR_API}/video_sessions/list?page=${page}&limit=${limit}&renderType=${renderType}&aspectRatio=${aspectRatio}`,
        headers
      )
      .then(function (response) {
        // Expecting { data, total, totalPages, currentPage, pageSize } from the server
        const { data, totalPages } = response.data;
        setSessionList(data);
        setTotalPages(totalPages);

        // If no sessions, show your intro display
        if (!data || data.length === 0) {
          setShowIntroDisplay(true);
        } else {
          setShowIntroDisplay(false);
        }
      })
      .catch((error) => {
        console.error('Error fetching session list:', error);
      });
  }, [page, limit, renderType, aspectRatio]);

  // Handle filter changes
  const handleChangeRenderType = (selectedOption) => {
    const val = selectedOption.value;
    setRenderType(val);
    localStorage.setItem('defaultSessionSelectRenderType', val);
    // Reset page to 1 when filter changes
    setPage(1);
  };

  const handleChangeAspectRatio = (selectedOption) => {
    const val = selectedOption.value;
    setAspectRatio(val);
    localStorage.setItem('defaultSessionSelectAspectRatio', val);
    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Reset everything
  const handleResetFilters = () => {
    setPage(1);
    setRenderType('All');
    setAspectRatio('All');

    localStorage.setItem('currentSessionsPage', '1');
    localStorage.setItem('defaultSessionSelectRenderType', 'All');
    localStorage.setItem('defaultSessionSelectAspectRatio', 'All');
  };

  // Navigation
  const gotoPage = (session) => {
    const newSessionId = session.id.toString();
    localStorage.setItem('sessionId', newSessionId);
    navigate(`/video/${newSessionId}`);
  };

  const createNewStudioSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_API}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/video/${session._id}`);
    });

  };



  const createNewVidGPTSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_API}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/vidgpt/${session._id}`);
    });

  };

  const handleImportClick = (session, editorType) => {
    // ... your existing code ...
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  // If sessionList is null or undefined, return nothing
  if (!sessionList) return null;

  // Projects label
  let projectsLabelDisplay = null;
  if (sessionList.length > 0) {
    projectsLabelDisplay = (
      <div className="text-lg font-bold pl-2 pt-2 text-left ml-2 mb-2">
        My Projects
      </div>
    );
  } else {
    projectsLabelDisplay = (
      <div className="text-lg font-bold pl-2 pt-2 text-left ml-2 mb-2">
        Looks like you don't have any projects yet. Get started by creating a new project.
      </div>
    );
  }

  return (
    <OverflowContainer>
      <div
        className={`p-4 pt-8 pb-8 h-full w-full min-h-[100vh] mt-[50px] ${bgColor} ${textColor}`}
      >
        {/* Top Section: Filters + Reset + Pagination controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Render Type Filter */}
            <div className="w-48">
              <SingleSelect
                options={renderTypeOptions}
                value={renderTypeOptions.find((o) => o.value === renderType)}
                onChange={handleChangeRenderType}
                classNamePrefix="renderTypeSelect"
                isSearchable={false}
              />
            </div>

            {/* Aspect Ratio Filter */}
            <div className="w-48">
              <SingleSelect
                options={aspectRatioOptions}
                value={aspectRatioOptions.find((o) => o.value === aspectRatio)}
                onChange={handleChangeAspectRatio}
                classNamePrefix="aspectRatioSelect"
                isSearchable={false}
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Reset
            </button>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Projects label */}
        {projectsLabelDisplay}

        {/* Sessions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {sessionList.map((session, index) => {
            if (!session) return null;
            const sessionPreviewImage = session.thumbnail
              ? `${PROCESSOR_API}/${session.thumbnail}`
              : '/q2.png';

            return (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() => gotoPage(session)}
              >
                <div className="text-neutral-100 text-center mb-2">
                  {session.name}
                </div>
                <img
                  src={sessionPreviewImage}
                  onError={(e) => (e.target.src = '/q2.png')}
                  className="w-64 h-64 object-cover rounded-lg"
                  alt={`Session ${index + 1}`}
                />
              </div>
            );
          })}
        </div>

        {/* New user intro / create session */}
        <div className="w-full mt-8">
          <ShowNewUserIntroDisplay
            createNewStudioSession={createNewStudioSession}
            createNewVidGPTSession={createNewVidGPTSession}
            handleImportClick={handleImportClick}
          />
        </div>
      </div>
    </OverflowContainer>
  );
}
