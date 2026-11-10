// =============================================================
// VIRTUO PERFORMANCE HISTORY SERVICE
// src/features/performance/performance-history.js
// Local storage persistence for vocal & performance training sessions
// 100% Client-Side - Zero external database requirement
// =============================================================

const STORAGE_KEY = "virtuo_performance_history_v2";

export class PerformanceHistoryService {
  constructor() {
    this.storageKey = STORAGE_KEY;
  }

  getAllSessions() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("[PerformanceHistory] Erro ao carregar histórico local:", e);
      return [];
    }
  }

  saveSession(sessionData) {
    try {
      const sessions = this.getAllSessions();
      const newSession = {
        id: sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date: sessionData.date || new Date().toISOString(),
        mode: sessionData.mode || "performance", // "performance" | "vocal_tuner" | "notes" | "intervals"
        songId: sessionData.songId || null,
        songTitle: sessionData.songTitle || "Treino Livre",
        songKey: sessionData.songKey || "G",
        bpm: Number(sessionData.bpm) || 74,
        score: Math.round(sessionData.score || 0),
        pitchScore: Math.round(sessionData.pitchScore || 0),
        rhythmScore: Math.round(sessionData.rhythmScore || 0),
        stabilityScore: Math.round(sessionData.stabilityScore || 0),
        consistencyScore: Math.round(sessionData.consistencyScore || 0),
        duration: Math.round(sessionData.duration || 0), // segundos
        strengths: sessionData.strengths || [],
        improvements: sessionData.improvements || [],
        metrics: sessionData.metrics || {}
      };

      sessions.unshift(newSession);

      // Limita o histórico local às 50 sessões mais recentes para economia de memória
      if (sessions.length > 50) {
        sessions.length = 50;
      }

      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      return newSession;
    } catch (e) {
      console.warn("[PerformanceHistory] Erro ao salvar sessão:", e);
      return null;
    }
  }

  deleteSession(id) {
    try {
      const sessions = this.getAllSessions().filter(s => s.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      return true;
    } catch (e) {
      console.warn("[PerformanceHistory] Erro ao excluir sessão:", e);
      return false;
    }
  }

  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (e) {
      console.warn("[PerformanceHistory] Erro ao limpar histórico:", e);
      return false;
    }
  }

  getOverallStats() {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        averagePitch: 0,
        averageRhythm: 0,
        averageStability: 0,
        totalTimeMinutes: 0
      };
    }

    const total = sessions.length;
    const avg = key => Math.round(sessions.reduce((acc, s) => acc + (s[key] || 0), 0) / total);
    const totalDurationSec = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    return {
      totalSessions: total,
      averageScore: avg("score"),
      averagePitch: avg("pitchScore"),
      averageRhythm: avg("rhythmScore"),
      averageStability: avg("stabilityScore"),
      totalTimeMinutes: Math.round(totalDurationSec / 60)
    };
  }
}

export const performanceHistory = new PerformanceHistoryService();
if (typeof window !== "undefined") {
  window.performanceHistory = performanceHistory;
}
