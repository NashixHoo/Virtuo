// =============================================================
// VIRTUO BAND ENGINE 2.0 (REAL BAND ENGINE)
// src/audio/band-engine.js
// Motor de Acompanhamento e Banda Virtual Inteligente
// Lookahead Web Audio Scheduler com Bateria, Baixo, Teclado e Guitarra
// Suporte a 4/4, 6/8, Easy Band, Smart Band, Modo Culto e Transições Quantizadas
// Timbres realistas e progressões harmônicas dinâmicas
// Registro de Licença e Procedência:
// { source: "Virtuo Internal Sound Engine (Web Audio Synthesis & Modeling)", license: "MIT", attribution: "Virtuo Musical Architecture", version: "2.1.0" }
// =============================================================

import { virtuoMetronome } from "./metronome-controller.js";
import { BAND_STYLE_PATTERNS, BAND_SECTIONS } from "./band-patterns.js";
import { BandHarmony } from "./band-harmony.js";
import { VirtuoMusicIntelligence } from "../music/music-intelligence.js";
import { virtuoCulto } from "./culto-mode.js";

// Sub-motores canônicos da arquitetura Virtuo Real Band Engine
import { SoundLibrary, SOUND_LIBRARY_METADATA } from "./sound-library.js";
import { VirtuoClock } from "./virtuo-clock.js";
import { HarmonicEngine } from "./harmonic-engine.js";
import { GrooveEngine } from "./groove-engine.js";
import { ArrangementEngine } from "./arrangement-engine.js";

// =============================================================
// PRESETS COMPATÍVEIS COM V1 E V2
// =============================================================
export const BAND_PRESETS = {
  Worship: {
    id: "Worship",
    name: "Worship",
    icon: "🕊️",
    defaultBpm: 74,
    description: "Adoração suave e expansiva com pad celestial e kick acolhedor",
    kick: [0, 4],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 3, 4],
    pad: [0, 4]
  },
  Congregacional: {
    id: "Congregacional",
    name: "Congregacional",
    icon: "⛪",
    defaultBpm: 80,
    description: "Marcação rítmica sólida para acompanhamento de canto congregacional",
    kick: [0, 2, 4, 6],
    snare: [2, 6],
    hihat: [0, 2, 4, 6],
    bass: [0, 2, 4, 6],
    pad: [0]
  },
  Pop: {
    id: "Pop",
    name: "Pop",
    icon: "⚡",
    defaultBpm: 105,
    description: "Groove moderno, síncopes enérgicas e baixo percussivo",
    kick: [0, 3, 4],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 2, 3, 5],
    pad: [0, 4]
  },
  Balada: {
    id: "Balada",
    name: "Balada",
    icon: "🌙",
    defaultBpm: 68,
    description: "Levada lenta e expressiva para momentos de reflexão e oração",
    kick: [0, 4],
    snare: [4],
    hihat: [0, 2, 4, 6],
    bass: [0, 4],
    pad: [0]
  },
  Rock: {
    id: "Rock",
    name: "Rock",
    icon: "🎸",
    defaultBpm: 120,
    description: "Ataque forte, condução aberta e bumbo impulsionador",
    kick: [0, 2, 4, 5],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 1, 2, 3, 4, 5, 6, 7],
    pad: [0, 2, 4, 6]
  },
  "4/4 simples": {
    id: "4/4 simples",
    name: "4/4 Simples",
    icon: "🥁",
    defaultBpm: 84,
    description: "Levada padrão e direta sem floreios, ideal para estudo e Easy Band",
    kick: [0, 4],
    snare: [2, 6],
    hihat: [0, 2, 4, 6],
    bass: [0, 4],
    pad: [0, 4]
  },
  "6/8": {
    id: "6/8",
    name: "6/8 Worship",
    icon: "🌊",
    defaultBpm: 65,
    description: "Compasso composto 6/8 com balanço ternário fluido de adoração",
    kick: [0, 3],
    snare: [3],
    hihat: [0, 1, 2, 3, 4, 5],
    bass: [0, 3],
    pad: [0, 3]
  },
  Corinho: {
    id: "Corinho",
    name: "Corinho",
    icon: "🔥",
    defaultBpm: 138,
    description: "Ritmo sincopado e festivo tradicional de júbilo e celebração",
    kick: [0, 3, 4, 7],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 2, 4, 6],
    pad: [1, 3, 5, 7]
  },
  Lento: {
    id: "Lento",
    name: "Lento",
    icon: "⏳",
    defaultBpm: 60,
    description: "Espaço amplo, tempo estendido e ambiência profunda",
    kick: [0],
    snare: [4],
    hihat: [0, 4],
    bass: [0],
    pad: [0]
  },
  Médio: {
    id: "Médio",
    name: "Médio",
    icon: "⚖️",
    defaultBpm: 92,
    description: "Andamento equilibrado para canções de louvor geral",
    kick: [0, 4],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 3, 4, 7],
    pad: [0, 4]
  },
  Rápido: {
    id: "Rápido",
    name: "Rápido",
    icon: "🚀",
    defaultBpm: 130,
    description: "Celebração vibrante com pulso contínuo e dinâmica cheia",
    kick: [0, 2, 4, 6],
    snare: [2, 6],
    hihat: [0, 1, 2, 3, 4, 5, 6, 7],
    bass: [0, 2, 4, 6],
    pad: [0, 4]
  }
};

// Aliases para compatibilidade total
Object.values(BAND_PRESETS).forEach(preset => {
  preset.drums = { kick: preset.kick, snare: preset.snare, hihat: preset.hihat };
});

const PRESET_ALIASES = {
  worship: "Worship",
  congregational: "Congregacional",
  congregacional: "Congregacional",
  pop: "Pop",
  ballad: "Balada",
  balada: "Balada",
  rock: "Rock",
  "4/4": "4/4 simples",
  "4/4 simples": "4/4 simples",
  "6/8": "6/8",
  corinho: "Corinho",
  slow: "Lento",
  lento: "Lento",
  medium: "Médio",
  medio: "Médio",
  médio: "Médio",
  fast: "Rápido",
  rapido: "Rápido",
  rápido: "Rápido"
};

Object.entries(PRESET_ALIASES).forEach(([alias, canonical]) => {
  if (BAND_PRESETS[canonical] && !BAND_PRESETS[alias]) {
    BAND_PRESETS[alias] = BAND_PRESETS[canonical];
  }
});

// =============================================================
// MOTOR PRINCIPAL: VIRTUO BAND ENGINE
// =============================================================
export class VirtuoBandEngine {
  constructor() {
    this.audioCtx = null;
    this.channels = {};
    this.masterGain = null;
    this.masterCompressor = null;

    // Sub-motores modulares integrados
    this.harmonicEngine = new HarmonicEngine();
    this.grooveEngine = new GrooveEngine();
    this.clock = new VirtuoClock(null);
    this.soundLibrary = null;
    this.arrangementEngine = null;

    // Estado de reprodução
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.currentBar = 0;
    this.totalStepsPerBar = 8;
    this.meter = "4/4";

    // Configuração musical
    this.currentKey = "G";
    this.currentChord = "G";
    this.currentPreset = "Worship";
    this.currentSection = "verse";
    this.nextQueuedSection = null;
    this.intensity = 2; // 0 a 5
    this.masterVolume = 0.85;

    // Modos de ensaio e loop
    this.isLooping = true;
    this.loopScope = "section"; // "bar" | "section" | "song"
    this.loopRepeatTarget = 0;   // 0 = infinito
    this.loopCurrentIteration = 0;

    // Contagem regressiva (Count-In)
    this.hasCountIn = false;
    this.isCountingIn = false;
    this.countInBeatsRemaining = 0;

    // Modo Easy Band
    this.isEasyBand = false;

    // Recomendações Smart Band
    this.smartRecommendation = null;

    // Canais e Mixer
    this.tracks = {
      drums: {
        id: "drums",
        name: "Bateria",
        volume: 0.8,
        muted: false,
        solo: false,
        active: true
      },
      bass: {
        id: "bass",
        name: "Baixo",
        volume: 0.75,
        muted: false,
        solo: false,
        active: true
      },
      keyboard: {
        id: "keyboard",
        name: "Teclado / Pad",
        volume: 0.7,
        muted: false,
        solo: false,
        active: true,
        mode: "pad" // "pad" | "piano" | "keys"
      },
      guitar: {
        id: "guitar",
        name: "Violão / Guitarra",
        volume: 0.7,
        muted: false,
        solo: false,
        active: true,
        pattern: "arpeggio" // "strum" | "arpeggio" | "ambient"
      }
    };

    // Subscrição de ouvintes reativos
    this.listeners = new Set();

    // Vincula o relógio mestre global
    this._bindMasterClock();

    // Sincroniza metrônomo do Virtuo
    if (typeof virtuoMetronome !== "undefined" && virtuoMetronome.onStateChange) {
      virtuoMetronome.onStateChange(metroState => {
        if (metroState && metroState.bpm) {
          this.clock.setBpm(metroState.bpm);
        }
      });
    }
  }

  // -----------------------------------------------------------
  // CONFIGURAÇÃO DO GRAFO DE ÁUDIO WEB AUDIO API
  // -----------------------------------------------------------
  _initAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = typeof window !== "undefined"
      ? (window.AudioContext || window.webkitAudioContext)
      : null;

    if (AudioContextClass) {
      try {
        this.audioCtx = new AudioContextClass();
        this._setupAudioGraph();
        this.clock.setAudioContext(this.audioCtx);
      } catch (err) {
        console.warn("[BandEngine] Web Audio não pôde ser iniciado:", err);
      }
    }
  }

  _setupAudioGraph() {
    if (!this.audioCtx) return;

    // 1. Compressor e Limitador Master para prevenir clipping e aspereza
    this.masterCompressor = this.audioCtx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-3, this.audioCtx.currentTime);
    this.masterCompressor.knee.setValueAtTime(6, this.audioCtx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.05, this.audioCtx.currentTime);

    // 2. Ganho Master
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);

    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    // 3. Canais Individuais com GainNodes dedicados
    this.channels = {
      drums: this.audioCtx.createGain(),
      bass: this.audioCtx.createGain(),
      keyboard: this.audioCtx.createGain(),
      guitar: this.audioCtx.createGain(),
      metronome: this.audioCtx.createGain()
    };

    Object.values(this.channels).forEach(channelNode => {
      channelNode.connect(this.masterCompressor);
    });

    // 4. Instancia a SoundLibrary realista e o ArrangementEngine
    this.soundLibrary = new SoundLibrary(this.audioCtx, this.channels);
    this.synths = this.soundLibrary; // Retrocompatibilidade completa com chamadas diretas a synths
    this.arrangementEngine = new ArrangementEngine(this.soundLibrary, this.harmonicEngine, this.grooveEngine);
  }

  // -----------------------------------------------------------
  // VINCULAÇÃO DO RELÓGIO MESTRE UNIFICADO
  // -----------------------------------------------------------
  _bindMasterClock() {
    this.clock.onTick = (stepInfo) => {
      this.currentStep = stepInfo.step;
      this.currentBar = stepInfo.bar;
      this.totalStepsPerBar = stepInfo.totalStepsPerBar;

      // Executa orquestração e síntese pelo ArrangementEngine
      if (this.arrangementEngine) {
        this.arrangementEngine.scheduleStep(stepInfo, this.tracks);
      }

      // Notifica interface se estiver no primeiro step do tempo
      if (stepInfo.step % 2 === 0) {
        this._notify();
      }
    };

    this.clock.onBarChange = (newBar) => {
      // Avança a progressão harmônica se houver mais de um acorde carregado
      if (this.harmonicEngine.activeProgression.length > 1) {
        const nextInfo = this.harmonicEngine.advanceBar();
        this.currentChord = nextInfo.symbol;
      }

      // Aplica transição de seção quantizada no início do novo compasso
      if (this.nextQueuedSection) {
        this.grooveEngine.clearQueuedTransition();
        this.currentSection = this.grooveEngine.currentSection;
        this.nextQueuedSection = null;
      }

      // Contabiliza iterações de loop
      if (this.isLooping && this.loopRepeatTarget > 0) {
        this.loopCurrentIteration++;
        if (this.loopCurrentIteration >= this.loopRepeatTarget) {
          this.stop();
          return;
        }
      }

      this._notify();
    };
  }

  // -----------------------------------------------------------
  // NOTIFICAÇÃO E ESTADO
  // -----------------------------------------------------------
  onStateChange(fn) {
    if (typeof fn === "function") {
      this.listeners.add(fn);
      fn(this.getState());
    }
    return () => this.listeners.delete(fn);
  }

  subscribe(fn) {
    return this.onStateChange(fn);
  }

  _notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.warn("[BandEngine] Listener error:", e); }
    });
  }

  getState() {
    const metroBpm = virtuoMetronome.getState().bpm || 74;
    const harmonicInfo = this.harmonicEngine.getCurrentChordInfo();

    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      bpm: metroBpm,
      meter: this.meter,
      currentStep: this.currentStep,
      currentBar: this.currentBar,
      totalStepsPerBar: this.totalStepsPerBar,
      tracks: { ...this.tracks },
      masterVolume: this.masterVolume,
      currentKey: this.currentKey,
      currentChord: this.currentChord,
      nextChord: harmonicInfo.nextChordSymbol,
      activeProgression: [...this.harmonicEngine.activeProgression],
      progressionIndex: this.harmonicEngine.progressionIndex,
      chordNotes: harmonicInfo.notes,
      bassNote: harmonicInfo.bassNote,
      currentPreset: this.currentPreset,
      currentSection: this.currentSection,
      nextQueuedSection: this.nextQueuedSection,
      intensity: this.intensity,
      isLooping: this.isLooping,
      loopScope: this.loopScope,
      loopRepeatTarget: this.loopRepeatTarget,
      loopCurrentIteration: this.loopCurrentIteration,
      hasCountIn: this.hasCountIn,
      isCountingIn: this.isCountingIn,
      isEasyBand: this.isEasyBand,
      soundLibraryMetadata: SOUND_LIBRARY_METADATA,
      presetsList: Object.keys(BAND_PRESETS),
      sectionsList: BAND_SECTIONS,
      smartRecommendation: this.smartRecommendation
    };
  }

  getPresets() {
    return BAND_PRESETS;
  }

  // -----------------------------------------------------------
  // CONTROLES DE REPRODUÇÃO (UNIFICADOS NO RELÓGIO VIRTUO)
  // -----------------------------------------------------------
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this._initAudio();
    if (this.isPlaying && !this.isPaused) return;

    this.isPlaying = true;
    this.isPaused = false;

    // Sincroniza BPM do metrônomo para o relógio
    const metroBpm = virtuoMetronome.getState().bpm || 74;
    this.clock.setBpm(metroBpm);
    this.clock.setMeter(this.meter);

    this.currentStep = 0;
    this.currentBar = 0;
    this._notify();

    this.clock.start();
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    this.clock.pause();
    this._notify();
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.isCountingIn = false;
    this.currentStep = 0;
    this.currentBar = 0;
    this.loopCurrentIteration = 0;
    this.nextQueuedSection = null;

    this.clock.stop();
    this.harmonicEngine.progressionIndex = 0;
    if (this.harmonicEngine.activeProgression.length > 0) {
      this.currentChord = this.harmonicEngine.activeProgression[0];
    }
    this._notify();
  }

  // -----------------------------------------------------------
  // CARREGAMENTO DE PROGRESSÕES E MÚSICAS PARA O MODO ENSAIO
  // -----------------------------------------------------------

  /**
   * Carrega uma progressão harmônica explícita para acompanhamento dinâmico
   */
  loadProgression(progression, key = "G", bpm = 74) {
    this.setKey(key);
    this.harmonicEngine.setProgression(progression);
    this.currentChord = this.harmonicEngine.getCurrentChordInfo().symbol;
    this.setBpm(bpm);
    this._notify();
    return this.harmonicEngine.activeProgression;
  }

  /**
   * Carrega uma canção completa para ensaio com a banda virtual
   */
  loadSong(song, keyOffset = 0, isEasy = false, rehearsalBpm = null) {
    if (!song) return null;

    const baseKey = song.originalKey || song.key || "G";
    this.setKey(baseKey);

    const progression = this.harmonicEngine.loadSongProgression(song, keyOffset, isEasy);
    this.currentChord = this.harmonicEngine.getCurrentChordInfo().symbol;

    const targetBpm = rehearsalBpm || song.bpm || 74;
    this.setBpm(targetBpm);

    // Ajusta estilo conforme recomendação ou tipo de música
    const rec = this.getSmartBandRecommendation(song);
    if (rec && rec.recommendedStyle) {
      this.setPreset(rec.recommendedStyle, false);
    }

    if (isEasy) {
      this.setEasyBand(true);
    }

    this._notify();
    return {
      progression,
      key: this.currentKey,
      bpm: targetBpm,
      currentChord: this.currentChord
    };
  }

  getHarmonicState() {
    return this.harmonicEngine.getCurrentChordInfo();
  }

  // -----------------------------------------------------------
  // CONFIGURAÇÕES MUSICAIS (TOM, PRESET, SEÇÃO, INTENSIDADE)
  // -----------------------------------------------------------
  setPreset(presetName, applyDefaultBpm = true) {
    if (!presetName) return;
    const resolvedKey = PRESET_ALIASES[presetName.toLowerCase()] || presetName;
    if (BAND_PRESETS[resolvedKey]) {
      this.currentPreset = BAND_PRESETS[resolvedKey].id;
      this.grooveEngine.setPreset(this.currentPreset);

      const stylePattern = BAND_STYLE_PATTERNS[this.currentPreset];
      if (stylePattern) {
        this.meter = stylePattern.meter || "4/4";
        this.totalStepsPerBar = stylePattern.stepsPerBar || 8;
        this.clock.setMeter(this.meter);
      }
      if (applyDefaultBpm && BAND_PRESETS[resolvedKey].defaultBpm) {
        virtuoMetronome.setBpm(BAND_PRESETS[resolvedKey].defaultBpm);
        this.clock.setBpm(BAND_PRESETS[resolvedKey].defaultBpm);
      }
      this._notify();
    }
  }

  setKey(key) {
    if (!key) return;
    this.currentKey = String(key).trim();
    this.harmonicEngine.setKey(this.currentKey);
    this.currentChord = this.harmonicEngine.currentChord;
    this._notify();
  }

  setChord(chord) {
    if (!chord) return;
    this.currentChord = String(chord).trim();
    this.harmonicEngine.setChord(this.currentChord);
    this._notify();
  }

  setSection(sectionId, quantizeToBar = true) {
    const valid = BAND_SECTIONS.find(s => s.id === sectionId);
    if (!valid) return;

    if (this.isPlaying && quantizeToBar) {
      this.nextQueuedSection = sectionId;
      this.grooveEngine.queueSectionTransition(sectionId);
      this._notify();
    } else {
      this.currentSection = sectionId;
      this.grooveEngine.setSection(sectionId);
      this.intensity = valid.defaultIntensity;
      this.grooveEngine.setIntensity(this.intensity);
      this._notify();
    }
  }

  setIntensity(level) {
    const parsed = parseInt(level, 10);
    this.intensity = Math.max(0, Math.min(5, isNaN(parsed) ? 3 : parsed));
    this.grooveEngine.setIntensity(this.intensity);
    this._notify();
  }

  // -----------------------------------------------------------
  // CONTROLES DE LOOP E ENSAIO
  // -----------------------------------------------------------
  setLoop(enable) {
    this.isLooping = !!enable;
    this._notify();
  }

  setLooping(enable) {
    this.setLoop(enable);
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    this._notify();
    return this.isLooping;
  }

  setLoopRepeatTarget(times) {
    this.loopRepeatTarget = parseInt(times, 10) || 0;
    this.loopCurrentIteration = 0;
    this._notify();
  }

  setCountIn(enable) {
    this.hasCountIn = !!enable;
    this._notify();
  }

  toggleCountIn() {
    this.hasCountIn = !this.hasCountIn;
    this._notify();
    return this.hasCountIn;
  }

  // -----------------------------------------------------------
  // AJUSTE DE BPM
  // -----------------------------------------------------------
  setBpm(bpm) {
    const clamped = Math.max(40, Math.min(240, parseInt(bpm, 10) || 74));
    virtuoMetronome.setBpm(clamped);
    this.clock.setBpm(clamped);
    this._notify();
  }

  adjustBpm(delta) {
    const current = virtuoMetronome.getState().bpm || 74;
    this.setBpm(current + delta);
  }

  setHalfBpm() {
    const current = virtuoMetronome.getState().bpm || 74;
    this.setBpm(Math.round(current / 2));
  }

  setDoubleBpm() {
    const current = virtuoMetronome.getState().bpm || 74;
    this.setBpm(current * 2);
  }

  // -----------------------------------------------------------
  // MIXER E CANAIS (VOLUME, MUTE, SOLO, ACTIVE)
  // -----------------------------------------------------------
  setTrackVolume(trackId, volume) {
    if (this.tracks[trackId]) {
      this.tracks[trackId].volume = Math.max(0, Math.min(1, parseFloat(volume)));
      this._notify();
    }
  }

  toggleTrackMute(trackId) {
    if (this.tracks[trackId]) {
      this.tracks[trackId].muted = !this.tracks[trackId].muted;
      this._notify();
    }
  }

  toggleTrackSolo(trackId) {
    if (this.tracks[trackId]) {
      this.tracks[trackId].solo = !this.tracks[trackId].solo;
      this._notify();
    }
  }

  toggleTrackActive(trackId) {
    if (this.tracks[trackId]) {
      this.tracks[trackId].active = !this.tracks[trackId].active;
      this._notify();
    }
  }

  setKeyboardMode(mode) {
    if (["pad", "piano", "keys"].includes(mode) && this.tracks.keyboard) {
      this.tracks.keyboard.mode = mode;
      this._notify();
    }
  }

  setGuitarPattern(pattern) {
    if (["strum", "arpeggio", "ambient", "worship"].includes(pattern) && this.tracks.guitar) {
      this.tracks.guitar.pattern = pattern;
      this._notify();
    }
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    }
    this._notify();
  }

  // -----------------------------------------------------------
  // EASY BAND (MODO SIMPLIFICADO PARA INICIANTES)
  // -----------------------------------------------------------
  toggleEasyBand() {
    this.isEasyBand = !this.isEasyBand;
    this.setEasyBand(this.isEasyBand);
    return this.isEasyBand;
  }

  setEasyBand(enable) {
    this.isEasyBand = !!enable;
    this.grooveEngine.setEasyBand(this.isEasyBand);
    this.harmonicEngine.setEasyPlay(this.isEasyBand);

    if (this.isEasyBand) {
      this.tracks.keyboard.mode = "pad";
      this.tracks.guitar.pattern = "strum";
      this.intensity = 2;
      this.grooveEngine.setIntensity(2);
    }
    this._notify();
  }

  // -----------------------------------------------------------
  // SMART BAND (ANÁLISE INTELIGENTE & RECOMENDAÇÃO)
  // -----------------------------------------------------------
  getSmartBandRecommendation(song) {
    if (!song) return null;

    const analysis = VirtuoMusicIntelligence.analyzeSong(song);
    const bpm = song.bpm || analysis.bpm || 74;
    const key = song.key || song.originalKey || analysis.key || "G";

    let recommendedStyle = "Worship";
    if (bpm > 115) recommendedStyle = "Rock";
    else if (bpm > 95) recommendedStyle = "Pop";
    else if (bpm < 70) recommendedStyle = "Balada";

    const rec = {
      songTitle: song.title || "Canção",
      recommendedStyle,
      bpm,
      key,
      tracks: {
        drums: `${recommendedStyle} ${bpm > 100 ? 'Energético' : 'Suave'}`,
        bass: "Fundamental + Quinta + Condução Harmônica",
        keyboard: "Pad Celestial / Piano Acústico",
        guitar: "Arpejo & Palhetada Sincronizada"
      },
      dynamicMap: {
        intro: 1,
        verse: 2,
        pre_chorus: 3,
        chorus: 4,
        bridge: 3,
        outro: 5
      },
      summary: `Virtuo recomenda: Bateria ${recommendedStyle}, Baixo com condução harmônica, Teclado com voicings naturais e Violão em dedilhado.`
    };

    this.smartRecommendation = rec;
    this._notify();
    return rec;
  }

  applySmartBandRecommendation(song) {
    const rec = this.getSmartBandRecommendation(song);
    if (!rec) return;

    this.setPreset(rec.recommendedStyle, false);
    this.setBpm(rec.bpm);
    this.setKey(rec.key);
    this.setSection("verse", false);
    this.setIntensity(2);
    this._notify();
  }
}

// Instância Singleton para uso global
export const virtuoBand = new VirtuoBandEngine();
