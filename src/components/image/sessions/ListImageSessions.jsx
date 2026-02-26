import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import { getHeaders } from '../../../utils/web.jsx';
import OverflowContainer from '../../common/OverflowContainer.tsx';
import SingleSelect from '../../common/SingleSelect.jsx';
import { imageAspectRatioOptions } from '../../../constants/ImageAspectRatios.js';

const PROCESSOR_API = import.meta.env.VITE_PROCESSOR_API;

const aspectRatioFilterOptions = [
  { value: 'All', label: 'All' },
  ...imageAspectRatioOptions,
];

export default function ListImageSessions() {
  const [sessionList, setSessionList] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('All');
  const [showAddCreditsBanner, setShowAddCreditsBanner] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [createAspectRatio, setCreateAspectRatio] = useState('1:1');
  const [addBackgroundLayer, setAddBackgroundLayer] = useState(false);
  const [backgroundLayerColor, setBackgroundLayerColor] = useState('#ffffff');

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
  const paginationButtonClass =
    colorMode === 'dark'
      ? 'bg-[#111a2f] hover:bg-[#16213a] text-slate-100 border border-[#1f2a3d]'
      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm';

  useEffect(() => {
    const storedAspectRatio = localStorage.getItem('defaultImageSessionSelectAspectRatio');
    const storedPage = localStorage.getItem('currentImageSessionsPage');
    if (storedAspectRatio) {
      setAspectRatio(storedAspectRatio);
    }
    if (storedPage) {
      setPage(parseInt(storedPage, 10));
    }
    if (localStorage.getItem('setShowSetPaymentFlow') === 'true') {
      setShowAddCreditsBanner(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('currentImageSessionsPage', page.toString());
    const headers = getHeaders();
    let isCancelled = false;

    axios
      .get(
        `${PROCESSOR_API}/image_sessions/list?page=${page}&limit=${limit}&aspectRatio=${aspectRatio}`,
        headers
      )
      .then((response) => {
        if (isCancelled) return;
        const { data, totalPages } = response.data;
        setSessionList(data || []);
        setTotalPages(totalPages || 1);
      })
      .catch(() => {
        if (!isCancelled) {
          setSessionList([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, limit, aspectRatio]);

  const handleChangeAspectRatio = (selectedOption) => {
    const val = selectedOption.value;
    setAspectRatio(val);
    localStorage.setItem('defaultImageSessionSelectAspectRatio', val);
    setPage(1);
  };

  const gotoPage = (event, session) => {
    const sessionIdentifier = session?.id ?? session?._id;
    if (!sessionIdentifier) return;
    const newSessionId = sessionIdentifier.toString();
    localStorage.setItem('imageSessionId', newSessionId);

    if (event?.metaKey || event?.ctrlKey) {
      window.open(`/image/studio/${newSessionId}`, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(`/image/studio/${newSessionId}`);
  };

  const createNewImageSession = (sessionConfig = {}) => {
    const headers = getHeaders();
    const selectedAspectRatio =
      sessionConfig.aspectRatio ||
      (aspectRatio !== 'All' ? aspectRatio : localStorage.getItem('defaultImageAspectRatio') || '1:1');
    const payload = {
      prompts: [],
      aspectRatio: selectedAspectRatio,
    };

    if (sessionConfig.addBackgroundLayer) {
      payload.addBackgroundLayer = true;
      payload.backgroundLayerColor = sessionConfig.backgroundLayerColor || '#ffffff';
    }

    setIsCreatePending(true);
    axios
      .post(`${PROCESSOR_API}/image_sessions/create_session`, payload, headers)
      .then((response) => {
        const session = response.data;
        const sessionId = session._id.toString();
        localStorage.setItem('imageSessionId', sessionId);
        setIsCreateDialogOpen(false);
        navigate(`/image/studio/${sessionId}`);
      })
      .finally(() => {
        setIsCreatePending(false);
      });
  };

  const openCreateDialog = () => {
    const fallbackAspectRatio =
      aspectRatio !== 'All' ? aspectRatio : localStorage.getItem('defaultImageAspectRatio') || '1:1';
    const isValidAspectRatio = imageAspectRatioOptions.some((option) => option.value === fallbackAspectRatio);
    setCreateAspectRatio(isValidAspectRatio ? fallbackAspectRatio : '1:1');
    setAddBackgroundLayer(false);
    setBackgroundLayerColor('#ffffff');
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (isCreatePending) return;
    setIsCreateDialogOpen(false);
  };

  const handleCreateSessionSubmit = (event) => {
    event.preventDefault();
    if (isCreatePending) return;
    createNewImageSession({
      aspectRatio: createAspectRatio,
      addBackgroundLayer,
      backgroundLayerColor,
    });
  };

  const createAspectRatioOptions = imageAspectRatioOptions;
  const selectedCreateAspectRatioOption =
    createAspectRatioOptions.find((option) => option.value === createAspectRatio) ||
    createAspectRatioOptions[0];

  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));

  const dismissAddCreditsBanner = () => {
    setShowAddCreditsBanner(false);
    localStorage.setItem('setShowSetPaymentFlow', 'false');
  };

  const handleAddCredits = () => {
    dismissAddCreditsBanner();
    navigate('/account/billing');
  };

  const bannerSurface =
    colorMode === 'dark'
      ? 'bg-[#101828] border border-rose-400/30 text-slate-100'
      : 'bg-white border border-rose-200 text-slate-900';
  const bannerSubtle =
    colorMode === 'dark' ? 'text-slate-300' : 'text-slate-500';
  const bannerButton =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white hover:bg-rose-400'
      : 'bg-rose-500 text-white hover:bg-rose-600';
  const bannerGhost =
    colorMode === 'dark'
      ? 'border border-slate-700 text-slate-200 hover:bg-slate-800'
      : 'border border-slate-200 text-slate-600 hover:bg-slate-100';
  const dialogSurface =
    colorMode === 'dark'
      ? 'bg-[#0f172a] text-slate-100 border border-[#1f2a3d]'
      : 'bg-white text-slate-900 border border-slate-200';
  const dialogInputSurface =
    colorMode === 'dark'
      ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500';
  const dialogSecondaryButton =
    colorMode === 'dark'
      ? 'bg-[#17253f] text-slate-100 hover:bg-[#1c3153]'
      : 'bg-slate-100 text-slate-800 hover:bg-white';
  const dialogPrimaryButton =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white hover:bg-rose-400'
      : 'bg-rose-500 text-white hover:bg-rose-600';
  const dialogSubtleText = colorMode === 'dark' ? 'text-slate-300' : 'text-slate-600';

  return (
    <OverflowContainer>
      <div className={`min-h-screen pt-20 pb-12 ${containerSurface}`}>
        <div className="max-w-6xl mx-auto px-4">
          {showAddCreditsBanner && (
            <div className={`mb-6 rounded-2xl p-5 shadow-sm ${bannerSurface}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-base font-semibold">Welcome to Image Studio</div>
                  <div className={`text-sm mt-1 ${bannerSubtle}`}>
                    Add credits to start generating and editing images.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddCredits}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition ${bannerButton}`}
                  >
                    Add credits
                  </button>
                  <button
                    onClick={dismissAddCreditsBanner}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${bannerGhost}`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-lg font-semibold">Image Sessions</div>
            <div className="flex items-center gap-3">
              <div className="min-w-[160px]">
                <SingleSelect
                  options={aspectRatioFilterOptions}
                  onChange={handleChangeAspectRatio}
                  value={aspectRatioFilterOptions.find((o) => o.value === aspectRatio) || aspectRatioFilterOptions[0]}
                />
              </div>
              <button
                onClick={openCreateDialog}
                className="px-4 py-2 rounded-md text-sm font-medium bg-rose-500 text-white hover:bg-rose-600"
              >
                New Image Session
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-4">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page <= 1}
                className={`px-3 py-1.5 rounded-md transition disabled:opacity-50 ${paginationButtonClass}`}
              >
                Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-md transition disabled:opacity-50 ${paginationButtonClass}`}
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {sessionList.map((session, index) => {
              if (!session) return null;
              const thumbnail = session.thumbnail || '';
              const sessionPreviewImage = thumbnail.startsWith('http')
                ? thumbnail
                : thumbnail
                  ? `${PROCESSOR_API}/${thumbnail}`
                  : '/q2.png';

              return (
                <div
                  key={session?.id ?? session?._id ?? index}
                  className={`cursor-pointer group ${cardSurface} rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-1`}
                  onClick={(event) => gotoPage(event, session)}
                >
                  <div className="text-sm font-medium text-center mb-2 px-4 pt-4">
                    {session.name}
                  </div>
                  <img
                    src={sessionPreviewImage}
                    onError={(e) => (e.target.src = '/q2.png')}
                    className="w-full h-56 object-cover"
                    alt={`Session ${index + 1}`}
                  />
                  <div className="px-4 pb-4 text-xs text-slate-500">
                    Tap to open in Image Studio
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-[11060] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close create image session dialog"
            className="absolute inset-0 bg-black/60"
            onClick={closeCreateDialog}
          />
          <div className={`relative z-10 w-full max-w-md rounded-2xl p-6 shadow-[0_20px_46px_rgba(0,0,0,0.5)] ${dialogSurface}`}>
            <form onSubmit={handleCreateSessionSubmit}>
              <div className="text-lg font-semibold">Create new Image session</div>
              <div className={`mt-1 text-sm ${dialogSubtleText}`}>
                Choose a canvas and optional background layer.
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Aspect ratio
                  </label>
                  <SingleSelect
                    options={createAspectRatioOptions}
                    onChange={(selectedOption) => {
                      if (!selectedOption?.value) return;
                      setCreateAspectRatio(selectedOption.value);
                      localStorage.setItem('defaultImageAspectRatio', selectedOption.value);
                    }}
                    value={selectedCreateAspectRatioOption}
                    isSearchable={false}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addBackgroundLayer}
                    onChange={(event) => setAddBackgroundLayer(event.target.checked)}
                  />
                  Add background layer
                </label>

                {addBackgroundLayer && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Background color
                    </label>
                    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${dialogInputSurface}`}>
                      <input
                        type="color"
                        value={backgroundLayerColor}
                        onChange={(event) => setBackgroundLayerColor(event.target.value)}
                        className="h-8 w-12 cursor-pointer border-0 bg-transparent p-0"
                      />
                      <div className="text-sm font-mono uppercase">{backgroundLayerColor}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  disabled={isCreatePending}
                  className={`px-3 py-2 rounded-md text-sm transition disabled:opacity-60 ${dialogSecondaryButton}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatePending}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition disabled:opacity-60 ${dialogPrimaryButton}`}
                >
                  {isCreatePending ? 'Creating...' : 'Create session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OverflowContainer>
  );
}
