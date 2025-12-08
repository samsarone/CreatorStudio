import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import SingleSelect from '../../../common/SingleSelect.jsx';
import CommonButton from '../../../common/CommonButton.tsx';
import AddSpeaker from './AddSpeaker';

export default function MovieSpeechProviderSelect(props) {
  const {
    movieSoundList,
    movieGenSpeakers,
    updateMovieGenSpeakers,
    submitGenerateSpeech,
    advancedAudioSpeechOptionsDisplay,
    speakerType,
    handleSpeakerChange,
    audioGenerationPending,
    bgColor,
    text2Color,
    colorMode,
    playMusicPreviewForSpeaker,
  } = props;

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);

  // Local copy of speakers to handle additions
  const [localSpeakers, setLocalSpeakers] = useState(movieGenSpeakers);

  // Toggle "Add Speaker" form
  const handleAddSpeakerClick = () => {
    setShowAddSpeakerForm(!showAddSpeakerForm);
  };

  // Called when user finishes AddSpeaker form successfully
  const handleSaveNewSpeaker = (newSpeaker) => {
    const updated = [...localSpeakers, newSpeaker];
    updateMovieGenSpeakers(updated);
    setLocalSpeakers(updated);
    setShowAddSpeakerForm(false);
  };

  // Build SingleSelect options from localSpeakers
  const speakerOptions = localSpeakers.map((item) => ({
    value: item.speaker,       // e.g., "emma"
    label: item.actor,         // e.g., "Emma (English)"
    provider: item.provider,   // e.g., "OPENAI"
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
      
      return;
    }

    // Base payload
    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speakerValue,
      addSubtitles: true,
      ttsProvider: speakerData.provider, // The TTS provider (OpenAI, etc.)
      subtitleOption: 'SUBTITLE_WORD_HIGHLIGHT',
      speakerCharacterName: speakerData.speakerCharacterName,
    };

    // If the chosen speaker is OpenAI, gather the advanced text fields
    if (speakerData.provider === 'OPENAI') {
      const identity = formData.get('identity') || '';
      const affect = formData.get('affect') || '';
      const tone = formData.get('tone') || '';
      const emotion = formData.get('emotion') || '';
      const pronunciation = formData.get('pronunciation') || '';
      const pause = formData.get('pause') || '';

      // Attach them to the body as a JSON object
      body.generationMeta = {
        identity,
        affect,
        tone,
        emotion,
        pronunciation,
        pause,
      };
    }

    submitGenerateSpeech(body);
  };

  // Identify if the speaker's provider is OpenAI
  const isOpenAI = speakerType?.provider === 'OPENAI';

  const noSpeakersYet = localSpeakers.length === 0;



  return (
    <div className="w-full">
      {/* Header row with Add Speaker button */}
      <div className="flex justify-between items-center mb-2">
        <label className={`text-sm font-bold ${text2Color}`}>Speakers</label>
        <button
          type="button"
          onClick={handleAddSpeakerClick}
          className="px-2 py-1 bg-neutral-700 text-white text-xs rounded hover:bg-neutral-600"
        >
          {showAddSpeakerForm ? 'Close' : 'Add Speaker'}
        </button>
      </div>

      {showAddSpeakerForm ? (
        <AddSpeaker
          onAddNewSpeaker={handleSaveNewSpeaker}
          onCancel={() => setShowAddSpeakerForm(false)}
          existingSpeakers={localSpeakers.map((s) => s.speaker)}
          playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
          bgColor={bgColor}
          text2Color={text2Color}
          colorMode={colorMode}
        />
      ) : noSpeakersYet ? (
        // If no speakers are defined yet, simply show a message
        <div className={`text-sm italic ${text2Color}`}>
          Add a speaker
        </div>
      ) : (
        // Otherwise, show the actual speech generation form
        <form
          name="audioGenerateForm"
          className="w-full"
          onSubmit={createSubmitGenerateSpeechRequest}
        >
          {/* Show "Advanced" only if provider = OpenAI */}
          {isOpenAI && (
            <div className="text-xs block w-full text-right mb-1">
              <div
                className={`cursor-pointer inline-flex items-center hover:opacity-80 ${text2Color}`}
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <span>Advanced</span>
                <FaChevronDown className="ml-1" />
              </div>
            </div>
          )}

          {/* Optional existing advanced display */}
          {showAdvancedOptions && advancedAudioSpeechOptionsDisplay}

          {isOpenAI && showAdvancedOptions && (
            <div className="mb-2 border border-gray-500 p-2 rounded">
              <div className="text-sm font-bold mb-2">OpenAI Advanced Options</div>

              {/* Identity */}
              <div className="mb-2">
                <label
                  className={`block text-xs ${text2Color}`}
                  htmlFor="identity"
                >
                  Identity
                </label>
                <input
                  type="text"
                  name="identity"
                  id="identity"
                  placeholder="E.g. old wizard, helpful assistant..."
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>

              {/* Affect */}
              <div className="mb-2">
                <label className={`block text-xs ${text2Color}`} htmlFor="affect">
                  Affect
                </label>
                <input
                  type="text"
                  name="affect"
                  id="affect"
                  placeholder="Overall mood or style (e.g. excited, calm...)"
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>

              {/* Tone */}
              <div className="mb-2">
                <label className={`block text-xs ${text2Color}`} htmlFor="tone">
                  Tone
                </label>
                <input
                  type="text"
                  name="tone"
                  id="tone"
                  placeholder="E.g. formal, casual, sarcastic..."
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>

              {/* Emotion */}
              <div className="mb-2">
                <label className={`block text-xs ${text2Color}`} htmlFor="emotion">
                  Emotion
                </label>
                <input
                  type="text"
                  name="emotion"
                  id="emotion"
                  placeholder="E.g. happy, sad, angry..."
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>

              {/* Pronunciation */}
              <div className="mb-2">
                <label
                  className={`block text-xs ${text2Color}`}
                  htmlFor="pronunciation"
                >
                  Pronunciation
                </label>
                <input
                  type="text"
                  name="pronunciation"
                  id="pronunciation"
                  placeholder="Custom pronunciation tips (optional)"
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>

              {/* Pause */}
              <div className="mb-2">
                <label className={`block text-xs ${text2Color}`} htmlFor="pause">
                  Pause
                </label>
                <input
                  type="text"
                  name="pause"
                  id="pause"
                  placeholder="Short pause, long pause..."
                  className={`w-full p-1 rounded border-2 border-gray-500 ${bgColor} ${text2Color}`}
                />
              </div>
            </div>
          )}

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
            className={`w-full h-20 ${bgColor} ${text2Color} p-1 rounded border-2 border-gray-500`}
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
