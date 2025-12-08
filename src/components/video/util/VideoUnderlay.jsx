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

  // Preload video when aiVideoLayer changes
  useEffect(() => {
    if (aiVideoLayer) {
       
      const newVideoSrc = `${aiVideoLayer}`;

      // If the video source is different, preload it
      if (videoSrc !== newVideoSrc) {
        setIsVideoReady(false);

        // Preload the new video
        const video = document.createElement('video');
        video.src = newVideoSrc;
        video.preload = 'auto';

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

        video.addEventListener('canplaythrough', handleCanPlayThrough);

        video.onerror = () => {
          
        };

        // Clean up event listener
        return () => {
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
      }
    } else {
      // No aiVideoLayer, clear the video
      if (videoSrc !== '') {
        setVideoSrc('');
        setIsVideoReady(false);

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = '';
        }
      }
    }
  }, [aiVideoLayer, videoSrc]);

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
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {aiVideoLayer && (
        <div
          className="absolute top-0 left-0 z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="bg-gray-900 border border-neutral-200 rounded-lg px-2 py-1 m-auto relative flex items-center space-x-2">
            <span className="text-white font-semibold">Video Layer</span>
            {/* The “Delete Layer” button (FaTimes) */}
            <FaTimes
              className="cursor-pointer hover:text-neutral-400"
              onClick={removeVideoLayer}
            />
            {/* New pill showing the current video type */}
            <span className="text-sm bg-blue-600 text-white rounded-full px-2 py-1">
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
