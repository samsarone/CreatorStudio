import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaStar } from 'react-icons/fa';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { MdExplore, MdCreateNewFolder } from 'react-icons/md';
import SingleSelect from './SingleSelect.jsx';
import {
  aspectRatioOptions as defaultAspectRatioOptions,
  getCanvasDimensionsForAspectRatio,
} from '../../utils/canvas.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';


function AddSessionDropdown(props) {
  const {
    createNewSession,
    gotoViewSessionsPage,
    addNewExpressSession,
    addNewVidGPTSession,
    showAddNewAdVideoSession,
    addNewSnowMakerSession,

    showAddNewMovieMakerSession,
    betaOptionVisible,
    aspectRatioOptions = defaultAspectRatioOptions,
    aspectRatioStorageKey = 'defaultAspectRatio',
    switchEditorLabel,
    onSwitchEditor,
    showVideoOptions = true,
    useImageProjectModal = false,
  } = props;

  const [aspectRatio, setAspectRatio] = useState(aspectRatioOptions[0] || { value: '1:1', label: '1:1' });

  useEffect(() => {
    const defaultAspectRatio = localStorage.getItem(aspectRatioStorageKey);
    const fallbackAspectRatio = aspectRatioOptions[0] || { value: '1:1', label: '1:1' };

    if (defaultAspectRatio) {
      const selectedAspectRatio = aspectRatioOptions.find((option) => option.value === defaultAspectRatio);
      if (selectedAspectRatio) {
        setAspectRatio(selectedAspectRatio);
        return;
      }
    }
    setAspectRatio(fallbackAspectRatio);
  }, [aspectRatioOptions, aspectRatioStorageKey]);

  const { colorMode } = useColorMode();
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [addBackgroundLayer, setAddBackgroundLayer] = useState(false);
  const [backgroundLayerColor, setBackgroundLayerColor] = useState('#ffffff');

  const bgColor = colorMode === 'dark' ? 'bg-[#15263f] hover:bg-[#1b3254]' : 'bg-neutral-200 hover:bg-neutral-300';
  const textColor = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-700';
  const menuSurface = colorMode === 'dark'
    ? 'bg-[#0f172a]/98 ring-1 ring-white/10 shadow-[0_18px_38px_rgba(0,0,0,0.45)]'
    : 'bg-white ring-1 ring-slate-200 shadow-[0_12px_26px_rgba(15,23,42,0.12)]';
  const modalSurface = colorMode === 'dark'
    ? 'bg-[#0f172a] text-slate-100'
    : 'bg-white text-slate-900';
  const modalInputSurface = colorMode === 'dark'
    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500';
  const modalSecondaryButton = colorMode === 'dark'
    ? 'bg-[#17253f] text-slate-100 hover:bg-[#1c3153] hover:shadow-[0_8px_18px_rgba(70,191,255,0.16)]'
    : 'bg-slate-100 text-slate-800 hover:bg-white hover:shadow-[0_8px_16px_rgba(15,23,42,0.12)]';
  const modalPrimaryButton = colorMode === 'dark'
    ? 'bg-gradient-to-r from-[#46bfff] to-[#39d881] text-[#041420] hover:from-[#60cbff] hover:to-[#55e8a2] hover:shadow-[0_10px_24px_rgba(70,191,255,0.24)]'
    : 'bg-rose-500 text-white hover:bg-rose-600 hover:shadow-[0_10px_20px_rgba(244,63,94,0.22)]';

  const selectedAspectRatio = aspectRatio?.value || aspectRatioOptions?.[0]?.value || '1:1';
  const selectedCanvasDimensions = useMemo(
    () => getCanvasDimensionsForAspectRatio(selectedAspectRatio),
    [selectedAspectRatio]
  );

  const aspectRatioOptionsWithResolution = useMemo(() => (
    aspectRatioOptions.map((option) => {
      const dimensions = getCanvasDimensionsForAspectRatio(option.value);
      return {
        ...option,
        label: `${option.label} - ${dimensions.width} x ${dimensions.height}`,
      };
    })
  ), [aspectRatioOptions]);

  const selectedAspectRatioOptionWithResolution = useMemo(() => (
    aspectRatioOptionsWithResolution.find((option) => option.value === selectedAspectRatio)
      || aspectRatioOptionsWithResolution[0]
      || null
  ), [aspectRatioOptionsWithResolution, selectedAspectRatio]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const openProjectModal = () => {
    setIsOpen(false);
    setSessionName('');
    setAddBackgroundLayer(false);
    setBackgroundLayerColor('#ffffff');
    setIsProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
  };

  useEffect(() => {
    if (!isProjectModalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeProjectModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isProjectModalOpen]);

  const addNewSession = () => {
    if (useImageProjectModal) {
      createNewSession({
        aspectRatio: selectedAspectRatio,
        canvasDimensions: selectedCanvasDimensions,
        sessionName: sessionName.trim(),
        addBackgroundLayer,
        backgroundLayerColor,
      });
      closeProjectModal();
      return;
    }

    createNewSession(selectedAspectRatio);
    setIsOpen(false);
  };

  const viewSessions = () => {
    gotoViewSessionsPage();
    setIsOpen(false);
    closeProjectModal();
  };

  const showAddNewExpressSession = () => {
    addNewExpressSession();
    setIsOpen(false);
  };

  const showAddNewVidGPTSession = () => {
    addNewVidGPTSession();
    setIsOpen(false);
  };

  const showAddNewShowMakerSession = () => {
    addNewSnowMakerSession();
    setIsOpen(false);
  };

  const handleAspectRatioChange = (selectedOption) => {
    if (!selectedOption) return;
    localStorage.setItem(aspectRatioStorageKey, selectedOption.value);
    const selectedAspectRatioOption = aspectRatioOptions.find((option) => option.value === selectedOption.value);
    setAspectRatio(selectedAspectRatioOption || selectedOption);

  };

  const handleSwitchEditor = () => {
    if (onSwitchEditor) {
      onSwitchEditor();
      setIsOpen(false);
      closeProjectModal();
    }
  };

  const handleMainButtonClick = () => {
    if (useImageProjectModal) {
      openProjectModal();
      return;
    }
    toggleDropdown();
  };

  const handleCreateSessionSubmit = (event) => {
    event.preventDefault();
    addNewSession();
  };

  return (
    <div className="relative inline-block text-left ">
      <button
        onClick={handleMainButtonClick}
        className={`inline-flex justify-center w-32 px-4 py-4 
         text-md font-medium 
          rounded-md shadow-[0_8px_18px_rgba(3,12,28,0.22)] transition-all duration-200 ease-out hover:-translate-y-[1px] focus:outline-none ${textColor} ${bgColor}`}
      >
        <FaPlus className="mr-2" />
        <span className="text-xs">{t("common.newProject")}</span>
      </button>

      {!useImageProjectModal && isOpen && (
        <div className={`absolute left-0 mt-2 w-36 origin-top-right rounded-md
         ${menuSurface} z-20`} >
          <div role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <button

              className={`block px-2 py-2 text-sm text-gray-700 w-full text-left ${textColor} ${bgColor}`}
              role="menuitem"
            >

              <div>
                <SingleSelect
                  options={aspectRatioOptions}
                  onChange={handleAspectRatioChange}
                  value={aspectRatio}
                />
              </div>




            </button>
            <button
              onClick={addNewSession}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}`}
              role="menuitem"
            >
              <MdCreateNewFolder className='inline-flex mb-1' /> {t("common.studio")}
            </button>

            {showVideoOptions && (
              <button
                onClick={showAddNewVidGPTSession}
                className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}`}
                role="menuitem"
              >
                <FaStar className='inline-flex mb-1' /> {t("common.vidgenie")}
              </button>
            )}

            {switchEditorLabel && onSwitchEditor && (
              <button
                onClick={handleSwitchEditor}
                className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}`}
                role="menuitem"
              >
                <MdCreateNewFolder className='inline-flex mb-1' /> {switchEditorLabel}
              </button>
            )}

            <button
              onClick={viewSessions}
              className={`block px-2 py-2 text-sm text-gray-700 hover:bg-gray-600 w-full text-left ${textColor} ${bgColor}`}
              role="menuitem"
            >
              <MdExplore className='inline-flex' /> {t("common.viewProjects")}
            </button>


          </div>
        </div>
      )}

      {useImageProjectModal && isProjectModalOpen && (
        <div className="fixed inset-0 z-[11060] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close create project dialog"
            className="absolute inset-0 bg-black/60"
            onClick={closeProjectModal}
          />
          <div className={`relative z-10 w-full max-w-xl rounded-2xl p-6 shadow-[0_20px_46px_rgba(0,0,0,0.5)] ${modalSurface}`}>
            <form onSubmit={handleCreateSessionSubmit}>
              <div className="text-lg font-semibold">Create new Image session</div>
              <div className="mt-1 text-sm opacity-80">
                Start a new image editing session with your preferred canvas setup.
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="image-project-name">
                    Project name
                  </label>
                  <input
                    id="image-project-name"
                    type="text"
                    maxLength={120}
                    value={sessionName}
                    onChange={(event) => setSessionName(event.target.value)}
                    placeholder="Untitled project"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${modalInputSurface}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Aspect ratio
                  </label>
                  <SingleSelect
                    options={aspectRatioOptionsWithResolution}
                    onChange={handleAspectRatioChange}
                    value={selectedAspectRatioOptionWithResolution}
                    isSearchable={false}
                  />
                </div>

                <div className={`rounded-lg border px-3 py-3 text-sm ${modalInputSurface}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    Canvas resolution
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedCanvasDimensions.width} x {selectedCanvasDimensions.height} px
                  </div>
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
                    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${modalInputSurface}`}>
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

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                {switchEditorLabel && onSwitchEditor && (
                  <button
                    type="button"
                    onClick={handleSwitchEditor}
                    className={`px-3 py-2 rounded-md text-sm transition-all duration-200 ease-out hover:-translate-y-[1px] ${modalSecondaryButton}`}
                  >
                    {switchEditorLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={viewSessions}
                  className={`px-3 py-2 rounded-md text-sm transition-all duration-200 ease-out hover:-translate-y-[1px] ${modalSecondaryButton}`}
                >
                  {t("common.viewProjects")}
                </button>
                <button
                  type="button"
                  onClick={closeProjectModal}
                  className={`px-3 py-2 rounded-md text-sm transition-all duration-200 ease-out hover:-translate-y-[1px] ${modalSecondaryButton}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-[1px] ${modalPrimaryButton}`}
                >
                  Create session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddSessionDropdown;
