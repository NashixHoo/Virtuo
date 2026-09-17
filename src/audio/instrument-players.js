// =============================================================
// VIRTUO INSTRUMENT PLAYERS 2.0
// src/audio/instrument-players.js
// Camada de instrumentistas virtuais especializados com comportamento musical:
// BassPlayer, PianoPlayer, GuitarPlayer, AcousticGuitarPlayer, DrumPlayer.
// =============================================================

import {
  noteToFrequency,
  midiToFrequency
} from "./harmonic-engine.js";
import {
  parseChordSymbol,
  buildChord,
  getPianoVoicings,
  noteToMidi,
  CHROMATIC_SHARPS,
  normalizeNote
} from "../chords/index.js";

/**
 * Classe base padronizada para todo instrumentista virtual
 */
export class InstrumentPlayer {
  constructor(id, name, soundProvider = null) {
    this.id = id;
    this.name = name;
    this.soundProvider = soundProvider;
    this.volume = 0.8;
    this.muted = false;
    this.solo = false;
    this.intensity = 0.5; // 0.0 a 1.0
    this.active = true;
  }

  setSoundProvider(provider) {
    this.soundProvider = provider;
  }

  setVolume(vol) {
    this.volume = Math.max(0.0, Math.min(1.0, parseFloat(vol) || 0.0));
  }

  setMute(mute) {
    this.muted = !!mute;
  }

  setSolo(solo) {
    this.solo = !!solo;
  }

  setIntensity(intensity) {
    this.intensity = Math.max(0.0, Math.min(1.0, parseFloat(intensity) || 0.0));
  }

  canPlay(hasAnySolo = false) {
    if (!this.active || this.muted || this.volume <= 0 || this.intensity <= 0.0) {
      return false;
    }
    if (hasAnySolo) {
      return this.solo;
    }
    return true;
  }

  playNote(time, note, duration, velocity) {}
  playChord(time, chord, duration, velocity) {}
  playPattern(stepInfo, musicalArrangement) {}
  stop() {}
}

// =============================================================
// 1. BAIXO REALISTA (BASS PLAYER)
// =============================================================
export class BassPlayer extends InstrumentPlayer {
  constructor(soundProvider = null) {
    super("bass", "Contrabaixo", soundProvider);
    this.mode = "BASS_NORMAL"; // "BASS_EASY" | "BASS_NORMAL" | "BASS_GROOVE"
    this.volume = 0.75;
  }

  setMode(mode) {
    if (["BASS_EASY", "BASS_NORMAL", "BASS_GROOVE"].includes(mode)) {
      this.mode = mode;
    }
  }

  /**
   * Calcula a frequência para o baixo respeitando acorde, inversão,
   * tonalidade, seção, compasso e estilo.
   */
  calculateBassFrequency(chordData, nextChordData, step, totalSteps, section = "verse") {
    const bassNoteName = chordData.bass || chordData.root || "G";
    const fundamentalFreq = noteToFrequency(bassNoteName, 1);
    const fifthFreq = fundamentalFreq * 1.498307;
    const octaveFreq = fundamentalFreq * 2.0;
    const isMinor = !!chordData.isMinor;
    const thirdFreq = isMinor ? fundamentalFreq * 1.189207 : fundamentalFreq * 1.259921;

    // Se estiver em compasso 6/8
    if (totalSteps === 6) {
      if (step === 0) return fundamentalFreq;
      if (step === 3) return this.intensity >= 0.6 ? fifthFreq : fundamentalFreq;
      return fundamentalFreq;
    }

    // 4/4 (8 steps de colcheia)
    // BASS_EASY: fundamental nos tempos fortes, quinta suave
    if (this.mode === "BASS_EASY") {
      if (step === 0) return fundamentalFreq;
      if (step === 4) return this.intensity >= 0.5 ? fifthFreq : fundamentalFreq;
      return fundamentalFreq;
    }

    // BASS_NORMAL: fundamental, quinta, oitava e aproximação simples
    if (this.mode === "BASS_NORMAL") {
      if (step === 0) return fundamentalFreq;
      if (step === 2) return this.intensity >= 0.75 ? thirdFreq : fundamentalFreq;
      if (step === 4) return this.intensity >= 0.5 ? fifthFreq : fundamentalFreq;
      if (step === 6 || step === 7) {
        // Condução no último tempo
        if (nextChordData && nextChordData.root !== chordData.root) {
          const nextTargetFreq = noteToFrequency(nextChordData.bass || nextChordData.root, 1);
          // Aproximação de meio tom
          return nextTargetFreq > fundamentalFreq ? nextTargetFreq * 0.943874 : nextTargetFreq * 1.059463;
        }
        return fifthFreq;
      }
      return fundamentalFreq;
    }

    // BASS_GROOVE: fundamental, quinta, oitava, aproximações diatônicas/cromáticas, síncopes
    if (this.mode === "BASS_GROOVE") {
      if (step === 0) return fundamentalFreq;
      if (step === 2) return thirdFreq;
      if (step === 3) return fundamentalFreq; // Antecipação / síncope
      if (step === 4) return fifthFreq;
      if (step === 5) return octaveFreq;
      if (step === 6 || step === 7) {
        if (nextChordData && nextChordData.root !== chordData.root) {
          const nextTargetFreq = noteToFrequency(nextChordData.bass || nextChordData.root, 1);
          // Aproximação cromática direcionada para o próximo acorde
          return nextTargetFreq * 0.943874;
        }
        return octaveFreq;
      }
      return fundamentalFreq;
    }

    return fundamentalFreq;
  }

  playPattern(stepInfo, currentChord, nextChord, section = "verse") {
    if (!this.soundProvider) return;
    const { step, time, totalStepsPerBar } = stepInfo;

    // Determina se o baixo toca neste step
    let shouldPlay = false;
    let duration = 0.4;
    let velFactor = 1.0;

    const isDownbeat = step === 0;
    const isBackbeat = step === 4 || (totalStepsPerBar === 6 && step === 3);

    if (this.mode === "BASS_EASY") {
      shouldPlay = step === 0 || (step === 4 && this.intensity >= 0.4);
      duration = 0.65;
    } else if (this.mode === "BASS_NORMAL") {
      shouldPlay = step === 0 || step === 4 || (this.intensity >= 0.7 && (step === 2 || step === 6));
      duration = this.intensity > 0.6 ? 0.35 : 0.55;
    } else if (this.mode === "BASS_GROOVE") {
      shouldPlay = step === 0 || step === 2 || step === 4 || (step === 3 && this.intensity >= 0.75) || step === 6;
      duration = 0.32;
    }

    if (!shouldPlay) return;

    const freq = this.calculateBassFrequency(currentChord, nextChord, step, totalStepsPerBar, section);
    const finalVelocity = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * (isDownbeat ? 1.0 : 0.85) * velFactor));
    const filterCutoff = 220 + (this.intensity * 180);

    this.soundProvider.triggerBass(time, freq, duration, finalVelocity, filterCutoff);
  }
}

// =============================================================
// 2. TECLADO / PIANO (PIANO PLAYER)
// =============================================================
export class PianoPlayer extends InstrumentPlayer {
  constructor(soundProvider = null) {
    super("keyboard", "Teclado / Piano", soundProvider);
    this.mode = "KEYS_PAD"; // "KEYS_PAD" | "KEYS_PIANO" | "KEYS_WORSHIP"
    this.volume = 0.7;
    this.lastVoicingFrequencies = null;
  }

  setMode(mode) {
    if (["KEYS_PAD", "KEYS_PIANO", "KEYS_WORSHIP", "pad", "piano"].includes(mode)) {
      if (mode === "pad") this.mode = "KEYS_PAD";
      else if (mode === "piano") this.mode = "KEYS_PIANO";
      else this.mode = mode;
    }
  }

  /**
   * Obtém voicings de piano otimizados com voice leading e notas comuns
   */
  getVoicingFrequencies(chordData) {
    const symbol = chordData.symbol || chordData.raw || "G";
    try {
      const voicings = getPianoVoicings(symbol);
      if (voicings && voicings.length > 0) {
        // Seleciona a inversão que tenha menor distância média do voicing anterior
        let bestVoicing = voicings[0];
        if (this.lastVoicingFrequencies && voicings.length > 1) {
          let minDistance = Infinity;
          for (const v of voicings) {
            const freqs = v.notes.map((n, i) => noteToFrequency(n, i === 0 ? 3 : 4));
            const avgDist = Math.abs(freqs[0] - this.lastVoicingFrequencies[0]);
            if (avgDist < minDistance) {
              minDistance = avgDist;
              bestVoicing = v;
            }
          }
        }
        const calculated = bestVoicing.notes.map((noteName, idx) => {
          const octave = idx === 0 ? 3 : 4;
          return noteToFrequency(noteName, octave);
        });
        this.lastVoicingFrequencies = calculated;
        return calculated;
      }
    } catch {}

    // Fallback harmônico consistente
    const notes = chordData.notes && chordData.notes.length > 0 ? chordData.notes : [chordData.root || "G"];
    const freqs = notes.slice(0, 4).map((noteName, idx) => {
      const octave = idx === 0 ? 3 : 4;
      return noteToFrequency(noteName, octave);
    });
    this.lastVoicingFrequencies = freqs;
    return freqs;
  }

  playPattern(stepInfo, currentChord, nextChord, section = "verse") {
    if (!this.soundProvider) return;
    const { step, time, totalStepsPerBar } = stepInfo;

    const freqs = this.getVoicingFrequencies(currentChord);
    const isDownbeat = step === 0;

    if (this.mode === "KEYS_PAD") {
      // Pad toca apenas no início do compasso e sustenta durante todo o compasso
      if (step === 0) {
        const vel = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * 0.9));
        this.soundProvider.triggerKeyboardChord(time, freqs, "pad", 2.2, vel);
      }
    } else if (this.mode === "KEYS_PIANO") {
      // Piano toca nos tempos principais com ritmo de martelo articulado
      const playSteps = [0, 4];
      if (this.intensity >= 0.75) playSteps.push(2, 6);
      if (playSteps.includes(step)) {
        const vel = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * (isDownbeat ? 1.0 : 0.75)));
        this.soundProvider.triggerPianoVoicing(time, freqs, "piano", 0.9, vel);
      }
    } else if (this.mode === "KEYS_WORSHIP") {
      // Worship: Pad longo no tempo 1 e preenchimento suave de piano no tempo 3
      if (step === 0) {
        const vel = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * 0.95));
        this.soundProvider.triggerKeyboardChord(time, freqs, "pad", 2.0, vel);
      } else if (step === 4 && this.intensity >= 0.5) {
        const vel = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * 0.7));
        this.soundProvider.triggerPianoVoicing(time, freqs, "piano", 1.1, vel);
      }
    }
  }
}

// =============================================================
// 3. VIOLÃO / GUITARRA (GUITAR PLAYER & ACOUSTIC GUITAR PLAYER)
// =============================================================
export class GuitarPlayer extends InstrumentPlayer {
  constructor(soundProvider = null) {
    super("guitar", "Violão / Guitarra", soundProvider);
    this.pattern = "strum"; // "strum" | "arpeggio" | "worship" | "ballad" | "pop" | "soft" | "energetic"
    this.volume = 0.7;
  }

  setPattern(pattern) {
    if (["strum", "arpeggio", "worship", "ballad", "pop", "soft", "energetic"].includes(pattern)) {
      this.pattern = pattern;
    }
  }

  getChordFrequencies(chordData) {
    const root = chordData.root || "G";
    const rootFreq = noteToFrequency(root, 3);
    const fifthFreq = rootFreq * 1.498307;
    const thirdFreq = chordData.isMinor ? rootFreq * 1.189207 : rootFreq * 1.259921;
    const octaveFreq = rootFreq * 2.0;

    return [rootFreq, fifthFreq, thirdFreq * 2.0, octaveFreq];
  }

  playPattern(stepInfo, currentChord, nextChord, section = "verse") {
    if (!this.soundProvider) return;
    const { step, time, totalStepsPerBar } = stepInfo;
    const freqs = this.getChordFrequencies(currentChord);

    let shouldPlay = false;
    let direction = step % 2 === 0 ? "down" : "up";
    let isArpeggio = false;
    let arpeggioIndex = step % freqs.length;

    if (this.pattern === "strum" || this.pattern === "energetic") {
      const activeSteps = this.pattern === "energetic" || this.intensity >= 0.75
        ? [0, 2, 3, 4, 6, 7]
        : [0, 2, 4, 6];
      shouldPlay = activeSteps.includes(step);
    } else if (this.pattern === "arpeggio" || this.pattern === "ballad") {
      isArpeggio = true;
      shouldPlay = true;
    } else if (this.pattern === "worship") {
      shouldPlay = step === 0 || step === 4 || (this.intensity >= 0.7 && step === 2);
    } else if (this.pattern === "pop") {
      shouldPlay = [0, 3, 4, 6].includes(step);
    } else if (this.pattern === "soft") {
      shouldPlay = step === 0 || step === 4;
    }

    if (!shouldPlay) return;

    const vel = Math.max(0.1, Math.min(1.0, this.volume * this.intensity * (step === 0 ? 1.0 : 0.8)));

    if (isArpeggio) {
      const noteFreq = freqs[arpeggioIndex] || freqs[0];
      this.soundProvider.triggerGuitarNote(time, noteFreq, this.pattern, 0.45, vel);
    } else {
      this.soundProvider.triggerGuitarStrum(time, freqs, direction, 0.5, vel);
    }
  }
}

export class AcousticGuitarPlayer extends GuitarPlayer {
  constructor(soundProvider = null) {
    super(soundProvider);
    this.name = "Violão Acústico";
    this.pattern = "strum";
  }
}

// =============================================================
// 4. BATERIA MUSICAL (DRUM PLAYER)
// =============================================================
export class DrumPlayer extends InstrumentPlayer {
  constructor(soundProvider = null) {
    super("drums", "Bateria Musical", soundProvider);
    this.style = "DRUM_WORSHIP"; // "DRUM_BASIC" | "DRUM_WORSHIP" | "DRUM_POP" | "DRUM_ROCK" | "DRUM_BALLAD"
    this.volume = 0.8;
  }

  setStyle(style) {
    if (["DRUM_BASIC", "DRUM_WORSHIP", "DRUM_POP", "DRUM_ROCK", "DRUM_BALLAD"].includes(style)) {
      this.style = style;
    }
  }

  playPattern(stepInfo, section = "verse", isTransition = false) {
    if (!this.soundProvider) return;
    const { step, time, totalStepsPerBar } = stepInfo;

    const isDownbeat = step === 0;
    const isBackbeat = step === 4 || (totalStepsPerBar === 6 && step === 3);

    // Se estiver em transição (fill de virada nos últimos tempos)
    if (isTransition && step >= (totalStepsPerBar - 4)) {
      this.soundProvider.triggerSnare(time, this.volume * this.intensity * 0.95, false);
      if (step % 2 === 0) {
        this.soundProvider.triggerTom(time, step === totalStepsPerBar - 4 ? "high" : "mid", this.volume * this.intensity);
      }
      return;
    }

    // Padrões por estilo
    let kick = false;
    let snare = false;
    let ghost = false;
    let hihat = false;
    let openHihat = false;
    let ride = false;
    let crash = false;

    const normSection = String(section || "verse").toLowerCase();
    const isChorus = normSection.includes("refr") || normSection.includes("chorus");
    const isIntro = normSection.includes("intro");
    const isEnding = normSection.includes("end") || normSection.includes("fim");

    if (isIntro) {
      // Intro: suave e espaçado
      kick = step === 0;
      hihat = step % 2 === 0;
    } else if (isEnding) {
      // Ending: resolução no tempo 1 com crash
      if (step === 0) {
        kick = true;
        crash = true;
      }
    } else {
      // Groove normal por estilo
      if (this.style === "DRUM_WORSHIP") {
        kick = step === 0 || (this.intensity >= 0.6 && step === 4);
        snare = isBackbeat;
        ghost = !isBackbeat && (step === 3 || step === 7) && this.intensity >= 0.7;
        ride = isChorus || this.intensity >= 0.75;
        hihat = !ride && (step % 2 === 0);
        crash = isChorus && step === 0;
      } else if (this.style === "DRUM_POP") {
        kick = step === 0 || step === 3 || (this.intensity >= 0.7 && step === 6);
        snare = isBackbeat;
        ghost = step === 7 && this.intensity >= 0.6;
        hihat = step % 2 === 0 || this.intensity >= 0.7;
      } else if (this.style === "DRUM_ROCK") {
        kick = step === 0 || step === 2 || step === 5;
        snare = isBackbeat;
        hihat = true; // Colcheias contínuas
        openHihat = step === 7;
      } else if (this.style === "DRUM_BALLAD") {
        kick = step === 0;
        snare = isBackbeat;
        hihat = step === 0 || step === 4;
      } else { // DRUM_BASIC
        kick = step === 0 || step === 4;
        snare = isBackbeat;
        hihat = step % 2 === 0;
      }
    }

    const baseVol = this.volume * this.intensity;

    if (kick) this.soundProvider.triggerKick(time, baseVol * (isDownbeat ? 1.0 : 0.85));
    if (snare) this.soundProvider.triggerSnare(time, baseVol * 1.0, false);
    if (ghost) this.soundProvider.triggerSnare(time, baseVol * 0.35, true);
    if (ride) this.soundProvider.triggerRide(time, baseVol * (step % 2 === 0 ? 0.85 : 0.6));
    if (hihat) this.soundProvider.triggerHiHat(time, baseVol * 0.75, openHihat);
    if (crash) this.soundProvider.triggerCrash(time, baseVol * 0.9);
  }
}
