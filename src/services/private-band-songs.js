// =============================================================
// VIRTUO PRIVATE BAND SONGS REPOSITORY & SERVICE
// src/services/private-band-songs.js
// Gestão de Repertório Privado da Banda — Estritamente Isolado
// =============================================================

import { generateEasyPlaySheet } from "../music/easy-play.js";
import { calculateKey } from "../music/transposer.js";

let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    try {
      const fbConfig = await import("../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        auth: fbConfig.auth,
        collection: firestoreMod.collection,
        doc: firestoreMod.doc,
        getDocs: firestoreMod.getDocs,
        getDoc: firestoreMod.getDoc,
        setDoc: firestoreMod.setDoc,
        addDoc: firestoreMod.addDoc,
        updateDoc: firestoreMod.updateDoc,
        deleteDoc: firestoreMod.deleteDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        orderBy: firestoreMod.orderBy,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (e) {
      console.warn("[PrivateBandSongsService] Firestore dinâmico indisponível:", e.message);
      return null;
    }
  }
  return null;
}

/**
 * Constantes de escopo e visibilidade do repertório privado
 */
export const PRIVATE_REPERTOIRE_CONSTANTS = {
  VISIBILITY: "private",
  CONTENT_SCOPE: "band",
  IS_DEVELOPMENT_CONTENT: true,
  PUBLIC_LIBRARY: false,
  CATEGORY_HARPA: "harpa-crista",
  CATEGORY_OUTROS: "outros",
  CATEGORY_LOUVOR: "louvor",
  CATEGORY_AVIVAMENTO: "avivamento",
  OFFLINE_CACHE_PREFIX: "virtuo_private_band_songs_",
  SAFETY_CONFIRMATION_MESSAGE: "Este repertório pertence ao espaço privado da banda. Confirme que possui autorização para disponibilizá-lo publicamente."
};

/**
 * Normaliza e sanitiza um item do repertório privado da banda
 */
export function normalizePrivateBandSong(raw, fallbackOwnerId = "offline-user", fallbackBandId = "band-alianca-v2") {
  let ownerId = raw.ownerId || fallbackOwnerId;
  let bandId = raw.bandId || fallbackBandId;

  // Auto-detecção inteligente caso parâmetros sejam passados na ordem (raw, bandId, ownerId)
  if (fallbackOwnerId && fallbackOwnerId.startsWith("band-") && fallbackBandId && fallbackBandId.startsWith("user-")) {
    bandId = fallbackOwnerId;
    ownerId = fallbackBandId;
  }

  const title = (raw.title || "").trim() || "Sem Título";
  const hymnNum = raw.hymnNumber !== undefined && raw.hymnNumber !== null && raw.hymnNumber !== "" 
    ? String(raw.hymnNumber).padStart(3, "0") 
    : null;
  const originalKey = (raw.originalKey || raw.key || "G").trim().toUpperCase();
  const bpm = Number(raw.bpm) || 74;
  const timeSignature = raw.timeSignature || "4/4";
  const capo = Number(raw.capo) || 0;
  const difficulty = raw.difficulty || "Fácil";
  const structure = raw.structure || "Intro • Verso • Refrão • Final";
  const category = raw.category || (hymnNum ? PRIVATE_REPERTOIRE_CONSTANTS.CATEGORY_HARPA : PRIVATE_REPERTOIRE_CONSTANTS.CATEGORY_OUTROS);
  const chords = raw.chords || raw.chordSheet || "";
  const lyrics = raw.lyrics || "";
  const sourceNote = raw.sourceNote || "Repertório privado para ensaio e desenvolvimento interno";

  // Gera versão facilitada determinística através do próprio motor Easy Play do Virtuo
  const easyChords = raw.easyChords || raw.easyChordSheet || generateEasyPlaySheet(chords);

  const originalVersion = {
    key: originalKey,
    bpm,
    timeSignature,
    capo,
    structure,
    chords
  };

  const simplifiedVersion = {
    key: originalKey,
    capo,
    structure,
    chords: easyChords
  };

  return {
    id: raw.id || `priv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title,
    hymnNumber: hymnNum,
    category,
    originalKey,
    key: originalKey,
    bpm,
    timeSignature,
    capo,
    difficulty,
    structure,
    chords,
    chordSheet: chords,
    easyChords,
    easyChordSheet: easyChords,
    lyrics,
    artist: raw.artist || (hymnNum ? `Harpa Cristã #${hymnNum}` : "Repertório da Banda"),
    composer: raw.composer || "",
    sourceType: raw.sourceType || "user",
    sourceNote,
    // Flags estritas de isolamento e segurança
    visibility: PRIVATE_REPERTOIRE_CONSTANTS.VISIBILITY,
    contentScope: PRIVATE_REPERTOIRE_CONSTANTS.CONTENT_SCOPE,
    isDevelopmentContent: PRIVATE_REPERTOIRE_CONSTANTS.IS_DEVELOPMENT_CONTENT,
    publicLibrary: PRIVATE_REPERTOIRE_CONSTANTS.PUBLIC_LIBRARY,
    bandId: bandId,
    bandName: raw.bandName || "Banda de Ensaio",
    ownerId: ownerId,
    createdBy: raw.createdBy || ownerId,
    allowedMemberUids: Array.isArray(raw.allowedMemberUids) ? raw.allowedMemberUids : [ownerId],
    originalVersion,
    simplifiedVersion,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Validação de autorização RBAC para o repertório privado
 */
export function isUserAuthorizedForPrivateBand(user, userProfile, band, song = null) {
  // Se for administrador geral da plataforma
  if (userProfile && (userProfile.role === "admin" || userProfile.isCelestial)) {
    return true;
  }
  if (!user) {
    // Modo offline local com banda ativa demo para testes locais do desenvolvedor
    return true;
  }

  const uid = user.uid;

  // Se a canção tiver sido informada
  if (song) {
    if (song.ownerId === uid) return true;
    if (Array.isArray(song.allowedMemberUids) && song.allowedMemberUids.includes(uid)) return true;
  }

  // Se a banda estiver associada
  if (band) {
    if (band.adminId === uid || band.ownerId === uid) return true;
    if (Array.isArray(band.members)) {
      return band.members.some(m => {
        if (typeof m === "string") return m === uid;
        const memberUid = m.uid || m.userId || m.id;
        return memberUid === uid && m.confirmed !== false;
      });
    }
  }

  return false;
}

/**
 * Serviço completo de Repertório Privado da Banda
 */
export const PrivateBandSongsService = {
  /**
   * Obtém a chave do cache local offline para a banda
   */
  getCacheKey(bandId) {
    return `${PRIVATE_REPERTOIRE_CONSTANTS.OFFLINE_CACHE_PREFIX}${bandId || "default"}`;
  },

  /**
   * Lê o cache local offline para uma banda autorizada
   */
  getLocalCache(bandId) {
    try {
      const key = this.getCacheKey(bandId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("[PrivateBandSongsService] Erro ao ler cache offline:", err);
      return [];
    }
  },

  /**
   * Salva dados no cache local offline isolado
   */
  setLocalCache(bandId, songs) {
    try {
      const key = this.getCacheKey(bandId);
      localStorage.setItem(key, JSON.stringify(songs));
    } catch (err) {
      console.warn("[PrivateBandSongsService] Erro ao salvar cache offline:", err);
    }
  },

  /**
   * Limpa todos os caches offline privados ao fazer logout
   */
  clearAllPrivateCaches() {
    try {
      const toRemove = [];
      const len = localStorage.length;
      for (let i = 0; i < len; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PRIVATE_REPERTOIRE_CONSTANTS.OFFLINE_CACHE_PREFIX)) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        localStorage.removeItem(k);
      }
    } catch (err) {
      console.warn("[PrivateBandSongsService] Erro ao limpar caches privados:", err);
    }
  },

  /**
   * Obtém músicas da banda pelo ID (alias direto com fallback de cache)
   */
  async getBandSongs(bandId = "band-alianca-v2") {
    const localCache = this.getLocalCache(bandId);
    const ctx = await getFirestoreCtx();

    if (ctx && ctx.db) {
      try {
        const colRef = ctx.collection(ctx.db, "private_band_songs");
        const q = ctx.query(
          colRef,
          ctx.where("bandId", "==", bandId),
          ctx.where("visibility", "==", PRIVATE_REPERTOIRE_CONSTANTS.VISIBILITY),
          ctx.orderBy("createdAt", "desc")
        );
        const snap = await ctx.getDocs(q);
        if (!snap.empty) {
          const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.setLocalCache(bandId, songs);
          return songs;
        }
      } catch (err) {
        console.warn("[PrivateBandSongsService.getBandSongs] Firestore indisponível:", err.message);
      }
    }
    return localCache;
  },

  /**
   * Alias de cache offline
   */
  getBandSongsOffline(bandId) {
    return this.getLocalCache(bandId);
  },

  cacheBandSongsOffline(bandId, songs) {
    return this.setLocalCache(bandId, songs);
  },

  /**
   * Obtém uma canção específica pelo ID
   */
  async getSongById(songId, bandId = "band-alianca-v2") {
    const songs = await this.getBandSongs(bandId);
    return songs.find(s => s.id === songId) || null;
  },

  /**
   * Lista todas as músicas privadas da banda com verificação de autorização RBAC
   */
  async getPrivateSongs(bandId, user, userProfile, band) {
    if (!isUserAuthorizedForPrivateBand(user, userProfile, band)) {
      throw new Error("Acesso negado: Você não possui permissão para visualizar o repertório privado desta banda.");
    }
    return this.getBandSongs(bandId);
  },

  /**
   * Criação direta de louvor privado
   */
  async createSong(songData, uid = "offline-user") {
    const bandId = songData.bandId || "band-alianca-v2";
    const normalized = normalizePrivateBandSong(songData, uid, bandId);
    normalized.visibility = PRIVATE_REPERTOIRE_CONSTANTS.VISIBILITY;
    normalized.contentScope = PRIVATE_REPERTOIRE_CONSTANTS.CONTENT_SCOPE;
    normalized.isDevelopmentContent = PRIVATE_REPERTOIRE_CONSTANTS.IS_DEVELOPMENT_CONTENT;
    normalized.publicLibrary = PRIVATE_REPERTOIRE_CONSTANTS.PUBLIC_LIBRARY;

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const docRef = ctx.doc(ctx.db, "private_band_songs", normalized.id);
        await ctx.setDoc(docRef, normalized, { merge: true });
      } catch (err) {
        console.warn("[PrivateBandSongsService.createSong] Firestore indisponível:", err.message);
      }
    }

    const current = this.getLocalCache(bandId);
    current.unshift(normalized);
    this.setLocalCache(bandId, current);
    return normalized;
  },

  /**
   * Atualização direta de louvor privado
   */
  async updateSong(songId, updates, uid = "offline-user") {
    const bandId = updates.bandId || "band-alianca-v2";
    const current = this.getLocalCache(bandId);
    const existingIndex = current.findIndex(s => s.id === songId);
    const existing = existingIndex >= 0 ? current[existingIndex] : { id: songId, bandId };

    const merged = {
      ...existing,
      ...updates,
      id: songId,
      visibility: PRIVATE_REPERTOIRE_CONSTANTS.VISIBILITY,
      contentScope: PRIVATE_REPERTOIRE_CONSTANTS.CONTENT_SCOPE,
      isDevelopmentContent: PRIVATE_REPERTOIRE_CONSTANTS.IS_DEVELOPMENT_CONTENT,
      publicLibrary: PRIVATE_REPERTOIRE_CONSTANTS.PUBLIC_LIBRARY,
      updatedAt: new Date().toISOString()
    };

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const docRef = ctx.doc(ctx.db, "private_band_songs", songId);
        await ctx.setDoc(docRef, merged, { merge: true });
      } catch (err) {
        console.warn("[PrivateBandSongsService.updateSong] Firestore indisponível:", err.message);
      }
    }

    if (existingIndex >= 0) {
      current[existingIndex] = merged;
    } else {
      current.unshift(merged);
    }
    this.setLocalCache(bandId, current);
    return merged;
  },

  /**
   * Salva ou atualiza uma música no repertório privado (com RBAC)
   */
  async savePrivateSong(songData, user, userProfile, band) {
    if (!isUserAuthorizedForPrivateBand(user, userProfile, band, songData)) {
      throw new Error("Acesso negado: Você não possui autorização para editar ou adicionar músicas no repertório privado.");
    }
    const uid = user ? user.uid : "offline-user";
    if (songData.id) {
      return this.updateSong(songData.id, songData, uid);
    }
    return this.createSong(songData, uid);
  },

  /**
   * Exclusão direta por ID
   */
  async deleteSong(songId, uid = "offline-user", bandId = null) {
    let effectiveBandId = bandId;
    if (!effectiveBandId) {
      const len = localStorage.length;
      for (let i = 0; i < len; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PRIVATE_REPERTOIRE_CONSTANTS.OFFLINE_CACHE_PREFIX)) {
          try {
            const list = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(list) && list.some(s => s.id === songId)) {
              effectiveBandId = k.replace(PRIVATE_REPERTOIRE_CONSTANTS.OFFLINE_CACHE_PREFIX, "");
              break;
            }
          } catch {}
        }
      }
    }
    if (!effectiveBandId) effectiveBandId = "band-alianca-v2";

    const current = this.getLocalCache(effectiveBandId);
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const docRef = ctx.doc(ctx.db, "private_band_songs", songId);
        await ctx.deleteDoc(docRef);
      } catch (err) {
        console.warn("[PrivateBandSongsService.deleteSong] Firestore indisponível:", err.message);
      }
    }
    const updated = current.filter(s => s.id !== songId);
    this.setLocalCache(effectiveBandId, updated);
    return true;
  },

  /**
   * Exclui uma música do repertório privado com validação de acesso
   */
  async deletePrivateSong(songId, bandId, user, userProfile, band) {
    const current = this.getLocalCache(bandId);
    const targetSong = current.find(s => s.id === songId);

    if (!isUserAuthorizedForPrivateBand(user, userProfile, band, targetSong)) {
      throw new Error("Acesso negado: Você não possui permissão para excluir esta música privada.");
    }

    return this.deleteSong(songId, user?.uid, bandId);
  },

  /**
   * Importação em lote direta
   */
  async batchImportSongs(bandId, items, uid = "offline-user") {
    if (!Array.isArray(items) || items.length === 0) {
      return { imported: 0, failed: 0 };
    }

    const importedList = [];
    const ctx = await getFirestoreCtx();

    for (const raw of items) {
      const song = normalizePrivateBandSong(raw, uid, bandId);
      song.visibility = PRIVATE_REPERTOIRE_CONSTANTS.VISIBILITY;
      song.contentScope = PRIVATE_REPERTOIRE_CONSTANTS.CONTENT_SCOPE;
      song.isDevelopmentContent = PRIVATE_REPERTOIRE_CONSTANTS.IS_DEVELOPMENT_CONTENT;
      song.publicLibrary = PRIVATE_REPERTOIRE_CONSTANTS.PUBLIC_LIBRARY;
      importedList.push(song);

      if (ctx && ctx.db) {
        try {
          const docRef = ctx.doc(ctx.db, "private_band_songs", song.id);
          await ctx.setDoc(docRef, song, { merge: true });
        } catch (err) {
          console.warn("[PrivateBandSongsService.batchImportSongs] Firestore write fallback:", err.message);
        }
      }
    }

    const current = this.getLocalCache(bandId);
    const idMap = new Map(current.map(s => [s.id, s]));
    for (const song of importedList) {
      idMap.set(song.id, song);
    }
    const merged = Array.from(idMap.values()).sort((a, b) => {
      if (a.hymnNumber && b.hymnNumber) return Number(a.hymnNumber) - Number(b.hymnNumber);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    this.setLocalCache(bandId, merged);
    return { imported: importedList.length, failed: 0, items: merged };
  },

  /**
   * Importação privada em lote (JSON ou CSV Estruturado com RBAC)
   */
  async importBatch(items, bandId, user, userProfile, band) {
    if (!isUserAuthorizedForPrivateBand(user, userProfile, band)) {
      throw new Error("Acesso negado: Você não tem permissão para importar repertório para esta banda.");
    }
    const result = await this.batchImportSongs(bandId, items, user?.uid);
    return result.items || [];
  },

  /**
   * Parseador de CSV estruturado seguro para hinos e cifras da banda
   * Colunas aceitas: numero, titulo, tom, bpm, compasso, dificuldade, cifra, letra
   */
  parseCsv(csvContent, bandId, ownerId) {
    if (!csvContent || typeof csvContent !== "string") return [];
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(";").map(h => h.trim().toLowerCase());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(";");
      if (!parts[0]) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = (parts[idx] || "").trim();
      });

      const hymnNumber = row.numero || row.hymnnumber || row.hino || row.n || null;
      const title = row.titulo || row.title || (hymnNumber ? `Hino ${hymnNumber}` : `Música ${i}`);
      const key = row.tom || row.key || "G";
      const bpm = Number(row.bpm) || 74;
      const timeSignature = row.compasso || row.timesignature || "4/4";
      const difficulty = row.dificuldade || row.difficulty || "Fácil";
      const chords = row.cifra || row.chords || "";
      const lyrics = row.letra || row.lyrics || "";

      result.push(normalizePrivateBandSong({
        title,
        hymnNumber,
        category: hymnNumber ? PRIVATE_REPERTOIRE_CONSTANTS.CATEGORY_HARPA : PRIVATE_REPERTOIRE_CONSTANTS.CATEGORY_OUTROS,
        originalKey: key,
        bpm,
        timeSignature,
        difficulty,
        chords,
        lyrics,
        bandId,
        ownerId
      }, ownerId, bandId));
    }

    return result;
  },

  /**
   * Exporta repertório privado da banda em formato JSON limpo e isolado
   */
  exportRepertoireJson(songs, bandName = "Banda") {
    if (!Array.isArray(songs)) return "[]";
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        system: "VIRTUO V1",
        contentScope: "band",
        visibility: "private",
        bandName,
        totalSongs: songs.length,
        note: "Arquivo de backup do Repertório Privado da Banda para desenvolvimento e ensaios internos."
      },
      songs: songs.map(s => ({
        id: s.id,
        title: s.title,
        hymnNumber: s.hymnNumber,
        category: s.category,
        originalKey: s.originalKey,
        bpm: s.bpm,
        timeSignature: s.timeSignature,
        capo: s.capo,
        difficulty: s.difficulty,
        structure: s.structure,
        chords: s.chords,
        lyrics: s.lyrics,
        sourceType: s.sourceType,
        sourceNote: s.sourceNote,
        isDevelopmentContent: true,
        publicLibrary: false,
        visibility: "private",
        contentScope: "band",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    };
    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Validação de barreira para tentativa de publicação acidental
   */
  validatePublicationAttempt() {
    return {
      allowed: false,
      message: "Este repertório pertence ao espaço privado da banda. Confirme que possui autorização para disponibilizá-lo publicamente.",
      requiresExplicitConfirmation: true
    };
  }
};
