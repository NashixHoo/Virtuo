// =============================================================
// TEST SUITE: VIRTUO AFINADOR PRO 2.1
// test-tuner-pro.js
// Validação matemática de EMA, Zona Morta, Inércia, Transição,
// Confidence Score, Estabilidade e Presets de Instrumentos.
// =============================================================

import assert from "node:assert/strict";
import { TunerSmoother, TUNER_STATES } from "./src/features/tuner/tuner-smoothing.js";
import { TUNER_PRESETS } from "./src/features/tuner/tuner-presets.js";

console.log("=================================================");
console.log("🎯 TEST SUITE: VIRTUO AFINADOR PRO 2.1");
console.log("=================================================");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. EXPONENTIAL MOVING AVERAGE (EMA)
// -------------------------------------------------------------
console.log("\n--- 1. Suavização por EMA (Exponential Moving Average) ---");

test("EMA: Separação estrita entre frequência/cents real e exibido", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  smoother.feedPitch({
    frequency: 440.0,
    cents: 25.0,
    note: "A",
    octave: 4,
    confidence: 0.95
  });

  assert.equal(smoother.targetCents, 25.0, "Cents real deve ser exatamente 25");
  assert.equal(smoother.displayedCents, 0, "Cents exibido inicial deve ser 0 (não teletransporta)");

  const step1 = smoother.step(performance.now() + 16);
  assert.ok(step1.displayedCents > 0 && step1.displayedCents < 25.0, "Cents exibido deve avançar suavemente via EMA");
  assert.ok(step1.displayedAngle > 0 && step1.displayedAngle < (25 / 50) * 45, "Ângulo deve acompanhar cents exibido");
});

test("EMA: Convergência suave e contínua sem overshoot", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });

  let t = performance.now();
  let prevCents = 0;
  for (let i = 0; i < 30; i++) {
    t += 16.666;
    smoother.feedPitch({
      frequency: 440.0,
      cents: 20.0,
      note: "A",
      octave: 4,
      confidence: 0.95
    }, t);
    const res = smoother.step(t);
    assert.ok(res.displayedCents >= prevCents, "Cents deve progredir monotonamente");
    assert.ok(res.displayedCents <= 20.0, "Cents não deve ultrapassar o alvo (sem overshoot)");
    prevCents = res.displayedCents;
  }
  assert.ok(prevCents >= 19.5, "Após 30 frames a 60 FPS (~500ms), deve convergir ao alvo");
});

// -------------------------------------------------------------
// 2. ZONA DE ESTABILIDADE (DEAD ZONE ±2 CENTS & HIGH PRECISION ±5 CENTS)
// -------------------------------------------------------------
console.log("\n--- 2. Zona de Estabilidade (Dead Zone & Damping) ---");

test("Zona Morta (±2 cents): Ponteiro desacelera expressivamente para evitar jitter", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  
  // Alvo dentro da zona morta (1.5 cents)
  smoother.feedPitch({
    frequency: 440.38,
    cents: 1.5,
    note: "A",
    octave: 4,
    confidence: 0.95
  });

  const tStart = performance.now();
  const step1 = smoother.step(tStart + 16.666);
  
  // O passo efetivo na zona morta usa alphaDeadZone (0.03) ao invés do padrão (0.18)
  assert.ok(step1.displayedCents < 0.2, "Na zona morta o movimento inicial deve ser extremamente contido");
});

test("Zona de Alta Precisão (±5 cents): Transição mais suave que o padrão", () => {
  const smootherDeadZone = new TunerSmoother({ alpha: 0.18 });
  smootherDeadZone.feedPitch({
    frequency: 441.0,
    cents: 4.0, // Zona fina (±5)
    note: "A",
    octave: 4,
    confidence: 0.95
  });

  const smootherStandard = new TunerSmoother({ alpha: 0.18 });
  smootherStandard.feedPitch({
    frequency: 444.0,
    cents: 15.0, // Zona padrão (>5)
    note: "A",
    octave: 4,
    confidence: 0.95
  });

  const t = performance.now();
  const resNear = smootherDeadZone.step(t + 16.666);
  const resStd = smootherStandard.step(t + 16.666);

  const ratioNear = resNear.displayedCents / 4.0;
  const ratioStd = resStd.displayedCents / 15.0;

  assert.ok(ratioNear < ratioStd, "O avanço percentual em ±5 cents deve ser mais suave que na zona padrão");
});

// -------------------------------------------------------------
// 3. INÉRCIA VISUAL & MUDANÇA DE NOTA (MÁXIMO 180MS)
// -------------------------------------------------------------
console.log("\n--- 3. Inércia Visual e Mudança de Nota ---");

test("Inércia: Troca de nota dispara transição com easing limitada a <= 180ms", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  const t0 = performance.now();

  smoother.feedPitch({
    frequency: 82.4,
    cents: 0,
    note: "E",
    octave: 2,
    confidence: 0.92
  });
  smoother.step(t0);

  // Agora toca nova corda (A2)
  smoother.feedPitch({
    frequency: 110.0,
    cents: 10,
    note: "A",
    octave: 2,
    confidence: 0.94
  });

  assert.equal(smoother.isInTransition, true, "Deve ativar estado de inércia ao mudar de nota");

  // Avança 90ms (meio da transição)
  smoother.step(t0 + 90);
  assert.equal(smoother.isInTransition, true, "Deve continuar em inércia antes de 180ms");

  // Avança para 190ms (> 180ms)
  smoother.step(t0 + 190);
  assert.equal(smoother.isInTransition, false, "Inércia deve expirar estritamente em no máximo 180ms");
});

test("Nunca teletransporta ponteiro ao mudar de nota", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  const t0 = performance.now();

  smoother.feedPitch({
    frequency: 82.4,
    cents: -30,
    note: "E",
    octave: 2,
    confidence: 0.92
  });

  // Estabiliza em -30
  for (let i = 1; i <= 40; i++) {
    smoother.step(t0 + i * 16.666);
  }
  const currentAngle = smoother.displayedAngle;

  // Muda bruscamente para +40 cents em outra nota
  smoother.feedPitch({
    frequency: 110.0,
    cents: 40,
    note: "A",
    octave: 2,
    confidence: 0.94
  });

  const nextStep = smoother.step(t0 + 41 * 16.666);
  const deltaAngle = Math.abs(nextStep.displayedAngle - currentAngle);

  assert.ok(deltaAngle < 15, "A agulha não pode saltar instantaneamente (sem teletransporte)");
});

// -------------------------------------------------------------
// 4. CONFIDENCE SCORE & REJEIÇÃO DE SINAL FRACO
// -------------------------------------------------------------
console.log("\n--- 4. Confidence Score e Rejeição de Sinal Fraco ---");

test("Confidence Score baixo (< 0.70) ativa estado WEAK_SIGNAL sem movimentar aleatoriamente", () => {
  const smoother = new TunerSmoother({ alpha: 0.18, confidenceThreshold: 0.70 });
  const t0 = performance.now();

  smoother.feedPitch({
    frequency: 440.0,
    cents: 0,
    note: "A",
    octave: 4,
    confidence: 0.55 // Abaixo do limiar
  });

  const res = smoother.step(t0 + 16.666);
  assert.equal(res.state, TUNER_STATES.WEAK_SIGNAL, "Deve sinalizar WEAK_SIGNAL");
  assert.equal(res.isWeakSignal, true, "Flag isWeakSignal deve ser verdadeira");
  assert.equal(res.displayedCents, 0, "Ponteiro não deve se mexer com leitura ruidosa");
});

test("Silêncio após sinal sonoro: agulha retorna suavemente para o centro sem saltos", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  const t0 = performance.now();

  smoother.feedPitch({
    frequency: 440.0,
    cents: 30,
    note: "A",
    octave: 4,
    confidence: 0.90
  });

  // Estabiliza
  for (let i = 1; i <= 20; i++) {
    smoother.step(t0 + i * 16.666);
  }
  const initialCents = smoother.displayedCents;
  assert.ok(initialCents > 25);

  // Silêncio
  smoother.feedPitch({
    frequency: 0,
    cents: 0,
    isSilence: true,
    confidence: 0
  });

  // Passo dentro do grace period
  smoother.step(t0 + 21 * 16.666);
  assert.ok(smoother.displayedCents > 20, "Durante o grace period inicial a agulha sustenta a leitura");

  // Passados 600ms de silêncio
  for (let i = 22; i <= 60; i++) {
    smoother.step(t0 + i * 16.666);
  }
  assert.ok(smoother.displayedCents < initialCents, "Após silêncio, agulha desacelera suavemente rumo ao repouso");
});

// -------------------------------------------------------------
// 5. CLASSIFICAÇÃO DOS TRÊS ESTADOS DE AFINAÇÃO
// -------------------------------------------------------------
console.log("\n--- 5. Três Estados de Afinação (Afinado, Quase, Desafinado) ---");

test("Classificação em três estados distintos", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  let t = performance.now();

  // 1. Afinado (<= 2.5 cents)
  for (let i = 1; i <= 30; i++) {
    t += 16.666;
    smoother.feedPitch({ frequency: 440.0, cents: 1.0, note: "A", octave: 4, confidence: 0.95 }, t);
    smoother.step(t);
  }
  let res = smoother.step(t + 16.666);
  assert.equal(res.isInTune, true, "1.0 cents deve ser classificado como AFINADO");
  assert.equal(res.state, TUNER_STATES.IN_TUNE);

  // 2. Quase afinado (2.5 a 7.0 cents)
  for (let i = 1; i <= 30; i++) {
    t += 16.666;
    smoother.feedPitch({ frequency: 441.2, cents: 4.8, note: "A", octave: 4, confidence: 0.95 }, t);
    smoother.step(t);
  }
  res = smoother.step(t + 16.666);
  assert.equal(res.isNearTune, true, "4.8 cents deve ser classificado como QUASE AFINADO");
  assert.equal(res.state, TUNER_STATES.NEAR_TUNE);

  // 3. Muito baixo / desafinado (> 7 cents)
  for (let i = 1; i <= 30; i++) {
    t += 16.666;
    smoother.feedPitch({ frequency: 435.0, cents: -20.0, note: "A", octave: 4, confidence: 0.95 }, t);
    smoother.step(t);
  }
  res = smoother.step(t + 16.666);
  assert.equal(res.state, TUNER_STATES.OUT_OF_TUNE, "-20 cents deve ser classificado como DESAFINADO");
  assert.equal(res.isInTune, false);
  assert.equal(res.isNearTune, false);
});

// -------------------------------------------------------------
// 6. PRESETS DE INSTRUMENTOS E FILTROS PASSA-BANDA
// -------------------------------------------------------------
console.log("\n--- 6. Presets de Instrumentos e Filtros ---");

test("Todos os 5 presets requeridos estão presentes e configurados", () => {
  const requiredPresets = ["guitar", "electric_guitar", "bass", "voice", "ukulele"];
  
  for (const p of requiredPresets) {
    assert.ok(TUNER_PRESETS[p], `Preset '${p}' deve existir`);
    assert.ok(TUNER_PRESETS[p].lowCutoff >= 30, `Filtro lowCutoff de '${p}' deve ser >= 30Hz`);
    assert.ok(TUNER_PRESETS[p].highCutoff <= 1500, `Filtro highCutoff de '${p}' deve ser <= 1500Hz`);
    assert.ok(TUNER_PRESETS[p].confidenceThreshold >= 0.60, `Limiar de confiança de '${p}' deve ser >= 0.60`);
  }

  // Validação dos nomes em português
  assert.equal(TUNER_PRESETS.guitar.name, "Violão");
  assert.equal(TUNER_PRESETS.electric_guitar.name, "Guitarra");
  assert.equal(TUNER_PRESETS.bass.name, "Baixo");
  assert.equal(TUNER_PRESETS.voice.name, "Voz");
  assert.equal(TUNER_PRESETS.ukulele.name, "Ukulele");
});

// -------------------------------------------------------------
// 7. BENCHMARK DE PERFORMANCE (< 7MS POR QUADRO)
// -------------------------------------------------------------
console.log("\n--- 7. Benchmark de Performance (Meta: < 7ms por quadro) ---");

test("Passo visual executa em menos de 0.1ms por quadro (folga massiva para 60 FPS)", () => {
  const smoother = new TunerSmoother({ alpha: 0.18 });
  smoother.feedPitch({
    frequency: 440.0,
    cents: 12.0,
    note: "A",
    octave: 4,
    confidence: 0.92
  });

  const iterations = 5000;
  let t = performance.now();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    t += 16.666;
    smoother.step(t);
  }
  const total = performance.now() - start;
  const avgMs = total / iterations;

  console.log(`     • Tempo médio por quadro visual: ${avgMs.toFixed(4)} ms`);
  assert.ok(avgMs < 0.1, `Execução média (${avgMs.toFixed(4)}ms) deve ser estritamente menor que 0.1ms`);
});

console.log("=================================================");
console.log(`TOTAL: ${passed} PASSOU | ${failed} FALHOU`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
