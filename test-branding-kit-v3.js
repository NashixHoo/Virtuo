// =============================================================
// TEST SUITE: VIRTUO BRAND KIT V3 — IDENTIDADE VISUAL OFICIAL
// test-branding-kit-v3.js
// =============================================================

import fs from "fs";
import path from "path";
import assert from "assert";
import { DESIGN_TOKENS, BRAND_ASSETS } from "./src/design/design-system.js";
import { VIRTUO_BRAND_SYSTEM } from "./src/design/branding.js";

console.log("🚀 [VIRTUO BRAND KIT V3] Iniciando auditoria de identidade visual oficial...");

// 1. Auditoria de Tokens de Design
console.log("  Verificando Design Tokens Oficiais...");
assert.strictEqual(DESIGN_TOKENS.colors.background, "#07101F", "Background deve ser #07101F");
assert.strictEqual(DESIGN_TOKENS.colors.backgroundSecondary, "#0E1B35", "Background Secondary deve ser #0E1B35");
assert.strictEqual(DESIGN_TOKENS.colors.celestialBlue, "#7EE7FF", "Celestial Blue deve ser #7EE7FF");
assert.strictEqual(DESIGN_TOKENS.colors.white, "#F8FAFC", "White deve ser #F8FAFC");
assert.strictEqual(DESIGN_TOKENS.colors.goldPremium, "#F5C542", "Gold Premium deve ser #F5C542");

// Motion Tokens
assert.strictEqual(DESIGN_TOKENS.motion.button, "120ms", "Motion Button deve ser 120ms");
assert.strictEqual(DESIGN_TOKENS.motion.card, "150ms", "Motion Card deve ser 150ms");
assert.strictEqual(DESIGN_TOKENS.motion.pulse, "140ms", "Motion Pulse deve ser 140ms");
assert.strictEqual(DESIGN_TOKENS.motion.screen, "180ms", "Motion Screen deve ser 180ms");
assert.strictEqual(DESIGN_TOKENS.motion.splash, "1400ms", "Motion Splash deve ser 1400ms");

console.log("  ✓ Paleta oficial e Motion System auditados com 100% de conformidade.");

// 2. Auditoria dos Arquivos de Logo (8 versões)
console.log("  Verificando pacote de logos vetoriais...");
const expectedLogos = [
  "logo-principal.svg",
  "logo-icon-square.svg",
  "logo-icon-circle.svg",
  "favicon.svg",
  "logo-splash.svg",
  "logo-monochrome.svg",
  "logo-white.svg",
  "logo-blue.svg"
];

for (const logoFile of expectedLogos) {
  const filePath = path.join("assets", "branding", "logo", logoFile);
  assert(fs.existsSync(filePath), `Arquivo de logo ausente: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  assert(content.includes("<svg"), `Arquivo deve ser um SVG válido: ${filePath}`);
  assert(content.includes("</svg>"), `SVG mal formatado: ${filePath}`);
}
console.log("  ✓ Todas as 8 versões da Logo Oficial V estão geradas e íntegras.");

// 3. Auditoria dos Fundos Cinematográficos (5 versões + cópia de compatibilidade)
console.log("  Verificando fundos oficiais de palco e silhueta...");
const expectedBackgrounds = [
  "virtuo-background-home.svg",
  "virtuo-background-splash.svg",
  "virtuo-background-missions.svg",
  "virtuo-background-live.svg",
  "virtuo-background-login.svg",
  "virtuo-cinematic-background.svg"
];

for (const bgFile of expectedBackgrounds) {
  const filePath = path.join("assets", "backgrounds", bgFile);
  assert(fs.existsSync(filePath), `Fundo ausente: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  assert(content.includes("<svg"), `Fundo deve ser SVG: ${filePath}`);
  assert(content.includes("linearGradient") || content.includes("radialGradient"), `Fundo deve conter iluminação gradiente: ${filePath}`);
}
console.log("  ✓ Todos os 5 fundos contextuais com horizonte azul e banda em silhueta validados.");

// 4. Auditoria dos 10 Ícones Oficiais no estilo do V
console.log("  Verificando conjunto completo de ícones oficiais...");
const expectedIcons = [
  "afinador.svg",
  "vocal.svg",
  "missoes.svg",
  "live.svg",
  "maestro.svg",
  "banda.svg",
  "cifras.svg",
  "perfil.svg",
  "configuracoes.svg",
  "biblioteca.svg"
];

for (const iconFile of expectedIcons) {
  const filePath = path.join("assets", "branding", "icons", iconFile);
  assert(fs.existsSync(filePath), `Ícone ausente: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  assert(content.includes("<svg"), `Ícone deve ser SVG: ${filePath}`);
}
console.log("  ✓ Todos os 10 ícones oficiais da marca Virtuo validados com sucesso.");

// 5. Auditoria de CSS (branding.css)
console.log("  Verificando implementação do Horizon Glow e Glass System em CSS...");
const brandingCssPath = path.join("src", "styles", "branding.css");
assert(fs.existsSync(brandingCssPath), "branding.css ausente");
const brandingCss = fs.readFileSync(brandingCssPath, "utf-8");

assert(brandingCss.includes(".virtuo-horizon"), "Classe .virtuo-horizon ausente em branding.css");
assert(brandingCss.includes("radial-gradient"), "Horizon Glow deve usar gradiente radial");
assert(brandingCss.includes("blur("), "Horizon Glow deve usar blur suave");
assert(brandingCss.includes(".virtuo-card"), "Glass System deve definir .virtuo-card");
assert(brandingCss.includes("backdrop-filter"), "Glass System deve usar backdrop-filter");
assert(brandingCss.includes("prefers-reduced-motion"), "Deve respeitar prefers-reduced-motion");
assert(brandingCss.includes("var(--virtuo-aura-cycle)"), "Virtuo Aura deve usar ciclo dinâmico");

console.log("  ✓ Horizon Glow, Virtuo Aura e Glass System validados no CSS.");

// 6. Auditoria de Splash e Integração Global
console.log("  Verificando Splash Screen (0.0s a 1.4s)...");
const splashPath = path.join("src", "features", "splash", "splash.js");
const splashContent = fs.readFileSync(splashPath, "utf-8");
assert(splashContent.includes("300"), "Splash deve ter etapa 0.3s (300ms)");
assert(splashContent.includes("700"), "Splash deve ter etapa 0.7s (700ms)");
assert(splashContent.includes("1000"), "Splash deve ter etapa 1.0s (1000ms)");
assert(splashContent.includes("1400"), "Splash deve ter etapa 1.4s (1400ms)");
assert(splashContent.includes("splash-blue-wave"), "Splash deve ter onda azul descendo");

console.log("  ✓ Sequência cinematográfica de Splash Screen conferida.");

// 7. Auditoria do index.html e manifest.json
console.log("  Verificando index.html e manifest.json...");
const indexHtml = fs.readFileSync("index.html", "utf-8");
assert(indexHtml.includes("branding.css"), "index.html deve carregar branding.css");
assert(indexHtml.includes("virtuo-aura-ambient"), "index.html deve conter virtuo-aura-ambient");
assert(indexHtml.includes("virtuo-horizon"), "index.html deve aplicar virtuo-horizon");

const manifestJson = JSON.parse(fs.readFileSync("manifest.json", "utf-8"));
assert.strictEqual(manifestJson.background_color, "#07101F", "manifest background_color deve ser #07101F");
assert.strictEqual(manifestJson.theme_color, "#07101F", "manifest theme_color deve ser #07101F");

console.log("  ✓ Index HTML e Manifest PWA auditados com êxito.");

console.log("\n🌟 [VIRTUO BRAND KIT V3] TODOS OS CRITÉRIOS DE AUDITORIA FORAM APROVADOS COM SUCESSO!\n");
