import React, { useEffect, useRef, useState } from 'react';

const VIDEO_SYNC_SEEK_TOLERANCE_SECONDS = 0.2;
const VIDEO_END_EPSILON_SECONDS = 0.05;

function getDefaultVideoLayout(videoType) {
  return {
    width: '100%',
    height: '100%',
    left: '0px',
    top: '0px',
    objectFit: videoType === 'user_video' ? 'contain' : 'cover',
  };
}

export default function VideoUnderlay(props) {
  const {
    aiVideoLayer,
    currentLayerSeek = 0,
    canvasDimensions,
    aiVideoLayerType,
    nextAiVideoLayer,
    nextAiVideoLayerType,
    isVideoPreviewPlaying = false,
  } = props;

  const videoRef = useRef(null);
  const nextVideoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoLayout, setVideoLayout] = useState(getDefaultVideoLayout(aiVideoLayerType));
  const normalizedNextVideoSrc = typeof nextAiVideoLayer === 'string' && nextAiVideoLayer.trim()
    ? nextAiVideoLayer.trim()
    : '';

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

  useEffect(() => {
    const newVideoSrc = typeof aiVideoLayer === 'string' && aiVideoLayer.trim()
      ? aiVideoLayer.trim()
      : '';

    if (videoSrc === newVideoSrc) {
      return;
    }

    setVideoSrc(newVideoSrc);
    setIsVideoReady(false);
    setVideoLayout(getDefaultVideoLayout(aiVideoLayerType));

    if (!newVideoSrc && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [aiVideoLayer, aiVideoLayerType, videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) {
      return undefined;
    }

    let isCancelled = false;

    const markReady = () => {
      if (isCancelled) {
        return;
      }
      setVideoLayout(resolveVideoLayout(video));
      setIsVideoReady(true);
    };

    const handleLoadedMetadata = () => {
      if (!isCancelled) {
        setVideoLayout(resolveVideoLayout(video));
      }
    };

    const handleError = () => {
      if (!isCancelled) {
        setIsVideoReady(false);
      }
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('canplaythrough', markReady);
    video.addEventListener('error', handleError);

    if (video.readyState >= 2) {
      markReady();
    } else {
      try {
        video.load();
      } catch (err) {
        // Ignore best-effort preload failures; the video element will emit an error if needed.
      }
    }

    return () => {
      isCancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', markReady);
      video.removeEventListener('canplay', markReady);
      video.removeEventListener('canplaythrough', markReady);
      video.removeEventListener('error', handleError);
    };
  }, [aiVideoLayerType, canvasDimensions, videoSrc]);

  useEffect(() => {
    const nextVideo = nextVideoRef.current;

    if (!nextVideo || !normalizedNextVideoSrc || normalizedNextVideoSrc === videoSrc) {
      return;
    }

    nextVideo.preload = 'auto';
    nextVideo.muted = true;
    nextVideo.playsInline = true;
    try {
      nextVideo.load();
    } catch (err) {
      // Ignore best-effort preloading failures; playback still falls back to normal loading.
    }
  }, [normalizedNextVideoSrc, nextAiVideoLayerType, videoSrc]);

  // Seek to currentLayerSeek when video is ready or when currentLayerSeek changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || Number.isNaN(Number(currentLayerSeek))) {
      return undefined;
    }

    const syncToCurrentSeek = () => {
      const rawSeekTime = Math.max(0, Number(currentLayerSeek) || 0);
      const hasKnownDuration = Number.isFinite(video.duration) && video.duration > 0;
      const maxSeekTime = hasKnownDuration
        ? Math.max(0, video.duration - VIDEO_END_EPSILON_SECONDS)
        : rawSeekTime;
      const nextSeekTime = hasKnownDuration
        ? Math.min(rawSeekTime, maxSeekTime)
        : rawSeekTime;

      if (!isVideoPreviewPlaying) {
        if (!video.paused) {
          video.pause();
        }
        if (Math.abs(video.currentTime - nextSeekTime) > 0.01) {
          video.currentTime = nextSeekTime;
        }
        return;
      }

      const shouldCorrectDrift =
        Math.abs(video.currentTime - nextSeekTime) > VIDEO_SYNC_SEEK_TOLERANCE_SECONDS
        || (video.ended && (!hasKnownDuration || nextSeekTime < maxSeekTime));

      if (shouldCorrectDrift) {
        video.currentTime = nextSeekTime;
      }

      if (hasKnownDuration && rawSeekTime >= video.duration - VIDEO_END_EPSILON_SECONDS) {
        video.pause();
        return;
      }

      if (video.paused) {
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(() => {});
        }
      }
    };

    if (isVideoReady) {
      syncToCurrentSeek();
      return undefined;
    }

    const handleLoadedData = () => {
      syncToCurrentSeek();
    };

    video.addEventListener('loadeddata', handleLoadedData, { once: true });

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [currentLayerSeek, isVideoPreviewPlaying, isVideoReady]);

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
          preload="auto"
          playsInline
          style={{
            position: 'absolute',
            width: videoLayout.width,
            height: videoLayout.height,
            left: videoLayout.left,
            top: videoLayout.top,
            objectFit: videoLayout.objectFit,
          }}
        />
        {normalizedNextVideoSrc && normalizedNextVideoSrc !== videoSrc && (
          <video
            ref={nextVideoRef}
            src={normalizedNextVideoSrc}
            muted
            preload="auto"
            playsInline
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {isVideoReady === false && aiVideoLayer && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Loading video...</div>
        </div>
      )}
    </div>
  );
}
