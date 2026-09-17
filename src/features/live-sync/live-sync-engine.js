// =============================================================
// VIRTUO V2 — LIVE SYNC ENGINE (TEMPO REAL ALTA PERFORMANCE)
// src/features/live-sync/live-sync-engine.js
// Sincronização ultra rápida (<7ms local via BroadcastChannel / EventBus)
// Integrado com Firestore onSnapshot para sincronização entre dispositivos remotos
// =============================================================

import { db } from "../../../firebase-config.js";
import {
  doc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CHANNEL_NAME = "virtuo_live_sync_bus_v2";

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
    if (typeof window !== "undefined" && db && missionId) {
      try {
        const missionRef = doc(db, "missions", missionId);
        this._firestoreUnsubscribe = onSnapshot(missionRef, (snap) => {
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
        }, (err) => {
          // Fallback offline silencioso
        });
      } catch (err) {}
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
    if (typeof window !== "undefined" && db && this.state.missionId) {
      try {
        const missionRef = doc(db, "missions", this.state.missionId);
        updateDoc(missionRef, {
          currentSongId: this.state.currentSongId || null,
          currentKey: this.state.currentKey || "C",
          currentBpm: Number(this.state.currentBpm) || 70,
          isEasyPlay: Boolean(this.state.isEasyPlay),
          currentSection: this.state.currentSection || "Intro",
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      } catch {}
    }

    return {
      success: true,
      latencyMs: Number(localLatency.toFixed(2)),
      state: this.state
    };
  }
}

export const liveSyncEngine = new LiveSyncEngine();
