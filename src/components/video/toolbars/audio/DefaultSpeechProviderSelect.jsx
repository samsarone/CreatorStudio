import React from 'react';

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
    colorMode,
    speechOption,
  } = props;


  const createSubmitGenerateSpeechRequest = (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speaker = speakerType?.value;
    const textAnimationOptions = formData.get('textAnimationOptions');
    const ttsProviderValue = speakerType?.provider;
    const speechOptionValue = speechOption?.value;

    // Create base payload
    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speaker,
      textAnimationOptions: textAnimationOptions,
      ttsProvider: ttsProviderValue,
      speechOptionValue: speechOptionValue,
      studioSpeechGeneration: true,
      audioBindingMode: 'unbounded',
      bindToLayer: false,
    };


    submitGenerateSpeech(body);
  };


  return (
    <div>
      <form
        name="audioGenerateForm"
        className="w-full"
        onSubmit={createSubmitGenerateSpeechRequest}
      >
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
