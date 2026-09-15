// =============================================================
// VIRTUO BAND SYNTHESIZERS (WEB AUDIO API)
// src/audio/band-synths.js
// Síntese acústica e analógica 100% local no navegador
// Zero dependência externa de áudio ou bibliotecas de terceiros
// =============================================================

export class BandSynths {
  constructor(audioCtx, channels) {
    this.audioCtx = audioCtx;
    this.channels = channels; // { drums, bass, keyboard, guitar, metronome }
    this.noiseBuffer = null;
    this._initNoiseBuffer();
  }

  _initNoiseBuffer() {
    if (!this.audioCtx) return;
    try {
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 1.5); // 1.5s de ruído
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    } catch {}
  }

  // -----------------------------------------------------------
  // 1. SÍNTESE DA BATERIA (DRUMS)
  // -----------------------------------------------------------

  triggerKick(time, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      // Varredura de frequência típica de bumbo analógico (punch de 135Hz para 42Hz)
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

      const peakVol = Math.min(1.0, velocity * 0.95);
      gain.gain.setValueAtTime(peakVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(gain);
      gain.connect(this.channels.drums);

      osc.start(time);
      osc.stop(time + 0.3);
    } catch {}
  }

  triggerSnare(time, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums || !this.noiseBuffer) return;
    try {
      // 1. Caixa - esteira de ruído filtrada
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1300, time);
      filter.Q.setValueAtTime(1.1, time);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(Math.min(1.0, velocity * 0.7), time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.channels.drums);

      // 2. Caixa - corpo do tambor
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(190, time);
      osc.frequency.exponentialRampToValueAtTime(75, time + 0.09);

      oscGain.gain.setValueAtTime(Math.min(1.0, velocity * 0.45), time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(oscGain);
      oscGain.connect(this.channels.drums);

      noise.start(time);
      noise.stop(time + 0.22);
      osc.start(time);
      osc.stop(time + 0.15);
    } catch {}
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (!this.audioCtx || !this.channels.drums || !this.noiseBuffer) return;
    try {
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(isOpen ? 6500 : 8000, time);

      const duration = isOpen ? 0.18 : 0.05;
      const gain = this.audioCtx.createGain();

      gain.gain.setValueAtTime(Math.min(1.0, velocity * (isOpen ? 0.45 : 0.35)), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.drums);

      noise.start(time);
      noise.stop(time + duration + 0.02);
    } catch {}
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums) return;
    try {
      const startFreq = pitch === "high" ? 180 : (pitch === "low" ? 95 : 130);
      const endFreq = pitch === "high" ? 85 : (pitch === "low" ? 48 : 65);

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.18);

      gain.gain.setValueAtTime(Math.min(1.0, velocity * 0.7), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

      osc.connect(gain);
      gain.connect(this.channels.drums);

      osc.start(time);
      osc.stop(time + 0.28);
    } catch {}
  }

  triggerCrash(time, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums || !this.noiseBuffer) return;
    try {
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(5500, time);
      filter.Q.setValueAtTime(0.8, time);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(Math.min(1.0, velocity * 0.55), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.drums);

      noise.start(time);
      noise.stop(time + 1.25);
    } catch {}
  }

  // -----------------------------------------------------------
  // 2. SÍNTESE DO BAIXO INTELIGENTE (BASS)
  // -----------------------------------------------------------

  triggerBass(time, freq, duration = 0.35, velocity = 1.0, filterCutoff = 350) {
    if (!this.audioCtx || !this.channels.bass || !freq || freq <= 0) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const subOsc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      // Corpo principal do baixo com onda dente-de-serra analógica filtrada
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      // Sub-oitava senoidal acolhedora para peso nos graves
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(freq * 0.5, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterCutoff, time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterCutoff * 0.6), time + duration);
      filter.Q.setValueAtTime(2.5, time);

      const peakVol = Math.min(1.0, velocity * 0.65);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(peakVol, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.bass);

      osc.start(time);
      subOsc.start(time);
      osc.stop(time + duration + 0.05);
      subOsc.stop(time + duration + 0.05);
    } catch {}
  }

  // -----------------------------------------------------------
  // 3. SÍNTESE DO TECLADO / PAD (KEYBOARD)
  // -----------------------------------------------------------

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.keyboard || !Array.isArray(chordFrequencies)) return;
    try {
      chordFrequencies.forEach((freq, idx) => {
        if (!freq || freq <= 0) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        if (mode === "piano") {
          // Ataque percussivo brilhante de piano com decay mais rápido
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, time);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1400, time);
          filter.frequency.exponentialRampToValueAtTime(300, time + duration * 0.8);

          const peak = Math.min(1.0, velocity * 0.3);
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(peak, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        } else if (mode === "keys") {
          // E-Piano / Rhodes quente com vibrato
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(900, time);

          const peak = Math.min(1.0, velocity * 0.25);
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(peak, time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 1.1);
        } else {
          // Padrão: Pad celestial acolhedor com detune estéreo
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);
          osc.detune.setValueAtTime(idx % 2 === 0 ? 6 : -6, time);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(680, time);

          const peak = Math.min(1.0, velocity * 0.22);
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(peak, time + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.channels.keyboard);

        osc.start(time);
        osc.stop(time + duration + 0.1);
      });
    } catch {}
  }

  // -----------------------------------------------------------
  // 4. SÍNTESE DA GUITARRA (GUITAR)
  // -----------------------------------------------------------

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.guitar || !freq || freq <= 0) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      if (style === "strum") {
        // Palhetada com ataque rápido
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1800, time);
        filter.Q.setValueAtTime(1.5, time);

        const peak = Math.min(1.0, velocity * 0.35);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      } else if (style === "ambient" || style === "worship") {
        // Shimmer com sustain longo
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime(4, time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1100, time);

        const peak = Math.min(1.0, velocity * 0.25);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + Math.max(1.0, duration * 2));
      } else {
        // Arpeggio dedilhado
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1600, time);

        const peak = Math.min(1.0, velocity * 0.28);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.guitar);

      osc.start(time);
      osc.stop(time + Math.max(0.5, duration + 0.1));
    } catch {}
  }

  // -----------------------------------------------------------
  // 5. METRÔNOMO & CONTAGEM (METRONOME / COUNT-IN)
  // -----------------------------------------------------------

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.metronome) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

      gain.gain.setValueAtTime(Math.min(1.0, velocity * (isAccent ? 0.7 : 0.45)), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      osc.connect(gain);
      gain.connect(this.channels.metronome);

      osc.start(time);
      osc.stop(time + 0.05);
    } catch {}
  }
}
