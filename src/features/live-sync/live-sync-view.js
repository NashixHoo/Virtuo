// =============================================================
// VIRTUO V2.2 — LIVE EXPERIENCE PREMIUM (VDS OFICIAL)
// src/features/live-sync/live-sync-view.js
// Experiência completa de palco, Maestro Panel, Auto-Scroll e Sync Indicator
// =============================================================

import { liveSyncEngine } from "./live-sync-engine.js";
import { liveSyncController } from "./live-sync-controller.js";
import { DESIGN_TOKENS } from "../../design/design-system.js";
import { virtuoMotion } from "../../motion/motion.js";
import { virtuoConductor } from "../../audio/virtuo-conductor.js";
import { virtuoToast } from "../../components/ui/toast.js";
import { 
  transposeChordSheet, 
  calculateKey, 
  getEasyPlayCifra, 
  isChordLine 
} from "../../music/index.js";

const SECTIONS = ["Intro", "Verso", "Pré-Refrão", "Refrão", "Ponte", "Solo", "Espontâneo", "Final"];
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "Dm", "Em", "F#m", "Gm", "Am", "Bm"];

// Estado local de Auto-Scroll
let autoScrollActive = false;
let autoScrollSpeed = 1.0; // 1.0 = normal, 1.5 = rápida, 0.7 = suave
let autoScrollAnimId = null;
let manualScrollTimer = null;
let isManualAdjustment = false;

/**
 * Avalia o indicador de sincronia oficial conforme requisitos da Etapa 4:
 * Verde: Perfeito (<50ms)
 * Amarelo: Instável (50-200ms)
 * Vermelho: Offline / Reconectando (>200ms ou offline)
 */
export function getLiveSyncStatusInfo() {
  const status = liveSyncEngine.getConnectionStatus();
  const latency = liveSyncEngine.state?.lastLatency || 8;
  const isOnline = status.isOnline !== false;
  const isConnected = Boolean(status.connected);

  if (!isOnline || !isConnected) {
    return {
      level: "red",
      color: "#ef4444",
      bgRgba: "rgba(239, 68, 68, 0.15)",
      borderColor: "rgba(239, 68, 68, 0.4)",
      label: "Offline / Reconectando",
      badgeText: "OFFLINE",
      latencyText: "Desconectado"
    };
  }

  if (latency > 200) {
    return {
      level: "red",
      color: "#ef4444",
      bgRgba: "rgba(239, 68, 68, 0.15)",
      borderColor: "rgba(239, 68, 68, 0.4)",
      label: "Offline / Reconectando",
      badgeText: "LATÊNCIA ALTA",
      latencyText: `${latency}ms`
    };
  }

  if (latency >= 50) {
    return {
      level: "yellow",
      color: "#f59e0b",
      bgRgba: "rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.4)",
      label: "Instável (50-200ms)",
      badgeText: "INSTÁVEL",
      latencyText: `${latency}ms`
    };
  }

  return {
    level: "green",
    color: "#22c55e",
    bgRgba: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    label: "Perfeito (<50ms)",
    badgeText: "SINCRONIA PERFEITA",
    latencyText: `< 50ms (${latency}ms)`
  };
}

/**
 * Renderiza o painel interativo de controle Live Sync para o líder ou regente
 * (Mantido 100% compatível para toolbar usage em outras telas)
 */
export function renderLiveSyncToolbar(mission, isLeader = true) {
  const sync = liveSyncEngine.state;
  const currentKey = sync.currentKey || mission?.currentKey || "C";
  const currentBpm = sync.currentBpm || mission?.currentBpm || 70;
  const currentSection = sync.currentSection || "Intro";
  const syncInfo = getLiveSyncStatusInfo();

  return `
    <div 
      class="glass live-sync-toolbar virtuo-card virtuo-horizon virtuo-halo-live" 
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
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${syncInfo.color}; box-shadow: 0 0 8px ${syncInfo.color};"></span>
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: ${DESIGN_TOKENS.colors.celestialBlue}; text-transform: uppercase;">
            ⚡ LIVE SYNC ATIVO
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8;">
          <span>Sincronia:</span>
          <strong style="color: ${syncInfo.color};">${syncInfo.latencyText}</strong>
        </div>
      </div>

      <!-- Controles Principais: Tom, BPM e Easy Play -->
      <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; margin-bottom: 14px;">
        
        <!-- Tom Atual com Gatilho de Mudança -->
        <div id="live-toolbar-key-container" style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
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

/**
 * RENDER DA TELA COMPLETA DE PALCO LIVE EXPERIENCE PREMIUM (ETAPA 4)
 * 1. Barra Superior Oficial (Badge Ao Vivo, Nome da Missão, Músicos Conectados, Indicador Verde/Amarelo/Vermelho)
 * 2. Painel do Maestro (Botões grandes de palco: Repetir Refrão, Ponte, Espontâneo, Terminar, Subir/Descer Dinâmica)
 * 3. Auto-scroll (Rolar com a música, ajuste manual não perde sincronia, voltar automático em 3s)
 * 4. Mudança de Tom Premium (Transição suave, glow temporário, notificação rápida, atualização instantânea)
 * 5. Indicador de Sincronia (Verde, Amarelo, Vermelho)
 */
export function renderLiveStageScreen(mission, currentSong, currentUser, isLeader = true) {
  const sync = liveSyncEngine.state;
  const currentKey = sync.currentKey || currentSong?.originalKey || mission?.currentKey || "G";
  const currentBpm = sync.currentBpm || currentSong?.bpm || mission?.currentBpm || 74;
  const currentSection = sync.currentSection || "Intro";
  const syncInfo = getLiveSyncStatusInfo();
  const missionTitle = mission?.title || "Culto de Louvor & Adoração";
  const connectedCount = Math.max(1, (mission?.musicians?.length || mission?.checkIns?.length || 4));

  // Letra e Cifra com suporte a transposição e Easy Play
  const songTitle = currentSong?.title || "Bondade de Deus";
  const songArtist = currentSong?.artist || "Virtuo Worship";
  const rawChords = currentSong?.chords || `[Intro] G  C  Em  D\n\nG               C\nTe amo, Deus, Tua graça nunca falha\nEm              D\nTodos os meus dias estão em Tuas mãos\nC               G\nDesde o amanhecer até o pôr do sol\nEm      C       D       G\nEu cantarei da bondade de Deus\n\n[Refrão]\nC                       G\nTua bondade me seguirá, Senhor\nC                       G\nTua bondade me seguirá, Senhor\n        Em             C\nCom minha vida me entrego a Ti\n        G              D\nEu me rendo ao Teu amor\nC               D       G\nTua bondade me seguirá, Senhor`;

  const displayedChords = sync.isEasyPlay && currentSong
    ? getEasyPlayCifra(currentSong, 0)
    : rawChords;

  return `
    <div class="virtuo-stage-container virtuo-horizon" style="max-width: 1100px; margin: 0 auto; padding-bottom: 120px;">
      
      <!-- 1. BARRA SUPERIOR OFICIAL DE PALCO -->
      <div 
        id="live-stage-topbar"
        class="glass virtuo-card virtuo-halo-live"
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 14px 20px;
          margin-bottom: 16px;
          border: 1px solid rgba(126, 231, 255, 0.28);
          border-radius: 28px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
        "
      >
        <!-- Lado Esquerdo: Badge Ao Vivo + Nome da Missão -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(239, 68, 68, 0.20);
            border: 1px solid rgba(239, 68, 68, 0.5);
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            color: #ef4444;
            letter-spacing: 1px;
          ">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: haloBreathMission 1.5s infinite alternate;"></span>
            AO VIVO
          </div>

          <div>
            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.01em;">
              ${escapeHtml(missionTitle)}
            </h2>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94A3B8;">
              Música: <strong style="color: #7EE7FF;">${escapeHtml(songTitle)}</strong> • ${escapeHtml(songArtist)}
            </p>
          </div>
        </div>

        <!-- Lado Direito: Músicos Conectados + Indicador de Sincronia Canônico -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <!-- Quantidade de Músicos Conectados -->
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(14, 27, 53, 0.85);
            border: 1px solid rgba(126, 231, 255, 0.18);
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            color: #F8FAFC;
          ">
            <span style="font-size: 14px;">👥</span>
            <span>${connectedCount} músico${connectedCount > 1 ? 's' : ''} conectado${connectedCount > 1 ? 's' : ''}</span>
          </div>

          <!-- Indicador de Sincronia (Verde / Amarelo / Vermelho) -->
          <div 
            id="live-sync-indicator-badge"
            title="${syncInfo.label}"
            style="
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: ${syncInfo.bgRgba};
              border: 1px solid ${syncInfo.borderColor};
              padding: 6px 14px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 700;
              color: ${syncInfo.color};
              letter-spacing: 0.5px;
            "
          >
            <span style="
              width: 8px; 
              height: 8px; 
              border-radius: 50%; 
              background: ${syncInfo.color}; 
              box-shadow: 0 0 10px ${syncInfo.color};
            "></span>
            <span>${syncInfo.badgeText}</span>
            <span style="opacity: 0.8; font-size: 10px;">(${syncInfo.latencyText})</span>
          </div>
        </div>
      </div>

      <!-- 2. PAINEL DO MAESTRO (BOTÕES GRANDES PARA PALCO) -->
      <div 
        class="glass virtuo-card"
        id="live-maestro-panel"
        style="
          border-radius: 28px;
          border: 1px solid rgba(126, 231, 255, 0.22);
          padding: 18px 20px;
          margin-bottom: 16px;
          background: rgba(14, 27, 53, 0.75);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🎼</span>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #7EE7FF; text-transform: uppercase; letter-spacing: 1px;">
              Painel do Maestro
            </h3>
          </div>
          <span style="font-size: 11px; color: #94A3B8;">Comandos instantâneos para toda a banda</span>
        </div>

        <!-- Grid de Comandos Rápidos em Botões Grandes (Toque Rápido no Palco) -->
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        ">
          <!-- 1. Repetir Refrão -->
          <button 
            class="button secondary"
            id="maestro-btn-chorus"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(126, 231, 255, 0.35);
              background: linear-gradient(180deg, rgba(14, 27, 53, 0.9), rgba(8, 16, 32, 0.95));
              color: #F8FAFC;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroRepeatChorus()"
          >
            <span style="font-size: 18px;">🔁</span>
            <span>Repetir Refrão</span>
          </button>

          <!-- 2. Ponte -->
          <button 
            class="button secondary"
            id="maestro-btn-bridge"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(126, 231, 255, 0.35);
              background: linear-gradient(180deg, rgba(14, 27, 53, 0.9), rgba(8, 16, 32, 0.95));
              color: #F8FAFC;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroBridge()"
          >
            <span style="font-size: 18px;">🌉</span>
            <span>Ponte</span>
          </button>

          <!-- 3. Espontâneo -->
          <button 
            class="button secondary"
            id="maestro-btn-spontaneous"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(245, 197, 66, 0.45);
              background: linear-gradient(180deg, rgba(30, 24, 10, 0.9), rgba(14, 27, 53, 0.95));
              color: #F5C542;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroSpontaneous()"
          >
            <span style="font-size: 18px;">🕊️</span>
            <span>Espontâneo</span>
          </button>

          <!-- 4. Subir Dinâmica -->
          <button 
            class="button secondary"
            id="maestro-btn-dyn-up"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(34, 197, 94, 0.4);
              background: linear-gradient(180deg, rgba(10, 30, 20, 0.9), rgba(8, 16, 32, 0.95));
              color: #4ade80;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroDynamicUp()"
          >
            <span style="font-size: 18px;">▲</span>
            <span>Subir Dinâmica</span>
          </button>

          <!-- 5. Descer Dinâmica -->
          <button 
            class="button secondary"
            id="maestro-btn-dyn-down"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(148, 163, 184, 0.3);
              background: linear-gradient(180deg, rgba(20, 25, 35, 0.9), rgba(8, 16, 32, 0.95));
              color: #94A3B8;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroDynamicDown()"
          >
            <span style="font-size: 18px;">▼</span>
            <span>Descer Dinâmica</span>
          </button>

          <!-- 6. Terminar -->
          <button 
            class="button secondary"
            id="maestro-btn-end"
            style="
              min-height: 52px;
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              border: 1px solid rgba(239, 68, 68, 0.4);
              background: linear-gradient(180deg, rgba(35, 12, 16, 0.9), rgba(8, 16, 32, 0.95));
              color: #f87171;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 16px;
            "
            onclick="window.virtuoMaestroEnd()"
          >
            <span style="font-size: 18px;">⏹</span>
            <span>Terminar</span>
          </button>
        </div>
      </div>

      <!-- 3. CONTROLES DE PALCO & TOM PREMIUM (GLOW TEMPORÁRIO, TRANSIÇÃO SUAVE) -->
      <div 
        class="glass virtuo-card"
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          padding: 16px 20px;
          margin-bottom: 16px;
          border-radius: 28px;
          border: 1px solid rgba(126, 231, 255, 0.2);
        "
      >
        <!-- Tom Atual com Gatilho e Glow Temporário -->
        <div 
          id="live-key-card"
          class="virtuo-halo"
          style="
            background: rgba(0, 0, 0, 0.35);
            padding: 12px 16px;
            border-radius: 18px;
            border: 1px solid rgba(126, 231, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
          "
        >
          <div>
            <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Tom do Palco
            </div>
            <div id="live-stage-key-display" style="font-size: 28px; font-weight: 900; color: #7EE7FF; line-height: 1.2;">
              ${escapeHtml(currentKey)}
            </div>
          </div>
          ${isLeader ? `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <select 
                id="live-stage-key-select"
                style="
                  background: rgba(14, 27, 53, 0.95);
                  color: #7EE7FF;
                  border: 1px solid rgba(126, 231, 255, 0.4);
                  border-radius: 8px;
                  padding: 6px 10px;
                  font-size: 13px;
                  font-weight: 700;
                "
                onchange="window.virtuoRequestKeyChange(this.value)"
              >
                <option value="">Trocar Tom...</option>
                ${KEYS.map(k => `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${k}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Seção Atual com Indicador Visual -->
        <div style="
          background: rgba(0, 0, 0, 0.35);
          padding: 12px 16px;
          border-radius: 18px;
          border: 1px solid rgba(126, 231, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div>
            <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Seção Ativa
            </div>
            <div id="live-stage-section-display" style="font-size: 22px; font-weight: 800; color: #F8FAFC; line-height: 1.2;">
              ${escapeHtml(currentSection)}
            </div>
          </div>
          <div style="display: flex; gap: 4px; overflow-x: auto; max-width: 140px;">
            ${SECTIONS.slice(0, 4).map(s => `
              <button 
                class="pill" 
                style="
                  font-size: 10px; 
                  padding: 2px 6px; 
                  background: ${s === currentSection ? 'rgba(126, 231, 255, 0.25)' : 'transparent'};
                  border-color: ${s === currentSection ? '#7EE7FF' : 'rgba(255,255,255,0.1)'};
                  color: ${s === currentSection ? '#7EE7FF' : '#94A3B8'};
                "
                onclick="window.virtuoChangeSection('${s}')"
              >${s}</button>
            `).join('')}
          </div>
        </div>

        <!-- BPM e Easy Play Switch -->
        <div style="
          background: rgba(0, 0, 0, 0.35);
          padding: 12px 16px;
          border-radius: 18px;
          border: 1px solid rgba(126, 231, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div>
            <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Tempo & Easy Play
            </div>
            <div style="font-size: 22px; font-weight: 800; color: #F8FAFC;">
              ${currentBpm} <span style="font-size: 12px; color: #94A3B8; font-weight: 500;">BPM</span>
            </div>
          </div>
          <button 
            class="button ${sync.isEasyPlay ? 'primary' : 'secondary'}"
            style="padding: 6px 12px; font-size: 11px; font-weight: 700;"
            onclick="window.virtuoToggleLiveEasyPlay()"
          >
            ${sync.isEasyPlay ? '⚡ EASY ON' : 'EASY OFF'}
          </button>
        </div>
      </div>

      <!-- 4. AUTO-SCROLL TOOLBAR & VISOR DE CIFRA DE PALCO -->
      <div 
        class="glass virtuo-card"
        style="
          border-radius: 28px;
          border: 1px solid rgba(126, 231, 255, 0.22);
          padding: 20px;
          background: rgba(10, 20, 40, 0.85);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          position: relative;
        "
      >
        <!-- Barra de Controle do Auto-Scroll -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-bottom: 16px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button 
              id="live-autoscroll-toggle-btn"
              class="button ${autoScrollActive ? 'primary' : 'secondary'}"
              style="padding: 8px 16px; font-size: 13px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; gap: 6px;"
              onclick="window.virtuoToggleAutoScroll()"
            >
              <span>${autoScrollActive ? '⏸ PAUSAR' : '▶ AUTO-SCROLL'}</span>
            </button>

            <!-- Velocidade de Auto-Scroll -->
            <div style="display: flex; gap: 4px;">
              <button 
                class="pill ${autoScrollSpeed === 0.7 ? 'active' : ''}" 
                style="padding: 4px 10px; font-size: 11px;"
                onclick="window.virtuoSetAutoScrollSpeed(0.7)"
              >0.7x</button>
              <button 
                class="pill ${autoScrollSpeed === 1.0 ? 'active' : ''}" 
                style="padding: 4px 10px; font-size: 11px;"
                onclick="window.virtuoSetAutoScrollSpeed(1.0)"
              >1.0x</button>
              <button 
                class="pill ${autoScrollSpeed === 1.5 ? 'active' : ''}" 
                style="padding: 4px 10px; font-size: 11px;"
                onclick="window.virtuoSetAutoScrollSpeed(1.5)"
              >1.5x</button>
            </div>
          </div>

          <!-- Alerta Flutuante de Ajuste Manual (Voltar Automático em 3s) -->
          <div 
            id="live-manual-scroll-notice"
            style="
              display: none;
              align-items: center;
              gap: 8px;
              background: rgba(245, 158, 11, 0.20);
              border: 1px solid rgba(245, 158, 11, 0.45);
              padding: 4px 12px;
              border-radius: 999px;
              font-size: 11px;
              color: #fde047;
              font-weight: 600;
            "
          >
            <span>🖐️ Ajuste manual ativo</span>
            <span>• Retomando sincronia em 3s...</span>
            <button 
              onclick="window.virtuoResumeAutoScrollNow()"
              style="background: none; border: none; color: #7EE7FF; text-decoration: underline; font-size: 11px; cursor: pointer; padding: 0;"
            >
              Voltar agora
            </button>
          </div>
        </div>

        <!-- Conteúdo da Cifra / Letra de Palco -->
        <div 
          id="live-cifra-scroll-container"
          style="
            max-height: 550px;
            overflow-y: auto;
            scroll-behavior: smooth;
            padding: 10px 4px;
            -webkit-overflow-scrolling: touch;
          "
        >
          <pre 
            id="live-cifra-text"
            style="
              font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
              font-size: 17px;
              line-height: 1.8;
              color: #F8FAFC;
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0;
            "
          >${formatLiveChordsHtml(displayedChords)}</pre>
        </div>
      </div>

    </div>
  `;
}

/**
 * Formata cifras com tags estilizadas
 */
function formatLiveChordsHtml(text) {
  if (!text) return "";
  return text.split("\n").map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return `<div style="color: #7EE7FF; font-weight: 800; font-size: 18px; margin-top: 14px; margin-bottom: 4px;">${escapeHtml(line)}</div>`;
    }
    if (isChordLine(line)) {
      return `<div style="color: #7EE7FF; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${escapeHtml(line)}</div>`;
    }
    return `<div style="color: #E2E8F0; font-size: 16px; margin-bottom: 4px;">${escapeHtml(line)}</div>`;
  }).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =============================================================
// AUTO-SCROLL ENGINE COM RETOMADA AUTOMÁTICA EM 3S
// =============================================================

export function initLiveAutoScroll() {
  const container = document.getElementById("live-cifra-scroll-container");
  if (!container) return;

  // Detecta ajuste manual do músico (touch, wheel ou scroll)
  const onManualInteraction = () => {
    if (!autoScrollActive) return;
    isManualAdjustment = true;

    const notice = document.getElementById("live-manual-scroll-notice");
    if (notice) notice.style.display = "inline-flex";

    if (manualScrollTimer) clearTimeout(manualScrollTimer);

    // Retoma sincronia automaticamente após 3 segundos de inatividade
    manualScrollTimer = setTimeout(() => {
      resumeAutoScrollNow();
    }, 3000);
  };

  container.addEventListener("wheel", onManualInteraction, { passive: true });
  container.addEventListener("touchstart", onManualInteraction, { passive: true });
  container.addEventListener("touchmove", onManualInteraction, { passive: true });
}

export function startAutoScroll() {
  autoScrollActive = true;
  const container = document.getElementById("live-cifra-scroll-container");
  const toggleBtn = document.getElementById("live-autoscroll-toggle-btn");
  if (toggleBtn) {
    toggleBtn.classList.remove("secondary");
    toggleBtn.classList.add("primary");
    toggleBtn.innerHTML = "<span>⏸ PAUSAR</span>";
  }

  if (autoScrollAnimId) cancelAnimationFrame(autoScrollAnimId);

  let lastTime = performance.now();

  const step = (time) => {
    if (!autoScrollActive) return;

    const delta = time - lastTime;
    lastTime = time;

    if (!isManualAdjustment && container) {
      // Avança proporcionalmente ao BPM e velocidade
      const scrollStep = (0.04 * autoScrollSpeed) * delta;
      container.scrollTop += scrollStep;
    }

    autoScrollAnimId = requestAnimationFrame(step);
  };

  autoScrollAnimId = requestAnimationFrame(step);
}

export function pauseAutoScroll() {
  autoScrollActive = false;
  if (autoScrollAnimId) {
    cancelAnimationFrame(autoScrollAnimId);
    autoScrollAnimId = null;
  }
  const toggleBtn = document.getElementById("live-autoscroll-toggle-btn");
  if (toggleBtn) {
    toggleBtn.classList.remove("primary");
    toggleBtn.classList.add("secondary");
    toggleBtn.innerHTML = "<span>▶ AUTO-SCROLL</span>";
  }
}

export function resumeAutoScrollNow() {
  isManualAdjustment = false;
  const notice = document.getElementById("live-manual-scroll-notice");
  if (notice) notice.style.display = "none";
  if (manualScrollTimer) {
    clearTimeout(manualScrollTimer);
    manualScrollTimer = null;
  }
}

// =============================================================
// GLOBAL BINDINGS PARA O PALCO E MAESTRO
// =============================================================

if (typeof window !== "undefined") {
  window.virtuoToggleAutoScroll = () => {
    if (autoScrollActive) {
      pauseAutoScroll();
    } else {
      initLiveAutoScroll();
      startAutoScroll();
    }
  };

  window.virtuoSetAutoScrollSpeed = (speed) => {
    autoScrollSpeed = Number(speed) || 1.0;
    document.querySelectorAll("#live-stage-topbar ~ * .pill").forEach(p => p.classList.remove("active"));
    virtuoToast.show(`Velocidade de scroll: ${speed}x`, { type: "info", duration: 1200 });
  };

  window.virtuoResumeAutoScrollNow = resumeAutoScrollNow;

  // Gatilho de Mudança de Tom com Glow Temporário e Notificação Rápida
  window.virtuoRequestKeyChange = async (targetKey) => {
    if (!targetKey) return;
    const confirmed = await liveSyncController.requestKeyChangeWithConfirmation(targetKey, {
      songTitle: "Música do Palco"
    });

    if (confirmed) {
      // Glow temporário no display de tom
      const keyDisplay = document.getElementById("live-stage-key-display") || document.getElementById("live-sync-current-key");
      if (keyDisplay) {
        virtuoMotion.glowBurst(keyDisplay, 400);
      }
      virtuoToast.show(`Tom alterado para ${targetKey}! Toda a equipe sincronizada.`, { type: "success" });
      if (typeof window.renderCurrentScreen === "function") {
        window.renderCurrentScreen();
      }
    }
  };

  window.virtuoChangeBpm = async (delta) => {
    const current = Number(liveSyncEngine.state.currentBpm) || 74;
    const nextBpm = current + delta;
    await liveSyncController.changeBpm(nextBpm);
    virtuoToast.show(`Tempo: ${nextBpm} BPM`, { type: "info", duration: 1200 });
  };

  window.virtuoChangeSection = async (section) => {
    await liveSyncController.changeSection(section);
    virtuoToast.show(`Seção: ${section}`, { type: "info", duration: 1200 });
  };

  window.virtuoToggleLiveEasyPlay = async () => {
    const next = !liveSyncEngine.state.isEasyPlay;
    await liveSyncController.toggleEasyPlay(next);
    virtuoToast.show(`Easy Play: ${next ? 'ATIVADO' : 'DESATIVADO'}`, { type: "info", duration: 1200 });
    if (typeof window.renderCurrentScreen === "function") {
      window.renderCurrentScreen();
    }
  };

  // Comandos Rápidos do Maestro (Toque Rápido no Palco)
  window.virtuoMaestroRepeatChorus = async () => {
    await liveSyncController.changeSection("Refrão");
    virtuoConductor.setSection("Refrão");
    virtuoToast.show("🔁 Maestro: Repetir Refrão!", { type: "info", duration: 1600 });
    const btn = document.getElementById("maestro-btn-chorus");
    if (btn) virtuoMotion.pulse(btn);
  };

  window.virtuoMaestroBridge = async () => {
    await liveSyncController.changeSection("Ponte");
    virtuoConductor.setSection("Ponte");
    virtuoToast.show("🌉 Maestro: Indo para a Ponte!", { type: "info", duration: 1600 });
    const btn = document.getElementById("maestro-btn-bridge");
    if (btn) virtuoMotion.pulse(btn);
  };

  window.virtuoMaestroSpontaneous = async () => {
    await liveSyncController.changeSection("Espontâneo");
    virtuoConductor.setSection("Espontâneo");
    virtuoToast.show("🕊️ Maestro: Momento Espontâneo!", { type: "celestial", duration: 2000 });
    const btn = document.getElementById("maestro-btn-spontaneous");
    if (btn) virtuoMotion.glowBurst(btn, 400);
  };

  window.virtuoMaestroDynamicUp = async () => {
    if (typeof window.virtuoBand !== "undefined" && window.virtuoBand.adjustIntensity) {
      window.virtuoBand.adjustIntensity(0.2);
    }
    virtuoToast.show("▲ Maestro: Subir Dinâmica!", { type: "success", duration: 1600 });
    const btn = document.getElementById("maestro-btn-dyn-up");
    if (btn) virtuoMotion.pulse(btn);
  };

  window.virtuoMaestroDynamicDown = async () => {
    if (typeof window.virtuoBand !== "undefined" && window.virtuoBand.adjustIntensity) {
      window.virtuoBand.adjustIntensity(-0.2);
    }
    virtuoToast.show("▼ Maestro: Descer Dinâmica!", { type: "info", duration: 1600 });
    const btn = document.getElementById("maestro-btn-dyn-down");
    if (btn) virtuoMotion.pulse(btn);
  };

  window.virtuoMaestroEnd = async () => {
    await liveSyncController.changeSection("Final");
    virtuoConductor.setSection("Final");
    virtuoToast.show("⏹ Maestro: Finalizar Música!", { type: "info", duration: 2000 });
    const btn = document.getElementById("maestro-btn-end");
    if (btn) virtuoMotion.pulse(btn);
  };
}
