import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  FaCompress,
  FaExpand,
  FaFileUpload,
  FaHome,
  FaMicrophone,
  FaPause,
  FaPlay,
  FaPlus,
  FaStop,
  FaTimesCircle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getHeaders } from '../../../../utils/web';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;
const DISPLAY_FRAMES_PER_SECOND = 30;
const DEBUG_RECORD_SPEECH = true;

const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  return RECORDER_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function getRecordingExtension(mimeType = '') {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType.includes('mp4')) {
    return 'm4a';
  }
  if (normalizedMimeType.includes('ogg')) {
    return 'ogg';
  }
  if (normalizedMimeType.includes('mpeg') || normalizedMimeType.includes('mp3')) {
    return 'mp3';
  }
  return 'webm';
}

function formatRecordingTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

function resolveLayerStartTime(currentLayer = {}) {
  const layerStartTime = Number(currentLayer?.durationOffset ?? currentLayer?.startTime);
  return Number.isFinite(layerStartTime) && layerStartTime >= 0 ? layerStartTime : 0;
}

function resolveBlobDuration(blobUrl) {
  return new Promise((resolve) => {
    if (!blobUrl) {
      resolve(null);
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    audio.onerror = () => resolve(null);
    audio.src = blobUrl;
  });
}

function parseTranscriptTimestamp(value = '') {
  const normalizedValue = value.trim().replace(',', '.');
  if (!normalizedValue) {
    return null;
  }

  const parts = normalizedValue.split(':').map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) {
    const seconds = Number(normalizedValue);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length > 0 ? Number(parts.pop()) : 0;

  if (![seconds, minutes, hours].every((part) => Number.isFinite(part) && part >= 0)) {
    return null;
  }

  return (hours * 3600) + (minutes * 60) + seconds;
}

function parseTimestampedTranscript(text = '') {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s*\[([^\]]+?)\s*(?:-->|-)\s*([^\]]+?)\]\s*(.+?)\s*$/);
      if (!match) {
        return null;
      }

      const startTime = parseTranscriptTimestamp(match[1]);
      const endTime = parseTranscriptTimestamp(match[2]);
      const cueText = match[3].trim();

      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime || !cueText) {
        return null;
      }

      return {
        startTime,
        endTime,
        text: cueText,
      };
    })
    .filter(Boolean)
    .sort((leftCue, rightCue) => leftCue.startTime - rightCue.startTime);
}

function logRecordSpeechDebug(message, payload = {}) {
  if (!DEBUG_RECORD_SPEECH || typeof console === 'undefined') {
    return;
  }

  console.debug(`[RecordSpeech] ${message}`, payload);
}

function warnRecordSpeech(message, payload = {}) {
  if (typeof console === 'undefined') {
    return;
  }

  console.warn(`[RecordSpeech] ${message}`, payload);
}

export default function RecordSpeechSection({
  bgColor,
  text2Color,
  colorMode,
  currentLayer,
  sessionDetails,
  requestAddAudioLayerFromLibrary,
  currentLayerSeek,
  setCurrentLayerSeek,
  isVideoPreviewPlaying,
  setIsVideoPreviewPlaying,
}) {
  const [microphones, setMicrophones] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [micVolume, setMicVolume] = useState(100);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(null);
  const [uploadedLibraryItem, setUploadedLibraryItem] = useState(null);
  const [recorderError, setRecorderError] = useState('');
  const [isUploadPending, setIsUploadPending] = useState(false);
  const [level, setLevel] = useState(0);
  const [isImmersiveActive, setIsImmersiveActive] = useState(false);
  const [transcriptCues, setTranscriptCues] = useState([]);
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [hasAddedToSession, setHasAddedToSession] = useState(false);
  const [recordingPreviewStartSeconds, setRecordingPreviewStartSeconds] = useState(null);
  const [isRecordingPreviewActive, setIsRecordingPreviewActive] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const chunkFlushTimerRef = useRef(null);
  const levelTimerRef = useRef(null);
  const levelSamplesRef = useRef(null);
  const previewAudioRef = useRef(null);
  const recordingUrlRef = useRef('');
  const transcriptInputRef = useRef(null);
  const discardStoppedRecordingRef = useRef(false);
  const recorderStopReasonRef = useRef('idle');
  const currentLayerSeekRef = useRef(0);
  const isStartingRecordingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isImmersiveActiveRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);
  const levelValueRef = useRef(0);
  const lastTranscriptDebugBucketRef = useRef(null);
  const lastTranscriptDebugCueRef = useRef('');

  const borderColor = colorMode === 'dark' ? 'border-[#1f2a3d]' : 'border-slate-200';
  const panelBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-50';
  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const sliderAccent = colorMode === 'dark' ? '#f87171' : '#2563eb';
  const currentLayerStartTime = resolveLayerStartTime(currentLayer);
  const currentPreviewTime = Math.max(0, (Number(currentLayerSeek) || 0) / DISPLAY_FRAMES_PER_SECOND);
  const canUseRecorder = typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== 'undefined';
  const hasRecording = Boolean(recordingBlob && recordingUrl);
  const hasCurrentLayer = Boolean(currentLayer?._id || currentLayer?.id);
  const resolvedRecordingDuration = Number.isFinite(Number(recordingDuration)) && Number(recordingDuration) > 0
    ? Number(recordingDuration)
    : recordingSeconds;
  const layerRelativePreviewTime = Math.max(0, currentPreviewTime - currentLayerStartTime);

  const selectedMicLabel = useMemo(() => {
    const selectedMic = microphones.find((device) => device.deviceId === selectedMicId);
    return selectedMic?.label || 'Default microphone';
  }, [microphones, selectedMicId]);
  const transcriptCandidateTimes = useMemo(() => {
    const candidates = [
      { source: 'sessionTime', value: currentPreviewTime },
      { source: 'layerRelativeTime', value: layerRelativePreviewTime },
      { source: 'durationOffsetAdjustedTime', value: currentPreviewTime + currentLayerStartTime },
    ];
    if (Number.isFinite(Number(recordingPreviewStartSeconds))) {
      candidates.push({
        source: 'recordingElapsedTime',
        value: Math.max(0, currentPreviewTime - Number(recordingPreviewStartSeconds)),
      });
    }

    const seenTimes = new Set();
    return candidates
      .filter(({ value }) => Number.isFinite(value))
      .filter(({ value }) => {
        const roundedValue = Math.round(value * 1000) / 1000;
        if (seenTimes.has(roundedValue)) {
          return false;
        }
        seenTimes.add(roundedValue);
        return true;
      });
  }, [
    currentLayerStartTime,
    currentPreviewTime,
    layerRelativePreviewTime,
    recordingPreviewStartSeconds,
  ]);
  const activeTranscriptCue = useMemo(() => {
    if (!isImmersiveActive || !isRecordingPreviewActive || transcriptCues.length === 0) {
      return null;
    }

    return transcriptCandidateTimes
      .map(({ source, value }) => {
        const cue = transcriptCues.find((candidateCue) => (
          value >= candidateCue.startTime && value < candidateCue.endTime
        ));
        return cue ? { ...cue, matchSource: source, matchTime: value } : null;
      })
      .find(Boolean) || null;
  }, [
    isImmersiveActive,
    isRecordingPreviewActive,
    transcriptCandidateTimes,
    transcriptCues,
  ]);

  const refreshMicrophones = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === 'audioinput');
      setMicrophones(audioInputs);
      setSelectedMicId((currentMicId) => {
        if (currentMicId && audioInputs.some((device) => device.deviceId === currentMicId)) {
          return currentMicId;
        }
        return audioInputs[0]?.deviceId || '';
      });
    } catch {
      setMicrophones([]);
    }
  };

  useEffect(() => {
    refreshMicrophones().catch(() => {});

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshMicrophones);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshMicrophones);
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Number(micVolume) || 0) / 100;
    }
  }, [micVolume]);

  useEffect(() => {
    recordingUrlRef.current = recordingUrl;
  }, [recordingUrl]);

  useEffect(() => {
    const resolvedSeek = Number(currentLayerSeek);
    currentLayerSeekRef.current = Number.isFinite(resolvedSeek) ? resolvedSeek : 0;
  }, [currentLayerSeek]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isImmersiveActiveRef.current = isImmersiveActive;
  }, [isImmersiveActive]);

  useEffect(() => {
    return () => {
      stopRecorderStream();
      clearRecordingTimers();
      if (levelTimerRef.current) {
        window.clearTimeout(levelTimerRef.current);
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (recordingUrlRef.current) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
    };
  }, []);

  const clearRecordingTimers = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (chunkFlushTimerRef.current) {
      window.clearInterval(chunkFlushTimerRef.current);
      chunkFlushTimerRef.current = null;
    }
  };

  const stopRecorderStream = () => {
    if (levelTimerRef.current) {
      window.clearTimeout(levelTimerRef.current);
      levelTimerRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    gainNodeRef.current = null;
    analyserRef.current = null;
    levelSamplesRef.current = null;
    levelValueRef.current = 0;
    setLevel(0);
  };

  const updateLevel = () => {
    const analyser = analyserRef.current;
    if (!analyser || !isRecordingRef.current) {
      return;
    }

    let samples = levelSamplesRef.current;
    if (!samples || samples.length !== analyser.fftSize) {
      samples = new Uint8Array(analyser.fftSize);
      levelSamplesRef.current = samples;
    }

    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex];
      const centeredSample = (sample - 128) / 128;
      sumSquares += centeredSample * centeredSample;
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const nextLevel = Math.min(1, rms * 4);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (
      now - lastLevelUpdateRef.current > 100 ||
      Math.abs(nextLevel - levelValueRef.current) > 0.08
    ) {
      lastLevelUpdateRef.current = now;
      levelValueRef.current = nextLevel;
      setLevel(nextLevel);
    }
    levelTimerRef.current = window.setTimeout(updateLevel, 100);
  };

  const resetRecording = ({ preserveRecordingPreview = false } = {}) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }
    setRecordingBlob(null);
    setRecordingUrl('');
    setRecordingDuration(null);
    setUploadedLibraryItem(null);
    setHasAddedToSession(false);
    setIsPlayingPreview(false);
    setRecordingSeconds(0);
    if (!preserveRecordingPreview) {
      setRecordingPreviewStartSeconds(null);
      setIsRecordingPreviewActive(false);
    }
  };

  const startRecording = async ({ onStarted, preserveRecordingPreview = false } = {}) => {
    if (!canUseRecorder || isRecording || isStartingRecordingRef.current) {
      return false;
    }

    isStartingRecordingRef.current = true;
    setIsStartingRecording(true);
    setRecorderError('');
    resetRecording({ preserveRecordingPreview });

    try {
      const constraints = {
        audio: selectedMicId
          ? { deviceId: { exact: selectedMicId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          recorderStopReasonRef.current = 'microphone_track_ended';
          warnRecordSpeech('microphone track ended while recording', {
            label: track.label,
            readyState: track.readyState,
            muted: track.muted,
          });
        };
        track.onmute = () => {
          warnRecordSpeech('microphone track muted', {
            label: track.label,
            readyState: track.readyState,
          });
        };
      });
      refreshMicrophones().catch(() => {});

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      const analyserNode = audioContext.createAnalyser();
      const destinationNode = audioContext.createMediaStreamDestination();
      gainNode.gain.value = Math.max(0, Number(micVolume) || 0) / 100;
      analyserNode.fftSize = 256;
      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(destinationNode);

      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
      analyserRef.current = analyserNode;
      levelSamplesRef.current = new Uint8Array(analyserNode.fftSize);
      levelValueRef.current = 0;
      lastLevelUpdateRef.current = 0;

      const mimeType = getSupportedRecorderMimeType();
      const recorder = new MediaRecorder(
        destinationNode.stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      discardStoppedRecordingRef.current = false;
      recorderStopReasonRef.current = 'unexpected_stop';

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        recorderStopReasonRef.current = 'recorder_error';
        warnRecordSpeech('media recorder error', {
          error: event?.error?.message || event?.message || String(event),
          state: recorder.state,
          mimeType: recorder.mimeType,
        });
      };

      recorder.onstop = async () => {
        const stopReason = recorderStopReasonRef.current;
        clearRecordingTimers();
        logRecordSpeechDebug('media recorder stopped', {
          reason: stopReason,
          chunks: recordedChunksRef.current.length,
          seconds: Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
          discarded: discardStoppedRecordingRef.current,
        });

        if (discardStoppedRecordingRef.current) {
          discardStoppedRecordingRef.current = false;
          recordedChunksRef.current = [];
          recorderStopReasonRef.current = 'idle';
          setIsRecording(false);
          stopRecorderStream();
          return;
        }

        const recordedMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: recordedMimeType });
        const objectUrl = URL.createObjectURL(blob);
        setRecordingBlob(blob);
        setRecordingUrl(objectUrl);
        const duration = await resolveBlobDuration(objectUrl);
        setRecordingDuration(duration);
        setIsRecording(false);
        stopRecorderStream();
        recorderStopReasonRef.current = 'idle';
      };

      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      isRecordingRef.current = true;
      setIsRecording(true);
      if (typeof onStarted === 'function') {
        onStarted();
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 250);
      chunkFlushTimerRef.current = window.setInterval(() => {
        if (recorder.state !== 'recording' || typeof recorder.requestData !== 'function') {
          return;
        }

        try {
          recorder.requestData();
        } catch (error) {
          warnRecordSpeech('failed to flush recorder chunk', {
            error: error?.message || String(error),
            state: recorder.state,
          });
        }
      }, 1000);
      updateLevel();
      return true;
    } catch (error) {
      setRecorderError(error?.message || 'Unable to start microphone recording.');
      isRecordingRef.current = false;
      setIsRecording(false);
      clearRecordingTimers();
      stopRecorderStream();
      return false;
    } finally {
      isStartingRecordingRef.current = false;
      setIsStartingRecording(false);
    }
  };

  const stopRecording = ({ discard = false } = {}) => {
    if (!isRecording || !mediaRecorderRef.current) {
      return;
    }

    if (discard) {
      discardStoppedRecordingRef.current = true;
    }
    recorderStopReasonRef.current = discard ? 'discard' : 'user_stop';

    clearRecordingTimers();
    setRecordingSeconds(Math.max(1, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)));
    mediaRecorderRef.current.stop();
    isRecordingRef.current = false;
    if (isImmersiveActive && typeof setIsVideoPreviewPlaying === 'function') {
      setIsRecordingPreviewActive(false);
      setIsVideoPreviewPlaying(false);
    }
  };

  const togglePreviewPlayback = () => {
    if (!recordingUrl) {
      return;
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(recordingUrl);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    } else if (previewAudioRef.current.src !== recordingUrl) {
      previewAudioRef.current.pause();
      previewAudioRef.current = new Audio(recordingUrl);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    previewAudioRef.current.currentTime = 0;
    previewAudioRef.current
      .play()
      .then(() => setIsPlayingPreview(true))
      .catch(() => setIsPlayingPreview(false));
  };

  const uploadRecording = async () => {
    if (!recordingBlob || !recordingUrl || !sessionDetails?._id) {
      return null;
    }

    if (uploadedLibraryItem) {
      return uploadedLibraryItem;
    }

    const headers = getHeaders();
    if (!headers) {
      setRecorderError('You must be logged in to save recorded speech.');
      return null;
    }

    setIsUploadPending(true);
    setRecorderError('');

    try {
      const dataURL = await readBlobAsDataUrl(recordingBlob);
      const extension = getRecordingExtension(recordingBlob.type);
      const response = await axios.post(`${PROCESSOR_API_URL}/video_sessions/upload_audio_library_item`, {
        sessionId: sessionDetails._id.toString(),
        dataURL,
        fileName: `recorded-speech.${extension}`,
        generationType: 'custom_speech',
        libraryType: 'speech',
        title: 'Recorded speech',
        speakerCharacterName: 'Recorded speech',
        addTranscription: false,
        volume: Number(micVolume) || 100,
      }, headers);

      const uploadedItem = response?.data?.item || null;
      if (uploadedItem) {
        setUploadedLibraryItem(uploadedItem);
      }
      return uploadedItem;
    } catch (error) {
      setRecorderError(error?.response?.data?.error || 'Unable to save recorded speech.');
      return null;
    } finally {
      setIsUploadPending(false);
    }
  };

  const handleAddToLibrary = async () => {
    const uploadedItem = await uploadRecording();
    if (uploadedItem) {
      toast.success('Recorded speech added to library.', {
        position: 'bottom-center',
        className: 'custom-toast',
      });
    }
  };

  const handleAddToSession = async () => {
    if (typeof requestAddAudioLayerFromLibrary !== 'function') {
      setRecorderError('Unable to add recorded speech to this session.');
      return;
    }

    const uploadedItem = await uploadRecording();
    if (!uploadedItem) {
      return;
    }

    requestAddAudioLayerFromLibrary(uploadedItem, {
      startTime: currentLayerStartTime,
      duration: resolvedRecordingDuration || uploadedItem.duration || 1,
      volume: Number(micVolume) || 100,
      addSubtitles: false,
      audioBindingMode: 'unbounded',
      bindToLayer: false,
      studioSpeechGeneration: true,
    });
    setHasAddedToSession(true);
  };

  const deleteUploadedRecording = async () => {
    if (!uploadedLibraryItem || !sessionDetails?._id) {
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      return;
    }

    await axios.post(`${PROCESSOR_API_URL}/video_sessions/delete_audio_library_item`, {
      sessionId: sessionDetails._id.toString(),
      audioItem: uploadedLibraryItem,
      deleteAsset: !hasAddedToSession,
    }, headers).catch(() => {});
  };

  const handleDeleteRecording = async () => {
    if (isRecording) {
      stopRecording({ discard: true });
    }
    await deleteUploadedRecording();
    resetRecording();
  };

  const handleTranscriptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setTranscriptError('');

    try {
      const text = await file.text();
      const parsedCues = parseTimestampedTranscript(text);
      if (parsedCues.length === 0) {
        throw new Error('No timestamped transcript cues found.');
      }

      setTranscriptCues(parsedCues);
      setTranscriptFileName(file.name);
      logRecordSpeechDebug('transcript parsed', {
        fileName: file.name,
        cues: parsedCues.length,
        firstCue: parsedCues[0],
        lastCue: parsedCues[parsedCues.length - 1],
      });
    } catch (error) {
      setTranscriptCues([]);
      setTranscriptFileName('');
      setTranscriptError(error?.message || 'Unable to read transcript file.');
      warnRecordSpeech('transcript parse failed', {
        fileName: file.name,
        error: error?.message || String(error),
      });
    } finally {
      event.target.value = '';
    }
  };

  const openTranscriptUpload = () => {
    transcriptInputRef.current?.click();
  };

  const resolveCurrentSeekFrame = () => {
    const currentSeekFrame = Number(currentLayerSeekRef.current);
    if (Number.isFinite(currentSeekFrame)) {
      return Math.max(0, Math.round(currentSeekFrame));
    }

    return Math.max(0, Math.round(currentLayerStartTime * DISPLAY_FRAMES_PER_SECOND));
  };

  const startNormalVideoPlayback = () => {
    if (typeof setIsVideoPreviewPlaying !== 'function') {
      return;
    }

    setIsVideoPreviewPlaying(true);
  };

  const startSessionPreviewFromCurrentSeek = () => {
    const startFrame = resolveCurrentSeekFrame();
    currentLayerSeekRef.current = startFrame;
    setRecordingPreviewStartSeconds(startFrame / DISPLAY_FRAMES_PER_SECOND);
    setIsRecordingPreviewActive(true);
    if (typeof setCurrentLayerSeek === 'function') {
      setCurrentLayerSeek(startFrame);
    }
    startNormalVideoPlayback();
  };

  const handleStartRecordingWithPreview = async () => {
    startSessionPreviewFromCurrentSeek();
    const didStartRecording = await startRecording({ preserveRecordingPreview: true }).catch(() => false);
    if (!didStartRecording) {
      setRecordingPreviewStartSeconds(null);
      setIsRecordingPreviewActive(false);
      if (typeof setIsVideoPreviewPlaying === 'function') {
        setIsVideoPreviewPlaying(false);
      }
    }
  };

  const handleStartRecordingClick = () => {
    handleStartRecordingWithPreview();
  };

  const requestImmersiveFullscreen = async () => {
    if (typeof document === 'undefined' || document.fullscreenElement) {
      return;
    }

    await document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const openImmersiveMode = async () => {
    if (isImmersiveActive) {
      closeImmersiveMode();
      return;
    }
    if (typeof setIsVideoPreviewPlaying === 'function') {
      setIsVideoPreviewPlaying(false);
    }
    isImmersiveActiveRef.current = true;
    setIsImmersiveActive(true);
    await requestImmersiveFullscreen();
  };

  const closeImmersiveMode = () => {
    if (isRecordingRef.current) {
      return;
    }

    if (isRecording) {
      stopRecording();
    }
    setIsRecordingPreviewActive(false);
    if (typeof setIsVideoPreviewPlaying === 'function') {
      setIsVideoPreviewPlaying(false);
    }
    isImmersiveActiveRef.current = false;
    setIsImmersiveActive(false);

    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const handleFullscreenChange = () => {
      if (isImmersiveActive && !document.fullscreenElement) {
        if (isRecordingRef.current) {
          return;
        }

        setIsRecordingPreviewActive(false);
        isImmersiveActiveRef.current = false;
        setIsImmersiveActive(false);
        if (typeof setIsVideoPreviewPlaying === 'function') {
          setIsVideoPreviewPlaying(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isImmersiveActive, setIsVideoPreviewPlaying]);

  useEffect(() => {
    if (!isImmersiveActive) {
      return;
    }

    if (!isVideoPreviewPlaying && !isRecording) {
      setIsRecordingPreviewActive(false);
    }
  }, [isImmersiveActive, isRecording, isVideoPreviewPlaying]);

  useEffect(() => {
    if (!isImmersiveActive || !isRecordingPreviewActive || transcriptCues.length === 0) {
      return;
    }

    const debugBucket = Math.floor(currentPreviewTime * 2);
    const cueKey = activeTranscriptCue
      ? `${activeTranscriptCue.startTime}-${activeTranscriptCue.endTime}-${activeTranscriptCue.text}`
      : '';
    const shouldLog = activeTranscriptCue
      ? cueKey !== lastTranscriptDebugCueRef.current
      : debugBucket !== lastTranscriptDebugBucketRef.current;

    if (!shouldLog) {
      return;
    }

    lastTranscriptDebugBucketRef.current = debugBucket;
    lastTranscriptDebugCueRef.current = cueKey;
    logRecordSpeechDebug('transcript cue lookup', {
      currentPreviewTime,
      currentLayerStartTime,
      recordingPreviewStartSeconds,
      candidates: transcriptCandidateTimes.map(({ source, value }) => ({
        source,
        value: Math.round(value * 1000) / 1000,
      })),
      matchedCue: activeTranscriptCue,
    });
  }, [
    activeTranscriptCue,
    currentLayerStartTime,
    currentPreviewTime,
    isImmersiveActive,
    isRecordingPreviewActive,
    recordingPreviewStartSeconds,
    transcriptCandidateTimes,
    transcriptCues.length,
  ]);

  const iconButtonBaseClass = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50';
  const primaryIconButtonClass = `${iconButtonBaseClass} border-blue-500 bg-blue-600 text-white hover:bg-blue-500`;
  const recordPrimaryButtonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500 bg-blue-600 text-sm text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryIconButtonClass = colorMode === 'dark'
    ? `${iconButtonBaseClass} border-[#273956] bg-[#111a2f] text-slate-100 hover:bg-[#172642]`
    : `${iconButtonBaseClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  const dangerIconButtonClass = `${iconButtonBaseClass} border-red-500/60 bg-red-600 text-white hover:bg-red-500`;
  const helperTranscriptOverlay = isImmersiveActive && activeTranscriptCue ? (
    <div className="pointer-events-none fixed inset-0 z-[10000]">
      <div className="absolute bottom-[12vh] left-1/2 w-[min(92vw,900px)] -translate-x-1/2 text-center">
        <div className="rounded-2xl bg-black/70 px-6 py-4 text-xl font-semibold leading-relaxed text-white shadow-2xl backdrop-blur">
          {activeTranscriptCue.text}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
    <section className={`mb-4 rounded-xl border ${borderColor} ${panelBg} p-3`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2 text-sm font-bold ${text2Color}`}>
          <FaMicrophone aria-hidden="true" />
          <span>Record speech</span>
        </div>
        <span className={`text-xs tabular-nums ${mutedText}`}>
          {formatRecordingTime(isRecording ? recordingSeconds : resolvedRecordingDuration)}
        </span>
      </div>

      <div className="grid gap-3">
        <label className="block">
          <span className={`mb-1 block text-xs font-semibold ${mutedText}`}>Microphone</span>
          <select
            value={selectedMicId}
            onChange={(event) => setSelectedMicId(event.target.value)}
            disabled={isRecording || microphones.length === 0}
            className={`w-full rounded-lg ${bgColor} ${text2Color} px-3 py-2 text-sm`}
          >
            {microphones.length === 0 ? (
              <option value="">Default microphone</option>
            ) : microphones.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={`mb-1 flex items-center justify-between text-xs font-semibold ${mutedText}`}>
            <span>Volume</span>
            <span>{micVolume}%</span>
          </span>
          <input
            type="range"
            min="0"
            max="200"
            value={micVolume}
            onChange={(event) => setMicVolume(event.target.value)}
            className="w-full"
            style={{ accentColor: sliderAccent }}
          />
        </label>

        <div className={`h-2 overflow-hidden rounded-full ${colorMode === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-75"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>

        <input
          ref={transcriptInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleTranscriptUpload}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleStartRecordingClick}
            disabled={!canUseRecorder || isRecording || isStartingRecording}
            className={recordPrimaryButtonClass}
            title={isStartingRecording ? 'Starting recording' : 'Start recording and play session preview'}
            aria-label={isStartingRecording ? 'Starting recording' : 'Start recording and play session preview'}
          >
            <FaMicrophone aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={!isRecording}
            className={secondaryIconButtonClass}
            title="Stop recording"
            aria-label="Stop recording"
          >
            <FaStop aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={openImmersiveMode}
            disabled={!canUseRecorder}
            className={secondaryIconButtonClass}
            title={isImmersiveActive ? 'Exit immersive recording' : 'Open immersive recording'}
            aria-label={isImmersiveActive ? 'Exit immersive recording' : 'Open immersive recording'}
          >
            {isImmersiveActive ? <FaCompress aria-hidden="true" /> : <FaExpand aria-hidden="true" />}
          </button>
          {isImmersiveActive && (
            <button
              type="button"
              onClick={openTranscriptUpload}
              className={secondaryIconButtonClass}
              title="Upload speech helper transcript"
              aria-label="Upload speech helper transcript"
            >
              <FaFileUpload aria-hidden="true" />
            </button>
          )}
        </div>

        {isImmersiveActive && (transcriptFileName || transcriptError) && (
          <div className={`truncate rounded-lg border px-3 py-2 text-xs ${
            transcriptError
              ? 'border-red-400/40 bg-red-500/10 text-red-400'
              : `${borderColor} ${mutedText}`
          }`}>
            {transcriptError || transcriptFileName}
          </div>
        )}

        {hasRecording && (
          <div className="grid gap-3">
            <audio controls src={recordingUrl} className="w-full">
              Your browser does not support the audio element.
            </audio>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePreviewPlayback}
                className={secondaryIconButtonClass}
                title={isPlayingPreview ? 'Pause preview' : 'Play preview'}
                aria-label={isPlayingPreview ? 'Pause preview' : 'Play preview'}
              >
                {isPlayingPreview ? <FaPause aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={handleAddToSession}
                disabled={isUploadPending || !hasCurrentLayer}
                className={primaryIconButtonClass}
                title="Add to session"
                aria-label="Add to session"
              >
                <FaPlus aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleAddToLibrary}
                disabled={isUploadPending || Boolean(uploadedLibraryItem)}
                className={secondaryIconButtonClass}
                title={uploadedLibraryItem ? 'Already in library' : 'Add to library'}
                aria-label={uploadedLibraryItem ? 'Already in library' : 'Add to library'}
              >
                <FaHome aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleDeleteRecording}
                disabled={isUploadPending}
                className={dangerIconButtonClass}
                title="Remove and delete recording"
                aria-label="Remove and delete recording"
              >
                <FaTimesCircle aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {recorderError && (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {recorderError}
          </div>
        )}

        {!canUseRecorder && (
          <div className={`rounded-lg border ${borderColor} px-3 py-2 text-xs ${mutedText}`}>
            Recording is unavailable in this browser.
          </div>
        )}

        {canUseRecorder && microphones.length === 0 && (
          <div className={`text-xs ${mutedText}`}>
            Using {selectedMicLabel}.
          </div>
        )}
      </div>

    </section>
    {helperTranscriptOverlay && typeof document !== 'undefined'
      ? createPortal(helperTranscriptOverlay, document.body)
      : helperTranscriptOverlay}
    </>
  );
}
