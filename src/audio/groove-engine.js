// =============================================================
// VIRTUO GROOVE ENGINE
// src/audio/groove-engine.js
// Geração e parametrização de levadas, acentuações e dinâmicas
// =============================================================

import { BAND_STYLE_PATTERNS, BAND_SECTIONS } from "./band-patterns.js";

export class GrooveEngine {
  constructor() {
    this.currentPreset = "Worship";
    this.currentSection = "verse";
    this.intensity = 2;
    this.isEasyBand = false;
    this.isTransitioning = false;
    this.nextQueuedSection = null;
  }

  normalizeSectionName(section) {
    if (!section) return "verse";
    const s = String(section).toLowerCase().trim();
    if (s.includes("intro")) return "intro";
    if (s.includes("refr") || s.includes("chorus")) return "chorus";
    if (s.includes("pré") || s.includes("pre")) return "pre_chorus";
    if (s.includes("pont") || s.includes("bridge")) return "bridge";
    if (s.includes("solo")) return "solo";
    if (s.includes("break") || s.includes("parada")) return "break";
    if (s.includes("espont") || s.includes("spontan")) return "spontaneous";
    if (s.includes("fim") || s.includes("final") || s.includes("outro")) return "outro";
    if (s.includes("vers") || s.includes("estrofe")) return "verse";
    return s;
  }

  setPreset(preset) {
    if (BAND_STYLE_PATTERNS[preset]) {
      this.currentPreset = preset;
    }
  }

  setSection(section) {
    this.currentSection = this.normalizeSectionName(section);
  }

  setIntensity(intensity) {
    const val = parseInt(intensity, 10);
    this.intensity = Math.max(0, Math.min(5, isNaN(val) ? 2 : val));
  }

  setEasyBand(enable) {
    this.isEasyBand = !!enable;
  }

  queueSectionTransition(nextSection) {
    this.nextQueuedSection = this.normalizeSectionName(nextSection);
    this.isTransitioning = true;
  }

  clearQueuedTransition() {
    if (this.nextQueuedSection) {
      this.currentSection = this.nextQueuedSection;
      this.nextQueuedSection = null;
    }
    this.isTransitioning = false;
  }

  getPattern(section = null, intensity = null, style = null) {
    return this.getCurrentPattern(style, section, intensity);
  }

  getCurrentPattern(style = null, section = null, intensity = null) {
    if (this.isEasyBand) {
      return {
        kick: [0, 4],
        snare: [4],
        hihat: [0, 2, 4, 6],
        bass: [0, 4],
        keyboard: [0],
        guitar: [0, 2, 4, 6]
      };
    }
    const presetName = style || this.currentPreset;
    const sectionName = this.normalizeSectionName(section || this.currentSection);
    const effIntensity = intensity !== null && intensity !== undefined ? intensity : this.intensity;
    const styleData = BAND_STYLE_PATTERNS[presetName] || BAND_STYLE_PATTERNS.Worship;
    const sectionData = (styleData.sections && styleData.sections[sectionName]) || styleData.sections?.verse || {};
    const isBreak = sectionName === "break";
    const shouldUseRide = !isBreak && (sectionName === "chorus" || sectionName === "bridge" || sectionName === "solo" || effIntensity >= 4);
    const ride = shouldUseRide ? [0, 2, 4, 6] : [];
    const snareGhost = effIntensity >= 3 && !isBreak ? [3, 7] : [];

    return {
      kick: sectionData.kick || [0, 4],
      snare: sectionData.snare || [4],
      snareGhost,
      hihat: sectionData.hihat || [0, 2, 4, 6],
      ride,
      bass: sectionData.bass || [0, 4],
      keyboard: sectionData.keyboard || [0],
      guitar: sectionData.guitar || [0, 2, 4, 6],
      ...sectionData
    };
  }

  isTransitionBar(barOrStep = 0, total = 8) {
    if (!this.isTransitioning && !this.nextQueuedSection) return false;
    return barOrStep >= (total - 2);
  }

  getActivePatternForStep(step, totalSteps = 8) {
    if (this.isTransitionBar(step, totalSteps)) {
      const styleData = BAND_STYLE_PATTERNS[this.currentPreset] || BAND_STYLE_PATTERNS.Worship;
      const fillData = styleData.sections?.fill || {};
      return {
        kick: fillData.kick || [0, 2, 4, 6],
        snare: fillData.snare || [2, 4, 6, 7],
        hihat: fillData.hihat || [0, 1, 2, 3, 4, 5, 6, 7],
        toms: fillData.toms || [4, 5, 6, 7],
        ...fillData
      };
    }
    return this.getCurrentPattern();
  }

  getIntensityMultiplier() {
    // Multiplicadores dinâmicos: 0 (mudo) a 5 (fortíssimo)
    const multipliers = [0.0, 0.5, 0.75, 1.0, 1.25, 1.45];
    return multipliers[this.intensity] !== undefined ? multipliers[this.intensity] : 1.0;
  }

  /**
   * Retorna os eventos e parâmetros rítmicos para o step atual
   */
  getStepEvents(step, totalSteps = 8) {
    const styleData = BAND_STYLE_PATTERNS[this.currentPreset] || BAND_STYLE_PATTERNS.Worship;
    const normSection = this.normalizeSectionName(this.currentSection);
    let sectionData = (styleData.sections && styleData.sections[normSection]) || styleData.sections?.verse || {};

    if (this.isEasyBand) {
      // Simplificação do Easy Band para ritmos retos e acessíveis
      sectionData = BAND_STYLE_PATTERNS["4/4 simples"]?.sections?.verse || sectionData;
    }

    const isTransitionBar = this.nextQueuedSection && step >= (totalSteps - 4);
    const fillData = styleData.sections?.fill || {};

    const isBreak = normSection === "break";

    const kickSteps = isBreak ? [0] : (isTransitionBar && fillData.kick ? fillData.kick : (sectionData.kick || []));
    const snareSteps = isBreak ? [] : (isTransitionBar && fillData.snare ? fillData.snare : (sectionData.snare || []));
    const hihatSteps = isBreak ? [0, 4] : (isTransitionBar && fillData.hihat ? fillData.hihat : (sectionData.hihat || []));
    const crashSteps = isBreak ? [] : (sectionData.crash || []);
    const tomSteps = isTransitionBar && fillData.toms ? fillData.toms : [];

    const bassSteps = isBreak ? [0] : (sectionData.bass || [0, 4]);
    const kbSteps = sectionData.keyboard || [0];
    const gtSteps = isBreak ? [0] : (sectionData.guitar || [0, 2, 4, 6]);

    // Cálculo de velocidade e acentos
    const intensityScale = this.getIntensityMultiplier();
    const isDownbeat = step === 0;
    const isBackbeat = step === 4 || (totalSteps === 6 && step === 3);

    // Condução com Ride Cymbal: presente em refrão, ponte ou intensidades altas
    const shouldUseRide = !isBreak && (normSection === "chorus" || normSection === "bridge" || normSection === "solo" || this.intensity >= 4);
    const rideSteps = shouldUseRide ? [0, 2, 4, 6] : [];

    // Ghost notes na caixa para dar swing e realismo humano
    const isGhostStep = !isBackbeat && (step === 3 || step === 7) && this.intensity >= 3 && !isBreak;

    return {
      drums: {
        playKick: kickSteps.includes(step),
        kickVelocity: isDownbeat ? 1.0 * intensityScale : 0.85 * intensityScale,

        playSnare: snareSteps.includes(step) || isGhostStep,
        snareVelocity: isGhostStep ? 0.35 * intensityScale : ((isBackbeat ? 1.0 : 0.7) * intensityScale),
        snareIsGhost: isGhostStep || (!isBackbeat && (step % 2 !== 0)),

        playHihat: !shouldUseRide && hihatSteps.includes(step),
        hihatVelocity: (step % 2 === 0 ? 0.75 : 0.5) * intensityScale,
        hihatIsOpen: this.intensity >= 4 && (step % 2 !== 0),

        playRide: shouldUseRide && rideSteps.includes(step),
        rideVelocity: (step % 2 === 0 ? 0.85 : 0.6) * intensityScale,

        playCrash: (crashSteps.includes(step) || (isTransitionBar && step === 0)) && this.intensity >= 3 && !isBreak,
        crashVelocity: 0.9 * intensityScale,

        playTom: tomSteps.includes(step),
        tomPitch: step % 2 === 0 ? "mid" : "low",
        tomVelocity: 0.85 * intensityScale
      },
      bass: {
        play: bassSteps.includes(step),
        velocity: (isDownbeat ? 1.0 : 0.85) * intensityScale,
        duration: this.intensity <= 2 ? 0.65 : (isBreak ? 1.2 : 0.38)
      },
      keyboard: {
        play: kbSteps.includes(step),
        velocity: (isDownbeat ? 0.95 : 0.75) * intensityScale,
        duration: sectionData.keyboardMode === "piano" ? 0.9 : 2.0
      },
      guitar: {
        play: gtSteps.includes(step),
        velocity: (step % 2 === 0 ? 0.9 : 0.7) * intensityScale,
        direction: step % 2 === 0 ? "down" : "up",
        duration: isBreak ? 1.0 : 0.45
      }
    };
  }
}
