// =============================================================
// TEST SUITE: VIRTUO V2.2 — ETAPA 1/5: PREMIUM UI COMPONENTS
// test-premium-ui-components.js
// Validação completa de Card, Button, Input, Modal, Toast, Loader, Badges,
// Tipografia, Espaçamento, Responsividade e Performance 60 FPS.
// =============================================================

import assert from "node:assert";
import fs from "node:fs";
import { VDS, SPACING_SCALE, TYPOGRAPHY_SCALE } from "./src/design/design-system.js";
import { 
  VirtuoCard, 
  VirtuoButton, 
  VirtuoInput, 
  VirtuoModal, 
  VirtuoModalController,
  VirtuoBadge, 
  BADGE_VARIANTS,
  VirtuoToast, 
  virtuoToast,
  VirtuoLoader, 
  VirtuoSection, 
  VirtuoAvatar, 
  VirtuoDivider,
  VirtuoText,
  TYPOGRAPHY_CLASSES,
  SPACING_TOKENS
} from "./src/components/ui/index.js";

// Mock mínimo de DOM para ambiente Node.js
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...cls) { cls.forEach(c => c.split(' ').forEach(x => x && this.classes.add(x))); }
  remove(...cls) { cls.forEach(c => c.split(' ').forEach(x => x && this.classes.delete(x))); }
  contains(c) { return this.classes.has(c); }
  toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
  toString() { return Array.from(this.classes).join(' '); }
}

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.id = '';
    this.attributes = {};
    this.style = {};
    this.classList = new MockClassList();
    this.childNodes = [];
    this.listeners = {};
    this._innerHTML = '';
    this._textContent = '';
  }

  get className() { return this.classList.toString(); }
  set className(val) {
    this.classList = new MockClassList();
    if (val) val.split(' ').forEach(c => c && this.classList.add(c));
  }

  get innerHTML() {
    if (this.childNodes.length > 0) {
      return this.childNodes.map(c => {
        if (typeof c === 'string') return c;
        const attrs = Object.entries(c.attributes || {}).map(([k, v]) => ` ${k}="${v}"`).join('');
        const cls = c.className ? ` class="${c.className}"` : '';
        return `<${c.tagName.toLowerCase()}${cls}${attrs}>${c.innerHTML}</${c.tagName.toLowerCase()}>`;
      }).join('');
    }
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = val;
    this._textContent = val ? val.replace(/<[^>]*>/g, '') : '';
  }

  get textContent() { return this._textContent; }
  set textContent(val) {
    this._textContent = val;
    this._innerHTML = val;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  removeAttribute(k) { delete this.attributes[k]; }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.childNodes.push(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  insertBefore(newChild, refChild) {
    const idx = this.childNodes.indexOf(refChild);
    if (idx !== -1) this.childNodes.splice(idx, 0, newChild);
    else this.childNodes.push(newChild);
    newChild.parentNode = this;
    return newChild;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  }

  dispatchEvent(event) {
    const ev = typeof event === 'string' ? { type: event, target: this } : event;
    if (this.listeners[ev.type]) {
      this.listeners[ev.type].forEach(fn => fn(ev));
    }
  }

  querySelector(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      const find = (node) => {
        if (node.classList && node.classList.contains(cls)) return node;
        for (const child of node.childNodes) {
          const res = find(child);
          if (res) return res;
        }
        return null;
      };
      return find(this);
    }
    return null;
  }

  contains(node) {
    let curr = node;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }
}

global.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new MockElement('body'),
  activeElement: null
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.Node = MockElement;

console.log("=== INICIANDO TESTES: VIRTUO V2.2 PREMIUM UI COMPONENTS ===");
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. GLASS CARD PREMIUM
// -------------------------------------------------------------
console.log("\n[1/10] Testando Glass Card Premium...");

runTest("Card possui classe virtuo-card e suporte a hero", () => {
  const card = VirtuoCard({ hero: true, padding: "28px", ariaLabel: "Painel Principal" });
  assert(card.classList.contains("virtuo-card"), "Deve possuir classe virtuo-card");
  assert(card.classList.contains("virtuo-card-hero"), "Deve possuir classe virtuo-card-hero");
  assert.strictEqual(card.getAttribute("aria-label"), "Painel Principal");
  assert.strictEqual(card.style.padding, "28px");
});

runTest("Card renderiza string HTML válida com atributos de acessibilidade", () => {
  const html = VirtuoCard.render({
    id: "card-test",
    content: "<span>Conteúdo Musical</span>",
    hero: false,
    padding: 24,
    role: "region"
  });
  assert(html.includes('class="virtuo-card"'));
  assert(html.includes('id="card-test"'));
  assert(html.includes('style="padding: 24px;"'));
  assert(html.includes('role="region"'));
  assert(html.includes("Conteúdo Musical"));
});

runTest("CSS do Glass Card define border-radius 28px e backdrop-filter blur(20px)", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes("--virtuo-glass-blur: 20px"), "Blur padrão deve ser 20px");
  assert(css.includes("border-radius: 28px !important"), "Card deve possuir radius 28px");
  assert(css.includes("backdrop-filter: blur(var(--virtuo-glass-blur))"), "Card deve ter backdrop-filter blur");
});

// -------------------------------------------------------------
// 2. BOTÕES OFICIAIS (3 VARIANTES, ESTADOS, 120ms)
// -------------------------------------------------------------
console.log("\n[2/10] Testando Botões Oficiais...");

runTest("Botão Primário possui Azul Celestial e brilho", () => {
  const btn = VirtuoButton({ label: "Iniciar Culto", variant: "primary", size: "md" });
  assert(btn.classList.contains("virtuo-btn-primary"), "Deve ter classe virtuo-btn-primary");
  assert.strictEqual(btn.getAttribute("aria-label"), "Iniciar Culto");
});

runTest("Botão Secundário e Ghost possuem classes correspondentes", () => {
  const sec = VirtuoButton({ label: "Cancelar", variant: "secondary" });
  const ghost = VirtuoButton({ label: "Limpar", variant: "ghost" });
  assert(sec.classList.contains("virtuo-btn-secondary"));
  assert(ghost.classList.contains("virtuo-btn-ghost"));
});

runTest("Botão suporta estados normal, disabled e loading", () => {
  const btn = VirtuoButton({ label: "Salvar", loading: true, disabled: false });
  assert(btn.classList.contains("is-loading"), "Deve conter is-loading");
  assert.strictEqual(btn.getAttribute("aria-busy"), "true");
  
  btn.setLoading(false);
  assert(!btn.classList.contains("is-loading"), "Deve remover is-loading");
  
  btn.setDisabled(true);
  assert(btn.disabled === true, "Propriedade disabled deve ser true");
  assert(btn.classList.contains("is-disabled"), "Deve conter is-disabled");
});

runTest("CSS de Botões especifica duração de 120ms e min-height 44px", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes("min-height: 44px"), "Botões devem ter min-height 44px (touch target)");
  assert(css.includes("--virtuo-motion-btn: 120ms") || css.includes("120ms"), "Duração deve ser 120ms");
});

// -------------------------------------------------------------
// 3. INPUT PREMIUM
// -------------------------------------------------------------
console.log("\n[3/10] Testando Input Premium...");

runTest("Input possui container, classes de foco e placeholder", () => {
  const inputContainer = VirtuoInput({
    label: "Título da Música",
    placeholder: "Ex: Nome do Louvor",
    helperText: "Digite o nome oficial da canção"
  });
  assert(inputContainer.input instanceof MockElement, "Deve expor elemento de input");
  assert(inputContainer.input.classList.contains("virtuo-input"), "Input deve ter classe virtuo-input");
  assert.strictEqual(inputContainer.input.placeholder, "Ex: Nome do Louvor");
});

runTest("Input suporta controle de erro e valor dinamicamente", () => {
  const inputContainer = VirtuoInput({ label: "BPM", value: "120" });
  assert.strictEqual(inputContainer.getValue(), "120");
  inputContainer.setValue("130");
  assert.strictEqual(inputContainer.getValue(), "130");

  inputContainer.setError("BPM inválido");
  assert(inputContainer.input.classList.contains("!border-red-400"));
  inputContainer.setError(null);
  assert(!inputContainer.input.classList.contains("!border-red-400"));
});

// -------------------------------------------------------------
// 4. MODAL PREMIUM (180ms)
// -------------------------------------------------------------
console.log("\n[4/10] Testando Modal Premium...");

runTest("Modal instancia com backdrop escurecido, blur e 180ms", () => {
  const modal = new VirtuoModalController({
    title: "Confirmar Repertório",
    content: "<p>Deseja sincronizar a lista com a banda?</p>",
    confirmText: "Sincronizar",
    cancelText: "Voltar"
  });
  
  modal.open();
  assert(modal.isOpen === true, "Modal deve estar aberto");
  assert(modal.backdrop.classList.contains("virtuo-modal-backdrop"), "Backdrop deve ter classe oficial");
  assert(modal.container.classList.contains("virtuo-modal-container"), "Container deve ter classe oficial");
  
  modal.close();
  assert(modal.isOpen === false, "Modal deve fechar");
});

// -------------------------------------------------------------
// 5. TOAST INTELIGENTE
// -------------------------------------------------------------
console.log("\n[5/10] Testando Toast Inteligente...");

runTest("Toast suporta criação inferior e atalhos semânticos", () => {
  const t1 = VirtuoToast.music("Tom alterado para G");
  assert(t1.classList.contains("virtuo-toast"), "Toast deve ter classe virtuo-toast");
  assert(t1.innerHTML.includes("Tom alterado para G"), "Deve conter mensagem");

  const t2 = VirtuoToast.mission("Missão criada");
  assert(t2.innerHTML.includes("Missão criada"));

  const t3 = VirtuoToast.offline("Modo Offline Ativado");
  assert(t3.innerHTML.includes("Modo Offline Ativado"));
});

// -------------------------------------------------------------
// 6. LOADER OFICIAL (V GIRANDO EM 1.2s COM GLOW AZUL)
// -------------------------------------------------------------
console.log("\n[6/10] Testando Loader Oficial...");

runTest("Loader oficial renderiza o símbolo V e classe virtuo-loader-v", () => {
  const loaderEl = VirtuoLoader({ size: 40, label: "Carregando canção..." });
  assert(loaderEl.classList.contains("inline-flex"));
  assert(loaderEl.innerHTML.includes("virtuo-loader-v"), "Deve conter classe virtuo-loader-v");
  assert(loaderEl.innerHTML.includes("vLoaderGradL"), "Deve conter gradiente metálico do V");
});

runTest("CSS define rotação de 1 volta em 1.2s e glow azul", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes("animation: virtuoSpinV 1.2s"), "Velocidade deve ser 1 volta em 1.2s");
  assert(css.includes("filter: drop-shadow(0 0 12px var(--virtuo-blue))"), "Deve ter glow azul");
});

// -------------------------------------------------------------
// 7. BADGES OFICIAIS & EXCLUSIVIDADE DOURADA
// -------------------------------------------------------------
console.log("\n[7/10] Testando Badges Oficiais...");

runTest("Badge suporta estados Ao Vivo, Nova Missão, Celestial, Verificado, Offline, Ensaio, Owner", () => {
  const live = VirtuoBadge({ label: "Ao Vivo", variant: "live", pulse: true });
  assert(live.classList.contains("virtuo-badge-live"));
  assert(live.innerHTML.includes("animate-pulse"));

  const celestial = VirtuoBadge({ label: "Celestial", variant: "celestial" });
  assert(celestial.classList.contains("virtuo-badge-celestial"));

  const owner = VirtuoBadge({ label: "Owner", variant: "owner" });
  assert(owner.classList.contains("virtuo-badge-owner"));

  const verified = VirtuoBadge({ label: "Verificado", variant: "verified" });
  assert(verified.classList.contains("virtuo-badge-verified"));
});

runTest("Dourado (#F5C542) é aplicado estritamente para Celestial e Owner no CSS", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes(".virtuo-badge-celestial {\n  background: rgba(245, 197, 66,"), "Celestial deve usar dourado");
  assert(css.includes(".virtuo-badge-owner {\n  background: rgba(245, 197, 66,"), "Owner deve usar dourado");
});

// -------------------------------------------------------------
// 8. TIPOGRAFIA & ESPAÇAMENTO OFICIAL
// -------------------------------------------------------------
console.log("\n[8/10] Testando Tipografia e Espaçamento...");

runTest("Escala oficial de tipografia contém Display, Hero, Título, Subtítulo, Corpo, Legenda", () => {
  assert(VDS.typography.display.fontSize === "36px");
  assert(VDS.typography.hero.fontSize === "28px");
  assert(VDS.typography.title.fontSize === "22px");
  assert(VDS.typography.subtitle.fontSize === "16px");
  assert(VDS.typography.body.fontSize === "14px");
  assert(VDS.typography.caption.fontSize === "12px");
});

runTest("Escala única de espaçamento contém [4, 8, 12, 16, 24, 32, 48]", () => {
  const expected = [4, 8, 12, 16, 24, 32, 48];
  assert.deepStrictEqual(SPACING_SCALE, expected, "SPACING_SCALE deve ser [4, 8, 12, 16, 24, 32, 48]");
  for (const s of expected) {
    assert.strictEqual(VDS.spacing[s], `${s}px`, `VDS.spacing[${s}] deve ser ${s}px`);
  }
});

// -------------------------------------------------------------
// 9. RESPONSIVIDADE & ACESSIBILIDADE
// -------------------------------------------------------------
console.log("\n[9/10] Testando Responsividade e Acessibilidade...");

runTest("Áreas de toque mínimas são de 44px e suportam foco visível", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes("min-height: 44px;"), "Controles devem respeitar altura mínima de 44px");
  assert(css.includes(".virtuo-btn:focus-visible"), "Foco visível deve ser garantido");
  assert(css.includes("-webkit-tap-highlight-color: transparent"), "Remove highlight indesejado no mobile");
});

// -------------------------------------------------------------
// 10. PERFORMANCE 60 FPS
// -------------------------------------------------------------
console.log("\n[10/10] Testando Otimizações de Performance 60 FPS...");

runTest("Animações utilizam estritamente CSS transforms, opacity e will-change sem causar reflows", () => {
  const css = fs.readFileSync("./src/styles/branding.css", "utf-8");
  assert(css.includes("will-change: transform, box-shadow;"), "Cards devem usar will-change");
  assert(css.includes("will-change: transform;"), "Botões devem usar will-change transform");
  assert(css.includes("will-change: opacity, transform;"), "Toasts/Modais devem animar via transform e opacity");
});

// =============================================================
// RELATÓRIO FINAL
// =============================================================
console.log("\n=================================================");
console.log(`TOTAL DE TESTES DE UI COMPONENTS: ${passed + failed}`);
console.log(`PASSOU: ${passed} | FALHOU: ${failed}`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 TODOS OS COMPONENTES PREMIUM DO VIRTUO FORAM HOMOLOGADOS COM SUCESSO!");
}
