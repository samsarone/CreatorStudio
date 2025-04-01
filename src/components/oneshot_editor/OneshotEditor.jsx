import React, { useState, useEffect, useRef, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import CommonButton from '../common/CommonButton.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import { FaChevronCircleDown, FaSpinner, FaTimes } from 'react-icons/fa';
import { useUser } from '../../contexts/UserContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import SingleSelect from '../common/SingleSelect.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import AuthContainer from '../auth/AuthContainer.jsx';
import axios from 'axios';
import { getHeaders } from '../../utils/web.jsx';

import {
  IMAGE_GENERAITON_MODEL_TYPES,
  VIDEO_GENERATION_MODEL_TYPES,
} from '../../constants/Types.ts';
import { getOperationExpectedPricing } from '../../constants/pricing/VidGPTPricing.jsx';
import ProgressIndicator from './ProgressIndicator.jsx';
import { FaYoutube } from 'react-icons/fa6';
import AssistantHome from '../assistant/AssistantHome.jsx';
import { VIDEO_MODEL_PRICES } from '../../constants/ModelPrices.jsx';

// Make sure your environment variables are correct
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;
// Optionally rename or add separate reference:
const PROCESSOR_API_URL = API_SERVER;

export default function OneshotEditor() {
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openAlertDialog /*, closeAlertDialog*/ } = useAlertDialog();

  // [1] Basic session & form state
  const [sessionDetails, setSessionDetails] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // [2] Assistant / Chatbot states
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

  // -------------------------------------
  //  Fetching & Lifecycle
  // -------------------------------------
  useEffect(() => {
    fetchLatestVideos();
  }, []);

  const fetchLatestVideos = async () => {
    // try {
    //   const headers = getHeaders();
    //   const response = await axios.get(`${API_SERVER}/vidgpt/latest_videos`, headers);
    //   // The route returns { items: [...] }
    //   if (response?.data?.items) {
    //     setLatestVideos(response.data.items);
    //   }
    // } catch (err) {
    //   console.error("Error fetching latest videos:", err);
    //   setError('Failed to fetch latest videos.');
    // }
  };

  // When a thumbnail is clicked, toggle the iframe view
  const handleToggleVideo = (videoId) => {
    setExpandedVideoId((prev) => (prev === videoId ? null : videoId));
  };

  // Aspect Ratio
  const aspectRatioOptions = [
    { label: '16:9 (Landscape)', value: '16:9' },
    { label: '9:16 (Portrait)', value: '9:16' },
  ];

  // Filter out “Express” models
  const expressImageModels = IMAGE_GENERAITON_MODEL_TYPES
    .filter((m) => m.isExpressModel)
    .map((m) => ({ label: m.name, value: m.key }));

  const [selectedAspectRatioOption, setSelectedAspectRatioOption] = useState(() => {
    const storedAspectRatioValue = localStorage.getItem('defaultVidGPTAspectRatio');
    const foundAspectRatio = aspectRatioOptions.find(
      (option) => option.value === storedAspectRatioValue
    );
    return foundAspectRatio || aspectRatioOptions[0];
  });

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
        // Keep entire object so we can access modelSubTypes, etc.:
        ...m,
      }));
  }, [selectedAspectRatioOption]);

  // Duration options
  const durationOptions = [
    { label: '30 Secs', value: 30 },
    { label: '1 Minute', value: 60 },
    { label: '1.5 Minutes', value: 90 },
  ];

  // -- Load localStorage defaults:
  const [selectedImageModel, setSelectedImageModel] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const found = expressImageModels.find((m) => m.value === saved);
    return found || expressImageModels[0];
  });

  // Because we also want the full object (including modelSubTypes),
  // let's store it that way:
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

  // We'll store the user's selected subType (if any) in state:
  const [selectedVideoModelSubType, setSelectedVideoModelSubType] = useState(null);

  // As soon as the user selects a new model, reset the subType if needed
  useEffect(() => {
    if (selectedVideoModel?.modelSubTypes) {
      // If model has subTypes, pick the first by default or handle as you see fit:
      const firstSub = selectedVideoModel.modelSubTypes[0];
      setSelectedVideoModelSubType({ label: firstSub, value: firstSub });
    } else {
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
      localStorage.setItem('defaultVidGPTDuration', selectedDurationOption.value.toString());
    }
  }, [selectedDurationOption]);

  // Disable form if not premium or credits too low
  const [isDisabled, setIsDisabled] = useState(false);
  useEffect(() => {
    if (!user || user.generationCredits < 300) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
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

  // On page load, if we have an `id`, fetch the session details
  useEffect(() => {
    if (id) {
      resetForm();
      getSessionDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -------------------------------------
  //  Assistant-related logic
  // -------------------------------------

  // Show the login dialog if the user is not authenticated
  const showLoginDialog = () => {
    const loginComponent = <AuthContainer />;
    openAlertDialog(loginComponent);
  };

  async function handleDownloadVideo() {
    try {
      if (!videoLink) return;
      const headers = getHeaders();  // If you need authenticated headers

      // Fetch the file as a Blob
      const response = await axios.get(videoLink, {
        responseType: 'blob',
        headers,
      });

      // Create a Blob URL
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));

      // Create a temporary link element, append it, and click it
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'generated_video.mp4'); // the filename you want
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  }

  // Polling function for assistant queries
  const startAssistantQueryPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (assistantPollRef.current) {
      clearInterval(assistantPollRef.current);
    }
    assistantErrorCountRef.current = 0; // reset before we start

    assistantPollRef.current = setInterval(() => {
      axios
        .get(`${PROCESSOR_API_URL}/assistants/assistant_query_status?id=${id}`, headers)
        .then((dataRes) => {
          assistantErrorCountRef.current = 0; // success, reset
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
          // Give it up to 3 tries before failing
          if (assistantErrorCountRef.current >= 3) {
            clearInterval(assistantPollRef.current);
            setIsAssistantQueryGenerating(false);
          }
        });
    }, 1000);
  };

  // Submit a query to your “AssistantHome” chat system
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
        { id: id, query: query },
        headers
      )
      .then(() => {
        startAssistantQueryPoll(); // begin polling
      })
      .catch((err) => {
        console.error('Assistant query error:', err);
        setIsAssistantQueryGenerating(false);
      });
  };

  const getSessionImageLayers = () => {
    // (Optional) If your Assistant needs to read images from the session
  };

  // -------------------------------------
  //  Session & generation status
  // -------------------------------------
  const getSessionDetails = async () => {
    try {
      const headers = getHeaders();
      const resData = await axios.get(
        `${API_SERVER}/quick_session/details?sessionId=${id}`,
        headers
      );
      const response = resData.data;
      setSessionDetails(response);

      // If the server says it's pending, show "pending" UI & poll
      if (response.videoGenerationPending) {
        setIsGenerationPending(true);
        setShowResultDisplay(true);
        pollGenerationStatus();
      }
      // If completed, set up the final video link
      if (!response.videoGenerationPending && response.videoLink) {
        let videoActualLink;
        if (response.remoteURL && response.remoteURL.length > 0) {
          videoActualLink = response.remoteURL;
        } else if (response.videoLink) {
          videoActualLink = `${API_SERVER}/${response.videoLink}`;
        }

        setVideoLink(videoActualLink);
        setShowResultDisplay(true);
        setExpressGenerationStatus(response.expressGenerationStatus);
      }

      // If the session has existing assistant messages:
      if (response.sessionMessages) {
        setSessionMessages(response.sessionMessages);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  // Poll for generation status
  const pollGenerationStatus = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollErrorCountRef.current = 0; // reset before we start

    pollIntervalRef.current = setInterval(async () => {
      try {
        const headers = getHeaders();
        const response = await axios.get(
          `${API_SERVER}/quick_session/status?sessionId=${id}`,
          headers
        );
        // If successful, reset the error count
        pollErrorCountRef.current = 0;

        const resData = response.data;
        setExpressGenerationStatus(resData.expressGenerationStatus);

        if (resData.status === 'COMPLETED') {
          clearInterval(pollIntervalRef.current);
          setIsGenerationPending(false);
          let videoActualLink;
          if (resData.remoteURL && resData.remoteURL.length > 0) {
            videoActualLink = resData.remoteURL;
          } else if (resData.videoLink) {
            videoActualLink = `${API_SERVER}/${videoLink}`;
          }
          setVideoLink(videoActualLink);
        } else if (resData.status === 'FAILED') {
          const errorMessage = resData.expressGenerationError;
          clearInterval(pollIntervalRef.current);
          setIsGenerationPending(false);
          setErrorMessage({
            error: `Video generation failed. ${errorMessage}`,
          });
        }
      } catch (error) {
        console.error('Error fetching generation status:', error);
        pollErrorCountRef.current += 1;

        if (pollErrorCountRef.current >= 3) {
          clearInterval(pollIntervalRef.current);
          setIsGenerationPending(false);
          setErrorMessage({
            error: 'An unexpected error occurred while checking status (multiple retries failed).',
          });
        }
      }
    }, 5000);
  };

  // Submit the prompt & start generation
  const handleSubmit = async (e) => {
    e.preventDefault();
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

    // Add modelSubType if the model has subTypes
    const payload = {
      prompt: promptText,
      sessionID: id,
      aspectRatio: selectedAspectRatioOption?.value,
      imageModel: selectedImageModel?.value,
      videoGenerationModel: selectedVideoModel?.value,
      // If user selected a subType, add it to the payload:
      modelSubType: selectedVideoModelSubType?.value || null,
      duration: selectedDurationOption?.value,
    };

    try {
      const headers = getHeaders();
      await axios.post(`${API_SERVER}/vidgpt/create`, payload, headers);
      pollGenerationStatus();
    } catch (error) {
      console.error('Error submitting theme text:', error);
      setErrorMessage({ error: 'An unexpected error occurred.' });
      setIsGenerationPending(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to reset everything
  const resetForm = () => {
    setPromptText('');
    setShowResultDisplay(false);
    setErrorMessage(null);
    setVideoLink(null);
    setExpressGenerationStatus(null);
    setIsGenerationPending(false);
    setIsSubmitting(false);
    setSessionMessages([]);
  };

  const viewInStudio = () => {
    navigate(`/video/${id}`);
  };

  const purchaseCreditsForUser = () => {
    // ...
    // e.g. redirect to a page or open a billing modal
  };

  // Show/hide pricing details
  const [pricingDetailsDisplay, setPricingDetailsDisplay] = useState(false);
  const togglePricingDetailsDisplay = () => {
    setPricingDetailsDisplay(!pricingDetailsDisplay);
  };

  // Determine overall "render state": 'idle', 'pending', 'complete'
  const renderState = useMemo(() => {
    if (isGenerationPending) return 'pending';
    if (videoLink) return 'complete';
    return 'idle';
  }, [isGenerationPending, videoLink]);

  // "Render Again" -> reset everything (clears out prior result)
  const handleRenderAgain = () => {
    resetForm();
  };

  // For downloading final video
  const downloadVideoHref = videoLink;

  // "Disable" the text area and the submit if not idle or user lacks credits
  const isFormDisabled = renderState !== 'idle' || isDisabled;
  const textColor = colorMode === 'dark' ? 'text-white' : 'text-black';

  const dateNowStr = new Date().toISOString().replace(/[:.]/g, '-');


  let creditsPerSecondVideo = 10;
  if (selectedVideoModel.value === 'VEOI2V') {
    creditsPerSecondVideo = 60;
  }
  if (selectedVideoModel.value === 'LUMAFLASH2') {
    creditsPerSecondVideo = 6;
  }
  if (selectedImageModel.value === "PIXVERSEI2VFAST") {
    creditsPerSecondVideo = 20;
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
          <div>For example, a 60s video will cost 600 credits.</div>
        </div>
      )}
    </div>
  );


  return (
    <div className="mt-[20px] relative">
      {/* Top Bar (header) */}
      <div
        className={
          colorMode === 'dark'
            ? "flex justify-between items-center p-2 bg-neutral-950 text-white pt-8 mt-8 rounded-md shadow-md relative"
            : "flex justify-between items-center p-2 bg-white text-black pt-8 mt-8 rounded-md shadow-md relative"
        }
      >
        <div
          className={
            colorMode === 'dark'
              ? "xs-hidden text-lg font-bold text-white pl-2 mt-[-6px]"
              : "xs-hidden text-lg font-bold text-black pl-2 mt-[-6px]"
          }
        >
          VidGPT Editor
        </div>

        {/* Right-Side Toolbar */}
        <div className="flex items-center space-x-4 mr-2">
          {/* SingleSelect: Aspect Ratio */}
          <div className="flex flex-col items-center">
            <SingleSelect
              value={selectedAspectRatioOption}
              onChange={setSelectedAspectRatioOption}
              options={aspectRatioOptions}
              className="w-40"
            />
            <p
              className={
                colorMode === 'dark'
                  ? "text-white text-xs mt-1"
                  : "text-black text-xs mt-1"
              }
            >
              Aspect Ratio
            </p>
          </div>

          {/* SingleSelect: Image Model */}
          <div className="flex flex-col items-center">
            <SingleSelect
              value={selectedImageModel}
              onChange={setSelectedImageModel}
              options={expressImageModels}
              className="w-40"
            />
            <p
              className={
                colorMode === 'dark'
                  ? "text-white text-xs mt-1"
                  : "text-black text-xs mt-1"
              }
            >
              Image Model
            </p>
          </div>

          {/* SingleSelect: Video Model */}
          <div className="flex flex-col items-center">
            <SingleSelect
              value={selectedVideoModel}
              onChange={(newVal) => setSelectedVideoModel(newVal)}
              options={expressVideoModels.map((m) => ({
                label: m.label,
                value: m.value,
                ...m,
              }))}
              className="w-40"
            />
            <p
              className={
                colorMode === 'dark'
                  ? "text-white text-xs mt-1"
                  : "text-black text-xs mt-1"
              }
            >
              Video Model
            </p>
          </div>

          {/* SingleSelect: Duration */}
          <div className="flex flex-col items-center">
            <SingleSelect
              value={selectedDurationOption}
              onChange={setSelectedDurationOption}
              options={durationOptions}
              className="w-40"
            />
            <p
              className={
                colorMode === 'dark'
                  ? "text-white text-xs mt-1"
                  : "text-black text-xs mt-1"
              }
            >
              Default Duration
            </p>
          </div>

          {/* Show "Render pending" if pending */}
          {renderState === 'pending' && (
            <div className="flex items-center space-x-2">
              <span>Render pending</span>
              <FaSpinner className="animate-spin" />
            </div>
          )}

          {/* Show "Download/Studio/RenderAgain" if completed */}
          {renderState === 'complete' && (
            <div className="flex items-center space-x-2">
              <button
                className="bg-blue-600 px-3 py-1 rounded text-white"
              >
                <a
                  href={videoLink}
                  download={`Rendition_${dateNowStr}.mp4`}
                  className="text-xs underline mt-2 mb-1 ml-2"
                >
                  Download Video
                </a>
              </button>
              <button
                className="bg-blue-600 px-3 py-1 rounded text-white"
                onClick={viewInStudio}
              >
                View in Studio
              </button>
              <button
                className="bg-blue-600 px-3 py-1 rounded text-white"
                onClick={handleRenderAgain}
              >
                Render Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* If there's an error before generation starts (empty prompt, etc.) */}
      {errorMessage?.error && !showResultDisplay && (
        <div className="text-red-500 mt-2 font-semibold">
          {errorMessage.error}
        </div>
      )}

      {/* ProgressIndicator: if generating or done, show the progress area */}
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

      {/* Textarea & Submit Form */}
      <form onSubmit={handleSubmit}>
        <TextareaAutosize
          minRows={8}
          maxRows={20}
          disabled={isFormDisabled}
          className={
            colorMode === 'dark'
              ? "w-full bg-gray-950 text-white pl-4 pt-4 p-2 rounded mt-4"
              : "w-full bg-gray-50 text-black pl-4 pt-4 p-2 rounded mt-4"
          }
          placeholder={`Enter a topic for your story-video, e.g.:\n"A 1-minute journey through the cosmos"`}
          name="promptText"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
        <div className="mt-4 relative">
          <div className="flex justify-center">
            <CommonButton
              type="submit"
              isDisabled={isFormDisabled || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </CommonButton>
          </div>

          {/* Pricing Info */}
          <div
            className={
              colorMode === 'dark'
                ? "md:absolute md:right-0 top-0 text-white p-2 bg-gray-900 rounded text-center mt-4 md:mt-0 w-full md:w-auto"
                : "md:absolute md:right-0 top-0 text-black p-2 bg-gray-100 rounded text-center mt-4 md:mt-0 w-full md:w-auto"
            }
          >
            {pricingInfoDisplay}
          </div>
        </div>
      </form>

      {/* AssistantHome inserted below */}
      <AssistantHome
        submitAssistantQuery={submitAssistantQuery}
        sessionMessages={sessionMessages}
        isAssistantQueryGenerating={isAssistantQueryGenerating}
        getSessionImageLayers={getSessionImageLayers}
      />
    </div>
  );
}
