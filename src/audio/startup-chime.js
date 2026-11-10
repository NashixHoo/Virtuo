// =============================================================
// VIRTUO EXPERIENCE SYSTEM — STARTUP CHIME
// src/audio/startup-chime.js
// Assinatura sonora oficial sintetizada via Web Audio API
// Duração: ~800ms | Ataque suave | Acorde limpo | Nota cristalina
// =============================================================

const STORAGE_KEY = 'virtuo_startup_sound';

/**
 * Verifica se o som de inicialização está ativado nas preferências
 * @returns {boolean}
 */
export function isStartupChimeEnabled() {
  if (typeof localStorage === 'undefined') {
    return true;
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === null ? true : saved !== 'false';
}

/**
 * Salva a preferência do som de inicialização
 * @param {boolean} enabled 
 */
export function setStartupChimeEnabled(enabled) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }
}

/**
 * Toca a assinatura sonora oficial do Virtuo (~800ms)
 * Acorde límpido celestial com nota cristalina no topo
 * @returns {Promise<boolean>} Retorna true se tocou com sucesso
 */
export async function playStartupChime() {
  if (!isStartupChimeEnabled()) {
    return false;
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Se o navegador bloquear por falta de gesto do usuário, prossegue silenciosamente
        return false;
      }
    }

    const now = ctx.currentTime;
    const duration = 0.82; // ~800ms

    // Master bus com limiter/compressor suave para evitar distorção
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    // Ataque suave (40ms)
    masterGain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
    // Sustentação e decaimento cristalino
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.35);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // Filtro celestial suave (corte de frequências agressivas)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + 0.3);
    filter.connect(masterGain);

    // Frequências do acorde límpido Virtuo (D maj9 celestial):
    // D4 (293.66Hz), F#4 (369.99Hz), A4 (440.00Hz), C#5 (554.37Hz)
    const chordFrequencies = [293.66, 369.99, 440.00, 554.37];

    chordFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Leve detune estéreo/harmônico para sensação aveludada
      osc.detune.setValueAtTime((idx - 1.5) * 3, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(0.22 / chordFrequencies.length, now + 0.05 + idx * 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.05);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(now + idx * 0.012);
      osc.stop(now + duration);
    });

    // Nota cristalina final no topo (E6 - 1318.51Hz / harmônico sino suave)
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1318.51, now + 0.08);

    bellGain.gain.setValueAtTime(0.0001, now + 0.08);
    bellGain.gain.exponentialRampToValueAtTime(0.12, now + 0.12);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    bellOsc.connect(bellGain);
    bellGain.connect(masterGain);

    bellOsc.start(now + 0.08);
    bellOsc.stop(now + duration);

    // Libera o AudioContext após a execução para evitar memory leaks
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, (duration + 0.15) * 1000);

    return true;
  } catch (err) {
    console.warn('[Virtuo Audio] Não foi possível reproduzir som de inicialização:', err);
    return false;
  }
}
