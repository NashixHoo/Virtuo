// =============================================================
// VIRTUO MUSICAL EVENT SYSTEM
// src/audio/musical-events.js
// Camada de eventos musicais tipada e unificada para o Virtuo
// =============================================================

/**
 * Evento musical base para toda a orquestração e players da banda
 */
export class MusicalEvent {
  constructor({
    instrument = "master",
    type = "note",
    note = null,
    notes = [],
    velocity = 0.8,
    duration = 0.5,
    startBeat = 1,
    step = 0,
    bar = 0,
    section = "verse",
    chord = "C",
    intensity = 3,
    time = 0,
    metadata = {}
  } = {}) {
    this.instrument = instrument;
    this.type = type;
    this.note = note;
    this.notes = Array.isArray(notes) ? [...notes] : (note !== null ? [note] : []);
    this.velocity = Math.max(0, Math.min(1, velocity));
    this.duration = Math.max(0.01, duration);
    this.startBeat = startBeat;
    this.step = step;
    this.bar = bar;
    this.section = section;
    this.chord = chord;
    this.intensity = intensity;
    this.time = time;
    this.metadata = { ...metadata };
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      instrument: this.instrument,
      type: this.type,
      note: this.note,
      notes: this.notes,
      velocity: this.velocity,
      duration: this.duration,
      startBeat: this.startBeat,
      step: this.step,
      bar: this.bar,
      section: this.section,
      chord: this.chord,
      intensity: this.intensity,
      time: this.time,
      metadata: this.metadata
    };
  }
}

/**
 * Evento específico para nota ou linha de baixo
 */
export class BassNoteEvent extends MusicalEvent {
  constructor(params = {}) {
    super({
      instrument: "bass",
      type: "note",
      ...params
    });
    this.frequency = params.frequency || (typeof this.note === "number" ? this.note : null);
    this.mode = params.mode || "BASS_NORMAL";
    this.isApproach = !!params.isApproach;
    this.isRoot = params.isRoot !== undefined ? params.isRoot : true;
  }
}

/**
 * Evento específico para voicings e acordes de teclado/piano
 */
export class KeyboardChordEvent extends MusicalEvent {
  constructor(params = {}) {
    super({
      instrument: "keyboard",
      type: "chord",
      ...params
    });
    this.frequencies = params.frequencies || [];
    this.keyboardMode = params.keyboardMode || "pad";
    this.voicing = params.voicing || [];
  }
}

/**
 * Evento específico para batidas (strum) ou arpejos de violão/guitarra
 */
export class GuitarStrumEvent extends MusicalEvent {
  constructor(params = {}) {
    super({
      instrument: "guitar",
      type: params.pattern === "arpeggio" ? "arpeggio" : "strum",
      ...params
    });
    this.pattern = params.pattern || "strum";
    this.direction = params.direction || (params.step % 2 === 0 ? "DOWN" : "UP");
    this.stringFrequencies = params.stringFrequencies || [];
  }
}

/**
 * Evento específico para peças de bateria e viradas (fills)
 */
export class DrumEvent extends MusicalEvent {
  constructor(params = {}) {
    super({
      instrument: "drums",
      type: params.isFill ? "fill" : "hit",
      ...params
    });
    this.element = params.element || "kick"; // kick, snare, closedHat, openHat, crash, tom, ride
    this.isAccent = !!params.isAccent;
    this.isGhost = !!params.isGhost;
    this.isFill = !!params.isFill;
  }
}
