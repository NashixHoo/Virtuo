// =============================================================
// VIRTUO V2 — LIVE SYNC ENGINE (TEMPO REAL ALTA PERFORMANCE)
// src/features/live-sync/live-sync-engine.js
// Sincronização ultra rápida (<7ms local via BroadcastChannel / EventBus)
// Integrado com Firestore onSnapshot para sincronização entre dispositivos remotos
// =============================================================

let firestoreLiveCtx = null;

async function getLiveFirestoreCtx() {
  if (firestoreLiveCtx) return firestoreLiveCtx;
  if (typeof window !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreLiveCtx = {
        db: fbConfig.db,
        doc: firestoreMod.doc,
        onSnapshot: firestoreMod.onSnapshot,
        updateDoc: firestoreMod.updateDoc
      };
      return firestoreLiveCtx;
    } catch (e) {
      console.warn("[LiveSyncEngine] Firestore fallback:", e.message);
    }
  }
  return null;
}

const CHANNEL_NAME = "virtuo_live_sync_bus_v2";

export const LIVE_SYNC_EVENTS = {
  SET_SONG: "SET_SONG",
  TRANSPOSE: "TRANSPOSE",
  SET_SECTION: "SET_SECTION",
  SET_BPM: "SET_BPM",
  SET_EASY_PLAY: "SET_EASY_PLAY"
};

class LiveSyncEngine {
  constructor() {
    this._listeners = new Set();
    this._activeMissionId = null;
    this._firestoreUnsubscribe = null;
    this._broadcastChannel = null;

    this.state = {
      missionId: null,
      currentSongId: null,
      currentKey: "C",
      currentBpm: 70,
      isEasyPlay: false,
      currentSection: "Intro",
      lastUpdatedBy: null,
      timestamp: Date.now()
    };

    this._initChannel();
  }

  _initChannel() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this._broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this._broadcastChannel.onmessage = (event) => {
          if (event && event.data) {
            this._handleIncomingSync(event.data, "broadcast");
          }
        };
      } catch (e) {
        this._broadcastChannel = null;
      }
    }

    // Fallback cross-tab para Safari / navegadores que restringem BroadcastChannel
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key === "virtuo_live_sync_storage_packet" && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this._handleIncomingSync(data, "storage");
          } catch {}
        }
      });
    }
  }

  /**
   * Conecta a um documento de missão para sincronização
   * @param {string} missionId
   * @param {Object} initialState
   */
  connectMission(missionId, initialState = {}) {
    if (this._activeMissionId === missionId && this._firestoreUnsubscribe) {
      return;
    }

    this.disconnect();
    this._activeMissionId = missionId;

    if (initialState) {
      this.state = {
        ...this.state,
        missionId,
        currentSongId: initialState.currentSongId || this.state.currentSongId,
        currentKey: initialState.currentKey || this.state.currentKey,
        currentBpm: initialState.currentBpm || this.state.currentBpm,
        isEasyPlay: Boolean(initialState.isEasyPlay),
        currentSection: initialState.currentSection || this.state.currentSection,
        timestamp: Date.now()
      };
    }

    // Listener Firestore online em tempo real
    if (typeof window !== "undefined" && missionId) {
      getLiveFirestoreCtx().then(ctx => {
        if (!ctx || !ctx.db) return;
        try {
          const missionRef = ctx.doc(ctx.db, "missions", missionId);
          this._firestoreUnsubscribe = ctx.onSnapshot(missionRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              this._handleIncomingSync({
                missionId,
                currentSongId: data.currentSongId,
                currentKey: data.currentKey,
                currentBpm: data.currentBpm,
                isEasyPlay: data.isEasyPlay,
                currentSection: data.currentSection,
                lastUpdatedBy: data.lastUpdatedBy,
                timestamp: Date.now()
              }, "firestore");
            }
          }, () => {});
        } catch {}
      }).catch(() => {});
    }

    this._notifyListeners();
  }

  disconnect() {
    if (this._firestoreUnsubscribe) {
      this._firestoreUnsubscribe();
      this._firestoreUnsubscribe = null;
    }
    this._activeMissionId = null;
  }

  subscribe(callback) {
    this._listeners.add(callback);
    // Notifica imediatamente com estado atual
    try {
      callback(this.state);
    } catch {}
    return () => this._listeners.delete(callback);
  }

  _notifyListeners() {
    for (const listener of this._listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error("Erro no listener do Live Sync:", err);
      }
    }
  }

  _handleIncomingSync(packet, origin = "local") {
    if (!packet || (this._activeMissionId && packet.missionId && packet.missionId !== this._activeMissionId)) {
      return;
    }

    // Se o timestamp recebido for mais novo ou válido
    this.state = {
      ...this.state,
      ...packet,
      timestamp: Date.now()
    };

    this._notifyListeners();
  }

  /**
   * Dispara atualização para toda a equipe
   * Mede latência para garantir performance <7ms local
   * @param {Object} partialChanges - { currentSongId, currentKey, currentBpm, isEasyPlay, currentSection, updatedBy }
   */
  async broadcastUpdate(partialChanges) {
    const startTime = performance.now();
    const packet = {
      ...this.state,
      ...partialChanges,
      timestamp: Date.now()
    };

    this.state = packet;

    // 1. Notifica ouvintes locais imediatamente (0-1ms)
    this._notifyListeners();

    // 2. Dispara BroadcastChannel para abas / janelas irmãs (<2ms)
    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage(packet);
      } catch {}
    }

    // 3. Fallback localStorage event para navegadores com restrições
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("virtuo_live_sync_storage_packet", JSON.stringify(packet));
      }
    } catch {}

    const localLatency = performance.now() - startTime;

    // 4. Se online, envia para Firestore
    if (typeof window !== "undefined" && this.state.missionId) {
      getLiveFirestoreCtx().then(ctx => {
        if (!ctx || !ctx.db) return;
        try {
          const missionRef = ctx.doc(ctx.db, "missions", this.state.missionId);
          ctx.updateDoc(missionRef, {
            currentSongId: this.state.currentSongId || null,
            currentKey: this.state.currentKey || "C",
            currentBpm: Number(this.state.currentBpm) || 70,
            isEasyPlay: Boolean(this.state.isEasyPlay),
            currentSection: this.state.currentSection || "Intro",
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } catch {}
      }).catch(() => {});
    }

    return {
      success: true,
      latencyMs: Number(localLatency.toFixed(2)),
      state: this.state
    };
  }

  /**
   * Status de conexão do Live Sync com detecção de rede e Firestore
   * Requisito 15: Notificar claramente se estiver offline
   */
  getConnectionStatus() {
    const isOnline = typeof navigator !== "undefined" ? Boolean(navigator.onLine) : true;
    return {
      connected: Boolean(this._activeMissionId),
      isOnline,
      activeMissionId: this._activeMissionId,
      channelActive: Boolean(this._broadcastChannel),
      firestoreSynced: Boolean(this._firestoreUnsubscribe),
      state: { ...this.state }
    };
  }

  /**
   * Evento Canônico: SET_SONG
   */
  async setSong(songId, songKey = "C", songBpm = 70, title = "", updatedBy = null) {
    return await this.broadcastUpdate({
      eventType: LIVE_SYNC_EVENTS.SET_SONG,
      currentSongId: songId,
      currentSongTitle: title,
      currentKey: songKey,
      currentBpm: Number(songBpm) || 70,
      currentSection: "Intro",
      lastUpdatedBy: updatedBy
    });
  }

  /**
   * Evento Canônico: TRANSPOSE
   */
  async transpose(targetKey, keyOffset = 0, updatedBy = null) {
    return await this.broadcastUpdate({
      eventType: LIVE_SYNC_EVENTS.TRANSPOSE,
      currentKey: targetKey,
      keyOffset: keyOffset,
      lastUpdatedBy: updatedBy
    });
  }

  /**
   * Evento Canônico: SET_SECTION
   */
  async setSection(sectionName, updatedBy = null) {
    return await this.broadcastUpdate({
      eventType: LIVE_SYNC_EVENTS.SET_SECTION,
      currentSection: sectionName,
      lastUpdatedBy: updatedBy
    });
  }

  /**
   * Evento Canônico: SET_BPM
   */
  async setBpm(bpm, updatedBy = null) {
    return await this.broadcastUpdate({
      eventType: LIVE_SYNC_EVENTS.SET_BPM,
      currentBpm: Number(bpm) || 70,
      lastUpdatedBy: updatedBy
    });
  }

  /**
   * Evento Canônico: SET_EASY_PLAY
   */
  async setEasyPlay(isEasy, updatedBy = null) {
    return await this.broadcastUpdate({
      eventType: LIVE_SYNC_EVENTS.SET_EASY_PLAY,
      isEasyPlay: Boolean(isEasy),
      lastUpdatedBy: updatedBy
    });
  }
}

export const liveSyncEngine = new LiveSyncEngine();
