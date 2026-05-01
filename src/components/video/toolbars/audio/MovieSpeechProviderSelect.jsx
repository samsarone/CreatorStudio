import React, { useEffect, useMemo, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import SingleSelect from '../../../common/SingleSelect.jsx';
import CommonButton from '../../../common/CommonButton.tsx';
import AddSpeaker from './AddSpeaker';
import { TTS_COMBINED_SPEAKER_TYPES } from '../../../../constants/Types.ts';

function normalizeProvider(provider, speakerValue = '') {
  const rawProvider =
    typeof provider === 'string'
      ? provider
      : typeof provider?.value === 'string'
        ? provider.value
        : '';
  const normalizedProvider = rawProvider.trim().toUpperCase();

  if (normalizedProvider === 'OPENAI' || normalizedProvider === 'ELEVENLABS') {
    return normalizedProvider;
  }

  const matchedSpeaker = TTS_COMBINED_SPEAKER_TYPES.find((speaker) => speaker.value === speakerValue);
  return matchedSpeaker?.provider || 'OPENAI';
}

function normalizeMovieGenSpeaker(speaker = {}) {
  const speakerValue = typeof speaker?.speaker === 'string' ? speaker.speaker.trim() : '';
  const actor =
    typeof speaker?.actor === 'string' && speaker.actor.trim()
      ? speaker.actor.trim()
      : typeof speaker?.speakerCharacterName === 'string' && speaker.speakerCharacterName.trim()
        ? speaker.speakerCharacterName.trim()
        : speakerValue;

  return {
    ...speaker,
    speaker: speakerValue,
    actor,
    speakerCharacterName:
      typeof speaker?.speakerCharacterName === 'string' && speaker.speakerCharacterName.trim()
        ? speaker.speakerCharacterName.trim()
        : actor,
    provider: normalizeProvider(speaker?.provider, speakerValue),
  };
}

function normalizeMovieGenSpeakers(speakers = []) {
  return Array.isArray(speakers) ? speakers.map(normalizeMovieGenSpeaker) : [];
}

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
    currentlyPlayingSpeaker,
    sizeVariant = "default",
  } = props;
  const isSidebarPanel =
    sizeVariant === "sidebarCollapsed" || sizeVariant === "sidebarExpanded";
  const isSidebarCollapsed = sizeVariant === "sidebarCollapsed";
  const headerRowClass = isSidebarPanel
    ? "mb-3 flex flex-col gap-2"
    : "mb-3 flex items-center justify-between gap-3";
  const addSpeakerButtonClass = isSidebarPanel
    ? "!m-0 !min-h-[38px] !w-full !px-4 !py-2 text-xs"
    : "!m-0 !min-h-[38px] !px-4 !py-2 text-xs";
  const submitContainerClass = isSidebarPanel
    ? "mt-3"
    : "flex justify-center mt-3";

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);

  // Local copy of speakers to handle additions
  const [localSpeakers, setLocalSpeakers] = useState(() =>
    normalizeMovieGenSpeakers(movieGenSpeakers)
  );

  useEffect(() => {
    setLocalSpeakers(normalizeMovieGenSpeakers(movieGenSpeakers));
  }, [movieGenSpeakers]);

  // Toggle "Add Speaker" form
  const handleAddSpeakerClick = () => {
    setShowAddSpeakerForm(!showAddSpeakerForm);
  };

  // Called when user finishes AddSpeaker form successfully
  const handleSaveNewSpeaker = (newSpeaker) => {
    const normalizedNewSpeaker = normalizeMovieGenSpeaker(newSpeaker);
    const updated = [...localSpeakers, normalizedNewSpeaker];
    updateMovieGenSpeakers(updated);
    setLocalSpeakers(updated);
    handleSpeakerChange({
      value: normalizedNewSpeaker.speaker,
      label: normalizedNewSpeaker.actor,
      provider: normalizedNewSpeaker.provider,
      speaker: normalizedNewSpeaker.speaker,
      actor: normalizedNewSpeaker.actor,
      speakerCharacterName: normalizedNewSpeaker.speakerCharacterName,
    });
    setShowAddSpeakerForm(false);
  };

  // Build SingleSelect options from localSpeakers
  const speakerOptions = localSpeakers.map((item, index) => {
    const optionKey = `${item.provider}:${item.speaker}:${item.speakerCharacterName || item.actor}:${index}`;
    return {
      value: optionKey,
      label: item.actor,
      provider: item.provider,
      speaker: item.speaker,
      actor: item.actor,
      speakerCharacterName: item.speakerCharacterName,
    };
  });
  const selectedSpeakerOption = useMemo(() => {
    if (!speakerType) {
      return null;
    }

    const speakerValue = speakerType.speaker || speakerType.value;
    const providerValue = normalizeProvider(speakerType.provider, speakerValue);
    const speakerName = speakerType.speakerCharacterName || speakerType.label || speakerType.actor;

    return (
      speakerOptions.find((option) => (
        option.speaker === speakerValue
        && option.provider === providerValue
        && (!speakerName || option.speakerCharacterName === speakerName || option.actor === speakerName)
      ))
      || speakerOptions.find((option) => option.speaker === speakerValue && option.provider === providerValue)
      || null
    );
  }, [speakerOptions, speakerType]);

  // Submit handle
  const createSubmitGenerateSpeechRequest = (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target);
    const promptText = formData.get('promptText');
    const speakerValue = speakerType?.speaker || speakerType?.value;
    const providerValue = normalizeProvider(speakerType?.provider, speakerValue);
    const speakerName = speakerType?.speakerCharacterName || speakerType?.label || speakerType?.actor;

    // Find matching speaker object
    const speakerData =
      localSpeakers.find((item) => (
        item.speaker === speakerValue
        && item.provider === providerValue
        && (!speakerName || item.speakerCharacterName === speakerName || item.actor === speakerName)
      ))
      || localSpeakers.find((item) => item.speaker === speakerValue && item.provider === providerValue);
    if (!speakerData) {
      
      return;
    }

    // Base payload
    const body = {
      prompt: promptText,
      generationType: 'speech',
      speaker: speakerValue,
      addSubtitles: true,
      ttsProvider: speakerData.provider,
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
  const isOpenAI =
    Boolean(speakerType) &&
    normalizeProvider(speakerType?.provider, speakerType?.speaker || speakerType?.value) === 'OPENAI';

  const noSpeakersYet = localSpeakers.length === 0;



  return (
    <div className="w-full">
      {/* Header row with Add Speaker button */}
      <div className={headerRowClass}>
        <label className={`text-sm font-bold ${text2Color}`}>Speakers</label>
        <CommonButton
          type="button"
          onClick={handleAddSpeakerClick}
          extraClasses={addSpeakerButtonClass}
        >
          {showAddSpeakerForm ? 'Back' : 'Add Speaker'}
        </CommonButton>
      </div>

      {showAddSpeakerForm ? (
        <AddSpeaker
          onAddNewSpeaker={handleSaveNewSpeaker}
          onCancel={() => setShowAddSpeakerForm(false)}
          existingSpeakers={localSpeakers.map((s) => s.speakerCharacterName || s.actor || s.speaker)}
          playMusicPreviewForSpeaker={playMusicPreviewForSpeaker}
          currentlyPlayingSpeaker={currentlyPlayingSpeaker}
          bgColor={bgColor}
          text2Color={text2Color}
          colorMode={colorMode}
          sizeVariant={sizeVariant}
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
                selectedSpeakerOption
              }
              onChange={handleSpeakerChange}
              compactLayout={!isSidebarCollapsed && isSidebarPanel}
              truncateLabels={isSidebarCollapsed}
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
          <div className={submitContainerClass}>
            <CommonButton
              type="submit"
              isPending={audioGenerationPending}
              extraClasses={isSidebarPanel ? 'w-full whitespace-normal text-center leading-tight' : ''}
            >
              Generate
            </CommonButton>
          </div>
        </form>
      )}
    </div>
  );
}
