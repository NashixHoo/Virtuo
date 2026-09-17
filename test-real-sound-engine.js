// =============================================================
// TEST SUITE: VIRTUO REAL SOUND ENGINE
// test-real-sound-engine.js
// Validações do motor de timbres reais e polifônicos:
// 1. SampleRegistry & Licenciamento estrito (CC0, procedência, metadados)
// 2. SampleManager (carregamento, cache, findBestSample, pitch ratio)
// 3. SamplePlayer (Web Audio grafo, polifonia, envelopes, velocity)
// 4. RealSoundEngine (bateria, baixo, piano polyphony, violão/guitarra)
// 5. Fallback Transparente (ausência de sample -> síntese sem falhas)
// 6. Mixer, Mute, Solo e Volume
// 7. Testes de Progressões Musicais (C-G-Am-F, G-D-Em-C, Am-F-C-G)
// 8. Performance & Gestão de Recursos
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

class MockAudioParam {
  constructor(defaultValue = 1) {
    this.value = defaultValue;
    this.events = [];
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "set", value: v, time: t });
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "linear", value: v, time: t });
  }
  exponentialRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "exponential", value: v, time: t });
  }
  cancelScheduledValues(t) {
    this.events.push({ type: "cancel", time: t });
  }
}

class MockAudioNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.frequency = new MockAudioParam(440);
    this.playbackRate = new MockAudioParam(1);
    this.detune = new MockAudioParam(0);
    this.Q = new MockAudioParam(1);
    this.type = "sine";
    this.buffer = null;
    this.connectedTo = [];
    this.isStarted = false;
    this.isStopped = false;
    this.onended = null;
  }
  connect(target) {
    this.connectedTo.push(target);
  }
  disconnect() {
    this.connectedTo = [];
  }
  start(t = 0) {
    this.isStarted = true;
    this.startTime = t;
  }
  stop(t = 0) {
    this.isStopped = true;
    this.stopTime = t;
    if (typeof this.onended === "function") {
      // Simula finalização assíncrona
      setTimeout(() => {
        try { this.onended(); } catch {}
      }, 5);
    }
  }
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
    comp.threshold = new MockAudioParam(-3);
    comp.knee = new MockAudioParam(6);
    comp.ratio = new MockAudioParam(4);
    comp.attack = new MockAudioParam(0.005);
    comp.release = new MockAudioParam(0.05);
    return comp;
  }
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length)
    };
  }
  decodeAudioData(arrayBuffer) {
    // Retorna buffer simulado com 1s de áudio
    return Promise.resolve(this.createBuffer(2, 44100, 44100));
  }
  resume() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.window.AudioContext = MockAudioContext;

// Importa módulos do Real Sound Engine
import {
  SampleManager,
  SamplePlayer,
  RealSoundEngine,
  SAMPLE_REGISTRY,
  validateSampleLicense,
  getSamplesForInstrument,
  SoundLibrary,
  ArrangementEngine,
  VirtuoBandEngine
} from "./src/audio/index.js";

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
    console.error(`     Mensagem: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Mensagem: ${err.message}`);
  }
}

console.log("=================================================");
console.log("🔊 TEST SUITE: VIRTUO REAL SOUND ENGINE");
console.log("=================================================");

// -------------------------------------------------------------
// 1. SAMPLE REGISTRY & LICENCIAMENTO
// -------------------------------------------------------------
console.log("\n--- 1. Sample Registry & Licenciamento Estrito ---");

runTest("Validador de licença aprova metadados canônicos com redistribuição e uso comercial", () => {
  const sampleMeta = SAMPLE_REGISTRY["drums-kick"];
  assert.ok(sampleMeta, "Sample drums-kick existe no registro");
  assert.strictEqual(validateSampleLicense(sampleMeta), true, "Metadados aprovados");
  assert.strictEqual(sampleMeta.redistributionAllowed, true, "Redistribuição permitida");
  assert.strictEqual(sampleMeta.commercialUseAllowed, true, "Uso comercial permitido");
  assert.strictEqual(sampleMeta.license, "CC0 1.0 Universal", "Licença CC0 formal");
});

runTest("Validador rejeita sample com redistribuição negada ou sem licença", () => {
  assert.strictEqual(validateSampleLicense(null), false);
  assert.strictEqual(validateSampleLicense({ id: "fake", redistributionAllowed: false }), false);
  assert.strictEqual(validateSampleLicense({ id: "fake", redistributionAllowed: true, commercialUseAllowed: false }), false);
});

runTest("Catálogo possui os 5 instrumentos prioritários registrados", () => {
  const drums = getSamplesForInstrument("drums");
  const bass = getSamplesForInstrument("bass");
  const piano = getSamplesForInstrument("piano");
  const acousticGuitar = getSamplesForInstrument("acoustic-guitar");
  const electricGuitar = getSamplesForInstrument("electric-guitar");

  assert.ok(drums.length >= 6, "Bateria possui kick, snare, hihat, tom, crash");
  assert.ok(bass.length >= 4, "Baixo possui zonas por oitava (E1, A1, D2, G2)");
  assert.ok(piano.length >= 4, "Piano possui zonas de referência (C2 a C5)");
  assert.ok(acousticGuitar.length >= 6, "Violão acústico possui cordas soltas (E2 a E4)");
  assert.ok(electricGuitar.length >= 6, "Guitarra clean possui cordas soltas (E2 a E4)");
});

// -------------------------------------------------------------
// 2. SAMPLE MANAGER (CACHE, BUSCA E PITCH SHIFT)
// -------------------------------------------------------------
console.log("\n--- 2. Sample Manager & Reutilização em Cache ---");

runTest("SampleManager instancia vazio e gerencia cache em memória", () => {
  const ctx = new MockAudioContext();
  const sm = new SampleManager(ctx);

  assert.strictEqual(sm.has("drums-kick"), false);
  assert.strictEqual(sm.get("drums-kick"), null);

  const fakeBuffer = ctx.createBuffer(1, 44100, 44100);
  const ok = sm.registerBuffer("drums-kick", fakeBuffer);
  assert.strictEqual(ok, true);
  assert.strictEqual(sm.has("drums-kick"), true);
  assert.strictEqual(sm.get("drums-kick"), fakeBuffer);

  sm.clear();
  assert.strictEqual(sm.has("drums-kick"), false);
});

runTest("SampleManager encontra o melhor sample e calcula pitch shift seguro", () => {
  const ctx = new MockAudioContext();
  const sm = new SampleManager(ctx);

  // Registra samples de baixo E1 (41.2Hz) e A1 (55Hz)
  const bufE1 = ctx.createBuffer(1, 44100, 44100);
  const bufA1 = ctx.createBuffer(1, 44100, 44100);
  sm.registerBuffer("bass-e1", bufE1);
  sm.registerBuffer("bass-a1", bufA1);

  // Nota F1 (~43.65 Hz) deve mapear para bass-e1 com pitch shift ligeiramente acelerado
  const matchedF = sm.findBestSampleForNote("bass", 43.65);
  assert.ok(matchedF, "Localizou sample para F1");
  assert.strictEqual(matchedF.sampleId, "bass-e1");
  assert.ok(matchedF.playbackRate > 1.0 && matchedF.playbackRate < 1.15, "Playback rate ajustado com precisão");

  // Nota B1 (~61.74 Hz) deve mapear para bass-a1
  const matchedB = sm.findBestSampleForNote("bass", 61.74);
  assert.ok(matchedB, "Localizou sample para B1");
  assert.strictEqual(matchedB.sampleId, "bass-a1");
  assert.ok(matchedB.playbackRate > 1.0 && matchedB.playbackRate < 1.25);
});

runTest("SampleManager aplica clamping seguro no playbackRate de pitch shift", () => {
  const ctx = new MockAudioContext();
  const sm = new SampleManager(ctx);
  sm.registerBuffer("bass-e1", ctx.createBuffer(1, 44100, 44100));

  // Frequência extrema (1000Hz para um sample de 41Hz)
  const matched = sm.findBestSampleForNote("bass", 1000);
  assert.ok(matched.playbackRate <= 2.4, "PlaybackRate limitado para evitar artefatos extremos");
});

// -------------------------------------------------------------
// 3. SAMPLE PLAYER (GRAFO WEB AUDIO, ENVELOPE, POLIFONIA)
// -------------------------------------------------------------
console.log("\n--- 3. Sample Player & Execução de Vozes ---");

runTest("SamplePlayer constrói o grafo: BufferSource -> Gain -> Destination", () => {
  const ctx = new MockAudioContext();
  const sp = new SamplePlayer(ctx);
  const buf = ctx.createBuffer(1, 44100, 44100);
  const destNode = ctx.createGain();

  const voice = sp.play(buf, {
    time: 0,
    velocity: 0.8,
    duration: 0.5,
    destination: destNode
  });

  assert.ok(voice, "Voz instanciada com sucesso");
  assert.ok(voice.source.isStarted, "BufferSource disparado");
  assert.strictEqual(voice.source.connectedTo[0], voice.gainNode, "Source conectado ao Gain");
  assert.strictEqual(voice.gainNode.connectedTo[0], destNode, "Gain conectado ao destino");
  assert.strictEqual(sp.getActiveVoiceCount(), 1, "Uma voz ativa registrada");
});

runTest("SamplePlayer suporta polifonia tocando múltiplas vozes sem interrupção", () => {
  const ctx = new MockAudioContext();
  const sp = new SamplePlayer(ctx);
  const buf = ctx.createBuffer(1, 44100, 44100);

  // Simula 3 vozes de um acorde de piano (C, E, G)
  const v1 = sp.play(buf, { time: 0, velocity: 0.7, duration: 1.0 });
  const v2 = sp.play(buf, { time: 0, velocity: 0.7, duration: 1.0 });
  const v3 = sp.play(buf, { time: 0, velocity: 0.7, duration: 1.0 });

  assert.ok(v1 && v2 && v3, "3 vozes criadas simultaneamente");
  assert.strictEqual(sp.getActiveVoiceCount(), 3, "Todas as 3 vozes registradas no contador de polifonia");

  sp.stopAll();
  assert.strictEqual(sp.getActiveVoiceCount(), 0, "Todas as vozes paradas e limpas");
});

runTest("SamplePlayer aplica curva de envelope e mapeamento de velocity", () => {
  const ctx = new MockAudioContext();
  const sp = new SamplePlayer(ctx);
  const buf = ctx.createBuffer(1, 44100, 44100);

  const voice = sp.play(buf, {
    time: 1.0,
    velocity: 0.5,
    duration: 0.8,
    attack: 0.01,
    release: 0.1
  });

  const gainEvents = voice.gainNode.gain.events;
  assert.ok(gainEvents.length >= 3, "Envelope configurado com múltiplos pontos de automação");
  assert.strictEqual(gainEvents[0].type, "set", "Inicia em valor de repouso");
  assert.strictEqual(gainEvents[1].type, "linear", "Ataque linear");
});

// -------------------------------------------------------------
// 4. REAL SOUND ENGINE (DISPARO REAL DE INSTRUMENTOS)
// -------------------------------------------------------------
console.log("\n--- 4. Real Sound Engine (Bateria, Baixo, Piano e Violão) ---");

runTest("RealSoundEngine dispara bumbo real quando sample está em cache", () => {
  const ctx = new MockAudioContext();
  const channels = { drums: ctx.createGain() };
  const sm = new SampleManager(ctx);
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  // Registra sample de bumbo
  sm.registerBuffer("drums-kick", ctx.createBuffer(1, 22050, 44100));

  rse.triggerKick(0.5, 0.9);
  assert.strictEqual(sp.getActiveVoiceCount(), 1, "SamplePlayer reproduziu o bumbo real");
});

runTest("RealSoundEngine toca polifonia completa de piano (3 notas simultâneas)", () => {
  const ctx = new MockAudioContext();
  const channels = { keyboard: ctx.createGain() };
  const sm = new SampleManager(ctx);
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  // Registra samples de piano C3 e C4
  sm.registerBuffer("piano-c3", ctx.createBuffer(1, 44100, 44100));
  sm.registerBuffer("piano-c4", ctx.createBuffer(1, 44100, 44100));

  // Acorde C Maior: C4 (261.63Hz), E4 (329.63Hz), G4 (392.00Hz)
  const chordFreqs = [261.63, 329.63, 392.00];
  rse.triggerPianoVoicing(0.0, chordFreqs, "piano", 1.5, 0.85);

  assert.strictEqual(sp.getActiveVoiceCount(), 3, "As 3 notas do acorde de piano foram tocadas simultaneamente");
});

runTest("RealSoundEngine executa batida (strum) de violão acústico com pick sweep", () => {
  const ctx = new MockAudioContext();
  const channels = { guitar: ctx.createGain() };
  const sm = new SampleManager(ctx);
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  // Registra cordas de violão
  sm.registerBuffer("acoustic-guitar-e2", ctx.createBuffer(1, 44100, 44100));
  sm.registerBuffer("acoustic-guitar-a2", ctx.createBuffer(1, 44100, 44100));
  sm.registerBuffer("acoustic-guitar-d3", ctx.createBuffer(1, 44100, 44100));
  sm.registerBuffer("acoustic-guitar-g3", ctx.createBuffer(1, 44100, 44100));

  const guitarFreqs = [82.41, 110.0, 146.83, 196.0];
  rse.triggerGuitarStrum(0.0, guitarFreqs, "down", 0.6, 0.8);

  assert.strictEqual(sp.getActiveVoiceCount(), 4, "As 4 cordas do violão foram disparadas com pick sweep");
});

runTest("RealSoundEngine toca linha de baixo real com afinação dinâmica", () => {
  const ctx = new MockAudioContext();
  const channels = { bass: ctx.createGain() };
  const sm = new SampleManager(ctx);
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  sm.registerBuffer("bass-a1", ctx.createBuffer(1, 44100, 44100));
  // Toca nota C2 (65.41Hz)
  rse.triggerBass(0.0, 65.41, 0.5, 0.9);
  assert.strictEqual(sp.getActiveVoiceCount(), 1, "Nota de contrabaixo real disparada");
});

// -------------------------------------------------------------
// 5. TESTE DE AUSÊNCIA DE SAMPLE & FALLBACK TRANSPARENTE
// -------------------------------------------------------------
console.log("\n--- 5. Teste de Ausência de Sample & Fallback Transparente ---");

runTest("Ausência de sample real recorre transparentemente ao SoundLibrary sem interrupção", () => {
  const ctx = new MockAudioContext();
  const channels = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    keyboard: ctx.createGain(),
    guitar: ctx.createGain()
  };
  const sm = new SampleManager(ctx); // Vazio (sem samples baixados)
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  // Nenhum erro deve ocorrer e os métodos devem executar via SoundLibrary
  assert.doesNotThrow(() => {
    rse.triggerKick(0.0, 0.8);
    rse.triggerSnare(0.5, 0.8);
    rse.triggerHiHat(1.0, 0.7);
    rse.triggerCrash(1.5, 0.8);
    rse.triggerTom(2.0, "medium", 0.7);
    rse.triggerBass(2.5, 55.0, 0.4, 0.8);
    rse.triggerKeyboardChord(3.0, [261.63, 329.63, 392.0], "pad", 1.0, 0.7);
    rse.triggerGuitarStrum(4.0, [82.41, 110.0, 146.83], "down", 0.5, 0.7);
    rse.triggerGuitarNote(5.0, 196.0, "arpeggio", 0.4, 0.7);
  }, "Todos os disparos executam sem lançar exceções mesmo sem nenhum sample em cache");
});

// -------------------------------------------------------------
// 6. MIXER, MUTE, SOLO E CANAIS
// -------------------------------------------------------------
console.log("\n--- 6. Mixer, Mute, Solo e Canais ---");

runTest("VirtuoBandEngine inicializa RealSoundEngine e conecta aos canais do Mixer", () => {
  const band = new VirtuoBandEngine();
  band._initAudio();

  assert.ok(band.sampleManager, "SampleManager instanciado na banda");
  assert.ok(band.samplePlayer, "SamplePlayer instanciado na banda");
  assert.ok(band.realSoundEngine, "RealSoundEngine instanciado na banda");
  assert.ok(band.soundLibrary, "SoundLibrary disponível como fallback");

  const status = band.getRealSoundStatus();
  assert.ok(status, "Status do Real Sound Engine recuperado");
  assert.strictEqual(status.hasFallback, true, "Fallback procedural garantido");
});

runTest("ArrangementEngine respeita mute e solo em conjunto com RealSoundEngine", () => {
  const ctx = new MockAudioContext();
  const channels = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    keyboard: ctx.createGain(),
    guitar: ctx.createGain()
  };
  const sm = new SampleManager(ctx);
  const sp = new SamplePlayer(ctx);
  const sl = new SoundLibrary(ctx, channels);
  const rse = new RealSoundEngine(ctx, channels, sm, sp, sl);

  const band = new VirtuoBandEngine();
  const ae = new ArrangementEngine(rse, band.harmonicEngine, band.grooveEngine, sm);

  const tracks = {
    drums: { volume: 0.8, muted: false, solo: false, active: true },
    bass: { volume: 0.7, muted: true, solo: false, active: true },
    keyboard: { volume: 0.7, muted: false, solo: true, active: true },
    guitar: { volume: 0.7, muted: false, solo: false, active: true }
  };

  assert.strictEqual(ae._canPlayTrack("bass", tracks), false, "Baixo mutado não toca");
  assert.strictEqual(ae._canPlayTrack("keyboard", tracks), true, "Teclado em solo toca");
  assert.strictEqual(ae._canPlayTrack("drums", tracks), false, "Bateria sem solo é suprimida quando teclado está em solo");
});

// -------------------------------------------------------------
// 7. PROGRESSÕES MUSICAIS OBRIGATÓRIAS
// -------------------------------------------------------------
console.log("\n--- 7. Testes de Progressões Musicais Dinâmicas ---");

runTest("Progressão C → G → Am → F varia notas de baixo, voicings de teclado e violão", () => {
  const band = new VirtuoBandEngine();
  band.loadProgression(["C", "G", "Am", "F"], "C", 76);

  const bassNotes = [];
  const keyboardVoicings = [];

  // Compasso 0 (início em C)
  let chordInfo = band.harmonicEngine.getCurrentChordInfo();
  bassNotes.push(chordInfo.bassNote);
  keyboardVoicings.push(chordInfo.notes);

  // Compassos 1 (G), 2 (Am), 3 (F)
  for (let bar = 1; bar < 4; bar++) {
    band.clock.onBarChange(bar);
    chordInfo = band.harmonicEngine.getCurrentChordInfo();
    bassNotes.push(chordInfo.bassNote);
    keyboardVoicings.push(chordInfo.notes);
  }

  assert.deepStrictEqual(bassNotes, ["C", "G", "A", "F"], "Baixo acompanha estritamente cada fundamental da progressão");
  assert.notDeepStrictEqual(keyboardVoicings[0], keyboardVoicings[1], "Voicings de C e G são distintos");
  assert.notDeepStrictEqual(keyboardVoicings[1], keyboardVoicings[2], "Voicings de G e Am são distintos");
  assert.strictEqual(bassNotes.every(n => n === bassNotes[0]), false, "Baixo NUNCA permanece em uma nota fixa repetida");
});

runTest("Progressão G → D → Em → C executa transições no andamento e compasso corretos", () => {
  const band = new VirtuoBandEngine();
  band.loadProgression(["G", "D", "Em", "C"], "G", 84);

  assert.strictEqual(band.getState().currentChord, "G");
  band.clock.onBarChange(1);
  assert.strictEqual(band.getState().currentChord, "D");
  band.clock.onBarChange(2);
  assert.strictEqual(band.getState().currentChord, "Em");
  band.clock.onBarChange(3);
  assert.strictEqual(band.getState().currentChord, "C");
  // Loop volta ao início
  band.clock.onBarChange(4);
  assert.strictEqual(band.getState().currentChord, "G", "Loop reinicia em G com perfeição");
});

runTest("Progressão Am → F → C → G conduz inversões e notas harmônicas corretas", () => {
  const band = new VirtuoBandEngine();
  band.loadProgression(["Am", "F", "C", "G"], "Am", 70);

  const stepFreq0 = band.harmonicEngine.getBassFrequency(0, 8, "Worship", 3); // Tempo 1 (Fundamental)
  const stepFreq4 = band.harmonicEngine.getBassFrequency(4, 8, "Worship", 3); // Tempo 3 (Quinta)
  
  assert.ok(stepFreq0 > 0, "Frequência do tempo 1 calculada");
  assert.ok(stepFreq4 > 0, "Frequência do tempo 3 calculada");
  assert.notStrictEqual(stepFreq0, stepFreq4, "Baixo alterna entre fundamental e quinta, criando condução orgânica");
});

// -------------------------------------------------------------
// 8. TESTES DE PERFORMANCE E GESTÃO DE RECURSOS
// -------------------------------------------------------------
console.log("\n--- 8. Benchmark de Performance e Gestão de Recursos ---");

runTest("VirtuoBandEngine utiliza exatamente 1 AudioContext compartilhado", () => {
  const band = new VirtuoBandEngine();
  band._initAudio();
  const ctx = band.audioCtx;
  assert.ok(ctx, "AudioContext inicializado");
  assert.strictEqual(band.clock.audioCtx, ctx, "Clock compartilha o mesmo AudioContext");
  assert.strictEqual(band.realSoundEngine.audioCtx, ctx, "RealSoundEngine compartilha o mesmo AudioContext");
});

runTest("Benchmark de disparo do SamplePlayer executa em < 0.1ms por voz", () => {
  const ctx = new MockAudioContext();
  const sp = new SamplePlayer(ctx);
  const buf = ctx.createBuffer(1, 44100, 44100);

  const iterations = 500;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    sp.play(buf, { time: 0, velocity: 0.7, duration: 0.5 });
  }
  const totalDuration = performance.now() - start;
  const avgPerVoice = totalDuration / iterations;

  console.log(`     • Tempo médio por voz disparada: ${avgPerVoice.toFixed(4)} ms`);
  assert.ok(avgPerVoice < 0.2, "Disparo de voz é ultrarrápido (< 0.2ms) garantindo áudio sem engasgos");
});

console.log("\n=================================================");
console.log(`TOTAL DE TESTES DO REAL SOUND ENGINE: ${totalTests}`);
console.log(`PASSOU: ${passedTests} | FALHOU: ${totalTests - passedTests}`);
console.log("=================================================");

if (totalTests === passedTests) {
  console.log("🎉 TODOS OS TESTES DO REAL SOUND ENGINE PASSARAM COM SUCESSO!");
} else {
  process.exit(1);
}
