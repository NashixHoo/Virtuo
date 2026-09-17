// =============================================================
// VIRTUO SOUND PROVIDER (ABSTRACT SOUND INTERFACE)
// src/audio/sound-provider.js
// Interface abstrata para desacoplar a geração de notas do motor tímbrico:
// synthetic (Web Audio procedural), sample (áudio real), sfz, soundfont.
// "O Band Engine não precisa saber de onde vem o áudio."
// =============================================================

export class SoundProvider {
  /**
   * @param {string} type - "synthetic" | "sample" | "sfz" | "soundfont"
   */
  constructor(type = "synthetic") {
    this.type = type;
    this.isReady = true;
  }

  getType() {
    return this.type;
  }

  // Métodos da interface que todo provider deve prover
  triggerKick(time, velocity) {}
  triggerSnare(time, velocity, isGhost) {}
  triggerHiHat(time, velocity, isOpen) {}
  triggerRide(time, velocity) {}
  triggerCrash(time, velocity) {}
  triggerTom(time, pitch, velocity) {}
  triggerBass(time, freq, duration, velocity, filterCutoff) {}
  triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity) {}
  triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity) {}
  triggerGuitarStrum(time, frequencies, direction, duration, velocity) {}
  triggerGuitarNote(time, freq, style, duration, velocity) {}
  triggerMetronomeClick(time, isAccent, velocity) {}
}

/**
 * Provedor baseado em síntese acústica e analógica procedural 100% Web Audio API
 */
export class SyntheticSoundProvider extends SoundProvider {
  constructor(soundLibrary) {
    super("synthetic");
    this.soundLibrary = soundLibrary;
  }

  setSoundLibrary(soundLibrary) {
    this.soundLibrary = soundLibrary;
  }

  triggerKick(time, velocity = 1.0) {
    if (this.soundLibrary?.triggerKick) this.soundLibrary.triggerKick(time, velocity);
  }

  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (this.soundLibrary?.triggerSnare) this.soundLibrary.triggerSnare(time, velocity, isGhost);
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (this.soundLibrary?.triggerHiHat) this.soundLibrary.triggerHiHat(time, velocity, isOpen);
  }

  triggerRide(time, velocity = 1.0) {
    if (this.soundLibrary?.triggerRide) this.soundLibrary.triggerRide(time, velocity);
  }

  triggerCrash(time, velocity = 1.0) {
    if (this.soundLibrary?.triggerCrash) this.soundLibrary.triggerCrash(time, velocity);
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (this.soundLibrary?.triggerTom) this.soundLibrary.triggerTom(time, pitch, velocity);
  }

  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (this.soundLibrary?.triggerBass) this.soundLibrary.triggerBass(time, freq, duration, velocity, filterCutoff);
  }

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (this.soundLibrary?.triggerKeyboardChord) {
      this.soundLibrary.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    }
  }

  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {
    if (this.soundLibrary?.triggerPianoVoicing) {
      this.soundLibrary.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
    } else if (this.soundLibrary?.triggerKeyboardChord) {
      this.soundLibrary.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    }
  }

  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (this.soundLibrary?.triggerGuitarStrum) {
      this.soundLibrary.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
    }
  }

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (this.soundLibrary?.triggerGuitarNote) {
      this.soundLibrary.triggerGuitarNote(time, freq, style, duration, velocity);
    }
  }

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (this.soundLibrary?.triggerMetronomeClick) {
      this.soundLibrary.triggerMetronomeClick(time, isAccent, velocity);
    }
  }
}

/**
 * Provedor híbrido: utiliza prioritariamente o RealSoundEngine (amostras reais em cache)
 * com fallback transparente para o SoundLibrary procedural, sem travar o áudio.
 */
export class HybridSoundProvider extends SoundProvider {
  constructor(realSoundEngine, fallbackSoundLibrary) {
    super("sample");
    this.realSoundEngine = realSoundEngine;
    this.fallbackSoundLibrary = fallbackSoundLibrary;
  }

  setEngines(realSoundEngine, fallbackSoundLibrary) {
    this.realSoundEngine = realSoundEngine;
    this.fallbackSoundLibrary = fallbackSoundLibrary;
  }

  triggerKick(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerKick) {
      this.realSoundEngine.triggerKick(time, velocity);
    } else if (this.fallbackSoundLibrary?.triggerKick) {
      this.fallbackSoundLibrary.triggerKick(time, velocity);
    }
  }

  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (this.realSoundEngine?.triggerSnare) {
      this.realSoundEngine.triggerSnare(time, velocity, isGhost);
    } else if (this.fallbackSoundLibrary?.triggerSnare) {
      this.fallbackSoundLibrary.triggerSnare(time, velocity, isGhost);
    }
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (this.realSoundEngine?.triggerHiHat) {
      this.realSoundEngine.triggerHiHat(time, velocity, isOpen);
    } else if (this.fallbackSoundLibrary?.triggerHiHat) {
      this.fallbackSoundLibrary.triggerHiHat(time, velocity, isOpen);
    }
  }

  triggerRide(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerRide) {
      this.realSoundEngine.triggerRide(time, velocity);
    } else if (this.fallbackSoundLibrary?.triggerRide) {
      this.fallbackSoundLibrary.triggerRide(time, velocity);
    }
  }

  triggerCrash(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerCrash) {
      this.realSoundEngine.triggerCrash(time, velocity);
    } else if (this.fallbackSoundLibrary?.triggerCrash) {
      this.fallbackSoundLibrary.triggerCrash(time, velocity);
    }
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (this.realSoundEngine?.triggerTom) {
      this.realSoundEngine.triggerTom(time, pitch, velocity);
    } else if (this.fallbackSoundLibrary?.triggerTom) {
      this.fallbackSoundLibrary.triggerTom(time, pitch, velocity);
    }
  }

  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (this.realSoundEngine?.triggerBassNote) {
      this.realSoundEngine.triggerBassNote(time, freq, duration, velocity);
    } else if (this.fallbackSoundLibrary?.triggerBass) {
      this.fallbackSoundLibrary.triggerBass(time, freq, duration, velocity, filterCutoff);
    }
  }

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (mode === "piano" && this.realSoundEngine?.triggerPianoChord) {
      this.realSoundEngine.triggerPianoChord(time, chordFrequencies, duration, velocity);
    } else if (this.fallbackSoundLibrary?.triggerKeyboardChord) {
      this.fallbackSoundLibrary.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    }
  }

  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {
    if (this.realSoundEngine?.triggerPianoChord) {
      this.realSoundEngine.triggerPianoChord(time, chordFrequencies, duration, velocity);
    } else if (this.fallbackSoundLibrary?.triggerPianoVoicing) {
      this.fallbackSoundLibrary.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
    } else if (this.fallbackSoundLibrary?.triggerKeyboardChord) {
      this.fallbackSoundLibrary.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    }
  }

  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (this.realSoundEngine?.triggerAcousticGuitarStrum) {
      this.realSoundEngine.triggerAcousticGuitarStrum(time, frequencies, direction, duration, velocity);
    } else if (this.fallbackSoundLibrary?.triggerGuitarStrum) {
      this.fallbackSoundLibrary.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
    }
  }

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (this.fallbackSoundLibrary?.triggerGuitarNote) {
      this.fallbackSoundLibrary.triggerGuitarNote(time, freq, style, duration, velocity);
    }
  }

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (this.fallbackSoundLibrary?.triggerMetronomeClick) {
      this.fallbackSoundLibrary.triggerMetronomeClick(time, isAccent, velocity);
    }
  }
}
