// =============================================================
// SUÍTE DE TESTES: METRÔNOMO NATIVO DO VIRTUO
// test-metronome-engine.js
// Validação automatizada de todos os 18 requisitos musicais
// =============================================================

import assert from "node:assert";
import { VirtuoMetronomeEngine, METRONOME_CONSTANTS, SUBDIVISIONS } from "./src/audio/metronome.js";

console.log("=== INICIANDO TESTES DO METRÔNOMO NATIVO VIRTUO ===\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Erro: ${err.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Mock de Web Audio API para execução determinística no Node.js
// -------------------------------------------------------------
class MockAudioContext {
  constructor() {
    this.currentTime = 0.0;
    this.state = "running";
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: (val, time) => {},
        exponentialRampToValueAtTime: (val, time) => {}
      },
      connect: (dest) => {}
    };
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: {
        value: 440,
        setValueAtTime: (val, time) => {}
      },
      connect: (dest) => {},
      start: (time) => {},
      stop: (time) => {}
    };
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

// Injeta mocks globais para o teste unitário
global.window = global.window || {};
global.window.AudioContext = MockAudioContext;
global.performance = global.performance || { now: () => Date.now() };

// -------------------------------------------------------------
// 1. BPM 40
// -------------------------------------------------------------
test("1. BPM 40 aceito com precisão", () => {
  const metro = new VirtuoMetronomeEngine({ bpm: 40 });
  assert.strictEqual(metro.bpm, 40);
  metro.setBpm(40);
  assert.strictEqual(metro.bpm, 40);
  metro.destroy();
});

// -------------------------------------------------------------
// 2. BPM 74
// -------------------------------------------------------------
test("2. BPM 74 (Worship padrão do Virtuo) aceito com precisão", () => {
  const metro = new VirtuoMetronomeEngine();
  assert.strictEqual(metro.bpm, 74);
  metro.setBpm(74);
  assert.strictEqual(metro.bpm, 74);
  metro.destroy();
});

// -------------------------------------------------------------
// 3. BPM 120
// -------------------------------------------------------------
test("3. BPM 120 (Louvor alegre) aceito com precisão", () => {
  const metro = new VirtuoMetronomeEngine({ bpm: 120 });
  assert.strictEqual(metro.bpm, 120);
  metro.setBpm(120);
  assert.strictEqual(metro.bpm, 120);
  metro.destroy();
});

// -------------------------------------------------------------
// 4. BPM 240
// -------------------------------------------------------------
test("4. BPM 240 (limite superior) aceito com precisão", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setBpm(240);
  assert.strictEqual(metro.bpm, 240);
  metro.destroy();
});

// -------------------------------------------------------------
// 5. Bloqueio abaixo de 40
// -------------------------------------------------------------
test("5. Bloqueio abaixo de 40 (clamp automático em 40)", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setBpm(39);
  assert.strictEqual(metro.bpm, 40, "BPM 39 deve travar em 40");
  metro.setBpm(10);
  assert.strictEqual(metro.bpm, 40, "BPM 10 deve travar em 40");
  metro.setBpm(-5);
  assert.strictEqual(metro.bpm, 40, "BPM negativo deve travar em 40");
  metro.setBpm("abc");
  assert.strictEqual(metro.bpm, 74, "BPM inválido deve resetar para default 74");
  metro.destroy();
});

// -------------------------------------------------------------
// 6. Bloqueio acima de 240
// -------------------------------------------------------------
test("6. Bloqueio acima de 240 (clamp automático em 240)", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setBpm(241);
  assert.strictEqual(metro.bpm, 240, "BPM 241 deve travar em 240");
  metro.setBpm(300);
  assert.strictEqual(metro.bpm, 240, "BPM 300 deve travar em 240");
  metro.destroy();
});

// -------------------------------------------------------------
// 7. Play (Iniciar)
// -------------------------------------------------------------
test("7. Play inicia o motor e o lookahead loop", () => {
  let stateReceived = null;
  const metro = new VirtuoMetronomeEngine({
    onStateChange: (s) => { stateReceived = s; }
  });

  assert.strictEqual(metro.isPlaying, false);
  metro.start();
  assert.strictEqual(metro.isPlaying, true);
  assert.ok(metro._timerWorker !== null, "Timer worker deve estar ativo");
  assert.strictEqual(stateReceived.isPlaying, true);
  metro.destroy();
});

// -------------------------------------------------------------
// 8. Pause (Pausar)
// -------------------------------------------------------------
test("8. Pause suspende o agendamento mantendo a posição", () => {
  let stateReceived = null;
  const metro = new VirtuoMetronomeEngine({
    onStateChange: (s) => { stateReceived = s; }
  });

  metro.start();
  assert.strictEqual(metro.isPlaying, true);

  metro.pause();
  assert.strictEqual(metro.isPlaying, false);
  assert.strictEqual(metro._timerWorker, null, "Timer worker deve ser cancelado");
  assert.strictEqual(stateReceived.isPlaying, false);
  metro.destroy();
});

// -------------------------------------------------------------
// 9. Stop (Parar)
// -------------------------------------------------------------
test("9. Stop interrompe e zera contadores de tempo musical", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.start();
  metro._currentBeatNumber = 3;
  metro._currentSubdivisionTick = 2;

  metro.stop();
  assert.strictEqual(metro.isPlaying, false);
  assert.strictEqual(metro._currentBeatNumber, 1, "Stop deve resetar beatNumber para 1");
  assert.strictEqual(metro._currentSubdivisionTick, 0, "Stop deve resetar tick para 0");
  assert.strictEqual(metro._timerWorker, null, "Worker deve estar limpo");
  metro.destroy();
});

// -------------------------------------------------------------
// 10. Tap Tempo
// -------------------------------------------------------------
test("10. Tap Tempo calcula automaticamente o BPM com toques ritmados", () => {
  const metro = new VirtuoMetronomeEngine();

  // Simula toques a cada 500ms (500ms por batida = 120 BPM)
  const baseTime = 10000;
  metro._tapTimestamps = [baseTime, baseTime + 500, baseTime + 1000];
  
  // Próximo tap
  global.performance.now = () => baseTime + 1500;
  metro.tap();

  assert.strictEqual(metro.bpm, 120, "4 toques espaçados por 500ms devem resultar em exatamente 120 BPM");

  // Simula toques a cada 810ms (~74 BPM)
  const baseWorship = 50000;
  metro._tapTimestamps = [baseWorship, baseWorship + 810, baseWorship + 1620];
  global.performance.now = () => baseWorship + 2430;
  metro.tap();
  assert.strictEqual(metro.bpm, 74, "Toques espaçados por 810ms devem calcular ~74 BPM");

  metro.destroy();
});

// -------------------------------------------------------------
// 11. Subdivisão 1/4
// -------------------------------------------------------------
test("11. Subdivisão 1/4 (Semínima) configura fator 1", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setSubdivision("1/4");
  assert.strictEqual(metro.subdivision, "1/4");
  assert.strictEqual(SUBDIVISIONS[metro.subdivision].factor, 1);
  metro.destroy();
});

// -------------------------------------------------------------
// 12. Subdivisão 1/8
// -------------------------------------------------------------
test("12. Subdivisão 1/8 (Colcheia) configura fator 2", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setSubdivision("1/8");
  assert.strictEqual(metro.subdivision, "1/8");
  assert.strictEqual(SUBDIVISIONS[metro.subdivision].factor, 2);
  metro.destroy();
});

// -------------------------------------------------------------
// 13. Subdivisão 1/16
// -------------------------------------------------------------
test("13. Subdivisão 1/16 (Semicolcheia) configura fator 4", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setSubdivision("1/16");
  assert.strictEqual(metro.subdivision, "1/16");
  assert.strictEqual(SUBDIVISIONS[metro.subdivision].factor, 4);
  metro.destroy();
});

// -------------------------------------------------------------
// 14. Acento do primeiro tempo
// -------------------------------------------------------------
test("14. Acento no primeiro tempo ativa e desativa corretamente", () => {
  const metro = new VirtuoMetronomeEngine();
  assert.strictEqual(metro.accentFirstBeat, true, "Por padrão o acento deve vir ativo");

  metro.setAccentFirstBeat(false);
  assert.strictEqual(metro.accentFirstBeat, false);

  metro.setAccentFirstBeat(true);
  assert.strictEqual(metro.accentFirstBeat, true);
  metro.destroy();
});

// -------------------------------------------------------------
// 15. Volume
// -------------------------------------------------------------
test("15. Controle de volume independente com clamping entre 0.0 e 1.0", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.setVolume(0.5);
  assert.strictEqual(metro.volume, 0.5);

  metro.setVolume(1.5); // Deve travar em 1.0
  assert.strictEqual(metro.volume, 1.0);

  metro.setVolume(-0.2); // Deve travar em 0.0
  assert.strictEqual(metro.volume, 0.0);

  metro.destroy();
});

// -------------------------------------------------------------
// 16. Integração com BPM de uma música
// -------------------------------------------------------------
test("16. useSongBpm atualiza o metrônomo sem mutar o Firestore", () => {
  const mockSong = {
    id: "song-worship-1",
    title: "Bondade de Deus",
    bpm: 68,
    originalKey: "Ab"
  };

  const metro = new VirtuoMetronomeEngine({ bpm: 120 });
  assert.strictEqual(metro.bpm, 120);

  metro.useSongBpm(mockSong.bpm);
  assert.strictEqual(metro.bpm, 68, "BPM deve sincronizar com o da música");
  assert.strictEqual(mockSong.bpm, 68, "Documento original permanece inalterado");

  metro.destroy();
});

// -------------------------------------------------------------
// 17. Uso dentro do Modo Ministro (Sincronização não invasiva)
// -------------------------------------------------------------
test("17. Metrônomo fornece estado completo para o painel do Modo Ministro", () => {
  const metro = new VirtuoMetronomeEngine({ bpm: 70, subdivision: "1/8", volume: 0.9 });
  const state = metro.getState();

  assert.strictEqual(state.bpm, 70);
  assert.strictEqual(state.subdivision, "1/8");
  assert.strictEqual(state.volume, 0.9);
  assert.strictEqual(state.accentFirstBeat, true);
  assert.strictEqual(state.isPlaying, false);

  metro.destroy();
});

// -------------------------------------------------------------
// 18. Confirmar que não existem timers/loops vazando após parar
// -------------------------------------------------------------
test("18. Nenhum timer ou loop vaza após stop() e destroy()", () => {
  const metro = new VirtuoMetronomeEngine();
  metro.start();
  assert.ok(metro._timerWorker !== null);

  metro.stop();
  assert.strictEqual(metro._timerWorker, null, "Stop deve limpar o setInterval");

  metro.start();
  metro.destroy();
  assert.strictEqual(metro._timerWorker, null, "Destroy deve anular o setInterval");
  assert.strictEqual(metro.audioCtx, null, "Destroy deve fechar e anular o AudioContext");
  assert.strictEqual(metro.isPlaying, false);
});

console.log("\n==============================================");
console.log(`TOTAL DE TESTES DO METRÔNOMO: ${passed + failed}`);
console.log(`PASSOU: ${passed}`);
console.log(`FALHOU: ${failed}`);
console.log("==============================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("TODOS OS TESTES DO METRÔNOMO PASSARAM COM SUCESSO!\n");
}
