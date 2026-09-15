// =============================================================
// TEST SUITE: VIRTUO MUSIC INTELLIGENCE 2.0 & VIRTUO AI
// test-music-intelligence-v2.js
// Valida análise harmônica determinística, tonalidade relativa,
// cálculo de dificuldade, Easy Play 2.0, Smart Key, Plano de Estudo,
// extração de seções e análise de progressão
// =============================================================

import assert from "node:assert";
import {
  VirtuoMusicIntelligence,
  parseChord,
  simplifyChord,
  identifySubstitutableChords,
  compareOriginalAndEasyPlay,
  suggestSmartKey,
  generateStudyPlan,
  DEMO_SONGS
} from "./src/music/index.js";

console.log("=================================================");
console.log("🎵 TEST SUITE: VIRTUO MUSIC INTELLIGENCE 2.0");
console.log("=================================================");

let passed = 0;
let total = 0;

function runTest(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Reason: ${err.message}`);
    throw err;
  }
}

// 1. Detecção de Tonalidade Relativa (Maior <-> Menor)
runTest("1. Detecção de tonalidade relativa direta e enarmônica", () => {
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("G"), "Em");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("C"), "Am");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("D"), "Bm");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Cm"), "Eb");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Am"), "C");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Em"), "G");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("F#m"), "A");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Dm"), "F");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Eb"), "Cm");
  assert.strictEqual(VirtuoMusicIntelligence.getRelativeKey("Bb"), "Gm");
});

// 2. Extração de Acordes e Seções Estruturais
runTest("2. Extração de seções e identificação de tokens harmônicos", () => {
  const song = {
    title: "Olaria",
    structure: "Intro • Verso 1 • Verso 2 • Refrão • Espontâneo • Final",
    chords: "[Intro] Cm  G/B  Ab7M  Fm9\n[Verso 1] Cm  Bb  Ab\n[Refrão] Cm  G/B  Ab7M  Fm9"
  };

  const sections = VirtuoMusicIntelligence.extractSections(song);
  assert.strictEqual(sections.length, 6);
  assert.strictEqual(sections[0], "Intro");
  assert.strictEqual(sections[3], "Refrão");

  const unique = VirtuoMusicIntelligence.extractChords(song.chords);
  assert.ok(unique.includes("Cm"));
  assert.ok(unique.includes("G/B"));
  assert.ok(unique.includes("Ab7M"));
  assert.ok(unique.includes("Fm9"));
  assert.ok(unique.includes("Bb"));
  assert.ok(unique.includes("Ab"));
  assert.strictEqual(unique.length, 6);
});

// 3. Cálculo Determinístico de Dificuldade
runTest("3. Cálculo determinístico e transparente de dificuldade", () => {
  // Música simples em Sol maior
  const easyResult = VirtuoMusicIntelligence.calculateDeterministicDifficulty(
    "[Intro] G  C  Em  D",
    70,
    "Intro • Verso • Refrão • Final"
  );
  assert.strictEqual(easyResult.difficulty, "Fácil");
  assert.ok(easyResult.reasons.length > 0);

  // Música complexa com pestanas, baixos invertidos e extensões
  const complexChords = "[Intro] Cm  G/B  Ab7M  Fm9  Eb  Bb/D  C#m7  F#\n[Refrão] B  E  G#m  C#m  F#7";
  const hardResult = VirtuoMusicIntelligence.calculateDeterministicDifficulty(
    complexChords,
    130,
    "Intro • Verso 1 • Verso 2 • Refrão • Ponte • Espontâneo • Final"
  );
  assert.ok(["Difícil", "Avançado"].includes(hardResult.difficulty));
  assert.ok(hardResult.reasons.some(r => r.includes("pestana") || r.includes("extensão") || r.includes("acordes diferentes")));
});

// 4. Análise Completa de Canção (Motor 2.0)
runTest("4. Motor de Inteligência Musical 2.0 completo (analyzeSong)", () => {
  const olaria = DEMO_SONGS.find(s => s.title.includes("Olaria")) || {
    title: "Mistério na Olaria",
    originalKey: "Cm",
    bpm: 74,
    timeSignature: "4/4",
    structure: "Intro • Verso 1 • Verso 2 • Refrão • Final",
    chords: "[Intro] Cm  G/B  Ab7M  Fm9\n[Refrão] Cm  G/B  Ab7M  Fm9"
  };

  const analysis = VirtuoMusicIntelligence.analyzeSong(olaria);
  assert.strictEqual(analysis.key, "Cm");
  assert.strictEqual(analysis.relativeKey, "Eb");
  assert.strictEqual(analysis.bpm, 74);
  assert.strictEqual(analysis.timeSignature, "4/4");
  assert.ok(analysis.chordCount >= 4);
  assert.ok(Array.isArray(analysis.uniqueChords));
  assert.ok(Array.isArray(analysis.sections));
  assert.ok(Array.isArray(analysis.difficultyReasons));
  assert.ok(analysis.extendedChords.some(c => c.includes("7M") || c.includes("9")));
  assert.ok(analysis.slashChords.includes("G/B"));
  assert.ok(analysis.studyPlan !== null);
  assert.ok(analysis.smartKeySuggestion !== null);
});

// 5. Easy Play 2.0: Identificação de Substituições e Preservação de Função
runTest("5. Easy Play 2.0 (identificação de acordes e comparação)", () => {
  const chords = "Cm  G/B  Ab7M  Fm9  Cadd9  Dsus4";
  const substitutions = identifySubstitutableChords(chords, "Cm");
  
  assert.ok(substitutions.length >= 6);
  const gbSub = substitutions.find(s => s.original === "G/B");
  assert.ok(gbSub);
  assert.strictEqual(gbSub.easy, "G");
  assert.strictEqual(gbSub.canSimplify, true);
  assert.ok(gbSub.reason.includes("baixo invertido"));

  const fm9Sub = substitutions.find(s => s.original === "Fm9");
  assert.ok(fm9Sub);
  assert.strictEqual(fm9Sub.easy, "Fm");
  assert.strictEqual(fm9Sub.canSimplify, true);

  const comparison = compareOriginalAndEasyPlay(chords, "Cm");
  assert.ok(comparison.changedCount >= 4);
  assert.ok(comparison.percentSimplified.includes("%"));
  assert.ok(comparison.diffSummary.length > 10);
});

// 6. Virtuo Smart Key: Sugestão Inteligente de Tonalidade e Capo
runTest("6. Virtuo Smart Key (sugestão de digitações confortáveis)", () => {
  // Canção em Cm com pestanas e extensões
  const songCm = {
    title: "Louvor em Dó Menor",
    originalKey: "Cm",
    chords: "Cm  G/B  Ab  Fm"
  };
  const recommendationCm = suggestSmartKey(songCm, "Cm");
  assert.strictEqual(recommendationCm.originalKey, "Cm");
  assert.ok(recommendationCm.recommendedCapo >= 1);
  assert.ok(["Am", "Em", "Dm"].includes(recommendationCm.recommendedKey));
  assert.ok(recommendationCm.reason.length > 10);

  // Canção que já está em G maior com acordes abertos naturais
  const songG = {
    title: "Louvor em Sol Aberto",
    originalKey: "G",
    chords: "G  C  D  Em"
  };
  const recommendationG = suggestSmartKey(songG, "G");
  assert.strictEqual(recommendationG.recommendedKey, "G");
  assert.strictEqual(recommendationG.recommendedCapo, 0);
  assert.strictEqual(recommendationG.isOriginalBest, true);
});

// 7. Virtuo Study Plan: Geração de Plano de 7 Dias
runTest("7. Virtuo Study Plan (cronograma local determinístico de 7 dias)", () => {
  const song = {
    title: "Mistério na Olaria",
    artist: "Raquel Pereira",
    originalKey: "Cm",
    bpm: 74,
    difficulty: "Médio",
    chords: "Cm  G/B  Ab7M  Fm9"
  };

  const plan = generateStudyPlan(song);
  assert.strictEqual(plan.totalDays, 7);
  assert.strictEqual(plan.days.length, 7);
  assert.strictEqual(plan.days[0].title, "Acordes");
  assert.strictEqual(plan.days[1].title, "Trocas");
  assert.strictEqual(plan.days[2].title, "Ritmo");
  assert.strictEqual(plan.days[3].title, "Refrão");
  assert.strictEqual(plan.days[4].title, "Música completa");
  assert.strictEqual(plan.days[5].title, "Modo Banda");
  assert.strictEqual(plan.days[6].title, "Simulação de apresentação");
  assert.ok(plan.totalPracticeMinutes > 100);
});

// 8. Análise de Progressão Harmônica e Cadências
runTest("8. Análise de progressão harmônica e cadências", () => {
  const chordsMajor = ["G", "D", "Em", "C"];
  const progMajor = VirtuoMusicIntelligence.analyzeProgression(chordsMajor, "G");
  assert.strictEqual(progMajor.isMinor, false);
  assert.deepStrictEqual(progMajor.progressionDegrees, ["I", "V", "vi", "IV"]);
  assert.ok(progMajor.cadence.includes("Worship Standard"));

  const chordsMinor = ["Am", "F", "C", "G"];
  const progMinor = VirtuoMusicIntelligence.analyzeProgression(chordsMinor, "Am");
  assert.strictEqual(progMinor.isMinor, true);
  assert.deepStrictEqual(progMinor.progressionDegrees, ["i", "VI", "III", "VII"]);
  assert.ok(progMinor.cadence.includes("Menor Worship"));
});

console.log("=================================================");
console.log(`🎉 TODOS OS ${passed}/${total} TESTES DO MOTOR 2.0 PASSARAM COM SUCESSO!`);
console.log("=================================================\n");
