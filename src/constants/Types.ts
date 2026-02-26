import { ELEVENLABS_TTS } from './ElevenLabs.jsx';
import { PLAY_SPEAKER_TYPES } from './PlayAI.jsx';

export const CURRENT_TOOLBAR_VIEW = {
  SHOW_DEFAULT_DISPLAY: 'SHOW_DEFAULT_DISPLAY',
  SHOW_GENERATE_DISPLAY: 'SHOW_GENERATE_DISPLAY',
  SHOW_TEMPLATES_DISPLAY: 'SHOW_TEMPLATES_DISPLAY',
  SHOW_EDIT_MASK_DISPLAY: 'SHOW_EDIT_MASK_DISPLAY',
  SHOW_EDIT_DISPLAY: 'SHOW_EDIT_DISPLAY',

  SHOW_ADD_TEXT_DISPLAY: 'SHOW_ADD_TEXT_DISPLAY',
  SHOW_LAYERS_DISPLAY: 'SHOW_LAYERS_DISPLAY',

  SHOW_CURSOR_SELECT_DISPLAY: 'SHOW_CURSOR_SELECT_DISPLAY',
  SHOW_ANIMATE_DISPLAY: 'SHOW_ANIMATE_DISPLAY',
  SHOW_OBJECT_SELECT_DISPLAY: 'SHOW_OBJECT_SELECT_DISPLAY',
  SHOW_ACTIONS_DISPLAY: 'SHOW_ACTIONS_DISPLAY',
  SHOW_SELECT_DISPLAY: 'SHOW_SELECT_DISPLAY',

  SHOW_ADD_SHAPE_DISPLAY: 'SHOW_ADD_SHAPE_DISPLAY',
  SHOW_UPLOAD_DISPLAY: 'SHOW_UPLOAD_DISPLAY',
  SHOW_AUDIO_DISPLAY: 'SHOW_AUDIO_DISPLAY',

  SHOW_SET_DEFAULTS_DISPLAY: 'SHOW_SET_DEFAULTS_DISPLAY',

  SHOW_GENERATE_VIDEO_DISPLAY: 'SHOW_GENERATE_VIDEO_DISPLAY',

}

export const TOOLBAR_ACTION_VIEW = {
  SHOW_DEFAULT_DISPLAY: 'SHOW_DEFAULT_DISPLAY',


  SHOW_ERASER_DISPLAY: 'SHOW_ERASER_DISPLAY',
  SHOW_PENCIL_DISPLAY: 'SHOW_PENCIL_DISPLAY',

  SHOW_SELECT_LAYER_DISPLAY: 'SHOW_SELECT_LAYER_DISPLAY',
  SHOW_SELECT_SHAPE_DISPLAY: 'SHOW_SELECT_SHAPE_DISPLAY',

  SHOW_SELECT_OBJECT_DISPLAY: 'SHOW_SELECT_OBJECT_DISPLAY',

  SHOW_MUSIC_GENERATE_DISPLAY: 'SHOW_MUSIC_GENERATE_DISPLAY',
  SHOW_SPEECH_GENERATE_DISPLAY: 'SHOW_SPEECH_GENERATE_DISPLAY',
  SHOW_SOUND_GENERATE_DISPLAY: 'SHOW_SOUND_GENERATE_DISPLAY',

  SHOW_PREVIEW_MUSIC_DISPLAY: 'SHOW_PREVIEW_MUSIC_DISPLAY',
  SHOW_PREVIEW_SPEECH_DISPLAY: 'SHOW_PREVIEW_SPEECH_DISPLAY',
  SHOW_PREVIEW_SPEECH_LAYERED_DISPLAY: 'SHOW_PREVIEW_SPEECH_LAYERED_DISPLAY',
  SHOW_PREVIEW_SOUND_DISPLAY: 'SHOW_PREVIEW_SOUND_DISPLAY',

  SHOW_LIBRARY_DISPLAY: 'SHOW_LIBRARY_DISPLAY',
  SHOW_SMART_SELECT_DISPLAY: 'SHOW_SMART_SELECT_DISPLAY',

  SHOW_SUBTITLES_DISPLAY: 'SHOW_SUBTITLES_DISPLAY',
}


export const RECRAFT_IMAGE_STYLES = [
  "realistic_image",
  "digital_illustration",
  "vector_illustration",
  "realistic_image/b_and_w",
  "realistic_image/hard_flash",
  "realistic_image/hdr",
  "realistic_image/natural_light",
  "realistic_image/studio_portrait",
  "realistic_image/enterprise",
  "realistic_image/motion_blur",
  "digital_illustration/pixel_art",
  "digital_illustration/hand_drawn",
  "digital_illustration/grain",
  "digital_illustration/infantile_sketch",
  "digital_illustration/2d_art_poster",
  "digital_illustration/handmade_3d",
  "digital_illustration/hand_drawn_outline",
  "digital_illustration/engraving_color",
  "digital_illustration/2d_art_poster_2",
  "vector_illustration/engraving",
  "vector_illustration/line_art",
  "vector_illustration/line_circuit",
  "vector_illustration/linocut"
];


export const FLITE_IMAGE_STYLES = [
  'standard',
  'texture',
];

export const FRAME_TOOLBAR_VIEW = {
  DEFAULT: 'DEFAULT',
  AUDIO: 'AUDIO',
  EXPANDED: 'EXPANDED'
}


export const IDEOGRAM_IMAGE_STYLES = [
  'AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'
];



export const CURRENT_EDITOR_VIEW = {
  'VIEW': 'VIEW',
  'EDIT': 'EDIT',
}

export const IMAGE_GENERAITON_MODEL_TYPES = [
  {
    name: 'GPT Image 1.5',
    key: 'GPTIMAGE1',
    isExpressModel: true,
  },
  {
    name: 'Google Imagen4',
    key: 'IMAGEN4',
    isExpressModel: true,
  },
  {
    name: 'Seedream',
    key: 'SEEDREAM',
    isExpressModel: true,
  },
  {
    name: 'Hunyuan',
    key: 'HUNYUAN',
    isExpressModel: true,
  },
  {
    name: 'NanoBanana Pro',
    key: 'NANOBANANAPRO',
    isExpressModel: true,
  },
];


export const VIDEO_GENERATION_MODEL_TYPES = [
  {
    name: 'Runway Gen-4',
    key: 'RUNWAYML',
    isExpressModel: true,
    isTransitionModel: false,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },
  {
    name: 'Sora 2',
    key: 'SORA2',
    isExpressModel: true,
    isTransitionModel: false,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },
  {
    name: 'Sora 2 Pro',
    key: 'SORA2PRO',
    isExpressModel: true,
    isTransitionModel: false,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },
  {
    name: 'Kling 3 Pro Img2Vid',
    key: 'KLINGIMGTOVID3PRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1',
    ]
  },
  {
    name: 'Hailuo O2 Standard',
    key: 'HAILUO',
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9'
    ],
    isExpressModel: true,
  },
  {
    name: 'Hailuo O2 Pro',
    key: 'HAILUOPRO',
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9'
    ],
    isExpressModel: true,
  },
  {
    name: 'SeeDance Img2Vid',
    key: 'SEEDANCEI2V',
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    isExpressModel: true,
    supportedAspectRatios: [
      '16:9', '9:16',
    ]
  },
  {
    name: 'VEO3.1 Img2Vid',
    key: 'VEO3.1I2V',
    isImageToVideoModel: true,
    isExpressModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9',
      '9:16'
    ]
  },
  {
    name: 'VEO3.1 Fast Img2Vid',
    key: 'VEO3.1I2VFAST',
    isImageToVideoModel: true,
    isExpressModel: true,
    isTextToVideoModel: true,
    supportedAspectRatios: [
      '16:9',
      '9:16'
    ]
  },
];







export const IMAGE_EDIT_MODEL_TYPES = [
  {
    name: 'NanoBanana Pro Edit',
    key: 'NANOBANANAPROEDIT',
    editType: 'prompt',
    isPromptEnabled: true
  },
  {
    name: 'GPT Image 1.5 Edit',
    key: 'GPTIMAGE1EDIT',
    editType: 'inpaint',
    isPromptEnabled: true,
  },

]



export const ASSISTANT_MODEL_TYPES = [
  {
    label: 'Grok 3',
    value: 'GROK3'
  },
  {
    label: 'GPT 4.1',
    value: 'GPT4.1',
  },

  {
    label: 'GPT O3 Mini (H)',
    value: 'GPTO3MINI',
  },

  {
    label: 'GPT O3',
    value: 'GPTO3',
  },

  {
    label: 'GPT 5',
    value: 'GPT5',
  },

    {
    label: 'GPT 5.1',
    value: 'GPT5.1',
  },
  {
    label: 'GPT 5.2',
    value: 'GPT5.2',
  },


];

export const INFERENCE_MODEL_TYPES = [


  {
    label: 'GPT O3',
    value: 'GPTO3',
  },
  {
    label: 'GPT 5 High',
    value: 'GPT5',
  },
  {
    label: 'GPT 5 Mini',
    value: 'GPT5MINI',
  },
  {
    label: 'GPT 5.1',
    value: 'GPT5.1',
  },
  {
    label: 'GPT 5.2',
    value: 'GPT5.2',
  },


]








export const PIXVERRSE_VIDEO_STYLES = [
  'anime', '3d_animation', 'clay', 'comic', 'cyberpunk'
];




export const TTS_PROVIDERS = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'PLAYHT', label: 'Play.ht' },
];

export const OPENAI_SPEAKER_TYPES = [
  {
    value: 'alloy',
    label: 'Alloy',
    provider: 'OPENAI',
    "Gender": "F",
    previewURL: "https://cdn.openai.com/API/docs/audio/alloy.wav"
  },
  {
    value: 'echo',
    label: 'Echo',
    provider: 'OPENAI',
    "Gender": "M",
    previewURL: "https://cdn.openai.com/API/docs/audio/echo.wav"
  },
  {
    value: 'fable', label: 'Fable', provider: 'OPENAI',
    "Gender": "M",
    previewURL: "https://cdn.openai.com/API/docs/audio/fable.wav"
  },
  {
    value: 'onyx', label: 'Onyx', provider: 'OPENAI',
    "Gender": "M",
    previewURL: "https://cdn.openai.com/API/docs/audio/onyx.wav"
  },
  {
    value: 'nova', label: 'Nova', provider: 'OPENAI',
    "Gender": "F",
    previewURL: "https://cdn.openai.com/API/docs/audio/nova.wav"
  },
  {
    value: 'shimmer', label: 'Shimmer', provider: 'OPENAI',
    "Gender": "F",
    previewURL: "https://cdn.openai.com/API/docs/audio/shimmer.wav"
  },

  {
    value: 'ash', label: 'Ash', provider: 'OPENAI',
    "Gender": "M",
    previewURL: "https://cdn.openai.com/API/docs/audio/ash.wav"
  },
  {
    value: 'coral', label: 'Coral', provider: 'OPENAI',
    "Gender": "F",
    previewURL: "https://cdn.openai.com/API/docs/audio/coral.wav"
  },
  {
    value: 'sage', label: 'Sage', provider: 'OPENAI',
    "Gender": "F",
    previewURL: "https://cdn.openai.com/API/docs/audio/sage.wav"
  },

];





export const MUSIC_PROVIDERS = [
  {
    name: 'CassetteAI',
    key: 'CASSETTEAI'
  },
  {
    name: 'AudioCraft',
    key: 'AUDIOCRAFT'
  },
  {
    name: 'Lyria 2',
    key: 'LYRIA2'
  },
]



// constants/Types.ts
export const TTS_COMBINED_SPEAKER_TYPES = [
  ...OPENAI_SPEAKER_TYPES,
  ...ELEVENLABS_TTS,
  ...PLAY_SPEAKER_TYPES

];



export const CANVAS_ACTION = {
  MOVE: 'MOVE',
  EDIT: 'EDIT',
  RESIZE: 'RESIZE',
  DEFAULT: 'DEFAULT',
}

export const SPEECH_SELECT_TYPES = {
  SPEECH_LAYER: 'SPEECH_LAYER',
  SPEECH_PER_SCENE: 'SPEECH_PER_SCENE',
};
