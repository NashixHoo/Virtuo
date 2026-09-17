// =============================================================
// VIRTUO V2 — VIEW DE LIVE SYNC
// src/features/live-sync/live-sync-view.js
// =============================================================

import { liveSyncEngine } from "./live-sync-engine.js";
import { liveSyncController } from "./live-sync-controller.js";
import { DESIGN_TOKENS } from "../../design/design-system.js";

const SECTIONS = ["Intro", "Verso", "Pré-Refrão", "Refrão", "Ponte", "Solo", "Final"];
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "Dm", "Em", "F#m", "Gm", "Am", "Bm"];

/**
 * Renderiza o painel interativo de controle Live Sync para o líder ou regente
 * @param {Object} mission - Missão atual
 * @param {boolean} isLeader - Se usuário tem permissão de líder
 * @returns {string} HTML
 */
export function renderLiveSyncToolbar(mission, isLeader = true) {
  const sync = liveSyncEngine.state;
  const currentKey = sync.currentKey || mission?.currentKey || "C";
  const currentBpm = sync.currentBpm || mission?.currentBpm || 70;
  const currentSection = sync.currentSection || "Intro";

  return `
    <div 
      class="glass live-sync-toolbar virtuo-card virtuo-horizon" 
      id="live-sync-strip"
      style="
        background: linear-gradient(180deg, rgba(14, 27, 53, 0.95), rgba(8, 14, 26, 0.98));
        border: 1px solid ${DESIGN_TOKENS.colors.borderActive};
        border-radius: ${DESIGN_TOKENS.radii.lg};
        padding: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      "
    >
      <!-- Topo: Status de Sincronia e Latência -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e;"></span>
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: ${DESIGN_TOKENS.colors.celestialBlue}; text-transform: uppercase;">
            ⚡ LIVE SYNC ATIVO
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8;">
          <span>Latência:</span>
          <strong style="color: #22c55e;">&lt; 5ms</strong>
        </div>
      </div>

      <!-- Controles Principais: Tom, BPM e Easy Play -->
      <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; margin-bottom: 14px;">
        
        <!-- Tom Atual com Gatilho de Mudança -->
        <div style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Tom Sincronizado</div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span id="live-sync-current-key" style="font-size: 20px; font-weight: 800; color: ${DESIGN_TOKENS.colors.white};">
              ${currentKey}
            </span>
            ${isLeader ? `
              <select 
                id="live-sync-key-selector" 
                style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 4px 8px; font-size: 12px; font-weight: 600;"
                onchange="window.virtuoRequestKeyChange(this.value)"
              >
                <option value="">Trocar Tom...</option>
                ${KEYS.map(k => `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${k}</option>`).join('')}
              </select>
            ` : ''}
          </div>
        </div>

        <!-- BPM Atual com Ajuste -->
        <div style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Tempo da Banda</div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span id="live-sync-current-bpm" style="font-size: 20px; font-weight: 800; color: ${DESIGN_TOKENS.colors.white};">
              ${currentBpm} <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">BPM</span>
            </span>
            ${isLeader ? `
              <div style="display: flex; gap: 4px;">
                <button class="button secondary" style="padding: 4px 8px; font-size: 11px;" onclick="window.virtuoChangeBpm(-2)">-2</button>
                <button class="button secondary" style="padding: 4px 8px; font-size: 11px;" onclick="window.virtuoChangeBpm(+2)">+2</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Easy Play Switch -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 4px;">
          <span style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">Easy Play</span>
          <button 
            class="button ${sync.isEasyPlay ? 'primary' : 'secondary'}" 
            style="padding: 6px 10px; font-size: 11px;"
            onclick="window.virtuoToggleLiveEasyPlay()"
          >
            ${sync.isEasyPlay ? 'ON' : 'OFF'}
          </button>
        </div>

      </div>

      <!-- Seções Musicais (Intro, Verso, Refrão, etc.) -->
      <div>
        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
          Seção Musical em Execução
        </div>
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
          ${SECTIONS.map(sec => `
            <button 
              class="pill" 
              style="
                cursor: ${isLeader ? 'pointer' : 'default'};
                background: ${sec === currentSection ? 'rgba(126, 231, 255, 0.25)' : 'rgba(255,255,255,0.04)'};
                color: ${sec === currentSection ? DESIGN_TOKENS.colors.celestialBlue : '#94a3b8'};
                border: 1px solid ${sec === currentSection ? DESIGN_TOKENS.colors.celestialBlue : 'rgba(255,255,255,0.08)'};
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
              "
              ${isLeader ? `onclick="window.virtuoChangeSection('${sec}')"` : ''}
            >
              ${sec}
            </button>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}
