import React, { useState, useEffect, useRef, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import CommonButton from '../common/CommonButton.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import { FaChevronCircleDown, FaSpinner, FaTimes, FaImage } from 'react-icons/fa';
import { useUser } from '../../contexts/UserContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import SingleSelect from '../common/SingleSelect.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import AuthContainer from '../auth/AuthContainer.jsx';
import axios from 'axios';
import { getHeaders } from '../../utils/web.jsx';
import PrimaryPublicButton from '../common/buttons/PrimaryPublicButton.tsx';

import {
  IMAGE_GENERAITON_MODEL_TYPES,
  VIDEO_GENERATION_MODEL_TYPES,
  IDEOGRAM_IMAGE_STYLES,
  PIXVERRSE_VIDEO_STYLES,
} from '../../constants/Types.ts';

import { getOperationExpectedPricing } from '../../constants/pricing/VidGPTPricing.jsx';
import ProgressIndicator from './ProgressIndicator.jsx';
import { FaYoutube } from 'react-icons/fa6';
import AssistantHome from '../assistant/AssistantHome.jsx';
import { VIDEO_MODEL_PRICES, IMAGE_MODEL_PRICES } from '../../constants/ModelPrices.jsx';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;
const PROCESSOR_API_URL = API_SERVER;

// =============== Polling constants ========================
const DEFAULT_POLL = 5_000;     // 5 s while online
const POLL_OFFLINE = 30_000;   // 30 s while offline
const MAX_BACKOFF = 60_000;   // 1 min cap

const POLL_DEFAULT = 5_000;      // 5 s while online & healthy

export default function OneshotEditor() {
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openAlertDialog /*, closeAlertDialog*/ } = useAlertDialog();

  // Basic session & form state
  const [sessionDetails, setSessionDetails] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ⬆️  near the other generation states
  const [isPaused, setIsPaused] = useState(false);

  // ─ Polling helpers ─────────────────────────────────────────────
  const DEFAULT_POLL = 5_000;      // 5 s while online & healthy
  const OFFLINE_POLL = 30_000;     // 30 s while offline
  const MAX_BACKOFF = 60_000;      // cap when server keeps 5xx-ing


  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pollDelay, setPollDelay] = useState(DEFAULT_POLL);

  useEffect(() => {
    // React to browser going offline / online
    const onLine = () => { setIsOnline(true); setPollDelay(DEFAULT_POLL); };
    const offLine = () => { setIsOnline(false); setPollDelay(OFFLINE_POLL); };
    window.addEventListener("online", onLine);
    window.addEventListener("offline", offLine);
    return () => {
      window.removeEventListener("online", onLine);
      window.removeEventListener("offline", offLine);
    };
  }, []);

  // Wake-from-sleep or tab-focus → trigger an immediate poll
  const lastWakePoll = useRef(Date.now());
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && Date.now() - lastWakePoll.current > 2000) {
        lastWakePoll.current = Date.now();
        pollGenerationStatus(true);          // instant run
        startAssistantQueryPoll(true);       // 〃
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ⬆️  place below other helper funcs (e.g. handleDownloadVideo)
  const handlePauseRender = async () => {
    try {
      const headers = getHeaders();
      await axios.post(
        `${API_SERVER}/quick_session/pause`,
        { sessionId: id },
        headers
      );

      // 1️⃣  Stop all polling so we don’t immediately re‑query the server
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (assistantPollRef.current) clearInterval(assistantPollRef.current);

      // 2️⃣  Update local UI state
      setIsPaused(true);
      setIsGenerationPending(false);
      setExpressGenerationStatus('PAUSED');
    } catch (err) {
      console.error('Pause request failed:', err);
      setErrorMessage({
        error: 'Could not pause the render. Please try again.',
      });
    }
  };

  // Poll “refs” (handles returned by setTimeout)
  const pollTimeoutRef = useRef(null);
  const assistantTimeoutRef = useRef(null);

  // Track the *current* delay used by each poller so we can back‑off
  const pollDelayRef = useRef(DEFAULT_POLL);
  const assistantDelayRef = useRef(DEFAULT_POLL);

  // Assistant / Chatbot states
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isAssistantQueryGenerating, setIsAssistantQueryGenerating] = useState(false);

  // Generation states
  const [isGenerationPending, setIsGenerationPending] = useState(false);
  const [expressGenerationStatus, setExpressGenerationStatus] = useState(null);
  const [videoLink, setVideoLink] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showResultDisplay, setShowResultDisplay] = useState(false);

  // Polling refs
  const pollIntervalRef = useRef(null);
  const pollErrorCountRef = useRef(0);
  const assistantPollRef = useRef(null);
  const assistantErrorCountRef = useRef(0);

  const [latestVideos, setLatestVideos] = useState([]);
  const [error, setError] = useState('');

  // State to track which video is expanded for inline playback
  const [expandedVideoId, setExpandedVideoId] = useState(null);

  // Image‑upload state
  const [uploadedImageFile, setUploadedImageFile] = useState(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchLatestVideos();
  }, []);

  // --------------------------------------
  //  New Tone Select
  // --------------------------------------
  const toneOptions = [
    { label: 'muted', value: 'grounded' },
    { label: 'cinematic', value: 'cinematic' }
  ];
  // Default to Cinematic
  const [selectedToneOption, setSelectedToneOption] = useState({
    label: 'muted',
    value: 'grounded',
  });

  // Aspect Ratio
  const aspectRatioOptions = [
    { label: '16:9 (Landscape)', value: '16:9' },
    { label: '9:16 (Portrait)', value: '9:16' },
  ];

  const [selectedAspectRatioOption, setSelectedAspectRatioOption] = useState(() => {
    const storedAspectRatioValue = localStorage.getItem('defaultVidGPTAspectRatio');
    const foundAspectRatio = aspectRatioOptions.find(
      (option) => option.value === storedAspectRatioValue
    );
    return foundAspectRatio || aspectRatioOptions[0];
  });

  // Filter out “Express” image models
  let expressImageModels = IMAGE_GENERAITON_MODEL_TYPES
    .filter((m) => {
      const modelExistsInPricing = IMAGE_MODEL_PRICES.find(
        (imp) => imp.key.toLowerCase() === m.key.toLowerCase()
      );
      if (!modelExistsInPricing) return false;

      const modelPricing = modelExistsInPricing?.prices || [];
      const modelHasAspectRatio = modelPricing.find(
        (p) => p.aspectRatio === selectedAspectRatioOption.value
      );
      // Keep only "express" and ensure it has pricing for the chosen aspect
      return m.isExpressModel && modelHasAspectRatio;
    })
    .map((m) => ({ label: m.name, value: m.key, imageStyles: m.imageStyles }));

  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const found = expressImageModels.find((m) => m.value === saved);
    const returnVal = found || expressImageModels[0];
    if (returnVal?.imageStyles?.length) {
      const firstStyle = returnVal.imageStyles[0];
      return { label: firstStyle, value: firstStyle };
    }
    return null;
  });

  // Track the selected IMAGE model
  const [selectedImageModel, setSelectedImageModel] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const found = expressImageModels.find((m) => m.value === saved);
    return found || expressImageModels[0];
  });

  useEffect(() => {
    if (!selectedImageModel) return;

    // Find the model config from IMAGE_GENERAITON_MODEL_TYPES
    const imageModelConfig = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedImageModel.value
    );
    if (imageModelConfig?.imageStyles?.length) {
      // If the old style doesn't exist in the new model, reset
      const doesOldStyleExist = imageModelConfig.imageStyles.find(
        (style) => style === selectedImageStyle?.value
      );
      if (!selectedImageStyle || !doesOldStyleExist) {
        const firstStyle = imageModelConfig.imageStyles[0];
        const styleVal = { label: firstStyle, value: firstStyle };
        setSelectedImageStyle(styleVal);
      }
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedImageModel]);

  const fetchLatestVideos = async () => {
    // ...
  };

  const handleToggleVideo = (videoId) => {
    setExpandedVideoId((prev) => (prev === videoId ? null : videoId));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImageFile(file);

    // Convert to base‑64 so it can travel inside JSON
    const reader = new FileReader();
    reader.onloadend = () => setUploadedImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const expressVideoModels = useMemo(() => {
    return VIDEO_GENERATION_MODEL_TYPES
      .filter(
        (m) =>
          m.isExpressModel &&
          m.supportedAspectRatios?.includes(selectedAspectRatioOption.value)
      )
      .map((m) => ({
        label: m.name,
        value: m.key,
        ...m,
      }));
  }, [selectedAspectRatioOption]);

  // Duration options
  const durationOptions = [
    { label: '30 Secs', value: 30 },
    { label: '1 Minute', value: 60 },
    { label: '1.5 Minutes', value: 90 },
    { label: '2 Minutes', value: 120 },
    { label: '3 Minutes', value: 180 },
  ];

  // Track the selected VIDEO model
  const [selectedVideoModel, setSelectedVideoModel] = useState(() => {
    const saved = localStorage.getItem('defaultVIdGPTVideoGenerationModel');
    const found = expressVideoModels.find((m) => m.value === saved);
    return found || expressVideoModels[0];
  });

  const [selectedDurationOption, setSelectedDurationOption] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTDuration');
    const parsed = parseInt(saved, 10);
    const found = durationOptions.find((opt) => opt.value === parsed);
    return found || durationOptions[0];
  });

  const [selectedVideoModelSubType, setSelectedVideoModelSubType] = useState(null);

  useEffect(() => {
    // If video model is Pixverse, default subType to the first Pixverse style
    if (selectedVideoModel?.value?.startsWith('PIXVERSE')) {
      if (!selectedVideoModelSubType) {
        const firstPixverseStyle = PIXVERRSE_VIDEO_STYLES[0];
        setSelectedVideoModelSubType({ label: firstPixverseStyle, value: firstPixverseStyle });
      }
    }
    // Else if model has standard "modelSubTypes" array, use the first from that
    else if (selectedVideoModel?.modelSubTypes?.length) {
      if (!selectedVideoModelSubType) {
        const firstSub = selectedVideoModel.modelSubTypes[0];
        setSelectedVideoModelSubType({ label: firstSub, value: firstSub });
      }
    }
    // If none apply, reset
    else {
      setSelectedVideoModelSubType(null);
    }
  }, [selectedVideoModel]);

  // Save preferences to localStorage
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
      localStorage.setItem(
        'defaultVidGPTDuration',
        selectedDurationOption.value.toString()
      );
    }
  }, [selectedDurationOption]);

  // Disable form if not premium or credits too low
  const [isDisabled, setIsDisabled] = useState(false);
  const [showPurchaseCreditsDialog, setShowPurchaseCreditsDialog] = useState(false);

  useEffect(() => {
    if (!user || user.generationCredits < 300) {
      //  setIsDisabled(true);
    } else {
      // setIsDisabled(false);
    }
  }, [user]);

  // Cleanup any polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (assistantPollRef.current) {
        clearInterval(assistantPollRef.current);
      }
    };
  }, []);



  +useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (assistantPollRef.current) clearInterval(assistantPollRef.current);

    if (id) {
      resetForm();
      getSessionDetails();
    }
  }, [id]);



  // -------------------------------------
  //  Assistant-related logic
  // -------------------------------------
  const showLoginDialog = () => {
    const loginComponent = <AuthContainer />;
    openAlertDialog(loginComponent);
  };

  async function handleDownloadVideo() {
    try {
      if (!videoLink) return;
      const headers = getHeaders();
      const response = await axios.get(videoLink, {
        responseType: 'blob',
        headers,
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'generated_video.mp4');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  }

  const startAssistantQueryPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (assistantPollRef.current) {
      clearInterval(assistantPollRef.current);
    }
    assistantErrorCountRef.current = 0;

    assistantPollRef.current = setInterval(() => {
      axios
        .get(`${PROCESSOR_API_URL}/assistants/assistant_query_status?id=${id}`, headers)
        .then((dataRes) => {
          assistantErrorCountRef.current = 0;
          const assistantQueryData = dataRes.data;
          const assistantQueryStatus = assistantQueryData.status;
          if (assistantQueryStatus === 'COMPLETED') {
            clearInterval(assistantPollRef.current);
            setSessionMessages(assistantQueryData.sessionDetails.sessionMessages);
            setIsAssistantQueryGenerating(false);
          }
        })
        .catch((err) => {
          console.error('Error polling assistant query:', err);
          assistantErrorCountRef.current += 1;
          if (assistantErrorCountRef.current >= 3) {
            clearInterval(assistantPollRef.current);
            setIsAssistantQueryGenerating(false);
          }
        });
    }, 1000);
  };

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
      .then(() => {
        startAssistantQueryPoll();
      })
      .catch((err) => {
        console.error('Assistant query error:', err);
        setIsAssistantQueryGenerating(false);
      });
  };

  const getSessionImageLayers = () => {
    // ...
  };



    const pollGenerationStatus = (immediate = false) => {
    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (immediate) pollDelayRef.current = 0;

    const doPoll = async () => {
      let continuePolling = true;

      try {
        const headers = getHeaders();
        const { data } = await axios.get(
          `${API_SERVER}/quick_session/status?sessionId=${id}`,
          headers
        );

        // Success → reset back‑off
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
          setErrorMessage({
            error: `Video generation failed. ${data.expressGenerationError}`,
          });
        }
      } catch (err) {
        // Error or offline ⇒ exponential back‑off
        pollDelayRef.current = Math.min(
          pollDelayRef.current ? pollDelayRef.current * 2 : DEFAULT_POLL,
          MAX_BACKOFF
        );
        console.error('Generation poll error:', err?.message || err);
      } finally {
        if (continuePolling) {
          const nextDelay = navigator.onLine ? pollDelayRef.current : OFFLINE_POLL;
          pollIntervalRef.current = setTimeout(doPoll, nextDelay);
        }
      }
    };

    // Kick‑off
    doPoll();
  };



  const getSessionDetails = async () => {
    try {
      const headers = getHeaders();
      const resData = await axios.get(`${API_SERVER}/quick_session/details?sessionId=${id}`, headers);
      const response = resData.data;
      setSessionDetails(response);

      if (response.videoGenerationPending) {
        setIsGenerationPending(true);
        setShowResultDisplay(true);
        pollGenerationStatus();
      }
      if (!response.videoGenerationPending && response.videoLink) {
        let videoActualLink;
        if (response.remoteURL && response.remoteURL.length > 0) {
          videoActualLink = response.remoteURL;
        } else if (response.videoLink) {
          videoActualLink = `${API_SERVER}/${response.videoLink}`;
        }
        setVideoLink(videoActualLink);
        setIsGenerationPending(false);
        setShowResultDisplay(true);
        setExpressGenerationStatus(response.expressGenerationStatus);
      }
      if (response.sessionMessages) {
        setSessionMessages(response.sessionMessages);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };




  useEffect(() => {
    if (!id) return;

    // Abort helper for axios
    const abort = new AbortController();
    let timeoutId = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await axios.get(
          `${API_SERVER}/quick_session/status?sessionId=${id}`,
          { signal: abort.signal }
        );

        if (cancelled) return;              // ignore stale results

        // …update state with `data` here…

        timeoutId = window.setTimeout(
          poll,
          navigator.onLine ? POLL_DEFAULT : POLL_OFFLINE
        );
      } catch (err) {
        // aborted -> silent; anything else -> handle + back‑off
        if (axios.isCancel(err)) return;
        if (cancelled) return;
        timeoutId = window.setTimeout(poll, POLL_OFFLINE);
      }
    };

    poll();                                 // kick‑off once

    // Cleanup when id changes or component un‑mounts
    return () => {
      cancelled = true;
      abort.abort();                        // kills in‑flight request
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [id]);





  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      const loginComponent = <AuthContainer />;
      openAlertDialog(loginComponent);
      return;
    }
    if (!promptText.trim()) {
      setErrorMessage({ error: 'Please enter some text before submitting.' });
      return;
    }
    if (!id) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    setIsGenerationPending(true);
    setShowResultDisplay(true);
    setVideoLink(null);
    setExpressGenerationStatus(null);

    const imageStyleValue = selectedImageStyle?.value || null;

    // Include the newly selected tone in the payload
    const payload = {
      prompt: promptText,
      sessionID: id,
      aspectRatio: selectedAspectRatioOption?.value,
      imageModel: selectedImageModel?.value,
      imageStyle: imageStyleValue,
      videoGenerationModel: selectedVideoModel?.value,
      modelSubType: selectedVideoModelSubType?.value || null,
      duration: selectedDurationOption?.value,
      startImage: uploadedImageDataUrl || null,
      videoTone: selectedToneOption?.value,
    };

    try {
      const headers = getHeaders();
      await axios.post(`${API_SERVER}/vidgenie/create`, payload, headers);
      pollGenerationStatus();
    } catch (error) {
      console.error('Error submitting theme text:', error);
      setErrorMessage({ error: 'An unexpected error occurred.' });
      setIsGenerationPending(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPromptText('');
    setShowResultDisplay(false);
    setErrorMessage(null);
    setVideoLink(null);
    setExpressGenerationStatus(null);
    setIsGenerationPending(false);
    setIsSubmitting(false);
    setSessionMessages([]);
    setUploadedImageFile(null);
    setUploadedImageDataUrl(null);
    setSelectedImageStyle(null);
    // Reset to default Cinematic if desired
    setSelectedToneOption({ label: 'muted', value: 'grounded' });
  };

  const viewInStudio = () => {
    navigate(`/video/${id}`);
  };

  const purchaseCreditsForUser = () => {
    // ...
  };

  const [pricingDetailsDisplay, setPricingDetailsDisplay] = useState(false);
  const togglePricingDetailsDisplay = () => {
    setPricingDetailsDisplay(!pricingDetailsDisplay);
  };

  const renderState = useMemo(() => {
    if (isGenerationPending) return 'pending';
    if (videoLink) return 'complete';
    return 'idle';
  }, [isGenerationPending, videoLink]);

  const handleRenderAgain = () => {
    resetForm();
  };

  const downloadVideoHref = videoLink;
  const isFormDisabled = renderState !== 'idle' || isDisabled;
  const textColor = colorMode === 'dark' ? 'text-white' : 'text-black';

  const dateNowStr = new Date().toISOString().replace(/[:.]/g, '-');

  // Example pricing logic
  let creditsPerSecondVideo = 10;
  if (selectedVideoModel.value === 'VEOI2V') {
    creditsPerSecondVideo = 60;
  }
  if (selectedVideoModel.value === 'LUMAFLASH2') {
    creditsPerSecondVideo = 6;
  }
  if (selectedVideoModel.value === 'KLINGIMGTOVID2.1MASTER') {
    creditsPerSecondVideo = 40;
  }

  let pricingInfoDisplay = (
    <div className="relative">
      <div
        className="flex justify-end font-bold text-sm text-neutral-100 cursor-pointer"
        onClick={togglePricingDetailsDisplay}
      >
        {creditsPerSecondVideo} Credits / second of video
        <FaChevronCircleDown className="inline-flex ml-1 mt-1" />
      </div>
      {pricingDetailsDisplay && (
        <div className="mt-1 text-sm w-full text-right">
          <div>The total price will be shown at completion.</div>
          <div>For example, a 60s video will cost {60 * creditsPerSecondVideo} credits.</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-5 relative">
      {/* ─────────────────────  HEADER  ───────────────────── */}
      <div
        className={`
        ${colorMode === 'dark' ? 'bg-neutral-950 text-white' : 'bg-white text-black'}
        flex flex-col  p-4 pt-8 mt-8 rounded-md shadow-md relative
      `}
      >
        {/* 1️⃣  Heading – single row */}
        <div className="flex flex-wrap items-baseline gap-2 text-lg font-bold text-center m-auto mt-1 pl-1 mb-4">
          <span>VidGenie&nbsp;Text&nbsp;to&nbsp;Vid&nbsp;Agent</span>
          <span className="text-xs text-gray-400 font-normal">
            — Create&nbsp;1‑shot&nbsp;videos&nbsp;from&nbsp;text&nbsp;prompts.
          </span>


          {renderState === 'pending' && (
            <div
              className="
      absolute right-2            /* ➋ anchors to top‑right */
      flex items-center gap-1
      text-xs sm:text-sm                /* ➌ scales up on ≥sm */
    "
            >
              <FaSpinner className="animate-spin h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Rendering…</span>
              <span className="sr-only">Video is rendering</span>
            </div>
          )}




          <div>



            {/* ⓑ Desktop: action buttons (visible ≥ sm) */}

          </div>

        </div>


        {/* ⓒ Mobile: action buttons (shown < sm) */}
        {renderState === 'complete' && (
          <div className="flex justify-center gap-2 mt-2 mb-4">
            <PrimaryPublicButton className="bg-blue-600 px-3 py-1 rounded text-white">
              <a
                href={videoLink}
                download={`Rendition_${dateNowStr}.mp4`}
                className="underline"
              >
                Download
              </a>
            </PrimaryPublicButton>

            <PrimaryPublicButton
              className="bg-blue-600 px-3 py-1 rounded text-white"
              onClick={viewInStudio}
            >
              View in Studio
            </PrimaryPublicButton>
          </div>
        )}


        {/* 2️⃣  Options row */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Aspect Ratio */}
            <div className="flex flex-col w-full">
              <SingleSelect
                value={selectedAspectRatioOption}
                onChange={setSelectedAspectRatioOption}
                options={aspectRatioOptions}
                className="w-full md:w-40"
              />
              <p className="text-xs mt-1">Aspect Ratio</p>
            </div>

            {/* Image Model */}
            <div className="flex flex-col w-full">
              <SingleSelect
                value={selectedImageModel}
                onChange={setSelectedImageModel}
                options={expressImageModels}
                className="w-full md:w-40"
              />
              <p className="text-xs mt-1">Image Model</p>
            </div>

            {/* Image Style (conditional) */}
            {(() => {
              const imageModelConfig = IMAGE_GENERAITON_MODEL_TYPES.find(
                (m) => m.key === selectedImageModel?.value
              );
              if (imageModelConfig?.imageStyles) {
                return (
                  <div className="flex flex-col w-full">
                    <SingleSelect
                      value={selectedImageStyle}
                      onChange={setSelectedImageStyle}
                      options={imageModelConfig.imageStyles.map((style) => ({
                        label: style,
                        value: style,
                      }))}
                      className="w-full md:w-40"
                    />
                    <p className="text-xs mt-1">Image Style</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Video Model */}
            <div className="flex flex-col w-full">
              <SingleSelect
                value={selectedVideoModel}
                onChange={setSelectedVideoModel}
                options={expressVideoModels.map((m) => ({
                  label: m.label,
                  value: m.value,
                  ...m,
                }))}
                className="w-full md:w-40"
              />
              <p className="text-xs mt-1">Video Model</p>
            </div>

            {/* Pixverse style or generic sub‑type */}
            {selectedVideoModel?.value?.startsWith('PIXVERSE') && selectedVideoModelSubType && (
              <div className="flex flex-col w-full">
                <SingleSelect
                  value={selectedVideoModelSubType}
                  onChange={setSelectedVideoModelSubType}
                  options={PIXVERRSE_VIDEO_STYLES.map((style) => ({
                    label: style,
                    value: style,
                  }))}
                  className="w-full md:w-40"
                />
                <p className="text-xs mt-1">Pixverse Style</p>
              </div>
            )}

            {selectedVideoModel?.modelSubTypes && selectedVideoModelSubType && (
              <div className="flex flex-col w-full">
                <SingleSelect
                  value={selectedVideoModelSubType}
                  onChange={setSelectedVideoModelSubType}
                  options={selectedVideoModel.modelSubTypes.map((sub) => ({
                    label: sub,
                    value: sub,
                  }))}
                  className="w-full md:w-40"
                />
                <p className="text-xs mt-1">Video Sub‑Type</p>
              </div>
            )}

            {/* Duration */}
            <div className="flex flex-col w-full">
              <SingleSelect
                value={selectedDurationOption}
                onChange={setSelectedDurationOption}
                options={durationOptions}
                className="w-full md:w-40"
              />
              <p className="text-xs mt-1">Max Duration</p>
            </div>

            {/* Tone */}
            <div className="flex flex-col w-full">
              <SingleSelect
                value={selectedToneOption}
                onChange={setSelectedToneOption}
                options={toneOptions}
                className="w-full md:w-40"
              />
              <p className="text-xs mt-1">Video Tone</p>
            </div>
          </div>
        </div>

      </div>
      {/* ────────────────── /HEADER ────────────────── */}

      {errorMessage?.error && !showResultDisplay && (
        <div className="text-red-500 mt-2 font-semibold">
          {errorMessage.error}
        </div>
      )}

      {showResultDisplay && (
        <div className="mt-4 transition-all duration-500 ease-in-out">
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

      {uploadedImageDataUrl && (
        <img
          src={uploadedImageDataUrl}
          alt="Prompt starter"
          className="mt-4 max-h-40 rounded shadow"
        />
      )}

      {/* Textarea & Submit Form */}
      <form onSubmit={handleSubmit}>
        <TextareaAutosize
          minRows={8}
          maxRows={20}
          disabled={isFormDisabled}
          className={`
          ${colorMode === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-black'}
          w-full pl-4 pt-4 p-2 rounded mt-4
        `}
          placeholder="Enter a succinct prompt for your rendition…"
          name="promptText"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
        <div className="mt-4 relative">
          <div className="flex justify-center">
            <PrimaryPublicButton
              type="submit"
              isDisabled={isFormDisabled || isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </PrimaryPublicButton>
          </div>

          {/* Pricing Info */}
          <div
            className={`
            ${colorMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}
            md:absolute md:right-0 top-0 p-2 rounded text-center mt-4 md:mt-0 w-full md:w-auto
          `}
          >
            {pricingInfoDisplay}
          </div>
        </div>
      </form>

      {/* AssistantHome */}
      <AssistantHome
        submitAssistantQuery={submitAssistantQuery}
        sessionMessages={sessionMessages}
        isAssistantQueryGenerating={isAssistantQueryGenerating}
        getSessionImageLayers={getSessionImageLayers}
      />
    </div>
  );


}
