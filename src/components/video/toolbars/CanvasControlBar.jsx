import React from "react";
import SecondaryButton from "../../common/SecondaryButton.tsx";
import SecondaryPublicButton from "../../common/buttons/SecondaryPublicButton.tsx";
import { useNavigate } from "react-router-dom";
import { FaDownload, FaTimes } from "react-icons/fa";
import { useAlertDialog } from "../../../contexts/AlertDialogContext.jsx";
import SingleSelect from "../../common/SingleSelect.jsx";
import { IoMdGrid } from "react-icons/io";
import { useLocalization } from "../../../contexts/LocalizationContext.jsx";

import { NavCanvasControlContext } from "../../../contexts/NavCanvasControlContext.jsx";
import { useContext } from "react";

import {
  FaPlay, FaPause
} from 'react-icons/fa';



export default function CanvasControlBar(props) {
  const {
    downloadCurrentFrame,
    isExpressGeneration,
    sessionId,
    requestRegenerateSubtitles,
    requestRegenerateAnimations,
    requestRealignLayers,
    requestRealignToAiVideoAndLayers,
    canvasActualDimensions,
    totalEffectiveDuration,
    regenerateVideoSessionSubtitles,
    setIsVideoPreviewPlaying,
    isVideoPreviewPlaying,
    isRenderPending,
    editorVariant = 'videoStudio',
  } = props;

  const {
    showCanvasNavigationGrid,
    toggleShowCanvasNavigationGrid,
    canvasNavigationGridGranularity,
    setCanvasNavigationGridGranularity,
    zoomCanvasIn,
    zoomCanvasOut,
    resetCanvasZoom,
    canvasZoomPercent,
    canZoomInCanvas,
    canZoomOutCanvas,
  } = useContext(NavCanvasControlContext);

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const isImageStudio = editorVariant === 'imageStudio';
  let expressGenerationLink = null;
  const gridGranularityOptions = Array.from({ length: 10 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1}x`,
  }));
  const selectedGridGranularityOption =
    gridGranularityOptions.find((option) => option.value === canvasNavigationGridGranularity)
    || gridGranularityOptions[2];



  const showAddSubtitlesDialog = () => {
    openAlertDialog(
      <div>

        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <AddSubtitlesDialog
          requestRegenerateSubtitles={requestRegenerateSubtitles}
          closeAlertDialog={closeAlertDialog}
          requestRegenerateAnimations={requestRegenerateAnimations}
          requestRealignLayers={requestRealignLayers}
          requestRealignToAiVideoAndLayers={requestRealignToAiVideoAndLayers}
          t={t}
        />
      </div>
    );
  };
  const showPlayPause = () => {
   // toggleIsVideoPreviewPlaying();
   isVideoPreviewPlaying ? setIsVideoPreviewPlaying(false) : setIsVideoPreviewPlaying(true);
  }

  let canvasDimensionsDisplay = null;
  if (canvasActualDimensions) {

    canvasDimensionsDisplay = (
      <div>

        <div className="text-xs inline-block">
          <div className="inline-block mr-2">
            <div className="block">
              <div className="font-bold">
                {canvasActualDimensions.width} x {canvasActualDimensions.height}
              </div>
              <div className="">
                {t("common.dimensions")}
              </div>
            </div>
          </div>
          <div className="inline-block mr-4">
            {!isImageStudio && (
              <div className="block">
                <div className="font-bold">
                  {totalEffectiveDuration ? totalEffectiveDuration.toFixed(2) : '-'}
                </div>
                <div className="">
                  {t("common.duration")}
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

    );
  }
  const disabledShellClass = isRenderPending ? "pending-disabled-shell" : "";

  return (
    <div
      className={`h-[25px] md:mt-[-10px] md:mb-[10px] relative flex justify-center ${disabledShellClass}`}
      style={{ zIndex: 5 }}
      aria-disabled={isRenderPending}
    >

      <div className="flex flex-row gap-4">

        {canvasDimensionsDisplay}
        {expressGenerationLink}
        {!isImageStudio && (
          <div>
            <SecondaryButton onClick={downloadCurrentFrame}>
              <FaDownload className="text-xs inline-flex mr-1" /> {t("common.frame")}
            </SecondaryButton>
          </div>
        )}

        <div className="flex items-center gap-2">
          <SecondaryPublicButton onClick={toggleShowCanvasNavigationGrid}>
            <IoMdGrid className="text-xs inline-flex mr-1" /> {showCanvasNavigationGrid ? 'Hide Canvas Grid' : 'Canvas Grid'}
          </SecondaryPublicButton>
          {showCanvasNavigationGrid && (
            <div className="w-[92px] min-w-[92px] text-xs">
              <SingleSelect
                options={gridGranularityOptions}
                value={selectedGridGranularityOption}
                onChange={(option) => setCanvasNavigationGridGranularity(option?.value || 1)}
                classNamePrefix="canvas-grid-granularity"
                isSearchable={false}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold whitespace-nowrap">
            Zoom {canvasZoomPercent}%
          </div>
          <SecondaryPublicButton onClick={zoomCanvasOut} extraClasses={!canZoomOutCanvas ? 'opacity-50 pointer-events-none' : ''}>
            Out
          </SecondaryPublicButton>
          <SecondaryPublicButton onClick={resetCanvasZoom}>
            Reset
          </SecondaryPublicButton>
          <SecondaryPublicButton onClick={zoomCanvasIn} extraClasses={!canZoomInCanvas ? 'opacity-50 pointer-events-none' : ''}>
            In
          </SecondaryPublicButton>
        </div>

        {!isImageStudio && (
          <div>
            <SecondaryPublicButton onClick={showPlayPause}>
              {isVideoPreviewPlaying ? <><FaPause className="text-xs inline-flex mr-1" /> {t("common.pause")}</> : <><FaPlay className="text-xs inline-flex mr-1" /> {t("common.play")}</>}
            </SecondaryPublicButton>
          </div>
        )}




        <div>

        </div>
      </div>
    </div>
  );
}

const AddSubtitlesDialog = (props) => {
  const { requestRegenerateSubtitles, requestRegenerateAnimations, closeAlertDialog, requestRealignLayers,
    requestRealignToAiVideoAndLayers, t
  } = props;
  const requestRegenerateAndClose = () => {
    requestRegenerateSubtitles();
    closeAlertDialog();
  };

  const requestRegenerateAnimationsAndClose = () => {
    requestRegenerateAnimations();
    closeAlertDialog();

  }

  const requestRealignLayersAndClose = () => {
    requestRealignLayers();
    closeAlertDialog();
  }

  const requestRealignToAiVideoAndLayersAndClose = () => {
    requestRealignToAiVideoAndLayers();
    closeAlertDialog();
  }


  return (
    <div>
      <div>
        <h1>{t("studio.actions.regenerateSubtitlesTitle")}</h1>
      </div>
      <div className="mt-4 mb-2">
        <SecondaryButton onClick={requestRegenerateAndClose} >
          {t("studio.actions.regenerateSubtitle")}
        </SecondaryButton>
      </div>
      <div className="mt-4 mb-2">
        <SecondaryButton onClick={requestRegenerateAnimationsAndClose} >
          {t("studio.actions.regenerateAnimations")}
        </SecondaryButton>
      </div>
      <div className="mt-4 mb-2">
        <SecondaryButton onClick={requestRealignLayersAndClose} >
          {t("studio.actions.realignLayers")}
        </SecondaryButton>
      </div>

      <div className="mt-4 mb-2">
        <SecondaryButton onClick={requestRealignToAiVideoAndLayersAndClose} >
          {t("studio.actions.realignLayersToAiVideo")}
        </SecondaryButton>
      </div>

    </div>
  );
};
