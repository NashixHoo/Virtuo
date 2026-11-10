// =============================================================
// VIRTUO V2 — VIEW DE NOTIFICAÇÕES INTERNAS
// src/features/notifications/notifications-view.js
// =============================================================

import { notificationsService, NOTIFICATION_TYPES } from "./notifications-service.js";
import { DESIGN_TOKENS } from "../../design/design-system.js";

function getNotificationIcon(type) {
  switch (type) {
    case NOTIFICATION_TYPES.NEW_MISSION: return "📋";
    case NOTIFICATION_TYPES.REPERTOIRE_CHANGED: return "🎵";
    case NOTIFICATION_TYPES.KEY_CHANGED: return "🎹";
    case NOTIFICATION_TYPES.BPM_CHANGED: return "⏱️";
    case NOTIFICATION_TYPES.REHEARSAL_TOMORROW: return "🎸";
    case NOTIFICATION_TYPES.MISSION_STARTED: return "🔥";
    case NOTIFICATION_TYPES.CHECKIN_ALERT: return "✅";
    case NOTIFICATION_TYPES.MOMENT_UNLOCKED: return "🏆";
    default: return "🔔";
  }
}

function formatRelativeTime(isoString) {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "Agora mesmo";
    if (diffMinutes < 60) return `Há ${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays}d`;
  } catch {
    return "Recentemente";
  }
}

/**
 * Renderiza o painel completo de notificações internas
 * @returns {string} HTML
 */
export function renderNotificationsScreen() {
  const notifs = notificationsService.getAll();
  const unreadCount = notificationsService.getUnreadCount();

  return `
    <div class="notifications-screen-container screen-transition-enter" style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Cabeçalho do Painel -->
      <section 
        class="glass" 
        style="
          padding:20px; 
          border-radius:${DESIGN_TOKENS.radii.lg};
          background:${DESIGN_TOKENS.colors.cardBg};
          border:1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <button 
              class="button secondary" 
              style="padding:6px 12px; font-size:12px;" 
              onclick="show('home')"
            >
              ← Voltar
            </button>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:${DESIGN_TOKENS.colors.white};">
              Central de Notificações
            </h2>
          </div>
          ${unreadCount > 0 ? `
            <span class="pill" style="background:rgba(245, 197, 66, 0.15); color:${DESIGN_TOKENS.colors.goldPremium}; border:1px solid rgba(245, 197, 66, 0.3);">
              ${unreadCount} Não ${unreadCount === 1 ? 'lida' : 'lidas'}
            </span>
          ` : `
            <span class="pill" style="background:rgba(126, 231, 255, 0.1); color:${DESIGN_TOKENS.colors.celestialBlue};">
              Em dia
            </span>
          `}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary};">
            Avisos de novas missões, ensaios, tons e sincronizações da banda.
          </p>
          <div style="display:flex; gap:8px;">
            ${unreadCount > 0 ? `
              <button 
                class="button secondary" 
                style="padding:6px 10px; font-size:11px;" 
                onclick="window.virtuoMarkAllNotificationsRead()"
              >
                Marcar lidas
              </button>
            ` : ''}
            <button 
              class="button secondary" 
              style="padding:6px 10px; font-size:11px;" 
              onclick="window.virtuoClearNotifications()"
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      <!-- Lista de Notificações -->
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${notifs.length === 0 ? `
          <div class="glass" style="padding:32px 20px; text-align:center; border-radius:${DESIGN_TOKENS.radii.lg};">
            <div style="font-size:32px; margin-bottom:8px;">🔕</div>
            <h3 style="margin:0 0 4px 0; font-size:16px; color:${DESIGN_TOKENS.colors.white};">Nenhuma notificação</h3>
            <p style="margin:0; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary};">
              Você está totalmente atualizado com as missões e ensaios.
            </p>
          </div>
        ` : notifs.map(n => `
          <div 
            class="glass" 
            onclick="window.virtuoOpenNotificationMission('${n.id}', '${n.missionId || ''}')"
            style="
              display:flex; 
              align-items:flex-start; 
              gap:14px; 
              padding:14px 16px; 
              border-radius:${DESIGN_TOKENS.radii.md};
              background:${n.read ? DESIGN_TOKENS.colors.cardBg : 'rgba(14, 27, 53, 0.95)'};
              border:1px solid ${n.read ? 'rgba(255,255,255,0.06)' : DESIGN_TOKENS.colors.borderActive};
              cursor:pointer;
              transition: transform 120ms ease;
            "
          >
            <div style="font-size:24px; line-height:1; padding-top:2px;">
              ${getNotificationIcon(n.type)}
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px;">
                <strong style="font-size:14px; color:${DESIGN_TOKENS.colors.white}; font-weight:600;">
                  ${escapeHtml(n.title)}
                </strong>
                <span style="font-size:11px; color:#64748b;">
                  ${formatRelativeTime(n.timestamp)}
                </span>
              </div>
              <p style="margin:0 0 6px 0; font-size:13px; color:${DESIGN_TOKENS.colors.textSecondary}; line-height:1.4;">
                ${escapeHtml(n.message)}
              </p>
              ${n.missionId ? `
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:11px; color:${DESIGN_TOKENS.colors.celestialBlue}; font-weight:600;">
                    Ver Missão →
                  </span>
                  ${!n.read ? `
                    <span style="width:6px; height:6px; border-radius:50%; background:${DESIGN_TOKENS.colors.celestialBlue};"></span>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
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
