// =============================================================
// VIRTUO AFINADOR PRO — ENGINE DE SUAVIZAÇÃO MATEMÁTICA
// src/features/tuner/tuner-smoothing.js
//
// 1. Exponential Moving Average (EMA) com alpha = 0.18
// 2. Zona de Estabilidade (Dead Zone ±2 cents, High-Precision ±5 cents)
// 3. Inércia Visual com Easing (Máximo 180ms)
// 4. Separação Estrita: Frequência Real vs. Frequência Exibida
// 5. Confidence Score e Rejeição de Sinal Fraco
// 6. 60 FPS Render Loop via requestAnimationFrame
// =============================================================

export const TUNER_STATES = {
  IDLE: "idle",
  WAITING_SOUND: "waiting_sound",
  WEAK_SIGNAL: "weak_signal",
  OUT_OF_TUNE: "out_of_tune",
  NEAR_TUNE: "near_tune",
  IN_TUNE: "in_tune"
};

export class TunerSmoother {
  constructor(options = {}) {
    // Parâmetros de EMA
    this.alphaStandard = options.alpha !== undefined ? options.alpha : 0.18;
    this.alphaNear = 0.08;      // Para ±2 a ±5 cents (movimento ultra suave)
    this.alphaDeadZone = 0.03;  // Para ±2 cents (parada estável na zona morta)

    // Estado Exibido (Visual)
    this.displayedCents = 0;
    this.displayedFreq = 0;
    this.displayedAngle = 0;

    // Estado Alvo (Real recebido do DSP)
    this.targetCents = 0;
    this.targetFreq = 0;
    this.targetNote = null;
    this.targetOctave = null;
    this.targetConfidence = 0;

    // Inércia & Transição de Nota (Cap em 180ms)
    this.activeNote = null;
    this.activeOctave = null;
    this.noteTransitionStartTime = 0;
    this.maxTransitionDuration = 180; // ms
    this.isInTransition = false;

    // Temporal Stability & Confidence
    this.confidenceThreshold = options.confidenceThreshold || 0.70;
    this.lastConfidentTime = 0;
    this.silenceGracePeriodMs = 350; // Retém agulha suavemente antes de cair
    this.isWeakSignal = false;
    this.currentState = TUNER_STATES.IDLE;

    // Timestamp tracking
    this.lastFrameTime = performance.now();
  }

  reset() {
    this.displayedCents = 0;
    this.displayedFreq = 0;
    this.displayedAngle = 0;
    this.targetCents = 0;
    this.targetFreq = 0;
    this.targetNote = null;
    this.targetOctave = null;
    this.targetConfidence = 0;
    this.activeNote = null;
    this.activeOctave = null;
    this.isInTransition = false;
    this.isWeakSignal = false;
    this.currentState = TUNER_STATES.IDLE;
  }

  /**
   * Recebe nova leitura do DSP (detector de pitch).
   * Atualiza os alvos sem teletransportar a agulha.
   */
  feedPitch(pitch, timestamp = null) {
    const now = timestamp !== null ? timestamp : performance.now();

    if (!pitch || pitch.isSilence || pitch.frequency === 0) {
      if (now - this.lastConfidentTime > this.silenceGracePeriodMs) {
        this.currentState = TUNER_STATES.WAITING_SOUND;
      }
      return;
    }

    // Validação de Confidence Score
    const confidence = pitch.confidence !== undefined ? pitch.confidence : 0;
    const intensity = pitch.intensity !== undefined ? pitch.intensity : 1;

    if (confidence < this.confidenceThreshold || pitch.isWeakSignal || intensity < 0.05) {
      this.isWeakSignal = true;
      this.currentState = TUNER_STATES.WEAK_SIGNAL;
      return;
    }

    // Sinal válido e confiável
    this.isWeakSignal = false;
    this.lastConfidentTime = now;
    this.targetFreq = pitch.frequency;
    this.targetConfidence = confidence;

    // Cents limitados entre -50 e +50
    const rawCents = pitch.cents !== undefined ? pitch.cents : 0;
    this.targetCents = Math.max(-50, Math.min(50, rawCents));

    // Detecta mudança de nota para ativar inércia com easing (máx 180ms)
    const newNoteId = `${pitch.note}${pitch.octave !== null ? pitch.octave : ""}`;
    const currentNoteId = `${this.activeNote}${this.activeOctave !== null ? this.activeOctave : ""}`;

    if (newNoteId !== currentNoteId) {
      this.activeNote = pitch.note;
      this.activeOctave = pitch.octave;
      this.noteTransitionStartTime = now;
      this.isInTransition = true;
    }

    this.targetNote = pitch.note;
    this.targetOctave = pitch.octave;
  }

  /**
   * Passo de atualização matemática a 60 FPS (chamado no requestAnimationFrame).
   * @param {number} currentTime - performance.now()
   * @returns {Object} Estado visual suavizado para pintura
   */
  step(currentTime = performance.now()) {
    const dt = Math.min(64, Math.max(1, currentTime - this.lastFrameTime));
    this.lastFrameTime = currentTime;

    // Se estiver em silêncio prolongado, desacelera suavemente para o centro
    const timeSinceLastSound = currentTime - this.lastConfidentTime;
    if (this.lastConfidentTime > 0 && timeSinceLastSound > this.silenceGracePeriodMs) {
      this.targetCents = 0;
      this.currentState = TUNER_STATES.WAITING_SOUND;
    }

    // 1. Cálculo da Zona de Estabilidade (Dead Zone & Precision Zones)
    const absTarget = Math.abs(this.targetCents);
    let effectiveAlpha = this.alphaStandard;

    if (absTarget <= 2.0) {
      // Zona morta (±2 cents): estabilização quase estática no centro
      // Amortece expressivamente para eliminar qualquer trepidação nervosa
      effectiveAlpha = this.alphaDeadZone;

      // Se já estiver extremamente perto do alvo na zona morta, ancora precisamente
      if (Math.abs(this.displayedCents - this.targetCents) < 0.25) {
        this.displayedCents = this.targetCents;
      }
    } else if (absTarget <= 5.0) {
      // Zona de aproximação fina (±5 cents): movimento suave e desacelerado
      effectiveAlpha = this.alphaNear;
    } else {
      // Acima de ±5 cents: movimento padrão com resposta ágil
      effectiveAlpha = this.alphaStandard;
    }

    // 2. Inércia Visual com Easing (Transição de Nota limitada a 180ms)
    if (this.isInTransition) {
      const elapsed = currentTime - this.noteTransitionStartTime;
      const progress = Math.min(1.0, elapsed / this.maxTransitionDuration);

      // Função de easing cúbica suave: easeOutCubic = 1 - (1 - t)^3
      const easeFactor = 1 - Math.pow(1 - progress, 3);
      effectiveAlpha = effectiveAlpha * (0.4 + 0.6 * easeFactor);

      if (progress >= 1.0) {
        this.isInTransition = false;
      }
    }

    // 3. Aplicação do Exponential Moving Average (EMA)
    // Formula: y(t) = y(t-1) + alpha * (target - y(t-1))
    // Normalizado para escala de 60fps (~16.6ms) para garantir consistência entre taxas de refresh
    const fpsScale = dt / 16.666;
    const boundedAlpha = Math.max(0.01, Math.min(1.0, 1 - Math.pow(1 - effectiveAlpha, fpsScale)));

    this.displayedCents += boundedAlpha * (this.targetCents - this.displayedCents);

    // Suavização da Frequência Exibida
    if (this.targetFreq > 0) {
      if (this.displayedFreq === 0) {
        this.displayedFreq = this.targetFreq;
      } else {
        this.displayedFreq += boundedAlpha * (this.targetFreq - this.displayedFreq);
      }
    } else if (timeSinceLastSound > this.silenceGracePeriodMs + 400) {
      this.displayedFreq += boundedAlpha * (0 - this.displayedFreq);
    }

    // 4. Conversão para Ângulo da Agulha (-50 cents = -45deg, +50 cents = +45deg)
    const clampedDisplayedCents = Math.max(-50, Math.min(50, this.displayedCents));
    this.displayedAngle = (clampedDisplayedCents / 50) * 45;

    // 5. Determinação do Estado de Afinação (3 Estados Canônicos)
    const absDisplayed = Math.abs(this.displayedCents);

    if (this.currentState === TUNER_STATES.WEAK_SIGNAL) {
      // Mantém estado de sinal fraco
    } else if (this.currentState === TUNER_STATES.WAITING_SOUND || !this.targetNote) {
      // Aguardando som
    } else if (absDisplayed <= 2.5) {
      this.currentState = TUNER_STATES.IN_TUNE;
    } else if (absDisplayed <= 7.0) {
      this.currentState = TUNER_STATES.NEAR_TUNE;
    } else {
      this.currentState = TUNER_STATES.OUT_OF_TUNE;
    }

    return {
      displayedCents: parseFloat(this.displayedCents.toFixed(1)),
      displayedFreq: parseFloat(this.displayedFreq.toFixed(1)),
      displayedAngle: parseFloat(this.displayedAngle.toFixed(2)),
      note: this.targetNote,
      octave: this.targetOctave,
      state: this.currentState,
      isInTune: this.currentState === TUNER_STATES.IN_TUNE,
      isNearTune: this.currentState === TUNER_STATES.NEAR_TUNE,
      isWeakSignal: this.currentState === TUNER_STATES.WEAK_SIGNAL,
      confidence: this.targetConfidence
    };
  }
}
