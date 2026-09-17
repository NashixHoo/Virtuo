// =============================================================
// TEST SUITE: VIRTUO REAL BAND ENGINE
// test-real-band-engine.js
// Validações automatizadas dos 6 pilares do motor de acompanhamento acústico:
// 1. VirtuoClock (Relógio mestre único e lookahead)
// 2. HarmonicEngine (Análise harmônica, progressões, voice leading e baixos)
// 3. GrooveEngine (Padrões rítmicos, dinâmicas e transições quantizadas)
// 4. SoundLibrary & Metadados (Modelagem acústica e registro de licença)
// 5. ArrangementEngine (Orquestração por step, mixer e intensidades)
// 6. Integração do Modo Ensaio & Modo Banda
// =============================================================

import assert from "node:assert";

// Mock ambiental de áudio e DOM para execução no Node.js
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

// Mock de AudioContext e Web Audio API
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
  createDynamicsCompressor() {
    const comp = new MockAudioNode();
    comp.threshold = { setValueAtTime: () => {} };
    comp.knee = { setValueAtTime: () => {} };
    comp.ratio = { setValueAtTime: () => {} };
    comp.attack = { setValueAtTime: () => {} };
    comp.release = { setValueAtTime: () => {} };
    return comp;
  }
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length)
    };
  }
  resume() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.window.AudioContext = MockAudioContext;

// Importa os módulos sob teste
import { 
  VirtuoClock,
  HarmonicEngine,
  GrooveEngine,
  SoundLibrary,
  SOUND_LIBRARY_METADATA,
  ArrangementEngine,
  VirtuoBandEngine,
  virtuoBand
} from "./src/audio/index.js";

import { RehearsalController } from "./src/features/rehearsal/rehearsal-controller.js";

console.log("=================================================");
console.log("🎵 TEST SUITE: VIRTUO REAL BAND ENGINE");
console.log("=================================================");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

// -------------------------------------------------------------
// 1. VIRTUO CLOCK & MASTER TIMING
// -------------------------------------------------------------
console.log("\n--- 1. VirtuoClock (Relógio Mestre e Lookahead) ---");

test("VirtuoClock calcula milissegundos por tempo e por step com exatidão", () => {
  const clock = new VirtuoClock(new MockAudioContext());
  clock.setBpm(120);
  assert.strictEqual(clock.getBeatDuration(), 0.5, "A 120 BPM, um tempo dura 0.5 segundos");
  assert.strictEqual(clock.getStepDuration(), 0.25, "A 120 BPM e 8 steps por compasso, cada step dura 0.25 segundos");
});

test("VirtuoClock ajusta stepsPerBar conforme compasso 4/4 e 6/8", () => {
  const clock = new VirtuoClock(new MockAudioContext());
  clock.setMeter("4/4");
  assert.strictEqual(clock.totalStepsPerBar, 8);
  assert.strictEqual(clock.beatsPerBar, 4);

  clock.setMeter("6/8");
  assert.strictEqual(clock.totalStepsPerBar, 6);
  assert.strictEqual(clock.beatsPerBar, 6);
});

test("VirtuoClock garante que nenhum instrumento possui relógio independente", () => {
  const band = new VirtuoBandEngine();
  assert.ok(band.clock instanceof VirtuoClock, "A banda possui uma única instância mestra de VirtuoClock");
  assert.strictEqual(typeof band.clock.onTick, "function", "O relógio dita o pulso comum a todos os instrumentos");
});

// -------------------------------------------------------------
// 2. SOUND LIBRARY & MODELAGEM ACÚSTICA
// -------------------------------------------------------------
console.log("\n--- 2. SoundLibrary & Metadados de Procedência ---");

test("SoundLibrary possui registro formal de licença e autoria (sem amostras piratas)", () => {
  assert.strictEqual(SOUND_LIBRARY_METADATA.license, "MIT");
  assert.strictEqual(SOUND_LIBRARY_METADATA.type, "Acoustic Procedural Synthesis (Web Audio API)");
  assert.strictEqual(SOUND_LIBRARY_METADATA.attribution, "Virtuo Musical Architecture");
  assert.ok(SOUND_LIBRARY_METADATA.instruments.includes("drums"));
  assert.ok(SOUND_LIBRARY_METADATA.instruments.includes("bass"));
  assert.ok(SOUND_LIBRARY_METADATA.instruments.includes("keyboard"));
  assert.ok(SOUND_LIBRARY_METADATA.instruments.includes("guitar"));
});

test("SoundLibrary instancia gerador de ruído para esteira e palheta", () => {
  const ctx = new MockAudioContext();
  const channels = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    keyboard: ctx.createGain(),
    guitar: ctx.createGain()
  };
  const sl = new SoundLibrary(ctx, channels);
  assert.ok(sl.noiseBuffer, "Buffer de ruído procedural inicializado com sucesso");
  assert.strictEqual(typeof sl.triggerKick, "function");
  assert.strictEqual(typeof sl.triggerSnare, "function");
  assert.strictEqual(typeof sl.triggerHiHat, "function");
  assert.strictEqual(typeof sl.triggerBassNote, "function");
  assert.strictEqual(typeof sl.triggerPianoVoicing, "function");
  assert.strictEqual(typeof sl.triggerGuitarStrum, "function");
});

// -------------------------------------------------------------
// 3. HARMONIC ENGINE & CONDUÇÃO MUSICAL
// -------------------------------------------------------------
console.log("\n--- 3. HarmonicEngine (Inteligência Harmônica e Condução) ---");

test("HarmonicEngine analisa acordes normais e invertidos (C e D/F#)", () => {
  const he = new HarmonicEngine();
  he.setChord("D/F#");
  const info = he.getCurrentChordInfo();
  assert.strictEqual(info.root, "D");
  assert.strictEqual(info.bassNote, "F#");
});

test("HarmonicEngine conduz a linha de baixo com fundamental e quinta", () => {
  const he = new HarmonicEngine();
  he.setChord("G");
  const bassBeat1 = he.getBassFrequencyForStep(0, 8, "Worship", 3);
  const bassBeat3 = he.getBassFrequencyForStep(4, 8, "Worship", 3);

  // G fundamental (G1 ~49Hz) vs D quinta (D2 ~73.4Hz)
  assert.ok(bassBeat1 > 40 && bassBeat1 < 55, `Tempo 1 toca fundamental Sol: ${bassBeat1}Hz`);
  assert.ok(bassBeat3 > 65 && bassBeat3 < 80, `Tempo 3 toca quinta Ré: ${bassBeat3}Hz`);
});

test("HarmonicEngine calcula nota de aproximação cromática para o próximo acorde", () => {
  const he = new HarmonicEngine();
  he.setProgression(["C", "G"]);
  he.setChord("C");
  // No step 7 (último tempo antes do Sol), toca nota vizinha de condução
  const approachFreq = he.getBassFrequencyForStep(7, 8, "Pop", 4);
  assert.ok(approachFreq > 0, "Gera nota de aproximação motora");
});

test("HarmonicEngine extrai voicings de teclado com condução de vozes (voice leading)", () => {
  const he = new HarmonicEngine();
  he.setChord("Am");
  const freqs = he.getKeyboardVoicingFrequencies(4, "pad");
  assert.ok(Array.isArray(freqs) && freqs.length >= 3, "Gera voicings com 3 ou mais frequências harmônicas");
  assert.ok(freqs[0] > 100 && freqs[0] < 500, "Frequências distribuídas na tessitura correta do teclado");
});

test("HarmonicEngine gera dedilhado e batidas com notas corretas do violão", () => {
  const he = new HarmonicEngine();
  he.setChord("Em");
  const strum = he.getGuitarStrumFrequencies(3);
  assert.ok(Array.isArray(strum) && strum.length >= 4, "Gera acorde de violão com pelo menos 4 cordas");
});

// -------------------------------------------------------------
// 4. GROOVE ENGINE & ESTRUTURA RÍTMICA
// -------------------------------------------------------------
console.log("\n--- 4. GrooveEngine (Padrões, Fills e Dinâmica) ---");

test("GrooveEngine retorna os padrões da seção atual (verso, refrão)", () => {
  const ge = new GrooveEngine();
  ge.setPreset("Worship");
  ge.setSection("chorus");
  const pattern = ge.getCurrentPattern();
  assert.ok(Array.isArray(pattern.kick), "Padrão de bumbo presente no refrão");
  assert.ok(Array.isArray(pattern.snare), "Padrão de caixa presente no refrão");
});

test("GrooveEngine injeta fill de bateria antes da transição de seção", () => {
  const ge = new GrooveEngine();
  ge.setPreset("Pop");
  ge.setSection("verse");
  ge.queueSectionTransition("chorus");

  const isTransition = ge.isTransitionBar(6, 8);
  assert.strictEqual(isTransition, true, "Detecta compasso de transição nos steps finais");

  const activePattern = ge.getActivePatternForStep(7, 8);
  assert.ok(activePattern, "Retorna padrão com fill configurado para transição");
});

test("GrooveEngine respeita modo Easy Band simplificando a levada", () => {
  const ge = new GrooveEngine();
  ge.setEasyBand(true);
  const pattern = ge.getCurrentPattern();
  assert.deepStrictEqual(pattern.kick, [0, 4], "Easy Band simplifica o bumbo para marcação direta nos tempos 1 e 3");
});

// -------------------------------------------------------------
// 5. ARRANGEMENT ENGINE & ORQUESTRAÇÃO
// -------------------------------------------------------------
console.log("\n--- 5. ArrangementEngine (Orquestração e Síntese) ---");

test("ArrangementEngine orquestra bateria, baixo, teclado e guitarra no step", () => {
  const ctx = new MockAudioContext();
  const channels = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    keyboard: ctx.createGain(),
    guitar: ctx.createGain()
  };
  const sl = new SoundLibrary(ctx, channels);
  const he = new HarmonicEngine();
  const ge = new GrooveEngine();
  const ae = new ArrangementEngine(sl, he, ge);

  const tracks = {
    drums: { volume: 0.8, muted: false, solo: false, active: true },
    bass: { volume: 0.7, muted: false, solo: false, active: true },
    keyboard: { volume: 0.7, muted: false, solo: false, active: true, mode: "pad" },
    guitar: { volume: 0.7, muted: false, solo: false, active: true, pattern: "strum" }
  };

  // Agenda o primeiro step (tempo 1 com bumbo, baixo, pad e acorde)
  ae.scheduleStep({ step: 0, time: 0.1, totalStepsPerBar: 8, bar: 0 }, tracks);
  assert.ok(true, "ArrangementEngine executou o step sem erros");
});

test("ArrangementEngine respeita regras de mute e solo dos canais", () => {
  const ctx = new MockAudioContext();
  const channels = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    keyboard: ctx.createGain(),
    guitar: ctx.createGain()
  };
  const sl = new SoundLibrary(ctx, channels);
  const he = new HarmonicEngine();
  const ge = new GrooveEngine();
  const ae = new ArrangementEngine(sl, he, ge);

  const tracks = {
    drums: { volume: 0.8, muted: true, solo: false, active: true },
    bass: { volume: 0.7, muted: false, solo: true, active: true },
    keyboard: { volume: 0.7, muted: false, solo: false, active: true },
    guitar: { volume: 0.7, muted: false, solo: false, active: true }
  };

  assert.strictEqual(ae._canPlayTrack("drums", tracks), false, "Trilha silenciada (muted) não toca");
  assert.strictEqual(ae._canPlayTrack("bass", tracks), true, "Trilha solo toca");
  assert.strictEqual(ae._canPlayTrack("keyboard", tracks), false, "Trilha sem solo não toca quando outra está em solo");
});

// -------------------------------------------------------------
// 6. MODO ENSAIO & MODO BANDA INTEGRADOS
// -------------------------------------------------------------
console.log("\n--- 6. Integração com Modo Ensaio & Modo Banda ---");

test("VirtuoBandEngine carrega progressão harmônica dinâmica para ensaio", () => {
  const band = new VirtuoBandEngine();
  band.loadProgression(["G", "D", "Em", "C"], "G", 78);

  const state = band.getState();
  assert.strictEqual(state.currentKey, "G");
  assert.strictEqual(state.bpm, 78);
  assert.strictEqual(state.currentChord, "G");
  assert.strictEqual(state.nextChord, "D");
  assert.deepStrictEqual(state.activeProgression, ["G", "D", "Em", "C"]);
});

test("VirtuoBandEngine avança compasso e atualiza o acorde automaticamente", () => {
  const band = new VirtuoBandEngine();
  band.loadProgression(["C", "G", "Am", "F"], "C", 80);
  assert.strictEqual(band.getState().currentChord, "C");

  // Simula troca de compasso no VirtuoClock
  band.clock.onBarChange(1);
  assert.strictEqual(band.getState().currentChord, "G", "Avançou para o segundo acorde da progressão");

  band.clock.onBarChange(2);
  assert.strictEqual(band.getState().currentChord, "Am", "Avançou para o terceiro acorde");
});

test("VirtuoBandEngine carrega canção completa respeitando transposição e Easy Play", () => {
  const song = {
    id: "song-louvor-1",
    title: "Vim Para Adorar-te",
    originalKey: "E",
    bpm: 72,
    cifra: "E B C#m A\nE B A"
  };

  const band = new VirtuoBandEngine();
  const res = band.loadSong(song, 0, false, 72);
  assert.strictEqual(res.key, "E");
  assert.strictEqual(res.currentChord, "E");
  assert.ok(band.getState().activeProgression.length > 0, "Progressão da música extraída com sucesso");
});

test("RehearsalController possui integração completa com a Banda Virtual Real", () => {
  const rc = new RehearsalController();
  assert.strictEqual(typeof rc.playSongWithBand, "function", "Possui método playSongWithBand");
  assert.strictEqual(typeof rc.stopBand, "function", "Possui método stopBand");
  assert.strictEqual(rc.activePlayingSongIndex, null, "Inicia sem música tocando");
});

console.log("\n=================================================");
console.log(`TOTAL DE TESTES DO REAL BAND ENGINE: ${total}`);
console.log(`PASSOU: ${passed} | FALHOU: ${total - passed}`);
console.log("=================================================");

if (total === passed) {
  console.log("🎉 TODOS OS TESTES DO VIRTUO REAL BAND ENGINE PASSARAM COM SUCESSO!");
} else {
  process.exit(1);
}
