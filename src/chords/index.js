// =============================================================
// VIRTUO CHORD ENGINE: MAIN ENTRYPOINT
// src/chords/index.js
// Exportação pública da biblioteca universal de acordes Virtuo
// =============================================================

export { ChordEngine } from "./chord-engine.js";

export {
  CHROMATIC_SHARPS,
  CHROMATIC_FLATS,
  ENHARMONIC_EQUIVALENTS,
  NOTE_SEMITONES,
  normalizeNote,
  enharmonicEquivalent,
  noteToMidi,
  midiToNote,
  getSemitoneDistance
} from "./notes.js";

export {
  INTERVALS,
  INTERVAL_LIST,
  getInterval
} from "./intervals.js";

export {
  CHORD_QUALITIES,
  resolveQuality
} from "./qualities.js";

export {
  buildChord,
  parseChordSymbol
} from "./chord-builder.js";

export {
  INSTRUMENTS,
  getInstrument,
  getAllInstruments,
  registerInstrument
} from "./instruments.js";

export {
  createChordShape,
  getChordShapes,
  generateCagedShapes,
  getBassPosition,
  getPianoVoicings
} from "./shapes.js";

export {
  validateChordShape
} from "./musical-validator.js";

export {
  transposeNote,
  transposeChord,
  transposeProgression
} from "./transposer.js";

export {
  searchChords,
  identifyChordFromNotes
} from "./search.js";

export {
  toEasyPlay,
  getSmartKeySubstitutions
} from "./easy-play-integration.js";

export {
  ExternalChordImporter
} from "./external-importer.js";

export {
  renderFretboardDiagramSvg,
  renderKeyboardDiagramSvg
} from "./diagram-renderer.js";
