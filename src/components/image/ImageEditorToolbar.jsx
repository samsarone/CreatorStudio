import React from 'react';
import { FaUpload } from 'react-icons/fa';
import { TbLibraryPhoto } from 'react-icons/tb';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { CURRENT_TOOLBAR_VIEW } from '../../constants/Types.ts';
import PromptGenerator from '../video/toolbars/PromptGenerator.jsx';
import ImageEditGenerator from '../video/toolbars/ImageEditGenerator.jsx';
import ImageLayersPanel from './ImageLayersPanel.jsx';

export default function ImageEditorToolbar(props) {
  const {
    currentViewDisplay,
    setCurrentViewDisplay,
    promptText,
    setPromptText,
    submitGenerateNewRequest,
    isGenerationPending,
    selectedGenerationModel,
    setSelectedGenerationModel,
    generationError,
    submitOutpaintRequest,
    selectedEditModel,
    setSelectedEditModel,
    selectedEditModelValue,
    isOutpaintPending,
    outpaintError,
    editBrushWidth,
    setEditBrushWidth,
    showUploadAction,
    onShowLibrary,
    aspectRatio,
    aspectRatioOptions,
    onAspectRatioChange,
    onDownloadSimple,
    onDownloadAdvanced,
    activeItemList,
    setActiveItemList,
    updateSessionLayerActiveItemList,
    selectedId,
    setSelectedId,
    hideItemInLayer,
  } = props;

  const { colorMode } = useColorMode();

  const toggleCurrentViewDisplay = (view) => {
    const nextView =
      view === currentViewDisplay
        ? CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY
        : view;
    setCurrentViewDisplay(nextView);
  };

  const panelSurface =
    colorMode === 'dark'
      ? 'bg-[#0f1629] border border-[#1f2a3d] text-slate-100'
      : 'bg-white border border-slate-200 text-slate-900';
  const textColor = colorMode === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const pillSelected =
    colorMode === 'dark'
      ? 'bg-rose-500/25 border border-rose-400/30 text-rose-100'
      : 'bg-rose-100 border border-rose-200 text-rose-700';
  const pillUnselected =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-200'
      : 'bg-gray-200 border border-transparent text-gray-600';
  const primaryButton =
    colorMode === 'dark'
      ? 'bg-rose-500 text-white hover:bg-rose-400'
      : 'bg-rose-500 text-white hover:bg-rose-600';
  const secondaryButton =
    colorMode === 'dark'
      ? 'bg-[#111a2f] text-slate-200 hover:bg-[#16213a] border border-[#1f2a3d]'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
  const downloadLink =
    colorMode === 'dark'
      ? 'text-slate-300 hover:text-rose-200'
      : 'text-slate-500 hover:text-rose-600';
  const advancedButton =
    colorMode === 'dark'
      ? 'bg-[#111a2f] text-slate-300 hover:text-rose-200 border border-[#1f2a3d]'
      : 'bg-slate-100 text-slate-600 hover:text-rose-600 border border-slate-200';

  const isSelected = (view) => currentViewDisplay === view;
  const canShowLayersPanel =
    Array.isArray(activeItemList) &&
    typeof setActiveItemList === 'function' &&
    typeof updateSessionLayerActiveItemList === 'function' &&
    typeof setSelectedId === 'function' &&
    typeof hideItemInLayer === 'function';

  let viewContent = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY) {
    viewContent = (
      <PromptGenerator
        promptText={promptText}
        setPromptText={setPromptText}
        submitGenerateNewRequest={submitGenerateNewRequest}
        isGenerationPending={isGenerationPending}
        selectedGenerationModel={selectedGenerationModel}
        setSelectedGenerationModel={setSelectedGenerationModel}
        generationError={generationError}
        aspectRatio={aspectRatio}
        showModelSelector={false}
      />
    );
  } else if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY) {
    viewContent = (
      <ImageEditGenerator
        promptText={promptText}
        setPromptText={setPromptText}
        submitOutpaintRequest={submitOutpaintRequest}
        selectedEditModel={selectedEditModel}
        setSelectedEditModel={setSelectedEditModel}
        selectedEditModelValue={selectedEditModelValue}
        isOutpaintPending={isOutpaintPending}
        outpaintError={outpaintError}
        editBrushWidth={editBrushWidth}
        setEditBrushWidth={setEditBrushWidth}
        showModelSelector={false}
      />
    );
  } else if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY) {
    viewContent = (
      <div className="m-auto text-center grid grid-cols-2">
        <div className="text-center m-auto align-center mt-4 mb-4">
          <FaUpload className="text-2xl m-auto cursor-pointer" onClick={showUploadAction} />
          <div className="text-[12px] tracking-tight m-auto text-center">Upload</div>
        </div>
        <div className="text-center m-auto align-center mt-4 mb-4">
          <TbLibraryPhoto className="text-2xl m-auto cursor-pointer" onClick={onShowLibrary} />
          <div className="text-[12px] tracking-tight m-auto text-center">Library</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-2 h-full overflow-y-auto">
      <div className={`${panelSurface} rounded-xl p-3 min-h-full flex flex-col`}>
        <div className="flex flex-col gap-2">
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${isSelected(CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY) ? pillSelected : pillUnselected}`}
            onClick={() => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY)}
          >
            Generate Image
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${isSelected(CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY) ? pillSelected : pillUnselected}`}
            onClick={() => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY)}
          >
            Edit Image
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${isSelected(CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY) ? pillSelected : pillUnselected}`}
            onClick={() => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY)}
          >
            Upload/Library
          </button>
        </div>

        {aspectRatioOptions && aspectRatioOptions.length > 0 && (
          <div className={`mt-4 ${textColor}`}>
            <div className="text-xs font-semibold mb-1">Aspect Ratio</div>
            <select
              className={`w-full rounded-md px-2 py-2 text-xs ${
                colorMode === 'dark'
                  ? 'bg-[#111a2f] border border-[#1f2a3d] text-slate-100'
                  : 'bg-white border border-slate-200 text-slate-900'
              }`}
              value={aspectRatio}
              onChange={(evt) => onAspectRatioChange?.(evt.target.value)}
            >
              {aspectRatioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4">{viewContent}</div>

        {canShowLayersPanel && (
          <ImageLayersPanel
            activeItemList={activeItemList}
            setActiveItemList={setActiveItemList}
            updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onToggleItemVisibility={hideItemInLayer}
          />
        )}

        <div className="mt-4 pt-3 border-t border-slate-200/20 flex items-center justify-between">
          <button
            className={`text-xs font-medium ${downloadLink}`}
            onClick={onDownloadSimple}
          >
            Download image
          </button>
          <button
            className={`text-xs px-2 py-1 rounded-md ${advancedButton}`}
            onClick={onDownloadAdvanced}
          >
            Advanced
          </button>
        </div>
      </div>
    </div>
  );
}
