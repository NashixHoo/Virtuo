// =============================================================
// VIRTUO UI HEALTH & INTERACTION AUDITOR
// src/debug/ui-health.js
// Diagnóstico automático permanente de botões, overlays, z-index e pointer-events
// =============================================================

export class UIHealthAuditor {
  constructor(options = {}) {
    this.isDebug = options.isDebug !== undefined ? options.isDebug : (
      typeof window !== 'undefined' &&
      (window.location?.search?.includes('debug') || window.localStorage?.getItem('virtuo_debug_mode') === 'true')
    );
    this.report = {
      buttonsWithoutListener: [],
      blockingOverlays: [],
      invisibleClickables: [],
      zindexAnomalies: [],
      pointerEventsIssues: []
    };
  }

  /**
   * Executa a auditoria completa de saúde da interface
   */
  audit() {
    if (typeof document === 'undefined') return this.report;

    this.report = {
      buttonsWithoutListener: [],
      blockingOverlays: [],
      invisibleClickables: [],
      zindexAnomalies: [],
      pointerEventsIssues: []
    };

    // 1. Auditoria de botões e itens interativos
    const interactives = document.querySelectorAll('button, a, [role="button"], .tile, .tabbar button, .quick-action, .card-action, .ai-header-btn');
    
    interactives.forEach((el) => {
      const hasOnclick = Boolean(el.onclick || el.getAttribute('onclick'));
      const hasHref = el.tagName === 'A' && Boolean(el.getAttribute('href'));
      const hasSafeClick = Boolean(el._virtuoSafeClickHandler || el._virtuoHasListener);
      const isSubmit = el.tagName === 'BUTTON' && (el.type === 'submit' || el.form);

      const isInteractive = hasOnclick || hasHref || hasSafeClick || isSubmit;

      if (!isInteractive) {
        this.report.buttonsWithoutListener.push({
          id: el.id || '(sem-id)',
          tag: el.tagName.toLowerCase(),
          className: el.className || '',
          text: (el.textContent || '').trim().slice(0, 25)
        });

        if (this.isDebug) {
          el.style.outline = '1px solid rgba(239, 68, 68, 0.75)';
          el.style.outlineOffset = '2px';
        }
      }

      // 2. Elementos invisíveis com hitbox ativa
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style) {
        const opacity = parseFloat(style.opacity);
        const display = style.display;
        const visibility = style.visibility;

        if (display !== 'none' && visibility !== 'hidden' && opacity === 0 && !el.classList.contains('visually-hidden') && el.tagName !== 'INPUT') {
          this.report.invisibleClickables.push({
            id: el.id,
            tag: el.tagName
          });
        }
      }
    });

    // 3. Detecção de overlays que bloqueiam toque
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      if (['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName)) return;
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (!style) return;

      const pos = style.position;
      const zIndex = parseInt(style.zIndex, 10);
      const pointerEvents = style.pointerEvents;
      const opacity = parseFloat(style.opacity);
      const display = style.display;

      // Detecta z-index excessivo cobrindo a tela
      if (
        (pos === 'fixed' || pos === 'absolute') &&
        !isNaN(zIndex) &&
        zIndex >= 1000 &&
        pointerEvents !== 'none' &&
        display !== 'none' &&
        opacity > 0
      ) {
        // Exceções conhecidas de UI
        const isTabbar = el.classList.contains('tabbar') || el.closest('.tabbar');
        const isHeader = el.tagName === 'HEADER' || el.closest('header');
        const isModal = el.classList.contains('modal') || el.id?.includes('modal');
        const isPulse = el.id === 'virtuo-pulse-container';

        if (!isTabbar && !isHeader && !isModal && !isPulse) {
          this.report.blockingOverlays.push({
            id: el.id || '(sem-id)',
            className: el.className || '',
            zIndex,
            pointerEvents,
            tag: el.tagName.toLowerCase()
          });
        }
      }

      // Detecta elemento de background interceptando toque
      if (el.classList.contains('background') || el.id === 'virtuo-fixed-horizon-glow') {
        if (pointerEvents !== 'none') {
          this.report.pointerEventsIssues.push({
            id: el.id,
            className: el.className,
            issue: 'Fundo decorativo deve ter pointer-events: none'
          });
          el.style.pointerEvents = 'none';
        }
      }
    });

    return this.report;
  }
}

export const uiHealthAuditor = new UIHealthAuditor();
if (typeof window !== 'undefined') {
  window.uiHealthAuditor = uiHealthAuditor;
}
