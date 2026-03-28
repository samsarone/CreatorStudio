import React from 'react';
import { FaUpload, FaChevronDown } from 'react-icons/fa';
import { TbLibraryPhoto } from 'react-icons/tb';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { CURRENT_TOOLBAR_VIEW } from '../../constants/Types.ts';
import PromptGenerator from '../video/toolbars/PromptGenerator.jsx';
import ImageEditGenerator from '../video/toolbars/ImageEditGenerator.jsx';
import AddText from '../video/toolbars/text_toolbar/AddText.tsx';
import ImageLayersPanel from './ImageLayersPanel.jsx';
import {
  findAspectRatioOptionForCanvasDimensions,
  getSimplifiedAspectRatioLabel,
  normalizeCanvasDimensions,
} from '../../utils/canvas.jsx';
import { imageAspectRatioOptions } from '../../constants/ImageAspectRatios.js';

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
    textConfig,
    setTextConfig,
    addText,
    setAddText,
    submitAddText,
    aspectRatio,
    canvasDimensions,
    generationAspectRatio,
    setGenerationAspectRatio,
    onEditProject,
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
  const sectionButtonClass = `w-full rounded-2xl px-4 py-2.5 text-[15px] font-medium transition flex items-center justify-between ${
    colorMode === 'dark' ? 'shadow-[0_10px_22px_rgba(2,6,23,0.22)]' : 'shadow-sm'
  }`;
  const actionIconClass = 'text-[30px] m-auto cursor-pointer';
  const actionLabelClass = 'mt-2 text-[13px] font-medium tracking-tight';

  const isSelected = (view) => currentViewDisplay === view;
  const canShowLayersPanel =
    Array.isArray(activeItemList) &&
    typeof setActiveItemList === 'function' &&
    typeof updateSessionLayerActiveItemList === 'function' &&
    typeof setSelectedId === 'function' &&
    typeof hideItemInLayer === 'function';
  const aspectRatioLabel = aspectRatio || '1:1';
  const aspectRatioSurface =
    colorMode === 'dark'
      ? 'bg-[#111a2f] border border-[#1f2a3d]'
      : 'bg-slate-50 border border-slate-200';
  const normalizedCanvasDimensions = normalizeCanvasDimensions(canvasDimensions, aspectRatioLabel);
  const matchingCanvasAspectRatioOption = findAspectRatioOptionForCanvasDimensions(
    normalizedCanvasDimensions,
    imageAspectRatioOptions
  );
  const canvasLabel = matchingCanvasAspectRatioOption
    ? matchingCanvasAspectRatioOption.label
    : `Custom (${getSimplifiedAspectRatioLabel(normalizedCanvasDimensions)})`;

  const toolbarSections = [
    {
      label: 'Generate Image',
      view: CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY,
      content: (
      <PromptGenerator
        promptText={promptText}
        setPromptText={setPromptText}
        submitGenerateNewRequest={submitGenerateNewRequest}
        isGenerationPending={isGenerationPending}
        selectedGenerationModel={selectedGenerationModel}
        setSelectedGenerationModel={setSelectedGenerationModel}
        generationError={generationError}
        aspectRatio={generationAspectRatio}
        setAspectRatio={setGenerationAspectRatio}
        canvasDimensions={normalizedCanvasDimensions}
        showModelSelector={false}
        sizeVariant="imageStudio"
      />
      ),
    },
    {
      label: 'Edit Image',
      view: CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY,
      content: (
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
        aspectRatio={generationAspectRatio}
        setAspectRatio={setGenerationAspectRatio}
        canvasDimensions={normalizedCanvasDimensions}
        showModelSelector={false}
        sizeVariant="imageStudio"
      />
      ),
    },
    {
      label: 'Add Text',
      view: CURRENT_TOOLBAR_VIEW.SHOW_ADD_TEXT_DISPLAY,
      content: (
      <AddText
        setAddText={setAddText}
        submitAddText={submitAddText}
        addText={addText}
        textConfig={textConfig}
        setTextConfig={setTextConfig}
        editorVariant="imageStudio"
      />
      ),
    },
    {
      label: 'Upload/Library',
      view: CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY,
      content: (
      <div className="m-auto grid grid-cols-2 gap-3 text-center">
        <button
          type="button"
          className={`${secondaryButton} rounded-2xl px-4 py-4 text-center transition`}
          onClick={showUploadAction}
        >
          <FaUpload className={actionIconClass} />
          <div className={actionLabelClass}>Upload</div>
        </button>
        <button
          type="button"
          className={`${secondaryButton} rounded-2xl px-4 py-4 text-center transition`}
          onClick={onShowLibrary}
        >
          <TbLibraryPhoto className={actionIconClass} />
          <div className={actionLabelClass}>Library</div>
        </button>
      </div>
      ),
    },
  ];

  return (
    <div
      className="h-full overflow-y-auto px-4 pt-3"
      style={{ paddingBottom: 'calc(var(--assistant-sidebar-safe-bottom, 0px) + 1.25rem)' }}
    >
      <div className={`${panelSurface} min-h-full rounded-[22px] p-4 flex flex-col gap-4`}>
        <div className={`${aspectRatioSurface} rounded-2xl px-4 py-3 flex items-center justify-between gap-3`}>
          <div>
            <div className={`text-[11px] uppercase tracking-[0.22em] ${colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Canvas
            </div>
            <div className={`text-sm font-semibold ${textColor}`}>{canvasLabel}</div>
            <div className={`text-[13px] ${colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {normalizedCanvasDimensions.width} x {normalizedCanvasDimensions.height} px
            </div>
          </div>
          <button
            type="button"
            className={`rounded-xl px-3.5 py-2 text-sm font-medium ${secondaryButton}`}
            onClick={() => onEditProject?.()}
          >
            Edit
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {toolbarSections.map((section) => (
            <div key={section.view}>
              <button
                type="button"
                className={`${sectionButtonClass} ${isSelected(section.view) ? pillSelected : pillUnselected}`}
                onClick={() => toggleCurrentViewDisplay(section.view)}
              >
                <span>{section.label}</span>
                <FaChevronDown
                  className={`text-xs transition-transform duration-150 ${isSelected(section.view) ? 'rotate-180' : ''}`}
                />
              </button>
              {isSelected(section.view) && <div className="mt-3">{section.content}</div>}
            </div>
          ))}
        </div>

        {canShowLayersPanel && (
          <ImageLayersPanel
            activeItemList={activeItemList}
            setActiveItemList={setActiveItemList}
            updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onToggleItemVisibility={hideItemInLayer}
            sizeVariant="imageStudio"
          />
        )}

        <div className="mt-auto pt-4 border-t border-slate-200/20 flex items-center justify-between gap-3">
          <button
            className={`text-sm font-medium ${downloadLink}`}
            onClick={onDownloadSimple}
          >
            Download image
          </button>
          <button
            className={`rounded-xl px-3.5 py-2 text-sm font-medium ${advancedButton}`}
            onClick={onDownloadAdvanced}
          >
            Advanced
          </button>
        </div>
      </div>
    </div>
  );
}
