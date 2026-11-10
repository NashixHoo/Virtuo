// =============================================================
// VIRTUO SYSTEM DIAGNOSTICS
// src/features/diagnostics/diagnostics-view.js
// Measured telemetry and system health diagnostics
// 100% Real-time measurements via Performance API
// =============================================================

import { perfMonitor } from "../../performance/performance-monitor.js";
import { virtuoVoiceDetector } from "../../audio/voice-detector.js";
import { transposeChordSheet } from "../../music/index.js";
import { musicIntelligence } from "../../music/music-intelligence.js";
import { SongsRepository } from "../../../songs-service.js";

class VirtuoDiagnosticsController {
  constructor() {
    this.benchmarkResults = null;
    this.isBenchmarking = false;
  }

  runBenchmark() {
    this.isBenchmarking = true;
    if (window.renderCurrentScreen) window.renderCurrentScreen();

    setTimeout(() => {
      const sampleSheet = `[Intro] G  C9  Em7  D\nG               C9\nEu fui na olaria ver o vaso se formar\nEm7             D\nO oleiro trabalhava com amor nesse lugar`;

      // 1. Benchmark de Transposição (10x)
      const tTransStart = performance.now();
      for (let i = 0; i < 10; i++) {
        transposeChordSheet(sampleSheet, i);
      }
      const transDurationMs = parseFloat((performance.now() - tTransStart).toFixed(2));
      const transAvgMs = parseFloat((transDurationMs / 10).toFixed(2));

      // 2. Benchmark de Inteligência Musical (10x)
      const tMusicStart = performance.now();
      for (let i = 0; i < 10; i++) {
        musicIntelligence.estimateDifficulty(sampleSheet, 74, "Intro • Verso • Refrão");
        musicIntelligence.analyzeProgression(sampleSheet, "G");
        musicIntelligence.suggestCapo("Eb");
      }
      const musicDurationMs = parseFloat((performance.now() - tMusicStart).toFixed(2));
      const musicAvgMs = parseFloat((musicDurationMs / 10).toFixed(2));

      this.benchmarkResults = {
        transTotalMs: transDurationMs,
        transAvgMs,
        musicTotalMs: musicDurationMs,
        musicAvgMs,
        timestamp: new Date().toLocaleTimeString("pt-BR")
      };

      perfMonitor.recordMetric("benchmark_transposition", transAvgMs);
      perfMonitor.recordMetric("benchmark_music_intelligence", musicAvgMs);

      this.isBenchmarking = false;
      if (window.renderCurrentScreen) window.renderCurrentScreen();
    }, 50);
  }

  clearMetrics() {
    perfMonitor.clear();
    this.benchmarkResults = null;
    if (window.renderCurrentScreen) window.renderCurrentScreen();
  }
}

export const virtuoDiagnostics = new VirtuoDiagnosticsController();
if (typeof window !== "undefined") {
  window.virtuoDiagnostics = virtuoDiagnostics;
}

export function renderDiagnosticsScreen() {
  const summary = perfMonitor.getSummary();
  const voiceStats = virtuoVoiceDetector.getPerformanceStats();
  const memoryInfo = perfMonitor.getApproxMemory();
  const offlineSongs = SongsRepository.getOfflineRecentSongs();
  const isSwActive = typeof navigator !== "undefined" && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  const isBenchmarking = virtuoDiagnostics.isBenchmarking;
  const bench = virtuoDiagnostics.benchmarkResults;

  return `
    <section class="glass diagnostics-container" style="max-width:800px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span class="pill" style="background:rgba(16,185,129,0.15); color:#34d399; border-color:#10b981;">
          VIRTUO DIAGNÓSTICO DO SISTEMA
        </span>
        <div style="display:flex; gap:6px;">
          <button class="tag-btn" onclick="window.virtuoDiagnostics.clearMetrics()" title="Limpar registros de telemetria">
            🧹 Limpar
          </button>
          <button class="button primary" style="padding:6px 14px; font-size:12px;" onclick="window.virtuoDiagnostics.runBenchmark()">
            ${isBenchmarking ? 'Executando...' : '⚡ Rodar Benchmark Local'}
          </button>
        </div>
      </div>

      <h2 style="margin-top:8px; font-size:24px;">Painel de Saúde e Performance</h2>
      <p class="subtitle" style="margin-bottom:16px;">
        Métricas medidas em tempo real diretamente na sessão ativa do seu navegador.
      </p>

      <!-- Grade de Status do Sistema -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
        <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">Service Worker (PWA)</span>
          <strong style="font-size:14px; color:${isSwActive ? '#34d399' : '#fbbf24'};">
            ${isSwActive ? '● Ativo & Cacheado' : '○ Não registrado'}
          </strong>
        </div>

        <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">Cache Offline (Cifras)</span>
          <strong style="font-size:14px; color:#7EE7FF;">
            ${offlineSongs.length} músicas salvas
          </strong>
        </div>

        <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">Latência do Áudio</span>
          <strong style="font-size:14px; color:#ffffff;">
            ${voiceStats.latencyMs > 0 ? `${voiceStats.latencyMs} ms` : 'Inativo'}
          </strong>
        </div>

        <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">Heap JS do Navegador</span>
          <strong style="font-size:14px; color:#ffffff;">
            ${memoryInfo ? `${memoryInfo.usedJSHeapSizeMB} MB` : 'Navegador restrito'}
          </strong>
        </div>
      </div>

      <!-- Resultado do Benchmark Local -->
      ${bench ? `
        <div style="margin-bottom:16px; padding:16px; background:rgba(126,231,255,0.06); border:1px solid rgba(126,231,255,0.25); border-radius:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:13px; color:#7EE7FF;">⚡ Resultado do Benchmark Local (${bench.timestamp})</strong>
            <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(16,185,129,0.2); color:#34d399; border:none;">Sucesso</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div>
              <span style="font-size:11px; color:#94a3b8; display:block;">Transposição de Cifra (10 ciclos)</span>
              <strong style="font-size:15px; color:#ffffff;">${bench.transTotalMs} ms total <span style="font-size:11px; color:#7EE7FF;">(~${bench.transAvgMs} ms/cifra)</span></strong>
            </div>
            <div>
              <span style="font-size:11px; color:#94a3b8; display:block;">Music Intelligence (10 ciclos)</span>
              <strong style="font-size:15px; color:#ffffff;">${bench.musicTotalMs} ms total <span style="font-size:11px; color:#7EE7FF;">(~${bench.musicAvgMs} ms/análise)</span></strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Estatísticas do Detector de Voz & Áudio -->
      <div style="margin-bottom:16px; padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px;">
        <h3 style="font-size:14px; color:#7EE7FF; margin-bottom:10px;">Desempenho do Processamento de Áudio (Voice Detector)</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Frames Processados</span>
            <strong style="font-size:14px; color:#ffffff;">${voiceStats.framesProcessed}</strong>
          </div>
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Média p/ Buffer</span>
            <strong style="font-size:14px; color:#ffffff;">${voiceStats.averageProcessingMs} ms</strong>
          </div>
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Percentil 95 (P95)</span>
            <strong style="font-size:14px; color:#ffffff;">${voiceStats.p95ProcessingMs} ms</strong>
          </div>
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Pico Máximo</span>
            <strong style="font-size:14px; color:#ffffff;">${voiceStats.maxProcessingMs} ms</strong>
          </div>
          <div>
            <span style="font-size:11px; color:#94a3b8; display:block;">Frames Dropados</span>
            <strong style="font-size:14px; color:${voiceStats.framesDropped > 0 ? '#f87171' : '#34d399'};">
              ${voiceStats.framesDropped}
            </strong>
          </div>
        </div>
      </div>

      <!-- Tabela de Operações Medidas pelo Performance Monitor -->
      <div style="padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px;">
        <h3 style="font-size:14px; color:#7EE7FF; margin-bottom:10px;">Operações Críticas Monitoradas (performance.now)</h3>
        ${Object.keys(summary).length === 0 ? `
          <p style="font-size:12px; color:#64748b; text-align:center; padding:16px 0;">
            Nenhuma operação registrada ainda. Navegue pelo app ou execute o benchmark.
          </p>
        ` : `
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                  <th style="padding:8px;">Operação</th>
                  <th style="padding:8px;">Amostras</th>
                  <th style="padding:8px;">Média (ms)</th>
                  <th style="padding:8px;">Mín (ms)</th>
                  <th style="padding:8px;">P95 (ms)</th>
                  <th style="padding:8px;">Máx (ms)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(summary).map(opKey => {
                  const s = summary[opKey];
                  return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                      <td style="padding:8px; font-weight:600; color:#ffffff;">${opKey}</td>
                      <td style="padding:8px; color:#cbd5e1;">${s.count}</td>
                      <td style="padding:8px; color:#7EE7FF;">${s.avgMs}</td>
                      <td style="padding:8px; color:#cbd5e1;">${s.minMs}</td>
                      <td style="padding:8px; color:#cbd5e1;">${s.p95Ms}</td>
                      <td style="padding:8px; color:${s.maxMs > 50 ? '#f87171' : '#cbd5e1'};">${s.maxMs}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </section>
  `;
}
