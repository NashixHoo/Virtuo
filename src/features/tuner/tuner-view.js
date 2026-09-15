// =============================================================
// VIRTUO AFINADOR (CHROMATIC & INSTRUMENT TUNER)
// src/features/tuner/tuner-view.js
// Precision tuning with Web Audio API Voice Detector
// High-contrast, single-hand friendly UI for stage and rehearsal
// =============================================================

import { virtuoVoiceDetector } from "../../audio/voice-detector.js";
import { perfMonitor } from "../../performance/performance-monitor.js";

export const TUNER_INSTRUMENTS = {
  chromatic: {
    id: "chromatic",
    name: "Cromático Livre",
    icon: "🎵",
    strings: []
  },
  guitar: {
    id: "guitar",
    name: "Violão / Guitarra (6C)",
    icon: "🎸",
    strings: [
      { note: "E", octave: 2, freq: 82.4, label: "6ª Mi (E2)" },
      { note: "A", octave: 2, freq: 110.0, label: "5ª Lá (A2)" },
      { note: "D", octave: 3, freq: 146.8, label: "4ª Ré (D3)" },
      { note: "G", octave: 3, freq: 196.0, label: "3ª Sol (G3)" },
      { note: "B", octave: 3, freq: 246.9, label: "2ª Si (B3)" },
      { note: "E", octave: 4, freq: 329.6, label: "1ª Mi (E4)" }
    ]
  },
  bass4: {
    id: "bass4",
    name: "Baixo (4 Cordas)",
    icon: "🎸",
    strings: [
      { note: "E", octave: 1, freq: 41.2, label: "4ª Mi (E1)" },
      { note: "A", octave: 1, freq: 55.0, label: "3ª Lá (A1)" },
      { note: "D", octave: 2, freq: 73.4, label: "2ª Ré (D2)" },
      { note: "G", octave: 2, freq: 98.0, label: "1ª Sol (G2)" }
    ]
  },
  ukulele: {
    id: "ukulele",
    name: "Ukulele / Cavaquinho",
    icon: "🪕",
    strings: [
      { note: "G", octave: 4, freq: 392.0, label: "4ª Sol (G4)" },
      { note: "C", octave: 4, freq: 261.6, label: "3ª Dó (C4)" },
      { note: "E", octave: 4, freq: 329.6, label: "2ª Mi (E4)" },
      { note: "A", octave: 4, freq: 440.0, label: "1ª Lá (A4)" }
    ]
  }
};

class VirtuoTunerController {
  constructor() {
    this.selectedInstrument = "guitar";
    this.selectedStringIndex = -1; // -1 = auto detect
    this.lastPitch = null;
    this.unsubscribePitch = null;
    this.isListening = false;
  }

  async toggleListening() {
    if (this.isListening) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    const token = perfMonitor.startMeasure("tuner_start");
    try {
      // Baixo precisa de filtro mais grave
      if (this.selectedInstrument === "bass4") {
        virtuoVoiceDetector.setFilterRange(35, 600);
      } else {
        virtuoVoiceDetector.setFilterRange(70, 1100);
      }

      await virtuoVoiceDetector.start();
      this.isListening = true;

      this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
        this.lastPitch = pitch;
        this.updateUI(pitch);
      });

      this.updateStateButton(true);
      perfMonitor.endMeasure(token);
    } catch (err) {
      perfMonitor.endMeasure(token);
      console.warn("Falha ao iniciar afinador:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
      this.isListening = false;
      this.updateStateButton(false);
    }
  }

  stop() {
    if (this.unsubscribePitch) {
      this.unsubscribePitch();
      this.unsubscribePitch = null;
    }
    virtuoVoiceDetector.stop();
    this.isListening = false;
    this.lastPitch = null;
    this.updateStateButton(false);
    this.resetDisplay();
  }

  setInstrument(instId) {
    if (TUNER_INSTRUMENTS[instId]) {
      this.selectedInstrument = instId;
      this.selectedStringIndex = -1;
      if (this.isListening) {
        if (instId === "bass4") {
          virtuoVoiceDetector.setFilterRange(35, 600);
        } else {
          virtuoVoiceDetector.setFilterRange(70, 1100);
        }
      }
      if (window.renderCurrentScreen) {
        window.renderCurrentScreen();
      }
    }
  }

  selectString(idx) {
    this.selectedStringIndex = idx;
    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
    }
  }

  updateStateButton(listening) {
    const btn = document.getElementById("tuner-toggle-btn");
    const statusText = document.getElementById("tuner-status-banner");
    if (btn) {
      if (listening) {
        btn.innerHTML = "⏹ Parar Afinador";
        btn.classList.add("listening");
        btn.style.background = "#ef4444";
        btn.style.color = "#ffffff";
      } else {
        btn.innerHTML = "🎤 Iniciar Afinador";
        btn.classList.remove("listening");
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
      }
    }
    if (statusText) {
      statusText.textContent = listening ? "Ouvindo vibração da corda / microfone..." : "Microfone inativo. Toque para iniciar.";
    }
  }

  resetDisplay() {
    const noteEl = document.getElementById("tuner-note-display");
    const octaveEl = document.getElementById("tuner-octave-display");
    const freqEl = document.getElementById("tuner-freq-display");
    const needleEl = document.getElementById("tuner-needle");
    const centsEl = document.getElementById("tuner-cents-text");
    const badgeEl = document.getElementById("tuner-accuracy-badge");

    if (noteEl) noteEl.textContent = "—";
    if (octaveEl) octaveEl.textContent = "";
    if (freqEl) freqEl.textContent = "0.0 Hz";
    if (needleEl) needleEl.style.transform = "translateX(-50%) rotate(0deg)";
    if (centsEl) centsEl.textContent = "0 cents";
    if (badgeEl) {
      badgeEl.textContent = "AGUARDANDO SOM";
      badgeEl.style.background = "rgba(255,255,255,0.06)";
      badgeEl.style.color = "#94a3b8";
    }
  }

  updateUI(pitch) {
    if (!this.isListening) return;

    const noteEl = document.getElementById("tuner-note-display");
    const octaveEl = document.getElementById("tuner-octave-display");
    const freqEl = document.getElementById("tuner-freq-display");
    const needleEl = document.getElementById("tuner-needle");
    const centsEl = document.getElementById("tuner-cents-text");
    const badgeEl = document.getElementById("tuner-accuracy-badge");

    if (!pitch || !pitch.note || pitch.confidence < 0.70) {
      if (badgeEl && (!pitch || pitch.frequency === 0)) {
        badgeEl.textContent = "TOQUE A CORDA";
        badgeEl.style.background = "rgba(255,255,255,0.06)";
        badgeEl.style.color = "#94a3b8";
      }
      return;
    }

    const { note, octave, frequency, cents } = pitch;

    if (noteEl) noteEl.textContent = note;
    if (octaveEl) octaveEl.textContent = octave !== null ? octave : "";
    if (freqEl) freqEl.textContent = `${frequency.toFixed(1)} Hz`;

    // Cents limit: -50 a +50
    const clampedCents = Math.max(-50, Math.min(50, cents));
    // Ângulo da agulha: -50 cents = -45deg, +50 cents = +45deg
    const angle = (clampedCents / 50) * 45;

    if (needleEl) {
      needleEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    if (centsEl) {
      centsEl.textContent = `${cents > 0 ? "+" : ""}${cents} cents`;
    }

    if (badgeEl) {
      if (Math.abs(cents) <= 5) {
        badgeEl.textContent = "PERFEITO (AFINADO)";
        badgeEl.style.background = "rgba(16,185,129,0.25)";
        badgeEl.style.color = "#34d399";
        badgeEl.style.borderColor = "#10b981";
      } else if (cents < -5) {
        badgeEl.textContent = "BAIXO (APERTE A TARRAXA)";
        badgeEl.style.background = "rgba(245,158,11,0.2)";
        badgeEl.style.color = "#fbbf24";
        badgeEl.style.borderColor = "#f59e0b";
      } else {
        badgeEl.textContent = "ALTO (AFROUXE A TARRAXA)";
        badgeEl.style.background = "rgba(239,68,68,0.2)";
        badgeEl.style.color = "#f87171";
        badgeEl.style.borderColor = "#ef4444";
      }
    }
  }
}

export const virtuoTuner = new VirtuoTunerController();
if (typeof window !== "undefined") {
  window.virtuoTuner = virtuoTuner;
}

export function renderTunerScreen() {
  const inst = TUNER_INSTRUMENTS[virtuoTuner.selectedInstrument] || TUNER_INSTRUMENTS.guitar;
  const isListening = virtuoTuner.isListening;

  return `
    <section class="glass tuner-screen-container" style="max-width:700px; margin:0 auto;">
      <!-- Header do Afinador -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">
          VIRTUO AFINADOR
        </span>
        <span style="font-size:11px; color:#94a3b8;" id="tuner-status-banner">
          ${isListening ? 'Ouvindo microfone...' : 'Microfone inativo'}
        </span>
      </div>

      <h2 style="margin-top:8px; font-size:24px;">Afinador Cromático de Alta Precisão</h2>
      <p class="subtitle" style="margin-bottom:16px;">
        Algoritmo sub-sample por autocorrelação direta. Afine violão, guitarra, baixo ou voz em tempo real.
      </p>

      <!-- Seletor de Instrumentos -->
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
        ${Object.keys(TUNER_INSTRUMENTS).map(key => {
          const item = TUNER_INSTRUMENTS[key];
          const isAct = virtuoTuner.selectedInstrument === key;
          return `
            <button 
              class="band-key-chip ${isAct ? 'active' : ''}" 
              onclick="window.virtuoTuner.setInstrument('${key}')"
              style="padding:6px 14px; font-size:12px; border-radius:999px; background:${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.06)'}; color:${isAct ? '#07101F' : '#E2E8F0'}; font-weight:${isAct ? '700' : '400'}; border:1px solid ${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.12)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px;"
            >
              <span>${item.icon}</span>
              <span>${item.name}</span>
            </button>
          `;
        }).join("")}
      </div>

      <!-- Guia de Cordas do Instrumento Selecionado -->
      ${inst.strings.length > 0 ? `
        <div style="margin-bottom:16px; padding:10px 14px; background:rgba(0,0,0,0.25); border-radius:14px;">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:8px;">Cordas de Referência:</span>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${inst.strings.map((str, idx) => `
              <button 
                onclick="window.virtuoTuner.selectString(${idx})"
                style="padding:4px 10px; font-size:11px; border-radius:8px; background:${virtuoTuner.selectedStringIndex === idx ? 'rgba(126,231,255,0.25)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${virtuoTuner.selectedStringIndex === idx ? '#7EE7FF' : 'rgba(255,255,255,0.1)'}; color:${virtuoTuner.selectedStringIndex === idx ? '#7EE7FF' : '#cbd5e1'}; cursor:pointer;"
              >
                <strong>${str.note}${str.octave}</strong> (${str.freq}Hz)
              </button>
            `).join("")}
          </div>
        </div>
      ` : ''}

      <!-- Painel Principal do Afinador (Dial / Agulha / Nota Gigante) -->
      <div class="tuner-main-card" style="padding:28px 16px; background:rgba(0,0,0,0.35); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center; position:relative; overflow:hidden;">
        
        <!-- Status de Afinação (Badge) -->
        <div style="margin-bottom:14px;">
          <span id="tuner-accuracy-badge" class="pill" style="font-size:13px; font-weight:700; padding:6px 18px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#94a3b8; letter-spacing:0.5px;">
            ${isListening ? 'TOQUE A CORDA' : 'INICIE O AFINADOR'}
          </span>
        </div>

        <!-- Arco do Medidor com Agulha -->
        <div class="tuner-arc-wrapper" style="position:relative; width:260px; height:130px; margin:0 auto 10px; border-top-left-radius:140px; border-top-right-radius:140px; border-top:3px solid rgba(255,255,255,0.15); border-left:3px solid rgba(255,255,255,0.15); border-right:3px solid rgba(255,255,255,0.15);">
          <!-- Marcação Central (Verde) -->
          <div style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:6px; height:18px; background:#10b981; border-radius:3px; box-shadow:0 0 10px rgba(16,185,129,0.7);"></div>
          <!-- Marcações Laterais -->
          <div style="position:absolute; top:20px; left:18px; font-size:10px; color:#f87171;">-50</div>
          <div style="position:absolute; top:8px; left:25%; font-size:10px; color:#fbbf24;">-25</div>
          <div style="position:absolute; top:8px; right:25%; font-size:10px; color:#fbbf24;">+25</div>
          <div style="position:absolute; top:20px; right:18px; font-size:10px; color:#f87171;">+50</div>

          <!-- Agulha de Alta Precisão -->
          <div id="tuner-needle" style="position:absolute; bottom:0; left:50%; width:3px; height:105px; background:linear-gradient(to top, #ffffff, #7EE7FF); transform-origin:bottom center; transform:translateX(-50%) rotate(0deg); transition:transform 0.08s ease-out; border-radius:2px; box-shadow:0 0 12px rgba(126,231,255,0.8);"></div>
          <!-- Pivô da agulha -->
          <div style="position:absolute; bottom:-8px; left:50%; transform:translateX(-50%); width:16px; height:16px; background:#7EE7FF; border-radius:50%; border:2px solid #07101F;"></div>
        </div>

        <!-- Cents Offset -->
        <div style="margin-top:14px; font-size:14px; color:#7EE7FF; font-weight:700;" id="tuner-cents-text">
          0 cents
        </div>

        <!-- Nota Detectada Gigante -->
        <div style="margin:16px 0 8px; display:flex; justify-content:center; align-items:baseline; gap:4px;">
          <span id="tuner-note-display" style="font-size:72px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 20px rgba(126,231,255,0.4);">
            —
          </span>
          <span id="tuner-octave-display" style="font-size:28px; font-weight:600; color:#7EE7FF;"></span>
        </div>

        <!-- Frequência em Hz -->
        <div id="tuner-freq-display" style="font-size:14px; color:#94a3b8; font-family:monospace;">
          0.0 Hz
        </div>
      </div>

      <!-- Botão Gigante de Ação (1 Toque) -->
      <div style="margin-top:20px; text-align:center;">
        <button 
          id="tuner-toggle-btn"
          class="button primary" 
          style="width:100%; max-width:320px; padding:16px 24px; font-size:16px; font-weight:700; border-radius:16px; background:${isListening ? '#ef4444' : '#7EE7FF'}; color:${isListening ? '#ffffff' : '#07101F'}; box-shadow:0 6px 20px rgba(0,0,0,0.4);"
          onclick="window.virtuoTuner.toggleListening()"
        >
          ${isListening ? '⏹ Parar Afinador' : '🎤 Iniciar Afinador'}
        </button>
      </div>
    </section>
  `;
}
