// =============================================================
// VIRTUO VOCAL TRAINER (NOTE & INTERVAL COACH)
// src/features/vocal/vocal-trainer.js
// Structured pitch training: Note Target Lock & Interval Ear Training
// 100% Deterministic & Local - Zero AI dependencies
// =============================================================

import { virtuoVoiceDetector, VOCAL_INTERVALS, NOTE_NAMES } from "../../audio/voice-detector.js";

export const VOCAL_TRAINING_LEVELS = [
  { id: "beginner", name: "Iniciante", notes: ["C4", "D4", "E4", "G4", "A4"] },
  { id: "intermediate", name: "Intermediário", notes: ["G3", "A3", "B3", "C4", "D4", "E4", "F#4", "G4"] },
  { id: "advanced", name: "Avançado", notes: ["E3", "F3", "Ab3", "Bb3", "C4", "Eb4", "F4", "Ab4", "Bb4", "C5"] }
];

export class VocalTrainer {
  constructor() {
    this.mode = "notes"; // "notes" | "intervals"
    
    // Note Training State
    this.targetNote = "A";
    this.targetOctave = 4;
    this.targetFreq = 440;
    this.toleranceCents = 25;
    this.requiredHoldTimeMs = 1000; // 1 segundo sustentado
    
    this.lockStartTime = null;
    this.firstVocalTime = null;
    this.sustainedDurationMs = 0;
    this.isNoteLocked = false;
    this.noteScore = 0;
    this.lastFeedback = "Aguardando canto...";

    // Interval Training State
    this.baseNote = "C";
    this.baseOctave = 4;
    this.selectedInterval = "major_third"; // Terça Maior (E4)
    this.intervalTarget = null;
    this.intervalScore = 0;
    this.intervalFeedback = "Ouça o tom base e cante o intervalo";

    this._updateIntervalTarget();

    // Session Statistics
    this.history = [];
  }

  setTargetNote(noteName, octave = 4) {
    this.targetNote = noteName;
    this.targetOctave = octave;
    this.targetFreq = virtuoVoiceDetector.noteToFrequency(noteName, octave);
    this.resetTrial();
  }

  setInterval(baseNote, baseOctave, intervalKey) {
    this.baseNote = baseNote;
    this.baseOctave = baseOctave;
    this.selectedInterval = intervalKey;
    this._updateIntervalTarget();
    this.resetTrial();
  }

  _updateIntervalTarget() {
    this.intervalTarget = virtuoVoiceDetector.getIntervalTarget(
      this.baseNote,
      this.baseOctave,
      this.selectedInterval
    );
  }

  resetTrial() {
    this.lockStartTime = null;
    this.firstVocalTime = null;
    this.sustainedDurationMs = 0;
    this.isNoteLocked = false;
    this.noteScore = 0;
    this.lastFeedback = "Aguardando canto...";
    this.intervalFeedback = "Aguardando canto...";
  }

  // =============================================================
  // PROCESSAMENTO EM TEMPO REAL: TREINO DE NOTAS
  // =============================================================
  processNoteFrame(pitch) {
    if (!pitch || pitch.isSilence || !pitch.note || pitch.confidence < 0.65) {
      if (this.isNoteLocked) {
        this.lockStartTime = null;
        this.isNoteLocked = false;
      }
      return {
        isLocked: false,
        sustainedMs: this.sustainedDurationMs,
        feedback: "Aguardando canto...",
        score: 0
      };
    }

    const now = performance.now();
    if (!this.firstVocalTime) {
      this.firstVocalTime = now;
    }

    // Calcula distância em cents até a nota exata alvo
    const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, this.targetFreq);
    const absError = Math.abs(centsError);

    const isWithinTolerance = absError <= this.toleranceCents;

    if (isWithinTolerance) {
      if (!this.lockStartTime) {
        this.lockStartTime = now;
      }
      this.sustainedDurationMs = now - this.lockStartTime;

      if (this.sustainedDurationMs >= this.requiredHoldTimeMs) {
        this.isNoteLocked = true;
        const timeToLockSec = Math.max(0.2, (now - this.firstVocalTime) / 1000);
        
        // Pontuação determinística (0-100)
        // - Precisão de afinação (cents)
        // - Tempo de resposta para travar a nota
        // - Estabilidade
        const pitchQuality = Math.max(0, 100 - (absError * 2));
        const speedBonus = Math.max(0, 30 - (timeToLockSec * 10));
        const finalScore = Math.min(100, Math.round((pitchQuality * 0.7) + speedBonus));

        this.noteScore = finalScore;
        this.lastFeedback = `Afinado! ${pitch.note}${pitch.octave} sustentado com precisão (${finalScore} pts)`;

        return {
          isLocked: true,
          isCompleted: true,
          sustainedMs: this.sustainedDurationMs,
          centsError,
          timeToLockSec: parseFloat(timeToLockSec.toFixed(1)),
          feedback: this.lastFeedback,
          score: finalScore
        };
      } else {
        const percentHeld = Math.min(100, Math.round((this.sustainedDurationMs / this.requiredHoldTimeMs) * 100));
        this.lastFeedback = `No tom! Sustente mais um pouco (${percentHeld}%)...`;
        return {
          isLocked: true,
          isCompleted: false,
          sustainedMs: this.sustainedDurationMs,
          centsError,
          feedback: this.lastFeedback,
          score: 0
        };
      }
    } else {
      // Fora de afinação
      this.lockStartTime = null;
      this.sustainedDurationMs = 0;

      if (centsError < -this.toleranceCents) {
        this.lastFeedback = `Suba (${Math.abs(centsError)} cents abaixo)`;
      } else {
        this.lastFeedback = `Desça (${centsError} cents acima)`;
      }

      return {
        isLocked: false,
        isCompleted: false,
        sustainedMs: 0,
        centsError,
        feedback: this.lastFeedback,
        score: 0
      };
    }
  }

  // =============================================================
  // PROCESSAMENTO EM TEMPO REAL: TREINO DE INTERVALOS
  // =============================================================
  processIntervalFrame(pitch) {
    if (!pitch || pitch.isSilence || !pitch.note || pitch.confidence < 0.65) {
      return {
        isCorrect: false,
        feedback: "Cante a nota correspondente ao intervalo...",
        centsError: 0,
        score: 0
      };
    }

    const targetFreq = this.intervalTarget.targetFreq;
    const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, targetFreq);
    const absError = Math.abs(centsError);

    const isMatch = absError <= this.toleranceCents;
    const semitonesDetected = Math.round(12 * Math.log2(pitch.frequency / this.intervalTarget.baseFreq));

    if (isMatch) {
      const score = Math.max(50, Math.min(100, Math.round(100 - (absError * 1.5))));
      this.intervalFeedback = `Correto! ${this.intervalTarget.intervalName} (${this.intervalTarget.targetNote}${this.intervalTarget.targetOctave}) atingida!`;
      return {
        isCorrect: true,
        feedback: this.intervalFeedback,
        centsError,
        semitonesDetected,
        expectedSemitones: this.intervalTarget.semitones,
        score
      };
    } else {
      const diffSemitones = semitonesDetected - this.intervalTarget.semitones;
      let hint = "";
      if (diffSemitones === 0) {
        hint = centsError < 0 ? "Quase lá: suba levemente a afinação" : "Quase lá: desça levemente a afinação";
      } else if (diffSemitones < 0) {
        hint = `Muito baixo (${Math.abs(diffSemitones)} semitons abaixo do intervalo)`;
      } else {
        hint = `Muito alto (${diffSemitones} semitons acima do intervalo)`;
      }

      this.intervalFeedback = hint;
      return {
        isCorrect: false,
        feedback: hint,
        centsError,
        semitonesDetected,
        expectedSemitones: this.intervalTarget.semitones,
        score: 0
      };
    }
  }

  playBaseReference() {
    return virtuoVoiceDetector.playReferenceTone(this.intervalTarget.baseFreq, 1400);
  }

  playTargetReference() {
    return virtuoVoiceDetector.playReferenceTone(this.intervalTarget.targetFreq, 1400);
  }

  playNoteReference() {
    return virtuoVoiceDetector.playReferenceTone(this.targetFreq, 1400);
  }
}

export const vocalTrainer = new VocalTrainer();
if (typeof window !== "undefined") {
  window.vocalTrainer = vocalTrainer;
}
