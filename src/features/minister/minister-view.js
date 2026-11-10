// =============================================================
// VIRTUO MINISTER MODE: VIEW COMPONENT
// src/features/minister/minister-view.js
// Template visual e renderizador da interface de palco Apple-Class/Celestial
// =============================================================

import { renderMinisterMetronomePanel } from "../../audio/metronome-view.js";

/**
 * Escapa strings HTML contra XSS
 */
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
 * Renderiza os blocos da estrutura da música (ex: Intro • Verso 1 • Refrão • Ponte)
 */
export function renderStructureBadges(structureText) {
  if (!structureText) return "";
  const parts = structureText.split(/•|-|,|\/|\|/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  return `
    <div class="minister-structure-track" id="minister-structure-track" aria-label="Estrutura da Música">
      <span class="minister-structure-label">ESTRUTURA:</span>
      <div class="minister-structure-pills">
        ${parts.map((p, idx) => `
          <span class="minister-part-pill ${idx === 0 ? 'first' : ''}">
            <span class="part-index">${idx + 1}</span>
            <span class="part-name">${escapeHtml(p)}</span>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Renderiza o container completo do Modo Ministro.
 * 
 * @param {Object} state
 * @returns {string} HTML markup
 */
export function renderMinisterStage(state) {
  const {
    song,
    currentKey,
    originalKey,
    transposeOffset,
    isEasyPlay,
    autoScrollPlaying,
    autoScrollSpeed,
    fontSize,
    isFullscreen,
    formattedChordsHtml,
    showMetronomePanel = false,
    metronomeState = null
  } = state;

  return `
    <div id="minister-stage-container" class="minister-stage ${isFullscreen ? 'is-fullscreen' : ''}">
      <!-- Barra Superior de Performance (Cabeçalho Discreto) -->
      <header class="minister-top-bar">
        <div class="minister-top-left">
          <button class="minister-btn-back" onclick="window.VirtuoMinister.close()" title="Sair do Modo Ministro (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Sair</span>
          </button>

          <div class="minister-song-meta">
            <h1 class="minister-song-title">${escapeHtml(song.title)}</h1>
            <div class="minister-song-sub">
              <span class="minister-artist-name">${escapeHtml(song.artist || "Virtuo Worship")}</span>
              <span class="minister-meta-dot">•</span>
              <span class="minister-bpm-badge" title="Batimentos Por Minuto">
                <span class="bpm-pulse"></span>
                <strong>${song.bpm || 74}</strong> BPM
              </span>
              <span class="minister-meta-dot">•</span>
              <span class="minister-key-indicator">
                Tom: <strong class="minister-key-strong">${escapeHtml(currentKey)}</strong>
                ${transposeOffset !== 0 ? `<span class="minister-offset-tag">(${transposeOffset > 0 ? '+' : ''}${transposeOffset})</span>` : ''}
              </span>
              ${isEasyPlay ? `<span class="minister-easy-badge">⚡ EASY PLAY</span>` : ''}
              ${(song && song.capo && Number(song.capo) > 0) ? `
                <span class="minister-meta-dot">•</span>
                <span class="minister-capo-badge" id="minister-capo-badge" title="Posição do Capotraste">
                  🎸 CAPO ${song.capo}ª CASA
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="minister-top-right">
          <!-- Atalho de Ajuste de Tamanho de Fonte -->
          <div class="minister-font-sizer" title="Tamanho do Texto da Cifra">
            <button class="minister-sizer-btn" onclick="window.VirtuoMinister.adjustFontSize(-1)" aria-label="Diminuir fonte">A−</button>
            <button class="minister-sizer-btn" onclick="window.VirtuoMinister.adjustFontSize(1)" aria-label="Aumentar fonte">A+</button>
          </div>

          <!-- Botão Tela Cheia -->
          <button class="minister-btn-fullscreen" onclick="window.VirtuoMinister.toggleFullscreen()" title="Alternar Tela Cheia (F)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${isFullscreen 
                ? '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>'
                : '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'}
            </svg>
            <span class="fs-text">${isFullscreen ? 'Restaurar' : 'Tela Cheia'}</span>
          </button>
        </div>
      </header>

      <!-- Trilho de Estrutura da Música (Visualização de Partes) -->
      ${renderStructureBadges(song.structure)}

      <!-- Área Principal de Leitura da Cifra (Scrollável) -->
      <main class="minister-scroll-canvas" id="minister-scroll-canvas" style="font-size: ${fontSize}px;">
        <div class="minister-cifra-wrapper">
          <div class="cifra-pre minister-cifra-text" id="minister-cifra-content">${formattedChordsHtml}</div>
        </div>
      </main>

      <!-- Painel Popover / Drawer do Metrônomo no Palco -->
      ${showMetronomePanel && metronomeState ? `
        <div class="minister-metro-popover-wrapper" id="minister-metro-wrapper">
          ${renderMinisterMetronomePanel(metronomeState, song.bpm || 74)}
        </div>
      ` : ''}

      <!-- Barra Flutuante de Controle no Rodapé (Celestial Stage Dock) -->
      <footer class="minister-dock" id="minister-dock">
        <div class="minister-dock-inner">
          
          <!-- 1. Bloco de Transposição de Tom: [-] TOM [+] -->
          <div class="dock-segment dock-tone-group">
            <div class="minister-stepper">
              <button class="minister-stepper-btn" onclick="window.VirtuoMinister.changeKey(-1)" title="Baixar tom (−1 semitom)" aria-label="Baixar 1 semitom">−</button>
              <div class="minister-stepper-center" title="Tom Atual">
                <span class="stepper-title">TOM</span>
                <span class="stepper-value" id="dock-current-key">${escapeHtml(currentKey)}</span>
              </div>
              <button class="minister-stepper-btn" onclick="window.VirtuoMinister.changeKey(1)" title="Subir tom (+1 semitom)" aria-label="Subir 1 semitom">+</button>
            </div>

            ${transposeOffset !== 0 ? `
              <button class="minister-btn-reset-key" onclick="window.VirtuoMinister.resetKey()" title="Voltar ao tom original (${escapeHtml(originalKey)})">
                ↺ Orig (${escapeHtml(originalKey)})
              </button>
            ` : ''}
          </div>

          <div class="dock-divider"></div>

          <!-- 2. Bloco Modo: [ Cifra Original ] [ Easy Play ] -->
          <div class="dock-segment dock-version-group">
            <div class="minister-segmented">
              <button class="minister-seg-btn ${!isEasyPlay ? 'active' : ''}" onclick="window.VirtuoMinister.setMode('original')" title="Exibir Cifra Completa Original">
                ORIGINAL
              </button>
              <button class="minister-seg-btn ${isEasyPlay ? 'active' : ''}" onclick="window.VirtuoMinister.setMode('easy')" title="Exibir Versão Simplificada Easy Play">
                ⚡ EASY PLAY
              </button>
            </div>
          </div>

          <div class="dock-divider"></div>

          <!-- 3. Bloco Auto-Scroll: Play/Pause, Stop e Velocidade -->
          <div class="dock-segment dock-autoscroll-group">
            <div class="autoscroll-action-btns">
              <!-- Play / Pause -->
              <button class="minister-dock-btn play-btn ${autoScrollPlaying ? 'is-playing' : ''}" onclick="window.VirtuoMinister.toggleAutoScroll()" title="Iniciar / Pausar Auto-Scroll (Espaço)">
                ${autoScrollPlaying 
                  ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Pausar</span>`
                  : `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Iniciar</span>`}
              </button>

              <!-- Stop / Reset to top -->
              <button class="minister-dock-btn stop-btn" onclick="window.VirtuoMinister.stopAutoScroll()" title="Parar e voltar ao topo" aria-label="Parar e voltar ao topo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                <span>Parar</span>
              </button>
            </div>

            <!-- Velocidade: Lento / Normal / Rápido -->
            <div class="minister-speed-selector" title="Velocidade de rolagem">
              <button class="speed-btn ${autoScrollSpeed === 'slow' ? 'active' : ''}" onclick="window.VirtuoMinister.setScrollSpeed('slow')">Lento</button>
              <button class="speed-btn ${autoScrollSpeed === 'normal' ? 'active' : ''}" onclick="window.VirtuoMinister.setScrollSpeed('normal')">Normal</button>
              <button class="speed-btn ${autoScrollSpeed === 'fast' ? 'active' : ''}" onclick="window.VirtuoMinister.setScrollSpeed('fast')">Rápido</button>
            </div>
          </div>

          <div class="dock-divider"></div>

          <!-- 4. Bloco Metrônomo de Palco: 🥁 Metrônomo -->
          <div class="dock-segment dock-metro-group">
            <button class="minister-dock-btn metro-trigger-btn ${showMetronomePanel ? 'active' : ''} ${metronomeState && metronomeState.isPlaying ? 'playing' : ''}" onclick="window.VirtuoMinister.toggleMetronomePanel()" title="Abrir Metrônomo Nativo (M)">
              <span class="metro-dock-icon">🥁</span>
              <span>Metrônomo</span>
              ${metronomeState && metronomeState.isPlaying ? `<span class="metro-dot-live"></span>` : ''}
            </button>
          </div>

          <!-- 5. Fechar / Voltar na extremidade direita do Dock -->
          <div class="dock-segment dock-exit-group">
            <button class="minister-dock-btn-close" onclick="window.VirtuoMinister.close()" title="Sair do Modo Ministro (Esc)" aria-label="Sair do Modo Ministro">
              ✕
            </button>
          </div>

        </div>
      </footer>
    </div>
  `;
}
