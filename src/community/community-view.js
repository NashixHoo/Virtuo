// =============================================================
// VIRTUO COMMUNITY 2.0 VIEW & UI COMPONENT (ETAPA 4/5)
// src/community/community-view.js
// Interface elegante, moderna e mobile-first para a Comunidade Musical
// =============================================================

import {
  MUSICAL_INSTRUMENTS,
  EXPERIENCE_LEVELS,
  MUSICAL_STYLES,
  POST_TYPES,
  REPORT_REASONS,
  BAND_MEMBER_ROLES,
  COLLABORATIVE_REHEARSAL_STATUS,
  DISCOVER_CATEGORIES
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

export function renderCommunityView({
  currentSubTab = "feed", // 'feed', 'descobrir', 'bandas', 'perfil', 'moderacao'
  posts = [],
  filterPostType = "todos",
  currentUser = null,
  userProfile = null,
  bands = [],
  activeBand = null,
  commentsMap = {},
  expandedPostId = null,
  expandedCommentsPostId = null,
  searchQuery = "",
  searchResults = null,
  discoverCategory = null,
  discoverResults = [],
  pendingReports = [],
  savedPostIds = [],
  invites = []
}) {
  const isLogged = !!currentUser;
  const isAdmin = userProfile?.role === "admin" || localStorage.getItem("virtuo_admin_role") === "true";
  const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem("virtuo_celestial_member") === "true");
  const currentUid = currentUser?.uid || "guest";

  return `
    <section class="glass" id="community-2-container" style="padding: 16px 18px;">
      <!-- Header da Comunidade -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">COMUNIDADE 2.0</span>
          ${isCelestial ? `<span class="badge-celestial" style="font-size:10px; padding:3px 10px;">✦ MEMBRO CELESTIAL</span>` : ''}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="button secondary" style="padding:5px 12px; font-size:12px;" onclick="window.refreshCommunityData()">
            🔄 Atualizar
          </button>
        </div>
      </div>

      <h2 style="margin-top:10px; font-size:20px; font-weight:800; color:#fff;">Rede Social dos Músicos</h2>
      <p class="subtitle" style="font-size:13px; color:#94a3b8; margin-top:2px;">
        Conecte-se com ministérios, bandas, guitarristas, bateristas e vocais em todo o Brasil.
      </p>

      <!-- Sub-navegação / Abas da Comunidade 2.0 -->
      <div class="community-subnav" style="display:flex; gap:6px; overflow-x:auto; padding:10px 0; margin-top:8px; border-bottom:1px solid rgba(255,255,255,0.07);">
        <button 
          class="segmented-mode-btn ${currentSubTab === 'feed' ? 'active' : ''}" 
          onclick="window.setCommunitySubTab('feed')"
          style="white-space:nowrap;"
        >
          📰 Feed Musical
        </button>
        <button 
          class="segmented-mode-btn ${currentSubTab === 'descobrir' ? 'active' : ''}" 
          onclick="window.setCommunitySubTab('descobrir')"
          style="white-space:nowrap;"
        >
          🔍 Descobrir & Busca
        </button>
        <button 
          class="segmented-mode-btn ${currentSubTab === 'bandas' ? 'active' : ''}" 
          onclick="window.setCommunitySubTab('bandas')"
          style="white-space:nowrap; position:relative;"
        >
          🎸 Bandas & Ensaios
          ${invites.length > 0 ? `<span style="background:#ef4444; color:#fff; font-size:9px; padding:1px 5px; border-radius:10px; margin-left:4px;">${invites.length}</span>` : ''}
        </button>
        <button 
          class="segmented-mode-btn ${currentSubTab === 'perfil' ? 'active' : ''}" 
          onclick="window.setCommunitySubTab('perfil')"
          style="white-space:nowrap;"
        >
          👤 Meu Perfil 2.0
        </button>
        ${isAdmin ? `
          <button 
            class="segmented-mode-btn ${currentSubTab === 'moderacao' ? 'active' : ''}" 
            onclick="window.setCommunitySubTab('moderacao')"
            style="white-space:nowrap; border-color:rgba(239,68,68,0.4); color:#ef4444;"
          >
            🛡️ Moderação
            ${pendingReports.length > 0 ? `<span style="background:#ef4444; color:#fff; font-size:9px; padding:1px 5px; border-radius:10px; margin-left:4px;">${pendingReports.length}</span>` : ''}
          </button>
        ` : ''}
      </div>

      <!-- Conteúdo da Aba Selecionada -->
      ${renderTabContent({
        currentSubTab,
        posts,
        filterPostType,
        currentUser,
        userProfile,
        bands,
        activeBand,
        commentsMap,
        expandedPostId,
        expandedCommentsPostId,
        searchQuery,
        searchResults,
        discoverCategory,
        discoverResults,
        pendingReports,
        savedPostIds,
        invites,
        isAdmin,
        isCelestial,
        currentUid
      })}
    </section>
  `;
}

function renderTabContent(props) {
  switch (props.currentSubTab) {
    case "descobrir":
      return renderDiscoverTab(props);
    case "bandas":
      return renderBandsTab(props);
    case "perfil":
      return renderProfileTab(props);
    case "moderacao":
      return renderModerationTab(props);
    case "feed":
    default:
      return renderFeedTab(props);
  }
}

// ---------------------------------------------------------------------
// 1. ABA DO FEED 2.0 (MULTI-TYPE, LIKES, COMMENTS, SHARE, SAVE)
// ---------------------------------------------------------------------
function renderFeedTab({ posts, filterPostType, currentUser, commentsMap, expandedCommentsPostId, savedPostIds, isAdmin, currentUid }) {
  const isLogged = !!currentUser;

  return `
    <!-- Criar Nova Publicação 2.0 -->
    <div style="margin-top:16px; padding:14px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.2); border-radius:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:13px; font-weight:700; color:#7EE7FF;">+ Compartilhar com a Comunidade</span>
        <span style="font-size:11px; color:#64748b;">Feed dos Músicos</span>
      </div>

      <!-- Tipo de Publicação -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:8px;">
        ${POST_TYPES.map(pt => `
          <button 
            type="button"
            id="post-type-btn-${pt.id}"
            class="tag-btn post-type-select-btn ${pt.id === 'texto' ? 'active' : ''}"
            onclick="window.selectPostType('${pt.id}')"
            style="font-size:11px; padding:4px 10px; white-space:nowrap;"
          >
            ${pt.icon} ${pt.label}
          </button>
        `).join("")}
      </div>

      <textarea 
        id="community-post-text" 
        class="form-input" 
        rows="3" 
        placeholder="O que sua equipe ensaiou hoje? Dica de harmonia, performance ou momento de louvor..."
        style="resize:vertical;"
      ></textarea>

      <!-- Campos condicionais de mídia e instrumento -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
        <div>
          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Instrumento Relacionado</label>
          <select id="community-post-instrument" class="form-input" style="font-size:12px;">
            <option value="">Nenhum / Geral</option>
            ${MUSICAL_INSTRUMENTS.map(i => `<option value="${i.id}">${i.icon} ${i.name}</option>`).join("")}
          </select>
        </div>
        <div>
          <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Visibilidade</label>
          <select id="community-post-visibility" class="form-input" style="font-size:12px;">
            <option value="public">Público (Todos)</option>
            <option value="followers">Apenas Seguidores</option>
          </select>
        </div>
      </div>

      <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
        <input 
          type="file" 
          id="community-post-file" 
          accept="image/*" 
          class="form-input" 
          style="padding:6px 10px; font-size:12px; cursor:pointer;"
        />
        <input 
          type="url" 
          id="community-post-media-url" 
          class="form-input" 
          placeholder="Ou link de imagem/vídeo externo (YouTube, Instagram, etc.)" 
          style="font-size:12px;"
        />
      </div>

      <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:#64748b;">Postagem pública no Virtuo</span>
        <button id="community-publish-btn" class="button primary" style="padding:8px 18px; font-size:13px;" onclick="window.handleCreatePostV2()">
          Publicar no Feed
        </button>
      </div>
    </div>

    <!-- Filtro de Tipos de Postagem -->
    <div style="display:flex; align-items:center; gap:6px; overflow-x:auto; margin:16px 0 10px; padding-bottom:4px;">
      <span style="font-size:11px; color:#94a3b8; margin-right:4px;">Filtrar:</span>
      <button 
        class="tag-btn ${filterPostType === 'todos' ? 'active' : ''}" 
        onclick="window.filterFeedByType('todos')"
        style="font-size:11px; padding:3px 8px;"
      >
        Todos
      </button>
      ${POST_TYPES.slice(0, 5).map(pt => `
        <button 
          class="tag-btn ${filterPostType === pt.id ? 'active' : ''}" 
          onclick="window.filterFeedByType('${pt.id}')"
          style="font-size:11px; padding:3px 8px; white-space:nowrap;"
        >
          ${pt.icon} ${pt.label}
        </button>
      `).join("")}
    </div>

    <!-- Lista de Posts do Feed 2.0 -->
    <div class="community-posts-list" style="display:flex; flex-direction:column; gap:14px;">
      ${posts.length === 0 ? `
        <div style="text-align:center; padding:36px 16px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:14px;">
          <span style="font-size:36px; display:block; margin-bottom:8px;">👥</span>
          <h3 style="color:#fff; font-size:15px;">Nenhuma publicação encontrada</h3>
          <p style="font-size:12px; margin-top:4px;">Seja o primeiro a compartilhar um momento de ensaio ou louvor!</p>
        </div>
      ` : posts.map(post => renderPostCard({
        post,
        currentUser,
        commentsMap,
        isExpandedComments: expandedCommentsPostId === post.id,
        isSaved: savedPostIds.includes(post.id),
        isAdmin,
        currentUid
      })).join("")}
    </div>
  `;
}

function renderPostCard({ post, currentUser, commentsMap, isExpandedComments, isSaved, isAdmin, currentUid }) {
  const isLiked = Array.isArray(post.likes) && currentUser && post.likes.includes(currentUser.uid);
  const likesCount = Number(post.likesCount !== undefined ? post.likesCount : (Array.isArray(post.likes) ? post.likes.length : 0));
  const comments = commentsMap[post.id] || [];
  const commentsCount = comments.length > 0 ? comments.length : (post.commentsCount || 0);
  const canDelete = currentUser && (post.authorId === currentUser.uid || isAdmin);
  const authorInitials = (post.authorName || "M").charAt(0).toUpperCase();
  const isCelestialAuthor = post.authorRole === "Membro Celestial" || post.authorRole === "Fundador & Líder" || post.isCelestial;
  const postTypeObj = POST_TYPES.find(t => t.id === post.type);

  return `
    <article class="community-post-card" id="post-${post.id}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:14px; margin-bottom:4px;">
      <div class="community-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div class="community-author-wrap" style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="window.viewUserProfile('${post.authorId}')">
          <div class="community-avatar-circ" style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, rgba(126,231,255,0.2), rgba(99,102,241,0.2)); display:flex; align-items:center; justify-content:center; font-weight:700; color:#7EE7FF; overflow:hidden; border:1px solid rgba(126,231,255,0.3);">
            ${post.authorPhoto ? `<img src="${escapeHtml(post.authorPhoto)}" style="width:100%;height:100%;object-fit:cover;" />` : authorInitials}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="community-author-name" style="font-weight:700; color:#fff; font-size:13px;">${escapeHtml(post.authorName || "Músico Virtuoso")}</span>
              ${isCelestialAuthor ? `<span class="badge-celestial" style="font-size:9px; padding:2px 7px;">✦ CELESTIAL</span>` : ''}
              ${postTypeObj ? `<span class="pill" style="font-size:9px; padding:2px 6px; border-color:rgba(255,255,255,0.15);">${postTypeObj.icon} ${postTypeObj.label}</span>` : ''}
            </div>
            <div class="community-author-meta" style="font-size:11px; color:#94a3b8; display:flex; gap:6px; margin-top:2px;">
              <span>${escapeHtml(post.authorRole || "Membro")}</span>
              <span>•</span>
              <span>${typeof post.createdAt === "string" ? new Date(post.createdAt).toLocaleDateString("pt-BR") : "Hoje"}</span>
              ${post.instrument ? `<span>• 🎵 ${escapeHtml(post.instrument)}</span>` : ''}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:4px;">
          <!-- Ações de Opções (Denunciar / Excluir) -->
          <button 
            class="tag-btn" 
            style="color:#94a3b8; border-color:rgba(255,255,255,0.1); font-size:11px; padding:3px 7px;" 
            onclick="window.openReportModal('post', '${post.id}')"
            title="Denunciar publicação"
          >
            🚩
          </button>
          ${canDelete ? `
            <button 
              class="tag-btn" 
              style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:11px; padding:3px 7px;" 
              onclick="window.handleDeletePostV2('${post.id}')"
              title="Excluir publicação"
            >
              🗑️
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Conteúdo do Post -->
      <div class="community-content-text" style="font-size:13px; color:#e2e8f0; line-height:1.5; margin:10px 0; white-space:pre-wrap;">${escapeHtml(post.content || "")}</div>

      <!-- Mídia / Foto / Vídeo -->
      ${post.imageUrl ? `
        <div style="margin:10px 0; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); max-height:360px;">
          <img src="${escapeHtml(post.imageUrl)}" style="width:100%; height:auto; object-fit:cover; display:block;" alt="Publicação" loading="lazy" />
        </div>
      ` : ''}

      <!-- Anexo de Música / Cifra (se houver) -->
      ${post.songId ? `
        <div style="margin:8px 0; padding:8px 12px; background:rgba(126,231,255,0.06); border:1px solid rgba(126,231,255,0.2); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>🎵</span>
            <span style="font-size:12px; font-weight:700; color:#7EE7FF;">${escapeHtml(post.songTitle || "Cifra no Repertório")}</span>
          </div>
          <button class="tag-btn" style="font-size:11px; padding:2px 8px;" onclick="window.openSongById('${post.songId}')">
            Abrir Cifra
          </button>
        </div>
      ` : ''}

      <!-- Barra de Interações (Curtir, Comentar, Salvar, Compartilhar) -->
      <div class="community-actions-bar" style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06); margin-top:8px;">
        <div style="display:flex; gap:10px;">
          <!-- Curtir -->
          <button 
            class="community-like-btn ${isLiked ? 'liked' : ''}" 
            onclick="window.togglePostLikeV2('${post.id}')"
            style="background:none; border:none; color:${isLiked ? '#ef4444' : '#94a3b8'}; font-size:12px; display:flex; align-items:center; gap:4px; cursor:pointer; font-weight:600;"
          >
            <span>${isLiked ? '❤️' : '🤍'}</span>
            <span>${likesCount}</span>
          </button>

          <!-- Comentar -->
          <button 
            onclick="window.toggleCommentsView('${post.id}')"
            style="background:none; border:none; color:#94a3b8; font-size:12px; display:flex; align-items:center; gap:4px; cursor:pointer; font-weight:600;"
          >
            <span>💬</span>
            <span>${commentsCount}</span>
          </button>

          <!-- Salvar -->
          <button 
            onclick="window.toggleSavePostV2('${post.id}')"
            style="background:none; border:none; color:${isSaved ? '#fbbf24' : '#94a3b8'}; font-size:12px; display:flex; align-items:center; gap:4px; cursor:pointer; font-weight:600;"
            title="${isSaved ? 'Remover dos salvos' : 'Salvar publicação'}"
          >
            <span>${isSaved ? '🔖' : '📑'}</span>
            <span>${isSaved ? 'Salvo' : 'Salvar'}</span>
          </button>
        </div>

        <!-- Compartilhar -->
        <button 
          class="tag-btn" 
          style="font-size:11px; padding:3px 9px; display:flex; align-items:center; gap:4px;" 
          onclick="window.sharePostLink('${post.id}', '${escapeHtml(post.authorName || 'Músico')}')"
        >
          <span>↗</span> Compartilhar
        </button>
      </div>

      <!-- Seção Expansível de Comentários -->
      ${isExpandedComments ? `
        <div class="comments-section" style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
          <h4 style="font-size:12px; color:#7EE7FF; margin-bottom:8px;">Comentários (${comments.length})</h4>

          <!-- Input para Novo Comentário -->
          <div style="display:flex; gap:6px; margin-bottom:10px;">
            <input 
              type="text" 
              id="comment-input-${post.id}" 
              class="form-input" 
              placeholder="Escreva um comentário edificante..." 
              style="font-size:12px; padding:6px 10px;"
              onkeydown="if(event.key==='Enter') window.handleAddComment('${post.id}')"
            />
            <button class="button primary" style="padding:6px 12px; font-size:12px;" onclick="window.handleAddComment('${post.id}')">
              Enviar
            </button>
          </div>

          <!-- Lista de Comentários -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${comments.length === 0 ? `
              <span style="font-size:11px; color:#64748b;">Nenhum comentário ainda. Seja o primeiro a comentar!</span>
            ` : comments.map(c => `
              <div style="background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
                  <span style="font-weight:700; color:#fff;">${escapeHtml(c.authorName || "Músico")}</span>
                  <div style="display:flex; gap:4px;">
                    <span style="color:#64748b;">${typeof c.createdAt === 'string' ? new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                    <button class="tag-btn" style="padding:1px 4px; font-size:9px;" onclick="window.openReportModal('comment', '${c.id}')" title="Denunciar">🚩</button>
                    ${(c.authorId === currentUid || isAdmin) ? `
                      <button class="tag-btn" style="padding:1px 4px; font-size:9px; color:#ef4444;" onclick="window.handleDeleteComment('${c.id}', '${post.id}')" title="Excluir">🗑️</button>
                    ` : ''}
                  </div>
                </div>
                <p style="font-size:12px; color:#cbd5e1; margin-top:3px;">${escapeHtml(c.content || "")}</p>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    </article>
  `;
}

// ---------------------------------------------------------------------
// 2. ABA DESCOBRIR & BUSCA GLOBAL
// ---------------------------------------------------------------------
function renderDiscoverTab({ searchQuery, searchResults, discoverCategory, discoverResults, currentUser }) {
  return `
    <div style="margin-top:16px;">
      <!-- Barra de Busca Global -->
      <div style="display:flex; gap:8px;">
        <input 
          type="text" 
          id="global-search-input" 
          class="form-input" 
          value="${escapeHtml(searchQuery)}" 
          placeholder="Buscar músicos, bandas, músicas, cifras ou postagens..."
          style="font-size:13px;"
          onkeydown="if(event.key==='Enter') window.executeGlobalSearch()"
        />
        <button class="button primary" style="padding:8px 16px; font-size:13px;" onclick="window.executeGlobalSearch()">
          Buscar
        </button>
      </div>

      <!-- Categorias de Descoberta Rápida -->
      <div style="margin-top:16px;">
        <span style="font-size:12px; font-weight:700; color:#7EE7FF; display:block; margin-bottom:8px;">
          EXPLORAR POR INSTRUMENTO & CATEGORIA
        </span>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:8px;">
          ${DISCOVER_CATEGORIES.map(cat => `
            <button 
              class="tile" 
              style="padding:10px 8px; text-align:center; cursor:pointer; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; ${discoverCategory === cat.id ? 'border-color:#7EE7FF; background:rgba(126,231,255,0.08);' : ''}"
              onclick="window.selectDiscoverCategory('${cat.id}')"
            >
              <span style="font-size:20px; display:block; margin-bottom:4px;">${cat.icon}</span>
              <span style="font-size:11px; font-weight:600; color:#fff; display:block;">${cat.name}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Resultados de Busca Global -->
      ${searchResults ? `
        <div style="margin-top:20px; padding:14px; background:rgba(255,255,255,0.02); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:13px; font-weight:700; color:#7EE7FF;">Resultados para: "${escapeHtml(searchResults.query)}"</span>
            <button class="tag-btn" onclick="window.clearSearch()">Limpar Busca</button>
          </div>

          <!-- Músicos Encontrados -->
          <div style="margin-bottom:14px;">
            <h4 style="font-size:12px; color:#94a3b8; margin-bottom:6px;">Músicos (${searchResults.musicians.length})</h4>
            ${searchResults.musicians.length === 0 ? `<p style="font-size:11px; color:#64748b;">Nenhum músico encontrado.</p>` : `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${searchResults.musicians.map(m => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:10px;">
                    <div>
                      <span style="font-size:12px; font-weight:700; color:#fff;">${escapeHtml(m.artisticName || m.displayName)}</span>
                      <span style="font-size:10px; color:#94a3b8; display:block;">${(m.instruments || []).join(", ")} • ${m.level || 'Músico'}</span>
                    </div>
                    <button class="tag-btn" onclick="window.viewUserProfile('${m.uid}')">Ver Perfil</button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>

          <!-- Bandas Encontradas -->
          <div style="margin-bottom:14px;">
            <h4 style="font-size:12px; color:#94a3b8; margin-bottom:6px;">Bandas (${searchResults.bands.length})</h4>
            ${searchResults.bands.length === 0 ? `<p style="font-size:11px; color:#64748b;">Nenhuma banda encontrada.</p>` : `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${searchResults.bands.map(b => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:10px;">
                    <div>
                      <span style="font-size:12px; font-weight:700; color:#fff;">${escapeHtml(b.name)}</span>
                      <span style="font-size:10px; color:#94a3b8; display:block;">${escapeHtml(b.style || 'Worship')} • ${(b.members || []).length} integrantes</span>
                    </div>
                    <button class="tag-btn" onclick="window.selectBandDetails('${b.id}')">Ver Banda</button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>

          <!-- Músicas Encontradas -->
          <div>
            <h4 style="font-size:12px; color:#94a3b8; margin-bottom:6px;">Músicas & Cifras (${searchResults.songs.length})</h4>
            ${searchResults.songs.length === 0 ? `<p style="font-size:11px; color:#64748b;">Nenhuma música encontrada.</p>` : `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${searchResults.songs.map(s => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:10px;">
                    <div>
                      <span style="font-size:12px; font-weight:700; color:#fff;">${escapeHtml(s.title)}</span>
                      <span style="font-size:10px; color:#94a3b8; display:block;">${escapeHtml(s.artist)} • Tom ${s.originalKey || s.key}</span>
                    </div>
                    <button class="tag-btn" onclick="window.openSongById('${s.id}')">Abrir Cifra</button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Resultados da Categoria Selecionada -->
      ${discoverCategory ? `
        <div style="margin-top:20px;">
          <h3 style="font-size:14px; color:#fff; margin-bottom:10px;">
            Músicos em Destaque: ${DISCOVER_CATEGORIES.find(c => c.id === discoverCategory)?.name || ''}
          </h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px;">
            ${discoverResults.length === 0 ? `
              <p style="font-size:12px; color:#94a3b8;">Nenhum músico cadastrado nesta categoria ainda.</p>
            ` : discoverResults.map(m => `
              <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h4 style="font-size:13px; color:#fff;">${escapeHtml(m.artisticName || m.displayName)}</h4>
                    <span style="font-size:11px; color:#7EE7FF;">${m.level || 'Intermediário'}</span>
                  </div>
                  <button class="tag-btn" onclick="window.viewUserProfile('${m.uid}')">Ver Perfil</button>
                </div>
                <p style="font-size:11px; color:#94a3b8; margin-top:6px; line-height:1.4;">${escapeHtml(m.bio || 'Músico ativo no Virtuo.')}</p>
                <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                  ${(m.styles || []).map(st => `<span class="pill" style="font-size:9px; padding:1px 6px;">${st}</span>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------
// 3. ABA BANDAS 2.0 & ENSAIO COLABORATIVO
// ---------------------------------------------------------------------
function renderBandsTab({ bands, activeBand, currentUser, invites, currentUid }) {
  return `
    <div style="margin-top:16px;">
      <!-- Convites Pendentes -->
      ${invites.length > 0 ? `
        <div style="padding:12px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:14px; margin-bottom:14px;">
          <h4 style="font-size:13px; color:#fde047; margin-bottom:6px;">📬 Convites de Bandas Pendentes (${invites.length})</h4>
          ${invites.map(inv => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding:8px; background:rgba(0,0,0,0.2); border-radius:8px;">
              <div>
                <strong style="color:#fff; font-size:12px;">${escapeHtml(inv.bandName)}</strong>
                <span style="font-size:11px; color:#94a3b8; display:block;">Função: ${inv.role} (${inv.instrument}) • Enviado por ${escapeHtml(inv.senderName)}</span>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="button primary" style="padding:4px 10px; font-size:11px;" onclick="window.respondBandInvite('${inv.id}', true)">Aceitar</button>
                <button class="button secondary" style="padding:4px 10px; font-size:11px;" onclick="window.respondBandInvite('${inv.id}', false)">Recusar</button>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ''}

      <!-- Header e Botão Criar Banda -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:15px; color:#fff;">Minhas Bandas & Ministérios</h3>
        <button class="button primary" style="padding:6px 14px; font-size:12px;" onclick="window.openCreateBandModal()">
          + Nova Banda
        </button>
      </div>

      <!-- Lista de Bandas -->
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
        ${bands.map(b => `
          <div 
            class="tile" 
            style="padding:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; cursor:pointer; ${activeBand && activeBand.id === b.id ? 'border-color:#7EE7FF;' : ''}"
            onclick="window.selectBandDetails('${b.id}')"
          >
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <h4 style="font-size:15px; color:#fff; font-weight:700;">${escapeHtml(b.name)}</h4>
                <span style="font-size:11px; color:#7EE7FF;">${escapeHtml(b.style || 'Worship')}</span>
              </div>
              <span class="pill" style="font-size:10px;">${(b.members || []).length} membros</span>
            </div>
            <p style="font-size:12px; color:#94a3b8; margin:8px 0; line-height:1.4;">${escapeHtml(b.description || 'Banda de louvor cadastrada no Virtuo.')}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:11px; color:#64748b;">
              <span>Líder: ${escapeHtml(b.adminName || 'Admin')}</span>
              <span style="color:#7EE7FF;">Abrir Painel →</span>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Detalhes da Banda Selecionada (Repertório, Ensaio Colaborativo, Integrantes) -->
      ${activeBand ? renderActiveBandPanel(activeBand, currentUid) : ''}
    </div>
  `;
}

function renderActiveBandPanel(band, currentUid) {
  const isLeader = band.adminId === currentUid || currentUid.startsWith("virtuo-master");

  return `
    <div style="margin-top:24px; padding:18px; background:rgba(255,255,255,0.02); border:1px solid rgba(126,231,255,0.25); border-radius:18px;">
      <!-- Topo da Banda -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF;">PAINEL DA BANDA</span>
          <h2 style="font-size:18px; color:#fff; margin-top:4px;">${escapeHtml(band.name)}</h2>
          <span style="font-size:12px; color:#94a3b8;">Estilo: ${escapeHtml(band.style)} • Líder: ${escapeHtml(band.adminName)}</span>
        </div>
        <div style="display:flex; gap:6px;">
          ${isLeader ? `
            <button class="button secondary" style="padding:6px 12px; font-size:12px;" onclick="window.openInviteMemberModal('${band.id}')">
              + Convidar Músico
            </button>
          ` : ''}
          <button class="button primary" style="padding:6px 14px; font-size:12px;" onclick="window.openCreateRehearsalModal('${band.id}')">
            + Agendar Ensaio
          </button>
        </div>
      </div>

      <!-- Integrantes da Banda -->
      <div style="margin-top:16px;">
        <h4 style="font-size:13px; color:#7EE7FF; margin-bottom:8px;">👥 Integrantes (${(band.members || []).length})</h4>
        <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:6px;">
          ${(band.members || []).map(m => `
            <div style="padding:8px 12px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.06); min-width:140px;">
              <span style="font-size:12px; font-weight:700; color:#fff; display:block;">${escapeHtml(m.name)}</span>
              <span style="font-size:10px; color:#7EE7FF; display:block;">${m.role === 'administrador' ? '👑 Líder' : '🎸 Músico'} (${m.instrument})</span>
              ${(isLeader && m.uid !== band.adminId) ? `
                <button class="tag-btn" style="color:#ef4444; font-size:9px; padding:1px 4px; margin-top:4px;" onclick="window.handleRemoveMember('${band.id}', '${m.uid}')">Remover</button>
              ` : ''}
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Repertório da Banda (com Tom, BPM, Cifras e Banda Virtual) -->
      <div style="margin-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="font-size:13px; color:#7EE7FF;">🎵 Repertório da Banda (${(band.repertoire || []).length})</h4>
          <button class="tag-btn" onclick="window.openAddSongToRepertoireModal('${band.id}')">+ Adicionar Louvor</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(band.repertoire || []).length === 0 ? `
            <p style="font-size:12px; color:#94a3b8;">Nenhum louvor no repertório ainda.</p>
          ` : (band.repertoire || []).map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
              <div>
                <strong style="color:#fff; font-size:13px;">${escapeHtml(r.title)}</strong>
                <span style="font-size:11px; color:#94a3b8; display:block;">${escapeHtml(r.artist)} • Tom: <strong style="color:#7EE7FF;">${r.key}</strong> • ${r.bpm} BPM • ${r.mode === 'easy' ? '⚡ Easy Play' : '🎵 Cifra'}</span>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="tag-btn" onclick="window.openSongById('${r.songId}')">Ver Cifra</button>
                <button class="tag-btn" style="color:#7EE7FF; border-color:rgba(126,231,255,0.3);" onclick="window.startBandForSong('${r.songId}', ${r.bpm})">🥁 Tocar com Banda</button>
                ${isLeader ? `
                  <button class="tag-btn" style="color:#ef4444;" onclick="window.handleRemoveSongFromRepertoire('${band.id}', '${r.id}')">✕</button>
                ` : ''}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Ensaios Colaborativos Agendados (com Checklist de Integrantes) -->
      <div style="margin-top:24px;">
        <h4 style="font-size:13px; color:#7EE7FF; margin-bottom:10px;">📋 Ensaios Colaborativos</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${(band.rehearsals || []).length === 0 ? `
            <p style="font-size:12px; color:#94a3b8;">Nenhum ensaio agendado para esta equipe.</p>
          ` : (band.rehearsals || []).map(reh => {
            const statusObj = COLLABORATIVE_REHEARSAL_STATUS.find(s => s.id === reh.status) || COLLABORATIVE_REHEARSAL_STATUS[0];
            return `
              <div style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:14px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <div>
                    <span class="pill" style="background:${statusObj.bg}; color:${statusObj.color}; border-color:${statusObj.color}; font-size:10px;">${statusObj.label}</span>
                    <h4 style="font-size:14px; color:#fff; margin-top:4px;">${escapeHtml(reh.title)}</h4>
                    <span style="font-size:11px; color:#94a3b8;">📅 ${reh.date} às ${reh.time} • 📍 ${escapeHtml(reh.location)}</span>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="tag-btn" onclick="window.shareRehearsal('${reh.id}', '${escapeHtml(reh.title)}')">↗ Compartilhar</button>
                    ${isLeader ? `
                      <select class="tag-btn" onchange="window.updateRehearsalStatus('${band.id}', '${reh.id}', this.value)" style="font-size:11px;">
                        ${COLLABORATIVE_REHEARSAL_STATUS.map(st => `<option value="${st.id}" ${st.id === reh.status ? 'selected' : ''}>${st.label}</option>`).join("")}
                      </select>
                    ` : ''}
                  </div>
                </div>

                ${reh.notes ? `<p style="font-size:11px; color:#cbd5e1; margin-top:8px; line-height:1.4;">${escapeHtml(reh.notes)}</p>` : ''}

                <!-- Checklist de Presença por Instrumento -->
                <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px;">
                  <span style="font-size:11px; font-weight:700; color:#7EE7FF; display:block; margin-bottom:6px;">
                    CHECKLIST DE INTEGRANTES & INSTRUMENTOS
                  </span>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:6px;">
                    ${(reh.checklist || []).map(chk => `
                      <div 
                        style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:rgba(255,255,255,0.03); border-radius:8px; cursor:pointer;"
                        onclick="window.toggleChecklist('${band.id}', '${reh.id}', '${chk.uid}')"
                      >
                        <span style="font-size:11px; color:#e2e8f0;">
                          ${chk.confirmed ? '✅' : '⏳'} <strong>${escapeHtml(chk.instrument)}</strong> (${escapeHtml(chk.memberName)})
                        </span>
                        <span style="font-size:9px; color:${chk.confirmed ? '#34d399' : '#94a3b8'};">
                          ${chk.confirmed ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 4. ABA PERFIL MUSICAL 2.0 (EXPANDIDO COM ESTATÍSTICAS E REPUTAÇÃO)
// ---------------------------------------------------------------------
function renderProfileTab({ userProfile, currentUser, isCelestial }) {
  const profile = userProfile || {
    displayName: currentUser?.displayName || "Músico Virtuoso",
    artisticName: "Músico Virtuoso",
    bio: "Músico dedicado ao louvor e excelência instrumental.",
    instruments: ["violao", "vocal"],
    level: "intermediario",
    styles: ["worship", "gospel"],
    location: "São Paulo, SP",
    currentBand: "Ministério Aliança",
    stats: { songsStudied: 14, rehearsalsCompleted: 6, performances: 4, followersCount: 22, followingCount: 12 },
    reputationScore: 180,
    reputationBadge: "Instrumentista Ativo"
  };

  return `
    <div style="margin-top:16px;">
      <!-- Card do Perfil 2.0 -->
      <div style="padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.25); border-radius:18px; text-align:center;">
        <div style="width:72px; height:72px; border-radius:50%; margin:0 auto 10px; background:linear-gradient(135deg, #7EE7FF, #6366f1); display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800; color:#030712; overflow:hidden;">
          ${profile.photoURL ? `<img src="${escapeHtml(profile.photoURL)}" style="width:100%;height:100%;object-fit:cover;" />` : (profile.displayName || "M").charAt(0)}
        </div>

        <h3 style="font-size:18px; color:#fff; font-weight:800;">${escapeHtml(profile.artisticName || profile.displayName)}</h3>
        <p style="font-size:12px; color:#7EE7FF; margin-top:2px;">${profile.level?.toUpperCase() || 'INTERMEDIÁRIO'} • ${escapeHtml(profile.currentBand || 'Sem banda')}</p>

        <!-- Selo Membro Celestial -->
        <div style="margin:10px 0;">
          ${isCelestial ? `
            <span class="badge-celestial" style="font-size:11px; padding:4px 14px;">✦ MEMBRO CELESTIAL ATIVO</span>
          ` : `
            <span class="badge-free" style="font-size:11px;">MEMBRO GRATUITO</span>
          `}
        </div>

        <p style="font-size:12px; color:#cbd5e1; max-width:480px; margin:8px auto; line-height:1.5;">${escapeHtml(profile.bio || "")}</p>

        <!-- Estatísticas Musicais 2.0 -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:16px 0; text-align:center;">
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#7EE7FF;">${profile.stats?.songsStudied || 0}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">Músicas Estudadas</span>
          </div>
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#7EE7FF;">${profile.stats?.rehearsalsCompleted || 0}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">Ensaios Realizados</span>
          </div>
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#7EE7FF;">${profile.stats?.performances || 0}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">Performances</span>
          </div>
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#fff;">${profile.stats?.followersCount || 0}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">Seguidores</span>
          </div>
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#fff;">${profile.stats?.followingCount || 0}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">Seguindo</span>
          </div>
          <div class="tile" style="padding:10px;">
            <strong style="font-size:16px; color:#fbbf24;">${profile.reputationScore || 120}</strong>
            <span style="font-size:10px; color:#94a3b8; display:block;">${profile.reputationBadge || 'Reputação'}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:center; gap:8px;">
          <button class="button primary" style="padding:8px 18px; font-size:12px;" onclick="window.openEditProfileModal()">
            ✏️ Editar Perfil Musical
          </button>
          <button class="button secondary" style="padding:8px 18px; font-size:12px;" onclick="window.shareProfileLink('${currentUser?.uid || 'me'}')">
            ↗ Compartilhar Perfil
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 5. ABA MODERAÇÃO (ADMIN ONLY)
// ---------------------------------------------------------------------
function renderModerationTab({ pendingReports }) {
  return `
    <div style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:15px; color:#ef4444;">🛡️ Painel de Moderação & Denúncias</h3>
        <span class="pill" style="border-color:#ef4444; color:#ef4444;">AUDITORIA ATIVA</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${pendingReports.length === 0 ? `
          <div style="text-align:center; padding:32px 14px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:12px;">
            <span style="font-size:28px; display:block; margin-bottom:6px;">✅</span>
            <strong style="color:#fff; font-size:14px;">Tudo em conformidade</strong>
            <p style="font-size:12px; margin-top:2px;">Nenhuma denúncia pendente de análise no momento.</p>
          </div>
        ` : pendingReports.map(rep => {
          const reasonObj = REPORT_REASONS.find(r => r.id === rep.reason);
          return `
            <div style="padding:12px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); border-radius:12px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <strong style="color:#ef4444; font-size:13px;">[${rep.targetType.toUpperCase()}] Motivo: ${reasonObj ? reasonObj.label : rep.reason}</strong>
                  <span style="font-size:11px; color:#94a3b8; display:block;">Alvo ID: ${rep.targetId} • Denunciante: ${rep.reporterId}</span>
                  ${rep.details ? `<p style="font-size:12px; color:#e2e8f0; margin-top:4px;">"${escapeHtml(rep.details)}"</p>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="button primary" style="background:#ef4444; border:none; padding:4px 10px; font-size:11px;" onclick="window.resolveReportAction('${rep.id}', 'resolved', '${rep.targetType}', '${rep.targetId}')">
                    Excluir Alvo
                  </button>
                  <button class="button secondary" style="padding:4px 10px; font-size:11px;" onclick="window.resolveReportAction('${rep.id}', 'dismissed')">
                    Ignorar
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
