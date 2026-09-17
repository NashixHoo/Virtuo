// =============================================================
// TEST SUITE: VIRTUO EXPERIENCE SYSTEM (ETAPA 4/5)
// test-experience-system.js
// Validação completa de: Saudação, Pulse, Splash, Aura, Som & Design System
// =============================================================

import assert from "node:assert";
import fs from "node:fs";
import { getGreeting, getHomeGreetingData } from "./src/features/home/greeting.js";
import { renderHojeScreen } from "./src/features/home/home-view.js";
import { VirtuoPulseController, PULSE_STATES } from "./src/features/pulse/pulse.js";
import { isStartupChimeEnabled, setStartupChimeEnabled } from "./src/audio/startup-chime.js";
import { DESIGN_TOKENS } from "./src/design/design-system.js";

console.log("=== INICIANDO TESTES DO VIRTUO EXPERIENCE SYSTEM ===");

// -------------------------------------------------------------
// 1. TESTE DA SAUDAÇÃO DINÂMICA
// -------------------------------------------------------------
console.log("\n[1/6] Testando Saudação Dinâmica...");

// Manhã: 05:00 - 11:59
const morning1 = new Date("2026-09-16T05:00:00");
const morning2 = new Date("2026-09-16T11:59:59");
assert.strictEqual(getGreeting(morning1), "Bom dia", "05:00 deve retornar 'Bom dia'");
assert.strictEqual(getGreeting(morning2), "Bom dia", "11:59 deve retornar 'Bom dia'");

// Tarde: 12:00 - 17:59
const afternoon1 = new Date("2026-09-16T12:00:00");
const afternoon2 = new Date("2026-09-16T17:59:59");
assert.strictEqual(getGreeting(afternoon1), "Boa tarde", "12:00 deve retornar 'Boa tarde'");
assert.strictEqual(getGreeting(afternoon2), "Boa tarde", "17:59 deve retornar 'Boa tarde'");

// Noite: 18:00 - 04:59
const night1 = new Date("2026-09-16T18:00:00");
const night2 = new Date("2026-09-16T23:59:59");
const dawn = new Date("2026-09-16T04:59:59");
assert.strictEqual(getGreeting(night1), "Boa noite", "18:00 deve retornar 'Boa noite'");
assert.strictEqual(getGreeting(night2), "Boa noite", "23:59 deve retornar 'Boa noite'");
assert.strictEqual(getGreeting(dawn), "Boa noite", "04:59 deve retornar 'Boa noite'");

// Dados completos da Home
const homeData = getHomeGreetingData({ displayName: "Nashix Hoo" }, morning1);
assert.strictEqual(homeData.greeting, "Bom dia");
assert.strictEqual(homeData.userName, "Nashix");
assert.strictEqual(homeData.subtitle, "Pronto para sua próxima missão?");
console.log("✓ Saudação Dinâmica: Todas as faixas horárias validadas com sucesso.");

// -------------------------------------------------------------
// 2. TESTE DO VIRTUO PULSE
// -------------------------------------------------------------
console.log("\n[2/6] Testando Virtuo Pulse (Cápsula Flutuante)...");
const pulse = new VirtuoPulseController();

assert.strictEqual(pulse.getState().isActive, false, "Pulse deve iniciar inativo");
assert.strictEqual(pulse.renderContent(), "", "Conteúdo deve ser vazio quando inativo");

// Estado: Música Ativa
let notifiedState = null;
const unsubscribe = pulse.subscribe((st) => {
  notifiedState = st;
});

pulse.setState(PULSE_STATES.SONG_ACTIVE, { id: "demo-1", title: "Raridade", key: "A" });
assert.strictEqual(pulse.getState().isActive, true);
assert.strictEqual(pulse.getState().state, PULSE_STATES.SONG_ACTIVE);
assert.ok(notifiedState && notifiedState.state === PULSE_STATES.SONG_ACTIVE, "Assinante deve ser notificado");

const activeContent = pulse.renderContent();
assert.ok(activeContent.includes("TOCANDO"), "Deve conter badge TOCANDO");
assert.ok(activeContent.includes("Raridade"), "Deve conter o título da música");
assert.ok(activeContent.includes("Tom A"), "Deve conter o tom da música");
assert.ok(activeContent.includes("max-height: 44px"), "Altura máxima deve ser 44px");

// Estado: Ao Vivo
pulse.setState(PULSE_STATES.LIVE, { title: "Culto de Domingo" });
assert.strictEqual(pulse.getState().state, PULSE_STATES.LIVE);
const liveContent = pulse.renderContent();
assert.ok(liveContent.includes("AO VIVO"), "Deve conter badge AO VIVO");

// Estado: Tom Sincronizado
pulse.setState(PULSE_STATES.KEY_SYNCED, { key: "E" });
assert.strictEqual(pulse.getState().state, PULSE_STATES.KEY_SYNCED);
const keyContent = pulse.renderContent();
assert.ok(keyContent.includes("TOM SINCRONIZADO"), "Deve conter badge TOM SINCRONIZADO");

// Clear
pulse.clear();
assert.strictEqual(pulse.getState().isActive, false, "Clear deve desativar a cápsula");
assert.strictEqual(pulse.renderContent(), "");
unsubscribe();
console.log("✓ Virtuo Pulse: Transições de estado, renders e limites de altura validados.");

// -------------------------------------------------------------
// 3. TESTE DE CONFIGURAÇÃO DO SOM DE INICIALIZAÇÃO
// -------------------------------------------------------------
console.log("\n[3/6] Testando Configurações do Som de Inicialização...");
// Mock de localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); }
};

// Default deve ser true
assert.strictEqual(isStartupChimeEnabled(), true, "Por padrão, o som deve ser ativado");

// Desativar
setStartupChimeEnabled(false);
assert.strictEqual(isStartupChimeEnabled(), false, "Deve salvar preferência 'false'");

// Reativar
setStartupChimeEnabled(true);
assert.strictEqual(isStartupChimeEnabled(), true, "Deve salvar preferência 'true'");
console.log("✓ Configuração de Som: Persistência e fallback padrão validados.");

// -------------------------------------------------------------
// 4. TESTE DO DESIGN SYSTEM
// -------------------------------------------------------------
console.log("\n[4/6] Testando Design System Tokens...");
assert.strictEqual(DESIGN_TOKENS.colors.background, "#07101F");
assert.strictEqual(DESIGN_TOKENS.colors.backgroundSecondary, "#0E1B35");
assert.strictEqual(DESIGN_TOKENS.colors.celestialBlue, "#7EE7FF");
assert.strictEqual(DESIGN_TOKENS.colors.white, "#F8FAFC");
assert.strictEqual(DESIGN_TOKENS.colors.goldPremium, "#F5C542");
assert.strictEqual(DESIGN_TOKENS.layout.pulseMaxHeight, "44px");
assert.strictEqual(DESIGN_TOKENS.layout.minTouchTarget, "44px");
console.log("✓ Design System: Cores canônicas, raios e restrições dimensionais validados.");

// -------------------------------------------------------------
// 5. TESTE DA TELA HOJE (4 BLOCOS ESTRUTURAIS)
// -------------------------------------------------------------
console.log("\n[5/6] Testando Tela Hoje (Home Premium em 4 blocos)...");
const hojeHtml = renderHojeScreen({
  currentUser: { displayName: "Nashix Hoo" },
  activeMission: { name: "Culto de Santa Ceia", date: "2026-09-20", songs: [1, 2, 3] },
  lastOpenedSong: { id: "demo-misterio-olaria", title: "Mistério na Olaria", key: "Cm", bpm: 74 },
  firebaseStatus: { connected: true, label: "ONLINE" }
});

assert.ok(hojeHtml.includes("hoje-bloco-saudacao"), "Deve conter Bloco 1: Saudação");
assert.ok(hojeHtml.includes("Pronto para sua próxima missão?"), "Deve conter subtítulo oficial do Bloco 1");
assert.ok(hojeHtml.includes("hoje-bloco-missao"), "Deve conter Bloco 2: Missão Atual");
assert.ok(hojeHtml.includes("Culto de Santa Ceia"), "Deve exibir nome da missão ativa");
assert.ok(hojeHtml.includes("hoje-bloco-continuar"), "Deve conter Bloco 3: Continuar");
assert.ok(hojeHtml.includes("Mistério na Olaria"), "Deve exibir última música aberta");
assert.ok(hojeHtml.includes("hoje-bloco-acoes"), "Deve conter Bloco 4: Ações Rápidas");

// Ações rápidas obrigatórias: Afinador, Cifras, Ensaio, Palco
assert.ok(hojeHtml.includes("hoje-action-tuner"), "Deve conter ação rápida Afinador");
assert.ok(hojeHtml.includes("hoje-action-library"), "Deve conter ação rápida Cifras");
assert.ok(hojeHtml.includes("hoje-action-ensaio"), "Deve conter ação rápida Ensaio");
assert.ok(hojeHtml.includes("hoje-action-palco"), "Deve conter ação rápida Palco");
console.log("✓ Tela Hoje: Estrutura estrita de 4 blocos confirmada sem desvios.");

// -------------------------------------------------------------
// 6. TESTE DE AURA & CSS MICROINTERAÇÕES
// -------------------------------------------------------------
console.log("\n[6/6] Testando Regras de Virtuo Aura e Acessibilidade CSS...");
const auraCss = fs.readFileSync("./src/styles/aura.css", "utf8");
assert.ok(auraCss.includes(".virtuo-aura-culto"), "Deve incluir classe virtuo-aura-culto");
assert.ok(auraCss.includes(".virtuo-aura-mission-completed"), "Deve incluir classe virtuo-aura-mission-completed");
assert.ok(auraCss.includes(".virtuo-aura-sync"), "Deve incluir classe virtuo-aura-sync");
assert.ok(auraCss.includes("prefers-reduced-motion"), "Deve respeitar prefers-reduced-motion");
assert.ok(auraCss.includes("scale(0.96)"), "Deve incluir microinteração em botões com escala");
console.log("✓ Virtuo Aura & CSS: Efeitos sutis e acessibilidade verificados.");

console.log("\n=======================================================");
console.log("  TODOS OS TESTES DO VIRTUO EXPERIENCE SYSTEM PASSARAM! ");
console.log("=======================================================");
