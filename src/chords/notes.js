// =============================================================
// VIRTUO CHORD ENGINE: NOTES & PITCH SYSTEM
// src/chords/notes.js
// Sistema universal de notas, representação enarmônica e conversões MIDI
// =============================================================

export const CHROMATIC_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const CHROMATIC_FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Tabela de mapeamento enarmônico direto
 */
export const ENHARMONIC_EQUIVALENTS = {
  "Db": "C#", "C#": "Db",
  "Eb": "D#", "D#": "Eb",
  "Gb": "F#", "F#": "Gb",
  "Ab": "G#", "G#": "Ab",
  "Bb": "A#", "A#": "Bb",
  "E#": "F",  "F": "E#",
  "B#": "C",  "C": "B#",
  "Fb": "E",  "E": "Fb",
  "Cb": "B",  "B": "Cb"
};

/**
 * Mapeamento de nota para semitom (0 a 11)
 */
export const NOTE_SEMITONES = {
  "C": 0, "B#": 0,
  "C#": 1, "Db": 1,
  "D": 2,
  "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4,
  "F": 5, "E#": 5,
  "F#": 6, "Gb": 6,
  "G": 7,
  "G#": 8, "Ab": 8,
  "A": 9,
  "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11
};

/**
 * Normaliza uma nota musical para formato canônico com sustenido.
 * Ex: 'Db' -> 'C#', 'eb' -> 'D#', 'C' -> 'C'
 * @param {string} note 
 * @returns {string}
 */
export function normalizeNote(note) {
  if (!note || typeof note !== "string") return "";
  const clean = note.trim();
  const upper = clean.charAt(0).toUpperCase() + clean.slice(1);
  const semi = NOTE_SEMITONES[upper];
  if (semi === undefined) return upper;
  return CHROMATIC_SHARPS[semi];
}

/**
 * Retorna o equivalente enarmônico primário da nota.
 * Ex: 'C#' -> 'Db', 'Db' -> 'C#'
 * @param {string} note 
 * @returns {string}
 */
export function enharmonicEquivalent(note) {
  if (!note || typeof note !== "string") return "";
  const clean = note.trim();
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
  return ENHARMONIC_EQUIVALENTS[formatted] || formatted;
}

/**
 * Converte nome de nota com oitava para número MIDI.
 * Padrão internacional: C4 (Dó Central) = 60, A4 = 69.
 * Se nenhuma oitava for informada, assume oitava 4 como padrão.
 * Ex: 'C4' -> 60, 'A4' -> 69, 'E2' -> 40
 * @param {string} noteWithOctave 
 * @returns {number} Número MIDI (0-127) ou -1 se inválido
 */
export function noteToMidi(noteWithOctave) {
  if (!noteWithOctave || typeof noteWithOctave !== "string") return -1;
  const match = noteWithOctave.trim().match(/^([A-Ga-g][b#]?)(-?[0-9]+)?$/);
  if (!match) return -1;

  const noteName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = match[2] !== undefined ? parseInt(match[2], 10) : 4;
  const semitone = NOTE_SEMITONES[noteName];
  if (semitone === undefined) return -1;

  // MIDI standard: C-1 = 0, C4 = 60 -> (octave + 1) * 12 + semitone
  const midi = (octave + 1) * 12 + semitone;
  return Math.max(0, Math.min(127, midi));
}

/**
 * Converte número MIDI para nome de nota com oitava.
 * Ex: 60 -> 'C4', 69 -> 'A4', 40 -> 'E2'
 * @param {number} midiNumber 
 * @param {boolean} preferSharps 
 * @param {boolean} includeOctave 
 * @returns {string}
 */
export function midiToNote(midiNumber, preferSharps = true, includeOctave = true) {
  if (typeof midiNumber !== "number" || isNaN(midiNumber) || midiNumber < 0 || midiNumber > 127) {
    return "";
  }
  const semitone = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  const scale = preferSharps ? CHROMATIC_SHARPS : CHROMATIC_FLATS;
  const noteName = scale[semitone];
  return includeOctave ? `${noteName}${octave}` : noteName;
}

/**
 * Calcula a distância em semitons entre duas notas (direção ascendente 0 a 11)
 * @param {string} fromNote 
 * @param {string} toNote 
 * @returns {number}
 */
export function getSemitoneDistance(fromNote, toNote) {
  const s1 = NOTE_SEMITONES[fromNote?.trim()];
  const s2 = NOTE_SEMITONES[toNote?.trim()];
  if (s1 === undefined || s2 === undefined) return 0;
  return (s2 - s1 + 12) % 12;
}
