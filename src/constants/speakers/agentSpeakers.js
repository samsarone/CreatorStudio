import { OPENAI_SPEAKER_TYPES } from "../Types.ts";
import { ELEVENLABS_TTS } from "../ElevenLabs.jsx";

const OPENAI_PROVIDER = "OPENAI";
const ELEVENLABS_PROVIDER = "ELEVENLABS";

function normalizeSpeakerGender(rawGender = "") {
  if (typeof rawGender !== "string") {
    return { code: null, label: "Unspecified" };
  }

  const normalized = rawGender.trim().toLowerCase();
  if (!normalized) {
    return { code: null, label: "Unspecified" };
  }

  if (normalized === "m" || normalized === "male" || normalized === "man") {
    return { code: "M", label: "Male" };
  }

  if (normalized === "f" || normalized === "female" || normalized === "woman") {
    return { code: "F", label: "Female" };
  }

  return {
    code: null,
    label: normalized.replace(/\b\w/g, (char) => char.toUpperCase()),
  };
}

function normalizeSpeakerRecord(speaker = {}, provider) {
  const gender = normalizeSpeakerGender(speaker.Gender || speaker.gender);

  return {
    ...speaker,
    provider,
    value: typeof speaker.value === "string" ? speaker.value.trim() : speaker.value,
    label: typeof speaker.label === "string" ? speaker.label.trim() : speaker.label,
    previewURL: typeof speaker.previewURL === "string" ? speaker.previewURL.trim() : speaker.previewURL,
    genderCode: gender.code,
    genderLabel: gender.label,
  };
}

export const OPENAI_AGENT_SPEAKERS = OPENAI_SPEAKER_TYPES.map((speaker) =>
  normalizeSpeakerRecord(speaker, OPENAI_PROVIDER)
);

export const ELEVENLABS_AGENT_SPEAKERS = ELEVENLABS_TTS.map((speaker) =>
  normalizeSpeakerRecord(speaker, ELEVENLABS_PROVIDER)
);

export const AGENT_SPEAKER_GROUPS = [
  {
    key: OPENAI_PROVIDER,
    label: "OpenAI TTS",
    allowKey: "allowOpenAI",
    selectionKey: "openAISpeakers",
    speakers: OPENAI_AGENT_SPEAKERS,
  },
  {
    key: ELEVENLABS_PROVIDER,
    label: "ElevenLabs TTS",
    allowKey: "allowElevenLabs",
    selectionKey: "elevenLabsSpeakers",
    speakers: ELEVENLABS_AGENT_SPEAKERS,
  },
];

export const EMPTY_SPEAKER_OPTIONS = {
  allowOpenAI: false,
  allowElevenLabs: false,
  openAISpeakers: [],
  elevenLabsSpeakers: [],
};

function normalizeSelectionList(speakers = [], allowedValues = []) {
  if (!Array.isArray(speakers) || speakers.length === 0) {
    return [];
  }

  const allowed = new Set(allowedValues);
  const seen = new Set();
  const normalized = [];

  speakers.forEach((speakerValue) => {
    if (typeof speakerValue !== "string") {
      return;
    }

    const trimmed = speakerValue.trim();
    if (!trimmed || seen.has(trimmed) || !allowed.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
}

export function normalizeSpeakerOptionsState(speakerOptions = null) {
  const openAIAllowedValues = OPENAI_AGENT_SPEAKERS.map((speaker) => speaker.value);
  const elevenLabsAllowedValues = ELEVENLABS_AGENT_SPEAKERS.map((speaker) => speaker.value);

  return {
    allowOpenAI: speakerOptions?.allowOpenAI === true,
    allowElevenLabs: speakerOptions?.allowElevenLabs === true,
    openAISpeakers: normalizeSelectionList(speakerOptions?.openAISpeakers, openAIAllowedValues),
    elevenLabsSpeakers: normalizeSelectionList(
      speakerOptions?.elevenLabsSpeakers,
      elevenLabsAllowedValues
    ),
  };
}

export function buildSpeakerOptionsPayload(speakerOptions = null) {
  const normalized = normalizeSpeakerOptionsState(speakerOptions);
  const hasSelections =
    normalized.allowOpenAI ||
    normalized.allowElevenLabs ||
    normalized.openAISpeakers.length > 0 ||
    normalized.elevenLabsSpeakers.length > 0;

  return hasSelections ? normalized : null;
}
