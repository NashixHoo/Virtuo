// =============================================================
// VIRTUO VOCAL (PITCH MONITOR & VOCAL RANGE COACH)
// src/features/vocal/vocal-view.js
// Precision singing pitch detector, vocal range & stability monitor
// 100% Client-Side Web Audio API - Zero server latency
// =============================================================

import { virtuoVoiceDetector } from "../../audio/voice-detector.js";
import { perfMonitor } from "../../performance/performance-monitor.js";

class VirtuoVocalController {
  constructor() {
    this.isListening = false;
    this.unsubscribePitch = null;
    this.pitchHistory = []; // { note, octave, freq, cents, timestamp, stable }
    this.maxHistory = 24;
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.stableCount = 0;
    this.lastNote = null;
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
    try {
      virtuoVoiceDetector.setFilterRange(85, 1100);
      await virtuoVoiceDetector.start();
      this.isListening = true;

      this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
        this.updateUI(pitch);
      });

      this.updateButton(true);
      perfMonitor.endMeasure(token);
    } catch (err) {
      perfMonitor.endMeasure(token);
      console.warn("Falha ao iniciar monitor vocal:", err);
      alert("Não foi possível acessar o microfone para o monitor vocal.");
      this.isListening = false;
      this.updateButton(false);
    }
  }

  stop() {
    if (this.unsubscribePitch) {
      this.unsubscribePitch();
      this.unsubscribePitch = null;
    }
    virtuoVoiceDetector.stop();
    this.isListening = false;
    this.updateButton(false);
    this.resetDisplay();
  }

  resetRange() {
    this.minFreqDetected = Infinity;
    this.maxFreqDetected = 0;
    this.pitchHistory = [];
    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
    }
  }

  updateButton(listening) {
    const btn = document.getElementById("vocal-toggle-btn");
    const statusText = document.getElementById("vocal-status-banner");
    if (btn) {
      if (listening) {
        btn.innerHTML = "⏹ Parar Monitor Vocal";
        btn.style.background = "#ef4444";
        btn.style.color = "#ffffff";
      } else {
        btn.innerHTML = "🎤 Iniciar Monitor Vocal";
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
      }
    }
    if (statusText) {
      statusText.textContent = listening ? "Ouvindo canto e ressonância..." : "Microfone inativo.";
    }
  }

  resetDisplay() {
    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const confEl = document.getElementById("vocal-conf-display");
    const stabEl = document.getElementById("vocal-stability-badge");
    if (noteEl) noteEl.textContent = "—";
    if (octEl) octEl.textContent = "";
    if (freqEl) freqEl.textContent = "0.0 Hz";
    if (confEl) confEl.textContent = "0%";
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

    const noteEl = document.getElementById("vocal-note-display");
    const octEl = document.getElementById("vocal-oct-display");
    const freqEl = document.getElementById("vocal-freq-display");
    const confEl = document.getElementById("vocal-conf-display");
    const stabEl = document.getElementById("vocal-stability-badge");
    const historyContainer = document.getElementById("vocal-history-trail");
    const rangeEl = document.getElementById("vocal-range-label");
    const vocalTypeEl = document.getElementById("vocal-type-label");

    if (!pitch || !pitch.note || pitch.confidence < 0.70) {
      return;
    }

    const { note, octave, frequency, cents, confidence } = pitch;

    if (noteEl) noteEl.textContent = note;
    if (octEl) octEl.textContent = octave !== null ? octave : "";
    if (freqEl) freqEl.textContent = `${frequency.toFixed(1)} Hz`;
    if (confEl) confEl.textContent = `${Math.round(confidence * 100)}%`;

    // Estabilidade (sustentada se a mesma nota persistir)
    const isSameNote = (note === this.lastNote);
    if (isSameNote) {
      this.stableCount++;
    } else {
      this.stableCount = 0;
    }
    this.lastNote = note;

    const isStable = this.stableCount >= 4;

    if (stabEl) {
      if (isStable) {
        stabEl.textContent = "● NOTA SUSTENTADA (AFINADA)";
        stabEl.style.background = "rgba(16,185,129,0.25)";
        stabEl.style.color = "#34d399";
        stabEl.style.borderColor = "#10b981";
      } else {
        stabEl.textContent = "○ TRANSIÇÃO / VIBRATO";
        stabEl.style.background = "rgba(126,231,255,0.15)";
        stabEl.style.color = "#7EE7FF";
        stabEl.style.borderColor = "rgba(126,231,255,0.3)";
      }
    }

    // Tessitura Tracker
    if (frequency >= 85 && frequency <= 1100) {
      if (frequency < this.minFreqDetected) this.minFreqDetected = frequency;
      if (frequency > this.maxFreqDetected) this.maxFreqDetected = frequency;

      if (rangeEl) {
        rangeEl.textContent = `${this.minFreqDetected.toFixed(0)} Hz — ${this.maxFreqDetected.toFixed(0)} Hz`;
      }
      if (vocalTypeEl) {
        vocalTypeEl.textContent = this.estimateVocalType(this.minFreqDetected, this.maxFreqDetected);
      }
    }

    // Histórico de notas cantadas
    if (this.pitchHistory.length === 0 || this.pitchHistory[this.pitchHistory.length - 1].note !== `${note}${octave}`) {
      this.pitchHistory.push({
        note: `${note}${octave}`,
        freq: frequency,
        cents,
        stable: isStable
      });
      if (this.pitchHistory.length > this.maxHistory) {
        this.pitchHistory.shift();
      }

      if (historyContainer) {
        historyContainer.innerHTML = this.pitchHistory.map(item => `
          <span style="display:inline-block; padding:4px 8px; font-size:11px; font-weight:700; border-radius:6px; background:${item.stable ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${item.stable ? '#10b981' : 'rgba(255,255,255,0.1)'}; color:${item.stable ? '#34d399' : '#cbd5e1'};">
            ${item.note}
          </span>
        `).join("");
      }
    }
  }
}

export const virtuoVocal = new VirtuoVocalController();
if (typeof window !== "undefined") {
  window.virtuoVocal = virtuoVocal;
}

export function renderVocalScreen() {
  const isListening = virtuoVocal.isListening;
  const currentVocalType = virtuoVocal.estimateVocalType(virtuoVocal.minFreqDetected, virtuoVocal.maxFreqDetected);

  return `
    <section class="glass vocal-screen-container" style="max-width:700px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">
          VIRTUO VOCAL
        </span>
        <span style="font-size:11px; color:#94a3b8;" id="vocal-status-banner">
          ${isListening ? 'Ouvindo canto...' : 'Microfone inativo'}
        </span>
      </div>

      <h2 style="margin-top:8px; font-size:24px;">Monitor Vocal & Tessitura</h2>
      <p class="subtitle" style="margin-bottom:16px;">
        Detecção de pitch cantado, análise de estabilidade e mapa de extensão vocal em tempo real.
      </p>

      <!-- Painel Principal de Nota Cantada -->
      <div class="vocal-main-card" style="padding:28px 16px; background:rgba(0,0,0,0.35); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
        
        <div style="margin-bottom:12px;">
          <span id="vocal-stability-badge" class="pill" style="font-size:12px; font-weight:700; padding:6px 16px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#94a3b8;">
            ${isListening ? 'CANTE UMA NOTA' : 'INICIE O MONITOR'}
          </span>
        </div>

        <!-- Nota Gigante -->
        <div style="margin:16px 0 4px; display:flex; justify-content:center; align-items:baseline; gap:4px;">
          <span id="vocal-note-display" style="font-size:80px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 25px rgba(126,231,255,0.4);">
            —
          </span>
          <span id="vocal-oct-display" style="font-size:32px; font-weight:600; color:#7EE7FF;"></span>
        </div>

        <div style="display:flex; justify-content:center; gap:20px; font-size:13px; color:#94a3b8; margin-top:8px;">
          <div>Freq: <strong id="vocal-freq-display" style="color:#ffffff;">0.0 Hz</strong></div>
          <div>Confiança: <strong id="vocal-conf-display" style="color:#7EE7FF;">0%</strong></div>
        </div>

        <!-- Histórico Recente de Notas (Trail) -->
        <div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.02); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:8px;">Sequência de Notas Cantadas:</span>
          <div id="vocal-history-trail" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; min-height:28px;">
            <span style="font-size:12px; color:#64748b;">Nenhuma nota cantada ainda nesta sessão</span>
          </div>
        </div>
      </div>

      <!-- Card de Classificação Vocal e Tessitura -->
      <div style="margin-top:16px; padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:14px; color:#7EE7FF;">Extensão Vocal da Sessão</h3>
          <button class="tag-btn" style="padding:3px 8px; font-size:10px;" onclick="window.virtuoVocal.resetRange()">Resetar Faixa</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
          <div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:12px;">
            <span style="font-size:11px; color:#94a3b8; display:block;">Classificação Estimada</span>
            <strong id="vocal-type-label" style="font-size:16px; color:#ffffff;">${currentVocalType}</strong>
          </div>
          <div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:12px;">
            <span style="font-size:11px; color:#94a3b8; display:block;">Tessitura Atingida</span>
            <strong id="vocal-range-label" style="font-size:14px; color:#7EE7FF;">
              ${virtuoVocal.minFreqDetected !== Infinity ? `${virtuoVocal.minFreqDetected.toFixed(0)} Hz — ${virtuoVocal.maxFreqDetected.toFixed(0)} Hz` : "—"}
            </strong>
          </div>
        </div>
      </div>

      <!-- Botão Gigante de Ação -->
      <div style="margin-top:20px; text-align:center;">
        <button 
          id="vocal-toggle-btn"
          class="button primary" 
          style="width:100%; max-width:320px; padding:16px 24px; font-size:16px; font-weight:700; border-radius:16px; background:${isListening ? '#ef4444' : '#7EE7FF'}; color:${isListening ? '#ffffff' : '#07101F'}; box-shadow:0 6px 20px rgba(0,0,0,0.4);"
          onclick="window.virtuoVocal.toggleListening()"
        >
          ${isListening ? '⏹ Parar Monitor Vocal' : '🎤 Iniciar Monitor Vocal'}
        </button>
      </div>
    </section>
  `;
}
