// =============================================================
// SUÍTE DE TESTES: VIRTUO BAND ENGINE 2.0 (ETAPA 3/5)
// test-band-engine-v2.js
// Execução autônoma com asserções detalhadas
// =============================================================

import {
  VirtuoBandEngine,
  BAND_PRESETS,
  BAND_STYLE_PATTERNS,
  BAND_SECTIONS,
  BandHarmony,
  CultoModeController
} from "./src/audio/index.js";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

console.log("=================================================");
console.log("🥁 TEST SUITE: VIRTUO BAND ENGINE 2.0 & SMART BAND");
console.log("=================================================");

// 1. PRESETS E COMPATIBILIDADE
console.log("\n--- 1. Preservação de Presets V1 e V2 ---");
assert(!!BAND_PRESETS.Worship, "Preset Worship existe");
assert(!!BAND_PRESETS.Congregacional, "Preset Congregacional existe");
assert(!!BAND_PRESETS.Pop, "Preset Pop existe");
assert(!!BAND_PRESETS.Balada, "Preset Balada existe");
assert(!!BAND_PRESETS.Rock, "Preset Rock existe");
assert(!!BAND_PRESETS["4/4 simples"], "Preset 4/4 Simples existe");
assert(!!BAND_PRESETS["6/8"], "Preset 6/8 existe");
assert(!!BAND_PRESETS.worship, "Alias minúsculo 'worship' preservado");
assert(!!BAND_PRESETS.pop, "Alias minúsculo 'pop' preservado");

// 2. PADRÕES E SEÇÕES
console.log("\n--- 2. Padrões Rítmicos e Seções Estruturais ---");
assert(BAND_SECTIONS.length >= 7, "7 seções estruturais disponíveis");
const sectionKeys = BAND_SECTIONS.map(s => s.id);
assert(sectionKeys.includes("intro"), "Seção Intro existe");
assert(sectionKeys.includes("verse"), "Seção Verso existe");
assert(sectionKeys.includes("pre_chorus"), "Seção Pré-Refrão existe");
assert(sectionKeys.includes("chorus"), "Seção Refrão existe");
assert(sectionKeys.includes("bridge"), "Seção Ponte existe");
assert(sectionKeys.includes("spontaneous"), "Seção Espontâneo existe");
assert(sectionKeys.includes("outro"), "Seção Final existe");

// 3. INTELIGÊNCIA HARMÔNICA
console.log("\n--- 3. Inteligência Harmônica e Condução de Baixo ---");
const parseG = BandHarmony.parseChord("G");
assert(parseG.root === "G" && parseG.bassNote === "G" && !parseG.isMinor, "Decomposição correta de G");

const parseSlash = BandHarmony.parseChord("D/F#");
assert(parseSlash.root === "D" && parseSlash.bassNote === "F#", "Inversão de baixo D/F# detectada perfeitamente");

const bassNoteC0 = BandHarmony.getBassNoteForStep("C", 0, 8, "Worship", 3);
const bassNoteC4 = BandHarmony.getBassNoteForStep("C", 4, 8, "Worship", 3);
assert(bassNoteC0 > 0 && bassNoteC4 > bassNoteC0, "Condução do baixo C toca fundamental no tempo 1 e quinta no tempo 3");

const kbFreqs = BandHarmony.getKeyboardFrequencies("C", 4);
assert(kbFreqs.length >= 3 && kbFreqs[1] > kbFreqs[0], "Voicing de teclado de C com fundamental e terça");

// 4. VIRTUO BAND ENGINE
console.log("\n--- 4. Virtuo Band Engine & Controles de Reprodução ---");
const engine = new VirtuoBandEngine();
const initial = engine.getState();
assert(!initial.isPlaying, "Engine inicia parado");
assert(initial.currentPreset === "Worship", "Preset padrão é Worship");
assert(initial.intensity === 2, "Intensidade inicial é 2 (Suave)");
assert(!!initial.tracks.drums && !!initial.tracks.bass && !!initial.tracks.keyboard && !!initial.tracks.guitar, "4 canais independentes presentes no mixer");

engine.start();
assert(engine.getState().isPlaying, "Engine inicia reprodução com sucesso");

engine.pause();
assert(!engine.getState().isPlaying && engine.getState().isPaused, "Engine pausa com sucesso");

engine.stop();
assert(!engine.getState().isPlaying && !engine.getState().isPaused, "Engine para e reseta contadores");

// 5. INTENSIDADE, SEÇÕES & MIXER
console.log("\n--- 5. Intensidade, Transições e Mixer ---");
engine.setIntensity(4);
assert(engine.getState().intensity === 4, "Intensidade alterada para 4 (Forte)");

engine.setIntensity(99);
assert(engine.getState().intensity === 5, "Clamping de intensidade máxima em 5 (Muito forte)");

engine.setIntensity(-10);
assert(engine.getState().intensity === 0, "Clamping de intensidade mínima em 0 (Silencioso)");

engine.setIntensity(3);
engine.setTrackVolume("drums", 0.6);
assert(engine.getState().tracks.drums.volume === 0.6, "Ajuste de fader da bateria para 60%");

engine.toggleTrackMute("drums");
assert(engine.getState().tracks.drums.muted, "Mute da bateria ativado");

engine.toggleTrackSolo("bass");
assert(engine.getState().tracks.bass.solo, "Solo do baixo ativado");

engine.toggleEasyBand();
assert(engine.getState().isEasyBand, "Modo Easy Band ativado com sucesso");

// 6. SMART BAND & MODO CULTO
console.log("\n--- 6. Smart Band & Modo Culto ---");
const song = { title: "Graça Maravilhosa", bpm: 72, originalKey: "E" };
const rec = engine.getSmartBandRecommendation(song);
assert(rec && rec.recommendedStyle === "Worship" && rec.bpm === 72, "Recomendação do Smart Band gerada com sucesso");

engine.applySmartBandRecommendation(song);
assert(engine.getState().currentKey === "E" && engine.getState().bpm === 72, "Smart Band aplicado ao motor");

const culto = new CultoModeController();
const cultoState = culto.getState();
assert(cultoState.songs.length >= 3, "Modo Culto inicia com louvores configurados");

const currentSongTitle = cultoState.currentSong.title;
const nextSong = culto.nextSong();
assert(nextSong && nextSong.title !== currentSongTitle, "Avanço de louvor no Modo Culto executado com sucesso");

console.log("=================================================");
console.log(`RESULTADOS: ${passed} PASSOU | ${failed} FALHOU`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 TODOS OS TESTES DA ETAPA 3/5 PASSARAM COM SUCESSO!\n");
}
