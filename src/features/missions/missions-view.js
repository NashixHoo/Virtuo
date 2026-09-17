// =============================================================
// VIRTUO V2 — VIEWS DE MISSÕES & CENTRO DE COMANDO
// src/features/missions/missions-view.js
// Lista de Missões, Criador de Missão Pastoral e Centro de Comando com Timeline
// =============================================================

import { DESIGN_TOKENS } from "../../design/design-system.js";
import { getUserRoleInMission, canCreateMission, canApproveMission, canChangeMusicalParams, canStartLiveSync, ROLES } from "./missions-rbac.js";
import { renderLiveSyncToolbar } from "../live-sync/live-sync-view.js";

function getStatusBadge(status) {
  switch (status) {
    case "draft":
      return { label: "Rascunho", bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" };
    case "pending":
      return { label: "Aguardando Líder", bg: "rgba(245, 197, 66, 0.15)", color: DESIGN_TOKENS.colors.goldPremium, border: "rgba(245, 197, 66, 0.3)" };
    case "approved":
      return { label: "Aprovada", bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)" };
    case "active":
      return { label: "Ao Vivo no Altar", bg: "rgba(126, 231, 255, 0.2)", color: DESIGN_TOKENS.colors.celestialBlue, border: DESIGN_TOKENS.colors.celestialBlue };
    case "completed":
      return { label: "Concluída", bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" };
    default:
      return { label: status, bg: "rgba(255, 255, 255, 0.1)", color: "#fff", border: "transparent" };
  }
}

function getSongStatusIndicator(status) {
  switch (status) {
    case "ready": return { emoji: "🟢", label: "Pronto", color: "#22c55e" };
    case "studying": return { emoji: "🟡", label: "Estudando", color: "#facc15" };
    default: return { emoji: "🔴", label: "Não iniciou", color: "#f87171" };
  }
}

// =============================================================
// 1. LISTA DE MISSÕES
// =============================================================

export function renderMissionsListScreen(missions = [], currentUser = null, activeFilter = "all") {
  const userRole = getUserRoleInMission(currentUser);
  const allowCreate = canCreateMission(userRole);

  const filteredMissions = missions.filter(m => {
    if (activeFilter === "pending") return m.status === "pending";
    if (activeFilter === "active") return m.status === "active" || m.status === "approved";
    if (activeFilter === "completed") return m.status === "completed";
    return true;
  });

  return `
    <div class="missions-screen-container screen-transition-enter" style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Cabeçalho Principal -->
      <section 
        class="glass virtuo-card virtuo-horizon" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <span class="pill" style="background: rgba(126, 231, 255, 0.1); color: ${DESIGN_TOKENS.colors.celestialBlue}; font-size: 10px; letter-spacing: 0.8px;">
              ✦ MINISTÉRIO & REPERTÓRIO
            </span>
            <h2 style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: ${DESIGN_TOKENS.colors.white};">
              Missões do Louvor
            </h2>
          </div>
          ${allowCreate ? `
            <button 
              class="button primary" 
              style="padding: 10px 16px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;"
              onclick="window.virtuoOpenCreateMission()"
            >
              <span>+</span> Nova Missão
            </button>
          ` : ''}
        </div>

        <p style="margin: 0 0 14px 0; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary};">
          Gestão completa de cultos, festividades, congressos, vigílias e ensaios com aprovação ministerial e Live Sync.
        </p>

        <!-- Filtros de Estado -->
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px;">
          <button 
            class="pill" 
            style="cursor: pointer; background: ${activeFilter === 'all' ? 'rgba(126, 231, 255, 0.25)' : 'rgba(255,255,255,0.04)'}; color: ${activeFilter === 'all' ? DESIGN_TOKENS.colors.celestialBlue : '#94a3b8'}; border: 1px solid ${activeFilter === 'all' ? DESIGN_TOKENS.colors.celestialBlue : 'rgba(255,255,255,0.08)'};"
            onclick="window.virtuoFilterMissions('all')"
          >
            Todas (${missions.length})
          </button>
          <button 
            class="pill" 
            style="cursor: pointer; background: ${activeFilter === 'pending' ? 'rgba(245, 197, 66, 0.25)' : 'rgba(255,255,255,0.04)'}; color: ${activeFilter === 'pending' ? DESIGN_TOKENS.colors.goldPremium : '#94a3b8'}; border: 1px solid ${activeFilter === 'pending' ? DESIGN_TOKENS.colors.goldPremium : 'rgba(255,255,255,0.08)'};"
            onclick="window.virtuoFilterMissions('pending')"
          >
            Aguardando Aprovação (${missions.filter(m => m.status === 'pending').length})
          </button>
          <button 
            class="pill" 
            style="cursor: pointer; background: ${activeFilter === 'active' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.04)'}; color: ${activeFilter === 'active' ? '#22c55e' : '#94a3b8'}; border: 1px solid ${activeFilter === 'active' ? '#22c55e' : 'rgba(255,255,255,0.08)'};"
            onclick="window.virtuoFilterMissions('active')"
          >
            Ativas / Aprovadas (${missions.filter(m => m.status === 'active' || m.status === 'approved').length})
          </button>
          <button 
            class="pill" 
            style="cursor: pointer; background: ${activeFilter === 'completed' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.04)'}; color: ${activeFilter === 'completed' ? '#c084fc' : '#94a3b8'}; border: 1px solid ${activeFilter === 'completed' ? '#c084fc' : 'rgba(255,255,255,0.08)'};"
            onclick="window.virtuoFilterMissions('completed')"
          >
            Concluídas (${missions.filter(m => m.status === 'completed').length})
          </button>
        </div>
      </section>

      <!-- Lista de Cartões de Missão -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${filteredMissions.length === 0 ? `
          <div class="glass" style="padding: 36px 20px; text-align: center; border-radius: ${DESIGN_TOKENS.radii.lg};">
            <div style="font-size: 36px; margin-bottom: 8px;">🕊️</div>
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: ${DESIGN_TOKENS.colors.white};">Nenhuma missão encontrada</h3>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary};">
              Crie a primeira escala para ministrar em união com sua equipe.
            </p>
            ${allowCreate ? `
              <button class="button primary" style="padding: 10px 18px; font-size: 13px;" onclick="window.virtuoOpenCreateMission()">
                + Criar Nova Missão
              </button>
            ` : ''}
          </div>
        ` : filteredMissions.map(m => {
          const badge = getStatusBadge(m.status);
          const songCount = Array.isArray(m.songs) ? m.songs.length : 0;
          const pct = m.progress?.overallPercentage || 0;
          const formattedDate = m.eventDate 
            ? new Date(m.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : "Data a definir";

          return `
            <div 
              class="glass" 
              onclick="window.virtuoOpenMissionDetail('${m.id}')"
              style="
                padding: 18px 20px; 
                border-radius: ${DESIGN_TOKENS.radii.lg};
                background: ${m.status === 'active' ? 'rgba(14, 27, 53, 0.95)' : DESIGN_TOKENS.colors.cardBg};
                border: 1px solid ${m.status === 'active' ? DESIGN_TOKENS.colors.borderActive : DESIGN_TOKENS.colors.borderSubtle};
                cursor: pointer;
                transition: transform 120ms ease;
              "
            >
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${DESIGN_TOKENS.colors.celestialBlue}; letter-spacing: 0.8px;">
                    ${escapeHtml(m.eventType || 'culto')} • ${escapeHtml(m.churchName || 'Igreja')}
                  </span>
                  <h3 style="margin: 4px 0 2px 0; font-size: 18px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
                    ${escapeHtml(m.title)}
                  </h3>
                </div>
                <span 
                  class="pill" 
                  style="
                    background: ${badge.bg}; 
                    color: ${badge.color}; 
                    border: 1px solid ${badge.border}; 
                    font-size: 10px;
                    font-weight: 700;
                  "
                >
                  ${badge.label}
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary}; margin-bottom: 12px;">
                <span>📅 ${formattedDate}</span>
                <span>•</span>
                <span>🎵 ${songCount} louvores</span>
                <span>•</span>
                <span>👤 Líder: ${escapeHtml(m.leaderName || 'A definir')}</span>
              </div>

              <!-- Mini barra de progresso do repertório -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #7ee7ff, #22c55e); border-radius: 3px;"></div>
                </div>
                <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">
                  ${pct}% pronto
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

// =============================================================
// 2. CRIAR NOVA MISSÃO (Pastor / Regente)
// =============================================================

export function renderCreateMissionScreen() {
  return `
    <div class="create-mission-container screen-transition-enter" style="display: flex; flex-direction: column; gap: 16px;">
      
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="button secondary" style="padding: 6px 12px; font-size: 12px;" onclick="show('missions')">
              ← Cancelar
            </button>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${DESIGN_TOKENS.colors.white};">
              Nova Missão Ministerial
            </h2>
          </div>
          <span class="pill" style="background: rgba(126, 231, 255, 0.1); color: ${DESIGN_TOKENS.colors.celestialBlue};">
            FLUXO PASTORAL
          </span>
        </div>
        <p style="margin: 0; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary};">
          Agende o evento e defina o repertório inicial para aprovação pelo Líder Musical.
        </p>
      </section>

      <!-- Formulário -->
      <section 
        class="glass" 
        style="
          padding: 24px 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <form id="form-create-mission" onsubmit="window.virtuoSubmitCreateMission(event)" style="display: flex; flex-direction: column; gap: 16px;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
                Tipo de Evento:
              </label>
              <select 
                id="mission-event-type" 
                required 
                style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px;"
              >
                <option value="culto" selected>Culto de Celebração</option>
                <option value="festividade">Festividade / Aniversário</option>
                <option value="congresso">Congresso / Conferência</option>
                <option value="vigilia">Vigília de Oração</option>
                <option value="ensaio">Ensaio Geral da Banda</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
                Data e Horário:
              </label>
              <input 
                type="datetime-local" 
                id="mission-event-date" 
                required 
                style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px;"
              />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
              Título da Missão:
            </label>
            <input 
              type="text" 
              id="mission-title" 
              required 
              placeholder="Ex: Culto de Domingo — Noite de Celebração" 
              style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px;"
            />
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
              Nome da Igreja / Comunidade:
            </label>
            <input 
              type="text" 
              id="mission-church-name" 
              value="Igreja Central da Fé" 
              required 
              style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px;"
            />
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
              Descrição ou Orientações Espirituais:
            </label>
            <textarea 
              id="mission-description" 
              rows="3" 
              placeholder="Ex: Tema da ministração, vestimenta da equipe ou passagens bíblicas de meditação..." 
              style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px; resize: vertical;"
            ></textarea>
          </div>

          <!-- Repertório Sugerido Inicial -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label style="font-size: 12px; color: #94a3b8; font-weight: 600;">
                Repertório Inicial Sugerido (Pastor/Regente):
              </label>
              <button 
                type="button" 
                class="button secondary" 
                style="padding: 4px 10px; font-size: 11px;"
                onclick="window.virtuoAddSuggestedSongField()"
              >
                + Adicionar Louvor
              </button>
            </div>

            <div id="mission-songs-input-list" style="display: flex; flex-direction: column; gap: 8px;">
              <div class="song-input-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; align-items: center;">
                <input type="text" placeholder="Nome da música" value="Mistério na Olaria" class="song-title-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <input type="text" placeholder="Tom (Ex: Cm)" value="Cm" class="song-key-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <input type="number" placeholder="BPM" value="74" class="song-bpm-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <span></span>
              </div>
              <div class="song-input-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; align-items: center;">
                <input type="text" placeholder="Nome da música" value="Raridade" class="song-title-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <input type="text" placeholder="Tom (Ex: A)" value="A" class="song-key-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <input type="number" placeholder="BPM" value="72" class="song-bpm-field" style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 13px;" required />
                <span></span>
              </div>
            </div>
          </div>

          <div style="margin-top: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; gap: 12px;">
            <button 
              type="submit" 
              class="button primary" 
              style="flex: 1; padding: 12px; font-size: 14px; font-weight: 700;"
            >
              🚀 Criar e Enviar para o Líder Musical
            </button>
          </div>

        </form>
      </section>

    </div>
  `;
}

// =============================================================
// 3. CENTRO DE COMANDO (DETALHE DA MISSÃO)
// =============================================================

export function renderCommandCenterScreen(mission, currentUser = null) {
  if (!mission) {
    return `<div class="glass" style="padding: 30px; text-align: center;">Missão não encontrada.</div>`;
  }

  const userRole = getUserRoleInMission(currentUser, mission);
  const allowApprove = canApproveMission(userRole);
  const allowMusicalEdit = canChangeMusicalParams(userRole);
  const allowLive = canStartLiveSync(userRole);
  const isPendingApproval = mission.status === "pending";
  const isActive = mission.status === "active";
  const isCompleted = mission.status === "completed";

  const badge = getStatusBadge(mission.status);
  const progress = mission.progress || { overallPercentage: 0, readySongs: 0, studyingSongs: 0, unstartedSongs: 0 };
  const songs = Array.isArray(mission.songs) ? mission.songs : [];
  const history = Array.isArray(mission.history) ? mission.history : [];

  const formattedDate = mission.eventDate 
    ? new Date(mission.eventDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "Data a definir";

  return `
    <div class="command-center-container screen-transition-enter" style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Cabeçalho Principal do Centro de Comando -->
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${isActive ? DESIGN_TOKENS.colors.borderActive : DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <button class="button secondary" style="padding: 6px 12px; font-size: 12px;" onclick="show('missions')">
            ← Todas as Missões
          </button>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pill" style="background: rgba(126, 231, 255, 0.1); color: ${DESIGN_TOKENS.colors.celestialBlue}; font-size: 11px;">
              Meu Papel: <strong>${userRole}</strong>
            </span>
            <span class="pill" style="background: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border}; font-size: 11px; font-weight: 700;">
              ${badge.label}
            </span>
          </div>
        </div>

        <h2 style="margin: 6px 0 4px 0; font-size: 24px; font-weight: 700; color: ${DESIGN_TOKENS.colors.white};">
          ${escapeHtml(mission.title)}
        </h2>

        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary}; margin-bottom: 12px;">
          <span>⛪ ${escapeHtml(mission.churchName)}</span>
          <span>•</span>
          <span>📅 ${escapeHtml(formattedDate)}</span>
          <span>•</span>
          <span>👤 Líder: <strong>${escapeHtml(mission.leaderName || 'Não atribuído')}</strong></span>
          <span>•</span>
          <span>🙏 Pastor: <strong>${escapeHtml(mission.pastorName || 'Não atribuído')}</strong></span>
        </div>

        ${mission.description ? `
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px;">
            ${escapeHtml(mission.description)}
          </p>
        ` : ''}

        <!-- Barra Geral de Progresso da Missão -->
        <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px;">
            <span style="color: #94a3b8; font-weight: 600;">Progresso Geral do Repertório:</span>
            <div style="display: flex; gap: 10px;">
              <span style="color: #22c55e;">🟢 ${progress.readySongs || 0} Prontos</span>
              <span style="color: #facc15;">🟡 ${progress.studyingSongs || 0} Estudando</span>
              <span style="color: #f87171;">🔴 ${progress.unstartedSongs || 0} Não iniciou</span>
              <strong style="color: ${DESIGN_TOKENS.colors.celestialBlue};">${progress.overallPercentage || 0}%</strong>
            </div>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
            <div style="width: ${progress.overallPercentage || 0}%; height: 100%; background: linear-gradient(90deg, #7ee7ff, #22c55e); transition: width 300ms ease;"></div>
          </div>
        </div>
      </section>

      <!-- SE A MISSÃO ESTIVER ATIVA: MOSTRA BARRA LIVE SYNC NO TOPO -->
      ${isActive ? renderLiveSyncToolbar(mission, allowMusicalEdit) : ''}

      <!-- AÇÕES DO LÍDER: Card de Aprovação (se pending) -->
      ${isPendingApproval && allowApprove ? `
        <section 
          class="glass" 
          style="
            padding: 18px 20px; 
            border-radius: ${DESIGN_TOKENS.radii.lg};
            background: linear-gradient(135deg, rgba(245, 197, 66, 0.12), rgba(14, 27, 53, 0.9));
            border: 1px solid rgba(245, 197, 66, 0.35);
          "
        >
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 18px;">📋</span>
            <h3 style="margin: 0; font-size: 16px; color: ${DESIGN_TOKENS.colors.goldPremium}; font-weight: 700;">
              Validação do Líder Musical
            </h3>
          </div>
          <p style="margin: 0 0 14px 0; font-size: 13px; color: #cbd5e1;">
            Esta missão foi enviada pelo Pastor e aguarda sua conferência de repertório, tons, BPMs e Easy Play antes de ser liberada para a banda.
          </p>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button 
              class="button primary" 
              style="padding: 10px 18px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff;"
              onclick="window.virtuoApproveMission('${mission.id}')"
            >
              ✓ Aprovar e Liberar para Banda
            </button>
            <button 
              class="button secondary" 
              style="padding: 10px 14px; font-size: 13px;"
              onclick="window.virtuoReturnMissionPrompt('${mission.id}')"
            >
              ↩ Devolver com Observações
            </button>
          </div>
        </section>
      ` : ''}

      <!-- BOTÕES DE COMANDO RÁPIDO: Check-in, Modo Palco, Conclusão -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <button 
          class="button secondary" 
          style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px;"
          onclick="window.virtuoOpenCheckIn('${mission.id}')"
        >
          <span style="font-size: 20px;">✓</span>
          <span style="font-weight: 600;">Virtuo Confirm</span>
          <span style="font-size: 10px; color: #94a3b8;">Check-in do Culto</span>
        </button>

        ${allowLive && !isActive && !isCompleted ? `
          <button 
            class="button primary" 
            style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: linear-gradient(135deg, #7ee7ff, #2563eb); color: #080e1a;"
            onclick="window.virtuoStartMission('${mission.id}')"
          >
            <span style="font-size: 20px;">⚡</span>
            <span style="font-weight: 700;">Iniciar Live Sync</span>
            <span style="font-size: 10px; color: #080e1a; opacity: 0.85;">Ao Vivo no Altar</span>
          </button>
        ` : isActive ? `
          <button 
            class="button primary" 
            style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: #22c55e; color: #080e1a;"
            onclick="window.openMinisterModeQuick()"
          >
            <span style="font-size: 20px;">📖</span>
            <span style="font-weight: 700;">Abrir Palco</span>
            <span style="font-size: 10px; color: #080e1a; opacity: 0.85;">Modo Ministro</span>
          </button>
        ` : `
          <button 
            class="button secondary" 
            style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px;"
            onclick="window.openMinisterModeQuick()"
          >
            <span style="font-size: 20px;">📖</span>
            <span style="font-weight: 600;">Modo Palco</span>
            <span style="font-size: 10px; color: #94a3b8;">Visualizar Cifras</span>
          </button>
        `}

        ${!isCompleted ? `
          <button 
            class="button secondary" 
            style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px;"
            onclick="window.virtuoCompleteMission('${mission.id}')"
            title="Encerrar culto e desbloquear Virtuo Moment"
          >
            <span style="font-size: 20px;">🏆</span>
            <span style="font-weight: 600;">Concluir Missão</span>
            <span style="font-size: 10px; color: #94a3b8;">Desbloquear Momento</span>
          </button>
        ` : `
          <button 
            class="button secondary" 
            style="padding: 14px 10px; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 4px;"
            onclick="window.virtuoViewMomentScreen('primeira_ministracao')"
          >
            <span style="font-size: 20px;">🕊️</span>
            <span style="font-weight: 600;">Ver Celebração</span>
            <span style="font-size: 10px; color: #94a3b8;">Virtuo Moment</span>
          </button>
        `}
      </div>

      <!-- REPERTÓRIO OFICIAL DA MISSÃO COM STATUS 🟢 🟡 🔴 -->
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 16px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
            Repertório da Missão (${songs.length})
          </h3>
          <span style="font-size: 11px; color: #94a3b8;">
            Clique para alterar status de estudo
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${songs.map((s, idx) => {
            const ind = getSongStatusIndicator(s.status);
            return `
              <div 
                style="
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  padding: 12px 14px; 
                  border-radius: ${DESIGN_TOKENS.radii.md};
                  background: rgba(255, 255, 255, 0.02);
                  border: 1px solid rgba(255, 255, 255, 0.06);
                "
              >
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 13px; font-weight: 700; color: #64748b; width: 18px;">
                    ${idx + 1}
                  </span>
                  <div>
                    <h4 style="margin: 0 0 2px 0; font-size: 15px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
                      ${escapeHtml(s.title)}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${DESIGN_TOKENS.colors.textSecondary};">
                      <span>Tom: <strong style="color: ${DESIGN_TOKENS.colors.celestialBlue};">${escapeHtml(s.key || 'C')}</strong></span>
                      <span>•</span>
                      <span><strong>${s.bpm || 70}</strong> BPM</span>
                      ${s.artist ? `<span>•</span><span>${escapeHtml(s.artist)}</span>` : ''}
                      ${s.easyPlay ? `<span class="pill" style="font-size: 9px; padding: 2px 6px; background: rgba(126,231,255,0.1); color: #7ee7ff;">EASY</span>` : ''}
                    </div>
                  </div>
                </div>

                <!-- Indicador de Preparação e Ações -->
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button 
                    class="pill" 
                    title="Alternar: 🟢 Pronto -> 🟡 Estudando -> 🔴 Não iniciou"
                    style="
                      cursor: pointer; 
                      background: rgba(0,0,0,0.3); 
                      border: 1px solid rgba(255,255,255,0.1); 
                      color: ${ind.color}; 
                      font-size: 11px; 
                      font-weight: 600;
                      display: inline-flex;
                      align-items: center;
                      gap: 4px;
                    "
                    onclick="window.virtuoToggleSongStudyStatus('${mission.id}', '${s.id}', '${s.status}')"
                  >
                    <span>${ind.emoji}</span>
                    <span>${ind.label}</span>
                  </button>

                  <button 
                    class="button secondary" 
                    style="padding: 6px 10px; font-size: 11px;"
                    onclick="window.openSongById('${s.id}')"
                    title="Abrir Cifra"
                  >
                    📜
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- TIMELINE / HISTÓRICO DA MISSÃO -->
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 16px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
            Histórico da Missão (Timeline)
          </h3>
          <span style="font-size: 11px; color: #94a3b8;">
            Registro oficial de eventos
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; position: relative; padding-left: 12px; border-left: 2px solid rgba(126, 231, 255, 0.2);">
          ${history.map(item => `
            <div style="position: relative;">
              <div style="position: absolute; left: -18px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: ${DESIGN_TOKENS.colors.celestialBlue}; box-shadow: 0 0 6px ${DESIGN_TOKENS.colors.celestialBlue};"></div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <strong style="font-size: 13px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
                  ${escapeHtml(item.title)}
                </strong>
                <span style="font-size: 11px; color: #64748b;">
                  ${item.timestamp ? new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: ${DESIGN_TOKENS.colors.textSecondary};">
                ${escapeHtml(item.details || '')} ${item.author ? `• <em>${escapeHtml(item.author)}</em>` : ''}
              </p>
            </div>
          `).join('')}
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
