import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import SingleSelect from '../../../common/SingleSelect.jsx';
import CommonButton from '../../../common/CommonButton.tsx';
import AddSpeaker from './AddSpeaker';
import SpeechProviderSelect from './SpeechProviderSelect.jsx'; // If you need it

export default function MovieSpeechProviderSelect(props) {
  const {
    movieSoundList,
    movieGenSpeakers,
    updateMovieGenSpeakers,
    submitGenerateSpeech,
    advancedAudioSpeechOptionsDisplay,
    showAdvancedOptions,
    setShowAdvancedOptions,
    speakerType,
    handleSpeakerChange,
    audioGenerationPending,
    bgColor,
    text2Color,
    colorMode,
    playMusicPreviewForSpeaker,
  } = props;

  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);
  const [localSpeakers, setLocalSpeakers] = useState(movieGenSpeakers);

  // Toggle "Add Speaker" form
  const handleAddSpeakerClick = () => {
    setShowAddSpeakerForm(!showAddSpeakerForm);
  };

  // Called when user finishes AddSpeaker form successfully
  const handleSaveNewSpeaker = (newSpeaker) => {
    // Add the new speaker to our local array
    const updated = [...localSpeakers, newSpeaker];
    updateMovieGenSpeakers(updated);
    setLocalSpeakers(updated);

    // Hide the "Add Speaker" form again
    setShowAddSpeakerForm(false);
  };

  // Build SingleSelect options from localSpeakers
  const speakerOptions = localSpeakers.map((item) => ({
    value: item.speaker,
    label: item.actor,
    provider: item.provider,
  }));

  // Submit handle
  const createSubmitGenerateSpeechRequest = (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speakerValue = speakerType?.value;

    // Find matching speaker object
    const speakerData = localSpeakers.find((item) => item.speaker === speakerValue);
    if (!speakerData) {
      console.error("No matching speaker for value:", speakerValue);
      return;
    }

    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speakerValue,
      addSubtitles: true,
      ttsProvider: speakerData.provider,
      subtitleOption: 'SUBTITLE_WORD_HIGHLIGHT',
      speakerCharacterName: speakerData.speakerCharacterName,
    };


    submitGenerateSpeech(body);
  };

  return (
    <div className="w-full">

      {/* Header row with Add Speaker button */}
      <div className="flex justify-between items-center mb-2">
        <label className={`text-sm font-bold ${text2Color}`}>
          Speakers
        </label>
        <button
          type="button"
          onClick={handleAddSpeakerClick}
          className="px-2 py-1 bg-neutral-700 text-white text-xs rounded hover:bg-neutral-600"
        >
          {showAddSpeakerForm ? 'Close' : 'Add Speaker'}
        </button>
      </div>

      {/* 
        Conditionally show either:
          A) The "Add Speaker" form 
          or 
          B) The original speaker form 
      */}
      {showAddSpeakerForm ? (
        <AddSpeaker
          onAddNewSpeaker={handleSaveNewSpeaker}
          onCancel={() => setShowAddSpeakerForm(false)} // "Back" button
          existingSpeakers={localSpeakers.map((s) => s.speaker)}
          playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
          bgColor={bgColor}
          text2Color={text2Color}
          colorMode={colorMode}
        />
      ) : (
        <form
          name="audioGenerateForm"
          className="w-full"
          onSubmit={createSubmitGenerateSpeechRequest}
        >
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

          {showAdvancedOptions && advancedAudioSpeechOptionsDisplay}

          {/* Speaker dropdown */}
          <div className="mb-2">
            <SingleSelect
              name="movieSpeaker"
              placeholder="Select speaker..."
              options={speakerOptions}
              value={
                speakerType
                  ? { value: speakerType.value, label: speakerType.label }
                  : null
              }
              onChange={handleSpeakerChange}
            />
          </div>

          {/* Prompt textarea */}
          <TextareaAutosize
            name="promptText"
            placeholder="Enter speech prompt text here"
            className={`w-full h-20 ${bgColor} ${text2Color} p-1 rounded`}
            minRows={3}
          />

          {/* Submit */}
          <div className="flex justify-center mt-3">
            <CommonButton
              type="submit"
              isPending={audioGenerationPending}
            >
              Generate
            </CommonButton>
          </div>
        </form>
      )}
    </div>
  );
}
