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
  hasEasyPlay
} from "./easy-play.js";

export { DEMO_SONGS } from "./demo-songs.js";
