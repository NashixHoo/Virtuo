// =============================================================
// VIRTUO REHEARSAL VIEW
// src/features/rehearsal/rehearsal-view.js
// Interface e templates com design Apple-Class / Celestial
// =============================================================

import { CANONICAL_INSTRUMENTS, REHEARSAL_STATUSES } from "../../services/rehearsals.js";
import { calculateKey } from "../../music/index.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renderiza o checklist de status da música com badge celestial.
 */
function renderStatusBadge(status, index) {
  if (status === REHEARSAL_STATUSES.REHEARSED) {
    return `
      <button class="rehearsal-status-chip status-rehearsed" onclick="window.virtuoRehearsalController.cycleSongStatus(${index})" title="Clique para alterar status">
        <span class="status-icon">✓</span>
        <span>Ensaiada</span>
      </button>
    `;
  }
  if (status === REHEARSAL_STATUSES.IN_PROGRESS) {
    return `
      <button class="rehearsal-status-chip status-in-progress" onclick="window.virtuoRehearsalController.cycleSongStatus(${index})" title="Clique para alterar status">
        <span class="status-icon">◐</span>
        <span>Em ensaio</span>
      </button>
    `;
  }
  return `
    <button class="rehearsal-status-chip status-not-rehearsed" onclick="window.virtuoRehearsalController.cycleSongStatus(${index})" title="Clique para alterar status">
      <span class="status-icon">○</span>
      <span>Não ensaiada</span>
    </button>
  `;
}

/**
 * Renderiza a visualização do ensaio ativo ou da lista de ensaios.
 */
export function renderRehearsalScreen(controller) {
  const active = controller.getActiveRehearsal();

  // Se não houver ensaio selecionado, renderiza a lista de ensaios
  if (!active) {
    return renderRehearsalsList(controller);
  }

  // Cálculos de progresso
  const songs = active.songs || [];
  const totalSongs = songs.length;
  const rehearsedCount = songs.filter(s => s.status === REHEARSAL_STATUSES.REHEARSED).length;
  const inProgressCount = songs.filter(s => s.status === REHEARSAL_STATUSES.IN_PROGRESS).length;
  const progressPercent = totalSongs > 0 ? Math.round((rehearsedCount / totalSongs) * 100) : 0;

  // Renderização dos instrumentos selecionados
  const activeInstruments = Array.isArray(active.instruments) ? active.instruments : [];
  const instrumentsHtml = CANONICAL_INSTRUMENTS.map(inst => {
    const isSelected = activeInstruments.includes(inst.id);
    return `
      <button 
        type="button"
        class="rehearsal-inst-btn ${isSelected ? 'active' : ''}" 
        onclick="window.virtuoRehearsalController.toggleInstrument('${inst.id}')"
        title="${isSelected ? 'Remover instrumento do ensaio' : 'Adicionar instrumento ao ensaio'}">
        <span class="inst-icon">${inst.icon}</span>
        <span class="inst-label">${inst.name}</span>
      </button>
    `;
  }).join("");

  // Renderização das músicas do ensaio
  let songsListHtml = "";
  if (songs.length === 0) {
    songsListHtml = `
      <div class="rehearsal-empty-state">
        <div class="empty-icon">🎼</div>
        <h3>Nenhuma música adicionada ainda</h3>
        <p>Monte o repertório do seu ensaio adicionando louvores do acervo.</p>
        <button class="button primary" onclick="window.virtuoRehearsalController.openAddSongModal()" style="margin-top:12px;">
          + Adicionar Primeira Música
        </button>
      </div>
    `;
  } else {
    songsListHtml = songs.map((item, index) => {
      const originalSong = controller.songsMap.get(item.songId) || {
        title: "Música do Repertório",
        artist: "Virtuo Worship",
        originalKey: "G",
        bpm: 74
      };

      const originalKey = originalSong.originalKey || "G";
      const keyOffset = item.keyOffset || 0;
      const bandKey = calculateKey(originalKey, keyOffset);
      const isTransposed = keyOffset !== 0;

      const itemBpm = item.bpm || originalSong.bpm || 74;
      const isCustomBpm = originalSong.bpm && itemBpm !== originalSong.bpm;
      const isEasy = item.playMode === "easy";

      return `
        <div class="rehearsal-song-card ${item.status === REHEARSAL_STATUSES.REHEARSED ? 'is-done' : ''}" id="rehearsal-song-${index}">
          <!-- Cabeçalho do Card: Ordem, Título, Artista e Status -->
          <div class="rehearsal-card-header">
            <div class="rehearsal-card-title-group">
              <span class="rehearsal-order-badge">${item.order || (index + 1)}</span>
              <div>
                <h4 class="rehearsal-song-title">${escapeHtml(originalSong.title)}</h4>
                <p class="rehearsal-song-artist">${escapeHtml(originalSong.artist || "Virtuo Worship")}</p>
              </div>
            </div>
            <div class="rehearsal-card-status-col">
              ${renderStatusBadge(item.status, index)}
            </div>
          </div>

          <!-- Controles Musicais: Tom da Banda, BPM, Versão -->
          <div class="rehearsal-controls-strip">
            <!-- Bloco 1: Tom da Banda (sem alterar originalKey) -->
            <div class="rehearsal-control-group">
              <span class="rehearsal-ctl-label">Tom da Banda</span>
              <div class="rehearsal-stepper">
                <button type="button" class="stepper-btn" onclick="window.virtuoRehearsalController.updateSongKeyOffset(${index}, -1)" title="Diminuir 1 semitom">-</button>
                <div class="stepper-display ${isTransposed ? 'transposed' : ''}">
                  <strong>${bandKey}</strong>
                  ${isTransposed ? `<small>(${keyOffset > 0 ? '+' : ''}${keyOffset})</small>` : ''}
                </div>
                <button type="button" class="stepper-btn" onclick="window.virtuoRehearsalController.updateSongKeyOffset(${index}, 1)" title="Aumentar 1 semitom">+</button>
                ${isTransposed ? `
                  <button type="button" class="reset-mini-btn" onclick="window.virtuoRehearsalController.resetSongKey(${index})" title="Restaurar tom original (${originalKey})">Original</button>
                ` : ''}
              </div>
            </div>

            <!-- Bloco 2: BPM da Banda (sem alterar BPM original) -->
            <div class="rehearsal-control-group">
              <span class="rehearsal-ctl-label">BPM</span>
              <div class="rehearsal-stepper">
                <button type="button" class="stepper-btn" onclick="window.virtuoRehearsalController.updateSongBpm(${index}, -1)" title="Diminuir BPM">-</button>
                <div class="stepper-display ${isCustomBpm ? 'transposed' : ''}">
                  <strong>${itemBpm}</strong>
                </div>
                <button type="button" class="stepper-btn" onclick="window.virtuoRehearsalController.updateSongBpm(${index}, 1)" title="Aumentar BPM">+</button>
                ${isCustomBpm ? `
                  <button type="button" class="reset-mini-btn" onclick="window.virtuoRehearsalController.resetSongBpm(${index})" title="Restaurar BPM original (${originalSong.bpm})">Orig (${originalSong.bpm})</button>
                ` : ''}
              </div>
            </div>

            <!-- Bloco 3: Alternância Original vs Easy Play -->
            <div class="rehearsal-control-group">
              <span class="rehearsal-ctl-label">Versão</span>
              <div class="rehearsal-version-segmented">
                <button 
                  type="button" 
                  class="version-seg-btn ${!isEasy ? 'active' : ''}" 
                  onclick="if (${isEasy}) window.virtuoRehearsalController.toggleSongPlayMode(${index})">
                  Original
                </button>
                <button 
                  type="button" 
                  class="version-seg-btn ${isEasy ? 'active' : ''}" 
                  onclick="if (!${isEasy}) window.virtuoRehearsalController.toggleSongPlayMode(${index})">
                  Easy Play
                </button>
              </div>
            </div>
          </div>

          <!-- Barra de Ações Rápidas: Modo Ministro, Metrônomo, Reordenar, Excluir -->
          <div class="rehearsal-card-actions">
            <button 
              type="button"
              class="rehearsal-action-btn primary-action" 
              onclick="window.virtuoRehearsalController.openInMinisterMode(${index})"
              title="Abrir no Modo Ministro com o tom e BPM deste ensaio">
              🎤 Modo Ministro
            </button>

            <button 
              type="button"
              class="rehearsal-action-btn" 
              onclick="window.virtuoRehearsalController.triggerMetronomeForSong(${index})"
              title="Iniciar metrônomo nativo no andamento da música">
              🥁 Metrônomo (${itemBpm})
            </button>

            <div class="rehearsal-order-arrows">
              <button 
                type="button"
                class="arrow-btn" 
                ${index === 0 ? 'disabled' : ''} 
                onclick="window.virtuoRehearsalController.moveSongOrder(${index}, ${index - 1})"
                title="Subir posição no repertório">
                ▲
              </button>
              <button 
                type="button"
                class="arrow-btn" 
                ${index === songs.length - 1 ? 'disabled' : ''} 
                onclick="window.virtuoRehearsalController.moveSongOrder(${index}, ${index + 1})"
                title="Descer posição no repertório">
                ▼
              </button>
            </div>

            <button 
              type="button"
              class="rehearsal-delete-btn" 
              onclick="window.virtuoRehearsalController.removeSongFromRehearsal(${index})"
              title="Remover música deste ensaio">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Modal de Adicionar Música
  const addSongModalHtml = controller.isAddSongModalOpen ? `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target === this) window.virtuoRehearsalController.closeAddSongModal()">
      <div class="rehearsal-modal-card">
        <div class="modal-header">
          <h3>Adicionar Música ao Ensaio</h3>
          <button type="button" class="modal-close-btn" onclick="window.virtuoRehearsalController.closeAddSongModal()">✕</button>
        </div>
        <p class="modal-subtitle">Selecione uma música do acervo Virtuo para incluir na sessão.</p>

        <div class="modal-song-picker-list">
          ${controller.allSongsList.map(song => {
            const alreadyAdded = songs.some(s => s.songId === song.id);
            return `
              <div class="picker-song-item ${alreadyAdded ? 'already-added' : ''}">
                <div class="picker-song-info">
                  <strong>${escapeHtml(song.title)}</strong>
                  <span>${escapeHtml(song.artist || "Virtuo Worship")} • Tom ${escapeHtml(song.originalKey || "G")} • ${song.bpm || 74} BPM</span>
                </div>
                <button 
                  type="button"
                  class="picker-add-btn" 
                  onclick="window.virtuoRehearsalController.addSongToRehearsal('${song.id}')">
                  ${alreadyAdded ? '+ Adicionar Novamente' : '+ Adicionar'}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  ` : "";

  // Modal de Novo Ensaio
  const createModalHtml = controller.isCreateModalOpen ? `
    <div class="rehearsal-modal-backdrop" onclick="if(event.target === this) window.virtuoRehearsalController.closeCreateModal()">
      <div class="rehearsal-modal-card">
        <div class="modal-header">
          <h3>+ Novo Ensaio</h3>
          <button type="button" class="modal-close-btn" onclick="window.virtuoRehearsalController.closeCreateModal()">✕</button>
        </div>
        <form onsubmit="window.handleCreateRehearsalSubmit(event)">
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Nome do Ensaio</label>
            <input type="text" id="rehearsal-new-name" required placeholder="Ex: Ensaio - Culto de Domingo" class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;" />
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Data</label>
            <input type="date" id="rehearsal-new-date" value="${new Date().toISOString().slice(0, 10)}" class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;" />
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Descrição (opcional)</label>
            <textarea id="rehearsal-new-desc" rows="2" placeholder="Observações do ensaio, arranjos ou membros..." class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" class="button secondary" onclick="window.virtuoRehearsalController.closeCreateModal()">Cancelar</button>
            <button type="submit" class="button primary">Criar Ensaio</button>
          </div>
        </form>
      </div>
    </div>
  ` : "";

  return `
    <section class="glass rehearsal-main-view">
      <!-- Barra Superior do Ensaio Ativo -->
      <div class="rehearsal-top-bar">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button type="button" class="tag-btn" onclick="window.virtuoRehearsalController.backToList()" title="Ver todos os ensaios">
            ← Meus Ensaios
          </button>
          <span class="pill">SESSÃO DE ENSAIO</span>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="button primary" style="padding:6px 14px; font-size:12px; display:inline-flex; align-items:center; gap:6px; background:#7EE7FF; color:#07101F; font-weight:700;" onclick="window.virtuoRehearsalController.toggleAnalysis()" title="Análise harmônica, andamento e transições da sessão">
            <span>⚡</span>
            <span>${controller.isAnalysisOpen ? 'Fechar Análise' : 'Preparar Ensaio'}</span>
          </button>
          <button type="button" class="tag-btn" style="color:#25D366; border-color:rgba(37,211,102,0.4);" onclick="window.shareRepertoireWhatsApp()" title="Compartilhar repertório do ensaio no WhatsApp">
            💬 WhatsApp
          </button>
          <button type="button" class="tag-btn" onclick="window.virtuoRehearsalController.openCreateModal()">
            + Novo Ensaio
          </button>
          <button type="button" class="tag-btn" style="color:#ef4444;" onclick="if(confirm('Deseja excluir este ensaio?')) window.virtuoRehearsalController.deleteActiveRehearsal()">
            Excluir
          </button>
        </div>
      </div>

      <!-- PAINEL DE ANÁLISE INTELIGENTE DO ENSAIO (LOCAL-FIRST) -->
      ${controller.isAnalysisOpen && controller.rehearsalAnalysis ? `
        <div class="rehearsal-analysis-card" style="margin:16px 0; padding:18px; background:rgba(126,231,255,0.04); border:1px solid rgba(126,231,255,0.25); border-radius:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pill" style="background:rgba(126,231,255,0.15); color:#7EE7FF; border-color:#7EE7FF;">ANÁLISE INTELIGENTE DO REPERTÓRIO</span>
              <strong style="font-size:14px; color:#ffffff;">Diagnóstico Harmônico da Sessão</strong>
            </div>
            <span style="font-size:11px; color:#94a3b8;">${controller.rehearsalAnalysis.timestamp}</span>
          </div>

          <!-- Métricas Chave do Ensaio: BPM Médio e Distribuição -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:14px;">
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">BPM Médio</span>
              <strong style="font-size:18px; color:#7EE7FF;">${controller.rehearsalAnalysis.avgBpm} <small style="font-size:11px; color:#94a3b8;">BPM</small></strong>
            </div>
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Lentas (<68)</span>
              <strong style="font-size:16px; color:#ffffff;">${controller.rehearsalAnalysis.tempoDistribution.lentas} músicas</strong>
            </div>
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Médias (68-95)</span>
              <strong style="font-size:16px; color:#ffffff;">${controller.rehearsalAnalysis.tempoDistribution.medias} músicas</strong>
            </div>
            <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:12px;">
              <span style="font-size:11px; color:#94a3b8; display:block;">Rápidas (>95)</span>
              <strong style="font-size:16px; color:#ffffff;">${controller.rehearsalAnalysis.tempoDistribution.rapidas} músicas</strong>
            </div>
          </div>

          <!-- Alertas de Transição de Tom entre Músicas -->
          <div style="margin-bottom:14px; padding:12px; background:rgba(0,0,0,0.2); border-radius:14px;">
            <span style="font-size:12px; color:#7EE7FF; font-weight:700; display:block; margin-bottom:8px;">
              Transições de Tonalidade Consecutivas:
            </span>
            ${controller.rehearsalAnalysis.transitions.length === 0 ? `
              <span style="font-size:12px; color:#94a3b8;">Adicione pelo menos 2 músicas para analisar transições harmônicas.</span>
            ` : controller.rehearsalAnalysis.transitions.map((tr, tIdx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px; flex-wrap:wrap; gap:6px;">
                <div>
                  <strong style="color:#ffffff;">#${tIdx + 1} ${tr.from} (${tr.fromKey}) ➔ #${tIdx + 2} ${tr.to} (${tr.toKey})</strong>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${tr.tip}</div>
                </div>
                <span class="pill" style="font-size:10px; padding:2px 8px; ${tr.distance === 6 ? 'background:rgba(239,68,68,0.2); color:#f87171; border-color:#ef4444;' : 'background:rgba(16,185,129,0.15); color:#34d399; border-color:#10b981;'}">
                  ${tr.type}
                </span>
              </div>
            `).join("")}
          </div>

          <!-- Sugestões de Capo para Violão -->
          <div>
            <span style="font-size:12px; color:#7EE7FF; font-weight:700; display:block; margin-bottom:6px;">
              Sugestão de Capo para Violonistas no Repertório:
            </span>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${controller.rehearsalAnalysis.songs.map(s => `
                <div style="padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:8px; font-size:11px; border:1px solid rgba(255,255,255,0.06);">
                  <strong style="color:#ffffff;">${s.title}:</strong>
                  <span style="color:#94a3b8;"> Tom ${s.key}</span> ➔ 
                  <span style="color:${s.capoInfo.capoFret > 0 ? '#7EE7FF' : '#94a3b8'};">
                    ${s.capoInfo.capoFret > 0 ? `Capo ${s.capoInfo.capoFret}ª casa (forma ${s.capoInfo.shapeKey})` : 'Sem Capo'}
                  </span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Título, Data e Descrição -->
      <div class="rehearsal-hero">
        <h2 class="hero-title">${escapeHtml(active.name || "Ensaio Musical")}</h2>
        <div class="rehearsal-meta">
          <span>📅 ${escapeHtml(active.date || "Data a definir")}</span>
          ${active.description ? `<span>• ${escapeHtml(active.description)}</span>` : ''}
        </div>
      </div>

      <!-- Barra de Progresso do Ensaio -->
      <div class="rehearsal-progress-container">
        <div class="rehearsal-progress-header">
          <span class="progress-title">Progresso do Ensaio</span>
          <span class="progress-count">${rehearsedCount} de ${totalSongs} músicas ensaiadas (${progressPercent}%)</span>
        </div>
        <div class="rehearsal-progress-bar">
          <div class="rehearsal-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <!-- Área de Instrumentos Presentes -->
      <div class="rehearsal-instruments-section">
        <div class="section-title-strip">
          <span class="strip-label">INSTRUMENTOS PRESENTES NO ENSAIO</span>
          <small class="strip-hint">Clique para marcar a formação da banda hoje</small>
        </div>
        <div class="rehearsal-instruments-grid">
          ${instrumentsHtml}
        </div>
      </div>

      <!-- Seção do Repertório de Músicas -->
      <div class="rehearsal-repertoire-section">
        <div class="section-title-strip">
          <span class="strip-label">REPERTÓRIO (${totalSongs} ${totalSongs === 1 ? 'MÚSICA' : 'MÚSICAS'})</span>
          <button type="button" class="tag-btn highlight" onclick="window.virtuoRehearsalController.openAddSongModal()">
            + Adicionar Música
          </button>
        </div>

        <div class="rehearsal-songs-stack">
          ${songsListHtml}
        </div>
      </div>
    </section>

    ${addSongModalHtml}
    ${createModalHtml}
  `;
}

/**
 * Renderiza a lista de ensaios salvos quando nenhum estiver aberto.
 */
function renderRehearsalsList(controller) {
  const list = controller.rehearsals || [];

  return `
    <section class="glass rehearsal-list-view">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span class="pill">VIRTUO BAND</span>
          <h2 style="margin-top:6px;">Ensaios da Banda</h2>
          <p class="subtitle">Organize setlists, defina os tons e ensaie com a equipe.</p>
        </div>
        <button type="button" class="button primary" onclick="window.virtuoRehearsalController.openCreateModal()">
          + Novo Ensaio
        </button>
      </div>

      <div class="rehearsals-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-top:20px;">
        ${list.map(rehearsal => {
          const songs = rehearsal.songs || [];
          const rehearsed = songs.filter(s => s.status === REHEARSAL_STATUSES.REHEARSED).length;
          const total = songs.length;
          const percent = total > 0 ? Math.round((rehearsed / total) * 100) : 0;

          return `
            <div class="rehearsal-index-card" onclick="window.virtuoRehearsalController.openRehearsal('${rehearsal.id}')" style="cursor:pointer;">
              <div class="index-card-header">
                <span class="index-card-icon">🎸</span>
                <span class="index-card-date">${escapeHtml(rehearsal.date || "Hoje")}</span>
              </div>
              <h3 class="index-card-title">${escapeHtml(rehearsal.name || "Ensaio")}</h3>
              <p class="index-card-desc">${escapeHtml(rehearsal.description || "Sessão oficial de ensaio.")}</p>

              <div class="index-card-stats">
                <span>${total} ${total === 1 ? 'música' : 'músicas'}</span>
                <span>•</span>
                <span>${rehearsed}/${total} ensaiadas (${percent}%)</span>
              </div>

              <div class="rehearsal-mini-progress">
                <div class="rehearsal-mini-progress-fill" style="width:${percent}%;"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>

    ${controller.isCreateModalOpen ? `
      <div class="rehearsal-modal-backdrop" onclick="if(event.target === this) window.virtuoRehearsalController.closeCreateModal()">
        <div class="rehearsal-modal-card">
          <div class="modal-header">
            <h3>+ Novo Ensaio</h3>
            <button type="button" class="modal-close-btn" onclick="window.virtuoRehearsalController.closeCreateModal()">✕</button>
          </div>
          <form onsubmit="window.handleCreateRehearsalSubmit(event)">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Nome do Ensaio</label>
              <input type="text" id="rehearsal-new-name" required placeholder="Ex: Ensaio - Culto de Domingo" class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;" />
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Data</label>
              <input type="date" id="rehearsal-new-date" value="${new Date().toISOString().slice(0, 10)}" class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;" />
            </div>

            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#94a3b8;">Descrição (opcional)</label>
              <textarea id="rehearsal-new-desc" rows="2" placeholder="Observações do ensaio, arranjos ou membros..." class="form-input" style="width:100%; padding:10px 14px; border-radius:10px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:14px;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button type="button" class="button secondary" onclick="window.virtuoRehearsalController.closeCreateModal()">Cancelar</button>
              <button type="submit" class="button primary">Criar Ensaio</button>
            </div>
          </form>
        </div>
      </div>
    ` : ""}
  `;
}
