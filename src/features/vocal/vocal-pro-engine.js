// =============================================================
// VIRTUO VOCAL PRO ENGINE 2.1
// src/features/vocal/vocal-pro-engine.js
// Assistente Vocal Profissional 100% Local (Web Audio API)
// 1. VocalSmoother: Exponential Moving Average (EMA) e Desaceleração Natural
// 2. VocalStabilityDetector: Estabilidade temporal (Excelente / Boa / Instável)
// 3. VocalBreathDetector: Detector de Respiração e Sustentação
// 4. VocalWarmupEngine: Aquecimento Guiado de 3 minutos por Síntese
// 5. VocalExerciseEngine: Exercícios Guiados (Sustentar, Repetir, Subir/Descer 1/2 tom)
// 6. VocalSilentFeedback: Mensagens Silenciosas Discretas (Sem Popups)
// =============================================================

import { virtuoVoiceDetector, NOTE_NAMES } from "../../audio/voice-detector.js";

// -------------------------------------------------------------
// 1. VOCAL SMOOTHER (EXPONENTIAL MOVING AVERAGE & NATURAL DECAY)
// -------------------------------------------------------------
export class VocalSmoother {
  constructor(options = {}) {
    // Fator de suavização EMA (0 < alpha <= 1)
    // Valores menores = mais calmo e estável. 0.14 oferece excelente resposta com zero tremor
    this.alphaCents = options.alphaCents || 0.14;
    this.alphaFreq = options.alphaFreq || 0.18;
    this.alphaIntensity = options.alphaIntensity || 0.15;
    this.decayRate = options.decayRate || 0.92; // Desaceleração natural quando em silêncio

    this.smoothFrequency = 0;
    this.smoothCents = 0;
    this.smoothIntensity = 0;
    this.smoothMeterPct = 50; // 50% = centro exato (0 cents)
    this.lastActiveTime = 0;
    this.isResting = true;
  }

  /**
   * Atualiza a suavização com a nova detecção bruta.
   * Executado a cada frame do analisador ou no ciclo rAF (60 FPS).
   */
  update(rawPitch) {
    if (!rawPitch || rawPitch.isSilence || !rawPitch.note || rawPitch.confidence < 0.60) {
      // Desaceleração natural quando em silêncio (Calma visual, sem cortes bruscos)
      this.smoothIntensity *= this.decayRate;
      if (this.smoothIntensity < 0.04) {
        this.smoothIntensity = 0;
      }

      // Agulha e cents retornam suavemente em direção ao centro de repouso (50% / 0 cents)
      this.smoothCents *= this.decayRate;
      if (this.smoothIntensity === 0 || Math.abs(this.smoothCents) < 0.8) {
        this.smoothCents = 0;
      }

      const targetMeterPct = 50 + this.smoothCents;
      this.smoothMeterPct = this.smoothMeterPct * 0.82 + targetMeterPct * 0.18;
      if (this.smoothCents === 0 || Math.abs(this.smoothMeterPct - 50) < 0.5) {
        this.smoothMeterPct = 50;
      }

      this.isResting = true;
      return {
        smoothFrequency: parseFloat(this.smoothFrequency.toFixed(1)),
        smoothCents: Math.round(this.smoothCents),
        smoothIntensity: parseFloat(this.smoothIntensity.toFixed(2)),
        smoothMeterPct: parseFloat(this.smoothMeterPct.toFixed(1)),
        isResting: true
      };
    }

    this.isResting = false;
    this.lastActiveTime = performance.now();

    // 1. Suavização EMA da frequência
    if (this.smoothFrequency === 0) {
      this.smoothFrequency = rawPitch.frequency;
    } else {
      this.smoothFrequency = this.smoothFrequency * (1 - this.alphaFreq) + rawPitch.frequency * this.alphaFreq;
    }

    // 2. Suavização EMA dos Cents (Zona morta adaptativa para evitar jitter micro-oscilatório)
    const targetCents = rawPitch.cents;
    const centsDelta = targetCents - this.smoothCents;

    // Se estiver na zona de altíssima afinação (±3 cents), suaviza ainda mais para transmitir calma
    const effectiveAlpha = Math.abs(centsDelta) < 4 ? (this.alphaCents * 0.6) : this.alphaCents;
    this.smoothCents = this.smoothCents + centsDelta * effectiveAlpha;

    // 3. Suavização da Intensidade / Volume
    const targetIntensity = rawPitch.intensity || 0.5;
    this.smoothIntensity = this.smoothIntensity * (1 - this.alphaIntensity) + targetIntensity * this.alphaIntensity;

    // 4. Medidor Centralizado (0 cents = 50%, -50 cents = 0%, +50 cents = 100%)
    const clampedCents = Math.max(-50, Math.min(50, this.smoothCents));
    const targetMeter = 50 + clampedCents;
    this.smoothMeterPct = this.smoothMeterPct * (1 - this.alphaCents) + targetMeter * this.alphaCents;

    return {
      smoothFrequency: parseFloat(this.smoothFrequency.toFixed(1)),
      smoothCents: Math.round(this.smoothCents),
      smoothIntensity: parseFloat(this.smoothIntensity.toFixed(2)),
      smoothMeterPct: parseFloat(this.smoothMeterPct.toFixed(1)),
      isResting: false
    };
  }

  reset() {
    this.smoothFrequency = 0;
    this.smoothCents = 0;
    this.smoothIntensity = 0;
    this.smoothMeterPct = 50;
    this.isResting = true;
  }
}

// -------------------------------------------------------------
// 2. VOCAL STABILITY DETECTOR (INDICADOR DE ESTABILIDADE CIRCULAR)
// -------------------------------------------------------------
export class VocalStabilityDetector {
  constructor(windowSize = 20) {
    this.windowSize = windowSize; // Histórico de ~350-400ms de voz ativa
    this.buffer = []; // Pre-allocated ring buffer
    this.lastScore = 0;
    this.lastState = "Instável";
    this.lastJitterCents = 0;
  }

  /**
   * Processa uma nova amostra vocal para determinar a estabilidade instantânea
   * Baseado em:
   * 1. Constância da nota (se mantém a mesma nota fundamental)
   * 2. Tremulação / Flutter (desvio padrão temporal da frequência em cents)
   * 3. Controle (ausência de saltos erráticos)
   */
  process(pitch) {
    if (!pitch || pitch.isSilence || !pitch.note || pitch.confidence < 0.60) {
      // Se não estiver cantando, esvazia gradualmente a janela
      if (this.buffer.length > 0) {
        this.buffer.shift();
      }
      return {
        score: this.lastScore > 0 ? Math.max(0, Math.round(this.lastScore * 0.85)) : 0,
        state: this.buffer.length === 0 ? "Aguardando" : this.lastState,
        jitterCents: this.lastJitterCents,
        constancy: 0,
        isSinging: false
      };
    }

    // Registra amostra na janela móvel
    this.buffer.push({
      note: pitch.note,
      octave: pitch.octave,
      cents: pitch.cents,
      frequency: pitch.frequency,
      time: performance.now()
    });

    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    // Janela mínima para cálculo de estabilidade consistente (>= 5 amostras)
    if (this.buffer.length < 5) {
      return {
        score: 65,
        state: "Boa",
        jitterCents: 0,
        constancy: 100,
        isSinging: true
      };
    }

    // 1. Constância da Nota: verifica se a nota alvo se repete
    const notesCount = {};
    for (let i = 0; i < this.buffer.length; i++) {
      const key = `${this.buffer[i].note}${this.buffer[i].octave}`;
      notesCount[key] = (notesCount[key] || 0) + 1;
    }
    let maxNoteHits = 0;
    for (const key in notesCount) {
      if (notesCount[key] > maxNoteHits) maxNoteHits = notesCount[key];
    }
    const constancyRatio = maxNoteHits / this.buffer.length; // 0.0 .. 1.0

    // 2. Tremulação (Jitter temporal de Cents)
    let sumCents = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sumCents += this.buffer[i].cents;
    }
    const meanCents = sumCents / this.buffer.length;

    let variance = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      variance += Math.pow(this.buffer[i].cents - meanCents, 2);
    }
    const stdDevCents = Math.sqrt(variance / this.buffer.length);
    this.lastJitterCents = parseFloat(stdDevCents.toFixed(1));

    // 3. Cálculo de Pontuação (0 a 100)
    // Constância vale até 60 pontos
    // Baixo jitter (< 5 cents de desvio padrão) vale até 40 pontos
    const constancyScore = constancyRatio * 60;
    const jitterPenalty = Math.min(40, stdDevCents * 2.5);
    const controlScore = Math.max(0, 40 - jitterPenalty);

    const totalScore = Math.max(0, Math.min(100, Math.round(constancyScore + controlScore)));
    this.lastScore = totalScore;

    // Estados exigidos pela especificação: "Excelente", "Boa", "Instável"
    let state = "Instável";
    if (totalScore >= 80 && stdDevCents <= 7 && constancyRatio >= 0.85) {
      state = "Excelente";
    } else if (totalScore >= 55 && stdDevCents <= 15 && constancyRatio >= 0.65) {
      state = "Boa";
    } else {
      state = "Instável";
    }
    this.lastState = state;

    return {
      score: totalScore,
      state,
      jitterCents: this.lastJitterCents,
      constancy: Math.round(constancyRatio * 100),
      isSinging: true
    };
  }

  reset() {
    this.buffer = [];
    this.lastScore = 0;
    this.lastState = "Instável";
    this.lastJitterCents = 0;
  }
}

// -------------------------------------------------------------
// 3. VOCAL BREATH DETECTOR (DETECTOR DE RESPIRAÇÃO E SUSTENTAÇÃO)
// -------------------------------------------------------------
export class VocalBreathDetector {
  constructor() {
    this.isPhonating = false;
    this.phonationStartTime = null;
    this.currentSustainDurationMs = 0;
    this.pauseStartTime = null;
    this.lastFeedback = null;
    this.feedbackTimestamp = 0;
    this.feedbackExpiryMs = 3500; // Mensagem discreta permanece por 3.5 segundos
  }

  process(pitch) {
    const now = performance.now();
    const isVoicing = Boolean(pitch && !pitch.isSilence && pitch.note && pitch.confidence >= 0.60);

    if (isVoicing) {
      if (!this.isPhonating) {
        // Início da fonação
        this.isPhonating = true;
        this.phonationStartTime = now;
        this.currentSustainDurationMs = 0;

        // Se veio de uma pausa anterior, valida se a pausa foi uma boa respiração
        if (this.pauseStartTime) {
          const pauseDuration = now - this.pauseStartTime;
          // Pausa natural de inspiração musical (entre 300ms e 2200ms)
          if (pauseDuration >= 350 && pauseDuration <= 2200) {
            this.setFeedback("Respiração boa.", "success");
          }
        }
        this.pauseStartTime = null;
      } else {
        // Voz sustentada contínua
        this.currentSustainDurationMs = now - this.phonationStartTime;
      }
    } else {
      if (this.isPhonating) {
        // Parou de cantar agora
        const finalSustainDuration = now - this.phonationStartTime;
        this.isPhonating = false;
        this.pauseStartTime = now;

        // Análise pedagógica de duração de sustentação:
        // Se a emissão foi excessivamente curta (entre 150ms e 850ms) e o cantor cessou bruscamente:
        if (finalSustainDuration >= 150 && finalSustainDuration < 900) {
          this.setFeedback("Tente sustentar um pouco mais.", "hint");
        } else if (finalSustainDuration >= 2800) {
          this.setFeedback("Boa sustentação.", "success");
        }
        this.currentSustainDurationMs = 0;
      }
    }

    // Limpa feedback expirado após 3.5 segundos
    if (this.lastFeedback && (now - this.feedbackTimestamp > this.feedbackExpiryMs)) {
      this.lastFeedback = null;
    }

    return {
      isPhonating: this.isPhonating,
      sustainDurationMs: this.currentSustainDurationMs,
      feedback: this.lastFeedback
    };
  }

  setFeedback(text, type = "info") {
    this.lastFeedback = { text, type, time: performance.now() };
    this.feedbackTimestamp = performance.now();
  }

  reset() {
    this.isPhonating = false;
    this.phonationStartTime = null;
    this.currentSustainDurationMs = 0;
    this.pauseStartTime = null;
    this.lastFeedback = null;
  }
}

// -------------------------------------------------------------
// 4. VOCAL WARMUP ENGINE (AQUECIMENTO GUIADO DE 3 MINUTOS)
// -------------------------------------------------------------
export const WARMUP_PHASES = [
  {
    id: "graves",
    name: "Graves Relaxados",
    instruction: "Solte a mandíbula e faça vibração labial (Brrr) ou som de zumbido (Hummm) relaxando o peito.",
    notes: ["C3", "E3", "G3", "C3"],
    freqs: [130.81, 164.81, 196.00, 130.81],
    durationSeconds: 45
  },
  {
    id: "medios",
    name: "Médios & Ressonância",
    instruction: "Articule vogais abertas com facilidade ('Mê - Mô - Má') projetando o som para a máscara.",
    notes: ["F3", "A3", "C4", "F3"],
    freqs: [174.61, 220.00, 261.63, 174.61],
    durationSeconds: 45
  },
  {
    id: "agudos",
    name: "Agudos & Cabeça",
    instruction: "Conecte a voz de cabeça sem forçar a garganta com arpejo suave ('Nheee' ou 'Uuu').",
    notes: ["C4", "E4", "G4", "C5"],
    freqs: [261.63, 329.63, 392.00, 523.25],
    durationSeconds: 45
  },
  {
    id: "sustentacao",
    name: "Sustentação & Apoio",
    instruction: "Inspire fundo pelo diafragma e sustente notas firmes com fluxo de ar constante.",
    notes: ["G3", "C4", "G3"],
    freqs: [196.00, 261.63, 196.00],
    durationSeconds: 45
  }
];

export class VocalWarmupEngine {
  constructor() {
    this.totalDurationSeconds = 180; // 3 minutos exatos
    this.currentPhaseIndex = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedSeconds = 0;
    this.phaseElapsedSeconds = 0;
    this.timerId = null;

    this.audioCtx = null;
    this.activeOsc = null;
    this.activeGain = null;
    this.activeFilter = null;

    this.onTick = null;
    this.onPhaseChange = null;
    this.onComplete = null;
  }

  getCurrentPhase() {
    return WARMUP_PHASES[this.currentPhaseIndex] || WARMUP_PHASES[0];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;

    this._playGuideArpeggio(this.getCurrentPhase());
    this._startTimer();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this._stopTimer();
    this._stopSynth();
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this._startTimer();
    this._playGuideArpeggio(this.getCurrentPhase());
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedSeconds = 0;
    this.phaseElapsedSeconds = 0;
    this.currentPhaseIndex = 0;
    this._stopTimer();
    this._stopSynth();
    if (this.onTick) this.onTick(this.getState());
  }

  nextPhase() {
    if (this.currentPhaseIndex < WARMUP_PHASES.length - 1) {
      this.currentPhaseIndex++;
      this.phaseElapsedSeconds = 0;
      this._playGuideArpeggio(this.getCurrentPhase());
      if (this.onPhaseChange) this.onPhaseChange(this.getCurrentPhase());
    } else {
      this._finish();
    }
  }

  _startTimer() {
    this._stopTimer();
    this.timerId = setInterval(() => {
      this.elapsedSeconds++;
      this.phaseElapsedSeconds++;

      const currentPhase = this.getCurrentPhase();
      if (this.phaseElapsedSeconds >= currentPhase.durationSeconds) {
        this.nextPhase();
      }

      if (this.elapsedSeconds >= this.totalDurationSeconds) {
        this._finish();
        return;
      }

      if (this.onTick) {
        this.onTick(this.getState());
      }
    }, 1000);
  }

  _stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _finish() {
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedSeconds = this.totalDurationSeconds;
    this._stopTimer();
    this._stopSynth();
    if (this.onComplete) this.onComplete();
    if (this.onTick) this.onTick(this.getState());
  }

  getState() {
    const phase = this.getCurrentPhase();
    const remainingSeconds = Math.max(0, this.totalDurationSeconds - this.elapsedSeconds);
    const progressPct = Math.min(100, Math.round((this.elapsedSeconds / this.totalDurationSeconds) * 100));
    const phaseProgressPct = Math.min(100, Math.round((this.phaseElapsedSeconds / phase.durationSeconds) * 100));

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentPhase: phase,
      phaseIndex: this.currentPhaseIndex,
      totalPhases: WARMUP_PHASES.length,
      elapsedSeconds: this.elapsedSeconds,
      remainingSeconds,
      progressPct,
      phaseElapsedSeconds: this.phaseElapsedSeconds,
      phaseProgressPct
    };
  }

  // Síntese acústica relaxante de apoio para o aquecimento (Sem arquivos externos)
  _playGuideArpeggio(phase) {
    try {
      this._stopSynth();
      const AudioContextClass = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const freqs = phase.freqs;
      let startTime = this.audioCtx.currentTime + 0.05;

      freqs.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.70);

        startTime += 0.55;
      });
    } catch (e) {
      console.warn("[VocalWarmup] Síntese não disponível:", e);
    }
  }

  _stopSynth() {
    if (this.activeOsc) {
      try { this.activeOsc.stop(); this.activeOsc.disconnect(); } catch {}
      this.activeOsc = null;
    }
  }
}

// -------------------------------------------------------------
// 5. VOCAL EXERCISE ENGINE (EXERCÍCIOS GUIADOS)
// -------------------------------------------------------------
export const VOCAL_EXERCISES = [
  {
    id: "sustain",
    title: "Sustentar Nota",
    description: "Mantenha a nota alvo estável por 3 segundos seguidos dentro da afinação.",
    targetNote: "A3",
    targetFreq: 220.0,
    requiredDurationMs: 3000,
    toleranceCents: 20
  },
  {
    id: "repeat",
    title: "Repetir Nota",
    description: "Cante e solte a mesma nota 3 vezes consecutivas com precisão de ataque.",
    targetNote: "C4",
    targetFreq: 261.63,
    targetReps: 3,
    toleranceCents: 22
  },
  {
    id: "step_up",
    title: "Subir Meio Tom",
    description: "Cante a nota base (C4), sustente, e em seguida suba suavemente meio tom para C#4.",
    baseNote: "C4",
    baseFreq: 261.63,
    stepNote: "C#4",
    stepFreq: 277.18,
    toleranceCents: 25
  },
  {
    id: "step_down",
    title: "Descer Meio Tom",
    description: "Cante a nota base (C4), sustente, e em seguida desça suavemente meio tom para B3.",
    baseNote: "C4",
    baseFreq: 261.63,
    stepNote: "B3",
    stepFreq: 246.94,
    toleranceCents: 25
  }
];

export class VocalExerciseEngine {
  constructor() {
    this.currentExerciseId = "sustain";
    this.step = 0; // Passo interno do exercício
    this.holdStartTime = null;
    this.holdDurationMs = 0;
    this.repetitionsDone = 0;
    this.score = 0;
    this.feedback = "Inicie cantando a nota indicada.";
    this.isCompleted = false;
    this.lastVoicingTime = 0;
    this.isBetweenReps = false;
  }

  getExercise() {
    return VOCAL_EXERCISES.find(e => e.id === this.currentExerciseId) || VOCAL_EXERCISES[0];
  }

  setExercise(exerciseId) {
    this.currentExerciseId = exerciseId;
    this.reset();
  }

  reset() {
    this.step = 0;
    this.holdStartTime = null;
    this.holdDurationMs = 0;
    this.repetitionsDone = 0;
    this.score = 0;
    this.isCompleted = false;
    this.feedback = "Aguardando canto...";
    this.lastVoicingTime = 0;
    this.isBetweenReps = false;
  }

  processFrame(pitch) {
    if (this.isCompleted) {
      return {
        isCompleted: true,
        progressPct: 100,
        feedback: "Exercício concluído com sucesso!",
        score: this.score
      };
    }

    const ex = this.getExercise();
    const now = performance.now();
    const isVoicing = Boolean(pitch && !pitch.isSilence && pitch.note && pitch.confidence >= 0.60);

    // 1. EXERCÍCIO: SUSTENTAR NOTA
    if (ex.id === "sustain") {
      if (!isVoicing) {
        this.holdStartTime = null;
        this.holdDurationMs = 0;
        this.feedback = `Cante ${ex.targetNote} (${ex.targetFreq} Hz) e sustente.`;
        return { isCompleted: false, progressPct: 0, feedback: this.feedback, score: 0 };
      }

      const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.targetFreq);
      const isAfinado = Math.abs(centsError) <= ex.toleranceCents;

      if (isAfinado) {
        if (!this.holdStartTime) this.holdStartTime = now;
        this.holdDurationMs = now - this.holdStartTime;

        const progressPct = Math.min(100, Math.round((this.holdDurationMs / ex.requiredDurationMs) * 100));

        if (this.holdDurationMs >= ex.requiredDurationMs) {
          this.isCompleted = true;
          this.score = Math.max(70, Math.min(100, Math.round(100 - Math.abs(centsError))));
          this.feedback = "Excelente estabilidade! Nota sustentada com perfeição.";
          return { isCompleted: true, progressPct: 100, feedback: this.feedback, score: this.score };
        } else {
          this.feedback = `No tom! Continue sustentando (${progressPct}%)...`;
          return { isCompleted: false, progressPct, feedback: this.feedback, score: 0 };
        }
      } else {
        this.holdStartTime = null;
        this.holdDurationMs = 0;
        const hint = centsError < 0 ? "Quase afinado: suba um pouco" : "Quase afinado: desça um pouco";
        this.feedback = hint;
        return { isCompleted: false, progressPct: 0, feedback: this.feedback, score: 0 };
      }
    }

    // 2. EXERCÍCIO: REPETIR NOTA (STACCATO / ATAQUE)
    if (ex.id === "repeat") {
      if (!isVoicing) {
        if (!this.isBetweenReps && this.holdDurationMs >= 200) {
          this.isBetweenReps = true;
        }
        return {
          isCompleted: false,
          progressPct: Math.round((this.repetitionsDone / ex.targetReps) * 100),
          feedback: `Repetições: ${this.repetitionsDone} de ${ex.targetReps}`,
          score: 0
        };
      }

      const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.targetFreq);
      const isAfinado = Math.abs(centsError) <= ex.toleranceCents;

      if (isAfinado) {
        if (this.isBetweenReps || this.repetitionsDone === 0) {
          if (!this.holdStartTime) this.holdStartTime = now;
          this.holdDurationMs = now - this.holdStartTime;

          // Se cantou por pelo menos 250ms com boa afinação, contabiliza uma repetição
          if (this.holdDurationMs >= 250) {
            this.repetitionsDone++;
            this.isBetweenReps = false;
            this.holdStartTime = null;
            this.holdDurationMs = 0;

            if (this.repetitionsDone >= ex.targetReps) {
              this.isCompleted = true;
              this.score = 95;
              this.feedback = "Parabéns! Todas as repetições executadas com precisão.";
              return { isCompleted: true, progressPct: 100, feedback: this.feedback, score: 95 };
            } else {
              this.feedback = `Boa! Repetição ${this.repetitionsDone}/${ex.targetReps}. Pause e repita.`;
            }
          }
        }
      } else {
        this.feedback = centsError < 0 ? "Suba levemente para a nota alvo." : "Desça levemente para a nota alvo.";
      }

      return {
        isCompleted: false,
        progressPct: Math.round((this.repetitionsDone / ex.targetReps) * 100),
        feedback: this.feedback,
        score: 0
      };
    }

    // 3. EXERCÍCIO: SUBIR MEIO TOM
    if (ex.id === "step_up") {
      if (!isVoicing) {
        return { isCompleted: false, progressPct: this.step === 1 ? 50 : 0, feedback: this.feedback, score: 0 };
      }

      if (this.step === 0) {
        // Alvo: Nota Base (C4)
        const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.baseFreq);
        if (Math.abs(centsError) <= ex.toleranceCents) {
          if (!this.holdStartTime) this.holdStartTime = now;
          if (now - this.holdStartTime >= 800) {
            this.step = 1;
            this.holdStartTime = null;
            this.feedback = `Base C4 firmada! Agora suba meio tom para ${ex.stepNote}.`;
          } else {
            this.feedback = "Segure a nota base C4...";
          }
        }
        return { isCompleted: false, progressPct: 35, feedback: this.feedback, score: 0 };
      } else if (this.step === 1) {
        // Alvo: Subir Meio Tom (C#4)
        const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.stepFreq);
        if (Math.abs(centsError) <= ex.toleranceCents) {
          if (!this.holdStartTime) this.holdStartTime = now;
          if (now - this.holdStartTime >= 800) {
            this.isCompleted = true;
            this.score = 96;
            this.feedback = "Sensacional! Transição de semitom executada com clareza.";
            return { isCompleted: true, progressPct: 100, feedback: this.feedback, score: 96 };
          } else {
            this.feedback = `Sustente o semitom acima (${ex.stepNote})...`;
          }
        } else {
          this.feedback = centsError < 0 ? `Suba mais para atingir ${ex.stepNote}` : "Muito alto, ajuste a afinação";
        }
        return { isCompleted: false, progressPct: 75, feedback: this.feedback, score: 0 };
      }
    }

    // 4. EXERCÍCIO: DESCER MEIO TOM
    if (ex.id === "step_down") {
      if (!isVoicing) {
        return { isCompleted: false, progressPct: this.step === 1 ? 50 : 0, feedback: this.feedback, score: 0 };
      }

      if (this.step === 0) {
        // Alvo: Nota Base (C4)
        const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.baseFreq);
        if (Math.abs(centsError) <= ex.toleranceCents) {
          if (!this.holdStartTime) this.holdStartTime = now;
          if (now - this.holdStartTime >= 800) {
            this.step = 1;
            this.holdStartTime = null;
            this.feedback = `Base C4 firmada! Agora desça meio tom para ${ex.stepNote}.`;
          } else {
            this.feedback = "Segure a nota base C4...";
          }
        }
        return { isCompleted: false, progressPct: 35, feedback: this.feedback, score: 0 };
      } else if (this.step === 1) {
        // Alvo: Descer Meio Tom (B3)
        const centsError = virtuoVoiceDetector.calculateCents(pitch.frequency, ex.stepFreq);
        if (Math.abs(centsError) <= ex.toleranceCents) {
          if (!this.holdStartTime) this.holdStartTime = now;
          if (now - this.holdStartTime >= 800) {
            this.isCompleted = true;
            this.score = 96;
            this.feedback = "Perfeito! Descida de semitom afinada e controlada.";
            return { isCompleted: true, progressPct: 100, feedback: this.feedback, score: 96 };
          } else {
            this.feedback = `Sustente o semitom abaixo (${ex.stepNote})...`;
          }
        } else {
          this.feedback = centsError < 0 ? "Muito baixo, ajuste" : `Desça um pouco mais para ${ex.stepNote}`;
        }
        return { isCompleted: false, progressPct: 75, feedback: this.feedback, score: 0 };
      }
    }

    return { isCompleted: false, progressPct: 0, feedback: this.feedback, score: 0 };
  }

  playTargetAudio() {
    const ex = this.getExercise();
    const freq = ex.targetFreq || ex.baseFreq;
    if (freq && virtuoVoiceDetector.playReferenceTone) {
      virtuoVoiceDetector.playReferenceTone(freq, 1400);
    }
  }
}

// -------------------------------------------------------------
// 6. VOCAL SILENT FEEDBACK (MENSAGENS DISCRETAS SEM POPUPS)
// -------------------------------------------------------------
export class VocalSilentFeedback {
  constructor() {
    this.currentMessage = "Aguardando canto...";
    this.currentCategory = "neutral";
    this.lastUpdateTime = performance.now();
  }

  emit(text, category = "neutral") {
    if (!text || text === this.currentMessage) return;
    this.currentMessage = text;
    this.currentCategory = category;
    this.lastUpdateTime = performance.now();
  }

  getMessage() {
    return {
      text: this.currentMessage,
      category: this.currentCategory
    };
  }
}

// -------------------------------------------------------------
// INSTÂNCIA PRINCIPAL: VIRTUO VOCAL PRO ENGINE
// -------------------------------------------------------------
export class VirtuoVocalProEngine {
  constructor() {
    this.smoother = new VocalSmoother();
    this.stability = new VocalStabilityDetector();
    this.breath = new VocalBreathDetector();
    this.warmup = new VocalWarmupEngine();
    this.exercises = new VocalExerciseEngine();
    this.silentFeedback = new VocalSilentFeedback();

    // Cache do último estado analisado
    this.lastProcessed = {
      note: null,
      octave: null,
      frequency: 0,
      cents: 0,
      smoothFrequency: 0,
      smoothCents: 0,
      smoothMeterPct: 50,
      stabilityScore: 0,
      stabilityState: "Instável",
      breathFeedback: null,
      silentMessage: "Aguardando canto...",
      isSilence: true,
      timestamp: Date.now()
    };
  }

  /**
   * Processa uma frame de pitch em tempo real com todos os módulos integrados
   * Executa em < 0.2 ms para garantia de 60 FPS e baixa latência
   */
  processFrame(rawPitch) {
    const tStart = performance.now();

    // 1. Suavização EMA
    const smoothed = this.smoother.update(rawPitch);

    // 2. Análise de Estabilidade Temporal
    const stabResult = this.stability.process(rawPitch);

    // 3. Detecção de Respiração e Sustentação
    const breathResult = this.breath.process(rawPitch);

    // 4. Determinação da mensagem discreta silenciosa
    if (breathResult.feedback) {
      this.silentFeedback.emit(breathResult.feedback.text, breathResult.feedback.type);
    } else if (rawPitch && !rawPitch.isSilence && rawPitch.note) {
      if (stabResult.state === "Excelente") {
        this.silentFeedback.emit("Excelente estabilidade.", "success");
      } else if (Math.abs(smoothed.smoothCents) <= 6) {
        this.silentFeedback.emit("No tom.", "success");
      } else if (Math.abs(smoothed.smoothCents) <= 15) {
        this.silentFeedback.emit("Quase afinado.", "info");
      } else {
        this.silentFeedback.emit("Continue.", "neutral");
      }
    }

    const duration = performance.now() - tStart;

    this.lastProcessed = {
      note: rawPitch?.note || null,
      octave: rawPitch?.octave !== undefined ? rawPitch.octave : null,
      frequency: rawPitch?.frequency || 0,
      cents: rawPitch?.cents || 0,
      smoothFrequency: smoothed.smoothFrequency,
      smoothCents: smoothed.smoothCents,
      smoothIntensity: smoothed.smoothIntensity,
      smoothMeterPct: smoothed.smoothMeterPct,
      stabilityScore: stabResult.score,
      stabilityState: stabResult.state,
      jitterCents: stabResult.jitterCents,
      constancy: stabResult.constancy,
      breathFeedback: breathResult.feedback,
      silentMessage: this.silentFeedback.getMessage().text,
      isSilence: rawPitch ? rawPitch.isSilence : true,
      processingTimeMs: parseFloat(duration.toFixed(3)),
      timestamp: Date.now()
    };

    return this.lastProcessed;
  }

  reset() {
    this.smoother.reset();
    this.stability.reset();
    this.breath.reset();
    this.exercises.reset();
    this.warmup.stop();
  }
}

export const virtuoVocalPro = new VirtuoVocalProEngine();
if (typeof window !== "undefined") {
  window.virtuoVocalPro = virtuoVocalPro;
}
