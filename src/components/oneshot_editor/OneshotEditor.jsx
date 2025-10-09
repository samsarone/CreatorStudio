
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import CommonButton from '../common/CommonButton.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaChevronCircleDown,
  FaSpinner,
  FaTimes,
  FaImage,
  FaMicrophone,
  FaStopCircle,
} from 'react-icons/fa';
import { FaYoutube } from 'react-icons/fa6';
import axios from 'axios';

import { useUser } from '../../contexts/UserContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';

import AuthContainer from '../auth/AuthContainer.jsx';
import SingleSelect from '../common/SingleSelect.jsx';
import ProgressIndicator from './ProgressIndicator.jsx';
import AssistantHome from '../assistant/AssistantHome.jsx';
import PrimaryPublicButton from '../common/buttons/PrimaryPublicButton.tsx';

import {
  IMAGE_GENERAITON_MODEL_TYPES,
  VIDEO_GENERATION_MODEL_TYPES,
  IDEOGRAM_IMAGE_STYLES,
  PIXVERRSE_VIDEO_STYLES,
} from '../../constants/Types.ts';
import { VIDEO_MODEL_PRICES, IMAGE_MODEL_PRICES } from '../../constants/ModelPrices.jsx';
import { getHeaders } from '../../utils/web.jsx';
import { getSessionType } from '../../utils/environment.jsx';
import useRealtimeTranscription from '../../hooks/useRealtimeTranscription.js';

// ───────────────────────────────────────────────────────────
//  Environment constants
// ───────────────────────────────────────────────────────────
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;
const PROCESSOR_API_URL = API_SERVER;

// ───────────────────────────────────────────────────────────
//  Polling constants
// ───────────────────────────────────────────────────────────
const DEFAULT_POLL = 5_000;    // 5 s while online & healthy
const OFFLINE_POLL = 30_000;   // 30 s while offline
const MAX_BACKOFF = 60_000;    // 1 min cap

export default function OneshotEditor() {
  // ─────────────────────────────────────────────────────────
  //  Context / Router hooks
  // ─────────────────────────────────────────────────────────
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openAlertDialog } = useAlertDialog();
  const showLoginDialog = useCallback(() => {
    openAlertDialog(<AuthContainer />);
  }, [openAlertDialog]);

  const activeSessionIdRef = useRef(id);
  const currentPollSessionIdRef = useRef(null);

  const lastWakePoll = useRef(Date.now());

  const currentEnv = getSessionType();

  const transcriptHeaders = useMemo(() => getHeaders(), [user]);

  // ✨ UI tokens for light/dark surfaces
  const surfaceCard =
    colorMode === 'dark'
      ? 'bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 text-white border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur'
      : 'bg-gradient-to-br from-white via-slate-50 to-blue-50 text-slate-900 border border-slate-200/70 shadow-lg shadow-slate-200/60';

  const controlShell =
    colorMode === 'dark'
      ? 'bg-white/5 ring-1 ring-white/10 hover:ring-white/20'
      : 'bg-white/95 ring-1 ring-slate-200/70 hover:ring-slate-300 shadow-sm';

  const mutedText = colorMode === 'dark' ? 'text-white/60' : 'text-slate-500';

  useEffect(() => {
    activeSessionIdRef.current = id;
  }, [id]);


  // ─────────────────────────────────────────────────────────
  //  Basic session & form state
  // ─────────────────────────────────────────────────────────
  const [sessionDetails, setSessionDetails] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ─────────────────────────────────────────────────────────
  //  Online / offline & polling support
  // ─────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pollDelay, setPollDelay] = useState(DEFAULT_POLL);
  const pollDelayRef = useRef(DEFAULT_POLL);
  const assistantDelayRef = useRef(DEFAULT_POLL);

  useEffect(() => {
    const onLine = () => {
      setIsOnline(true);
      setPollDelay(DEFAULT_POLL);
    };
    const offLine = () => {
      setIsOnline(false);
      setPollDelay(OFFLINE_POLL);
    };

    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', offLine);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        !document.hidden &&
        Date.now() - lastWakePoll.current > 2000 &&
        currentPollSessionIdRef.current !== id
      ) {
        lastWakePoll.current = Date.now();
        pollGenerationStatus(id, true); // Restart fresh
        startAssistantQueryPoll(true);  // Optional: restart assistant poll
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [id]);



  // ─────────────────────────────────────────────────────────
  //  Polling handles / refs
  // ─────────────────────────────────────────────────────────
  const pollIntervalRef = useRef(null);   // generation poll (setTimeout)
  const assistantPollRef = useRef(null);   // assistant poll (setInterval)
  const pollErrorCountRef = useRef(0);
  const assistantErrorCountRef = useRef(0);

  const pollTimeoutRef = useRef(null);
  const assistantTimeoutRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  //  Assistant / Chatbot state
  // ─────────────────────────────────────────────────────────
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isAssistantQueryGenerating, setIsAssistantQueryGenerating] = useState(false);

  // ─────────────────────────────────────────────────────────
  //  Generation state
  // ─────────────────────────────────────────────────────────
  const [isGenerationPending, setIsGenerationPending] = useState(false);
  const [expressGenerationStatus, setExpressGenerationStatus] = useState(null);
  const [videoLink, setVideoLink] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showResultDisplay, setShowResultDisplay] = useState(false);

  // ─────────────────────────────────────────────────────────
  //  Misc state
  // ─────────────────────────────────────────────────────────
  const [latestVideos, setLatestVideos] = useState([]);
  const [error, setError] = useState('');
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [uploadedImageFile, setUploadedImageFile] = useState(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const [isBrowserRecognitionActive, setIsBrowserRecognitionActive] = useState(false);
  const voiceBasePromptRef = useRef('');
  const voiceTranscriptRef = useRef('');
  const voiceStatusTimeoutRef = useRef(null);
  const browserRecognitionRef = useRef(null);
  const speechRecognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);
  const isBrowserSpeechSupported = Boolean(speechRecognitionCtor);

  const handleVoiceSessionStarted = useCallback(() => {
    setVoiceError(null);
    setVoiceStatusMessage('Listening…');
    voiceTranscriptRef.current = '';
  }, []);

  const handleVoiceSessionEnded = useCallback(() => {
    setVoiceStatusMessage('Recording stopped.');
    voiceBasePromptRef.current = '';
    voiceTranscriptRef.current = '';
  }, []);

  const handleVoiceTranscription = useCallback((transcript, isFinal) => {
    const base = voiceBasePromptRef.current || '';

    const sanitizeTranscript = (value) => {
      if (!value) return '';
      let cleaned = value.replace(/I['’]m listening and ready whenever you are!/gi, '');
      cleaned = cleaned.replace(/\s+/g, ' ').trimStart();
      return cleaned;
    };

    const cleanedTranscript = sanitizeTranscript(transcript);
    if (!cleanedTranscript) {
      voiceTranscriptRef.current = '';
      if (isFinal) {
        setVoiceStatusMessage('No speech detected.');
      }
      return;
    }

    if (cleanedTranscript === voiceTranscriptRef.current) {
      return;
    }
    voiceTranscriptRef.current = cleanedTranscript;

    setPromptText(`${base}${cleanedTranscript}`);
    if (isFinal) {
      voiceBasePromptRef.current = `${base}${cleanedTranscript}`;
    }

    setVoiceStatusMessage(isFinal ? 'Transcript captured.' : 'Transcribing…');
  }, []);

  const {
    startTranscription: startVoiceTranscription,
    stopTranscription: stopVoiceTranscription,
    isSupported: isVoiceSupported,
    isInitializing: isVoiceInitializing,
    isRecording: isVoiceRecording,
    error: realtimeVoiceError,
  } = useRealtimeTranscription({
    transcriptEndpoint: `${API_SERVER}/video_session/get_transcription_key`,
    transcriptHeaders,
    onTranscription: handleVoiceTranscription,
    onSessionStarted: handleVoiceSessionStarted,
    onSessionEnded: handleVoiceSessionEnded,
    onError: (message) => setVoiceError(message),
  });

  const startBrowserRecognition = useCallback(() => {
    if (!speechRecognitionCtor) {
      return false;
    }

    try {
      const recognition = new speechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      const browserLanguage = typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US';
      recognition.lang = browserLanguage;

      recognition.onstart = () => {
        handleVoiceSessionStarted();
        setIsBrowserRecognitionActive(true);
      };

      recognition.onerror = (event) => {
        const message =
          event.error === 'not-allowed'
            ? 'Microphone access denied.'
            : 'Speech recognition encountered an error.';
        setVoiceError(message);
      };

      recognition.onend = () => {
        browserRecognitionRef.current = null;
        setIsBrowserRecognitionActive(false);
        handleVoiceSessionEnded();
      };

      recognition.onresult = (event) => {
        if (!event.results?.length) return;
        let combined = '';
        for (let i = 0; i < event.results.length; i += 1) {
          combined += event.results[i][0].transcript;
        }
        const latest = event.results[event.results.length - 1];
        handleVoiceTranscription(combined, latest?.isFinal ?? false);
      };

      browserRecognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.error('Browser speech recognition error:', err);
      browserRecognitionRef.current = null;
      setIsBrowserRecognitionActive(false);
      setVoiceError('Unable to start browser speech recognition.');
      return false;
    }
  }, [handleVoiceSessionEnded, handleVoiceSessionStarted, handleVoiceTranscription, speechRecognitionCtor]);

  const stopBrowserRecognition = useCallback(() => {
    const recognition = browserRecognitionRef.current;
    if (!recognition) return;

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch {
      /* ignore */
    }

    browserRecognitionRef.current = null;
    setIsBrowserRecognitionActive(false);
    handleVoiceSessionEnded();
  }, [handleVoiceSessionEnded]);

  const stopAllVoiceCapture = useCallback(() => {
    if (isVoiceRecording || isVoiceInitializing) {
      stopVoiceTranscription();
    }
    stopBrowserRecognition();
  }, [isVoiceInitializing, isVoiceRecording, stopBrowserRecognition, stopVoiceTranscription]);

  const isVoiceBusy = isVoiceRecording || isVoiceInitializing || isBrowserRecognitionActive;

  const handleToggleVoiceRecording = useCallback(() => {
    if (isVoiceBusy) {
      stopAllVoiceCapture();
      return;
    }

    if (!user) {
      setVoiceStatusMessage(null);
      setVoiceError('Please login to continue');
      showLoginDialog();
      return;
    }

    if (!isBrowserSpeechSupported && !isVoiceSupported) {
      setVoiceError('Voice capture is not supported in this browser.');
      return;
    }

    const currentPrompt = promptText || '';
    voiceBasePromptRef.current =
      currentPrompt && !/\s$/.test(currentPrompt)
        ? `${currentPrompt} `
        : currentPrompt;
    voiceTranscriptRef.current = '';

    setVoiceError(null);
    setVoiceStatusMessage('Connecting…');

    if (isBrowserSpeechSupported) {
      const started = startBrowserRecognition();
      if (!started && isVoiceSupported) {
        startVoiceTranscription();
      }
      return;
    }

    startVoiceTranscription();
  }, [
    isVoiceBusy,
    stopAllVoiceCapture,
    user,
    showLoginDialog,
    isBrowserSpeechSupported,
    isVoiceSupported,
    promptText,
    startBrowserRecognition,
    startVoiceTranscription,
  ]);

  useEffect(() => {
    if (realtimeVoiceError) {
      setVoiceError(realtimeVoiceError);
    }
  }, [realtimeVoiceError]);

  useEffect(() => {
    if (voiceStatusTimeoutRef.current) {
      clearTimeout(voiceStatusTimeoutRef.current);
      voiceStatusTimeoutRef.current = null;
    }
    if (!voiceStatusMessage) return;
    if (isVoiceBusy) return;
    voiceStatusTimeoutRef.current = setTimeout(() => {
      setVoiceStatusMessage(null);
      voiceStatusTimeoutRef.current = null;
    }, 2500);
    return () => {
      if (voiceStatusTimeoutRef.current) {
        clearTimeout(voiceStatusTimeoutRef.current);
        voiceStatusTimeoutRef.current = null;
      }
    };
  }, [voiceStatusMessage, isVoiceBusy]);

  useEffect(() => {
    return () => {
      if (voiceStatusTimeoutRef.current) {
        clearTimeout(voiceStatusTimeoutRef.current);
      }
      stopAllVoiceCapture();
    };
  }, [stopAllVoiceCapture]);

  // ─────────────────────────────────────────────────────────
  //  Fetch latest videos (once)
  // ─────────────────────────────────────────────────────────
  useEffect(() => { fetchLatestVideos(); }, []);

  // ─────────────────────────────────────────────────────────
  //  Tone select options
  // ─────────────────────────────────────────────────────────
  const toneOptions = [
    { label: 'stable', value: 'grounded' },
    { label: 'cinematic', value: 'cinematic' },
  ];
  const [selectedToneOption, setSelectedToneOption] = useState({
    label: 'stable',
    value: 'grounded',
  });

  // ─────────────────────────────────────────────────────────
  //  Aspect-ratio select
  // ─────────────────────────────────────────────────────────
  const aspectRatioOptions = [
    { label: '16:9 (Landscape)', value: '16:9' },
    { label: '9:16 (Portrait)', value: '9:16' },
  ];
  const [selectedAspectRatioOption, setSelectedAspectRatioOption] = useState(() => {
    const stored = localStorage.getItem('defaultVidGPTAspectRatio');
    const found = aspectRatioOptions.find((o) => o.value === stored);
    return found || aspectRatioOptions[0];
  });

  // ─────────────────────────────────────────────────────────
  //  Image-model select & styles
  // ─────────────────────────────────────────────────────────
  const expressImageModels = IMAGE_GENERAITON_MODEL_TYPES
    .filter((m) => {
      const modelPricing = IMAGE_MODEL_PRICES.find(
        (imp) => imp.key.toLowerCase() === m.key.toLowerCase()
      )?.prices || [];
      const hasAspect = modelPricing.find(
        (p) => p.aspectRatio === selectedAspectRatioOption.value
      );
      return m.isExpressModel && hasAspect;
    })
    .map((m) => ({ label: m.name, value: m.key, imageStyles: m.imageStyles }));

  const [selectedImageModel, setSelectedImageModel] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const found = expressImageModels.find((m) => m.value === saved);
    return found || expressImageModels[0];
  });

  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const foundModel = expressImageModels.find((m) => m.value === saved) || expressImageModels[0];
    if (foundModel?.imageStyles?.length) {
      const firstStyle = foundModel.imageStyles[0];
      return { label: firstStyle, value: firstStyle };
    }
    return null;
  });

  // When image-model changes, verify / reset style
  useEffect(() => {
    if (!selectedImageModel) return;
    const modelCfg = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedImageModel.value
    );
    if (modelCfg?.imageStyles?.length) {
      const styleExists = modelCfg.imageStyles.includes(selectedImageStyle?.value);
      if (!selectedImageStyle || !styleExists) {
        const firstStyle = modelCfg.imageStyles[0];
        setSelectedImageStyle({ label: firstStyle, value: firstStyle });
      }
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedImageModel]);

  // ─────────────────────────────────────────────────────────
  //  Video-model select
  // ─────────────────────────────────────────────────────────
  const expressVideoModels = useMemo(() => {
    return VIDEO_GENERATION_MODEL_TYPES
      .filter(
        (m) =>
          m.isExpressModel &&
          m.supportedAspectRatios?.includes(selectedAspectRatioOption.value)
      )
      .map((m) => ({ label: m.name, value: m.key, ...m }));
  }, [selectedAspectRatioOption]);

  const [selectedVideoModel, setSelectedVideoModel] = useState(() => {
    const saved = localStorage.getItem('defaultVIdGPTVideoGenerationModel');
    const found = expressVideoModels.find((m) => m.value === saved);
    return found || expressVideoModels[0];
  });

  // Video-model subtype (Pixverse or otherwise)
  const [selectedVideoModelSubType, setSelectedVideoModelSubType] = useState(null);
  useEffect(() => {
    if (selectedVideoModel?.value?.startsWith('PIXVERSE')) {
      if (!selectedVideoModelSubType) {
        const firstPixStyle = PIXVERRSE_VIDEO_STYLES[0];
        setSelectedVideoModelSubType({ label: firstPixStyle, value: firstPixStyle });
      }
    } else if (selectedVideoModel?.modelSubTypes?.length) {
      if (!selectedVideoModelSubType) {
        const firstSub = selectedVideoModel.modelSubTypes[0];
        setSelectedVideoModelSubType({ label: firstSub, value: firstSub });
      }
    } else {
      setSelectedVideoModelSubType(null);
    }
  }, [selectedVideoModel]);

  // Duration select
  const durationOptions = [
    { label: '30 Secs', value: 30 },
    { label: '1 Minute', value: 60 },
    { label: '1.5 Minutes', value: 90 },
    { label: '2 Minutes', value: 120 },
    { label: '3 Minutes', value: 180 },
  ];
  const [selectedDurationOption, setSelectedDurationOption] = useState(() => {
    const saved = parseInt(localStorage.getItem('defaultVidGPTDuration') || '', 10);
    const found = durationOptions.find((d) => d.value === saved);
    return found || durationOptions[0];
  });

  // ─────────────────────────────────────────────────────────
  //  Persist selections to localStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedImageModel?.value) {
      localStorage.setItem('defaultVidGPTImageGenerationModel', selectedImageModel.value);
      localStorage.setItem('defaultImageModel', selectedImageModel.value);
    }
  }, [selectedImageModel]);

  useEffect(() => {
    if (selectedVideoModel?.value) {
      localStorage.setItem('defaultVIdGPTVideoGenerationModel', selectedVideoModel.value);
      localStorage.setItem('defaultVideoModel', selectedVideoModel.value);
    }
  }, [selectedVideoModel]);

  useEffect(() => {
    if (selectedAspectRatioOption?.value) {
      localStorage.setItem('defaultVidGPTAspectRatio', selectedAspectRatioOption.value);
    }
  }, [selectedAspectRatioOption]);

  useEffect(() => {
    if (selectedDurationOption?.value) {
      localStorage.setItem('defaultVidGPTDuration', selectedDurationOption.value.toString());
    }
  }, [selectedDurationOption]);

  // ─────────────────────────────────────────────────────────
  //  Credits / disable form
  // ─────────────────────────────────────────────────────────
  const [isDisabled, setIsDisabled] = useState(false);
  useEffect(() => {
    if (!user || (user.generationCredits < 300 && currentEnv !== 'docker')) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────
  //  CLEAN-UP ALL POLLS WHEN COMPONENT UNMOUNTS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
      if (assistantPollRef.current) clearInterval(assistantPollRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (assistantTimeoutRef.current) clearTimeout(assistantTimeoutRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  //  IMPORTANT: RESET & CLEAR POLLS WHENEVER `id` CHANGES
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Abort ALL polling
    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (assistantPollRef.current) clearInterval(assistantPollRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (assistantTimeoutRef.current) clearTimeout(assistantTimeoutRef.current);

    pollIntervalRef.current = null;
    assistantPollRef.current = null;
    pollTimeoutRef.current = null;
    assistantTimeoutRef.current = null;

    pollErrorCountRef.current = 0;
    assistantErrorCountRef.current = 0;
    pollDelayRef.current = DEFAULT_POLL;
    assistantDelayRef.current = DEFAULT_POLL;

    resetForm();

    if (currentPollSessionIdRef.current === id) return;

    if (id) {
      // Fetch session, and ONLY trigger polling if still pending
      getSessionDetails().then((data) => {
        if (data?.videoGenerationPending) {
          pollGenerationStatus(id);
        } else {
          // clear any existing pending polls
          if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
          if (assistantPollRef.current) clearInterval(assistantPollRef.current);
        }
      });
    }
  }, [id]);

  // ─────────────────────────────────────────────────────────
  //  Handle download
  // ─────────────────────────────────────────────────────────
  async function handleDownloadVideo() {
    try {
      if (!videoLink) return;
      const headers = getHeaders();
      const response = await axios.get(videoLink, { responseType: 'blob', headers });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'generated_video.mp4');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error downloading video:', err);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Generation-status poller
  // ─────────────────────────────────────────────────────────
  const pollGenerationStatus = (sessionId = id, immediate = false) => {
    // Always update current session polling ID
    currentPollSessionIdRef.current = sessionId;

    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (immediate) pollDelayRef.current = 0;

    const doPoll = async () => {
      if (currentPollSessionIdRef.current !== sessionId) {
        // Abort polling: session has changed
        return;
      }

      let continuePolling = true;

      try {
        const headers = getHeaders();
        const { data } = await axios.get(
          `${API_SERVER}/quick_session/status?sessionId=${sessionId}`,
          headers
        );

        pollDelayRef.current = DEFAULT_POLL;
        setExpressGenerationStatus(data.expressGenerationStatus);

        if (data.status === 'COMPLETED') {
          continuePolling = false;
          setIsGenerationPending(false);
          const videoActualLink =
            data.remoteURL?.length
              ? data.remoteURL
              : data.videoLink
                ? `${API_SERVER}/${data.videoLink}`
                : null;
          setVideoLink(videoActualLink);
        }

        if (data.status === 'FAILED') {
          continuePolling = false;
          setIsGenerationPending(false);
          setErrorMessage({ error: `Video generation failed. ${data.expressGenerationError}` });
        }
      } catch (err) {
        pollDelayRef.current = Math.min(
          pollDelayRef.current ? pollDelayRef.current * 2 : DEFAULT_POLL,
          MAX_BACKOFF
        );
        console.error('Generation poll error:', err?.message || err);
      } finally {
        if (continuePolling && currentPollSessionIdRef.current === sessionId) {
          const nextDelay = navigator.onLine ? pollDelayRef.current : OFFLINE_POLL;
          pollIntervalRef.current = setTimeout(doPoll, nextDelay);
        }
      }
    };

    doPoll();
  };


  // ─────────────────────────────────────────────────────────
  //  Assistant-query poller
  // ─────────────────────────────────────────────────────────
  const startAssistantQueryPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (assistantPollRef.current) clearInterval(assistantPollRef.current);
    assistantErrorCountRef.current = 0;

    assistantPollRef.current = setInterval(() => {
      axios
        .get(`${PROCESSOR_API_URL}/assistants/assistant_query_status?id=${id}`, headers)
        .then((res) => {
          assistantErrorCountRef.current = 0;
          const data = res.data;
          if (data.status === 'COMPLETED') {
            clearInterval(assistantPollRef.current);
            setSessionMessages(data.sessionDetails.sessionMessages);
            setIsAssistantQueryGenerating(false);
          }
        })
        .catch((err) => {
          console.error('Assistant-poll error:', err);
          assistantErrorCountRef.current += 1;
          if (assistantErrorCountRef.current >= 3) {
            clearInterval(assistantPollRef.current);
            setIsAssistantQueryGenerating(false);
          }
        });
    }, 1000);
  };

  // ─────────────────────────────────────────────────────────
  //  Submit assistant query
  // ─────────────────────────────────────────────────────────
  const submitAssistantQuery = (query) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    setSessionMessages([]);
    setIsAssistantQueryGenerating(true);

    axios
      .post(
        `${PROCESSOR_API_URL}/assistants/submit_assistant_query`,
        { id, query },
        headers
      )
      .then(() => startAssistantQueryPoll())
      .catch((err) => {
        console.error('Assistant query error:', err);
        setIsAssistantQueryGenerating(false);
      });
  };

  // Placeholder: fetchSessionImageLayers
  const getSessionImageLayers = () => {
    /* ... */
  };

  // ─────────────────────────────────────────────────────────
  //  Fetch session details
  // ─────────────────────────────────────────────────────────
  const getSessionDetails = async () => {

    try {
      const headers = getHeaders();
      const { data } = await axios.get(
        `${API_SERVER}/quick_session/details?sessionId=${id}`,
        headers
      );
      setSessionDetails(data);

      if (data.inputPrompt) {
        setPromptText(data.inputPrompt);
      }


      if (data.videoGenerationPending) {
        setIsGenerationPending(true);
        setShowResultDisplay(true);
        pollGenerationStatus(id);
      } else if (data.videoLink) {
        const link =
          data.remoteURL?.length
            ? data.remoteURL
            : data.videoLink
              ? `${API_SERVER}/${data.videoLink}`
              : null;
        setVideoLink(link);
        setIsGenerationPending(false);
        setShowResultDisplay(true);
        setExpressGenerationStatus(data.expressGenerationStatus);
      }

      if (data.sessionMessages) setSessionMessages(data.sessionMessages);
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Fetch latest videos
  // ─────────────────────────────────────────────────────────
  const fetchLatestVideos = async () => {
    /* ... */
  };

  // ─────────────────────────────────────────────────────────
  //  Toggle inline-playback
  // ─────────────────────────────────────────────────────────
  const handleToggleVideo = (videoId) => {
    setExpandedVideoId((prev) => (prev === videoId ? null : videoId));
  };

  // ─────────────────────────────────────────────────────────
  //  Handle prompt-starter image upload
  // ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setUploadedImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────────────────
  //  Submit the text-to-video request
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showLoginDialog();
      return;
    }
    if (!promptText.trim()) {
      setErrorMessage({ error: 'Please enter some text before submitting.' });
      return;
    }
    if (!id) return;
    if (isVoiceBusy) {
      stopAllVoiceCapture();
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setIsGenerationPending(true);
    setShowResultDisplay(true);
    setVideoLink(null);
    setExpressGenerationStatus(null);

    const payload = {
      prompt: promptText,
      sessionID: id,
      aspectRatio: selectedAspectRatioOption.value,
      imageModel: selectedImageModel.value,
      imageStyle: selectedImageStyle?.value || null,
      videoGenerationModel: selectedVideoModel.value,
      modelSubType: selectedVideoModelSubType?.value || null,
      duration: selectedDurationOption.value,
      startImage: uploadedImageDataUrl || null,
      videoTone: selectedToneOption.value,
    };

    try {
      const headers = getHeaders();
      await axios.post(`${API_SERVER}/vidgenie/create`, payload, headers);
      pollGenerationStatus(id);
    } catch (err) {
      console.error('Error submitting render request:', err);
      setErrorMessage({ error: 'An unexpected error occurred.' });
      setIsGenerationPending(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Reset the entire form
  // ─────────────────────────────────────────────────────────
  const resetForm = () => {
    stopAllVoiceCapture();
    voiceBasePromptRef.current = '';
    voiceTranscriptRef.current = '';
    setVoiceStatusMessage(null);
    setVoiceError(null);
    setPromptText('');
    setShowResultDisplay(false);
    setErrorMessage(null);
    setVideoLink(null);
    setExpressGenerationStatus(null);
    setIsGenerationPending(false);
    setIsSubmitting(false);
    setSessionMessages([]);
    setIsAssistantQueryGenerating(false);   // ⬅️ NEW
    setIsPaused(false);                     // ⬅️ NEW
    setSessionDetails(null);                // ⬅️ NEW
    setUploadedImageFile(null);
    setUploadedImageDataUrl(null);
    setSelectedImageStyle(null);
    setSelectedToneOption({ label: 'stable', value: 'grounded' });
    setPricingDetailsDisplay(false);        // ⬅️ NEW
    setSelectedVideoModelSubType(null);     // ⬅️ NEW
    setExpandedVideoId(null);               // ⬅️ NEW
  };


  // ─────────────────────────────────────────────────────────
  //  Utility: view in Studio
  // ─────────────────────────────────────────────────────────
  const viewInStudio = () => navigate(`/video/${id}`);

  // ─────────────────────────────────────────────────────────
  //  Placeholder: purchase credits
  // ─────────────────────────────────────────────────────────
  const purchaseCreditsForUser = () => { /* ... */ };

  // ─────────────────────────────────────────────────────────
  //  Pricing info
  // ─────────────────────────────────────────────────────────
  const [pricingDetailsDisplay, setPricingDetailsDisplay] = useState(false);
  const togglePricingDetailsDisplay = () => setPricingDetailsDisplay(!pricingDetailsDisplay);

  const creditsPerSecondVideo = useMemo(() => {
  const key = selectedVideoModel?.value || '';
    if (key === 'KLINGIMGTOVIDTURBO') return 15;
  if (key === 'VEO3I2VFLASH') return 30;
  if (key === 'VEO3I2V') return 60;
  if (key === 'SORA2') return 30;
  if (key === 'SORA2PRO') return 70;
  return 10; // default
}, [selectedVideoModel]);


  const expectedCreditsPerSecond = useMemo(() => {
    let base = creditsPerSecondVideo;
    if (selectedImageModel?.value === 'HUNYUAN') {
      base = base * 1.5;
    }
    return base;
  }, [creditsPerSecondVideo, selectedImageModel]);

  const pricingInfoDisplay = (
    <div className="relative">
      <div
        className={`flex justify-end items-center gap-1 font-medium text-sm cursor-pointer select-none ${colorMode === 'dark' ? 'text-neutral-100' : 'text-slate-700'}`}
        onClick={togglePricingDetailsDisplay}
      >
        {currentEnv === 'docker' ? (
          <div>Pricing as charged by API providers.</div>
        ) : (
          <div className="inline-flex items-center">
{expectedCreditsPerSecond}&nbsp;Credits&nbsp;/&nbsp;second&nbsp;of&nbsp;video
          </div>
        )}
        <FaChevronCircleDown
          className={`inline-flex ml-1 transition-transform duration-300 ${pricingDetailsDisplay ? 'rotate-180' : ''}`}
        />
      </div>
      {pricingDetailsDisplay && (
        <div className={`mt-2 text-sm text-right ${mutedText} transition-opacity duration-300`}>
          {currentEnv === 'docker' ? (
            <div>Pricing as charged by API providers.</div>
          ) : (
            <>
              <div>The total price will be shown at completion.</div>
              <div>
                For example, a 60&nbsp;s video will cost&nbsp;
                {60 * creditsPerSecondVideo}&nbsp;credits.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────
  //  Render-state helpers
  // ─────────────────────────────────────────────────────────
  const renderState = useMemo(() => {
    if (isGenerationPending) return 'pending';
    if (videoLink) return 'complete';
    return 'idle';
  }, [isGenerationPending, videoLink]);

  const isFormDisabled = renderState !== 'idle' || isDisabled;
  const dateNowStr = new Date().toISOString().replace(/[:.]/g, '-');

  // ─────────────────────────────────────────────────────────
  //  JSX
  // ─────────────────────────────────────────────────────────
  return (
    <div className="mt-5 relative max-w-6xl mx-auto px-3 sm:px-6">
      {/* ───────── HEADER ───────── */}
      <div
        className={`
          ${surfaceCard}
          relative flex flex-col p-6 sm:p-8 mt-6 rounded-2xl transition-shadow duration-300 hover:shadow-xl
        `}
      >
        {/* 1️⃣ Heading */}
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <div className="flex-1">
            <div className="text-xl sm:text-2xl font-semibold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
                VidGenie&nbsp;Text-to-Vid&nbsp;Agent
              </span>
            </div>
            <div className={`text-xs ${mutedText} mt-1`}>
              — Create 1-shot videos from text prompts.
            </div>
          </div>

          <button
            type="button"
            onClick={viewInStudio}
            className={`
              inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5 rounded-full
              transition-all duration-200
              ${colorMode === 'dark'
                ? 'border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-[0.98]'
                : 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]'
              }
            `}
          >
            View in Studio
          </button>

          {renderState === 'pending' && (
            <div
              className="flex items-center gap-1 text-xs sm:text-sm ml-auto"
              aria-live="polite"
              role="status"
            >
              <FaSpinner className="animate-spin h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Rendering…</span>
              <span className="sr-only">Video is rendering</span>
            </div>
          )}
        </div>

        {/* Mobile action buttons (complete state) */}
        {renderState === 'complete' && (
          <div className="flex justify-center gap-2 mt-4 mb-2">
            <PrimaryPublicButton className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]">
              <a
                href={videoLink}
                download={`Rendition_${dateNowStr}.mp4`}
                className="underline"
              >
                Download
              </a>
            </PrimaryPublicButton>
            <PrimaryPublicButton
              className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
              onClick={viewInStudio}
            >
              View&nbsp;in&nbsp;Studio
            </PrimaryPublicButton>
          </div>
        )}

        {/* 2️⃣ Options grid */}
        <div className="w-full mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Aspect Ratio */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedAspectRatioOption}
                  onChange={setSelectedAspectRatioOption}
                  options={aspectRatioOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Aspect Ratio</p>
            </div>

            {/* Image Model */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedImageModel}
                  onChange={setSelectedImageModel}
                  options={expressImageModels}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Image Model</p>
            </div>

            {/* Image Style (conditional) */}
            {(() => {
              const modelCfg = IMAGE_GENERAITON_MODEL_TYPES.find(
                (m) => m.key === selectedImageModel?.value
              );
              if (modelCfg?.imageStyles) {
                return (
                  <div className="group w-full">
                    <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                      <SingleSelect
                        value={selectedImageStyle}
                        onChange={setSelectedImageStyle}
                        options={modelCfg.imageStyles.map((s) => ({ label: s, value: s }))}
                        className="w-full"
                      />
                    </div>
                    <p className={`text-[11px] mt-1 ${mutedText}`}>Image Style</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Video Model */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedVideoModel}
                  onChange={setSelectedVideoModel}
                  options={expressVideoModels}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Video Model</p>
            </div>

            {/* Pixverse Style */}
            {selectedVideoModel?.value?.startsWith('PIXVERSE') && selectedVideoModelSubType && (
              <div className="group w-full">
                <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                  <SingleSelect
                    value={selectedVideoModelSubType}
                    onChange={setSelectedVideoModelSubType}
                    options={PIXVERRSE_VIDEO_STYLES.map((s) => ({ label: s, value: s }))}
                    className="w-full"
                  />
                </div>
                <p className={`text-[11px] mt-1 ${mutedText}`}>Pixverse Style</p>
              </div>
            )}

            {/* Generic Sub-type */}
            {selectedVideoModel?.modelSubTypes?.length && selectedVideoModelSubType && (
              <div className="group w-full">
                <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                  <SingleSelect
                    value={selectedVideoModelSubType}
                    onChange={setSelectedVideoModelSubType}
                    options={selectedVideoModel.modelSubTypes.map((s) => ({ label: s, value: s }))}
                    className="w-full"
                  />
                </div>
                <p className={`text-[11px] mt-1 ${mutedText}`}>Video Sub-Type</p>
              </div>
            )}

            {/* Duration */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedDurationOption}
                  onChange={setSelectedDurationOption}
                  options={durationOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Max Duration</p>
            </div>

            {/* Tone */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedToneOption}
                  onChange={setSelectedToneOption}
                  options={toneOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Video Tone</p>
            </div>
          </div>
        </div>
      </div>
      {/* ───── /HEADER ───── */}

      {/* Error */}
      {errorMessage?.error && !showResultDisplay && (
        <div className="text-red-500 mt-3 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {errorMessage.error}
        </div>
      )}

      {/* Progress indicator / result */}
      {showResultDisplay && (
        <div className="mt-5 transition-all duration-500 ease-out">
          <ProgressIndicator
            isGenerationPending={isGenerationPending}
            expressGenerationStatus={expressGenerationStatus}
            videoLink={videoLink}
            errorMessage={errorMessage}
            purchaseCreditsForUser={purchaseCreditsForUser}
            viewInStudio={viewInStudio}
          />
        </div>
      )}

      {/* Prompt-starter preview */}
      {uploadedImageDataUrl && (
        <img
          src={uploadedImageDataUrl}
          alt="Prompt starter"
          className="mt-4 max-h-40 rounded-xl shadow-md ring-1 ring-black/5 hover:shadow-lg transition"
        />
      )}

      {/* ───────── Submission form ───────── */}
      <form onSubmit={handleSubmit}>
        <div className="relative mt-4">
          <TextareaAutosize
            minRows={8}
            maxRows={20}
            disabled={isFormDisabled}
            readOnly={isVoiceBusy}
            className={`
              w-full pl-4 pt-4 pr-16 p-2 rounded-2xl resize-none placeholder:opacity-60
              focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ring-1 transition
              ${colorMode === 'dark'
                ? 'bg-gray-950/90 text-white ring-white/10 focus:ring-indigo-500/50'
                : 'bg-white text-slate-900 ring-slate-200 focus:ring-indigo-500/50'
              }
              ${isVoiceBusy ? 'opacity-95' : ''}
            `}
            placeholder="Enter a succinct prompt for your rendition…"
            name="promptText"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <button
            type="button"
            onClick={handleToggleVoiceRecording}
            disabled={!isVoiceSupported && !isBrowserSpeechSupported}
            aria-pressed={isVoiceBusy}
            className={`
              absolute bottom-3 right-3 h-11 w-11 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
              ${colorMode === 'dark'
                ? 'bg-indigo-500/80 hover:bg-indigo-500 text-white focus:ring-indigo-400/70 focus:ring-offset-slate-900'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500/40 focus:ring-offset-white'}
              ${isVoiceBusy ? 'animate-pulse scale-105' : ''}
              ${isVoiceInitializing && !isBrowserRecognitionActive ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
              ${(!isVoiceSupported && !isBrowserSpeechSupported) ? 'opacity-40 cursor-not-allowed hover:bg-indigo-500' : ''}
            `}
            title={
              (!isVoiceSupported && !isBrowserSpeechSupported)
                ? 'Voice capture not supported in this browser'
                : isVoiceBusy
                  ? 'Tap to stop recording'
                  : 'Tap to start voice dictation'
            }
          >
            {isVoiceInitializing && !isBrowserRecognitionActive ? (
              <FaSpinner className="animate-spin text-lg" />
            ) : isVoiceBusy ? (
              <FaStopCircle className="text-lg" />
            ) : (
              <FaMicrophone className="text-lg" />
            )}
            <span className="sr-only">
              {isVoiceBusy ? 'Stop voice recording' : 'Start voice recording'}
            </span>
          </button>
        </div>
        <div className="mt-2 text-xs">
          {voiceError ? (
            <span className="text-red-500">{voiceError}</span>
          ) : voiceStatusMessage ? (
            <span className={colorMode === 'dark' ? 'text-white/70' : 'text-slate-600'}>
              {voiceStatusMessage}
            </span>
          ) : (
            <span className={colorMode === 'dark' ? 'text-white/50' : 'text-slate-400'}>
              {isBrowserSpeechSupported || isVoiceSupported
                ? 'Use the microphone button to dictate your prompt in real time.'
                : 'Voice dictation is unavailable in this browser.'}
            </span>
          )}
        </div>
        <div className="mt-4 relative">
          <div className="flex justify-center">
            <PrimaryPublicButton
              type="submit"
              isDisabled={isFormDisabled || isSubmitting}
              className="px-5 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </PrimaryPublicButton>
          </div>

          {/* Pricing */}
          <div
            className={`
              md:absolute md:right-0 top-0 p-3 rounded-xl text-center mt-4 md:mt-0 w-full md:w-auto transition
              ${colorMode === 'dark'
                ? 'bg-gray-900/70 text-white ring-1 ring-white/10'
                : 'bg-white text-slate-900 ring-1 ring-slate-200'
              }
            `}
          >
            {pricingInfoDisplay}
          </div>
        </div>
      </form>

      {/* ───────── Assistant Chat ───────── */}
      <div className={`mt-6 ${colorMode === 'dark' ? 'bg-white/5' : 'bg-white'} rounded-2xl p-3 sm:p-4 ring-1 ${colorMode === 'dark' ? 'ring-white/10' : 'ring-slate-200'} transition-shadow hover:shadow-sm`}>
        <AssistantHome
          submitAssistantQuery={submitAssistantQuery}
          sessionMessages={sessionMessages}
          isAssistantQueryGenerating={isAssistantQueryGenerating}
          getSessionImageLayers={getSessionImageLayers}
        />
      </div>
    </div>
  );
}
