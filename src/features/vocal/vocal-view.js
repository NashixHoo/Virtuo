// =============================================================
// VIRTUO VOCAL PRO (MONITOR VOCAL INTELIGENTE 2.1)
// src/features/vocal/vocal-view.js
// Assistente profissional para cantores com processamento local Web Audio API
// Suavização EMA 60 FPS, Estabilidade Circular, Detecção de Respiração,
// Aquecimento Guiado de 3 min, Exercícios e Feedback Silencioso
// =============================================================

import { virtuoVoiceDetector, VOCAL_INTERVALS, NOTE_NAMES } from "../../audio/voice-detector.js";
import { vocalTrainer, VOCAL_TRAINING_LEVELS } from "./vocal-trainer.js";
import { 
  virtuoVocalPro, 
  WARMUP_PHASES, 
  VOCAL_EXERCISES 
} from "./vocal-pro-engine.js";
import { performanceHistory } from "../performance/performance-history.js";
import { perfMonitor } from "../../performance/performance-monitor.js";

class VirtuoVocalController {
  constructor() {
    this.isListening = false;
    this.activeTab = "pro"; // "pro" | "warmup" | "exercises" | "notes" | "intervals" | "history"
    this.permissionState = "prompt";
    this.errorMessage = null;

    this.unsubscribePitch = null;
    this.animFrameId = null;
    this.latestRawPitch = null;
    this.lastProcessedFrame = null;

    // Métricas de Tessitura e Sessão
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.pitchHistory = [];

    // Exercício e Aquecimento Ativos
    this.activeExerciseId = "sustain";
    this.warmupTickUnsub = null;

    // Setup de Callbacks de Aquecimento
    virtuoVocalPro.warmup.onTick = () => {
      this._updateWarmupUI();
    };
    virtuoVocalPro.warmup.onPhaseChange = () => {
      this._updateWarmupUI();
    };
    virtuoVocalPro.warmup.onComplete = () => {
      this._updateWarmupUI();
    };
  }

  setTab(tabName) {
    this.activeTab = tabName;
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  async toggleListening() {
    if (this.isListening) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    const token = perfMonitor.startMeasure("vocal_start");
    this.errorMessage = null;
    try {
      virtuoVoiceDetector.setFilterRange(85, 1100);
      await virtuoVoiceDetector.start();
      this.isListening = true;
      this.permissionState = "granted";

      // Ouvinte do detector de áudio
      this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
        this.latestRawPitch = pitch;
      });

      // Loop visual contínuo a 60 FPS com desaceleração natural
      this._startVisualLoop();

      this.updateListeningUI(true);
      perfMonitor.endMeasure(token);
    } catch (err) {
      perfMonitor.endMeasure(token);
      console.warn("Falha ao iniciar monitor vocal:", err);
      this.isListening = false;
      this.permissionState = "denied";
      this.errorMessage = "Para utilizar o Virtuo Vocal, permita o acesso ao microfone nas configurações do navegador.";
      this.updateListeningUI(false);
      if (window.renderCurrentScreen) window.renderCurrentScreen();
    }
  }

  stop() {
    if (this.unsubscribePitch) {
      this.unsubscribePitch();
      this.unsubscribePitch = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    virtuoVoiceDetector.stop();
    virtuoVocalPro.reset();
    this.isListening = false;
    this.latestRawPitch = null;
    this.lastProcessedFrame = null;
    this.updateListeningUI(false);
    this.resetDisplay();
  }

  resetRange() {
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.pitchHistory = [];
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  _startVisualLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const renderLoop = () => {
      if (!this.isListening) return;

      // Processa através do pipeline inteligente do Vocal Pro (EMA + Estabilidade + Respiração)
      const processed = virtuoVocalPro.processFrame(this.latestRawPitch);
      this.lastProcessedFrame = processed;

      // Atualiza interface a 60 FPS
      this.updateUI(processed);

      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  updateListeningUI(listening) {
    const btn = document.getElementById("vocal-toggle-btn");
    const statusText = document.getElementById("vocal-status-banner");
    const micBadge = document.getElementById("vocal-mic-active-badge");

    if (btn) {
      if (listening) {
        btn.innerHTML = "⏹ Parar Assistente Vocal";
        btn.style.background = "#ef4444";
        btn.style.color = "#ffffff";
        btn.style.borderColor = "#ef4444";
      } else {
        btn.innerHTML = "🎤 Iniciar Assistente Vocal";
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
        btn.style.borderColor = "#7EE7FF";
      }
    }
    if (statusText) {
      statusText.textContent = listening ? "Monitorando afinação, estabilidade e respiração..." : "Microfone inativo.";
    }
    if (micBadge) {
      micBadge.style.display = listening ? "inline-flex" : "none";
    }
  }

  resetDisplay() {
    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const centsTextEl = document.getElementById("vocal-cents-text");
    const needleEl = document.getElementById("vocal-tuner-needle");
    const smoothBarEl = document.getElementById("vocal-smooth-meter-fill");
    const stabStateEl = document.getElementById("vocal-stability-state-text");
    const stabCircleEl = document.getElementById("vocal-stability-svg-circle");
    const silentMsgEl = document.getElementById("vocal-silent-feedback-pill");

    if (noteEl) noteEl.textContent = "—";
    if (octEl) octEl.textContent = "";
    if (freqEl) freqEl.textContent = "0.0 Hz";
    if (centsTextEl) {
      centsTextEl.textContent = "0 cents";
      centsTextEl.style.color = "#94a3b8";
    }
    if (needleEl) needleEl.style.left = "50%";
    if (smoothBarEl) smoothBarEl.style.width = "0%";
    if (stabStateEl) stabStateEl.textContent = "Aguardando";
    if (stabCircleEl) {
      stabCircleEl.style.strokeDashoffset = "251.2";
      stabCircleEl.style.stroke = "rgba(126,231,255,0.2)";
    }
    if (silentMsgEl) {
      silentMsgEl.textContent = "Aguardando canto...";
      silentMsgEl.style.color = "#94a3b8";
      silentMsgEl.style.background = "rgba(255,255,255,0.04)";
    }
  }

  estimateVocalType(minFreq, maxFreq) {
    if (minFreq === Infinity || maxFreq === 0) return "Cante para calibrar";
    const mid = (minFreq + maxFreq) / 2;
    if (mid < 140) return "Baixo";
    if (mid < 220) return "Barítono";
    if (mid < 310) return "Tenor";
    if (mid < 420) return "Contralto";
    if (mid < 580) return "Mezzo-Soprano";
    return "Soprano";
  }

  updateUI(data) {
    if (!this.isListening || !data) return;

    // Sub-modos pedagógicos
    if (this.activeTab === "exercises") {
      this._updateExerciseUI(data);
    } else if (this.activeTab === "notes") {
      const res = vocalTrainer.processNoteFrame(this.latestRawPitch);
      this._updateNoteTrainerUI(res);
    } else if (this.activeTab === "intervals") {
      const res = vocalTrainer.processIntervalFrame(this.latestRawPitch);
      this._updateIntervalTrainerUI(res);
    }

    // 1. NOTA CANTADA, FREQUÊNCIA E CENTS (ATUALIZAÇÃO SUAVE)
    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const centsTextEl = document.getElementById("vocal-cents-text");

    if (noteEl) {
      noteEl.textContent = data.note ? data.note : "—";
    }
    if (octEl) {
      octEl.textContent = data.octave !== null ? data.octave : "";
    }
    if (freqEl) {
      const displayFreq = data.smoothFrequency > 0 ? data.smoothFrequency.toFixed(1) : (data.frequency > 0 ? data.frequency.toFixed(1) : "0.0");
      freqEl.textContent = `${displayFreq} Hz`;
    }
    if (centsTextEl) {
      const c = data.smoothCents;
      centsTextEl.textContent = `${c > 0 ? '+' : ''}${c} cents`;
      if (Math.abs(c) <= 6) {
        centsTextEl.style.color = "#34d399"; // Verde esmeralda afinaço
      } else if (Math.abs(c) <= 18) {
        centsTextEl.style.color = "#7EE7FF"; // Azul celestial quase afinado
      } else if (Math.abs(c) <= 30) {
        centsTextEl.style.color = "#facc15"; // Amarelo
      } else {
        centsTextEl.style.color = "#f87171"; // Vermelho
      }
    }

    // 2. MEDIDOR VOCAL SUAVE (EMA COM DESACELERAÇÃO NATURAL A 60 FPS)
    const needleEl = document.getElementById("vocal-tuner-needle");
    const smoothBarEl = document.getElementById("vocal-smooth-meter-fill");
    const smoothBarCenterEl = document.getElementById("vocal-smooth-center-deviation");

    if (needleEl) {
      needleEl.style.left = `${data.smoothMeterPct}%`;
      needleEl.style.background = Math.abs(data.smoothCents) <= 6 ? '#34d399' : Math.abs(data.smoothCents) <= 18 ? '#7EE7FF' : '#facc15';
    }

    if (smoothBarEl) {
      // Barra de intensidade da voz com suavização EMA
      const pct = Math.min(100, Math.round(data.smoothIntensity * 100));
      smoothBarEl.style.width = `${pct}%`;
    }

    if (smoothBarCenterEl) {
      // Barra de desvio a partir do centro (0 cents = 50%)
      const centerPct = 50;
      const targetPct = data.smoothMeterPct;
      if (targetPct >= centerPct) {
        smoothBarCenterEl.style.left = "50%";
        smoothBarCenterEl.style.width = `${Math.min(50, targetPct - centerPct)}%`;
        smoothBarCenterEl.style.background = Math.abs(data.smoothCents) <= 8 ? '#34d399' : '#7EE7FF';
      } else {
        smoothBarCenterEl.style.left = `${targetPct}%`;
        smoothBarCenterEl.style.width = `${Math.min(50, centerPct - targetPct)}%`;
        smoothBarCenterEl.style.background = Math.abs(data.smoothCents) <= 8 ? '#34d399' : '#facc15';
      }
    }

    // 3. INDICADOR CIRCULAR DE ESTABILIDADE (Excelente / Boa / Instável)
    const stabCircleEl = document.getElementById("vocal-stability-svg-circle");
    const stabScoreEl = document.getElementById("vocal-stability-score-text");
    const stabStateEl = document.getElementById("vocal-stability-state-text");
    const stabJitterEl = document.getElementById("vocal-stability-jitter-text");

    if (stabScoreEl) {
      stabScoreEl.textContent = `${data.stabilityScore}%`;
    }
    if (stabStateEl) {
      stabStateEl.textContent = data.stabilityState;
      if (data.stabilityState === "Excelente") {
        stabStateEl.style.color = "#34d399";
      } else if (data.stabilityState === "Boa") {
        stabStateEl.style.color = "#7EE7FF";
      } else {
        stabStateEl.style.color = "#f87171";
      }
    }
    if (stabJitterEl) {
      stabJitterEl.textContent = `Tremulação: ±${data.jitterCents} cents`;
    }
    if (stabCircleEl) {
      // Raio 40 -> Circunferência = 2 * PI * 40 ≈ 251.2
      const circumference = 251.2;
      const offset = circumference - (data.stabilityScore / 100) * circumference;
      stabCircleEl.style.strokeDashoffset = String(offset);
      if (data.stabilityState === "Excelente") {
        stabCircleEl.style.stroke = "#34d399";
        stabCircleEl.style.filter = "drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))";
      } else if (data.stabilityState === "Boa") {
        stabCircleEl.style.stroke = "#7EE7FF";
        stabCircleEl.style.filter = "drop-shadow(0 0 8px rgba(126, 231, 255, 0.6))";
      } else {
        stabCircleEl.style.stroke = "#f87171";
        stabCircleEl.style.filter = "none";
      }
    }

    // 4. FEEDBACK SILENCIOSO (SEM POPUPS)
    const silentMsgEl = document.getElementById("vocal-silent-feedback-pill");
    if (silentMsgEl && data.silentMessage) {
      silentMsgEl.textContent = data.silentMessage;
      if (data.silentMessage.includes("Excelente") || data.silentMessage.includes("Respiração boa") || data.silentMessage.includes("No tom")) {
        silentMsgEl.style.background = "rgba(52, 211, 153, 0.15)";
        silentMsgEl.style.color = "#34d399";
        silentMsgEl.style.borderColor = "rgba(52, 211, 153, 0.35)";
      } else if (data.silentMessage.includes("Quase") || data.silentMessage.includes("sustentar um pouco mais")) {
        silentMsgEl.style.background = "rgba(126, 231, 255, 0.12)";
        silentMsgEl.style.color = "#7EE7FF";
        silentMsgEl.style.borderColor = "rgba(126, 231, 255, 0.3)";
      } else {
        silentMsgEl.style.background = "rgba(255, 255, 255, 0.05)";
        silentMsgEl.style.color = "#cbd5e1";
        silentMsgEl.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }
    }

    // 5. TESSITURA E TRACKER DE FAIXA
    if (data.frequency >= 85 && data.frequency <= 1100 && !data.isSilence) {
      if (data.frequency < this.minFreqDetected) this.minFreqDetected = data.frequency;
      if (data.frequency > this.maxFreqDetected) this.maxFreqDetected = data.frequency;

      const rangeEl = document.getElementById("vocal-range-label");
      const vocalTypeEl = document.getElementById("vocal-type-label");
      if (rangeEl) rangeEl.textContent = `${this.minFreqDetected.toFixed(0)} Hz — ${this.maxFreqDetected.toFixed(0)} Hz`;
      if (vocalTypeEl) vocalTypeEl.textContent = this.estimateVocalType(this.minFreqDetected, this.maxFreqDetected);
    }
  }

  // -------------------------------------------------------------
  // UI DO MODO AQUECIMENTO (3 MINUTOS)
  // -------------------------------------------------------------
  _updateWarmupUI() {
    const state = virtuoVocalPro.warmup.getState();

    const timerEl = document.getElementById("warmup-timer-text");
    const phaseNameEl = document.getElementById("warmup-phase-name");
    const phaseInstrEl = document.getElementById("warmup-phase-instr");
    const phaseNotesEl = document.getElementById("warmup-phase-notes");
    const progressEl = document.getElementById("warmup-total-progress-bar");
    const phaseProgressEl = document.getElementById("warmup-phase-progress-bar");
    const startBtn = document.getElementById("warmup-start-btn");

    if (timerEl) {
      const minutes = Math.floor(state.remainingSeconds / 60);
      const seconds = state.remainingSeconds % 60;
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    if (phaseNameEl) {
      phaseNameEl.textContent = `${state.phaseIndex + 1}/4 • ${state.currentPhase.name}`;
    }

    if (phaseInstrEl) {
      phaseInstrEl.textContent = state.currentPhase.instruction;
    }

    if (phaseNotesEl) {
      phaseNotesEl.textContent = `Guia Harmônico: ${state.currentPhase.notes.join(" ➔ ")}`;
    }

    if (progressEl) {
      progressEl.style.width = `${state.progressPct}%`;
    }

    if (phaseProgressEl) {
      phaseProgressEl.style.width = `${state.phaseProgressPct}%`;
    }

    if (startBtn) {
      if (state.isRunning && !state.isPaused) {
        startBtn.innerHTML = "⏸ Pausar Aquecimento";
        startBtn.style.background = "#f59e0b";
        startBtn.style.color = "#000000";
      } else if (state.isPaused) {
        startBtn.innerHTML = "▶ Continuar Aquecimento";
        startBtn.style.background = "#7EE7FF";
        startBtn.style.color = "#07101F";
      } else {
        startBtn.innerHTML = "▶ Iniciar Sessão de 3 Minutos";
        startBtn.style.background = "#7EE7FF";
        startBtn.style.color = "#07101F";
      }
    }
  }

  // -------------------------------------------------------------
  // UI DOS EXERCÍCIOS GUIADOS
  // -------------------------------------------------------------
  _updateExerciseUI(pitchData) {
    const res = virtuoVocalPro.exercises.processFrame(pitchData);

    const feedbackEl = document.getElementById("exercise-live-feedback");
    const progressBarEl = document.getElementById("exercise-live-progress");
    const scoreEl = document.getElementById("exercise-live-score");

    if (feedbackEl && res.feedback) {
      feedbackEl.textContent = res.feedback;
      feedbackEl.style.color = res.isCompleted ? "#34d399" : (res.progressPct > 0 ? "#7EE7FF" : "#cbd5e1");
    }

    if (progressBarEl) {
      progressBarEl.style.width = `${res.progressPct}%`;
      progressBarEl.style.background = res.isCompleted ? "#10b981" : "#7EE7FF";
    }

    if (scoreEl && res.isCompleted) {
      scoreEl.textContent = `${res.score} pts`;
      scoreEl.style.color = "#34d399";
    }
  }

  _updateNoteTrainerUI(res) {
    const feedbackEl = document.getElementById("note-trainer-feedback");
    const progressEl = document.getElementById("note-trainer-progress-bar");
    const scoreEl = document.getElementById("note-trainer-score");

    if (feedbackEl && res) {
      feedbackEl.textContent = res.feedback;
      feedbackEl.style.color = res.isLocked ? "#34d399" : (res.centsError && Math.abs(res.centsError) <= 25) ? "#facc15" : "#cbd5e1";
    }

    if (progressEl && res) {
      const pct = Math.min(100, Math.round((res.sustainedMs / vocalTrainer.requiredHoldTimeMs) * 100));
      progressEl.style.width = `${pct}%`;
      progressEl.style.background = res.isLocked ? "#10b981" : "#7EE7FF";
    }

    if (scoreEl && res && res.isCompleted) {
      scoreEl.textContent = `${res.score} pts`;
      scoreEl.style.color = "#34d399";
    }
  }

  _updateIntervalTrainerUI(res) {
    const feedbackEl = document.getElementById("interval-trainer-feedback");
    const scoreEl = document.getElementById("interval-trainer-score");

    if (feedbackEl && res) {
      feedbackEl.textContent = res.feedback;
      feedbackEl.style.color = res.isCorrect ? "#34d399" : "#facc15";
    }

    if (scoreEl && res && res.isCorrect) {
      scoreEl.textContent = `${res.score} pts`;
      scoreEl.style.color = "#34d399";
    }
  }
}

export const virtuoVocal = new VirtuoVocalController();
if (typeof window !== "undefined") {
  window.virtuoVocal = virtuoVocal;
}

// -------------------------------------------------------------
// RENDERIZADOR PRINCIPAL: VIRTUO VOCAL PRO (TELA COMPLETA)
// -------------------------------------------------------------
export function renderVocalScreen() {
  const isListening = virtuoVocal.isListening;
  const activeTab = virtuoVocal.activeTab;
  const currentVocalType = virtuoVocal.estimateVocalType(virtuoVocal.minFreqDetected, virtuoVocal.maxFreqDetected);
  const perfStats = virtuoVoiceDetector.getPerformanceStats();
  const warmupState = virtuoVocalPro.warmup.getState();
  const currentEx = virtuoVocalPro.exercises.getExercise();
  const historySessions = performanceHistory.getAllSessions().slice(0, 10);

  return `
    <section class="vocal-pro-container" style="max-width:780px; margin:0 auto; padding:4px 8px 30px;">
      
      <!-- HEADER COM BADGE DE PRIVACIDADE E FEEDBACK SILENCIOSO DISCRETO -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pill" style="background:rgba(126,231,255,0.12); color:#7EE7FF; border:1px solid rgba(126,231,255,0.3); font-weight:800; font-size:12px; letter-spacing:0.5px;">
            🎤 VIRTUO VOCAL PRO
          </span>
          <span id="vocal-mic-active-badge" class="pill" style="display:${isListening ? 'inline-flex' : 'none'}; background:rgba(239,68,68,0.18); color:#fca5a5; border:1px solid rgba(239,68,68,0.4); font-size:11px; font-weight:700;">
            🔴 LOCAL 60 FPS
          </span>
        </div>

        <div style="font-size:11px; color:#94a3b8;" id="vocal-status-banner">
          ${isListening ? 'Monitorando afinação e estabilidade...' : 'Microfone inativo'}
        </div>
      </div>

      <!-- FEEDBACK SILENCIOSO (BANNER SUTIL E CALMO, SEM MODAIS) -->
      <div style="display:flex; justify-content:center; margin-bottom:14px;">
        <div 
          id="vocal-silent-feedback-pill"
          style="display:inline-flex; align-items:center; gap:8px; padding:6px 18px; border-radius:20px; font-size:12px; font-weight:700; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:#cbd5e1; transition:all 0.3s ease; box-shadow:0 4px 14px rgba(0,0,0,0.3);"
        >
          Aguardando canto...
        </div>
      </div>

      <!-- ALERTA AMIGÁVEL DE PERMISSÃO -->
      ${virtuoVocal.errorMessage ? `
        <div style="padding:12px 16px; background:rgba(239,68,68,0.15); border:1px solid #ef4444; border-radius:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="font-size:12px; color:#fca5a5;">
            ⚠️ ${virtuoVocal.errorMessage}
          </div>
          <button class="tag-btn" onclick="window.virtuoVocal.errorMessage = null; if(window.renderCurrentScreen) window.renderCurrentScreen();" style="padding:3px 8px; font-size:10px;">Fechar</button>
        </div>
      ` : ''}

      <!-- NAVEGAÇÃO ENTRE ABAS DO VIRTUO VOCAL -->
      <div style="display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px; overflow-x:auto; scrollbar-width:none;">
        <button 
          id="vocal-tab-pro"
          class="tag-btn ${activeTab === 'pro' || activeTab === 'tuner' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('pro')"
        >
          🎯 Monitor Vocal Pro
        </button>
        <button 
          id="vocal-tab-warmup"
          class="tag-btn ${activeTab === 'warmup' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('warmup')"
        >
          🔥 Aquecimento (3 min)
        </button>
        <button 
          id="vocal-tab-exercises"
          class="tag-btn ${activeTab === 'exercises' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('exercises')"
        >
          🏋️ Exercícios Guiados
        </button>
        <button 
          id="vocal-tab-notes"
          class="tag-btn ${activeTab === 'notes' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('notes')"
        >
          🎵 Treino de Notas
        </button>
        <button 
          id="vocal-tab-intervals"
          class="tag-btn ${activeTab === 'intervals' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('intervals')"
        >
          📐 Treino de Intervalos
        </button>
        <button 
          id="vocal-tab-history"
          class="tag-btn ${activeTab === 'history' ? 'active' : ''}" 
          style="padding:8px 14px; font-size:12px; font-weight:700; white-space:nowrap;"
          onclick="window.virtuoVocal.setTab('history')"
        >
          📋 Histórico
        </button>
      </div>

      <!-- ========================================================= -->
      <!-- ABA 1: MONITOR VOCAL PRO (AFINAÇÃO, ESTABILIDADE & SUAVIZAÇÃO) -->
      <!-- ========================================================= -->
      ${(activeTab === 'pro' || activeTab === 'tuner') ? `
        <div style="background:rgba(14, 27, 53, 0.65); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(126,231,255,0.22); border-radius:28px; padding:26px 20px; box-shadow:0 10px 32px rgba(0,0,0,0.45);">
          
          <!-- LAYOUT EM GRID: NOTA CANTADA + INDICADOR DE ESTABILIDADE CIRCULAR -->
          <div style="display:grid; grid-template-columns:1fr 150px; gap:16px; align-items:center; margin-bottom:20px;">
            
            <!-- BLOCO DA NOTA CANTADA COM TIPOGRAFIA MAIOR -->
            <div style="text-align:left; padding-left:10px;">
              <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#7EE7FF; font-weight:800; margin-bottom:4px;">
                Nota Cantada
              </div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span id="vocal-note-display" style="font-size:92px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 32px rgba(126,231,255,0.45); font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
                  —
                </span>
                <span id="vocal-oct-display" style="font-size:42px; font-weight:700; color:#7EE7FF; line-height:1;"></span>
              </div>

              <!-- FREQUÊNCIA E CENTS SUAVES -->
              <div style="display:flex; align-items:center; gap:16px; margin-top:6px;">
                <div style="font-size:15px; color:#94a3b8;">
                  Frequência: <strong id="vocal-freq-display" style="color:#ffffff; font-size:16px;">0.0 Hz</strong>
                </div>
                <div id="vocal-cents-text" style="font-size:17px; font-weight:800; color:#94a3b8;">
                  0 cents
                </div>
              </div>
            </div>

            <!-- BLOCO DO INDICADOR DE ESTABILIDADE CIRCULAR -->
            <div style="text-align:center; padding:10px; background:rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.06); border-radius:22px;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:800; margin-bottom:6px;">
                Estabilidade
              </div>
              
              <!-- CÍRCULO SVG ELEGANTE -->
              <div style="position:relative; width:90px; height:90px; margin:0 auto;">
                <svg width="90" height="90" viewBox="0 0 90 90" style="transform:rotate(-90deg);">
                  <!-- Trilha de Fundo -->
                  <circle cx="45" cy="45" r="40" stroke="rgba(255,255,255,0.08)" stroke-width="6" fill="none" />
                  <!-- Anel Dinâmico de Estabilidade -->
                  <circle 
                    id="vocal-stability-svg-circle" 
                    cx="45" cy="45" r="40" 
                    stroke="#7EE7FF" 
                    stroke-width="6" 
                    fill="none" 
                    stroke-dasharray="251.2" 
                    stroke-dashoffset="251.2" 
                    stroke-linecap="round"
                    style="transition:stroke-dashoffset 0.12s ease-out, stroke 0.2s ease;"
                  />
                </svg>
                <!-- Texto Central do Círculo -->
                <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                  <span id="vocal-stability-score-text" style="font-size:20px; font-weight:900; color:#ffffff; line-height:1;">
                    0%
                  </span>
                </div>
              </div>

              <!-- ESTADO DA ESTABILIDADE: EXCELENTE, BOA, INSTÁVEL -->
              <div id="vocal-stability-state-text" style="font-size:12px; font-weight:800; color:#94a3b8; margin-top:6px;">
                Aguardando
              </div>
              <div id="vocal-stability-jitter-text" style="font-size:9px; color:#64748b; margin-top:2px;">
                Tremulação: ±0.0 cents
              </div>
            </div>

          </div>

          <!-- ========================================================= -->
          <!-- 1. MEDIDOR VOCAL SUAVE (EMA COM DESACELERAÇÃO NATURAL) -->
          <!-- ========================================================= -->
          <div style="margin:20px 0 10px; padding:16px 18px; background:rgba(0,0,0,0.32); border-radius:20px; border:1px solid rgba(255,255,255,0.06);">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700;">
                Medidor de Afinação Contínua
              </span>
              <span style="font-size:10px; color:#7EE7FF;">
                Suavização EMA • 60 FPS
              </span>
            </div>

            <!-- Régua de Afinação Centralizada com Agulha Deslizante -->
            <div style="position:relative; height:12px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:visible; margin:16px 0 12px;">
              <!-- Zona Alvo Central (Afinado ±5 cents) -->
              <div style="position:absolute; left:46%; width:8%; top:0; bottom:0; background:rgba(52,211,153,0.3); border-radius:3px;"></div>
              <div style="position:absolute; left:50%; width:2px; height:100%; background:#34d399; transform:translateX(-50%);"></div>

              <!-- Barra de Desvio Suave a partir do Centro -->
              <div id="vocal-smooth-center-deviation" style="position:absolute; top:2px; bottom:2px; left:50%; width:0%; background:#7EE7FF; border-radius:3px; opacity:0.85; transition:width 0.08s ease-out, left 0.08s ease-out;"></div>

              <!-- Agulha Fluida com Glow -->
              <div 
                id="vocal-tuner-needle" 
                style="position:absolute; top:-5px; left:50%; width:16px; height:22px; border-radius:8px; background:#7EE7FF; transform:translateX(-50%); box-shadow:0 0 12px rgba(126,231,255,0.8); transition:left 0.08s ease-out; z-index:2;"
              ></div>
            </div>

            <!-- Marcações de Escala -->
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; font-weight:700;">
              <span>-50 cents</span>
              <span>-25</span>
              <span style="color:#34d399; font-weight:800;">0 (Afinado)</span>
              <span>+25</span>
              <span>+50 cents</span>
            </div>

            <!-- Barra Suave de Energia Vocal / Sustentação -->
            <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-bottom:6px;">
                <span>Energia Vocal</span>
                <span id="vocal-smooth-meter-status">Desaceleração Natural</span>
              </div>
              <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                <div id="vocal-smooth-meter-fill" style="height:100%; width:0%; background:linear-gradient(90deg, #7EE7FF, #38bdf8); border-radius:3px; transition:width 0.1s linear;"></div>
              </div>
            </div>

          </div>

          <!-- CARD DE TESSITURA E EXTENSÃO VOCAL -->
          <div style="margin-top:16px; padding:14px 18px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:#94a3b8; font-weight:700;">Classificação Vocal</div>
              <div id="vocal-type-label" style="font-size:16px; font-weight:800; color:#ffffff; margin-top:2px;">${currentVocalType}</div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:#94a3b8; font-weight:700;">Faixa Atingida</div>
              <div id="vocal-range-label" style="font-size:14px; font-weight:700; color:#7EE7FF; margin-top:2px;">
                ${virtuoVocal.minFreqDetected !== Infinity ? `${virtuoVocal.minFreqDetected.toFixed(0)} Hz — ${virtuoVocal.maxFreqDetected.toFixed(0)} Hz` : "—"}
              </div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:#94a3b8; font-weight:700;">Latência Local</div>
              <div style="font-size:14px; font-weight:700; color:#34d399; margin-top:2px;">
                ${perfStats.averageProcessingMs || '< 0.3'} ms
              </div>
            </div>
            <button class="tag-btn" style="padding:4px 10px; font-size:10px;" onclick="window.virtuoVocal.resetRange()">
              Resetar Faixa
            </button>
          </div>

        </div>
      ` : ''}

      <!-- ========================================================= -->
      <!-- ABA 2: MODO AQUECIMENTO (SESSÃO RÁPIDA DE 3 MINUTOS) -->
      <!-- ========================================================= -->
      ${activeTab === 'warmup' ? `
        <div style="background:rgba(14, 27, 53, 0.65); backdrop-filter:blur(20px); border:1px solid rgba(126,231,255,0.22); border-radius:28px; padding:26px 20px; text-align:center;">
          
          <div style="display:inline-block; padding:4px 14px; border-radius:12px; background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-size:11px; font-weight:800; margin-bottom:8px;">
            SESSÃO DE AQUECIMENTO GUIADA (3 MINUTOS)
          </div>

          <h3 style="font-size:20px; font-weight:800; margin:6px 0 4px; color:#ffffff;">
            Preparação Vocal Progressiva
          </h3>
          <p style="font-size:13px; color:#94a3b8; max-width:480px; margin:0 auto 18px;">
            Síntese acústica 100% local com 4 fases de 45 segundos: Graves, Médios, Agudos e Sustentação.
          </p>

          <!-- CRONÔMETRO CENTRAL REGRESSIVO -->
          <div style="padding:18px; background:rgba(0,0,0,0.35); border-radius:24px; max-width:320px; margin:0 auto 20px; border:1px solid rgba(255,255,255,0.08);">
            <div id="warmup-timer-text" style="font-size:52px; font-weight:900; color:#7EE7FF; font-family:monospace; line-height:1; letter-spacing:2px;">
              ${String(Math.floor(warmupState.remainingSeconds / 60)).padStart(2, '0')}:${String(warmupState.remainingSeconds % 60).padStart(2, '0')}
            </div>
            
            <div style="margin-top:12px; height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
              <div id="warmup-total-progress-bar" style="height:100%; width:${warmupState.progressPct}%; background:#7EE7FF; transition:width 0.3s ease;"></div>
            </div>
          </div>

          <!-- CARD DA FASE ATUAL -->
          <div style="padding:18px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.2); border-radius:20px; max-width:520px; margin:0 auto 20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong id="warmup-phase-name" style="color:#7EE7FF; font-size:15px;">
                ${warmupState.phaseIndex + 1}/4 • ${warmupState.currentPhase.name}
              </strong>
              <span style="font-size:11px; color:#94a3b8;">45s por fase</span>
            </div>

            <p id="warmup-phase-instr" style="font-size:13px; color:#cbd5e1; margin:0 0 10px; line-height:1.5;">
              ${warmupState.currentPhase.instruction}
            </p>

            <div id="warmup-phase-notes" style="font-size:12px; color:#34d399; font-weight:700; margin-bottom:10px;">
              Guia Harmônico: ${warmupState.currentPhase.notes.join(" ➔ ")}
            </div>

            <!-- Progresso da Fase Específica -->
            <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
              <div id="warmup-phase-progress-bar" style="height:100%; width:${warmupState.phaseProgressPct}%; background:#34d399; transition:width 0.3s ease;"></div>
            </div>
          </div>

          <!-- BOTÕES DE CONTROLE DO AQUECIMENTO -->
          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <button 
              id="warmup-start-btn" 
              class="button primary" 
              style="padding:12px 24px; font-size:14px; font-weight:800; border-radius:14px; background:#7EE7FF; color:#07101F;"
              onclick="if(virtuoVocalPro.warmup.isRunning && !virtuoVocalPro.warmup.isPaused) { virtuoVocalPro.warmup.pause(); } else if(virtuoVocalPro.warmup.isPaused) { virtuoVocalPro.warmup.resume(); } else { virtuoVocalPro.warmup.start(); } window.virtuoVocal._updateWarmupUI();"
            >
              ${warmupState.isRunning && !warmupState.isPaused ? '⏸ Pausar' : (warmupState.isPaused ? '▶ Continuar' : '▶ Iniciar Sessão de 3 Minutos')}
            </button>

            <button 
              class="button secondary" 
              style="padding:12px 18px; font-size:13px; border-radius:14px;"
              onclick="virtuoVocalPro.warmup.nextPhase(); window.virtuoVocal._updateWarmupUI();"
            >
              ⏭ Próxima Fase
            </button>

            <button 
              class="tag-btn" 
              style="padding:12px 16px; font-size:12px; border-radius:14px;"
              onclick="virtuoVocalPro.warmup.stop(); window.virtuoVocal._updateWarmupUI();"
            >
              🔄 Reiniciar
            </button>
          </div>

        </div>
      ` : ''}

      <!-- ========================================================= -->
      <!-- ABA 3: EXERCÍCIOS GUIADOS (4 EXERCÍCIOS ESTRUTURADOS) -->
      <!-- ========================================================= -->
      ${activeTab === 'exercises' ? `
        <div style="background:rgba(14, 27, 53, 0.65); backdrop-filter:blur(20px); border:1px solid rgba(126,231,255,0.22); border-radius:28px; padding:26px 20px; text-align:center;">
          
          <div style="display:inline-block; padding:4px 14px; border-radius:12px; background:rgba(99,102,241,0.18); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); font-size:11px; font-weight:800; margin-bottom:8px;">
            EXERCÍCIOS VOCAIS GUIADOS
          </div>

          <h3 style="font-size:20px; font-weight:800; margin:4px 0 14px; color:#ffffff;">
            ${currentEx.title}
          </h3>

          <!-- SELETOR DOS 4 EXERCÍCIOS DA ESPECIFICAÇÃO -->
          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
            ${VOCAL_EXERCISES.map(ex => `
              <button 
                class="tag-btn ${virtuoVocalPro.exercises.currentExerciseId === ex.id ? 'active' : ''}"
                style="padding:8px 14px; font-size:12px; font-weight:700;"
                onclick="virtuoVocalPro.exercises.setExercise('${ex.id}'); if(window.renderCurrentScreen) window.renderCurrentScreen();"
              >
                ${ex.title}
              </button>
            `).join("")}
          </div>

          <!-- PAINEL DO EXERCÍCIO ATIVO -->
          <div style="padding:20px; background:rgba(0,0,0,0.35); border-radius:22px; max-width:520px; margin:0 auto 20px; border:1px solid rgba(255,255,255,0.08);">
            <p style="font-size:13px; color:#cbd5e1; margin:0 0 16px;">
              ${currentEx.description}
            </p>

            <div style="display:flex; justify-content:center; gap:12px; margin-bottom:16px;">
              <button class="button secondary" style="padding:8px 16px; font-size:12px;" onclick="virtuoVocalPro.exercises.playTargetAudio()">
                🔊 Ouvir Tom Guia
              </button>
              <button class="tag-btn" style="padding:8px 14px; font-size:12px;" onclick="virtuoVocalPro.exercises.reset(); if(window.renderCurrentScreen) window.renderCurrentScreen();">
                🔄 Tentar Novamente
              </button>
            </div>

            <!-- Barra de Progresso do Exercício -->
            <div style="height:12px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden; margin-bottom:12px;">
              <div id="exercise-live-progress" style="height:100%; width:0%; background:#7EE7FF; transition:width 0.1s linear;"></div>
            </div>

            <!-- Feedback ao Vivo do Exercício -->
            <div id="exercise-live-feedback" style="font-size:15px; font-weight:800; color:#7EE7FF; min-height:24px; margin-bottom:6px;">
              ${virtuoVocalPro.exercises.feedback}
            </div>

            <div style="font-size:12px; color:#94a3b8;">
              Pontuação: <strong id="exercise-live-score" style="color:#ffffff; font-size:16px;">${virtuoVocalPro.exercises.score} pts</strong>
            </div>
          </div>

        </div>
      ` : ''}

      <!-- ========================================================= -->
      <!-- ABA 4: TREINO DE NOTAS (PRESERVADA) -->
      <!-- ========================================================= -->
      ${activeTab === 'notes' ? `
        <div style="padding:20px 16px; background:rgba(14, 27, 53, 0.65); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
          <span class="pill" style="background:rgba(99,102,241,0.2); color:#a5b4fc; border-color:#818cf8; margin-bottom:8px;">
            DESAFIO DE NOTA SUSTENTADA
          </span>
          
          <h3 style="font-size:18px; margin:6px 0 2px;">
            Cante: <span style="color:#7EE7FF; font-size:32px; font-weight:900; margin-left:4px;">${vocalTrainer.targetNote}${vocalTrainer.targetOctave}</span>
          </h3>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
            Mantenha a nota afinada (±25 cents) por 1 segundo para validar a sustentação.
          </p>

          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="button secondary" style="padding:6px 14px; font-size:12px;" onclick="window.vocalTrainer.playNoteReference()">
              🔊 Ouvir Tom de Referência
            </button>
            <button class="tag-btn" onclick="window.vocalTrainer.resetTrial(); if(window.renderCurrentScreen) window.renderCurrentScreen();" style="font-size:11px;">
              🔄 Reiniciar Desafio
            </button>
          </div>

          <div style="display:flex; justify-content:center; gap:6px; margin-bottom:16px; flex-wrap:wrap;">
            ${["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"].map(n => {
              const noteName = n.slice(0, -1);
              const oct = Number(n.slice(-1));
              const isCurrent = (vocalTrainer.targetNote === noteName && vocalTrainer.targetOctave === oct);
              return `
                <button 
                  class="tag-btn ${isCurrent ? 'active' : ''}" 
                  style="font-size:11px; padding:4px 8px;"
                  onclick="window.vocalTrainer.setTargetNote('${noteName}', ${oct}); if(window.renderCurrentScreen) window.renderCurrentScreen();"
                >
                  ${n}
                </button>
              `;
            }).join("")}
          </div>

          <div style="max-width:320px; margin:0 auto 12px; background:rgba(255,255,255,0.08); height:12px; border-radius:6px; overflow:hidden;">
            <div id="note-trainer-progress-bar" style="width:0%; height:100%; background:#7EE7FF; transition:width 0.1s linear;"></div>
          </div>

          <div id="note-trainer-feedback" style="font-size:14px; font-weight:700; color:#cbd5e1; min-height:22px; margin-bottom:8px;">
            ${vocalTrainer.lastFeedback}
          </div>

          <div style="font-size:12px; color:#94a3b8;">
            Pontuação: <strong id="note-trainer-score" style="color:#ffffff; font-size:16px;">${vocalTrainer.noteScore} pts</strong>
          </div>
        </div>
      ` : ''}

      <!-- ========================================================= -->
      <!-- ABA 5: TREINO DE INTERVALOS (PRESERVADA) -->
      <!-- ========================================================= -->
      ${activeTab === 'intervals' ? `
        <div style="padding:20px 16px; background:rgba(14, 27, 53, 0.65); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
          <span class="pill" style="background:rgba(234,179,8,0.2); color:#fde047; border-color:#facc15; margin-bottom:8px;">
            PERCEPÇÃO E ENTOAÇÃO DE INTERVALOS
          </span>

          <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px; max-width:400px; margin:12px auto;">
            <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:12px;">
              <span style="font-size:10px; color:#94a3b8; display:block;">Nota Base</span>
              <strong style="font-size:22px; color:#ffffff;">${vocalTrainer.baseNote}${vocalTrainer.baseOctave}</strong>
            </div>
            <div style="color:#7EE7FF; font-size:18px; font-weight:900;">➔</div>
            <div style="padding:10px; background:rgba(126,231,255,0.1); border-radius:12px; border:1px solid rgba(126,231,255,0.3);">
              <span style="font-size:10px; color:#7EE7FF; display:block;">Objetivo (${vocalTrainer.intervalTarget.intervalName})</span>
              <strong style="font-size:22px; color:#7EE7FF;">${vocalTrainer.intervalTarget.targetNote}${vocalTrainer.intervalTarget.targetOctave}</strong>
            </div>
          </div>

          <p style="font-size:12px; color:#94a3b8; margin:8px 0 14px;">
            Ouça a base, calcule mentalmente a distância e cante o intervalo.
          </p>

          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            <button class="button secondary" style="padding:6px 12px; font-size:12px;" onclick="window.vocalTrainer.playBaseReference()">
              🔊 Ouvir Base (${vocalTrainer.baseNote}${vocalTrainer.baseOctave})
            </button>
            <button class="button secondary" style="padding:6px 12px; font-size:12px;" onclick="window.vocalTrainer.playTargetReference()">
              🔊 Ouvir Alvo (${vocalTrainer.intervalTarget.targetNote}${vocalTrainer.intervalTarget.targetOctave})
            </button>
          </div>

          <div style="display:flex; justify-content:center; gap:6px; margin-bottom:16px; flex-wrap:wrap;">
            ${Object.keys(VOCAL_INTERVALS).map(k => {
              const item = VOCAL_INTERVALS[k];
              const isSel = (vocalTrainer.selectedInterval === k);
              return `
                <button 
                  class="tag-btn ${isSel ? 'active' : ''}" 
                  style="font-size:11px; padding:4px 8px;"
                  onclick="window.vocalTrainer.setInterval('${vocalTrainer.baseNote}', ${vocalTrainer.baseOctave}, '${k}'); if(window.renderCurrentScreen) window.renderCurrentScreen();"
                >
                  ${item.name} (${item.short})
                </button>
              `;
            }).join("")}
          </div>

          <div id="interval-trainer-feedback" style="font-size:14px; font-weight:700; color:#cbd5e1; min-height:22px; margin-bottom:8px;">
            ${vocalTrainer.intervalFeedback}
          </div>

          <div style="font-size:12px; color:#94a3b8;">
            Precisão: <strong id="interval-trainer-score" style="color:#ffffff; font-size:16px;">${vocalTrainer.intervalScore} pts</strong>
          </div>
        </div>
      ` : ''}

      <!-- ========================================================= -->
      <!-- ABA 6: HISTÓRICO LOCAL (PRESERVADA) -->
      <!-- ========================================================= -->
      ${activeTab === 'history' ? `
        <div style="padding:16px; background:rgba(14, 27, 53, 0.65); border:1px solid rgba(255,255,255,0.08); border-radius:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font-size:14px; color:#7EE7FF; margin:0;">Sessões Gravadas Localmente</h3>
            ${historySessions.length > 0 ? `
              <button class="tag-btn" style="padding:2px 8px; font-size:10px; color:#f87171;" onclick="window.performanceHistory.clearHistory(); if(window.renderCurrentScreen) window.renderCurrentScreen();">
                Limpar Histórico
              </button>
            ` : ''}
          </div>

          ${historySessions.length === 0 ? `
            <div style="text-align:center; padding:24px 8px; color:#94a3b8; font-size:12px;">
              Nenhuma sessão de treino ou performance gravada ainda.
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${historySessions.map(s => `
                <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="color:#ffffff; font-size:13px;">${s.songTitle || 'Treino Vocal'}</strong>
                    <div style="font-size:11px; color:#94a3b8;">
                      ${new Date(s.date).toLocaleDateString()} • ${s.duration}s de duração • Tom ${s.songKey || '—'}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:16px; font-weight:900; color:#7EE7FF;">${s.score}%</div>
                    <div style="font-size:10px; color:#34d399;">Afin: ${s.pitchScore}% | Est: ${s.stabilityScore}%</div>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      ` : ''}

      <!-- BOTÃO PRINCIPAL DE INÍCIO / PARADA DO MONITOR VOCAL -->
      <div style="margin-top:22px; text-align:center;">
        <button 
          id="vocal-toggle-btn"
          class="button primary" 
          style="width:100%; max-width:340px; padding:16px 26px; font-size:16px; font-weight:800; border-radius:18px; background:${isListening ? '#ef4444' : '#7EE7FF'}; color:${isListening ? '#ffffff' : '#07101F'}; border:1px solid ${isListening ? '#ef4444' : '#7EE7FF'}; box-shadow:0 8px 24px rgba(0,0,0,0.45); cursor:pointer; transition:all 0.2s ease;"
          onclick="window.virtuoVocal.toggleListening()"
        >
          ${isListening ? '⏹ Parar Assistente Vocal' : '🎤 Iniciar Assistente Vocal'}
        </button>
      </div>

    </section>
  `;
}
