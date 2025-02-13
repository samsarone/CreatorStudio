import React from 'react';


import { FaChevronDown, FaRobot, FaPlay, FaPause, FaChevronLeft, FaChevronRight, 
  FaChevronCircleRight, FaChevronCircleDown, FaExpandArrowsAlt, FaTimes } from 'react-icons/fa';

import CommonButton from '../../../common/CommonButton.tsx';

import SpeechProviderSelect from './SpeechProviderSelect.js';
import LayerSpeechPreview from './LayerSpeechPreview.js';
import MovieSpeechProviderSelect from './MovieSpeechProviderSelect.js';



import TextareaAutosize from 'react-textarea-autosize';



export default function DefaultSpeechProviderSelect(props) {

  const {
    submitGenerateSpeech,
    ttsProvider,
    handleTtsProviderChange,
    speakerType,
    handleSpeakerChange,
    playMusicPreviewForSpeaker,
    currentlyPlayingSpeaker,
    audioGenerationPending,
    bgColor,
    text2Color,
    advancedAudioSpeechOptionsDisplay,
    showAdvancedOptions,
    setShowAdvancedOptions,
    colorMode,
    speechOption,
    subtitleOption,
    addSubtitles

    
  } = props;

  const createSubmitGenerateSpeechRequest = (evt) => {

    evt.preventDefault();
    

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speaker = speakerType.value;
    const textAnimationOptions = formData.get('textAnimationOptions');
    const ttsProviderValue = speakerType.provider;
    const speechOptionValue = speechOption.value;
    const subtitleOptionValue = subtitleOption.value;

    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speaker,
      textAnimationOptions: textAnimationOptions,
      addSubtitles: addSubtitles,
      ttsProvider: ttsProviderValue,
      subtitleOption: subtitleOptionValue,
      speechOptionValue: speechOptionValue,
    };


    submitGenerateSpeech(body);
  }

  return (
    <div>
      <form name="audioGenerateForm" className="w-full" onSubmit={createSubmitGenerateSpeechRequest}>
        <div>
          <div className='text-xs block text-white w-full text-right'>
            <div className='cursor-pointer hover:text-neutral-200 mb-1' onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}>
              Advanced  <FaChevronDown className='inline-flex' />
            </div>
          </div>
        </div>
        <div>
          {advancedAudioSpeechOptionsDisplay}
        </div>
        <div className="basis-full mb-1">
          <SpeechProviderSelect
            ttsProvider={ttsProvider}
            onTtsProviderChange={handleTtsProviderChange}
            speakerType={speakerType}
            onSpeakerChange={handleSpeakerChange}
            playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
            currentlyPlayingSpeaker={currentlyPlayingSpeaker}
            colorMode={colorMode}
          />
        </div>
        <TextareaAutosize
          name="promptText"
          placeholder="Enter speech prompt text here"
          className={`w-full h-20 ${bgColor} ${text2Color} p-1`}
          minRows={3}
        />
        <div className="flex flex-col">
          <div className="basis-full m-auto mt-1">
            <div>
              <CommonButton type="submit" isPending={audioGenerationPending}>
                Generate
              </CommonButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}