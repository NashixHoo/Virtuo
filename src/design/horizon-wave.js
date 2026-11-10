// =============================================================
// VIRTUO HORIZON WAVE & CONTEXTUAL AURA DISPATCHER
// src/design/horizon-wave.js
// Disparador oficial da assinatura visual Virtuo (Horizon Wave - 600ms)
// e transições de iluminação de aura (Culto, Banda Sincronizada, Missão Concluída)
// =============================================================

export class HorizonWaveManager {
  constructor() {
    this._isWaveActive = false;
  }

  /**
   * Dispara o flash de horizonte azul celestial (600ms)
   * Ativado em: Missão Iniciada, Live Conectado, Mudança de Tom, Check-in Concluído, Primeira Música
   * @param {string} reason - Identificador do gatilho (para telemetria/acessibilidade)
   */
  static triggerHorizonWave(reason = "generic") {
    if (typeof document === "undefined") return;

    // Respeita prefers-reduced-motion
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const container = document.body;
    if (!container) return;

    // Remove classe se já estiver ativa para re-trigger
    container.classList.remove("virtuo-horizon-wave");
    void container.offsetWidth; // Força reflow para reiniciar animação
    container.classList.add("virtuo-horizon-wave");

    setTimeout(() => {
      container.classList.remove("virtuo-horizon-wave");
    }, 620);
  }

  triggerHorizonWave(reason = "generic") {
    return HorizonWaveManager.triggerHorizonWave(reason);
  }

  /**
   * Dispara a transição de iluminação de aura dourada (2s) e retorna ao azul
   * @param {HTMLElement} element - Elemento alvo (ou document.body)
   */
  static triggerMissionGold(element = null) {
    if (typeof document === "undefined") return;

    const target = element || document.body;
    if (!target) return;

    target.classList.remove("virtuo-aura-gold-reward");
    void target.offsetWidth;
    target.classList.add("virtuo-aura-gold-reward");

    setTimeout(() => {
      target.classList.remove("virtuo-aura-gold-reward");
    }, 2050);
  }

  static triggerMissionCompleteGold(element = null) {
    return HorizonWaveManager.triggerMissionGold(element);
  }

  triggerMissionGold(element = null) {
    return HorizonWaveManager.triggerMissionGold(element);
  }

  triggerMissionCompleteGold(element = null) {
    return HorizonWaveManager.triggerMissionGold(element);
  }

  /**
   * Ativa ou desativa a aura de culto contínua no elemento raiz
   */
  static setCultoAura(enable = true) {
    if (typeof document === "undefined" || !document.body) return;
    if (enable) {
      document.body.classList.add("virtuo-aura-culto");
    } else {
      document.body.classList.remove("virtuo-aura-culto");
    }
  }

  static triggerCultoAura(enable = true) {
    return HorizonWaveManager.setCultoAura(enable);
  }

  setCultoAura(enable = true) {
    return HorizonWaveManager.setCultoAura(enable);
  }

  triggerCultoAura(enable = true) {
    return HorizonWaveManager.setCultoAura(enable);
  }
}

export const virtuoWave = new HorizonWaveManager();
