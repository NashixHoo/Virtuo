// =============================================================
// VIRTUO CHORD ENGINE: INSTRUMENTS REGISTRY
// src/chords/instruments.js
// Catálogo de instrumentos e afinações com arquitetura extensível
// =============================================================

export const INSTRUMENTS = {
  "acoustic-guitar": {
    id: "acoustic-guitar",
    name: "Violão",
    family: "strings",
    tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
    strings: 6,
    fretCount: 19,
    layout: "fretboard",
    defaultOpenStrings: [40, 45, 50, 55, 59, 64] // MIDI notes
  },
  "electric-guitar": {
    id: "electric-guitar",
    name: "Guitarra",
    family: "strings",
    tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
    strings: 6,
    fretCount: 22,
    layout: "fretboard",
    defaultOpenStrings: [40, 45, 50, 55, 59, 64]
  },
  "bass": {
    id: "bass",
    name: "Baixo",
    family: "strings",
    tuning: ["E1", "A1", "D2", "G2"],
    strings: 4,
    fretCount: 24,
    layout: "fretboard",
    defaultOpenStrings: [28, 33, 38, 43]
  },
  "bass-5": {
    id: "bass-5",
    name: "Baixo 5 Cordas",
    family: "strings",
    tuning: ["B0", "E1", "A1", "D2", "G2"],
    strings: 5,
    fretCount: 24,
    layout: "fretboard",
    defaultOpenStrings: [23, 28, 33, 38, 43]
  },
  "ukulele": {
    id: "ukulele",
    name: "Ukulele",
    family: "strings",
    tuning: ["G4", "C4", "E4", "A4"],
    strings: 4,
    fretCount: 18,
    layout: "fretboard",
    defaultOpenStrings: [67, 60, 64, 69] // Re-entrant standard tuning
  },
  "cavaquinho": {
    id: "cavaquinho",
    name: "Cavaquinho",
    family: "strings",
    tuning: ["D4", "G4", "B4", "D5"],
    strings: 4,
    fretCount: 17,
    layout: "fretboard",
    defaultOpenStrings: [62, 67, 71, 74]
  },
  "keyboard": {
    id: "keyboard",
    name: "Teclado / Piano",
    family: "keyboard",
    tuning: [],
    strings: 0,
    fretCount: 0,
    layout: "keyboard",
    keys: 88,
    range: ["A0", "C8"]
  }
};

/**
 * Aliases comuns para seleção amigável
 */
const INSTRUMENT_ALIASES = {
  "violao": "acoustic-guitar",
  "viola": "acoustic-guitar",
  "guitar": "electric-guitar",
  "guitarra": "electric-guitar",
  "contrabaixo": "bass",
  "baixo": "bass",
  "baixo5": "bass-5",
  "piano": "keyboard",
  "teclado": "keyboard",
  "cavaquinho": "cavaquinho",
  "cavaco": "cavaquinho",
  "ukulele": "ukulele"
};

/**
 * Obtém a definição canônica de um instrumento por ID ou alias
 * @param {string} instrumentId 
 * @returns {Object|null}
 */
export function getInstrument(instrumentId) {
  if (!instrumentId || typeof instrumentId !== "string") return INSTRUMENTS["acoustic-guitar"];
  const clean = instrumentId.trim().toLowerCase();
  if (INSTRUMENTS[clean]) return INSTRUMENTS[clean];
  const resolved = INSTRUMENT_ALIASES[clean];
  if (resolved && INSTRUMENTS[resolved]) return INSTRUMENTS[resolved];
  return null;
}

/**
 * Retorna todos os instrumentos suportados
 * @returns {Object[]}
 */
export function getAllInstruments() {
  return Object.values(INSTRUMENTS);
}

/**
 * Registra dinamicamente um novo instrumento no motor musical
 * @param {Object} instrumentConfig 
 * @returns {boolean}
 */
export function registerInstrument(instrumentConfig) {
  if (!instrumentConfig || !instrumentConfig.id || !instrumentConfig.name) {
    return false;
  }
  INSTRUMENTS[instrumentConfig.id] = {
    ...instrumentConfig,
    family: instrumentConfig.family || "strings",
    layout: instrumentConfig.layout || "fretboard"
  };
  return true;
}
