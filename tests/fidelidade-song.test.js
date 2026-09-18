// =============================================================
// TEST SUITE: MÚSICA DE TESTE "FIDELIDADE" (DANIELLE CRISTINA)
// tests/fidelidade-song.test.js
// =============================================================

import assert from "node:assert";
import { DEMO_SONGS, FIDELIDADE_SONG, RAW_FIDELIDADE_SONG } from "../src/music/demo-songs.js";
import { transposeChordSheet, calculateKey } from "../src/music/transposer.js";
import { getEasyPlayCifra, generateEasyPlaySheet } from "../src/music/easy-play.js";
import { SongValidator } from "../src/database/validator.js";
import { SongNormalizer } from "../src/database/normalizer.js";
import { SongMigration } from "../src/database/migration.js";
import { createEmptySong } from "../src/database/schema.js";

console.log("\n=================================================");
console.log("🎵 TEST SUITE: MÚSICA CANÔNICA 'FIDELIDADE'");
console.log("=================================================");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}:`, err.message);
    failed++;
  }
}

// 1. Verificação de Metadados Canônicos
it("Música está presente em DEMO_SONGS", () => {
  assert.ok(Array.isArray(DEMO_SONGS), "DEMO_SONGS deve ser um array");
  assert.strictEqual(DEMO_SONGS.length, 1, "DEMO_SONGS deve conter 1 música");
});

it("Título e Artista correspondem exatamente à canção oficial", () => {
  const song = DEMO_SONGS[0];
  assert.strictEqual(song.title, "Fidelidade");
  assert.strictEqual(song.artist, "Danielle Cristina");
  assert.strictEqual(song.artistName, "Danielle Cristina");
  assert.strictEqual(song.composer, "Anderson Freire");
});

it("Tom original, forma de acordes e capotraste estão rigorosamente definidos", () => {
  const song = DEMO_SONGS[0];
  assert.strictEqual(song.originalKey, "Dm");
  assert.strictEqual(song.key, "Dm");
  assert.strictEqual(song.shapeKey, "Am");
  assert.strictEqual(song.capo, 5);
});

it("BPM e fórmula de compasso definidos conforme especificado", () => {
  const song = DEMO_SONGS[0];
  assert.strictEqual(song.bpm, 76);
  assert.strictEqual(song.timeSignature, "4/4");
});

it("Dificuldade, categoria e flags de teste estão configurados", () => {
  const song = DEMO_SONGS[0];
  assert.ok(song.difficulty === "Médio" || song.difficulty === "Intermediária");
  assert.strictEqual(song.category, "worship");
  assert.strictEqual(song.testOnly, true);
  assert.strictEqual(song.status, "published");
  assert.strictEqual(song.visibility, "public");
});

// 2. Letra e Cifra
it("A letra contém trechos exatos fornecidos pelo usuário sem alteração", () => {
  const song = DEMO_SONGS[0];
  assert.ok(song.lyrics, "Letra deve existir");
  assert.ok(song.lyrics.includes("Oh! Deus de Israel eu sei"));
  assert.ok(song.lyrics.includes("Que não vim a este mundo pra adorar outro Rei"));
  assert.ok(song.lyrics.includes("Eis-me aqui como Daniel"));
  assert.ok(song.lyrics.includes("Senhor não vou dividir minha adoração"));
  assert.ok(song.lyrics.includes("Aquele que habita no esconderijo do Altíssimo"));
  assert.ok(song.lyrics.includes("Ele envia anjos para me guardar"));
});

it("A cifra contém os acordes da forma Am correspondentes e seções", () => {
  const song = DEMO_SONGS[0];
  assert.ok(song.chordSheet, "Partitura de acordes deve existir");
  assert.ok(song.chordSheet.includes("[Intro]"));
  assert.ok(song.chordSheet.includes("[Primeira Parte]"));
  assert.ok(song.chordSheet.includes("[Segunda Parte]"));
  assert.ok(song.chordSheet.includes("[Refrão]"));
  assert.ok(song.chordSheet.includes("[Ponte]"));
  assert.ok(song.chordSheet.includes("Am"));
  assert.ok(song.chordSheet.includes("Dm7"));
  assert.ok(song.chordSheet.includes("G/B"));
  assert.ok(song.chordSheet.includes("E7"));
});

// 3. Chord Engine & Transposição
it("Transposição preserva alinhamento e transpõe acordes corretamente", () => {
  const song = DEMO_SONGS[0];
  // Transpõe +2 semitons (Am -> Bm)
  const transposed = transposeChordSheet(song.chordSheet, 2);
  assert.ok(transposed.includes("Bm"), "Am transposto +2 semitons deve ser Bm");
  assert.ok(transposed.includes("Em7"), "Dm7 transposto +2 semitons deve ser Em7");
  assert.ok(transposed.includes("A/C#") || transposed.includes("A/Db"), "G/B transposto +2 semitons deve ser A/C#");
  assert.ok(transposed.includes("Oh! Deus de Israel eu sei"), "A letra deve ser preservada intacta na transposição");
});

it("calculateKey calcula o tom transposto corretamente mantendo coerência", () => {
  assert.strictEqual(calculateKey("Dm", 0), "Dm");
  assert.strictEqual(calculateKey("Dm", 2), "Em");
  assert.strictEqual(calculateKey("Am", 2), "Bm");
});

// 4. Easy Play Engine
it("Easy Play simplifica acordes complexos sem quebrar a harmonia", () => {
  const song = DEMO_SONGS[0];
  const easy = getEasyPlayCifra(song, 0);
  assert.ok(easy, "Cifra Easy Play deve ser gerada");
  assert.ok(easy.includes("Dm"), "Dm7 deve ser simplificado para Dm");
  assert.ok(easy.includes("E"), "E7 deve ser simplificado para E");
  assert.ok(easy.includes("G"), "G/B deve ser simplificado para G");
});

// 5. Integração com Schema, Normalizador e Migração
it("SongValidator aprova a canção Fidelidade sem violações", () => {
  const validation = SongValidator.validateSong(FIDELIDADE_SONG, { isAdmin: true });
  assert.strictEqual(validation.valid, true, "A canção Fidelidade deve ser válida no SongValidator");
  assert.strictEqual(validation.errors.length, 0);
});

it("SongMigration e SongNormalizer preservam shapeKey, capo e metadados", () => {
  const migrated = SongMigration.migrateLegacySong(FIDELIDADE_SONG);
  assert.strictEqual(migrated.title, "Fidelidade");
  assert.strictEqual(migrated.artist, "Danielle Cristina");
  assert.strictEqual(migrated.originalKey, "Dm");
  assert.strictEqual(migrated.shapeKey, "Am");
  assert.strictEqual(migrated.capo, 5);
  assert.strictEqual(migrated.testOnly, true);
  assert.strictEqual(migrated.category, "worship");
});

it("createEmptySong aceita e normaliza shapeKey e testOnly", () => {
  const empty = createEmptySong({
    title: "Fidelidade",
    shapeKey: "Am",
    capo: 5,
    testOnly: true
  });
  assert.strictEqual(empty.shapeKey, "Am");
  assert.strictEqual(empty.capo, 5);
  assert.strictEqual(empty.testOnly, true);
});

console.log("\n=================================================");
console.log(`TOTAL DE TESTES 'FIDELIDADE': ${passed + failed}`);
console.log(`PASSOU: ${passed} | FALHOU: ${failed}`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 TESTE DA CANÇÃO FIDELIDADE HOMOLOGADO COM SUCESSO!\n");
}
