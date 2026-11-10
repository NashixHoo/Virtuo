// =============================================================
// VIRTUO ARRANGEMENT ENGINE 2.0
// src/audio/arrangement-engine.js
// Distribuição de papéis musicais, orquestração e execução tímbrica
// Suporte a MusicalArrangement, InstrumentPlayers, Humanização Orgânica 2.0
// e voice-leading polifônico.
// =============================================================

import { MusicalArrangement } from "./musical-arrangement.js";
import {
  BassPlayer,
  PianoPlayer,
  GuitarPlayer,
  DrumPlayer
} from "./instrument-players.js";
import {
  HybridSoundProvider,
  SyntheticSoundProvider
} from "./sound-provider.js";
import {
  MusicalEvent,
  BassNoteEvent,
  KeyboardChordEvent,
  GuitarStrumEvent,
  DrumEvent
} from "./musical-events.js";

export class ArrangementEngine {
  constructor(soundLibrary, harmonicEngine, grooveEngine, sampleManager = null, realSoundEngine = null) {
    this.soundLibrary = soundLibrary;
    this.harmonicEngine = harmonicEngine;
    this.grooveEngine = grooveEngine;
    this.sampleManager = sampleManager;
    this.realSoundEngine = realSoundEngine;

    // Registro dos últimos eventos musicais por canal
    this.lastEvents = {
      drums: null,
      bass: null,
      keyboard: null,
      guitar: null
    };

    // Provedor de som abstrato
    const realEngine = realSoundEngine || (soundLibrary?.samplePlayer ? soundLibrary : null);
    const synthLib = soundLibrary?.samplePlayer ? (soundLibrary.synthFallback || soundLibrary) : soundLibrary;
    this.soundProvider = realEngine
      ? new HybridSoundProvider(realEngine, synthLib)
      : new SyntheticSoundProvider(synthLib);

    // Instrumentistas virtuais especializados
    this.bassPlayer = new BassPlayer(this.soundProvider);
    this.pianoPlayer = new PianoPlayer(this.soundProvider);
    this.guitarPlayer = new GuitarPlayer(this.soundProvider);
    this.drumPlayer = new DrumPlayer(this.soundProvider);

    // Arranjo musical ativo
    this.musicalArrangement = null;
  }

  setSoundProvider(provider) {
    this.soundProvider = provider;
    this.bassPlayer.setSoundProvider(provider);
    this.pianoPlayer.setSoundProvider(provider);
    this.guitarPlayer.setSoundProvider(provider);
    this.drumPlayer.setSoundProvider(provider);
  }

  setArrangement(arrangement) {
    this.musicalArrangement = arrangement;
  }

  /**
   * Determina se uma trilha pode tocar considerando solo, mute e volume
   */
  _canPlayTrack(trackId, tracksState) {
    if (!tracksState) return false;
    const trk = tracksState[trackId];
    if (!trk || !trk.active || trk.muted || trk.volume <= 0) return false;
    const hasAnySolo = Object.values(tracksState).some(t => t && t.solo);
    if (hasAnySolo) return !!trk.solo;
    return true;
  }

  /**
   * Tabela determinística de offset de micro-timing por instrumento para evitar colisão sintética
   */
  _getDeterministicOffset(time, instrument = "generic", amount = 0.04) {
    const instOffsets = {
      drums: 1.11,
      kick: 1.11,
      snare: 1.55,
      ride: 1.88,
      bass: 2.22,
      keyboard: 3.33,
      piano: 3.33,
      guitar: 4.44,
      generic: 0.0
    };
    const offset = instOffsets[instrument] || 0.0;
    return (Math.sin((time + offset) * 137.5) * 0.5) * 0.0035;
  }

  /**
   * Humanização orgânica: microtiming determinístico (±2 a 5ms) e variação sutil de dinâmica
   */
  _humanize(time, velocity, amount = 0.04, instrument = "generic") {
    const jitter = this._getDeterministicOffset(time, instrument, amount);
    const instOffsets = {
      drums: 1.11,
      kick: 1.11,
      snare: 1.55,
      ride: 1.88,
      bass: 2.22,
      keyboard: 3.33,
      piano: 3.33,
      guitar: 4.44,
      generic: 0.0
    };
    const offset = instOffsets[instrument] || 0.0;
    const velJitter = 1.0 + (Math.cos((time + offset) * 73.3) * amount);

    return {
      time: Math.max(time, time + jitter),
      velocity: Math.max(0.1, Math.min(1.0, velocity * velJitter))
    };
  }

  /**
   * Executa a orquestração de um step do relógio
   */
  scheduleStep(stepInfo, tracksState) {
    const { step, bar, time, totalStepsPerBar, beat } = stepInfo;

    // Se o motor de groove tiver intensidade 0 ou silêncio total
    if (this.grooveEngine.intensity <= 0) return;

    const events = this.grooveEngine.getStepEvents(step, totalStepsPerBar);
    const intensity = this.grooveEngine.intensity;
    const style = this.grooveEngine.currentPreset;

    // Informação do acorde atual e próximo do compasso
    let currentChordData = null;
    let nextChordData = null;

    if (this.musicalArrangement) {
      currentChordData = this.musicalArrangement.getChordAt(bar + 1, beat || 1);
      nextChordData = this.musicalArrangement.getNextChord(bar + 1);
    } else {
      currentChordData = this.harmonicEngine.getCurrentChordInfo();
      nextChordData = {
        symbol: this.harmonicEngine.getNextChordSymbol(),
        root: this.harmonicEngine.getNextChordSymbol()
      };
    }

    const currentSection = this.grooveEngine.currentSection || "verse";
    const isTransition = !!this.grooveEngine.nextQueuedSection;

    // 1. BATERIA
    if (this._canPlayTrack("drums", tracksState) && events.drums) {
      const drumTrack = tracksState.drums;
      const baseVol = drumTrack.volume;

      if (events.drums.playKick) {
        const h = this._humanize(time, events.drums.kickVelocity * baseVol, 0.03, "drums");
        if (this.soundLibrary?.triggerKick) {
          this.soundLibrary.triggerKick(h.time, h.velocity);
        } else if (this.soundProvider) {
          this.soundProvider.triggerKick(h.time, h.velocity);
        }
      }
      if (events.drums.playSnare) {
        const h = this._humanize(time, events.drums.snareVelocity * baseVol, 0.04, "drums");
        if (this.soundLibrary?.triggerSnare) {
          this.soundLibrary.triggerSnare(h.time, h.velocity, events.drums.snareIsGhost);
        } else if (this.soundProvider) {
          this.soundProvider.triggerSnare(h.time, h.velocity, events.drums.snareIsGhost);
        }
      }
      if (events.drums.playHihat) {
        const h = this._humanize(time, events.drums.hihatVelocity * baseVol, 0.05, "drums");
        if (this.soundLibrary?.triggerHiHat) {
          this.soundLibrary.triggerHiHat(h.time, h.velocity, events.drums.hihatIsOpen);
        } else if (this.soundProvider) {
          this.soundProvider.triggerHiHat(h.time, h.velocity, events.drums.hihatIsOpen);
        }
      }
      if (events.drums.playRide) {
        const h = this._humanize(time, events.drums.rideVelocity * baseVol, 0.04, "drums");
        if (this.soundLibrary?.triggerRide) {
          this.soundLibrary.triggerRide(h.time, h.velocity);
        } else if (this.soundProvider) {
          this.soundProvider.triggerRide(h.time, h.velocity);
        }
      }
      if (events.drums.playCrash) {
        if (this.soundLibrary?.triggerCrash) {
          this.soundLibrary.triggerCrash(time, events.drums.crashVelocity * baseVol);
        } else if (this.soundProvider) {
          this.soundProvider.triggerCrash(time, events.drums.crashVelocity * baseVol);
        }
      }
      if (events.drums.playTom) {
        if (this.soundLibrary?.triggerTom) {
          this.soundLibrary.triggerTom(time, events.drums.tomPitch, events.drums.tomVelocity * baseVol);
        } else if (this.soundProvider) {
          this.soundProvider.triggerTom(time, events.drums.tomPitch, events.drums.tomVelocity * baseVol);
        }
      }

      this.lastEvents.drums = new DrumEvent({
        step,
        bar,
        time,
        section: currentSection,
        chord: currentChordData?.symbol || "C",
        intensity,
        velocity: baseVol,
        metadata: {
          kick: !!events.drums.playKick,
          snare: !!events.drums.playSnare,
          hihat: !!events.drums.playHihat,
          ride: !!events.drums.playRide,
          crash: !!events.drums.playCrash,
          isFill: isTransition
        }
      });
    }

    // 2. BAIXO ORGÂNICO (Harmonic Driven - Acompanha a progressão musicalmente)
    if (this._canPlayTrack("bass", tracksState) && events.bass.play) {
      const bassTrack = tracksState.bass;
      const bassMode = this.grooveEngine.isEasyBand
        ? "BASS_EASY"
        : (intensity >= 4 ? "BASS_GROOVE" : "BASS_NORMAL");

      const bassFreq = this.harmonicEngine.getBassFrequency(
        step,
        totalStepsPerBar,
        style,
        intensity,
        bassMode,
        currentChordData,
        nextChordData
      );

      const cutoff = 240 + (intensity * 40);
      const h = this._humanize(time, events.bass.velocity * bassTrack.volume, 0.02, "bass");

      if (this.soundLibrary?.triggerBass) {
        this.soundLibrary.triggerBass(
          h.time,
          bassFreq,
          events.bass.duration,
          h.velocity,
          cutoff
        );
      } else if (this.soundProvider) {
        this.soundProvider.triggerBass(
          h.time,
          bassFreq,
          events.bass.duration,
          h.velocity,
          cutoff
        );
      }

      this.lastEvents.bass = new BassNoteEvent({
        step,
        bar,
        time: h.time,
        section: currentSection,
        chord: currentChordData?.symbol || "C",
        intensity,
        frequency: bassFreq,
        velocity: h.velocity,
        duration: events.bass.duration,
        mode: bassMode,
        note: currentChordData?.bass || currentChordData?.root || "C"
      });
    }

    // 3. TECLADO & PIANO (Voice Leading & Acordes Polifônicos)
    if (this._canPlayTrack("keyboard", tracksState) && events.keyboard.play) {
      const kbTrack = tracksState.keyboard;
      const mode = kbTrack.mode || "pad";
      const chordFrequencies = this.harmonicEngine.getKeyboardFrequencies(mode, 4, currentChordData);

      const freqs = Array.isArray(chordFrequencies) && chordFrequencies.length > 0
        ? chordFrequencies
        : [261.63, 329.63, 392.00];

      const h = this._humanize(time, events.keyboard.velocity * kbTrack.volume, 0.03, "keyboard");

      if (mode === "piano" && freqs.length > 1) {
        if (this.soundLibrary?.triggerPianoVoicing) {
          this.soundLibrary.triggerPianoVoicing(h.time, freqs, mode, events.keyboard.duration, h.velocity);
        } else if (this.soundProvider) {
          this.soundProvider.triggerPianoVoicing(h.time, freqs, mode, events.keyboard.duration, h.velocity);
        }
      } else {
        if (this.soundLibrary?.triggerKeyboardChord) {
          this.soundLibrary.triggerKeyboardChord(h.time, freqs, mode, events.keyboard.duration, h.velocity);
        } else if (this.soundProvider) {
          this.soundProvider.triggerKeyboardChord(h.time, freqs, mode, events.keyboard.duration, h.velocity);
        }
      }

      this.lastEvents.keyboard = new KeyboardChordEvent({
        step,
        bar,
        time: h.time,
        section: currentSection,
        chord: currentChordData?.symbol || "C",
        intensity,
        frequencies: freqs,
        velocity: h.velocity,
        duration: events.keyboard.duration,
        keyboardMode: mode,
        voicing: freqs
      });
    }

    // 4. GUITARRA & VIOLÃO (Strum & Arpeggio com Notas do Acorde Real)
    if (this._canPlayTrack("guitar", tracksState) && events.guitar.play) {
      const gtTrack = tracksState.guitar;
      const pattern = gtTrack.pattern || "arpeggio";
      const chordFreqs = this.harmonicEngine.getGuitarFrequencies(3);

      if (pattern === "strum") {
        const h = this._humanize(time, events.guitar.velocity * gtTrack.volume, 0.04, "guitar");
        if (this.soundLibrary?.triggerGuitarStrum) {
          this.soundLibrary.triggerGuitarStrum(
            h.time,
            chordFreqs,
            events.guitar.direction,
            events.guitar.duration,
            h.velocity
          );
        } else if (this.soundProvider) {
          this.soundProvider.triggerGuitarStrum(
            h.time,
            chordFreqs,
            events.guitar.direction,
            events.guitar.duration,
            h.velocity
          );
        }
      } else {
        const noteIdx = step % chordFreqs.length;
        const noteFreq = chordFreqs[noteIdx] || chordFreqs[0];
        const h = this._humanize(time, events.guitar.velocity * gtTrack.volume, 0.04, "guitar");
        if (this.soundLibrary?.triggerGuitarNote) {
          this.soundLibrary.triggerGuitarNote(
            h.time,
            noteFreq,
            pattern,
            events.guitar.duration,
            h.velocity
          );
        } else if (this.soundProvider) {
          this.soundProvider.triggerGuitarNote(
            h.time,
            noteFreq,
            pattern,
            events.guitar.duration,
            h.velocity
          );
        }
      }

      this.lastEvents.guitar = new GuitarStrumEvent({
        step,
        bar,
        time: time,
        section: currentSection,
        chord: currentChordData?.symbol || "C",
        intensity,
        velocity: gtTrack.volume,
        duration: events.guitar.duration,
        pattern,
        direction: events.guitar.direction || "DOWN",
        stringFrequencies: chordFreqs
      });
    }
  }
}
