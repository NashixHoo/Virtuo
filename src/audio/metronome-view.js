// =============================================================
// VIRTUO METRONOME VIEWS & UI COMPONENTS
// src/audio/metronome-view.js
//
// Componentes visuais para:
// 1. Painel Compacto do Modo Ministro (Drawer/Modal de Palco)
// 2. Painel da Tela Modo Banda (Dial, Batidas, Tap, Subdivisões, Volume)
// 3. Barra Flutuante de Batidas e Acento
// =============================================================

import { SUBDIVISIONS } from "./metronome.js";
import { virtuoBand, BAND_PRESETS } from "./band-engine.js";
import { BAND_SECTIONS, BAND_STYLE_PATTERNS } from "./band-patterns.js";
import { virtuoCulto } from "./culto-mode.js";

/**
 * Renderiza o indicador de batidas (● 1  ○ 2  ○ 3  ○ 4)
 * com destaque óptico no tempo 1 (acento).
 */
export function renderBeatIndicators(beatsPerBar = 4, currentBeat = 1, isPlaying = false, isAccent = false) {
  const dots = [];
  for (let i = 1; i <= beatsPerBar; i++) {
    const isCurrent = isPlaying && (currentBeat === i);
    const isFirstBeat = (i === 1);
    const hasAccent = isCurrent && isFirstBeat && isAccent;
    
    dots.push(`
      <div class="metronome-beat-unit ${isCurrent ? 'active' : ''} ${hasAccent ? 'accent' : ''}" data-beat="${i}">
        <span class="metronome-beat-dot ${isCurrent ? 'active' : ''} ${hasAccent ? 'accent' : ''}" data-beat="${i}"></span>
        <span class="metronome-beat-number">${i}</span>
      </div>
    `);
  }
  return `
    <div class="metronome-beats-track" id="metronome-beats-track">
      ${dots.join("")}
    </div>
  `;
}

/**
 * Renderiza o seletor de subdivisão (1/4, 1/8, 1/16).
 */
export function renderSubdivisionSelector(currentSub = "1/4", onSelectFnName = "window.setMetronomeSubdivision") {
  return `
    <div class="metronome-subdivision-group">
      <span class="metronome-label">SUBDIVISÃO:</span>
      <div class="metronome-segmented">
        ${Object.keys(SUBDIVISIONS).map(key => `
          <button 
            class="metronome-seg-btn ${currentSub === key ? 'active' : ''}" 
            onclick="${onSelectFnName}('${key}')"
            title="${SUBDIVISIONS[key].name} (${key})">
            ${key}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Renderiza o Painel Compacto do Metrônomo no Modo Ministro.
 * Projetado para uso em palco sem sair da apresentação.
 */
export function renderMinisterMetronomePanel(state, songBpm = null) {
  const {
    bpm,
    isPlaying,
    subdivision,
    volume,
    accentFirstBeat,
    beatsPerBar,
    currentBeat,
    isAccentBeat
  } = state;

  return `
    <div class="minister-metro-card" id="minister-metro-panel">
      <!-- Topo do Card: Título + Botão Fechar -->
      <div class="minister-metro-header">
        <div class="minister-metro-title">
          <span class="metro-icon">🥁</span>
          <span>METRÔNOMO NATIVO</span>
        </div>
        <button class="minister-metro-close" onclick="window.VirtuoMinister.toggleMetronomePanel()" title="Fechar painel do metrônomo">
          ✕
        </button>
      </div>

      <!-- Indicador Visual Rítmico em Tempo Real (● 1 ○ 2 ○ 3 ○ 4) -->
      ${renderBeatIndicators(beatsPerBar, currentBeat, isPlaying, isAccentBeat)}

      <!-- Bloco Principal de BPM: [-] [ Input 74 ] [+] + TAP -->
      <div class="minister-metro-bpm-row">
        <div class="minister-metro-stepper">
          <button class="metro-step-btn" onclick="window.adjustMetronomeBpm(-1)" title="Diminuir 1 BPM">−</button>
          <div class="metro-bpm-input-wrapper">
            <input 
              type="number" 
              id="minister-bpm-input"
              class="metro-bpm-input metronome-pulse-target" 
              value="${bpm}" 
              min="40" 
              max="240"
              onchange="window.handleMetronomeBpmInput(this.value)"
              onkeydown="if(event.key==='Enter') this.blur();"
              title="Digite o BPM (40 a 240)"
            />
            <span class="metro-bpm-unit">BPM</span>
          </div>
          <button class="metro-step-btn" onclick="window.adjustMetronomeBpm(1)" title="Aumentar 1 BPM">+</button>
        </div>

        <!-- Botão TAP TEMPO -->
        <button class="metro-tap-btn" onclick="window.handleMetronomeTap()" title="Toque ritmadamente para calcular o BPM">
          TAP
        </button>
      </div>

      <!-- Play / Pause Principal -->
      <div class="minister-metro-actions">
        <button class="metro-play-btn ${isPlaying ? 'playing' : ''}" onclick="window.toggleMetronomeEngine()">
          ${isPlaying 
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Pausar Metrônomo</span>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Iniciar Metrônomo</span>`}
        </button>
        
        <button class="metro-stop-btn" onclick="window.stopMetronomeEngine()" title="Parar e resetar contagem">
          ⏹
        </button>
      </div>

      <!-- Opções: Subdivisão (1/4, 1/8, 1/16) -->
      ${renderSubdivisionSelector(subdivision, "window.setMetronomeSubdivision")}

      <!-- Opção Acento no 1º Tempo + Sincronizar com Música -->
      <div class="minister-metro-toggles">
        <label class="metro-toggle-label">
          <input 
            type="checkbox" 
            id="metro-accent-toggle" 
            ${accentFirstBeat ? 'checked' : ''} 
            onchange="window.setMetronomeAccent(this.checked)" 
          />
          <span>Acentuar 1º tempo</span>
        </label>

        ${songBpm ? `
          <button class="metro-song-bpm-btn" onclick="window.useSongBpmInMetronome(${songBpm})" title="Sincronizar com ${songBpm} BPM desta música">
            🎵 Usar BPM da Música (${songBpm})
          </button>
        ` : ''}
      </div>

      <!-- Controle de Volume Independente -->
      <div class="minister-metro-volume-row">
        <div class="metro-vol-label">
          <span>Volume</span>
          <span id="metro-vol-val">${Math.round(volume * 100)}%</span>
        </div>
        <input 
          type="range" 
          id="metro-volume-slider"
          class="metro-volume-slider" 
          min="0" 
          max="1" 
          step="0.05" 
          value="${volume}" 
          oninput="window.handleMetronomeVolume(this.value)"
        />
      </div>
    </div>
  `;
}

/**
 * Renderiza o painel completo do Modo Banda no app principal.
 */
export function renderBandScreenComponent(state) {
  const {
    bpm,
    isPlaying,
    subdivision,
    volume,
    accentFirstBeat,
    beatsPerBar,
    currentBeat,
    isAccentBeat
  } = state;

  return `
    <section class="glass band-metronome-section">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="pill">METRÔNOMO & MODO BANDA</span>
        <span class="band-engine-badge">WEB AUDIO API • CHRIS WILSON CLOCK</span>
      </div>

      <!-- Display Gigante do BPM -->
      <div class="dial metronome-pulse-target" id="band-bpm-display" title="Clique para editar o BPM">
        <div class="band-bpm-edit-wrap">
          <input 
            type="number" 
            class="band-bpm-number-input" 
            id="band-bpm-direct-input" 
            value="${bpm}" 
            min="40" 
            max="240" 
            onchange="window.handleMetronomeBpmInput(this.value)"
            onkeydown="if(event.key==='Enter') this.blur();"
          />
          <span class="band-bpm-sublabel">BPM</span>
        </div>
      </div>

      <!-- Indicador Rítmico em Tempo Real -->
      ${renderBeatIndicators(beatsPerBar, currentBeat, isPlaying, isAccentBeat)}

      <!-- Controles Centrais [-] [PLAY/PAUSE] [+] [TAP] -->
      <div class="band-controls-master">
        <button class="band-step-btn" onclick="window.adjustMetronomeBpm(-1)" title="Diminuir 1 BPM">−</button>
        <button class="band-main-play-btn ${isPlaying ? 'playing' : ''}" onclick="window.toggleMetronomeEngine()" title="Iniciar / Pausar Metrônomo">
          ${isPlaying ? "⏸" : "▶"}
        </button>
        <button class="band-step-btn" onclick="window.adjustMetronomeBpm(1)" title="Aumentar 1 BPM">+</button>
        <button class="band-tap-btn" onclick="window.handleMetronomeTap()" title="Toque no ritmo da música para calcular o BPM">
          TAP
        </button>
      </div>

      <p class="subtitle" style="text-align:center; margin-top:12px;">
        ${isPlaying 
          ? `Metrônomo ativo • Pulso acústico em ${bpm} BPM • Subdivisão ${subdivision}` 
          : "Síntese acústica nativa de alta precisão • Sem atraso por setInterval"}
      </p>

      <!-- Grade de Ajustes: Subdivisão, Acento e Volume -->
      <div class="band-params-grid">
        <!-- Subdivisões: 1/4, 1/8, 1/16 -->
        <div class="band-param-tile">
          <div class="band-param-header">
            <span class="band-param-title">Subdivisão</span>
            <span class="band-param-curr">${SUBDIVISIONS[subdivision]?.name || "Semínima"}</span>
          </div>
          <div class="metronome-segmented" style="width:100%;">
            ${Object.keys(SUBDIVISIONS).map(key => `
              <button 
                class="metronome-seg-btn ${subdivision === key ? 'active' : ''}" 
                onclick="window.setMetronomeSubdivision('${key}')">
                ${key}
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Acento no Primeiro Tempo -->
        <div class="band-param-tile">
          <div class="band-param-header">
            <span class="band-param-title">Compasso & Acento</span>
            <span class="band-param-curr">${beatsPerBar}/4</span>
          </div>
          <label class="metro-toggle-label" style="margin-top:8px;">
            <input 
              type="checkbox" 
              ${accentFirstBeat ? 'checked' : ''} 
              onchange="window.setMetronomeAccent(this.checked)" 
            />
            <span style="font-size:12px;">Acentuar primeiro tempo (1760 Hz)</span>
          </label>
        </div>

        <!-- Volume Independente -->
        <div class="band-param-tile full-width">
          <div class="band-param-header">
            <span class="band-param-title">Volume do Metrônomo</span>
            <span class="band-param-curr" id="band-vol-text">${Math.round(volume * 100)}%</span>
          </div>
          <input 
            type="range" 
            class="metro-volume-slider" 
            min="0" 
            max="1" 
            step="0.05" 
            value="${volume}" 
            oninput="window.handleMetronomeVolume(this.value)" 
          />
        </div>
      </div>

      <!-- SESSÃO BANDA VIRTUAL MULTI-TRACK INTELIGENTE -->
      <div class="band-mixer-container" style="margin-top:24px; padding:20px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.2); border-radius:24px;">
        
        <!-- Header da Banda Virtual -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pill" style="background:rgba(126,231,255,0.15); border-color:#7EE7FF; color:#7EE7FF;">BANDA VIRTUAL INTELIGENTE</span>
              ${virtuoBand.getState().isEasyBand ? `<span class="pill" style="background:rgba(16,185,129,0.15); border-color:#10b981; color:#6ee7b7;">EASY BAND</span>` : ''}
              ${virtuoBand.getState().isTransitioning ? `<span class="pill" style="background:rgba(245,158,11,0.15); border-color:#f59e0b; color:#fbbf24;">TRANSIÇÃO NO COMPASSO</span>` : ''}
            </div>
            <h3 style="margin-top:6px; font-size:18px; letter-spacing:-0.02em;">Acompanhamento Musical Virtuo</h3>
            <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Bateria, Baixo, Teclado e Guitarra sincronizados com harmonia e dinâmica real.</p>
          </div>

          <!-- Controles de Reprodução Primários -->
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button 
              id="band-master-play-btn"
              class="button primary" 
              style="padding:9px 20px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"
              onclick="window.toggleBandEnginePlayback()"
            >
              <span id="band-play-icon">${virtuoBand.getState().isPlaying ? '⏸' : '▶'}</span>
              <span id="band-play-label">${virtuoBand.getState().isPlaying ? 'Pausar Banda' : 'Tocar Banda'}</span>
            </button>
            <button 
              class="button secondary" 
              style="padding:9px 14px; font-size:13px;"
              onclick="window.stopBandEnginePlayback()"
              title="Interromper todos os instrumentos virtuais"
            >
              ⏹ Parar
            </button>
            <button 
              id="band-countin-btn"
              class="tag-btn ${virtuoBand.getState().hasCountIn ? 'active' : ''}" 
              style="padding:8px 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px; ${virtuoBand.getState().hasCountIn ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}"
              onclick="window.toggleCountIn()"
              title="Contagem prévia de 1 compasso antes da banda tocar"
            >
              <span>⏱ Contagem</span>
            </button>
            <button 
              id="band-easy-toggle-btn"
              class="tag-btn ${virtuoBand.getState().isEasyBand ? 'active' : ''}" 
              style="padding:8px 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px; ${virtuoBand.getState().isEasyBand ? 'background:rgba(16,185,129,0.2); border-color:#10b981; color:#6ee7b7;' : ''}"
              onclick="window.toggleEasyBand()"
              title="Modo Simplificado para Músicos Iniciantes"
            >
              <span>🌱 Easy Band</span>
            </button>
          </div>
        </div>

        <!-- MIXER DE 4 CANAIS (BATERIA, BAIXO, TECLADO, GUITARRA) -->
        <div style="margin-bottom:16px; background:rgba(0,0,0,0.3); border-radius:18px; padding:14px; border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:11px; font-weight:700; color:#7EE7FF; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">
            Mixer da Banda Virtual
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
            ${[
              { id: "drums", name: "BATERIA", icon: "🥁", desc: "Kick, Snare, HiHat, Toms", hasOptions: false },
              { id: "bass", name: "BAIXO", icon: "🎸", desc: "Fundamental & Quinta Harmônica", hasOptions: false },
              { id: "keyboard", name: "TECLADO", icon: "🎹", desc: "Pad Celestial, Piano, Keys", hasOptions: "mode", options: ["pad", "piano", "keys"] },
              { id: "guitar", name: "GUITARRA", icon: "🎸", desc: "Arpejo, Batida, Shimmer", hasOptions: "pattern", options: ["arpeggio", "strum", "ambient", "worship"] }
            ].map(trk => {
              const trackState = virtuoBand.getState().tracks[trk.id] || { volume: 0.7, muted: false, solo: false, active: true };
              const volPct = Math.round(trackState.volume * 100);
              return `
                <div class="band-channel-card" id="track-channel-${trk.id}" style="padding:12px; background:rgba(255,255,255,0.02); border:1px solid ${trackState.solo ? 'rgba(126,231,255,0.4)' : (trackState.muted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)')}; border-radius:14px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:18px;">${trk.icon}</span>
                      <div>
                        <strong style="font-size:12px; display:block; letter-spacing:0.02em;">${trk.name}</strong>
                        <span style="font-size:10px; color:#94a3b8;">${trk.desc}</span>
                      </div>
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button 
                        id="btn-solo-${trk.id}"
                        class="tag-btn ${trackState.solo ? 'active' : ''}" 
                        style="padding:3px 8px; font-size:10px; font-weight:700; ${trackState.solo ? 'background:#7EE7FF; color:#07101F; border-color:#7EE7FF;' : ''}"
                        onclick="window.toggleTrackSolo('${trk.id}')"
                        title="Isolar este instrumento"
                      >
                        SOLO
                      </button>
                      <button 
                        id="btn-mute-${trk.id}"
                        class="tag-btn ${trackState.muted ? 'active' : ''}" 
                        style="padding:3px 8px; font-size:10px; font-weight:700; ${trackState.muted ? 'background:rgba(239,68,68,0.25); color:#f87171; border-color:#ef4444;' : ''}"
                        onclick="window.toggleTrackMute('${trk.id}')"
                        title="Silenciar instrumento"
                      >
                        MUTE
                      </button>
                    </div>
                  </div>

                  <!-- Fader de Volume & Indicador % -->
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:11px; color:#94a3b8;">🔊</span>
                    <input 
                      type="range" 
                      class="metro-volume-slider" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value="${trackState.volume}" 
                      id="slider-vol-${trk.id}"
                      oninput="window.setTrackVolume('${trk.id}', this.value)" 
                    />
                    <span style="font-size:11px; color:#7EE7FF; font-weight:700; width:34px; text-align:right;" id="val-vol-${trk.id}">${volPct}%</span>
                  </div>

                  <!-- Seletores de Estilo/Modo Específico (Teclado e Guitarra) -->
                  ${trk.hasOptions === "mode" ? `
                    <div style="display:flex; gap:4px; margin-top:8px;">
                      ${trk.options.map(opt => `
                        <button 
                          class="tag-btn ${trackState.mode === opt ? 'active' : ''}" 
                          style="padding:2px 8px; font-size:10px; text-transform:capitalize;"
                          onclick="window.setKeyboardMode('${opt}')"
                        >
                          ${opt}
                        </button>
                      `).join("")}
                    </div>
                  ` : ''}
                  ${trk.hasOptions === "pattern" ? `
                    <div style="display:flex; gap:4px; margin-top:8px;">
                      ${trk.options.map(opt => `
                        <button 
                          class="tag-btn ${trackState.pattern === opt ? 'active' : ''}" 
                          style="padding:2px 8px; font-size:10px; text-transform:capitalize;"
                          onclick="window.setGuitarPattern('${opt}')"
                        >
                          ${opt}
                        </button>
                      `).join("")}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- CONTROLES DE BPM, COMPASSO & AJUSTES RÁPIDOS -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; padding:12px 16px; background:rgba(0,0,0,0.2); border-radius:16px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span style="font-size:12px; color:#94a3b8;">BPM da Banda: <strong style="color:#7EE7FF; font-size:14px;">${virtuoBand.getState().bpm}</strong></span>
            <div style="display:flex; gap:4px;">
              <button class="tag-btn" style="padding:4px 8px; font-size:11px;" onclick="window.adjustBandBpm(-1)">-1</button>
              <button class="tag-btn" style="padding:4px 8px; font-size:11px;" onclick="window.adjustBandBpm(1)">+1</button>
              <button class="tag-btn" style="padding:4px 8px; font-size:11px;" onclick="window.setHalfBandBpm()" title="Metade do BPM (Half-time)">/2</button>
              <button class="tag-btn" style="padding:4px 8px; font-size:11px;" onclick="window.setDoubleBandBpm()" title="Dobro do BPM (Double-time)">x2</button>
            </div>
          </div>

          <!-- Controle de Intensidade Visual (0 a 5) -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:12px; color:#94a3b8;">INTENSIDADE:</span>
            <div style="display:flex; gap:4px; align-items:center;">
              ${[
                { level: 0, label: "0", name: "Silencioso" },
                { level: 1, label: "1", name: "Muito suave" },
                { level: 2, label: "2", name: "Suave" },
                { level: 3, label: "3", name: "Médio" },
                { level: 4, label: "4", name: "Forte" },
                { level: 5, label: "5", name: "Muito forte" }
              ].map(item => {
                const isAct = virtuoBand.getState().intensity === item.level;
                return `
                  <button 
                    class="band-intensity-btn ${isAct ? 'active' : ''}" 
                    id="band-int-${item.level}"
                    onclick="window.setBandIntensity(${item.level})"
                    title="${item.name}"
                    style="padding:3px 8px; font-size:11px; border-radius:6px; background:${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.05)'}; color:${isAct ? '#07101F' : '#E2E8F0'}; border:1px solid ${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.1)'}; font-weight:${isAct ? '700' : '400'}; cursor:pointer;"
                  >
                    ${item.label}
                  </button>
                `;
              }).join("")}
            </div>
            <!-- Barra gráfica de intensidade -->
            <div style="font-size:11px; color:#7EE7FF; font-family:monospace; letter-spacing:1px; margin-left:4px;">
              ${"█".repeat(virtuoBand.getState().intensity)}${"░".repeat(5 - virtuoBand.getState().intensity)}
            </div>
          </div>

          <!-- Loop e Repetições -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button 
              id="band-loop-btn"
              class="tag-btn ${virtuoBand.getState().isLooping ? 'active' : ''}" 
              style="padding:4px 12px; font-size:11px; display:inline-flex; align-items:center; gap:6px; ${virtuoBand.getState().isLooping ? 'background:rgba(16,185,129,0.15); border-color:#10b981; color:#6ee7b7;' : ''}"
              onclick="window.toggleBandLoop()"
            >
              <span>🔁 Loop</span>
            </button>
            <div style="display:flex; gap:3px;">
              ${[
                { val: 1, label: "1x" },
                { val: 2, label: "2x" },
                { val: 4, label: "4x" },
                { val: 0, label: "∞" }
              ].map(rep => {
                const isSelected = virtuoBand.getState().loopRepeatTarget === rep.val;
                return `
                  <button 
                    class="tag-btn ${isSelected ? 'active' : ''}" 
                    style="padding:3px 7px; font-size:10px; ${isSelected ? 'background:rgba(126,231,255,0.2); border-color:#7EE7FF; color:#7EE7FF;' : ''}"
                    onclick="window.setLoopRepeatTarget(${rep.val})"
                  >
                    ${rep.label}
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- ESTRUTURA DA MÚSICA & SEÇÕES COM TRANSIÇÕES -->
        <div style="margin-bottom:16px; padding:12px 14px; background:rgba(0,0,0,0.25); border-radius:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <span style="font-size:12px; color:#7EE7FF; font-weight:700;">Seção Estrutural da Música:</span>
            <span style="font-size:11px; color:#94a3b8;">
              ${virtuoBand.getState().nextQueuedSection 
                ? `Transição para <strong>${virtuoBand.getState().nextQueuedSection.toUpperCase()}</strong> no próximo compasso...` 
                : `Seção atual: <strong>${virtuoBand.getState().currentSection.toUpperCase()}</strong>`}
            </span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${BAND_SECTIONS.map(sec => {
              const isCurrent = virtuoBand.getState().currentSection === sec.id;
              const isQueued = virtuoBand.getState().nextQueuedSection === sec.id;
              return `
                <button 
                  class="tag-btn ${isCurrent ? 'active' : ''}" 
                  id="band-sec-${sec.id}"
                  onclick="window.setBandSection('${sec.id}')"
                  style="padding:6px 12px; font-size:11px; border-radius:10px; ${isCurrent ? 'background:#7EE7FF; color:#07101F; font-weight:700; border-color:#7EE7FF;' : (isQueued ? 'background:rgba(245,158,11,0.25); color:#fbbf24; border-color:#f59e0b;' : '')}"
                >
                  <span>${sec.label}</span>
                  ${isQueued ? '⏳' : ''}
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- SELETOR DE ESTILOS & CATEGORIAS (Worship, Pop, Rock, Congregacional, Balada, 4/4 simples, 6/8) -->
        <div style="margin-bottom:16px; padding:12px 14px; background:rgba(0,0,0,0.25); border-radius:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <span style="font-size:12px; color:#7EE7FF; font-weight:700;">Estilo Rítmico da Banda:</span>
            <span style="font-size:11px; color:#94a3b8;" id="band-preset-desc">${BAND_PRESETS[virtuoBand.getState().currentPreset]?.description || ""}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${Object.keys(BAND_STYLE_PATTERNS).map(pKey => {
              const p = BAND_STYLE_PATTERNS[pKey];
              const isSelected = virtuoBand.getState().currentPreset === pKey;
              return `
                <button 
                  class="band-preset-chip ${isSelected ? 'active' : ''}" 
                  id="band-preset-${pKey}"
                  onclick="window.setBandPreset('${pKey}')"
                  style="padding:5px 12px; font-size:12px; border-radius:10px; background:${isSelected ? '#7EE7FF' : 'rgba(255,255,255,0.06)'}; color:${isSelected ? '#07101F' : '#E2E8F0'}; border:1px solid ${isSelected ? '#7EE7FF' : 'rgba(255,255,255,0.12)'}; font-weight:${isSelected ? '700' : '400'}; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"
                >
                  <span>${p.icon}</span>
                  <span>${p.name}</span>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- SELETOR DE TONALIDADE & TRANSPOSIÇÃO AUTOMÁTICA -->
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:10px 14px; background:rgba(0,0,0,0.2); border-radius:14px; flex-wrap:wrap;">
          <span style="font-size:12px; color:#94a3b8;">Tom Harmônico da Banda:</span>
          <div class="band-key-selector" style="display:flex; gap:6px; flex-wrap:wrap;">
            ${["C", "D", "E", "F", "G", "A", "B", "Em", "Am", "F#m"].map(k => {
              const isKey = virtuoBand.getState().currentKey === k;
              return `
                <button 
                  class="band-key-chip ${isKey ? 'active' : ''}" 
                  id="band-key-${k}"
                  onclick="window.setBandKey('${k}')"
                  style="padding:4px 10px; font-size:12px; border-radius:999px; background:${isKey ? '#7EE7FF' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isKey ? '#7EE7FF' : 'rgba(255,255,255,0.12)'}; color:${isKey ? '#07101F' : '#E2E8F0'}; font-weight:${isKey ? '700' : '400'}; cursor:pointer;"
                >
                  ${k}
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- PAINEL SMART BAND & MODO CULTO -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-top:16px;">
          
          <!-- Card Smart Band -->
          <div style="padding:14px; background:rgba(126,231,255,0.04); border:1px solid rgba(126,231,255,0.15); border-radius:16px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
              <span style="font-size:16px;">✨</span>
              <strong style="font-size:13px; color:#7EE7FF;">Virtuo Smart Band</strong>
            </div>
            <p style="font-size:12px; color:#94a3b8; line-height:1.5; margin-bottom:10px;">
              ${virtuoBand.getState().smartRecommendation 
                ? virtuoBand.getState().smartRecommendation.summary 
                : "A inteligência musical analisa a canção e sugere instrumentos, dinâmica e intensidades por seção."}
            </p>
            <button 
              class="button secondary" 
              style="padding:6px 12px; font-size:11px; width:100%;"
              onclick="window.applySmartBand()"
            >
              Aplicar Sugestão da Canção Ativa
            </button>
          </div>

          <!-- Card Modo Culto (Sequência de Louvores) -->
          <div style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">⛪</span>
                <strong style="font-size:13px; color:#f1f5f9;">Modo Culto (Setlist)</strong>
              </div>
              <div style="display:flex; gap:4px;">
                <button class="tag-btn" style="padding:2px 8px; font-size:10px;" onclick="window.prevCultoSong()" title="Louvor Anterior">◀</button>
                <button class="tag-btn" style="padding:2px 8px; font-size:10px;" onclick="window.nextCultoSong()" title="Próximo Louvor">▶</button>
              </div>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">
              ${virtuoCulto.getState().currentSong ? `
                Tocando: <strong style="color:#7EE7FF;">${virtuoCulto.getState().currentSong.title}</strong> (${virtuoCulto.getState().currentSong.key} • ${virtuoCulto.getState().currentSong.bpm} BPM • ${virtuoCulto.getState().currentSong.style})
              ` : "Nenhum louvor configurado no setlist."}
            </div>
            <div style="display:flex; gap:4px; flex-direction:column; max-height:85px; overflow-y:auto;">
              ${virtuoCulto.getState().songs.map((cs, idx) => `
                <div 
                  onclick="window.selectCultoSong(${idx})"
                  style="padding:4px 8px; font-size:11px; border-radius:6px; background:${virtuoCulto.getState().currentIndex === idx ? 'rgba(126,231,255,0.15)' : 'rgba(255,255,255,0.02)'}; color:${virtuoCulto.getState().currentIndex === idx ? '#7EE7FF' : '#94a3b8'}; cursor:pointer; display:flex; justify-content:space-between;"
                >
                  <span>0${idx + 1} — ${cs.title}</span>
                  <span>${cs.key} • ${cs.bpm} BPM</span>
                </div>
              `).join("")}
            </div>
          </div>

        </div>

      </div>

      <!-- Atalhos Rápidos de Worship & Louvor -->
      <div class="grid" style="margin-top:20px;">
        <div class="tile" onclick="window.setMetronomeBpmDirect(74)" style="cursor:pointer;">
          <div class="icon">🕊️</div>
          <h3>74 BPM</h3>
          <p>Worship Suave</p>
        </div>
        <div class="tile" onclick="window.setMetronomeBpmDirect(120)" style="cursor:pointer;">
          <div class="icon">⚡</div>
          <h3>120 BPM</h3>
          <p>Louvor Alegre</p>
        </div>
      </div>
    </section>
  `;
}
