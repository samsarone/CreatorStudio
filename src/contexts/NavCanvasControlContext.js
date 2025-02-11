// NavCanvasControlContext.js
import React, { createContext, useState } from 'react';

export const NavCanvasControlContext = createContext();

export const NavCanvasControlProvider = ({ children }) => {
  const [isExpressGeneration, setIsExpressGeneration] = useState(false);
  const [expressGenerativeVideoRequired, setExpressGenerativeVideoRequired] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [displayZoomType, setDisplayZoomType] = useState('normal');
  const [stageZoomScale, setStageZoomScale] = useState(1);

  // Add state for functions with setters
  const [downloadCurrentFrame, setDownloadCurrentFrame] = useState(() => () => {});
  const [toggleStageZoom, setToggleStageZoom] = useState(() => () => {});
  const [requestRegenerateSubtitles, setRequestRegenerateSubtitles] = useState(() => () => {});
  const [requestRegenerateAnimations, setRequestRegenerateAnimations] = useState(() => () => {});
  const [requestRealignLayers, setRequestRealignLayers] = useState(() => () => {});
  const [ requestRealignToAiVideoAndLayers, setRequestRealignToAiVideoAndLayers] = useState(() => () => {});

  const [canvasActualDimensions, setCanvasActualDimensions] = useState({ width: 1024, height: 1024 });

  const [totalEffectiveDuration, setTotalEffectiveDuration] = useState(0);



  return (
    <NavCanvasControlContext.Provider
      value={{
        isExpressGeneration,
        setIsExpressGeneration,
        sessionId,
        setSessionId,
        displayZoomType,
        setDisplayZoomType,
        stageZoomScale,
        setStageZoomScale,
        downloadCurrentFrame,
        setDownloadCurrentFrame,
        toggleStageZoom,
        setToggleStageZoom,
        requestRegenerateSubtitles,
        setRequestRegenerateSubtitles,
        requestRegenerateAnimations,
        setRequestRegenerateAnimations,
        requestRealignLayers,
        setRequestRealignLayers,
        canvasActualDimensions,
        setCanvasActualDimensions,
        totalEffectiveDuration, 
        setTotalEffectiveDuration,
        requestRealignToAiVideoAndLayers,
        setRequestRealignToAiVideoAndLayers,
        expressGenerativeVideoRequired,
      }}
    >
      {children}
    </NavCanvasControlContext.Provider>
  );
};
