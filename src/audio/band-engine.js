// =============================================================
// VIRTUO BAND ENGINE 2.0
// src/audio/band-engine.js
// Motor de Acompanhamento e Banda Virtual Inteligente
// Lookahead Web Audio Scheduler com Bateria, Baixo, Teclado e Guitarra
// Suporte a 4/4, 6/8, Easy Band, Smart Band, Modo Culto e Transições Quantizadas
// 100% Client-Side Web Audio API Synthesis - Zero dependência externa
// =============================================================

import { virtuoMetronome } from "./metronome-controller.js";
import { BAND_STYLE_PATTERNS, BAND_SECTIONS } from "./band-patterns.js";
import { BandSynths } from "./band-synths.js";
import { BandHarmony } from "./band-harmony.js";
import { VirtuoMusicIntelligence } from "../music/music-intelligence.js";
import { virtuoCulto } from "./culto-mode.js";

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
    this.synths = null;
    this.channels = {};
    this.masterGain = null;
    this.masterCompressor = null;

    // Estado de reprodução
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.currentBar = 0;
    this.totalStepsPerBar = 8; // 8 em 4/4, 6 em 6/8
    this.meter = "4/4";

    // Scheduler Web Audio Lookahead
    this.nextStepTime = 0.0;
    this.scheduleAheadTime = 0.1; // 100ms
    this.lookaheadInterval = 25; // 25ms timer tick
    this.schedulerTimerId = null;

    // Estrutura e Seções
    this.currentPreset = "Worship";
    this.currentSection = "verse"; // intro, verse, pre_chorus, chorus, bridge, spontaneous, outro
    this.nextQueuedSection = null; // Para transição quantizada ao fim do compasso
    this.isTransitioning = false;
    this.currentChord = "G";
    this.currentKey = "G";

    // Intensidade (0 a 5)
    // 0: Silencioso, 1: Muito suave, 2: Suave, 3: Médio, 4: Forte, 5: Muito forte
    this.intensity = 2;

    // Controles de Ensaio e Loop
    this.isLooping = true;
    this.loopScope = "section"; // 'section' ou 'song'
    this.loopRepeatTarget = 0; // 0 = Infinito (∞), 1 = 1x, 2 = 2x, 4 = 4x
    this.loopCurrentIteration = 0;

    // Count-in (Contagem prévia)
    this.hasCountIn = false;
    this.isCountingIn = false;
    this.countInBeat = 0;

    // Modos Especiais
    this.isEasyBand = false;
    this.smartRecommendation = null;

    // Mixer de Trilhas (4 Canais: Bateria, Baixo, Teclado, Guitarra + Metrônomo)
    this.tracks = {
      drums: {
        id: "drums",
        name: "Bateria",
        icon: "🥁",
        volume: 0.8,
        muted: false,
        solo: false,
        active: true
      },
      bass: {
        id: "bass",
        name: "Baixo",
        icon: "🎸",
        volume: 0.75,
        muted: false,
        solo: false,
        active: true
      },
      keyboard: {
        id: "keyboard",
        name: "Teclado",
        icon: "🎹",
        volume: 0.7,
        muted: false,
        solo: false,
        active: true,
        mode: "pad" // 'pad', 'piano', 'keys'
      },
      guitar: {
        id: "guitar",
        name: "Guitarra",
        icon: "🎸",
        volume: 0.65,
        muted: false,
        solo: false,
        active: true,
        pattern: "arpeggio" // 'strum', 'arpeggio', 'ambient', 'worship'
      }
    };

    this.masterVolume = 0.85;
    this.listeners = new Set();

    // Sincroniza com o Metrônomo Mestre
    virtuoMetronome.onStateChange((metroState) => {
      this._notify();
    });
  }

  // -----------------------------------------------------------
  // INICIALIZAÇÃO DO MOTOR DE ÁUDIO WEB
  // -----------------------------------------------------------
  _initAudio() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this._setupAudioGraph();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  _setupAudioGraph() {
    if (!this.audioCtx) return;

    // 1. Compressor e Limitador Master para prevenir clipping
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

    // 4. Instancia sintetizadores com os canais roteados
    this.synths = new BandSynths(this.audioCtx, this.channels);
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

  _notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.warn("[BandEngine] Listener error:", e); }
    });
  }

  getState() {
    const metroBpm = virtuoMetronome.getState().bpm || 74;
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
      presetsList: Object.keys(BAND_PRESETS),
      sectionsList: BAND_SECTIONS,
      smartRecommendation: this.smartRecommendation
    };
  }

  getPresets() {
    return BAND_PRESETS;
  }

  // -----------------------------------------------------------
  // CONTROLES DE REPRODUÇÃO & SCHEDULER
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

    if (this.hasCountIn && !this.isCountingIn) {
      this._startCountIn();
      return;
    }

    this.currentStep = 0;
    this.currentBar = 0;
    this.nextStepTime = this.audioCtx ? this.audioCtx.currentTime + 0.05 : 0;
    this._notify();

    this._runScheduler();
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    if (this.schedulerTimerId) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
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

    if (this.schedulerTimerId) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    this._notify();
  }

  _startCountIn() {
    this.isCountingIn = true;
    this.countInBeat = 0;
    this._notify();

    const bpm = virtuoMetronome.getState().bpm || 74;
    const beatIntervalMs = (60000 / bpm);

    const tickCountIn = () => {
      if (!this.isPlaying || !this.isCountingIn) return;

      if (this.synths && this.audioCtx) {
        this.synths.triggerMetronomeClick(this.audioCtx.currentTime, this.countInBeat === 0, 1.0);
      }

      this.countInBeat++;
      this._notify();

      if (this.countInBeat >= (this.meter === "6/8" ? 6 : 4)) {
        this.isCountingIn = false;
        this.currentStep = 0;
        this.currentBar = 0;
        this.nextStepTime = this.audioCtx ? this.audioCtx.currentTime + 0.02 : 0;
        this._notify();
        this._runScheduler();
      } else {
        this.schedulerTimerId = setTimeout(tickCountIn, beatIntervalMs);
      }
    };

    tickCountIn();
  }

  // -----------------------------------------------------------
  // WEB AUDIO LOOKAHEAD SCHEDULER
  // -----------------------------------------------------------
  _runScheduler() {
    if (!this.isPlaying || this.isPaused || this.isCountingIn) return;

    if (!this.audioCtx) {
      // Fallback para ambientes sem Web Audio API (ex: testes de Node.js)
      this._stepFallback();
      return;
    }

    const currentTime = this.audioCtx.currentTime;

    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      this._scheduleStep(this.currentStep, this.nextStepTime);
      this._advanceStep();
    }

    this.schedulerTimerId = setTimeout(() => {
      this._runScheduler();
    }, this.lookaheadInterval);
  }

  _stepFallback() {
    const bpm = virtuoMetronome.getState().bpm || 74;
    const stepDurationMs = (60000 / bpm) / 2;
    this._scheduleStep(this.currentStep, 0);
    this._advanceStep();

    this.schedulerTimerId = setTimeout(() => {
      if (this.isPlaying) this._stepFallback();
    }, stepDurationMs);
  }

  _advanceStep() {
    const bpm = virtuoMetronome.getState().bpm || 74;
    // Em 4/4, 8 colcheias por compasso (step = 1 colcheia)
    // Em 6/8, 6 colcheias por compasso
    const stepDuration = this.meter === "6/8" 
      ? (60.0 / bpm) / 3 // 3 colcheias por tempo pontuado
      : (60.0 / bpm) / 2; // 2 colcheias por semínima

    this.nextStepTime += stepDuration;
    this.currentStep++;

    if (this.currentStep >= this.totalStepsPerBar) {
      this.currentStep = 0;
      this.currentBar++;

      // Aplica transição de seção quantizada no final do compasso
      if (this.nextQueuedSection) {
        this.currentSection = this.nextQueuedSection;
        this.nextQueuedSection = null;
        this.isTransitioning = false;
      }

      // Checa condições de Loop e repetição
      if (!this.isLooping) {
        this.stop();
        return;
      }

      if (this.loopRepeatTarget > 0) {
        this.loopCurrentIteration++;
        if (this.loopCurrentIteration >= this.loopRepeatTarget) {
          this.stop();
          return;
        }
      }
    }

    this._notify();
  }

  // -----------------------------------------------------------
  // AGENDAMENTO MUSICAL DO STEP
  // -----------------------------------------------------------
  _scheduleStep(step, time) {
    if (!this.synths) return;

    // Verifica lógica de Solo: se houver alguma trilha com solo, apenas as solo tocam!
    const hasAnySolo = Object.values(this.tracks).some(t => t.solo);

    const canPlayTrack = (trackId) => {
      const trk = this.tracks[trackId];
      if (!trk || !trk.active || trk.muted || trk.volume <= 0) return false;
      if (hasAnySolo) return trk.solo;
      return true;
    };

    // Fator de escala de intensidade (0: 0x, 1: 0.5x, 2: 0.75x, 3: 1.0x, 4: 1.2x, 5: 1.4x)
    const intensityMultipliers = [0.0, 0.5, 0.75, 1.0, 1.2, 1.4];
    const intensityScale = intensityMultipliers[this.intensity] !== undefined ? intensityMultipliers[this.intensity] : 1.0;

    // Obtém o padrão rítmico do estilo e seção
    const styleData = BAND_STYLE_PATTERNS[this.currentPreset] || BAND_STYLE_PATTERNS.Worship;
    let sectionPattern = (styleData.sections && styleData.sections[this.currentSection]) || styleData.sections?.verse || {};

    // Easy Band simplifica padrões para iniciantes
    if (this.isEasyBand) {
      sectionPattern = BAND_STYLE_PATTERNS["4/4 simples"]?.sections?.verse || sectionPattern;
    }

    // Se estiver no último compasso antes da transição, injeta fill de bateria nos tempos finais!
    const isTransitionBar = this.nextQueuedSection && step >= (this.totalStepsPerBar - 4);
    const fillPattern = styleData.sections?.fill || {};

    // 1. BATERIA
    if (canPlayTrack("drums") && this.intensity > 0) {
      const drumVol = this.tracks.drums.volume * intensityScale;

      const kickSteps = isTransitionBar && fillPattern.kick ? fillPattern.kick : (sectionPattern.kick || []);
      const snareSteps = isTransitionBar && fillPattern.snare ? fillPattern.snare : (sectionPattern.snare || []);
      const hihatSteps = isTransitionBar && fillPattern.hihat ? fillPattern.hihat : (sectionPattern.hihat || []);
      const crashSteps = sectionPattern.crash || [];
      const tomSteps = isTransitionBar && fillPattern.toms ? fillPattern.toms : [];

      if (kickSteps.includes(step)) {
        this.synths.triggerKick(time, drumVol);
      }
      if (snareSteps.includes(step)) {
        this.synths.triggerSnare(time, drumVol);
      }
      if (hihatSteps.includes(step)) {
        const isOpen = this.intensity >= 4 && (step % 2 !== 0);
        this.synths.triggerHiHat(time, drumVol * (step % 2 === 0 ? 0.8 : 0.5), isOpen);
      }
      if (crashSteps.includes(step) && this.intensity >= 3) {
        this.synths.triggerCrash(time, drumVol);
      }
      if (tomSteps.includes(step)) {
        this.synths.triggerTom(time, step % 2 === 0 ? "mid" : "low", drumVol);
      }
    }

    // 2. BAIXO INTELIGENTE
    if (canPlayTrack("bass") && this.intensity > 0) {
      const bassVol = this.tracks.bass.volume * intensityScale;
      const bassSteps = sectionPattern.bass || [0, 4];

      if (bassSteps.includes(step)) {
        const bassFreq = BandHarmony.getBassNoteForStep(
          this.currentChord,
          step,
          this.totalStepsPerBar,
          this.currentPreset,
          this.intensity
        );
        const duration = this.intensity <= 2 ? 0.6 : 0.35;
        this.synths.triggerBass(time, bassFreq, duration, bassVol, 250 + (this.intensity * 45));
      }
    }

    // 3. TECLADO / PAD
    if (canPlayTrack("keyboard") && this.intensity > 0) {
      const kbVol = this.tracks.keyboard.volume * intensityScale;
      const kbSteps = sectionPattern.keyboard || [0];

      if (kbSteps.includes(step)) {
        const chordFreqs = BandHarmony.getKeyboardFrequencies(this.currentChord, 4);
        const mode = this.tracks.keyboard.mode || "pad";
        const duration = mode === "piano" ? 0.8 : 1.8;
        this.synths.triggerKeyboardChord(time, chordFreqs, mode, duration, kbVol);
      }
    }

    // 4. GUITARRA
    if (canPlayTrack("guitar") && this.intensity > 0) {
      const gtVol = this.tracks.guitar.volume * intensityScale;
      const gtSteps = sectionPattern.guitar || [0, 2, 4, 6];

      if (gtSteps.includes(step)) {
        const gtFreqs = BandHarmony.getGuitarFrequencies(this.currentChord, 3);
        const noteIdx = step % gtFreqs.length;
        const noteFreq = gtFreqs[noteIdx] || gtFreqs[0];
        const pattern = this.tracks.guitar.pattern || "arpeggio";
        this.synths.triggerGuitarNote(time, noteFreq, pattern, 0.45, gtVol);
      }
    }
  }

  // -----------------------------------------------------------
  // CONFIGURAÇÕES MUSICAIS (TOM, PRESET, SEÇÃO, INTENSIDADE)
  // -----------------------------------------------------------
  setPreset(presetName, applyDefaultBpm = true) {
    if (!presetName) return;
    const resolvedKey = PRESET_ALIASES[presetName.toLowerCase()] || presetName;
    if (BAND_PRESETS[resolvedKey]) {
      this.currentPreset = BAND_PRESETS[resolvedKey].id;
      const stylePattern = BAND_STYLE_PATTERNS[this.currentPreset];
      if (stylePattern) {
        this.meter = stylePattern.meter || "4/4";
        this.totalStepsPerBar = stylePattern.stepsPerBar || 8;
      }
      if (applyDefaultBpm && BAND_PRESETS[resolvedKey].defaultBpm) {
        virtuoMetronome.setBpm(BAND_PRESETS[resolvedKey].defaultBpm);
      }
      this._notify();
    }
  }

  setKey(key) {
    if (!key) return;
    this.currentKey = key;
    this.currentChord = key; // Sincroniza acorde inicial com o tom
    this._notify();
  }

  setChord(chord) {
    if (!chord) return;
    this.currentChord = chord;
    this._notify();
  }

  setSection(sectionId, quantizeToBar = true) {
    const valid = BAND_SECTIONS.find(s => s.id === sectionId);
    if (!valid) return;

    if (this.isPlaying && quantizeToBar) {
      // Agenda transição quantizada para o próximo compasso
      this.nextQueuedSection = sectionId;
      this.isTransitioning = true;
      this._notify();
    } else {
      this.currentSection = sectionId;
      this.intensity = valid.defaultIntensity;
      this._notify();
    }
  }

  setIntensity(level) {
    const parsed = parseInt(level, 10);
    this.intensity = Math.max(0, Math.min(5, isNaN(parsed) ? 3 : parsed));
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
    // 0 = Infinito (∞), 1 = 1x, 2 = 2x, 4 = 4x
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
    if (this.isEasyBand) {
      // Ajusta parâmetros para simplicidade imediata
      this.tracks.keyboard.mode = "pad";
      this.tracks.guitar.pattern = "strum";
      this.intensity = 2;
    }
    this._notify();
    return this.isEasyBand;
  }

  setEasyBand(enable) {
    this.isEasyBand = !!enable;
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
        bass: "Fundamental + Quinta",
        keyboard: "Pad Celestial",
        guitar: "Arpejo Sincronizado"
      },
      dynamicMap: {
        intro: 1,
        verse: 2,
        pre_chorus: 3,
        chorus: 4,
        bridge: 3,
        outro: 5
      },
      summary: `Virtuo recomenda: Bateria ${recommendedStyle}, Baixo Fundamental/Quinta, Teclado Pad e Guitarra Arpejo com progressão dinâmica do Verso (2) ao Refrão (4).`
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
