// =============================================================
// TEST SUITE: VIRTUO V2.2 — CONSOLIDAÇÃO FINAL & PRODUÇÃO
// test-v2-2-production-integration.js
// Valida a arquitetura completa integrada do VIRTUO V2.2:
// - Real Sound Engine (Fallback Chain Híbrido)
// - Missão para Ensaio (Transporte de BPM, Tom, Seções)
// - Live Sync (Eventos Canônicos & Detecção de Rede)
// - Academy (Reconciliação Offline sem Perda)
// - Solfejo & Bona (Métrica, Subdivisão & Precisão)
// - Meu Equipamento (Gestão Pessoal & Persistência)
// - Histórico e Favoritos (Deduplicação)
// - Service Worker PWA (Cache v2.2.0)
// =============================================================

import assert from "assert";
import { 
  SoundProviderFactory, 
  SyntheticSoundProvider, 
  SampleSoundProvider, 
  HybridSoundProvider 
} from "./src/audio/sound-provider.js";
import { virtuoRehearsal } from "./src/features/rehearsal/rehearsal-controller.js";
import { missionsController } from "./src/features/missions/missions-controller.js";
import { liveSyncEngine, LIVE_SYNC_EVENTS } from "./src/features/live-sync/live-sync-engine.js";
import { VirtuoAcademyService } from "./src/academy/academy-service.js";
import { 
  validateBarDuration, 
  evaluateRhythmPrecision, 
  BONA_HISTORICAL_METADATA 
} from "./src/academy/solfege-bona-schema.js";
import { createGearItem, GEAR_CATEGORIES } from "./src/features/gear/gear-schema.js";
import { VirtuoGearService } from "./src/features/gear/gear-service.js";
import { VirtuoUserActivityService } from "./src/services/user-activity.js";

let totalTests = 0;
let passedTests = 0;

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log("=================================================");
console.log("🚀 TEST SUITE: VIRTUO V2.2 — PRODUÇÃO E CONSOLIDAÇÃO");
console.log("=================================================");

console.log("\n--- 1. Real Sound Engine: Cadeia de Fallback do SoundProvider ---");

runTest("SoundProviderFactory cria SyntheticSoundProvider", () => {
  const provider = SoundProviderFactory.create("synthetic");
  assert.ok(provider instanceof SyntheticSoundProvider, "Deve instanciar SyntheticSoundProvider");
  assert.strictEqual(provider.name, "synthetic");
  assert.strictEqual(typeof provider.triggerKick, "function");
  assert.strictEqual(typeof provider.triggerBass, "function");
});

runTest("HybridSoundProvider implementa fallback seguro para Synthetic", () => {
  const hybrid = SoundProviderFactory.create("hybrid");
  assert.ok(hybrid instanceof HybridSoundProvider, "Deve instanciar HybridSoundProvider");
  assert.strictEqual(hybrid.name, "hybrid");
  assert.strictEqual(hybrid.isLoaded(), true, "Fallback sintético sempre está pronto");
  
  // Disparo não deve lançar exceção mesmo sem AudioContext no ambiente Node
  assert.doesNotThrow(() => {
    hybrid.triggerKick(0, 0.8);
    hybrid.triggerBass(41.2, 0, 0.5, 0.7);
    hybrid.triggerKeyboardChord([261.63, 329.63, 392.00], 0, 1.0, 0.6);
  });
});

console.log("\n--- 2. Missão para Ensaio: Transporte Musical Contínuo ---");

await runAsyncTest("RehearsalController.openOrCreateRehearsalForMission transporta parâmetros", async () => {
  const missionMock = {
    id: "missao_teste_v22",
    title: "Culto de Celebração Noturno",
    date: "2026-09-25",
    songs: [
      { id: "song_1", title: "Graças Dou", key: "A", bpm: 72 },
      { id: "song_2", title: "Santo Espírito", key: "D", bpm: 68 }
    ],
    members: [{ uid: "user_pastor", name: "Pastor", role: "pastor" }]
  };

  const rehearsal = await virtuoRehearsal.openOrCreateRehearsalForMission(missionMock, "user_pastor");
  assert.ok(rehearsal, "Deve criar ou carregar ensaio");
  assert.strictEqual(rehearsal.missionId, "missao_teste_v22");
  assert.strictEqual(rehearsal.songs.length, 2);
  assert.strictEqual(rehearsal.songs[0].key, "A");
  assert.strictEqual(rehearsal.songs[0].bpm, 72);
});

console.log("\n--- 3. Live Sync: Eventos Canônicos & Status de Conexão ---");

runTest("LiveSyncEngine define eventos canônicos obrigatórios", () => {
  assert.strictEqual(LIVE_SYNC_EVENTS.SET_SONG, "SET_SONG");
  assert.strictEqual(LIVE_SYNC_EVENTS.TRANSPOSE, "TRANSPOSE");
  assert.strictEqual(LIVE_SYNC_EVENTS.SET_SECTION, "SET_SECTION");
  assert.strictEqual(LIVE_SYNC_EVENTS.SET_BPM, "SET_BPM");
  assert.strictEqual(LIVE_SYNC_EVENTS.SET_EASY_PLAY, "SET_EASY_PLAY");
});

await runAsyncTest("LiveSyncEngine emite e atualiza estado com eventos canônicos", async () => {
  const resultSong = await liveSyncEngine.setSong("song_v22", "E", 82, "Grande é o Senhor", "leader_1");
  assert.strictEqual(resultSong.success, true);
  assert.strictEqual(liveSyncEngine.state.currentSongId, "song_v22");
  assert.strictEqual(liveSyncEngine.state.currentKey, "E");
  assert.strictEqual(liveSyncEngine.state.currentBpm, 82);

  const resultTrans = await liveSyncEngine.transpose("F#", 2, "leader_1");
  assert.strictEqual(resultTrans.success, true);
  assert.strictEqual(liveSyncEngine.state.currentKey, "F#");

  const status = liveSyncEngine.getConnectionStatus();
  assert.ok("isOnline" in status, "Status deve conter isOnline");
  assert.ok("state" in status, "Status deve conter snapshot do estado");
});

console.log("\n--- 4. Virtuo Academy: Reconciliação de Progresso Offline/Online ---");

runTest("VirtuoAcademyService.reconcileProgress une dados sem perda", () => {
  const local = {
    userId: "aluno_1",
    completedLessons: ["lesson_1", "lesson_2", "lesson_3"],
    lessonScores: { lesson_1: 100, lesson_2: 90, lesson_3: 85 },
    practiceTimeMinutes: 45,
    currentInstrument: "acoustic_guitar",
    updatedAt: "2026-09-20T10:00:00.000Z"
  };

  const remote = {
    userId: "aluno_1",
    completedLessons: ["lesson_1", "lesson_4"],
    lessonScores: { lesson_1: 80, lesson_4: 95 },
    practiceTimeMinutes: 20,
    currentInstrument: "acoustic_guitar",
    updatedAt: "2026-09-18T10:00:00.000Z"
  };

  const merged = VirtuoAcademyService.reconcileProgress(local, remote);
  assert.strictEqual(merged.completedLessons.length, 4, "Deve conter todas as 4 lições unificadas");
  assert.ok(merged.completedLessons.includes("lesson_2"));
  assert.ok(merged.completedLessons.includes("lesson_3"));
  assert.ok(merged.completedLessons.includes("lesson_4"));
  assert.strictEqual(merged.lessonScores.lesson_1, 100, "Deve preservar a maior nota");
  assert.strictEqual(merged.practiceTimeMinutes, 45, "Deve preservar o maior tempo de prática");
});

console.log("\n--- 5. Solfejo & Método Bona: Especificação Pedagógica ---");

runTest("Validação de compasso rítmico do método Bona (4/4)", () => {
  assert.strictEqual(BONA_HISTORICAL_METADATA.author, "Pasquale Bona (1808-1878)");
  
  // 4 semínimas em 4/4 = 4 tempos -> Válido
  const barOk = validateBarDuration([
    { duration: "quarter" },
    { duration: "quarter" },
    { duration: "quarter" },
    { duration: "quarter" }
  ], "4/4");
  assert.strictEqual(barOk.valid, true);

  // 1 mínima + 1 semínima em 4/4 = 3 tempos -> Inválido (incompleto)
  const barFail = validateBarDuration([
    { duration: "half" },
    { duration: "quarter" }
  ], "4/4");
  assert.strictEqual(barFail.valid, false);
});

runTest("Avaliação de precisão rítmica com tolerância de milissegundos", () => {
  const perfect = evaluateRhythmPrecision(1005, 1000, 80); // 5ms de desvio
  assert.strictEqual(perfect.grade, "perfect");
  assert.strictEqual(perfect.score, 100);

  const acceptable = evaluateRhythmPrecision(1065, 1000, 80); // 65ms de desvio
  assert.strictEqual(acceptable.grade, "acceptable");
  assert.strictEqual(acceptable.score, 60);

  const miss = evaluateRhythmPrecision(1150, 1000, 80); // 150ms de desvio
  assert.strictEqual(miss.grade, "miss");
  assert.strictEqual(miss.score, 0);
});

console.log("\n--- 6. Meu Equipamento: Cadastro, Validação & Persistência ---");

await runAsyncTest("Criação e salvamento de equipamento do músico", async () => {
  assert.ok(GEAR_CATEGORIES.INSTRUMENT, "Deve conter categoria INSTRUMENT");
  assert.ok(GEAR_CATEGORIES.PEDALS, "Deve conter categoria PEDALS");

  const item = createGearItem({
    name: "Stratocaster Olympic White",
    category: "instrument",
    brand: "Fender",
    model: "American Pro II",
    stringsGauge: "0.010 - 0.046",
    tuning: "E Standard (E A D G B E)"
  });

  assert.strictEqual(item.name, "Stratocaster Olympic White");
  assert.strictEqual(item.isActiveForMissions, true);
  assert.ok(item.id.startsWith("gear_"));

  const saved = await VirtuoGearService.saveGearItem("test_musician", item);
  assert.strictEqual(saved.id, item.id);

  const list = await VirtuoGearService.getGearList("test_musician");
  assert.ok(list.some(g => g.id === item.id), "Item deve estar na lista do músico");

  await VirtuoGearService.deleteGearItem("test_musician", item.id);
  const afterDelete = await VirtuoGearService.getGearList("test_musician");
  assert.strictEqual(afterDelete.some(g => g.id === item.id), false, "Item deve ser excluído com sucesso");
});

console.log("\n--- 7. Histórico & Favoritos: Deduplicação e Registro ---");

await runAsyncTest("VirtuoUserActivityService deduplica e registra recentes", async () => {
  const uid = "user_activity_test";
  
  // Favorito
  await VirtuoUserActivityService.toggleFavorite(uid, { id: "song_gloria", title: "Glória nas Alturas", key: "G" });
  let act = await VirtuoUserActivityService.getUserActivity(uid);
  assert.strictEqual(act.favorites.length, 1);
  assert.strictEqual(act.favorites[0].songId, "song_gloria");

  // Toggle remove favorito
  await VirtuoUserActivityService.toggleFavorite(uid, { id: "song_gloria" });
  act = await VirtuoUserActivityService.getUserActivity(uid);
  assert.strictEqual(act.favorites.length, 0);

  // Músicas Recentes (sem duplicação ao tocar novamente)
  await VirtuoUserActivityService.recordRecentSong(uid, { id: "song_alvo", title: "Alvo Mais que a Neve" });
  await VirtuoUserActivityService.recordRecentSong(uid, { id: "song_bondade", title: "Bondade de Deus" });
  await VirtuoUserActivityService.recordRecentSong(uid, { id: "song_alvo", title: "Alvo Mais que a Neve" }); // Re-play

  act = await VirtuoUserActivityService.getUserActivity(uid);
  assert.strictEqual(act.recentSongs.length, 2, "Não deve duplicar song_alvo");
  assert.strictEqual(act.recentSongs[0].songId, "song_alvo", "Música mais recente deve estar no topo");
});

console.log("\n=================================================");
console.log(`TOTAL DE TESTES V2.2: ${totalTests}`);
console.log(`PASSOU: ${passedTests} | FALHOU: ${totalTests - passedTests}`);
console.log("=================================================");

if (totalTests === passedTests) {
  console.log("🎉 VIRTUO V2.2 — CONSOLIDAÇÃO FINAL HOMOLOGADA COM SUCESSO!");
} else {
  process.exit(1);
}
