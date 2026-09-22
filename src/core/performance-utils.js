// =============================================================
// VIRTUO PERFORMANCE & OPTIMIZATION UTILS (60 FPS)
// src/core/performance-utils.js
// Debounce, memoização, requestAnimationFrame e limpeza de listeners órfãos
// =============================================================

/**
 * Cria uma versão com debounce de uma função
 * @param {Function} fn 
 * @param {number} waitMs 
 */
export function debounce(fn, waitMs = 200) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, waitMs);
  };
}

/**
 * Memoiza funções puras ou computações intensivas
 * @param {Function} fn 
 */
export function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Executa uma atualização acelerada de interface no próximo frame (60 FPS)
 * @param {Function} callback 
 */
export function nextFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16);
}

/**
 * Gerenciador de listeners com registro e expurgo automático de órfãos
 */
export class SafeEventListenerManager {
  constructor() {
    this.tracked = [];
  }

  add(element, eventType, handler, options = false) {
    if (!element || typeof element.addEventListener !== 'function') return;
    element.addEventListener(eventType, handler, options);
    this.tracked.push({ element, eventType, handler, options });
  }

  /**
   * Remove todos os listeners registrados
   */
  cleanup() {
    this.tracked.forEach(({ element, eventType, handler, options }) => {
      try {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(eventType, handler, options);
        }
      } catch (e) {}
    });
    this.tracked = [];
  }
}

export const safeEventManager = new SafeEventListenerManager();
