// =============================================================
// VIRTUO MINISTER MODE: CONTROLLER
// src/features/minister/minister-controller.js
// Orquestrador da performance de palco, estado da sessão e eventos
// =============================================================

import {
  calculateKey,
  transposeChordSheet,
  getEasyPlayCifra,
  isChordLine
} from "../../music/index.js";
import { AutoScrollController } from "./auto-scroll.js";
import { renderMinisterStage } from "./minister-view.js";
import { virtuoMetronome } from "../../audio/index.js";

/**
 * Utilitário para formatar a cifra com tags span e classes semânticas.
 */
function formatCifraText(text) {
  if (!text) return "";
  const lines = text.split("\n");
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Linha com tag de seção: [Intro] ou [Intro] G C Em D
    const sectionMatch = line.match(/^(\s*\[[^\]]+\]\s*)(.*)$/);
    if (sectionMatch) {
      const tag = sectionMatch[1];
      const rest = sectionMatch[2];
      if (!rest.trim()) {
        return `<span class="section-tag">${tag}</span>`;
      }
      return `<span class="section-tag">${tag}</span><span class="chord-highlight">${rest}</span>`;
    }

    // Linha predominantemente de acordes
    if (isChordLine(line)) {
      return `<span class="chord-highlight">${line}</span>`;
    }

    return line;
  }).join("\n");
}

export class MinisterController {
  constructor() {
    this.isOpen = false;
    this.song = null;
    this.originalKey = "G";
    this.transposeOffset = 0;
    this.isEasyPlay = false;
    this.fontSize = 18; // Tamanho ideal para leitura de palco
    this.isFullscreen = false;
    this.showMetronomePanel = false;
    this._unsubscribeMetronome = null;

    this.autoScroll = null;
    this._overlayEl = null;
    this._scrollTargetEl = null;

    // Listeners vinculados
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundFullscreenChange = this._handleFullscreenChange.bind(this);

    // Callbacks para extensões futuras (Metrônomo, Virtuo Session, Pedal Bluetooth)
    this.futureHooks = {
      onToneChanged: null,
      onModeChanged: null,
      onPedalTrigger: null,
      onMetronomeToggle: null
    };
  }

  /**
   * Abre a tela de performance do Modo Ministro.
   * 
   * @param {Object} song - Documento da música
   * @param {number} [initialOffset=0] - Offset inicial de semitons
   * @param {boolean} [initialEasyPlay=false] - Se inicia em Easy Play
   * @param {number|null} [initialBpm=null] - BPM específico da sessão/ensaio
   */
  open(song, initialOffset = 0, initialEasyPlay = false, initialBpm = null) {
    if (!song) return;

    this.song = song;
    this.originalKey = song.originalKey || "G";
    this.transposeOffset = initialOffset;
    this.isEasyPlay = initialEasyPlay;
    this.isOpen = true;

    // Sincroniza o BPM da música ou da sessão do ensaio com o metrônomo nativo
    const effectiveBpm = (typeof initialBpm === "number" && initialBpm > 0) ? initialBpm : song.bpm;
    if (effectiveBpm) {
      virtuoMetronome.useSongBpm(effectiveBpm);
    }

    // Subscreve a atualizações de estado do metrônomo para manter o painel de palco reativo
    if (this._unsubscribeMetronome) {
      this._unsubscribeMetronome();
    }
    this._unsubscribeMetronome = virtuoMetronome.subscribe((metroState) => {
      this._updateMetronomeUi(metroState);
    });

    // Remove qualquer overlay remanescente
    this._cleanupDom();

    // Cria o overlay no body
    const overlay = document.createElement("div");
    overlay.id = "minister-overlay-root";
    overlay.className = "minister-overlay-backdrop";
    overlay.innerHTML = this._buildHtml();
    document.body.appendChild(overlay);
    this._overlayEl = overlay;

    // Previne scroll no body principal durante a apresentação e ativa a Virtuo Aura Culto
    document.body.classList.add("minister-active-body");
    document.body.classList.add("virtuo-aura-culto");

    if (typeof window !== "undefined" && window.virtuoPulse) {
      window.virtuoPulse.setState("live", { title: song.title || "Modo Palco" });
    }

    // Conecta o motor de auto-scroll
    this._scrollTargetEl = document.getElementById("minister-scroll-canvas");
    this.autoScroll = new AutoScrollController(this._scrollTargetEl, (scrollState) => {
      this._updateAutoScrollUi(scrollState);
    });

    // Registra eventos de teclado e tela cheia
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this._boundKeyDown);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", this._boundFullscreenChange);
      document.addEventListener("webkitfullscreenchange", this._boundFullscreenChange);
    }
  }

  /**
   * Encerra o Modo Ministro sem alterar nenhum dado no Firestore.
   */
  close() {
    if (!this.isOpen) return;

    if (this.autoScroll) {
      this.autoScroll.destroy();
      this.autoScroll = null;
    }

    if (this._unsubscribeMetronome) {
      this._unsubscribeMetronome();
      this._unsubscribeMetronome = null;
    }

    // Não desliga abruptamente o metrônomo se o músico desejar manter o pulso sonoro,
    // mas recolhe o popover
    this.showMetronomePanel = false;

    if (this.isFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(() => {});
      }
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this._boundKeyDown);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("fullscreenchange", this._boundFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", this._boundFullscreenChange);
    }

    this._cleanupDom();
    document.body.classList.remove("minister-active-body");
    document.body.classList.remove("virtuo-aura-culto");

    if (typeof window !== "undefined" && window.virtuoPulse) {
      const current = window.virtuoPulse.getState();
      if (current.state === "live") {
        window.virtuoPulse.clear();
      }
    }

    this.isOpen = false;
  }

  /**
   * Alterna a exibição do painel compacto do Metrônomo no Modo Ministro.
   */
  toggleMetronomePanel() {
    this.showMetronomePanel = !this.showMetronomePanel;
    this._refreshView();
    if (typeof this.futureHooks.onMetronomeToggle === "function") {
      this.futureHooks.onMetronomeToggle(this.showMetronomePanel);
    }
  }

  _updateMetronomeUi(metroState) {
    if (!this.isOpen) return;

    // Se o botão do dock tiver dot indicador, sincroniza classe de reprodução
    const dockBtn = (typeof document !== "undefined" && typeof document.querySelector === "function") 
      ? document.querySelector(".metro-trigger-btn") 
      : null;
    if (dockBtn) {
      if (metroState.isPlaying) {
        dockBtn.classList.add("playing");
      } else {
        dockBtn.classList.remove("playing");
      }
    }

    // Se o painel estiver aberto, atualiza valores pontuais sem destruir o foco do input
    const bpmInput = document.getElementById("minister-bpm-input");
    if (bpmInput && document.activeElement !== bpmInput) {
      bpmInput.value = metroState.bpm;
    }

    const volVal = document.getElementById("metro-vol-val");
    if (volVal) {
      volVal.textContent = `${Math.round(metroState.volume * 100)}%`;
    }

    const volSlider = document.getElementById("metro-volume-slider");
    if (volSlider && document.activeElement !== volSlider) {
      volSlider.value = metroState.volume;
    }

    const playBtn = document.querySelector(".metro-play-btn");
    if (playBtn) {
      if (metroState.isPlaying) {
        playBtn.classList.add("playing");
        playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Pausar Metrônomo</span>`;
      } else {
        playBtn.classList.remove("playing");
        playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Iniciar Metrônomo</span>`;
      }
    }

    // Subdivisões ativas no painel
    const segButtons = document.querySelectorAll("#minister-metro-panel .metronome-seg-btn");
    segButtons.forEach(btn => {
      if (btn.textContent.trim() === metroState.subdivision) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const accentCheckbox = document.getElementById("metro-accent-toggle");
    if (accentCheckbox) {
      accentCheckbox.checked = metroState.accentFirstBeat;
    }
  }

  /**
   * Transpõe a música (+1 ou -1 semitom) em tempo real de apresentação.
   */
  changeKey(delta) {
    this.transposeOffset += delta;
    this._refreshView();
    if (typeof this.futureHooks.onToneChanged === "function") {
      this.futureHooks.onToneChanged(this.getCurrentKey(), this.transposeOffset);
    }
  }

  /**
   * Restaura o tom original cadastrado.
   */
  resetKey() {
    this.transposeOffset = 0;
    this._refreshView();
    if (typeof this.futureHooks.onToneChanged === "function") {
      this.futureHooks.onToneChanged(this.getCurrentKey(), 0);
    }
  }

  /**
   * Alterna entre Cifra Original e Easy Play.
   */
  setMode(mode) {
    this.isEasyPlay = (mode === "easy");
    this._refreshView();
    if (typeof this.futureHooks.onModeChanged === "function") {
      this.futureHooks.onModeChanged(this.isEasyPlay);
    }
  }

  /**
   * Inicia ou pausa o Auto-Scroll suave.
   */
  toggleAutoScroll() {
    if (this.autoScroll) {
      this.autoScroll.toggle();
    }
  }

  /**
   * Para o Auto-Scroll e retorna ao topo.
   */
  stopAutoScroll() {
    if (this.autoScroll) {
      this.autoScroll.stop();
    }
  }

  /**
   * Ajusta a velocidade de rolagem (slow, normal, fast).
   */
  setScrollSpeed(speedKey) {
    if (this.autoScroll) {
      this.autoScroll.setSpeed(speedKey);
      this._updateSpeedButtons(speedKey);
    }
  }

  /**
   * Ajusta o tamanho da fonte da cifra (+2 ou -2px).
   */
  adjustFontSize(delta) {
    const nextSize = Math.max(14, Math.min(36, this.fontSize + delta * 2));
    this.fontSize = nextSize;
    const canvas = document.getElementById("minister-scroll-canvas");
    if (canvas) {
      canvas.style.fontSize = `${this.fontSize}px`;
    }
  }

  /**
   * Alterna o modo de Tela Cheia do navegador.
   */
  async toggleFullscreen() {
    const stageEl = document.getElementById("minister-stage-container") || this._overlayEl;
    if (!stageEl) return;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (stageEl.requestFullscreen) {
          await stageEl.requestFullscreen();
        } else if (stageEl.webkitRequestFullscreen) {
          await stageEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle warning (comum em iframes sandboxed):", err);
      // Fallback estético caso a permissão do iframe restrinja Fullscreen nativo
      this.isFullscreen = !this.isFullscreen;
      this._updateFullscreenUi(this.isFullscreen);
    }
  }

  getCurrentKey() {
    return calculateKey(this.originalKey, this.transposeOffset);
  }

  getDisplayedChordsHtml() {
    const currentCifra = this.isEasyPlay 
      ? getEasyPlayCifra(this.song, this.transposeOffset)
      : transposeChordSheet(this.song.chords || "", this.transposeOffset);

    return formatCifraText(currentCifra);
  }

  _buildHtml() {
    const currentKey = this.getCurrentKey();
    const formattedChordsHtml = this.getDisplayedChordsHtml();

    return renderMinisterStage({
      song: this.song,
      currentKey,
      originalKey: this.originalKey,
      transposeOffset: this.transposeOffset,
      isEasyPlay: this.isEasyPlay,
      autoScrollPlaying: this.autoScroll ? this.autoScroll.isPlaying : false,
      autoScrollSpeed: this.autoScroll ? this.autoScroll.getSpeed() : "normal",
      fontSize: this.fontSize,
      isFullscreen: this.isFullscreen,
      formattedChordsHtml,
      showMetronomePanel: this.showMetronomePanel,
      metronomeState: virtuoMetronome.getState()
    });
  }

  _refreshView() {
    if (!this._overlayEl) return;
    
    // Preserva a posição atual do scroll durante a re-renderização
    const currentScroll = this._scrollTargetEl ? this._scrollTargetEl.scrollTop : 0;
    const wasPlaying = this.autoScroll ? this.autoScroll.isPlaying : false;
    const currentSpeed = this.autoScroll ? this.autoScroll.getSpeed() : "normal";

    this._overlayEl.innerHTML = this._buildHtml();

    // Reconecta o target do scroll
    this._scrollTargetEl = document.getElementById("minister-scroll-canvas");
    if (this._scrollTargetEl) {
      this._scrollTargetEl.scrollTop = currentScroll;
    }
    if (this.autoScroll) {
      this.autoScroll.setTarget(this._scrollTargetEl);
      this.autoScroll.setSpeed(currentSpeed);
      if (wasPlaying) {
        this.autoScroll.play();
      }
    }
  }

  _updateAutoScrollUi(state) {
    const playBtn = document.querySelector(".autoscroll-action-btns .play-btn");
    if (playBtn) {
      if (state.isPlaying) {
        playBtn.classList.add("is-playing");
        playBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          <span>Pausar</span>
        `;
      } else {
        playBtn.classList.remove("is-playing");
        playBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>Iniciar</span>
        `;
      }
    }
  }

  _updateSpeedButtons(speedKey) {
    const buttons = document.querySelectorAll(".minister-speed-selector .speed-btn");
    buttons.forEach(btn => {
      const isTarget = btn.getAttribute("onclick")?.includes(speedKey);
      btn.classList.toggle("active", isTarget);
    });
  }

  _handleFullscreenChange() {
    const isNowFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    this.isFullscreen = isNowFs;
    this._updateFullscreenUi(isNowFs);
  }

  _updateFullscreenUi(isFs) {
    const stageEl = document.getElementById("minister-stage-container");
    if (stageEl) {
      stageEl.classList.toggle("is-fullscreen", isFs);
    }
    const fsBtn = document.querySelector(".minister-btn-fullscreen");
    if (fsBtn) {
      fsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${isFs 
            ? '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>'
            : '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'}
        </svg>
        <span class="fs-text">${isFs ? 'Restaurar' : 'Tela Cheia'}</span>
      `;
    }
  }

  _handleKeyDown(event) {
    // Tecla Esc: fechar
    if (event.key === "Escape") {
      this.close();
      return;
    }

    // Tecla de Espaço: Play/Pausa no auto-scroll
    if (event.code === "Space" && event.target.tagName !== "INPUT" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      this.toggleAutoScroll();
      return;
    }

    // Tecla F: Tela cheia
    if ((event.key === "f" || event.key === "F") && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.toggleFullscreen();
      return;
    }

    // Tecla E: Toggle Easy Play
    if ((event.key === "e" || event.key === "E") && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.setMode(this.isEasyPlay ? "original" : "easy");
      return;
    }

    // Teclas + e -: transposição rápida de tom
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.changeKey(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      this.changeKey(-1);
      return;
    }

    // Tecla M: Toggle Metrônomo
    if ((event.key === "m" || event.key === "M") && !event.ctrlKey && !event.metaKey && event.target.tagName !== "INPUT") {
      event.preventDefault();
      this.toggleMetronomePanel();
      return;
    }
  }

  _cleanupDom() {
    const existing = document.getElementById("minister-overlay-root");
    if (existing) {
      existing.remove();
    }
    this._overlayEl = null;
  }
}

// Instância singleton do controller de palco
export const virtuoMinister = new MinisterController();
