// =============================================================
// VIRTUO AFINADOR PRO (CHROMATIC & INSTRUMENT TUNER 2.1)
// src/features/tuner/tuner-view.js
//
// Performance Musical Premium:
// - Exponential Moving Average (EMA, alpha = 0.18)
// - Zona de Estabilidade (Dead Zone ±2 cents, High Precision ±5 cents)
// - Inércia Visual com Easing (Máximo 180ms)
// - Separação entre Frequência Real vs. Frequência Exibida
// - Filtro Passa-Banda com Presets: Violão, Guitarra, Baixo, Voz, Ukulele
// - Confidence Score e Rejeição de Sinal Fraco ("Sinal muito fraco")
// - Renderização Fluida a 60 FPS via requestAnimationFrame
// =============================================================

import { virtuoVoiceDetector } from "../../audio/voice-detector.js";
import { perfMonitor } from "../../performance/performance-monitor.js";
import { TunerSmoother, TUNER_STATES } from "./tuner-smoothing.js";
import { TUNER_PRESETS, TUNER_INSTRUMENTS } from "./tuner-presets.js";

export { TUNER_PRESETS, TUNER_INSTRUMENTS };

class VirtuoTunerController {
  constructor() {
    this.selectedInstrument = "guitar";
    this.selectedStringIndex = -1; // -1 = auto detect
    this.isListening = false;
    this.unsubscribePitch = null;
    this.rafId = null;

    // Smoother matematicamente balanceado
    this.smoother = new TunerSmoother({
      alpha: 0.18,
      confidenceThreshold: 0.70
    });

    // Cache de referências DOM para evitar queries a cada frame
    this.dom = {
      noteEl: null,
      octaveEl: null,
      freqEl: null,
      needleEl: null,
      centsEl: null,
      badgeEl: null,
      cardEl: null,
      centerMarkEl: null
    };

    this.lastRenderedState = null;
  }

  _cacheDom() {
    this.dom.noteEl = document.getElementById("tuner-note-display");
    this.dom.octaveEl = document.getElementById("tuner-octave-display");
    this.dom.freqEl = document.getElementById("tuner-freq-display");
    this.dom.needleEl = document.getElementById("tuner-needle");
    this.dom.centsEl = document.getElementById("tuner-cents-text");
    this.dom.badgeEl = document.getElementById("tuner-accuracy-badge");
    this.dom.cardEl = document.getElementById("tuner-main-card");
    this.dom.centerMarkEl = document.getElementById("tuner-center-mark");
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
      this.applyActivePreset();

      await virtuoVoiceDetector.start();
      this.isListening = true;
      this.smoother.reset();

      this._cacheDom();

      // O detector de pitch alimenta o smoother sem forçar render direto
      this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
        this.smoother.feedPitch(pitch);
      });

      // Inicia o loop de animação desacoplado a 60 FPS
      this._startVisualLoop();

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
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.unsubscribePitch) {
      this.unsubscribePitch();
      this.unsubscribePitch = null;
    }

    virtuoVoiceDetector.stop();
    this.isListening = false;
    this.smoother.reset();
    this.updateStateButton(false);
    this.resetDisplay();
  }

  applyActivePreset() {
    const preset = TUNER_PRESETS[this.selectedInstrument] || TUNER_PRESETS.guitar;
    this.smoother.confidenceThreshold = preset.confidenceThreshold || 0.70;
    virtuoVoiceDetector.setFilterRange(preset.lowCutoff, preset.highCutoff, preset.confidenceThreshold);
  }

  setInstrument(instId) {
    if (TUNER_PRESETS[instId]) {
      this.selectedInstrument = instId;
      this.selectedStringIndex = -1;
      this.applyActivePreset();

      if (window.renderCurrentScreen) {
        window.renderCurrentScreen();
        this._cacheDom();
      }
    }
  }

  selectString(idx) {
    this.selectedStringIndex = idx;
    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
      this._cacheDom();
    }
  }

  _startVisualLoop() {
    const loop = (currentTime) => {
      if (!this.isListening) return;

      const visual = this.smoother.step(currentTime);
      this._paintFrame(visual);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  _paintFrame(visual) {
    if (!this.dom.needleEl) {
      this._cacheDom();
      if (!this.dom.needleEl) return;
    }

    const {
      displayedCents,
      displayedFreq,
      displayedAngle,
      note,
      octave,
      state,
      isInTune,
      isNearTune,
      isWeakSignal
    } = visual;

    // 1. Rotação Suave do Ponteiro (Sem teletransporte, aceleração e desaceleração naturais)
    this.dom.needleEl.style.transform = `translateX(-50%) rotate(${displayedAngle}deg)`;

    // 2. Frequência Exibida e Cents
    if (this.dom.freqEl) {
      this.dom.freqEl.textContent = displayedFreq > 0 ? `${displayedFreq.toFixed(1)} Hz` : "—";
    }

    if (this.dom.centsEl) {
      if (note && !isWeakSignal) {
        const sign = displayedCents > 0 ? "+" : "";
        this.dom.centsEl.textContent = `${sign}${displayedCents.toFixed(1)} cents`;
      } else {
        this.dom.centsEl.textContent = "0.0 cents";
      }
    }

    // 3. Nota e Oitava com Microinteração
    if (this.dom.noteEl) {
      if (note && !isWeakSignal) {
        this.dom.noteEl.textContent = note;
        this.dom.noteEl.style.opacity = "1";
      } else {
        this.dom.noteEl.textContent = "—";
        this.dom.noteEl.style.opacity = "0.4";
      }
    }

    if (this.dom.octaveEl) {
      this.dom.octaveEl.textContent = (octave !== null && note && !isWeakSignal) ? octave : "";
    }

    // 4. Três Estados de Afinação & Feedback Visual Celestial
    if (this.dom.badgeEl && this.dom.cardEl) {
      if (isWeakSignal) {
        this.dom.badgeEl.textContent = "SINAL MUITO FRACO";
        this.dom.badgeEl.style.background = "rgba(245, 158, 11, 0.18)";
        this.dom.badgeEl.style.color = "#fbbf24";
        this.dom.badgeEl.style.borderColor = "rgba(245, 158, 11, 0.4)";
        this.dom.cardEl.classList.remove("is-in-tune", "is-near-tune");
        if (this.dom.centerMarkEl) {
          this.dom.centerMarkEl.style.boxShadow = "none";
        }
      } else if (!note || state === TUNER_STATES.WAITING_SOUND) {
        this.dom.badgeEl.textContent = "TOQUE A CORDA OU CANTE";
        this.dom.badgeEl.style.background = "rgba(255, 255, 255, 0.05)";
        this.dom.badgeEl.style.color = "#94a3b8";
        this.dom.badgeEl.style.borderColor = "rgba(255, 255, 255, 0.12)";
        this.dom.cardEl.classList.remove("is-in-tune", "is-near-tune");
        if (this.dom.centerMarkEl) {
          this.dom.centerMarkEl.style.boxShadow = "none";
        }
      } else if (isInTune) {
        // Estado 1: AFINADO — Brilho azul celestial suave, micro-vibração visual, estabilidade total
        this.dom.badgeEl.textContent = "✓ AFINADO (PERFEITO)";
        this.dom.badgeEl.style.background = "rgba(126, 231, 255, 0.22)";
        this.dom.badgeEl.style.color = "#7EE7FF";
        this.dom.badgeEl.style.borderColor = "#7EE7FF";
        this.dom.cardEl.classList.add("is-in-tune");
        this.dom.cardEl.classList.remove("is-near-tune");
        if (this.dom.centerMarkEl) {
          this.dom.centerMarkEl.style.boxShadow = "0 0 16px rgba(126, 231, 255, 0.9)";
        }
      } else if (isNearTune) {
        // Estado 2: QUASE AFINADO — Movimento extremamente suave
        const hint = displayedCents < 0 ? "APERTE SUTILMENTE" : "AFROUXE SUTILMENTE";
        this.dom.badgeEl.textContent = `QUASE LÁ (${hint})`;
        this.dom.badgeEl.style.background = "rgba(126, 231, 255, 0.10)";
        this.dom.badgeEl.style.color = "#93c5fd";
        this.dom.badgeEl.style.borderColor = "rgba(126, 231, 255, 0.35)";
        this.dom.cardEl.classList.add("is-near-tune");
        this.dom.cardEl.classList.remove("is-in-tune");
        if (this.dom.centerMarkEl) {
          this.dom.centerMarkEl.style.boxShadow = "0 0 8px rgba(126, 231, 255, 0.4)";
        }
      } else {
        // Estado 3: DESAFINADO — Muito Baixo ou Muito Alto
        if (displayedCents < 0) {
          this.dom.badgeEl.textContent = "MUITO BAIXO (APERTE A TARRAXA)";
          this.dom.badgeEl.style.background = "rgba(245, 158, 11, 0.16)";
          this.dom.badgeEl.style.color = "#fbbf24";
          this.dom.badgeEl.style.borderColor = "rgba(245, 158, 11, 0.35)";
        } else {
          this.dom.badgeEl.textContent = "MUITO ALTO (AFROUXE A TARRAXA)";
          this.dom.badgeEl.style.background = "rgba(248, 113, 113, 0.16)";
          this.dom.badgeEl.style.color = "#f87171";
          this.dom.badgeEl.style.borderColor = "rgba(248, 113, 113, 0.35)";
        }
        this.dom.cardEl.classList.remove("is-in-tune", "is-near-tune");
        if (this.dom.centerMarkEl) {
          this.dom.centerMarkEl.style.boxShadow = "none";
        }
      }
    }
  }

  updateStateButton(listening) {
    const btn = document.getElementById("tuner-toggle-btn");
    const statusText = document.getElementById("tuner-status-banner");
    const pulseIndicator = document.getElementById("tuner-listening-indicator");

    if (btn) {
      if (listening) {
        btn.innerHTML = "<span>⏹</span> Parar Afinador";
        btn.style.background = "rgba(239, 68, 68, 0.85)";
        btn.style.color = "#ffffff";
        btn.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.35)";
      } else {
        btn.innerHTML = "<span>🎤</span> Iniciar Afinador Pro";
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
        btn.style.boxShadow = "0 8px 24px rgba(126, 231, 255, 0.35)";
      }
    }
    if (statusText) {
      statusText.textContent = listening ? "Ouvindo com filtro passa-banda ativo (60 FPS)..." : "Microfone inativo. Toque para iniciar.";
    }
    if (pulseIndicator) {
      pulseIndicator.style.display = listening ? "inline-block" : "none";
    }
  }

  resetDisplay() {
    this._cacheDom();
    if (this.dom.noteEl) this.dom.noteEl.textContent = "—";
    if (this.dom.octaveEl) this.dom.octaveEl.textContent = "";
    if (this.dom.freqEl) this.dom.freqEl.textContent = "—";
    if (this.dom.needleEl) this.dom.needleEl.style.transform = "translateX(-50%) rotate(0deg)";
    if (this.dom.centsEl) this.dom.centsEl.textContent = "0.0 cents";
    if (this.dom.badgeEl) {
      this.dom.badgeEl.textContent = "AGUARDANDO INÍCIO";
      this.dom.badgeEl.style.background = "rgba(255,255,255,0.05)";
      this.dom.badgeEl.style.color = "#94a3b8";
      this.dom.badgeEl.style.borderColor = "rgba(255,255,255,0.1)";
    }
    if (this.dom.cardEl) {
      this.dom.cardEl.classList.remove("is-in-tune", "is-near-tune");
    }
  }
}

export const virtuoTuner = new VirtuoTunerController();
if (typeof window !== "undefined") {
  window.virtuoTuner = virtuoTuner;
}

export function renderTunerScreen() {
  const activePresetKey = virtuoTuner.selectedInstrument in TUNER_PRESETS ? virtuoTuner.selectedInstrument : "guitar";
  const inst = TUNER_PRESETS[activePresetKey] || TUNER_PRESETS.guitar;
  const isListening = virtuoTuner.isListening;

  return `
    <style>
      .tuner-pro-card {
        background: rgba(7, 16, 31, 0.75);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(126, 231, 255, 0.18);
        border-radius: 28px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        transition: border-color 0.25s ease, box-shadow 0.25s ease;
      }
      .tuner-pro-card.is-in-tune {
        border-color: rgba(126, 231, 255, 0.7);
        box-shadow: 0 16px 48px rgba(126, 231, 255, 0.25), inset 0 0 24px rgba(126, 231, 255, 0.12);
        animation: tunerInTuneBreath 2.2s ease-in-out infinite;
      }
      .tuner-pro-card.is-near-tune {
        border-color: rgba(126, 231, 255, 0.4);
      }
      @keyframes tunerInTuneBreath {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 16px 48px rgba(126, 231, 255, 0.22), inset 0 0 20px rgba(126, 231, 255, 0.08);
        }
        50% {
          transform: scale(1.008);
          box-shadow: 0 20px 56px rgba(126, 231, 255, 0.35), inset 0 0 32px rgba(126, 231, 255, 0.16);
        }
      }
      .tuner-needle-pro {
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 3px;
        height: 120px;
        background: linear-gradient(to top, #ffffff, #7EE7FF 80%);
        transform-origin: bottom center;
        transform: translateX(-50%) rotate(0deg);
        border-radius: 2px;
        box-shadow: 0 0 14px rgba(126, 231, 255, 0.85);
        will-change: transform;
        pointer-events: none;
      }
      .tuner-graduation-tick {
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 1px;
        transform-origin: bottom center;
        pointer-events: none;
      }
    </style>

    <section class="glass tuner-screen-container" style="max-width:740px; margin:0 auto; padding:24px 20px;">
      <!-- Header do Afinador Pro -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border:1px solid rgba(126,231,255,0.4); font-weight:700; letter-spacing:0.5px; font-size:12px;">
            ✦ VIRTUO AFINADOR PRO
          </span>
          <span id="tuner-listening-indicator" style="display:${isListening ? 'inline-block' : 'none'}; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></span>
        </div>
        <span style="font-size:12px; color:#94a3b8;" id="tuner-status-banner">
          ${isListening ? 'Ouvindo com filtro passa-banda ativo (60 FPS)...' : 'Microfone inativo. Toque para iniciar.'}
        </span>
      </div>

      <h2 style="margin:4px 0 6px 0; font-size:26px; font-weight:800; letter-spacing:-0.5px;">
        Afinador de Nível Profissional
      </h2>
      <p class="subtitle" style="margin-bottom:18px; font-size:14px; color:#94a3b8; line-height:1.5;">
        Movimento fluido com Exponential Moving Average (EMA), zona de estabilidade (±2 cents) e filtro passa-banda de alta fidelidade.
      </p>

      <!-- Presets de Instrumentos (Violão, Guitarra, Baixo, Voz, Ukulele, Cromático) -->
      <div style="margin-bottom:18px;">
        <span style="font-size:11px; font-weight:600; text-transform:uppercase; color:#64748b; letter-spacing:0.8px; display:block; margin-bottom:8px;">
          Filtro e Preset do Instrumento:
        </span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${Object.keys(TUNER_PRESETS).filter(k => k !== "bass4").map(key => {
            const item = TUNER_PRESETS[key];
            const isAct = virtuoTuner.selectedInstrument === key || (key === "bass" && virtuoTuner.selectedInstrument === "bass4");
            return `
              <button 
                class="band-key-chip ${isAct ? 'active' : ''}" 
                onclick="window.virtuoTuner.setInstrument('${key}')"
                style="padding:8px 16px; font-size:13px; border-radius:999px; background:${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.05)'}; color:${isAct ? '#07101F' : '#E2E8F0'}; font-weight:${isAct ? '800' : '500'}; border:1px solid ${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.12)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s ease;"
                title="${item.description} (${item.lowCutoff}Hz - ${item.highCutoff}Hz)"
              >
                <span>${item.icon}</span>
                <span>${item.name}</span>
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Guia de Cordas (Quando aplicável) -->
      ${inst.strings && inst.strings.length > 0 ? `
        <div style="margin-bottom:20px; padding:12px 16px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
              Cordas de Referência (${inst.name}):
            </span>
            <span style="font-size:11px; color:#64748b;">
              Faixa: ${inst.lowCutoff}Hz — ${inst.highCutoff}Hz
            </span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${inst.strings.map((str, idx) => `
              <button 
                onclick="window.virtuoTuner.selectString(${idx})"
                style="padding:6px 12px; font-size:12px; border-radius:10px; background:${virtuoTuner.selectedStringIndex === idx ? 'rgba(126,231,255,0.25)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${virtuoTuner.selectedStringIndex === idx ? '#7EE7FF' : 'rgba(255,255,255,0.1)'}; color:${virtuoTuner.selectedStringIndex === idx ? '#7EE7FF' : '#cbd5e1'}; cursor:pointer; transition:all 0.15s ease;"
              >
                <strong>${str.note}${str.octave}</strong> <span style="font-size:10px; opacity:0.8;">(${str.freq}Hz)</span>
              </button>
            `).join("")}
          </div>
        </div>
      ` : ''}

      <!-- Painel Principal do Afinador Pro (Dial / Agulha / Nota Gigante) -->
      <div 
        id="tuner-main-card" 
        class="tuner-pro-card" 
        style="padding:32px 20px 24px; text-align:center; position:relative; overflow:hidden;"
      >
        <!-- Status de Afinação (Badge com Transição Fluida) -->
        <div style="margin-bottom:18px;">
          <span 
            id="tuner-accuracy-badge" 
            class="pill" 
            style="font-size:13px; font-weight:800; padding:8px 22px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:#94a3b8; letter-spacing:0.6px; transition:all 0.25s ease;"
          >
            ${isListening ? 'TOQUE A CORDA OU CANTE' : 'INICIE O AFINADOR'}
          </span>
        </div>

        <!-- Arco do Medidor com Graduações e Agulha Suavizada -->
        <div class="tuner-arc-wrapper" style="position:relative; width:280px; height:140px; margin:0 auto 12px; border-top-left-radius:150px; border-top-right-radius:150px; border-top:3px solid rgba(126,231,255,0.25); border-left:3px solid rgba(126,231,255,0.15); border-right:3px solid rgba(126,231,255,0.15); background:radial-gradient(ellipse at bottom, rgba(126,231,255,0.06) 0%, transparent 70%);">
          
          <!-- Marcação Central (Zona Morta ±2 cents) -->
          <div 
            id="tuner-center-mark" 
            style="position:absolute; top:-2px; left:50%; transform:translateX(-50%); width:6px; height:24px; background:#7EE7FF; border-radius:3px; z-index:3; transition:box-shadow 0.2s ease;"
            title="Zona de Afinação Precisa (0 cents)"
          ></div>

          <!-- Guias de Zona de Estabilidade (±5 cents e ±25 cents) -->
          <div style="position:absolute; top:4px; left:calc(50% - 14px); width:2px; height:12px; background:rgba(126,231,255,0.4); border-radius:1px;"></div>
          <div style="position:absolute; top:4px; left:calc(50% + 14px); width:2px; height:12px; background:rgba(126,231,255,0.4); border-radius:1px;"></div>

          <!-- Rótulos de Cents -->
          <div style="position:absolute; top:28px; left:16px; font-size:11px; font-weight:700; color:#f87171;">-50</div>
          <div style="position:absolute; top:10px; left:26%; font-size:11px; font-weight:700; color:#fbbf24;">-25</div>
          <div style="position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:12px; font-weight:800; color:#7EE7FF;">0</div>
          <div style="position:absolute; top:10px; right:26%; font-size:11px; font-weight:700; color:#fbbf24;">+25</div>
          <div style="position:absolute; top:28px; right:16px; font-size:11px; font-weight:700; color:#f87171;">+50</div>

          <!-- Agulha de Alta Fidelidade (Controlada via EMA a 60 FPS) -->
          <div id="tuner-needle" class="tuner-needle-pro"></div>

          <!-- Pivô Celestial da Agulha -->
          <div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); width:20px; height:20px; background:#7EE7FF; border-radius:50%; border:3px solid #07101F; box-shadow:0 0 12px rgba(126,231,255,0.8); z-index:4;"></div>
        </div>

        <!-- Cents Offset com Tipografia Celestial -->
        <div style="margin-top:16px; font-size:16px; color:#7EE7FF; font-weight:800; letter-spacing:0.5px;" id="tuner-cents-text">
          0.0 cents
        </div>

        <!-- Nota Detectada Gigante (Palco Friendly) -->
        <div style="margin:16px 0 10px; display:flex; justify-content:center; align-items:baseline; gap:4px;">
          <span 
            id="tuner-note-display" 
            style="font-size:78px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 28px rgba(126,231,255,0.5); letter-spacing:-1px; transition:transform 0.15s ease, opacity 0.15s ease;"
          >
            —
          </span>
          <span 
            id="tuner-octave-display" 
            style="font-size:32px; font-weight:700; color:#7EE7FF; text-shadow:0 0 16px rgba(126,231,255,0.6);"
          ></span>
        </div>

        <!-- Frequência em Hertz (Separação Real vs. Exibida) -->
        <div style="display:inline-flex; align-items:center; gap:8px; padding:4px 14px; background:rgba(0,0,0,0.3); border-radius:999px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Frequência:</span>
          <span id="tuner-freq-display" style="font-size:14px; color:#cbd5e1; font-family:monospace; font-weight:700;">
            —
          </span>
        </div>
      </div>

      <!-- Botão de Ação Principal (Touch Target 56px para Altar e Palco) -->
      <div style="margin-top:22px; text-align:center;">
        <button 
          id="tuner-toggle-btn"
          class="button primary" 
          style="width:100%; max-width:340px; padding:16px 28px; font-size:16px; font-weight:800; border-radius:18px; background:${isListening ? 'rgba(239, 68, 68, 0.85)' : '#7EE7FF'}; color:${isListening ? '#ffffff' : '#07101F'}; box-shadow:0 8px 24px ${isListening ? 'rgba(239, 68, 68, 0.35)' : 'rgba(126, 231, 255, 0.35)'}; display:inline-flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; transition:all 0.2s ease;"
          onclick="window.virtuoTuner.toggleListening()"
        >
          <span>${isListening ? '⏹' : '🎤'}</span>
          <span>${isListening ? 'Parar Afinador' : 'Iniciar Afinador Pro'}</span>
        </button>
      </div>
    </section>
  `;
}
