// =============================================================
// VIRTUO — ATIVIDADES, FAVORITOS E HISTÓRICO DO MÚSICO
// src/services/user-activity.js
// Requisito 23: Unificação de Favoritos, Músicas Recentes,
// Último Ensaio e Última Atividade sem duplicação de dados.
// Offline-first com sincronização assíncrona Firestore.
// =============================================================

const LOCAL_STORAGE_KEY_PREFIX = "virtuo_user_activity_";

let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        doc: firestoreMod.doc,
        getDoc: firestoreMod.getDoc,
        setDoc: firestoreMod.setDoc
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[UserActivityService] Firestore fallback:", err.message);
    }
  }
  return null;
}

class UserActivityServiceClass {
  constructor() {
    this.listeners = new Set();
    this.activeUserId = "guest";
    this.cachedActivity = null;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(data) {
    for (const cb of this.listeners) {
      try { cb(data); } catch {}
    }
  }

  _getEmptyState(userId = "guest") {
    return {
      userId,
      favorites: [],      // Array<{ songId, title, key, savedAt }>
      recentSongs: [],    // Array<{ songId, title, key, lastPlayedAt }>
      lastRehearsal: null,// { rehearsalId, name, date, accessedAt }
      lastActivity: null, // { type, description, timestamp }
      updatedAt: new Date().toISOString()
    };
  }

  _getLocalActivity(userId) {
    if (this.cachedActivity && this.cachedActivity.userId === userId) {
      return this.cachedActivity;
    }
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return this._getEmptyState(userId);
  }

  _saveLocalActivity(userId, data) {
    this.cachedActivity = data;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
      } catch {}
    }
  }

  /**
   * Obtém os registros consolidados de favoritos e histórico do usuário
   */
  async getUserActivity(userId = "guest") {
    this.activeUserId = userId;

    // 1. Tenta carregar do Firestore se online e autenticado
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_activity", userId);
        const snap = await ctx.getDoc(ref);
        const local = this._getLocalActivity(userId);

        if (snap.exists()) {
          const remote = snap.data();
          const merged = this._mergeActivity(local, remote);
          this.cachedActivity = merged;
          this._saveLocalActivity(userId, merged);
          return merged;
        } else if (local && (local.favorites.length > 0 || local.recentSongs.length > 0)) {
          ctx.setDoc(ref, local, { merge: true }).catch(() => {});
          this.cachedActivity = local;
          return local;
        }
      } catch (err) {
        console.warn("[UserActivityService.getUserActivity] Falha ao ler Firestore:", err.message);
      }
    }

    const local = this._getLocalActivity(userId);
    this.cachedActivity = local;
    return local;
  }

  _mergeActivity(local, remote) {
    if (!remote) return local;
    if (!local) return remote;

    // Unifica favoritos pelo songId
    const favMap = new Map();
    for (const f of (remote.favorites || [])) favMap.set(f.songId, f);
    for (const f of (local.favorites || [])) favMap.set(f.songId, f);

    // Unifica músicas recentes preservando ordem cronológica
    const recentMap = new Map();
    for (const r of [...(local.recentSongs || []), ...(remote.recentSongs || [])]) {
      const existing = recentMap.get(r.songId);
      if (!existing || new Date(r.lastPlayedAt || 0) > new Date(existing.lastPlayedAt || 0)) {
        recentMap.set(r.songId, r);
      }
    }
    const recentSongs = Array.from(recentMap.values())
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
      .slice(0, 25);

    // Seleciona o último ensaio mais recente
    const localRehearsalTime = new Date(local.lastRehearsal?.accessedAt || 0).getTime();
    const remoteRehearsalTime = new Date(remote.lastRehearsal?.accessedAt || 0).getTime();
    const lastRehearsal = localRehearsalTime >= remoteRehearsalTime ? local.lastRehearsal : remote.lastRehearsal;

    return {
      userId: local.userId || remote.userId,
      favorites: Array.from(favMap.values()),
      recentSongs,
      lastRehearsal,
      lastActivity: local.lastActivity || remote.lastActivity,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Alterna status de favorito para uma música
   */
  async toggleFavorite(userId = "guest", songData = {}) {
    const activity = await this.getUserActivity(userId);
    const songId = songData.id || songData.songId;
    if (!songId) return activity;

    const existingIndex = activity.favorites.findIndex(f => f.songId === songId);
    if (existingIndex >= 0) {
      activity.favorites.splice(existingIndex, 1);
    } else {
      activity.favorites.unshift({
        songId,
        title: songData.title || "Canção",
        key: songData.key || songData.originalKey || "G",
        savedAt: new Date().toISOString()
      });
    }

    activity.updatedAt = new Date().toISOString();
    return await this._persistActivity(userId, activity);
  }

  /**
   * Registra música reproduzida no histórico recente
   */
  async recordRecentSong(userId = "guest", songData = {}) {
    const activity = await this.getUserActivity(userId);
    const songId = songData.id || songData.songId;
    if (!songId) return activity;

    // Remove ocorrência anterior se houver
    activity.recentSongs = activity.recentSongs.filter(r => r.songId !== songId);
    activity.recentSongs.unshift({
      songId,
      title: songData.title || "Canção",
      key: songData.key || songData.originalKey || "G",
      bpm: songData.bpm || 74,
      lastPlayedAt: new Date().toISOString()
    });

    if (activity.recentSongs.length > 25) {
      activity.recentSongs.pop();
    }

    activity.lastActivity = {
      type: "song_play",
      description: `Tocou ${songData.title || 'Canção'}`,
      timestamp: new Date().toISOString()
    };

    activity.updatedAt = new Date().toISOString();
    return await this._persistActivity(userId, activity);
  }

  /**
   * Registra acesso ao ensaio
   */
  async recordRehearsalAccess(userId = "guest", rehearsal = {}) {
    const activity = await this.getUserActivity(userId);
    if (!rehearsal.id) return activity;

    activity.lastRehearsal = {
      rehearsalId: rehearsal.id,
      name: rehearsal.name || "Ensaio",
      date: rehearsal.date || new Date().toISOString().slice(0, 10),
      accessedAt: new Date().toISOString()
    };

    activity.lastActivity = {
      type: "rehearsal_access",
      description: `Acessou ${rehearsal.name || 'Ensaio'}`,
      timestamp: new Date().toISOString()
    };

    activity.updatedAt = new Date().toISOString();
    return await this._persistActivity(userId, activity);
  }

  async _persistActivity(userId, activity) {
    this.cachedActivity = activity;
    this._saveLocalActivity(userId, activity);
    this._notify(activity);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_activity", userId);
        await ctx.setDoc(ref, activity, { merge: true });
      } catch (err) {
        console.warn("[UserActivityService] Erro ao sincronizar Firestore:", err.message);
      }
    }

    return activity;
  }
}

export const VirtuoUserActivityService = new UserActivityServiceClass();
