// =============================================================
// SUÍTE DE TESTES: MODO MINISTRO DO VIRTUO
// test-minister-mode.js
// Validações automatizadas de todos os requisitos de palco
// =============================================================

import assert from "node:assert";
import { AutoScrollController, SCROLL_SPEEDS } from "./src/features/minister/auto-scroll.js";
import { renderStructureBadges, renderMinisterStage } from "./src/features/minister/minister-view.js";
import { MinisterController } from "./src/features/minister/minister-controller.js";
import { calculateKey, transposeChordSheet, getEasyPlayCifra } from "./src/music/index.js";

console.log("=== INICIANDO TESTES DO MODO MINISTRO VIRTUO ===\n");

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

// Mock de música para teste
const mockSong = {
  id: "song-123",
  title: "A Casa É Sua",
  artist: "Casa Worship",
  originalKey: "G",
  bpm: 70,
  difficulty: "Fácil",
  structure: "Intro • Verso 1 • Refrão • Verso 2 • Ponte • Refrão • Final",
  chords: `[Intro] G  C9  Em7  D

[Verso 1]
G
Essa casa é Sua casa
C9
Nós deixamos ela pra Você
Em7             D
Jesus, pode entrar`,
  easyChords: `[Intro] G  C  Em  D

[Verso 1]
G
Essa casa é Sua casa
C
Nós deixamos ela pra Você
Em             D
Jesus, pode entrar`
};

console.log("--- 1. Testes do Auto-Scroll Engine ---");

test("Velocidades de rolagem configuradas corretamente", () => {
  assert.strictEqual(SCROLL_SPEEDS.slow.pxPerSec, 24);
  assert.strictEqual(SCROLL_SPEEDS.normal.pxPerSec, 48);
  assert.strictEqual(SCROLL_SPEEDS.fast.pxPerSec, 88);
});

test("AutoScrollController instancia com estado inicial pausado", () => {
  const fakeElement = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 };
  const scrollCtrl = new AutoScrollController(fakeElement);
  
  assert.strictEqual(scrollCtrl.isPlaying, false);
  assert.strictEqual(scrollCtrl.getSpeed(), "normal");
});

test("AutoScrollController altera velocidade de rolagem (Lento, Normal, Rápido)", () => {
  const fakeElement = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 };
  let notified = null;
  const scrollCtrl = new AutoScrollController(fakeElement, (state) => { notified = state; });

  scrollCtrl.setSpeed("slow");
  assert.strictEqual(scrollCtrl.getSpeed(), "slow");
  assert.strictEqual(scrollCtrl.customPxPerSec, 24);
  assert.strictEqual(notified.speed, "slow");

  scrollCtrl.setSpeed("fast");
  assert.strictEqual(scrollCtrl.getSpeed(), "fast");
  assert.strictEqual(scrollCtrl.customPxPerSec, 88);
  assert.strictEqual(notified.speed, "fast");
});

test("AutoScrollController play e pause notificam corretamente", () => {
  const fakeElement = { scrollTop: 10, scrollHeight: 2000, clientHeight: 500 };
  let lastState = null;
  
  // Mock global requestAnimationFrame e cancelAnimationFrame se ausente no Node
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  global.performance = { now: () => Date.now() };

  const scrollCtrl = new AutoScrollController(fakeElement, (s) => { lastState = s; });

  scrollCtrl.play();
  assert.strictEqual(scrollCtrl.isPlaying, true);
  assert.strictEqual(lastState.isPlaying, true);

  scrollCtrl.pause();
  assert.strictEqual(scrollCtrl.isPlaying, false);
  assert.strictEqual(lastState.isPlaying, false);

  scrollCtrl.destroy();
});

test("AutoScrollController stop reseta a posição para o topo (scrollTop = 0)", () => {
  const fakeElement = { scrollTop: 350, scrollHeight: 2000, clientHeight: 500 };
  const scrollCtrl = new AutoScrollController(fakeElement);
  scrollCtrl.stop();

  assert.strictEqual(fakeElement.scrollTop, 0);
  assert.strictEqual(scrollCtrl.isPlaying, false);
  scrollCtrl.destroy();
});

console.log("\n--- 2. Testes de Transposição e Easy Play no Modo Ministro ---");

test("Transposição do tom no Modo Ministro preserva cálculo harmônico", () => {
  const origKey = mockSong.originalKey;
  
  // +1 semitom
  const keyPlus1 = calculateKey(origKey, 1);
  assert.strictEqual(keyPlus1, "G#");

  // +2 semitons (Tom de A)
  const keyPlus2 = calculateKey(origKey, 2);
  assert.strictEqual(keyPlus2, "A");

  // -1 semitom (Tom de F#)
  const keyMinus1 = calculateKey(origKey, -1);
  assert.strictEqual(keyMinus1, "F#");
});

test("Easy Play ativo com transposição no Modo Ministro", () => {
  // Transpõe Easy Play +2 semitons (G -> A)
  const easyTransposed = getEasyPlayCifra(mockSong, 2);
  
  // [Intro] G C Em D -> [Intro] A D F#m E
  assert.ok(easyTransposed.includes("A  D  F#m  E"), "Acordes do easyChords devem ser transpostos para A D F#m E");
  assert.ok(easyTransposed.includes("Essa casa é Sua casa"), "Letra deve ser preservada intacta");
});

test("Voltar ao tom original restaura os acordes e tom sem perdas", () => {
  const resetKey = calculateKey(mockSong.originalKey, 0);
  assert.strictEqual(resetKey, "G");

  const origCifra = transposeChordSheet(mockSong.chords, 0);
  assert.ok(origCifra.includes("G  C9  Em7  D"));
});

console.log("\n--- 3. Testes de Renderização e Componentes Visuais ---");

test("renderStructureBadges quebra a estrutura nos blocos da música", () => {
  const html = renderStructureBadges(mockSong.structure);
  assert.ok(html.includes("Intro"), "Deve conter parte Intro");
  assert.ok(html.includes("Verso 1"), "Deve conter parte Verso 1");
  assert.ok(html.includes("Refrão"), "Deve conter parte Refrão");
  assert.ok(html.includes("Ponte"), "Deve conter parte Ponte");
  assert.ok(html.includes("Final"), "Deve conter parte Final");
});

test("renderMinisterStage gera marcação completa de alta fidelidade", () => {
  const state = {
    song: mockSong,
    currentKey: "G",
    originalKey: "G",
    transposeOffset: 0,
    isEasyPlay: false,
    autoScrollPlaying: false,
    autoScrollSpeed: "normal",
    fontSize: 18,
    isFullscreen: false,
    formattedChordsHtml: "<span class=\"chord-highlight\">G</span>"
  };

  const html = renderMinisterStage(state);
  assert.ok(html.includes("minister-stage"), "Container principal presente");
  assert.ok(html.includes("A Casa É Sua"), "Título da música presente");
  assert.ok(html.includes("Casa Worship"), "Artista presente");
  assert.ok(html.includes("70"), "BPM presente");
  assert.ok(html.includes("ORIGINAL"), "Botão Original presente");
  assert.ok(html.includes("EASY PLAY"), "Botão Easy Play presente");
  assert.ok(html.includes("Iniciar"), "Botão iniciar auto-scroll presente");
  assert.ok(html.includes("Lento"), "Seletor de velocidade presente");
  assert.ok(html.includes("Normal"), "Seletor de velocidade presente");
  assert.ok(html.includes("Rápido"), "Seletor de velocidade presente");
  assert.ok(html.includes("Tela Cheia"), "Botão de Tela Cheia presente");
});

console.log("\n--- 4. Testes de Integridade de Estado (Não Mutabilidade do Firestore) ---");

test("Modo Ministro não altera song.originalKey nem song.chords no objeto de origem", () => {
  const originalSnapshot = JSON.stringify(mockSong);

  // Simula operações de palco com MinisterController
  const controller = new MinisterController();
  controller.song = mockSong;
  controller.originalKey = mockSong.originalKey;
  controller.transposeOffset = 0;
  controller.isEasyPlay = false;

  // Operações de palco
  controller.changeKey(2);
  assert.strictEqual(controller.getCurrentKey(), "A");
  assert.strictEqual(mockSong.originalKey, "G", "originalKey no mockSong NÃO pode mudar");

  controller.setMode("easy");
  assert.strictEqual(controller.isEasyPlay, true);

  controller.changeKey(-3);
  assert.strictEqual(controller.getCurrentKey(), "F#", "G com offset -1 semitom deve ser F#");
  assert.strictEqual(mockSong.originalKey, "G", "originalKey no mockSong permanece intocado");

  controller.changeKey(-1);
  assert.strictEqual(controller.getCurrentKey(), "F", "G com offset -2 semitons deve ser F");

  controller.resetKey();
  assert.strictEqual(controller.getCurrentKey(), "G");

  // Compara objeto de dados da música
  assert.strictEqual(JSON.stringify(mockSong), originalSnapshot, "Objeto da música permaneceu 100% inalterado no Firestore/estado");
});

console.log("\n==============================================");
console.log(`TOTAL DE TESTES DO MODO MINISTRO: ${passed + failed}`);
console.log(`PASSOU: ${passed}`);
console.log(`FALHOU: ${failed}`);
console.log("==============================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("TODOS OS TESTES DO MODO MINISTRO PASSARAM COM SUCESSO!\n");
}
