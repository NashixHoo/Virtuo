// =============================================================
// VIRTUO EXPERIENCE SYSTEM — VIRTUO AURA AMBIENTE V3
// src/features/aura/aura-controller.js
// Ciclo de 8s a 12s com névoa, brilho e feixes suaves
// Respeita rigorosamente prefers-reduced-motion
// =============================================================

export class VirtuoAuraController {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    this.isRunning = false;
    this.cycleDuration = 10000; // 10 segundos (ciclo canônico de 8s a 12s)
  }

  /**
   * Inicializa o container e as camadas da Aura Ambiente no DOM
   */
  init() {
    if (this.isInitialized || typeof document === 'undefined') return;

    let el = document.getElementById('virtuo-aura-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'virtuo-aura-container';
      el.className = 'virtuo-aura-ambient';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <div class="virtuo-aura-mist" id="virtuo-aura-mist-layer"></div>
        <div class="virtuo-aura-glow" id="virtuo-aura-glow-layer"></div>
        <div class="virtuo-aura-beams" id="virtuo-aura-beams-layer"></div>
      `;
      // Insere no início do body para ficar sob o conteúdo
      document.body.insertBefore(el, document.body.firstChild);
    }

    this.container = el;
    this.isInitialized = true;
    this.isRunning = true;
  }

  /**
   * Pausa ou retoma temporariamente os efeitos dinâmicos
   */
  pause() {
    if (this.container) {
      this.container.style.animationPlayState = 'paused';
    }
    this.isRunning = false;
  }

  resume() {
    if (this.container) {
      this.container.style.animationPlayState = 'running';
    }
    this.isRunning = true;
  }

  /**
   * Ajusta a intensidade luminescente da Aura
   * @param {'subtle' | 'standard' | 'intense'} level 
   */
  setIntensity(level = 'standard') {
    if (!this.container) return;
    const opacities = {
      subtle: '0.45',
      standard: '0.75',
      intense: '1.0'
    };
    this.container.style.opacity = opacities[level] || '0.75';
  }
}

export const virtuoAura = new VirtuoAuraController();
