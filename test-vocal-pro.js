// =============================================================
// TEST SUITE: VIRTUO VOCAL PRO (MONITOR VOCAL INTELIGENTE 2.1)
// test-vocal-pro.js
// Validação completa dos 6 pilares:
// 1. Suavização (EMA & Desaceleração Natural)
// 2. Estabilidade (Variação Temporal: Excelente, Boa, Instável)
// 3. Detector de Nota (Nota, Frequência, Cents)
// 4. Detector de Respiração (Pausas Naturais e Sustentação)
// 5. Exercícios Guiados (Sustentar, Repetir, Subir/Descer Meio Tom)
// 6. Modo Aquecimento (3 Minutos: Graves, Médios, Agudos, Sustentação)
// 7. Performance (< 7ms por frame, 60 FPS)
// =============================================================

import { performance } from "perf_hooks";
import { virtuoVoiceDetector } from "./src/audio/voice-detector.js";
import { 
  VocalSmoother, 
  VocalStabilityDetector, 
  VocalBreathDetector, 
  VocalWarmupEngine, 
  VocalExerciseEngine, 
  VocalSilentFeedback,
  VirtuoVocalProEngine,
  WARMUP_PHASES,
  VOCAL_EXERCISES
} from "./src/features/vocal/vocal-pro-engine.js";

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
console.log("🎤 TEST SUITE: VIRTUO VOCAL PRO 2.1 (ETAPA 2/5)");
console.log("=================================================");

// -------------------------------------------------------------
// 1. SUAVIZAÇÃO (EMA & DESACELERAÇÃO NATURAL)
// -------------------------------------------------------------
console.log("\n--- 1. Suavização Vocal (EMA & Desaceleração Natural) ---");
const smoother = new VocalSmoother({ alphaCents: 0.20, decayRate: 0.90 });

// Simula salto bruto de afinação: de 0 para +20 cents
const frame1 = smoother.update({ note: "A", octave: 3, frequency: 220.0, cents: 20, intensity: 0.8, confidence: 0.9, isSilence: false });
assert(frame1.smoothCents < 20 && frame1.smoothCents > 0, "EMA evita salto imediato de cents (frame 1 convergindo suavemente)");

// Após vários quadros com o mesmo tom, aproxima-se de 20
for (let i = 0; i < 20; i++) {
  smoother.update({ note: "A", octave: 3, frequency: 220.0, cents: 20, intensity: 0.8, confidence: 0.9, isSilence: false });
}
const frameStable = smoother.update({ note: "A", octave: 3, frequency: 220.0, cents: 20, intensity: 0.8, confidence: 0.9, isSilence: false });
assert(Math.abs(frameStable.smoothCents - 20) <= 1, "EMA estabiliza com precisão após convergência contínua");

// Desaceleração Natural durante o Silêncio (Sem cortes bruscos)
const silentDecay1 = smoother.update({ isSilence: true });
assert(silentDecay1.isResting === true, "Identifica estado de repouso no silêncio");
assert(silentDecay1.smoothIntensity < 0.8, "Intensidade desacelera gradualmente");
assert(silentDecay1.smoothCents < 20, "Cents e medidor deslizam suavemente em direção ao centro");

for (let i = 0; i < 30; i++) {
  smoother.update({ isSilence: true });
}
const restingFrame = smoother.update({ isSilence: true });
assert(restingFrame.smoothIntensity === 0, "Intensidade alcança zero suavemente");
assert(restingFrame.smoothMeterPct === 50, "Medidor retorna exatamente ao centro de repouso (50%)");

// -------------------------------------------------------------
// 2. INDICADOR DE ESTABILIDADE (EXCELENTE, BOA, INSTÁVEL)
// -------------------------------------------------------------
console.log("\n--- 2. Indicador de Estabilidade Vocal ---");
const stability = new VocalStabilityDetector(20);

// Cenário A: Voz Excelente (mesma nota fundamental, variação mínima de cents <= 2 cents)
for (let i = 0; i < 15; i++) {
  const smallJitter = (i % 2 === 0) ? 1 : -1;
  stability.process({ note: "A", octave: 3, frequency: 220.0, cents: smallJitter, confidence: 0.95, isSilence: false });
}
const resExcelente = stability.process({ note: "A", octave: 3, frequency: 220.0, cents: 0, confidence: 0.95, isSilence: false });
assert(resExcelente.state === "Excelente", `Voz constante classificada como 'Excelente' (obtido: ${resExcelente.state}, score: ${resExcelente.score}%)`);
assert(resExcelente.score >= 80, `Pontuação de estabilidade excelente >= 80% (obtido: ${resExcelente.score}%)`);
assert(resExcelente.jitterCents <= 3, `Baixo jitter detectado (obtido: ${resExcelente.jitterCents} cents)`);

// Cenário B: Voz Instável (saltos caóticos de notas e cents)
stability.reset();
const erraticNotes = ["C", "F#", "G", "D", "A#", "E", "C#", "B"];
for (let i = 0; i < 15; i++) {
  const n = erraticNotes[i % erraticNotes.length];
  const c = ((i * 17) % 80) - 40;
  stability.process({ note: n, octave: 3, frequency: 150 + i * 20, cents: c, confidence: 0.70, isSilence: false });
}
const resInstavel = stability.process({ note: "F", octave: 4, frequency: 349.0, cents: 35, confidence: 0.65, isSilence: false });
assert(resInstavel.state === "Instável", `Voz oscilante classificada como 'Instável' (obtido: ${resInstavel.state}, score: ${resInstavel.score}%)`);
assert(resInstavel.score < 60, `Pontuação de estabilidade instável < 60% (obtido: ${resInstavel.score}%)`);

// Cenário C: Voz Boa (mesma nota com leve oscilação natural)
stability.reset();
for (let i = 0; i < 15; i++) {
  const moderateJitter = (i % 3 === 0) ? 8 : (i % 3 === 1 ? -7 : 4);
  stability.process({ note: "G", octave: 3, frequency: 196.0, cents: moderateJitter, confidence: 0.85, isSilence: false });
}
const resBoa = stability.process({ note: "G", octave: 3, frequency: 196.0, cents: 6, confidence: 0.85, isSilence: false });
assert(resBoa.state === "Boa" || resBoa.state === "Excelente", `Voz moderada classificada adequadamente como 'Boa' ou 'Excelente' (obtido: ${resBoa.state})`);

// -------------------------------------------------------------
// 3. DETECÇÃO DE NOTA CANTADA (NOTA, FREQUÊNCIA, CENTS)
// -------------------------------------------------------------
console.log("\n--- 3. Detecção de Nota Cantada (A3, 220 Hz, Cents) ---");
// Exemplo canônico da especificação: A3, 220 Hz, +4 cents
const a3Pitch = virtuoVoiceDetector.frequencyToPitch(220.0);
assert(a3Pitch.note === "A" && a3Pitch.octave === 3 && a3Pitch.cents === 0, "220.0 Hz detecta exatamente A3 com 0 cents");

// Frequência com +4 cents de desvio em A3: f = 220 * 2^(4/1200) ≈ 220.51 Hz
const freqPlus4 = 220 * Math.pow(2, 4 / 1200);
const a3Plus4 = virtuoVoiceDetector.frequencyToPitch(freqPlus4);
assert(a3Plus4.note === "A" && a3Plus4.octave === 3 && a3Plus4.cents === 4, `Frequência ${freqPlus4.toFixed(2)} Hz detecta A3 com exatos +4 cents`);

const c4Pitch = virtuoVoiceDetector.frequencyToPitch(261.63);
assert(c4Pitch.note === "C" && c4Pitch.octave === 4 && Math.abs(c4Pitch.cents) <= 1, "261.63 Hz detecta C4 com cents próximo de 0");

const noteFreqA3 = virtuoVoiceDetector.noteToFrequency("A", 3);
assert(Math.abs(noteFreqA3 - 220.0) < 0.05, "Nota A3 converte para 220.0 Hz");

// -------------------------------------------------------------
// 4. DETECTOR DE RESPIRAÇÃO E SUSTENTAÇÃO
// -------------------------------------------------------------
console.log("\n--- 4. Detector de Respiração e Sustentação ---");
const breath = new VocalBreathDetector();

// Simula sustentação muito curta (< 900ms) seguida de parada abrupta
breath.process({ note: "A", octave: 3, frequency: 220, confidence: 0.9, isSilence: false });
// Simula 400ms de fonação curta
breath.phonationStartTime = performance.now() - 400;
const shortFeedback = breath.process({ isSilence: true });
assert(shortFeedback.feedback !== null, "Emite feedback pedagógico após emissão vocal");
assert(shortFeedback.feedback.text === "Tente sustentar um pouco mais.", `Sustentação muito curta sugere 'Tente sustentar um pouco mais.' (obtido: ${shortFeedback.feedback?.text})`);

// Simula sustentação longa (3 segundos)
breath.reset();
breath.process({ note: "A", octave: 3, frequency: 220, confidence: 0.9, isSilence: false });
breath.phonationStartTime = performance.now() - 3100;
const longFeedback = breath.process({ isSilence: true });
assert(longFeedback.feedback?.text === "Boa sustentação.", `Sustentação prolongada reconhece 'Boa sustentação.' (obtido: ${longFeedback.feedback?.text})`);

// Simula pausa natural de respiração (ex: 800ms) antes de retomar o canto
breath.pauseStartTime = performance.now() - 800;
const breathFeedback = breath.process({ note: "A", octave: 3, frequency: 220, confidence: 0.9, isSilence: false });
assert(breathFeedback.feedback?.text === "Respiração boa.", `Pausa natural de inspiração detecta 'Respiração boa.' (obtido: ${breathFeedback.feedback?.text})`);

// -------------------------------------------------------------
// 5. EXERCÍCIOS GUIADOS (4 EXERCÍCIOS)
// -------------------------------------------------------------
console.log("\n--- 5. Exercícios Guiados ---");
const exercises = new VocalExerciseEngine();

// 5.1 Exercício: Sustentar Nota
assert(VOCAL_EXERCISES.length === 4, "Exatamente 4 exercícios estruturados disponíveis");
exercises.setExercise("sustain");
assert(exercises.getExercise().title === "Sustentar Nota", "Exercício 1: Sustentar Nota selecionado");

// Inicia canto da nota alvo A3 (220 Hz)
exercises.processFrame({ note: "A", octave: 3, frequency: 220.0, confidence: 0.9, isSilence: false });
assert(exercises.holdStartTime !== null, "Inicia contagem de sustentação para nota afinada");

// Simula 3100ms de sustentação contínua
exercises.holdStartTime = performance.now() - 3100;
const sustainRes = exercises.processFrame({ note: "A", octave: 3, frequency: 220.0, confidence: 0.9, isSilence: false });
assert(sustainRes.isCompleted === true, "Exercício de sustentação concluído após 3 segundos afinados");
assert(sustainRes.score >= 80, `Pontuação de sustentação validada (score: ${sustainRes.score} pts)`);

// 5.2 Exercício: Repetir Nota
exercises.setExercise("repeat");
assert(exercises.getExercise().title === "Repetir Nota", "Exercício 2: Repetir Nota selecionado");
for (let r = 0; r < 3; r++) {
  exercises.isBetweenReps = true;
  exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
  exercises.holdStartTime = performance.now() - 300;
  exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
}
assert(exercises.isCompleted === true, "Exercício de repetição concluído após 3 emissões afinadas");

// 5.3 Exercício: Subir Meio Tom
exercises.setExercise("step_up");
assert(exercises.getExercise().title === "Subir Meio Tom", "Exercício 3: Subir Meio Tom selecionado");
exercises.step = 0;
exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
exercises.holdStartTime = performance.now() - 900;
exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
assert(exercises.step === 1, "Passo 1: Nota base C4 consolidada");

// Subir para C#4
exercises.processFrame({ note: "C#", octave: 4, frequency: 277.18, confidence: 0.9, isSilence: false });
exercises.holdStartTime = performance.now() - 900;
const stepUpRes = exercises.processFrame({ note: "C#", octave: 4, frequency: 277.18, confidence: 0.9, isSilence: false });
assert(stepUpRes.isCompleted === true, "Exercício de subir meio tom concluído com sucesso");

// 5.4 Exercício: Descer Meio Tom
exercises.setExercise("step_down");
assert(exercises.getExercise().title === "Descer Meio Tom", "Exercício 4: Descer Meio Tom selecionado");
exercises.step = 0;
exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
exercises.holdStartTime = performance.now() - 900;
exercises.processFrame({ note: "C", octave: 4, frequency: 261.63, confidence: 0.9, isSilence: false });
assert(exercises.step === 1, "Passo 1: Nota base C4 consolidada");

// Descer para B3
exercises.processFrame({ note: "B", octave: 3, frequency: 246.94, confidence: 0.9, isSilence: false });
exercises.holdStartTime = performance.now() - 900;
const stepDownRes = exercises.processFrame({ note: "B", octave: 3, frequency: 246.94, confidence: 0.9, isSilence: false });
assert(stepDownRes.isCompleted === true, "Exercício de descer meio tom concluído com sucesso");

// -------------------------------------------------------------
// 6. MODO AQUECIMENTO (3 MINUTOS: GRAVES, MÉDIOS, AGUDOS, SUSTENTAÇÃO)
// -------------------------------------------------------------
console.log("\n--- 6. Modo Aquecimento Vocal (3 Minutos) ---");
const warmup = new VocalWarmupEngine();
assert(warmup.totalDurationSeconds === 180, "Duração do aquecimento configurada exatamente em 180 segundos (3 minutos)");
assert(WARMUP_PHASES.length === 4, "Sessão dividida em 4 fases progressivas");
assert(WARMUP_PHASES[0].id === "graves", "Fase 1: Graves");
assert(WARMUP_PHASES[1].id === "medios", "Fase 2: Médios");
assert(WARMUP_PHASES[2].id === "agudos", "Fase 3: Agudos");
assert(WARMUP_PHASES[3].id === "sustentacao", "Fase 4: Sustentação");

const initialWarmupState = warmup.getState();
assert(initialWarmupState.remainingSeconds === 180, "Inicia com 180 segundos restantes");
assert(initialWarmupState.currentPhase.name === "Graves Relaxados", "Primeira fase é Graves Relaxados");

// Avanço de fase
warmup.nextPhase();
assert(warmup.currentPhaseIndex === 1, "Avanço para Fase 2 (Médios & Ressonância) funciona");
warmup.nextPhase();
assert(warmup.currentPhaseIndex === 2, "Avanço para Fase 3 (Agudos & Cabeça) funciona");
warmup.nextPhase();
assert(warmup.currentPhaseIndex === 3, "Avanço para Fase 4 (Sustentação & Apoio) funciona");

// Conclusão
warmup.nextPhase();
assert(warmup.elapsedSeconds === 180 && warmup.isRunning === false, "Conclui sessão após 4 fases");

// -------------------------------------------------------------
// 7. BENCHMARK DE PERFORMANCE (< 7ms POR FRAME, 60 FPS)
// -------------------------------------------------------------
console.log("\n--- 7. Benchmark de Performance Vocal Pro ---");
const engine = new VirtuoVocalProEngine();
const iterations = 500;
const times = [];

for (let i = 0; i < iterations; i++) {
  const t0 = performance.now();
  engine.processFrame({
    note: "A",
    octave: 3,
    frequency: 220.0 + (i % 5) * 0.2,
    cents: (i % 7) - 3,
    confidence: 0.92,
    intensity: 0.75,
    isSilence: false
  });
  times.push(performance.now() - t0);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`  • Tempo médio por frame: ${avgTime.toFixed(4)} ms`);
assert(avgTime < 1.0, `Processamento por frame executa em ${avgTime.toFixed(4)} ms (muito abaixo do teto de 7 ms)`);
assert(avgTime < 7.0, "Meta estrita de performance local (< 7 ms) plenamente cumprida");

// -------------------------------------------------------------
// TOTALIZAÇÃO
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`RESULTADOS: ${passed} PASSOU | ${failed} FALHOU`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
