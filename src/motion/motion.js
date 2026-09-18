// =============================================================
// VIRTUO V2.2 — LUXURY MOTION SYSTEM (VDS OFICIAL)
// src/motion/motion.js
// Animações estritamente a 60 FPS utilizando transform, opacity e scale
// NUNCA utiliza propriedades de layout (width, height, top, margin) que causam reflow
// =============================================================

export const MOTION_TIMINGS = {
  button: 120,       // 120ms para botões e toques rápidos
  buttons: 120,
  card: 150,         // 150ms para cards e listas
  cards: 150,
  pulse: 140,        // 140ms para micro-interações de feedback
  modal: 180,        // 180ms para abertura/fechamento de modais
  modals: 180,
  screen: 180,       // 180ms para transição de tela
  hero: 240,         // 240ms para hero transition
  glowBurst: 400,    // 400ms para explosão de glow
  splash: 2400,      // 2400ms para splash screen oficial (V2 Final Polish)
  aura: 10000,       // 8s-12s (média 10s) para ciclo da Aura Celestial
  auraMin: 8000,
  auraMax: 12000
};

export const MOTION_EASINGS = {
  standard: "cubic-bezier(0.16, 1, 0.3, 1)",
  decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",
  accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "ease-in-out"
};

/**
 * Resolve o elemento HTML seguro a partir de elemento ou seletor
 * @param {HTMLElement|string} target 
 * @returns {HTMLElement|null}
 */
function resolveElement(target) {
  if (!target) return null;
  if (typeof target === "string" && typeof document !== "undefined") {
    return document.querySelector(target);
  }
  return target;
}

/**
 * Fade in suave sem reflow (apenas opacity)
 * @param {HTMLElement|string} element 
 * @param {number} duration ms (default: 150)
 * @returns {Promise<void>}
 */
export function fadeIn(element, duration = MOTION_TIMINGS.card) {
  const el = resolveElement(element);
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    if (el.style) {
      el.style.willChange = "opacity";
      el.style.transition = `opacity ${duration}ms ${MOTION_EASINGS.standard}`;
      el.style.opacity = "0";
      
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        setTimeout(() => {
          if (el.style) el.style.willChange = "auto";
          resolve();
        }, duration);
      });
    } else {
      resolve();
    }
  });
}

/**
 * Slide up com fade in suave (apenas transform e opacity)
 * @param {HTMLElement|string} element 
 * @param {number} duration ms (default: 180)
 * @param {number} distancePx distância em pixels do slide (default: 16)
 * @returns {Promise<void>}
 */
export function slideUp(element, duration = MOTION_TIMINGS.modal, distancePx = 16) {
  const el = resolveElement(element);
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    if (el.style) {
      el.style.willChange = "transform, opacity";
      el.style.opacity = "0";
      el.style.transform = `translate3d(0, ${distancePx}px, 0)`;
      el.style.transition = `transform ${duration}ms ${MOTION_EASINGS.standard}, opacity ${duration}ms ${MOTION_EASINGS.standard}`;

      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translate3d(0, 0, 0)";
        setTimeout(() => {
          if (el.style) el.style.willChange = "auto";
          resolve();
        }, duration);
      });
    } else {
      resolve();
    }
  });
}

/**
 * Efeito pulse suave de feedback (apenas transform scale e opacity)
 * Duração padrão: 140ms
 * @param {HTMLElement|string} element 
 * @param {number} duration ms (default: 140)
 * @returns {Promise<void>}
 */
export function pulse(element, duration = MOTION_TIMINGS.pulse) {
  const el = resolveElement(element);
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    if (el.style) {
      el.style.willChange = "transform";
      el.style.transition = `transform ${duration / 2}ms ${MOTION_EASINGS.standard}`;
      el.style.transform = "scale3d(1.04, 1.04, 1)";

      setTimeout(() => {
        if (el.style) {
          el.style.transform = "scale3d(1, 1, 1)";
        }
        setTimeout(() => {
          if (el.style) el.style.willChange = "auto";
          resolve();
        }, duration / 2);
      }, duration / 2);
    } else {
      resolve();
    }
  });
}

/**
 * Micro-interação de pressão de toque em botão/card (120ms)
 * @param {HTMLElement|string} element 
 * @param {number} duration ms (default: 120)
 * @returns {Promise<void>}
 */
export function scalePress(element, duration = MOTION_TIMINGS.button) {
  const el = resolveElement(element);
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    if (el.style) {
      el.style.willChange = "transform";
      el.style.transition = `transform ${duration / 2}ms ${MOTION_EASINGS.standard}`;
      el.style.transform = "scale3d(0.96, 0.96, 1)";

      setTimeout(() => {
        if (el.style) {
          el.style.transform = "scale3d(1, 1, 1)";
        }
        setTimeout(() => {
          if (el.style) el.style.willChange = "auto";
          resolve();
        }, duration / 2);
      }, duration / 2);
    } else {
      resolve();
    }
  });
}

/**
 * Dispara explosão suave de brilho (glow burst) sem reflow
 * Usado em mudança de tom, afinação perfeita ou conexão de Live
 * @param {HTMLElement|string} element 
 * @param {number} duration ms (default: 400)
 * @returns {Promise<void>}
 */
export function glowBurst(element, duration = MOTION_TIMINGS.glowBurst) {
  const el = resolveElement(element);
  if (!el) return Promise.resolve();

  return new Promise((resolve) => {
    if (el.classList && el.classList.add) {
      el.classList.add("virtuo-glow-burst");
      setTimeout(() => {
        if (el.classList && el.classList.remove) {
          el.classList.remove("virtuo-glow-burst");
        }
        resolve();
      }, duration);
    } else {
      resolve();
    }
  });
}

/**
 * Transição fluida entre dois elementos hero (Apenas transform e opacity)
 * @param {HTMLElement|string} fromElement 
 * @param {HTMLElement|string} toElement 
 * @param {number} duration ms (default: 240)
 * @returns {Promise<void>}
 */
export function heroTransition(fromElement, toElement, duration = MOTION_TIMINGS.hero) {
  const fromEl = resolveElement(fromElement);
  const toEl = resolveElement(toElement);

  return new Promise((resolve) => {
    if (fromEl && fromEl.style) {
      fromEl.style.willChange = "opacity, transform";
      fromEl.style.transition = `opacity ${duration / 2}ms ${MOTION_EASINGS.accelerate}, transform ${duration / 2}ms ${MOTION_EASINGS.accelerate}`;
      fromEl.style.opacity = "0";
      fromEl.style.transform = "scale3d(0.95, 0.95, 1)";
    }

    setTimeout(() => {
      if (toEl && toEl.style) {
        toEl.style.willChange = "opacity, transform";
        toEl.style.opacity = "0";
        toEl.style.transform = "scale3d(1.05, 1.05, 1)";
        toEl.style.transition = `opacity ${duration / 2}ms ${MOTION_EASINGS.decelerate}, transform ${duration / 2}ms ${MOTION_EASINGS.decelerate}`;

        requestAnimationFrame(() => {
          toEl.style.opacity = "1";
          toEl.style.transform = "scale3d(1, 1, 1)";
          setTimeout(() => {
            if (fromEl && fromEl.style) fromEl.style.willChange = "auto";
            if (toEl && toEl.style) toEl.style.willChange = "auto";
            resolve();
          }, duration / 2);
        });
      } else {
        resolve();
      }
    }, fromEl ? duration / 2 : 0);
  });
}

/**
 * Virtuo Motion Controller Singleton
 */
export const virtuoMotion = {
  timings: MOTION_TIMINGS,
  easings: MOTION_EASINGS,
  fadeIn,
  slideUp,
  pulse,
  scalePress,
  glowBurst,
  heroTransition
};
