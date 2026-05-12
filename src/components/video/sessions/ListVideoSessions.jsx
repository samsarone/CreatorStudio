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
  const [limit] = useState(30); // Show 30 items per page by default
  const [totalPages, setTotalPages] = useState(1);

  const [renderType, setRenderType] = useState('All');
  const [aspectRatio, setAspectRatio] = useState('All');

  const [showIntroDisplay, setShowIntroDisplay] = useState(false);

  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const containerSurface =
    colorMode === 'dark'
      ? 'bg-[#0b1021] text-slate-100'
      : 'bg-[#f7f9fc] text-slate-900';
  const cardSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629] border border-[#1f2a3d] shadow-[0_14px_36px_rgba(0,0,0,0.35)]'
      : 'bg-white border border-slate-200 shadow-sm';
  const resetButtonClass =
    colorMode === 'dark'
      ? 'bg-rose-500/90 hover:bg-rose-500 text-white'
      : 'bg-rose-500 hover:bg-rose-600 text-white';
  const paginationButtonClass =
    colorMode === 'dark'
      ? 'bg-[#111a2f] hover:bg-[#16213a] text-slate-100 border border-[#1f2a3d]'
      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm';

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
    let isCancelled = false;

    axios
      .get(
        `${PROCESSOR_API}/video_sessions/list?page=${page}&limit=${limit}&renderType=${renderType}&aspectRatio=${aspectRatio}`,
        headers
      )
      .then(function (response) {
        if (isCancelled) {
          return;
        }

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
        if (!isCancelled) {
          
        }
      });

    return () => {
      isCancelled = true;
    };
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
  const gotoPage = (event, session) => {
    const sessionIdentifier = session?.id ?? session?._id;
    if (!sessionIdentifier) {
      return;
    }

    const newSessionId = sessionIdentifier.toString();
    localStorage.setItem('sessionId', newSessionId);
    localStorage.setItem('videoSessionId', newSessionId);

    if (event?.metaKey || event?.ctrlKey) {
      window.open(`/video/${newSessionId}`, '_blank', 'noopener,noreferrer');
      return;
    }

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

      navigate(`/vidgenie/${session._id}`);
    });

  };

  const createNewAdVideoSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_API}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);
      navigate(`/adcreator/${session._id}`);
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
      <div className="mx-auto mb-3 w-full max-w-[1600px] text-left text-lg font-bold">
        My Projects
      </div>
    );
  } else {
    projectsLabelDisplay = (
      <div className="mx-auto mb-3 w-full max-w-[1600px] text-left text-lg font-bold">
        Looks like you don't have any projects yet. Get started by creating a new project.
      </div>
    );
  }

  return (
    <OverflowContainer>
      <div className={`min-h-screen w-full px-4 pb-12 pt-20 sm:px-6 lg:px-8 ${containerSurface}`}>
        {/* Top Section: Filters + Reset + Pagination controls */}
        <div className="mx-auto mb-6 flex w-full max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Filters */}
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] lg:w-auto">
            {/* Render Type Filter */}
            <div className="min-w-0">
              <SingleSelect
                options={renderTypeOptions}
                value={renderTypeOptions.find((o) => o.value === renderType)}
                onChange={handleChangeRenderType}
                classNamePrefix="renderTypeSelect"
                isSearchable={false}
              />
            </div>

            {/* Aspect Ratio Filter */}
            <div className="min-w-0">
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
              className={`min-h-[40px] rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${resetButtonClass}`}
            >
              Reset
            </button>
          </div>

          {/* Pagination controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className={`min-h-[40px] rounded-md px-4 py-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${paginationButtonClass}`}
            >
              Prev
            </button>
            <span className="min-w-[96px] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className={`min-h-[40px] rounded-md px-4 py-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${paginationButtonClass}`}
            >
              Next
            </button>
          </div>
        </div>

        {/* Projects label */}
        {projectsLabelDisplay}

        {/* Sessions grid */}
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 sm:gap-5 lg:gap-6">
          {sessionList.map((session, index) => {
            if (!session) return null;
            const sessionPreviewImage = session.thumbnail
              ? `${PROCESSOR_API}/${session.thumbnail}`
              : '/q2.png';
            const isExpressSession = Boolean(session.isExpressGeneration);

            return (
              <div
                key={session?.id ?? session?._id ?? index}
                className={`group min-w-0 cursor-pointer overflow-hidden rounded-lg ${cardSurface} transition-transform duration-200 hover:-translate-y-1`}
                onClick={(event) => gotoPage(event, session)}
              >
                <div className="flex min-h-[54px] items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 text-left text-sm font-semibold leading-5">
                    {session.name}
                  </div>
                  {isExpressSession && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        colorMode === 'dark'
                          ? 'bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-300/25'
                          : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
                      }`}
                    >
                      Express
                    </span>
                  )}
                </div>
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img
                    src={sessionPreviewImage}
                    onError={(e) => (e.target.src = '/q2.png')}
                    className="h-full w-full object-cover"
                    alt={`Session ${index + 1}`}
                  />
                </div>
                <div className="px-4 py-3 text-xs text-slate-500">
                  Tap to open in Studio
                </div>
              </div>
            );
          })}
        </div>

        {/* New user intro / create session */}
        <div className="mx-auto mt-8 w-full max-w-[1600px]">
          <ShowNewUserIntroDisplay
            createNewStudioSession={createNewStudioSession}
            createNewVidGPTSession={createNewVidGPTSession}
            createNewAdVideoSession={createNewAdVideoSession}
            handleImportClick={handleImportClick}
          />
        </div>
      </div>
    </OverflowContainer>
  );
}
