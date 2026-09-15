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

      <!-- SESSÃO MULTI-TRACK MODO BANDA (BATERIA, BAIXO, TECLADO) -->
      <div class="band-mixer-container" style="margin-top:24px; padding:18px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.18); border-radius:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <span class="pill" style="background:rgba(126,231,255,0.15); border-color:#7EE7FF; color:#7EE7FF;">SINTETIZADOR MULTI-TRACK</span>
            <h3 style="margin-top:6px; font-size:17px;">Banda Virtual Virtuo</h3>
            <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Bateria, Baixo e Pad Celestial sincronizados ao BPM.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button 
              id="band-master-play-btn"
              class="button primary" 
              style="padding:8px 18px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"
              onclick="window.toggleBandEnginePlayback()"
            >
              <span id="band-play-icon">▶</span>
              <span id="band-play-label">Tocar Banda</span>
            </button>
            <button 
              class="button secondary" 
              style="padding:8px 14px; font-size:13px;"
              onclick="window.stopBandEnginePlayback()"
              title="Interromper todos os instrumentos virtuais"
            >
              ⏹ Parar
            </button>
          </div>
        </div>

        <!-- Seletor de Presets Musicais Locais (Worship, Congregacional, Pop, Balada, Rock, Corinho, Lento, Médio, Rápido) -->
        <div style="margin-bottom:14px; padding:12px; background:rgba(0,0,0,0.25); border-radius:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <span style="font-size:12px; color:#7EE7FF; font-weight:700;">Estilo / Preset da Banda:</span>
            <span style="font-size:11px; color:#94a3b8;" id="band-preset-desc">${BAND_PRESETS[virtuoBand.getState().currentPreset]?.description || ""}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${Object.keys(BAND_PRESETS).map(pKey => {
              const p = BAND_PRESETS[pKey];
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

        <!-- Controles de Dinâmica: Intensidade e Loop -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:14px; border:1px solid rgba(255,255,255,0.06);">
          <!-- Intensidade -->
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:12px; color:#94a3b8;">Intensidade:</span>
            <div style="display:flex; gap:4px;">
              ${[
                { level: 1, label: "1 Suave" },
                { level: 2, label: "2 Médio" },
                { level: 3, label: "3 Clímax" }
              ].map(item => {
                const isAct = virtuoBand.getState().intensity === item.level;
                return `
                  <button 
                    class="band-intensity-btn ${isAct ? 'active' : ''}" 
                    id="band-int-${item.level}"
                    onclick="window.setBandIntensity(${item.level})"
                    style="padding:3px 10px; font-size:11px; border-radius:8px; background:${isAct ? 'rgba(126,231,255,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isAct ? '#7EE7FF' : 'rgba(255,255,255,0.1)'}; color:${isAct ? '#7EE7FF' : '#94a3b8'}; cursor:pointer;"
                  >
                    ${item.label}
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Loop Toggle -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button 
              id="band-loop-btn"
              class="tag-btn ${virtuoBand.getState().isLooping ? 'active' : ''}" 
              style="padding:4px 12px; font-size:11px; display:inline-flex; align-items:center; gap:6px; ${virtuoBand.getState().isLooping ? 'background:rgba(16,185,129,0.15); border-color:#10b981; color:#6ee7b7;' : ''}"
              onclick="window.toggleBandLoop()"
            >
              <span>🔁</span>
              <span>Loop: <strong>${virtuoBand.getState().isLooping ? 'Ligado' : '1x Compassos'}</strong></span>
            </button>
          </div>
        </div>

        <!-- Seletor de Tonalidade da Banda -->
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:10px 14px; background:rgba(0,0,0,0.2); border-radius:14px;">
          <span style="font-size:12px; color:#94a3b8;">Tom Harmônico da Banda:</span>
          <div class="band-key-selector" style="display:flex; gap:6px; flex-wrap:wrap;">
            ${["C", "D", "E", "F", "G", "A", "B", "Em"].map(k => `
              <button 
                class="band-key-chip" 
                id="band-key-${k}"
                onclick="window.setBandKey('${k}')"
                style="padding:4px 10px; font-size:12px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#E2E8F0; cursor:pointer;"
              >
                ${k}
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Trilhas Individuais: Bateria, Baixo, Teclado -->
        <div class="band-tracks-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
          
          <!-- Trilha 1: Bateria -->
          <div class="band-track-card" id="track-card-drums" style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">🥁</span>
                <div>
                  <strong style="font-size:13px; display:block;">Bateria</strong>
                  <span style="font-size:10px; color:#94a3b8;">Kick • Snare • Hi-Hat</span>
                </div>
              </div>
              <button 
                id="btn-mute-drums"
                class="tag-btn" 
                style="padding:4px 10px; font-size:11px;"
                onclick="window.toggleTrackMute('drums')"
              >
                Mute
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:11px; color:#94a3b8; width:28px;">Vol</span>
              <input 
                type="range" 
                class="metro-volume-slider" 
                min="0" 
                max="1" 
                step="0.05" 
                value="0.8" 
                id="slider-vol-drums"
                oninput="window.setTrackVolume('drums', this.value)" 
              />
              <span style="font-size:11px; color:#7EE7FF; width:34px; text-align:right;" id="val-vol-drums">80%</span>
            </div>
          </div>

          <!-- Trilha 2: Baixo -->
          <div class="band-track-card" id="track-card-bass" style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">🎸</span>
                <div>
                  <strong style="font-size:13px; display:block;">Baixo</strong>
                  <span style="font-size:10px; color:#94a3b8;">Sub-Bass Analógico</span>
                </div>
              </div>
              <button 
                id="btn-mute-bass"
                class="tag-btn" 
                style="padding:4px 10px; font-size:11px;"
                onclick="window.toggleTrackMute('bass')"
              >
                Mute
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:11px; color:#94a3b8; width:28px;">Vol</span>
              <input 
                type="range" 
                class="metro-volume-slider" 
                min="0" 
                max="1" 
                step="0.05" 
                value="0.75" 
                id="slider-vol-bass"
                oninput="window.setTrackVolume('bass', this.value)" 
              />
              <span style="font-size:11px; color:#7EE7FF; width:34px; text-align:right;" id="val-vol-bass">75%</span>
            </div>
          </div>

          <!-- Trilha 3: Teclado -->
          <div class="band-track-card" id="track-card-keyboard" style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">🎹</span>
                <div>
                  <strong style="font-size:13px; display:block;">Teclado</strong>
                  <span style="font-size:10px; color:#94a3b8;">Pad Celestial Worship</span>
                </div>
              </div>
              <button 
                id="btn-mute-keyboard"
                class="tag-btn" 
                style="padding:4px 10px; font-size:11px;"
                onclick="window.toggleTrackMute('keyboard')"
              >
                Mute
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:11px; color:#94a3b8; width:28px;">Vol</span>
              <input 
                type="range" 
                class="metro-volume-slider" 
                min="0" 
                max="1" 
                step="0.05" 
                value="0.7" 
                id="slider-vol-keyboard"
                oninput="window.setTrackVolume('keyboard', this.value)" 
              />
              <span style="font-size:11px; color:#7EE7FF; width:34px; text-align:right;" id="val-vol-keyboard">70%</span>
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
