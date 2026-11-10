// =============================================================
// VIRTUO AFINADOR PRO — PRESETS DE INSTRUMENTOS & FILTROS
// src/features/tuner/tuner-presets.js
// Faixa padrão: 85 Hz → 1100 Hz
// Presets: Violão, Guitarra, Baixo, Voz, Ukulele (+ Cromático)
// =============================================================

export const TUNER_PRESETS = {
  guitar: {
    id: "guitar",
    name: "Violão",
    icon: "🎸",
    description: "Filtro acústico otimizado para ressonância de tampo e harmônicos",
    lowCutoff: 75,
    highCutoff: 1050,
    confidenceThreshold: 0.70,
    strings: [
      { note: "E", octave: 2, freq: 82.4, label: "6ª Mi (E2)" },
      { note: "A", octave: 2, freq: 110.0, label: "5ª Lá (A2)" },
      { note: "D", octave: 3, freq: 146.8, label: "4ª Ré (D3)" },
      { note: "G", octave: 3, freq: 196.0, label: "3ª Sol (G3)" },
      { note: "B", octave: 3, freq: 246.9, label: "2ª Si (B3)" },
      { note: "E", octave: 4, freq: 329.6, label: "1ª Mi (E4)" }
    ]
  },
  electric_guitar: {
    id: "electric_guitar",
    name: "Guitarra",
    icon: "⚡",
    description: "Filtro passa-banda para captadores elétricos e brilho de cordas de aço",
    lowCutoff: 80,
    highCutoff: 1200,
    confidenceThreshold: 0.68,
    strings: [
      { note: "E", octave: 2, freq: 82.4, label: "6ª Mi (E2)" },
      { note: "A", octave: 2, freq: 110.0, label: "5ª Lá (A2)" },
      { note: "D", octave: 3, freq: 146.8, label: "4ª Ré (D3)" },
      { note: "G", octave: 3, freq: 196.0, label: "3ª Sol (G3)" },
      { note: "B", octave: 3, freq: 246.9, label: "2ª Si (B3)" },
      { note: "E", octave: 4, freq: 329.6, label: "1ª Mi (E4)" }
    ]
  },
  bass: {
    id: "bass",
    name: "Baixo",
    icon: "🎸",
    description: "Filtro subgrave profundo com atenuação de agudos e batimentos",
    lowCutoff: 35,
    highCutoff: 450,
    confidenceThreshold: 0.66,
    strings: [
      { note: "E", octave: 1, freq: 41.2, label: "4ª Mi (E1)" },
      { note: "A", octave: 1, freq: 55.0, label: "3ª Lá (A1)" },
      { note: "D", octave: 2, freq: 73.4, label: "2ª Ré (D2)" },
      { note: "G", octave: 2, freq: 98.0, label: "1ª Sol (G2)" }
    ]
  },
  voice: {
    id: "voice",
    name: "Voz",
    icon: "🎤",
    description: "Filtro centrado na extensão vocal humana (85Hz a 1100Hz)",
    lowCutoff: 85,
    highCutoff: 1100,
    confidenceThreshold: 0.70,
    strings: []
  },
  ukulele: {
    id: "ukulele",
    name: "Ukulele",
    icon: "🪕",
    description: "Filtro agudo focado em frequências a partir de 220Hz",
    lowCutoff: 220,
    highCutoff: 1300,
    confidenceThreshold: 0.72,
    strings: [
      { note: "G", octave: 4, freq: 392.0, label: "4ª Sol (G4)" },
      { note: "C", octave: 4, freq: 261.6, label: "3ª Dó (C4)" },
      { note: "E", octave: 4, freq: 329.6, label: "2ª Mi (E4)" },
      { note: "A", octave: 4, freq: 440.0, label: "1ª Lá (A4)" }
    ]
  },
  chromatic: {
    id: "chromatic",
    name: "Cromático Livre",
    icon: "🎵",
    description: "Detecção universal sem restrições de escala",
    lowCutoff: 65,
    highCutoff: 1400,
    confidenceThreshold: 0.70,
    strings: []
  }
};

// Aliases para compatibilidade reversa
export const TUNER_INSTRUMENTS = TUNER_PRESETS;
TUNER_PRESETS.bass4 = TUNER_PRESETS.bass;
