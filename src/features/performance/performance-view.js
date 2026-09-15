// =============================================================
// VIRTUO PERFORMANCE VIEW (PERFORMANCE INTELLIGENCE)
// src/features/performance/performance-view.js
// Live stage & rehearsal performance monitoring with transparent report
// 100% Client-Side - Zero external APIs, zero mock data
// =============================================================

import { performanceEngine } from "./performance-engine.js";
import { performanceHistory } from "./performance-history.js";
import { DEMO_SONGS } from "../../music/demo-songs.js";
import { virtuoMetronome } from "../../audio/metronome-controller.js";

class VirtuoPerformanceViewController {
  constructor() {
    this.selectedSong = null;
    this.viewState = "setup"; // "setup" | "active" | "report"
    this.latestReport = null;
    this.unsubscribeEngine = null;
  }

  init(songs) {
    if (!this.selectedSong) {
      this.selectedSong = (songs && songs.length > 0) ? songs[0] : DEMO_SONGS[0];
    }
  }

  selectSong(song) {
    this.selectedSong = song;
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  async startSession() {
    if (!this.selectedSong) {
      this.selectedSong = DEMO_SONGS[0];
    }

    this.viewState = "active";
    this.latestReport = null;

    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = null;
    }

    this.unsubscribeEngine = performanceEngine.onUpdate((data) => {
      this.updateLiveUI(data);
    });

    try {
      await performanceEngine.startSession(this.selectedSong);
      if (window.renderCurrentScreen) window.renderCurrentScreen();
    } catch (err) {
      console.warn("Falha ao iniciar sessão de performance:", err);
      alert("Não foi possível acessar o microfone para a sessão de performance.");
      this.viewState = "setup";
      if (window.renderCurrentScreen) window.renderCurrentScreen();
    }
  }

  stopSession() {
    const report = performanceEngine.stopSession();
    this.latestReport = report;
    this.viewState = "report";

    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = null;
    }

    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  resetToSetup() {
    this.viewState = "setup";
    this.latestReport = null;
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }

  updateLiveUI(data) {
    if (this.viewState !== "active") return;

    if (data.type === "tick") {
      const timerEl = document.getElementById("perf-live-timer");
      const overallEl = document.getElementById("perf-live-overall");
      const pitchBar = document.getElementById("perf-bar-pitch");
      const rhythmBar = document.getElementById("perf-bar-rhythm");
      const stabilityBar = document.getElementById("perf-bar-stability");
      const consistencyBar = document.getElementById("perf-bar-consistency");

      const pitchVal = document.getElementById("perf-val-pitch");
      const rhythmVal = document.getElementById("perf-val-rhythm");
      const stabilityVal = document.getElementById("perf-val-stability");
      const consistencyVal = document.getElementById("perf-val-consistency");
      const entryCountEl = document.getElementById("perf-live-entries");
      const pauseCountEl = document.getElementById("perf-live-pauses");

      if (timerEl) {
        const mins = Math.floor(data.elapsedSeconds / 60);
        const secs = data.elapsedSeconds % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      if (overallEl && data.scores) {
        overallEl.textContent = `${data.scores.overallScore}%`;
      }

      if (data.scores) {
        if (pitchBar) pitchBar.style.width = `${data.scores.pitchScore}%`;
        if (pitchVal) pitchVal.textContent = `${data.scores.pitchScore}%`;

        if (rhythmBar) rhythmBar.style.width = `${data.scores.rhythmScore}%`;
        if (rhythmVal) rhythmVal.textContent = `${data.scores.rhythmScore}%`;

        if (stabilityBar) stabilityBar.style.width = `${data.scores.stabilityScore}%`;
        if (stabilityVal) stabilityVal.textContent = `${data.scores.stabilityScore}%`;

        if (consistencyBar) consistencyBar.style.width = `${data.scores.consistencyScore}%`;
        if (consistencyVal) consistencyVal.textContent = `${data.scores.consistencyScore}%`;
      }

      if (entryCountEl) entryCountEl.textContent = data.entryCount;
      if (pauseCountEl) pauseCountEl.textContent = data.pauseCount;
    }
  }
}

export const virtuoPerformance = new VirtuoPerformanceViewController();
if (typeof window !== "undefined") {
  window.virtuoPerformance = virtuoPerformance;
}

export function renderPerformanceScreen(availableSongs = []) {
  const songs = (availableSongs && availableSongs.length > 0) ? availableSongs : DEMO_SONGS;
  virtuoPerformance.init(songs);

  const song = virtuoPerformance.selectedSong || songs[0];
  const state = virtuoPerformance.viewState;
  const report = virtuoPerformance.latestReport;

  return `
    <section class="glass performance-screen-container" style="max-width:780px; margin:0 auto;">
      <!-- Header do Virtuo Performance -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">
          🎯 VIRTUO PERFORMANCE
        </span>
        <span class="pill" style="background:rgba(255,255,255,0.06); color:#94a3b8; font-size:11px;">
          Treinamento de Execução Vocal & Rítmica
        </span>
      </div>

      <!-- ESTADO 1: CONFIGURAÇÃO / SELEÇÃO DE CANÇÃO -->
      ${state === 'setup' ? `
        <div style="padding:22px 18px; background:rgba(0,0,0,0.35); border:1px solid rgba(126,231,255,0.25); border-radius:24px;">
          <h2 style="font-size:22px; margin-top:0; margin-bottom:6px;">Acompanhamento de Performance</h2>
          <p class="subtitle" style="margin-bottom:18px;">
            Cante junto com a música ou com o metrônomo enquanto o Virtuo analisa estabilidade, afinação, precisão rítmica e entradas.
          </p>

          <!-- Seletor da Música -->
          <div style="margin-bottom:16px;">
            <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:6px;">Selecione a Canção para Treinar:</label>
            <select 
              class="input-field" 
              style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:14px;"
              onchange="const s = ${JSON.stringify(songs)}.find(x => (x.id || x.title) === this.value); if(s) window.virtuoPerformance.selectSong(s);"
            >
              ${songs.map(s => `
                <option value="${s.id || s.title}" ${s.id === song.id ? 'selected' : ''}>
                  ${s.title} • Tom ${s.originalKey || s.key || 'G'} • ${s.bpm || 74} BPM
                </option>
              `).join("")}
            </select>
          </div>

          <!-- Metadados da Música Selecionada -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:20px;">
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:10px; color:#94a3b8; display:block;">Tonalidade Base</span>
              <strong style="font-size:18px; color:#7EE7FF;">${song.originalKey || song.key || 'G'}</strong>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:10px; color:#94a3b8; display:block;">Andamento (BPM)</span>
              <strong style="font-size:18px; color:#ffffff;">${song.bpm || 74} BPM</strong>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:10px; color:#94a3b8; display:block;">Estrutura</span>
              <strong style="font-size:13px; color:#cbd5e1;">${song.structure || 'Intro • Verso • Refrão'}</strong>
            </div>
          </div>

          <!-- Botão de Iniciar -->
          <button 
            class="button primary" 
            style="width:100%; padding:16px 20px; font-size:16px; font-weight:700; border-radius:16px; background:#7EE7FF; color:#07101F; box-shadow:0 6px 20px rgba(126,231,255,0.3);"
            onclick="window.virtuoPerformance.startSession()"
          >
            🎤 Iniciar Sessão de Performance
          </button>
        </div>
      ` : ''}

      <!-- ESTADO 2: SESSÃO ATIVA (MONITOR AO VIVO) -->
      ${state === 'active' ? `
        <div style="padding:22px 18px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.3); border-radius:24px; text-align:center;">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div style="text-align:left;">
              <h3 style="font-size:18px; margin:0; color:#ffffff;">${song.title}</h3>
              <span style="font-size:12px; color:#7EE7FF;">Tom: ${song.originalKey || song.key || 'G'} • ${song.bpm || 74} BPM</span>
            </div>
            <div style="padding:6px 14px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:12px; color:#ef4444; font-size:14px; font-weight:800;" id="perf-live-timer">
              00:00
            </div>
          </div>

          <!-- Pontuação Geral Ao Vivo -->
          <div style="margin:20px 0; padding:18px; background:rgba(255,255,255,0.02); border-radius:20px; border:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">PONTUAÇÃO GERAL DETERMINÍSTICA</span>
            <div id="perf-live-overall" style="font-size:64px; font-weight:900; line-height:1; color:#7EE7FF; text-shadow:0 0 25px rgba(126,231,255,0.4);">
              —%
            </div>
          </div>

          <!-- Barras de Métricas em Tempo Real -->
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left; max-width:480px; margin:0 auto 24px;">
            
            <!-- Afinação -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#cbd5e1;">🎯 Afinação (Escala & Cents)</span>
                <strong id="perf-val-pitch" style="color:#7EE7FF;">0%</strong>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div id="perf-bar-pitch" style="width:0%; height:100%; background:#7EE7FF; transition:width 0.2s ease-out;"></div>
              </div>
            </div>

            <!-- Ritmo -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#cbd5e1;">⏱ Ritmo (Ataques no BPM)</span>
                <strong id="perf-val-rhythm" style="color:#34d399;">0%</strong>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div id="perf-bar-rhythm" style="width:0%; height:100%; background:#10b981; transition:width 0.2s ease-out;"></div>
              </div>
            </div>

            <!-- Estabilidade -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#cbd5e1;">🌊 Estabilidade (Sustentação)</span>
                <strong id="perf-val-stability" style="color:#a78bfa;">0%</strong>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div id="perf-bar-stability" style="width:0%; height:100%; background:#8b5cf6; transition:width 0.2s ease-out;"></div>
              </div>
            </div>

            <!-- Consistência -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#cbd5e1;">⚖️ Consistência Geral</span>
                <strong id="perf-val-consistency" style="color:#facc15;">0%</strong>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div id="perf-bar-consistency" style="width:0%; height:100%; background:#facc15; transition:width 0.2s ease-out;"></div>
              </div>
            </div>
          </div>

          <!-- Contadores de Entradas e Pausas -->
          <div style="display:flex; justify-content:center; gap:24px; font-size:12px; color:#94a3b8; margin-bottom:20px;">
            <div>Entradas Vocais: <strong id="perf-live-entries" style="color:#ffffff;">0</strong></div>
            <div>Pausas Respeitadas: <strong id="perf-live-pauses" style="color:#7EE7FF;">0</strong></div>
          </div>

          <!-- Botão de Finalizar -->
          <button 
            class="button primary" 
            style="width:100%; max-width:320px; padding:14px 20px; font-size:15px; font-weight:700; border-radius:16px; background:#ef4444; color:#ffffff; box-shadow:0 6px 20px rgba(239,68,68,0.3);"
            onclick="window.virtuoPerformance.stopSession()"
          >
            ⏹ Finalizar e Ver Relatório
          </button>
        </div>
      ` : ''}

      <!-- ESTADO 3: RELATÓRIO DE PERFORMANCE -->
      ${state === 'report' && report ? `
        <div style="padding:22px 18px; background:rgba(0,0,0,0.4); border:1px solid rgba(126,231,255,0.3); border-radius:24px;">
          
          <div style="text-align:center; margin-bottom:20px;">
            <span class="pill" style="background:rgba(16,185,129,0.2); color:#34d399; border-color:#10b981; margin-bottom:8px;">
              SESSÃO CONCLUÍDA
            </span>
            <h2 style="font-size:24px; margin:4px 0;">Relatório de Performance</h2>
            <p style="font-size:12px; color:#94a3b8;">
              ${report.songTitle} • Tom ${report.songKey} • Duração: ${report.duration} segundos
            </p>

            <div style="margin:16px auto; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle, rgba(14,165,233,0.2) 0%, rgba(0,0,0,0.4) 70%); border:3px solid #7EE7FF; display:flex; flex-direction:column; justify-content:center; align-items:center; box-shadow:0 0 25px rgba(126,231,255,0.35);">
              <span style="font-size:36px; font-weight:900; color:#ffffff;">${report.score}%</span>
              <span style="font-size:10px; color:#7EE7FF; font-weight:700;">GERAL</span>
            </div>
          </div>

          <!-- Breakdown das 4 Dimensões -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:20px;">
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Afinação</span>
              <strong style="font-size:20px; color:#7EE7FF;">${report.pitchScore}%</strong>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Ritmo</span>
              <strong style="font-size:20px; color:#34d399;">${report.rhythmScore}%</strong>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Estabilidade</span>
              <strong style="font-size:20px; color:#a78bfa;">${report.stabilityScore}%</strong>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Consistência</span>
              <strong style="font-size:20px; color:#facc15;">${report.consistencyScore}%</strong>
            </div>
          </div>

          <!-- Pontos Fortes e Para Melhorar -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            
            <div style="padding:14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:16px;">
              <h4 style="color:#34d399; font-size:13px; margin:0 0 8px;">✨ Pontos Fortes:</h4>
              <ul style="margin:0; padding-left:16px; font-size:12px; color:#cbd5e1; line-height:1.6;">
                ${report.strengths.map(s => `<li>${s}</li>`).join("")}
              </ul>
            </div>

            <div style="padding:14px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:16px;">
              <h4 style="color:#facc15; font-size:13px; margin:0 0 8px;">💡 Para Melhorar:</h4>
              <ul style="margin:0; padding-left:16px; font-size:12px; color:#cbd5e1; line-height:1.6;">
                ${report.improvements.map(i => `<li>${i}</li>`).join("")}
              </ul>
            </div>
          </div>

          <div style="text-align:center; display:flex; justify-content:center; gap:10px;">
            <button class="button primary" style="padding:12px 24px; font-size:14px;" onclick="window.virtuoPerformance.resetToSetup()">
              🔄 Nova Sessão
            </button>
            <button class="button secondary" style="padding:12px 24px; font-size:14px;" onclick="window.show('vocal')">
              🎤 Treinar com Afinador
            </button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}
