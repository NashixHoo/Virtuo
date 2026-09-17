// =============================================================
// VIRTUO V2 — VIEW ESPECIAL: VIRTUO MOMENTS (PRIMEIRA MINISTRAÇÃO)
// src/features/moments/moments-view.js
// Tela comemorativa oficial com registro de data, igreja, repertório e mensagem celestial
// =============================================================

import { DESIGN_TOKENS } from "../../design/design-system.js";

/**
 * Renderiza a tela especial comemorativa de Momento Desbloqueado
 * @param {Object} moment - Dados do momento { title, subtitle, badge, icon, message, churchName, date, songs, leaderName }
 * @returns {string} HTML renderizado
 */
export function renderMomentCelebrationScreen(moment) {
  const formattedDate = moment?.date
    ? (typeof moment.date === 'string' && moment.date.includes('-')
        ? new Date(moment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : moment.date)
    : "Data de Consagração";

  const songsList = Array.isArray(moment?.songs) ? moment.songs : [];

  return `
    <div 
      class="moment-celebration-container screen-transition-enter" 
      style="
        min-height: 80vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 24px 16px;
        text-align: center;
      "
    >
      <!-- Cartão Celestial Principal -->
      <div 
        class="glass" 
        style="
          max-width: 580px;
          width: 100%;
          border-radius: ${DESIGN_TOKENS.radii.xl};
          background: linear-gradient(180deg, rgba(14, 27, 53, 0.95) 0%, rgba(8, 14, 26, 0.98) 100%);
          border: 1px solid rgba(126, 231, 255, 0.4);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 30px rgba(126, 231, 255, 0.2);
          padding: 36px 24px;
          position: relative;
          overflow: hidden;
        "
      >
        <!-- Efeito de feixe celestial de fundo -->
        <div 
          style="
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 100px;
            background: radial-gradient(circle, rgba(126, 231, 255, 0.35) 0%, rgba(126, 231, 255, 0) 70%);
            filter: blur(20px);
            pointer-events: none;
          "
        ></div>

        <!-- Emblema de topo -->
        <div style="margin-bottom: 16px;">
          <span 
            class="pill" 
            style="
              background: rgba(245, 197, 66, 0.15);
              color: ${DESIGN_TOKENS.colors.goldPremium};
              border: 1px solid rgba(245, 197, 66, 0.35);
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1px;
              padding: 6px 14px;
            "
          >
            ${moment?.badge || "✦ MARCO VIRTUO"}
          </span>
        </div>

        <div style="font-size: 54px; margin-bottom: 12px; filter: drop-shadow(0 4px 12px rgba(126, 231, 255, 0.4));">
          ${moment?.icon || "🕊️"}
        </div>

        <h1 
          style="
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 800;
            color: ${DESIGN_TOKENS.colors.white};
            letter-spacing: -0.5px;
          "
        >
          ${escapeHtml(moment?.title || "Primeira Ministração")}
        </h1>

        <p 
          style="
            margin: 0 0 20px 0;
            font-size: 14px;
            color: ${DESIGN_TOKENS.colors.celestialBlue};
            font-weight: 600;
          "
        >
          ${escapeHtml(moment?.subtitle || "Consagração do Ministério")}
        </p>

        <!-- Mensagem Inspiracional -->
        <div 
          style="
            background: rgba(255, 255, 255, 0.03);
            border-left: 3px solid ${DESIGN_TOKENS.colors.celestialBlue};
            border-radius: 0 ${DESIGN_TOKENS.radii.sm} ${DESIGN_TOKENS.radii.sm} 0;
            padding: 14px 16px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.6;
            font-style: italic;
          "
        >
          ${escapeHtml(moment?.message || "Que esta caminhada seja guiada por excelência, unção e virtuosismo no altar.")}
        </div>

        <!-- Bloco de Informações da Ministração -->
        <div 
          style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            text-align: left;
            margin-bottom: 24px;
            background: rgba(0, 0, 0, 0.25);
            padding: 14px 16px;
            border-radius: ${DESIGN_TOKENS.radii.md};
            border: 1px solid rgba(255, 255, 255, 0.05);
          "
        >
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Igreja</span>
            <strong style="font-size: 13px; color: ${DESIGN_TOKENS.colors.white};">
              ${escapeHtml(moment?.churchName || "Igreja Local")}
            </strong>
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Data</span>
            <strong style="font-size: 13px; color: ${DESIGN_TOKENS.colors.white};">
              ${escapeHtml(formattedDate)}
            </strong>
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Líder / Ministro</span>
            <strong style="font-size: 13px; color: ${DESIGN_TOKENS.colors.white};">
              ${escapeHtml(moment?.leaderName || "Líder Musical")}
            </strong>
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block;">Louvores Ministrados</span>
            <strong style="font-size: 13px; color: ${DESIGN_TOKENS.colors.white};">
              ${songsList.length} canções
            </strong>
          </div>
        </div>

        <!-- Repertório Ministrado -->
        ${songsList.length > 0 ? `
          <div style="text-align: left; margin-bottom: 24px;">
            <span style="font-size: 11px; color: ${DESIGN_TOKENS.colors.celestialBlue}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">
              🎵 Repertório Consagrado
            </span>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${songsList.map((s, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px; font-size: 12px;">
                  <span style="color: ${DESIGN_TOKENS.colors.white}; font-weight: 500;">
                    ${idx + 1}. ${escapeHtml(s.title || "Louvor")}
                  </span>
                  <span style="color: ${DESIGN_TOKENS.colors.textSecondary};">
                    Tom: <strong style="color: ${DESIGN_TOKENS.colors.celestialBlue};">${escapeHtml(s.key || "C")}</strong>
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Botões de Ação -->
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button 
            class="button primary" 
            style="padding: 12px 24px; font-size: 14px; font-weight: 700;"
            onclick="show('missions')"
          >
            Acessar Missões
          </button>
          <button 
            class="button secondary" 
            style="padding: 12px 20px; font-size: 14px;"
            onclick="show('profile')"
          >
            Ver no Meu Perfil
          </button>
        </div>

      </div>

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
