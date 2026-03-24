import React, { useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const PROCESSOR_API_URL = import.meta.env['VITE_PROCESSOR_API'];

export default function VideoUnderlay(props) {
  const {
    aiVideoLayer,
    currentLayerSeek = 0,
    removeVideoLayer,
    canvasDimensions,
    requestLipSyncToSpeech,
    aiVideoLayerType,
  } = props;

  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoLayout, setVideoLayout] = useState({
    width: '100%',
    height: '100%',
    left: '0px',
    top: '0px',
    objectFit: 'cover',
  });

  const resolveVideoLayout = (videoElement) => {
    if (aiVideoLayerType !== 'user_video') {
      return {
        width: '100%',
        height: '100%',
        left: '0px',
        top: '0px',
        objectFit: 'cover',
      };
    }

    const sourceWidth = Number(videoElement?.videoWidth);
    const sourceHeight = Number(videoElement?.videoHeight);
    const canvasWidth = Number(canvasDimensions?.width);
    const canvasHeight = Number(canvasDimensions?.height);

    if (!sourceWidth || !sourceHeight || !canvasWidth || !canvasHeight) {
      return {
        width: '100%',
        height: '100%',
        left: '0px',
        top: '0px',
        objectFit: 'contain',
      };
    }

    const scale = Math.min(1, canvasWidth / sourceWidth, canvasHeight / sourceHeight);
    const displayWidth = Math.max(1, Math.round(sourceWidth * scale));
    const displayHeight = Math.max(1, Math.round(sourceHeight * scale));
    const offsetX = Math.round((canvasWidth - displayWidth) / 2);
    const offsetY = Math.round((canvasHeight - displayHeight) / 2);

    return {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      objectFit: 'contain',
    };
  };

  // Preload video when aiVideoLayer changes
  useEffect(() => {
    if (aiVideoLayer) {
       
      const newVideoSrc = `${aiVideoLayer}`;

      // If the video source is different, preload it
      if (videoSrc !== newVideoSrc) {
        setIsVideoReady(false);
        setVideoLayout({
          width: '100%',
          height: '100%',
          left: '0px',
          top: '0px',
          objectFit: aiVideoLayerType === 'user_video' ? 'contain' : 'cover',
        });

        // Preload the new video
        const video = document.createElement('video');
        video.src = newVideoSrc;
        video.preload = 'auto';

        const handleLoadedMetadata = () => {
          setVideoLayout(resolveVideoLayout(video));
        };

        const handleCanPlayThrough = () => {
          setIsVideoReady(true);
          setVideoSrc(newVideoSrc);

          // Update the video element's src if it's mounted
          if (videoRef.current) {
            const targetVideo = videoRef.current;
            targetVideo.pause();
            targetVideo.src = newVideoSrc;

            const playAttempt = targetVideo.play();
            if (playAttempt && typeof playAttempt.catch === 'function') {
              playAttempt.catch((error) => {
                if (error?.name !== 'AbortError') {
                  
                }
              });
            }
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplaythrough', handleCanPlayThrough);

        video.onerror = () => {
          
        };

        // Clean up event listener
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
      }
    } else {
      // No aiVideoLayer, clear the video
      if (videoSrc !== '') {
        setVideoSrc('');
        setIsVideoReady(false);
        setVideoLayout({
          width: '100%',
          height: '100%',
          left: '0px',
          top: '0px',
          objectFit: 'cover',
        });

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = '';
        }
      }
    }
  }, [aiVideoLayer, aiVideoLayerType, videoSrc]);

  useEffect(() => {
    if (!videoRef.current || !videoSrc) {
      return;
    }

    setVideoLayout(resolveVideoLayout(videoRef.current));
  }, [aiVideoLayerType, canvasDimensions, videoSrc]);

  // Seek to currentLayerSeek when video is ready or when currentLayerSeek changes
  useEffect(() => {
    if (videoRef.current && !isNaN(currentLayerSeek)) {
      const video = videoRef.current;

      const seekToTime = () => {
        video.currentTime = currentLayerSeek;
      };

      if (isVideoReady) {
        seekToTime();
      } else {
        const handleLoadedData = () => {
          seekToTime();
        };

        video.addEventListener('loadeddata', handleLoadedData, { once: true });

        return () => {
          video.removeEventListener('loadeddata', handleLoadedData);
        };
      }
    }
  }, [currentLayerSeek, isVideoReady]);

  // Helper to determine label text
  const getVideoTypeLabel = (type) => {
    switch (type) {
      case 'lip_sync':
        return 'Lip Synced video';
      case 'sound_effect':
        return 'Sound Effect video';
      case 'ai_video':
        return 'Base AI Video';
      case 'user_video':
        return 'Uploaded Video';
      default:
        return 'Unknown Video Type';
    }
  };
  
  return (
    <div
      style={{
        position: 'relative',
        width: `${canvasDimensions.width}px`,
        height: `${canvasDimensions.height}px`,
        overflow: 'hidden',
      }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Allow clicks to pass through if needed
          marginLeft: '1px',
          marginTop: '1px',
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          style={{
            position: 'absolute',
            width: videoLayout.width,
            height: videoLayout.height,
            left: videoLayout.left,
            top: videoLayout.top,
            objectFit: videoLayout.objectFit,
          }}
        />
      </div>

      {aiVideoLayer && (
        <div
          className="absolute top-0 left-0 z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="bg-[#0f1629] border border-[#1f2a3d] rounded-lg px-2 py-1 m-auto relative flex items-center space-x-2 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
            <span className="text-slate-100 font-semibold">Video Layer</span>
            {/* The “Delete Layer” button (FaTimes) */}
            <FaTimes
              className="cursor-pointer hover:text-rose-300 text-slate-200"
              onClick={removeVideoLayer}
            />
            {/* New pill showing the current video type */}
            <span className="text-sm bg-[#e45a26]/20 text-orange-100 border border-[#e45a26]/30 rounded-full px-2 py-1">
              {getVideoTypeLabel(aiVideoLayerType)}
            </span>
          </div>
        </div>
      )}

      {isVideoReady === false && aiVideoLayer && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Loading video...</div>
        </div>
      )}
    </div>
  );
}
