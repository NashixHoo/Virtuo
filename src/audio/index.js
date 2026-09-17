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
  SoundLibrary,
  SOUND_LIBRARY_METADATA
} from "./sound-library.js";

export {
  VirtuoClock
} from "./virtuo-clock.js";

export {
  HarmonicEngine,
  midiToFrequency,
  noteToFrequency
} from "./harmonic-engine.js";

export {
  GrooveEngine
} from "./groove-engine.js";

export {
  ArrangementEngine
} from "./arrangement-engine.js";

export {
  CultoModeController,
  virtuoCulto
} from "./culto-mode.js";

export {
  SampleManager
} from "./sample-manager.js";

export {
  SamplePlayer
} from "./sample-player.js";

export {
  RealSoundEngine
} from "./real-sound-engine.js";

export {
  SAMPLE_REGISTRY,
  validateSampleLicense,
  getSamplesForInstrument
} from "./sample-registry.js";

export {
  VirtuoConductor,
  virtuoConductor,
  CONDUCTOR_STATES,
  CONDUCTOR_EVENTS
} from "./virtuo-conductor.js";

export {
  SoundProvider,
  SyntheticSoundProvider,
  HybridSoundProvider
} from "./sound-provider.js";

export {
  MusicalArrangement,
  CANONICAL_SECTIONS,
  DEFAULT_SECTION_DYNAMICS
} from "./musical-arrangement.js";

export {
  InstrumentPlayer,
  BassPlayer,
  PianoPlayer,
  GuitarPlayer,
  AcousticGuitarPlayer,
  DrumPlayer
} from "./instrument-players.js";

export {
  MusicalEvent,
  BassNoteEvent,
  KeyboardChordEvent,
  GuitarStrumEvent,
  DrumEvent
} from "./musical-events.js";
