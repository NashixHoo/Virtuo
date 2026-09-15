// =============================================================
// VIRTUO BANDA ENGINE
// src/audio/band-engine.js
// Multi-Track Synthesizer & Virtual Rhythm Section
// Bateria, Baixo e Teclado com controles de Volume, Mute e Sincronização
// =============================================================

import { virtuoMetronome } from "./metronome-controller.js";

export class VirtuoBandEngine {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.currentStep = 0;
    this.timerId = null;

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
      currentKey: this.currentKey
    };
  }

  setKey(key) {
    this.currentKey = key || "G";
    this._notify();
  }

  setBpm(bpm) {
    virtuoMetronome.setBpm(bpm);
  }

  setTrackVolume(trackId, val) {
    if (!this.tracks[trackId]) return;
    const clamped = Math.max(0, Math.min(1, parseFloat(val) || 0));
    this.tracks[trackId].volume = clamped;
    this._notify();
  }

  toggleTrackMute(trackId) {
    if (!this.tracks[trackId]) return;
    this.tracks[trackId].muted = !this.tracks[trackId].muted;
    this._notify();
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
    this._notify();
  }

  play() {
    this._initAudio();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this._startLoop();
    this._notify();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this._notify();
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

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  _startLoop() {
    if (!this.isPlaying) return;
    const bpm = virtuoMetronome.getState().bpm || 74;
    // Cada passo é uma colcheia (8 passos por compasso quaternário 4/4)
    const stepDurationMs = (60 / bpm / 2) * 1000;

    this._playStep(this.currentStep);
    this.currentStep = (this.currentStep + 1) % 8;
    this._notify();

    this.timerId = setTimeout(() => {
      this._startLoop();
    }, stepDurationMs);
  }

  _playStep(step) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // 1. Bateria Synthesizer
    if (!this.tracks.drums.muted && this.tracks.drums.volume > 0) {
      const drumVol = this.tracks.drums.volume * this.masterVolume;
      // Kick nos tempos fortes (step 0, 4) e síncope suave no step 2
      if (step === 0 || step === 4) {
        this._triggerKick(now, drumVol);
      }
      // Snare nos tempos 2 e 6 (segundo e quarto tempos da semínima)
      if (step === 2 || step === 6) {
        this._triggerSnare(now, drumVol);
      }
      // Hi-Hat em todas as colcheias
      this._triggerHiHat(now, drumVol * (step % 2 === 0 ? 0.7 : 0.4));
    }

    // 2. Baixo Synthesizer (toca notas tônicas no compasso)
    if (!this.tracks.bass.muted && this.tracks.bass.volume > 0) {
      const bassVol = this.tracks.bass.volume * this.masterVolume;
      // Toca na cabeça do compasso e nas variações rítmicas de adoração
      if (step === 0 || step === 3 || step === 4) {
        const rootFreq = this._getFrequencyForKey(this.currentKey, -1);
        this._triggerBass(now, rootFreq, bassVol);
      }
    }

    // 3. Teclado Pad Celestial
    if (!this.tracks.keyboard.muted && this.tracks.keyboard.volume > 0) {
      const kbVol = this.tracks.keyboard.volume * this.masterVolume;
      // Dispara acorde celestial nos tempos 0 e 4
      if (step === 0) {
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

      gain.gain.setValueAtTime(vol * 0.9, time);
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
      // Noise source
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1200;
      noiseFilter.Q.value = 1.0;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.6, time);
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

      oscGain.gain.setValueAtTime(vol * 0.4, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);

      noise.start(time);
      noise.stop(time + 0.2);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch {}
  }

  _triggerHiHat(time, vol) {
    try {
      if (!this.noiseBuffer) return;
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7500;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(vol * 0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start(time);
      noise.stop(time + 0.05);
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

      gain.gain.setValueAtTime(vol * 0.6, time);
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
        gain.gain.linearRampToValueAtTime(vol * 0.22, time + 0.25);
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
    const third = isMinor ? root * 1.1892 : root * 1.2599; // Terça menor vs Terça maior
    const fifth = root * 1.4983; // Quinta justa
    return [root, third, fifth];
  }
}

export const virtuoBand = new VirtuoBandEngine();
