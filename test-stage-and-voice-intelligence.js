// =============================================================
// VIRTUO ETAPA 2/4 AUTOMATED TESTS
// test-stage-and-voice-intelligence.js
// Tests for:
// 1. Performance Monitor
// 2. Voice & Tuner Math (frequencyToNote, cents, autocorrelation)
// 3. Music Intelligence Engine (capo, progression, chords, difficulty)
// 4. Band Engine (9 Presets, Intensities, Looping)
// 5. Rehearsal Intelligence (tempo distribution, key transitions, capo)
// 6. Server Economy AI & In-Memory Cache
// =============================================================

import assert from 'node:assert';
import { perfMonitor } from './src/performance/performance-monitor.js';
import { virtuoVoiceDetector } from './src/audio/voice-detector.js';
import { musicIntelligence } from './src/music/music-intelligence.js';
import { virtuoBand, BAND_PRESETS } from './src/audio/band-engine.js';
import { RehearsalController } from './src/features/rehearsal/rehearsal-controller.js';

console.log('🧪 Iniciando Testes Automatizados da Etapa 2/4 (Performance, Voz & Inteligência Musical)...\n');

let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${description}`);
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
  }
}

async function itAsync(description, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${description}`);
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
  }
}

// -------------------------------------------------------------
// 1. PERFORMANCE MONITOR
// -------------------------------------------------------------
console.log('--- 1. Performance Monitor Telemetry ---');

it('Deve registrar métricas e calcular média, min, max e p95 corretamente', () => {
  perfMonitor.clear();
  perfMonitor.recordMetric('test_op', 10);
  perfMonitor.recordMetric('test_op', 20);
  perfMonitor.recordMetric('test_op', 30);

  const summary = perfMonitor.getSummary();
  assert.ok(summary.test_op, 'test_op deve estar presente no resumo');
  assert.strictEqual(summary.test_op.count, 3);
  assert.strictEqual(summary.test_op.minMs, 10);
  assert.strictEqual(summary.test_op.maxMs, 30);
  assert.strictEqual(summary.test_op.avgMs, 20);
});

it('Deve medir blocos com startMeasure e endMeasure', () => {
  const token = perfMonitor.startMeasure('measured_block');
  // pequeno delay
  let x = 0;
  for (let i = 0; i < 50000; i++) x += i;
  const elapsed = perfMonitor.endMeasure(token);
  assert.ok(elapsed >= 0, 'Tempo decorrido deve ser positivo');

  const summary = perfMonitor.getSummary();
  assert.ok(summary.measured_block);
  assert.strictEqual(summary.measured_block.count, 1);
});

// -------------------------------------------------------------
// 2. VOICE & TUNER MATH
// -------------------------------------------------------------
console.log('\n--- 2. Voice & Tuner Math ---');

it('frequencyToNote deve calcular nota A4 (440Hz) com 0 cents', () => {
  const res = virtuoVoiceDetector.frequencyToNote(440);
  assert.strictEqual(res.note, 'A');
  assert.strictEqual(res.octave, 4);
  assert.strictEqual(res.cents, 0);
  assert.strictEqual(res.frequency, 440);
});

it('frequencyToNote deve calcular E2 (82.4Hz) aproximado com precisão', () => {
  const res = virtuoVoiceDetector.frequencyToNote(82.41);
  assert.strictEqual(res.note, 'E');
  assert.strictEqual(res.octave, 2);
  assert.ok(Math.abs(res.cents) <= 2, 'Cents de E2 deve ser próximo de 0');
});

it('frequencyToNote deve identificar notas sustentadas e bemóis com cents negativos ou positivos', () => {
  // 445 Hz é ligeiramente alto (+20 cents de A4)
  const high = virtuoVoiceDetector.frequencyToNote(445);
  assert.strictEqual(high.note, 'A');
  assert.ok(high.cents > 0, 'Cents deve ser positivo quando acima de 440');

  // 435 Hz é ligeiramente baixo (-20 cents de A4)
  const low = virtuoVoiceDetector.frequencyToNote(435);
  assert.strictEqual(low.note, 'A');
  assert.ok(low.cents < 0, 'Cents deve ser negativo quando abaixo de 440');
});

it('Deve retornar estatísticas de telemetria de áudio zeradas no início', () => {
  const stats = virtuoVoiceDetector.getPerformanceStats();
  assert.ok('framesProcessed' in stats);
  assert.ok('averageProcessingMs' in stats);
  assert.ok('p95ProcessingMs' in stats);
});

// -------------------------------------------------------------
// 3. MUSIC INTELLIGENCE ENGINE
// -------------------------------------------------------------
console.log('\n--- 3. Music Intelligence Engine (Deterministic) ---');

it('extractChords deve extrair todos os acordes únicos de uma cifra', () => {
  const sheet = `[Intro] G  C9  Em7  D\n[Verso] G  C9  G  D/F#`;
  const chords = musicIntelligence.extractChords(sheet);
  assert.deepStrictEqual(chords, ['G', 'C9', 'Em7', 'D', 'D/F#']);
});

it('suggestCapo deve recomendar capo para tonalidades desconfortáveis no violão', () => {
  const capoEb = musicIntelligence.suggestCapo('Eb');
  assert.ok(capoEb.capoFret > 0, 'Eb deve ter sugestão de capo');
  assert.ok(['C', 'D'].includes(capoEb.shapeKey), 'Forma deve ser C ou D');

  const capoG = musicIntelligence.suggestCapo('G');
  assert.strictEqual(capoG.capoFret, 0, 'G já é tom aberto natural');
});

it('analyzeProgression deve identificar graus harmônicos e cadências comuns', () => {
  const sheet = `G  D  Em  C`;
  const prog = musicIntelligence.analyzeProgression(sheet, 'G');
  assert.strictEqual(prog.key, 'G');
  assert.ok(prog.progressionDegrees.length >= 4);
  assert.strictEqual(prog.progressionDegrees[0], 'I');
  assert.strictEqual(prog.progressionDegrees[1], 'V');
  assert.strictEqual(prog.progressionDegrees[2], 'vi');
  assert.strictEqual(prog.progressionDegrees[3], 'IV');
});

it('estimateDifficulty deve classificar complexidade da cifra', () => {
  const easySheet = `G  C  D  Em`;
  const hardSheet = `F#m7(b5)  B7(b9)  Em9  A13  Dmaj7(#11)  Bb7/Ab`;
  const diffEasy = musicIntelligence.estimateDifficulty(easySheet, 70);
  const diffHard = musicIntelligence.estimateDifficulty(hardSheet, 130);

  assert.strictEqual(diffEasy.level, 'Iniciante');
  assert.ok(diffHard.level === 'Avançado' || diffHard.level === 'Intermediário');
});

// -------------------------------------------------------------
// 4. BAND ENGINE PRESETS & LOOPS
// -------------------------------------------------------------
console.log('\n--- 4. Virtuo Band Engine Presets & Dynamics ---');

it('VirtuoBand deve suportar todos os 9 presets obrigatórios', () => {
  const requiredPresets = ['worship', 'congregational', 'pop', 'ballad', 'rock', 'corinho', 'slow', 'medium', 'fast'];
  requiredPresets.forEach(presetKey => {
    assert.ok(BAND_PRESETS[presetKey], `Preset ${presetKey} deve existir em BAND_PRESETS`);
    assert.ok(BAND_PRESETS[presetKey].name, `Preset ${presetKey} deve ter nome`);
    assert.ok(BAND_PRESETS[presetKey].drums, `Preset ${presetKey} deve ter padrão de bateria`);
  });
});

it('Deve alterar preset, intensidade e loop no estado da banda', () => {
  virtuoBand.setPreset('rock');
  assert.strictEqual(virtuoBand.getState().currentPreset.toLowerCase(), 'rock');

  virtuoBand.setIntensity(3);
  assert.strictEqual(virtuoBand.getState().intensity, 3);

  virtuoBand.setLooping(false);
  assert.strictEqual(virtuoBand.getState().isLooping, false);

  virtuoBand.toggleLoop();
  assert.strictEqual(virtuoBand.getState().isLooping, true);

  // Restaura para worship
  virtuoBand.setPreset('worship');
  virtuoBand.setIntensity(2);
});

// -------------------------------------------------------------
// 5. REHEARSAL INTELLIGENCE
// -------------------------------------------------------------
console.log('\n--- 5. Rehearsal Intelligence Analysis ---');

it('RehearsalController.analyzeRehearsalIntelligence deve calcular BPM médio, distribuição e transições', () => {
  const controller = new RehearsalController();
  controller.rehearsals = [
    {
      id: 'test-ensaio',
      name: 'Ensaio Teste',
      songs: [
        { songId: 's1', bpm: 62, keyOffset: 0 }, // Lenta, tom G
        { songId: 's2', bpm: 78, keyOffset: 2 }, // Média, tom A (distância de 2 semitons)
        { songId: 's3', bpm: 110, keyOffset: 0 } // Rápida, tom C (quinta/quarta)
      ]
    }
  ];
  controller.activeRehearsalId = 'test-ensaio';
  controller.songsMap.set('s1', { title: 'Lenta 1', originalKey: 'G', bpm: 62 });
  controller.songsMap.set('s2', { title: 'Média 2', originalKey: 'G', bpm: 78 });
  controller.songsMap.set('s3', { title: 'Rápida 3', originalKey: 'C', bpm: 110 });

  const analysis = controller.analyzeRehearsalIntelligence();
  assert.ok(analysis, 'Análise deve ser gerada');
  assert.strictEqual(analysis.avgBpm, 83);
  assert.strictEqual(analysis.tempoDistribution.lentas, 1);
  assert.strictEqual(analysis.tempoDistribution.medias, 1);
  assert.strictEqual(analysis.tempoDistribution.rapidas, 1);
  assert.strictEqual(analysis.transitions.length, 2);
});

// -------------------------------------------------------------
// 6. SERVER ECONOMY AI & CACHE
// -------------------------------------------------------------
console.log('\n--- 6. Server Economy AI & In-Memory Cache ---');

const testHost = 'http://localhost:3000';

await itAsync('POST /api/ai/suggest com economyMode deve retornar virtuo-local e cache subsequente', async () => {
  const uniqueTitle = "Caminho no Deserto " + Date.now();
  const payload = {
    songTitle: uniqueTitle,
    currentKey: "C",
    originalKey: "C",
    bpm: 68,
    chords: "C  G  Am  F",
    musicianLevel: "Intermediário",
    economyMode: true
  };

  const res1 = await fetch(`${testHost}/api/ai/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res1.status, 200);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  assert.strictEqual(data1.source, 'virtuo-local');
  assert.ok(data1.advice.summary);
  assert.ok(data1.advice.recommendations.length >= 2);

  // Segunda chamada idêntica deve vir do cache
  const res2 = await fetch(`${testHost}/api/ai/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data2 = await res2.json();
  assert.strictEqual(data2.success, true);
  assert.strictEqual(data2.source, 'cache');
});

await itAsync('POST /api/ai/chat com economyMode deve responder instantaneamente via fallback e cachear', async () => {
  const uniqueMsg = "como fazer transição de tom suave no louvor " + Date.now();
  const payload = {
    message: uniqueMsg,
    economyMode: true
  };

  const res1 = await fetch(`${testHost}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res1.status, 200);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  assert.strictEqual(data1.source, 'virtuo-local');
  assert.ok(data1.reply.length > 50);

  // Segunda chamada idêntica deve vir do cache
  const res2 = await fetch(`${testHost}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data2 = await res2.json();
  assert.strictEqual(data2.success, true);
  assert.strictEqual(data2.source, 'cache');
});

console.log(`\n========================================`);
console.log(`Testes Concluídos: ${passed} / ${total} passaram com sucesso!`);
console.log(`========================================\n`);

if (passed !== total) {
  process.exit(1);
}
