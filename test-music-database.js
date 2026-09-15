// =============================================================
// SUÍTE DE TESTES: BANCO DE DADOS MUSICAL PROFISSIONAL VIRTUO
// test-music-database.js
// Validação automatizada de normalização, validação, migração,
// busca, transposição, Easy Play, moderação e permissões
// =============================================================

import assert from "node:assert";
import { 
  SongNormalizer, 
  removeAccents, 
  normalizeSearchText, 
  generateSearchKeywords,
  parseStructureFromText,
  structureToString,
  extractChordsFromSheet
} from "./src/database/normalizer.js";

import { SongValidator } from "./src/database/validator.js";
import { SongImporter } from "./src/database/importer.js";
import { SongMigration } from "./src/database/migration.js";
import { 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  SOURCE_TYPES, 
  LYRICS_STATUS,
  createEmptySong 
} from "./src/database/schema.js";

import { 
  transposeChord, 
  transposeChordSheet, 
  calculateKey, 
  getSemitoneDistance 
} from "./src/music/transposer.js";

import { 
  parseChord, 
  isChordToken 
} from "./src/music/chord-parser.js";

import { 
  simplifyChord, 
  getEasyPlayCifra, 
  generateEasyPlaySheet 
} from "./src/music/easy-play.js";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(`     Erro:`, err.message);
  }
}

console.log("=== INICIANDO TESTES DO BANCO DE DADOS MUSICAL PROFISSIONAL VIRTUO ===\n");

// -------------------------------------------------------------
// 1. TESTES DE NORMALIZAÇÃO DE TEXTO E PALAVRAS-CHAVE
// -------------------------------------------------------------
console.log("--- 1. Normalização de Texto e Busca Fonética ---");

runTest("removeAccents remove acentos em maiúsculas e minúsculas", () => {
  assert.strictEqual(removeAccents("Canção de Adoração"), "cancao de adoracao");
  assert.strictEqual(removeAccents("Mistério Na Olaria"), "misterio na olaria");
  assert.strictEqual(removeAccents("É bênção de Deus"), "e bencao de deus");
});

runTest("normalizeSearchText remove pontuações e excesso de espaços", () => {
  assert.strictEqual(normalizeSearchText("  Mistério,   na Olaria!!  "), "misterio na olaria");
});

runTest("generateSearchKeywords gera termos completos, palavras e prefixos", () => {
  const kws = generateSearchKeywords("Mistério na Olaria", "Raquel Pereira", "Single", ["Pentecostal"]);
  assert(kws.includes("misterio na olaria"));
  assert(kws.includes("misterio"));
  assert(kws.includes("olaria"));
  assert(kws.includes("raquel"));
  assert(kws.includes("pereira"));
  assert(kws.includes("pentecostal"));
  // Prefixos
  assert(kws.includes("mis"));
  assert(kws.includes("ola"));
});

// -------------------------------------------------------------
// 2. TESTES DE ESTRUTURA MUSICAL E ACORDES
// -------------------------------------------------------------
console.log("\n--- 2. Estrutura Musical e Extração de Acordes ---");

runTest("parseStructureFromText converte string em seções canônicas", () => {
  const rawStr = "Intro • Verso 1 • Refrão • Espontâneo • Final";
  const structured = parseStructureFromText(rawStr);
  assert.strictEqual(structured.length, 5);
  assert.strictEqual(structured[0].type, "intro");
  assert.strictEqual(structured[0].label, "Intro");
  assert.strictEqual(structured[1].type, "verse");
  assert.strictEqual(structured[2].type, "chorus");
  assert.strictEqual(structured[3].type, "spontaneous");
  assert.strictEqual(structured[4].type, "outro");
});

runTest("structureToString serializa seções de volta para texto amigável", () => {
  const sections = [
    { type: "intro", label: "Intro", order: 0 },
    { type: "verse", label: "Verso 1", order: 1 },
    { type: "chorus", label: "Refrão", order: 2 }
  ];
  assert.strictEqual(structureToString(sections), "Intro • Verso 1 • Refrão");
});

runTest("extractChordsFromSheet extrai todos os acordes únicos estruturados", () => {
  const sheet = `[Intro] G  C9  Em7  D\n[Refrão] G  D/F#  Em7  C9`;
  const extracted = extractChordsFromSheet(sheet);
  const rawList = extracted.map(e => e.raw);
  assert(rawList.includes("G"));
  assert(rawList.includes("C9"));
  assert(rawList.includes("Em7"));
  assert(rawList.includes("D"));
  assert(rawList.includes("D/F#"));

  const dfsharp = extracted.find(e => e.raw === "D/F#");
  assert.strictEqual(dfsharp.root, "D");
  assert.strictEqual(dfsharp.bass, "F#");
  assert.strictEqual(dfsharp.hasSlash, true);
});

// -------------------------------------------------------------
// 3. VALIDAÇÃO DE DADOS MUSICAIS (SongValidator)
// -------------------------------------------------------------
console.log("\n--- 3. Validação Estrita de Dados (SongValidator) ---");

runTest("Rejeita música sem título", () => {
  const invalid = createEmptySong({ title: "", artistName: "Artista", originalKey: "C" });
  const res = SongValidator.validateSong(invalid);
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes("título")));
});

runTest("Rejeita música sem artista", () => {
  const invalid = createEmptySong({ title: "Título", artistName: "", originalKey: "C" });
  const res = SongValidator.validateSong(invalid);
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes("artista")));
});

runTest("Rejeita tonalidade inválida", () => {
  const invalid = createEmptySong({ title: "Título", artistName: "Artista", originalKey: "XYZ" });
  const res = SongValidator.validateSong(invalid);
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes("tonalidade")));
});

runTest("Aceita tonalidades menores e com alterações (Cm, F#m, Eb)", () => {
  const validCm = createEmptySong({ title: "Título", artistName: "Artista", originalKey: "Cm" });
  assert.strictEqual(SongValidator.validateSong(validCm).valid, true);

  const validFsm = createEmptySong({ title: "Título", artistName: "Artista", originalKey: "F#m" });
  assert.strictEqual(SongValidator.validateSong(validFsm).valid, true);

  const validEb = createEmptySong({ title: "Título", artistName: "Artista", originalKey: "Eb" });
  assert.strictEqual(SongValidator.validateSong(validEb).valid, true);
});

runTest("Valida limites de BPM (20 a 300)", () => {
  const tooLow = createEmptySong({ title: "T", artistName: "A", originalKey: "C", bpm: 10 });
  assert.strictEqual(SongValidator.validateSong(tooLow).valid, false);

  const tooHigh = createEmptySong({ title: "T", artistName: "A", originalKey: "C", bpm: 400 });
  assert.strictEqual(SongValidator.validateSong(tooHigh).valid, false);

  const validBpm = createEmptySong({ title: "T", artistName: "A", originalKey: "C", bpm: 74 });
  assert.strictEqual(SongValidator.validateSong(validBpm).valid, true);
});

runTest("Valida limites de capotraste (0 a 12)", () => {
  const invalidCapo = createEmptySong({ title: "T", artistName: "A", originalKey: "C", capo: 15 });
  assert.strictEqual(SongValidator.validateSong(invalidCapo).valid, false);

  const validCapo = createEmptySong({ title: "T", artistName: "A", originalKey: "C", capo: 3 });
  assert.strictEqual(SongValidator.validateSong(validCapo).valid, true);
});

// -------------------------------------------------------------
// 4. PERMISSÕES E MODERAÇÃO: USUÁRIO COMUM VS ADMINISTRADOR
// -------------------------------------------------------------
console.log("\n--- 4. Permissões e Moderação de Conteúdo ---");

runTest("Usuário comum NÃO pode auto-declarar verificado ou fonte oficial", () => {
  const maliciousInput = {
    title: "Música Não Autorizada",
    artist: "Usuário",
    originalKey: "G",
    verified: true,
    sourceType: SOURCE_TYPES.OFFICIAL
  };

  // Usuário comum processando importação
  const processed = SongImporter.processSongImport(maliciousInput, {
    userUid: "user-123",
    isAdmin: false
  });

  assert.strictEqual(processed.verified, false);
  assert.strictEqual(processed.verificationStatus, "unverified");
  assert.strictEqual(processed.sourceType, SOURCE_TYPES.USER);
  assert.strictEqual(processed.status, SONG_STATUS.PENDING_REVIEW);
});

runTest("Administrador pode publicar como oficial e verificado diretamente", () => {
  const adminInput = {
    title: "Música Curada Oficial",
    artist: "Virtuo Worship",
    originalKey: "D",
    verified: true,
    sourceType: SOURCE_TYPES.OFFICIAL,
    status: SONG_STATUS.PUBLISHED
  };

  const processed = SongImporter.processSongImport(adminInput, {
    userUid: "admin-uid-1",
    isAdmin: true
  });

  assert.strictEqual(processed.verified, true);
  assert.strictEqual(processed.verificationStatus, "verified");
  assert.strictEqual(processed.sourceType, SOURCE_TYPES.OFFICIAL);
  assert.strictEqual(processed.status, SONG_STATUS.PUBLISHED);
});

// -------------------------------------------------------------
// 5. MIGRAÇÃO OFICIAL COM TESTE OBRIGATÓRIO: MISTÉRIO NA OLARIA EM Cm
// -------------------------------------------------------------
console.log("\n--- 5. Migração Segura: Mistério Na Olaria (Tom: Cm) ---");

runTest("Migra 'Mistério Na Olaria' corrigindo tom original para Cm sem inventar dados", () => {
  const legacyOlaria = {
    id: "demo-misterio-olaria",
    title: "Mistério na Olaria",
    artist: "Raquel Pereira",
    originalKey: "G", // Legado incorreto
    bpm: 74,
    difficulty: "Fácil",
    structure: "Intro • Verso 1 • Refrão • Final",
    chords: `[Intro] G  C9  Em7  D\n[Verso 1]\nG  C9\nEu fui na olaria`
  };

  const migrated = SongMigration.migrateLegacySong(legacyOlaria);

  // Verificações rigorosas do requisito #18 / #19
  assert.strictEqual(migrated.id, "demo-misterio-olaria");
  assert.strictEqual(migrated.title, "Mistério na Olaria");
  assert.strictEqual(migrated.artistName, "Raquel Pereira");
  assert.strictEqual(migrated.originalKey, "Cm", "O tom original DEVE ser rigorosamente Cm");
  assert.strictEqual(migrated.bpm, 74, "O BPM não deve ser alterado nem inventado");
  assert.strictEqual(migrated.lyrics, null, "Não inventar letras inexistentes");
  assert.strictEqual(migrated.lyricsStatus, LYRICS_STATUS.UNAVAILABLE);
  assert.strictEqual(migrated.verified, true);
  assert.strictEqual(migrated.sourceType, SOURCE_TYPES.OFFICIAL);

  // Retrocompatibilidade garantida
  assert.strictEqual(migrated.artist, "Raquel Pereira");
  assert.strictEqual(typeof migrated.chords, "string");
  assert(Array.isArray(migrated.structuredChords));
  assert(Array.isArray(migrated.structuredSections));
});

// -------------------------------------------------------------
// 6. MOTOR HARMÔNICO & EASY PLAY
// -------------------------------------------------------------
console.log("\n--- 6. Motor Harmônico, Slash Chords e Easy Play ---");

runTest("Transpõe tonalidades menores e maiores corretamente", () => {
  // Cm transposto em +2 semitons -> Dm
  assert.strictEqual(calculateKey("Cm", 2), "Dm");
  // Cm transposto em -1 semitono -> Bm
  assert.strictEqual(calculateKey("Cm", -1), "Bm");
  // G transposto em +1 semitono -> G#
  assert.strictEqual(calculateKey("G", 1), "G#");
});

runTest("Transpõe slash chords (acordes invertidos) mantendo o baixo", () => {
  // D/F# transposto em +2 semitons -> E/G#
  assert.strictEqual(transposeChord("D/F#", 2), "E/G#");
  // G/B transposto em +1 semitono -> G#/C
  assert.strictEqual(transposeChord("G/B", 1), "G#/C");
  // C/E transposto em +2 semitons -> D/F#
  assert.strictEqual(transposeChord("C/E", 2), "D/F#");
});

runTest("Easy Play simplifica acordes complexos para tríades amigáveis", () => {
  assert.strictEqual(simplifyChord("C9"), "C");
  assert.strictEqual(simplifyChord("Cadd9"), "C");
  assert.strictEqual(simplifyChord("Gsus4"), "G");
  assert.strictEqual(simplifyChord("Em7"), "Em");
  assert.strictEqual(simplifyChord("D/F#"), "D");
  assert.strictEqual(simplifyChord("Bm9"), "Bm");
});

runTest("generateEasyPlaySheet simplifica partitura completa sem danificar layout", () => {
  const fullSheet = `[Intro] G  C9  Em7  D/F#\n[Verso] C9  Gsus4`;
  const easy = generateEasyPlaySheet(fullSheet);
  assert(easy.includes("[Intro] G  C  Em  D"));
  assert(easy.includes("[Verso] C  G"));
});

// -------------------------------------------------------------
// 7. RELATÓRIO FINAL
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`TOTAL DE TESTES DO BANCO DE DADOS: ${totalTests}`);
console.log(`PASSOU: ${passedTests}`);
console.log(`FALHOU: ${failedTests}`);
console.log(`=============================================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("✓ TODOS OS TESTES DO BANCO DE DADOS VIRTUO PASSARAM COM SUCESSO!\n");
}
