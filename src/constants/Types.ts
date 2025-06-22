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
    name: 'GPT Image 1',
    key: 'GPTIMAGE1',
    isExpressModel: true,
  },
  {
    name: 'Google Imagen4',
    key: 'IMAGEN4',
    isExpressModel: true,
  },

  {
    name: 'F-Lite',
    key: 'FLITE',
    isExpressModel: false,
    imageStyles: FLITE_IMAGE_STYLES,
  },
  {
    name: 'Google Imagen3',
    key: 'IMAGEN3',
    isExpressModel: false,
  },
  {
    name: 'Flux-1.1 Pro',
    key: 'FLUX1.1PRO',
    isExpressModel: false,
  },
  {
    name: 'Dall-E 3',
    key: 'DALLE3'
  },

  {
    name: 'Flux-1 Pro',
    key: 'FLUX1PRO'
  },
  {
    name: 'Flux 1.1 Ultra',
    key: 'FLUX1.1ULTRA'
  },

  {
    name: 'Flux-1 Dev',
    key: 'FLUX1DEV'
  },

  {
    name: 'Recraft V3',
    key: 'RECRAFTV3',
    imageStyles: RECRAFT_IMAGE_STYLES,
  },

  {
    name: 'Stable Diffusion V3.5',
    key: 'SDV3.5'
  },

  {
    name: 'Sana 4.5B',
    key: 'SANA4.5B',
    isExpressModel: false,
  },
  {
    name: 'Sana Sprint',
    key: 'SANASPRINT',
    isExpressModel: false,
  },
  {
    name: 'Recraft 20B',
    key: 'RECRAFT20B',
    imageStyles: RECRAFT_IMAGE_STYLES,
  },
  {
    name: 'Lumalabs Photon',
    key: 'PHOTON'
  },
  {
    name: 'Lumalabs Photon Flash',
    key: 'PHOTONFLASH'
  },
  {
    name: 'Lumina V2',
    key: 'LUMINAV2',
    isExpressModel: false,
  },
  {
    name: 'Ideogram V3',
    key: 'IDEOGRAMV3',
    isExpressModel: false,
    imageStyles: IDEOGRAM_IMAGE_STYLES,
  },

  {
    name: 'HiDream I1',
    key: 'HIDREAMI1',
    isExpressModel: false,
  },




];


export const VIDEO_GENERATION_MODEL_TYPES = [

  {
    name: 'Runway Gen-4',
    key: 'RUNWAYML',
    isExpressModel: true,
    isTransitionModel: false,
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },

  {
    name: 'Kling 2.1 Master',
    key: 'KLINGIMGTOVID2.1MASTER',
    isExpressModel: false,
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1',
    ]
  },
  {
    name: 'Kling 2.1 Pro',
    key: 'KLINGIMGTOVID2.1PRO',
    isExpressModel: true,
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1',
    ]
  },
  {
    name: 'Kling 2.1 Standard',
    key: 'KLINGIMGTOVID2.1STANDARD',
    isImgToVidModel: false,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1',
    ]
  },
  {
    name: 'Kling 1.6 Pro',
    key: 'KLINGIMGTOVIDPRO',
    isExpressModel: false,
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1',
    ]
  },

  {
    name: 'SD Video',
    key: 'SDVIDEO',
    isImgToVidModel: true,
  },
  {
    name: 'Hailuo O2 Img2Vid',
    key: 'HAILUO',
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9'
    ],
    isExpressModel: true,
  },
  {
    name: 'Haiper 2.0',
    key: 'HAIPER2.0',
    isImgToVidModel: true,
  },

  {
    name: 'Skyreels-i2v',
    key: 'SKYREELSI2V',
    isTextToVidModel: false,
    isImgToVidModel: true,
  },

  {
    name: 'Veo2',
    key: 'VEO',
    isTextToVidModel: true,
    isImgToVidModel: false,

  },

  {
    name: 'Veo2 Img2Vid',
    key: 'VEOI2V',
    isTextToVidModel: false,
    isImgToVidModel: true,
    isExpressModel: false,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },

  {
    name: 'Veo3',
    key: 'VEO3',
    isImgToVidModel: false,
    isExpressModel: false,
    isTextToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16',
    ]

  },

  {
    name: 'PixVerseV4.5',
    key: 'PIXVERSEI2V',
    isImgToVidModel: true,
    isExpressModel: false,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },
  {
    name: 'PixVerseV4.5 Fast',
    key: 'PIXVERSEI2VFAST',
    isImgToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },

  {
    name: 'Wan I2V',
    key: 'WANI2V',
    isImgToVidModel: true,
    isExpressModel: false,
    supportedAspectRatios: [
      '16:9'
    ]
  },
  {
    name: 'Pika2.2 I2V',
    key: 'PIKA2.2I2V',
    isImgToVidModel: true,
    isExpressModel: false,
    isTextToVidModel: false,
    supportedAspectRatios: [
      '16:9', '9:16'
    ]
  },


  {
    name: 'Magi Distilled',
    key: 'MAGIDISTILLED',
    isImgToVidModel: true,
    isExpressModel: false,
    isTextToVidModel: true,
    supportedAspectRatios: [
      '16:9', '9:16', '1:1'
    ]
  },

  {
    name: 'Vidu Img2Vid',
    key: 'VIDUI2V',
    isImgToVidModel: true,
    isExpressModel: false,
    isTextToVidModel: false,
    supportedAspectRatios: [
      '16:9', '9:16',
      '1:1'
    ]

  },

  {
    name: 'SeeDance Img2Vid',
    key: 'SEEDANCEI2V',
    isImgToVidModel: true,
    isExpressModel: true,
    supportedAspectRatios: [
      '16:9', '9:16',

    ]
  }

];







export const IMAGE_EDIT_MODEL_TYPES = [
  {
    name: 'Bria Eraser',
    key: 'BRIA_ERASER',
    editType: 'inpaint',
    isPromptEnabled: false
  },
  {
    name: 'Bria GenFill',
    key: 'BRIA_GENFILL',
    editType: 'inpaint',
    isPromptEnabled: true

  },

  {
    name: 'Bria BackgroundRemove',
    key: 'BRIA_BACKGROUNDREMOVE',

    isPromptEnabled: false

  },


  {
    name: 'Flux-1 Pro Fill',
    key: 'FLUX1PROFILL',
    editType: 'inpaint',
    isPromptEnabled: true
  },


  {
    name: 'Flux-1.1 Pro Ultra Redux',
    key: 'FLUX1.1PROULTRAREDUX',
    editType: 'prompt',
    isPromptEnabled: true
  },


  {
    name: 'Flux-1.1 Pro Redux',
    key: 'FLUX1.1PROREDUX',
    editType: 'prompt',
    isPromptEnabled: true
  },

  {
    name: 'GPT Image 1 Edit',
    key: 'GPTIMAGE1EDIT',
    editType: 'inpaint',
    isPromptEnabled: true,
  },



]




// export const ASSISTANT_MODEL_TYPES = [
//   'GPT4.5O',
//   'GPT4.1',
//   'GPTO3',
//   'GPTO3MINI',
//   'GROK3'
// ];


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

];

export const INFERENCE_MODEL_TYPES = [

  {
    label: 'GPT O3 Mini (H)',
    value: 'GPTO3MINI',
  },
  {
    label: 'GPT 4.1',
    value: 'GPT4.1',
  },
  {
    label: 'GPT O3',
    value: 'GPTO3',
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

