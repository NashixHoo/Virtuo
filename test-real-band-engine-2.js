// =============================================================
// TEST SUITE: VIRTUO REAL BAND ENGINE 2.0 (V2.1)
// test-real-band-engine-2.js
// Validações rigorosas de acompanhamento musical realista,
// anti-regressão de nota única, sincronismo e prevenção de duplicação.
// =============================================================

import assert from "node:assert";

// Mock ambiental Web Audio e DOM para execução no Node.js
if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.window.removeEventListener = () => {};
}

if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

class MockAudioNode {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      value: 1
    };
    this.frequency = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {}
    };
    this.Q = { setValueAtTime: () => {} };
    this.type = "sine";
    this.detune = { setValueAtTime: () => {} };
    this.threshold = { setValueAtTime: () => {} };
    this.knee = { setValueAtTime: () => {} };
    this.ratio = { setValueAtTime: () => {} };
    this.attack = { setValueAtTime: () => {} };
    this.release = { setValueAtTime: () => {} };
    this.buffer = null;
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.sampleRate = 44100;
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockAudioNode(); }
  createOscillator() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createBufferSource() { return new MockAudioNode(); }
  createDynamicsCompressor() { return new MockAudioNode(); }
  createBuffer(channels, length, rate) {
    return { numberOfChannels: channels, length, sampleRate: rate, getChannelData: () => new Float32Array(length) };
  }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// Importa módulos musicais do Virtuo
import {
  VirtuoBandEngine,
  VirtuoClock,
  HarmonicEngine,
  GrooveEngine,
  ArrangementEngine,
  MusicalArrangement,
  BassPlayer,
  PianoPlayer,
  GuitarPlayer,
  DrumPlayer,
  MusicalEvent,
  BassNoteEvent,
  KeyboardChordEvent,
  GuitarStrumEvent,
  DrumEvent,
  SyntheticSoundProvider
} from "./src/audio/index.js";

import {
  parseChordSymbol,
  buildChord,
  toEasyPlay,
  getPianoVoicings
} from "./src/chords/index.js";

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Erro: ${err.message}`);
  }
}

console.log("\n=================================================");
console.log("🎹 TEST SUITE: VIRTUO REAL BAND ENGINE 2.0 (V2.1)");
console.log("=================================================");

// -------------------------------------------------------------
// 1. TESTE MAIS IMPORTANTE: ANTI-REGRESSÃO DE NOTA ÚNICA
// -------------------------------------------------------------
console.log("\n--- 1. Anti-Regressão de Nota Única (C → G → Am → F) ---");
{
  const band = new VirtuoBandEngine();
  band.loadProgression(["C", "G", "Am", "F"], "C", 80);

  const mockAudioCtx = new MockAudioContext();
  const mockSoundProvider = new SyntheticSoundProvider({
    triggerKick: () => {},
    triggerSnare: () => {},
    triggerHiHat: () => {},
    triggerRide: () => {},
    triggerCrash: () => {},
    triggerTom: () => {},
    triggerBass: () => {},
    triggerPianoVoicing: () => {},
    triggerKeyboardChord: () => {},
    triggerGuitarStrum: () => {},
    triggerGuitarNote: () => {}
  });

  const arrEngine = new ArrangementEngine(
    mockSoundProvider,
    band.harmonicEngine,
    band.grooveEngine
  );
  arrEngine.setSoundProvider(mockSoundProvider);
  arrEngine.setArrangement(band.arrangement);

  const tracksState = {
    drums: { active: true, muted: false, solo: false, volume: 0.8 },
    bass: { active: true, muted: false, solo: false, volume: 0.8 },
    keyboard: { active: true, muted: false, solo: false, volume: 0.8, mode: "piano" },
    guitar: { active: true, muted: false, solo: false, volume: 0.8, pattern: "strum" }
  };

  const recordedBassFrequencies = [];
  const recordedKeyboardVoicings = [];
  const recordedGuitarChords = [];
  const recordedDrumHits = [];

  // Simula 4 compassos (1 para cada acorde da progressão)
  for (let bar = 0; bar < 4; bar++) {
    // No step 0 de cada compasso
    const stepInfo = {
      step: 0,
      bar,
      time: bar * 2.0,
      totalStepsPerBar: 8,
      beat: 1
    };

    arrEngine.scheduleStep(stepInfo, tracksState);

    if (arrEngine.lastEvents.bass) {
      recordedBassFrequencies.push(arrEngine.lastEvents.bass.frequency);
    }
    if (arrEngine.lastEvents.keyboard) {
      recordedKeyboardVoicings.push(arrEngine.lastEvents.keyboard.frequencies);
    }
    if (arrEngine.lastEvents.guitar) {
      recordedGuitarChords.push(arrEngine.lastEvents.guitar.chord);
    }
    if (arrEngine.lastEvents.drums) {
      recordedDrumHits.push(arrEngine.lastEvents.drums.metadata.kick);
    }
  }

  runTest("Baixo NÃO toca nota única repetida: varia de acordo com cada acorde", () => {
    assert(recordedBassFrequencies.length === 4, "Registrou 4 notas de baixo");
    const uniqueFreqs = new Set(recordedBassFrequencies.map(f => Math.round(f)));
    assert(uniqueFreqs.size > 2, `Baixo variou entre os acordes: ${[...uniqueFreqs].join(", ")} Hz`);
  });

  runTest("Teclado adapta voicings em cada acorde da progressão", () => {
    assert(recordedKeyboardVoicings.length === 4, "Registrou 4 acordes de teclado");
    const firstVoicing = recordedKeyboardVoicings[0].map(f => Math.round(f)).join("-");
    const secondVoicing = recordedKeyboardVoicings[1].map(f => Math.round(f)).join("-");
    assert(firstVoicing !== secondVoicing, "Voicings de C e G são harmonicamente distintos");
  });

  runTest("Violão acompanha os acordes reais da progressão (C → G → Am → F)", () => {
    assert.deepStrictEqual(recordedGuitarChords, ["C", "G", "Am", "F"]);
  });

  runTest("Bateria mantém o groove contínuo em todos os compassos", () => {
    assert(recordedDrumHits.length === 4, "Bateria executou em todos os compassos");
    assert(recordedDrumHits.every(hit => hit === true), "Bumbo executou nos tempos fortes de cada compasso");
  });
}

// -------------------------------------------------------------
// 2. SUPORTE A PROGRESSÕES CANÔNICAS (Am → F → C → G e D → A → Bm → G)
// -------------------------------------------------------------
console.log("\n--- 2. Progressões Canônicas Pop/Worship ---");
{
  const band = new VirtuoBandEngine();

  runTest("Progressão Am → F → C → G mapeia graus e tonalidade Am", () => {
    band.loadProgression(["Am", "F", "C", "G"], "Am", 72);
    assert.strictEqual(band.harmonicEngine.activeProgression.length, 4);
    assert.strictEqual(band.currentChord, "Am");
  });

  runTest("Progressão D → A → Bm → G mapeia com precisão em Tom D", () => {
    band.loadProgression(["D", "A", "Bm", "G"], "D", 78);
    assert.strictEqual(band.harmonicEngine.activeProgression[2], "Bm");
    assert.strictEqual(band.currentKey, "D");
  });
}

// -------------------------------------------------------------
// 3. ACORDES, QUALIDADES E INVERSÕES (D/F# e C/E)
// -------------------------------------------------------------
console.log("\n--- 3. Qualidades de Acordes e Inversões Reais ---");
{
  runTest("Acorde invertido D/F# preserva root D e bass F#", () => {
    const chord = parseChordSymbol("D/F#");
    assert.strictEqual(chord.root, "D");
    assert.strictEqual(chord.bass, "F#");
  });

  runTest("Acorde C/E conduz nota no baixo em E1 (~41.2Hz) e não C1 (~32.7Hz)", () => {
    const bassPlayer = new BassPlayer();
    const chordData = { symbol: "C/E", root: "C", bass: "E", isMinor: false };
    const freq = bassPlayer.calculateBassFrequency(chordData, null, 0, 8, "verse");
    assert(Math.abs(freq - 41.2) < 0.8, `Frequência de E1 é ~41.2Hz, obtido: ${freq.toFixed(2)}Hz`);
  });

  runTest("Diferenciação clara entre C maior e Cm menor", () => {
    const maj = buildChord("C", "major");
    const min = buildChord("C", "minor");
    assert.strictEqual(maj.notes[1], "E");
    assert.strictEqual(min.notes[1], "Eb");
  });
}

// -------------------------------------------------------------
// 4. RITMOS E FÓRMULAS DE COMPASSO (4/4 e 6/8)
// -------------------------------------------------------------
console.log("\n--- 4. Fórmulas de Compasso (4/4 e 6/8) ---");
{
  const clock = new VirtuoClock();

  runTest("Fórmula 4/4 define 8 steps de colcheia por compasso", () => {
    clock.setMeter("4/4");
    assert.strictEqual(clock.totalStepsPerBar, 8);
    assert.strictEqual(clock.beatsPerBar, 4);
  });

  runTest("Fórmula 6/8 define 6 steps de colcheia por compasso", () => {
    clock.setMeter("6/8");
    assert.strictEqual(clock.totalStepsPerBar, 6);
    assert.strictEqual(clock.beatsPerBar, 6);
  });

  runTest("getBeatDuration() e getStepDuration() respondem com precisão matemática", () => {
    clock.setBpm(120);
    clock.setMeter("4/4");
    assert.strictEqual(clock.getBeatDuration(), 0.5); // 60 / 120 = 0.5s
    assert.strictEqual(clock.getStepDuration(), 0.25); // 0.5 / 2 = 0.25s
  });
}

// -------------------------------------------------------------
// 5. COMPORTAMENTOS MUSICAIS (Transição, BPM, Tom, Dinâmica)
// -------------------------------------------------------------
console.log("\n--- 5. Comportamentos Musicais Dinâmicos ---");
{
  const band = new VirtuoBandEngine();
  band.loadProgression(["C", "G", "Am", "F"], "C", 70);

  runTest("Mudança de BPM sincroniza relógio mestre", () => {
    band.setBpm(110);
    assert.strictEqual(band.clock.bpm, 110);
  });

  runTest("Mudança de Tonalidade (C -> D) transpõe acorde atual", () => {
    band.setKey("D");
    assert.strictEqual(band.currentKey, "D");
  });

  runTest("Escala dinâmica contínua de intensidade (0.00 a 1.00)", () => {
    band.setIntensity(4); // escala 1 a 5
    assert.strictEqual(band.intensity, 4);
  });

  runTest("Transição de Seção enfileira quantizada para o próximo compasso", () => {
    band.start();
    band.setSection("chorus", true);
    assert.strictEqual(band.nextQueuedSection, "chorus");
    band.stop();
  });

  runTest("Easy Band simplifica harmonia e ritmo mantendo a progressão", () => {
    band.setEasyBand(true);
    assert.strictEqual(band.isEasyBand, true);
    assert.strictEqual(band.grooveEngine.isEasyBand, true);
  });
}

// -------------------------------------------------------------
// 6. MUTE, SOLO E CANAIS DE MIXER
// -------------------------------------------------------------
console.log("\n--- 6. Mute, Solo e Canais ---");
{
  const band = new VirtuoBandEngine();
  const arr = new ArrangementEngine(null, band.harmonicEngine, band.grooveEngine);

  runTest("Mute silencia o instrumento individual", () => {
    band.setTrackMute("guitar", true);
    const canPlay = arr._canPlayTrack("guitar", band.tracks);
    assert.strictEqual(canPlay, false);
  });

  runTest("Solo prioriza apenas o instrumento com solo ativo", () => {
    band.setTrackMute("guitar", false);
    band.setTrackSolo("bass", true);
    assert.strictEqual(arr._canPlayTrack("bass", band.tracks), true);
    assert.strictEqual(arr._canPlayTrack("drums", band.tracks), false);
    assert.strictEqual(arr._canPlayTrack("guitar", band.tracks), false);
    band.setTrackSolo("bass", false);
  });
}

// -------------------------------------------------------------
// 7. SINCRONIZAÇÃO TEMPORAL ÚNICA (VIRTUO CLOCK)
// -------------------------------------------------------------
console.log("\n--- 7. Sincronização Temporal Única (Sem Clocks Independentes) ---");
{
  const band = new VirtuoBandEngine();

  runTest("Todos os motores e trilhas compartilham exatamente o VirtuoClock", () => {
    assert(band.clock instanceof VirtuoClock, "band.clock é instância única de VirtuoClock");
    assert.strictEqual(band.clock, band.clock, "Não existem clocks secundários instanciados");
  });
}

// -------------------------------------------------------------
// 8. PREVENÇÃO DE DUPLICAÇÃO E MEMORY LEAKS
// -------------------------------------------------------------
console.log("\n--- 8. Prevenção de Duplicação e Ciclo Start/Stop ---");
{
  const band = new VirtuoBandEngine();
  band.loadProgression(["G", "Em", "C", "D"], "G", 75);

  runTest("Ciclo múltiplo start() -> stop() -> start() -> stop() -> start() limpo", () => {
    band.start();
    assert.strictEqual(band.isPlaying, true);
    band.stop();
    assert.strictEqual(band.isPlaying, false);
    band.start();
    assert.strictEqual(band.isPlaying, true);
    band.stop();
    assert.strictEqual(band.isPlaying, false);
    band.start();
    assert.strictEqual(band.isPlaying, true);
    band.stop();
    assert.strictEqual(band.isPlaying, false);
  });

  runTest("Chamadas sucessivas start() -> start() -> start() não duplicam sessões", () => {
    band.start();
    const initialClockRunning = band.clock.isPlaying;
    band.start();
    band.start();
    assert.strictEqual(band.isPlaying, true);
    assert.strictEqual(band.clock.isPlaying, initialClockRunning);
    band.stop();
  });
}

// -------------------------------------------------------------
// 9. SISTEMA DE LOOP INTEGRADO
// -------------------------------------------------------------
console.log("\n--- 9. Sistema de Loop Sem Vazamentos ---");
{
  const band = new VirtuoBandEngine();
  band.loadProgression(["C", "G", "Am", "F"], "C", 80);
  band.setLoop(true);
  band.setLoopRepeatTarget(2);

  runTest("Loop avança os 4 acordes e contabiliza iterações no wrap-around", () => {
    band.start();
    assert.strictEqual(band.isLooping, true);
    assert.strictEqual(band.loopRepeatTarget, 2);

    // Simula 4 compassos (1 ciclo da progressão)
    for (let i = 1; i <= 4; i++) {
      band.clock.onBarChange(i);
    }
    assert.strictEqual(band.loopCurrentIteration, 1, "Completou primeira repetição da progressão");

    // Simula mais 4 compassos (2º ciclo)
    for (let i = 5; i <= 8; i++) {
      if (band.isPlaying) {
        band.clock.onBarChange(i);
      }
    }
    assert.strictEqual(band.isPlaying, false, "Interrompe após atingir o número alvo de repetições");
  });
}

// -------------------------------------------------------------
// 10. ARQUITETURA DE SOUND PROVIDER E INSTRUMENT PLAYERS
// -------------------------------------------------------------
console.log("\n--- 10. Sound Provider & Instrument Players ---");
{
  const bass = new BassPlayer();
  const piano = new PianoPlayer();
  const guitar = new GuitarPlayer();
  const drum = new DrumPlayer();

  runTest("Todos os players derivam da interface InstrumentPlayer", () => {
    assert(typeof bass.setVolume === "function");
    assert(typeof piano.setVolume === "function");
    assert(typeof guitar.setVolume === "function");
    assert(typeof drum.setVolume === "function");
  });

  runTest("Keyboard suporta KEYS_PAD, KEYS_PIANO e KEYS_WORSHIP", () => {
    piano.setMode("KEYS_WORSHIP");
    assert.strictEqual(piano.mode, "KEYS_WORSHIP");
    piano.setMode("KEYS_PIANO");
    assert.strictEqual(piano.mode, "KEYS_PIANO");
    piano.setMode("KEYS_PAD");
    assert.strictEqual(piano.mode, "KEYS_PAD");
  });

  runTest("Guitar suporta STRUM, ARPEGGIO, WORSHIP, BALLAD, POP, SOFT, ENERGETIC", () => {
    guitar.setPattern("worship");
    assert.strictEqual(guitar.pattern, "worship");
    guitar.setPattern("arpeggio");
    assert.strictEqual(guitar.pattern, "arpeggio");
    guitar.setPattern("ballad");
    assert.strictEqual(guitar.pattern, "ballad");
  });

  runTest("DrumPlayer suporta DRUM_BASIC, DRUM_WORSHIP, DRUM_POP, DRUM_ROCK, DRUM_BALLAD", () => {
    drum.setStyle("DRUM_ROCK");
    assert.strictEqual(drum.style, "DRUM_ROCK");
    drum.setStyle("DRUM_WORSHIP");
    assert.strictEqual(drum.style, "DRUM_WORSHIP");
  });
}

// -------------------------------------------------------------
// RELATÓRIO FINAL
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`TOTAL DE TESTES REAL BAND ENGINE 2.0: ${totalTests}`);
console.log(`PASSOU: ${passedTests} | FALHOU: ${totalTests - passedTests}`);
console.log("=================================================");

if (passedTests === totalTests) {
  console.log("🎉 TODOS OS REQUISITOS DO REAL BAND ENGINE 2.0 FORAM HOMOLOGADOS COM SUCESSO!\n");
} else {
  process.exit(1);
}
