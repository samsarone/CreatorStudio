// ModelPrices.js

export const IMAGE_MODEL_PRICES = [
  {
    key: 'GPTIMAGE1',
    isExpressModel: true,
    prices: [
      { aspectRatio: '1:1', price: 23 },
      { aspectRatio: '16:9', price: 23 },
      { aspectRatio: '9:16', price: 23 },
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
    key: 'NANOBANANAPRO',
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
    key: 'NANOBANANAPROEDIT',
    prices: [
      { aspectRatio: '1:1', price: 45 },
      { aspectRatio: '16:9', price: 45 },
      { aspectRatio: '9:16', price: 45 },
    ],
  },
  {
    key: 'GPTIMAGE1EDIT',
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
      { aspectRatio: '16:9', price: 90 },
      { aspectRatio: '9:16', price: 90 },
    ],
    units: [5, 10],
  },
  {
    key: 'SORA2',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 150 },
      { aspectRatio: '9:16', price: 150 },
    ],
    units: [8],
  },
  {
    key: 'SORA2PRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 450 },
      { aspectRatio: '9:16', price: 450 },
    ],
    units: [8],
  },
  {
    key: 'KLINGIMGTOVID3PRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '1:1', price: 90 },
      { aspectRatio: '16:9', price: 90 },
      { aspectRatio: '9:16', price: 90 },
    ],
    units: [5, 10],
  },
  {
    key: 'HAILUO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 90 },
    ],
    units: [6, 10],
  },
  {
    key: 'HAILUOPRO',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 150 },
    ],
    units: [6],
  },
  {
    key: 'SEEDANCEI2V',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: false,
    prices: [
      { aspectRatio: '16:9', price: 90 },
      { aspectRatio: '9:16', price: 90 },
    ],
    units: [5, 10],
  },
  {
    key: 'VEO3.1I2V',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 1050 },
      { aspectRatio: '9:16', price: 1050 },
    ],
    units: [8],
  },
  {
    key: 'VEO3.1I2VFAST',
    isExpressModel: true,
    isImageToVideoModel: true,
    isTextToVideoModel: true,
    prices: [
      { aspectRatio: '16:9', price: 450 },
      { aspectRatio: '9:16', price: 450 },
    ],
    units: [8],
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
    key: "GPT4O",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 2
      },
    ]
  },
  {
    key: "GROK3",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 2
      },
    ]
  },
  {
    key: "GPTO3",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 9
      },
    ]
  },
  {
    key: "GPT5",
    prices: [
      {
        operationType: "words",
        tokens: 1000,
        price: 9
      },
    ]
  },
  {
    key: "GPT5MINI",
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
]
