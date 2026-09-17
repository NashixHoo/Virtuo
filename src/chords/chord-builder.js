// =============================================================
// VIRTUO CHORD ENGINE: CHORD BUILDER
// src/chords/chord-builder.js
// Construtor teórico e dinâmico de acordes musicais
// =============================================================

import { normalizeNote, NOTE_SEMITONES, CHROMATIC_SHARPS, CHROMATIC_FLATS } from "./notes.js";
import { CHORD_QUALITIES, resolveQuality } from "./qualities.js";

// Tonalidades tradicionais de bemol para escrita enarmônica correta
const FLAT_ROOTS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

// Tabela de notas por grau diatônico a partir da fundamental
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_SEMITONES = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };

const DIATONIC_STEPS = {
  0: 0,
  1: 1, 2: 1,
  3: 2, 4: 2,
  5: 3,
  6: 4, // b5 em tríades/tétrades diminutas
  7: 4, 8: 4, // 5J ou 5Aumentada
  9: 5, // 6M
  10: 6, 11: 6, // 7m ou 7M
  12: 0, // Oitava
  13: 1, 14: 1, // 9ª
  17: 3, 18: 3, // 11ª
  20: 5, 21: 5  // 13ª
};

/**
 * Calcula o nome teórico correto da nota baseando-se no grau diatônico e semitom
 * @param {string} root 
 * @param {number} semitoneInterval 
 * @param {string} qualityId 
 * @returns {string}
 */
function getTheoreticalNote(root, semitoneInterval, qualityId = "") {
  const rootLetter = root.charAt(0).toUpperCase();
  const rootLetterIdx = LETTERS.indexOf(rootLetter);
  if (rootLetterIdx === -1) return "";

  const rootSemi = NOTE_SEMITONES[normalizeNote(root)];
  if (rootSemi === undefined) return "";

  let step = DIATONIC_STEPS[semitoneInterval] ?? Math.floor((semitoneInterval % 12) / 2);
  if (semitoneInterval === 8 && qualityId === "minor6") {
    step = 5;
  }
  if (semitoneInterval === 9 && qualityId === "diminished7") {
    step = 6;
  }

  const targetLetter = LETTERS[(rootLetterIdx + step) % 7];
  const naturalSemi = NATURAL_SEMITONES[targetLetter];
  const targetSemi = (rootSemi + semitoneInterval) % 12;

  const diff = (targetSemi - naturalSemi + 12) % 12;
  if (diff === 0) return targetLetter;
  if (diff === 1) return `${targetLetter}#`;
  if (diff === 2) return `${targetLetter}##`;
  if (diff === 11) return `${targetLetter}b`;
  if (diff === 10) return `${targetLetter}bb`;

  return CHROMATIC_SHARPS[targetSemi];
}

/**
 * Constrói teoricamente um acorde musical completo a partir de sua fundamental e qualidade.
 * NÃO armazena previamente listas exaustivas; gera dinamicamente de acordo com teoria harmônica.
 * 
 * @param {string} root - Fundamental (ex: 'C', 'G#', 'Eb')
 * @param {string|Object} quality - Qualidade (ex: 'major', 'minor', '7', 'maj7', 'm7b5')
 * @param {string|null} bass - Baixo invertido (opcional, ex: 'E' para C/E)
 * @returns {Object|null} Objeto Chord canônico
 */
export function buildChord(root, quality = "major", bass = null) {
  if (!root || typeof root !== "string") return null;

  const cleanRoot = root.trim().charAt(0).toUpperCase() + root.trim().slice(1);
  const qObj = typeof quality === "object" && quality !== null ? quality : resolveQuality(quality);

  if (!qObj) return null;

  // Gera as notas teoricamente a partir dos intervalos e graus diatônicos
  const notes = qObj.intervals.map(semitones => getTheoreticalNote(cleanRoot, semitones, qObj.id));

  // Constrói o símbolo canônico
  let symbol = cleanRoot + qObj.symbol;
  let cleanBass = null;

  if (bass && typeof bass === "string") {
    cleanBass = bass.trim().charAt(0).toUpperCase() + bass.trim().slice(1);
    symbol += `/${cleanBass}`;
  }

  const id = `${cleanRoot}_${qObj.id}${cleanBass ? `_${cleanBass}` : ""}`;

  return {
    id,
    root: cleanRoot,
    quality: qObj.id,
    qualityName: qObj.name,
    intervals: [...qObj.intervals],
    notes,
    symbol,
    bass: cleanBass
  };
}

/**
 * Reconhece a raiz, qualidade e baixo a partir de uma cifra em texto (ex: 'Cmaj7', 'D/F#', 'Bbm7')
 * @param {string} symbol 
 * @returns {Object|null}
 */
export function parseChordSymbol(symbol) {
  if (!symbol || typeof symbol !== "string") return null;
  const clean = symbol.trim();
  const match = clean.match(/^([A-Ga-g][b#]?)([^/]*)(?:\/([A-Ga-g][b#]?))?$/);
  if (!match) return null;

  const root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const qualityStr = match[2] || "";
  const bass = match[3] ? match[3].charAt(0).toUpperCase() + match[3].slice(1) : null;

  const qObj = resolveQuality(qualityStr);
  if (!qObj) return null;

  return buildChord(root, qObj.id, bass);
}
