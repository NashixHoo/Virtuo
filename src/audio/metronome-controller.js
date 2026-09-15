// =============================================================
// VIRTUO METRONOME CONTROLLER & STATE
// src/audio/metronome-controller.js
//
// Controlador de estado reativo para o Metrônomo do Virtuo.
// Integra o motor de áudio Web Audio API (VirtuoMetronomeEngine)
// com a interface visual, Modo Ministro, Músicas e Modo Banda.
// =============================================================

import { VirtuoMetronomeEngine, METRONOME_CONSTANTS, SUBDIVISIONS } from "./metronome.js";

export class MetronomeController {
  constructor() {
    this.engine = new VirtuoMetronomeEngine({
      bpm: METRONOME_CONSTANTS.DEFAULT_BPM,
      beatsPerBar: 4,
      subdivision: "1/4",
      volume: 0.8,
      accentFirstBeat: true,
      onTick: (tickInfo) => this._handleTick(tickInfo),
      onStateChange: (state) => this._handleStateChange(state)
    });

    // Subscritores de UI (views que querem renderizar mudanças de estado ou batida)
    this._listeners = new Set();
    this._tickListeners = new Set();

    // Estado da batida atual (1..4) para feedback visual síncrono
    this.currentBeat = 1;
    this.isAccentBeat = false;
  }

  // -------------------------------------------------------------
  // SUBSCRIPTION & OBSERVABILITY
  // -------------------------------------------------------------
  subscribe(callback) {
    if (typeof callback === "function") {
      this._listeners.add(callback);
      // Notifica o estado inicial
      callback(this.getState());
    }
    return () => this._listeners.delete(callback);
  }

  onStateChange(callback) {
    return this.subscribe(callback);
  }

  onBeatTick(callback) {
    if (typeof callback === "function") {
      this._tickListeners.add(callback);
    }
    return () => this._tickListeners.delete(callback);
  }

  _handleTick(tickInfo) {
    this.currentBeat = tickInfo.beatNumber;
    this.isAccentBeat = tickInfo.isAccent;

    // Atualiza imediatamente elementos visuais leves no DOM para latência imperceptível
    this._pulseVisualDom(tickInfo);

    // Notifica ouvintes registrados
    for (const listener of this._tickListeners) {
      try {
        listener(tickInfo);
      } catch (err) {
        console.error("[MetronomeController] Tick listener error:", err);
      }
    }
  }

  _handleStateChange(state) {
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("[MetronomeController] State listener error:", err);
      }
    }
  }

  _pulseVisualDom(tickInfo) {
    if (typeof document === "undefined") return;

    // 1. Atualiza indicadores de batida circulares (● 1  ○ 2  ○ 3  ○ 4)
    const indicators = document.querySelectorAll(".metronome-beat-dot");
    indicators.forEach((dot) => {
      const beatIdx = parseInt(dot.getAttribute("data-beat"), 10);
      if (beatIdx === tickInfo.beatNumber) {
        dot.classList.add("active");
        if (tickInfo.isAccent) {
          dot.classList.add("accent");
        } else {
          dot.classList.remove("accent");
        }
      } else {
        dot.classList.remove("active", "accent");
      }
    });

    // 2. Pulso sutil no display do BPM e no dial
    const bpmDials = document.querySelectorAll(".metronome-pulse-target");
    bpmDials.forEach(el => {
      el.classList.remove("flash-pulse", "flash-accent");
      // Force reflow
      void el.offsetWidth;
      el.classList.add(tickInfo.isAccent ? "flash-accent" : "flash-pulse");
    });
  }

  // -------------------------------------------------------------
  // CONTROLES DE REPRODUÇÃO
  // -------------------------------------------------------------
  start() {
    this.engine.start();
  }

  pause() {
    this.engine.pause();
  }

  stop() {
    this.engine.stop();
    this.currentBeat = 1;
    this.isAccentBeat = false;
    this._resetVisualDom();
  }

  toggle() {
    this.engine.toggle();
    if (!this.engine.isPlaying) {
      this._resetVisualDom();
    }
  }

  _resetVisualDom() {
    if (typeof document === "undefined") return;
    const indicators = document.querySelectorAll(".metronome-beat-dot");
    indicators.forEach(dot => dot.classList.remove("active", "accent"));
    const bpmDials = document.querySelectorAll(".metronome-pulse-target");
    bpmDials.forEach(el => el.classList.remove("flash-pulse", "flash-accent"));
  }

  // -------------------------------------------------------------
  // CONTROLES DE PARÂMETROS
  // -------------------------------------------------------------
  setBpm(bpm) {
    return this.engine.setBpm(bpm);
  }

  adjustBpm(delta) {
    return this.engine.adjustBpm(delta);
  }

  tap() {
    const result = this.engine.tap();
    return result;
  }

  setSubdivision(sub) {
    this.engine.setSubdivision(sub);
  }

  setAccent(enable) {
    this.engine.setAccentFirstBeat(enable);
  }

  setVolume(vol) {
    this.engine.setVolume(vol);
  }

  // -------------------------------------------------------------
  // SINCRONIZAÇÃO TEMPORÁRIA COM MÚSICA
  // -------------------------------------------------------------
  useSongBpm(songBpm) {
    this.engine.useSongBpm(songBpm);
  }

  getState() {
    return {
      ...this.engine.getState(),
      currentBeat: this.currentBeat,
      isAccentBeat: this.isAccentBeat
    };
  }

  destroy() {
    this._listeners.clear();
    this._tickListeners.clear();
    this.engine.destroy();
  }
}

// Instância Singleton compartilhada do metrônomo no Virtuo
export const virtuoMetronome = new MetronomeController();
