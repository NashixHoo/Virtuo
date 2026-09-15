// =============================================================
// SUÍTE DE TESTES: PAINEL ADMINISTRATIVO DE CADASTRO E IMPORTAÇÃO
// test-admin-song-manager.js
// Validação dos fluxos de permissões, copyright de letras,
// 7 etapas do wizard, Easy Play, transposição, rascunhos e publicação
// =============================================================

import assert from "node:assert";
import { 
  adminSongManager, 
  ADMIN_INSTRUMENTS, 
  MUSICAL_KEYS, 
  TIME_SIGNATURES 
} from "./src/features/admin/index.js";

import { 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  LYRICS_STATUS, 
  SOURCE_TYPES,
  createEmptySong 
} from "./src/database/schema.js";

import { SongValidator } from "./src/database/validator.js";
import { SongImporter } from "./src/database/importer.js";
import { SongNormalizer } from "./src/database/normalizer.js";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erro: ${err.message}`);
    failedTests++;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erro: ${err.message}`);
    failedTests++;
  }
}

console.log("\n=============================================================");
console.log("TESTES: PAINEL ADMINISTRATIVO (VIRTUO ADMIN > BANCO MUSICAL)");
console.log("=============================================================\n");

// -------------------------------------------------------------
// 1. CONTROLE DE ACESSO E SEGURANÇA (RBAC)
// -------------------------------------------------------------
console.log("[1] Controle de Acesso e Permissões de Administrador:");

test("Não permite acesso à interface administrativa para usuários não-administradores", () => {
  const regularUser = { uid: "user-123", email: "musico@virtuo.com" };
  const regularProfile = { role: "musician" };
  const isAdmin = false;

  const html = adminSongManager.render(regularUser, regularProfile, isAdmin);
  assert.strictEqual(html.includes("ÁREA RESTRITA"), true, "Deveria exibir aviso de área restrita");
  assert.strictEqual(html.includes("Acesso Exclusivo para Administradores"), true);
  assert.strictEqual(html.includes("admin-stepper-bar"), false, "Não deve renderizar o wizard para não-admins");
});

test("Permite acesso completo e renderiza o wizard em 7 etapas para administradores", () => {
  const adminUser = { uid: "admin-456", email: "admin@virtuo.com" };
  const adminProfile = { role: "admin" };
  const isAdmin = true;

  const html = adminSongManager.render(adminUser, adminProfile, isAdmin);
  assert.strictEqual(html.includes("BANCO MUSICAL"), true);
  assert.strictEqual(html.includes("ADICIONAR MÚSICA"), true);
  assert.strictEqual(html.includes("admin-stepper-bar"), true, "Deveria renderizar o stepper de etapas");
  assert.strictEqual(html.includes("Informações"), true);
});

// -------------------------------------------------------------
// 2. PROTEÇÃO RIGOROSA DE DIREITOS AUTORAIS E LETRAS
// -------------------------------------------------------------
console.log("\n[2] Proteção de Direitos Autorais e Regras de Letras:");

test("NÃO permite inserir letra protegida quando status for 'unavailable' (Indisponível)", () => {
  const songWithIllegalLyrics = {
    title: "Música com Letra Copiada Sem Autorização",
    artistName: "Artista Desconhecido",
    originalKey: "G",
    bpm: 70,
    lyrics: "Esta é uma letra protegida copiada indevidamente da internet...",
    lyricsStatus: LYRICS_STATUS.UNAVAILABLE
  };

  const validation = SongValidator.validateSong(songWithIllegalLyrics, { isAdmin: true });
  assert.strictEqual(validation.valid, false, "Deveria reprovar inserção de letra indisponível");
  assert.strictEqual(
    validation.errors.some(e => e.includes("Não é permitido inserir letra de música quando o status de direitos autorais for 'Indisponível / Protegida'")),
    true,
    "Deveria conter mensagem clara sobre a proibição autoral"
  );
});

test("Exige fonte e código de licença quando status for 'authorized' ou 'licensed'", () => {
  const songWithoutLicenseInfo = {
    title: "Música Autorizada Sem Comprovante",
    artistName: "Banda Gospel",
    originalKey: "D",
    bpm: 120,
    lyrics: "Letra legalmente declarada...",
    lyricsStatus: LYRICS_STATUS.AUTHORIZED,
    lyricsLicense: "",
    lyricsSource: ""
  };

  const validation = SongValidator.validateSong(songWithoutLicenseInfo, { isAdmin: true });
  assert.strictEqual(validation.valid, false);
  assert.strictEqual(
    validation.errors.some(e => e.includes("é obrigatório informar a fonte ou a licença legal correspondente")),
    true
  );
});

test("Aprova letra quando autorizada e com dados de licenciamento devidamente informados", () => {
  const songWithLegalLicense = {
    title: "Música Devidamente Licenciada",
    artistName: "Compositor Titular",
    originalKey: "E",
    bpm: 95,
    lyrics: "Santo, Santo é o Senhor dos Exércitos...",
    lyricsStatus: LYRICS_STATUS.LICENSED,
    lyricsLicense: "CONTRATO-VIRTUO-2026-001",
    lyricsSource: "Editora Adoração Viva"
  };

  const validation = SongValidator.validateSong(songWithLegalLicense, { isAdmin: true });
  assert.strictEqual(validation.valid, true, "Deveria aprovar letra com contrato de licença válido");
});

test("Limpa campo de letra no controller ao trocar status para 'unavailable'", () => {
  adminSongManager.formData.lyrics = "Texto temporário de letra";
  adminSongManager.updateField("lyricsStatus", LYRICS_STATUS.UNAVAILABLE);
  assert.strictEqual(adminSongManager.formData.lyrics, "", "Letra deve ser limpa automaticamente para prevenir vazamento autoral");
});

// -------------------------------------------------------------
// 3. FLUXO DO WIZARD EM 7 ETAPAS
// -------------------------------------------------------------
console.log("\n[3] Fluxo do Wizard e Navegação em 7 Etapas:");

test("Navega corretamente entre as etapas (1 a 7) com limites estritos", () => {
  adminSongManager.setStep(1);
  assert.strictEqual(adminSongManager.currentStep, 1);

  adminSongManager.prevStep();
  assert.strictEqual(adminSongManager.currentStep, 1, "Não deve descer abaixo da etapa 1");

  adminSongManager.nextStep();
  assert.strictEqual(adminSongManager.currentStep, 2);

  adminSongManager.setStep(6);
  assert.strictEqual(adminSongManager.currentStep, 6);

  adminSongManager.nextStep();
  assert.strictEqual(adminSongManager.currentStep, 7);

  adminSongManager.nextStep();
  assert.strictEqual(adminSongManager.currentStep, 7, "Não deve subir além da etapa 7");
});

test("Etapa 1: Atualiza metadados e tags/instrumentos", () => {
  adminSongManager.resetForm();
  adminSongManager.updateField("title", "Agnus Dei");
  adminSongManager.updateField("artistName", "Michael W. Smith");
  adminSongManager.updateField("originalKey", "A");
  adminSongManager.updateField("bpm", 72);
  adminSongManager.toggleGenre("Worship");
  adminSongManager.toggleInstrument("Teclado");
  adminSongManager.toggleInstrument("Violão");

  assert.strictEqual(adminSongManager.formData.title, "Agnus Dei");
  assert.strictEqual(adminSongManager.formData.artistName, "Michael W. Smith");
  assert.strictEqual(adminSongManager.formData.originalKey, "A");
  assert.strictEqual(adminSongManager.formData.bpm, 72);
  assert.strictEqual(adminSongManager.formData.genres.includes("Worship"), true);
  assert.strictEqual(adminSongManager.formData.instruments.includes("Teclado"), true);
  assert.strictEqual(adminSongManager.formData.instruments.includes("Violão"), true);
});

test("Etapa 2: Detecta acordes e gera Easy Play automaticamente", () => {
  const sampleChordSheet = `[Intro] A  D9  F#m7  E\n\n[Verso 1]\nA                     D9\nAleluia, Aleluia, reina o Senhor...`;
  adminSongManager.updateField("chordSheet", sampleChordSheet);

  adminSongManager.detectChords();
  assert.ok(adminSongManager.detectedChords.length >= 3, "Deveria detectar os acordes na cifra");

  adminSongManager.generateEasyPlay();
  assert.ok(adminSongManager.formData.easyChordSheet.length > 0, "Deveria gerar a cifra Easy Play");
  assert.strictEqual(adminSongManager.formData.easyChordSheet.includes("D"), true, "Easy Play deve simplificar D9 para D");
});

test("Etapa 3: Construtor de blocos estruturais e sincronização textual", () => {
  adminSongManager.formData.structure = [];
  adminSongManager.addStructureSection("intro", "Intro");
  adminSongManager.addStructureSection("verse", "Verso");
  adminSongManager.addStructureSection("chorus", "Refrão");
  adminSongManager.addStructureSection("outro", "Final");

  assert.strictEqual(adminSongManager.formData.structure.length, 4);
  assert.strictEqual(adminSongManager.formData.structure[0].label, "Intro");
  assert.strictEqual(adminSongManager.formData.structure[2].label, "Refrão");

  // Reordenação de blocos
  adminSongManager.moveStructureSection(0, 1); // Move Intro para baixo
  assert.strictEqual(adminSongManager.formData.structure[0].label, "Verso");
  assert.strictEqual(adminSongManager.formData.structure[1].label, "Intro");

  // Remoção
  adminSongManager.removeStructureSection(3);
  assert.strictEqual(adminSongManager.formData.structure.length, 3);
});

test("Etapa 6: Prévia interativa com transposição de tom em tempo real", () => {
  adminSongManager.formData.originalKey = "C";
  adminSongManager.previewSemitones = 0;

  adminSongManager.transposePreview(2);
  assert.strictEqual(adminSongManager.previewSemitones, 2);

  // Testa se a renderização da etapa 6 calcula tom D
  const html = adminSongManager.renderStep6(adminSongManager.formData);
  assert.strictEqual(html.includes("TOM: D"), true, "Deveria transpor de C (+2) para D");
  assert.strictEqual(html.includes("(Orig: C)"), true);

  adminSongManager.resetPreviewTranspose();
  assert.strictEqual(adminSongManager.previewSemitones, 0);
});

test("Etapa 7: Validação diagnóstica e preparação para publicação", () => {
  adminSongManager.formData.title = "Nome Válido";
  adminSongManager.formData.artistName = "Artista Válido";
  adminSongManager.formData.originalKey = "G";
  adminSongManager.formData.bpm = 80;
  adminSongManager.formData.lyricsStatus = LYRICS_STATUS.UNAVAILABLE;
  adminSongManager.formData.lyrics = "";

  const isValid = adminSongManager.validate();
  assert.strictEqual(isValid, true, "Formulário válido deve passar na validação diagnóstica");

  const html = adminSongManager.renderStep7(adminSongManager.formData, "admin-1", true);
  assert.strictEqual(html.includes("Diagnóstico Positivo"), true);
});

// -------------------------------------------------------------
// 4. ESTADOS: RASCUNHO, PUBLICADO E ARQUIVADO
// -------------------------------------------------------------
console.log("\n[4] Estados de Ciclo de Vida (Draft, Published, Archived):");

test("Transição para Rascunho (Draft) define status privado", () => {
  adminSongManager.formData.status = SONG_STATUS.DRAFT;
  adminSongManager.formData.visibility = SONG_VISIBILITY.PRIVATE;
  assert.strictEqual(adminSongManager.formData.status, "draft");
  assert.strictEqual(adminSongManager.formData.visibility, "private");
});

test("Transição para Publicado (Published) define status público oficial", () => {
  adminSongManager.formData.status = SONG_STATUS.PUBLISHED;
  adminSongManager.formData.visibility = SONG_VISIBILITY.PUBLIC;
  assert.strictEqual(adminSongManager.formData.status, "published");
  assert.strictEqual(adminSongManager.formData.visibility, "public");
});

test("Transição para Arquivado (Archived) define status arquivado", () => {
  adminSongManager.formData.status = SONG_STATUS.ARCHIVED;
  adminSongManager.formData.visibility = SONG_VISIBILITY.PRIVATE;
  assert.strictEqual(adminSongManager.formData.status, "archived");
  assert.strictEqual(adminSongManager.formData.visibility, "private");
});

// -------------------------------------------------------------
// 5. GESTÃO DE CATÁLOGO, FILTROS, VERIFICAÇÃO E PRÉVIA
// -------------------------------------------------------------
console.log("\n[5] Gestão de Catálogo, Filtros e Verificação Oficial:");

test("Catálogo filtra músicas por status (published, draft, pending_review, archived)", () => {
  adminSongManager.catalogSongs = [
    { id: "s1", title: "Graça Maravilhosa", status: "published", originalKey: "G", isVerified: true },
    { id: "s2", title: "Oceans", status: "draft", originalKey: "D", isVerified: false },
    { id: "s3", title: "Em Teus Braços", status: "pending_review", originalKey: "E", isVerified: false },
    { id: "s4", title: "Antiga Canção", status: "archived", originalKey: "C", isVerified: false }
  ];

  adminSongManager.catalogFilter = "published";
  let html = adminSongManager.renderCatalogView("admin-1", true);
  assert.strictEqual(html.includes("Graça Maravilhosa"), true);
  assert.strictEqual(html.includes("Oceans"), false);

  adminSongManager.catalogFilter = "pending_review";
  html = adminSongManager.renderCatalogView("admin-1", true);
  assert.strictEqual(html.includes("Em Teus Braços"), true);
  assert.strictEqual(html.includes("Graça Maravilhosa"), false);

  adminSongManager.catalogFilter = "all";
});

test("Busca no catálogo utiliza normalização de acentos e termos", () => {
  adminSongManager.catalogSearch = "graca";
  const html = adminSongManager.renderCatalogView("admin-1", true);
  assert.strictEqual(html.includes("Graça Maravilhosa"), true, "Busca sem acento deve achar título acentuado");
  adminSongManager.catalogSearch = "";
});

test("Exibe badge oficial quando música possui isVerified = true", () => {
  const html = adminSongManager.renderCatalogView("admin-1", true);
  assert.strictEqual(html.includes("✓ Oficial"), true);
});

// -------------------------------------------------------------
// 6. VERSIONAMENTO E RESTAURAÇÃO
// -------------------------------------------------------------
console.log("\n[6] Histórico de Versões e Restauração Auditável:");

test("Restaura versão histórica carregando dados na cifra e formulário", () => {
  const versionToRestore = {
    version: 2,
    originalKey: "F",
    chordSheet: "[Intro] F  Bb  Dm  C\n[Verso] F Bb",
    easyChordSheet: "[Intro] F  Bb  Dm  C",
    changeSummary: "Correção de harmonia da ponte"
  };

  adminSongManager.restoreVersion(versionToRestore);
  assert.strictEqual(adminSongManager.formData.originalKey, "F");
  assert.strictEqual(adminSongManager.formData.chordSheet.includes("Bb"), true);
  assert.strictEqual(adminSongManager.currentStep, 6, "Restauração deve levar à prévia para conferência");
});

// -------------------------------------------------------------
// 7. UPLOAD E GESTÃO DE ÁUDIO
// -------------------------------------------------------------
console.log("\n[7] Mídia e Áudio da Música:");

test("Etapa 4 renderiza componente de áudio e botões de mídia", () => {
  adminSongManager.formData.audioUrl = "https://firebasestorage.googleapis.com/test-audio.mp3";
  const html = adminSongManager.renderStep4(adminSongManager.formData);
  assert.strictEqual(html.includes("Upload de Áudio da Música"), true);
  assert.strictEqual(html.includes("Áudio carregado e pronto para reprodução"), true);
  assert.strictEqual(html.includes("test-audio.mp3"), true);
});

test("Remoção de áudio limpa a URL do formulário", () => {
  adminSongManager.removeAudioUrl();
  assert.strictEqual(adminSongManager.formData.audioUrl, "");
});

// -------------------------------------------------------------
// RELATÓRIO FINAL DE TESTES
// -------------------------------------------------------------
console.log("\n=============================================================");
console.log(`TOTAL DE TESTES: ${totalTests}`);
console.log(`PASSOU: ${passedTests}`);
console.log(`FALHOU: ${failedTests}`);
console.log("=============================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("✓ Todos os testes do Painel Administrativo passaram com sucesso!\n");
}
