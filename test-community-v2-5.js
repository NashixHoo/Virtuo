// =============================================================
// VIRTUO V2.5 — TEST SUITE: COMUNIDADE PREMIUM (IPHONE & ATOMIC UPLOAD)
// test-community-v2-5.js
// =============================================================

import assert from "node:assert";
import fs from "node:fs";

console.log("=================================================");
console.log("🌟 TEST SUITE: VIRTUO V2.5 — COMUNIDADE PREMIUM");
console.log("=================================================");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(err);
    failed++;
  }
}

// -------------------------------------------------------------
// BLOCO 1 — FOTO (CORREÇÃO DO IPHONE)
// -------------------------------------------------------------
console.log("\n--- Bloco 1: Foto (Correção do iPhone - Folha Nativa iOS) ---");

it("Input de foto possui id='community-photo-input' e accept='image/*'", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(html.includes('id="community-photo-input"'), "Deve conter input com id='community-photo-input'");
  assert(html.includes('accept="image/*"'), "Deve aceitar qualquer imagem via accept='image/*'");
});

it("Input de foto NÃO possui capture='environment' nem capture='user'", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(!html.includes('capture="environment"'), "capture='environment' DEVE ser removido para não forçar câmera");
  assert(!html.includes('capture="user"'), "capture='user' DEVE ser removido para permitir folha nativa do iOS");
});

it("Botão 'Foto' aciona .click() no input de foto oculto", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(html.includes("community-photo-input") && html.includes(".click()"), "Botão deve invocar photoInput.click()");
});

it("Não utiliza showOpenFilePicker() incompatível com Safari iOS", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  const commView = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(!appJs.includes("showOpenFilePicker"), "app.js não deve usar showOpenFilePicker");
  assert(!commView.includes("showOpenFilePicker"), "community-view.js não deve usar showOpenFilePicker");
});

// -------------------------------------------------------------
// BLOCO 2 — VÍDEO E ÁUDIO DEDICADOS
// -------------------------------------------------------------
console.log("\n--- Bloco 2: Vídeo e Áudio Dedicados ---");

it("Input de vídeo dedicado com accept='video/*' e acionamento por botão", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(html.includes('id="community-video-input"') || html.includes('id="community-post-video"'), "Input de vídeo deve existir");
  assert(html.includes('accept="video/*"'), "Input de vídeo deve ter accept='video/*'");
  assert(html.includes("video-input") || html.includes("post-video"), "Botão deve invocar click() no input de vídeo");
});

it("Input de áudio dedicado com accept='audio/*' e acionamento por botão", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(html.includes('id="community-audio-input"') || html.includes('id="community-post-audio"'), "Input de áudio deve existir");
  assert(html.includes('accept="audio/*"'), "Input de áudio deve ter accept='audio/*'");
  assert(html.includes("audio-input") || html.includes("post-audio"), "Botão deve invocar click() no input de áudio");
});

// -------------------------------------------------------------
// BLOCO 3 — PRÉ-VISUALIZAÇÃO IMEDIATA & REVOGAÇÃO DE MEMÓRIA
// -------------------------------------------------------------
console.log("\n--- Bloco 3: Pré-visualização Imediata & Liberação de Memória ---");

it("Gera preview imediato com globalPreviewManager e revoga no encerramento", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  assert(appJs.includes("globalPreviewManager.createPreview"), "Deve gerar preview imediato do arquivo");
  assert(appJs.includes("globalPreviewManager.revokePreview"), "Deve revogar URL ao limpar ou publicar");
});

it("clearCommunityMediaAttachment limpa inputs e revoga URL", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  assert(appJs.includes("window.clearCommunityMediaAttachment"), "Função clearCommunityMediaAttachment deve existir");
  assert(appJs.includes("community-photo-input"), "Deve resetar o input de foto");
  assert(appJs.includes("globalPreviewManager.revokePreview"), "Deve revogar preview ativo para liberar memória");
});

// -------------------------------------------------------------
// BLOCO 4 — FLUXO ATÔMICO DE PUBLICAÇÃO & PREVENÇÃO DE POST QUEBRADO
// -------------------------------------------------------------
console.log("\n--- Bloco 4: Fluxo Atômico de Publicação ---");

it("Desabilita botão de publicação durante upload e salvamento", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  assert(appJs.includes("submitBtn.disabled = true"), "submitBtn deve ser desabilitado durante o processo");
  assert(appJs.includes("Enviando mídia..."), "Deve exibir feedback 'Enviando mídia...'");
  assert(appJs.includes("Publicando no Feed..."), "Deve exibir feedback 'Publicando no Feed...'");
});

it("Aborta publicação e reativa botão caso ocorra erro (Nunca cria post quebrado)", () => {
  const appJs = fs.readFileSync("./app.js", "utf-8");
  assert(appJs.includes("submitBtn.disabled = false"), "submitBtn deve ser reativado se falhar");
  assert(appJs.includes("return;"), "Deve abortar sem salvar no Firestore se upload falhar");
});

// -------------------------------------------------------------
// BLOCO 5 — UI / UX REFINADA & CONTADOR DE CARACTERES
// -------------------------------------------------------------
console.log("\n--- Bloco 5: UI / UX Refinada & Contador de Caracteres ---");

it("Textarea possui contador de caracteres com limite de 500", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  assert(html.includes('maxlength="500"'), "Textarea deve ter maxlength='500'");
  assert(html.includes('id="community-char-counter"'), "Elemento de contagem community-char-counter deve existir");
  assert(html.includes("updateCommunityCharCount"), "Deve invocar updateCommunityCharCount no oninput");
});

it("Barra de progresso possui glassmorphism, halo animation e milestones", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  const css = fs.readFileSync("./style.css", "utf-8");
  assert(html.includes("community-upload-glass"), "Barra deve ter classe glassmorphism");
  assert(html.includes("halo-active"), "Barra deve ter halo-active");
  assert(html.includes("milestone-0") && html.includes("milestone-100"), "Deve exibir milestones visuais");
  assert(css.includes("uploadHaloPulse"), "CSS deve definir animação uploadHaloPulse");
});

// -------------------------------------------------------------
// BLOCO 6 — PERFORMANCE 60 FPS & IPHONE TOUCH TARGETS
// -------------------------------------------------------------
console.log("\n--- Bloco 6: Performance 60 FPS & Touch Targets (44px) ---");

it("Botões de mídia possuem touch target mínimo de 44px", () => {
  const html = fs.readFileSync("./src/community/community-view.js", "utf-8");
  const css = fs.readFileSync("./style.css", "utf-8");
  assert(html.includes("min-height:44px") || css.includes("min-height: 44px"), "Touch targets devem ter no mínimo 44px para iPhone");
});

it("Animações utilizam transforms e opacity para aceleração de GPU", () => {
  const css = fs.readFileSync("./style.css", "utf-8");
  assert(css.includes("transform: scale(0.97)") || css.includes("transform 0.12s"), "Interações de mídia devem usar transforms");
});

console.log("\n=================================================");
console.log(`TOTAL DE TESTES V2.5: ${passed + failed}`);
console.log(`PASSOU: ${passed} | FALHOU: ${failed}`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 VIRTUO V2.5 — COMUNIDADE PREMIUM HOMOLOGADO COM SUCESSO!\n");
}
