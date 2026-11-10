// =============================================================
// VIRTUO MUSICAL ENGINE: INDEX
// src/music/index.js
// Exportação centralizada do motor musical
// =============================================================

export {
  parseChord,
  isChordToken,
  isChordLine,
  NOTE_TO_SEMITONE,
  SHARPS_SCALE,
  FLATS_SCALE
} from "./chord-parser.js";

export {
  transposeNote,
  transposeChord,
  transposeChordSheet,
  calculateKey,
  getSemitoneDistance
} from "./transposer.js";

export {
  simplifyChord,
  generateEasyPlaySheet,
  getEasyPlayCifra,
  hasEasyPlay,
  identifySubstitutableChords,
  compareOriginalAndEasyPlay
} from "./easy-play.js";

export { suggestSmartKey } from "./smart-key.js";
export { generateStudyPlan } from "./study-plan.js";

export { DEMO_SONGS } from "./demo-songs.js";

export { VirtuoMusicIntelligence, musicIntelligence } from "./music-intelligence.js";

// VIRTUO CHORD ENGINE
export {
  ChordEngine,
  CHROMATIC_SHARPS,
  CHROMATIC_FLATS,
  ENHARMONIC_EQUIVALENTS,
  NOTE_SEMITONES,
  normalizeNote,
  enharmonicEquivalent,
  noteToMidi,
  midiToNote,
  INTERVALS,
  INTERVAL_LIST,
  getInterval,
  CHORD_QUALITIES,
  resolveQuality,
  buildChord,
  parseChordSymbol,
  INSTRUMENTS,
  getInstrument,
  getAllInstruments,
  registerInstrument,
  createChordShape,
  getChordShapes,
  generateCagedShapes,
  getBassPosition,
  getPianoVoicings,
  validateChordShape,
  transposeProgression,
  searchChords,
  identifyChordFromNotes,
  toEasyPlay,
  getSmartKeySubstitutions,
  ExternalChordImporter,
  renderFretboardDiagramSvg,
  renderKeyboardDiagramSvg
} from "../chords/index.js";
