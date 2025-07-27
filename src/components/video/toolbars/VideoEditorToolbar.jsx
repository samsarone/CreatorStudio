// VideoEditorToolbar.js
import React, { useState, useRef, useEffect } from 'react';
import PromptGenerator from './PromptGenerator.jsx';
import ImageEditGenerator from '../toolbars/ImageEditGenerator.jsx';

import AddText from './text_toolbar/AddText.tsx';
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronCircleRight,
  FaTimes
} from 'react-icons/fa';
import AddShapeDisplay from '../../editor/utils/AddShapeDisplay.tsx';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import LayersDisplay from '../../editor/toolbar/LayersDisplay.tsx';
import Select from 'react-select';
import {
  CURRENT_TOOLBAR_VIEW,
  TOOLBAR_ACTION_VIEW,
  SPEECH_SELECT_TYPES,

  OPENAI_SPEAKER_TYPES,


  MUSIC_PROVIDERS,
  TTS_COMBINED_SPEAKER_TYPES
} from '../../../constants/Types.ts';
import SecondaryButton from '../../common/SecondaryButton.tsx';
import SoundSelectToolbar from './audio/SoundSelectToolbar.jsx';
import LayerSpeechPreview from './audio/LayerSpeechPreview.jsx';
import MovieSpeechProviderSelect from './audio/MovieSpeechProviderSelect.jsx';

import { toast } from 'react-toastify';
import './editorToolbar.css';
import 'react-toastify/dist/ReactToastify.css';
import { AiOutlineSound } from "react-icons/ai";
import { PiSelectionAll } from "react-icons/pi";
import { MdOutlineRectangle } from "react-icons/md";
import { FaPencilAlt, FaEraser, FaCrosshairs, FaUpload } from 'react-icons/fa';
import { FaRegCircle } from "react-icons/fa";
import { FaMusic } from 'react-icons/fa6';
import { RiSpeakLine } from "react-icons/ri";
import MusicSelectToolbar from './audio/MusicSelectToolbar.jsx';
import SpeechSelectToolbar from './audio/SpeechSelectToolbar.jsx';
import { LuCombine } from "react-icons/lu";
import { TbLibraryPhoto } from "react-icons/tb";
import TextareaAutosize from 'react-textarea-autosize';
import PromptViewer from './PromptViewer.jsx';
import VideoEditorDefaultsViewer from './VideoEditorDefaultsViewer.jsx';
import VideoPromptGenerator from './VideoPromptGenerator.jsx';
import SingleSelect from '../../common/SingleSelect.jsx';

import { useAlertDialog } from '../../../contexts/AlertDialogContext.jsx';
import VideoLipSyncOptionsViewer from './ai_video/VideoLipSyncOptionsViewer.jsx';
import VideoAiVideoOptionsViewer from './ai_video/VideoAiVideoOptionsViewer.jsx';

export default function VideoEditorToolbar(props) {
  const {
    sessionDetails,
    addTextBoxToCanvas,
    editBrushWidth,
    setEditBrushWidth,
    setCurrentViewDisplay,
    currentViewDisplay,
    textConfig,
    setTextConfig,
    activeItemList,
    setActiveItemList,
    setSelectedShape,
    fillColor,
    setFillColor,
    strokeColor,
    setStrokeColor,
    strokeWidthValue,
    setStrokeWidthValue,
    selectedId,
    exportAnimationFrames,
    setSelectedId,
    pencilWidth,
    setPencilWidth,
    pencilColor,
    setPencilColor,
    eraserWidth,
    setEraserWidth,
    pencilOptionsVisible,
    eraserOptionsVisible,
    cursorSelectOptionVisible,
    setCursorSelectOptionVisible,
    showUploadAction,
    currentCanvasAction,
    setCurrentCanvasAction,
    setSelectedLayerSelectShape,
    updateSessionLayerActiveItemList,
    submitGenerateMusicRequest,
    audioLayers,
    audioGenerationPending,
    submitAddTrackToProject,
    combineCurrentLayerItems,
    submitUpdateSessionDefaults,
    isUpdateDefaultsPending,
    hideItemInLayer,
    updateSessionLayerActiveItemListAnimations,
    applyAnimationToAllLayers,
    submitGenerateLayeredSpeechRequest,
    currentDefaultPrompt,
    submitGenerateRecreateRequest,
    showCreateNewPrompt,
    showCreateNewPromptDisplay,
    aspectRatio,
    onToggleDisplay,
    showToggleCollapseToolbar,
    subtitlesGenerationPending,
    submitGenerateSubtitles,
    setAdvancedSessionTheme,
    submitAddBatchTrackToProject,
    currentLayer,
    movieSoundList,
    movieGenSpeakers,
    updateMovieGenSpeakers,
  } = props;

  const { openAlertDialog, closeAlertDialog } = useAlertDialog();

  const [selectedAnimationOption, setSelectedAnimationOption] = useState(null);
  const [addText, setAddText] = useState('');
  const [animateAllLayersSelected, setAnimateAllLayersSelected] = useState(false);

  // We only read this value; never update it, so we can just store `true`.
  const addSubtitles = true;

  const [currentlyPlayingSpeaker, setCurrentlyPlayingSpeaker] = useState(null);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [containerWidth, setContainerWidth] = useState('w-[16%]');
  const audioSampleRef = useRef(null);
  const [numberOfSpeechLayersRequested, setNumberOfSpeechLayersRequested] = useState(0);
  const [selectedMusicProvider, setSelectedMusicProvider] = useState(MUSIC_PROVIDERS[0]);
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Duration state for AUDIOCRAFT
  const [musicDuration, setMusicDuration] = useState(10);

  const [ttsProvider, setTtsProvider] = useState({ value: 'OPENAI', label: 'OpenAI' });


  const [speakerType, setSpeakerType] = useState(null);

  useEffect(() => {

    if (movieGenSpeakers && movieGenSpeakers.length > 0) {
      const storedSpeakerName = localStorage.getItem('defaultSpeaker');

      const storedSpeaker = movieGenSpeakers.find(speaker => speaker.speakerCharacterName === storedSpeakerName);

      if (storedSpeaker) {
        setSpeakerType({
          value: storedSpeaker.speaker,
          label: storedSpeaker.speakerCharacterName,
          provider: storedSpeaker.provider
        });
      }
      else {
        setSpeakerType({
          value: movieGenSpeakers[0].speaker,
          label: movieGenSpeakers[0].speakerCharacterName,
          provider: movieGenSpeakers[0].provider
        });
      }

    }
  }, [movieGenSpeakers]);

  useEffect(() => {
    if (speakerType) {
      localStorage.setItem('defaultSpeaker', speakerType.label);
    }
  }, [speakerType]);

  const { colorMode } = useColorMode();

  const handleMusicProviderChange = (selectedOption) => {
    const selectedProvider = MUSIC_PROVIDERS.find(provider => provider.key === selectedOption.value);
    setSelectedMusicProvider(selectedProvider);
    // Force instrumental if AUDIOCRAFT
    if (selectedOption.value === 'AUDIOCRAFT') {
      setIsInstrumental(true);
    } else {
      setIsInstrumental(false);
    }
  };

  const handleTtsProviderChange = (selectedOption) => {
    setTtsProvider(selectedOption);
    setSpeakerType(null);
  };

  const handleSpeakerChange = (selectedOption) => {
    setSpeakerType(selectedOption);

    //const selectedSpeakerName = selectedOption.label;
    // localStorage.setItem('defaultSpeaker', selectedSpeakerName);

    if (audioSampleRef.current) {
      audioSampleRef.current.pause();
      audioSampleRef.current = null;
    }
    setCurrentlyPlayingSpeaker(null);
  };

  const handleAddAllSpeechLayers = () => {
    const speechAudioLayers = audioLayers.slice(-numberOfSpeechLayersRequested);

    const batchPayload = speechAudioLayers.map((layer) => {
      return {
        startTime: layer.startTime || 0,
        duration: layer.duration || 5,
        endTime: (layer.startTime || 0) + (layer.duration || 5),
        volume: layer.volume || 100,
        addSubtitles: addSubtitles,
        selectedSubtitleOption: 'SUBTITLE_WORD',
        audioLayerId: layer._id.toString(),
      };
    });

    submitAddBatchTrackToProject(batchPayload);
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
  };

  const handleBackFromPreview = () => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_SPEECH_GENERATE_DISPLAY);
  };

  const playMusicPreviewForSpeaker = (evt, speaker) => {
    evt.stopPropagation();
    if (currentlyPlayingSpeaker && currentlyPlayingSpeaker.value === speaker.value) {
      if (audioSampleRef.current) {
        audioSampleRef.current.pause();
        audioSampleRef.current = null;
      }
      setCurrentlyPlayingSpeaker(null);
    } else {
      if (audioSampleRef.current) {
        audioSampleRef.current.pause();
        audioSampleRef.current = null;
      }
      let speakerMusicLink = speaker.previewURL;
      if (speakerMusicLink) {
        const audio = new Audio(speakerMusicLink);
        audio.play();
        audioSampleRef.current = audio;
        setCurrentlyPlayingSpeaker(speaker);

        audio.onended = () => {
          setCurrentlyPlayingSpeaker(null);
          audioSampleRef.current = null;
        };
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioSampleRef.current) {
        audioSampleRef.current.pause();
        audioSampleRef.current = null;
      }
    };
  }, []);

  const submitAddText = () => {
    let textConfigCopy = { ...textConfig };
    if (textConfig.fontSize) {
      textConfigCopy.fontSize = parseInt(textConfig.fontSize, 10);
    }
    if (textConfig.strokeWidth) {
      textConfigCopy.strokeWidth = parseInt(textConfig.strokeWidth, 10);
    }
    textConfigCopy.textAlign = 'center'; // example default
    const payload = {
      type: 'text',
      text: addText,
      config: textConfigCopy
    };
    addTextBoxToCanvas(payload);
  };

  const handleAnimationChange = (selectedOption) => {
    setSelectedAnimationOption(selectedOption.value);
  };

  const submitApplyAnimationToLayer = (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target);
    let formValues = Object.fromEntries(formData.entries());
    for (let key in formValues) {
      if (!isNaN(formValues[key])) {
        formValues[key] = parseFloat(formValues[key]);
      }
    }

    const animationType = formValues.type;
    delete formValues.type;

    if (selectedId && !animateAllLayersSelected) {
      const newActiveItemList = activeItemList.map(item => {
        if (item.id === selectedId) {
          let animations = item.animations || [];
          const existingAnimationIndex = animations.findIndex(animation => animation.type === animationType);
          if (existingAnimationIndex !== -1) {
            animations[existingAnimationIndex] = {
              type: animationType,
              params: formValues
            };
          } else {
            animations.push({
              type: animationType,
              params: formValues
            });
          }
          return {
            ...item,
            animations: animations
          };
        }
        return item;
      });

      setActiveItemList(newActiveItemList);
      updateSessionLayerActiveItemListAnimations(newActiveItemList);
      exportAnimationFrames(newActiveItemList);
    } else {
      applyAnimationToAllLayers(formValues, animationType);
    }
  };


  const getAnimationBoundariesDisplay = (selectedOption) => {
    const selectedItem = activeItemList.find(item => item.id === selectedId);

    if ((!selectedItem || activeItemList.length === 0) && !animateAllLayersSelected) {
      return;
    }

    let animationParams = selectedItem?.animations;

    if (selectedOption === 'fade') {
      let startFade = 100;
      let endFade = 100;
      if (animationParams && animationParams.length > 0) {
        let fadeAnimationParams = animationParams.find(animation => animation.type === 'fade');
        if (fadeAnimationParams) {
          startFade = fadeAnimationParams.params.startFade;
          endFade = fadeAnimationParams.params.endFade;
        }
      }
      return (
        <div className='mt-2'>
          <form onSubmit={submitApplyAnimationToLayer} key="fadeForm">
            <div className='grid grid-cols-2 gap-2 m-auto text-center'>
              <div>
                <input
                  type='text'
                  placeholder='Start Fade'
                  name="startFade"
                  defaultValue={startFade}
                  className='w-full'
                />
                <div>Start Fade</div>
              </div>
              <div>
                <input
                  type='text'
                  placeholder='End Fade'
                  name="endFade"
                  defaultValue={endFade}
                  className='w-full'
                />
                <div>End Fade</div>
                <input type="hidden" name="type" value="fade" />
              </div>
            </div>
            <div className='m-auto text-center'>
              <SecondaryButton type="submit">Apply</SecondaryButton>
            </div>
          </form>
        </div>
      );
    } else if (selectedOption === 'slide') {
      let startX = 0;
      let startY = 0;
      let endX = 0;
      let endY = 0;

      if (selectedItem) {
        startX = selectedItem.x;
        startY = selectedItem.y;
        endX = selectedItem.x;
        endY = selectedItem.y;
      }
      if (animationParams) {
        let slideAnimationParams = animationParams.find(animation => animation.type === 'slide');
        if (slideAnimationParams) {
          startX = slideAnimationParams.params.startX;
          startY = slideAnimationParams.params.startY;
          endX = slideAnimationParams.params.endX;
          endY = slideAnimationParams.params.endY;
        }
      }

      return (
        <div className='mt-2'>
          <form onSubmit={submitApplyAnimationToLayer} key="slideForm">
            <div className='grid grid-cols-2 gap-2 m-auto text-center'>
              <div>
                <input
                  type='text'
                  name="startX"
                  placeholder='Start X'
                  defaultValue={startX}
                  className='w-full'
                />
                <div>Start X</div>
              </div>
              <div>
                <input
                  type='text'
                  name="startY"
                  placeholder='Start Y'
                  defaultValue={startY}
                  className='w-full'
                />
                <div>Start Y</div>
              </div>
              <div>
                <input
                  type='text'
                  placeholder='End X'
                  name="endX"
                  defaultValue={endX}
                  className='w-full'
                />
                <div>End X</div>
              </div>
              <div>
                <input
                  type='text'
                  placeholder='End Y'
                  name='endY'
                  defaultValue={endY}
                  className='w-full'
                />
                <div>End Y</div>
              </div>
            </div>
            <input type="hidden" name="type" value="slide" />
            <div className='m-auto text-center'>
              <SecondaryButton type="submit">Apply</SecondaryButton>
            </div>
          </form>
        </div>
      );
    } else if (selectedOption === 'zoom') {
      let startScale = 100;
      let endScale = 100;
      if (animationParams) {
        let zoomAnimationParams = animationParams.find(animation => animation.type === 'zoom');
        if (zoomAnimationParams) {
          startScale = zoomAnimationParams.params.startScale;
          endScale = zoomAnimationParams.params.endScale;
        }
      }
      return (
        <div className='mt-2'>
          <form onSubmit={submitApplyAnimationToLayer} key="zoomForm">
            <div className='grid grid-cols-2 gap-2 m-auto text-center'>
              <div>
                <input
                  type='text'
                  placeholder='Start Scale'
                  name="startScale"
                  defaultValue={startScale}
                  className='w-full'
                />
                <div>Start Scale</div>
              </div>
              <div>
                <input
                  type='text'
                  placeholder='End Scale'
                  name="endScale"
                  defaultValue={endScale}
                  className='w-full'
                />
                <div>End Scale</div>
              </div>
            </div>
            <input type="hidden" name="type" value="zoom" />
            <div className='m-auto text-center'>
              <SecondaryButton type="submit">Apply</SecondaryButton>
            </div>
          </form>
        </div>
      );
    } else if (selectedOption === 'rotate') {
      let startRotate = 0;
      if (animationParams) {
        const rotateParams = animationParams.find(animation => animation.type === 'rotate');
        if (rotateParams) {
          startRotate = rotateParams.params.startRotate;
        }
      }
      return (
        <div className='mt-2'>
          <form onSubmit={submitApplyAnimationToLayer} key="rotateForm">
            <div className='grid grid-cols-2 gap-2 m-auto text-center'>
              <div>
                <input
                  type='text'
                  name="startRotate"
                  defaultValue={startRotate}
                  placeholder='Rotations / second'
                  className='w-full'
                />
                <div>Rotations/second</div>
              </div>
            </div>
            <input type="hidden" name="type" value="rotate" />
            <div className='m-auto text-center'>
              <SecondaryButton type="submit">Apply</SecondaryButton>
            </div>
          </form>
        </div>
      );
    }
  };

  let generateDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY) {
    if (currentDefaultPrompt && !showCreateNewPromptDisplay) {
      generateDisplay = (
        <PromptViewer
          {...props}
          showCreateNewPrompt={showCreateNewPrompt}
          submitGenerateRecreateRequest={submitGenerateRecreateRequest}
        />
      );
    } else {
      generateDisplay = <PromptGenerator {...props} />;
    }
  }

  let generateVideoDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_VIDEO_DISPLAY) {
    if (currentLayer.hasLipSyncVideoLayer) {
      generateVideoDisplay = <VideoLipSyncOptionsViewer {...props} />;
    } else if (currentLayer.hasAiVideoLayer && currentLayer.aiVideoGenerationStatus === "COMPLETED") {
      generateVideoDisplay = <VideoAiVideoOptionsViewer {...props} />;
    } else {
      generateVideoDisplay = <VideoPromptGenerator {...props} />;
    }
  }

  let addTextDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_ADD_TEXT_DISPLAY) {
    addTextDisplay = (
      <AddText
        setAddText={setAddText}
        submitAddText={submitAddText}
        textConfig={textConfig}
        addText={addText}
        setTextConfig={setTextConfig}
      />
    );
  }

  let editDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY) {
    editDisplay = (
      <div>
        <ImageEditGenerator
          {...props}
          editBrushWidth={editBrushWidth}
          setEditBrushWidth={setEditBrushWidth}
        />
      </div>
    );
  }

  let layersDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_LAYERS_DISPLAY) {
    layersDisplay = (
      <LayersDisplay
        activeItemList={activeItemList}
        setActiveItemList={setActiveItemList}
        updateSessionLayerActiveItemList={updateSessionLayerActiveItemList}
        hideItemInLayer={hideItemInLayer}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
    );
  }

  const toggleCurrentViewDisplay = (view) => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY);
    if (view === currentViewDisplay) {
      setCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_DEFAULT_DISPLAY);
    } else {
      setCurrentViewDisplay(view);
    }
  };

  const submitGenerateSound = (evt) => {
    evt.preventDefault();
    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const secondsTotal = parseInt(formData.get('secondsTotal'), 10);

    if (isNaN(secondsTotal) || secondsTotal < 2 || secondsTotal > 40) {
      toast.error(
        <div>
          <FaTimes className="inline-flex mr-2" /> Please enter a duration between 2 and 40 seconds.
        </div>,
        {
          position: "bottom-center",
          className: "custom-toast",
        }
      );
      return;
    }

    const body = {
      prompt: promptText,
      generationType: 'sound',
      model: 'SDAUDIO',
      secondsTotal: secondsTotal,
    };
    submitGenerateMusicRequest(body);
  };

  const showLibraryAction = () => {
    setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_LIBRARY_DISPLAY);
  };

  let addShapeDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_ADD_SHAPE_DISPLAY) {
    addShapeDisplay = (
      <AddShapeDisplay
        setSelectedShape={setSelectedShape}
        setStrokeColor={setStrokeColor}
        setFillColor={setFillColor}
        fillColor={fillColor}
        strokeColor={strokeColor}
        strokeWidthValue={strokeWidthValue}
        setStrokeWidthValue={setStrokeWidthValue}
      />
    );
  }

  let uploadDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY) {
    uploadDisplay = (
      <div>
        <div className='m-auto text-center grid grid-cols-3'>
          <div className="text-center m-auto align-center mt-4 mb-4">
            <FaUpload className="text-2xl m-auto cursor-pointer" onClick={() => showUploadAction()} />
            <div className="text-[12px] tracking-tight m-auto text-center">
              Upload
            </div>
          </div>
          <div className="text-center m-auto align-center mt-4 mb-4">
            <TbLibraryPhoto className="text-2xl m-auto cursor-pointer" onClick={() => showLibraryAction()} />
            <div className="text-[12px] tracking-tight m-auto text-center">
              Library
            </div>
          </div>
        </div>
      </div>
    );
  }

  let bgColor = "bg-gray-800 border-stone-600";
  if (colorMode === 'light') {
    bgColor = "bg-neutral-50 text-neutral-900";
  }
  let buttonBgcolor = "bg-gray-900 text-white";
  if (colorMode === 'light') {
    buttonBgcolor = "bg-stone-200 text-neutral-900";
  }
  let textInnerColor = colorMode === 'dark' ? 'text-neutral-900' : 'text-white';
  const text2Color = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';
  let formSelectBgColor = colorMode === 'dark' ? '#030712' : '#f3f4f6';
  let formSelectTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  let formSelectSelectedTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  let formSelectHoverColor = colorMode === 'dark' ? '#1f2937' : '#2563EB';

  let animateOptionsDisplay = <span />;
  const animationOptions = [
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'rotate', label: 'Rotate' }
  ];

  const setAnimateAllLayersSelectedFunc = () => {
    setAnimateAllLayersSelected(true);
  };

  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_ANIMATE_DISPLAY) {
    if ((!selectedId || selectedId === -1) && !animateAllLayersSelected) {
      animateOptionsDisplay = (
        <div className={`${text2Color} pl-2`}>
          <div>
            <div className='block mb-4 text-xs mt-2'>
              <SecondaryButton onClick={setAnimateAllLayersSelectedFunc}>
                Animate all layers
              </SecondaryButton>
            </div>
            <div className='block mt-4'>
              Please select a layer to animate.
            </div>
          </div>
        </div>
      );
    } else {
      let animationOptionMeta = <span />;
      if (selectedAnimationOption) {
        animationOptionMeta = getAnimationBoundariesDisplay(selectedAnimationOption);
      }

      animateOptionsDisplay = (
        <div>
          Select animation
          <div>
            <Select
              options={animationOptions}
              onChange={handleAnimationChange}
              styles={{
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: formSelectBgColor,
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: formSelectTextColor,
                }),
                control: (provided, state) => ({
                  ...provided,
                  backgroundColor: formSelectBgColor,
                  borderColor: state.isFocused ? '#007BFF' : '#ced4da',
                  '&:hover': {
                    borderColor: state.isFocused ? '#007BFF' : '#ced4da'
                  },
                  boxShadow: state.isFocused
                    ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)'
                    : null,
                  minHeight: '38px',
                  height: '38px'
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: formSelectBgColor,
                  color: state.isSelected ? formSelectSelectedTextColor : formSelectTextColor,
                  '&:hover': {
                    backgroundColor: formSelectHoverColor
                  }
                })
              }}
            />
          </div>
          <div key={`${selectedId}_form_input`}>
            {animationOptionMeta}
          </div>
        </div>
      );
    }
  }

  const submitGenerateMusic = (evt) => {
    evt.preventDefault();
    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');

    if (selectedMusicProvider.key === 'AUDIOCRAFT') {
      // Validate musicDuration
      if (isNaN(musicDuration) || musicDuration < 1 || musicDuration > 120) {
        toast.error(
          <div>
            <FaTimes className="inline-flex mr-2" /> Duration must be between 1 and 120 seconds.
          </div>,
          {
            position: "bottom-center",
            className: "custom-toast",
          }
        );
        return;
      }
    }

    const body = {
      prompt: promptText,
      generationType: 'music',
      isInstrumental: isInstrumental,
      model: selectedMusicProvider.key,
    };
    if (selectedMusicProvider.key === 'AUDIOCRAFT' || selectedMusicProvider.key === 'CASSETTEAI' || 
        selectedMusicProvider.key === 'LYRIA2'
    ) {
      body.duration = Number(musicDuration);
    }
    submitGenerateMusicRequest(body);
  };

  const submitGenerateSpeech = (payload) => {
    payload.aspectRatio = aspectRatio;
    const speechOptionValue = payload.speechOptionValue;

    // "SPEECH_LAYER_LINES" means multiple lines => multiple speech layers
    if (speechOptionValue === 'SPEECH_LAYER_LINES') {
      const promptText = payload.promptText;
      const speaker = payload.speaker;
      const textAnimationOptions = payload.textAnimationOptions;
      const subtitleOptionValue = payload.subtitleOptionValue;
      const ttsProviderValue = payload.ttsProviderValue;

      const promptList = promptText
        .split('\n')
        .filter(prompt => prompt && prompt.trim().length > 0);


      let layeredSpeechBody = {
        generationType: 'speech',
        speaker: speaker,
        promptList: promptList,
        addSubtitles: addSubtitles,
        textAnimationOptions: textAnimationOptions,
        subtitleOption: subtitleOptionValue,
        ttsProvider: ttsProviderValue,
        aspectRatio: aspectRatio
      };

      if (payload.generationMeta) {
        layeredSpeechBody.generationMeta = payload.generationMeta;
      }


      setNumberOfSpeechLayersRequested(promptList.length);
      submitGenerateLayeredSpeechRequest(layeredSpeechBody);
    } else {
      submitGenerateMusicRequest(payload);
    }
  };

  let audioOptionsDisplay = <span />;
  let audioSubOptionsDisplay = <span />;
  const highlightedBgColor = colorMode === 'dark' ? 'bg-blue-800' : 'bg-neutral-800';

  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_AUDIO_DISPLAY) {
    const isAudioOptionSelected = (option) => currentCanvasAction === option;

    audioOptionsDisplay = (
      <div className={`grid grid-cols-3 ${text2Color} h-auto`}>
        <div
          onClick={() => {
            setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_SPEECH_GENERATE_DISPLAY);
          }}
          className={`cursor-pointer flex flex-col items-center justify-center transition-transform duration-300 transform hover:scale-105 ${isAudioOptionSelected(TOOLBAR_ACTION_VIEW.SHOW_SPEECH_GENERATE_DISPLAY)
              ? highlightedBgColor
              : ''
            } p-2 rounded`}
        >
          <RiSpeakLine />
          <div className="text-xs">Speech</div>
        </div>
        <div
          onClick={() => {
            setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_MUSIC_GENERATE_DISPLAY);
          }}
          className={`cursor-pointer flex flex-col items-center justify-center transition-transform duration-300 transform hover:scale-105 ${isAudioOptionSelected(TOOLBAR_ACTION_VIEW.SHOW_MUSIC_GENERATE_DISPLAY)
              ? highlightedBgColor
              : ''
            } p-2 rounded`}
        >
          <FaMusic />
          <div className="text-xs">Music</div>
        </div>
        <div
          onClick={() => {
            setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_SOUND_GENERATE_DISPLAY);
          }}
          className={`cursor-pointer flex flex-col items-center justify-center transition-transform duration-300 transform hover:scale-105 ${isAudioOptionSelected(TOOLBAR_ACTION_VIEW.SHOW_SOUND_GENERATE_DISPLAY)
              ? highlightedBgColor
              : ''
            } p-2 rounded`}
        >
          <AiOutlineSound />
          <div className="text-xs">Effect</div>
        </div>
      </div>
    );

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_MUSIC_GENERATE_DISPLAY) {
      audioSubOptionsDisplay = (
        <div className="transition-all duration-300 ease-in-out">
          <form name="audioGenerateForm" className="w-full" onSubmit={submitGenerateMusic}>

            <div className="mb-2 grid grid-cols-4 gap-2 items-center">
              <div className="col-span-3">
                <label className={`text-xs ${text2Color} block mb-1`} htmlFor="musicProvider">
                  Provider:
                </label>
                <SingleSelect
                  name="musicProvider"
                  options={MUSIC_PROVIDERS.map(provider => ({
                    value: provider.key,
                    label: provider.name
                  }))}
                  value={{
                    value: selectedMusicProvider.key,
                    label: selectedMusicProvider.name
                  }}
                  onChange={handleMusicProviderChange}
                />
              </div>
              <div className="col-span-1 relative">
                <label className={`text-xs ${text2Color} block mb-1`} htmlFor="musicDuration">
                  Seconds
                </label>
                <input
                  type="number"
                  name="musicDuration"
                  min="1"
                  max="120"
                  value={musicDuration}
                  onChange={(e) => setMusicDuration(e.target.value)}
                  className={`w-full ${bgColor} ${text2Color} p-1`}
                />
              </div>
            </div>


            <TextareaAutosize
              name="promptText"
              placeholder="Add prompt text here"
              className={`w-full h-20 ${bgColor} ${text2Color} p-1`}
              minRows={3}
            />
            <div className="flex flex-row mt-2">
              <div className="basis-1/3 flex items-center">
                <input
                  type="checkbox"
                  name="isInstrumental"
                  checked={isInstrumental}
                  onChange={(e) => setIsInstrumental(e.target.checked)}
                  disabled={selectedMusicProvider.key === 'AUDIOCRAFT'}
                />
                <div className={`inline-flex text-xs ${text2Color} ml-1`}>Instr</div>
              </div>
              <div className="basis-2/3 flex justify-end">
                <SecondaryButton type="submit" isPending={audioGenerationPending}>
                  Generate
                </SecondaryButton>
              </div>
            </div>
          </form>
        </div>
      );
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_SPEECH_GENERATE_DISPLAY) {
      audioSubOptionsDisplay = (
        <div>
          <MovieSpeechProviderSelect
            movieSoundList={movieSoundList}
            movieGenSpeakers={movieGenSpeakers}
            updateMovieGenSpeakers={updateMovieGenSpeakers}
            submitGenerateSpeech={submitGenerateSpeech}
            ttsProvider={ttsProvider}
            handleTtsProviderChange={handleTtsProviderChange}
            speakerType={speakerType}
            handleSpeakerChange={handleSpeakerChange}
            playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
            currentlyPlayingSpeaker={currentlyPlayingSpeaker}
            audioGenerationPending={audioGenerationPending}
            bgColor={bgColor}
            text2Color={text2Color}
            showAdvancedOptions={false}
            setShowAdvancedOptions={() => { }}
            colorMode={colorMode}
          />
        </div>
      );
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SOUND_DISPLAY) {
      if (audioLayers.length > 0) {
        const latestAudioLayer = audioLayers[audioLayers.length - 1];
        if (latestAudioLayer) {
          audioOptionsDisplay = (
            <SoundSelectToolbar
              audioLayer={latestAudioLayer}
              submitAddTrackToProject={submitAddTrackToProject}
              setCurrentCanvasAction={setCurrentCanvasAction}
            />
          );
        }
      }
      audioSubOptionsDisplay = <span />;
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_MUSIC_DISPLAY) {
      if (audioLayers.length > 0) {
        const latestAudioLayer = audioLayers[audioLayers.length - 1];
        audioOptionsDisplay = (
          <MusicSelectToolbar
            audioLayer={latestAudioLayer}
            submitAddTrackToProject={submitAddTrackToProject}
            setCurrentCanvasAction={setCurrentCanvasAction}
          />
        );
      }
      audioSubOptionsDisplay = <span />;
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SPEECH_DISPLAY) {
      if (audioLayers.length > 0) {
        const latestAudioLayer = audioLayers[audioLayers.length - 1];
        if (latestAudioLayer) {
          audioOptionsDisplay = (
            <SpeechSelectToolbar
              audioLayer={latestAudioLayer}
              submitAddTrackToProject={submitAddTrackToProject}
              setCurrentCanvasAction={setCurrentCanvasAction}
              currentLayer={currentLayer}
            />
          );
        }
      }
      audioSubOptionsDisplay = <span />;
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PREVIEW_SPEECH_LAYERED_DISPLAY) {
      if (audioLayers && audioLayers.length > 0) {
        const lastNSpeechAudioLayers = audioLayers.slice(-numberOfSpeechLayersRequested);
        audioOptionsDisplay = (
          <LayerSpeechPreview
            audioLayers={lastNSpeechAudioLayers}
            onAddAll={handleAddAllSpeechLayers}
            onBack={handleBackFromPreview}
            submitAddTrackToProject={submitAddTrackToProject}
            colorMode={colorMode}
          />
        );
        audioSubOptionsDisplay = <span />;
      }
    }

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_SOUND_GENERATE_DISPLAY) {
      audioSubOptionsDisplay = (
        <div className="transition-all duration-300 ease-in-out">
          <form name="audioGenerateForm" className="w-full" onSubmit={submitGenerateSound}>
            <div className="mb-2">
              <label className={`text-xs ${text2Color}`} htmlFor="secondsTotal">
                Duration (seconds):
              </label>
              <input
                type="number"
                name="secondsTotal"
                min="2"
                max="40"
                defaultValue="5"
                className={`w-full ${bgColor} ${text2Color} p-1`}
              />
            </div>
            <TextareaAutosize
              name="promptText"
              placeholder="Add prompt text here"
              className={`w-full h-20 ${bgColor} ${text2Color} p-1`}
              minRows={3}
            />
            <div className="flex flex-row">
              <div className="basis-full m-auto">
                <SecondaryButton type="submit" isPending={audioGenerationPending}>
                  Generate
                </SecondaryButton>
              </div>
            </div>
          </form>
        </div>
      );
    }
  }

  let actionsOptionsDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY) {
    let actionsSubOptionsDisplay = <span />;
    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY) {
      actionsSubOptionsDisplay = (
        <div className="mt-2 rounded shadow-lg">
          <label className="block mb-2">Width:</label>
          <input
            type="range"
            min="1"
            max="50"
            className="w-full"
            value={pencilWidth}
            onChange={(e) => setPencilWidth(e.target.value)}
          />
          <label className="block mt-2 mb-2">Color:</label>
          <input
            type="color"
            value={pencilColor}
            onChange={(e) => setPencilColor(e.target.value)}
          />
        </div>
      );
    } else if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY) {
      actionsSubOptionsDisplay = (
        <div className="mt-2 rounded shadow-lg">
          <label className="block mb-2">Width:</label>
          <input
            type="range"
            min="1"
            max="100"
            className="w-full"
            value={eraserWidth}
            onChange={(e) => setEraserWidth(e.target.value)}
          />
        </div>
      );
    }
    actionsOptionsDisplay = (
      <div>
        <div className={`grid grid-cols-3 ${text2Color} h-auto`}>
          <div
            className={`text-center m-auto align-center p-1 h-[50px] rounded-sm ${pencilOptionsVisible ? 'bg-gray-800' : bgColor
              } transition-colors duration-300`}
          >
            <div onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_PENCIL_DISPLAY)}>
              <FaPencilAlt className="text-2xl m-auto cursor-pointer" />
              <div className="text-[10px] tracking-tight m-auto text-center">Pencil</div>
            </div>
          </div>

          <div
            className={`text-center m-auto align-center p-1 h-[50px] rounded-sm ${eraserOptionsVisible ? 'bg-gray-800' : bgColor
              } transition-colors duration-300`}
          >
            <div onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_ERASER_DISPLAY)}>
              <FaEraser className="text-2xl m-auto cursor-pointer" />
              <div className="text-[10px] tracking-tight m-auto text-center">Eraser</div>
            </div>
          </div>

          <div
            className={`text-center m-auto align-center p-1 h-[50px] rounded-sm ${cursorSelectOptionVisible ? 'bg-gray-800' : bgColor
              } transition-colors duration-300`}
          >
            <div onClick={() => combineCurrentLayerItems()}>
              <LuCombine className="text-2xl m-auto cursor-pointer" />
              <div className="text-[10px] tracking-tight m-auto text-center">Combine</div>
            </div>
          </div>
        </div>
        {actionsSubOptionsDisplay}
      </div>
    );
  }

  let selectOptionsDisplay = <span />;
  let selectSubObjectionsDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY) {
    selectOptionsDisplay = (
      <div className={`grid grid-cols-3 ${text2Color} h-auto`}>
        <div
          className={`text-center m-auto align-center p-1 h-[50px] rounded-sm ${cursorSelectOptionVisible ? 'bg-gray-800' : bgColor
            } transition-colors duration-300`}
          onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_SELECT_LAYER_DISPLAY)}
        >
          <FaCrosshairs className="text-2xl m-auto cursor-pointer" />
          <div className="text-[10px] tracking-tight m-auto text-center">Select Layer</div>
        </div>
        <div
          className={`text-center m-auto align-center p-1 h-[50px] rounded-sm ${bgColor} transition-colors duration-300`}
          onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_SELECT_SHAPE_DISPLAY)}
        >
          <PiSelectionAll className="text-2xl m-auto cursor-pointer" />
          <div className="text-[10px] tracking-tight m-auto text-center">Select Shape</div>
        </div>
      </div>
    );

    if (currentCanvasAction === TOOLBAR_ACTION_VIEW.SHOW_SELECT_SHAPE_DISPLAY) {
      selectSubObjectionsDisplay = (
        <div>
          <div className={`grid grid-cols-2 w-full ${text2Color} h-auto transition-all duration-300`}>
            <div className="text-center m-auto align-center p-1 h-[50px] rounded-sm">
              <button onClick={() => setSelectedLayerSelectShape('rectangle')}>
                <div className="text-2xl m-auto cursor-pointer">
                  <MdOutlineRectangle />
                  <div className='text-xs'>Rectangle</div>
                </div>
              </button>
            </div>
            <div className="text-center m-auto align-center p-1 h-[50px] rounded-sm">
              <button onClick={() => setSelectedLayerSelectShape('circle')}>
                <div className="text-2xl m-auto cursor-pointer">
                  <FaRegCircle />
                  <div className='text-xs'>Circle</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  let defaultsOptionDisplay = <span />;
  if (currentViewDisplay === CURRENT_TOOLBAR_VIEW.SHOW_SET_DEFAULTS_DISPLAY) {
    defaultsOptionDisplay = (
      <VideoEditorDefaultsViewer
        submitUpdateSessionDefaults={submitUpdateSessionDefaults}
        defaultSceneDuration={sessionDetails.defaultSceneDuration}
        basicTextTheme={sessionDetails.basicTextTheme}
        parentJsonTheme={sessionDetails.parentJsonTheme}
        derivedJsonTheme={sessionDetails.derivedJsonTheme}
        setAdvancedSessionTheme={setAdvancedSessionTheme}
        isUpdateDefaultsPending={isUpdateDefaultsPending}
        isExpandedView={isExpandedView}
      />
    );
  }

  const showExpandedDefaultsDialog = () => {
    openAlertDialog(
      <div className="mt-4 mb-4">
        <div>
          <FaTimes
            className="absolute top-2 right-2 cursor-pointer"
            onClick={closeAlertDialog}
          />
        </div>
        <VideoEditorDefaultsViewer
          submitUpdateSessionDefaults={submitUpdateSessionDefaults}
          defaultSceneDuration={sessionDetails.defaultSceneDuration}
          basicTextTheme={sessionDetails.basicTextTheme}
          parentJsonTheme={sessionDetails.parentJsonTheme}
          derivedJsonTheme={sessionDetails.derivedJsonTheme}
          isUpdateDefaultsPending={isUpdateDefaultsPending}
          setAdvancedSessionTheme={setAdvancedSessionTheme}
        />
      </div>
    );
  };

  const showExpandedGenImageDialog = () => {
    if (currentDefaultPrompt && !showCreateNewPromptDisplay) {
      openAlertDialog(
        <div className="mt-4 mb-4">
          <FaTimes
            className="absolute top-2 right-2 cursor-pointer"
            onClick={closeAlertDialog}
          />
          <PromptViewer
            {...props}
            showCreateNewPrompt={showCreateNewPrompt}
            submitGenerateRecreateRequest={submitGenerateRecreateRequest}
          />
        </div>
      );
    } else {
      openAlertDialog(
        <div className="mt-4 mb-4">
          <FaTimes
            className="absolute top-2 right-2 cursor-pointer"
            onClick={closeAlertDialog}
          />
          <PromptGenerator {...props} />
        </div>
      );
    }
  };

  const showExpandedGenVideoDialog = () => {
    openAlertDialog(
      <div className="mt-4 mb-4">
        <FaTimes
          className="absolute top-2 right-2 cursor-pointer"
          onClick={closeAlertDialog}
        />
        <VideoPromptGenerator {...props} />
      </div>
    );
  };

  const showExpandedGenAudioDialog = () => {
    openAlertDialog(
      <div>
        <FaTimes
          className="absolute top-2 right-2 cursor-pointer"
          onClick={closeAlertDialog}
        />
        <div className={textInnerColor}>
          {audioOptionsDisplay}
        </div>
        <div>
          {audioSubOptionsDisplay}
        </div>
      </div>
    );
  };

  let collapseButton = <span />;
  if (showToggleCollapseToolbar) {
    collapseButton = (
      <div className={`${text2Color} flex ml-2 cursor-pointer`} onClick={onToggleDisplay}>
        <div className="inline-flex">Collapse</div>
        <FaChevronCircleRight className='inline-flex mt-1 ml-2' />
      </div>
    );
  }

  const bgPillSelected = colorMode === 'dark' ? 'bg-blue-950' : 'bg-blue-200';
  const bgPillUnselected = colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-200';
  const textPillSelected = colorMode === 'dark' ? 'text-white' : 'text-gray-900';
  const textPillUnselected = colorMode === 'dark' ? 'text-gray-100' : 'text-gray-600';

  const isItemSelected = (view) => currentViewDisplay === view;
  const getMarginTop = (view) => (isItemSelected(view) ? 'mt-0' : 'mt-4');
  const getSelectedClass = (view) =>
    isItemSelected(view) ? `${bgPillSelected} ${textPillSelected}` : `${bgPillUnselected} ${textPillUnselected}`

  const layerToolbarList = [
    {
      label: 'Defaults',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_SET_DEFAULTS_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_SET_DEFAULTS_DISPLAY),
      onExpandClick: showExpandedDefaultsDialog,
      content: <div className={textInnerColor}>{defaultsOptionDisplay}</div>
    },
    {
      label: 'Generate Image',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_DISPLAY),
      onExpandClick: showExpandedGenImageDialog,
      content: generateDisplay
    },
    {
      label: 'Edit Image',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_EDIT_DISPLAY),
      onExpandClick: null,
      content: editDisplay
    },
    {
      label: 'Generate Video',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_VIDEO_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_GENERATE_VIDEO_DISPLAY),
      onExpandClick: showExpandedGenVideoDialog,
      content: generateVideoDisplay
    },
    {
      label: 'Generate Audio',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_AUDIO_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_AUDIO_DISPLAY),
      onExpandClick: showExpandedGenAudioDialog,
      showOverflow: true,
      content: (
        <div className={textInnerColor}>
          {audioOptionsDisplay}
          {audioSubOptionsDisplay}
        </div>
      )
    },
    {
      label: 'Actions',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_ACTIONS_DISPLAY),
      onExpandClick: null,
      content: actionsOptionsDisplay
    },
    {
      label: 'Select',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_SELECT_DISPLAY),
      onExpandClick: null,
      content: (
        <div className={textInnerColor}>
          {selectOptionsDisplay}
          {selectSubObjectionsDisplay}
        </div>
      ),
      showOverflow: true,
    },
    {
      label: 'Animate',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_ANIMATE_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_ANIMATE_DISPLAY),
      onExpandClick: null,
      content: animateOptionsDisplay,
      showOverflow: true,
    },
    {
      label: 'Upload/Library',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_UPLOAD_DISPLAY),
      onExpandClick: null,
      content: uploadDisplay
    },
    {
      label: 'Text',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_ADD_TEXT_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_ADD_TEXT_DISPLAY),
      onExpandClick: null,
      content: addTextDisplay
    },
    {
      label: 'Shape',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_ADD_SHAPE_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_ADD_SHAPE_DISPLAY),
      onExpandClick: null,
      content: addShapeDisplay
    },
    {
      label: 'Layers',
      icon: null,
      view: CURRENT_TOOLBAR_VIEW.SHOW_LAYERS_DISPLAY,
      onClick: () => toggleCurrentViewDisplay(CURRENT_TOOLBAR_VIEW.SHOW_LAYERS_DISPLAY),
      onExpandClick: null,
      content: layersDisplay
    }
  ];

  const showEditorExpandedView = () => {
    if (isExpandedView) {
      setContainerWidth('w-[16%]');
    } else {
      setContainerWidth('w-[48%]');
    }
    setIsExpandedView(!isExpandedView);
  };

  let expandButtonLabel = (
    <div className='relative w-full cursor-pointer pb-1 block'>
      <FaChevronLeft className='inline-block ml-1 mr-1 text-xs font-bold mt-[-2px]' />
      <div className='inline-block'>Expand</div>
    </div>
  );

  if (isExpandedView) {
    expandButtonLabel = (
      <div className='relative w-full cursor-pointer pb-1 block'>
        <FaChevronRight className='inline-block ml-1 mr-1 text-xs font-bold mt-[-2px]' />
        <div className='inline-block'>Collapse</div>
      </div>
    );
  }

  let collapseButtonColor = `bg-neutral-900`;
  if (colorMode === 'light') {
    collapseButtonColor = `bg-neutral-50`;
  }
  return (
    <div
      className={`border-l-2 ${bgColor} h-full m-auto fixed top-0 overflow-y-auto pl-2 r-4 ${containerWidth} pr-2 right-0 toolbar-container`}
    >
      <div>
        <div className="sticky top-[50px] bg-neutral-900 z-10 p-2">
          {collapseButton}
          <div onClick={showEditorExpandedView} className='m-auto text-white text-center'>
            {expandButtonLabel}
          </div>
        </div>

        <div className='mt-[56px]'>
          {layerToolbarList.map((item, index) => (
            <div key={index} className={`${getMarginTop(item.view)} transition-all duration-300`}>
              <div
                className={`${buttonBgcolor} rounded-sm text-left ${isItemSelected(item.view) ? 'mt-1' : 'mt-4'
                  } transition-colors duration-300`}
              >
                <div
                  className={`pt-1 pb-1 pl-2 pr-2 text-lg font-bold m-auto cursor-pointer flex justify-between items-center ${getSelectedClass(
                    item.view
                  )} rounded transition-colors duration-300`}
                  onClick={item.onClick}
                >
                  {item.icon && (
                    <div
                      className="inline-flex ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onExpandClick && item.onExpandClick();
                      }}
                    >
                      {item.icon}
                    </div>
                  )}
                  <div className="flex-grow text-center">{item.label}</div>
                  <FaChevronDown className="inline-flex mr-4 text-sm" />
                </div>
                <div
                  className={`${index === layerToolbarList.length - 1 ? 'mb-32' : 'mb-1'
                    } pt-1 pl-2 pr-2 ${item.showOverflow ? 'overflow-visible' : 'overflow-hidden'
                    } transition-all duration-500 ${isItemSelected(item.view) ? 'h-auto opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  {item.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
