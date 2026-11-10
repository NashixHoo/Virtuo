// =============================================================
// VIRTUO AUDIO ENGINE: METRONOME (WEB AUDIO API)
// src/audio/metronome.js
//
// Precisão rítmica com lookahead scheduling (Chris Wilson pattern)
// Sem dependência de setInterval por batida.
// Síntese acústica nativa (sem arquivos de áudio externos).
// Arquitetura expansível para Bateria Virtual, Baixo Virtual,
// Virtuo Session e Banda Virtual.
// =============================================================

export const METRONOME_CONSTANTS = {
  MIN_BPM: 40,
  MAX_BPM: 240,
  DEFAULT_BPM: 74,
  DEFAULT_BEATS_PER_BAR: 4,
  DEFAULT_SUBDIVISION: "1/4", // "1/4" | "1/8" | "1/16"
  LOOKAHEAD_INTERVAL_MS: 25,   // Intervalo do timer mestre de varredura
  SCHEDULE_AHEAD_TIME_SEC: 0.1 // Janela de agendamento antecipado no AudioContext
};

export const SUBDIVISIONS = {
  "1/4": { factor: 1, label: "1/4", name: "Semínima" },
  "1/8": { factor: 2, label: "1/8", name: "Colcheia" },
  "1/16": { factor: 4, label: "1/16", name: "Semicolcheia" }
};

export class VirtuoMetronomeEngine {
  constructor(options = {}) {
    // Configurações e Estado
    this.bpm = this.clampBpm(options.bpm || METRONOME_CONSTANTS.DEFAULT_BPM);
    this.beatsPerBar = options.beatsPerBar || METRONOME_CONSTANTS.DEFAULT_BEATS_PER_BAR;
    this.subdivision = options.subdivision || METRONOME_CONSTANTS.DEFAULT_SUBDIVISION;
    this.volume = typeof options.volume === "number" ? Math.max(0, Math.min(1, options.volume)) : 0.8;
    this.accentFirstBeat = options.accentFirstBeat !== false; // Default true

    // Estado de reprodução
    this.isPlaying = false;

    // Web Audio API
    this.audioCtx = null;
    this.masterGain = null;

    // Agendamento Lookahead
    this._nextNoteTime = 0.0;
    this._currentSubdivisionTick = 0; // Tick dentro do compasso completo
    this._currentBeatNumber = 1;      // Tempo musical (1..beatsPerBar)
    this._timerWorker = null;

    // Fila de notas agendadas para sincronização visual precisa
    // Cada item: { time: number, beatNumber: number, isAccent: boolean, isMainBeat: boolean }
    this._scheduledNotesQueue = [];

    // Tap Tempo interno
    this._tapTimestamps = [];
    this._maxTapIdleMs = 2500;

    // Callbacks do ecossistema VIRTUO
    this.onTick = typeof options.onTick === "function" ? options.onTick : null;
    this.onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : null;

    // Extensibilidade futura (Bateria, Baixo, Session, Banda Virtual)
    this.extensionHooks = {
      onBeatScheduled: null, // (audioTime, beatNumber, isAccent) => void
      onBarCompleted: null,  // (barCount) => void
      syncClock: null        // Para sincronizar WebSocket com a banda
    };
  }

  // -------------------------------------------------------------
  // CONTROLE DO AUDIOCONTEXT (Respeitando Autoplay Policies)
  // -------------------------------------------------------------
  _ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = (typeof window !== "undefined")
        ? (window.AudioContext || window.webkitAudioContext)
        : null;

      if (!AudioContextClass) {
        return null;
      }

      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }

    // Se estiver suspenso pelo navegador, reativa com a interação do usuário
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  // -------------------------------------------------------------
  // MÉTODOS DE CONTROLE PRINCIPAIS (Iniciar, Pausar, Parar)
  // -------------------------------------------------------------
  start() {
    if (this.isPlaying) return;

    const ctx = this._ensureAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    this._currentSubdivisionTick = 0;
    this._currentBeatNumber = 1;
    this._scheduledNotesQueue = [];

    // Agenda a primeira batida imediatamente (com pequena margem de estabilidade de 20ms)
    this._nextNoteTime = ctx.currentTime + 0.02;

    // Inicia o timer mestre de lookahead
    this._startLookaheadLoop();

    this._notifyState();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this._stopLookaheadLoop();
    this._scheduledNotesQueue = [];
    this._notifyState();
  }

  stop() {
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this._stopLookaheadLoop();
    this._currentSubdivisionTick = 0;
    this._currentBeatNumber = 1;
    this._scheduledNotesQueue = [];

    if (wasPlaying) {
      this._notifyState();
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  // -------------------------------------------------------------
  // LOOKAHEAD SCHEDULER (Chris Wilson Web Audio Pattern)
  // -------------------------------------------------------------
  _startLookaheadLoop() {
    if (this._timerWorker) {
      clearInterval(this._timerWorker);
    }

    // Executa a varredura a cada 25ms para agendar notas nos próximos 100ms
    this._timerWorker = setInterval(() => {
      this._scheduler();
    }, METRONOME_CONSTANTS.LOOKAHEAD_INTERVAL_MS);

    // Também dispara um loop leve via requestAnimationFrame para despachar
    // o feedback visual exatamente no momento em que a nota soa.
    this._startVisualDispatcher();
  }

  _stopLookaheadLoop() {
    if (this._timerWorker) {
      clearInterval(this._timerWorker);
      this._timerWorker = null;
    }
  }

  _scheduler() {
    if (!this.isPlaying || !this.audioCtx) return;

    const scheduleUntilTime = this.audioCtx.currentTime + METRONOME_CONSTANTS.SCHEDULE_AHEAD_TIME_SEC;

    while (this._nextNoteTime < scheduleUntilTime) {
      this._scheduleNote(this._nextNoteTime, this._currentSubdivisionTick);
      this._advanceNote();
    }
  }

  _advanceNote() {
    // Calcula o intervalo de tempo entre cada subdivisão
    const subInfo = SUBDIVISIONS[this.subdivision] || SUBDIVISIONS["1/4"];
    const subFactor = subInfo.factor; // 1, 2 ou 4
    
    // Intervalo de uma semínima = 60 / BPM.
    // Intervalo de cada tick da subdivisão = (60 / BPM) / subFactor
    const secondsPerTick = (60.0 / this.bpm) / subFactor;
    this._nextNoteTime += secondsPerTick;

    // Avança o contador de subdivisão
    this._currentSubdivisionTick++;

    const totalTicksPerBar = this.beatsPerBar * subFactor;
    if (this._currentSubdivisionTick >= totalTicksPerBar) {
      this._currentSubdivisionTick = 0;
      if (typeof this.extensionHooks.onBarCompleted === "function") {
        this.extensionHooks.onBarCompleted();
      }
    }

    // Tempo musical da semínima (1..beatsPerBar)
    this._currentBeatNumber = Math.floor(this._currentSubdivisionTick / subFactor) + 1;
  }

  // -------------------------------------------------------------
  // SÍNTESE ACÚSTICA NATIVA (Zero arquivos externos, Apple-Class)
  // -------------------------------------------------------------
  _scheduleNote(time, tick) {
    if (!this.audioCtx) return;

    const subInfo = SUBDIVISIONS[this.subdivision] || SUBDIVISIONS["1/4"];
    const subFactor = subInfo.factor;

    // Determina se este tick coincide com a cabeça da semínima (tempo principal 1, 2, 3, 4)
    const isMainBeat = (tick % subFactor === 0);
    const beatIndex = Math.floor(tick / subFactor) + 1; // 1, 2, 3, 4
    const isFirstBeatOfBar = (tick === 0);
    const isAccent = isFirstBeatOfBar && this.accentFirstBeat;

    // Síntese sonora via OscillatorNode + GainNode Envelope
    const osc = this.audioCtx.createOscillator();
    const noteGain = this.audioCtx.createGain();

    // Definição de timbre acústico celestial do Virtuo
    // - Tempo 1 Acentuado: 1760 Hz (A6 Cristalino e cortante de palco)
    // - Tempos 2, 3, 4: 880 Hz (A5 Madeira suave / Click definido)
    // - Subdivisões (1/8 e 1/16): 440 Hz (A4 Suave e sutil para não sobrecarregar o ouvido)
    let freq = 880;
    let decay = 0.045; // 45ms
    let clickVolume = 1.0;

    if (isMainBeat) {
      if (isAccent) {
        freq = 1760; // Destaque celestial cristalino
        decay = 0.065;
        clickVolume = 1.0;
      } else {
        freq = 880; // Click de semínima normal
        decay = 0.045;
        clickVolume = 0.75;
      }
    } else {
      // Subdivisão rápida (colcheia/semicolcheia)
      freq = 587.33; // D5 suave
      decay = 0.025;
      clickVolume = 0.35;
    }

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    // Envelope percussivo suave (sem estalo/click no corte)
    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.exponentialRampToValueAtTime(clickVolume, time + 0.003);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    // Conecta à saída mestre
    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + decay + 0.01);

    // Adiciona à fila para o despachador visual de precisão
    this._scheduledNotesQueue.push({
      time,
      beatNumber: beatIndex,
      isAccent,
      isMainBeat,
      tick
    });

    // Hook para extensões futuras (Bateria Virtual, Baixo, MIDI, Banda)
    if (typeof this.extensionHooks.onBeatScheduled === "function") {
      this.extensionHooks.onBeatScheduled(time, beatIndex, isAccent);
    }
  }

  // -------------------------------------------------------------
  // DESPACHADOR DE SINCRONIA VISUAL (AudioContext clock sync)
  // -------------------------------------------------------------
  _startVisualDispatcher() {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
      return;
    }

    const checkVisualQueue = () => {
      if (!this.isPlaying) return;

      if (this.audioCtx && this._scheduledNotesQueue.length > 0) {
        const currentTime = this.audioCtx.currentTime;

        // Despacha todas as notas que já soaram ou estão soando agora
        while (this._scheduledNotesQueue.length > 0 && this._scheduledNotesQueue[0].time <= currentTime) {
          const currentNote = this._scheduledNotesQueue.shift();

          if (this.onTick) {
            try {
              this.onTick({
                beatNumber: currentNote.beatNumber,
                isAccent: currentNote.isAccent,
                isMainBeat: currentNote.isMainBeat,
                beatsPerBar: this.beatsPerBar,
                bpm: this.bpm,
                subdivision: this.subdivision
              });
            } catch (err) {
              console.error("[Virtuo Metronome] onTick callback error:", err);
            }
          }
        }
      }

      if (this.isPlaying) {
        requestAnimationFrame(checkVisualQueue);
      }
    };

    requestAnimationFrame(checkVisualQueue);
  }

  // -------------------------------------------------------------
  // CONTROLE DE BPM E VALIDAÇÕES (40 a 240)
  // -------------------------------------------------------------
  clampBpm(val) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return METRONOME_CONSTANTS.DEFAULT_BPM;
    return Math.max(METRONOME_CONSTANTS.MIN_BPM, Math.min(METRONOME_CONSTANTS.MAX_BPM, num));
  }

  setBpm(newBpm) {
    const clamped = this.clampBpm(newBpm);
    const changed = this.bpm !== clamped;
    this.bpm = clamped;

    if (changed) {
      this._notifyState();
    }
    return this.bpm;
  }

  adjustBpm(delta) {
    return this.setBpm(this.bpm + delta);
  }

  // -------------------------------------------------------------
  // TAP TEMPO INTELIGENTE (Média ponderada + descarte de pausas)
  // -------------------------------------------------------------
  tap() {
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

    // Se o último toque foi há mais de 2.5s, reinicia a contagem
    if (this._tapTimestamps.length > 0) {
      const lastTap = this._tapTimestamps[this._tapTimestamps.length - 1];
      if (now - lastTap > this._maxTapIdleMs) {
        this._tapTimestamps = [];
      }
    }

    this._tapTimestamps.push(now);

    // Mantém no máximo os últimos 5 toques para resposta rápida e precisa
    if (this._tapTimestamps.length > 5) {
      this._tapTimestamps.shift();
    }

    // Precisa de pelo menos 2 toques para calcular o tempo entre batidas
    if (this._tapTimestamps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this._tapTimestamps.length; i++) {
        intervals.push(this._tapTimestamps[i] - this._tapTimestamps[i - 1]);
      }

      const avgIntervalMs = intervals.reduce((acc, curr) => acc + curr, 0) / intervals.length;
      if (avgIntervalMs > 0) {
        const calculatedBpm = Math.round(60000 / avgIntervalMs);
        this.setBpm(calculatedBpm);
      }
    }

    return {
      bpm: this.bpm,
      tapCount: this._tapTimestamps.length
    };
  }

  resetTap() {
    this._tapTimestamps = [];
  }

  // -------------------------------------------------------------
  // CONFIGURAÇÕES DE PERFORMANCE (Subdivisão, Acento, Volume)
  // -------------------------------------------------------------
  setSubdivision(sub) {
    if (SUBDIVISIONS[sub]) {
      this.subdivision = sub;
      this._notifyState();
    }
  }

  setAccentFirstBeat(enable) {
    this.accentFirstBeat = !!enable;
    this._notifyState();
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, parseFloat(vol) || 0));
    this.volume = clamped;

    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }

    this._notifyState();
  }

  setBeatsPerBar(beats) {
    const num = parseInt(beats, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      this.beatsPerBar = num;
      this._notifyState();
    }
  }

  // -------------------------------------------------------------
  // INTEGRAÇÃO COM MÚSICAS (BPM Temporário de Sessão)
  // -------------------------------------------------------------
  useSongBpm(songBpm) {
    if (!songBpm) return;
    const parsed = parseInt(songBpm, 10);
    if (!isNaN(parsed) && parsed >= METRONOME_CONSTANTS.MIN_BPM && parsed <= METRONOME_CONSTANTS.MAX_BPM) {
      this.setBpm(parsed);
    }
  }

  // -------------------------------------------------------------
  // LIMPEZA E DESALOCAÇÃO COMPLETA
  // -------------------------------------------------------------
  destroy() {
    this.stop();
    this._scheduledNotesQueue = [];
    this.onTick = null;
    this.onStateChange = null;

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.close().catch(() => {});
      } catch(e) {}
    }
    this.audioCtx = null;
    this.masterGain = null;
  }

  _notifyState() {
    if (this.onStateChange) {
      try {
        this.onStateChange(this.getState());
      } catch (err) {
        console.error("[Virtuo Metronome] onStateChange error:", err);
      }
    }
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      bpm: this.bpm,
      beatsPerBar: this.beatsPerBar,
      subdivision: this.subdivision,
      volume: this.volume,
      accentFirstBeat: this.accentFirstBeat,
      currentBeatNumber: this._currentBeatNumber
    };
  }
}
