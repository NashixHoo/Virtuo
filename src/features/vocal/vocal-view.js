// =============================================================
// VIRTUO VOCAL (PITCH MONITOR, AFINADOR VOCAL & TREINAMENTO)
// src/features/vocal/vocal-view.js
// Precision singing pitch detector, vocal tuner, note & interval coach
// 100% Client-Side Web Audio API - Zero server latency, zero audio transmission
// =============================================================

import { virtuoVoiceDetector, VOCAL_INTERVALS, NOTE_NAMES } from "../../audio/voice-detector.js";
import { vocalTrainer, VOCAL_TRAINING_LEVELS } from "./vocal-trainer.js";
import { performanceHistory } from "../performance/performance-history.js";
import { perfMonitor } from "../../performance/performance-monitor.js";

class VirtuoVocalController {
  constructor() {
    this.isListening = false;
    this.activeTab = "tuner"; // "tuner" | "notes" | "intervals" | "history"
    this.permissionState = "prompt"; // "prompt" | "granted" | "denied"
    this.errorMessage = null;

    this.unsubscribePitch = null;
    this.pitchHistory = []; // { note, freq, cents, stable }
    this.maxHistory = 16;
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.stableCount = 0;
    this.lastNote = null;

    // Live Frame Data
    this.currentPitch = null;
    this.noteTrainerResult = null;
    this.intervalTrainerResult = null;
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

      this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
        this.updateUI(pitch);
      });

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
    virtuoVoiceDetector.stop();
    this.isListening = false;
    this.currentPitch = null;
    this.updateListeningUI(false);
    this.resetDisplay();
  }

  resetRange() {
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.pitchHistory = [];
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  updateListeningUI(listening) {
    const btn = document.getElementById("vocal-toggle-btn");
    const statusText = document.getElementById("vocal-status-banner");
    const micBadge = document.getElementById("vocal-mic-active-badge");

    if (btn) {
      if (listening) {
        btn.innerHTML = "⏹ Parar Monitor";
        btn.style.background = "#ef4444";
        btn.style.color = "#ffffff";
      } else {
        btn.innerHTML = "🎤 Iniciar Monitor";
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
      }
    }
    if (statusText) {
      statusText.textContent = listening ? "Ouvindo canto e ressonância..." : "Microfone inativo.";
    }
    if (micBadge) {
      micBadge.style.display = listening ? "inline-flex" : "none";
    }
  }

  resetDisplay() {
    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const confEl = document.getElementById("vocal-conf-display");
    const stabEl = document.getElementById("vocal-stability-badge");
    const needleEl = document.getElementById("vocal-tuner-needle");
    const centsTextEl = document.getElementById("vocal-cents-text");
    const tunerStateEl = document.getElementById("vocal-tuner-state-label");

    if (noteEl) noteEl.textContent = "—";
    if (octEl) octEl.textContent = "";
    if (freqEl) freqEl.textContent = "0.0 Hz";
    if (confEl) confEl.textContent = "0%";
    if (needleEl) needleEl.style.left = "50%";
    if (centsTextEl) centsTextEl.textContent = "0 cents";
    if (tunerStateEl) {
      tunerStateEl.textContent = "Aguardando Canto";
      tunerStateEl.style.color = "#94a3b8";
    }
    if (stabEl) {
      stabEl.textContent = "AGUARDANDO VOZ";
      stabEl.style.background = "rgba(255,255,255,0.06)";
      stabEl.style.color = "#94a3b8";
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

  updateUI(pitch) {
    if (!this.isListening) return;
    this.currentPitch = pitch;

    // Atualiza o sub-modo ativo
    if (this.activeTab === "notes") {
      this.noteTrainerResult = vocalTrainer.processNoteFrame(pitch);
      this._updateNoteTrainerUI(this.noteTrainerResult, pitch);
    } else if (this.activeTab === "intervals") {
      this.intervalTrainerResult = vocalTrainer.processIntervalFrame(pitch);
      this._updateIntervalTrainerUI(this.intervalTrainerResult, pitch);
    }

    if (!pitch || pitch.isSilence || !pitch.note || pitch.confidence < 0.65) {
      return;
    }

    const { note, octave, frequency, cents, confidence, stability, stabilityLabel } = pitch;

    // Atualiza Afinador Geral
    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const confEl = document.getElementById("vocal-conf-display");
    const stabEl = document.getElementById("vocal-stability-badge");
    const centsTextEl = document.getElementById("vocal-cents-text");
    const tunerStateEl = document.getElementById("vocal-tuner-state-label");
    const needleEl = document.getElementById("vocal-tuner-needle");

    if (noteEl) noteEl.textContent = note;
    if (octEl) octEl.textContent = octave !== null ? octave : "";
    if (freqEl) freqEl.textContent = `${frequency.toFixed(1)} Hz`;
    if (confEl) confEl.textContent = `${Math.round(confidence * 100)}%`;

    // Cents & Needle Position
    const clampedCents = Math.max(-50, Math.min(50, cents));
    if (centsTextEl) {
      centsTextEl.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
      centsTextEl.style.color = Math.abs(cents) <= 8 ? '#34d399' : Math.abs(cents) <= 20 ? '#facc15' : '#f87171';
    }

    if (needleEl) {
      // 50% é o centro (0 cents). Mapeia de -50 cents (0%) a +50 cents (100%)
      const needlePct = 50 + (clampedCents);
      needleEl.style.left = `${needlePct}%`;
      needleEl.style.background = Math.abs(cents) <= 8 ? '#10b981' : Math.abs(cents) <= 20 ? '#facc15' : '#ef4444';
    }

    // Label do Afinador: "Afinado", "Suba", "Desça", "Muito baixo", "Muito alto"
    if (tunerStateEl) {
      if (Math.abs(cents) <= 8) {
        tunerStateEl.textContent = "● Afinado";
        tunerStateEl.style.color = "#34d399";
      } else if (cents < -20) {
        tunerStateEl.textContent = "▲ Muito baixo";
        tunerStateEl.style.color = "#f87171";
      } else if (cents < -8) {
        tunerStateEl.textContent = "▲ Suba";
        tunerStateEl.style.color = "#facc15";
      } else if (cents > 20) {
        tunerStateEl.textContent = "▼ Muito alto";
        tunerStateEl.style.color = "#f87171";
      } else {
        tunerStateEl.textContent = "▼ Desça";
        tunerStateEl.style.color = "#facc15";
      }
    }

    // Estabilidade da Nota
    const isSameNote = (note === this.lastNote);
    if (isSameNote) {
      this.stableCount++;
    } else {
      this.stableCount = 0;
    }
    this.lastNote = note;

    if (stabEl) {
      stabEl.textContent = `ESTABILIDADE: ${stabilityLabel.toUpperCase()} (${stability}%)`;
      if (stability >= 75) {
        stabEl.style.background = "rgba(16,185,129,0.25)";
        stabEl.style.color = "#34d399";
        stabEl.style.borderColor = "#10b981";
      } else if (stability >= 50) {
        stabEl.style.background = "rgba(250,204,21,0.2)";
        stabEl.style.color = "#facc15";
        stabEl.style.borderColor = "#facc15";
      } else {
        stabEl.style.background = "rgba(239,68,68,0.2)";
        stabEl.style.color = "#f87171";
        stabEl.style.borderColor = "#ef4444";
      }
    }

    // Tessitura Tracker
    if (frequency >= 85 && frequency <= 1100) {
      if (frequency < this.minFreqDetected) this.minFreqDetected = frequency;
      if (frequency > this.maxFreqDetected) this.maxFreqDetected = frequency;

      const rangeEl = document.getElementById("vocal-range-label");
      const vocalTypeEl = document.getElementById("vocal-type-label");
      if (rangeEl) rangeEl.textContent = `${this.minFreqDetected.toFixed(0)} Hz — ${this.maxFreqDetected.toFixed(0)} Hz`;
      if (vocalTypeEl) vocalTypeEl.textContent = this.estimateVocalType(this.minFreqDetected, this.maxFreqDetected);
    }
  }

  _updateNoteTrainerUI(res, pitch) {
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

  _updateIntervalTrainerUI(res, pitch) {
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

export function renderVocalScreen() {
  const isListening = virtuoVocal.isListening;
  const activeTab = virtuoVocal.activeTab;
  const currentVocalType = virtuoVocal.estimateVocalType(virtuoVocal.minFreqDetected, virtuoVocal.maxFreqDetected);
  const perfStats = virtuoVoiceDetector.getPerformanceStats();
  const historySessions = performanceHistory.getAllSessions().slice(0, 10);

  return `
    <section class="glass vocal-screen-container" style="max-width:760px; margin:0 auto;">
      <!-- Header com Badge de Privacidade e Status de Microfone -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">
            🎤 VIRTUO VOCAL
          </span>
          <span id="vocal-mic-active-badge" class="pill" style="display:${isListening ? 'inline-flex' : 'none'}; background:rgba(239,68,68,0.2); color:#ef4444; border-color:#ef4444; font-size:11px; font-weight:700; animation:pulse 1.5s infinite;">
            🔴 MIC ATIVO (Processamento 100% Local)
          </span>
        </div>
        <span style="font-size:11px; color:#94a3b8;" id="vocal-status-banner">
          ${isListening ? 'Ouvindo canto...' : 'Microfone inativo'}
        </span>
      </div>

      <!-- Alerta de Erro / Permissão Amigável -->
      ${virtuoVocal.errorMessage ? `
        <div style="padding:12px 16px; background:rgba(239,68,68,0.15); border:1px solid #ef4444; border-radius:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="font-size:12px; color:#fca5a5;">
            ⚠️ ${virtuoVocal.errorMessage}
          </div>
          <button class="tag-btn" onclick="window.virtuoVocal.errorMessage = null; if(window.renderCurrentScreen) window.renderCurrentScreen();" style="padding:3px 8px; font-size:10px;">Fechar</button>
        </div>
      ` : ''}

      <!-- Navegação por Sub-Abas do Vocal -->
      <div style="display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px; overflow-x:auto;">
        <button 
          class="tag-btn ${activeTab === 'tuner' ? 'active' : ''}" 
          style="padding:6px 14px; font-size:12px; font-weight:700;"
          onclick="window.virtuoVocal.setTab('tuner')"
        >
          🎯 Afinador Vocal
        </button>
        <button 
          class="tag-btn ${activeTab === 'notes' ? 'active' : ''}" 
          style="padding:6px 14px; font-size:12px; font-weight:700;"
          onclick="window.virtuoVocal.setTab('notes')"
        >
          🎵 Treino de Notas
        </button>
        <button 
          class="tag-btn ${activeTab === 'intervals' ? 'active' : ''}" 
          style="padding:6px 14px; font-size:12px; font-weight:700;"
          onclick="window.virtuoVocal.setTab('intervals')"
        >
          📐 Treino de Intervalos
        </button>
        <button 
          class="tag-btn ${activeTab === 'history' ? 'active' : ''}" 
          style="padding:6px 14px; font-size:12px; font-weight:700;"
          onclick="window.virtuoVocal.setTab('history')"
        >
          📋 Histórico
        </button>
      </div>

      <!-- CONTEÚDO DA ABA 1: AFINADOR VOCAL -->
      ${activeTab === 'tuner' ? `
        <!-- Painel Principal de Nota Cantada -->
        <div class="vocal-main-card" style="padding:24px 16px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
          
          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:12px;">
            <span id="vocal-stability-badge" class="pill" style="font-size:11px; font-weight:700; padding:4px 14px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#94a3b8;">
              ${isListening ? 'CANTE UMA NOTA' : 'INICIE O MONITOR'}
            </span>
            <span id="vocal-tuner-state-label" class="pill" style="font-size:11px; font-weight:700; padding:4px 14px; border:1px solid rgba(255,255,255,0.15); background:rgba(0,0,0,0.3); color:#94a3b8;">
              Aguardando Canto
            </span>
          </div>

          <!-- Nota Gigante Cantada -->
          <div style="margin:8px 0 2px; display:flex; justify-content:center; align-items:baseline; gap:4px;">
            <span id="vocal-note-display" style="font-size:84px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 28px rgba(126,231,255,0.45);">
              —
            </span>
            <span id="vocal-oct-display" style="font-size:34px; font-weight:700; color:#7EE7FF;"></span>
          </div>

          <!-- Desvio em Cents -->
          <div id="vocal-cents-text" style="font-size:18px; font-weight:800; color:#cbd5e1; margin-bottom:14px;">
            0 cents
          </div>

          <!-- Régua / Gauge de Afinação Vocal: ●─────── -->
          <div style="max-width:360px; margin:0 auto 16px; position:relative; padding:0 8px;">
            <div style="height:8px; background:rgba(255,255,255,0.1); border-radius:4px; position:relative; overflow:hidden;">
              <!-- Marca Central de Afinado -->
              <div style="position:absolute; left:48%; width:4%; top:0; bottom:0; background:#10b981; opacity:0.8;"></div>
            </div>
            <!-- Agulha Deslizante -->
            <div id="vocal-tuner-needle" style="position:absolute; top:-3px; left:50%; width:14px; height:14px; border-radius:50%; background:#7EE7FF; transform:translateX(-50%); box-shadow:0 0 10px #7EE7FF; transition:left 0.08s ease-out;"></div>

            <!-- Labels da Régua -->
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:8px;">
              <span>Muito Baixo (-50)</span>
              <span style="color:#34d399; font-weight:700;">Afinado (0)</span>
              <span>Muito Alto (+50)</span>
            </div>
          </div>

          <div style="display:flex; justify-content:center; gap:20px; font-size:12px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-top:12px;">
            <div>Freq: <strong id="vocal-freq-display" style="color:#ffffff;">0.0 Hz</strong></div>
            <div>Confiança: <strong id="vocal-conf-display" style="color:#7EE7FF;">0%</strong></div>
            <div>Latência: <strong style="color:#a78bfa;">${perfStats.averageProcessingMs || '< 0.5'} ms</strong></div>
          </div>
        </div>

        <!-- Card de Tessitura e Classificação Vocal -->
        <div style="margin-top:14px; padding:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:13px; color:#7EE7FF; margin:0;">Extensão Vocal (Tessitura da Sessão)</h3>
            <button class="tag-btn" style="padding:2px 8px; font-size:10px;" onclick="window.virtuoVocal.resetRange()">Resetar Faixa</button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Classificação Estimada</span>
              <strong id="vocal-type-label" style="font-size:15px; color:#ffffff;">${currentVocalType}</strong>
            </div>
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Faixa Atingida</span>
              <strong id="vocal-range-label" style="font-size:13px; color:#7EE7FF;">
                ${virtuoVocal.minFreqDetected !== Infinity ? `${virtuoVocal.minFreqDetected.toFixed(0)} Hz — ${virtuoVocal.maxFreqDetected.toFixed(0)} Hz` : "—"}
              </strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- CONTEÚDO DA ABA 2: TREINO DE NOTAS -->
      ${activeTab === 'notes' ? `
        <div style="padding:20px 16px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
          <span class="pill" style="background:rgba(99,102,241,0.2); color:#a5b4fc; border-color:#818cf8; margin-bottom:8px;">
            DESAFIO DE NOTA SUSTENTADA
          </span>
          
          <h3 style="font-size:18px; margin:6px 0 2px;">
            Cante: <span style="color:#7EE7FF; font-size:32px; font-weight:900; margin-left:4px;">${vocalTrainer.targetNote}${vocalTrainer.targetOctave}</span>
          </h3>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
            Mantenha a nota afinada (±25 cents) por 1 segundo para validar a sustentação.
          </p>

          <!-- Botões de Controle de Nota -->
          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="button secondary" style="padding:6px 14px; font-size:12px;" onclick="window.vocalTrainer.playNoteReference()">
              🔊 Ouvir Tom de Referência
            </button>
            <button class="tag-btn" onclick="window.vocalTrainer.resetTrial(); if(window.renderCurrentScreen) window.renderCurrentScreen();" style="font-size:11px;">
              🔄 Reiniciar Desafio
            </button>
          </div>

          <!-- Seletor Rápido de Notas -->
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

          <!-- Barra de Progresso da Sustentação -->
          <div style="max-width:320px; margin:0 auto 12px; background:rgba(255,255,255,0.08); height:12px; border-radius:6px; overflow:hidden;">
            <div id="note-trainer-progress-bar" style="width:0%; height:100%; background:#7EE7FF; transition:width 0.1s linear;"></div>
          </div>

          <!-- Feedback em Tempo Real -->
          <div id="note-trainer-feedback" style="font-size:14px; font-weight:700; color:#cbd5e1; min-height:22px; margin-bottom:8px;">
            ${vocalTrainer.lastFeedback}
          </div>

          <div style="font-size:12px; color:#94a3b8;">
            Pontuação: <strong id="note-trainer-score" style="color:#ffffff; font-size:16px;">${vocalTrainer.noteScore} pts</strong>
          </div>
        </div>
      ` : ''}

      <!-- CONTEÚDO DA ABA 3: TREINO DE INTERVALOS -->
      ${activeTab === 'intervals' ? `
        <div style="padding:20px 16px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
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

          <!-- Seletor de Intervalos Suportados (8 intervalos da especificação) -->
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

          <!-- Feedback do Intervalo -->
          <div id="interval-trainer-feedback" style="font-size:14px; font-weight:700; color:#cbd5e1; min-height:22px; margin-bottom:8px;">
            ${vocalTrainer.intervalFeedback}
          </div>

          <div style="font-size:12px; color:#94a3b8;">
            Precisão: <strong id="interval-trainer-score" style="color:#ffffff; font-size:16px;">${vocalTrainer.intervalScore} pts</strong>
          </div>
        </div>
      ` : ''}

      <!-- CONTEÚDO DA ABA 4: HISTÓRICO LOCAL -->
      ${activeTab === 'history' ? `
        <div style="padding:16px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:20px;">
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
              Nenhuma sessão de treino ou performance realizada ainda.
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

      <!-- Botão Central de Início / Parada do Monitor -->
      <div style="margin-top:20px; text-align:center;">
        <button 
          id="vocal-toggle-btn"
          class="button primary" 
          style="width:100%; max-width:320px; padding:15px 24px; font-size:16px; font-weight:700; border-radius:16px; background:${isListening ? '#ef4444' : '#7EE7FF'}; color:${isListening ? '#ffffff' : '#07101F'}; box-shadow:0 6px 20px rgba(0,0,0,0.4);"
          onclick="window.virtuoVocal.toggleListening()"
        >
          ${isListening ? '⏹ Parar Monitor Vocal' : '🎤 Iniciar Monitor Vocal'}
        </button>
      </div>
    </section>
  `;
}
