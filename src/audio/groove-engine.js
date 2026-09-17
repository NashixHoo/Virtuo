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

  setPreset(preset) {
    if (BAND_STYLE_PATTERNS[preset]) {
      this.currentPreset = preset;
    }
  }

  setSection(section) {
    this.currentSection = section || "verse";
  }

  setIntensity(intensity) {
    const val = parseInt(intensity, 10);
    this.intensity = Math.max(0, Math.min(5, isNaN(val) ? 2 : val));
  }

  setEasyBand(enable) {
    this.isEasyBand = !!enable;
  }

  queueSectionTransition(nextSection) {
    this.nextQueuedSection = nextSection;
    this.isTransitioning = true;
  }

  clearQueuedTransition() {
    if (this.nextQueuedSection) {
      this.currentSection = this.nextQueuedSection;
      this.nextQueuedSection = null;
    }
    this.isTransitioning = false;
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
    let sectionData = (styleData.sections && styleData.sections[this.currentSection]) || styleData.sections?.verse || {};

    if (this.isEasyBand) {
      // Simplificação do Easy Band para ritmos retos e acessíveis
      sectionData = BAND_STYLE_PATTERNS["4/4 simples"]?.sections?.verse || sectionData;
    }

    const isTransitionBar = this.nextQueuedSection && step >= (totalSteps - 4);
    const fillData = styleData.sections?.fill || {};

    const kickSteps = isTransitionBar && fillData.kick ? fillData.kick : (sectionData.kick || []);
    const snareSteps = isTransitionBar && fillData.snare ? fillData.snare : (sectionData.snare || []);
    const hihatSteps = isTransitionBar && fillData.hihat ? fillData.hihat : (sectionData.hihat || []);
    const crashSteps = sectionData.crash || [];
    const tomSteps = isTransitionBar && fillData.toms ? fillData.toms : [];

    const bassSteps = sectionData.bass || [0, 4];
    const kbSteps = sectionData.keyboard || [0];
    const gtSteps = sectionData.guitar || [0, 2, 4, 6];

    // Cálculo de velocidade e acentos
    const intensityScale = this.getIntensityMultiplier();
    const isDownbeat = step === 0;
    const isBackbeat = step === 4 || (totalSteps === 6 && step === 3);

    return {
      drums: {
        playKick: kickSteps.includes(step),
        kickVelocity: isDownbeat ? 1.0 * intensityScale : 0.85 * intensityScale,

        playSnare: snareSteps.includes(step),
        snareVelocity: (isBackbeat ? 1.0 : 0.7) * intensityScale,
        snareIsGhost: !isBackbeat && (step % 2 !== 0),

        playHihat: hihatSteps.includes(step),
        hihatVelocity: (step % 2 === 0 ? 0.75 : 0.5) * intensityScale,
        hihatIsOpen: this.intensity >= 4 && (step % 2 !== 0),

        playCrash: crashSteps.includes(step) && this.intensity >= 3,
        crashVelocity: 0.9 * intensityScale,

        playTom: tomSteps.includes(step),
        tomPitch: step % 2 === 0 ? "mid" : "low",
        tomVelocity: 0.85 * intensityScale
      },
      bass: {
        play: bassSteps.includes(step),
        velocity: (isDownbeat ? 1.0 : 0.85) * intensityScale,
        duration: this.intensity <= 2 ? 0.65 : 0.38
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
        duration: 0.45
      }
    };
  }
}
