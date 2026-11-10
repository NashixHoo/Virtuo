// =============================================================
// VIRTUO REAL SOUND ENGINE — SAMPLE PLAYER
// src/audio/sample-player.js
// Reprodutor de áudio Web Audio API para samples reais
// Suporte a polifonia, envelopes dinâmicos, pitch shifting e barramentos
// =============================================================

export class SamplePlayer {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.activeVoices = new Set();
    this.maxPolyphony = 48; // Limite seguro para evitar sobrecarga de nós de áudio em mobile
  }

  setAudioContext(audioCtx) {
    this.audioCtx = audioCtx;
    this.stopAll();
  }

  /**
   * Dispara a reprodução de um AudioBuffer através de um grafo dedicado:
   * AudioBufferSourceNode -> GainNode (Envelope) -> Destination Node
   * 
   * @param {AudioBuffer} buffer - Buffer de áudio a reproduzir
   * @param {Object} options - Parâmetros de execução
   * @returns {Object|null} Objeto de controle da voz disparada
   */
  play(buffer, options = {}) {
    if (!this.audioCtx || !buffer) return null;

    const {
      time = this.audioCtx.currentTime,
      velocity = 1.0,
      duration = buffer.duration || 1.0,
      playbackRate = 1.0,
      attack = 0.004,
      release = 0.08,
      destination = null,
      volume = 1.0,
      detune = 0
    } = options;

    try {
      // 1. Gerencia teto de polifonia descartando a voz mais antiga se necessário
      if (this.activeVoices.size >= this.maxPolyphony) {
        const oldestVoice = this.activeVoices.values().next().value;
        if (oldestVoice) {
          try { oldestVoice.stop(); } catch {}
          this.activeVoices.delete(oldestVoice);
        }
      }

      // 2. Instancia nós da Web Audio API
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      // 3. Aplica Pitch Shift / Playback Rate
      const safeRate = Math.max(0.2, Math.min(4.0, playbackRate));
      if (source.playbackRate.setValueAtTime) {
        source.playbackRate.setValueAtTime(safeRate, time);
      } else {
        source.playbackRate.value = safeRate;
      }

      if (detune && source.detune && source.detune.setValueAtTime) {
        source.detune.setValueAtTime(detune, time);
      }

      // 4. Envelope Dinâmico e Curva de Velocidade Natural (Log/Exp)
      const gainNode = this.audioCtx.createGain();
      
      // Curva de velocidade musical: valores mais baixos soam suavemente, altos com pegada cheia
      const normalizedVel = Math.max(0.05, Math.min(1.0, velocity));
      const targetGain = Math.min(1.0, (normalizedVel * 0.95) * Math.max(0.0, volume));

      const safeAttack = Math.max(0.001, attack);
      const safeDuration = Math.max(safeAttack + 0.02, duration);
      const safeRelease = Math.min(safeDuration * 0.4, Math.max(0.02, release));
      const sustainEnd = time + Math.max(safeAttack, safeDuration - safeRelease);
      const noteEnd = time + safeDuration;

      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(targetGain, time + safeAttack);
      gainNode.gain.setValueAtTime(targetGain, sustainEnd);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      // 5. Conexão no Barramento do Instrumento / Master
      const targetBus = destination || this.audioCtx.destination;
      source.connect(gainNode);
      gainNode.connect(targetBus);

      // 6. Ciclo de vida e agendamento
      source.start(time);
      source.stop(noteEnd + 0.05);

      const voice = {
        source,
        gainNode,
        startTime: time,
        endTime: noteEnd,
        stop: (stopTime = this.audioCtx.currentTime) => {
          try {
            gainNode.gain.cancelScheduledValues(stopTime);
            gainNode.gain.linearRampToValueAtTime(0.0001, stopTime + 0.02);
            source.stop(stopTime + 0.03);
          } catch {}
        }
      };

      this.activeVoices.add(voice);

      source.onended = () => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch {}
        this.activeVoices.delete(voice);
      };

      return voice;
    } catch (err) {
      return null;
    }
  }

  /**
   * Interrompe imediatamente todas as vozes ativas
   */
  stopAll() {
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    for (const voice of this.activeVoices) {
      try {
        voice.stop(now);
      } catch {}
    }
    this.activeVoices.clear();
  }

  /**
   * Retorna a quantidade de vozes atualmente em reprodução
   */
  getActiveVoiceCount() {
    return this.activeVoices.size;
  }
}
