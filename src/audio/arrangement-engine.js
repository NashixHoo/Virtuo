// =============================================================
// VIRTUO ARRANGEMENT ENGINE
// src/audio/arrangement-engine.js
// Distribuição de papéis musicais, orquestração e execução tímbrica
// =============================================================

export class ArrangementEngine {
  constructor(soundLibrary, harmonicEngine, grooveEngine) {
    this.soundLibrary = soundLibrary;
    this.harmonicEngine = harmonicEngine;
    this.grooveEngine = grooveEngine;
  }

  /**
   * Executa a orquestração de um step do relógio
   */
  scheduleStep(stepInfo, tracksState) {
    if (!this.soundLibrary) return;

    const { step, bar, time, totalStepsPerBar } = stepInfo;

    // Regra de Solo: se qualquer trilha estiver em Solo, apenas as trilhas em solo tocam
    const hasAnySolo = Object.values(tracksState).some(t => t.solo);
    const canPlayTrack = (trackId) => {
      const trk = tracksState[trackId];
      if (!trk || !trk.active || trk.muted || trk.volume <= 0) return false;
      if (hasAnySolo) return trk.solo;
      return true;
    };

    if (this.grooveEngine.intensity <= 0) return; // Intensidade 0 = Silêncio

    const events = this.grooveEngine.getStepEvents(step, totalStepsPerBar);
    const intensity = this.grooveEngine.intensity;
    const style = this.grooveEngine.currentPreset;

    // 1. BATERIA
    if (canPlayTrack("drums") && events.drums) {
      const drumTrack = tracksState.drums;
      const baseVol = drumTrack.volume;

      if (events.drums.playKick) {
        this.soundLibrary.triggerKick(time, events.drums.kickVelocity * baseVol);
      }
      if (events.drums.playSnare) {
        this.soundLibrary.triggerSnare(time, events.drums.snareVelocity * baseVol, events.drums.snareIsGhost);
      }
      if (events.drums.playHihat) {
        this.soundLibrary.triggerHiHat(time, events.drums.hihatVelocity * baseVol, events.drums.hihatIsOpen);
      }
      if (events.drums.playCrash) {
        this.soundLibrary.triggerCrash(time, events.drums.crashVelocity * baseVol);
      }
      if (events.drums.playTom) {
        this.soundLibrary.triggerTom(time, events.drums.tomPitch, events.drums.tomVelocity * baseVol);
      }
    }

    // 2. BAIXO ORGÂNICO (Harmonic Driven - NUNCA UMA NOTA FIXA)
    if (canPlayTrack("bass") && events.bass.play) {
      const bassTrack = tracksState.bass;
      const bassFreq = this.harmonicEngine.getBassFrequency(step, totalStepsPerBar, style, intensity);

      const cutoff = 240 + (intensity * 40);
      this.soundLibrary.triggerBass(
        time,
        bassFreq,
        events.bass.duration,
        events.bass.velocity * bassTrack.volume,
        cutoff
      );
    }

    // 3. TECLADO & PAD (Harmonic Voicings & Celestial Wash)
    if (canPlayTrack("keyboard") && events.keyboard.play) {
      const kbTrack = tracksState.keyboard;
      const mode = kbTrack.mode || "pad";
      const chordFrequencies = this.harmonicEngine.getKeyboardFrequencies(mode, 4);

      this.soundLibrary.triggerKeyboardChord(
        time,
        chordFrequencies,
        mode,
        events.keyboard.duration,
        events.keyboard.velocity * kbTrack.volume
      );
    }

    // 4. GUITARRA & VIOLÃO (Strumming Sweep & Arpeggios)
    if (canPlayTrack("guitar") && events.guitar.play) {
      const gtTrack = tracksState.guitar;
      const pattern = gtTrack.pattern || "arpeggio";
      const chordFreqs = this.harmonicEngine.getGuitarFrequencies(3);

      if (pattern === "strum") {
        // Palhetada com spread de tempo entre as cordas
        this.soundLibrary.triggerGuitarStrum(
          time,
          chordFreqs,
          events.guitar.direction,
          events.guitar.duration,
          events.guitar.velocity * gtTrack.volume
        );
      } else {
        // Arpejo / Dedilhado walking pelas cordas
        const noteIdx = step % chordFreqs.length;
        const noteFreq = chordFreqs[noteIdx] || chordFreqs[0];
        this.soundLibrary.triggerGuitarNote(
          time,
          noteFreq,
          pattern,
          events.guitar.duration,
          events.guitar.velocity * gtTrack.volume
        );
      }
    }
  }
}
