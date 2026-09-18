// =============================================================
// VIRTUO EXPERIENCE SYSTEM — TELA HOJE (HOME PREMIUM)
// src/features/home/home-view.js
// Estrutura premium oficial em exatos 4 blocos limpos
// Bloco 1: Saudação | Bloco 2: Missão Atual | Bloco 3: Continuar | Bloco 4: Ações Rápidas
// =============================================================

import { getGreeting } from "./greeting.js";
import { DESIGN_TOKENS } from "../../design/design-system.js";

/**
 * Renderiza a nova tela Hoje (Home Premium V2) com 4 blocos canônicos
 * @param {Object} params
 * @param {Object} params.currentUser
 * @param {Object} params.activeMission - Sessão de ensaio / missão ativa
 * @param {Object} params.lastOpenedSong - Última música acessada
 * @param {Object} params.firebaseStatus - Status de conexão
 * @returns {string} HTML renderizado
 */
export function renderHojeScreen({
  currentUser = null,
  activeMission = null,
  lastOpenedSong = null,
  firebaseStatus = { connected: true, label: "ONLINE" }
}) {
  const greeting = getGreeting();
  const firstName = currentUser?.displayName
    ? currentUser.displayName.trim().split(/\s+/)[0]
    : "Músico";

  // Fallback seguro para última música se ainda não houver histórico
  const song = lastOpenedSong || null;

  // Bloco 2: Missão Atual
  const hasMission = Boolean(activeMission && (activeMission.name || activeMission.title));
  const missionName = activeMission?.name || activeMission?.title || "";
  const missionDate = activeMission?.date 
    ? (typeof activeMission.date === 'string' && activeMission.date.includes('-') 
        ? new Date(activeMission.date + 'T00:00:00').toLocaleDateString('pt-BR') 
        : activeMission.date)
    : "Próximo Domingo";
  const songCount = Array.isArray(activeMission?.songs) ? activeMission.songs.length : 4;

  return `
    <div class="hoje-screen-container screen-transition-enter" style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- ================= BLOCO 1: SAUDAÇÃO ================= -->
      <section 
        class="glass virtuo-card virtuo-horizon" 
        id="hoje-bloco-saudacao"
        style="
          position:relative; 
          padding:20px; 
          border-radius:${DESIGN_TOKENS.radii.lg};
          background:${DESIGN_TOKENS.colors.cardBg};
          border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
          box-shadow:${DESIGN_TOKENS.shadows.card};
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span 
            class="pill" 
            style="
              background:rgba(126, 231, 255, 0.10);
              color:${DESIGN_TOKENS.colors.celestialBlue};
              border:1px solid rgba(126, 231, 255, 0.25);
              font-size:10px;
              letter-spacing:0.8px;
            "
          >
            ✦ VIRTUO EXPERIÊNCIA
          </span>
          <div class="firebase-status" style="display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8;">
            <span class="status-dot ${firebaseStatus?.connected ? '' : 'offline'}"></span>
            <span>${firebaseStatus?.label || 'ONLINE'}</span>
          </div>
        </div>

        <h2 
          class="hero" 
          id="hoje-dynamic-greeting"
          data-greeting="${greeting}"
          style="
            margin:0 0 6px 0; 
            font-size:26px; 
            font-weight:700; 
            color:${DESIGN_TOKENS.colors.white}; 
            letter-spacing:-0.5px;
          "
        >
          ${greeting}${currentUser ? `, ${escapeHtml(firstName)}` : ''}
        </h2>

        <p class="subtitle" style="margin:0; font-size:14px; color:${DESIGN_TOKENS.colors.textSecondary};">
          Pronto para sua próxima missão?
        </p>
      </section>

      <!-- ================= BLOCO 2: MISSÃO ATUAL ================= -->
      <section 
        class="glass virtuo-card" 
        id="hoje-bloco-missao"
        style="
          padding:18px 20px; 
          border-radius:${DESIGN_TOKENS.radii.lg};
          background:${DESIGN_TOKENS.colors.cardBg};
          border:1px solid ${hasMission ? DESIGN_TOKENS.colors.borderActive : DESIGN_TOKENS.colors.borderSubtle};
          box-shadow:${DESIGN_TOKENS.shadows.card};
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:11px; font-weight:700; letter-spacing:0.8px; color:${DESIGN_TOKENS.colors.celestialBlue}; text-transform:uppercase;">
            📋 Missão Atual
          </span>
          ${hasMission ? `
            <span style="font-size:11px; color:${DESIGN_TOKENS.colors.goldPremium}; font-weight:600;">
              ● EM PREPARAÇÃO
            </span>
          ` : ''}
        </div>

        ${hasMission ? `
          <div style="margin-top:6px;">
            <h3 style="margin:0 0 4px 0; font-size:18px; color:${DESIGN_TOKENS.colors.white}; font-weight:600;">
              ${escapeHtml(missionName)}
            </h3>
            <div style="display:flex; align-items:center; gap:12px; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary}; margin-bottom:14px;">
              <span>📅 ${escapeHtml(missionDate)}</span>
              <span>•</span>
              <span>🎵 ${songCount} música${songCount !== 1 ? 's' : ''}</span>
            </div>
            <div style="display:flex; gap:10px;">
              <button 
                class="button primary" 
                style="flex:1; padding:10px 16px; font-size:13px; display:inline-flex; align-items:center; justify-content:center; gap:6px;"
                onclick="window.virtuoOpenMissionDetail('${activeMission.id}')"
              >
                <span>🎵</span> Acessar Missão
              </button>
              <button 
                class="button secondary" 
                style="padding:10px 14px; font-size:13px;"
                onclick="window.openMinisterModeQuick()"
                title="Abrir no Modo Palco"
              >
                <span>📖 Palco</span>
              </button>
            </div>
          </div>
        ` : `
          <div style="padding:12px 0 6px 0; text-align:left;">
            <p style="margin:0 0 12px 0; font-size:14px; color:${DESIGN_TOKENS.colors.textSecondary};">
              Nenhuma missão programada.
            </p>
            <button 
              class="button secondary" 
              style="padding:8px 14px; font-size:12px; display:inline-flex; align-items:center; gap:6px;"
              onclick="show('missions')"
            >
              <span>+</span> Organizar Nova Missão
            </button>
          </div>
        `}
      </section>

      <!-- ================= BLOCO 3: CONTINUAR ================= -->
      <section 
        class="glass virtuo-card" 
        id="hoje-bloco-continuar"
        style="
          padding:18px 20px; 
          border-radius:${DESIGN_TOKENS.radii.lg};
          background:${DESIGN_TOKENS.colors.cardBg};
          border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
          box-shadow:${DESIGN_TOKENS.shadows.card};
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:11px; font-weight:700; letter-spacing:0.8px; color:${DESIGN_TOKENS.colors.celestialBlue}; text-transform:uppercase;">
            ▶ Continuar
          </span>
          <span style="font-size:11px; color:#64748b;">Última música aberta</span>
        </div>

        ${song ? `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0 0 4px 0; font-size:17px; color:${DESIGN_TOKENS.colors.white}; font-weight:600;">
              ${escapeHtml(song.title)}
            </h3>
            <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary};">
              <span>Tom <strong>${escapeHtml(song.key || song.originalKey || "G")}</strong></span>
              <span>•</span>
              <span><strong>${song.bpm || 74}</strong> BPM</span>
              ${song.artist ? `<span>•</span><span>${escapeHtml(song.artist)}</span>` : ''}
            </div>
          </div>

          <button 
            class="button primary" 
            style="padding:10px 18px; font-size:13px; display:inline-flex; align-items:center; gap:6px; min-height:44px;"
            onclick="window.openSongById('${song.id}')"
          >
            <span>📜</span> Abrir Cifra
          </button>
        </div>
        ` : `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0 0 4px 0; font-size:15px; color:${DESIGN_TOKENS.colors.white}; font-weight:600;">
              🎓 Virtuo Academy: Metodologia de Ensino
            </h3>
            <p style="margin:0; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary};">
              Formação técnica completa: violão, guitarra, contrabaixo e teoria do nível 0 ao profissional.
            </p>
          </div>

          <button 
            class="button primary" 
            style="padding:10px 18px; font-size:13px; display:inline-flex; align-items:center; gap:6px; min-height:44px;"
            onclick="show('academy')"
          >
            <span>🎓</span> Iniciar Estudos
          </button>
        </div>
        `}
      </section>

      <!-- ================= BLOCO 4: AÇÕES RÁPIDAS ================= -->
      <section 
        id="hoje-bloco-acoes"
        style="
          padding:4px 0 10px 0;
        "
      >
        <div style="margin-bottom:10px; font-size:11px; font-weight:700; letter-spacing:0.8px; color:${DESIGN_TOKENS.colors.celestialBlue}; text-transform:uppercase;">
          ⚡ Ações Rápidas
        </div>

        <div 
          style="
            display:grid; 
            grid-template-columns:repeat(auto-fit, minmax(68px, 1fr)); 
            gap:10px;
          "
        >
          <!-- 1. Afinador -->
          <div 
            class="tile" 
            id="hoje-action-tuner"
            onclick="show('tuner')" 
            role="button"
            tabindex="0"
            style="
              cursor:pointer; 
              padding:14px 6px; 
              text-align:center; 
              min-height:44px;
              background:${DESIGN_TOKENS.colors.cardBg};
              border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
              border-radius:${DESIGN_TOKENS.radii.md};
            "
          >
            <div class="icon" style="font-size:22px; margin-bottom:4px;">🎯</div>
            <h4 style="margin:0; font-size:12px; font-weight:600; color:${DESIGN_TOKENS.colors.white};">Afinador</h4>
          </div>

          <!-- 2. Cifras -->
          <div 
            class="tile" 
            id="hoje-action-library"
            onclick="show('library')" 
            role="button"
            tabindex="0"
            style="
              cursor:pointer; 
              padding:14px 6px; 
              text-align:center; 
              min-height:44px;
              background:${DESIGN_TOKENS.colors.cardBg};
              border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
              border-radius:${DESIGN_TOKENS.radii.md};
            "
          >
            <div class="icon" style="font-size:22px; margin-bottom:4px;">📜</div>
            <h4 style="margin:0; font-size:12px; font-weight:600; color:${DESIGN_TOKENS.colors.white};">Cifras</h4>
          </div>

          <!-- 3. Ensaio -->
          <div 
            class="tile" 
            id="hoje-action-ensaio"
            onclick="show('ensaio')" 
            role="button"
            tabindex="0"
            style="
              cursor:pointer; 
              padding:14px 6px; 
              text-align:center; 
              min-height:44px;
              background:${DESIGN_TOKENS.colors.cardBg};
              border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
              border-radius:${DESIGN_TOKENS.radii.md};
            "
          >
            <div class="icon" style="font-size:22px; margin-bottom:4px;">🎸</div>
            <h4 style="margin:0; font-size:12px; font-weight:600; color:${DESIGN_TOKENS.colors.white};">Ensaio</h4>
          </div>

          <!-- 4. Palco (Modo Ministro) -->
          <div 
            class="tile" 
            id="hoje-action-palco"
            onclick="window.openMinisterModeQuick()" 
            role="button"
            tabindex="0"
            style="
              cursor:pointer; 
              padding:14px 6px; 
              text-align:center; 
              min-height:44px;
              background:linear-gradient(135deg, rgba(126, 231, 255, 0.12), rgba(14, 27, 53, 0.85));
              border:1px solid ${DESIGN_TOKENS.colors.borderActive};
              border-radius:${DESIGN_TOKENS.radii.md};
            "
          >
            <div class="icon" style="font-size:22px; margin-bottom:4px;">📖</div>
            <h4 style="margin:0; font-size:12px; font-weight:600; color:${DESIGN_TOKENS.colors.celestialBlue};">Palco</h4>
          </div>

          <!-- 5. Ensino (Virtuo Academy) -->
          <div 
            class="tile" 
            id="hoje-action-academy"
            onclick="show('academy')" 
            role="button"
            tabindex="0"
            style="
              cursor:pointer; 
              padding:14px 6px; 
              text-align:center; 
              min-height:44px;
              background:${DESIGN_TOKENS.colors.cardBg};
              border:1px solid rgba(126, 231, 255, 0.3);
              border-radius:${DESIGN_TOKENS.radii.md};
            "
          >
            <div class="icon" style="font-size:22px; margin-bottom:4px;">🎓</div>
            <h4 style="margin:0; font-size:12px; font-weight:600; color:#7EE7FF;">Ensino</h4>
          </div>
        </div>
      </section>

    </div>
  `;
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
