// =============================================================
// VIRTUO MINISTER MODE: AUTO-SCROLL ENGINE
// src/features/minister/auto-scroll.js
// Rolagem contínua, suave e precisa a 60fps usando requestAnimationFrame
// =============================================================

export const SCROLL_SPEEDS = {
  slow: { id: "slow", label: "Lento", pxPerSec: 24 },
  normal: { id: "normal", label: "Normal", pxPerSec: 48 },
  fast: { id: "fast", label: "Rápido", pxPerSec: 88 }
};

export class AutoScrollController {
  /**
   * @param {HTMLElement|Window} scrollTarget - Elemento com overflow-y para rolar
   * @param {Function} [onStateChange] - Callback chamado quando o estado muda (isPlaying, speed)
   */
  constructor(scrollTarget, onStateChange = null) {
    this.scrollTarget = scrollTarget;
    this.onStateChange = onStateChange;

    this.isPlaying = false;
    this.speedKey = "normal"; // 'slow' | 'normal' | 'fast'
    this.customPxPerSec = SCROLL_SPEEDS.normal.pxPerSec;

    this._rafId = null;
    this._lastTimestamp = null;
    this._accumulatedScroll = 0;

    this._boundTick = this._tick.bind(this);
  }

  setTarget(element) {
    this.stop();
    this.scrollTarget = element;
  }

  getSpeed() {
    return this.speedKey;
  }

  setSpeed(speedKey) {
    if (SCROLL_SPEEDS[speedKey]) {
      this.speedKey = speedKey;
      this.customPxPerSec = SCROLL_SPEEDS[speedKey].pxPerSec;
      this._notify();
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._lastTimestamp = performance.now();
    this._accumulatedScroll = this._getScrollTop();
    this._rafId = requestAnimationFrame(this._boundTick);
    this._notify();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastTimestamp = null;
    this._notify();
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop() {
    this.pause();
    this._setScrollTop(0);
    this._accumulatedScroll = 0;
    this._notify();
  }

  destroy() {
    this.pause();
    this.scrollTarget = null;
    this.onStateChange = null;
  }

  _getScrollTop() {
    if (!this.scrollTarget) return 0;
    const hasWindow = typeof window !== "undefined";
    const hasDoc = typeof document !== "undefined";
    if (hasWindow && (this.scrollTarget === window || (hasDoc && this.scrollTarget === document.body))) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return this.scrollTarget.scrollTop || 0;
  }

  _setScrollTop(val) {
    if (!this.scrollTarget) return;
    const hasWindow = typeof window !== "undefined";
    const hasDoc = typeof document !== "undefined";
    if (hasWindow && (this.scrollTarget === window || (hasDoc && this.scrollTarget === document.body))) {
      window.scrollTo({ top: val, behavior: "auto" });
    } else {
      this.scrollTarget.scrollTop = val;
    }
  }

  _getMaxScroll() {
    if (!this.scrollTarget) return 0;
    const hasWindow = typeof window !== "undefined";
    const hasDoc = typeof document !== "undefined";
    if (hasWindow && (this.scrollTarget === window || (hasDoc && this.scrollTarget === document.body))) {
      return (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    }
    return (this.scrollTarget.scrollHeight || 0) - (this.scrollTarget.clientHeight || 0);
  }

  _tick(currentTimestamp) {
    if (!this.isPlaying) return;

    if (!this._lastTimestamp) {
      this._lastTimestamp = currentTimestamp;
    }

    const deltaSec = (currentTimestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = currentTimestamp;

    // Incrementa a posição calculada de rolagem
    const deltaPixels = this.customPxPerSec * deltaSec;
    const currentActual = this._getScrollTop();

    // Se o usuário rolou manualmente, sincroniza o acumulador
    if (Math.abs(currentActual - this._accumulatedScroll) > 30) {
      this._accumulatedScroll = currentActual;
    }

    this._accumulatedScroll += deltaPixels;
    const maxScroll = this._getMaxScroll();

    if (this._accumulatedScroll >= maxScroll) {
      this._setScrollTop(maxScroll);
      this.pause(); // Chegou ao fim da cifra
      return;
    }

    this._setScrollTop(this._accumulatedScroll);
    this._rafId = requestAnimationFrame(this._boundTick);
  }

  _notify() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange({
        isPlaying: this.isPlaying,
        speed: this.speedKey,
        pxPerSec: this.customPxPerSec
      });
    }
  }
}
