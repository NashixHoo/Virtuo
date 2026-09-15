// =============================================================
// SUÍTE DE TESTES E BENCHMARK: VIRTUO VOCAL & PERFORMANCE INTELLIGENCE
// test-vocal-performance.js
// Validação completa dos motores de áudio, pitch, afinador, treinos e performance
// 100% Determinístico - Medição real com performance.now()
// =============================================================

import { performance } from "perf_hooks";
import { 
  VirtuoVoiceDetector, 
  virtuoVoiceDetector, 
  VOCAL_INTERVALS, 
  NOTE_NAMES 
} from "./src/audio/voice-detector.js";
import { VocalTrainer, vocalTrainer } from "./src/features/vocal/vocal-trainer.js";
import { PerformanceEngine, performanceEngine } from "./src/features/performance/performance-engine.js";
import { PerformanceHistoryService } from "./src/features/performance/performance-history.js";

// Mock para localStorage em ambiente de teste Node.js
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}
globalThis.localStorage = new MockLocalStorage();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log("=================================================");
console.log("🎤 TEST SUITE: VIRTUO VOCAL & PERFORMANCE 2.0");
console.log("=================================================");

// 1. CONVERSÃO FREQUÊNCIA → NOTA, OITAVA E CENTS
console.log("\n--- 1. Conversão Frequência → Nota, Oitava e Cents ---");
const a4Pitch = virtuoVoiceDetector.frequencyToPitch(440.0);
assert(a4Pitch.note === "A" && a4Pitch.octave === 4 && a4Pitch.cents === 0, "440.0 Hz detecta perfeitamente A4 com 0 cents");

const c4Pitch = virtuoVoiceDetector.frequencyToPitch(261.63);
assert(c4Pitch.note === "C" && c4Pitch.octave === 4 && Math.abs(c4Pitch.cents) <= 1, "261.63 Hz detecta C4 com cents próximo de zero");

const g4Sharp = virtuoVoiceDetector.frequencyToPitch(393.6);
assert(g4Sharp.note === "G" && g4Sharp.octave === 4 && g4Sharp.cents === 7, "393.6 Hz detecta G4 com exatos +7 cents (exemplo da especificação)");

const a4Flat = virtuoVoiceDetector.frequencyToPitch(435.0);
assert(a4Flat.note === "A" && a4Flat.octave === 4 && a4Flat.cents === -20, "435.0 Hz detecta A4 com -20 cents (abaixo da afinação)");

// 2. CONVERSÃO NOTA → FREQUÊNCIA
console.log("\n--- 2. Conversão Nota → Frequência ---");
const freqA4 = virtuoVoiceDetector.noteToFrequency("A", 4);
assert(Math.abs(freqA4 - 440.0) < 0.01, "Nota A4 converte para 440.00 Hz");

const freqC4 = virtuoVoiceDetector.noteToFrequency("C", 4);
assert(Math.abs(freqC4 - 261.63) < 0.05, "Nota C4 converte para 261.63 Hz");

const freqBb4 = virtuoVoiceDetector.noteToFrequency("Bb", 4);
const freqAsharp4 = virtuoVoiceDetector.noteToFrequency("A#", 4);
assert(Math.abs(freqBb4 - freqAsharp4) < 0.01, "Enarmonia Bb4 e A#4 geram frequências idênticas (466.16 Hz)");

// 3. CÁLCULO DE CENTS ENTRE FREQUÊNCIAS
console.log("\n--- 3. Cálculo de Cents entre Frequências ---");
const centsUnison = virtuoVoiceDetector.calculateCents(440, 440);
assert(centsUnison === 0, "Cents em uníssono é 0");

const centsPlus7 = virtuoVoiceDetector.calculateCents(393.6, 392.0);
assert(centsPlus7 === 7, "Cents entre 393.6Hz e 392.0Hz é +7 cents");

const centsMinus20 = virtuoVoiceDetector.calculateCents(435, 440);
assert(centsMinus20 === -20, "Cents entre 435Hz e 440Hz é -20 cents");

// 4. DETECÇÃO DE SILÊNCIO E RUÍDO
console.log("\n--- 4. Detecção de Silêncio e Limiar de Ruído ---");
const detector = new VirtuoVoiceDetector({ bufferSize: 1024, silenceThreshold: 0.012 });
const silenceBuffer = new Float32Array(1024); // Todos zeros = silêncio absoluto
const silenceResult = detector._detectPitchFromBuffer(silenceBuffer, 44100);

assert(silenceResult !== null, "Detector retorna objeto seguro durante silêncio");
assert(silenceResult.isSilence === true, "Silêncio identificado corretamente com isSilence=true");
assert(silenceResult.frequency === 0, "Frequência é 0 durante silêncio");
assert(silenceResult.note === null, "Nenhuma falsa nota atribuída durante silêncio");

// 5. FILTRO VOCAL (85 Hz — 1100 Hz)
console.log("\n--- 5. Filtro de Faixa Vocal ---");
detector.setFilterRange(85, 1100);
assert(detector.lowCutoff === 85 && detector.highCutoff === 1100, "Filtro vocal configurado estritamente em 85Hz a 1100Hz");

detector.setFilterRange(10, 8000); // Tenta valores fora dos limites
assert(detector.lowCutoff === 20 && detector.highCutoff === 5000, "Clamping seguro de frequências de filtro implementado");

// 6. TREINO DE INTERVALOS (TODOS OS 8 INTERVALOS)
console.log("\n--- 6. Estrutura de Treino de Intervalos (8 Suportados) ---");
const intervalTests = [
  { key: "unison", expectedNote: "C", expectedOctave: 4, semitones: 0 },
  { key: "major_second", expectedNote: "D", expectedOctave: 4, semitones: 2 },
  { key: "minor_third", expectedNote: "D#", expectedOctave: 4, semitones: 3 },
  { key: "major_third", expectedNote: "E", expectedOctave: 4, semitones: 4 },
  { key: "perfect_fourth", expectedNote: "F", expectedOctave: 4, semitones: 5 },
  { key: "perfect_fifth", expectedNote: "G", expectedOctave: 4, semitones: 7 },
  { key: "major_sixth", expectedNote: "A", expectedOctave: 4, semitones: 9 },
  { key: "octave", expectedNote: "C", expectedOctave: 5, semitones: 12 }
];

let allIntervalsPassed = true;
intervalTests.forEach(t => {
  const target = virtuoVoiceDetector.getIntervalTarget("C", 4, t.key);
  if (target.targetNote !== t.expectedNote || target.targetOctave !== t.expectedOctave || target.semitones !== t.semitones) {
    allIntervalsPassed = false;
  }
});
assert(allIntervalsPassed, "Todos os 8 intervalos calculam nota e oitava alvo com perfeição");

// 7. AVALIAÇÃO DE CANTO NO INTERVALO E NO TREINO DE NOTAS
console.log("\n--- 7. Avaliação Determinística de Notas e Intervalos ---");
const trainer = new VocalTrainer();
trainer.setTargetNote("A", 4);

// Simula frame cantado afinado (440Hz)
const frameA4InTune = {
  frequency: 440.0,
  note: "A",
  octave: 4,
  cents: 0,
  confidence: 0.95,
  isSilence: false,
  stability: 90
};

// Simula primeiro frame
trainer.processNoteFrame(frameA4InTune);
// Avança o tempo para 1100ms depois
trainer.lockStartTime = performance.now() - 1100;
trainer.firstVocalTime = performance.now() - 1500;
const lockResult = trainer.processNoteFrame(frameA4InTune);

assert(lockResult.isLocked === true && lockResult.isCompleted === true, "Nota A4 travada e sustentada com sucesso após 1.1s");
assert(lockResult.score >= 80, `Pontuação determinística calculada com sucesso (${lockResult.score} pts)`);

// 8. MOTOR DE PERFORMANCE (VIRTUO PERFORMANCE)
console.log("\n--- 8. Virtuo Performance Engine ---");
const testEngine = new PerformanceEngine();
testEngine.isActive = true;
testEngine._setupKeyAndScale("G");
assert(testEngine.scaleNotes.has("G") && testEngine.scaleNotes.has("D") && testEngine.scaleNotes.has("C"), "Escala de G contém os graus fundamentais (G, C, D)");

// Simula frames cantados
for (let i = 0; i < 50; i++) {
  testEngine._processFrame({
    frequency: 392.0,
    note: "G",
    octave: 4,
    cents: 2,
    confidence: 0.92,
    isSilence: false,
    stability: 88
  });
}

const scores = testEngine.getCurrentScores();
assert(scores.pitchScore === 100, "Afinação na tonalidade calcula 100%");
assert(scores.stabilityScore === 100, "Estabilidade sustentada calcula 100%");
assert(scores.overallScore >= 90, `Pontuação geral ponderada calcula ${scores.overallScore}%`);

// 9. HISTÓRICO LOCAL DE PERFORMANCE (ZERO FIRESTORE DEPENDENCY)
console.log("\n--- 9. Histórico Local de Sessões ---");
const historyService = new PerformanceHistoryService();
historyService.clearHistory();

const saved = historyService.saveSession({
  songTitle: "Porque Ele Vive",
  songKey: "G",
  bpm: 72,
  score: 93,
  pitchScore: 95,
  rhythmScore: 90,
  stabilityScore: 94,
  consistencyScore: 92,
  duration: 60,
  strengths: ["Afinação excelente", "Boa sustentação"],
  improvements: ["Atenção aos finais de frase"]
});

assert(saved !== null && saved.id.startsWith("sess_"), "Sessão salva com ID único no localStorage");
const sessions = historyService.getAllSessions();
assert(sessions.length === 1 && sessions[0].songTitle === "Porque Ele Vive", "Sessão recuperada com integridade");

const stats = historyService.getOverallStats();
assert(stats.totalSessions === 1 && stats.averageScore === 93, "Estatísticas consolidadas calculadas com sucesso");

// 10. BENCHMARK REAL DE LATÊNCIA (PERFORMANCE.NOW)
console.log("\n=================================================");
console.log("⚡ BENCHMARK REAL DE PROCESSAMENTO: VIRTUO VOCAL");
console.log("=================================================");

// Gera buffer de áudio sintético com tom puro de 440 Hz (A4)
const sampleRate = 44100;
const bufferLen = 2048;
const testBuffer = new Float32Array(bufferLen);
for (let i = 0; i < bufferLen; i++) {
  testBuffer[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
}

const benchDetector = new VirtuoVoiceDetector({ bufferSize: bufferLen });

// Warmup
for (let i = 0; i < 20; i++) {
  benchDetector._detectPitchFromBuffer(testBuffer, sampleRate);
}

const iterations = 500;
const durations = [];

for (let i = 0; i < iterations; i++) {
  const tStart = performance.now();
  benchDetector._detectPitchFromBuffer(testBuffer, sampleRate);
  const tEnd = performance.now();
  durations.push(tEnd - tStart);
}

durations.sort((a, b) => a - b);
const sum = durations.reduce((a, b) => a + b, 0);
const avg = parseFloat((sum / iterations).toFixed(4));
const p95 = parseFloat((durations[Math.floor(iterations * 0.95)]).toFixed(4));
const p99 = parseFloat((durations[Math.floor(iterations * 0.99)]).toFixed(4));
const max = parseFloat((durations[durations.length - 1]).toFixed(4));
const min = parseFloat((durations[0]).toFixed(4));

console.log(`Métricas Reais de Execução (${iterations} frames de 2048 amostras):`);
console.log(`  • MÉDIA:   ${avg} ms`);
console.log(`  • P95:     ${p95} ms`);
console.log(`  • P99:     ${p99} ms`);
console.log(`  • MÁXIMO:  ${max} ms`);
console.log(`  • MÍNIMO:  ${min} ms`);

assert(avg < 4.0, `Latência média (${avg}ms) é estritamente menor que 4.0ms (Extremamente rápida)`);
assert(p95 < 6.0, `P95 (${p95}ms) garante folga massiva para 60 FPS (16.6ms)`);

console.log("\n=================================================");
console.log(`RESULTADOS: ${passed} PASSOU | ${failed} FALHOU`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
