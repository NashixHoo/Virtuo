// =============================================================
// VIRTUO AUDIO ENGINE (WEB AUDIO API)
// Metronome, Pitch Detector (Tuner & Vocal), and Startup Chime
// =============================================================

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// -------------------------------------------------------------
// 1. STARTUP CHIME (2.4s ambient worship pad chord)
// -------------------------------------------------------------
export function playStartupChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Gmaj9 chord: G3 (196Hz), B3 (246.94Hz), D4 (293.66Hz), F#4 (369.99Hz), A4 (440Hz)
    const freqs = [196, 246.94, 293.66, 369.99, 440];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.5);
    });
  } catch (err) {
    console.warn('AudioContext not available for chime', err);
  }
}

// -------------------------------------------------------------
// 2. METRONOME ENGINE (High precision lookahead scheduling)
// -------------------------------------------------------------
export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerBar: number;
  subdivision: string;
  volume: number;
}

type MetronomeListener = (state: MetronomeState) => void;

class ReactMetronomeEngine {
  private bpm = 74;
  private beatsPerBar = 4;
  private currentBeat = 1;
  private subdivision = '1/4';
  private volume = 0.8;
  private isPlaying = false;
  private timerWorker: number | null = null;
  private nextNoteTime = 0;
  private scheduleAheadTime = 0.1;
  private lookaheadMs = 25;
  private listeners: Set<MetronomeListener> = new Set();
  private tapTimes: number[] = [];

  constructor() {
    this.bpm = 74;
  }

  subscribe(listener: MetronomeListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  getState(): MetronomeState {
    return {
      isPlaying: this.isPlaying,
      bpm: this.bpm,
      currentBeat: this.currentBeat,
      beatsPerBar: this.beatsPerBar,
      subdivision: this.subdivision,
      volume: this.volume
    };
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(280, Math.round(bpm)));
    this.notify();
  }

  adjustBpm(delta: number) {
    this.setBpm(this.bpm + delta);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.notify();
  }

  setSubdivision(sub: string) {
    this.subdivision = sub;
    this.notify();
  }

  tap() {
    const now = Date.now();
    this.tapTimes.push(now);
    if (this.tapTimes.length > 4) this.tapTimes.shift();
    if (this.tapTimes.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < this.tapTimes.length; i++) {
        diffs.push(this.tapTimes[i] - this.tapTimes[i - 1]);
      }
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avgDiff > 200 && avgDiff < 2000) {
        const calculatedBpm = Math.round(60000 / avgDiff);
        this.setBpm(calculatedBpm);
      }
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isPlaying) return;
    const ctx = getAudioContext();
    this.isPlaying = true;
    this.currentBeat = 1;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.timerWorker = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    this.notify();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerWorker !== null) {
      clearInterval(this.timerWorker);
      this.timerWorker = null;
    }
    this.currentBeat = 1;
    this.notify();
  }

  private scheduler() {
    const ctx = getAudioContext();
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextBeat();
    }
  }

  private nextBeat() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat % this.beatsPerBar) + 1;
    this.notify();
  }

  private scheduleNote(beatNumber: number, time: number) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isAccent = beatNumber === 1;
      osc.frequency.setValueAtTime(isAccent ? 1760 : 880, time);
      osc.type = 'triangle';

      gain.gain.setValueAtTime(isAccent ? this.volume : this.volume * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.05);
    } catch (e) {
      console.warn('Metronome schedule error', e);
    }
  }
}

export const metronome = new ReactMetronomeEngine();

// -------------------------------------------------------------
// 3. PITCH DETECTOR FOR TUNER & VOCAL (YIN / Autocorrelation)
// -------------------------------------------------------------
const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteFromPitch(frequency: number) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

export function frequencyFromNoteNumber(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function centsOffFromPitch(frequency: number, note: number) {
  return Math.floor((1200 * Math.log(frequency / frequencyFromNoteNumber(note))) / Math.log(2));
}

export function autoCorrelate(buf: any, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) {
    // signal too weak
    return -1;
  }

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmedBuf = buf.slice(r1, r2);
  const trimmedSize = trimmedBuf.length;
  const c = new Array(trimmedSize).fill(0);

  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buffer: any = new Float32Array(2048);
  private rafId: number | null = null;
  private onPitchCallback: ((data: { note: string; octave: number; cents: number; freq: number } | null) => void) | null = null;

  async start(callback: (data: { note: string; octave: number; cents: number; freq: number } | null) => void) {
    this.onPitchCallback = callback;
    this.audioContext = getAudioContext();
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
      }
    });

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);

    this.loop();
  }

  private loop = () => {
    if (!this.analyser || !this.audioContext) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const freq = autoCorrelate(this.buffer, this.audioContext.sampleRate);

    if (freq === -1 || isNaN(freq) || freq < 30 || freq > 4000) {
      if (this.onPitchCallback) this.onPitchCallback(null);
    } else {
      const noteNum = noteFromPitch(freq);
      const note = NOTE_STRINGS[noteNum % 12];
      const octave = Math.floor(noteNum / 12) - 1;
      const cents = centsOffFromPitch(freq, noteNum);
      if (this.onPitchCallback) {
        this.onPitchCallback({ note, octave, cents, freq: Math.round(freq * 10) / 10 });
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }
}
