// =============================================================
// VIRTUO REAL SOUND ENGINE — SAMPLE REGISTRY & METADATA
// src/audio/sample-registry.js
// Registro estrito de procedência, metadados e licenciamento de áudio
// =============================================================

/**
 * Validação de conformidade de licença para distribuição segura
 */
export function validateSampleLicense(meta) {
  if (!meta || typeof meta !== "object") return false;
  if (!meta.id || !meta.instrument || !meta.source || !meta.license) return false;
  if (meta.redistributionAllowed !== true) return false;
  if (meta.commercialUseAllowed !== true) return false;
  return true;
}

/**
 * Catálogo Canônico de Samples do Virtuo Real Sound Engine
 * Cada entrada possui registro rigoroso de licença de uso e redistribuição
 */
export const SAMPLE_REGISTRY = {
  // -----------------------------------------------------------
  // 1. BATERIA (DRUMS)
  // -----------------------------------------------------------
  "drums-kick": {
    id: "drums-kick",
    instrument: "drums",
    articulation: "kick",
    note: null,
    frequency: 55.0,
    source: "Virtuo Acoustic Drum Library (Acoustic Kick Drum Studio Record)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/kick.wav"
  },
  "drums-snare": {
    id: "drums-snare",
    instrument: "drums",
    articulation: "snare",
    note: null,
    frequency: 180.0,
    source: "Virtuo Acoustic Drum Library (Maple Snare with Snare Wire)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/snare.wav"
  },
  "drums-hihat-closed": {
    id: "drums-hihat-closed",
    instrument: "drums",
    articulation: "hihat-closed",
    note: null,
    frequency: 8000.0,
    source: "Virtuo Acoustic Drum Library (14-inch Studio Hi-Hat Closed)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/hihat_closed.wav"
  },
  "drums-hihat-open": {
    id: "drums-hihat-open",
    instrument: "drums",
    articulation: "hihat-open",
    note: null,
    frequency: 7500.0,
    source: "Virtuo Acoustic Drum Library (14-inch Studio Hi-Hat Half-Open)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/hihat_open.wav"
  },
  "drums-crash": {
    id: "drums-crash",
    instrument: "drums",
    articulation: "crash",
    note: null,
    frequency: 5000.0,
    source: "Virtuo Acoustic Drum Library (18-inch Medium Crash Cymbal)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/crash.wav"
  },
  "drums-tom": {
    id: "drums-tom",
    instrument: "drums",
    articulation: "tom",
    note: null,
    frequency: 110.0,
    source: "Virtuo Acoustic Drum Library (12-inch Rack Tom Studio)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/drums/tom.wav"
  },

  // -----------------------------------------------------------
  // 2. CONTRABAIXO ELÉTRICO (BASS)
  // Zonas de referência por oitavas (E1, A1, D2, G2)
  // -----------------------------------------------------------
  "bass-e1": {
    id: "bass-e1",
    instrument: "bass",
    articulation: "sustain",
    note: "E1",
    frequency: 41.20,
    source: "Virtuo Studio Bass Project (Precision Electric Bass Fingerstyle)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/bass/e1.wav"
  },
  "bass-a1": {
    id: "bass-a1",
    instrument: "bass",
    articulation: "sustain",
    note: "A1",
    frequency: 55.00,
    source: "Virtuo Studio Bass Project (Precision Electric Bass Fingerstyle)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/bass/a1.wav"
  },
  "bass-d2": {
    id: "bass-d2",
    instrument: "bass",
    articulation: "sustain",
    note: "D2",
    frequency: 73.42,
    source: "Virtuo Studio Bass Project (Precision Electric Bass Fingerstyle)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/bass/d2.wav"
  },
  "bass-g2": {
    id: "bass-g2",
    instrument: "bass",
    articulation: "sustain",
    note: "G2",
    frequency: 98.00,
    source: "Virtuo Studio Bass Project (Precision Electric Bass Fingerstyle)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/bass/g2.wav"
  },

  // -----------------------------------------------------------
  // 3. PIANO ACÚSTICO (PIANO)
  // Zonas de referência (C2, C3, C4, C5)
  // -----------------------------------------------------------
  "piano-c2": {
    id: "piano-c2",
    instrument: "piano",
    articulation: "sustain",
    note: "C2",
    frequency: 65.41,
    source: "Virtuo Acoustic Piano Archive (Concert Grand Recording)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/piano/c2.wav"
  },
  "piano-c3": {
    id: "piano-c3",
    instrument: "piano",
    articulation: "sustain",
    note: "C3",
    frequency: 130.81,
    source: "Virtuo Acoustic Piano Archive (Concert Grand Recording)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/piano/c3.wav"
  },
  "piano-c4": {
    id: "piano-c4",
    instrument: "piano",
    articulation: "sustain",
    note: "C4",
    frequency: 261.63,
    source: "Virtuo Acoustic Piano Archive (Concert Grand Recording)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/piano/c4.wav"
  },
  "piano-c5": {
    id: "piano-c5",
    instrument: "piano",
    articulation: "sustain",
    note: "C5",
    frequency: 523.25,
    source: "Virtuo Acoustic Piano Archive (Concert Grand Recording)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/piano/c5.wav"
  },

  // -----------------------------------------------------------
  // 4. VIOLÃO ACÚSTICO (ACOUSTIC GUITAR)
  // Cordas soltas de referência (E2, A2, D3, G3, B3, E4)
  // -----------------------------------------------------------
  "acoustic-guitar-e2": {
    id: "acoustic-guitar-e2",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "E2",
    frequency: 82.41,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/e2.wav"
  },
  "acoustic-guitar-a2": {
    id: "acoustic-guitar-a2",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "A2",
    frequency: 110.00,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/a2.wav"
  },
  "acoustic-guitar-d3": {
    id: "acoustic-guitar-d3",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "D3",
    frequency: 146.83,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/d3.wav"
  },
  "acoustic-guitar-g3": {
    id: "acoustic-guitar-g3",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "G3",
    frequency: 196.00,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/g3.wav"
  },
  "acoustic-guitar-b3": {
    id: "acoustic-guitar-b3",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "B3",
    frequency: 246.94,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/b3.wav"
  },
  "acoustic-guitar-e4": {
    id: "acoustic-guitar-e4",
    instrument: "acoustic-guitar",
    articulation: "plucked",
    note: "E4",
    frequency: 329.63,
    source: "Virtuo Acoustic String Works (Dreadnought Acoustic Guitar)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/acoustic-guitar/e4.wav"
  },

  // -----------------------------------------------------------
  // 5. GUITARRA ELÉTRICA CLEAN (ELECTRIC GUITAR)
  // Zonas de referência (E2, A2, D3, G3, B3, E4)
  // -----------------------------------------------------------
  "electric-guitar-clean-e2": {
    id: "electric-guitar-clean-e2",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "E2",
    frequency: 82.41,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_e2.wav"
  },
  "electric-guitar-clean-a2": {
    id: "electric-guitar-clean-a2",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "A2",
    frequency: 110.00,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_a2.wav"
  },
  "electric-guitar-clean-d3": {
    id: "electric-guitar-clean-d3",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "D3",
    frequency: 146.83,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_d3.wav"
  },
  "electric-guitar-clean-g3": {
    id: "electric-guitar-clean-g3",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "G3",
    frequency: 196.00,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_g3.wav"
  },
  "electric-guitar-clean-b3": {
    id: "electric-guitar-clean-b3",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "B3",
    frequency: 246.94,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_b3.wav"
  },
  "electric-guitar-clean-e4": {
    id: "electric-guitar-clean-e4",
    instrument: "electric-guitar",
    articulation: "clean",
    note: "E4",
    frequency: 329.63,
    source: "Virtuo Studio Electric Guitar (Strat Clean Neck Pickup DI)",
    license: "CC0 1.0 Universal",
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: false,
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    version: "1.0.0",
    importedAt: "2026-09-17T00:00:00Z",
    url: "/assets/audio/instruments/electric-guitar/clean_e4.wav"
  }
};

/**
 * Retorna todos os samples registrados para um dado instrumento
 */
export function getSamplesForInstrument(instrument) {
  return Object.values(SAMPLE_REGISTRY).filter(s => s.instrument === instrument);
}
