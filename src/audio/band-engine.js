// =============================================================
// VIRTUO EASY BAND ENGINE
// src/audio/band-engine.js
// Multi-Track Synthesizer & Virtual Rhythm Section with 9 Presets
// Bateria, Baixo e Teclado Pad com BPM, Volume, Mute, Loop e Intensidade
// 100% Client-Side Web Audio API Synthesis - Zero external AI / audio files
// =============================================================

import { virtuoMetronome } from "./metronome-controller.js";

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

// Ensure drums pattern object and convenient aliases exist
Object.values(BAND_PRESETS).forEach(preset => {
  preset.drums = { kick: preset.kick, snare: preset.snare, hihat: preset.hihat };
});

const PRESET_ALIASES = {
  worship: 'Worship',
  congregational: 'Congregacional',
  congregacional: 'Congregacional',
  pop: 'Pop',
  ballad: 'Balada',
  balada: 'Balada',
  rock: 'Rock',
  corinho: 'Corinho',
  slow: 'Lento',
  lento: 'Lento',
  medium: 'Médio',
  medio: 'Médio',
  médio: 'Médio',
  fast: 'Rápido',
  rapido: 'Rápido',
  rápido: 'Rápido'
};

Object.entries(PRESET_ALIASES).forEach(([alias, canonical]) => {
  if (BAND_PRESETS[canonical] && !BAND_PRESETS[alias]) {
    BAND_PRESETS[alias] = BAND_PRESETS[canonical];
  }
});

export class VirtuoBandEngine {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.currentStep = 0;
    this.timerId = null;

    // Preset & Dynamics
    this.currentPreset = "Worship";
    this.intensity = 2; // 1: Suave, 2: Médio, 3: Forte / Clímax
    this.isLooping = true;

    // Track Mixer State
    this.tracks = {
      drums: {
        id: "drums",
        name: "Bateria",
        icon: "🥁",
        volume: 0.8,
        muted: false,
        active: false
      },
      bass: {
        id: "bass",
        name: "Baixo",
        icon: "🎸",
        volume: 0.75,
        muted: false,
        active: false
      },
      keyboard: {
        id: "keyboard",
        name: "Teclado",
        icon: "🎹",
        volume: 0.7,
        muted: false,
        active: false
      }
    };

    this.masterVolume = 0.85;
    this.currentKey = "G";
    this.listeners = new Set();
    this.noiseBuffer = null;

    // Conecta alterações de BPM do metrônomo mestre
    virtuoMetronome.onStateChange((metroState) => {
      this._notify();
    });
  }

  _initAudio() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this._createNoiseBuffer();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  _createNoiseBuffer() {
    if (!this.audioCtx) return;
    const bufferSize = this.audioCtx.sampleRate * 1; // 1 segundo de ruído branco
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

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
    return {
      isPlaying: this.isPlaying,
      bpm: virtuoMetronome.getState().bpm || 74,
      currentStep: this.currentStep,
      tracks: { ...this.tracks },
      masterVolume: this.masterVolume,
      currentKey: this.currentKey,
      currentPreset: this.currentPreset,
      intensity: this.intensity,
      isLooping: this.isLooping,
      presetsList: Object.keys(BAND_PRESETS)
    };
  }

  getPresets() {
    return BAND_PRESETS;
  }

  setPreset(presetName, applyDefaultBpm = true) {
    if (!presetName) return;
    const resolvedKey = PRESET_ALIASES[presetName.toLowerCase()] || presetName;
    if (BAND_PRESETS[resolvedKey]) {
      this.currentPreset = BAND_PRESETS[resolvedKey].id;
      if (applyDefaultBpm) {
        virtuoMetronome.setBpm(BAND_PRESETS[resolvedKey].defaultBpm);
      }
      this._notify();
    }
  }

  setIntensity(level) {
    this.intensity = Math.max(1, Math.min(3, parseInt(level, 10) || 2));
    this._notify();
  }

  setLoop(loop) {
    this.isLooping = !!loop;
    this._notify();
  }

  setLooping(loop) {
    this.setLoop(loop);
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    this._notify();
    return this.isLooping;
  }

  setKey(key) {
    this.currentKey = key;
    this._notify();
  }

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

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
    this._notify();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    this._initAudio();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentStep = 0;
    this._notify();

    this._startLoop();
  }

  stop() {
    this.isPlaying = false;
    this.currentStep = 0;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this._notify();
  }

  _startLoop() {
    if (!this.isPlaying) return;

    const metroState = virtuoMetronome.getState();
    const bpm = metroState.bpm || 74;
    // 8 steps por compasso de 4/4 (colcheias)
    const stepDurationMs = (60000 / bpm) / 2;

    this._playStep(this.currentStep);

    this.timerId = setTimeout(() => {
      this.currentStep++;
      if (this.currentStep >= 8) {
        if (!this.isLooping) {
          this.stop();
          return;
        }
        this.currentStep = 0;
      }
      this._notify();
      this._startLoop();
    }, stepDurationMs);
  }

  _playStep(step) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const preset = BAND_PRESETS[this.currentPreset] || BAND_PRESETS.Worship;

    // Intensity scale factor
    // 1: Suave (0.75x), 2: Médio (1.0x), 3: Forte/Clímax (1.25x)
    const intensityScale = this.intensity === 1 ? 0.75 : (this.intensity === 3 ? 1.25 : 1.0);

    // 1. Bateria Synthesizer
    if (!this.tracks.drums.muted && this.tracks.drums.volume > 0) {
      const drumVol = this.tracks.drums.volume * this.masterVolume * intensityScale;

      if (preset.kick.includes(step)) {
        this._triggerKick(now, drumVol);
      }
      if (preset.snare.includes(step)) {
        this._triggerSnare(now, drumVol);
      }
      if (preset.hihat.includes(step)) {
        const isAccent = step % 2 === 0;
        this._triggerHiHat(now, drumVol * (isAccent ? 0.7 : 0.4), this.intensity === 3);
      }
    }

    // 2. Baixo Synthesizer
    if (!this.tracks.bass.muted && this.tracks.bass.volume > 0) {
      const bassVol = this.tracks.bass.volume * this.masterVolume * intensityScale;
      if (preset.bass.includes(step)) {
        const rootFreq = this._getFrequencyForKey(this.currentKey, -1);
        this._triggerBass(now, rootFreq, bassVol);
      }
    }

    // 3. Teclado Pad Celestial
    if (!this.tracks.keyboard.muted && this.tracks.keyboard.volume > 0) {
      const kbVol = this.tracks.keyboard.volume * this.masterVolume * intensityScale;
      if (preset.pad.includes(step)) {
        this._triggerPadChord(now, this.currentKey, kbVol);
      }
    }
  }

  // --- SÍNTESE ACÚSTICA DA BATERIA ---
  _triggerKick(time, vol) {
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

      gain.gain.setValueAtTime(Math.min(1.0, vol * 0.9), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.25);
    } catch {}
  }

  _triggerSnare(time, vol) {
    try {
      if (!this.noiseBuffer) return;
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1200;
      noiseFilter.Q.value = 1.0;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(Math.min(1.0, vol * 0.6), time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);

      // Body tone
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);

      oscGain.gain.setValueAtTime(Math.min(1.0, vol * 0.4), time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);

      noise.start(time);
      noise.stop(time + 0.2);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch {}
  }

  _triggerHiHat(time, vol, openAccent = false) {
    try {
      if (!this.noiseBuffer) return;
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = openAccent ? 6000 : 7500;

      const duration = openAccent ? 0.09 : 0.045;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(Math.min(1.0, vol * 0.35), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start(time);
      noise.stop(time + duration + 0.01);
    } catch {}
  }

  // --- SÍNTESE DO BAIXO ---
  _triggerBass(time, freq, vol) {
    try {
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, time);
      filter.Q.value = 3.0;

      gain.gain.setValueAtTime(Math.min(1.0, vol * 0.6), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(time);
      osc.stop(time + 0.35);
    } catch {}
  }

  // --- SÍNTESE DO TECLADO (PAD CELESTIAL) ---
  _triggerPadChord(time, key, vol) {
    try {
      const chordFreqs = this._getChordFrequencies(key);
      chordFreqs.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);
        // Leve detune estéreo para brilho celestial
        osc.detune.setValueAtTime((idx % 2 === 0 ? 5 : -5), time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(700, time);

        // Ataque e release suaves para adoração
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(Math.min(1.0, vol * 0.22), time + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(time);
        osc.stop(time + 1.9);
      });
    } catch {}
  }

  _getFrequencyForKey(key, octaveShift = 0) {
    const rootNotes = {
      "C": 65.41, "C#": 69.30, "Db": 69.30,
      "D": 73.42, "D#": 77.78, "Eb": 77.78,
      "E": 82.41,
      "F": 87.31, "F#": 92.50, "Gb": 92.50,
      "G": 98.00, "G#": 103.83, "Ab": 103.83,
      "A": 110.00, "A#": 116.54, "Bb": 116.54,
      "B": 123.47
    };
    const cleanKey = (key || "G").replace("m", "").trim();
    const base = rootNotes[cleanKey] || 98.00;
    if (octaveShift === -1) return base * 0.5;
    if (octaveShift === 1) return base * 2;
    return base;
  }

  _getChordFrequencies(key) {
    const root = this._getFrequencyForKey(key, 1);
    const isMinor = (key || "").includes("m") && !key.includes("maj");
    const third = isMinor ? root * 1.1892 : root * 1.2599;
    const fifth = root * 1.4983;
    return [root, third, fifth];
  }
}

export const virtuoBand = new VirtuoBandEngine();
