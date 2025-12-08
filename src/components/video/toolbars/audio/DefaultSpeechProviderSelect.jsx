import React from 'react';

import {
  FaChevronDown,
  FaRobot,
  FaPlay,
  FaPause,
  FaChevronLeft,
  FaChevronRight,
  FaChevronCircleRight,
  FaChevronCircleDown,
  FaExpandArrowsAlt,
  FaTimes,
} from 'react-icons/fa';

import CommonButton from '../../../common/CommonButton.tsx';

import SpeechProviderSelect from './SpeechProviderSelect.jsx';

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
    addSubtitles,
  } = props;


  const createSubmitGenerateSpeechRequest = (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speaker = speakerType?.value;
    const textAnimationOptions = formData.get('textAnimationOptions');
    const ttsProviderValue = speakerType?.provider;
    const speechOptionValue = speechOption?.value;
    const subtitleOptionValue = subtitleOption?.value;

    // Create base payload
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

    // If the ttsProvider is OpenAI, gather advanced fields from the form
    if (ttsProviderValue === 'OpenAI') {
      const identity = formData.get('identity');
      const affect = formData.get('affect');
      const tone = formData.get('tone');
      const emotion = formData.get('emotion');
      const pronunciation = formData.get('pronunciation');
      const pause = formData.get('pause');

      // Build generationMeta only if user has typed something (optional).
      // Here, we simply always attach it if the provider is OpenAI.
      const generationMeta = {
        identity,
        affect,
        tone,
        emotion,
        pronunciation,
        pause,
      };

      // Add to our main payload
      body.generationMeta = generationMeta;
    }


    submitGenerateSpeech(body);
  };


  return (
    <div>
      <form
        name="audioGenerateForm"
        className="w-full"
        onSubmit={createSubmitGenerateSpeechRequest}
      >
        {/* 
          Show the "Advanced" toggle only if ttsProvider is "OpenAI"
          If you want to show advanced settings for all providers, remove the condition
        */}
        {ttsProvider === 'OpenAI' && (
          <div className="text-xs block text-white w-full text-right">
            <div
              className="cursor-pointer hover:text-neutral-200 mb-1"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              Advanced <FaChevronDown className="inline-flex" />
            </div>
          </div>
        )}

        {/* 
          Existing advancedAudioSpeechOptionsDisplay rendering, if you still want to keep it 
          for all providers. If it's only for OpenAI, wrap in the same condition as well.
        */}
        <div>{advancedAudioSpeechOptionsDisplay}</div>

        {/* 
          Show additional text boxes ONLY if ttsProvider is "OpenAI" 
          and if advanced options are toggled on 
        */}
        {ttsProvider === 'OpenAI' && showAdvancedOptions && (
          <div className="mb-2 border border-gray-500 p-2 rounded">
            <div className="text-sm font-bold mb-2">OpenAI Advanced Options</div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="identity">
                Identity
              </label>
              <input
                type="text"
                name="identity"
                id="identity"
                className="w-full p-1 rounded text-black"
                placeholder="Character or persona (optional)"
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="affect">
                Affect
              </label>
              <input
                type="text"
                name="affect"
                id="affect"
                className="w-full p-1 rounded text-black"
                placeholder="Overall mood (optional)"
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="tone">
                Tone
              </label>
              <input
                type="text"
                name="tone"
                id="tone"
                className="w-full p-1 rounded text-black"
                placeholder="Tone of voice (optional)"
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="emotion">
                Emotion
              </label>
              <input
                type="text"
                name="emotion"
                id="emotion"
                className="w-full p-1 rounded text-black"
                placeholder="Emotion to express (optional)"
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="pronunciation">
                Pronunciation
              </label>
              <input
                type="text"
                name="pronunciation"
                id="pronunciation"
                className="w-full p-1 rounded text-black"
                placeholder="Custom pronunciation hints (optional)"
              />
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-300" htmlFor="pause">
                Pause
              </label>
              <input
                type="text"
                name="pause"
                id="pause"
                className="w-full p-1 rounded text-black"
                placeholder="Pause or break instructions (optional)"
              />
            </div>
          </div>
        )}

        {/* Speech provider UI */}
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

        {/* Prompt Text */}
        <TextareaAutosize
          name="promptText"
          placeholder="Enter speech prompt text here"
          className={`w-full h-20 ${bgColor} ${text2Color} p-1`}
          minRows={3}
        />

        {/* Submit Button */}
        <div className="flex flex-col">
          <div className="basis-full m-auto mt-1">
            <CommonButton type="submit" isPending={audioGenerationPending}>
              Generate
            </CommonButton>
          </div>
        </div>
      </form>
    </div>
  );
}
