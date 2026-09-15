// =============================================================
// VIRTUO COMMUNITY 2.0 MODALS (ETAPA 4/5)
// src/community/community-modals.js
// Diálogos modais elegantes para criação de bandas, ensaios, convites e perfis
// =============================================================

import {
  MUSICAL_INSTRUMENTS,
  EXPERIENCE_LEVELS,
  MUSICAL_STYLES,
  REPORT_REASONS,
  BAND_MEMBER_ROLES
} from "./community-constants.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderCreateBandModal() {
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:440px;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">+ NOVA BANDA</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Criar Banda ou Ministério</h3>
        <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Cadastre seu grupo de louvor para sincronizar repertórios e ensaios.</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Nome da Banda / Ministério *</label>
            <input type="text" id="new-band-name" class="form-input" placeholder="Ex: Ministério Aliança, Banda Som do Céu" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Estilo Principal</label>
              <select id="new-band-style" class="form-input">
                ${MUSICAL_STYLES.map(s => `<option value="${s.name}">${s.icon} ${s.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Seu Instrumento</label>
              <select id="new-band-admin-instrument" class="form-input">
                ${MUSICAL_INSTRUMENTS.map(i => `<option value="${i.id}">${i.icon} ${i.name}</option>`).join("")}
              </select>
            </div>
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Descrição ou Propósito</label>
            <textarea id="new-band-desc" class="form-input" rows="2" placeholder="Ex: Louvor congregacional dos cultos de domingo"></textarea>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" onclick="window.submitCreateBand()">Criar Banda</button>
        </div>
      </div>
    </div>
  `;
}

export function renderInviteMemberModal(band) {
  if (!band) return "";
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:440px;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">CONVITE DE INTEGRANTE</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Convidar Músico para ${escapeHtml(band.name)}</h3>
        <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Envie um convite oficial. O músico precisa aceitar para ingressar.</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Nome ou E-mail do Músico *</label>
            <input type="text" id="invite-member-name" class="form-input" placeholder="Ex: Lucas Rocha, sara@email.com" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Função</label>
              <select id="invite-member-role" class="form-input">
                ${BAND_MEMBER_ROLES.map(r => `<option value="${r.id}">${r.icon} ${r.label}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Instrumento</label>
              <select id="invite-member-instrument" class="form-input">
                ${MUSICAL_INSTRUMENTS.map(i => `<option value="${i.id}">${i.icon} ${i.name}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" onclick="window.submitInviteMember('${band.id}')">Enviar Convite</button>
        </div>
      </div>
    </div>
  `;
}

export function renderAddSongToRepertoireModal(band, availableSongs = []) {
  if (!band) return "";
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:440px;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">+ REPERTÓRIO DA BANDA</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Adicionar Louvor a ${escapeHtml(band.name)}</h3>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Escolher Música do Acervo</label>
            <select id="rep-song-select" class="form-input" onchange="window.handleSongSelectForRep(this.value)">
              <option value="">-- Selecione uma música --</option>
              ${availableSongs.map(s => `<option value="${s.id}" data-title="${escapeHtml(s.title)}" data-artist="${escapeHtml(s.artist)}" data-key="${s.originalKey || s.key}" data-bpm="${s.bpm}">${escapeHtml(s.title)} (${escapeHtml(s.artist)})</option>`).join("")}
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Título</label>
              <input type="text" id="rep-song-title" class="form-input" placeholder="Título da música" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Artista</label>
              <input type="text" id="rep-song-artist" class="form-input" placeholder="Artista / Ministério" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Tom da Banda</label>
              <input type="text" id="rep-song-key" class="form-input" value="G" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">BPM</label>
              <input type="number" id="rep-song-bpm" class="form-input" value="74" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Modo</label>
              <select id="rep-song-mode" class="form-input">
                <option value="original">🎵 Original</option>
                <option value="easy">⚡ Easy Play</option>
              </select>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" onclick="window.submitAddSongToRepertoire('${band.id}')">Adicionar ao Repertório</button>
        </div>
      </div>
    </div>
  `;
}

export function renderCreateRehearsalModal(band) {
  if (!band) return "";
  const today = new Date().toISOString().split("T")[0];
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:460px;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">AGENDAR ENSAIO</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Novo Ensaio Colaborativo</h3>
        <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Todos os integrantes terão acesso ao checklist de presença e repertório.</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Título do Ensaio *</label>
            <input type="text" id="reh-title-input" class="form-input" placeholder="Ex: Ensaio de Sábado - Culto da Família" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Data</label>
              <input type="date" id="reh-date-input" class="form-input" value="${today}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Horário</label>
              <input type="time" id="reh-time-input" class="form-input" value="19:30" />
            </div>
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Local do Ensaio</label>
            <input type="text" id="reh-location-input" class="form-input" placeholder="Ex: Templo Principal, Sala de Música" value="Templo Principal" />
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Observações & Diretrizes</label>
            <textarea id="reh-notes-input" class="form-input" rows="2" placeholder="Ex: Estudar a transição da 2ª música"></textarea>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" onclick="window.submitCreateRehearsal('${band.id}')">Agendar Ensaio</button>
        </div>
      </div>
    </div>
  `;
}

export function renderReportModal(targetType, targetId) {
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:420px; border-color:rgba(239,68,68,0.4);">
        <div class="modal-header">
          <span class="pill" style="border-color:#ef4444; color:#ef4444;">🚩 DENUNCIAR CONTEÚDO</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Denúncia para Moderação</h3>
        <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Nossa equipe audita denúncias para manter a comunidade respeitosa e segura.</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Motivo da Denúncia *</label>
            <select id="report-reason-select" class="form-input">
              ${REPORT_REASONS.map(r => `<option value="${r.id}">${r.label}</option>`).join("")}
            </select>
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Detalhes Adicionais (opcional)</label>
            <textarea id="report-details-input" class="form-input" rows="3" placeholder="Descreva brevemente o problema encontrado..."></textarea>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" style="background:#ef4444; border:none;" onclick="window.submitReport('${targetType}', '${targetId}')">
            Enviar Denúncia
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderEditProfileModal(profile) {
  const currentInstruments = Array.isArray(profile?.instruments) ? profile.instruments : ["violao", "vocal"];
  const currentStyles = Array.isArray(profile?.styles) ? profile.styles : ["worship", "gospel"];

  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:480px; max-height:90vh; overflow-y:auto;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">PERFIL MUSICAL 2.0</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>
        <h3 style="margin-top:10px; font-size:16px; color:#fff;">Editar Perfil Musical</h3>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Nome Artístico / Ministro *</label>
              <input type="text" id="prof-artistic-name" class="form-input" value="${escapeHtml(profile?.artisticName || profile?.displayName || '')}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Nível Musical</label>
              <select id="prof-level-select" class="form-input">
                ${EXPERIENCE_LEVELS.map(lvl => `<option value="${lvl.id}" ${profile?.level === lvl.id ? 'selected' : ''}>${lvl.icon} ${lvl.label}</option>`).join("")}
              </select>
            </div>
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">URL da Foto de Perfil</label>
            <input type="url" id="prof-photo-url" class="form-input" value="${escapeHtml(profile?.photoURL || '')}" placeholder="https://..." />
          </div>

          <div>
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Bio Musical</label>
            <textarea id="prof-bio-text" class="form-input" rows="2">${escapeHtml(profile?.bio || '')}</textarea>
          </div>

          <!-- Instrumentos (Múltipla Escolha) -->
          <div>
            <label style="font-size:11px; color:#7EE7FF; display:block; margin-bottom:4px;">Instrumentos que Toca:</label>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${MUSICAL_INSTRUMENTS.map(inst => {
                const isSelected = currentInstruments.includes(inst.id);
                return `
                  <button 
                    type="button" 
                    class="tag-btn inst-toggle-btn ${isSelected ? 'active' : ''}" 
                    data-id="${inst.id}" 
                    onclick="this.classList.toggle('active')"
                    style="font-size:11px; padding:4px 8px;"
                  >
                    ${inst.icon} ${inst.name}
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Estilos Musicais (Múltipla Escolha) -->
          <div>
            <label style="font-size:11px; color:#7EE7FF; display:block; margin-bottom:4px;">Estilos que Toca / Ministra:</label>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${MUSICAL_STYLES.map(st => {
                const isSelected = currentStyles.includes(st.id);
                return `
                  <button 
                    type="button" 
                    class="tag-btn style-toggle-btn ${isSelected ? 'active' : ''}" 
                    data-id="${st.id}" 
                    onclick="this.classList.toggle('active')"
                    style="font-size:11px; padding:4px 8px;"
                  >
                    ${st.icon} ${st.name}
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Cidade / Região</label>
              <input type="text" id="prof-location" class="form-input" value="${escapeHtml(profile?.location || '')}" placeholder="Ex: Curitiba, PR" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Banda / Ministério Atual</label>
              <input type="text" id="prof-band" class="form-input" value="${escapeHtml(profile?.currentBand || '')}" placeholder="Ex: Ministério Aliança" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <div>
              <label style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Instagram</label>
              <input type="text" id="prof-link-ig" class="form-input" style="font-size:11px;" value="${escapeHtml(profile?.externalLinks?.instagram || '')}" placeholder="@usuario" />
            </div>
            <div>
              <label style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">YouTube</label>
              <input type="text" id="prof-link-yt" class="form-input" style="font-size:11px;" value="${escapeHtml(profile?.externalLinks?.youtube || '')}" placeholder="Canal / Vídeo" />
            </div>
            <div>
              <label style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Spotify</label>
              <input type="text" id="prof-link-sp" class="form-input" style="font-size:11px;" value="${escapeHtml(profile?.externalLinks?.spotify || '')}" placeholder="Artista" />
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="button secondary" onclick="window.closeCommunityModals()">Cancelar</button>
          <button type="button" class="button primary" onclick="window.submitEditProfile()">Salvar Perfil 2.0</button>
        </div>
      </div>
    </div>
  `;
}

export function renderUserProfileModal(publicProfile, isFollowing = false) {
  if (!publicProfile) return "";
  return `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target===this) window.closeCommunityModals()">
      <div class="rehearsal-modal-card" style="max-width:440px; text-align:center;">
        <div class="modal-header">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">PERFIL PÚBLICO</span>
          <button type="button" class="modal-close-btn" onclick="window.closeCommunityModals()">✕</button>
        </div>

        <div style="width:64px; height:64px; border-radius:50%; margin:10px auto; background:linear-gradient(135deg, #7EE7FF, #6366f1); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; color:#030712; overflow:hidden;">
          ${publicProfile.photoURL ? `<img src="${escapeHtml(publicProfile.photoURL)}" style="width:100%;height:100%;object-fit:cover;" />` : (publicProfile.artisticName || "M").charAt(0)}
        </div>

        <h3 style="font-size:16px; color:#fff;">${escapeHtml(publicProfile.artisticName || publicProfile.displayName)}</h3>
        <p style="font-size:12px; color:#7EE7FF; margin-top:2px;">${(publicProfile.level || 'Músico').toUpperCase()} • ${escapeHtml(publicProfile.currentBand || 'Solo')}</p>

        <p style="font-size:12px; color:#cbd5e1; margin:8px 0; line-height:1.4;">${escapeHtml(publicProfile.bio || 'Músico participante da comunidade Virtuo.')}</p>

        <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin:10px 0;">
          ${(publicProfile.instruments || []).map(i => `<span class="pill" style="font-size:10px;">🎵 ${i}</span>`).join("")}
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin:14px 0;">
          <div class="tile" style="padding:8px;">
            <strong style="font-size:14px; color:#7EE7FF;">${publicProfile.stats?.songsStudied || 0}</strong>
            <span style="font-size:9px; color:#94a3b8; display:block;">Músicas</span>
          </div>
          <div class="tile" style="padding:8px;">
            <strong style="font-size:14px; color:#7EE7FF;">${publicProfile.stats?.rehearsalsCompleted || 0}</strong>
            <span style="font-size:9px; color:#94a3b8; display:block;">Ensaios</span>
          </div>
          <div class="tile" style="padding:8px;">
            <strong style="font-size:14px; color:#fbbf24;">${publicProfile.reputationScore || 100}</strong>
            <span style="font-size:9px; color:#94a3b8; display:block;">Reputação</span>
          </div>
        </div>

        <div style="display:flex; justify-content:center; gap:8px; margin-top:14px;">
          <button 
            class="button primary" 
            style="padding:6px 16px; font-size:12px; ${isFollowing ? 'background:#374151; border-color:#4b5563;' : ''}" 
            onclick="window.toggleFollowUser('${publicProfile.uid}')"
          >
            ${isFollowing ? '✓ Seguindo' : '+ Seguir Músico'}
          </button>
          <button class="button secondary" style="padding:6px 14px; font-size:12px;" onclick="window.shareProfileLink('${publicProfile.uid}')">
            ↗ Compartilhar
          </button>
        </div>
      </div>
    </div>
  `;
}
