import React from "react";
import SecondaryButton from "../../common/SecondaryButton.tsx";
import SecondaryPublicButton from "../../common/buttons/SecondaryPublicButton.tsx";
import { useNavigate } from "react-router-dom";
import { FaExpandArrowsAlt, FaDownload, FaTimes } from "react-icons/fa";
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
    toggleStageZoom,
    requestRegenerateSubtitles,
    displayZoomType,
    stageZoomScale,
    requestRegenerateAnimations,
    requestRealignLayers,
    requestRealignToAiVideoAndLayers,
    canvasActualDimensions,
    totalEffectiveDuration,
    regenerateVideoSessionSubtitles,
    setIsVideoPreviewPlaying,
    isVideoPreviewPlaying,
  } = props;

  const {  toggleShowGridOverlay, toggleIsVideoPreviewPlaying } = useContext(NavCanvasControlContext);

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const navigate = useNavigate();
  const { t } = useLocalization();
  let expressGenerationLink = null;



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





  let expandButtonText = (
    <div className="flex">
      <FaExpandArrowsAlt className="inline-flex mt-[2px] mr-2" /> {t("common.expand")}
    </div>
  );
  if (displayZoomType === "fill") {
    expandButtonText = (
      <div className="flex">
        <FaExpandArrowsAlt className="inline-flex mt-[2px] mr-2" /> {t("common.collapse")}
      </div>
    );
  }



  const showGridView = () => {
    // Simply toggle the grid overlay on/off
    toggleShowGridOverlay();
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
            <div className="block">
              <div className="font-bold">
                {totalEffectiveDuration ? totalEffectiveDuration.toFixed(2) : '-'}
              </div>
              <div className="">
                {t("common.duration")}
              </div>
            </div>
          </div>
        </div>


      </div>

    );
  }


  return (
    <div className="h-[25px] md:mt-[-10px] md:mb-[10px] relative flex justify-center" style={{ zIndex: 5 }}>

      <div className="flex flex-row gap-4">

        {canvasDimensionsDisplay}
        {expressGenerationLink}
        <div>
          <SecondaryButton onClick={toggleStageZoom}>
            {expandButtonText}
          </SecondaryButton>
        </div>
        <div>
          <SecondaryButton onClick={downloadCurrentFrame}>
            <FaDownload className="text-xs inline-flex mr-1" /> {t("common.frame")}
          </SecondaryButton>
        </div>

        <div>
          <SecondaryButton onClick={showGridView}>
            <IoMdGrid className="text-xs inline-flex mr-1" /> {t("common.grid")}
          </SecondaryButton>
        </div>





        <div>
          <SecondaryPublicButton onClick={showPlayPause}>
            {isVideoPreviewPlaying ? <><FaPause className="text-xs inline-flex mr-1" /> {t("common.pause")}</> : <><FaPlay className="text-xs inline-flex mr-1" /> {t("common.play")}</>}
          </SecondaryPublicButton>
        </div>




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
