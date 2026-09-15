// =============================================================
// VIRTUO AUDIO MODULE EXPORT
// src/audio/index.js
// Ponto de exportação unificado de áudio do Virtuo
// =============================================================

export {
  VirtuoMetronomeEngine,
  METRONOME_CONSTANTS,
  SUBDIVISIONS
} from "./metronome.js";

export {
  MetronomeController,
  virtuoMetronome
} from "./metronome-controller.js";

export {
  renderBeatIndicators,
  renderSubdivisionSelector,
  renderMinisterMetronomePanel,
  renderBandScreenComponent
} from "./metronome-view.js";

export {
  VirtuoBandEngine,
  virtuoBand,
  BAND_PRESETS
} from "./band-engine.js";

export {
  BAND_STYLE_PATTERNS,
  BAND_SECTIONS
} from "./band-patterns.js";

export {
  BandSynths
} from "./band-synths.js";

export {
  BandHarmony
} from "./band-harmony.js";

export {
  CultoModeController,
  virtuoCulto
} from "./culto-mode.js";
