// =============================================================
// VIRTUO BAND PATTERNS & RHYTHMIC STYLES
// src/audio/band-patterns.js
// Padrões musicais estruturados por estilo e seção da canção
// Compatibilidade total com a V1 e expansão completa para V2
// =============================================================

/**
 * Seções estruturais suportadas pela Virtuo
 */
export const BAND_SECTIONS = [
  { id: "intro", label: "Intro", defaultIntensity: 1 },
  { id: "verse", label: "Verso", defaultIntensity: 2 },
  { id: "pre_chorus", label: "Pré-Refrão", defaultIntensity: 3 },
  { id: "chorus", label: "Refrão", defaultIntensity: 4 },
  { id: "bridge", label: "Ponte", defaultIntensity: 3 },
  { id: "spontaneous", label: "Espontâneo", defaultIntensity: 2 },
  { id: "outro", label: "Final", defaultIntensity: 5 }
];

/**
 * Categorias e Estilos Musicais Locais (Worship, Pop, Rock, Congregacional, Balada, 4/4 simples, 6/8)
 */
export const BAND_STYLE_PATTERNS = {
  Worship: {
    id: "Worship",
    name: "Worship",
    icon: "🕊️",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 74,
    description: "Adoração suave e expansiva com pad celestial, arpejos de violão/guitarra e pulso acolhedor",
    sections: {
      intro: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      verse: {
        kick: [0, 4],
        snare: [4],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      pre_chorus: {
        kick: [0, 3, 4],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 3, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0],
        bass: [0, 2, 4, 6],
        keyboard: [0, 2, 4, 6],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 4
      },
      bridge: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      outro: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0, 4],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 5
      },
      fill: {
        kick: [0, 2],
        snare: [4, 5, 6, 7],
        toms: [2, 3, 6],
        hihat: [0, 1],
        crash: [0]
      }
    }
  },

  Pop: {
    id: "Pop",
    name: "Pop",
    icon: "⚡",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 105,
    description: "Groove moderno, síncopes enérgicas, baixo percussivo e guitarras rítmicas",
    sections: {
      intro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      verse: {
        kick: [0, 3, 4],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 2, 3, 5],
        keyboard: [0, 4],
        guitar: [0, 3, 4, 7],
        intensity: 3
      },
      pre_chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0],
        bass: [0, 1, 2, 3, 4, 5, 6, 7],
        keyboard: [0, 2, 4, 6],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 4
      },
      bridge: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 2
      },
      outro: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0, 4],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 5
      },
      fill: {
        kick: [0, 1, 2],
        snare: [4, 5, 6, 7],
        toms: [3, 4, 5],
        hihat: [0],
        crash: [0]
      }
    }
  },

  Rock: {
    id: "Rock",
    name: "Rock",
    icon: "🎸",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 120,
    description: "Ataque forte, condução aberta, bumbo impulsionador e guitarra com palhetada firme",
    sections: {
      intro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      verse: {
        kick: [0, 2, 4, 5],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 1, 2, 3, 4, 5, 6, 7],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      pre_chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 1, 2, 3, 4, 5, 6, 7],
        keyboard: [0, 4],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 4
      },
      chorus: {
        kick: [0, 1, 2, 3, 4, 5, 6, 7],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0, 4],
        bass: [0, 1, 2, 3, 4, 5, 6, 7],
        keyboard: [0, 2, 4, 6],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 5
      },
      bridge: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0, 4],
        snare: [],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      outro: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0, 2, 4, 6],
        bass: [0, 1, 2, 3, 4, 5, 6, 7],
        keyboard: [0, 4],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 5
      },
      fill: {
        kick: [0, 2, 4],
        snare: [3, 5, 6, 7],
        toms: [1, 2, 4, 5],
        hihat: [],
        crash: [0]
      }
    }
  },

  Congregacional: {
    id: "Congregacional",
    name: "Congregacional",
    icon: "⛪",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 80,
    description: "Marcação rítmica sólida para acompanhamento de canto congregacional",
    sections: {
      intro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      verse: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      pre_chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0],
        bass: [0, 2, 4, 6],
        keyboard: [0, 2, 4, 6],
        guitar: [0, 1, 2, 3, 4, 5, 6, 7],
        intensity: 4
      },
      bridge: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      outro: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        crash: [0, 4],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 5
      },
      fill: {
        kick: [0, 2],
        snare: [4, 5, 6, 7],
        toms: [2, 4, 6],
        hihat: [0, 2],
        crash: [0]
      }
    }
  },

  Balada: {
    id: "Balada",
    name: "Balada",
    icon: "🌙",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 68,
    description: "Levada lenta e expressiva para momentos de reflexão e oração",
    sections: {
      intro: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      verse: {
        kick: [0, 4],
        snare: [4],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      pre_chorus: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      chorus: {
        kick: [0, 3, 4],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0],
        bass: [0, 3, 4],
        keyboard: [0, 2, 4, 6],
        guitar: [0, 2, 4, 6],
        intensity: 4
      },
      bridge: {
        kick: [0, 4],
        snare: [4],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      outro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        crash: [0],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 2, 4, 6],
        intensity: 5
      },
      fill: {
        kick: [0],
        snare: [4, 6, 7],
        toms: [3, 5],
        hihat: [0, 2],
        crash: [0]
      }
    }
  },

  "4/4 simples": {
    id: "4/4 simples",
    name: "4/4 Simples",
    icon: "🥁",
    meter: "4/4",
    stepsPerBar: 8,
    defaultBpm: 84,
    description: "Levada padrão e direta sem floreios, ideal para estudo e iniciantes (Easy Band)",
    sections: {
      intro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      verse: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 2, 4, 6],
        intensity: 2
      },
      pre_chorus: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 3
      },
      chorus: {
        kick: [0, 2, 4, 6],
        snare: [2, 6],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7],
        crash: [0],
        bass: [0, 2, 4, 6],
        keyboard: [0, 4],
        guitar: [0, 2, 4, 6],
        intensity: 4
      },
      bridge: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0, 4],
        guitar: [0, 4],
        intensity: 3
      },
      spontaneous: {
        kick: [0],
        snare: [],
        hihat: [0, 4],
        bass: [0],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 1
      },
      outro: {
        kick: [0, 4],
        snare: [2, 6],
        hihat: [0, 2, 4, 6],
        crash: [0],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 4],
        intensity: 5
      },
      fill: {
        kick: [0, 2],
        snare: [4, 5, 6, 7],
        toms: [3, 5],
        hihat: [0, 2],
        crash: [0]
      }
    }
  },

  "6/8": {
    id: "6/8",
    name: "6/8 Worship",
    icon: "🌊",
    meter: "6/8",
    stepsPerBar: 6,
    defaultBpm: 65,
    description: "Compasso composto 6/8 com balanço ternário fluido de adoração",
    sections: {
      intro: {
        kick: [0],
        snare: [],
        hihat: [0, 1, 2, 3, 4, 5],
        bass: [0],
        keyboard: [0],
        guitar: [0, 2, 4],
        intensity: 1
      },
      verse: {
        kick: [0, 3],
        snare: [3],
        hihat: [0, 1, 2, 3, 4, 5],
        bass: [0, 3],
        keyboard: [0, 3],
        guitar: [0, 1, 2, 3, 4, 5],
        intensity: 2
      },
      pre_chorus: {
        kick: [0, 2, 3, 5],
        snare: [3],
        hihat: [0, 1, 2, 3, 4, 5],
        bass: [0, 3],
        keyboard: [0, 3],
        guitar: [0, 1, 2, 3, 4, 5],
        intensity: 3
      },
      chorus: {
        kick: [0, 2, 3, 5],
        snare: [3],
        hihat: [0, 1, 2, 3, 4, 5],
        crash: [0],
        bass: [0, 2, 3, 5],
        keyboard: [0, 1, 2, 3, 4, 5],
        guitar: [0, 1, 2, 3, 4, 5],
        intensity: 4
      },
      bridge: {
        kick: [0, 3],
        snare: [3],
        hihat: [0, 1, 2, 3, 4, 5],
        bass: [0, 3],
        keyboard: [0, 3],
        guitar: [0, 3],
        intensity: 3
      },
      spontaneous: {
        kick: [0],
        snare: [],
        hihat: [0, 3],
        bass: [0],
        keyboard: [0],
        guitar: [0, 2, 4],
        intensity: 1
      },
      outro: {
        kick: [0, 3],
        snare: [3],
        hihat: [0, 1, 2, 3, 4, 5],
        crash: [0, 3],
        bass: [0, 3],
        keyboard: [0],
        guitar: [0, 1, 2, 3, 4, 5],
        intensity: 5
      },
      fill: {
        kick: [0, 1],
        snare: [3, 4, 5],
        toms: [2, 4],
        hihat: [0],
        crash: [0]
      }
    }
  }
};
