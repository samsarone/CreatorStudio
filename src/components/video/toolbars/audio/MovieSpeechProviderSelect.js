import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import SingleSelect from '../../../common/SingleSelect.js';
import CommonButton from '../../../common/CommonButton.tsx';

export default function MovieSpeechProviderSelect(props) {
  const {
    /** main data */
    movieSoundList,
    movieGenSpeakers,

    /** speech generation submission */
    submitGenerateSpeech,

    /** advanced options handling */
    advancedAudioSpeechOptionsDisplay,
    showAdvancedOptions,
    setShowAdvancedOptions,

    /** speaker dropdown handling */
    speakerType,
    handleSpeakerChange,

    /** UI states */
    audioGenerationPending,
    bgColor,
    text2Color,
    colorMode,
  } = props;

  // Example handler for "Add Speaker" (replace with real logic if needed)
  const handleAddSpeaker = () => {
    alert('Add Speaker clicked!');
  };

  const createSubmitGenerateSpeechRequest = (evt) => {

    evt.preventDefault();
    
    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speaker = speakerType.value;

    const speakerData = movieGenSpeakers.find((item) => item.speaker === speaker);

    const provider = speakerData.provider;

    const ttsProviderValue = speakerType.provider;

    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speaker,
      addSubtitles: true,
      ttsProvider: provider,
      subtitleOption: 'SUBTITLE_WORD_HIGHLIGHT'
    };

    console.log(body);

    submitGenerateSpeech(body);

  }

  return (
    <div className="w-full">
      {/* Top Row: Label + Add Speaker button */}
      <div className="flex justify-between items-center mb-2">
        <label className={`text-sm font-bold ${text2Color}`}>
          Speakers
        </label>
        <button
          type="button"
          onClick={handleAddSpeaker}
          className="px-2 py-1 bg-neutral-700 text-white text-xs rounded hover:bg-neutral-600"
        >
          Add Speaker
        </button>
      </div>

      {/* Form that calls submitGenerateSpeech on submit */}
      <form name="audioGenerateForm" className="w-full" onSubmit={createSubmitGenerateSpeechRequest}>
        {/* Advanced toggle */}
        <div className="text-xs block w-full text-right mb-1">
          <div
            className="cursor-pointer inline-flex items-center hover:opacity-80"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <span>Advanced</span>
            <FaChevronDown className="ml-1" />
          </div>
        </div>

        {/* Conditionally show advanced options */}
        {showAdvancedOptions && advancedAudioSpeechOptionsDisplay}

        {/* SingleSelect for movie speakers */}
        <div className="mb-2">
          <SingleSelect
            name="movieSpeaker"
            placeholder="Select speaker..."
            options={movieGenSpeakers.map((item) => ({
              value: item.speaker,   // or item.speakerCharacterName
              label: item.actor      // or item.speakerCharacterName
            }))}
            // If you have a current speakerType, you can set the value here:
            value={
              speakerType
                ? { value: speakerType.value, label: speakerType.label }
                : null
            }
            onChange={handleSpeakerChange}
          />
        </div>

        {/* Text prompt input */}
        <TextareaAutosize
          name="promptText"
          placeholder="Enter speech prompt text here"
          className={`w-full h-20 ${bgColor} ${text2Color} p-1 rounded`}
          minRows={3}
        />

        {/* Submit button */}
        <div className="flex justify-center mt-3">
          <CommonButton
            type="submit"
            isPending={audioGenerationPending}
          >
            Generate
          </CommonButton>
        </div>
      </form>
    </div>
  );
}
