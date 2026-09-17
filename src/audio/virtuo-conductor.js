// =============================================================
// VIRTUO CONDUCTOR — CONDUÇÃO CONTEXTUAL & INTELIGÊNCIA MUSICAL
// src/audio/virtuo-conductor.js
// Observador musical e coordenador de dinâmicas e eventos de ensaio / palco
// REGRA ARQUITETURAL ABSOLUTA: O Conductor NÃO toca áudio!
// =============================================================

export const CONDUCTOR_STATES = {
  IDLE: "IDLE",
  INTRO: "INTRO",
  VERSE: "VERSE",
  PRE_CHORUS: "PRE_CHORUS",
  CHORUS: "CHORUS",
  BRIDGE: "BRIDGE",
  SOLO: "SOLO",
  BREAK: "BREAK",
  SPONTANEOUS: "SPONTANEOUS",
  OUTRO: "OUTRO"
};

export const CONDUCTOR_EVENTS = {
  STATE_CHANGE: "STATE_CHANGE",
  SECTION_CHANGE: "SECTION_CHANGE",
  INTENSITY_CHANGE: "INTENSITY_CHANGE",
  SONG_STARTED: "SONG_STARTED",
  SONG_ENDED: "SONG_ENDED",
  KEY_CHANGED: "KEY_CHANGED",
  BPM_CHANGED: "BPM_CHANGED",
  LIVE_CONNECTED: "LIVE_CONNECTED",
  MISSION_READY: "MISSION_READY",
  CHECKIN_COMPLETED: "CHECKIN_COMPLETED",
  BAND_READY: "BAND_READY",
  LOOP_ITERATION: "LOOP_ITERATION"
};

export class VirtuoConductor {
  constructor() {
    this.currentState = CONDUCTOR_STATES.IDLE;
    this.currentSection = "intro";
    this.currentBpm = 74;
    this.currentKey = "G";
    this.currentBar = 0;
    this.currentStep = 0;
    this.suggestedIntensity = 2;
    this.activeSong = null;
    this.activeMission = null;
    this.isLiveConnected = false;
    this.loopCount = 0;
    this.isLooping = false;
    this.activeInstruments = {
      drums: true,
      bass: true,
      keyboard: true,
      guitar: true
    };

    this.subscribers = new Set();
    this.eventListeners = new Map();
  }

  // -----------------------------------------------------------
  // 1. GESTÃO DE EVENTOS E ASSINATURAS
  // -----------------------------------------------------------

  subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    this.subscribers.add(callback);
    callback(this.getContextSnapshot());
    return () => this.subscribers.delete(callback);
  }

  on(eventName, handler) {
    if (typeof handler !== "function") return () => {};
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(handler);
    return () => this.eventListeners.get(eventName)?.delete(handler);
  }

  emit(eventName, payload = {}) {
    const handlers = this.eventListeners.get(eventName);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(payload); } catch (err) { console.warn("[Conductor.emit]", err); }
      }
    }
    this._notifySubscribers(eventName, payload);
  }

  _notifySubscribers(lastEvent = null, payload = null) {
    const snapshot = this.getContextSnapshot();
    snapshot.lastEvent = lastEvent;
    snapshot.lastPayload = payload;
    for (const sub of this.subscribers) {
      try { sub(snapshot); } catch {}
    }
  }

  getContextSnapshot() {
    return {
      state: this.currentState,
      section: this.currentSection,
      bpm: this.currentBpm,
      key: this.currentKey,
      bar: this.currentBar,
      step: this.currentStep,
      suggestedIntensity: this.suggestedIntensity,
      song: this.activeSong,
      mission: this.activeMission,
      isLiveConnected: this.isLiveConnected,
      isLooping: this.isLooping,
      loopCount: this.loopCount,
      activeInstruments: { ...this.activeInstruments }
    };
  }

  getState() {
    return {
      currentState: this.currentState,
      currentSection: this.currentSection,
      bpm: this.currentBpm,
      currentKey: this.currentKey,
      intensity: this.suggestedIntensity,
      ...this.getContextSnapshot()
    };
  }

  // -----------------------------------------------------------
  // 2. TRANSIÇÃO DE ESTADOS E OBSERVAÇÃO
  // -----------------------------------------------------------

  /**
   * Mapeia uma string de seção para um estado de Conductor
   */
  mapSectionToState(section) {
    if (!section) return CONDUCTOR_STATES.VERSE;
    const s = String(section).toLowerCase();
    if (s.includes("intro")) return CONDUCTOR_STATES.INTRO;
    if (s.includes("refr") || s.includes("chorus")) return CONDUCTOR_STATES.CHORUS;
    if (s.includes("pr") || s.includes("pre")) return CONDUCTOR_STATES.PRE_CHORUS;
    if (s.includes("pont") || s.includes("bridge")) return CONDUCTOR_STATES.BRIDGE;
    if (s.includes("solo")) return CONDUCTOR_STATES.SOLO;
    if (s.includes("break") || s.includes("parada")) return CONDUCTOR_STATES.BREAK;
    if (s.includes("espont") || s.includes("spontan")) return CONDUCTOR_STATES.SPONTANEOUS;
    if (s.includes("fim") || s.includes("final") || s.includes("outro")) return CONDUCTOR_STATES.OUTRO;
    return CONDUCTOR_STATES.VERSE;
  }

  /**
   * Atualiza a seção atual e calcula dinâmicas sugeridas
   */
  setSection(section) {
    const prevState = this.currentState;
    this.currentSection = section;
    this.currentState = this.mapSectionToState(section);

    // Determina a intensidade sugerida automaticamente com base no papel dramático da seção
    this.suggestedIntensity = this.suggestDynamicIntensityForSection(this.currentState);

    this.emit(CONDUCTOR_EVENTS.SECTION_CHANGE, {
      section: this.currentSection,
      state: this.currentState,
      suggestedIntensity: this.suggestedIntensity
    });

    if (prevState !== this.currentState) {
      this.emit(CONDUCTOR_EVENTS.STATE_CHANGE, {
        previousState: prevState,
        currentState: this.currentState
      });
    }
  }

  /**
   * Sugestão determinística de intensidade (1 a 5)
   */
  suggestDynamicIntensityForSection(state) {
    switch (state) {
      case CONDUCTOR_STATES.INTRO:
        return 1;
      case CONDUCTOR_STATES.VERSE:
        return 2;
      case CONDUCTOR_STATES.PRE_CHORUS:
        return 3;
      case CONDUCTOR_STATES.CHORUS:
      case CONDUCTOR_STATES.SOLO:
        return 4;
      case CONDUCTOR_STATES.BRIDGE:
        return 3;
      case CONDUCTOR_STATES.BREAK:
        return 1;
      case CONDUCTOR_STATES.OUTRO:
        return 5;
      default:
        return 2;
    }
  }

  /**
   * Sugere configurações dinâmicas para o arranjo da banda
   */
  suggestDynamicAdjustments(section, currentIntensity = null) {
    const normState = this.mapSectionToState(section);
    const intensity = currentIntensity !== null ? currentIntensity : this.suggestDynamicIntensityForSection(normState);

    return {
      state: normState,
      intensity,
      drums: {
        useRide: normState === CONDUCTOR_STATES.CHORUS || normState === CONDUCTOR_STATES.BRIDGE || intensity >= 4,
        useCrashOnDownbeat: normState === CONDUCTOR_STATES.CHORUS || normState === CONDUCTOR_STATES.OUTRO,
        snareActivity: normState === CONDUCTOR_STATES.INTRO || normState === CONDUCTOR_STATES.BREAK ? "silent" : (intensity >= 3 ? "full" : "light"),
        ghostNotesEnabled: intensity >= 2 && normState !== CONDUCTOR_STATES.BREAK
      },
      bass: {
        patternStyle: normState === CONDUCTOR_STATES.CHORUS ? "walking_octaves" : (intensity <= 2 ? "root_only" : "root_fifth"),
        sustainLevel: normState === CONDUCTOR_STATES.BRIDGE || normState === CONDUCTOR_STATES.BREAK ? "long" : "standard"
      },
      keyboard: {
        mode: normState === CONDUCTOR_STATES.INTRO || normState === CONDUCTOR_STATES.BRIDGE ? "pad" : "piano",
        voicingSpread: intensity >= 4 ? "open" : "close"
      },
      guitar: {
        style: normState === CONDUCTOR_STATES.INTRO ? "arpeggio" : (intensity >= 4 ? "strum_heavy" : "strum_clean")
      }
    };
  }

  // -----------------------------------------------------------
  // 3. OBSERVAÇÃO DE MÚSICA, ENSAIO E PALCO
  // -----------------------------------------------------------

  notifySongStarted(song, key, bpm) {
    this.activeSong = song;
    if (key) this.currentKey = key;
    if (bpm) this.currentBpm = bpm;
    this.currentState = CONDUCTOR_STATES.INTRO;
    this.currentSection = "intro";
    this.suggestedIntensity = 1;

    this.emit(CONDUCTOR_EVENTS.SONG_STARTED, {
      song,
      key: this.currentKey,
      bpm: this.currentBpm
    });
  }

  notifySongEnded(song) {
    this.currentState = CONDUCTOR_STATES.IDLE;
    this.emit(CONDUCTOR_EVENTS.SONG_ENDED, { song: song || this.activeSong });
  }

  notifyKeyChanged(newKey, previousKey = null) {
    this.currentKey = newKey;
    this.emit(CONDUCTOR_EVENTS.KEY_CHANGED, {
      newKey,
      previousKey
    });
  }

  notifyBpmChanged(newBpm) {
    this.currentBpm = newBpm;
    this.emit(CONDUCTOR_EVENTS.BPM_CHANGED, { bpm: newBpm });
  }

  notifyBarTick(bar, step) {
    this.currentBar = bar;
    this.currentStep = step;
  }

  notifyLoopIteration(iterationNumber, totalTarget) {
    this.loopCount = iterationNumber;
    this.isLooping = true;
    this.emit(CONDUCTOR_EVENTS.LOOP_ITERATION, {
      iterationNumber,
      totalTarget
    });
  }

  notifyLiveConnected(sessionData = {}) {
    this.isLiveConnected = true;
    this.emit(CONDUCTOR_EVENTS.LIVE_CONNECTED, sessionData);
  }

  notifyMissionReady(mission) {
    this.activeMission = mission;
    this.emit(CONDUCTOR_EVENTS.MISSION_READY, { mission });
  }

  notifyCheckInCompleted(musicianInfo) {
    this.emit(CONDUCTOR_EVENTS.CHECKIN_COMPLETED, musicianInfo);
  }

  notifyBandReady(status = {}) {
    this.emit(CONDUCTOR_EVENTS.BAND_READY, status);
  }
}

export const virtuoConductor = new VirtuoConductor();
