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

