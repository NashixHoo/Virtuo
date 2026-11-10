// =============================================================
// VIRTUO V2 — VIRTUO CONFIRM (CHECK-IN DO CULTO)
// src/features/missions/checkin-view.js
// Confirmação de presença, instrumento, afinação e retorno de áudio
// =============================================================

import { DESIGN_TOKENS } from "../../design/design-system.js";

const INSTRUMENT_LIST = [
  "Violão",
  "Guitarra Base",
  "Guitarra Solo",
  "Teclado",
  "Baixo",
  "Bateria",
  "Percussão",
  "Vocal Líder",
  "Vocal Soprano",
  "Vocal Contralto",
  "Vocal Tenor",
  "Saxofone",
  "Trompete",
  "Flauta",
  "Técnico de Som"
];

/**
 * Renderiza a tela de Virtuo Confirm
 * @param {Object} mission - Dados da missão
 * @param {Object} currentUser - Usuário atual
 * @param {boolean} isLeader - Se o usuário tem privilégio de liderança
 * @returns {string} HTML renderizado
 */
export function renderCheckInScreen(mission, currentUser, isLeader = false) {
  const members = Array.isArray(mission?.members) ? mission.members : [];
  
  // Encontra ou cria registro temporário do usuário atual
  const myMember = members.find(m => m.uid === currentUser?.uid) || {
    uid: currentUser?.uid || "guest",
    name: currentUser?.displayName || "Músico Convidado",
    instrument: "Violão",
    checkedIn: false,
    isTuned: false,
    returnWorking: false
  };

  const totalMembers = members.length;
  const checkedInCount = members.filter(m => m.checkedIn).length;
  const percentage = totalMembers > 0 ? Math.round((checkedInCount / totalMembers) * 100) : 0;

  return `
    <div class="checkin-screen-container screen-transition-enter" style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Cabeçalho -->
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${DESIGN_TOKENS.colors.borderSubtle};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="button secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.virtuoOpenMissionDetail('${mission?.id || ''}')">
              ← Voltar à Missão
            </button>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${DESIGN_TOKENS.colors.white};">
              Virtuo Confirm
            </h2>
          </div>
          <span class="pill" style="background: rgba(126, 231, 255, 0.1); color: ${DESIGN_TOKENS.colors.celestialBlue}; font-weight: 700;">
            ✓ CHECK-IN DO CULTO
          </span>
        </div>

        <p style="margin: 0; font-size: 13px; color: ${DESIGN_TOKENS.colors.textSecondary};">
          Missão: <strong>${escapeHtml(mission?.title || "Culto")}</strong> • ${escapeHtml(mission?.churchName || "Igreja")}
        </p>

        <!-- Barra Geral de Prontidão da Equipe -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span style="color: ${DESIGN_TOKENS.colors.textSecondary};">Banda Pronta no Altar</span>
            <strong style="color: ${percentage >= 80 ? '#22c55e' : DESIGN_TOKENS.colors.goldPremium}; font-weight: 700;">
              ${checkedInCount} de ${totalMembers} confirmados (${percentage}%)
            </strong>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #7ee7ff, #22c55e); transition: width 300ms ease;"></div>
          </div>
        </div>
      </section>

      <!-- Meu Check-in Pessoal -->
      <section 
        class="glass" 
        style="
          padding: 20px; 
          border-radius: ${DESIGN_TOKENS.radii.lg};
          background: ${DESIGN_TOKENS.colors.cardBg};
          border: 1px solid ${myMember.checkedIn ? 'rgba(34, 197, 94, 0.4)' : DESIGN_TOKENS.colors.borderActive};
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: ${DESIGN_TOKENS.colors.white}; font-weight: 600;">
            Minha Confirmação Individual
          </h3>
          <span class="pill" style="background: ${myMember.checkedIn ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${myMember.checkedIn ? '#22c55e' : '#f87171'}; border: 1px solid ${myMember.checkedIn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
            ${myMember.checkedIn ? '● PRESENTE & CONFIRMADO' : '○ PENDENTE DE CHECK-IN'}
          </span>
        </div>

        <form id="form-virtuo-confirm" onsubmit="window.virtuoSubmitCheckIn(event, '${mission?.id || ''}')" style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Seleção de Instrumento -->
          <div>
            <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
              Seu Instrumento / Função no Culto:
            </label>
            <select 
              id="checkin-instrument-select" 
              style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px;"
            >
              ${INSTRUMENT_LIST.map(inst => `
                <option value="${inst}" ${inst === myMember.instrument ? 'selected' : ''}>${inst}</option>
              `).join('')}
            </select>
          </div>

          <!-- Itens de Verificação Obrigatórios -->
          <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.2); padding: 14px; border-radius: 8px;">
            
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: #fff;">
              <input type="checkbox" id="checkin-presence-check" ${myMember.checkedIn ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #22c55e;">
              <span>Estou presente no templo / local do culto</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: #fff;">
              <input type="checkbox" id="checkin-tuned-check" ${myMember.isTuned ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #7ee7ff;">
              <span>Instrumento afinado com precisão (ou voz aquecida)</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: #fff;">
              <input type="checkbox" id="checkin-return-check" ${myMember.returnWorking ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #7ee7ff;">
              <span>Retorno de áudio testado e funcionando</span>
            </label>

          </div>

          <div style="display: flex; gap: 10px;">
            <button 
              type="submit" 
              class="button primary" 
              style="flex: 1; padding: 12px; font-size: 14px; font-weight: 700;"
            >
              ${myMember.checkedIn ? "Atualizar Confirmação" : "Confirmar Presença no Culto"}
            </button>
            <button 
              type="button" 
              class="button secondary" 
              style="padding: 12px 14px; font-size: 13px;"
              onclick="show('tuner')"
              title="Abrir Afinador do Virtuo"
            >
              🎯 Afinador
            </button>
          </div>

        </form>
      </section>

      <!-- Painel de Acompanhamento da Equipe (Visível para todos, com gestão para Líder) -->
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
            Status da Equipe Musical (${members.length})
          </h3>
          <span style="font-size: 11px; color: #94a3b8;">
            Acompanhamento em tempo real
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${members.map(m => `
            <div 
              style="
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 10px 14px; 
                border-radius: 8px; 
                background: ${m.checkedIn ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255, 255, 255, 0.02)'};
                border: 1px solid ${m.checkedIn ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
              "
            >
              <div>
                <strong style="font-size: 14px; color: ${DESIGN_TOKENS.colors.white}; display: block;">
                  ${escapeHtml(m.name || "Músico")}
                </strong>
                <span style="font-size: 12px; color: ${DESIGN_TOKENS.colors.textSecondary};">
                  ${escapeHtml(m.instrument || "Instrumento")} • ${escapeHtml(m.role || "Músico")}
                </span>
              </div>

              <!-- Indicadores de status -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <span title="${m.isTuned ? 'Afinado' : 'Não afinado'}" style="font-size: 14px; opacity: ${m.isTuned ? '1' : '0.3'};">
                  🎯
                </span>
                <span title="${m.returnWorking ? 'Retorno OK' : 'Sem retorno'}" style="font-size: 14px; opacity: ${m.returnWorking ? '1' : '0.3'};">
                  🎧
                </span>
                <span 
                  class="pill" 
                  style="
                    background: ${m.checkedIn ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; 
                    color: ${m.checkedIn ? '#22c55e' : '#f87171'}; 
                    font-size: 10px;
                    padding: 4px 8px;
                  "
                >
                  ${m.checkedIn ? 'PRONTO' : 'PENDENTE'}
                </span>
              </div>
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
