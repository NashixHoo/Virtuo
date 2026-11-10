// =============================================================
// VIRTUO CLOCK (GLOBAL AUDIO SCHEDULER & RHYTHM ENGINE)
// src/audio/virtuo-clock.js
// Relógio mestre unificado Web Audio API Lookahead
// "Nenhum instrumento deve possuir seu próprio relógio independente."
// =============================================================

export class VirtuoClock {
  constructor(audioCtx = null) {
    this.audioCtx = audioCtx;
    this.bpm = 74;
    this.meter = "4/4";
    this.beatsPerBar = 4;
    this.totalStepsPerBar = 8; // 8 colcheias em 4/4, 6 colcheias em 6/8

    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.currentBar = 0;

    this.nextStepTime = 0.0;
    this.scheduleAheadTime = 0.1; // 100ms lookahead
    this.lookaheadInterval = 25;  // 25ms loop interval
    this.timerId = null;

    this.onTick = null; // Função chamada a cada step agendado
    this.onBarChange = null; // Chamada a cada novo compasso
  }

  setAudioContext(audioCtx) {
    this.audioCtx = audioCtx;
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(240, parseInt(bpm, 10) || 74));
  }

  setMeter(meter) {
    this.meter = meter === "6/8" ? "6/8" : (meter === "3/4" ? "3/4" : "4/4");
    if (this.meter === "6/8") {
      this.totalStepsPerBar = 6;
      this.beatsPerBar = 6;
    } else if (this.meter === "3/4") {
      this.totalStepsPerBar = 6;
      this.beatsPerBar = 3;
    } else {
      this.totalStepsPerBar = 8;
      this.beatsPerBar = 4;
    }
  }

  getBeatDuration() {
    return 60.0 / this.bpm;
  }

  getStepDuration() {
    if (this.meter === "6/8") {
      // 6 colcheias por compasso em 6/8
      return (60.0 / this.bpm) / 3;
    }
    // Em 4/4, 8 colcheias por compasso (step = 1 colcheia = meio tempo)
    return (60.0 / this.bpm) / 2;
  }

  start() {
    if (this.isPlaying && !this.isPaused) return;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = true;
    this.isPaused = false;

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    this.nextStepTime = this.audioCtx ? this.audioCtx.currentTime + 0.05 : 0;
    this._run();
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.currentBar = 0;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  _run() {
    if (!this.isPlaying || this.isPaused) return;

    if (!this.audioCtx) {
      this._runFallback();
      return;
    }

    const currentTime = this.audioCtx.currentTime;
    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      this._dispatchStep(this.currentStep, this.currentBar, this.nextStepTime);
      this._advanceStep();
    }

    this.timerId = setTimeout(() => {
      this._run();
    }, this.lookaheadInterval);
  }

  _runFallback() {
    const stepDurationMs = this.getStepDuration() * 1000;
    this._dispatchStep(this.currentStep, this.currentBar, 0);
    this._advanceStep();

    this.timerId = setTimeout(() => {
      if (this.isPlaying) this._runFallback();
    }, stepDurationMs);
  }

  _dispatchStep(step, bar, time) {
    if (typeof this.onTick === "function") {
      const beat = this.meter === "6/8"
        ? Math.floor(step / 3) + 1
        : Math.floor(step / 2) + 1;

      this.onTick({
        step,
        bar,
        beat,
        time,
        stepDuration: this.getStepDuration(),
        meter: this.meter,
        totalStepsPerBar: this.totalStepsPerBar
      });
    }
  }

  _advanceStep() {
    this.nextStepTime += this.getStepDuration();
    this.currentStep++;

    if (this.currentStep >= this.totalStepsPerBar) {
      this.currentStep = 0;
      this.currentBar++;
      if (typeof this.onBarChange === "function") {
        this.onBarChange(this.currentBar);
      }
    }
  }
}
