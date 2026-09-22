// =============================================================
// TEST SUITE: VIRTUO REPERTÓRIO PRIVADO DA BANDA (V1)
// test-private-band-repertoire.js
// Validação exaustiva de isolamento, segurança, RBAC e ensaio
// =============================================================

import assert from "assert";
import { 
  PrivateBandSongsService, 
  normalizePrivateBandSong, 
  isUserAuthorizedForPrivateBand, 
  PRIVATE_REPERTOIRE_CONSTANTS 
} from "./src/services/private-band-songs.js";

// Polyfill localStorage para ambiente Node.js
if (typeof localStorage === "undefined") {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };
}

console.log("=================================================");
console.log("🔒 TEST SUITE: VIRTUO REPERTÓRIO PRIVADO DA BANDA");
console.log("=================================================");

async function runPrivateRepertoireTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  console.log("\n--- 1. Estrutura de Dados & Normalização com Proteção de Privacidade ---");

  test("Garante flags de privacidade por padrão ao normalizar música", () => {
    const rawSong = {
      title: "Chuvas de Graça",
      hymnNumber: "001",
      originalKey: "G",
      bpm: 74,
      chords: "[Intro] G C G D\nG C\nChuvas de graça...",
      // Tentativa de injetar flags públicas não autorizadas
      visibility: "public",
      publicLibrary: true
    };

    const normalized = normalizePrivateBandSong(rawSong, "band-alianca-01", "user-leader-123");

    assert.strictEqual(normalized.visibility, "private", "Deve forçar visibility: 'private'");
    assert.strictEqual(normalized.publicLibrary, false, "Deve forçar publicLibrary: false");
    assert.strictEqual(normalized.isDevelopmentContent, true, "Deve forçar isDevelopmentContent: true");
    assert.strictEqual(normalized.contentScope, "band", "Deve atribuir contentScope: 'band'");
    assert.strictEqual(normalized.hymnNumber, "001");
    assert.strictEqual(normalized.bandId, "band-alianca-01");
    assert.strictEqual(normalized.createdBy, "user-leader-123");
    assert.ok(normalized.easyChords, "Deve calcular automaticamente versão Easy Play");
  });

  console.log("\n--- 2. Controle de Acesso e Autorização RBAC ---");

  const mockBand = {
    id: "band-alianca-01",
    name: "Ministério Aliança",
    adminId: "user-owner-01",
    ownerId: "user-owner-01",
    members: [
      { userId: "user-owner-01", role: "owner" },
      { userId: "user-leader-02", role: "leader" },
      { userId: "user-musician-03", role: "musician" }
    ]
  };

  test("Owner da banda é autorizado", () => {
    const user = { uid: "user-owner-01", email: "owner@alianca.com" };
    const auth = isUserAuthorizedForPrivateBand(user, null, mockBand);
    assert.strictEqual(auth, true);
  });

  test("Líder e Membros da banda são autorizados", () => {
    const leader = { uid: "user-leader-02" };
    const musician = { uid: "user-musician-03" };
    assert.strictEqual(isUserAuthorizedForPrivateBand(leader, null, mockBand), true);
    assert.strictEqual(isUserAuthorizedForPrivateBand(musician, null, mockBand), true);
  });

  test("Super Administrador do Virtuo é autorizado", () => {
    const adminUser = { uid: "admin-system", email: "dramosdasilva7@gmail.com" };
    const profile = { role: "admin" };
    assert.strictEqual(isUserAuthorizedForPrivateBand(adminUser, profile, mockBand), true);
  });

  test("Usuário estranho ou sem permissão é rejeitado", () => {
    const stranger = { uid: "stranger-999", email: "unknown@gmail.com" };
    const auth = isUserAuthorizedForPrivateBand(stranger, null, mockBand);
    assert.strictEqual(auth, false, "Usuário estranho não deve ter acesso");
  });

  console.log("\n--- 3. Isolamento do Cache Local & Limpeza no Logout ---");

  test("Salva e recupera cache local isolado por banda", () => {
    const sample = normalizePrivateBandSong({
      id: "song-priv-01",
      title: "Hino de Teste Privado",
      hymnNumber: "077",
      originalKey: "E"
    }, "band-test-cache");

    PrivateBandSongsService.cacheBandSongsOffline("band-test-cache", [sample]);
    const cached = PrivateBandSongsService.getBandSongsOffline("band-test-cache");

    assert.strictEqual(cached.length, 1);
    assert.strictEqual(cached[0].title, "Hino de Teste Privado");
    assert.strictEqual(cached[0].visibility, "private");
  });

  test("Limpeza total de caches privados no logout", () => {
    PrivateBandSongsService.clearAllPrivateCaches();
    const afterClear = PrivateBandSongsService.getBandSongsOffline("band-test-cache");
    assert.strictEqual(afterClear.length, 0, "Caches privados devem estar vazios após logout");
  });

  console.log("\n--- 4. Importação em Lote & Exportação ---");

  await testAsync("Importação em lote de hinos e louvores privados", async () => {
    const batch = [
      { hymnNumber: "001", title: "Chuvas de Graça", originalKey: "G", bpm: 74 },
      { hymnNumber: "015", title: "Foi na Cruz", originalKey: "D", bpm: 68 },
      { hymnNumber: "039", title: "Alvo Mais que a Neve", originalKey: "A", bpm: 80 }
    ];

    const result = await PrivateBandSongsService.batchImportSongs("band-alianca-01", batch, "user-owner-01");
    assert.strictEqual(result.imported, 3);
    assert.strictEqual(result.failed, 0);

    const loaded = await PrivateBandSongsService.getBandSongs("band-alianca-01");
    assert.strictEqual(loaded.length, 3);
    assert.strictEqual(loaded[0].hymnNumber, "001");
    assert.strictEqual(loaded[0].visibility, "private");
  });

  console.log("\n--- 5. Operações de CRUD com Verificação de Privacidade ---");

  await testAsync("Criação individual e busca de louvor privado", async () => {
    const newSong = await PrivateBandSongsService.createSong({
      title: "Segurança e Paz",
      hymnNumber: "100",
      originalKey: "C",
      bpm: 72,
      bandId: "band-alianca-01"
    }, "user-owner-01");

    assert.ok(newSong.id);
    assert.strictEqual(newSong.title, "Segurança e Paz");
    assert.strictEqual(newSong.visibility, "private");
    assert.strictEqual(newSong.publicLibrary, false);

    const fetched = await PrivateBandSongsService.getSongById(newSong.id, "band-alianca-01");
    assert.strictEqual(fetched.title, "Segurança e Paz");
  });

  await testAsync("Atualização de louvor privado preservando privacidade", async () => {
    const list = await PrivateBandSongsService.getBandSongs("band-alianca-01");
    const target = list[0];

    const updated = await PrivateBandSongsService.updateSong(target.id, {
      bpm: 82,
      structure: "Intro • Verso • Refrão • Ponte • Final"
    }, "user-owner-01");

    assert.strictEqual(updated.bpm, 82);
    assert.strictEqual(updated.structure, "Intro • Verso • Refrão • Ponte • Final");
    assert.strictEqual(updated.visibility, "private");
    assert.strictEqual(updated.publicLibrary, false);
  });

  await testAsync("Exclusão de louvor privado", async () => {
    const listBefore = await PrivateBandSongsService.getBandSongs("band-alianca-01");
    const targetId = listBefore[0].id;

    await PrivateBandSongsService.deleteSong(targetId, "user-owner-01");
    const listAfter = await PrivateBandSongsService.getBandSongs("band-alianca-01");

    assert.strictEqual(listAfter.length, listBefore.length - 1);
    assert.ok(!listAfter.some(s => s.id === targetId));
  });

  console.log("\n--- 6. Proteção contra Publicação Acidental ---");

  test("Constantes de proteção contra publicação acidental definidas", () => {
    assert.ok(PRIVATE_REPERTOIRE_CONSTANTS.SAFETY_CONFIRMATION_MESSAGE);
    assert.strictEqual(
      PRIVATE_REPERTOIRE_CONSTANTS.SAFETY_CONFIRMATION_MESSAGE,
      "Este repertório pertence ao espaço privado da banda. Confirme que possui autorização para disponibilizá-lo publicamente."
    );
  });

  console.log("\n=================================================");
  console.log(`TOTAL DE TESTES DO REPERTÓRIO PRIVADO: ${passed + failed}`);
  console.log(`PASSOU: ${passed} | FALHOU: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPrivateRepertoireTests();
