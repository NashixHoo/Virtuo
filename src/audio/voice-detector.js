// =============================================================
// VIRTUO VOICE DETECTOR & PITCH ANALYZER
// src/audio/voice-detector.js
// Local real-time pitch detection via Web Audio API
// High-pass (85Hz) & Low-pass (1100Hz) Human Voice Filtering
// Sub-sample Parabolic Autocorrelation for accurate Cents & Note calculation
// 100% Client-Side - Zero external APIs, zero audio persistence
// =============================================================

import { perfMonitor } from "../performance/performance-monitor.js";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export class VirtuoVoiceDetector {
  constructor(options = {}) {
    this.lowCutoff = options.lowCutoff || 85;    // Hz
    this.highCutoff = options.highCutoff || 1100; // Hz
    this.silenceThreshold = options.silenceThreshold || 0.012; // RMS
    this.confidenceThreshold = options.confidenceThreshold || 0.72; // 0..1
    this.bufferSize = options.bufferSize || 2048;

    this.audioCtx = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.isRunning = false;
    this.animFrameId = null;

    // Pre-allocated buffers to prevent garbage collection spikes in real time
    this.timeBuffer = new Float32Array(this.bufferSize);

    // Performance Stats (Measured, zero mock values)
    this.stats = {
      framesProcessed: 0,
      framesDropped: 0,
      processingTimes: [],
      maxHistory: 100,
      averageProcessingMs: 0,
      p95ProcessingMs: 0,
      maxProcessingMs: 0,
      latencyMs: 0
    };

    this.listeners = new Set();
  }

  setFilterRange(low, high) {
    this.lowCutoff = Math.max(20, Math.min(low, 500));
    this.highCutoff = Math.max(this.lowCutoff + 50, Math.min(high, 5000));
    if (this.highpassFilter) {
      this.highpassFilter.frequency.setValueAtTime(this.lowCutoff, this.audioCtx.currentTime);
    }
    if (this.lowpassFilter) {
      this.lowpassFilter.frequency.setValueAtTime(this.highCutoff, this.audioCtx.currentTime);
    }
  }

  onPitchDetected(fn) {
    if (typeof fn === "function") {
      this.listeners.add(fn);
    }
    return () => this.listeners.delete(fn);
  }

  _notify(data) {
    this.listeners.forEach(fn => {
      try { fn(data); } catch (e) { console.warn("[VoiceDetector] Listener error:", e); }
    });
  }

  async start() {
    if (this.isRunning) return true;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microfone não suportado neste navegador ou ambiente.");
    }

    const tStart = performance.now();

    // 1. Pedir permissão de microfone somente quando a função for acionada
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // 2. Montar Audio Processing Pipeline
    // Microfone -> HighPass (85Hz) -> LowPass (1100Hz) -> Analyser
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    this.highpassFilter = this.audioCtx.createBiquadFilter();
    this.highpassFilter.type = "highpass";
    this.highpassFilter.frequency.setValueAtTime(this.lowCutoff, this.audioCtx.currentTime);

    this.lowpassFilter = this.audioCtx.createBiquadFilter();
    this.lowpassFilter.type = "lowpass";
    this.lowpassFilter.frequency.setValueAtTime(this.highCutoff, this.audioCtx.currentTime);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = this.bufferSize;

    this.sourceNode.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.analyser);

    this.isRunning = true;
    this.stats.latencyMs = parseFloat((performance.now() - tStart).toFixed(2));

    this._startProcessingLoop();
    return true;
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.highpassFilter) {
      try { this.highpassFilter.disconnect(); } catch {}
      this.highpassFilter = null;
    }
    if (this.lowpassFilter) {
      try { this.lowpassFilter.disconnect(); } catch {}
      this.lowpassFilter = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch {}
      this.analyser = null;
    }

    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }

  _startProcessingLoop() {
    if (!this.isRunning) return;

    const processFrame = () => {
      if (!this.isRunning || !this.analyser) return;

      const tStart = performance.now();

      this.analyser.getFloatTimeDomainData(this.timeBuffer);
      const sampleRate = this.audioCtx ? this.audioCtx.sampleRate : 44100;

      const result = this._detectPitchFromBuffer(this.timeBuffer, sampleRate);
      const duration = performance.now() - tStart;

      this._recordProcessingTime(duration);

      if (result) {
        this._notify(result);
      } else {
        this._notify({
          frequency: 0,
          note: null,
          octave: null,
          cents: 0,
          confidence: 0,
          timestamp: Date.now()
        });
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  _recordProcessingTime(duration) {
    this.stats.framesProcessed++;
    this.stats.processingTimes.push(duration);
    if (this.stats.processingTimes.length > this.stats.maxHistory) {
      this.stats.processingTimes.shift();
    }

    const times = [...this.stats.processingTimes].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    this.stats.averageProcessingMs = parseFloat((sum / times.length).toFixed(2));
    this.stats.maxProcessingMs = parseFloat(times[times.length - 1].toFixed(2));

    const p95Idx = Math.min(times.length - 1, Math.floor(times.length * 0.95));
    this.stats.p95ProcessingMs = parseFloat(times[p95Idx].toFixed(2));

    if (duration > 50) {
      this.stats.framesDropped++;
    }
  }

  getPerformanceStats() {
    return {
      averageProcessingMs: this.stats.averageProcessingMs,
      p95ProcessingMs: this.stats.p95ProcessingMs,
      maxProcessingMs: this.stats.maxProcessingMs,
      latencyMs: this.stats.latencyMs,
      framesProcessed: this.stats.framesProcessed,
      framesDropped: this.stats.framesDropped
    };
  }

  // Pure algorithmic pitch extraction (Normalized Autocorrelation with Parabolic Interpolation)
  _detectPitchFromBuffer(buffer, sampleRate) {
    const bufferLength = buffer.length;

    // 1. RMS Calculation (Reject silence & very low noise)
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    if (rms < this.silenceThreshold) {
      return null;
    }

    // 2. Frequency Range Constraints (LOW_CUTOFF to HIGH_CUTOFF)
    const minPeriod = Math.floor(sampleRate / this.highCutoff);
    const maxPeriod = Math.ceil(sampleRate / this.lowCutoff);

    if (maxPeriod >= bufferLength) {
      return null;
    }

    // 3. Autocorrelation within voice range
    let bestPeriod = -1;
    let bestCorrelation = -1;
    const correlations = new Float32Array(maxPeriod + 2);

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      let norm1 = 0;
      let norm2 = 0;
      const count = bufferLength - period;

      for (let i = 0; i < count; i++) {
        const x = buffer[i];
        const y = buffer[i + period];
        correlation += x * y;
        norm1 += x * x;
        norm2 += y * y;
      }

      const denominator = Math.sqrt(norm1 * norm2);
      if (denominator > 0.0001) {
        const normalized = correlation / denominator;
        correlations[period] = normalized;
        if (normalized > bestCorrelation) {
          bestCorrelation = normalized;
          bestPeriod = period;
        }
      }
    }

    // 4. Confidence filter
    if (bestPeriod === -1 || bestCorrelation < this.confidenceThreshold) {
      return null;
    }

    // 5. Parabolic Interpolation for Sub-Sample Accuracy
    let refinedPeriod = bestPeriod;
    if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
      const alpha = correlations[bestPeriod - 1];
      const beta = correlations[bestPeriod];
      const gamma = correlations[bestPeriod + 1];
      const delta = (alpha - gamma) / (2 * (alpha - 2 * beta + gamma) + 1e-9);
      if (Math.abs(delta) < 1) {
        refinedPeriod = bestPeriod + delta;
      }
    }

    const frequency = parseFloat((sampleRate / refinedPeriod).toFixed(1));

    // Reject out of range
    if (frequency < this.lowCutoff || frequency > this.highCutoff) {
      return null;
    }

    // 6. Musical Note & Cents Calculation
    const pitchDetails = this.frequencyToPitch(frequency);

    return {
      frequency,
      note: pitchDetails.note,
      octave: pitchDetails.octave,
      cents: pitchDetails.cents,
      confidence: parseFloat(bestCorrelation.toFixed(3)),
      timestamp: Date.now()
    };
  }

  frequencyToPitch(frequency) {
    if (!frequency || frequency <= 0) {
      return { note: null, octave: null, cents: 0, noteNumber: 0 };
    }

    // Standard A4 = 440 Hz
    const midiNumExact = 69 + 12 * Math.log2(frequency / 440);
    const midiNumRound = Math.round(midiNumExact);

    const noteIndex = ((midiNumRound % 12) + 12) % 12;
    const note = NOTE_NAMES[noteIndex];
    const octave = Math.floor(midiNumRound / 12) - 1;

    // Exact frequency of the rounded note
    const expectedFreq = 440 * Math.pow(2, (midiNumRound - 69) / 12);
    const cents = Math.round(1200 * Math.log2(frequency / expectedFreq));

    return {
      note,
      octave,
      cents,
      noteNumber: midiNumRound,
      expectedFreq: parseFloat(expectedFreq.toFixed(1))
    };
  }

  frequencyToNote(frequency) {
    const pitch = this.frequencyToPitch(frequency);
    return {
      frequency,
      note: pitch.note,
      octave: pitch.octave,
      cents: pitch.cents,
      noteNumber: pitch.noteNumber
    };
  }
}

export const virtuoVoiceDetector = new VirtuoVoiceDetector();
