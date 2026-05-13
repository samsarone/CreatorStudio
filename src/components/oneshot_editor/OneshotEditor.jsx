
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import ace from 'ace-builds';
import AceEditor from 'react-ace';
import TextareaAutosize from 'react-textarea-autosize';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaChevronCircleDown,
  FaChevronDown,
  FaChevronRight,
  FaCog,
  FaSpinner,
  FaImage,
  FaUpload,
  FaPlus,
  FaArrowUp,
  FaArrowDown,
  FaTrash,
  FaMicrophone,
  FaStopCircle,
} from 'react-icons/fa';
import axios from 'axios';

import { useUser } from '../../contexts/UserContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';

import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import SingleSelect from '../common/SingleSelect.jsx';
import ProgressIndicator from './ProgressIndicator.jsx';
import AssistantHome from '../assistant/AssistantHome.jsx';
import PrimaryPublicButton from '../common/buttons/PrimaryPublicButton.tsx';
import PublishOptionsDialog from '../video/toolbars/frame_toolbar/PublishOptionsDialog.jsx';
import VidgenieSkeletonLoader from './VidgenieSkeletonLoader.jsx';
import VideoEditAdvancedDialog from '../video/advanced/VideoEditAdvancedDialog.jsx';

import {
  IMAGE_GENERAITON_MODEL_TYPES,
  IDEOGRAM_IMAGE_STYLES,
  PIXVERRSE_VIDEO_STYLES,
  VIDEO_GENERATION_MODEL_TYPES,
} from '../../constants/Types.ts';
import { IMAGE_MODEL_PRICES } from '../../constants/ModelPrices.jsx';
import { getExpressVideoCreditsPerSecond } from '../../constants/pricing/ExpressVideoPricingDistribution.js';
import { SUPPORTED_LANGUAGES, resolveLanguageCode } from '../../constants/supportedLanguages.js';
import { getHeaders } from '../../utils/web.jsx';
import { getSessionType } from '../../utils/environment.jsx';
import useRealtimeTranscription from '../../hooks/useRealtimeTranscription.js';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

ace.config.set('useWorker', false);

// ───────────────────────────────────────────────────────────
//  Environment constants
// ───────────────────────────────────────────────────────────
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;
const PROCESSOR_API_URL = API_SERVER;
const VIDEO_API_BASE = `${API_SERVER}/v2`;
const VIDEO_STATUS_DETAILED_ENDPOINT = `${API_SERVER}/v2/status_detailed`;
const VIDEO_STEP_API_BASE = `${VIDEO_API_BASE}/video/step`;
const ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY = 'advancedVideoEditPendingSession';

// ───────────────────────────────────────────────────────────
//  Polling constants
// ───────────────────────────────────────────────────────────
const DEFAULT_POLL = 5_000;    // 5 s while online & healthy
const OFFLINE_POLL = 30_000;   // 30 s while offline
const MAX_BACKOFF = 60_000;    // 1 min cap
const VOICE_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const VOICE_TRANSCRIPTION_WORD_LIMIT = 2000;
const VIDGENIE_PROMPT_MAX_LENGTH = 4000;
const VIDGENIE_IMAGE_MODEL_ORDER = ['GPTIMAGE2', 'NANOBANANA2', 'SEEDREAM'];
const VIDGENIE_IMAGE_MODEL_LABELS = {
  GPTIMAGE2: 'GPT Image 2',
  NANOBANANA2: 'Nano Banana 2',
  SEEDREAM: 'Seedream',
};
const DEFAULT_VIDEO_GENERATION_MODEL = 'RUNWAYML';
const VIDGENIE_VIDEO_MODEL_ORDER = [
  'RUNWAYML',
  'VEO3.1I2V',
  'VEO3.1I2VFAST',
  'SEEDANCEI2V',
  'KLINGIMGTOVID3PRO',
];
const VIDGENIE_VIDEO_MODEL_LABELS = {
  RUNWAYML: 'RunwayML Gen 4.5 (Default)',
  'VEO3.1I2V': 'VEO3.1 I2V',
  'VEO3.1I2VFAST': 'VEO3.1 I2V Fast',
  SEEDANCEI2V: 'Seedance 1.5',
  KLINGIMGTOVID3PRO: 'Kling 3 Pro',
};
const VIDGENIE_TEXT_VIDEO_MODEL_STORAGE_KEY = 'defaultVIdGPTVideoGenerationModel';
const VIDGENIE_IMAGE_LIST_VIDEO_MODEL_STORAGE_KEY = 'defaultVidgenieImageListVideoGenerationModel';
const VIDGENIE_IMAGE_LIST_VIDEO_MODEL_ORDER = [
  'RUNWAYML',
  'VEO3.1I2V',
  'VEO3.1I2VFAST',
  'SEEDANCEI2V',
  'KLINGIMGTOVID3PRO',
];
const TEXT_TO_VIDEO_IMAGE_MODEL_KEYS = [
  'GPTIMAGE2',
  'NANOBANANA2',
  'SEEDREAM',
  'CUSTOM_TEXT_TO_IMAGE',
];
const TEXT_TO_VIDEO_VIDEO_MODEL_KEYS = [
  'RUNWAYML',
  'VEO3.1I2V',
  'VEO3.1I2VFAST',
  'SEEDANCEI2V',
  'KLINGIMGTOVID3PRO',
  'CUSTOM_IMAGE_TO_VIDEO',
];
const IMAGE_LIST_TO_VIDEO_VIDEO_MODEL_KEYS = [
  'RUNWAYML',
  'VEO3.1I2V',
  'VEO3.1I2VFAST',
  'SEEDANCEI2V',
  'KLINGIMGTOVID3PRO',
  'CUSTOM_IMAGE_TO_VIDEO',
];
const JSON_MODE_ASPECT_RATIOS = ['16:9', '9:16'];
const JSON_MODE_VIDEO_MODEL_SUB_TYPES = ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'];
const GENERATION_STEP_MODE_ONE_STEP = 'one_step';
const GENERATION_STEP_MODE_TWO_STEP = 'two_step';
const TWO_STEP_MANUAL_STAGES = ['ai_video_generation'];
const DEFAULT_ADVANCED_OPTIONS = Object.freeze({
  tone: 'grounded',
  generate_outro_image: false,
  cta_url: '',
  cta_text_top: '',
  cta_text_bottom: '',
  cta_logo: '',
  footer_metadata: '',
  metadata: '',
  image_item_metadata: '',
  limit_single_narrator: false,
  add_narrator_avatar: false,
});

const VIDGENIE_TONE_OPTIONS = [
  { value: 'grounded', label: 'Grounded' },
  { value: 'cinematic', label: 'Cinematic' },
];

const VIDGENIE_STEP_MODE_OPTIONS = [
  {
    value: GENERATION_STEP_MODE_ONE_STEP,
    label: '1-step',
    description: 'Render the full video automatically.',
  },
  {
    value: GENERATION_STEP_MODE_TWO_STEP,
    label: '2-step',
    description: 'Review images before video generation.',
  },
];

const CUSTOM_ADAPTER_OPERATION_OPTIONS = [
  { key: 'text_to_image', label: 'Text to image' },
  { key: 'text_to_video', label: 'Text to video' },
  { key: 'image_to_video', label: 'Image to video' },
  { key: 'text_to_speech', label: 'Text to speech' },
  { key: 'text_to_music', label: 'Text to music' },
  { key: 'text_to_sound_effect', label: 'Text to sound effect' },
];

function hasTextValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyImageListItem() {
  return {
    image_url: '',
    title: '',
    image_text: '',
  };
}

function titleFromFileName(fileName = '') {
  const fallback = 'Uploaded image';
  const normalized = typeof fileName === 'string' ? fileName.trim() : '';
  if (!normalized) {
    return fallback;
  }
  return normalized
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.trim()) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function formatAllowedJsonValues(values) {
  return values.join(', ');
}

function findDefaultVideoModelOption(options = [], savedValue = '') {
  const saved = savedValue ? options.find((model) => model.value === savedValue) : null;
  if (saved) return saved;

  return (
    options.find((model) => model.value === DEFAULT_VIDEO_GENERATION_MODEL) ||
    options[0] ||
    null
  );
}

function resolveJsonImageModelAlias(modelKey) {
  if (modelKey === 'NANOBANANAPRO') {
    return 'NANOBANANA2';
  }
  return modelKey;
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getJsonModelByKey(modelTypes, modelKey) {
  if (typeof modelKey !== 'string') {
    return null;
  }
  const normalizedKey = modelKey.trim();
  return modelTypes.find((model) => model.key === normalizedKey) || null;
}

function imageModelSupportsAspectRatio(modelKey, aspectRatio) {
  const normalizedKey = resolveJsonImageModelAlias(modelKey);
  const pricing = IMAGE_MODEL_PRICES.find((model) => model.key === normalizedKey);
  if (!pricing || !Array.isArray(pricing.prices)) {
    return false;
  }
  return pricing.prices.some((price) => price.aspectRatio === aspectRatio);
}

function videoModelSupportsAspectRatio(modelKey, aspectRatio) {
  const model = getJsonModelByKey(VIDEO_GENERATION_MODEL_TYPES, modelKey);
  if (!model) {
    return false;
  }
  return Array.isArray(model.supportedAspectRatios)
    ? model.supportedAspectRatios.includes(aspectRatio)
    : true;
}

function normalizeJsonInputAliases(input) {
  if (!isPlainObject(input)) {
    return;
  }

  const aliases = [
    ['aspect_ratio', ['aspectRatio']],
    ['image_model', ['imageModel']],
    ['video_model', ['videoModel']],
    ['video_model_sub_type', ['videoModelSubType']],
    ['enable_subtitles', ['enableSubtitles']],
    ['font_key', ['fontKey']],
    ['generate_outro_image', ['generateOutroImage']],
    ['add_outro_animation', ['addOutroAnimation']],
    ['add_outro_focus_area', ['addOutroFocusArea']],
    ['outro_focust_area', ['outro_focus_area', 'outroFocustArea', 'outroFocusArea']],
    ['cta_url', ['ctaUrl']],
    ['cta_text_top', ['ctaTextTop']],
    ['cta_text_bottom', ['ctaTextBottom']],
    ['cta_logo', ['ctaLogo']],
    ['add_footer_animation', ['addFooterAnimation']],
    ['footer_metadata', ['footerMetadata']],
    ['limit_single_narrator', ['limitSingleNarrator']],
    ['add_narrator_avatar', ['addNarratorAvatar']],
  ];

  for (const [canonicalName, aliasNames] of aliases) {
    if (input[canonicalName] !== undefined) {
      continue;
    }
    const aliasName = aliasNames.find((name) => input[name] !== undefined);
    if (aliasName) {
      input[canonicalName] = input[aliasName];
    }
  }
}

function buildDefaultJsonModeInput({
  mode,
  imageModel,
  videoModel,
  duration,
  aspectRatio,
  language,
  enableSubtitles,
}) {
  const normalizedAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
  const normalizedLanguage = language || 'en';
  const normalizedVideoModel = videoModel || DEFAULT_VIDEO_GENERATION_MODEL;

  if (mode === 'I2V') {
    return JSON.stringify(
      {
        image_urls: [
          {
            image_url: 'https://cdn.example.com/frame-1.png',
            title: 'Opening frame',
            image_text: 'Describe what should drive the first scene.',
          },
          {
            image_url: 'https://cdn.example.com/frame-2.png',
            title: 'Second frame',
            image_text: 'Describe what should drive the second scene.',
          },
        ],
        metadata: {
          project: 'launch_trailer',
        },
        prompt: 'Create a polished short video from these images.',
        video_model: normalizedVideoModel,
        aspect_ratio: normalizedAspectRatio,
        language: normalizedLanguage,
        font_key: 'Poppins',
        enable_subtitles: enableSubtitles,
        limit_single_narrator: false,
        add_narrator_avatar: false,
        add_footer_animation: true,
        footer_metadata: [
          {
            url: 'https://example.com',
            title: 'Learn more',
          },
          {
            url: 'https://example.com',
            title: 'Get started',
          },
        ],
        generate_outro_image: true,
        cta_url: 'https://example.com',
        cta_text_top: 'Build with SamsarOne',
        cta_text_bottom: 'Scan or visit example.com',
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      prompt: 'A 30 second launch teaser for a new travel app',
      image_model: imageModel || 'GPTIMAGE2',
      video_model: normalizedVideoModel,
      duration: duration || 30,
      tone: 'grounded',
      aspect_ratio: normalizedAspectRatio,
      language: normalizedLanguage,
      font_key: 'Poppins',
      enable_subtitles: enableSubtitles,
    },
    null,
    2,
  );
}

function extractJsonLikeSegment(rawJson) {
  const source = typeof rawJson === 'string' ? rawJson.trim() : '';
  if (!source || source.startsWith('{') || source.startsWith('[')) {
    return source;
  }

  let inString = false;
  let quote = '';
  let escaped = false;
  let startIndex = -1;
  let depth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quote = char;
      continue;
    }

    if (char !== '{' && char !== '[') {
      continue;
    }

    const opening = char;
    const closing = opening === '{' ? '}' : ']';
    startIndex = index;
    depth = 1;

    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
      const innerChar = source[cursor];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (innerChar === '\\') {
          escaped = true;
        } else if (innerChar === quote) {
          inString = false;
          quote = '';
        }
        continue;
      }

      if (innerChar === '"' || innerChar === "'" || innerChar === '`') {
        inString = true;
        quote = innerChar;
        continue;
      }

      if (innerChar === opening) {
        depth += 1;
      } else if (innerChar === closing) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, cursor + 1);
        }
      }
    }

    return source.slice(startIndex);
  }

  return source;
}

function stripJsonLikeComments(source) {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      output += '\n';
      continue;
    }

    if (char === '/' && nextChar === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function normalizeSingleQuotedJsonLikeStrings(source) {
  let output = '';
  let inDoubleString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inDoubleString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inDoubleString = false;
      }
      continue;
    }

    if (char === '"') {
      inDoubleString = true;
      output += char;
      continue;
    }

    if (char !== "'") {
      output += char;
      continue;
    }

    let value = '';
    index += 1;

    for (; index < source.length; index += 1) {
      const innerChar = source[index];
      const nextChar = source[index + 1];

      if (innerChar === "'") {
        break;
      }

      if (innerChar === '\\') {
        if (nextChar === undefined) {
          value += '\\';
          break;
        }
        if (nextChar === 'n') value += '\n';
        else if (nextChar === 'r') value += '\r';
        else if (nextChar === 't') value += '\t';
        else if (nextChar === 'b') value += '\b';
        else if (nextChar === 'f') value += '\f';
        else if (nextChar === '\n') {
          // JavaScript line continuation in a pasted object literal.
        } else {
          value += nextChar;
        }
        index += 1;
        continue;
      }

      value += innerChar;
    }

    output += JSON.stringify(value);
  }

  return output;
}

function quoteUnquotedJsonLikeKeys(source) {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;

  const isKeyStart = (char) => /[A-Za-z_$]/.test(char);
  const isKeyChar = (char) => /[A-Za-z0-9_$-]/.test(char);

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (!isKeyStart(char)) {
      output += char;
      continue;
    }

    let previousIndex = output.length - 1;
    while (previousIndex >= 0 && /\s/.test(output[previousIndex])) {
      previousIndex -= 1;
    }
    const previousChar = previousIndex >= 0 ? output[previousIndex] : '';

    let cursor = index + 1;
    while (cursor < source.length && isKeyChar(source[cursor])) {
      cursor += 1;
    }

    let colonIndex = cursor;
    while (colonIndex < source.length && /\s/.test(source[colonIndex])) {
      colonIndex += 1;
    }

    if ((previousChar === '{' || previousChar === ',') && source[colonIndex] === ':') {
      output += JSON.stringify(source.slice(index, cursor));
      index = cursor - 1;
      continue;
    }

    output += char;
  }

  return output;
}

function removeTrailingJsonLikeCommas(source) {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ',') {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /\s/.test(source[nextIndex])) {
        nextIndex += 1;
      }
      if (source[nextIndex] === '}' || source[nextIndex] === ']') {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function repairJsonLikeInput(rawJson) {
  return removeTrailingJsonLikeCommas(
    quoteUnquotedJsonLikeKeys(
      normalizeSingleQuotedJsonLikeStrings(
        stripJsonLikeComments(extractJsonLikeSegment(rawJson)),
      ),
    ),
  ).trim();
}

function parseJsonOrRepair(rawJson) {
  const trimmed = typeof rawJson === 'string' ? rawJson.trim() : '';
  try {
    return {
      value: JSON.parse(trimmed),
      normalizedJson: null,
      repaired: false,
    };
  } catch (originalError) {
    const repairedJson = repairJsonLikeInput(trimmed);
    try {
      const value = JSON.parse(repairedJson);
      return {
        value,
        normalizedJson: JSON.stringify(value, null, 2),
        repaired: repairedJson !== trimmed,
      };
    } catch {
      return { error: originalError };
    }
  }
}

function getJsonErrorLocation(rawJson, error) {
  const message = error?.message || '';
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    return {
      row: Math.max(0, Number(lineColumnMatch[1]) - 1),
      column: Math.max(0, Number(lineColumnMatch[2]) - 1),
    };
  }

  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    return { row: 0, column: 0 };
  }

  const errorIndex = Math.max(0, Number(positionMatch[1]));
  const beforeError = rawJson.slice(0, errorIndex);
  const lines = beforeError.split('\n');
  return {
    row: Math.max(0, lines.length - 1),
    column: Math.max(0, lines[lines.length - 1]?.length || 0),
  };
}

function getJsonParseErrorDetails(rawJson, error) {
  const trimmed = typeof rawJson === 'string' ? rawJson.trim() : '';
  const location = getJsonErrorLocation(rawJson, error);
  if (/^(const|let|var)\s/.test(trimmed) || /^await\s/.test(trimmed) || /samsar\.\w+\(/.test(trimmed)) {
    return {
      ...location,
      error: 'JSON mode accepts raw JSON only. Paste the request body object, not JavaScript or SDK code. JSON needs double-quoted keys and strings, and no const/await/function call wrapper.',
    };
  }
  if (error?.message?.includes('Expected property name') || /[{,]\s*[A-Za-z_$][\w$-]*\s*:/.test(trimmed)) {
    return {
      ...location,
      error: 'Invalid JSON: property names must be wrapped in double quotes. Use "image_urls": instead of image_urls:.',
    };
  }

  return {
    ...location,
    error: `Invalid JSON: ${error.message}`,
  };
}

function normalizeJsonEndpoint(value, input, selectedMode = 'T2V') {
  const rawEndpoint =
    typeof value === 'string' && value.trim().length > 0
      ? value.trim().toLowerCase()
      : '';
  const normalizedEndpoint = rawEndpoint
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^v\d+\//, '')
    .replace(/^video\//, '')
    .replace(/-/g, '_');

  if (
    normalizedEndpoint === 'image_list_to_video' ||
    normalizedEndpoint === 'image_to_video' ||
    normalizedEndpoint.endsWith('/image_to_video') ||
    normalizedEndpoint.endsWith('/image_list_to_video')
  ) {
    return { endpoint: 'image_list_to_video' };
  }

  if (
    normalizedEndpoint === 'text_to_video' ||
    normalizedEndpoint.endsWith('/text_to_video')
  ) {
    return { endpoint: 'text_to_video' };
  }

  if (rawEndpoint) {
    return {
      error: 'JSON endpoint must be text_to_video, image_list_to_video, image_to_video, or a matching /v2/video/step route.',
    };
  }

  return {
    endpoint: selectedMode === 'I2V' ? 'image_list_to_video' : 'text_to_video',
  };
}

function validateJsonSessionId(payload, input, currentSessionId) {
  const sessionIds = [
    payload.session_id,
    payload.sessionId,
    payload.sessionID,
    input.session_id,
    input.sessionId,
    input.sessionID,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0);

  const mismatchedSessionId = sessionIds.find((value) => value.trim() !== currentSessionId);
  if (mismatchedSessionId) {
    return {
      error: 'JSON session_id must match the current Vidgenie session.',
    };
  }

  return {};
}

function hasJsonImageUrlValue(item) {
  if (typeof item === 'string') {
    return item.trim().length > 0;
  }
  if (!isPlainObject(item)) {
    return false;
  }
  return [
    item.image_url,
    item.imageUrl,
    item.url,
    item.src,
    item.enhanced_url,
    item.enhancedUrl,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);
}

function validateCommonJsonInput(input) {
  if (!isPlainObject(input)) {
    return 'JSON input must be an object.';
  }

  const aspectRatio = input.aspect_ratio || '16:9';

  if (
    input.aspect_ratio !== undefined &&
    !JSON_MODE_ASPECT_RATIOS.includes(input.aspect_ratio)
  ) {
    return `JSON input.aspect_ratio must be one of: ${formatAllowedJsonValues(JSON_MODE_ASPECT_RATIOS)}.`;
  }

  if (input.language !== undefined) {
    if (typeof input.language !== 'string') {
      return 'JSON input.language must be a string when provided.';
    }
    const normalizedLanguage = resolveLanguageCode(input.language, '');
    if (!normalizedLanguage) {
      const languageValues = ['auto', ...SUPPORTED_LANGUAGES.map((lang) => lang.code)];
      return `JSON input.language must be one of: ${formatAllowedJsonValues(languageValues)}.`;
    }
  }

  if (input.font_key !== undefined && typeof input.font_key !== 'string') {
    return 'JSON input.font_key must be a string when provided.';
  }

  if (
    input.enable_subtitles !== undefined &&
    typeof input.enable_subtitles !== 'boolean'
  ) {
    return 'JSON input.enable_subtitles must be a boolean when provided.';
  }

  if (
    input.add_outro_animation !== undefined &&
    typeof input.add_outro_animation !== 'boolean'
  ) {
    return 'JSON input.add_outro_animation must be a boolean when provided.';
  }

  if (
    input.add_outro_focus_area !== undefined &&
    typeof input.add_outro_focus_area !== 'boolean'
  ) {
    return 'JSON input.add_outro_focus_area must be a boolean when provided.';
  }

  if (
    input.generate_outro_image !== undefined &&
    typeof input.generate_outro_image !== 'boolean'
  ) {
    return 'JSON input.generate_outro_image must be a boolean when provided.';
  }

  if (
    input.add_footer_animation !== undefined &&
    typeof input.add_footer_animation !== 'boolean'
  ) {
    return 'JSON input.add_footer_animation must be a boolean when provided.';
  }

  if (
    input.footer_metadata !== undefined &&
    !Array.isArray(input.footer_metadata)
  ) {
    return 'JSON input.footer_metadata must be an array when provided.';
  }

  if (input.cta_url !== undefined && typeof input.cta_url !== 'string') {
    return 'JSON input.cta_url must be a string when provided.';
  }

  if (
    input.generate_outro_image === true &&
    (typeof input.cta_url !== 'string' || input.cta_url.trim().length === 0)
  ) {
    return 'JSON input.cta_url is required when generate_outro_image is true.';
  }

  if (hasTextValue(input.cta_url) && !isHttpUrl(input.cta_url)) {
    return 'JSON input.cta_url must be an http or https URL.';
  }

  if (input.cta_text_top !== undefined && typeof input.cta_text_top !== 'string') {
    return 'JSON input.cta_text_top must be a string when provided.';
  }

  if (input.cta_text_bottom !== undefined && typeof input.cta_text_bottom !== 'string') {
    return 'JSON input.cta_text_bottom must be a string when provided.';
  }

  if (input.cta_logo !== undefined && typeof input.cta_logo !== 'string') {
    return 'JSON input.cta_logo must be a string when provided.';
  }

  if (Array.isArray(input.footer_metadata)) {
    const invalidFooterIndex = input.footer_metadata.findIndex((entry) => {
      if (!isPlainObject(entry)) return true;
      const url = entry.url ?? entry.ctaUrl ?? entry.cta_url;
      const title = entry.title ?? entry.ctaText ?? entry.cta_text ?? entry.text ?? entry.name ?? entry.label;
      const logo = entry.logoUrl ?? entry.ctaLogo ?? entry.cta_logo ?? entry.logo_url ?? entry.footer_logo_url;
      if (url !== undefined && (typeof url !== 'string' || !isHttpUrl(url))) return true;
      if (title !== undefined && typeof title !== 'string') return true;
      if (logo !== undefined && typeof logo !== 'string') return true;
      return !hasTextValue(url) && !hasTextValue(title) && !hasTextValue(logo);
    });
    if (invalidFooterIndex >= 0) {
      return `JSON input.footer_metadata[${invalidFooterIndex}] must include a valid http(s) url, title/text, or logo URL.`;
    }
  }

  if (input.add_footer_animation === true && (!Array.isArray(input.footer_metadata) || input.footer_metadata.length === 0)) {
    return 'JSON input.footer_metadata must include at least one item when add_footer_animation is true.';
  }

  if (input.add_outro_focus_area === true && input.add_outro_animation !== true) {
    return 'JSON input.add_outro_focus_area requires add_outro_animation to be true.';
  }

  if (input.outro_focust_area !== undefined) {
    if (!isPlainObject(input.outro_focust_area)) {
      return 'JSON input.outro_focust_area must be an object when provided.';
    }
    for (const key of ['x', 'y', 'width', 'height']) {
      if (!Number.isFinite(Number(input.outro_focust_area[key]))) {
        return `JSON input.outro_focust_area.${key} must be a finite number.`;
      }
    }
  }

  if (aspectRatio && !JSON_MODE_ASPECT_RATIOS.includes(aspectRatio)) {
    return `JSON input.aspect_ratio must be one of: ${formatAllowedJsonValues(JSON_MODE_ASPECT_RATIOS)}.`;
  }

  return null;
}

function validateTextToVideoJsonInput(input) {
  const commonError = validateCommonJsonInput(input);
  if (commonError) return commonError;

  if (typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
    return 'JSON input.prompt is required for text_to_video.';
  }

  if (input.prompt.trim().length > VIDGENIE_PROMPT_MAX_LENGTH) {
    return `JSON input.prompt must be ${VIDGENIE_PROMPT_MAX_LENGTH} characters or fewer.`;
  }

  if (typeof input.image_model !== 'string' || input.image_model.trim().length === 0) {
    return 'JSON input.image_model is required for text_to_video.';
  }

  const resolvedImageModel = resolveJsonImageModelAlias(input.image_model.trim());
  const imageModel = getJsonModelByKey(IMAGE_GENERAITON_MODEL_TYPES, resolvedImageModel);
  if (!imageModel || !TEXT_TO_VIDEO_IMAGE_MODEL_KEYS.includes(resolvedImageModel)) {
    return `JSON input.image_model must be one of: ${formatAllowedJsonValues(TEXT_TO_VIDEO_IMAGE_MODEL_KEYS)}.`;
  }
  if (imageModel.isExpressModel !== true) {
    return 'JSON input.image_model must be an express model.';
  }
  if (!imageModelSupportsAspectRatio(resolvedImageModel, input.aspect_ratio || '16:9')) {
    return `JSON input.image_model ${resolvedImageModel} does not support aspect_ratio ${input.aspect_ratio || '16:9'}.`;
  }

  if (typeof input.video_model !== 'string' || input.video_model.trim().length === 0) {
    return 'JSON input.video_model is required for text_to_video.';
  }

  const videoModelKey = input.video_model.trim();
  const videoModel = getJsonModelByKey(VIDEO_GENERATION_MODEL_TYPES, videoModelKey);
  if (!videoModel || !TEXT_TO_VIDEO_VIDEO_MODEL_KEYS.includes(videoModelKey)) {
    return `JSON input.video_model must be one of: ${formatAllowedJsonValues(TEXT_TO_VIDEO_VIDEO_MODEL_KEYS)}.`;
  }
  if (videoModel.isExpressModel !== true) {
    return 'JSON input.video_model must be an express model.';
  }
  if (!videoModelSupportsAspectRatio(videoModelKey, input.aspect_ratio || '16:9')) {
    return `JSON input.video_model ${videoModelKey} does not support aspect_ratio ${input.aspect_ratio || '16:9'}.`;
  }

  if (
    input.video_model_sub_type !== undefined &&
    !JSON_MODE_VIDEO_MODEL_SUB_TYPES.includes(input.video_model_sub_type)
  ) {
    return `JSON input.video_model_sub_type must be one of: ${formatAllowedJsonValues(JSON_MODE_VIDEO_MODEL_SUB_TYPES)}.`;
  }

  const durationValue = Number(input.duration);
  if (!Number.isFinite(durationValue)) {
    return 'JSON input.duration is required for text_to_video.';
  }

  if (durationValue < 10 || durationValue > 240) {
    return 'JSON input.duration must be between 10 and 240 seconds.';
  }

  return null;
}

function validateImageListToVideoJsonInput(input) {
  const commonError = validateCommonJsonInput(input);
  if (commonError) return commonError;

  if (!Array.isArray(input.image_urls) || input.image_urls.length === 0) {
    return 'JSON input.image_urls must be a non-empty array for image_list_to_video.';
  }

  if (input.image_urls.some((item) => !hasJsonImageUrlValue(item))) {
    return 'JSON input.image_urls entries must be non-empty URL strings or objects with image_url, imageUrl, url, src, enhanced_url, or enhancedUrl.';
  }

  if (input.metadata !== undefined && !isPlainObject(input.metadata)) {
    return 'JSON input.metadata must be an object when provided.';
  }

  if (input.prompt !== undefined && typeof input.prompt !== 'string') {
    return 'JSON input.prompt must be a string when provided.';
  }

  if (input.video_model !== undefined && typeof input.video_model !== 'string') {
    return 'JSON input.video_model must be a string when provided.';
  }

  if (hasTextValue(input.video_model)) {
    const videoModelKey = input.video_model.trim();
    const videoModel = getJsonModelByKey(VIDEO_GENERATION_MODEL_TYPES, videoModelKey);
    if (!videoModel || !IMAGE_LIST_TO_VIDEO_VIDEO_MODEL_KEYS.includes(videoModelKey)) {
      return `JSON input.video_model must be one of: ${formatAllowedJsonValues(IMAGE_LIST_TO_VIDEO_VIDEO_MODEL_KEYS)}.`;
    }
    if (!videoModelSupportsAspectRatio(videoModelKey, input.aspect_ratio || '16:9')) {
      return `JSON input.video_model ${videoModelKey} does not support aspect_ratio ${input.aspect_ratio || '16:9'}.`;
    }
  }

  if (
    input.add_footer_animation === true &&
    Array.isArray(input.footer_metadata) &&
    input.footer_metadata.length < input.image_urls.length
  ) {
    return 'JSON input.footer_metadata must include one item for each image when add_footer_animation is true.';
  }

  if (
    input.limit_single_narrator !== undefined &&
    typeof input.limit_single_narrator !== 'boolean'
  ) {
    return 'JSON input.limit_single_narrator must be a boolean when provided.';
  }

  if (
    input.add_narrator_avatar !== undefined &&
    typeof input.add_narrator_avatar !== 'boolean'
  ) {
    return 'JSON input.add_narrator_avatar must be a boolean when provided.';
  }

  return null;
}

function buildJsonModeRequest(rawJson, currentSessionId, selectedMode = 'T2V') {
  if (!hasTextValue(rawJson)) {
    return { error: 'JSON input is required.' };
  }

  const parsedInput = parseJsonOrRepair(rawJson);
  if (parsedInput.error) {
    return getJsonParseErrorDetails(rawJson, parsedInput.error);
  }
  const parsed = parsedInput.value;

  if (!isPlainObject(parsed)) {
    return { error: 'JSON input must be an object.' };
  }

  const payload = cloneJsonValue(parsed);
  const rawEndpoint =
    payload.endpoint ??
    payload.route ??
    payload.path ??
    payload.url;

  delete payload.endpoint;
  delete payload.route;
  delete payload.path;
  delete payload.url;
  delete payload.method;

  const input = isPlainObject(payload.input) ? payload.input : payload;
  normalizeJsonInputAliases(input);
  const sessionValidation = validateJsonSessionId(payload, input, currentSessionId);
  if (sessionValidation.error) {
    return sessionValidation;
  }

  const endpointResult = normalizeJsonEndpoint(rawEndpoint, input, selectedMode);
  if (endpointResult.error) {
    return endpointResult;
  }

  const inputValidationError =
    endpointResult.endpoint === 'image_list_to_video'
      ? validateImageListToVideoJsonInput(input)
      : validateTextToVideoJsonInput(input);
  if (inputValidationError) {
    return { error: inputValidationError };
  }

  input.session_id = currentSessionId;
  if (isPlainObject(payload.input)) {
    payload.input = input;
  }

  return {
    endpoint: endpointResult.endpoint,
    payload,
    ...(parsedInput.repaired && parsedInput.normalizedJson
      ? { normalizedJson: parsedInput.normalizedJson }
      : {}),
  };
}

function parseOptionalJsonValue(rawValue, label, validator) {
  if (!hasTextValue(rawValue)) {
    return { value: null };
  }

  const parsedValue = parseJsonOrRepair(rawValue);
  if (parsedValue.error) {
    return { error: `${label} must be valid JSON.` };
  }

  try {
    if (validator && !validator(parsedValue.value)) {
      return { error: `${label} must be valid JSON in the expected shape.` };
    }
    return { value: parsedValue.value, normalizedJson: parsedValue.normalizedJson };
  } catch {
    return { error: `${label} must be valid JSON.` };
  }
}

function normalizeSavedCustomAdapters(customAdapters) {
  return isPlainObject(customAdapters) ? customAdapters : {};
}

function getAvailableCustomAdapterOperations(customAdapters) {
  const savedAdapters = normalizeSavedCustomAdapters(customAdapters);
  if (!hasTextValue(savedAdapters.base_url)) {
    return [];
  }

  return CUSTOM_ADAPTER_OPERATION_OPTIONS
    .map((operation) => {
      const endpoint = savedAdapters[operation.key];
      if (!hasTextValue(endpoint)) {
        return null;
      }
      return {
        ...operation,
        endpoint: endpoint.trim(),
      };
    })
    .filter(Boolean);
}

function buildSelectedCustomAdaptersPayload(customAdapters, selectedOperationKeys = []) {
  const savedAdapters = normalizeSavedCustomAdapters(customAdapters);
  const selectedKeys = new Set(selectedOperationKeys);
  if (!hasTextValue(savedAdapters.base_url) || selectedKeys.size === 0) {
    return null;
  }

  const payload = {
    base_url: savedAdapters.base_url.trim(),
  };
  if (hasTextValue(savedAdapters.api_key)) {
    payload.api_key = savedAdapters.api_key.trim();
  }

  for (const operation of CUSTOM_ADAPTER_OPERATION_OPTIONS) {
    if (!selectedKeys.has(operation.key) || !hasTextValue(savedAdapters[operation.key])) {
      continue;
    }
    payload[operation.key] = savedAdapters[operation.key].trim();
  }

  return CUSTOM_ADAPTER_OPERATION_OPTIONS.some((operation) => payload[operation.key])
    ? payload
    : null;
}

function buildAdvancedRequestConfiguration({
  isTextToVideo,
  advancedOptions,
  customAdapters,
  selectedCustomAdapterOperations,
}) {
  const input = {};
  const root = {};

  if (isTextToVideo && hasTextValue(advancedOptions.tone)) {
    input.tone = advancedOptions.tone.trim();
  }

  const shouldGenerateOutro = advancedOptions.generate_outro_image === true;
  if (shouldGenerateOutro) {
    input.generate_outro_image = true;
    if (!hasTextValue(advancedOptions.cta_url)) {
      return { error: 'CTA URL is required when generated QR outro is enabled.' };
    }
  }

  if (shouldGenerateOutro && hasTextValue(advancedOptions.cta_url)) {
    input.cta_url = advancedOptions.cta_url.trim();
  }
  if (shouldGenerateOutro && hasTextValue(advancedOptions.cta_text_top)) {
    input.cta_text_top = advancedOptions.cta_text_top.trim();
  }
  if (shouldGenerateOutro && hasTextValue(advancedOptions.cta_text_bottom)) {
    input.cta_text_bottom = advancedOptions.cta_text_bottom.trim();
  }
  if (shouldGenerateOutro && hasTextValue(advancedOptions.cta_logo)) {
    input.cta_logo = advancedOptions.cta_logo.trim();
  }

  if (hasTextValue(advancedOptions.footer_metadata)) {
    const parsedFooterMetadata = parseOptionalJsonValue(
      advancedOptions.footer_metadata,
      'Footer metadata',
      Array.isArray,
    );
    if (parsedFooterMetadata.error) {
      return { error: parsedFooterMetadata.error };
    }
    if (!parsedFooterMetadata.value || parsedFooterMetadata.value.length === 0) {
      return { error: 'Footer metadata must include at least one item.' };
    }
    input.footer_metadata = parsedFooterMetadata.value;
  }

  let imageItemMetadata = null;
  if (!isTextToVideo) {
    if (advancedOptions.add_narrator_avatar === true) {
      input.add_narrator_avatar = true;
      input.limit_single_narrator = true;
    } else if (advancedOptions.limit_single_narrator === true) {
      input.limit_single_narrator = true;
    }

    const parsedMetadata = parseOptionalJsonValue(
      advancedOptions.metadata,
      'Metadata',
      isPlainObject,
    );
    if (parsedMetadata.error) {
      return { error: parsedMetadata.error };
    }
    if (parsedMetadata.value) {
      input.metadata = parsedMetadata.value;
    }

    const parsedImageItemMetadata = parseOptionalJsonValue(
      advancedOptions.image_item_metadata,
      'Image item metadata',
      Array.isArray,
    );
    if (parsedImageItemMetadata.error) {
      return { error: parsedImageItemMetadata.error };
    }
    imageItemMetadata = parsedImageItemMetadata.value;
  }

  const selectedCustomAdapters = buildSelectedCustomAdaptersPayload(
    customAdapters,
    selectedCustomAdapterOperations,
  );
  if (selectedCustomAdapters) {
    root.configuration = {
      custom_adapters: selectedCustomAdapters,
    };
  }

  return {
    input,
    root,
    imageItemMetadata,
  };
}

function buildStepGenerationInput(stepMode) {
  if (stepMode === GENERATION_STEP_MODE_TWO_STEP) {
    return {
      auto_render_full_video: false,
      manual_step_stages: TWO_STEP_MANUAL_STAGES,
    };
  }

  return {
    auto_render_full_video: true,
    manual_step_stages: [],
  };
}

function attachStepGenerationInput(payload, stepMode) {
  const nextPayload = cloneJsonValue(payload);
  const stepInput = buildStepGenerationInput(stepMode);

  if (isPlainObject(nextPayload.input)) {
    nextPayload.input = {
      ...nextPayload.input,
      ...stepInput,
    };
    return nextPayload;
  }

  return {
    ...nextPayload,
    ...stepInput,
  };
}

function getStepGenerationEndpoint(endpoint) {
  return endpoint === 'image_list_to_video'
    ? `${VIDEO_STEP_API_BASE}/image_to_video`
    : `${VIDEO_STEP_API_BASE}/text_to_video`;
}

function extractVideoResultUrl(data) {
  return (
    data?.result_url
    || (Array.isArray(data?.result_urls) ? data.result_urls[0] : null)
    || data?.remoteURL
    || data?.videoLink
    || data?.session?.result?.url
    || data?.session?.result?.remoteURL
    || data?.session?.result?.videoLink
    || null
  );
}

function isStepStatusWaitingForApproval(data) {
  const step = data?.step || {};
  return Boolean(
    data?.requires_user_action ||
    data?.requiresUserAction ||
    data?.can_process_next ||
    data?.canProcessNext ||
    step.requires_user_action ||
    step.requiresUserAction ||
    step.can_process_next ||
    step.canProcessNext
  );
}

function isFailedGenerationStatus(status) {
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
  return normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR' || normalizedStatus === 'CANCELLED';
}
export default function OneshotEditor() {
  // ─────────────────────────────────────────────────────────
  //  Context / Router hooks
  // ─────────────────────────────────────────────────────────
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const { t, language } = useLocalization();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const showLoginDialog = useCallback(() => {
    openAlertDialog(<AuthContainer />, undefined, false, AUTH_DIALOG_OPTIONS);
  }, [openAlertDialog]);

  const activeSessionIdRef = useRef(id);
  const currentPollRequestIdRef = useRef(null);
  const activeRequestIdRef = useRef(null);

  const lastWakePoll = useRef(Date.now());

  const currentEnv = getSessionType();

  const voiceSessionStartRef = useRef(null);
  const voiceSessionTimeoutRef = useRef(null);
  const voiceWordCountRef = useRef(0);
  const voiceWordLimitRef = useRef(VOICE_TRANSCRIPTION_WORD_LIMIT);
  const stopAllVoiceCaptureRef = useRef(() => {});
  const voiceSessionTimeoutLabelRef = useRef(t("vidgenie.voiceTimeoutTenMinutes"));

  const clearVoiceSessionTimeout = useCallback(() => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }
  }, []);

  const countWords = useCallback((value) => {
    if (!value) return 0;
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, []);

  const transcriptHeaders = useMemo(() => getHeaders(), [user]);
  const normalizeVideoUrl = (url) => {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
      return trimmed;
    }
    return `${API_SERVER}/${trimmed.replace(/^\/+/, '')}`;
  };

  // ✨ UI tokens for light/dark surfaces
  const surfaceCard =
    colorMode === 'dark'
      ? 'bg-[#0f1629] text-slate-100 border border-[#1f2a3d] shadow-[0_16px_40px_rgba(0,0,0,0.38)]'
      : 'bg-white text-slate-900 border border-slate-200 shadow-sm';

  const controlShell =
    colorMode === 'dark'
      ? 'bg-[#111a2f] ring-1 ring-[#1f2a3d] hover:ring-rose-400/40'
      : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 shadow-sm';

  const mutedText = colorMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    activeSessionIdRef.current = id;
  }, [id]);


  // ─────────────────────────────────────────────────────────
  //  Basic session & form state
  // ─────────────────────────────────────────────────────────
  const [sessionDetails, setSessionDetails] = useState(null);
  const [promptText, setPromptText] = useState('');
  const clampPromptText = useCallback((value) => {
    if (typeof value !== 'string') return '';
    return value.length > VIDGENIE_PROMPT_MAX_LENGTH
      ? value.slice(0, VIDGENIE_PROMPT_MAX_LENGTH)
      : value;
  }, []);
  const updatePromptText = useCallback((value) => {
    setPromptText(clampPromptText(value));
  }, [clampPromptText]);
  const handlePromptTextChange = useCallback((event) => {
    updatePromptText(event.target.value);
  }, [updatePromptText]);
  const promptCharacterCount = promptText.length;
  const promptCounterLabel = t(
    "vidgenie.promptCharacterCount",
    { count: promptCharacterCount, max: VIDGENIE_PROMPT_MAX_LENGTH },
    "{count}/{max} characters"
  );
  const promptCounterClass =
    promptCharacterCount >= VIDGENIE_PROMPT_MAX_LENGTH ? 'text-amber-500' : mutedText;
  const [generationMode, setGenerationMode] = useState('T2V');
  const [generationStepMode, setGenerationStepMode] = useState(GENERATION_STEP_MODE_ONE_STEP);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [isJsonInputDirty, setIsJsonInputDirty] = useState(false);
  const [jsonValidationMessage, setJsonValidationMessage] = useState('');
  const [isJsonRequestExpanded, setIsJsonRequestExpanded] = useState(false);
  const [jsonCopyStatus, setJsonCopyStatus] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId;
  }, [activeRequestId]);

  // ─────────────────────────────────────────────────────────
  //  Online / offline & polling support
  // ─────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pollDelay, setPollDelay] = useState(DEFAULT_POLL);
  const pollDelayRef = useRef(DEFAULT_POLL);
  const assistantDelayRef = useRef(DEFAULT_POLL);

  useEffect(() => {
    const onLine = () => {
      setIsOnline(true);
      setPollDelay(DEFAULT_POLL);
    };
    const offLine = () => {
      setIsOnline(false);
      setPollDelay(OFFLINE_POLL);
    };

    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', offLine);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Polling handles / refs
  // ─────────────────────────────────────────────────────────
  const pollIntervalRef = useRef(null);   // generation poll (setTimeout)
  const assistantPollRef = useRef(null);   // assistant poll (setInterval)
  const pollErrorCountRef = useRef(0);
  const assistantErrorCountRef = useRef(0);

  const pollTimeoutRef = useRef(null);
  const assistantTimeoutRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  //  Assistant / Chatbot state
  // ─────────────────────────────────────────────────────────
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isAssistantQueryGenerating, setIsAssistantQueryGenerating] = useState(false);

  // ─────────────────────────────────────────────────────────
  //  Generation state
  // ─────────────────────────────────────────────────────────
  const [isGenerationPending, setIsGenerationPending] = useState(false);
  const [isGenerationWaitingForApproval, setIsGenerationWaitingForApproval] = useState(false);
  const [isProcessingNextStep, setIsProcessingNextStep] = useState(false);
  const [expressGenerationStatus, setExpressGenerationStatus] = useState(null);
  const [generationStatusDetails, setGenerationStatusDetails] = useState(null);
  const [videoLink, setVideoLink] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showResultDisplay, setShowResultDisplay] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        !document.hidden &&
        Date.now() - lastWakePoll.current > 2000 &&
        isGenerationPending &&
        activeRequestIdRef.current
      ) {
        lastWakePoll.current = Date.now();
        pollGenerationStatus(activeRequestIdRef.current, true); // Restart fresh
        startAssistantQueryPoll(true);  // Optional: restart assistant poll
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [id, isGenerationPending]);

  // ─────────────────────────────────────────────────────────
  //  Misc state
  // ─────────────────────────────────────────────────────────
  const [latestVideos, setLatestVideos] = useState([]);
  const [error, setError] = useState('');
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [imageListItems, setImageListItems] = useState(() => [createEmptyImageListItem()]);
  const [uploadingImageIndex, setUploadingImageIndex] = useState(null);
  const [imageUploadError, setImageUploadError] = useState('');
  const [voiceStatusMessage, setVoiceStatusMessage] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const [isBrowserRecognitionActive, setIsBrowserRecognitionActive] = useState(false);
  const voiceBasePromptRef = useRef('');
  const voiceTranscriptRef = useRef('');
  const voiceStatusTimeoutRef = useRef(null);
  const browserRecognitionRef = useRef(null);
  const speechRecognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);
  const isBrowserSpeechSupported = Boolean(speechRecognitionCtor);

  const setAdvancedVideoEditPendingSession = (nextSessionId) => {
    if (!nextSessionId || typeof window === 'undefined') return;
    sessionStorage.setItem(
      ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY,
      JSON.stringify({ sessionId: nextSessionId, startedAt: Date.now() })
    );
  };

  const shouldForceAdvancedVideoEditPolling = (candidateSessionId) => {
    if (!candidateSessionId || typeof window === 'undefined') return false;
    try {
      const rawValue = sessionStorage.getItem(ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY);
      if (!rawValue) return false;
      const parsedValue = JSON.parse(rawValue);
      const startedAt = Number(parsedValue?.startedAt);
      const isFresh = Number.isFinite(startedAt) && Date.now() - startedAt < 10 * 60 * 1000;
      return parsedValue?.sessionId === candidateSessionId && isFresh;
    } catch {
      return false;
    }
  };

  const clearAdvancedVideoEditPendingSession = (candidateSessionId) => {
    if (!candidateSessionId || typeof window === 'undefined') return;
    try {
      const rawValue = sessionStorage.getItem(ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY);
      if (!rawValue) return;
      const parsedValue = JSON.parse(rawValue);
      if (parsedValue?.sessionId === candidateSessionId) {
        sessionStorage.removeItem(ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY);
      }
    } catch {
      sessionStorage.removeItem(ADVANCED_VIDEO_EDIT_PENDING_SESSION_KEY);
    }
  };

  const handleVoiceSessionStarted = useCallback((sessionInfo) => {
    setVoiceError(null);
    setVoiceStatusMessage(t("vidgenie.voiceListening"));
    voiceTranscriptRef.current = '';
    voiceWordCountRef.current = 0;
    const rawLimit = sessionInfo?.maxTranscriptWords;
    const parsedLimit =
      typeof rawLimit === 'number'
        ? rawLimit
        : rawLimit
          ? parseInt(rawLimit, 10)
          : null;
    voiceWordLimitRef.current =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : VOICE_TRANSCRIPTION_WORD_LIMIT;
    const now = Date.now();
    voiceSessionStartRef.current = now;
    clearVoiceSessionTimeout();
    let timeoutMs = VOICE_SESSION_TIMEOUT_MS;
    if (sessionInfo?.expiresAt) {
      const expiresAtMs = new Date(sessionInfo.expiresAt).getTime();
      if (!Number.isNaN(expiresAtMs)) {
        timeoutMs = Math.min(
          VOICE_SESSION_TIMEOUT_MS,
          Math.max(0, expiresAtMs - now),
        );
      }
    }
    let timeoutLabel = t("vidgenie.voiceTimeoutTenMinutes");
    if (timeoutMs <= 0 || timeoutMs < 60_000) {
      timeoutLabel = t("vidgenie.voiceTimeoutLessThanMinute");
    } else {
      const timeoutMinutes = Math.ceil(timeoutMs / 60_000);
      timeoutLabel =
        timeoutMinutes === 1
          ? t("vidgenie.voiceTimeoutMinute")
          : t("vidgenie.voiceTimeoutMinutes", { count: timeoutMinutes });
    }
    voiceSessionTimeoutLabelRef.current = timeoutLabel;
    if (timeoutMs <= 0) {
      setVoiceStatusMessage(null);
      setVoiceError(
        t("vidgenie.voiceSessionExpired", { duration: voiceSessionTimeoutLabelRef.current })
      );
      stopAllVoiceCaptureRef.current?.();
      return;
    }
    voiceSessionTimeoutRef.current = setTimeout(() => {
      setVoiceStatusMessage(null);
      setVoiceError(
        t("vidgenie.voiceSessionExpired", { duration: voiceSessionTimeoutLabelRef.current })
      );
      stopAllVoiceCaptureRef.current?.();
    }, timeoutMs);
  }, [clearVoiceSessionTimeout, t]);

  const handleVoiceSessionEnded = useCallback(() => {
    clearVoiceSessionTimeout();
    voiceSessionStartRef.current = null;
    voiceWordCountRef.current = 0;
    voiceWordLimitRef.current = VOICE_TRANSCRIPTION_WORD_LIMIT;
    voiceSessionTimeoutLabelRef.current = t("vidgenie.voiceTimeoutTenMinutes");
    setVoiceStatusMessage(t("vidgenie.voiceStopped"));
    voiceBasePromptRef.current = '';
    voiceTranscriptRef.current = '';
  }, [clearVoiceSessionTimeout, t]);

  const handleVoiceTranscription = useCallback((transcript, isFinal) => {
    const base = voiceBasePromptRef.current || '';

    const sanitizeTranscript = (value) => {
      if (!value) return '';
      let cleaned = value.replace(/I['’]m listening and ready whenever you are!/gi, '');
      cleaned = cleaned.replace(/\s+/g, ' ').trimStart();
      return cleaned;
    };

    const cleanedTranscript = sanitizeTranscript(transcript);
    if (!cleanedTranscript) {
      voiceTranscriptRef.current = '';
      if (isFinal) {
        setVoiceStatusMessage(t("vidgenie.voiceNoSpeech"));
      }
      return;
    }

    const wordLimit = voiceWordLimitRef.current || VOICE_TRANSCRIPTION_WORD_LIMIT;
    const totalWords = countWords(cleanedTranscript);
    if (totalWords > wordLimit) {
      const limitedTranscript = cleanedTranscript
        .split(/\s+/)
        .slice(0, wordLimit)
        .join(' ');
      const nextPrompt = clampPromptText(`${base}${limitedTranscript}`);
      voiceTranscriptRef.current = nextPrompt.slice(Math.min(base.length, nextPrompt.length));
      setPromptText(nextPrompt);
      voiceBasePromptRef.current = nextPrompt;
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceTranscriptLimit", { count: wordLimit }));
      stopAllVoiceCaptureRef.current?.();
      return;
    }
    voiceWordCountRef.current = totalWords;

    const nextPrompt = clampPromptText(`${base}${cleanedTranscript}`);
    const nextTranscript = nextPrompt.slice(Math.min(base.length, nextPrompt.length));
    if (nextTranscript === voiceTranscriptRef.current) {
      return;
    }
    voiceTranscriptRef.current = nextTranscript;

    setPromptText(nextPrompt);
    if (isFinal) {
      voiceBasePromptRef.current = nextPrompt;
    }

    setVoiceStatusMessage(
      isFinal ? t("vidgenie.voiceCaptured") : t("vidgenie.voiceTranscribing")
    );
  }, [clampPromptText, countWords, t]);

  const {
    startTranscription: startVoiceTranscription,
    stopTranscription: stopVoiceTranscription,
    isSupported: isVoiceSupported,
    isInitializing: isVoiceInitializing,
    isRecording: isVoiceRecording,
    error: realtimeVoiceError,
  } = useRealtimeTranscription({
    transcriptEndpoint: `${API_SERVER}/video_session/get_transcription_key`,
    transcriptHeaders,
    onTranscription: handleVoiceTranscription,
    onSessionStarted: handleVoiceSessionStarted,
    onSessionEnded: handleVoiceSessionEnded,
    onError: (message) => setVoiceError(message),
  });

  const startBrowserRecognition = useCallback(() => {
    if (!speechRecognitionCtor) {
      return false;
    }

    try {
      const recognition = new speechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      const browserLanguage = typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US';
      recognition.lang = browserLanguage;

      recognition.onstart = () => {
        handleVoiceSessionStarted();
        setIsBrowserRecognitionActive(true);
      };

      recognition.onerror = (event) => {
        const message =
          event.error === 'not-allowed'
            ? t("vidgenie.voiceMicrophoneDenied")
            : t("vidgenie.voiceRecognitionError");
        setVoiceError(message);
      };

      recognition.onend = () => {
        browserRecognitionRef.current = null;
        setIsBrowserRecognitionActive(false);
        handleVoiceSessionEnded();
      };

      recognition.onresult = (event) => {
        if (!event.results?.length) return;
        let combined = '';
        for (let i = 0; i < event.results.length; i += 1) {
          combined += event.results[i][0].transcript;
        }
        const latest = event.results[event.results.length - 1];
        handleVoiceTranscription(combined, latest?.isFinal ?? false);
      };

      browserRecognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (err) {
      
      browserRecognitionRef.current = null;
      setIsBrowserRecognitionActive(false);
      setVoiceError(t("vidgenie.voiceRecognitionFailed"));
      return false;
    }
  }, [handleVoiceSessionEnded, handleVoiceSessionStarted, handleVoiceTranscription, speechRecognitionCtor, t]);

  const stopBrowserRecognition = useCallback(() => {
    const recognition = browserRecognitionRef.current;
    if (!recognition) return;

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch {
      /* ignore */
    }

    browserRecognitionRef.current = null;
    setIsBrowserRecognitionActive(false);
    handleVoiceSessionEnded();
  }, [handleVoiceSessionEnded]);

  const stopAllVoiceCapture = useCallback(() => {
    clearVoiceSessionTimeout();
    voiceSessionStartRef.current = null;
    voiceWordCountRef.current = 0;
    voiceWordLimitRef.current = VOICE_TRANSCRIPTION_WORD_LIMIT;
    voiceSessionTimeoutLabelRef.current = t("vidgenie.voiceTimeoutTenMinutes");
    if (isVoiceRecording || isVoiceInitializing) {
      stopVoiceTranscription();
    }
    stopBrowserRecognition();
  }, [
    clearVoiceSessionTimeout,
    isVoiceInitializing,
    isVoiceRecording,
    stopBrowserRecognition,
    stopVoiceTranscription,
  ]);

  useEffect(() => {
    stopAllVoiceCaptureRef.current = stopAllVoiceCapture;
    return () => {
      if (stopAllVoiceCaptureRef.current === stopAllVoiceCapture) {
        stopAllVoiceCaptureRef.current = () => {};
      }
    };
  }, [stopAllVoiceCapture]);

  const isVoiceBusy = isVoiceRecording || isVoiceInitializing || isBrowserRecognitionActive;

  useEffect(() => {
    if (generationMode === 'I2V' && isVoiceBusy) {
      stopAllVoiceCapture();
    }
  }, [generationMode, isVoiceBusy, stopAllVoiceCapture]);

  const handleToggleVoiceRecording = useCallback(() => {
    if (isVoiceBusy) {
      stopAllVoiceCapture();
      return;
    }

    if (!user) {
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceLoginRequired"));
      showLoginDialog();
      return;
    }

    const isEmailVerified = user?.isEmailVerified ?? user?.emailVerified ?? false;
    if (!isEmailVerified) {
      setVoiceStatusMessage(null);
      setVoiceError(t("vidgenie.voiceVerifyEmail"));
      return;
    }

    if (!isBrowserSpeechSupported && !isVoiceSupported) {
      setVoiceError(t("vidgenie.voiceNotSupported"));
      return;
    }

    const currentPrompt = promptText || '';
    voiceBasePromptRef.current =
      currentPrompt && !/\s$/.test(currentPrompt)
        ? `${currentPrompt} `
        : currentPrompt;
    voiceTranscriptRef.current = '';

    setVoiceError(null);
    setVoiceStatusMessage(t("vidgenie.voiceConnecting"));

    if (isBrowserSpeechSupported) {
      const started = startBrowserRecognition();
      if (!started && isVoiceSupported) {
        startVoiceTranscription();
      }
      return;
    }

    startVoiceTranscription();
  }, [
    isVoiceBusy,
    stopAllVoiceCapture,
    user,
    showLoginDialog,
    isBrowserSpeechSupported,
    isVoiceSupported,
    promptText,
    startBrowserRecognition,
    startVoiceTranscription,
    t,
  ]);

  useEffect(() => {
    if (realtimeVoiceError) {
      setVoiceError(realtimeVoiceError);
    }
  }, [realtimeVoiceError]);

  useEffect(() => {
    if (voiceStatusTimeoutRef.current) {
      clearTimeout(voiceStatusTimeoutRef.current);
      voiceStatusTimeoutRef.current = null;
    }
    if (!voiceStatusMessage) return;
    if (isVoiceBusy) return;
    voiceStatusTimeoutRef.current = setTimeout(() => {
      setVoiceStatusMessage(null);
      voiceStatusTimeoutRef.current = null;
    }, 2500);
    return () => {
      if (voiceStatusTimeoutRef.current) {
        clearTimeout(voiceStatusTimeoutRef.current);
        voiceStatusTimeoutRef.current = null;
      }
    };
  }, [voiceStatusMessage, isVoiceBusy]);

  useEffect(() => {
    return () => {
      if (voiceStatusTimeoutRef.current) {
        clearTimeout(voiceStatusTimeoutRef.current);
      }
      stopAllVoiceCapture();
    };
  }, [stopAllVoiceCapture]);

  // ─────────────────────────────────────────────────────────
  //  Fetch latest videos (once)
  // ─────────────────────────────────────────────────────────
  useEffect(() => { fetchLatestVideos(); }, []);

  const languageOptions = useMemo(() => {
    const autoLabel = t("vidgenie.languageAuto", {}, "Auto");
    return [
      { label: autoLabel, value: 'auto' },
      ...SUPPORTED_LANGUAGES.map((lang) => ({
        label: lang.name,
        value: lang.code,
      })),
    ];
  }, [t]);

  const defaultLanguageOption = useMemo(() => {
    const match = languageOptions.find((opt) => opt.value === language);
    return match || languageOptions[0];
  }, [languageOptions, language]);

  const [selectedLanguageOption, setSelectedLanguageOption] = useState(
    () => defaultLanguageOption
  );
  const [enableSubtitles, setEnableSubtitles] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState(() => ({
    ...DEFAULT_ADVANCED_OPTIONS,
  }));
  const [selectedCustomAdapterOperations, setSelectedCustomAdapterOperations] = useState([]);

  const updateAdvancedOption = useCallback((key, value) => {
    setAdvancedOptions((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      if (key === 'add_narrator_avatar' && value === true) {
        next.limit_single_narrator = true;
      }
      return next;
    });
  }, []);

  const toggleSelectedCustomAdapterOperation = useCallback((operationKey) => {
    setSelectedCustomAdapterOperations((prev) => (
      prev.includes(operationKey)
        ? prev.filter((key) => key !== operationKey)
        : [...prev, operationKey]
    ));
  }, []);

  const availableCustomAdapterOperations = useMemo(
    () => getAvailableCustomAdapterOperations(user?.custom_adapters),
    [user?.custom_adapters],
  );

  useEffect(() => {
    if (!availableCustomAdapterOperations.length) {
      setSelectedCustomAdapterOperations([]);
      return;
    }

    const availableKeys = new Set(availableCustomAdapterOperations.map((operation) => operation.key));
    setSelectedCustomAdapterOperations((prev) => prev.filter((key) => availableKeys.has(key)));
  }, [availableCustomAdapterOperations]);

  useEffect(() => {
    setSelectedLanguageOption((prev) => {
      const match = languageOptions.find((opt) => opt.value === prev?.value);
      return match || defaultLanguageOption;
    });
  }, [languageOptions, defaultLanguageOption]);

  // ─────────────────────────────────────────────────────────
  //  Aspect-ratio select
  // ─────────────────────────────────────────────────────────
  const aspectRatioOptions = useMemo(
    () => [
      { label: t("vidgenie.aspectRatioLandscape"), value: '16:9' },
      { label: t("vidgenie.aspectRatioPortrait"), value: '9:16' },
    ],
    [t]
  );
  const [selectedAspectRatioOption, setSelectedAspectRatioOption] = useState(() => {
    const stored = localStorage.getItem('defaultVidGPTAspectRatio');
    const found = aspectRatioOptions.find((o) => o.value === stored);
    return found || aspectRatioOptions[0];
  });
  useEffect(() => {
    setSelectedAspectRatioOption((prev) => {
      const stored = localStorage.getItem('defaultVidGPTAspectRatio');
      const targetValue = prev?.value || stored;
      const found = aspectRatioOptions.find((o) => o.value === targetValue);
      return found || aspectRatioOptions[0];
    });
  }, [aspectRatioOptions]);

  // ─────────────────────────────────────────────────────────
  //  Image-model select & styles
  // ─────────────────────────────────────────────────────────
  const expressImageModels = useMemo(() => {
    const availableModelMap = new Map(
      IMAGE_GENERAITON_MODEL_TYPES
        .filter((m) => {
          const modelPricing = IMAGE_MODEL_PRICES.find(
            (imp) => imp.key.toLowerCase() === m.key.toLowerCase()
          )?.prices || [];
          const hasAspect = modelPricing.find(
            (p) => p.aspectRatio === selectedAspectRatioOption.value
          );
          return m.isExpressModel && hasAspect;
        })
        .map((model) => [model.key, model])
    );

    return VIDGENIE_IMAGE_MODEL_ORDER
      .map((modelKey) => {
        const model = availableModelMap.get(modelKey);
        if (!model) return null;
        return {
          label: VIDGENIE_IMAGE_MODEL_LABELS[modelKey] || model.name,
          value: model.key,
          imageStyles: model.imageStyles,
        };
      })
      .filter(Boolean);
  }, [selectedAspectRatioOption.value]);

  const [selectedImageModel, setSelectedImageModel] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const found = expressImageModels.find((m) => m.value === saved);
    return found || expressImageModels[0];
  });

  const [selectedImageStyle, setSelectedImageStyle] = useState(() => {
    const saved = localStorage.getItem('defaultVidGPTImageGenerationModel');
    const foundModel = expressImageModels.find((m) => m.value === saved) || expressImageModels[0];
    if (foundModel?.imageStyles?.length) {
      const firstStyle = foundModel.imageStyles[0];
      return { label: firstStyle, value: firstStyle };
    }
    return null;
  });

  // When image-model changes, verify / reset style
  useEffect(() => {
    if (!selectedImageModel) return;
    const modelCfg = IMAGE_GENERAITON_MODEL_TYPES.find(
      (m) => m.key === selectedImageModel.value
    );
    if (modelCfg?.imageStyles?.length) {
      const styleExists = modelCfg.imageStyles.includes(selectedImageStyle?.value);
      if (!selectedImageStyle || !styleExists) {
        const firstStyle = modelCfg.imageStyles[0];
        setSelectedImageStyle({ label: firstStyle, value: firstStyle });
      }
    } else {
      setSelectedImageStyle(null);
    }
  }, [selectedImageModel]);

  // ─────────────────────────────────────────────────────────
  //  Video-model select
  // ─────────────────────────────────────────────────────────
  const expressVideoModels = useMemo(() => {
    const availableModelMap = new Map(
      VIDEO_GENERATION_MODEL_TYPES
        .filter(
          (m) =>
            m.isExpressModel &&
            m.supportedAspectRatios?.includes(selectedAspectRatioOption.value)
        )
        .map((model) => [model.key, model])
    );

    return VIDGENIE_VIDEO_MODEL_ORDER
      .map((modelKey) => {
        const model = availableModelMap.get(modelKey);
        if (!model) return null;
        return {
          label: VIDGENIE_VIDEO_MODEL_LABELS[modelKey] || model.name,
          value: model.key,
          ...model,
        };
      })
      .filter(Boolean);
  }, [selectedAspectRatioOption.value]);

  const imageListVideoModels = useMemo(() => {
    const availableModelMap = new Map(
      VIDEO_GENERATION_MODEL_TYPES
        .filter(
          (m) =>
            VIDGENIE_IMAGE_LIST_VIDEO_MODEL_ORDER.includes(m.key) &&
            m.supportedAspectRatios?.includes(selectedAspectRatioOption.value)
        )
        .map((model) => [model.key, model])
    );

    return VIDGENIE_IMAGE_LIST_VIDEO_MODEL_ORDER
      .map((modelKey) => {
        const model = availableModelMap.get(modelKey);
        if (!model) return null;
        return {
          label: VIDGENIE_VIDEO_MODEL_LABELS[modelKey] || model.name,
          value: model.key,
          ...model,
        };
      })
      .filter(Boolean);
  }, [selectedAspectRatioOption.value]);

  const [selectedVideoModel, setSelectedVideoModel] = useState(() => {
    const saved = localStorage.getItem(VIDGENIE_TEXT_VIDEO_MODEL_STORAGE_KEY);
    return findDefaultVideoModelOption(expressVideoModels, saved);
  });

  useEffect(() => {
    if (generationMode !== 'T2V' || !expressVideoModels.length) return;

    setSelectedVideoModel((prev) => {
      if (prev?.value) {
        const existing = expressVideoModels.find((m) => m.value === prev.value);
        if (existing) return existing;
      }

      const saved = localStorage.getItem(VIDGENIE_TEXT_VIDEO_MODEL_STORAGE_KEY);
      return findDefaultVideoModelOption(expressVideoModels, saved);
    });
  }, [generationMode, expressVideoModels]);

  useEffect(() => {
    if (generationMode !== 'I2V' || !imageListVideoModels.length) return;

    setSelectedVideoModel((prev) => {
      if (prev?.value) {
        const existing = imageListVideoModels.find((m) => m.value === prev.value);
        if (existing) return existing;
      }

      const saved = localStorage.getItem(VIDGENIE_IMAGE_LIST_VIDEO_MODEL_STORAGE_KEY);
      return findDefaultVideoModelOption(imageListVideoModels, saved);
    });
  }, [generationMode, imageListVideoModels]);

  // Video-model subtype (Pixverse or otherwise)
  const [selectedVideoModelSubType, setSelectedVideoModelSubType] = useState(null);
  useEffect(() => {
    if (selectedVideoModel?.value?.startsWith('PIXVERSE')) {
      if (!selectedVideoModelSubType) {
        const firstPixStyle = PIXVERRSE_VIDEO_STYLES[0];
        setSelectedVideoModelSubType({ label: firstPixStyle, value: firstPixStyle });
      }
    } else if (selectedVideoModel?.modelSubTypes?.length) {
      if (!selectedVideoModelSubType) {
        const firstSub = selectedVideoModel.modelSubTypes[0];
        setSelectedVideoModelSubType({ label: firstSub, value: firstSub });
      }
    } else {
      setSelectedVideoModelSubType(null);
    }
  }, [selectedVideoModel]);

  // Duration select
  const durationOptions = useMemo(
    () => [
      { label: t("vidgenie.duration10"), value: 10 },
      { label: t("vidgenie.duration30"), value: 30 },
      { label: t("vidgenie.duration60"), value: 60 },
      { label: t("vidgenie.duration90"), value: 90 },
      { label: t("vidgenie.duration120"), value: 120 },
      { label: t("vidgenie.duration180"), value: 180 },
    ],
    [t]
  );
  const [selectedDurationOption, setSelectedDurationOption] = useState(() => {
    const saved = parseInt(localStorage.getItem('defaultVidGPTDuration') || '', 10);
    const found = durationOptions.find((d) => d.value === saved);
    if (found) {
      return found;
    }
    const defaultOption = durationOptions.find((d) => d.value === 30);
    return defaultOption || durationOptions[0];
  });
  useEffect(() => {
    setSelectedDurationOption((prev) => {
      const saved = parseInt(localStorage.getItem('defaultVidGPTDuration') || '', 10);
      const targetValue = prev?.value || saved;
      const found = durationOptions.find((d) => d.value === targetValue);
      return found || durationOptions[0];
    });
  }, [durationOptions]);

  // ─────────────────────────────────────────────────────────
  //  Persist selections to localStorage
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedImageModel?.value) {
      localStorage.setItem('defaultVidGPTImageGenerationModel', selectedImageModel.value);
      localStorage.setItem('defaultImageModel', selectedImageModel.value);
    }
  }, [selectedImageModel]);

  useEffect(() => {
    if (selectedVideoModel?.value) {
      const storageKey = generationMode === 'I2V'
        ? VIDGENIE_IMAGE_LIST_VIDEO_MODEL_STORAGE_KEY
        : VIDGENIE_TEXT_VIDEO_MODEL_STORAGE_KEY;
      localStorage.setItem(storageKey, selectedVideoModel.value);
      localStorage.setItem('defaultVideoModel', selectedVideoModel.value);
    }
  }, [generationMode, selectedVideoModel]);

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

  // ─────────────────────────────────────────────────────────
  //  Credits / disable form
  // ─────────────────────────────────────────────────────────
  const [isDisabled, setIsDisabled] = useState(false);
  useEffect(() => {
    if (!user || (user.generationCredits < 300 && currentEnv !== 'docker')) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────
  //  CLEAN-UP ALL POLLS WHEN COMPONENT UNMOUNTS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
      if (assistantPollRef.current) clearInterval(assistantPollRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (assistantTimeoutRef.current) clearTimeout(assistantTimeoutRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  //  IMPORTANT: RESET & CLEAR POLLS WHENEVER `id` CHANGES
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Abort ALL polling
    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (assistantPollRef.current) clearInterval(assistantPollRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (assistantTimeoutRef.current) clearTimeout(assistantTimeoutRef.current);

    pollIntervalRef.current = null;
    assistantPollRef.current = null;
    pollTimeoutRef.current = null;
    assistantTimeoutRef.current = null;

    pollErrorCountRef.current = 0;
    assistantErrorCountRef.current = 0;
    pollDelayRef.current = DEFAULT_POLL;
    assistantDelayRef.current = DEFAULT_POLL;

    resetForm();

    if (currentPollRequestIdRef.current === id) return;

    if (id) {
      // Fetch session, and ONLY trigger polling if still pending
      getSessionDetails().then((data) => {
        if ((data?.videoGenerationPending || data?.expressGenerationPending) && !activeRequestIdRef.current) {
          pollGenerationStatus(id);
        } else {
          // clear any existing pending polls
          if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
          if (assistantPollRef.current) clearInterval(assistantPollRef.current);
        }
      });
    }
  }, [id]);

  // ─────────────────────────────────────────────────────────
  //  Handle download
  // ─────────────────────────────────────────────────────────
  async function handleDownloadVideo() {
    try {
      if (!videoLink) return;
      const headers = getHeaders();
      const response = await axios.get(videoLink, { responseType: 'blob', headers });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'generated_video.mp4');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      
    }
  }

  const publishQuickSession = async (formPayload) => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setIsPublishing(true);

    try {
      const normalizedTags =
        typeof formPayload.tags === 'string'
          ? formPayload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : Array.isArray(formPayload.tags)
            ? formPayload.tags.map((tag) => tag.trim()).filter(Boolean)
            : [];

      const sessionId = formPayload?.id || id;

      const aspectRatioForPublish =
        sessionDetails?.aspectRatio ||
        sessionDetails?.publishedAspectRatio ||
        selectedAspectRatioOption?.value ||
        null;

      const selectedLanguageValue =
        typeof selectedLanguageOption === 'string'
          ? selectedLanguageOption
          : selectedLanguageOption?.value ?? selectedLanguageOption?.label;
      const fallbackLanguageCode = resolveLanguageCode(selectedLanguageValue);

      const sessionLanguage =
        typeof formPayload.sessionLanguage === 'string' && formPayload.sessionLanguage.trim().length > 0
          ? formPayload.sessionLanguage.trim()
          : typeof sessionDetails?.sessionLanguage === 'string' &&
            sessionDetails.sessionLanguage.trim().length > 0
            ? sessionDetails.sessionLanguage.trim()
            : typeof sessionDetails?.language === 'string' &&
              sessionDetails.language.trim().length > 0
              ? sessionDetails.language.trim()
              : typeof fallbackLanguageCode === 'string' && fallbackLanguageCode.trim().length > 0
                ? fallbackLanguageCode.trim()
                : null;

      const languageString =
        typeof formPayload.languageString === 'string' && formPayload.languageString.trim().length > 0
          ? formPayload.languageString.trim()
          : typeof sessionDetails?.languageString === 'string' &&
            sessionDetails.languageString.trim().length > 0
            ? sessionDetails.languageString.trim()
            : selectedLanguageOption?.value &&
              selectedLanguageOption.value !== 'auto' &&
              typeof selectedLanguageOption?.label === 'string' &&
              selectedLanguageOption.label.trim().length > 0
              ? selectedLanguageOption.label.trim()
              : null;

      const publishPayload = {
        ...formPayload,
        id: sessionId,
        tags: normalizedTags,
        aspectRatio: aspectRatioForPublish,
        ispublishedVideo: true,
      };
      if (sessionLanguage) {
        publishPayload.sessionLanguage = sessionLanguage;
      }
      if (languageString) {
        publishPayload.languageString = languageString;
      }

      await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/publish_session`,
        publishPayload,
        headers
      );

      await getSessionDetails();
    } catch (error) {
      
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishClick = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    openAlertDialog(
      <PublishOptionsDialog
        onClose={closeAlertDialog}
        onSubmit={(payload) => {
          closeAlertDialog();
          publishQuickSession(payload);
        }}
        extraProps={{ sessionId: id }}
      />
    );
  };

  const handleUnpublishClick = async () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    const confirmation = window.confirm('Are you sure you want to unpublish this video?');
    if (!confirmation) {
      return;
    }

    setIsUnpublishing(true);

    try {
      await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/unpublish_session`,
        { sessionId: id },
        headers
      );

      await getSessionDetails();
    } catch (error) {
      
    } finally {
      setIsUnpublishing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Generation-status poller
  // ─────────────────────────────────────────────────────────
  const fetchDetailedGenerationStatus = async (requestId, headers) => {
    try {
      const { data } = await axios.get(
        `${VIDEO_STEP_API_BASE}/${encodeURIComponent(requestId)}/status_detailed`,
        headers
      );
      return data;
    } catch (error) {
      const statusCode = error?.response?.status;
      if (statusCode && statusCode !== 400 && statusCode !== 404) {
        throw error;
      }
      const query = new URLSearchParams({ request_id: requestId }).toString();
      const { data } = await axios.get(
        `${VIDEO_STATUS_DETAILED_ENDPOINT}?${query}`,
        headers
      );
      return data;
    }
  };

  const pollGenerationStatus = (requestId = activeRequestIdRef.current || id, immediate = false) => {
    if (!requestId) return;

    currentPollRequestIdRef.current = requestId;
    if (activeRequestIdRef.current !== requestId) {
      activeRequestIdRef.current = requestId;
      setActiveRequestId(requestId);
    }

    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    if (immediate) pollDelayRef.current = 0;

    const doPoll = async () => {
      if (currentPollRequestIdRef.current !== requestId) {
        // Abort polling: request has changed
        return;
      }

      let continuePolling = true;

      try {
        const headers = getHeaders();
        const data = await fetchDetailedGenerationStatus(requestId, headers);

        pollDelayRef.current = DEFAULT_POLL;
        if (data?.expressGenerationStatus) {
          setExpressGenerationStatus(data.expressGenerationStatus);
        }
        setGenerationStatusDetails(data);

        const isWaitingForApproval = isStepStatusWaitingForApproval(data);
        if (isWaitingForApproval) {
          continuePolling = false;
          setIsGenerationPending(false);
          setIsGenerationWaitingForApproval(true);
          return;
        }

        setIsGenerationWaitingForApproval(false);

        const videoActualLink = normalizeVideoUrl(extractVideoResultUrl(data));
        if (data.status === 'COMPLETED' && videoActualLink) {
          continuePolling = false;
          setIsGenerationPending(false);
          clearAdvancedVideoEditPendingSession(data.session_id || requestId);
          setVideoLink(videoActualLink);
        }

        if (isFailedGenerationStatus(data.status)) {
          continuePolling = false;
          setIsGenerationPending(false);
          setIsGenerationWaitingForApproval(false);
          clearAdvancedVideoEditPendingSession(data.session_id || requestId);
          const errorText = data.expressGenerationError || data.message || 'Video generation failed.';
          const normalizedError = errorText.startsWith('Video generation failed')
            ? errorText
            : `Video generation failed. ${errorText}`;
          setErrorMessage({ error: normalizedError });
        }
      } catch (err) {
        pollDelayRef.current = Math.min(
          pollDelayRef.current ? pollDelayRef.current * 2 : DEFAULT_POLL,
          MAX_BACKOFF
        );
        
      } finally {
        if (continuePolling && currentPollRequestIdRef.current === requestId) {
          const nextDelay = navigator.onLine ? pollDelayRef.current : OFFLINE_POLL;
          pollIntervalRef.current = setTimeout(doPoll, nextDelay);
        }
      }
    };

    doPoll();
  };

  const handleProcessNextStep = useCallback(async () => {
    const requestId = activeRequestIdRef.current || activeRequestId || id;
    if (!requestId || isProcessingNextStep) {
      return;
    }
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setIsProcessingNextStep(true);
    setErrorMessage(null);
    try {
      const { data } = await axios.post(
        `${VIDEO_STEP_API_BASE}/${encodeURIComponent(requestId)}/process_next`,
        {},
        headers
      );
      if (data?.expressGenerationStatus) {
        setExpressGenerationStatus(data.expressGenerationStatus);
      }
      setGenerationStatusDetails(data);
      setIsGenerationWaitingForApproval(false);
      setIsGenerationPending(true);
      pollGenerationStatus(requestId, true);
    } catch (error) {
      const apiMessage = error?.response?.data?.message || error?.message;
      setErrorMessage({ error: apiMessage || 'Unable to continue video generation.' });
    } finally {
      setIsProcessingNextStep(false);
    }
  }, [
    activeRequestId,
    id,
    isProcessingNextStep,
    showLoginDialog,
  ]);


  // ─────────────────────────────────────────────────────────
  //  Assistant-query poller
  // ─────────────────────────────────────────────────────────
  const startAssistantQueryPoll = () => {
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (assistantPollRef.current) clearInterval(assistantPollRef.current);
    assistantErrorCountRef.current = 0;

    assistantPollRef.current = setInterval(() => {
      axios
        .get(`${PROCESSOR_API_URL}/assistants/assistant_query_status?id=${id}`, headers)
        .then((res) => {
          assistantErrorCountRef.current = 0;
          const data = res.data;
          if (data.status === 'COMPLETED') {
            clearInterval(assistantPollRef.current);
            setSessionMessages(data.sessionDetails.sessionMessages);
            setIsAssistantQueryGenerating(false);
          }
        })
        .catch((err) => {
          
          assistantErrorCountRef.current += 1;
          if (assistantErrorCountRef.current >= 3) {
            clearInterval(assistantPollRef.current);
            setIsAssistantQueryGenerating(false);
          }
        });
    }, 1000);
  };

  // ─────────────────────────────────────────────────────────
  //  Submit assistant query
  // ─────────────────────────────────────────────────────────
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
        { id, query },
        headers
      )
      .then(() => startAssistantQueryPoll())
      .catch((err) => {
        
        setIsAssistantQueryGenerating(false);
      });
  };

  // Placeholder: fetchSessionImageLayers
  const getSessionImageLayers = () => {
    /* ... */
  };

  // ─────────────────────────────────────────────────────────
  //  Fetch session details
  // ─────────────────────────────────────────────────────────
  const getSessionDetails = async () => {

    try {
      const headers = getHeaders();
      const { data } = await axios.get(
        `${API_SERVER}/quick_session/details?sessionId=${id}`,
        headers
      );
      setSessionDetails(data);
      const forceAdvancedEditPoll = shouldForceAdvancedVideoEditPolling(id);

      if (data.inputPrompt) {
        updatePromptText(data.inputPrompt);
      }


      if (!activeRequestIdRef.current) {
        if (data.videoGenerationPending || data.expressGenerationPending || forceAdvancedEditPoll) {
          setIsGenerationPending(true);
          setShowResultDisplay(true);
          setExpressGenerationStatus(data.expressGenerationStatus);
          pollGenerationStatus(id);
        } else if (data.videoLink) {
          const linkCandidate = data.remoteURL?.length ? data.remoteURL : data.videoLink || null;
          setVideoLink(normalizeVideoUrl(linkCandidate));
          setIsGenerationPending(false);
          setShowResultDisplay(true);
          setExpressGenerationStatus(data.expressGenerationStatus);
          clearAdvancedVideoEditPendingSession(id);
        }
      }

      if (data.sessionMessages) setSessionMessages(data.sessionMessages);
    } catch (err) {
      
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Fetch latest videos
  // ─────────────────────────────────────────────────────────
  const fetchLatestVideos = async () => {
    /* ... */
  };

  // ─────────────────────────────────────────────────────────
  //  Toggle inline-playback
  // ─────────────────────────────────────────────────────────
  const handleToggleVideo = (videoId) => {
    setExpandedVideoId((prev) => (prev === videoId ? null : videoId));
  };

  // ─────────────────────────────────────────────────────────
  //  Image-list source controls
  // ─────────────────────────────────────────────────────────
  const updateImageListItem = useCallback((index, patch) => {
    setImageListItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }, []);

  const addImageListItem = useCallback(() => {
    setImageListItems((current) => [...current, createEmptyImageListItem()]);
  }, []);

  const removeImageListItem = useCallback((index) => {
    setImageListItems((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [createEmptyImageListItem()];
    });
  }, []);

  const moveImageListItem = useCallback((fromIndex, toIndex) => {
    setImageListItems((current) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return current;
      }
      const next = [...current];
      const [movedItem] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedItem);
      return next;
    });
  }, []);

  const uploadImageListFile = useCallback(async (index, file) => {
    if (!file || uploadingImageIndex !== null) {
      return;
    }
    if (!file.type?.startsWith('image/')) {
      setImageUploadError('Upload an image file.');
      return;
    }
    if (!user) {
      showLoginDialog();
      return;
    }
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }

    setUploadingImageIndex(index);
    setImageUploadError('');
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const { data } = await axios.post(
        `${VIDEO_API_BASE}/upload_image_data`,
        { input: { image_data: [imageDataUrl] } },
        headers
      );
      const uploadedUrl = Array.isArray(data?.image_urls)
        ? data.image_urls.find((url) => typeof url === 'string' && url.trim())
        : '';
      if (!uploadedUrl) {
        throw new Error('Upload did not return an image URL.');
      }
      setImageListItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                image_url: uploadedUrl.trim(),
                title: item.title.trim() ? item.title : titleFromFileName(file.name),
              }
            : item
        )
      );
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setImageUploadError(apiMessage || 'Image upload failed.');
    } finally {
      setUploadingImageIndex(null);
    }
  }, [showLoginDialog, uploadingImageIndex, user]);

  const handleImageListUploadInput = useCallback((index, event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) {
      uploadImageListFile(index, file).catch(() => undefined);
    }
  }, [uploadImageListFile]);

  const handleImageListUploadDrop = useCallback((index, event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = Array.from(event.dataTransfer.files || []).find((candidate) =>
      candidate.type?.startsWith('image/')
    );
    if (file) {
      uploadImageListFile(index, file).catch(() => undefined);
      return;
    }
    setImageUploadError('Drop an image file.');
  }, [uploadImageListFile]);

  // ─────────────────────────────────────────────────────────
  //  Submit the text-to-video request
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showLoginDialog();
      return;
    }
    const headers = getHeaders();
    if (!headers) {
      showLoginDialog();
      return;
    }
    if (!id) return;
    if (isVoiceBusy) {
      stopAllVoiceCapture();
    }

    if (isJsonMode) {
      const jsonRequest = buildJsonModeRequest(jsonInputText, id, generationMode);
      if (jsonRequest.error) {
        setJsonValidationMessage(jsonRequest.error);
        setErrorMessage(null);
        setShowResultDisplay(false);
        return;
      }

      if (jsonRequest.normalizedJson && jsonRequest.normalizedJson !== jsonInputText.trim()) {
        setJsonInputText(jsonRequest.normalizedJson);
      }
      setJsonValidationMessage('');
      setIsJsonRequestExpanded(false);
      setJsonCopyStatus('');
      setErrorMessage(null);
      setIsSubmitting(true);
      setIsGenerationPending(true);
      setShowResultDisplay(true);
      setVideoLink(null);
      setExpressGenerationStatus(null);
      setGenerationStatusDetails(null);
      setIsGenerationWaitingForApproval(false);
      setActiveRequestId(null);
      activeRequestIdRef.current = null;

      try {
        const { data } = await axios.post(
          getStepGenerationEndpoint(jsonRequest.endpoint),
          attachStepGenerationInput(jsonRequest.payload, generationStepMode),
          headers
        );
        const requestId = data?.request_id || data?.session_id || data?.sessionID;
        if (!requestId) {
          throw new Error('Missing request id in response.');
        }
        setActiveRequestId(requestId);
        activeRequestIdRef.current = requestId;
        pollGenerationStatus(requestId);
      } catch (err) {
        const apiMessage = err?.response?.data?.message || err?.message;
        setErrorMessage({ error: apiMessage || 'An unexpected error occurred.' });
        setIsGenerationPending(false);
        setIsGenerationWaitingForApproval(false);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const isTextToVideo = generationMode === 'T2V';
    const trimmedPromptText = promptText.trim();
    if (trimmedPromptText.length > VIDGENIE_PROMPT_MAX_LENGTH) {
      setErrorMessage({
        error: t(
          "vidgenie.promptTooLong",
          { max: VIDGENIE_PROMPT_MAX_LENGTH },
          "Prompt must be {max} characters or fewer."
        ),
      });
      return;
    }
    if (isTextToVideo && !trimmedPromptText) {
      setErrorMessage({ error: 'Please enter some text before submitting.' });
      return;
    }
    const normalizedImageListItems = imageListItems
      .map((item) => ({
        image_url: item.image_url.trim(),
        title: item.title.trim(),
        image_text: item.image_text.trim(),
      }))
      .filter((item) => item.image_url);

    const invalidImageUrl = normalizedImageListItems.find((item) => !isHttpUrl(item.image_url));
    if (!isTextToVideo && normalizedImageListItems.length === 0) {
      setErrorMessage({ error: 'Please add at least one image URL or upload an image.' });
      return;
    }
    if (!isTextToVideo && invalidImageUrl) {
      setErrorMessage({ error: 'Image URLs must be valid http(s) URLs.' });
      return;
    }
    if (isTextToVideo && !selectedVideoModel?.value) {
      setErrorMessage({ error: 'Please select a video model before submitting.' });
      return;
    }
    const advancedRequestConfiguration = buildAdvancedRequestConfiguration({
      isTextToVideo,
      advancedOptions,
      customAdapters: user?.custom_adapters,
      selectedCustomAdapterOperations,
    });
    if (advancedRequestConfiguration.error) {
      setErrorMessage({ error: advancedRequestConfiguration.error });
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setIsGenerationPending(true);
    setShowResultDisplay(true);
    setVideoLink(null);
    setExpressGenerationStatus(null);
    setGenerationStatusDetails(null);
    setIsGenerationWaitingForApproval(false);
    setActiveRequestId(null);
    activeRequestIdRef.current = null;

    const requestInput = {};
    if (isTextToVideo) {
      requestInput.prompt = trimmedPromptText;
      requestInput.image_model = selectedImageModel.value;
      requestInput.video_model = selectedVideoModel.value;
      requestInput.duration = selectedDurationOption.value;
      requestInput.tone = advancedRequestConfiguration.input.tone || 'grounded';
      requestInput.aspect_ratio = selectedAspectRatioOption.value;
      if (selectedVideoModelSubType?.value) {
        requestInput.video_model_sub_type = selectedVideoModelSubType.value;
      }
      if (selectedImageStyle?.value) {
        requestInput.image_style = selectedImageStyle.value;
      }
    } else {
      requestInput.aspect_ratio = selectedAspectRatioOption.value;
    }

    const selectedLanguageValue =
      typeof selectedLanguageOption === 'string'
        ? selectedLanguageOption
        : selectedLanguageOption?.value ?? selectedLanguageOption?.label;
    requestInput.language = resolveLanguageCode(selectedLanguageValue);
    if (!enableSubtitles) {
      requestInput.enable_subtitles = false;
    }
    Object.assign(requestInput, advancedRequestConfiguration.input);
    Object.assign(requestInput, buildStepGenerationInput(generationStepMode));

    try {
      if (!isTextToVideo) {
        const imageItemMetadata = Array.isArray(advancedRequestConfiguration.imageItemMetadata)
          ? advancedRequestConfiguration.imageItemMetadata
          : null;
        requestInput.image_urls = normalizedImageListItems.map((item, index) => {
          const itemMetadata = imageItemMetadata?.[index];
          const imagePayload = {};
          if (isPlainObject(itemMetadata) && Object.keys(itemMetadata).length > 0) {
            Object.assign(imagePayload, itemMetadata);
          }
          imagePayload.image_url = item.image_url;
          if (item.title) {
            imagePayload.title = item.title;
          }
          if (item.image_text) {
            imagePayload.image_text = item.image_text;
          }
          return imagePayload;
        });
        if (selectedVideoModel?.value) {
          requestInput.video_model = selectedVideoModel.value;
        }
        if (trimmedPromptText) {
          requestInput.prompt = trimmedPromptText;
        }
      }

      const payload = {
        input: { ...requestInput, session_id: id },
        ...advancedRequestConfiguration.root,
      };
      const endpoint = isTextToVideo
        ? `${VIDEO_STEP_API_BASE}/text_to_video`
        : `${VIDEO_STEP_API_BASE}/image_to_video`;
      const { data } = await axios.post(endpoint, payload, headers);
      const requestId = data?.request_id || data?.session_id || data?.sessionID;
      if (!requestId) {
        throw new Error('Missing request id in response.');
      }
      setActiveRequestId(requestId);
      activeRequestIdRef.current = requestId;
      pollGenerationStatus(requestId);
    } catch (err) {
      
      const apiMessage = err?.response?.data?.message;
      setErrorMessage({ error: apiMessage || 'An unexpected error occurred.' });
      setIsGenerationPending(false);
      setIsGenerationWaitingForApproval(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Reset the entire form
  // ─────────────────────────────────────────────────────────
  const resetForm = () => {
    stopAllVoiceCapture();
    voiceBasePromptRef.current = '';
    voiceTranscriptRef.current = '';
    setVoiceStatusMessage(null);
    setVoiceError(null);
    setPromptText('');
    setShowResultDisplay(false);
    setErrorMessage(null);
    setVideoLink(null);
    setExpressGenerationStatus(null);
    setGenerationStatusDetails(null);
    setIsGenerationPending(false);
    setIsGenerationWaitingForApproval(false);
    setIsProcessingNextStep(false);
    setIsSubmitting(false);
    setActiveRequestId(null);
    activeRequestIdRef.current = null;
    currentPollRequestIdRef.current = null;
    setSessionMessages([]);
    setIsAssistantQueryGenerating(false);   // ⬅️ NEW
    setIsPaused(false);                     // ⬅️ NEW
    setSessionDetails(null);                // ⬅️ NEW
    setImageListItems([createEmptyImageListItem()]);
    setUploadingImageIndex(null);
    setImageUploadError('');
    setEnableSubtitles(false);
    setGenerationStepMode(GENERATION_STEP_MODE_ONE_STEP);
    setSelectedImageStyle(null);
    setIsAdvancedOpen(false);
    setAdvancedOptions({ ...DEFAULT_ADVANCED_OPTIONS });
    setSelectedCustomAdapterOperations([]);
    setPricingDetailsDisplay(false);        // ⬅️ NEW
    setSelectedVideoModelSubType(null);     // ⬅️ NEW
    setExpandedVideoId(null);               // ⬅️ NEW
    setIsJsonInputDirty(false);
    setJsonValidationMessage('');
  };


  // ─────────────────────────────────────────────────────────
  //  Utility: view in Studio
  // ─────────────────────────────────────────────────────────
  const viewInStudio = () => navigate(`/video/${id}`);

  const handleGenerationModeChange = (mode) => {
    setGenerationMode(mode);
    if (isJsonMode) {
      setIsJsonInputDirty(false);
      setJsonValidationMessage('');
      setErrorMessage(null);
    }
  };

  const toggleJsonMode = () => {
    if (isVoiceBusy) {
      stopAllVoiceCapture();
    }
    setJsonValidationMessage('');
    setErrorMessage(null);
    setIsJsonMode((enabled) => !enabled);
  };

  const handleAdvancedVideoEditAccepted = useCallback((requestInfo) => {
    const nextSessionId = requestInfo?.sessionId || requestInfo?.requestId;
    const nextRequestId = requestInfo?.requestId || nextSessionId;
    closeAlertDialog();

    if (!nextRequestId) {
      return;
    }

    setErrorMessage(null);
    setVideoLink(null);
    setShowResultDisplay(true);
    setIsGenerationPending(requestInfo?.status !== 'CANCELLED');
    setActiveRequestId(nextRequestId);
    activeRequestIdRef.current = nextRequestId;

    if (nextSessionId && nextSessionId !== id) {
      setAdvancedVideoEditPendingSession(nextSessionId);
      navigate(`/vidgenie/${nextSessionId}`);
      return;
    }

    pollGenerationStatus(nextRequestId, true);
  }, [closeAlertDialog, id, navigate]);

  const openAdvancedVideoEditDialog = useCallback(() => {
    openAlertDialog(
      <VideoEditAdvancedDialog
        sessionId={id}
        currentSession={sessionDetails}
        onClose={closeAlertDialog}
        onRequestAccepted={handleAdvancedVideoEditAccepted}
      />,
      undefined,
      true,
      { hideBorder: true, hideCloseButton: true, centerContent: true }
    );
  }, [closeAlertDialog, handleAdvancedVideoEditAccepted, id, openAlertDialog, sessionDetails]);

  // ─────────────────────────────────────────────────────────
  //  Placeholder: purchase credits
  // ─────────────────────────────────────────────────────────
  const purchaseCreditsForUser = () => { /* ... */ };

  // ─────────────────────────────────────────────────────────
  //  Pricing info
  // ─────────────────────────────────────────────────────────
  const [pricingDetailsDisplay, setPricingDetailsDisplay] = useState(false);
  const togglePricingDetailsDisplay = () => setPricingDetailsDisplay(!pricingDetailsDisplay);

  const selectedVideoModelKey = selectedVideoModel?.value || '';
  const hasSelectedCustomAdapters = selectedCustomAdapterOperations.length > 0;
  const creditsPerSecondVideo = useMemo(() => {
    return getExpressVideoCreditsPerSecond(selectedVideoModelKey) ?? (generationMode === 'I2V' ? 60 : 30);
  }, [generationMode, selectedVideoModelKey]);


  const expectedCreditsPerSecond = useMemo(() => {
    return creditsPerSecondVideo;
  }, [creditsPerSecondVideo]);

  const pricingInfoDisplay = (
    <div className="relative">
      <div
        className={`flex items-center gap-1 font-medium text-sm cursor-pointer select-none ${colorMode === 'dark' ? 'text-neutral-100' : 'text-slate-700'}`}
        onClick={togglePricingDetailsDisplay}
      >
        {isJsonMode || currentEnv === 'docker' || hasSelectedCustomAdapters ? (
          <div>{t("vidgenie.pricingApiCharge")}</div>
        ) : (
          <div className="inline-flex items-center">
            {t("vidgenie.pricingCreditsPerSecond", { credits: expectedCreditsPerSecond })}
          </div>
        )}
        <FaChevronCircleDown
          className={`inline-flex ml-1 transition-transform duration-300 ${pricingDetailsDisplay ? 'rotate-180' : ''}`}
        />
      </div>
      {pricingDetailsDisplay && (
        <div className={`mt-2 text-sm text-left ${mutedText} transition-opacity duration-300`}>
          {isJsonMode || currentEnv === 'docker' || hasSelectedCustomAdapters ? (
            <div>{t("vidgenie.pricingApiCharge")}</div>
          ) : (
            <>
              <div>{t("vidgenie.pricingTotalShown")}</div>
              <div>{t("vidgenie.pricingExample", { credits: 60 * creditsPerSecondVideo })}</div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const jsonModeLanguageValue =
    typeof selectedLanguageOption === 'string'
      ? selectedLanguageOption
      : selectedLanguageOption?.value ?? selectedLanguageOption?.label;
  const jsonModeDefaultInput = useMemo(() => (
    buildDefaultJsonModeInput({
      mode: generationMode,
      imageModel: selectedImageModel?.value || 'GPTIMAGE2',
      videoModel: selectedVideoModel?.value || 'RUNWAYML',
      duration: selectedDurationOption?.value || 30,
      aspectRatio: selectedAspectRatioOption?.value || '16:9',
      language: resolveLanguageCode(jsonModeLanguageValue, 'en'),
      enableSubtitles,
    })
  ), [
    enableSubtitles,
    generationMode,
    jsonModeLanguageValue,
    selectedAspectRatioOption?.value,
    selectedDurationOption?.value,
    selectedImageModel?.value,
    selectedVideoModel?.value,
  ]);

  useEffect(() => {
    if (!isJsonInputDirty) {
      setJsonInputText(jsonModeDefaultInput);
    }
  }, [isJsonInputDirty, jsonModeDefaultInput]);

  const jsonModeValidation = useMemo(() => {
    if (!isJsonMode) {
      return { error: '' };
    }
    return buildJsonModeRequest(jsonInputText, id, generationMode);
  }, [generationMode, id, isJsonMode, jsonInputText]);

  useEffect(() => {
    const normalizedJson = jsonModeValidation.normalizedJson;
    if (!isJsonMode || !normalizedJson || normalizedJson === jsonInputText.trim()) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setJsonInputText((current) => {
        const currentValidation = buildJsonModeRequest(current, id, generationMode);
        return currentValidation.normalizedJson || current;
      });
      setJsonValidationMessage('');
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [generationMode, id, isJsonMode, jsonInputText, jsonModeValidation.normalizedJson]);

  const jsonRequestDisplayText = jsonModeValidation.normalizedJson || jsonInputText;
  const copyJsonRequestToClipboard = useCallback(async () => {
    if (!jsonRequestDisplayText.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonRequestDisplayText);
      setJsonCopyStatus('Copied');
    } catch {
      setJsonCopyStatus('Copy failed');
    }
  }, [jsonRequestDisplayText]);

  useEffect(() => {
    if (!jsonCopyStatus) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setJsonCopyStatus(''), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [jsonCopyStatus]);

  const jsonEditorErrorMessage = isJsonMode ? (jsonModeValidation.error || '') : '';
  const jsonEditorAnnotations = useMemo(() => {
    if (!jsonEditorErrorMessage) {
      return [];
    }

    return [
      {
        row: Number.isFinite(jsonModeValidation.row) ? jsonModeValidation.row : 0,
        column: Number.isFinite(jsonModeValidation.column) ? jsonModeValidation.column : 0,
        type: 'error',
        text: jsonEditorErrorMessage,
      },
    ];
  }, [
    jsonEditorErrorMessage,
    jsonModeValidation.column,
    jsonModeValidation.row,
  ]);

  // ─────────────────────────────────────────────────────────
  //  Render-state helpers
  // ─────────────────────────────────────────────────────────
  const renderState = useMemo(() => {
    if (isGenerationPending || isGenerationWaitingForApproval) return 'pending';
    if (videoLink) return 'complete';
    return 'idle';
  }, [isGenerationPending, isGenerationWaitingForApproval, videoLink]);
  const shouldCollapseJsonEditorForProgress =
    isJsonMode && showResultDisplay && (isGenerationPending || isGenerationWaitingForApproval || Boolean(videoLink));

  const isFormDisabled = renderState !== 'idle' || isDisabled;
  const isModeToggleDisabled = renderState === 'pending' || isSubmitting;
  const isGenerationActionDisabled = isFormDisabled || isSubmitting || Boolean(jsonEditorErrorMessage);
  const jsonModeButtonLabel = isJsonMode
    ? t("vidgenie.wizardMode", {}, "Wizard mode")
    : t("vidgenie.jsonMode", {}, "JSON mode");
  const dateNowStr = new Date().toISOString().replace(/[:.]/g, '-');
  const toggleShell =
    colorMode === 'dark'
      ? 'bg-[#0b1226] ring-1 ring-white/10'
      : 'bg-white ring-1 ring-slate-200';
  const toggleActive =
    colorMode === 'dark'
      ? 'bg-indigo-500 text-white shadow'
      : 'bg-indigo-600 text-white shadow';
  const toggleInactive =
    colorMode === 'dark'
      ? 'text-slate-300 hover:text-white hover:bg-white/5'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  const imagePickerShell =
    colorMode === 'dark'
      ? 'bg-gray-950/90 text-white ring-white/10'
      : 'bg-white text-slate-900 ring-slate-200';
  const advancedInputClasses = `
    w-full rounded-lg px-3 py-2 text-sm outline-none ring-1 transition
    ${colorMode === 'dark'
      ? 'bg-[#0b1224] text-slate-100 ring-white/10 focus:ring-indigo-400/60 placeholder:text-slate-500'
      : 'bg-white text-slate-900 ring-slate-200 focus:ring-indigo-500/50 placeholder:text-slate-400'
    }
  `;
  const advancedLabelClasses = `block text-[11px] font-medium mb-1 ${mutedText}`;
  const advancedSectionBorder = colorMode === 'dark' ? 'border-white/10' : 'border-slate-200';
  const advancedRowBg = colorMode === 'dark' ? 'bg-white/[0.03]' : 'bg-slate-50';
  const stepModeShell =
    colorMode === 'dark'
      ? 'bg-white/[0.03] ring-white/10'
      : 'bg-slate-50 ring-slate-200';
  const stepModeSelectedClasses =
    colorMode === 'dark'
      ? 'bg-white/10 text-slate-100 ring-white/10'
      : 'bg-white text-slate-900 ring-slate-200 shadow-sm';
  const stepModeInactiveClasses =
    colorMode === 'dark'
      ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
      : 'text-slate-500 hover:bg-white hover:text-slate-800';
  const secondaryActionClasses =
    colorMode === 'dark'
      ? 'bg-white/[0.03] text-slate-200 ring-white/10 hover:bg-white/[0.06]'
      : 'bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white';
  const headerTitle = isJsonMode
    ? generationMode === 'I2V'
      ? t("vidgenie.titleJsonImageListMode", {}, "JSON image-list video request")
      : t("vidgenie.titleJsonTextMode", {}, "JSON text video request")
    : generationMode === 'T2V'
      ? t("vidgenie.titleTextToVideo")
      : t("vidgenie.titleImageListToVideo");
  const renderGenerationControlsRow = ({ showAdvancedToggle = true, className = '' } = {}) => (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex items-center gap-1 rounded-xl p-1 text-sm ring-1 ${stepModeShell}`}
          role="radiogroup"
          aria-label="Generation steps"
        >
          {VIDGENIE_STEP_MODE_OPTIONS.map((option) => {
            const isSelected = generationStepMode === option.value;
            return (
              <label
                key={option.value}
                title={option.description}
                className={`
                  inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 font-medium ring-1 ring-transparent transition
                  ${isSelected ? stepModeSelectedClasses : stepModeInactiveClasses}
                  ${isFormDisabled ? 'cursor-not-allowed opacity-60' : ''}
                `}
              >
                <input
                  type="radio"
                  name="generationStepMode"
                  value={option.value}
                  checked={isSelected}
                  disabled={isFormDisabled}
                  onChange={() => setGenerationStepMode(option.value)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>

        {showAdvancedToggle && (
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((open) => !open)}
            aria-expanded={isAdvancedOpen}
            className={`
              inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ring-1 transition
              ${secondaryActionClasses}
            `}
          >
            <span>Advanced</span>
            {isAdvancedOpen ? (
              <FaChevronDown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <FaChevronRight className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {!shouldCollapseJsonEditorForProgress && (
        <PrimaryPublicButton
          onClick={handleSubmit}
          isDisabled={isGenerationActionDisabled}
          extraClasses="!m-0 !min-h-9 !rounded-xl !px-5 !py-2 text-sm shadow-sm hover:shadow-md transition active:scale-[0.98]"
        >
          {isSubmitting ? t("vidgenie.submitting") : t("vidgenie.submit")}
        </PrimaryPublicButton>
      )}
    </div>
  );
  if (!sessionDetails) {
    return <VidgenieSkeletonLoader />;
  }

  // ─────────────────────────────────────────────────────────
  //  JSX
  // ─────────────────────────────────────────────────────────
  return (
    <div className="mt-5 relative max-w-6xl mx-auto px-3 sm:px-6">
      {/* ───────── HEADER ───────── */}
      <div
        className={`
          ${surfaceCard}
          relative flex flex-col p-6 sm:p-8 mt-6 rounded-2xl transition-shadow duration-300 hover:shadow-xl
        `}
      >
        {/* 1️⃣ Heading */}
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <div className="flex-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <div className="text-xl sm:text-2xl font-semibold tracking-tight">
              {headerTitle}
            </div>
            <div className={`inline-flex items-center gap-1 rounded-full p-1 ${toggleShell}`}>
              <button
                type="button"
                disabled={isModeToggleDisabled}
                onClick={() => handleGenerationModeChange('T2V')}
                aria-pressed={generationMode === 'T2V'}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${generationMode === 'T2V' ? toggleActive : toggleInactive}`}
              >
                T2V
              </button>
              <button
                type="button"
                disabled={isModeToggleDisabled}
                onClick={() => handleGenerationModeChange('I2V')}
                aria-pressed={generationMode === 'I2V'}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${generationMode === 'I2V' ? toggleActive : toggleInactive}`}
              >
                I2V
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end sm:ml-auto">
            <div
              className={`
                px-3 py-1.5 rounded-full text-center transition
                ${colorMode === 'dark'
                  ? 'bg-[#111a2f] text-slate-100 ring-1 ring-[#1f2a3d]'
                  : 'bg-white text-slate-900 ring-1 ring-slate-200'
                }
              `}
            >
              {pricingInfoDisplay}
            </div>

            {sessionDetails?.isExpressGeneration && (
              <>
                <span
                  className={`
                    inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold
                    ${colorMode === 'dark'
                      ? 'bg-cyan-400/12 text-cyan-200 ring-1 ring-cyan-300/25'
                      : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
                    }
                  `}
                >
                  Express
                </span>
                <button
                  type="button"
                  onClick={openAdvancedVideoEditDialog}
                  title="Advanced video edits"
                  aria-label="Advanced video edits"
                  className={`
                    inline-flex h-9 w-9 items-center justify-center rounded-full transition
                    ${colorMode === 'dark'
                      ? 'border border-white/10 text-slate-100 hover:border-white/20 hover:bg-white/5'
                      : 'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <FaCog />
                </button>
              </>
            )}

            {renderState !== 'complete' && (
              <button
                type="button"
                onClick={toggleJsonMode}
                disabled={isModeToggleDisabled}
                aria-pressed={isJsonMode}
                className={`
                  inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5 rounded-full
                  transition-all duration-200
                  ${isJsonMode
                    ? toggleActive
                    : colorMode === 'dark'
                      ? 'border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-[0.98]'
                      : 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]'
                  }
                  ${isModeToggleDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                {jsonModeButtonLabel}
              </button>
            )}

            {renderState === 'pending' && (
              <div
                className="flex items-center gap-1 text-xs sm:text-sm"
                aria-live="polite"
                role="status"
              >
                <FaSpinner className="animate-spin h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("vidgenie.renderingShort")}</span>
                <span className="sr-only">{t("vidgenie.renderingAria")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile action buttons (complete state) */}
        {renderState === 'complete' && sessionDetails && (
          <div className="flex justify-center gap-2 mt-4 mb-2">
            <PrimaryPublicButton
              className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
              onClick={viewInStudio}
            >
              View&nbsp;in&nbsp;Studio
            </PrimaryPublicButton>
            <PrimaryPublicButton
              extraClasses="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
              onClick={
                sessionDetails.ispublishedVideo
                  ? handleUnpublishClick
                  : handlePublishClick
              }
              isPending={
                sessionDetails.ispublishedVideo ? isUnpublishing : isPublishing
              }
              isDisabled={isPublishing || isUnpublishing}
            >
              {sessionDetails.ispublishedVideo
                ? isUnpublishing
                  ? t("vidgenie.unpublishing")
                  : t("vidgenie.unpublish")
                : isPublishing
                  ? t("vidgenie.publishing")
                  : t("vidgenie.publish")}
            </PrimaryPublicButton>
            <PrimaryPublicButton className="px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98]">
              <a
                href={videoLink}
                download={`Rendition_${dateNowStr}.mp4`}
                className="underline"
              >
                {t("common.download")}
              </a>
            </PrimaryPublicButton>
          </div>
        )}

        {!isJsonMode && (
          <>
        {/* 2️⃣ Options grid */}
        <div className="w-full mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Aspect Ratio */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedAspectRatioOption}
                  onChange={setSelectedAspectRatioOption}
                  options={aspectRatioOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.aspectRatio")}</p>
            </div>

            {generationMode === 'T2V' && (
              <>
                {/* Image Model */}
                <div className="group w-full">
                  <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                    <SingleSelect
                      value={selectedImageModel}
                      onChange={setSelectedImageModel}
                      options={expressImageModels}
                      className="w-full"
                    />
                  </div>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.imageModel")}</p>
                </div>

                {/* Image Style (conditional) */}
                {(() => {
                  const modelCfg = IMAGE_GENERAITON_MODEL_TYPES.find(
                    (m) => m.key === selectedImageModel?.value
                  );
                  if (modelCfg?.imageStyles) {
                    return (
                      <div className="group w-full">
                        <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                          <SingleSelect
                            value={selectedImageStyle}
                            onChange={setSelectedImageStyle}
                            options={modelCfg.imageStyles.map((s) => ({ label: s, value: s }))}
                            className="w-full"
                          />
                        </div>
                        <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.imageStyle")}</p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Video Model */}
                <div className="group w-full">
                  <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                    <SingleSelect
                      value={selectedVideoModel}
                      onChange={setSelectedVideoModel}
                      options={expressVideoModels}
                      className="w-full"
                    />
                  </div>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.videoModel")}</p>
                </div>

                {/* Pixverse Style */}
                {selectedVideoModel?.value?.startsWith('PIXVERSE') && selectedVideoModelSubType && (
                  <div className="group w-full">
                    <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                      <SingleSelect
                        value={selectedVideoModelSubType}
                        onChange={setSelectedVideoModelSubType}
                      options={PIXVERRSE_VIDEO_STYLES.map((s) => ({ label: s, value: s }))}
                      className="w-full"
                    />
                  </div>
                    <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.pixverseStyle")}</p>
                  </div>
                )}

                {/* Generic Sub-type */}
                {selectedVideoModel?.modelSubTypes?.length && selectedVideoModelSubType && (
                  <div className="group w-full">
                    <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                      <SingleSelect
                        value={selectedVideoModelSubType}
                        onChange={setSelectedVideoModelSubType}
                      options={selectedVideoModel.modelSubTypes.map((s) => ({ label: s, value: s }))}
                      className="w-full"
                    />
                  </div>
                    <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.videoSubType")}</p>
                  </div>
                )}
              </>
            )}

            {generationMode === 'I2V' && (
              <div className="group w-full">
                <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                  <SingleSelect
                    value={selectedVideoModel}
                    onChange={setSelectedVideoModel}
                    options={imageListVideoModels}
                    className="w-full"
                  />
                </div>
                <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.videoModel")}</p>
              </div>
            )}

            {/* Duration */}
            {generationMode === 'T2V' && (
              <div className="group w-full">
                <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                  <SingleSelect
                    value={selectedDurationOption}
                    onChange={setSelectedDurationOption}
                    options={durationOptions}
                    className="w-full"
                  />
                </div>
                <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.maxDuration")}</p>
              </div>
            )}

            {/* Language */}
            <div className="group w-full">
              <div className={`w-full md:w-full ${controlShell} rounded-xl p-2 transition-transform duration-200 group-hover:translate-y-[-1px] relative z-10 focus-within:z-50 group-hover:z-50`}>
                <SingleSelect
                  value={selectedLanguageOption}
                  onChange={setSelectedLanguageOption}
                  options={languageOptions}
                  className="w-full"
                />
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>{t("vidgenie.languageLabel", {}, "Language")}</p>
            </div>

            <div className="group w-full">
              <label
                className={`flex items-start gap-3 ${controlShell} rounded-xl p-3 transition-transform duration-200 group-hover:translate-y-[-1px] cursor-pointer`}
              >
                <input
                  type="checkbox"
                  checked={enableSubtitles}
                  onChange={(e) => setEnableSubtitles(e.target.checked)}
                  disabled={isFormDisabled}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {t("vidgenie.enableSubtitles")}
                  </div>
                  <p className={`mt-1 text-[11px] ${mutedText}`}>
                    {t("vidgenie.enableSubtitlesHelp")}
                  </p>
                </div>
              </label>
            </div>

          </div>
        </div>

        <div className={`mt-4 border-t ${advancedSectionBorder} pt-3`}>
          {renderGenerationControlsRow({ showAdvancedToggle: true })}

          {isAdvancedOpen && (
            <div className="mt-3 space-y-5">
              {generationMode === 'T2V' && (
                <div>
                  <label className={advancedLabelClasses}>Tone</label>
                  <select
                    value={advancedOptions.tone}
                    onChange={(event) => updateAdvancedOption('tone', event.target.value)}
                    disabled={isFormDisabled}
                    className={advancedInputClasses}
                  >
                    {VIDGENIE_TONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {generationMode === 'I2V' && (
                <div className={`border-t ${advancedSectionBorder} pt-4 space-y-3`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={`flex items-start gap-3 rounded-xl px-3 py-3 ${advancedRowBg}`}>
                      <input
                        type="checkbox"
                        checked={advancedOptions.limit_single_narrator || advancedOptions.add_narrator_avatar}
                        onChange={(event) =>
                          updateAdvancedOption('limit_single_narrator', event.target.checked)
                        }
                        disabled={isFormDisabled || advancedOptions.add_narrator_avatar}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Limit single narrator</span>
                    </label>

                    <label className={`flex items-start gap-3 rounded-xl px-3 py-3 ${advancedRowBg}`}>
                      <input
                        type="checkbox"
                        checked={advancedOptions.add_narrator_avatar}
                        onChange={(event) =>
                          updateAdvancedOption('add_narrator_avatar', event.target.checked)
                        }
                        disabled={isFormDisabled}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Add narrator avatar</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={advancedLabelClasses}>Metadata JSON</label>
                      <TextareaAutosize
                        minRows={3}
                        maxRows={8}
                        value={advancedOptions.metadata}
                        onChange={(event) => updateAdvancedOption('metadata', event.target.value)}
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                        placeholder='{"project":"launch_trailer"}'
                      />
                    </div>
                    <div>
                      <label className={advancedLabelClasses}>Image item metadata JSON</label>
                      <TextareaAutosize
                        minRows={3}
                        maxRows={8}
                        value={advancedOptions.image_item_metadata}
                        onChange={(event) =>
                          updateAdvancedOption('image_item_metadata', event.target.value)
                        }
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                        placeholder='[{"title":"Opening frame"}]'
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={`border-t ${advancedSectionBorder} pt-4 space-y-3`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  CTA Outro
                </div>
                <label className={`flex items-start gap-3 rounded-xl px-3 py-3 ${advancedRowBg}`}>
                  <input
                    type="checkbox"
                    checked={advancedOptions.generate_outro_image}
                    onChange={(event) =>
                      updateAdvancedOption('generate_outro_image', event.target.checked)
                    }
                    disabled={isFormDisabled}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">Generate CTA outro</span>
                </label>
                {advancedOptions.generate_outro_image && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={advancedLabelClasses}>CTA URL</label>
                      <input
                        type="url"
                        value={advancedOptions.cta_url}
                        onChange={(event) => updateAdvancedOption('cta_url', event.target.value)}
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                        placeholder="https://example.com/book"
                      />
                    </div>
                    <div>
                      <label className={advancedLabelClasses}>CTA top text</label>
                      <input
                        type="text"
                        value={advancedOptions.cta_text_top}
                        onChange={(event) =>
                          updateAdvancedOption('cta_text_top', event.target.value)
                        }
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                      />
                    </div>
                    <div>
                      <label className={advancedLabelClasses}>CTA bottom text</label>
                      <input
                        type="text"
                        value={advancedOptions.cta_text_bottom}
                        onChange={(event) =>
                          updateAdvancedOption('cta_text_bottom', event.target.value)
                        }
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                      />
                    </div>
                    <div>
                      <label className={advancedLabelClasses}>CTA logo URL</label>
                      <input
                        type="url"
                        value={advancedOptions.cta_logo}
                        onChange={(event) => updateAdvancedOption('cta_logo', event.target.value)}
                        disabled={isFormDisabled}
                        className={advancedInputClasses}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={`border-t ${advancedSectionBorder} pt-4 space-y-3`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Footer
                </div>
                <div>
                  <label className={advancedLabelClasses}>Footer metadata JSON</label>
                  <TextareaAutosize
                    minRows={3}
                    maxRows={8}
                    value={advancedOptions.footer_metadata}
                    onChange={(event) =>
                      updateAdvancedOption('footer_metadata', event.target.value)
                    }
                    disabled={isFormDisabled}
                    className={advancedInputClasses}
                    placeholder='[{"url":"https://example.com/book","title":"Book now"}]'
                  />
                </div>
              </div>

              {availableCustomAdapterOperations.length > 0 && (
                <div className={`border-t ${advancedSectionBorder} pt-4 space-y-3`}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Custom Adapters
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableCustomAdapterOperations.map((operation) => (
                      <label
                        key={operation.key}
                        className={`flex items-start gap-3 rounded-xl px-3 py-3 ${advancedRowBg}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomAdapterOperations.includes(operation.key)}
                          onChange={() => toggleSelectedCustomAdapterOperation(operation.key)}
                          disabled={isFormDisabled}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{operation.label}</span>
                          <span className={`block truncate text-[11px] ${mutedText}`}>
                            {operation.endpoint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>
      {/* ───── /HEADER ───── */}

      {/* Error */}
      {errorMessage?.error && !showResultDisplay && (
        <div className="text-red-500 mt-3 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {errorMessage.error}
        </div>
      )}

      {/* Progress indicator / result */}
      {showResultDisplay && (
        <div className="mt-5 transition-all duration-500 ease-out">
          <ProgressIndicator
            isGenerationPending={isGenerationPending}
            isGenerationWaitingForApproval={isGenerationWaitingForApproval}
            isProcessingNextStep={isProcessingNextStep}
            expressGenerationStatus={expressGenerationStatus}
            generationStatusDetails={generationStatusDetails}
            videoLink={videoLink}
            errorMessage={errorMessage}
            purchaseCreditsForUser={purchaseCreditsForUser}
            viewInStudio={viewInStudio}
            onProcessNextStep={handleProcessNextStep}
          />
        </div>
      )}

      {/* ───────── Submission form ───────── */}
      <form onSubmit={handleSubmit}>
        {isJsonMode && shouldCollapseJsonEditorForProgress ? (
          <div className={`mt-4 rounded-2xl p-4 ring-1 transition ${
            colorMode === 'dark'
              ? 'bg-[#0b1224] text-slate-100 ring-white/10'
              : 'bg-white text-slate-900 ring-slate-200'
          }`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">JSON request hidden during render</div>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Progress stays visible. Expand this panel only when you need to inspect or copy the submitted request.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJsonRequestExpanded((expanded) => !expanded)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    colorMode === 'dark'
                      ? 'border border-white/10 hover:bg-white/5'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isJsonRequestExpanded ? 'Hide JSON' : 'View JSON'}
                </button>
                <button
                  type="button"
                  onClick={copyJsonRequestToClipboard}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    colorMode === 'dark'
                      ? 'border border-white/10 hover:bg-white/5'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {jsonCopyStatus || 'Copy JSON'}
                </button>
              </div>
            </div>

            {isJsonRequestExpanded && (
              <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-white/10">
                <AceEditor
                  mode="json"
                  theme="monokai"
                  name="vidgenieJsonSubmittedInput"
                  width="100%"
                  height="360px"
                  fontSize={13}
                  showPrintMargin={false}
                  showGutter
                  highlightActiveLine={false}
                  readOnly
                  value={jsonRequestDisplayText}
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    enableBasicAutocompletion: false,
                    enableLiveAutocompletion: false,
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                    useWorker: false,
                  }}
                  className="vidgenie-json-editor"
                />
              </div>
            )}
          </div>
        ) : isJsonMode ? (
          <div className="mt-4">
            {renderGenerationControlsRow({ showAdvancedToggle: false, className: 'mb-3' })}
            <div className={`overflow-hidden rounded-2xl ring-1 transition ${
              jsonEditorErrorMessage
                ? 'ring-red-500/50'
                : colorMode === 'dark'
                  ? 'ring-white/10'
                  : 'ring-slate-200'
            }`}>
              <AceEditor
                mode="json"
                theme="monokai"
                name="vidgenieJsonInput"
                width="100%"
                height="520px"
                fontSize={14}
                showPrintMargin={false}
                showGutter
                highlightActiveLine
                readOnly={isFormDisabled}
                annotations={jsonEditorAnnotations}
                placeholder={jsonModeDefaultInput}
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: false,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
                className="vidgenie-json-editor"
                value={jsonInputText}
                onChange={(value) => {
                  setJsonInputText(value);
                  setIsJsonInputDirty(true);
                  setJsonCopyStatus('');
                  if (jsonValidationMessage) {
                    setJsonValidationMessage('');
                  }
                }}
              />
            </div>
            <input type="hidden" name="jsonInputText" value={jsonInputText} />
            {jsonEditorErrorMessage ? (
              <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">
                {Number.isFinite(jsonModeValidation.row) && Number.isFinite(jsonModeValidation.column)
                  ? `Line ${jsonModeValidation.row + 1}, column ${jsonModeValidation.column + 1}: `
                  : ''}
                {jsonEditorErrorMessage}
              </div>
            ) : (
              <div className={`mt-2 rounded-lg border p-3 text-sm font-medium ${
                colorMode === 'dark'
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
              }`}>
                Valid JSON for {generationMode === 'I2V' ? 'image-list to video' : 'text to video'}.
              </div>
            )}
            {jsonValidationMessage && jsonValidationMessage !== jsonEditorErrorMessage && (
              <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">
                {jsonValidationMessage}
              </div>
            )}
          </div>
        ) : generationMode === 'T2V' ? (
          <>
            <div className="relative mt-4">
              <TextareaAutosize
                minRows={8}
                maxRows={20}
                disabled={isFormDisabled}
                readOnly={isVoiceBusy}
                className={`
                  w-full pl-4 pt-4 pr-16 p-2 rounded-2xl resize-none placeholder:opacity-60
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ring-1 transition
                  ${colorMode === 'dark'
                    ? 'bg-gray-950/90 text-white ring-white/10 focus:ring-indigo-500/50'
                    : 'bg-white text-slate-900 ring-slate-200 focus:ring-indigo-500/50'
                  }
                  ${isVoiceBusy ? 'opacity-95' : ''}
                `}
                placeholder={t("vidgenie.promptPlaceholder")}
                name="promptText"
                value={promptText}
                maxLength={VIDGENIE_PROMPT_MAX_LENGTH}
                onChange={handlePromptTextChange}
              />
              <button
                type="button"
                onClick={handleToggleVoiceRecording}
                disabled={!isVoiceSupported && !isBrowserSpeechSupported}
                aria-pressed={isVoiceBusy}
                className={`
                  absolute bottom-3 right-3 h-11 w-11 rounded-full flex items-center justify-center
                  transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${colorMode === 'dark'
                    ? 'bg-indigo-500/80 hover:bg-indigo-500 text-white focus:ring-indigo-400/70 focus:ring-offset-slate-900'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500/40 focus:ring-offset-white'}
                  ${isVoiceBusy ? 'animate-pulse scale-105' : ''}
                  ${isVoiceInitializing && !isBrowserRecognitionActive ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
                  ${(!isVoiceSupported && !isBrowserSpeechSupported) ? 'opacity-40 cursor-not-allowed hover:bg-indigo-500' : ''}
                `}
                title={
                  (!isVoiceSupported && !isBrowserSpeechSupported)
                    ? t("vidgenie.voiceNotSupported")
                    : isVoiceBusy
                      ? t("vidgenie.voiceStop")
                      : t("vidgenie.voiceStart")
                }
              >
                {isVoiceInitializing && !isBrowserRecognitionActive ? (
                  <FaSpinner className="animate-spin text-lg" />
                ) : isVoiceBusy ? (
                  <FaStopCircle className="text-lg" />
                ) : (
                  <FaMicrophone className="text-lg" />
                )}
                <span className="sr-only">
                  {isVoiceBusy ? t("vidgenie.voiceButtonSrStop") : t("vidgenie.voiceButtonSrStart")}
                </span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                {voiceError ? (
                  <span className="text-red-500">{voiceError}</span>
                ) : voiceStatusMessage ? (
                  <span className={colorMode === 'dark' ? 'text-white/70' : 'text-slate-600'}>
                    {voiceStatusMessage}
                  </span>
                ) : (
                  <span className={colorMode === 'dark' ? 'text-white/50' : 'text-slate-400'}>
                    {isBrowserSpeechSupported || isVoiceSupported
                      ? t("vidgenie.voiceUseMic")
                      : t("vidgenie.voiceUnavailable")}
                  </span>
                )}
              </div>
              <span className={`shrink-0 tabular-nums ${promptCounterClass}`}>
                {promptCounterLabel}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <TextareaAutosize
              minRows={4}
              maxRows={12}
              disabled={isFormDisabled}
              className={`
                w-full pl-4 pt-4 pr-4 p-2 rounded-2xl resize-none placeholder:opacity-60
                focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ring-1 transition
                ${colorMode === 'dark'
                  ? 'bg-gray-950/90 text-white ring-white/10 focus:ring-indigo-500/50'
                  : 'bg-white text-slate-900 ring-slate-200 focus:ring-indigo-500/50'
                }
              `}
              placeholder={t("vidgenie.promptPlaceholder")}
              name="promptText"
              value={promptText}
              maxLength={VIDGENIE_PROMPT_MAX_LENGTH}
              onChange={handlePromptTextChange}
            />
            <div className={`text-right text-xs tabular-nums ${promptCounterClass}`}>
              {promptCounterLabel}
            </div>
            <div className={`rounded-lg ring-1 p-3 transition ${imagePickerShell}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Image scenes</div>
                  <div className={`mt-0.5 text-[11px] ${mutedText}`}>
                    Paste public URLs or upload local images to create URLs.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addImageListItem}
                  disabled={isFormDisabled || uploadingImageIndex !== null}
                  className={`
                    inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition
                    ${colorMode === 'dark'
                      ? 'bg-white/10 text-white hover:bg-white/15 disabled:opacity-50'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'
                    }
                  `}
                >
                  <FaPlus className="text-xs" />
                  Add image
                </button>
              </div>

              {imageUploadError && (
                <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">
                  {imageUploadError}
                </div>
              )}

              <div className="space-y-3">
                {imageListItems.map((item, index) => {
                  const imageUrl = item.image_url.trim();
                  const isUploadingThisImage = uploadingImageIndex === index;
                  return (
                    <div
                      key={`image-list-item-${index}`}
                      className={`
                        rounded-lg p-3 ring-1
                        ${colorMode === 'dark'
                          ? 'bg-white/[0.03] ring-white/10'
                          : 'bg-slate-50 ring-slate-200'
                        }
                      `}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium">Image {index + 1}</div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveImageListItem(index, index - 1)}
                            disabled={isFormDisabled || uploadingImageIndex !== null || index === 0}
                            title="Move image up"
                            aria-label="Move image up"
                            className={`
                              inline-flex h-8 w-8 items-center justify-center rounded-lg transition
                              ${colorMode === 'dark'
                                ? 'text-slate-200 hover:bg-white/10 disabled:opacity-40'
                                : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
                              }
                            `}
                          >
                            <FaArrowUp className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImageListItem(index, index + 1)}
                            disabled={isFormDisabled || uploadingImageIndex !== null || index === imageListItems.length - 1}
                            title="Move image down"
                            aria-label="Move image down"
                            className={`
                              inline-flex h-8 w-8 items-center justify-center rounded-lg transition
                              ${colorMode === 'dark'
                                ? 'text-slate-200 hover:bg-white/10 disabled:opacity-40'
                                : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
                              }
                            `}
                          >
                            <FaArrowDown className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImageListItem(index)}
                            disabled={isFormDisabled || uploadingImageIndex !== null}
                            title="Remove image"
                            aria-label="Remove image"
                            className={`
                              inline-flex h-8 w-8 items-center justify-center rounded-lg transition
                              ${colorMode === 'dark'
                                ? 'text-rose-200 hover:bg-rose-500/15 disabled:opacity-40'
                                : 'text-rose-600 hover:bg-rose-50 disabled:opacity-40'
                              }
                            `}
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[112px_minmax(0,1fr)]">
                        <div
                          className={`
                            flex aspect-square w-full max-w-[112px] items-center justify-center overflow-hidden rounded-lg ring-1
                            ${colorMode === 'dark'
                              ? 'bg-black/20 ring-white/10'
                              : 'bg-white ring-slate-200'
                            }
                          `}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title || `Image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FaImage className={`text-xl ${mutedText}`} />
                          )}
                        </div>

                        <div className="min-w-0 space-y-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                            <div>
                              <label className={`mb-1 block text-[11px] font-medium ${mutedText}`}>
                                Image URL
                              </label>
                              <input
                                type="url"
                                value={item.image_url}
                                onChange={(event) => {
                                  updateImageListItem(index, { image_url: event.target.value });
                                  if (imageUploadError) {
                                    setImageUploadError('');
                                  }
                                }}
                                disabled={isFormDisabled}
                                className={advancedInputClasses}
                                placeholder="https://..."
                              />
                            </div>
                            <label
                              className={`
                                mt-auto inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition
                                ${isFormDisabled || uploadingImageIndex !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                ${colorMode === 'dark'
                                  ? 'border-indigo-300/30 bg-indigo-400/10 text-indigo-100 hover:bg-indigo-400/15'
                                  : 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                }
                              `}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onDrop={(event) => {
                                if (isFormDisabled || uploadingImageIndex !== null) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  return;
                                }
                                handleImageListUploadDrop(index, event);
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*,image/heic,image/heif,.heic,.heif"
                                onChange={(event) => handleImageListUploadInput(index, event)}
                                disabled={isFormDisabled || uploadingImageIndex !== null}
                                className="sr-only"
                              />
                              {isUploadingThisImage ? (
                                <FaSpinner className="animate-spin text-xs" />
                              ) : (
                                <FaUpload className="text-xs" />
                              )}
                              {isUploadingThisImage ? 'Uploading...' : 'Upload to URL'}
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className={`mb-1 block text-[11px] font-medium ${mutedText}`}>
                                Title
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(event) => updateImageListItem(index, { title: event.target.value })}
                                disabled={isFormDisabled}
                                className={advancedInputClasses}
                                placeholder="Opening frame"
                              />
                            </div>
                            <div>
                              <label className={`mb-1 block text-[11px] font-medium ${mutedText}`}>
                                Image text
                              </label>
                              <TextareaAutosize
                                minRows={1}
                                maxRows={4}
                                value={item.image_text}
                                onChange={(event) => updateImageListItem(index, { image_text: event.target.value })}
                                disabled={isFormDisabled}
                                className={advancedInputClasses}
                                placeholder="Scene direction or product detail"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ───────── Assistant Chat ───────── */}
      <div className={`mt-6 rounded-2xl p-3 sm:p-4 ring-1 transition-shadow hover:shadow-sm ${
        colorMode === 'dark'
          ? 'bg-[#0f1629] text-slate-100 ring-[#1f2a3d]'
          : 'bg-white text-slate-900 ring-slate-200'
      }`}>
        <AssistantHome
          submitAssistantQuery={submitAssistantQuery}
          sessionId={id}
          sessionMessages={sessionMessages}
          onSessionMessagesChange={setSessionMessages}
          onAssistantQueryGeneratingChange={setIsAssistantQueryGenerating}
          isAssistantQueryGenerating={isAssistantQueryGenerating}
          getSessionImageLayers={getSessionImageLayers}
        />
      </div>
    </div>
  );
}
