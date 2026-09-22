// =============================================================
// VIRTUO SAFE CLICK SYSTEM
// src/core/safe-click.js
// Prevenção de cliques duplos acidentais, debounce e resposta instantânea
// =============================================================

const lastClickTimes = new WeakMap();
let globalLastClickTime = 0;
const DEFAULT_COOLDOWN_MS = 280;

/**
 * Envolve uma função com proteção contra clique duplo acidental (Debounce/Throttle)
 * @param {Function} handler Função a ser executada
 * @param {number} [cooldownMs=280] Tempo de espera entre cliques repetidos
 * @returns {Function}
 */
export function safeClick(handler, cooldownMs = DEFAULT_COOLDOWN_MS) {
  return function (event, ...args) {
    const now = performance.now();

    // 1. Bloqueio de cliques duplos ultra rápidos em nível de elemento
    const target = event && (event.currentTarget || event.target);
    if (target && typeof target === 'object') {
      const prev = lastClickTimes.get(target);
      if (prev !== undefined && (now - prev < cooldownMs)) {
        if (event && event.preventDefault) event.preventDefault();
        return;
      }
      lastClickTimes.set(target, now);
    } else {
      // 2. Bloqueio global se não houver target do evento
      if (globalLastClickTime > 0 && (now - globalLastClickTime < cooldownMs)) {
        return;
      }
      globalLastClickTime = now;
    }

    try {
      return handler.apply(this, [event, ...args]);
    } catch (err) {
      console.error('[SafeClick Error]', err);
    }
  };
}

/**
 * Registra um evento de clique protegido em um elemento do DOM
 * @param {HTMLElement} element
 * @param {Function} handler
 * @param {number} [cooldownMs=280]
 */
export function attachSafeClick(element, handler, cooldownMs = DEFAULT_COOLDOWN_MS) {
  if (!element || typeof element.addEventListener !== 'function') return;

  // Evita múltiplos listeners idênticos acumulados
  if (element._virtuoSafeClickHandler) {
    element.removeEventListener('click', element._virtuoSafeClickHandler);
  }

  const wrapped = safeClick(handler, cooldownMs);
  element._virtuoSafeClickHandler = wrapped;
  element._virtuoHasListener = true;

  element.addEventListener('click', wrapped);
}

// Expõe globalmente para acesso inline em templates
if (typeof window !== 'undefined') {
  window.safeClick = safeClick;
  window.attachSafeClick = attachSafeClick;
}
