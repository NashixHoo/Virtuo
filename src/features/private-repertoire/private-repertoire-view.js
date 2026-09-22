// =============================================================
// VIRTUO PRIVATE BAND REPERTOIRE VIEW COMPONENT
// src/features/private-repertoire/private-repertoire-view.js
// Interface Premium e Isolada para o Repertório Privado da Banda
// =============================================================

import { escapeHtml } from "../../music/utils.js";
import { calculateKey } from "../../music/transposer.js";

/**
 * Renderiza a divisão de abas na tela de Biblioteca
 */
export function renderLibraryDivisionNav(activeDivision = "public", privateSongsCount = 0) {
  const isPub = activeDivision === "public";
  const isPriv = activeDivision === "private";

  return `
    <div class="library-division-nav" style="display:flex; gap:10px; margin-bottom:18px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px; flex-wrap:wrap;">
      <button 
        type="button"
        id="btn-lib-public"
        class="tag-btn ${isPub ? 'active' : ''}" 
        style="padding:10px 20px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:8px; border-radius:14px; transition:all 0.15s ease; ${isPub ? 'background:rgba(126,231,255,0.14); border-color:#7EE7FF; color:#7EE7FF; box-shadow:0 0 16px rgba(126,231,255,0.12);' : 'color:#94a3b8; background:transparent;'}"
        onclick="window.setLibraryDivision('public')"
      >
        <span style="font-size:16px;">🎵</span> Biblioteca VIRTUO
      </button>

      <button 
        type="button"
        id="btn-lib-private"
        class="tag-btn ${isPriv ? 'active' : ''}" 
        style="padding:10px 20px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:8px; border-radius:14px; transition:all 0.15s ease; ${isPriv ? 'background:rgba(14,27,53,0.9); border-color:#7EE7FF; color:#F8FAFC; box-shadow:0 0 16px rgba(126,231,255,0.15);' : 'color:#94a3b8; background:transparent;'}"
        onclick="window.setLibraryDivision('private')"
      >
        <span style="font-size:16px;">🔒</span> Repertório Privado da Banda
        <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(245,197,66,0.16); color:#F5C542; border:1px solid rgba(245,197,66,0.35); font-weight:700;">
          PRIVADO
        </span>
        ${privateSongsCount > 0 ? `
          <span class="pill" style="font-size:10px; padding:2px 6px; background:rgba(126,231,255,0.12); color:#7EE7FF; border:1px solid rgba(126,231,255,0.25);">
            ${privateSongsCount}
          </span>
        ` : ''}
      </button>
    </div>
  `;
}

/**
 * Renderiza a tela principal do Repertório Privado da Banda
 */
export function renderPrivateRepertoireSection({
  songs = [],
  filteredSongs = [],
  searchQuery = "",
  categoryFilter = "todos",
  activeBand = null,
  isAuthorized = true,
  currentUser = null,
  isOwnerOrLeader = true
}) {
  if (!isAuthorized) {
    return `
      <section class="glass" style="background:rgba(7,16,31,0.95); border:1px solid rgba(239,68,68,0.25); border-radius:20px; padding:32px; text-align:center;">
        <div style="font-size:40px; margin-bottom:12px;">🔒</div>
        <h2 style="color:#F8FAFC; font-size:20px; margin-bottom:8px;">Acesso Restrito ao Repertório Privado</h2>
        <p style="color:#94a3b8; max-width:480px; margin:0 auto 20px; font-size:14px; line-height:1.5;">
          Este repertório pertence exclusivamente ao espaço particular da banda e está disponível apenas para membros e administradores autorizados.
        </p>
        <button class="button secondary" onclick="window.setLibraryDivision('public')">
          ← Voltar para Biblioteca Pública
        </button>
      </section>
    `;
  }

  const bandName = activeBand ? activeBand.name : "Ministério Aliança";

  // Filtros de Categoria (Requirement 8)
  const filterBtns = [
    { id: "todos", label: "Todos" },
    { id: "privado", label: "Repertório Privado" },
    { id: "harpa-crista", label: "Harpa Cristã" },
    { id: "outros", label: "Outros repertórios privados" }
  ].map(f => `
    <button 
      type="button"
      class="tag-btn ${categoryFilter === f.id ? 'active' : ''}" 
      style="padding:6px 14px; font-size:11px; border-radius:10px; ${categoryFilter === f.id ? 'background:rgba(126,231,255,0.18); border-color:#7EE7FF; color:#7EE7FF; font-weight:700;' : 'color:#94a3b8; background:transparent;'}"
      onclick="window.setPrivateFilterCategory('${f.id}')"
    >
      ${f.label}
    </button>
  `).join("");

  // Cards do Repertório Privado (Requirement 9)
  const cardsHtml = filteredSongs.length === 0 ? `
    <div style="grid-column: 1 / -1; text-align:center; padding:36px 16px; background:rgba(14,27,53,0.5); border:1px dashed rgba(126,231,255,0.2); border-radius:20px;">
      <div style="font-size:36px; margin-bottom:12px;">📖</div>
      <h3 style="color:#F8FAFC; margin-bottom:6px; font-size:17px;">
        ${searchQuery ? `Nenhum resultado para "${escapeHtml(searchQuery)}"` : 'Repertório privado pronto para uso'}
      </h3>
      <p style="color:#94a3b8; max-width:480px; margin:0 auto 18px; font-size:13px; line-height:1.5;">
        ${searchQuery 
          ? 'Tente pesquisar por número do hino, título, tom (ex: G), BPM ou nível de dificuldade.' 
          : 'Cadastre os hinos e louvores da sua banda ou importe arquivos JSON/CSV em lote para ensaios internos.'}
      </p>
      <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
        ${searchQuery ? `
          <button class="button secondary" onclick="window.handlePrivateSearch('')">Limpar Busca</button>
        ` : `
          <button class="button primary" onclick="window.openAddPrivateSongModal()">+ Novo Louvor Privado</button>
          <button class="button secondary" onclick="window.openImportPrivateModal()">📥 Importar em Lote</button>
          <button class="button secondary" onclick="window.seedSamplePrivateHymn()">Carregar Exemplo de Hino</button>
        `}
      </div>
    </div>
  ` : filteredSongs.map(song => `
    <div 
      class="tile private-song-card" 
      onclick="window.openPrivateSongById('${song.id}')"
      style="cursor:pointer; background:linear-gradient(145deg, #0E1B35 0%, #07101F 100%); border:1px solid rgba(126,231,255,0.18); border-radius:16px; padding:16px; transition:transform 0.12s ease, border-color 0.12s ease; position:relative; box-shadow:0 4px 18px rgba(0,0,0,0.35);"
      onmouseenter="this.style.transform='translateY(-2px)'; this.style.borderColor='#7EE7FF';"
      onmouseleave="this.style.transform='none'; this.style.borderColor='rgba(126,231,255,0.18)';"
    >
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          ${song.hymnNumber ? `
            <span class="pill" style="background:rgba(126,231,255,0.12); color:#7EE7FF; border:1px solid rgba(126,231,255,0.3); font-weight:700; font-size:11px; padding:2px 8px;">
              Hino ${escapeHtml(song.hymnNumber)}
            </span>
          ` : `
            <span class="pill" style="background:rgba(255,255,255,0.06); color:#F8FAFC; font-size:11px; padding:2px 8px;">
              🎵 Louvor
            </span>
          `}
          <span class="pill" style="font-size:10px; padding:2px 6px; background:rgba(245,197,66,0.14); color:#F5C542; border:1px solid rgba(245,197,66,0.3); font-weight:700;">
            🔒 PRIVADO
          </span>
        </div>
        <span style="font-size:12px; color:#7EE7FF; font-weight:700; background:rgba(126,231,255,0.08); padding:3px 8px; border-radius:8px;">
          Tom ${escapeHtml(song.originalKey || song.key || "G")}
        </span>
      </div>

      <h3 style="margin:8px 0 6px 0; color:#F8FAFC; font-size:16px; font-weight:700; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${escapeHtml(song.title)}
      </h3>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:11px; color:#94a3b8; flex-wrap:wrap; gap:6px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
        <span>⏱️ ${song.bpm || 74} BPM • ${escapeHtml(song.difficulty || "Fácil")}</span>
        <span style="color:#7EE7FF; font-size:10px; font-weight:600; background:rgba(126,231,255,0.08); padding:2px 6px; border-radius:6px;">
          Original / Easy Play
        </span>
      </div>
    </div>
  `).join("");

  return `
    <section class="glass" style="background:rgba(7,16,31,0.88); border:1px solid rgba(126,231,255,0.15); border-radius:22px; padding:24px;">
      <!-- Header do Repertório Privado (Requirement 9) -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="pill" style="font-size:10px; padding:3px 10px; background:rgba(245,197,66,0.14); color:#F5C542; border:1px solid rgba(245,197,66,0.35); font-weight:700; letter-spacing:0.5px;">
              🔒 REPERTÓRIO DA BANDA • PRIVADO
            </span>
            <span class="pill" style="font-size:10px; padding:3px 8px; background:rgba(126,231,255,0.1); color:#7EE7FF; border:1px solid rgba(126,231,255,0.25);">
              ${bandName}
            </span>
            <span class="pill" style="font-size:10px; padding:3px 8px; background:rgba(16,185,129,0.12); color:#6ee7b7; border:1px solid rgba(16,185,129,0.3);">
              ⚡ ${songs.length} DISPONÍVEIS
            </span>
          </div>
          <h2 style="font-size:22px; font-weight:800; color:#F8FAFC; margin:6px 0 2px 0;">Repertório da Banda</h2>
          <p class="subtitle" style="color:#94a3b8; font-size:13px; margin:0;">
            Seu repertório de ensaio, sempre à mão.
          </p>
        </div>

        <!-- Ações do Cabeçalho -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button 
            type="button" 
            class="button secondary" 
            style="padding:8px 14px; font-size:11px; display:inline-flex; align-items:center; gap:6px;"
            onclick="window.exportPrivateRepertoireJson()"
            title="Exportar backup completo do repertório privado em JSON"
          >
            📤 Exportar Backup
          </button>
          <button 
            type="button" 
            class="button secondary" 
            style="padding:8px 14px; font-size:11px; border-color:#7EE7FF; color:#7EE7FF; display:inline-flex; align-items:center; gap:6px;"
            onclick="window.openImportPrivateModal()"
            title="Importar hinos ou louvores em lote via JSON ou CSV"
          >
            📥 Importar em Lote
          </button>
          <button 
            type="button" 
            class="button primary" 
            style="padding:8px 16px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #7EE7FF 0%, #38bdf8 100%); color:#07101F;"
            onclick="window.openAddPrivateSongModal()"
          >
            + Novo Louvor Privado
          </button>
        </div>
      </div>

      <!-- Barra de Busca do Repertório (Requirement 8) -->
      <div style="margin-top:16px;">
        <div style="position:relative;">
          <input 
            type="text" 
            id="private-song-search-input" 
            class="form-input" 
            placeholder="🔍 Buscar no repertório (número, título, tom, BPM, dificuldade)..." 
            value="${escapeHtml(searchQuery)}"
            oninput="window.handlePrivateSearch(this.value)" 
            style="background:#0E1B35; border:1px solid rgba(126,231,255,0.2); color:#F8FAFC; border-radius:14px; padding:12px 16px; width:100%; font-size:14px;"
          />
          ${searchQuery ? `
            <button 
              type="button" 
              onclick="window.handlePrivateSearch('')" 
              style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:16px;"
            >✕</button>
          ` : ''}
        </div>

        <!-- Filtros Rápidos -->
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          ${filterBtns}
        </div>
      </div>

      <!-- Grid de Músicas -->
      <div class="grid" style="margin-top:20px; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
        ${cardsHtml}
      </div>
    </section>
  `;
}

/**
 * Renderiza o Modal de Cadastro / Edição Manual de Música Privada
 */
export function renderAddPrivateSongModal({ songToEdit = null, activeBand = null }) {
  const isEditing = !!songToEdit;
  const s = songToEdit || {};

  return `
    <div id="private-song-modal-backdrop" class="rehearsal-modal-backdrop" style="position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:9999; padding:16px;">
      <div class="rehearsal-modal-card" style="background:#0E1B35; border:1px solid rgba(126,231,255,0.25); border-radius:24px; max-width:640px; width:100%; max-height:90vh; overflow-y:auto; padding:24px; box-shadow:0 20px 48px rgba(0,0,0,0.6);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
          <div>
            <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(245,197,66,0.15); color:#F5C542; border:1px solid rgba(245,197,66,0.3); font-weight:700;">
              🔒 REPERTÓRIO PRIVADO
            </span>
            <h3 style="margin:6px 0 0 0; color:#F8FAFC; font-size:18px; font-weight:700;">
              ${isEditing ? 'Editar Louvor Privado' : 'Cadastrar Louvor Privado da Banda'}
            </h3>
          </div>
          <button type="button" onclick="window.closeAddPrivateSongModal()" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer; padding:4px;">✕</button>
        </div>

        <p style="font-size:12px; color:#94a3b8; margin-bottom:16px;">
          Este louvor permanecerá restrito ao desenvolvimento interno da sua banda. O VIRTUO calculará automaticamente a versão <strong>Easy Play</strong> preservando o tom original.
        </p>

        <form id="private-song-form" onsubmit="event.preventDefault(); window.savePrivateSong();">
          <input type="hidden" id="priv-song-id" value="${escapeHtml(s.id || '')}" />

          <div style="display:grid; grid-template-columns:1fr 2fr; gap:12px; margin-bottom:12px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Número do Hino (Opcional)</label>
              <input type="text" id="priv-song-number" class="form-input" placeholder="Ex: 001, 15..." value="${escapeHtml(s.hymnNumber || '')}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Título do Louvor / Hino *</label>
              <input type="text" id="priv-song-title" class="form-input" placeholder="Ex: Chuvas de Graça" required value="${escapeHtml(s.title || '')}" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Tom Original</label>
              <input type="text" id="priv-song-key" class="form-input" placeholder="Ex: G, D, C" value="${escapeHtml(s.originalKey || s.key || 'G')}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">BPM</label>
              <input type="number" id="priv-song-bpm" class="form-input" placeholder="74" value="${s.bpm || 74}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Compasso</label>
              <input type="text" id="priv-song-timesig" class="form-input" placeholder="4/4" value="${escapeHtml(s.timeSignature || '4/4')}" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Capotraste (Casa)</label>
              <input type="number" id="priv-song-capo" class="form-input" min="0" max="12" value="${s.capo || 0}" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Dificuldade</label>
              <select id="priv-song-diff" class="form-input" style="background:#07101F; color:#F8FAFC;">
                <option value="Fácil" ${s.difficulty === 'Fácil' ? 'selected' : ''}>Fácil</option>
                <option value="Médio" ${s.difficulty === 'Médio' ? 'selected' : ''}>Médio</option>
                <option value="Difícil" ${s.difficulty === 'Difícil' ? 'selected' : ''}>Difícil</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Categoria</label>
              <select id="priv-song-category" class="form-input" style="background:#07101F; color:#F8FAFC;">
                <option value="harpa-crista" ${s.category === 'harpa-crista' ? 'selected' : ''}>Harpa Cristã</option>
                <option value="louvor" ${s.category === 'louvor' ? 'selected' : ''}>Louvor</option>
                <option value="avivamento" ${s.category === 'avivamento' ? 'selected' : ''}>Avivamento</option>
                <option value="outros" ${s.category === 'outros' ? 'selected' : ''}>Outros</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Estrutura Harmônica (Seções)</label>
            <input type="text" id="priv-song-structure" class="form-input" placeholder="Intro • Verso 1 • Refrão • Verso 2 • Final" value="${escapeHtml(s.structure || 'Intro • Verso • Refrão • Final')}" />
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Cifra Completa da Banda (Acordes + Seções)</label>
            <textarea id="priv-song-chords" class="form-input" rows="6" placeholder="[Intro] G  C  G  D&#10;G                C&#10;Chuvas de graça teremos...&#10;D                 G&#10;É a promessa de Deus..." style="font-family:monospace; font-size:13px; line-height:1.4;">${escapeHtml(s.chords || '')}</textarea>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Letra Completa (Opcional)</label>
            <textarea id="priv-song-lyrics" class="form-input" rows="4" placeholder="Insira a letra para acompanhamento...">${escapeHtml(s.lyrics || '')}</textarea>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Observações do Ensaio / Arranjo Interno</label>
            <input type="text" id="priv-song-notes" class="form-input" placeholder="Ex: Entrada suave no violão, bateria entra no Refrão 2" value="${escapeHtml(s.sourceNote || '')}" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
            <button type="button" class="button secondary" onclick="window.closeAddPrivateSongModal()">Cancelar</button>
            <button type="submit" class="button primary" style="background:linear-gradient(135deg, #7EE7FF 0%, #38bdf8 100%); color:#07101F; font-weight:700;">
              💾 Salvar no Repertório Privado
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Renderiza o Modal de Importação em Lote (JSON / CSV Estruturado / Modelo Harpa)
 */
export function renderImportPrivateModal() {
  return `
    <div id="private-import-modal-backdrop" class="rehearsal-modal-backdrop" style="position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:9999; padding:16px;">
      <div class="rehearsal-modal-card" style="background:#0E1B35; border:1px solid rgba(126,231,255,0.25); border-radius:24px; max-width:680px; width:100%; max-height:90vh; overflow-y:auto; padding:24px; box-shadow:0 20px 48px rgba(0,0,0,0.6);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
          <div>
            <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(126,231,255,0.15); color:#7EE7FF; border:1px solid rgba(126,231,255,0.3); font-weight:700;">
              IMPORTAÇÃO PRIVADA DA BANDA
            </span>
            <h3 style="margin:6px 0 0 0; color:#F8FAFC; font-size:18px; font-weight:700;">
              Importar Hinos e Louvores em Lote
            </h3>
          </div>
          <button type="button" onclick="window.closeImportPrivateModal()" style="background:transparent; border:none; color:#94a3b8; font-size:20px; cursor:pointer; padding:4px;">✕</button>
        </div>

        <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin-bottom:14px;">
          Toda música importada recebe automaticamente <code>visibility: "private"</code> e <code>publicLibrary: false</code>. Nunca se torna pública sem ação consciente do Owner.
        </p>

        <!-- Abas de Formato -->
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button type="button" id="tab-import-json" class="tag-btn active" style="font-size:12px; padding:6px 14px; border-radius:10px;" onclick="window.setImportTab('json')">
            Formato JSON
          </button>
          <button type="button" id="tab-import-csv" class="tag-btn" style="font-size:12px; padding:6px 14px; border-radius:10px;" onclick="window.setImportTab('csv')">
            CSV Estruturado
          </button>
          <button type="button" id="tab-import-template" class="tag-btn" style="font-size:12px; padding:6px 14px; border-radius:10px; color:#F5C542; border-color:rgba(245,197,66,0.4);" onclick="window.loadHarpaBatchTemplate()">
            ⚡ Modelo Harpa Cristã
          </button>
        </div>

        <div id="import-content-area">
          <textarea 
            id="private-import-data" 
            class="form-input" 
            rows="10" 
            placeholder="Cole aqui seu JSON de hinos ou use o botão 'Modelo Harpa Cristã' para carregar a estrutura recomendada..." 
            style="font-family:monospace; font-size:12px; line-height:1.4;"
          ></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px; flex-wrap:wrap; gap:10px;">
          <span style="font-size:11px; color:#94a3b8;">Suporta array de objetos JSON ou linhas de CSV separadas por ponto-e-vírgula (;).</span>
          <div style="display:flex; gap:10px;">
            <button type="button" class="button secondary" onclick="window.closeImportPrivateModal()">Cancelar</button>
            <button type="button" class="button primary" style="background:linear-gradient(135deg, #7EE7FF 0%, #38bdf8 100%); color:#07101F; font-weight:700;" onclick="window.handleBatchImportPrivate()">
              Confirmar Importação Privada
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renderiza a Barreira de Proteção contra Publicação Acidental (Requirement 15)
 */
export function renderPublishWarningModal(song) {
  return `
    <div id="publish-warning-modal-backdrop" class="rehearsal-modal-backdrop" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); display:flex; justify-content:center; align-items:center; z-index:99999; padding:16px;">
      <div class="rehearsal-modal-card" style="background:#0E1B35; border:2px solid rgba(245,197,66,0.6); border-radius:24px; max-width:520px; width:100%; padding:24px; box-shadow:0 24px 60px rgba(0,0,0,0.8);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
          <span style="font-size:28px;">⚠️</span>
          <div>
            <span class="pill" style="font-size:10px; padding:2px 8px; background:rgba(245,197,66,0.2); color:#F5C542; border:1px solid rgba(245,197,66,0.5); font-weight:700;">
              BARREIRA DE PROTEÇÃO • VIRTUO
            </span>
            <h3 style="margin:4px 0 0 0; color:#F8FAFC; font-size:18px; font-weight:700;">
              Confirmação de Publicação
            </h3>
          </div>
        </div>

        <div style="background:rgba(245,197,66,0.08); border-left:4px solid #F5C542; padding:14px; border-radius:8px; margin-bottom:16px;">
          <p style="color:#F8FAFC; font-size:13px; line-height:1.5; margin:0; font-weight:600;">
            “Este repertório pertence ao espaço privado da banda. Confirme que possui autorização para disponibilizá-lo publicamente.”
          </p>
        </div>

        <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin-bottom:16px;">
          Música: <strong>${escapeHtml(song.title)}</strong><br/>
          Ao tornar esta música pública, ela será exposta na Biblioteca Pública do VIRTUO e em buscas globais.
        </p>

        <label style="display:flex; align-items:flex-start; gap:10px; margin-bottom:20px; cursor:pointer; font-size:12px; color:#cbd5e1;">
          <input type="checkbox" id="confirm-publish-checkbox" style="margin-top:2px; transform:scale(1.2);" />
          <span>Declaro sob minha responsabilidade como Owner que detenho as autorizações legais e quero tornar este louvor público.</span>
        </label>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button secondary" onclick="window.closePublishWarningModal()">Cancelar (Manter Privado)</button>
          <button 
            type="button" 
            class="button primary" 
            style="background:#F5C542; color:#07101F; font-weight:700;" 
            onclick="window.confirmAccidentalPublish('${song.id}')"
          >
            Confirmar Publicação Consciente
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renderiza o Painel Interativo de Ensaio (Requirement 10)
 */
export function renderRehearsalHud({
  song,
  currentKey = "G",
  transposeOffset = 0,
  isEasyPlay = false,
  activeSection = null,
  isMetronomePlaying = false,
  bpm = 74
}) {
  const sections = song.structure 
    ? song.structure.split(/•|-|,/).map(s => s.trim()).filter(Boolean)
    : ["Intro", "Verso", "Refrão", "Final"];

  const sectionPills = sections.map(sec => `
    <button 
      type="button"
      class="tag-btn ${activeSection === sec ? 'active' : ''}" 
      style="padding:5px 12px; font-size:11px; border-radius:8px; ${activeSection === sec ? 'background:#7EE7FF; color:#07101F; font-weight:700;' : 'background:rgba(255,255,255,0.06); color:#cbd5e1;'}"
      onclick="window.setRehearsalSection('${escapeHtml(sec)}')"
    >
      ${escapeHtml(sec)}
    </button>
  `).join("");

  return `
    <div class="rehearsal-hud-card" style="margin:16px 0; background:linear-gradient(135deg, rgba(14,27,53,0.95) 0%, rgba(7,16,31,0.98) 100%); border:1px solid rgba(126,231,255,0.3); border-radius:18px; padding:18px; box-shadow:0 8px 30px rgba(0,0,0,0.5);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🥁</span>
          <span style="font-size:14px; font-weight:800; color:#F8FAFC; letter-spacing:0.5px;">PAINEL MODO ENSAIO</span>
          <span class="pill" style="font-size:10px; padding:2px 6px; background:rgba(16,185,129,0.15); color:#6ee7b7; border:1px solid rgba(16,185,129,0.3); font-weight:700;">
            ENSAIO ATIVO
          </span>
        </div>
        <button type="button" onclick="window.toggleRehearsalHud()" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕ Fechar</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:14px;">
        <!-- 1. Metrônomo -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px;">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px; font-weight:600;">1. METRÔNOMO EM TEMPO REAL</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <button 
              type="button"
              class="button ${isMetronomePlaying ? 'secondary' : 'primary'}" 
              style="padding:6px 14px; font-size:12px; font-weight:700; ${isMetronomePlaying ? 'background:rgba(239,68,68,0.2); border-color:#ef4444; color:#fca5a5;' : 'background:#7EE7FF; color:#07101F;'}"
              onclick="window.toggleMetronomeFromHud()"
            >
              ${isMetronomePlaying ? '⏹ Parar Metrônomo' : '▶ Iniciar Metrônomo'}
            </button>
            <span style="font-size:13px; color:#F8FAFC; font-weight:700;">${bpm} BPM</span>
          </div>
        </div>

        <!-- 2. Versão: Original vs Easy Play -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px;">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px; font-weight:600;">2. VERSÃO DA CIFRA</span>
          <div style="display:flex; gap:6px;">
            <button 
              type="button" 
              class="tag-btn ${!isEasyPlay ? 'active' : ''}" 
              style="padding:6px 12px; font-size:11px; border-radius:8px; ${!isEasyPlay ? 'background:#7EE7FF; color:#07101F; font-weight:700;' : 'color:#94a3b8;'}"
              onclick="window.setSongModeFromHud(false)"
            >
              Original
            </button>
            <button 
              type="button" 
              class="tag-btn ${isEasyPlay ? 'active' : ''}" 
              style="padding:6px 12px; font-size:11px; border-radius:8px; ${isEasyPlay ? 'background:#F5C542; color:#07101F; font-weight:700;' : 'color:#94a3b8;'}"
              onclick="window.setSongModeFromHud(true)"
            >
              ⚡ Easy Play
            </button>
          </div>
        </div>

        <!-- 3. Alterar Tom -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px;">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px; font-weight:600;">3. ALTERAR TOM</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="tone-stepper-btn" onclick="window.changeTone(-1)">−</button>
            <span style="font-size:13px; font-weight:700; color:#7EE7FF; min-width:44px; text-align:center;">${escapeHtml(currentKey)}</span>
            <button type="button" class="tone-stepper-btn" onclick="window.changeTone(1)">+</button>
            ${transposeOffset !== 0 ? `
              <button type="button" class="tag-btn" style="padding:4px 8px; font-size:10px;" onclick="window.resetToneOffset()">↺ Original</button>
            ` : ''}
          </div>
        </div>

        <!-- 4. Alterar BPM -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px;">
          <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px; font-weight:600;">4. ALTERAR BPM</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="tone-stepper-btn" onclick="window.changeSongBpm(-5)">−5</button>
            <span style="font-size:13px; font-weight:700; color:#F8FAFC; min-width:44px; text-align:center;">${bpm}</span>
            <button type="button" class="tone-stepper-btn" onclick="window.changeSongBpm(5)">+5</button>
          </div>
        </div>
      </div>

      <!-- 5. Marcar Seção -->
      <div style="margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px;">
        <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:8px; font-weight:600;">
          5. MARCAR SEÇÃO DO ENSAIO ${activeSection ? `(Ativa: <strong style="color:#7EE7FF;">${escapeHtml(activeSection)}</strong>)` : ''}
        </span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${sectionPills}
          ${activeSection ? `
            <button type="button" class="tag-btn" style="padding:5px 8px; font-size:10px; color:#94a3b8;" onclick="window.setRehearsalSection(null)">Desmarcar</button>
          ` : ''}
        </div>
      </div>

      <!-- 6 e 7. Adicionar à Missão e Enviar para Palco ao Vivo -->
      <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">
        <button 
          type="button" 
          class="button secondary" 
          style="font-size:12px; display:inline-flex; align-items:center; gap:6px;"
          onclick="window.addPrivateSongToActiveMission('${song.id}')"
        >
          📋 Adicionar à Virtuo Missão
        </button>
        <button 
          type="button" 
          class="button primary" 
          style="background:linear-gradient(135deg, #7EE7FF 0%, #38bdf8 100%); color:#07101F; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:6px;"
          onclick="window.sendPrivateSongToLiveStage('${song.id}')"
        >
          🎤 Enviar para Palco ao Vivo
        </button>
      </div>
    </div>
  `;
}
