// ModelPrices.js

export const IMAGE_MODEL_PRICES = [
  {
    key: 'GPTIMAGE2',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 46 },
      { aspectRatio: '16:9', price: 46 },
      { aspectRatio: '9:16', price: 46 },
    ],
  },
  {
    key: 'IMAGEN4',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 8 },
      { aspectRatio: '16:9', price: 8 },
      { aspectRatio: '9:16', price: 8 },
    ],
  },
  {
    key: 'SEEDREAM',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 23 },
      { aspectRatio: '9:16', price: 23 },
    ],
  },
  {
    key: 'HUNYUAN',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 60 },
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
  },
  {
    key: 'NANOBANANA2',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 23 },
      { aspectRatio: '16:9', price: 23 },
      { aspectRatio: '9:16', price: 23 },
    ],
  },
]


export const IMAGE_EDIT_MODEL_PRICES = [
  {
    key: 'NANOBANANA2EDIT',
    prices: [
      { aspectRatio: '1:1', price: 45 },
      { aspectRatio: '16:9', price: 45 },
      { aspectRatio: '9:16', price: 45 },
    ],
  },
  {
    key: 'GPTIMAGE2EDIT',
    prices: [
      { aspectRatio: '1:1', price: 45 },
      { aspectRatio: '16:9', price: 45 },
      { aspectRatio: '9:16', price: 45 },
    ],
  },
]


export const VIDEO_MODEL_PRICES = [
  {
    key: 'RUNWAYML',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
    units: [5, 10],
  },
  {
    key: 'SORA2',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 100 },
      { aspectRatio: '9:16', price: 100 },
    ],
    units: [8],
  },
  {
    key: 'SORA2PRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 300 },
      { aspectRatio: '9:16', price: 300 },
    ],
    units: [8],
  },
  {
    key: 'KLINGIMGTOVID3PRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '1:1', price: 60 },
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
    units: [5, 10],
  },
  {
    key: 'KLINGTXTTOVID3PRO',
    isExpressModel: false,
    isImageToVideoModel: false,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '1:1', price: 60 },
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
    units: [5, 10, 15],
  },
  {
    key: 'HAILUO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 60 },
    ],
    units: [6, 10],
  },
  {
    key: 'HAILUOPRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 100 },
    ],
    units: [6],
  },
  {
    key: 'SEEDANCEI2V',
    isExpressModel: false,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
    units: [5, 10],
  },
  {
    key: 'SEEDANCET2V',
    isExpressModel: false,
    isImageToVideoModel: false,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 437.5 },
      { aspectRatio: '9:16', price: 437.5 },
    ],
    units: [5, 10, 15],
  },
  {
    key: 'SEEDANCE15I2V',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 60 },
      { aspectRatio: '9:16', price: 60 },
    ],
    units: [5, 10],
  },
  {
    key: 'VEO3.1',
    isExpressModel: false,
    isImageToVideoModel: false,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 700 },
      { aspectRatio: '9:16', price: 700 },
    ],
    units: [4, 6, 8],
  },
  {
    key: 'VEO3.1FAST',
    isExpressModel: false,
    isImageToVideoModel: false,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 300 },
      { aspectRatio: '9:16', price: 300 },
    ],
    units: [4, 6, 8],
  },
  {
    key: 'VEO3.1I2V',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 700 },
      { aspectRatio: '9:16', price: 700 },
    ],
    units: [4, 6, 8],
  },
  {
    key: 'VEO3.1FLIV',
    isExpressModel: false,
    isImageToVideoModel: true,
    isFirstLastFrameToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 700 },
      { aspectRatio: '9:16', price: 700 },
    ],
    units: [4, 6, 8],
  },
  {
    key: 'VEO3.1I2VFAST',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 300 },
      { aspectRatio: '9:16', price: 300 },
    ],
    units: [4, 6, 8],
  },

  // AI post-processing models still used in studio workflows
  {
    key: 'SYNCLIPSYNC',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
  },
  {
    key: 'LATENTSYNC',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
  },
  {
    key: 'KLINGLIPSYNC',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
  },
  {
    key: 'HUMMINGBIRDLIPSYNC',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
  },
  {
    key: 'CREATIFYLIPSYNC',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
  },
  {
    key: 'MMAUDIOV2',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
    units: [5, 10],
  },
  {
    key: 'MIRELOAI',
    prices: [
      { aspectRatio: '1:1', price: 15 },
      { aspectRatio: '16:9', price: 15 },
      { aspectRatio: '9:16', price: 15 },
    ],
    units: [5, 10],
  },
]


export const TTS_TYPES = [
  'OPENAI',
  'PLAYTS',
  'ELEVENLABS',
]

// to update all of thse

export const ASSISTANT_MODEL_PRICES = [
  {
    key: "gpt-5.5",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 9
      },
    ]
  },
]

export const THEME_MODEL_PRICES = [
  {
    prices: [
      {
        operationType: "query",
        tokens: 1,
        price: 2
      }
    ]
  }
]

export const TRANSLATION_MODEL_PRICES = [
  {
    prices: [
      {
        operationType: "line",
        tokens: 1,
        price: 2
      }
    ]
  }
];


export const PROMPT_GENERATION_MODEL_PRICES = [
  {
    prices: [
      {
        operationType: "line",
        tokens: 1,
        price: 2
      }
    ]
  }
]



export const SPEECH_MODEL_PRICES = [

  {
    key: "TTS",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 2
      },
    ]
  },
  {
    key: "TTSHD",
    prices: [
      {
        operationType: "words",
        tokens: 400,
        price: 2
      },
    ]
  },
];


export const MUSIC_MODEL_PRICES = [
  {
    key: 'AUDIOCRAFT',
    prices: [
      {
        operationType: "generate_song",
        price: 3,
      }
    ]
  },
  {
    key: 'CASSETTEAI',
    prices: [
      {
        operationType: "generate_song",
        price: 8,
      }
    ]
  },
  {
    key: 'LYRIA2',
    prices: [
      {
        operationType: "generate_song",
        price: 3,
      }
    ]
  },
  {
    key: 'ELEVENLABS_MUSIC',
    prices: [
      {
        operationType: "generate_song",
        price: 3,
      }
    ]
  },
]
