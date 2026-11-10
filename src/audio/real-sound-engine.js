// =============================================================
// VIRTUO REAL SOUND ENGINE
// src/audio/real-sound-engine.js
// Camada unificada de áudio: reprodução de samples reais/licenciados
// com roteamento por barramentos, polifonia, pitch shift e fallback transparente
// =============================================================

export class RealSoundEngine {
  constructor(audioCtx, channels, sampleManager, samplePlayer, soundLibrary) {
    this.audioCtx = audioCtx;
    this.channels = channels || {}; // { drums, bass, keyboard, guitar, metronome }
    this.sampleManager = sampleManager;
    this.samplePlayer = samplePlayer;
    this.soundLibrary = soundLibrary; // Fallback procedural de síntese acústica
    this.enabled = true;
  }

  setAudioContext(audioCtx) {
    this.audioCtx = audioCtx;
    if (this.sampleManager) this.sampleManager.setAudioContext(audioCtx);
    if (this.samplePlayer) this.samplePlayer.setAudioContext(audioCtx);
    if (this.soundLibrary) this.soundLibrary.setAudioContext(audioCtx);
  }

  setChannels(channels) {
    this.channels = channels;
    if (this.soundLibrary) this.soundLibrary.setChannels(channels);
  }

  // -----------------------------------------------------------
  // 1. BATERIA REAL (DRUMS)
  // -----------------------------------------------------------

  /**
   * Dispara bumbo real ou executa fallback
   */
  triggerKick(time, velocity = 1.0) {
    if (!this.channels.drums) return;
    const sample = this.sampleManager ? this.sampleManager.get("drums-kick") : null;
    if (sample && this.samplePlayer) {
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * 1.0,
        duration: 0.45,
        attack: 0.002,
        release: 0.15,
        destination: this.channels.drums
      });
      return;
    }
    // Fallback acústico seguro
    if (this.soundLibrary) {
      this.soundLibrary.triggerKick(time, velocity);
    }
  }

  /**
   * Dispara caixa real ou executa fallback
   */
  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (!this.channels.drums) return;
    const sample = this.sampleManager ? this.sampleManager.get("drums-snare") : null;
    if (sample && this.samplePlayer) {
      const velFactor = isGhost ? 0.35 : 1.0;
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * velFactor,
        duration: isGhost ? 0.15 : 0.38,
        attack: 0.002,
        release: 0.12,
        destination: this.channels.drums
      });
      return;
    }
    if (this.soundLibrary) {
      this.soundLibrary.triggerSnare(time, velocity, isGhost);
    }
  }

  /**
   * Dispara chimbal (fechado ou aberto) real ou executa fallback
   */
  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (!this.channels.drums) return;
    const sampleId = isOpen ? "drums-hihat-open" : "drums-hihat-closed";
    const sample = this.sampleManager ? this.sampleManager.get(sampleId) : null;
    if (sample && this.samplePlayer) {
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * 0.9,
        duration: isOpen ? 0.65 : 0.12,
        attack: 0.002,
        release: isOpen ? 0.25 : 0.04,
        destination: this.channels.drums
      });
      return;
    }
    if (this.soundLibrary) {
      this.soundLibrary.triggerHiHat(time, velocity, isOpen);
    }
  }

  /**
   * Dispara prato de ataque (crash) real ou executa fallback
   */
  triggerCrash(time, velocity = 1.0) {
    if (!this.channels.drums) return;
    const sample = this.sampleManager ? this.sampleManager.get("drums-crash") : null;
    if (sample && this.samplePlayer) {
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * 0.85,
        duration: 2.2,
        attack: 0.003,
        release: 1.2,
        destination: this.channels.drums
      });
      return;
    }
    if (this.soundLibrary) {
      this.soundLibrary.triggerCrash(time, velocity);
    }
  }

  /**
   * Dispara prato de condução (ride) real ou executa fallback
   */
  triggerRide(time, velocity = 1.0) {
    if (!this.channels.drums) return;
    const sample = this.sampleManager ? this.sampleManager.get("drums-ride") : null;
    if (sample && this.samplePlayer) {
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * 0.8,
        duration: 1.5,
        attack: 0.002,
        release: 0.8,
        destination: this.channels.drums
      });
      return;
    }
    if (this.soundLibrary && typeof this.soundLibrary.triggerRide === "function") {
      this.soundLibrary.triggerRide(time, velocity);
    }
  }

  /**
   * Dispara tom/surdo real com pitch shift de afinação ou executa fallback
   */
  triggerTom(time, pitch = "medium", velocity = 1.0) {
    if (!this.channels.drums) return;
    const sample = this.sampleManager ? this.sampleManager.get("drums-tom") : null;
    if (sample && this.samplePlayer) {
      const pitchRatio = pitch === "high" ? 1.25 : pitch === "low" ? 0.78 : 1.0;
      this.samplePlayer.play(sample, {
        time,
        velocity: velocity * 0.9,
        duration: 0.55,
        playbackRate: pitchRatio,
        attack: 0.002,
        release: 0.22,
        destination: this.channels.drums
      });
      return;
    }
    if (this.soundLibrary) {
      this.soundLibrary.triggerTom(time, pitch, velocity);
    }
  }

  // -----------------------------------------------------------
  // 2. CONTRABAIXO REAL (BASS)
  // -----------------------------------------------------------

  /**
   * Dispara nota de contrabaixo real com mapeamento de zona de frequência ou executa fallback
   */
  triggerBass(time, freq, duration = 0.5, velocity = 1.0, filterCutoff = 280) {
    if (!this.channels.bass || !freq || freq <= 0) return;

    if (this.sampleManager && this.samplePlayer) {
      const matched = this.sampleManager.findBestSampleForNote("bass", freq);
      if (matched && matched.buffer) {
        this.samplePlayer.play(matched.buffer, {
          time,
          velocity: velocity * 0.95,
          duration: Math.max(0.2, duration),
          playbackRate: matched.playbackRate,
          attack: 0.006,
          release: Math.min(0.2, duration * 0.3),
          destination: this.channels.bass
        });
        return;
      }
    }

    // Fallback procedural de síntese analógica/acústica
    if (this.soundLibrary) {
      this.soundLibrary.triggerBass(time, freq, duration, velocity, filterCutoff);
    }
  }

  // -----------------------------------------------------------
  // 3. PIANO & TECLADO REAL (KEYBOARD / PIANO VOICINGS)
  // -----------------------------------------------------------

  /**
   * Dispara acorde/voicing de piano com polifonia real ou executa fallback
   */
  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.2, velocity = 1.0) {
    if (!this.channels.keyboard || !Array.isArray(chordFrequencies) || chordFrequencies.length === 0) return;

    // Se o modo for piano, tenta usar samples reais de piano com polifonia plena
    if (mode === "piano" && this.sampleManager && this.samplePlayer) {
      let allFound = true;
      const matches = chordFrequencies.map(freq => {
        const match = this.sampleManager.findBestSampleForNote("piano", freq);
        if (!match || !match.buffer) allFound = false;
        return { freq, match };
      });

      if (allFound && matches.length > 0) {
        const polyFactor = 1.0 / Math.sqrt(matches.length);
        matches.forEach(({ match }, idx) => {
          // Pequena variação temporal de dedilhado natural (micro-arpeggio de 3ms)
          const voiceTime = time + idx * 0.004;
          this.samplePlayer.play(match.buffer, {
            time: voiceTime,
            velocity: velocity * polyFactor * 0.9,
            duration,
            playbackRate: match.playbackRate,
            attack: 0.005,
            release: Math.min(0.4, duration * 0.35),
            destination: this.channels.keyboard
          });
        });
        return;
      }
    }

    // Fallback procedural (Pad celestial ou síntese acústica)
    if (this.soundLibrary) {
      this.soundLibrary.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    }
  }

  /**
   * Alias de piano voicing explícito
   */
  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.2, velocity = 1.0) {
    this.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
  }

  // -----------------------------------------------------------
  // 4. VIOLÃO & GUITARRA REAL (ACOUSTIC & ELECTRIC GUITAR)
  // -----------------------------------------------------------

  /**
   * Batida/Strum real com sweep temporal realista entre cordas
   */
  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (!this.channels.guitar || !Array.isArray(frequencies) || frequencies.length === 0) return;

    if (this.sampleManager && this.samplePlayer) {
      const freqsToPlay = direction === "up" ? [...frequencies].reverse() : frequencies;
      const stringDelaySec = 0.014; // 14ms entre cada corda
      let playedCount = 0;

      freqsToPlay.forEach((freq, idx) => {
        if (!freq || freq <= 0) return;
        const matched = this.sampleManager.findBestSampleForNote("acoustic-guitar", freq);
        if (matched && matched.buffer) {
          playedCount++;
          const noteTime = time + idx * stringDelaySec;
          const dynamicVol = (velocity * 0.75) * (0.85 + (idx * 0.04));
          this.samplePlayer.play(matched.buffer, {
            time: noteTime,
            velocity: dynamicVol,
            duration: Math.max(0.2, duration),
            playbackRate: matched.playbackRate,
            attack: 0.004,
            release: 0.12,
            destination: this.channels.guitar
          });
        }
      });

      if (playedCount > 0) return;
    }

    // Fallback procedural
    if (this.soundLibrary) {
      this.soundLibrary.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
    }
  }

  /**
   * Nota individual ou dedilhado de violão/guitarra
   */
  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (!this.channels.guitar || !freq || freq <= 0) return;

    if (this.sampleManager && this.samplePlayer) {
      const targetInstrument = (style === "ambient" || style === "clean") ? "electric-guitar" : "acoustic-guitar";
      const matched = this.sampleManager.findBestSampleForNote(targetInstrument, freq)
        || this.sampleManager.findBestSampleForNote("acoustic-guitar", freq);

      if (matched && matched.buffer) {
        this.samplePlayer.play(matched.buffer, {
          time,
          velocity: velocity * 0.8,
          duration,
          playbackRate: matched.playbackRate,
          attack: 0.004,
          release: Math.min(0.2, duration * 0.3),
          destination: this.channels.guitar
        });
        return;
      }
    }

    // Fallback procedural
    if (this.soundLibrary) {
      this.soundLibrary.triggerGuitarNote(time, freq, style, duration, velocity);
    }
  }

  // -----------------------------------------------------------
  // STATUS E DIAGNÓSTICO
  // -----------------------------------------------------------

  /**
   * Verifica se um instrumento específico possui samples carregados em memória
   */
  isInstrumentReady(instrument) {
    if (!this.sampleManager) return false;
    return this.sampleManager.isInstrumentReady(instrument);
  }

  /**
   * Retorna o status geral de prontidão dos timbres reais
   */
  getEngineStatus() {
    const instruments = ["drums", "bass", "piano", "acoustic-guitar", "electric-guitar"];
    const status = {};
    instruments.forEach(inst => {
      status[inst] = this.isInstrumentReady(inst);
    });

    return {
      enabled: this.enabled,
      sampleCacheSize: this.sampleManager ? this.sampleManager.cache.size : 0,
      instruments,
      instrumentReadyState: status,
      hasFallback: !!this.soundLibrary
    };
  }
}
