import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FaDownload,
  FaPause,
  FaPlay,
  FaRedo,
  FaSearch,
  FaVideo,
} from 'react-icons/fa';
import { getHeaders } from '../../../utils/web';
import { useColorMode } from '../../../contexts/ColorMode';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

function resolveVideoUrl(assetPath) {
  if (typeof assetPath !== 'string') {
    return null;
  }

  const trimmedPath = assetPath.trim();
  if (!trimmedPath) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  return `${API_SERVER}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;
}

function formatDuration(duration) {
  const numericDuration = Number(duration);
  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    return null;
  }

  const roundedDuration = Math.round(numericDuration * 10) / 10;
  return `${roundedDuration.toFixed(roundedDuration >= 10 ? 0 : 1)}s`;
}

function getTrimKey(item = {}) {
  return item?._id || `${item?.sessionId || 'global'}:${item?.assetPath || item?.url || ''}`;
}

function getItemSearchText(item = {}) {
  return [
    item?.title,
    item?.description,
    item?.prompt,
    item?.projectName,
    item?.sourceLabel,
    item?.model,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();
}

export default function VideoLibraryHome(props) {
  const {
    sessionId,
    hideSelectButton = false,
    onSelectVideo,
    isSelectButtonDisabled = false,
  } = props;
  const { colorMode } = useColorMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryData, setLibraryData] = useState({
    projectItems: [],
    globalItems: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [trimByVideoId, setTrimByVideoId] = useState({});
  const videoRefs = useRef({});

  const panelSurface = colorMode === 'dark'
    ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d]'
    : 'bg-white text-slate-900 border border-slate-200';
  const sectionSurface = colorMode === 'dark'
    ? 'bg-[#0b1226] border border-[#1f2a3d]'
    : 'bg-slate-50 border border-slate-200';
  const cardSurface = colorMode === 'dark'
    ? 'bg-[#111a2f] border border-[#1f2a3d]'
    : 'bg-white border border-slate-200';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const pillSurface = colorMode === 'dark'
    ? 'bg-slate-900/70 text-slate-200 border border-slate-700/60'
    : 'bg-slate-100 text-slate-700 border border-slate-200';
  const actionButtonSurface = colorMode === 'dark'
    ? 'bg-[#16213a] text-slate-100 hover:bg-[#1b2745] border border-[#31405e]'
    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200';
  const selectButtonSurface = colorMode === 'dark'
    ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-white'
    : 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white';
  const inputSurface = colorMode === 'dark'
    ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100 placeholder:text-slate-500'
    : 'bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400';

  const fetchLibraryData = async () => {
    const headers = getHeaders();
    if (!headers) {
      setErrorMessage('Log in to browse the video library.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.get(
        `${API_SERVER}/video_sessions/video_library`,
        {
          ...headers,
          params: {
            sessionId,
            search: searchTerm,
          },
        }
      );
      setLibraryData({
        projectItems: Array.isArray(response?.data?.projectItems) ? response.data.projectItems : [],
        globalItems: Array.isArray(response?.data?.globalItems) ? response.data.globalItems : [],
      });
    } catch (error) {
      setErrorMessage(error?.response?.data?.error || 'Unable to load the video library.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, searchTerm]);

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((videoElement) => {
        if (videoElement?.pause) {
          videoElement.pause();
        }
      });
    };
  }, []);

  const filteredProjectItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return libraryData.projectItems;
    }

    return libraryData.projectItems.filter((item) => (
      getItemSearchText(item).includes(normalizedSearch)
    ));
  }, [libraryData.projectItems, searchTerm]);

  const filteredGlobalItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return libraryData.globalItems;
    }

    return libraryData.globalItems.filter((item) => (
      getItemSearchText(item).includes(normalizedSearch)
    ));
  }, [libraryData.globalItems, searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handlePlayPause = (itemId) => {
    const videoElement = videoRefs.current[itemId];
    if (!videoElement) {
      return;
    }

    if (playingVideoId && playingVideoId !== itemId && videoRefs.current[playingVideoId]) {
      videoRefs.current[playingVideoId].pause();
    }

    if (playingVideoId === itemId) {
      videoElement.pause();
      setPlayingVideoId(null);
      return;
    }

    videoElement.play();
    setPlayingVideoId(itemId);
    videoElement.onended = () => {
      setPlayingVideoId((currentValue) => (currentValue === itemId ? null : currentValue));
    };
  };

  const handleDownload = (item) => {
    const videoUrl = resolveVideoUrl(item?.assetPath || item?.url);
    if (!videoUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${item?.title || item?.sourceLabel || 'video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTrimToggle = (itemKey) => {
    setTrimByVideoId((previousValue) => ({
      ...previousValue,
      [itemKey]: !previousValue[itemKey],
    }));
  };

  const handleSelect = (item) => {
    if (typeof onSelectVideo !== 'function') {
      return;
    }

    const itemKey = getTrimKey(item);
    onSelectVideo({
      video: item,
      videoItem: item,
      trimScene: item?.sourceType === 'ai_video' ? Boolean(trimByVideoId[itemKey]) : false,
    });
  };

  const renderEmptyState = (message) => (
    <div className={`rounded-xl border border-dashed px-4 py-6 text-sm ${sectionSurface} ${mutedText}`}>
      {message}
    </div>
  );

  const renderVideoGrid = (items, sectionKey, emptyMessage) => {
    if (!items.length) {
      return renderEmptyState(emptyMessage);
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((item, index) => {
          const itemKey = getTrimKey(item) || `${sectionKey}-${index}`;
          const videoUrl = resolveVideoUrl(item?.assetPath || item?.url);
          const durationLabel = formatDuration(item?.duration);
          const isPlaying = playingVideoId === itemKey;

          return (
            <div key={`${sectionKey}-${itemKey}-${index}`} className={`rounded-2xl p-3 shadow-sm ${cardSurface}`}>
              <div className="relative overflow-hidden rounded-xl">
                {videoUrl ? (
                  <video
                    ref={(node) => {
                      videoRefs.current[itemKey] = node;
                    }}
                    src={videoUrl}
                    className="h-48 w-full cursor-pointer rounded-xl object-cover bg-black"
                    preload="metadata"
                    controls={false}
                    onClick={() => handlePlayPause(itemKey)}
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center rounded-xl bg-slate-900/70 text-slate-200">
                    <FaVideo className="mr-2" />
                    Preview unavailable
                  </div>
                )}

                <button
                  type="button"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white backdrop-blur"
                  onClick={() => handlePlayPause(itemKey)}
                >
                  {isPlaying ? <FaPause /> : <FaPlay />}
                  {isPlaying ? 'Pause' : 'Preview'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${pillSurface}`}>
                  {item?.sourceLabel || 'Video'}
                </span>
                {durationLabel && (
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${pillSurface}`}>
                    {durationLabel}
                  </span>
                )}
                {item?.projectName && (
                  <span className={`rounded-full px-2 py-1 text-[11px] ${pillSurface}`}>
                    {item.projectName}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="text-sm font-semibold">{item?.title || 'Untitled video'}</div>
                {item?.prompt && (
                  <div className={`mt-1 line-clamp-3 text-xs ${mutedText}`}>
                    {item.prompt}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${actionButtonSurface}`}
                  onClick={() => handleDownload(item)}
                >
                  <FaDownload />
                  Download
                </button>

                {!hideSelectButton && (
                  <div className="ml-auto flex items-center gap-2">
                    {item?.sourceType === 'ai_video' && (
                      <label className={`inline-flex items-center gap-2 text-[11px] ${mutedText}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-sky-500"
                          checked={Boolean(trimByVideoId[itemKey])}
                          onChange={() => handleTrimToggle(itemKey)}
                        />
                        Trim
                      </label>
                    )}
                    <button
                      type="button"
                      disabled={isSelectButtonDisabled}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold shadow transition disabled:opacity-60 ${selectButtonSurface}`}
                      onClick={() => handleSelect(item)}
                    >
                      Select
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`h-full w-full overflow-y-auto px-3 py-3 ${panelSurface}`}>
      <div className={`mb-3 rounded-2xl p-3 ${sectionSurface}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2 ${inputSurface}`}>
            <FaSearch className={mutedText} />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search AI, uploaded, or synced videos"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={fetchLibraryData}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${actionButtonSurface}`}
            disabled={isLoading}
          >
            <FaRedo className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 text-xs text-rose-400">{errorMessage}</div>
        )}
      </div>

      <div className={`rounded-2xl p-3 ${sectionSurface}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Current Project</div>
            <div className={`text-xs ${mutedText}`}>
              AI videos, uploaded takes, lip-sync and sound-effect layers from this studio session.
            </div>
          </div>
          <div className={`text-[11px] ${mutedText}`}>
            {filteredProjectItems.length} items
          </div>
        </div>
        {renderVideoGrid(
          filteredProjectItems,
          'project',
          'No project videos available yet.'
        )}
      </div>

      <div className={`mt-3 rounded-2xl p-3 ${sectionSurface}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Other Sessions</div>
            <div className={`text-xs ${mutedText}`}>
              Reuse videos generated or uploaded in your other projects.
            </div>
          </div>
          <div className={`text-[11px] ${mutedText}`}>
            {filteredGlobalItems.length} items
          </div>
        </div>
        {renderVideoGrid(
          filteredGlobalItems,
          'global',
          'No reusable videos found in other sessions.'
        )}
      </div>
    </div>
  );
}
