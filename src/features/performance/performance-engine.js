// =============================================================
// VIRTUO PERFORMANCE ENGINE
// src/features/performance/performance-engine.js
// Live tracking of vocal stability, tuning, rhythm, and song alignment
// 100% Deterministic & Mathematical Scoring - Zero AI dependencies
// =============================================================

import { virtuoVoiceDetector } from "../../audio/voice-detector.js";
import { virtuoMetronome } from "../../audio/metronome-controller.js";
import { performanceHistory } from "./performance-history.js";
import { VirtuoMusicIntelligence } from "../../music/music-intelligence.js";

// Escalas Maiores e Menores para validação de tonalidade
const SCALE_INTERVALS_MAJOR = [0, 2, 4, 5, 7, 9, 11]; // T, T, st, T, T, T, st
const SCALE_INTERVALS_MINOR = [0, 2, 3, 5, 7, 8, 10]; // T, st, T, T, st, T, T

export class PerformanceEngine {
  constructor() {
    this.isActive = false;
    this.currentSong = null;
    this.startTime = null;
    this.endTime = null;
    this.sessionTimer = null;
    this.elapsedSeconds = 0;

    // Métricas Brutas da Sessão
    this.framesProcessed = 0;
    this.singingFrames = 0;
    this.silenceFrames = 0;
    this.inTuneFrames = 0;
    this.stableFrames = 0;
    
    // Análise de Entradas e Ritmo
    this.onsets = []; // { timestamp, timeSinceLastBeat, errorMs, isOnBeat }
    this.lastFrameWasSilence = true;
    this.entryCount = 0;
    this.pauseCount = 0;
    this.allCentsDeviations = [];
    this.detectedNotes = [];

    // Tonalidade e Escala de Referência
    this.scaleNotes = new Set();
    this.rootMidi = 60; // Dó padrão
    this.beatIntervalMs = 800; // 75 BPM padrão

    this.listeners = new Set();
    this.lastReport = null;
  }

  onUpdate(fn) {
    if (typeof fn === "function") this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify(data) {
    this.listeners.forEach(fn => {
      try { fn(data); } catch (e) { console.warn("[PerformanceEngine] Listener error:", e); }
    });
  }

  // =============================================================
  // INÍCIO E ENCERRAMENTO DA SESSÃO
  // =============================================================
  async startSession(song) {
    if (this.isActive) {
      this.stopSession();
    }

    this.currentSong = song || {
      title: "Treino Livre de Performance",
      originalKey: "G",
      bpm: 74,
      chords: "G  C  D  Em"
    };

    // 1. Configura tonalidade e escala
    this._setupKeyAndScale(this.currentSong.originalKey || this.currentSong.key || "G");

    // 2. Configura BPM e Metrônomo
    const bpm = Number(this.currentSong.bpm) || 74;
    this.beatIntervalMs = (60 / bpm) * 1000;

    // Inicia metrônomo de referência sonora se desejado
    virtuoMetronome.setBpm(bpm);

    // 3. Reseta contadores e telemetria
    this.startTime = performance.now();
    this.endTime = null;
    this.elapsedSeconds = 0;
    this.framesProcessed = 0;
    this.singingFrames = 0;
    this.silenceFrames = 0;
    this.inTuneFrames = 0;
    this.stableFrames = 0;
    this.onsets = [];
    this.lastFrameWasSilence = true;
    this.entryCount = 0;
    this.pauseCount = 0;
    this.allCentsDeviations = [];
    this.detectedNotes = [];
    this.lastReport = null;

    // 4. Inicia detector vocal
    await virtuoVoiceDetector.start();
    this.unsubscribePitch = virtuoVoiceDetector.onPitchDetected((pitch) => {
      this._processFrame(pitch);
    });

    this.isActive = true;

    // Timer de segundos
    this.sessionTimer = setInterval(() => {
      this.elapsedSeconds++;
      this._notifyCurrentMetrics();
    }, 1000);

    this._notifyCurrentMetrics();
    return true;
  }

  stopSession() {
    if (!this.isActive) return this.lastReport;

    this.endTime = performance.now();
    this.isActive = false;

    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (this.unsubscribePitch) {
      this.unsubscribePitch();
      this.unsubscribePitch = null;
    }

    virtuoVoiceDetector.stop();

    // 5. Gera relatório final determinístico
    this.lastReport = this._generateFinalReport();

    // 6. Salva sessão no histórico local
    performanceHistory.saveSession(this.lastReport);

    this._notify({ type: "session_ended", report: this.lastReport });
    return this.lastReport;
  }

  // =============================================================
  // PROCESSAMENTO DE CADA FRAME DE ÁUDIO
  // =============================================================
  _processFrame(pitch) {
    if (!this.isActive) return;

    this.framesProcessed++;
    const now = performance.now();

    if (!pitch || pitch.isSilence || !pitch.note || pitch.confidence < 0.65) {
      this.silenceFrames++;
      if (!this.lastFrameWasSilence) {
        this.pauseCount++;
        this.lastFrameWasSilence = true;
      }
      return;
    }

    // O usuário está cantando
    this.singingFrames++;
    const isNewEntry = this.lastFrameWasSilence;
    if (isNewEntry) {
      this.entryCount++;
      this.lastFrameWasSilence = false;
      this._recordOnset(now);
    }

    // 1. Verificação de Afinação e Escala
    const normNote = pitch.note;
    const isScaleNote = this.scaleNotes.has(normNote);
    const centsError = Math.abs(pitch.cents || 0);

    if (isScaleNote && centsError <= 28) {
      this.inTuneFrames++;
    }

    this.allCentsDeviations.push(pitch.cents);
    if (!this.detectedNotes.includes(`${normNote}${pitch.octave}`)) {
      this.detectedNotes.push(`${normNote}${pitch.octave}`);
    }

    // 2. Estabilidade
    if (pitch.stability >= 70) {
      this.stableFrames++;
    }
  }

  _recordOnset(timestamp) {
    const elapsedSinceStart = timestamp - this.startTime;
    const beatPhase = elapsedSinceStart % this.beatIntervalMs;
    const timeToNearestBeat = Math.min(beatPhase, this.beatIntervalMs - beatPhase);

    // Tolerância rítmica aceitável para ataque vocal (±130ms)
    const isOnBeat = timeToNearestBeat <= 130;
    const isEarly = beatPhase > (this.beatIntervalMs / 2);

    this.onsets.push({
      timestamp,
      offsetMs: timeToNearestBeat,
      isEarly,
      isOnBeat
    });
  }

  // =============================================================
  // CONFIGURAÇÃO DE ESCALA
  // =============================================================
  _setupKeyAndScale(keyStr) {
    this.scaleNotes.clear();
    const isMinor = keyStr.includes("m") && !keyStr.includes("maj");
    const rootName = keyStr.replace(/m|maj|sus|[0-9]/g, "").trim();

    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let rootIndex = NOTE_NAMES.indexOf(rootName);
    if (rootIndex === -1) rootIndex = 7; // G por padrão

    const intervals = isMinor ? SCALE_INTERVALS_MINOR : SCALE_INTERVALS_MAJOR;
    intervals.forEach(step => {
      const idx = (rootIndex + step) % 12;
      this.scaleNotes.add(NOTE_NAMES[idx]);
    });
  }

  // =============================================================
  // CÁLCULO DETERMINÍSTICO DE PONTUAÇÃO
  // =============================================================
  getCurrentScores() {
    if (this.singingFrames === 0) {
      return {
        pitchScore: 0,
        rhythmScore: 0,
        stabilityScore: 0,
        consistencyScore: 0,
        overallScore: 0
      };
    }

    // 1. Afinação: Porcentagem de frames cantados afinados dentro da escala
    const pitchScore = Math.max(0, Math.min(100, Math.round((this.inTuneFrames / this.singingFrames) * 100)));

    // 2. Ritmo: Porcentagem de ataques alinhados aos tempos do compasso
    let rhythmScore = 80;
    if (this.onsets.length > 0) {
      const onBeatCount = this.onsets.filter(o => o.isOnBeat).length;
      rhythmScore = Math.max(0, Math.min(100, Math.round((onBeatCount / this.onsets.length) * 100)));
    }

    // 3. Estabilidade: Porcentagem de sustentação sem flutuação
    const stabilityScore = Math.max(0, Math.min(100, Math.round((this.stableFrames / this.singingFrames) * 100)));

    // 4. Consistência: Desvio padrão de afinação
    let consistencyScore = 85;
    if (this.allCentsDeviations.length > 5) {
      const avg = this.allCentsDeviations.reduce((a, b) => a + b, 0) / this.allCentsDeviations.length;
      const variance = this.allCentsDeviations.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / this.allCentsDeviations.length;
      const stdDev = Math.sqrt(variance);
      consistencyScore = Math.max(10, Math.min(100, Math.round(100 - (stdDev * 1.8))));
    }

    // 5. Pontuação Geral Ponderada Transparente
    // 35% Afinação + 25% Ritmo + 20% Estabilidade + 20% Consistência
    const overallScore = Math.round(
      (pitchScore * 0.35) +
      (rhythmScore * 0.25) +
      (stabilityScore * 0.20) +
      (consistencyScore * 0.20)
    );

    return {
      pitchScore,
      rhythmScore,
      stabilityScore,
      consistencyScore,
      overallScore
    };
  }

  _notifyCurrentMetrics() {
    if (!this.isActive) return;
    const scores = this.getCurrentScores();
    this._notify({
      type: "tick",
      elapsedSeconds: this.elapsedSeconds,
      scores,
      entryCount: this.entryCount,
      pauseCount: this.pauseCount,
      singingFrames: this.singingFrames
    });
  }

  // =============================================================
  // RELATÓRIO DETERMINÍSTICO E PONTOS DE MELHORIA
  // =============================================================
  _generateFinalReport() {
    const scores = this.getCurrentScores();
    const duration = this.elapsedSeconds;
    const song = this.currentSong;

    // Análise de Cents Médios
    let avgCentsDrift = 0;
    if (this.allCentsDeviations.length > 0) {
      avgCentsDrift = Math.round(
        this.allCentsDeviations.reduce((a, b) => a + b, 0) / this.allCentsDeviations.length
      );
    }

    // Pontos Fortes Reais baseados nas medições
    const strengths = [];
    if (scores.stabilityScore >= 85) {
      strengths.push("Excelente estabilidade e sustentação do ar nas notas longas");
    } else if (scores.stabilityScore >= 70) {
      strengths.push("Boa estabilidade geral na emissão vocal");
    }

    if (scores.pitchScore >= 85) {
      strengths.push(`Afinação consistente na tonalidade de ${song.originalKey || song.key || 'G'}`);
    }

    if (scores.rhythmScore >= 85) {
      strengths.push(`Ótima precisão temporal nos ataques e no BPM (${song.bpm || 74})`);
    }

    if (this.pauseCount > 0 && this.entryCount > 0) {
      strengths.push("Respeito adequado aos momentos de pausa e dinâmica congregacional");
    }

    if (strengths.length === 0) {
      strengths.push("Disposição vocal e engajamento constante na execução");
    }

    // Pontos para Melhorar Reais
    const improvements = [];
    if (avgCentsDrift > 10) {
      improvements.push(`Tendência de cantar ligeiramente acima da nota (+${avgCentsDrift} cents em média)`);
    } else if (avgCentsDrift < -10) {
      improvements.push(`Tendência de apoiar notas abaixo da afinação real (${avgCentsDrift} cents em média)`);
    }

    const earlyEntries = this.onsets.filter(o => !o.isOnBeat && o.isEarly).length;
    if (earlyEntries >= 3) {
      improvements.push("Atenção às entradas antecipadas antes da batida do metrônomo");
    }

    if (scores.stabilityScore < 70) {
      improvements.push("Exercitar apoio diafragmático para reduzir oscilação nas notas sustentadas");
    }

    if (scores.pitchScore < 75) {
      improvements.push(`Revisar os graus da escala de ${song.originalKey || song.key || 'G'} com o Afinador Vocal`);
    }

    if (improvements.length === 0) {
      improvements.push("Manter o padrão técnico e explorar variações melódicas nos refrões");
    }

    return {
      id: `perf_${Date.now()}`,
      date: new Date().toISOString(),
      mode: "performance",
      songId: song.id || "free-vocal",
      songTitle: song.title || "Louvor Selecionado",
      songKey: song.originalKey || song.key || "G",
      bpm: Number(song.bpm) || 74,
      score: scores.overallScore,
      pitchScore: scores.pitchScore,
      rhythmScore: scores.rhythmScore,
      stabilityScore: scores.stabilityScore,
      consistencyScore: scores.consistencyScore,
      duration,
      strengths,
      improvements,
      metrics: {
        totalFrames: this.framesProcessed,
        singingFrames: this.singingFrames,
        silenceFrames: this.silenceFrames,
        entryCount: this.entryCount,
        pauseCount: this.pauseCount,
        avgCentsDrift,
        notesSungCount: this.detectedNotes.length,
        notesSung: this.detectedNotes.slice(0, 15)
      }
    };
  }
}

export const performanceEngine = new PerformanceEngine();
if (typeof window !== "undefined") {
  window.performanceEngine = performanceEngine;
}
