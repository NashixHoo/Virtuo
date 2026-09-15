// =============================================================
// VIRTUO VOICE DETECTOR & PITCH ANALYZER 2.0
// src/audio/voice-detector.js
// Precision vocal pitch detection via Web Audio API
// High-pass (85Hz) & Low-pass (1100Hz) Human Voice Filtering
// Sub-sample Parabolic Autocorrelation for accurate Cents & Note calculation
// Reference Tone Synthesizer & Interval Pitch Calculator
// 100% Client-Side - Zero external APIs, zero audio transmission
// =============================================================

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ENHARMONIC_EQUIVALENTS = {
  "Db": "C#",
  "Eb": "D#",
  "Gb": "F#",
  "Ab": "G#",
  "Bb": "A#"
};

export const VOCAL_INTERVALS = {
  unison: { id: "unison", name: "Uníssono", semitones: 0, short: "1J" },
  major_second: { id: "major_second", name: "Segunda Maior", semitones: 2, short: "2M" },
  minor_third: { id: "minor_third", name: "Terça Menor", semitones: 3, short: "3m" },
  major_third: { id: "major_third", name: "Terça Maior", semitones: 4, short: "3M" },
  perfect_fourth: { id: "perfect_fourth", name: "Quarta Justa", semitones: 5, short: "4J" },
  perfect_fifth: { id: "perfect_fifth", name: "Quinta Justa", semitones: 7, short: "5J" },
  major_sixth: { id: "major_sixth", name: "Sexta Maior", semitones: 9, short: "6M" },
  octave: { id: "octave", name: "Oitava", semitones: 12, short: "8J" }
};

export class VirtuoVoiceDetector {
  constructor(options = {}) {
    this.lowCutoff = options.lowCutoff || 85;    // Hz (vocal bottom cutoff)
    this.highCutoff = options.highCutoff || 1100; // Hz (vocal top cutoff)
    this.silenceThreshold = options.silenceThreshold || 0.012; // RMS threshold
    this.confidenceThreshold = options.confidenceThreshold || 0.70; // 0..1
    this.bufferSize = options.bufferSize || 2048;

    this.audioCtx = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.isRunning = false;
    this.animFrameId = null;

    // Reference Tone Synth
    this.activeOscillator = null;
    this.activeGain = null;

    // Pre-allocated buffers to avoid GC pressure in audio thread
    this.timeBuffer = new Float32Array(this.bufferSize);

    // Stability tracking rolling window
    this.recentDetections = [];
    this.maxStabilityWindow = 8;

    // Performance Stats (Measured with performance.now(), zero mock values)
    this.stats = {
      framesProcessed: 0,
      framesDropped: 0,
      processingTimes: [],
      maxHistory: 120,
      averageProcessingMs: 0,
      p95ProcessingMs: 0,
      p99ProcessingMs: 0,
      maxProcessingMs: 0,
      latencyMs: 0
    };

    this.listeners = new Set();
  }

  setFilterRange(low, high) {
    this.lowCutoff = Math.max(20, Math.min(low, 500));
    this.highCutoff = Math.max(this.lowCutoff + 50, Math.min(high, 5000));
    if (this.audioCtx && this.highpassFilter) {
      try {
        this.highpassFilter.frequency.setValueAtTime(this.lowCutoff, this.audioCtx.currentTime);
      } catch {}
    }
    if (this.audioCtx && this.lowpassFilter) {
      try {
        this.lowpassFilter.frequency.setValueAtTime(this.highCutoff, this.audioCtx.currentTime);
      } catch {}
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

    // 1. Solicita acesso ao microfone
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API não suportada neste dispositivo.");
    }
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // 2. Constrói pipeline de áudio exclusivo para análise (NUNCA conectado a destination)
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
    this.recentDetections = [];
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

    this.stopReferenceTone();

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

    this.recentDetections = [];
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
          intensity: 0,
          isSilence: true,
          stability: 0,
          stabilityLabel: "Silêncio",
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
    this.stats.averageProcessingMs = parseFloat((sum / times.length).toFixed(3));
    this.stats.maxProcessingMs = parseFloat(times[times.length - 1].toFixed(3));

    const p95Idx = Math.min(times.length - 1, Math.floor(times.length * 0.95));
    this.stats.p95ProcessingMs = parseFloat(times[p95Idx].toFixed(3));

    const p99Idx = Math.min(times.length - 1, Math.floor(times.length * 0.99));
    this.stats.p99ProcessingMs = parseFloat(times[p99Idx].toFixed(3));

    if (duration > 50) {
      this.stats.framesDropped++;
    }
  }

  getPerformanceStats() {
    return {
      averageProcessingMs: this.stats.averageProcessingMs,
      p95ProcessingMs: this.stats.p95ProcessingMs,
      p99ProcessingMs: this.stats.p99ProcessingMs,
      maxProcessingMs: this.stats.maxProcessingMs,
      latencyMs: this.stats.latencyMs,
      framesProcessed: this.stats.framesProcessed,
      framesDropped: this.stats.framesDropped
    };
  }

  // =============================================================
  // DETECÇÃO DETERMINÍSTICA DE PITCH (AUTOCORRELAÇÃO + INTERPOLAÇÃO PARABÓLICA)
  // =============================================================
  _detectPitchFromBuffer(buffer, sampleRate) {
    const bufferLength = buffer.length;

    // 1. Cálculo de RMS e Intensidade Normalizada
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    const intensity = Math.min(1.0, parseFloat((rms * 8.0).toFixed(2)));

    // Se estiver abaixo do limiar de ruído, é silêncio absoluto
    if (rms < this.silenceThreshold) {
      this.recentDetections.shift();
      return {
        frequency: 0,
        note: null,
        octave: null,
        cents: 0,
        confidence: 0,
        intensity,
        isSilence: true,
        stability: 0,
        stabilityLabel: "Silêncio",
        timestamp: Date.now()
      };
    }

    // 2. Restrições de Frequência da Faixa Vocal (85 Hz — 1100 Hz)
    const minPeriod = Math.floor(sampleRate / this.highCutoff);
    const maxPeriod = Math.ceil(sampleRate / this.lowCutoff);

    if (maxPeriod >= bufferLength) {
      return null;
    }

    // 3. Autocorrelação normalizada ultrarrápida (Lag-compensated Autocorrelation)
    let bestPeriod = -1;
    let bestCorrelation = -1;
    const correlations = new Float32Array(maxPeriod + 2);
    const energy = sumSquares;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      const count = bufferLength - period;

      for (let i = 0; i < count; i++) {
        correlation += buffer[i] * buffer[i + period];
      }

      // Compensação do decaimento de janela (lag compensation) e normalização por energia
      const normalized = (correlation / energy) * (bufferLength / count);
      correlations[period] = normalized;

      if (normalized > bestCorrelation) {
        bestCorrelation = normalized;
        bestPeriod = period;
      }
    }

    // 4. Filtro de Confiança estrito para evitar falsos positivos
    if (bestPeriod === -1 || bestCorrelation < this.confidenceThreshold) {
      return {
        frequency: 0,
        note: null,
        octave: null,
        cents: 0,
        confidence: parseFloat(Math.max(0, bestCorrelation).toFixed(2)),
        intensity,
        isSilence: false,
        stability: 0,
        stabilityLabel: "Instável",
        timestamp: Date.now()
      };
    }

    // 5. Interpolação Parabólica para Resolução Sub-amostral
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

    // Rejeita frequências anômalas fora da faixa vocal
    if (frequency < this.lowCutoff || frequency > this.highCutoff) {
      return null;
    }

    // 6. Conversão de Frequência para Nota, Oitava e Cents
    const pitchDetails = this.frequencyToPitch(frequency);

    // 7. Cálculo de Estabilidade em Janela Móvel
    this._recordDetection(pitchDetails);
    const stabilityInfo = this._calculateStability();

    return {
      frequency,
      note: pitchDetails.note,
      octave: pitchDetails.octave,
      cents: pitchDetails.cents,
      confidence: parseFloat(bestCorrelation.toFixed(2)),
      intensity,
      isSilence: false,
      stability: stabilityInfo.score,
      stabilityLabel: stabilityInfo.label,
      timestamp: Date.now()
    };
  }

  _recordDetection(pitchDetails) {
    this.recentDetections.push(pitchDetails);
    if (this.recentDetections.length > this.maxStabilityWindow) {
      this.recentDetections.shift();
    }
  }

  _calculateStability() {
    if (this.recentDetections.length < 3) {
      return { score: 70, label: "Calibrando" };
    }

    // Verifica se a mesma nota foi mantida
    const notes = this.recentDetections.map(d => `${d.note}${d.octave}`);
    const lastNote = notes[notes.length - 1];
    const sameNoteMatches = notes.filter(n => n === lastNote).length;
    const noteStabilityRatio = sameNoteMatches / notes.length;

    // Desvio de cents
    const centsList = this.recentDetections.map(d => d.cents);
    const avgCents = centsList.reduce((a, b) => a + b, 0) / centsList.length;
    const centsVariance = centsList.reduce((acc, c) => acc + Math.pow(c - avgCents, 2), 0) / centsList.length;
    const stdDev = Math.sqrt(centsVariance);

    // Pontuação de 0 a 100%
    const score = Math.max(10, Math.min(100, Math.round((noteStabilityRatio * 70) + Math.max(0, 30 - stdDev * 1.5))));

    let label = "Instável";
    if (score >= 85) label = "Excelente";
    else if (score >= 70) label = "Boa";
    else if (score >= 50) label = "Moderada";

    return { score, label };
  }

  // =============================================================
  // CONVERSÕES MUSICAIS: FREQUÊNCIA ↔ NOTA ↔ CENTS
  // =============================================================
  frequencyToPitch(frequency) {
    if (!frequency || frequency <= 0) {
      return { note: null, octave: null, cents: 0, noteNumber: 0, expectedFreq: 0 };
    }

    // Padrão Internacional A4 = 440 Hz
    const midiNumExact = 69 + 12 * Math.log2(frequency / 440);
    const midiNumRound = Math.round(midiNumExact);

    const noteIndex = ((midiNumRound % 12) + 12) % 12;
    const note = NOTE_NAMES[noteIndex];
    const octave = Math.floor(midiNumRound / 12) - 1;

    // Frequência exata da nota arredondada
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
    return this.frequencyToPitch(frequency);
  }

  /**
   * Converte uma nota musical (ex: "A", 4) para sua frequência exata em Hertz
   */
  noteToFrequency(noteInput, octave = 4, cents = 0) {
    let note = String(noteInput).trim();
    if (ENHARMONIC_EQUIVALENTS[note]) {
      note = ENHARMONIC_EQUIVALENTS[note];
    }

    const noteIndex = NOTE_NAMES.indexOf(note);
    if (noteIndex === -1) {
      throw new Error(`Nota inválida: ${noteInput}`);
    }

    const midiNum = (octave + 1) * 12 + noteIndex;
    const baseFreq = 440 * Math.pow(2, (midiNum - 69 + (cents / 100)) / 12);
    return parseFloat(baseFreq.toFixed(2));
  }

  /**
   * Calcula a diferença em cents entre duas frequências
   */
  calculateCents(frequency, targetFrequency) {
    if (!frequency || !targetFrequency || frequency <= 0 || targetFrequency <= 0) return 0;
    return Math.round(1200 * Math.log2(frequency / targetFrequency));
  }

  /**
   * Calcula a nota alvo a partir de uma nota base e um intervalo musical
   */
  getIntervalTarget(baseNote, baseOctave, intervalKey) {
    const interval = VOCAL_INTERVALS[intervalKey];
    if (!interval) {
      throw new Error(`Intervalo musical não suportado: ${intervalKey}`);
    }

    let normBase = String(baseNote).trim();
    if (ENHARMONIC_EQUIVALENTS[normBase]) normBase = ENHARMONIC_EQUIVALENTS[normBase];
    const baseIndex = NOTE_NAMES.indexOf(normBase);
    if (baseIndex === -1) throw new Error(`Nota base inválida: ${baseNote}`);

    const baseMidi = (baseOctave + 1) * 12 + baseIndex;
    const targetMidi = baseMidi + interval.semitones;

    const targetIndex = ((targetMidi % 12) + 12) % 12;
    const targetNote = NOTE_NAMES[targetIndex];
    const targetOctave = Math.floor(targetMidi / 12) - 1;
    const targetFreq = this.noteToFrequency(targetNote, targetOctave);
    const baseFreq = this.noteToFrequency(normBase, baseOctave);

    return {
      baseNote: normBase,
      baseOctave,
      baseFreq,
      intervalName: interval.name,
      intervalKey,
      semitones: interval.semitones,
      targetNote,
      targetOctave,
      targetFreq
    };
  }

  // =============================================================
  // SINTETIZADOR DE TOM DE REFERÊNCIA (WEB AUDIO OSCILLATOR)
  // Permite ao cantor ouvir a nota/intervalo desejado sem latência
  // =============================================================
  playReferenceTone(frequency, durationMs = 1200) {
    try {
      this.stopReferenceTone();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      // Fade in e Fade out suaves para evitar cliques sonoros
      const now = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);

      if (durationMs > 0) {
        const stopTime = now + (durationMs / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime);
        osc.stop(stopTime);
      }

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);

      this.activeOscillator = osc;
      this.activeGain = gain;
      return true;
    } catch (e) {
      console.warn("[VoiceDetector] Falha ao tocar tom de referência:", e);
      return false;
    }
  }

  stopReferenceTone() {
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
        this.activeOscillator.disconnect();
      } catch {}
      this.activeOscillator = null;
    }
    if (this.activeGain) {
      try {
        this.activeGain.disconnect();
      } catch {}
      this.activeGain = null;
    }
  }
}

export const virtuoVoiceDetector = new VirtuoVoiceDetector();
if (typeof window !== "undefined") {
  window.virtuoVoiceDetector = virtuoVoiceDetector;
}
