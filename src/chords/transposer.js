// =============================================================
// VIRTUO CHORD ENGINE: TRANSPOSER
// src/chords/transposer.js
// Transposição universal de notas, acordes e progressões completas
// =============================================================

import { normalizeNote, NOTE_SEMITONES, CHROMATIC_SHARPS, CHROMATIC_FLATS } from "./notes.js";
import { parseChordSymbol, buildChord } from "./chord-builder.js";

// Tonalidades tradicionais de bemol
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

/**
 * Transpõe uma nota individual por um número de semitons
 * @param {string} note 
 * @param {number} semitones 
 * @param {boolean|null} preferFlats 
 * @returns {string}
 */
export function transposeNote(note, semitones = 0, preferFlats = null) {
  if (!note || semitones === 0) return note;
  const clean = note.trim();
  const semi = NOTE_SEMITONES[clean];
  if (semi === undefined) return note;

  let targetSemi = (semi + semitones) % 12;
  if (targetSemi < 0) targetSemi += 12;

  let useFlats = false;
  if (preferFlats !== null) {
    useFlats = preferFlats;
  } else if (clean.includes("b")) {
    useFlats = true;
  }

  const scale = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  return scale[targetSemi];
}

/**
 * Transpõe um acorde (string ou objeto Chord) por um número de semitons
 * @param {string|Object} chord 
 * @param {number} semitones 
 * @param {boolean|null} preferFlats 
 * @returns {string|Object}
 */
export function transposeChord(chord, semitones = 0, preferFlats = null) {
  if (!chord || semitones === 0) return chord;

  const isObject = typeof chord === "object" && chord !== null;
  const symbol = isObject ? (chord.symbol || chord.chord) : chord;

  const parsed = parseChordSymbol(symbol);
  if (!parsed) return chord;

  const newRoot = transposeNote(parsed.root, semitones, preferFlats);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, preferFlats) : null;

  const transposedChord = buildChord(newRoot, parsed.quality, newBass);

  if (isObject) {
    return {
      ...chord,
      ...transposedChord,
      symbol: transposedChord.symbol
    };
  }

  return transposedChord.symbol;
}

/**
 * Transpõe uma sequência ou progressão de acordes
 * @param {string[]|string} progression - Array de acordes ou string separada por espaços/hífens
 * @param {number} semitones - Deslocamento em semitons
 * @param {boolean|null} preferFlats 
 * @returns {string[]|string}
 */
export function transposeProgression(progression, semitones = 0, preferFlats = null) {
  if (!progression || semitones === 0) return progression;

  if (Array.isArray(progression)) {
    return progression.map(c => transposeChord(c, semitones, preferFlats));
  }

  if (typeof progression === "string") {
    // Detecta separador comum (espaço, traço, vírgula)
    const tokens = progression.trim().split(/(\s+|-|,)/);
    const transposedTokens = tokens.map(token => {
      if (/^[A-Ga-g][b#]?/.test(token.trim())) {
        return transposeChord(token.trim(), semitones, preferFlats);
      }
      return token;
    });
    return transposedTokens.join("");
  }

  return progression;
}
