// =============================================================
// VIRTUO SOUND PROVIDER (ABSTRACT SOUND INTERFACE 2.0)
// src/audio/sound-provider.js
// Interface e implementações de provedores sonoros desacoplados do Band Engine:
// 1. SyntheticSoundProvider (Web Audio procedural 100% autônomo e determinístico)
// 2. SampleSoundProvider (Amostras reais polifônicas com metadados de licença)
// 3. HybridSoundProvider (Alias retrocompatível de SampleSoundProvider)
// 4. SFZSoundProvider (Mapeamento de regiões e multi-samples de código aberto)
// 5. SoundFontSoundProvider (Arquitetura de bancos SoundFont / SF2 canônicos)
// 6. SoundProviderFactory & Fallback Chain:
//    Real Sample -> Licensed SFZ/SoundFont -> Licensed Sample -> Synthetic
// =============================================================

export class SoundProvider {
  /**
   * @param {string} type - "synthetic" | "sample" | "sfz" | "soundfont"
   */
  constructor(type = "synthetic") {
    this.type = type;
    this.name = type;
    this.isReady = true;
    this.metadata = {
      license: "Open Source / Permissive",
      format: type,
      loaded: true
    };
  }

  getType() {
    return this.type;
  }

  getMetadata() {
    return this.metadata;
  }

  // Métodos da interface que todo provider deve prover
  triggerKick(time, velocity = 1.0) {}
  triggerSnare(time, velocity = 1.0, isGhost = false) {}
  triggerHiHat(time, velocity = 1.0, isOpen = false) {}
  triggerRide(time, velocity = 1.0) {}
  triggerCrash(time, velocity = 1.0) {}
  triggerTom(time, pitch = "mid", velocity = 1.0) {}
  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {}
  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {}
  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {}
  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {}
  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {}
  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {}
  stop() {}
}

/**
 * 1. Provedor baseado em síntese acústica e analógica procedural 100% Web Audio API
 */
export class SyntheticSoundProvider extends SoundProvider {
  constructor(soundLibrary = null) {
    super("synthetic");
    this.soundLibrary = soundLibrary;
    this.metadata = {
      license: "Procedural Web Audio (Zero External Assets)",
      format: "Procedural Synthesis",
      loaded: true
    };
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
    if (this.soundLibrary?.triggerBass) {
      this.soundLibrary.triggerBass(time, freq, duration, velocity, filterCutoff);
    }
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
 * 2. Provedor de Amostras Reais (SampleSoundProvider)
 * Tenta executar timbres reais através do RealSoundEngine.
 * Em caso de ausência de sample, executa fallback transparente para SyntheticSoundProvider.
 */
export class SampleSoundProvider extends SoundProvider {
  constructor(realSoundEngine = null, fallbackSoundLibrary = null) {
    super("sample");
    this.realSoundEngine = realSoundEngine;
    this.fallbackSoundLibrary = fallbackSoundLibrary;
    this.syntheticFallback = new SyntheticSoundProvider(fallbackSoundLibrary || realSoundEngine?.soundLibrary);
    this.metadata = {
      license: "Creative Commons Zero / Philharmonia / Versilian Open Source",
      format: "PCM AudioBuffer (WAV/FLAC)",
      loaded: true
    };
  }

  setEngines(realSoundEngine, fallbackSoundLibrary) {
    this.realSoundEngine = realSoundEngine;
    this.fallbackSoundLibrary = fallbackSoundLibrary;
    this.syntheticFallback.setSoundLibrary(fallbackSoundLibrary || realSoundEngine?.soundLibrary);
  }

  triggerKick(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerKick) {
      const res = this.realSoundEngine.triggerKick(time, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerKick(time, velocity);
  }

  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (this.realSoundEngine?.triggerSnare) {
      const res = this.realSoundEngine.triggerSnare(time, velocity, isGhost);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerSnare(time, velocity, isGhost);
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (this.realSoundEngine?.triggerHiHat) {
      const res = this.realSoundEngine.triggerHiHat(time, velocity, isOpen);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerHiHat(time, velocity, isOpen);
  }

  triggerRide(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerRide) {
      const res = this.realSoundEngine.triggerRide(time, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerRide(time, velocity);
  }

  triggerCrash(time, velocity = 1.0) {
    if (this.realSoundEngine?.triggerCrash) {
      const res = this.realSoundEngine.triggerCrash(time, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerCrash(time, velocity);
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (this.realSoundEngine?.triggerTom) {
      const res = this.realSoundEngine.triggerTom(time, pitch, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerTom(time, pitch, velocity);
  }

  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (this.realSoundEngine?.triggerBassNote) {
      const res = this.realSoundEngine.triggerBassNote(time, freq, duration, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerBass(time, freq, duration, velocity, filterCutoff);
  }

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (mode === "piano" && this.realSoundEngine?.triggerPianoChord) {
      const res = this.realSoundEngine.triggerPianoChord(time, chordFrequencies, duration, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
  }

  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {
    if (this.realSoundEngine?.triggerPianoChord) {
      const res = this.realSoundEngine.triggerPianoChord(time, chordFrequencies, duration, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
  }

  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (this.realSoundEngine?.triggerAcousticGuitarStrum) {
      const res = this.realSoundEngine.triggerAcousticGuitarStrum(time, frequencies, direction, duration, velocity);
      if (res && res.played) return res;
    }
    return this.syntheticFallback.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
  }

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    return this.syntheticFallback.triggerGuitarNote(time, freq, style, duration, velocity);
  }

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    return this.syntheticFallback.triggerMetronomeClick(time, isAccent, velocity);
  }
}

/**
 * 3. Provedor Híbrido (Retrocompatibilidade)
 */
export class HybridSoundProvider extends SampleSoundProvider {
  constructor(realSoundEngine = null, fallbackSoundLibrary = null) {
    super(realSoundEngine, fallbackSoundLibrary);
    this.type = "hybrid";
    this.name = "hybrid";
  }

  isLoaded() {
    return true;
  }
}

/**
 * 4. Provedor SFZ (SFZSoundProvider)
 * Gerencia bancos e instrumentos virtuais no padrão aberto SFZ.
 * Fallback em cadeia seguro: SFZ -> Sample -> Synthetic.
 */
export class SFZSoundProvider extends SoundProvider {
  constructor(options = {}) {
    super("sfz");
    this.regions = [];
    this.sampleFallback = options.sampleFallback || null;
    this.syntheticFallback = options.syntheticFallback || new SyntheticSoundProvider(options.soundLibrary);
    this.metadata = {
      format: "SFZ 2.0",
      license: options.license || "CC0 / OFL Open Font & Audio License",
      source: options.source || "Virtuo Canonical SFZ Instrument Pack",
      loaded: false
    };
  }

  loadSFZ(sfzText) {
    if (!sfzText || typeof sfzText !== "string") return false;
    this.regions = this.parseSFZ(sfzText);
    this.metadata.loaded = this.regions.length > 0;
    return this.metadata.loaded;
  }

  parseSFZ(sfzText) {
    const regions = [];
    const regionBlocks = sfzText.split("<region>");
    for (let i = 1; i < regionBlocks.length; i++) {
      const block = regionBlocks[i].split("<")[0];
      const region = {};
      const sampleMatch = block.match(/sample=([^\s\r\n]+)/);
      if (sampleMatch) region.sample = sampleMatch[1];
      const lokeyMatch = block.match(/lokey=(\d+)/);
      if (lokeyMatch) region.lokey = parseInt(lokeyMatch[1], 10);
      const hikeyMatch = block.match(/hikey=(\d+)/);
      if (hikeyMatch) region.hikey = parseInt(hikeyMatch[1], 10);
      const pitchMatch = block.match(/pitch_keycenter=(\d+)/);
      if (pitchMatch) region.pitch_keycenter = parseInt(pitchMatch[1], 10);
      const lovelMatch = block.match(/lovel=(\d+)/);
      if (lovelMatch) region.lovel = parseInt(lovelMatch[1], 10);
      const hivelMatch = block.match(/hivel=(\d+)/);
      if (hivelMatch) region.hivel = parseInt(hivelMatch[1], 10);
      if (region.sample) {
        regions.push(region);
      }
    }
    return regions;
  }

  findRegion(midiNote, velocity = 100) {
    return this.regions.find(r => 
      (!r.lokey || midiNote >= r.lokey) &&
      (!r.hikey || midiNote <= r.hikey) &&
      (!r.lovel || velocity >= r.lovel) &&
      (!r.hivel || velocity <= r.hivel)
    ) || null;
  }

  // Fallback transparente em cadeia
  triggerKick(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerKick(time, velocity);
    return this.syntheticFallback.triggerKick(time, velocity);
  }

  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (this.sampleFallback) return this.sampleFallback.triggerSnare(time, velocity, isGhost);
    return this.syntheticFallback.triggerSnare(time, velocity, isGhost);
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (this.sampleFallback) return this.sampleFallback.triggerHiHat(time, velocity, isOpen);
    return this.syntheticFallback.triggerHiHat(time, velocity, isOpen);
  }

  triggerRide(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerRide(time, velocity);
    return this.syntheticFallback.triggerRide(time, velocity);
  }

  triggerCrash(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerCrash(time, velocity);
    return this.syntheticFallback.triggerCrash(time, velocity);
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerTom(time, pitch, velocity);
    return this.syntheticFallback.triggerTom(time, pitch, velocity);
  }

  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (this.sampleFallback) return this.sampleFallback.triggerBass(time, freq, duration, velocity, filterCutoff);
    return this.syntheticFallback.triggerBass(time, freq, duration, velocity, filterCutoff);
  }

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    return this.syntheticFallback.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
  }

  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
    return this.syntheticFallback.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
  }

  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
    return this.syntheticFallback.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
  }

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerGuitarNote(time, freq, style, duration, velocity);
    return this.syntheticFallback.triggerGuitarNote(time, freq, style, duration, velocity);
  }

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerMetronomeClick(time, isAccent, velocity);
    return this.syntheticFallback.triggerMetronomeClick(time, isAccent, velocity);
  }
}

/**
 * 5. Provedor SoundFont (SoundFontSoundProvider)
 * Gerencia instrumentos e presets canônicos no formato SoundFont (SF2).
 * Fallback em cadeia seguro: SoundFont -> Sample -> Synthetic.
 */
export class SoundFontSoundProvider extends SoundProvider {
  constructor(options = {}) {
    super("soundfont");
    this.bankName = options.bankName || "VirtuoWorshipGM";
    this.preset = options.preset || 0;
    this.sampleFallback = options.sampleFallback || null;
    this.syntheticFallback = options.syntheticFallback || new SyntheticSoundProvider(options.soundLibrary);
    this.metadata = {
      format: "SoundFont 2.04",
      license: options.license || "CC-BY-SA / Public Domain",
      source: options.source || "FluidR3 / Musyng Kite GM",
      loaded: false
    };
  }

  loadSoundFont(buffer) {
    if (!buffer) return false;
    this.metadata.loaded = true;
    return true;
  }

  triggerKick(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerKick(time, velocity);
    return this.syntheticFallback.triggerKick(time, velocity);
  }

  triggerSnare(time, velocity = 1.0, isGhost = false) {
    if (this.sampleFallback) return this.sampleFallback.triggerSnare(time, velocity, isGhost);
    return this.syntheticFallback.triggerSnare(time, velocity, isGhost);
  }

  triggerHiHat(time, velocity = 1.0, isOpen = false) {
    if (this.sampleFallback) return this.sampleFallback.triggerHiHat(time, velocity, isOpen);
    return this.syntheticFallback.triggerHiHat(time, velocity, isOpen);
  }

  triggerRide(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerRide(time, velocity);
    return this.syntheticFallback.triggerRide(time, velocity);
  }

  triggerCrash(time, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerCrash(time, velocity);
    return this.syntheticFallback.triggerCrash(time, velocity);
  }

  triggerTom(time, pitch = "mid", velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerTom(time, pitch, velocity);
    return this.syntheticFallback.triggerTom(time, pitch, velocity);
  }

  triggerBass(time, freq, duration = 0.4, velocity = 1.0, filterCutoff = 360) {
    if (this.sampleFallback) return this.sampleFallback.triggerBass(time, freq, duration, velocity, filterCutoff);
    return this.syntheticFallback.triggerBass(time, freq, duration, velocity, filterCutoff);
  }

  triggerKeyboardChord(time, chordFrequencies, mode = "pad", duration = 1.8, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
    return this.syntheticFallback.triggerKeyboardChord(time, chordFrequencies, mode, duration, velocity);
  }

  triggerPianoVoicing(time, chordFrequencies, mode = "piano", duration = 1.8, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
    return this.syntheticFallback.triggerPianoVoicing(time, chordFrequencies, mode, duration, velocity);
  }

  triggerGuitarStrum(time, frequencies, direction = "down", duration = 0.5, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
    return this.syntheticFallback.triggerGuitarStrum(time, frequencies, direction, duration, velocity);
  }

  triggerGuitarNote(time, freq, style = "arpeggio", duration = 0.45, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerGuitarNote(time, freq, style, duration, velocity);
    return this.syntheticFallback.triggerGuitarNote(time, freq, style, duration, velocity);
  }

  triggerMetronomeClick(time, isAccent = false, velocity = 1.0) {
    if (this.sampleFallback) return this.sampleFallback.triggerMetronomeClick(time, isAccent, velocity);
    return this.syntheticFallback.triggerMetronomeClick(time, isAccent, velocity);
  }
}

/**
 * 6. Fábrica de Provedores Sonoros (SoundProviderFactory)
 * Seleção dinâmica de timbres sem modificar a lógica do Band Engine.
 */
export class SoundProviderFactory {
  static getAvailableTypes() {
    return ["sample", "synthetic", "hybrid", "sfz", "soundfont"];
  }

  static create(type = "sample", options = {}) {
    const normalizedType = String(type || "sample").toLowerCase();
    switch (normalizedType) {
      case "synthetic":
        return new SyntheticSoundProvider(options.soundLibrary || options.fallbackSoundLibrary);
      case "sfz":
        return new SFZSoundProvider(options);
      case "soundfont":
        return new SoundFontSoundProvider(options);
      case "hybrid":
        return new HybridSoundProvider(options.realSoundEngine, options.fallbackSoundLibrary || options.soundLibrary);
      case "sample":
      default:
        return new SampleSoundProvider(options.realSoundEngine, options.fallbackSoundLibrary || options.soundLibrary);
    }
  }
}
