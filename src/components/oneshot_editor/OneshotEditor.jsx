
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
import axios from 'axios';

import { useUser } from '../../contexts/UserContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';

import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import SingleSelect from '../common/SingleSelect.jsx';
import ProgressIndicator from './ProgressIndicator.jsx';
import AssistantHome from '../assistant/AssistantHome.jsx';
import PrimaryPublicButton from '../common/buttons/PrimaryPublicButton.tsx';
import PublishOptionsDialog from '../video/toolbars/frame_toolbar/PublishOptionsDialog.jsx';
import VidgenieSkeletonLoader from './VidgenieSkeletonLoader.jsx';

import {
  IMAGE_GENERAITON_MODEL_TYPES,
  IDEOGRAM_IMAGE_STYLES,
  PIXVERRSE_VIDEO_STYLES,
} from '../../constants/Types.ts';
import { IMAGE_MODEL_PRICES } from '../../constants/ModelPrices.jsx';
import { SUPPORTED_LANGUAGES, resolveLanguageCode } from '../../constants/supportedLanguages.js';
import { getVideoGenerationModelDropdownData } from '../video/util/videoGenerationModelOptions.js';
import { getHeaders } from '../../utils/web.jsx';
import { getSessionType } from '../../utils/environment.jsx';
import useRealtimeTranscription from '../../hooks/useRealtimeTranscription.js';

// ───────────────────────────────────────────────────────────
//  Environment constants
// ───────────────────────────────────────────────────────────
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;
const PROCESSOR_API_URL = API_SERVER;
const VIDEO_API_BASE = `${API_SERVER}/v1/video`;
const VIDEO_STATUS_ENDPOINT = `${API_SERVER}/v1/status`;

// ───────────────────────────────────────────────────────────
//  Polling constants
// ───────────────────────────────────────────────────────────
const DEFAULT_POLL = 5_000;    // 5 s while online & healthy
const OFFLINE_POLL = 30_000;   // 30 s while offline
const MAX_BACKOFF = 60_000;    // 1 min cap
const VOICE_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const VOICE_TRANSCRIPTION_WORD_LIMIT = 2000;

export default function OneshotEditor() {
  // ─────────────────────────────────────────────────────────
  //  Context / Router hooks
  // ─────────────────────────────────────────────────────────
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const { t, language } = useLocalization();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const showLoginDialog = useCallback(() => {
    openAlertDialog(<AuthContainer />, undefined, false, AUTH_DIALOG_OPTIONS);
  }, [openAlertDialog]);

  const activeSessionIdRef = useRef(id);
  const currentPollRequestIdRef = useRef(null);
  const activeRequestIdRef = useRef(null);

  const lastWakePoll = useRef(Date.now());

  const currentEnv = getSessionType();

  const voiceSessionStartRef = useRef(null);
  const voiceSessionTimeoutRef = useRef(null);
  const voiceWordCountRef = useRef(0);
  const voiceWordLimitRef = useRef(VOICE_TRANSCRIPTION_WORD_LIMIT);
  const stopAllVoiceCaptureRef = useRef(() => {});
  const voiceSessionTimeoutLabelRef = useRef(t("vidgenie.voiceTimeoutTenMinutes"));

  const clearVoiceSessionTimeout = useCallback(() => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }
  }, []);

  const countWords = useCallback((value) => {
    if (!value) return 0;
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, []);

  const transcriptHeaders = useMemo(() => getHeaders(), [user]);
  const normalizeVideoUrl = (url) => {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
      return trimmed;
    }
    return `${API_SERVER}/${trimmed.replace(/^\/+/, '')}`;
  };

  // ✨ UI tokens for light/dark surfaces
  const surfaceCard =
    colorMode === 'dark'
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d] shadow-[0_16px_40px_rgba(0,0,0,0.38)]'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';

  const controlShell =
    colorMode === 'dark'
      ? 'bg-[#111a2f] ring-1 ring-[#1f2a3d] hover:ring-rose-400/40'
      : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 shadow-sm';

  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    activeSessionIdRef.current = id;
  }, [id]);


  // ─────────────────────────────────────────────────────────
  //  Basic session & form state
  // ─────────────────────────────────────────────────────────
  const [sessionDetails, setSessionDetails] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [generationMode, setGenerationMode] = useState('T2V');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId;
  }, [activeRequestId]);

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

  useEffect(() => {
    const handleVisibility = () => {
      if (
        !document.hidden &&
        Date.now() - lastWakePoll.current > 2000 &&
        isGenerationPending &&
        activeRequestIdRef.current
      ) {
        lastWakePoll.current = Date.now();
        pollGenerationStatus(activeRequestIdRef.current, true); // Restart fresh
        startAssistantQueryPoll(true);  // Optional: restart assistant poll
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [id, isGenerationPending]);

  // ─────────────────────────────────────────────────────────
  //  Misc state
  // ─────────────────────────────────────────────────────────
  const [latestVideos, setLatestVideos] = useState([]);
  const [error, setError] = useState('');
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [uploadedImageFiles, setUploadedImageFiles] = useState([]);
  const [uploadedImageDataUrls, setUploadedImageDataUrls] = useState([]);
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

  const handleVoiceSessionStarted = useCallback((sessionInfo) => {
    setVoiceError(null);
    setVoiceStatusMessage(t("vidgenie.voiceListening"));
    voiceTranscriptRef.current = '';
    voiceWordCountRef.current = 0;
    const rawLimit = sessionInfo?.maxTranscriptWords;
    const parsedLimit =
      typeof rawLimit === 'number'
        ? rawLimit
        : rawLimit
          ? parseInt(rawLimit, 10)
          : null;
    voiceWordLimitRef.current =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : VOICE_TRANSCRIPTION_WORD_LIMIT;
    const now = Date.now();
    voiceSessionStartRef.current = now;
    clearVoiceSessionTimeout();
    let timeoutMs = VOICE_SESSION_TIMEOUT_MS;
    if (sessionInfo?.expiresAt) {
      const expiresAtMs = new Date(sessionInfo.expiresAt).getTime();
      if (!Number.isNaN(expiresAtMs)) {
        timeoutMs = Math.min(
          VOICE_SESSION_TIMEOUT_MS,
          Math.max(0, expiresAtMs - now),
        );
      }
    }
    let timeoutLabel = t("vidgenie.voiceTimeoutTenMinutes");
    if (timeoutMs <= 0 || timeoutMs < 60_000) {
      timeoutLabel = t("vidgenie.voiceTimeoutLessThanMinute");
    } else {
      const timeoutMinutes = Math.ceil(timeoutMs / 60_000);
      timeoutLabel =
        timeoutMinutes === 1
          ? t("vidgenie.voiceTimeoutMinute")
          : t("vidgenie.voiceTimeoutMinutes", { count: timeoutMinutes });
    }
    voiceSessionTimeoutLabelRef.current = timeoutLabel;
    if (timeoutMs <= 0) {
      setVoiceStatusMessage(null);
      setVoiceError(
        t("vidgenie.voiceSessionExpired", { duration: voiceSessionTimeoutLabelRef.current })
      );
      stopAllVoiceCaptureRef.current?.();
      return;
    }
    voiceSessionTimeoutRef.current = setTimeout(() => {
      setVoiceStatusMessage(null);
      setVoiceError(
        t("vidgenie.voiceSessionExpired", { duration: voiceSessionTimeoutLabelRef.current })
      );
      stopAllVoiceCaptureRef.current?.();
    }, timeoutMs);
  }, [clearVoiceSessionTimeout, t]);

  const handleVoiceSessionEnded = useCallback(() => {
    clearVoiceSessionTimeout();
    voiceSessionStartRef.current = null;
    voiceWordCountRef.current = 0;
    voiceWordLimitRef.current = VOICE_TRANSCRIPTION_WORD_LIMIT;
    voiceSessionTimeoutLabelRef.current = t("vidgenie.voiceTimeoutTenMinutes");
    setVoiceStatusMessage(t("vidgenie.voiceStopped"));
    voiceBasePromptRef.current = '';
    voiceTranscriptRef.current = '';
  }, [clearVoiceSessionTimeout, t]);

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
        setVoiceStatusMessage(t("vidgenie.voiceNoSpeech"));
      }
      return;
    }

    const wordLimit = voiceWordLimitRef.current || VOICE_TRANSCRIPTION_WORD_LIMIT;
    const totalWords = countWords(cleanedTranscript);
    if (totalWords > wordLimit) {
      const limitedTranscript = cleanedTranscript
        .split(/\s+/)
        .slice(0, wordLimit)
        .join(' ');
      voiceTranscriptRef.current = limitedTranscript;
      setPromptText(`${base}${limitedTranscript}`);
      voiceBasePromptRef.current = `${base}${limitedTranscript}`;
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceTranscriptLimit", { count: wordLimit }));
      stopAllVoiceCaptureRef.current?.();
      return;
    }
    voiceWordCountRef.current = totalWords;

    if (cleanedTranscript === voiceTranscriptRef.current) {
      return;
    }
    voiceTranscriptRef.current = cleanedTranscript;

    setPromptText(`${base}${cleanedTranscript}`);
    if (isFinal) {
      voiceBasePromptRef.current = `${base}${cleanedTranscript}`;
    }

    setVoiceStatusMessage(
      isFinal ? t("vidgenie.voiceCaptured") : t("vidgenie.voiceTranscribing")
    );
  }, [countWords, t]);

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
            ? t("vidgenie.voiceMicrophoneDenied")
            : t("vidgenie.voiceRecognitionError");
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
      
      browserRecognitionRef.current = null;
      setIsBrowserRecognitionActive(false);
      setVoiceError(t("vidgenie.voiceRecognitionFailed"));
      return false;
    }
  }, [handleVoiceSessionEnded, handleVoiceSessionStarted, handleVoiceTranscription, speechRecognitionCtor, t]);

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
    clearVoiceSessionTimeout();
    voiceSessionStartRef.current = null;
    voiceWordCountRef.current = 0;
    voiceWordLimitRef.current = VOICE_TRANSCRIPTION_WORD_LIMIT;
    voiceSessionTimeoutLabelRef.current = t("vidgenie.voiceTimeoutTenMinutes");
    if (isVoiceRecording || isVoiceInitializing) {
      stopVoiceTranscription();
    }
    stopBrowserRecognition();
  }, [
    clearVoiceSessionTimeout,
    isVoiceInitializing,
    isVoiceRecording,
    stopBrowserRecognition,
    stopVoiceTranscription,
  ]);

  useEffect(() => {
    stopAllVoiceCaptureRef.current = stopAllVoiceCapture;
    return () => {
      if (stopAllVoiceCaptureRef.current === stopAllVoiceCapture) {
        stopAllVoiceCaptureRef.current = () => {};
      }
    };
  }, [stopAllVoiceCapture]);

  const isVoiceBusy = isVoiceRecording || isVoiceInitializing || isBrowserRecognitionActive;

  useEffect(() => {
    if (generationMode === 'I2V' && isVoiceBusy) {
      stopAllVoiceCapture();
    }
  }, [generationMode, isVoiceBusy, stopAllVoiceCapture]);

  const handleToggleVoiceRecording = useCallback(() => {
    if (isVoiceBusy) {
      stopAllVoiceCapture();
      return;
    }

    if (!user) {
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceLoginRequired"));
      showLoginDialog();
      return;
    }

    const isEmailVerified = user?.isEmailVerified ?? user?.emailVerified ?? false;
    if (!isEmailVerified) {
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceVerifyEmail"));
      return;
    }

    if (!isBrowserSpeechSupported && !isVoiceSupported) {
      setVoiceError(t("vidgenie.voiceNotSupported"));
      return;
    }

    const currentPrompt = promptText || '';
    voiceBasePromptRef.current =
      currentPrompt && !/\s$/.test(currentPrompt)
        ? `${currentPrompt} `
        : currentPrompt;
    voiceTranscriptRef.current = '';

    setVoiceError(null);
    setVoiceStatusMessage(t("vidgenie.voiceConnecting"));

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
    t,
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

  const languageOptions = useMemo(() => {
    const autoLabel = t("vidgenie.languageAuto", {}, "Auto");
    return [
      { label: autoLabel, value: 'auto' },
      ...SUPPORTED_LANGUAGES.map((lang) => ({
        label: lang.name,
        value: lang.code,
      })),
    ];
  }, [t]);

  const defaultLanguageOption = useMemo(() => {
    const match = languageOptions.find((opt) => opt.value === language);
    return match || languageOptions[0];
  }, [languageOptions, language]);

  const [selectedLanguageOption, setSelectedLanguageOption] = useState(
    () => defaultLanguageOption
  );

  useEffect(() => {
    setSelectedLanguageOption((prev) => {
      const match = languageOptions.find((opt) => opt.value === prev?.value);
      return match || defaultLanguageOption;
    });
  }, [languageOptions, defaultLanguageOption]);

  // ─────────────────────────────────────────────────────────
  //  Aspect-ratio select
  // ─────────────────────────────────────────────────────────
  const aspectRatioOptions = useMemo(
    () => [
      { label: t("vidgenie.aspectRatioLandscape"), value: '16:9' },
      { label: t("vidgenie.aspectRatioPortrait"), value: '9:16' },
    ],
    [t]
  );
  const [selectedAspectRatioOption, setSelectedAspectRatioOption] = useState(() => {
    const stored = localStorage.getItem('defaultVidGPTAspectRatio');
    const found = aspectRatioOptions.find((o) => o.value === stored);
    return found || aspectRatioOptions[0];
  });
  useEffect(() => {
    setSelectedAspectRatioOption((prev) => {
      const stored = localStorage.getItem('defaultVidGPTAspectRatio');
      const targetValue = prev?.value || stored;
      const found = aspectRatioOptions.find((o) => o.value === targetValue);
      return found || aspectRatioOptions[0];
    });
  }, [aspectRatioOptions]);

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
    const { availableModels } = getVideoGenerationModelDropdownData({ mode: 'text' });

    return availableModels
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

  useEffect(() => {
    if (!expressVideoModels.length) return;

    setSelectedVideoModel((prev) => {
      if (prev?.value) {
        const existing = expressVideoModels.find((m) => m.value === prev.value);
        if (existing) return existing;
      }

      const saved = localStorage.getItem('defaultVIdGPTVideoGenerationModel');
      const found = expressVideoModels.find((m) => m.value === saved);
      return found || expressVideoModels[0];
    });
  }, [expressVideoModels]);

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
  const durationOptions = useMemo(
    () => [
      { label: t("vidgenie.duration10"), value: 10 },
      { label: t("vidgenie.duration30"), value: 30 },
      { label: t("vidgenie.duration60"), value: 60 },
      { label: t("vidgenie.duration90"), value: 90 },
      { label: t("vidgenie.duration120"), value: 120 },
      { label: t("vidgenie.duration180"), value: 180 },
    ],
    [t]
  );
  const [selectedDurationOption, setSelectedDurationOption] = useState(() => {
    const saved = parseInt(localStorage.getItem('defaultVidGPTDuration') || '', 10);
    const found = durationOptions.find((d) => d.value === saved);
    if (found) {
      return found;
    }
    const defaultOption = durationOptions.find((d) => d.value === 30);
    return defaultOption || durationOptions[0];
  });
  useEffect(() => {
    setSelectedDurationOption((prev) => {
      const saved = parseInt(localStorage.getItem('defaultVidGPTDuration') || '', 10);
      const targetValue = prev?.value || saved;
      const found = durationOptions.find((d) => d.value === targetValue);
      return found || durationOptions[0];
    });
  }, [durationOptions]);

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

    if (currentPollRequestIdRef.current === id) return;

    if (id) {
      // Fetch session, and ONLY trigger polling if still pending
      getSessionDetails().then((data) => {
        if (data?.videoGenerationPending && !activeRequestIdRef.current) {
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
      
    }
  }

  const publishQuickSession = async (formPayload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setIsPublishing(true);

    try {
      const normalizedTags =
        typeof formPayload.tags === 'string'
          ? formPayload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : Array.isArray(formPayload.tags)
            ? formPayload.tags.map((tag) => tag.trim()).filter(Boolean)
            : [];

      const sessionId = formPayload?.id || id;

      const aspectRatioForPublish =
        sessionDetails?.aspectRatio ||
        sessionDetails?.publishedAspectRatio ||
        selectedAspectRatioOption?.value ||
        null;

      const selectedLanguageValue =
        typeof selectedLanguageOption === 'string'
          ? selectedLanguageOption
          : selectedLanguageOption?.value ?? selectedLanguageOption?.label;
      const fallbackLanguageCode = resolveLanguageCode(selectedLanguageValue);

      const sessionLanguage =
        typeof formPayload.sessionLanguage === 'string' && formPayload.sessionLanguage.trim().length > 0
          ? formPayload.sessionLanguage.trim()
          : typeof sessionDetails?.sessionLanguage === 'string' &&
            sessionDetails.sessionLanguage.trim().length > 0
            ? sessionDetails.sessionLanguage.trim()
            : typeof sessionDetails?.language === 'string' &&
              sessionDetails.language.trim().length > 0
              ? sessionDetails.language.trim()
              : typeof fallbackLanguageCode === 'string' && fallbackLanguageCode.trim().length > 0
                ? fallbackLanguageCode.trim()
                : null;

      const languageString =
        typeof formPayload.languageString === 'string' && formPayload.languageString.trim().length > 0
          ? formPayload.languageString.trim()
          : typeof sessionDetails?.languageString === 'string' &&
            sessionDetails.languageString.trim().length > 0
            ? sessionDetails.languageString.trim()
            : selectedLanguageOption?.value &&
              selectedLanguageOption.value !== 'auto' &&
              typeof selectedLanguageOption?.label === 'string' &&
              selectedLanguageOption.label.trim().length > 0
              ? selectedLanguageOption.label.trim()
              : null;

      const publishPayload = {
        ...formPayload,
        id: sessionId,
        tags: normalizedTags,
        aspectRatio: aspectRatioForPublish,
        ispublishedVideo: true,
      };
      if (sessionLanguage) {
        publishPayload.sessionLanguage = sessionLanguage;
      }
      if (languageString) {
        publishPayload.languageString = languageString;
      }

      await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/publish_session`,
        publishPayload,
        headers
      );

      await getSessionDetails();
    } catch (error) {
      
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishClick = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    openAlertDialog(
      <PublishOptionsDialog
        onClose={closeAlertDialog}
        onSubmit={(payload) => {
          closeAlertDialog();
          publishQuickSession(payload);
        }}
        extraProps={{ sessionId: id }}
      />
    );
  };

  const handleUnpublishClick = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const confirmation = window.confirm('Are you sure you want to unpublish this video?');
    if (!confirmation) {
      return;
    }

    setIsUnpublishing(true);

    try {
      await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/unpublish_session`,
        { sessionId: id },
        headers
      );

      await getSessionDetails();
    } catch (error) {
      
    } finally {
      setIsUnpublishing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Generation-status poller
  // ─────────────────────────────────────────────────────────
  const pollGenerationStatus = (requestId = activeRequestIdRef.current || id, immediate = false) => {
    if (!requestId) return;

    currentPollRequestIdRef.current = requestId;
    if (activeRequestIdRef.current !== requestId) {
      activeRequestIdRef.current = requestId;
      setActiveRequestId(requestId);
    }

    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (immediate) pollDelayRef.current = 0;

    const doPoll = async () => {
      if (currentPollRequestIdRef.current !== requestId) {
        // Abort polling: request has changed
        return;
      }

      let continuePolling = true;

      try {
        const headers = getHeaders();
        const query = new URLSearchParams({ request_id: requestId }).toString();
        const { data } = await axios.get(
          `${VIDEO_STATUS_ENDPOINT}?${query}`,
          headers
        );

        pollDelayRef.current = DEFAULT_POLL;
        if (data?.expressGenerationStatus) {
          setExpressGenerationStatus(data.expressGenerationStatus);
        }

        if (data.status === 'COMPLETED') {
          continuePolling = false;
          setIsGenerationPending(false);
          const videoActualLink = normalizeVideoUrl(
            data.result_url
              || (Array.isArray(data.result_urls) ? data.result_urls[0] : null)
              || data.remoteURL
              || data.videoLink
              || null
          );
          setVideoLink(videoActualLink);
        }

        if (data.status === 'FAILED' || data.status === 'ERROR') {
          continuePolling = false;
          setIsGenerationPending(false);
          const errorText = data.expressGenerationError || data.message || 'Video generation failed.';
          const normalizedError = errorText.startsWith('Video generation failed')
            ? errorText
            : `Video generation failed. ${errorText}`;
          setErrorMessage({ error: normalizedError });
        }
      } catch (err) {
        pollDelayRef.current = Math.min(
          pollDelayRef.current ? pollDelayRef.current * 2 : DEFAULT_POLL,
          MAX_BACKOFF
        );
        
      } finally {
        if (continuePolling && currentPollRequestIdRef.current === requestId) {
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


      if (!activeRequestIdRef.current) {
        if (data.videoGenerationPending) {
          setIsGenerationPending(true);
          setShowResultDisplay(true);
          pollGenerationStatus(id);
        } else if (data.videoLink) {
          const linkCandidate = data.remoteURL?.length ? data.remoteURL : data.videoLink || null;
          setVideoLink(normalizeVideoUrl(linkCandidate));
          setIsGenerationPending(false);
          setShowResultDisplay(true);
          setExpressGenerationStatus(data.expressGenerationStatus);
        }
      }

      if (data.sessionMessages) setSessionMessages(data.sessionMessages);
    } catch (err) {
      
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
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadedImageFiles(files);

    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          })
      )
    );
    setUploadedImageDataUrls(dataUrls.filter(Boolean));
  };

  const clearUploadedImage = useCallback(() => {
    setUploadedImageFiles([]);
    setUploadedImageDataUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Submit the text-to-video request
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showLoginDialog();
      return;
    }
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    const isTextToVideo = generationMode === 'T2V';
    if (isTextToVideo && !promptText.trim()) {
      setErrorMessage({ error: 'Please enter some text before submitting.' });
      return;
    }
    if (!isTextToVideo && uploadedImageDataUrls.length === 0) {
      setErrorMessage({ error: 'Please select one or more images before submitting.' });
      return;
    }
    if (isTextToVideo && !selectedVideoModel?.value) {
      setErrorMessage({ error: 'Please select a video model before submitting.' });
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
    setActiveRequestId(null);
    activeRequestIdRef.current = null;

    const requestInput = {};
    if (isTextToVideo) {
      requestInput.prompt = promptText.trim();
      requestInput.image_model = selectedImageModel.value;
      requestInput.video_model = selectedVideoModel.value;
      requestInput.duration = selectedDurationOption.value;
      requestInput.tone = 'grounded';
      requestInput.aspect_ratio = selectedAspectRatioOption.value;
      if (selectedVideoModelSubType?.value) {
        requestInput.video_model_sub_type = selectedVideoModelSubType.value;
      }
      if (selectedImageStyle?.value) {
        requestInput.image_style = selectedImageStyle.value;
      }
    }

    const selectedLanguageValue =
      typeof selectedLanguageOption === 'string'
        ? selectedLanguageOption
        : selectedLanguageOption?.value ?? selectedLanguageOption?.label;
    requestInput.language = resolveLanguageCode(selectedLanguageValue);

    try {
      if (!isTextToVideo) {
        const uploadPayload = {
          input: {
            image_data: uploadedImageDataUrls.filter(Boolean),
          },
        };
        const { data: uploadData } = await axios.post(
          `${VIDEO_API_BASE}/upload_image_data`,
          uploadPayload,
          headers
        );
        const uploadedImageUrls = Array.isArray(uploadData?.image_urls)
          ? uploadData.image_urls
          : [];
        const normalizedImageUrls = uploadedImageUrls
          .map((url) => (typeof url === 'string' ? url.trim() : ''))
          .filter(Boolean);
        if (normalizedImageUrls.length === 0) {
          throw new Error('Image upload did not return any URLs.');
        }
        requestInput.image_urls = normalizedImageUrls;
        if (promptText.trim()) {
          requestInput.prompt = promptText.trim();
        }
      }

      const payload = { input: { ...requestInput, session_id: id } };
      const endpoint = isTextToVideo
        ? `${VIDEO_API_BASE}/text_to_video`
        : `${VIDEO_API_BASE}/image_list_to_video`;
      const { data } = await axios.post(endpoint, payload, headers);
      const requestId = data?.request_id || data?.session_id || data?.sessionID;
      if (!requestId) {
        throw new Error('Missing request id in response.');
      }
      setActiveRequestId(requestId);
      activeRequestIdRef.current = requestId;
      pollGenerationStatus(requestId);
    } catch (err) {
      
      const apiMessage = err?.response?.data?.message;
      setErrorMessage({ error: apiMessage || 'An unexpected error occurred.' });
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
    setActiveRequestId(null);
    activeRequestIdRef.current = null;
    currentPollRequestIdRef.current = null;
    setSessionMessages([]);
    setIsAssistantQueryGenerating(false);   // ⬅️ NEW
    setIsPaused(false);                     // ⬅️ NEW
    setSessionDetails(null);                // ⬅️ NEW
    setUploadedImageFiles([]);
    setUploadedImageDataUrls([]);
    setSelectedImageStyle(null);
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

  const IMAGE_LIST_TO_VIDEO_CREDITS_PER_SECOND = 75;

  const creditsPerSecondVideo = useMemo(() => {
    if (generationMode === 'I2V') {
      return IMAGE_LIST_TO_VIDEO_CREDITS_PER_SECOND;
    }
    const key = selectedVideoModel?.value || '';
    if (key === 'KLINGIMGTOVID3PRO' || key === 'KLINGIMGTOVIDTURBO') return 23;
    if (key === 'VEO3.1I2VFAST') return 45;
    if (key === 'VEO3.1I2V') return 90;
    if (key === 'SORA2') return 45;
    if (key === 'SORA2PRO') return 105;
    return 15; // default
  }, [generationMode, selectedVideoModel]);


  const expectedCreditsPerSecond = useMemo(() => {
    if (generationMode === 'I2V') {
      return creditsPerSecondVideo;
    }
    let base = creditsPerSecondVideo;
    const imageModelKey = selectedImageModel?.value || '';
    if (imageModelKey === 'HUNYUAN') {
      base = base * 1.5;
    }
    return base;
  }, [creditsPerSecondVideo, generationMode, selectedImageModel]);

  const pricingInfoDisplay = (
    <div className="relative">
      <div
        className={`flex items-center gap-1 font-medium text-sm cursor-pointer select-none ${colorMode === 'dark' ? 'text-neutral-100' : 'text-slate-700'}`}
        onClick={togglePricingDetailsDisplay}
      >
        {currentEnv === 'docker' ? (
          <div>{t("vidgenie.pricingApiCharge")}</div>
        ) : (
          <div className="inline-flex items-center">
            {t("vidgenie.pricingCreditsPerSecond", { credits: expectedCreditsPerSecond })}
          </div>
        )}
        <FaChevronCircleDown
          className={`inline-flex ml-1 transition-transform duration-300 ${pricingDetailsDisplay ? 'rotate-180' : ''}`}
        />
      </div>
      {pricingDetailsDisplay && (
        <div className={`mt-2 text-sm text-left ${mutedText} transition-opacity duration-300`}>
          {currentEnv === 'docker' ? (
            <div>{t("vidgenie.pricingApiCharge")}</div>
          ) : (
            <>
              <div>{t("vidgenie.pricingTotalShown")}</div>
              <div>{t("vidgenie.pricingExample", { credits: 60 * creditsPerSecondVideo })}</div>
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
  const toggleShell =
    colorMode === 'dark'
      ? 'bg-[#0b1226] ring-1 ring-white/10'
      : 'bg-white ring-1 ring-slate-200';
  const toggleActive =
    colorMode === 'dark'
      ? 'bg-indigo-500 text-white shadow'
      : 'bg-indigo-600 text-white shadow';
  const toggleInactive =
    colorMode === 'dark'
      ? 'text-slate-300 hover:text-white hover:bg-white/5'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  const imagePickerShell =
    colorMode === 'dark'
      ? 'bg-gray-950/90 text-white ring-white/10'
      : 'bg-white text-slate-900 ring-slate-200';
  const headerTitle = generationMode === 'T2V'
    ? t("vidgenie.titleTextToVideo")
    : t("vidgenie.titleImageListToVideo");
  if (!sessionDetails) {
    return <VidgenieSkeletonLoader />;
  }

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
          <div className="flex-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <div className="text-xl sm:text-2xl font-semibold tracking-tight">
              {headerTitle}
            </div>
            <div className={`inline-flex items-center gap-1 rounded-full p-1 ${toggleShell}`}>
              <button
                type="button"
                disabled={isFormDisabled}
                onClick={() => setGenerationMode('T2V')}
                aria-pressed={generationMode === 'T2V'}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${generationMode === 'T2V' ? toggleActive : toggleInactive}`}
              >
                T2V
              </button>
              <button
                type="button"
                disabled={isFormDisabled}
                onClick={() => setGenerationMode('I2V')}
                aria-pressed={generationMode === 'I2V'}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${generationMode === 'I2V' ? toggleActive : toggleInactive}`}
              >
                I2V
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end sm:ml-auto">
            <div
              className={`
                px-3 py-1.5 rounded-full text-center transition
                ${colorMode === 'dark'
                  ? 'bg-[#111a2f] text-slate-100 ring-1 ring-[#1f2a3d]'
                  : 'bg-white text-slate-900 ring-1 ring-slate-200'
                }
              `}
            >
              {pricingInfoDisplay}
            </div>

            {renderState !== 'complete' && (
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
                {t("common.viewInStudio")}
              </button>
            )}

            {renderState === 'pending' && (
              <div
                className="flex items-center gap-1 text-xs sm:text-sm"
                aria-live="polite"
                role="status"
              >
                <FaSpinner className="animate-spin h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("vidgenie.renderingShort")}</span>
                <span className="sr-only">{t("vidgenie.renderingAria")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile action buttons (complete state) */}
        {renderState === 'complete' && sessionDetails && (
          <div className="flex justify-center gap-2 mt-4 mb-2">
            <PrimaryPublicButton
              className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
              onClick={viewInStudio}
            >
              View&nbsp;in&nbsp;Studio
            </PrimaryPublicButton>
            <PrimaryPublicButton
              extraClasses="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
              onClick={
                sessionDetails.ispublishedVideo
                  ? handleUnpublishClick
                  : handlePublishClick
              }
              isPending={
                sessionDetails.ispublishedVideo ? isUnpublishing : isPublishing
              }
              isDisabled={isPublishing || isUnpublishing}
            >
              {sessionDetails.ispublishedVideo
                ? isUnpublishing
                  ? t("vidgenie.unpublishing")
                  : t("vidgenie.unpublish")
                : isPublishing
                  ? t("vidgenie.publishing")
                  : t("vidgenie.publish")}
            </PrimaryPublicButton>
            <PrimaryPublicButton className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]">
              <a
                href={videoLink}
                download={`Rendition_${dateNowStr}.mp4`}
                className="underline"
              >
                {t("common.download")}
              </a>
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
              <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.aspectRatio")}</p>
            </div>

            {generationMode === 'T2V' && (
              <>
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
                  <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.imageModel")}</p>
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
                        <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.imageStyle")}</p>
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
                  <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.videoModel")}</p>
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
                    <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.pixverseStyle")}</p>
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
                    <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.videoSubType")}</p>
                  </div>
                )}
              </>
            )}

            {/* Duration */}
            {generationMode === 'T2V' && (
              <div className="group w-full">
                <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                  <SingleSelect
                    value={selectedDurationOption}
                    onChange={setSelectedDurationOption}
                    options={durationOptions}
                    className="w-full"
                  />
                </div>
                <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.maxDuration")}</p>
              </div>
            )}

            {/* Language */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedLanguageOption}
                  onChange={setSelectedLanguageOption}
                  options={languageOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.languageLabel", {}, "Language")}</p>
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

      {/* ───────── Submission form ───────── */}
      <form onSubmit={handleSubmit}>
        {generationMode === 'T2V' ? (
          <>
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
                placeholder={t("vidgenie.promptPlaceholder")}
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
                    ? t("vidgenie.voiceNotSupported")
                    : isVoiceBusy
                      ? t("vidgenie.voiceStop")
                      : t("vidgenie.voiceStart")
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
                  {isVoiceBusy ? t("vidgenie.voiceButtonSrStop") : t("vidgenie.voiceButtonSrStart")}
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
                    ? t("vidgenie.voiceUseMic")
                    : t("vidgenie.voiceUnavailable")}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <TextareaAutosize
              minRows={4}
              maxRows={12}
              disabled={isFormDisabled}
              className={`
                w-full pl-4 pt-4 pr-4 p-2 rounded-2xl resize-none placeholder:opacity-60
                focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ring-1 transition
                ${colorMode === 'dark'
                  ? 'bg-gray-950/90 text-white ring-white/10 focus:ring-indigo-500/50'
                  : 'bg-white text-slate-900 ring-slate-200 focus:ring-indigo-500/50'
                }
              `}
              placeholder={t("vidgenie.promptPlaceholder")}
              name="promptText"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
            <div className="relative">
              <div className={`relative rounded-2xl ring-1 transition ${imagePickerShell}`}>
                <label
                  className={`flex min-h-[220px] w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center ${
                    isFormDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,image/heic,image/heif,.heic,.heif"
                    multiple
                    onChange={handleFileChange}
                    disabled={isFormDisabled}
                    className="sr-only"
                  />
                  {uploadedImageDataUrls.length ? (
                    <>
                      <div className="grid w-full grid-cols-2 sm:grid-cols-3 gap-3">
                        {uploadedImageDataUrls.map((imageUrl, index) => (
                          <div key={`image-${index}`} className="flex flex-col items-center gap-1">
                            <img
                              src={imageUrl}
                              alt={`Selected prompt ${index + 1}`}
                              className="h-20 w-20 rounded-lg object-cover shadow-sm ring-1 ring-black/5"
                            />
                            <div className={`text-[11px] ${mutedText} max-w-[96px] truncate`}>
                              {uploadedImageFiles[index]?.name || `Image ${index + 1}`}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-3 text-[11px] ${mutedText}`}>Click to replace images</div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          colorMode === 'dark' ? 'bg-white/10' : 'bg-slate-100'
                        }`}
                      >
                        <FaImage className="text-lg" />
                      </div>
                      <div className="text-sm font-medium">Choose images</div>
                      <div className={`text-[11px] ${mutedText}`}>PNG, JPG, or HEIC</div>
                    </>
                  )}
                </label>
                {uploadedImageDataUrls.length > 0 && (
                  <button
                    type="button"
                    onClick={clearUploadedImage}
                    className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition ${
                      colorMode === 'dark'
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    aria-label="Remove selected images"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 relative">
          <div className="flex justify-center">
            <PrimaryPublicButton
              type="submit"
              isDisabled={isFormDisabled || isSubmitting}
              className="px-5 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
            >
              {isSubmitting ? t("vidgenie.submitting") : t("vidgenie.submit")}
            </PrimaryPublicButton>
          </div>

        </div>
      </form>

      {/* ───────── Assistant Chat ───────── */}
      <div className={`mt-6 rounded-2xl p-3 sm:p-4 ring-1 transition-shadow hover:shadow-sm ${
        colorMode === 'dark'
          ? 'bg-[#0f1629] text-slate-100 ring-[#1f2a3d]'
          : 'bg-white text-slate-900 ring-slate-200'
      }`}>
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
