// =============================================================
// VIRTUO SOUND LIBRARY & ACOUSTIC SYNTHESIS
// src/audio/sound-library.js
// Modelagem acústica e timbres de alta fidelidade 100% Web Audio API
// Registro de licença e procedência:
// { source: "Virtuo Internal Sound Engine (Web Audio Synthesis & Acoustic Modeling)", license: "MIT", attribution: "Virtuo Musical Architecture", version: "2.1.0" }
// =============================================================

export const SOUND_LIBRARY_METADATA = {
  source: "Virtuo Internal Sound Engine (Web Audio Synthesis & Acoustic Modeling)",
  license: "MIT",
  attribution: "Virtuo Musical Architecture",
  version: "2.1.0"
};

export class SoundLibrary {
  constructor(audioCtx, channels) {
    this.audioCtx = audioCtx;
    this.channels = channels || {}; // { drums, bass, keyboard, guitar, metronome }
    this.noiseBuffer = null;
    this._initNoiseBuffer();
  }

  setChannels(channels) {
    this.channels = channels;
  }

  setAudioContext(audioCtx) {
    this.audioCtx = audioCtx;
    this._initNoiseBuffer();
  }

  _initNoiseBuffer() {
    if (!this.audioCtx) return;
    try {
      const sampleRate = this.audioCtx.sampleRate || 44100;
      const bufferSize = Math.floor(sampleRate * 2.0); // 2 segundos de ruído rosa/branco calibrado
      const buffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Filtro de ruído rosa suave para esteira acústica realista
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      this.noiseBuffer = buffer;
    } catch {}
  }

  // -----------------------------------------------------------
  // 1. SÍNTESE ACÚSTICA DA BATERIA (DRUMS)
  // -----------------------------------------------------------

  /**
   * Bumbo Acústico com punch (beater strike) + afinação de corpo + sub boom
   */
  triggerKick(time, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.95));

      // 1. Corpo ressonante do bumbo
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(145, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.28);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.channels.drums);
      osc.start(t);
      osc.stop(t + 0.38);

      // 2. Click de ataque do batedor (beater strike transient)
      const clickOsc = this.audioCtx.createOscillator();
      const clickGain = this.audioCtx.createGain();
      clickOsc.type = "triangle";
      clickOsc.frequency.setValueAtTime(320, t);
      clickOsc.frequency.exponentialRampToValueAtTime(60, t + 0.02);

      clickGain.gain.setValueAtTime(vol * 0.45, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      clickOsc.connect(clickGain);
      clickGain.connect(this.channels.drums);
      clickOsc.start(t);
      clickOsc.stop(t + 0.03);
    } catch {}
  }

  /**
   * Caixa Acústica com dual-tone de corpo + esteira de ruído moldada
   */
  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (!this.audioCtx || !this.channels.drums) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.05, velocity * (isGhost ? 0.32 : 0.85)));

      // 1. Esteira metálica (Snare Wire)
      if (this.noiseBuffer) {
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1450, t);
        noiseFilter.Q.setValueAtTime(1.2, t);

        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.65, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (isGhost ? 0.1 : 0.24));

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.channels.drums);
        noise.start(t);
        noise.stop(t + 0.26);
      }

      // 2. Tom fundamental da pele da caixa (~185Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(190, t);
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.08);

      gain1.gain.setValueAtTime(vol * 0.45, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc1.connect(gain1);
      gain1.connect(this.channels.drums);
      osc1.start(t);
      osc1.stop(t + 0.18);
    } catch {}
  }

  /**
   * Chimbal Acústico (Fechado, Meio-aberto, Aberto)
   */
  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (!this.audioCtx || !this.channels.drums || !this.noiseBuffer) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.05, velocity * 0.45));
      const duration = isOpen ? 0.22 : 0.055;

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      // Filtro passa-altas para brilho metálico
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(isOpen ? 6200 : 7800, t);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.drums);
      noise.start(t);
      noise.stop(t + duration + 0.02);
    } catch {}
  }

  /**
   * Tons e Surdos Acústicos
   */
  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums) return;
    try {
      const t = time;
      const startFreq = pitch === "high" ? 175 : (pitch === "low" ? 90 : 125);
      const endFreq = pitch === "high" ? 82 : (pitch === "low" ? 44 : 62);
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.75));

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.19);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.channels.drums);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch {}
  }

  /**
   * Prato Crash / Condução com wash metálico sustentado
   */
  triggerCrash(time, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.drums || !this.noiseBuffer) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.6));

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(5200, t);
      filter.Q.setValueAtTime(0.9, t);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.drums);
      noise.start(t);
      noise.stop(t + 1.45);
    } catch {}
  }

  // -----------------------------------------------------------
  // 2. BAIXO ACÚSTICO / ELÉTRICO ORGÂNICO (BASS)
  // -----------------------------------------------------------

  /**
   * Baixo com ataque percussivo de corda, corpo harmônico e sub grave
   */
  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (!this.audioCtx || !this.channels.bass || !freq || freq <= 0) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.7));

      // 1. Oscilador principal com harmônicos de corda (sawtooth filtrado)
      const osc = this.audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);

      // 2. Sub-grave senoidal encorpado (sustenta o peso do louvor)
      const subOsc = this.audioCtx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(freq, t);

      // 3. Filtro passa-baixas com decaimento dinâmico de brilho (simula corda dedilhada)
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterCutoff * 1.5, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(90, filterCutoff * 0.65), t + duration * 0.8);
      filter.Q.setValueAtTime(2.2, t);

      // 4. Envelope ADSR natural de instrumento de corda
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012); // Ataque de palheta/dedo
      gain.gain.exponentialRampToValueAtTime(vol * 0.65, t + 0.08); // Decay inicial
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // Release

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.bass);

      osc.start(t);
      subOsc.start(t);
      osc.stop(t + duration + 0.05);
      subOsc.stop(t + duration + 0.05);
    } catch {}
  }

  // -----------------------------------------------------------
  // 3. PIANO ACÚSTICO & TECLADO CELESTIAL (KEYBOARD)
  // -----------------------------------------------------------

  /**
   * Acordes de Piano Acústico, Pad Celestial ou Electric Keys
   */
  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.keyboard || !Array.isArray(chordFrequencies)) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.75));

      chordFrequencies.forEach((freq, idx) => {
        if (!freq || freq <= 0) return;

        if (mode === "piano") {
          // Modelagem aditiva de piano acústico com ataque de martelo
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const filter = this.audioCtx.createBiquadFilter();
          const gain = this.audioCtx.createGain();

          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(freq, t);

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(freq * 2.002, t); // Pequeno detune de corda dupla

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(2200, t);
          filter.frequency.exponentialRampToValueAtTime(320, t + duration * 0.85);

          const peak = (vol * 0.32) / Math.sqrt(chordFrequencies.length);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(peak, t + 0.008); // Martelo imediato
          gain.gain.exponentialRampToValueAtTime(peak * 0.4, t + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.channels.keyboard);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + duration + 0.05);
          osc2.stop(t + duration + 0.05);

        } else if (mode === "keys") {
          // E-Piano / Rhodes quente com tom de campainha
          const osc = this.audioCtx.createOscillator();
          const filter = this.audioCtx.createBiquadFilter();
          const gain = this.audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1050, t);

          const peak = (vol * 0.28) / Math.sqrt(chordFrequencies.length);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(peak, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 1.1);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.channels.keyboard);

          osc.start(t);
          osc.stop(t + duration * 1.1 + 0.05);

        } else {
          // Padrão: Pad Celestial envolvente de adoração (Worship Ambient)
          const osc = this.audioCtx.createOscillator();
          const filter = this.audioCtx.createBiquadFilter();
          const gain = this.audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          // Detune estéreo sutil para sensação de espacialidade
          osc.detune.setValueAtTime(idx % 2 === 0 ? 5 : -5, t);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(750, t);

          const peak = (vol * 0.24) / Math.sqrt(chordFrequencies.length);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(peak, t + 0.22); // Entrada suave
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.channels.keyboard);

          osc.start(t);
          osc.stop(t + duration + 0.1);
        }
      });
    } catch {}
  }

  // -----------------------------------------------------------
  // 4. VIOLÃO & GUITARRA ACÚSTICA (GUITAR)
  // -----------------------------------------------------------

  /**
   * Batida ou dedilhado realista com spread temporal entre cordas (Pick sweep)
   */
  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.guitar || !Array.isArray(frequencies)) return;
    try {
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.7));
      const stringDelaySec = 0.015; // 15ms entre cada corda (simula a palheta descendo/subindo)
      const freqsToPlay = direction === "up" ? [...frequencies].reverse() : frequencies;

      freqsToPlay.forEach((freq, idx) => {
        if (!freq || freq <= 0) return;
        const noteTime = time + idx * stringDelaySec;
        this.triggerGuitarNote(noteTime, freq, "strum", duration, vol * (0.85 + (idx * 0.05)));
      });
    } catch {}
  }

  /**
   * Nota individual de violão/guitarra (dedilhado, shimmer ou solo)
   */
  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.guitar || !freq || freq <= 0) return;
    try {
      const t = time;
      const vol = Math.min(1.0, Math.max(0.1, velocity * 0.65));

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      if (style === "strum") {
        // Palhetada com ataque rápido e corpo brilhante
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1600, t);
        filter.Q.setValueAtTime(1.4, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol * 0.35, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      } else if (style === "ambient" || style === "worship") {
        // Shimmer com sustain longo e ambiência
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime(4, t);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1150, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol * 0.25, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + Math.max(1.0, duration * 2));
      } else {
        // Dedilhado / Arpeggio acústico natural
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1750, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol * 0.3, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.guitar);

      osc.start(t);
      osc.stop(t + Math.max(0.4, duration + 0.05));
    } catch {}
  }

  // -----------------------------------------------------------
  // 5. METRÔNOMO & CLIQUE NATIVO (METRONOME)
  // -----------------------------------------------------------

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (!this.audioCtx || !this.channels.metronome) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

      gain.gain.setValueAtTime(Math.min(1.0, velocity * (isAccent ? 0.7 : 0.45)), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.038);

      osc.connect(gain);
      gain.connect(this.channels.metronome);

      osc.start(time);
      osc.stop(time + 0.045);
    } catch {}
  }
}
