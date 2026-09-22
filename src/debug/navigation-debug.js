// =============================================================
// VIRTUO NAVIGATION & INTERACTION DEBUGGER
// src/debug/navigation-debug.js
// Diagnóstico automático de botões, rotas, listeners e overlays
// =============================================================

export class NavigationDebugger {
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.analyzedCount = 0;
    this.elementsWithoutListener = [];
    this.detectedOverlays = [];
    this.brokenRoutes = [];
    this.observedElements = new WeakSet();
    this.observer = null;
  }

  /**
   * Inicializa a instrumentação no ambiente de navegador
   */
  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return this;
    }

    console.log('%c[Virtuo Debug] Modo Diagnóstico de Navegação Ativado', 'color:#7EE7FF; font-weight:bold; font-size:12px;');

    // 1. Instrumenta todos os elementos existentes
    this.instrumentAll();

    // 2. Observa mudanças no DOM (quando novas telas são renderizadas)
    this.observer = new MutationObserver(() => {
      this.instrumentAll();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 3. Detecta overlays ativos
    this.detectOverlays();

    // Adiciona ao escopo global para inspeção manual
    window.virtuoNavDebug = this;

    return this;
  }

  /**
   * Instrumenta elementos interativos
   */
  instrumentAll() {
    if (typeof document === 'undefined') return;

    const selectors = [
      'button',
      'a',
      '[role="button"]',
      '.tile',
      '.tabbar button',
      '.quick-action',
      '.card-action',
      '.ai-header-btn'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    this.analyzedCount = elements.length;
    this.elementsWithoutListener = [];

    elements.forEach((el) => {
      const hasListener = this.hasInteractiveListener(el);

      if (!hasListener) {
        this.elementsWithoutListener.push({
          id: el.id || '(sem id)',
          tag: el.tagName.toLowerCase(),
          className: el.className || '(sem classe)',
          text: (el.textContent || '').trim().slice(0, 30)
        });

        // 4. Destaque visual apenas em modo debug
        if (this.enabled) {
          el.style.outline = '1px solid rgba(239, 68, 68, 0.75)';
          el.style.outlineOffset = '2px';
        }
      } else if (this.enabled && el.style.outline) {
        // Remove destaque se agora tiver listener
        el.style.outline = '';
      }

      // Adiciona listener de captura para registrar cliques
      if (!this.observedElements.has(el)) {
        this.observedElements.add(el);

        const handleInteraction = (e) => {
          const currentScreen = window.currentScreen || 'desconhecida';
          const listenerDesc = this.getListenerDescription(el);

          console.groupCollapsed(`%c[Virtuo Touch] <${el.tagName.toLowerCase()}> ${el.id ? '#' + el.id : ''}`, 'color:#57A9FF; font-weight:bold;');
          console.log('ID:', el.id || '(sem id)');
          console.log('Classe:', el.className || '(sem classe)');
          console.log('Tela Atual:', currentScreen);
          console.log('Listener Encontrado:', listenerDesc);
          console.log('Elemento:', el);
          console.groupEnd();
        };

        el.addEventListener('click', handleInteraction, { capture: true });
      }
    });

    return {
      total: this.analyzedCount,
      withoutListener: this.elementsWithoutListener.length
    };
  }

  /**
   * Avalia se um elemento possui manipulador interativo
   */
  hasInteractiveListener(el) {
    if (!el) return false;

    // 1. Inline onclick ou on*
    if (el.onclick || el.getAttribute('onclick')) return true;

    // 2. Links com href válido
    if (el.tagName === 'A' && el.getAttribute('href')) {
      const href = el.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:void')) return true;
    }

    // 3. Inputs do tipo submit / button / file
    if (el.tagName === 'INPUT' && ['submit', 'button', 'file'].includes(el.type)) return true;

    // 4. Elementos que possuem data-action ou data-route
    if (el.dataset && (el.dataset.action || el.dataset.route || el.dataset.screen)) return true;

    // 5. Botões em formulários nativos
    if (el.tagName === 'BUTTON' && (el.type === 'submit' || el.form)) return true;

    // 6. Elementos com evento registrado manualmente
    if (el._virtuoHasListener) return true;

    return false;
  }

  /**
   * Retorna descrição legível do listener do elemento
   */
  getListenerDescription(el) {
    if (el.getAttribute('onclick')) {
      return `onclick="${el.getAttribute('onclick')}"`;
    }
    if (el.onclick) {
      return 'function() { [native/inline code] }';
    }
    if (el.tagName === 'A' && el.getAttribute('href')) {
      return `href="${el.getAttribute('href')}"`;
    }
    if (el.dataset?.action) {
      return `data-action="${el.dataset.action}"`;
    }
    return '(nenhum listener inline detectado)';
  }

  /**
   * 5. Detecta overlays que podem bloquear a interação
   */
  detectOverlays() {
    if (typeof document === 'undefined') return [];

    this.detectedOverlays = [];
    const all = document.querySelectorAll('*');

    all.forEach((el) => {
      // Ignora nós invisíveis ou do sistema
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;

      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (!style) return;

      const pos = style.position;
      const zIndex = parseInt(style.zIndex, 10);
      const pointerEvents = style.pointerEvents;
      const display = style.display;
      const opacity = parseFloat(style.opacity);

      // position:fixed, zIndex > 1000, pointerEvents !== 'none', visível
      if (
        (pos === 'fixed' || pos === 'absolute') &&
        !isNaN(zIndex) &&
        zIndex > 1000 &&
        pointerEvents !== 'none' &&
        display !== 'none' &&
        opacity > 0
      ) {
        // Exceções conhecidas e legítimas da UI: tabbar, modais abertos, menus
        const isLegitModal = el.classList.contains('modal') || el.classList.contains('popup') || el.id.includes('modal');
        const isPulse = el.id === 'virtuo-pulse-container';

        if (!isLegitModal && !isPulse) {
          this.detectedOverlays.push({
            id: el.id || '(sem id)',
            className: el.className || '(sem classe)',
            zIndex,
            pointerEvents,
            tag: el.tagName.toLowerCase()
          });
        }
      }
    });

    if (this.detectedOverlays.length > 0) {
      console.warn('[Virtuo Debug] Overlays potencialmente bloqueantes detectados:', this.detectedOverlays);
    } else {
      console.log('[Virtuo Debug] Nenhum overlay bloqueante detectado.');
    }

    return this.detectedOverlays;
  }

  /**
   * 6 & 7. Validação do Router e Rotas Principais
   */
  testRoutes(routerFn = null) {
    const fn = routerFn || (typeof window !== 'undefined' ? window.show : null);
    const routesToTest = [
      'home',
      'live',
      'missions',
      'library',
      'ensaio',
      'band',
      'comunidade',
      'profile'
    ];

    this.brokenRoutes = [];
    const results = {};

    routesToTest.forEach((route) => {
      try {
        if (typeof fn === 'function') {
          // Testa chamada segura
          fn(route);
          results[route] = { status: 'OK' };
        } else {
          results[route] = { status: 'ERROR', error: 'Router function not found' };
          this.brokenRoutes.push({ route, error: 'Router function not found' });
        }
      } catch (err) {
        results[route] = { status: 'ERROR', error: err.message };
        this.brokenRoutes.push({ route, error: err.message });
      }
    });

    return {
      tested: routesToTest.length,
      broken: this.brokenRoutes,
      results
    };
  }

  /**
   * Gera relatório estruturado para diagnóstico
   */
  generateReport() {
    return {
      totalAnalyzed: this.analyzedCount,
      withoutListener: this.elementsWithoutListener,
      overlays: this.detectedOverlays,
      brokenRoutes: this.brokenRoutes
    };
  }
}

export const navigationDebugger = new NavigationDebugger();
