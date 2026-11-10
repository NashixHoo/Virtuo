// =============================================================
// VIRTUO EXPERIENCE SYSTEM — VIRTUO PULSE
// src/features/pulse/pulse.js
// Cápsula flutuante de status dinâmico e contextual no topo da interface
// Altura máxima: 44px | Animação: 120–180ms | Desaparece sem contexto
// =============================================================

import { DESIGN_TOKENS } from "../../design/design-system.js";
import { virtuoConductor, CONDUCTOR_EVENTS } from "../../audio/virtuo-conductor.js";
import { HorizonWaveManager } from "../../design/horizon-wave.js";

export const PULSE_STATES = {
  SONG_ACTIVE: 'song_active',
  LIVE: 'live',
  KEY_SYNCED: 'key_synced',
  NEW_MISSION: 'new_mission',
  REHEARSAL_STARTED: 'rehearsal_started',
  SECTION_ACTIVE: 'section_active'
};

export class VirtuoPulseController {
  constructor() {
    this.currentState = null;
    this.data = {};
    this.subscribers = new Set();
    this.autoDismissTimer = null;
  }

  /**
   * Define um novo estado ativo para o Pulse
   * @param {string} state - Um dos valores de PULSE_STATES
   * @param {Object} [data] - Metadados contextuais (título, tom, contagem, etc.)
   * @param {number} [autoDismissMs] - Tempo opcional para fechamento automático
   */
  setState(state, data = {}, autoDismissMs = 0) {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    this.currentState = state;
    this.data = data || {};
    this._notify();

    if (autoDismissMs > 0) {
      this.autoDismissTimer = setTimeout(() => {
        this.clear();
      }, autoDismissMs);
    }
  }

  /**
   * Limpa o estado ativo; a cápsula desaparece suavemente
   */
  clear() {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    this.currentState = null;
    this.data = {};
    this._notify();
  }

  /**
   * Retorna o estado atual
   */
  getState() {
    return {
      state: this.currentState,
      data: this.data,
      isActive: Boolean(this.currentState)
    };
  }

  /**
   * Inscreve um callback para ser notificado de mudanças no Pulse
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.getState());
      } catch (err) {
        console.error('[Virtuo Pulse] Erro no assinante:', err);
      }
    });

    if (typeof document !== 'undefined') {
      this.updateDom();
    }
  }

  /**
   * Atualiza o elemento no DOM com animação entre 120ms e 180ms
   */
  updateDom() {
    const container = document.getElementById('virtuo-pulse-container');
    if (!container) return;

    if (!this.currentState) {
      container.style.opacity = '0';
      container.style.transform = 'translate(-50%, -10px) scale(0.96)';
      container.style.pointerEvents = 'none';
      setTimeout(() => {
        if (!this.currentState && container) {
          container.innerHTML = '';
        }
      }, 160);
      return;
    }

    container.innerHTML = this.renderContent();
    container.style.pointerEvents = 'auto';
    // Força reflow suave para animação fluida (160ms)
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'translate(-50%, 0) scale(1)';
    });
  }

  /**
   * Gera o conteúdo HTML interno da cápsula
   */
  renderContent() {
    if (!this.currentState) return '';

    let icon = '✦';
    let badgeText = 'VIRTUO';
    let message = '';
    let clickHandler = '';
    let badgeColor = DESIGN_TOKENS.colors.celestialBlue;

    switch (this.currentState) {
      case PULSE_STATES.SONG_ACTIVE:
        icon = '🎵';
        badgeText = 'TOCANDO';
        message = `${this.data.title || 'Música'} • Tom ${this.data.key || 'Original'}`;
        clickHandler = this.data.id ? `window.openSongById('${this.data.id}')` : `show('library')`;
        break;

      case PULSE_STATES.LIVE:
        icon = '🔴';
        badgeText = 'AO VIVO';
        badgeColor = '#ef4444';
        message = `${this.data.title || 'Modo Palco Ativo'}`;
        clickHandler = `window.openMinisterModeQuick()`;
        break;

      case PULSE_STATES.KEY_SYNCED:
        icon = '⚡';
        badgeText = 'TOM SINCRONIZADO';
        badgeColor = DESIGN_TOKENS.colors.goldPremium;
        message = `Tom atualizado para ${this.data.key || 'C'}`;
        clickHandler = `show('library')`;
        break;

      case PULSE_STATES.NEW_MISSION:
        icon = '📋';
        badgeText = 'NOVA MISSÃO';
        badgeColor = DESIGN_TOKENS.colors.goldPremium;
        message = `${this.data.title || 'Missão Agendada'}`;
        clickHandler = `show('ensaio')`;
        break;

      case PULSE_STATES.REHEARSAL_STARTED:
        icon = '🎸';
        badgeText = 'ENSAIO ATIVO';
        message = `${this.data.title || 'Sessão em andamento'}`;
        clickHandler = `show('ensaio')`;
        break;

      case PULSE_STATES.SECTION_ACTIVE:
        icon = '🎵';
        badgeText = (this.data.section || 'SEÇÃO').toUpperCase();
        badgeColor = DESIGN_TOKENS.colors.celestialBlue;
        message = `Intensidade ${this.data.intensity || 2}/5`;
        clickHandler = `show('ensaio')`;
        break;

      default:
        icon = '✦';
        badgeText = 'STATUS';
        message = this.data.text || '';
        break;
    }

    return `
      <div 
        class="virtuo-pulse-capsule"
        role="status"
        aria-live="polite"
        onclick="${clickHandler}"
        style="
          max-height: ${DESIGN_TOKENS.layout.pulseMaxHeight};
          height: ${DESIGN_TOKENS.layout.pulseMaxHeight};
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          background: rgba(7, 16, 31, 0.88);
          border: 1px solid rgba(126, 231, 255, 0.28);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55), 0 0 16px rgba(126, 231, 255, 0.15);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: ${DESIGN_TOKENS.radii.pill};
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          box-sizing: border-box;
        "
      >
        <span style="font-size: 14px; line-height: 1;">${icon}</span>
        <span 
          style="
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: ${badgeColor};
            background: rgba(255, 255, 255, 0.05);
            padding: 3px 7px;
            border-radius: ${DESIGN_TOKENS.radii.pill};
          "
        >
          ${badgeText}
        </span>
        <span 
          style="
            font-size: 12px;
            font-weight: 500;
            color: ${DESIGN_TOKENS.colors.white};
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
          "
        >
          ${message}
        </span>
        <button 
          type="button" 
          onclick="event.stopPropagation(); window.virtuoPulse.clear();" 
          style="
            background: none;
            border: none;
            color: ${DESIGN_TOKENS.colors.textMuted};
            font-size: 14px;
            padding: 0 0 0 4px;
            cursor: pointer;
            line-height: 1;
            display: flex;
            align-items: center;
          "
          title="Fechar status"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    `;
  }
}

export const virtuoPulse = new VirtuoPulseController();

// Vinculação contextual com o Virtuo Conductor
if (typeof window !== 'undefined') {
  window.virtuoPulse = virtuoPulse;

  // Escuta mudanças de tom: dispara status e onda no horizonte
  virtuoConductor.on(CONDUCTOR_EVENTS.KEY_CHANGED, (payload) => {
    virtuoPulse.setState(PULSE_STATES.KEY_SYNCED, { key: payload.newKey }, 3800);
    HorizonWaveManager.triggerHorizonWave();
  });

  // Escuta transições de seção da banda
  virtuoConductor.on(CONDUCTOR_EVENTS.SECTION_CHANGE, (payload) => {
    virtuoPulse.setState(PULSE_STATES.SECTION_ACTIVE, {
      section: payload.section,
      intensity: payload.suggestedIntensity
    }, 3200);
  });

  // Escuta início de reprodução musical
  virtuoConductor.on(CONDUCTOR_EVENTS.SONG_STARTED, (payload) => {
    virtuoPulse.setState(PULSE_STATES.SONG_ACTIVE, {
      title: payload.song?.title || 'Banda Virtual',
      key: payload.key
    });
    HorizonWaveManager.triggerHorizonWave();
  });

  // Escuta término de música
  virtuoConductor.on(CONDUCTOR_EVENTS.SONG_ENDED, () => {
    virtuoPulse.clear();
  });

  // Escuta missões ativas
  virtuoConductor.on(CONDUCTOR_EVENTS.MISSION_READY, (payload) => {
    virtuoPulse.setState(PULSE_STATES.NEW_MISSION, {
      title: payload.mission?.title || 'Nova Missão'
    }, 5000);
    HorizonWaveManager.triggerMissionGold();
  });
}
