// =============================================================
// VIRTUO GUITAR COACH (CHORD TRANSITION TRAINER)
// src/features/guitar-coach/coach-view.js
// Intelligent drill coach for chord transitions with audio metronome
// 100% Deterministic & Local Engine
// =============================================================

import { virtuoMetronome } from "../../audio/metronome-controller.js";
import { musicIntelligence } from "../../music/music-intelligence.js";
import { perfMonitor } from "../../performance/performance-monitor.js";

const DEFAULT_DRILL_SETS = [
  { id: "worship-open", name: "Worship Essencial", chords: ["G", "C9", "Em7", "D"] },
  { id: "pop-g", name: "I - V - vi - IV", chords: ["G", "D", "Em", "C"] },
  { id: "cadence-c", name: "Louvor em C", chords: ["C", "G/B", "Am7", "F"] },
  { id: "barre-challenge", name: "Desafio com Pestana", chords: ["C", "G", "Am", "F"] },
  { id: "acoustic-d", name: "Harmonia em D", chords: ["D", "A", "Bm7", "G"] }
];

class VirtuoGuitarCoachController {
  constructor() {
    this.drillSets = [...DEFAULT_DRILL_SETS];
    this.currentSetIndex = 0;
    this.chords = [...DEFAULT_DRILL_SETS[0].chords];
    this.currentChordIdx = 0;

    this.bpm = 70;
    this.level = "Iniciante"; // 'Iniciante' (4 compassos), 'Intermediário' (2 compassos), 'Avançado' (1 compasso), 'Desafio' (2 tempos)
    this.barsPerChord = 4;
    this.durationSec = 60; // 30, 60, 120, 0 (livre)
    this.remainingSec = 60;

    this.isRunning = false;
    this.intervalId = null;
    this.currentBeat = 1;
    this.currentBar = 1;
    this.totalSwitches = 0;

    this.unsubscribeMetro = null;
  }

  setLevel(levelName) {
    this.level = levelName;
    if (levelName === "Iniciante") this.barsPerChord = 4;
    else if (levelName === "Intermediário") this.barsPerChord = 2;
    else if (levelName === "Avançado") this.barsPerChord = 1;
    else if (levelName === "Desafio") this.barsPerChord = 0.5; // troca a cada 2 batidas

    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
    }
  }

  setDrillSet(idx) {
    if (this.drillSets[idx]) {
      this.currentSetIndex = idx;
      this.chords = [...this.drillSets[idx].chords];
      this.currentChordIdx = 0;
      this.currentBar = 1;
      this.currentBeat = 1;
      if (this.isRunning) {
        this.stop();
      }
      if (window.renderCurrentScreen) {
        window.renderCurrentScreen();
      }
    }
  }

  setDuration(sec) {
    this.durationSec = sec;
    this.remainingSec = sec;
    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
    }
  }

  setBpm(newBpm) {
    this.bpm = Math.max(40, Math.min(220, parseInt(newBpm, 10) || 70));
    virtuoMetronome.setBpm(this.bpm);
    if (window.renderCurrentScreen) {
      window.renderCurrentScreen();
    }
  }

  loadSongChords(song) {
    if (!song) return;
    const extracted = musicIntelligence.extractChords(song.chords || "");
    if (extracted.length >= 2) {
      const customSet = {
        id: `song-${song.id || Date.now()}`,
        name: `Música: ${song.title}`,
        chords: extracted.slice(0, 6)
      };
      this.drillSets.unshift(customSet);
      this.setDrillSet(0);
      if (song.bpm) {
        this.setBpm(song.bpm);
      }
    }
  }

  toggleStart() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    const token = perfMonitor.startMeasure("guitar_coach_start");
    this.isRunning = true;
    this.currentChordIdx = 0;
    this.currentBar = 1;
    this.currentBeat = 1;
    this.totalSwitches = 0;
    this.remainingSec = this.durationSec;

    virtuoMetronome.setBpm(this.bpm);
    virtuoMetronome.start();

    // Sincroniza com as batidas do metrônomo
    this.unsubscribeMetro = virtuoMetronome.onStateChange((metroState) => {
      if (!this.isRunning) return;
      this._onMetronomeTick(metroState);
    });

    // Timer regressivo
    if (this.durationSec > 0) {
      this.intervalId = setInterval(() => {
        this.remainingSec--;
        this._updateTimerDisplay();
        if (this.remainingSec <= 0) {
          this.stop();
          alert(`Treino concluído! Você executou ${this.totalSwitches} trocas de acordes a ${this.bpm} BPM.`);
        }
      }, 1000);
    }

    this._updateUIElements();
    perfMonitor.endMeasure(token);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.unsubscribeMetro) {
      this.unsubscribeMetro();
      this.unsubscribeMetro = null;
    }
    virtuoMetronome.stop();
    this.remainingSec = this.durationSec;
    this._updateUIElements();
  }

  _onMetronomeTick(metroState) {
    if (!this.isRunning) return;

    this.currentBeat = metroState.currentBeat;

    // Se bateu no tempo 1 de um novo compasso
    if (this.currentBeat === 1) {
      this.currentBar++;

      let shouldSwitch = false;
      if (this.barsPerChord === 0.5) {
        // Desafio: já troca a cada 2 tempos (tratado abaixo)
      } else if (this.currentBar > this.barsPerChord) {
        shouldSwitch = true;
        this.currentBar = 1;
      }

      if (shouldSwitch) {
        this.currentChordIdx = (this.currentChordIdx + 1) % this.chords.length;
        this.totalSwitches++;
      }
    } else if (this.barsPerChord === 0.5 && this.currentBeat === 3) {
      // Meio compasso no Desafio (troca no tempo 3)
      this.currentChordIdx = (this.currentChordIdx + 1) % this.chords.length;
      this.totalSwitches++;
    }

    this._updateUIElements();
  }

  _updateTimerDisplay() {
    const timerEl = document.getElementById("coach-timer-val");
    if (timerEl) {
      const mins = Math.floor(this.remainingSec / 60);
      const secs = this.remainingSec % 60;
      timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  _updateUIElements() {
    const currentEl = document.getElementById("coach-current-chord");
    const nextEl = document.getElementById("coach-next-chord");
    const beatDots = document.querySelectorAll(".coach-beat-dot");
    const barEl = document.getElementById("coach-bar-counter");
    const switchEl = document.getElementById("coach-switches-count");
    const btn = document.getElementById("coach-main-btn");

    const currentChord = this.chords[this.currentChordIdx] || "G";
    const nextChord = this.chords[(this.currentChordIdx + 1) % this.chords.length] || "C";

    if (currentEl) currentEl.textContent = currentChord;
    if (nextEl) nextEl.textContent = nextChord;
    if (barEl) barEl.textContent = `Compasso ${this.currentBar} de ${this.barsPerChord}`;
    if (switchEl) switchEl.textContent = `${this.totalSwitches} trocas`;

    if (btn) {
      if (this.isRunning) {
        btn.innerHTML = "⏸ Pausar Treino";
        btn.style.background = "#ef4444";
        btn.style.color = "#ffffff";
      } else {
        btn.innerHTML = "▶ Iniciar Treino com Metrônomo";
        btn.style.background = "#7EE7FF";
        btn.style.color = "#07101F";
      }
    }

    beatDots.forEach((dot, idx) => {
      const beatNum = idx + 1;
      if (this.isRunning && this.currentBeat === beatNum) {
        dot.style.background = beatNum === 1 ? "#10b981" : "#7EE7FF";
        dot.style.transform = "scale(1.25)";
        dot.style.boxShadow = "0 0 10px rgba(126,231,255,0.8)";
      } else {
        dot.style.background = "rgba(255,255,255,0.15)";
        dot.style.transform = "scale(1)";
        dot.style.boxShadow = "none";
      }
    });
  }
}

export const virtuoGuitarCoach = new VirtuoGuitarCoachController();
if (typeof window !== "undefined") {
  window.virtuoGuitarCoach = virtuoGuitarCoach;
}

export function renderGuitarCoachScreen() {
  const isRunning = virtuoGuitarCoach.isRunning;
  const currentSet = virtuoGuitarCoach.drillSets[virtuoGuitarCoach.currentSetIndex] || DEFAULT_DRILL_SETS[0];
  const currentChord = virtuoGuitarCoach.chords[virtuoGuitarCoach.currentChordIdx] || "G";
  const nextChord = virtuoGuitarCoach.chords[(virtuoGuitarCoach.currentChordIdx + 1) % virtuoGuitarCoach.chords.length] || "C";

  return `
    <section class="glass coach-screen-container" style="max-width:720px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">
          VIRTUO GUITAR COACH
        </span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; color:#94a3b8;">Tempo restante:</span>
          <strong id="coach-timer-val" style="font-size:14px; color:#7EE7FF; font-family:monospace;">
            ${virtuoGuitarCoach.durationSec > 0 ? `${Math.floor(virtuoGuitarCoach.remainingSec / 60)}:${virtuoGuitarCoach.remainingSec % 60 < 10 ? '0' : ''}${virtuoGuitarCoach.remainingSec % 60}` : 'Livre'}
          </strong>
        </div>
      </div>

      <h2 style="margin-top:8px; font-size:24px;">Treinador de Transição de Acordes</h2>
      <p class="subtitle" style="margin-bottom:16px;">
        Acelere a troca de posições no violão ou teclado com metrônomo acústico integrado e contagem visual.
      </p>

      <!-- Seletor de Sequências / Progressões de Treino -->
      <div style="margin-bottom:14px; padding:12px; background:rgba(0,0,0,0.25); border-radius:14px;">
        <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:8px;">Sequência de Acordes:</span>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${virtuoGuitarCoach.drillSets.map((drill, idx) => {
            const isAct = virtuoGuitarCoach.currentSetIndex === idx;
            return `
              <button 
                class="band-key-chip ${isAct ? 'active' : ''}" 
                onclick="window.virtuoGuitarCoach.setDrillSet(${idx})"
                style="padding:5px 12px; font-size:12px; border-radius:8px; background:${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.06)'}; color:${isAct ? '#07101F' : '#E2E8F0'}; font-weight:${isAct ? '700' : '400'}; border:1px solid ${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.12)'}; cursor:pointer;"
              >
                ${drill.name}
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Configurações: Dificuldade & BPM -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
        <div style="padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.07);">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Nível de Troca</span>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            ${["Iniciante", "Intermediário", "Avançado", "Desafio"].map(lvl => `
              <button 
                onclick="window.virtuoGuitarCoach.setLevel('${lvl}')"
                style="padding:3px 8px; font-size:10px; border-radius:6px; background:${virtuoGuitarCoach.level === lvl ? 'rgba(126,231,255,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${virtuoGuitarCoach.level === lvl ? '#7EE7FF' : 'rgba(255,255,255,0.1)'}; color:${virtuoGuitarCoach.level === lvl ? '#7EE7FF' : '#cbd5e1'}; cursor:pointer;"
              >
                ${lvl}
              </button>
            `).join("")}
          </div>
        </div>

        <div style="padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Andamento</span>
            <strong style="font-size:18px; color:#ffffff;">${virtuoGuitarCoach.bpm} <span style="font-size:11px; color:#7EE7FF;">BPM</span></strong>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="band-step-btn" style="width:34px; height:34px; font-size:14px;" onclick="window.virtuoGuitarCoach.setBpm(${virtuoGuitarCoach.bpm - 5})">-5</button>
            <button class="band-step-btn" style="width:34px; height:34px; font-size:14px;" onclick="window.virtuoGuitarCoach.setBpm(${virtuoGuitarCoach.bpm + 5})">+5</button>
          </div>
        </div>
      </div>

      <!-- PAINEL GIGANTE DO TREINO DE ACORDES -->
      <div style="padding:28px 16px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.25); border-radius:24px; text-align:center;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; max-width:400px; margin:0 auto 16px;">
          <span id="coach-bar-counter" style="font-size:12px; color:#94a3b8;">
            Compasso ${virtuoGuitarCoach.currentBar} de ${virtuoGuitarCoach.barsPerChord}
          </span>
          <span id="coach-switches-count" style="font-size:12px; color:#10b981; font-weight:700;">
            ${virtuoGuitarCoach.totalSwitches} trocas
          </span>
        </div>

        <!-- Indicador de Batidas 1 2 3 4 -->
        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:24px;">
          ${[1, 2, 3, 4].map(b => `
            <div class="coach-beat-dot" id="coach-beat-${b}" style="width:18px; height:18px; border-radius:50%; background:rgba(255,255,255,0.15); transition:all 0.08s ease;"></div>
          `).join("")}
        </div>

        <!-- Acorde Atual Gigante + Próximo Acorde -->
        <div style="display:flex; justify-content:center; align-items:center; gap:24px;">
          <div>
            <span style="font-size:12px; color:#94a3b8; display:block; margin-bottom:4px;">TOCAR AGORA</span>
            <div id="coach-current-chord" style="font-size:84px; font-weight:900; line-height:1; color:#ffffff; text-shadow:0 0 25px rgba(126,231,255,0.5);">
              ${currentChord}
            </div>
          </div>

          <div style="font-size:32px; color:rgba(255,255,255,0.2);">➔</div>

          <div style="opacity:0.75;">
            <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">PREPARAR DEDOS</span>
            <div id="coach-next-chord" style="font-size:44px; font-weight:800; line-height:1; color:#7EE7FF;">
              ${nextChord}
            </div>
          </div>
        </div>

        <div style="margin-top:20px; font-size:12px; color:#94a3b8;">
          Sequência ativa: <strong>${virtuoGuitarCoach.chords.join("  →  ")}</strong>
        </div>
      </div>

      <!-- Botão Gigante de Treino -->
      <div style="margin-top:20px; text-align:center;">
        <button 
          id="coach-main-btn"
          class="button primary" 
          style="width:100%; max-width:340px; padding:16px 24px; font-size:16px; font-weight:700; border-radius:16px; background:${isRunning ? '#ef4444' : '#7EE7FF'}; color:${isRunning ? '#ffffff' : '#07101F'}; box-shadow:0 6px 20px rgba(0,0,0,0.4);"
          onclick="window.virtuoGuitarCoach.toggleStart()"
        >
          ${isRunning ? '⏸ Pausar Treino' : '▶ Iniciar Treino com Metrônomo'}
        </button>
      </div>
    </section>
  `;
}
