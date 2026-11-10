// =============================================================
// VIRTUO V2 — LIVE SYNC CONTROLLER
// src/features/live-sync/live-sync-controller.js
// Orquestrador de sincronização, modal de confirmação de tom e eventos de palco
// =============================================================

import { liveSyncEngine } from "./live-sync-engine.js";
import { notificationsService, NOTIFICATION_TYPES } from "../notifications/notifications-service.js";
import { virtuoPulse } from "../pulse/index.js";
import { virtuoConductor } from "../../audio/virtuo-conductor.js";
import { HorizonWaveManager } from "../../design/horizon-wave.js";

class LiveSyncController {
  constructor() {
    this._pendingKeyChange = null;
    this._onStateChangeCallbacks = new Set();
    this._lastSection = null;
    this._lastKey = null;

    // Conecta ouvintes do engine
    liveSyncEngine.subscribe((state) => {
      this._handleEngineStateChange(state);
    });
  }

  onStateChange(cb) {
    this._onStateChangeCallbacks.add(cb);
    return () => this._onStateChangeCallbacks.delete(cb);
  }

  _handleEngineStateChange(state) {
    // Atualiza Virtuo Pulse se estiver ativo
    if (virtuoPulse) {
      if (state.currentKey && typeof virtuoPulse.setTom === "function") {
        virtuoPulse.setTom(state.currentKey);
      }
      if (state.currentBpm && typeof virtuoPulse.setBpm === "function") {
        virtuoPulse.setBpm(state.currentBpm);
      }
    }

    // Reflete a seção definida pelo ministro no Virtuo Conductor e dispara Horizon Wave nos clientes
    if (state.currentSection && state.currentSection !== this._lastSection) {
      this._lastSection = state.currentSection;
      virtuoConductor.setSection(state.currentSection);
      HorizonWaveManager.triggerHorizonWave();
    }

    // Reflete troca de tom no Conductor
    if (state.currentKey && state.currentKey !== this._lastKey) {
      this._lastKey = state.currentKey;
      virtuoConductor.notifyKeyChanged(state.currentKey);
    }

    // Se houver sessão ativa, notifica o Conductor
    if (state.connected) {
      virtuoConductor.notifyLiveConnected(state);
    }

    for (const cb of this._onStateChangeCallbacks) {
      try {
        cb(state);
      } catch {}
    }
  }

  /**
   * Conecta a uma missão ativa
   */
  startMissionSync(mission) {
    if (!mission) return;
    liveSyncEngine.connectMission(mission.id, {
      currentSongId: mission.currentSongId || (mission.songs?.[0]?.id),
      currentKey: mission.currentKey || (mission.songs?.[0]?.key) || "C",
      currentBpm: mission.currentBpm || (mission.songs?.[0]?.bpm) || 70,
      isEasyPlay: Boolean(mission.isEasyPlay),
      currentSection: mission.currentSection || "Intro"
    });

    if (virtuoPulse) {
      virtuoPulse.setCustomState({
        mode: "live",
        badge: "⚡ LIVE SYNC",
        status: `Sincronizado: ${mission.title || "Missão Ativa"}`
      });
    }
  }

  /**
   * Solicita alteração de tom com diálogo de confirmação prévio
   * Regra estrita: "Antes da troca: Exibir: 'Alterar para D?' Botões: Confirmar / Cancelar. Após confirmação: Atualizar todos."
   * @param {string} targetKey - Novo tom desejado
   * @param {Object} options - { songTitle, initiatorName }
   * @returns {Promise<boolean>} true se confirmado, false se cancelado
   */
  async requestKeyChangeWithConfirmation(targetKey, options = {}) {
    return new Promise((resolve) => {
      this._pendingKeyChange = {
        targetKey,
        options,
        resolve
      };

      this._renderKeyChangeModal(targetKey, options);
    });
  }

  /**
   * Confirma a troca de tom pendente e propaga para toda a equipe
   */
  async confirmKeyChange() {
    if (!this._pendingKeyChange) return;

    const { targetKey, options, resolve } = this._pendingKeyChange;
    this._pendingKeyChange = null;
    this._removeKeyChangeModal();

    // 1. Propaga via Live Sync Engine (<7ms)
    await liveSyncEngine.broadcastUpdate({
      currentKey: targetKey,
      lastUpdatedBy: options.initiatorName || "Líder Musical"
    });

    // 2. Dispara notificação interna
    notificationsService.add({
      type: NOTIFICATION_TYPES.KEY_CHANGED,
      title: `Tom alterado para ${targetKey}`,
      message: `${options.initiatorName || "Líder"} alterou a tonalidade para ${targetKey}. Toda a equipe foi sincronizada.`,
      missionId: liveSyncEngine.state.missionId
    });

    // 3. Atualiza Virtuo Pulse
    if (virtuoPulse) {
      virtuoPulse.setTom(targetKey);
    }

    resolve(true);
  }

  /**
   * Cancela a troca de tom pendente
   */
  cancelKeyChange() {
    if (!this._pendingKeyChange) return;
    const { resolve } = this._pendingKeyChange;
    this._pendingKeyChange = null;
    this._removeKeyChangeModal();
    resolve(false);
  }

  /**
   * Altera BPM da música ativa
   */
  async changeBpm(newBpm, initiatorName = "Líder Musical") {
    const validBpm = Math.max(30, Math.min(260, Number(newBpm) || 70));
    await liveSyncEngine.broadcastUpdate({
      currentBpm: validBpm,
      lastUpdatedBy: initiatorName
    });

    notificationsService.add({
      type: NOTIFICATION_TYPES.BPM_CHANGED,
      title: `BPM ajustado para ${validBpm}`,
      message: `Tempo da ministração sincronizado para ${validBpm} BPM.`,
      missionId: liveSyncEngine.state.missionId
    });

    if (virtuoPulse) {
      virtuoPulse.setBpm(validBpm);
    }
  }

  /**
   * Altera a música ativa
   */
  async changeSong(songId, songKey = "C", songBpm = 70, initiatorName = "Líder Musical") {
    await liveSyncEngine.broadcastUpdate({
      currentSongId: songId,
      currentKey: songKey,
      currentBpm: songBpm,
      currentSection: "Intro",
      lastUpdatedBy: initiatorName
    });

    if (virtuoPulse) {
      virtuoPulse.setTom(songKey);
      virtuoPulse.setBpm(songBpm);
    }
  }

  /**
   * Altera a seção atual (Intro, Verso, Refrão, etc.)
   */
  async changeSection(sectionName) {
    await liveSyncEngine.broadcastUpdate({
      currentSection: sectionName
    });
  }

  /**
   * Alterna Easy Play
   */
  async toggleEasyPlay(isEasy) {
    await liveSyncEngine.broadcastUpdate({
      isEasyPlay: Boolean(isEasy)
    });
  }

  // =============================================================
  // MODAL DE CONFIRMAÇÃO DE TROCA DE TOM
  // =============================================================

  _renderKeyChangeModal(targetKey, options) {
    this._removeKeyChangeModal();

    const overlay = document.createElement("div");
    overlay.id = "virtuo-key-change-modal-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 8, 16, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 120ms cubic-bezier(0.16, 1, 0.3, 1);
    `;

    overlay.innerHTML = `
      <div 
        class="glass" 
        style="
          max-width: 420px; 
          width: 100%; 
          background: #0e1b35; 
          border: 1px solid rgba(126, 231, 255, 0.4); 
          border-radius: 16px; 
          padding: 24px 20px; 
          text-align: center;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
        "
      >
        <div style="font-size: 38px; margin-bottom: 8px;">🎹</div>
        
        <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #ffffff; font-weight: 700;">
          Alterar para ${escapeHtml(targetKey)}?
        </h3>
        
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
          ${options.songTitle ? `Música: <strong>${escapeHtml(options.songTitle)}</strong><br>` : ''}
          Esta alteração será propagada em tempo real para todos os músicos conectados no palco.
        </p>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button 
            id="btn-cancel-key-change" 
            class="button secondary" 
            style="flex: 1; padding: 12px; font-size: 14px; font-weight: 600;"
          >
            Cancelar
          </button>
          <button 
            id="btn-confirm-key-change" 
            class="button primary" 
            style="flex: 1; padding: 12px; font-size: 14px; font-weight: 700; background: linear-gradient(135deg, #7ee7ff 0%, #2563eb 100%); color: #080e1a;"
          >
            Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-confirm-key-change")?.addEventListener("click", () => {
      this.confirmKeyChange();
    });

    document.getElementById("btn-cancel-key-change")?.addEventListener("click", () => {
      this.cancelKeyChange();
    });
  }

  _removeKeyChangeModal() {
    const existing = document.getElementById("virtuo-key-change-modal-overlay");
    if (existing) {
      existing.remove();
    }
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const liveSyncController = new LiveSyncController();
