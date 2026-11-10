// =============================================================
// VIRTUO REHEARSALS REPOSITORY SERVICE
// Camada de serviço/repositório isolada para o Firestore
// Coleção: 'rehearsals' | Projeto: virtuo-7e01b
// =============================================================

// Dynamic Firebase bindings - loads on browser runtime seamlessly without breaking Node ESM test environments
let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  // Carrega apenas em ambiente web de navegador com suporte a ES Modules via rede
  if (typeof window !== "undefined" && typeof window.document !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        auth: fbConfig.auth,
        collection: firestoreMod.collection,
        doc: firestoreMod.doc,
        getDocs: firestoreMod.getDocs,
        getDoc: firestoreMod.getDoc,
        addDoc: firestoreMod.addDoc,
        updateDoc: firestoreMod.updateDoc,
        deleteDoc: firestoreMod.deleteDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        orderBy: firestoreMod.orderBy,
        onSnapshot: firestoreMod.onSnapshot,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[RehearsalsService] Firestore dynamic import:", err.message);
    }
  }
  return null;
}

// Lista de instrumentos canônicos suportados no VIRTUO
export const CANONICAL_INSTRUMENTS = [
  { id: "guitar", name: "Guitarra", icon: "🎸" },
  { id: "acoustic_guitar", name: "Violão", icon: "🎸" },
  { id: "bass", name: "Baixo", icon: "🎸" },
  { id: "keyboard", name: "Teclado", icon: "🎹" },
  { id: "drums", name: "Bateria", icon: "🥁" },
  { id: "vocals", name: "Vocal", icon: "🎤" }
];

// Status das músicas no checklist de ensaio
export const REHEARSAL_STATUSES = {
  NOT_REHEARSED: "not_rehearsed",
  IN_PROGRESS: "in_progress",
  REHEARSED: "rehearsed"
};

// Ensaio de demonstração inicial rico com o design Apple-Class do Virtuo
export const DEFAULT_DEMO_REHEARSAL = {
  id: "demo-ensaio-domingo",
  name: "Ensaio - Culto de Domingo",
  date: "2026-09-20",
  description: "Preparação oficial da equipe de louvor e adoração para a celebração de domingo.",
  ownerId: "virtuo-master",
  createdBy: "virtuo-master",
  instruments: ["guitar", "acoustic_guitar", "bass", "keyboard", "drums", "vocals"],
  songs: [
    {
      songId: "demo-misterio-olaria",
      order: 1,
      keyOffset: 0,
      bpm: 74,
      playMode: "easy",
      status: "rehearsed"
    },
    {
      songId: "demo-o-escudo",
      order: 2,
      keyOffset: 2, // Tom da banda: F#m (original Em +2)
      bpm: 68,
      playMode: "original",
      status: "in_progress"
    },
    {
      songId: "demo-deus-impossivel",
      order: 3,
      keyOffset: 0,
      bpm: 78, // BPM adaptado para a banda (original 72)
      playMode: "original",
      status: "not_rehearsed"
    },
    {
      songId: "demo-fogo-santo",
      order: 4,
      keyOffset: 0,
      bpm: 76,
      playMode: "easy",
      status: "not_rehearsed"
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const LOCAL_STORAGE_KEY = "virtuo_local_rehearsals_v1";

let inMemoryRehearsals = null;

function loadLocalRehearsals() {
  if (inMemoryRehearsals) return inMemoryRehearsals;
  if (typeof localStorage === "undefined") {
    inMemoryRehearsals = [DEFAULT_DEMO_REHEARSAL];
    return inMemoryRehearsals;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [DEFAULT_DEMO_REHEARSAL];
    const parsed = JSON.parse(raw);
    inMemoryRehearsals = Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_DEMO_REHEARSAL];
    return inMemoryRehearsals;
  } catch {
    return [DEFAULT_DEMO_REHEARSAL];
  }
}

function saveLocalRehearsals(rehearsals) {
  inMemoryRehearsals = rehearsals;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rehearsals));
  } catch (err) {
    console.warn("[RehearsalsService] Falha ao persistir localStorage:", err);
  }
}

export const RehearsalsService = {
  /**
   * Obtém todos os ensaios do usuário ou da sessão local.
   * Filtra por ownerId se o usuário estiver autenticado.
   */
  async getAllRehearsals(userUid) {
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : null);
    
    // Se o usuário estiver autenticado no Firebase, busca no Firestore
    if (currentUid && ctx && ctx.db) {
      try {
        const rehearsalsCol = ctx.collection(ctx.db, "rehearsals");
        // Consulta filtrada por usuário para segurança e isolamento
        const q = ctx.query(
          rehearsalsCol,
          ctx.where("ownerId", "==", currentUid),
          ctx.orderBy("createdAt", "desc")
        );
        const snap = await ctx.getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
        }
      } catch (err) {
        console.warn("[RehearsalsService.getAllRehearsals] Falha Firestore, usando fallback:", err.message);
      }
    }

    // Fallback: carregar ensaios locais / demonstração
    const local = loadLocalRehearsals();
    if (currentUid) {
      return local.filter(r => r.ownerId === currentUid || r.id === DEFAULT_DEMO_REHEARSAL.id);
    }
    return local;
  },

  /**
   * Busca um ensaio específico por ID no Firestore ou no armazenamento local.
   */
  async getRehearsalById(rehearsalId) {
    if (!rehearsalId) return null;
    const ctx = await getFirestoreCtx();

    if (ctx && ctx.db && !rehearsalId.startsWith("demo-") && !rehearsalId.startsWith("local-")) {
      try {
        const docRef = ctx.doc(ctx.db, "rehearsals", rehearsalId);
        const snap = await ctx.getDoc(docRef);
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() };
        }
      } catch (err) {
        console.warn("[RehearsalsService.getRehearsalById] Erro Firestore:", err.message);
      }
    }

    const localList = loadLocalRehearsals();
    const found = localList.find(r => r.id === rehearsalId);
    return found || (rehearsalId === DEFAULT_DEMO_REHEARSAL.id ? DEFAULT_DEMO_REHEARSAL : null);
  },

  /**
   * Cria um novo ensaio no Firestore.
   * Aplica isolamento de usuário através de ownerId e createdBy.
   */
  async createRehearsal(rehearsalData, userUid) {
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : "local-user");
    
    const payload = {
      name: (rehearsalData.name || "Novo Ensaio").trim(),
      date: (rehearsalData.date || new Date().toISOString().slice(0, 10)).trim(),
      description: (rehearsalData.description || "").trim(),
      missionId: rehearsalData.missionId || null,
      ownerId: currentUid,
      createdBy: currentUid,
      instruments: Array.isArray(rehearsalData.instruments) ? rehearsalData.instruments : ["guitar", "bass", "drums", "keyboard", "vocals"],
      songs: Array.isArray(rehearsalData.songs) ? rehearsalData.songs : [],
      createdAt: ctx && ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString(),
      updatedAt: ctx && ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
    };

    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const rehearsalsCol = ctx.collection(ctx.db, "rehearsals");
        const docRef = await ctx.addDoc(rehearsalsCol, payload);
        return docRef.id;
      } catch (err) {
        console.warn("[RehearsalsService.createRehearsal] Erro ao salvar no Firestore:", err.message);
      }
    }

    // Persistência local garantida
    const localList = loadLocalRehearsals();
    const localId = `local-rehearsal-${Date.now()}`;
    const localObj = {
      ...payload,
      id: localId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localList.unshift(localObj);
    saveLocalRehearsals(localList);
    return localId;
  },

  /**
   * Atualiza um ensaio existente no Firestore garantindo que o autor seja o proprietário.
   */
  async updateRehearsal(rehearsalId, updates, userUid) {
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : null);

    const updatePayload = {
      ...updates,
      updatedAt: ctx && ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
    };

    // Remove campos que não devem ser sobrescritos
    delete updatePayload.id;
    delete updatePayload.ownerId;
    delete updatePayload.createdBy;
    delete updatePayload.createdAt;

    if (ctx && ctx.db && !rehearsalId.startsWith("demo-") && !rehearsalId.startsWith("local-") && ctx.auth && ctx.auth.currentUser) {
      try {
        const docRef = ctx.doc(ctx.db, "rehearsals", rehearsalId);
        await ctx.updateDoc(docRef, updatePayload);
        return true;
      } catch (err) {
        console.warn("[RehearsalsService.updateRehearsal] Erro Firestore:", err.message);
      }
    }

    // Atualiza cópia local
    const localList = loadLocalRehearsals();
    const idx = localList.findIndex(r => r.id === rehearsalId);
    if (idx !== -1) {
      localList[idx] = {
        ...localList[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      saveLocalRehearsals(localList);
      return true;
    }

    // Se estiver atualizando o demo em memória/local
    if (rehearsalId === DEFAULT_DEMO_REHEARSAL.id) {
      Object.assign(DEFAULT_DEMO_REHEARSAL, updates, { updatedAt: new Date().toISOString() });
      saveLocalRehearsals([DEFAULT_DEMO_REHEARSAL, ...localList.filter(r => r.id !== rehearsalId)]);
      return true;
    }

    return false;
  },

  /**
   * Exclui um ensaio do Firestore.
   */
  async deleteRehearsal(rehearsalId, userUid) {
    const ctx = await getFirestoreCtx();

    if (ctx && ctx.db && !rehearsalId.startsWith("demo-") && !rehearsalId.startsWith("local-") && ctx.auth && ctx.auth.currentUser) {
      try {
        const docRef = ctx.doc(ctx.db, "rehearsals", rehearsalId);
        await ctx.deleteDoc(docRef);
      } catch (err) {
        console.warn("[RehearsalsService.deleteRehearsal] Erro Firestore:", err.message);
      }
    }

    const localList = loadLocalRehearsals().filter(r => r.id !== rehearsalId);
    saveLocalRehearsals(localList);
    return true;
  }
};
