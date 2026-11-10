// =============================================================
// VIRTUO CHORD ENGINE: INTERVALS
// src/chords/intervals.js
// Definição canônica de intervalos musicais, semitons e nomes abreviados
// =============================================================

export const INTERVALS = {
  unison: {
    id: "unison",
    semitones: 0,
    name: "Uníssono",
    shortName: "P1"
  },
  minor2: {
    id: "minor2",
    semitones: 1,
    name: "Segunda Menor",
    shortName: "m2"
  },
  major2: {
    id: "major2",
    semitones: 2,
    name: "Segunda Maior",
    shortName: "M2"
  },
  minor3: {
    id: "minor3",
    semitones: 3,
    name: "Terça Menor",
    shortName: "m3"
  },
  major3: {
    id: "major3",
    semitones: 4,
    name: "Terça Maior",
    shortName: "M3"
  },
  perfect4: {
    id: "perfect4",
    semitones: 5,
    name: "Quarta Justa",
    shortName: "P4"
  },
  tritone: {
    id: "tritone",
    semitones: 6,
    name: "Trítono",
    shortName: "TT"
  },
  perfect5: {
    id: "perfect5",
    semitones: 7,
    name: "Quinta Justa",
    shortName: "P5"
  },
  minor6: {
    id: "minor6",
    semitones: 8,
    name: "Sexta Menor",
    shortName: "m6"
  },
  major6: {
    id: "major6",
    semitones: 9,
    name: "Sexta Maior",
    shortName: "M6"
  },
  minor7: {
    id: "minor7",
    semitones: 10,
    name: "Sétima Menor",
    shortName: "m7"
  },
  major7: {
    id: "major7",
    semitones: 11,
    name: "Sétima Maior",
    shortName: "M7"
  },
  octave: {
    id: "octave",
    semitones: 12,
    name: "Oitava Justa",
    shortName: "P8"
  },
  // Extensões compostas
  minor9: {
    id: "minor9",
    semitones: 13,
    name: "Nona Menor",
    shortName: "b9"
  },
  major9: {
    id: "major9",
    semitones: 14,
    name: "Nona Maior",
    shortName: "9"
  },
  perfect11: {
    id: "perfect11",
    semitones: 17,
    name: "Décima Primeira Justa",
    shortName: "11"
  },
  augmented11: {
    id: "augmented11",
    semitones: 18,
    name: "Décima Primeira Aumentada",
    shortName: "#11"
  },
  minor13: {
    id: "minor13",
    semitones: 20,
    name: "Décima Terceira Menor",
    shortName: "b13"
  },
  major13: {
    id: "major13",
    semitones: 21,
    name: "Décima Terceira Maior",
    shortName: "13"
  }
};

/**
 * Array com a lista de todos os intervalos ordenados
 */
export const INTERVAL_LIST = Object.values(INTERVALS);

/**
 * Mapeamento rápido de semitons (módulo 12 ou absoluto) para intervalo canônico
 */
const SEMITONE_TO_INTERVAL = {
  0: INTERVALS.unison,
  1: INTERVALS.minor2,
  2: INTERVALS.major2,
  3: INTERVALS.minor3,
  4: INTERVALS.major3,
  5: INTERVALS.perfect4,
  6: INTERVALS.tritone,
  7: INTERVALS.perfect5,
  8: INTERVALS.minor6,
  9: INTERVALS.major6,
  10: INTERVALS.minor7,
  11: INTERVALS.major7,
  12: INTERVALS.octave,
  13: INTERVALS.minor9,
  14: INTERVALS.major9,
  17: INTERVALS.perfect11,
  18: INTERVALS.augmented11,
  20: INTERVALS.minor13,
  21: INTERVALS.major13
};

/**
 * Obtém objeto de intervalo por semitons ou identificador
 * @param {number|string} identifier 
 * @returns {Object|null}
 */
export function getInterval(identifier) {
  if (typeof identifier === "number") {
    return SEMITONE_TO_INTERVAL[identifier] || SEMITONE_TO_INTERVAL[identifier % 12] || null;
  }
  if (typeof identifier === "string") {
    const key = identifier.toLowerCase().trim();
    if (INTERVALS[key]) return INTERVALS[key];
    // Busca por shortName
    const found = INTERVAL_LIST.find(i => i.shortName.toLowerCase() === key || i.id.toLowerCase() === key);
    return found || null;
  }
  return null;
}
