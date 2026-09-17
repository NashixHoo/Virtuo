// =============================================================
// VIRTUO V2 — REPOSITÓRIO DE MISSÕES (OFFLINE-FIRST)
// src/features/missions/missions-repository.js
// Firestore + LocalStorage fallback com resolução segura de conflitos
// =============================================================

let firestoreCtx = null;

async function getFirestoreMissionsCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        collection: firestoreMod.collection,
        doc: firestoreMod.doc,
        getDoc: firestoreMod.getDoc,
        getDocs: firestoreMod.getDocs,
        setDoc: firestoreMod.setDoc,
        deleteDoc: firestoreMod.deleteDoc
      };
      return firestoreCtx;
    } catch (e) {
      console.warn("[MissionsRepository] Firestore fallback:", e.message);
    }
  }
  return null;
}

const STORAGE_KEY = "virtuo_missions_cache_v2";
const SYNC_QUEUE_KEY = "virtuo_missions_sync_queue";

/**
 * Missões padrão para demonstração e experiência imediata
 */
export const DEFAULT_MISSIONS = [
  {
    id: "mission-culto-domingo",
    title: "Culto de Domingo — Noite de Louvor & Adoração",
    description: "Ministração com o repertório de celebração e comunhão. Banda completa com cordas, metais e vozes.",
    churchName: "Igreja Central da Fé",
    eventType: "culto",
    eventDate: "2026-09-20T19:00:00.000Z",
    leaderId: "leader-demo-01",
    leaderName: "Diogo Ramos (Líder Musical)",
    pastorId: "pastor-demo-01",
    pastorName: "Pastor Carlos Eduardo",
    status: "approved", // draft, pending, approved, active, completed, archived
    currentSongId: "demo-misterio-olaria",
    currentKey: "Cm",
    currentBpm: 74,
    isEasyPlay: false,
    currentSection: "Refrão",
    members: [
      { uid: "pastor-demo-01", name: "Pr. Carlos", role: "Pastor", instrument: "Palavra", checkedIn: true, isTuned: true, returnWorking: true },
      { uid: "leader-demo-01", name: "Diogo Ramos", role: "Líder Musical", instrument: "Violão", checkedIn: true, isTuned: true, returnWorking: true },
      { uid: "musician-01", name: "Mateus Silva", role: "Músico", instrument: "Teclado", checkedIn: true, isTuned: true, returnWorking: true },
      { uid: "musician-02", name: "Lucas Rocha", role: "Músico", instrument: "Baixo", checkedIn: false, isTuned: false, returnWorking: false },
      { uid: "musician-03", name: "Ana Clara", role: "Músico", instrument: "Vocal Soprano", checkedIn: true, isTuned: true, returnWorking: true },
      { uid: "musician-04", name: "Samuel Alves", role: "Músico", instrument: "Bateria", checkedIn: true, isTuned: true, returnWorking: true }
    ],
    songs: [
      { id: "demo-misterio-olaria", title: "Mistério na Olaria", artist: "Raquel Pereira", key: "Cm", bpm: 74, easyPlay: false, order: 1, status: "ready" },
      { id: "demo-raridade", title: "Raridade", artist: "Anderson Freire", key: "A", bpm: 72, easyPlay: false, order: 2, status: "ready" },
      { id: "demo-lugar-secreto", title: "Lugar Secreto", artist: "Gabriela Rocha", key: "F#m", bpm: 68, easyPlay: false, order: 3, status: "studying" },
      { id: "demo-bondade-deus", title: "Bondade de Deus", artist: "Isaías Saad", key: "G", bpm: 70, easyPlay: false, order: 4, status: "unstarted" }
    ],
    approvals: {
      pastorApproved: true,
      leaderApproved: true,
      leaderNotes: "Repertório aprovado. Ajustado o tom de Mistério na Olaria para Cm e mantido Raridade em A.",
      approvedAt: "2026-09-15T14:30:00.000Z",
      returnedAt: null
    },
    progress: {
      totalSongs: 4,
      readySongs: 2,
      studyingSongs: 1,
      unstartedSongs: 1,
      overallPercentage: 62
    },
    history: [
      { type: "created", title: "Missão criada", author: "Pastor Carlos", timestamp: "2026-09-14T10:00:00.000Z", details: "Missão agendada para Domingo" },
      { type: "sent_to_leader", title: "Enviada ao Líder", author: "Pastor Carlos", timestamp: "2026-09-14T10:05:00.000Z", details: "Aguardando validação musical" },
      { type: "approved", title: "Aprovada pelo Líder", author: "Diogo Ramos", timestamp: "2026-09-15T14:30:00.000Z", details: "Tons e BPMs confirmados" }
    ],
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-15T14:30:00.000Z"
  },
  {
    id: "mission-santa-ceia",
    title: "Culto Especial de Santa Ceia",
    description: "Repertório solene de gratidão, quebrantamento e adoração comunitária.",
    churchName: "Igreja Central da Fé",
    eventType: "culto",
    eventDate: "2026-10-04T09:00:00.000Z",
    leaderId: "leader-demo-01",
    leaderName: "Diogo Ramos (Líder Musical)",
    pastorId: "pastor-demo-01",
    pastorName: "Pastor Carlos Eduardo",
    status: "pending", // Aguardando aprovação do Líder
    currentSongId: "demo-porque-ele-vive",
    currentKey: "G",
    currentBpm: 68,
    isEasyPlay: false,
    currentSection: "Verso",
    members: [
      { uid: "pastor-demo-01", name: "Pr. Carlos", role: "Pastor", instrument: "Palavra", checkedIn: false, isTuned: false, returnWorking: false },
      { uid: "leader-demo-01", name: "Diogo Ramos", role: "Líder Musical", instrument: "Violão", checkedIn: false, isTuned: false, returnWorking: false }
    ],
    songs: [
      { id: "demo-porque-ele-vive", title: "Porque Ele Vive", artist: "Harpa Cristã", key: "G", bpm: 68, easyPlay: true, order: 1, status: "studying" },
      { id: "demo-maranata", title: "Maranata", artist: "Avivah", key: "C", bpm: 72, easyPlay: false, order: 2, status: "unstarted" }
    ],
    approvals: {
      pastorApproved: true,
      leaderApproved: false,
      leaderNotes: "",
      approvedAt: null,
      returnedAt: null
    },
    progress: {
      totalSongs: 2,
      readySongs: 0,
      studyingSongs: 1,
      unstartedSongs: 1,
      overallPercentage: 25
    },
    history: [
      { type: "created", title: "Missão criada", author: "Pastor Carlos", timestamp: "2026-09-15T18:00:00.000Z", details: "Santa Ceia agendada para Outubro" },
      { type: "sent_to_leader", title: "Enviada ao Líder", author: "Pastor Carlos", timestamp: "2026-09-15T18:05:00.000Z", details: "Pendente de análise de tonalidades" }
    ],
    createdAt: "2026-09-15T18:00:00.000Z",
    updatedAt: "2026-09-15T18:05:00.000Z"
  }
];

class MissionsRepository {
  constructor() {
    this._cache = this._loadFromCache();
    if (!this._cache || Object.keys(this._cache).length === 0) {
      this._seedDefaultMissions();
    }
  }

  _loadFromCache() {
    try {
      if (typeof localStorage === "undefined") return {};
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _saveToCache(data) {
    this._cache = data;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {}
  }

  _seedDefaultMissions() {
    const data = {};
    for (const m of DEFAULT_MISSIONS) {
      data[m.id] = m;
    }
    this._saveToCache(data);
  }

  /**
   * Resolução segura de conflitos: o registro com `updatedAt` mais recente prevalece.
   */
  resolveConflict(localItem, remoteItem) {
    if (!localItem) return remoteItem;
    if (!remoteItem) return localItem;

    const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
    const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();

    return remoteTime >= localTime ? remoteItem : localItem;
  }

  /**
   * Busca todas as missões (offline-first, sincroniza com Firestore em segundo plano se disponível)
   */
  async getAll() {
    const localList = Object.values(this._cache);

    // Se estivermos em ambiente de navegador com Firestore ativo, tenta buscar remoto
    if (typeof window !== "undefined") {
      try {
        const ctx = await getFirestoreMissionsCtx();
        if (ctx && ctx.db) {
          const q = ctx.collection(ctx.db, "missions");
          const snap = await ctx.getDocs(q);
          if (!snap.empty) {
            const updatedCache = { ...this._cache };
            snap.forEach((docSnap) => {
              const remoteItem = { id: docSnap.id, ...docSnap.data() };
              const localItem = updatedCache[docSnap.id];
              updatedCache[docSnap.id] = this.resolveConflict(localItem, remoteItem);
            });
            this._saveToCache(updatedCache);
            return Object.values(updatedCache).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
          }
        }
      } catch (err) {
        // Modo offline silencioso e gracioso
      }
    }

    return localList.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  }

  /**
   * Busca missão por ID
   */
  async getById(id) {
    if (!id) return null;
    if (this._cache[id]) return this._cache[id];

    if (typeof window !== "undefined") {
      try {
        const ctx = await getFirestoreMissionsCtx();
        if (ctx && ctx.db) {
          const snap = await ctx.getDoc(ctx.doc(ctx.db, "missions", id));
          if (snap.exists()) {
            const remote = { id: snap.id, ...snap.data() };
            this._cache[id] = remote;
            this._saveToCache(this._cache);
            return remote;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Salva ou atualiza uma missão (offline-first com sincronização)
   */
  async save(mission) {
    if (!mission || !mission.id) {
      throw new Error("Missão inválida para salvar: ID obrigatório");
    }

    const now = new Date().toISOString();
    const existing = this._cache[mission.id] || {};

    const updated = {
      ...existing,
      ...mission,
      updatedAt: now,
      createdAt: mission.createdAt || existing.createdAt || now
    };

    // 1. Salva imediatamente no cache local (0ms de latência)
    this._cache[updated.id] = updated;
    this._saveToCache(this._cache);

    // 2. Sincroniza com Firestore se disponível
    if (typeof window !== "undefined") {
      try {
        const ctx = await getFirestoreMissionsCtx();
        if (ctx && ctx.db) {
          await ctx.setDoc(ctx.doc(ctx.db, "missions", updated.id), updated, { merge: true });
        }
      } catch (err) {
        // Enfileira para sync futuro
        this._enqueueForSync(updated.id);
      }
    }

    return updated;
  }

  /**
   * Remove uma missão
   */
  async delete(id) {
    if (!id) return;
    delete this._cache[id];
    this._saveToCache(this._cache);

    if (typeof window !== "undefined") {
      try {
        const ctx = await getFirestoreMissionsCtx();
        if (ctx && ctx.db) {
          await ctx.deleteDoc(ctx.doc(ctx.db, "missions", id));
        }
      } catch {}
    }
  }

  _enqueueForSync(id) {
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      if (!queue.includes(id)) {
        queue.push(id);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch {}
  }
}

export const missionsRepository = new MissionsRepository();
