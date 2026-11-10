// =============================================================
// VIRTUO V2 — VIRTUO MOMENTS
// src/features/moments/moments-service.js
// Celebração e registro perpétuo de marcos da jornada de adoração
// =============================================================

import { notificationsService, NOTIFICATION_TYPES } from "../notifications/notifications-service.js";

export const MOMENT_DEFINITIONS = {
  PRIMEIRA_MINISTRACAO: {
    id: "primeira_ministracao",
    title: "Primeira Ministração",
    subtitle: "Consagração do Ministério de Louvor",
    badge: "✦ PRIMEIRO ALTAR",
    icon: "🕊️",
    description: "Você liderou e concluiu sua primeira missão musical com a igreja.",
    message: "‘Cantai-lhe um cântico novo; tocai bem e com júbilo.’ — Salmos 33:3. Que esta primeira ministração seja a semente de uma caminhada virtuosa dedicada ao altar."
  },
  DEZ_MISSOES: {
    id: "dez_missoes",
    title: "10 Missões Ministradas",
    subtitle: "Constância e Excelência",
    badge: "✦ MINISTÉRIO FIRME",
    icon: "🔥",
    description: "Alcançou a marca de 10 ministrações concluídas com a comunidade.",
    message: "A fidelidade no pouco constrói alicerces inabaláveis. Parabéns pela constância e entrega."
  },
  PRIMEIRA_BANDA: {
    id: "primeira_banda",
    title: "Primeira Banda Conectada",
    subtitle: "Unidade Musical",
    badge: "✦ HARMONIA VIVA",
    icon: "🥁",
    description: "Reuniu a equipe musical em sincronia e comunhão.",
    message: "O som de uma equipe alinhada em um só propósito ecoa além das cordas e teclas."
  },
  CEM_MUSICAS_ESTUDADAS: {
    id: "cem_musicas",
    title: "100 Músicas Estudadas",
    subtitle: "Virtuosismo & Repertório",
    badge: "✦ MESTRE DO REPERTÓRIO",
    icon: "📜",
    description: "Dominou 100 louvores e arranjos no Virtuo.",
    message: "A técnica aprimorada serve com excelência à adoração mais profunda."
  },
  PRIMEIRO_LIVE_SYNC: {
    id: "primeiro_live_sync",
    title: "Primeiro Live Sync",
    subtitle: "Sincronização em Tempo Real",
    badge: "✦ SINCRONIA TOTAL",
    icon: "⚡",
    description: "Ministrou com toda a banda sincronizada em milissegundos no palco.",
    message: "Tons, seções e BPM guiando a equipe com precisão invisível e fluidez total."
  }
};

const MOMENTS_STORAGE_KEY = "virtuo_unlocked_moments_v2";

class MomentsService {
  constructor() {
    this._unlockedMoments = this._load();
  }

  _load() {
    try {
      if (typeof localStorage === "undefined") return {};
      const raw = localStorage.getItem(MOMENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(this._unlockedMoments));
      }
    } catch {}
  }

  getUnlockedMoments() {
    return { ...this._unlockedMoments };
  }

  isUnlocked(momentId) {
    return Boolean(this._unlockedMoments[momentId]);
  }

  getMomentRecord(momentId) {
    return this._unlockedMoments[momentId] || null;
  }

  /**
   * Registra a conclusão da Primeira Ministração (ou outro momento)
   * @param {string} momentId
   * @param {Object} contextData - { missionId, churchName, date, songs, leaderName }
   * @returns {Object} O momento registrado
   */
  unlockMoment(momentId, contextData = {}) {
    const definition = MOMENT_DEFINITIONS[momentId.toUpperCase()] || MOMENT_DEFINITIONS.PRIMEIRA_MINISTRACAO;
    
    // Se já foi desbloqueado, retorna o existente sem sobrescrever a data original de consagração
    if (this._unlockedMoments[definition.id]) {
      return this._unlockedMoments[definition.id];
    }

    const record = {
      id: definition.id,
      title: definition.title,
      subtitle: definition.subtitle,
      badge: definition.badge,
      icon: definition.icon,
      message: definition.message,
      description: definition.description,
      unlockedAt: new Date().toISOString(),
      churchName: contextData.churchName || "Igreja Local",
      date: contextData.date || new Date().toISOString(),
      songs: Array.isArray(contextData.songs) ? contextData.songs : [],
      leaderName: contextData.leaderName || "Líder Musical",
      missionId: contextData.missionId || null
    };

    this._unlockedMoments[definition.id] = record;
    this._save();

    // Notifica internamente
    notificationsService.add({
      type: NOTIFICATION_TYPES.MOMENT_UNLOCKED,
      title: `Momento Desbloqueado: ${definition.title}`,
      message: `${definition.subtitle}. Registrado perpetuamente no seu perfil.`,
      missionId: contextData.missionId
    });

    return record;
  }

  /**
   * Avalia automaticamente as estatísticas do usuário para desbloquear conquistas
   */
  evaluateStats({ completedMissionsCount = 0, studiedSongsCount = 0, hasBand = false, hasLiveSync = false }) {
    if (completedMissionsCount >= 10 && !this.isUnlocked("dez_missoes")) {
      this.unlockMoment("dez_missoes");
    }
    if (studiedSongsCount >= 100 && !this.isUnlocked("cem_musicas")) {
      this.unlockMoment("cem_musicas");
    }
    if (hasBand && !this.isUnlocked("primeira_banda")) {
      this.unlockMoment("primeira_banda");
    }
    if (hasLiveSync && !this.isUnlocked("primeiro_live_sync")) {
      this.unlockMoment("primeiro_live_sync");
    }
  }
}

export const momentsService = new MomentsService();
