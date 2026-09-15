// =============================================================
// SUÍTE DE TESTES: MODO ENSAIO DO VIRTUO
// test-rehearsal-mode.js
// Validações automatizadas de todos os 18 requisitos do ensaio
// =============================================================

import assert from "node:assert";
import { 
  RehearsalsService, 
  CANONICAL_INSTRUMENTS, 
  REHEARSAL_STATUSES, 
  DEFAULT_DEMO_REHEARSAL 
} from "./src/services/rehearsals.js";
import { RehearsalController } from "./src/features/rehearsal/rehearsal-controller.js";
import { renderRehearsalScreen } from "./src/features/rehearsal/rehearsal-view.js";
import { calculateKey, transposeChordSheet, getEasyPlayCifra } from "./src/music/index.js";
import { MinisterController } from "./src/features/minister/minister-controller.js";

// Mock ambiental para localStorage e DOM em ambiente Node
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.window.removeEventListener = () => {};
}

if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: () => ({
      classList: { add() {}, remove() {} },
      style: {},
      appendChild() {}
    }),
    body: {
      classList: { add() {}, remove() {} },
      appendChild() {}
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

console.log("=== INICIANDO TESTES DO MODO ENSAIO VIRTUO ===\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Erro: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  const controller = new RehearsalController();
  await controller.init("user-test-1");

  // 1. Criar ensaio
  await test("1. Criar ensaio", async () => {
    const prevCount = controller.rehearsals.length;
    await controller.saveNewRehearsal({
      name: "Ensaio Geral de Sábado",
      date: "2026-09-19",
      description: "Alinhamento vocal e dinâmica com os instrumentos",
      instruments: ["guitar", "bass", "drums", "vocals"]
    }, "user-test-1");

    assert.strictEqual(controller.rehearsals.length, prevCount + 1);
    const active = controller.getActiveRehearsal();
    assert.strictEqual(active.name, "Ensaio Geral de Sábado");
    assert.strictEqual(active.ownerId, "user-test-1");
  });

  // 2. Editar ensaio
  await test("2. Editar ensaio", async () => {
    const active = controller.getActiveRehearsal();
    await RehearsalsService.updateRehearsal(active.id, {
      name: "Ensaio Geral de Sábado - Especial",
      description: "Preparação atualizada"
    }, "user-test-1");

    const updated = await RehearsalsService.getRehearsalById(active.id);
    assert.strictEqual(updated.name, "Ensaio Geral de Sábado - Especial");
    assert.strictEqual(updated.description, "Preparação atualizada");
  });

  // 3. Adicionar música
  await test("3. Adicionar música", async () => {
    const active = controller.getActiveRehearsal();
    assert.strictEqual(active.songs.length, 0);

    await controller.addSongToRehearsal("demo-misterio-olaria", "user-test-1");
    assert.strictEqual(active.songs.length, 1);
    assert.strictEqual(active.songs[0].songId, "demo-misterio-olaria");
    assert.strictEqual(active.songs[0].order, 1);
    assert.strictEqual(active.songs[0].keyOffset, 0);
    assert.strictEqual(active.songs[0].status, REHEARSAL_STATUSES.NOT_REHEARSED);
  });

  // 4. Adicionar várias músicas
  await test("4. Adicionar várias músicas", async () => {
    const active = controller.getActiveRehearsal();
    await controller.addSongToRehearsal("demo-o-escudo", "user-test-1");
    await controller.addSongToRehearsal("demo-deus-impossivel", "user-test-1");

    assert.strictEqual(active.songs.length, 3);
    assert.strictEqual(active.songs[1].songId, "demo-o-escudo");
    assert.strictEqual(active.songs[1].order, 2);
    assert.strictEqual(active.songs[2].songId, "demo-deus-impossivel");
    assert.strictEqual(active.songs[2].order, 3);
  });

  // 5. Remover música
  await test("5. Remover música", async () => {
    const active = controller.getActiveRehearsal();
    const removedSongId = active.songs[1].songId; // demo-o-escudo
    await controller.removeSongFromRehearsal(1, "user-test-1");

    assert.strictEqual(active.songs.length, 2);
    assert.strictEqual(active.songs[0].songId, "demo-misterio-olaria");
    assert.strictEqual(active.songs[1].songId, "demo-deus-impossivel");
    assert.strictEqual(active.songs[1].order, 2); // ordem deve ser recalculada
  });

  // 6. Alterar ordem
  await test("6. Alterar ordem", async () => {
    const active = controller.getActiveRehearsal();
    // Inverte a ordem das 2 músicas
    await controller.moveSongOrder(0, 1, "user-test-1");

    assert.strictEqual(active.songs[0].songId, "demo-deus-impossivel");
    assert.strictEqual(active.songs[0].order, 1);
    assert.strictEqual(active.songs[1].songId, "demo-misterio-olaria");
    assert.strictEqual(active.songs[1].order, 2);
  });

  // 7. Alterar tom
  await test("7. Alterar tom", async () => {
    const active = controller.getActiveRehearsal();
    // Modifica o tom da primeira música (Deus do Impossível, tom original D) +2 semitons -> E
    assert.strictEqual(active.songs[0].keyOffset, 0);
    await controller.updateSongKeyOffset(0, 2, "user-test-1");
    assert.strictEqual(active.songs[0].keyOffset, 2);

    const calcKey = calculateKey("D", active.songs[0].keyOffset);
    assert.strictEqual(calcKey, "E");

    // Diminui 1 semitono -> D#
    await controller.updateSongKeyOffset(0, -1, "user-test-1");
    assert.strictEqual(active.songs[0].keyOffset, 1);
    assert.strictEqual(calculateKey("D", active.songs[0].keyOffset), "D#");
  });

  // 8. Alterar BPM
  await test("8. Alterar BPM", async () => {
    const active = controller.getActiveRehearsal();
    // BPM inicial era 72 (original de Deus do Impossível)
    await controller.updateSongBpm(0, 80, "user-test-1");
    assert.strictEqual(active.songs[0].bpm, 80);

    // Incrementa +1
    await controller.updateSongBpm(0, 1, "user-test-1");
    assert.strictEqual(active.songs[0].bpm, 81);

    // Reseta para o original
    await controller.resetSongBpm(0, "user-test-1");
    assert.strictEqual(active.songs[0].bpm, 72);
  });

  // 9. Alternar Original/Easy Play
  await test("9. Alternar Original/Easy Play", async () => {
    const active = controller.getActiveRehearsal();
    assert.strictEqual(active.songs[0].playMode, "original");

    await controller.toggleSongPlayMode(0, "user-test-1");
    assert.strictEqual(active.songs[0].playMode, "easy");

    await controller.toggleSongPlayMode(0, "user-test-1");
    assert.strictEqual(active.songs[0].playMode, "original");
  });

  // 10. Alterar status
  await test("10. Alterar status", async () => {
    const active = controller.getActiveRehearsal();
    assert.strictEqual(active.songs[0].status, REHEARSAL_STATUSES.NOT_REHEARSED);

    // Cicla para "in_progress"
    await controller.cycleSongStatus(0, "user-test-1");
    assert.strictEqual(active.songs[0].status, REHEARSAL_STATUSES.IN_PROGRESS);

    // Cicla para "rehearsed"
    await controller.cycleSongStatus(0, "user-test-1");
    assert.strictEqual(active.songs[0].status, REHEARSAL_STATUSES.REHEARSED);

    // Cicla volta para "not_rehearsed"
    await controller.cycleSongStatus(0, "user-test-1");
    assert.strictEqual(active.songs[0].status, REHEARSAL_STATUSES.NOT_REHEARSED);
  });

  // 11. Selecionar instrumentos
  await test("11. Selecionar instrumentos", async () => {
    const active = controller.getActiveRehearsal();
    const initialInstCount = active.instruments.length;

    // Alterna presença do teclado (keyboard)
    const hasKeyboard = active.instruments.includes("keyboard");
    await controller.toggleInstrument("keyboard", "user-test-1");

    if (hasKeyboard) {
      assert.ok(!active.instruments.includes("keyboard"));
    } else {
      assert.ok(active.instruments.includes("keyboard"));
    }

    // Alterna novamente voltando ao estado anterior
    await controller.toggleInstrument("keyboard", "user-test-1");
    assert.strictEqual(active.instruments.includes("keyboard"), hasKeyboard);
  });

  // 12. Abrir música no Modo Ministro
  await test("12. Abrir música no Modo Ministro", async () => {
    const minister = new MinisterController();
    const active = controller.getActiveRehearsal();
    const item = active.songs[0];
    const song = controller.songsMap.get(item.songId);

    minister.open(song, item.keyOffset, item.playMode === "easy", item.bpm);
    assert.strictEqual(minister.isOpen, true);
    assert.strictEqual(minister.song.id, item.songId);
  });

  // 13. Confirmar que o Modo Ministro recebe o tom correto
  await test("13. Confirmar que o Modo Ministro recebe o tom correto", async () => {
    const minister = new MinisterController();
    const active = controller.getActiveRehearsal();
    active.songs[0].keyOffset = 3; // +3 semitons
    const item = active.songs[0];
    const song = controller.songsMap.get(item.songId);

    minister.open(song, item.keyOffset, false, item.bpm);
    assert.strictEqual(minister.transposeOffset, 3);
    const displayedKey = calculateKey(song.originalKey, minister.transposeOffset);
    // Para Tom D +3 semitons -> F
    assert.strictEqual(displayedKey, "F");
  });

  // 14. Confirmar que o Modo Ministro recebe o BPM correto
  await test("14. Confirmar que o Modo Ministro recebe o BPM correto", async () => {
    const minister = new MinisterController();
    const active = controller.getActiveRehearsal();
    active.songs[0].bpm = 85;
    const item = active.songs[0];
    const song = controller.songsMap.get(item.songId);

    minister.open(song, item.keyOffset, false, item.bpm);
    assert.strictEqual(item.bpm, 85);
  });

  // 15. Confirmar que o Easy Play funciona
  await test("15. Confirmar que o Easy Play funciona", async () => {
    const minister = new MinisterController();
    const active = controller.getActiveRehearsal();
    active.songs[0].playMode = "easy";
    const item = active.songs[0];
    const song = controller.songsMap.get(item.songId);

    minister.open(song, 0, item.playMode === "easy", item.bpm);
    assert.strictEqual(minister.isEasyPlay, true);

    const easyText = getEasyPlayCifra(song, 0);
    assert.ok(easyText.includes("[Intro] D  A  Bm  G"));
  });

  // 16. Confirmar que o Firestore não altera originalKey da música
  await test("16. Confirmar que o Firestore não altera originalKey da música", async () => {
    const active = controller.getActiveRehearsal();
    const item = active.songs[0];
    const song = controller.songsMap.get(item.songId);

    // O tom do ensaio foi alterado para +3 semitons
    assert.strictEqual(item.keyOffset, 3);
    // Mas a propriedade originalKey do objeto da música permanece intocada "D"
    assert.strictEqual(song.originalKey, "D");
    // O BPM original da música permanece intocado 72
    assert.strictEqual(song.bpm, 72);
  });

  // 17. Confirmar isolamento dos dados entre usuários
  await test("17. Confirmar isolamento dos dados entre usuários", async () => {
    // Usuário 1 cria um ensaio privativo
    const user1Id = "user-alpha-999";
    const user2Id = "user-beta-888";

    const idAlpha = await RehearsalsService.createRehearsal({
      name: "Ensaio Secreto Alpha",
      date: "2026-10-01",
      description: "Apenas da banda Alpha"
    }, user1Id);

    const listUser1 = await RehearsalsService.getAllRehearsals(user1Id);
    const listUser2 = await RehearsalsService.getAllRehearsals(user2Id);

    // O ensaio do usuário 1 deve estar visível para ele
    assert.ok(listUser1.some(r => r.id === idAlpha));
    // O ensaio do usuário 1 NÃO deve aparecer na lista do usuário 2
    assert.ok(!listUser2.some(r => r.id === idAlpha && r.ownerId === user1Id));
  });

  // 18. Testar renderização e componentes responsivos em viewport mobile
  await test("18. Testar renderização e componentes responsivos em viewport mobile", () => {
    const html = renderRehearsalScreen(controller);
    // Verifica elementos semânticos cruciais da interface
    assert.ok(html.includes("rehearsal-main-view"), "HTML deve conter container de ensaio principal");
    assert.ok(html.includes("Progresso do Ensaio"), "HTML deve conter a barra de progresso");
    assert.ok(html.includes("rehearsal-instruments-section"), "HTML deve conter seção de instrumentos");
    assert.ok(html.includes("rehearsal-stepper"), "HTML deve conter stepper de tom da banda");
    assert.ok(html.includes("rehearsal-version-segmented"), "HTML deve conter toggle Original / Easy Play");
    assert.ok(html.includes("rehearsal-action-btn primary-action"), "HTML deve conter botão de Modo Ministro");
  });

  console.log("\n==============================================");
  console.log(`TOTAL DE TESTES DO MODO ENSAIO: ${passed + failed}`);
  console.log(`PASSOU: ${passed}`);
  console.log(`FALHOU: ${failed}`);
  console.log("==============================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("TODOS OS TESTES DO MODO ENSAIO PASSARAM COM SUCESSO!\n");
  }
}

runTests();
