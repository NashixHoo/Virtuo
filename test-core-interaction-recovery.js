// =============================================================
// SUÍTE DE TESTES AUTOMATIZADOS: VIRTUO V2.3 CORE INTERACTION RECOVERY
// test-core-interaction-recovery.js
// Testa: AppBootManager, Router Único, TabBar, Header, SafeClick, UIHealth, Fallback e Performance
// =============================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { appBootManager, AppBootManager } from './src/core/app-boot.js';
import { virtuoRouter, VirtuoRouter, navigate } from './src/core/router.js';
import { safeClick, attachSafeClick } from './src/core/safe-click.js';
import { uiHealthAuditor, UIHealthAuditor } from './src/debug/ui-health.js';

console.log('=================================================');
console.log('🚀 TEST SUITE: VIRTUO V2.3 — CORE INTERACTION RECOVERY');
console.log('=================================================');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}:`, err.message);
    failCount++;
  }
}

// -------------------------------------------------------------
// BLOCO 1: APP BOOT MANAGER
// -------------------------------------------------------------
console.log('\n--- Bloco 1: App Boot Manager (Centralizador e Ordem Canônica) ---');

it('Executa boot em ordem obrigatória (Splash -> Firebase -> Router -> TabBar -> Listeners -> Virtuo AI -> Home)', async () => {
  const customBoot = new AppBootManager();
  let splashCalled = false;
  let firebaseCalled = false;
  let routerCalled = false;
  let tabbarCalled = false;
  let listenersCalled = false;
  let homeCalled = false;

  const steps = await customBoot.boot({
    virtuoSplash: {
      start: (cb) => { splashCalled = true; if (cb) cb(); }
    },
    checkFirebaseConnection: async () => {
      firebaseCalled = true;
      return { ok: true };
    },
    router: {
      init: () => { routerCalled = true; },
      navigate: () => { homeCalled = true; }
    },
    tabbar: {
      init: () => { tabbarCalled = true; }
    },
    initGlobalListeners: () => { listenersCalled = true; },
    virtuoAI: {},
    onHomeReady: () => {}
  });

  assert.strictEqual(splashCalled, true, 'Splash deve ser inicializado');
  assert.strictEqual(firebaseCalled, true, 'Firebase deve ser checado');
  assert.strictEqual(routerCalled, true, 'Router deve ser inicializado');
  assert.strictEqual(tabbarCalled, true, 'TabBar deve ser inicializada');
  assert.strictEqual(listenersCalled, true, 'Listeners globais devem ser registrados');
  assert.strictEqual(homeCalled, true, 'Home deve ser acionada ao final');
  assert.strictEqual(steps.length, 7, 'Devem ser 7 passos de inicialização');
});

it('Não trava caso o Firebase ou Splash apresentem oscilação ou erro', async () => {
  const fallbackBoot = new AppBootManager();
  let homeReached = false;

  const steps = await fallbackBoot.boot({
    virtuoSplash: {
      start: () => { throw new Error('Simulated Splash Error'); }
    },
    checkFirebaseConnection: () => Promise.reject(new Error('Simulated Offline')),
    router: {
      init: () => {},
      navigate: () => { homeReached = true; }
    },
    tabbar: { init: () => {} },
    initGlobalListeners: () => {},
    virtuoAI: {},
    onHomeReady: () => {}
  });

  assert.strictEqual(homeReached, true, 'Home deve ser acionada mesmo com erros intermediários');
  assert.strictEqual(fallbackBoot.bootComplete, true, 'Boot deve completar com tolerância a falhas');
});

// -------------------------------------------------------------
// BLOCO 2 & 7: ROUTER ÚNICO & FALLBACK DE TELAS
// -------------------------------------------------------------
console.log('\n--- Bloco 2 & 7: Router Único, Controle de Telas e Fallback Resiliente ---');

it('Router gerencia navegação centralizada para todas as rotas canônicas', () => {
  const router = new VirtuoRouter();
  const testScreens = {
    home: () => '<div>Home Screen</div>',
    live: () => '<div>Live Screen</div>',
    library: () => '<div>Library Screen</div>',
    profile: () => '<div>Profile Screen</div>'
  };
  router.registerScreens(testScreens);

  router.navigate('live');
  assert.strictEqual(router.currentRoute, 'live', 'currentRoute deve ser live');
  assert.strictEqual(router.previousRoute, 'home', 'previousRoute deve ser home');

  router.navigate('inicio');
  assert.strictEqual(router.currentRoute, 'home', 'Alias inicio deve normalizar para home');

  router.navigate('hoje');
  assert.strictEqual(router.currentRoute, 'home', 'Alias hoje deve normalizar para home');
});

it('Renderiza tela de fallback com "Estamos recuperando esta tela." quando um gerador falha', () => {
  const router = new VirtuoRouter();
  
  // Simula mock container de DOM
  const mockContainer = { innerHTML: '', classList: { remove: () => {}, add: () => {} }, offsetWidth: 100 };
  global.document = {
    getElementById: (id) => id === 'app' ? mockContainer : null,
    querySelectorAll: () => []
  };

  router.registerScreens({
    buggyScreen: () => {
      throw new Error('Falha simulada no módulo');
    }
  });

  router.navigate('buggyScreen');
  assert(mockContainer.innerHTML.includes('Estamos recuperando esta tela.'), 'Deve exibir mensagem de recuperação segura');
  assert(mockContainer.innerHTML.includes('buggyScreen'), 'Deve indicar o nome da tela afetada');
  assert(mockContainer.innerHTML.includes('Tentar Novamente'), 'Deve oferecer botão de nova tentativa');
});

// -------------------------------------------------------------
// BLOCO 3: TABBAR OFICIAL
// -------------------------------------------------------------
console.log('\n--- Bloco 3: TabBar Oficial (Hitbox, 120ms e Halos) ---');

it('Verifica declaração de todos os 7 botões da TabBar no index.html', () => {
  const html = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
  const required = ['home', 'library', 'live', 'ensaio', 'band', 'comunidade', 'profile'];

  required.forEach((r) => {
    assert(html.includes(`id="tab-btn-${r}"`), `Botão tab-btn-${r} deve existir`);
  });
});

it('CSS da TabBar define hitbox de 44px, transição de 120ms e halo ativo', () => {
  const css = fs.readFileSync(path.resolve('./style.css'), 'utf-8');

  assert(css.includes('min-height:44px;') || css.includes('min-height: 44px;'), 'TabBar deve possuir min-height de 44px');
  assert(css.includes('120ms'), 'TabBar deve possuir transição de 120ms');
  assert(css.includes('virtuoPulseHalo'), 'TabBar deve possuir animação de halo para botão ativo');
  assert(css.includes('touch-action:manipulation;') || css.includes('touch-action: manipulation;'), 'TabBar deve ter touch-action manipulation');
});

// -------------------------------------------------------------
// BLOCO 5: SAFE CLICK SYSTEM
// -------------------------------------------------------------
console.log('\n--- Bloco 5: Safe Click System (Anti-Double-Click & Throttle) ---');

it('safeClick previne disparo duplo acidental dentro do cooldown', () => {
  let counter = 0;
  const mockTarget = {};
  const handler = safeClick(() => {
    counter++;
  }, 200);

  // Primeiro clique
  handler({ currentTarget: mockTarget, preventDefault: () => {} });
  assert.strictEqual(counter, 1, 'Primeiro clique deve ser processado');

  // Segundo clique imediato (mesmo elemento)
  handler({ currentTarget: mockTarget, preventDefault: () => {} });
  assert.strictEqual(counter, 1, 'Segundo clique dentro de 200ms deve ser ignorado');
});

it('attachSafeClick anexa listener seguro sem duplicidade', () => {
  let count = 0;
  const listeners = [];
  const mockEl = {
    addEventListener: (type, fn) => { listeners.push(fn); },
    removeEventListener: (type, fn) => {
      const idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    }
  };

  attachSafeClick(mockEl, () => { count++; });
  assert.strictEqual(listeners.length, 1, 'Deve registrar 1 listener');

  // Segunda chamada no mesmo elemento substitui o anterior
  attachSafeClick(mockEl, () => { count += 2; });
  assert.strictEqual(listeners.length, 1, 'Deve substituir o anterior mantendo exatamente 1 listener ativo');
});

// -------------------------------------------------------------
// BLOCO 6: HEADER PREMIUM
// -------------------------------------------------------------
console.log('\n--- Bloco 6: Header Premium & Elementos Superiores ---');

it('Verifica interatividade imediata no Header (Logo, AI Davi, Notificações e Perfil)', () => {
  const html = fs.readFileSync(path.resolve('./index.html'), 'utf-8');

  // 1. Logo navegando para Home
  assert(html.includes("onclick=\"window.navigate('home')\""), 'Logo deve navegar para home');

  // 2. Davi AI
  assert(html.includes("class=\"ai-header-btn\" onclick=\"window.show('ai')\""), 'Davi AI deve possuir click');

  // 3. Sino de Notificações
  assert(html.includes("id=\"header-notif-btn\""), 'Sino de notificações deve possuir ID');
  assert(html.includes("onclick=\"window.show('notifications')\""), 'Sino deve navegar para notifications');

  // 4. Perfil no Header
  assert(html.includes("id=\"header-avatar\"") && html.includes("onclick=\"window.show('profile')\""), 'Avatar deve possuir ID e clique');
});

it('CSS do Header define touch-action: manipulation e feedback visual imediato', () => {
  const css = fs.readFileSync(path.resolve('./style.css'), 'utf-8');

  assert(css.includes('.ai-header-btn:active'), 'ai-header-btn deve ter estado active de toque');
  assert(css.includes('.avatar:active'), 'avatar deve ter estado active de toque');
});

// -------------------------------------------------------------
// BLOCO 4: DIAGNÓSTICO AUTOMÁTICO DE SAÚDE DA UI
// -------------------------------------------------------------
console.log('\n--- Bloco 4: UI Health Auditor (Diagnóstico Automático) ---');

it('uiHealthAuditor instancia e mapeia conformidade', () => {
  const auditor = new UIHealthAuditor({ isDebug: false });
  assert.strictEqual(typeof auditor.audit, 'function', 'audit deve ser uma função');
  const initial = auditor.audit();
  assert(Array.isArray(initial.buttonsWithoutListener), 'buttonsWithoutListener deve ser array');
  assert(Array.isArray(initial.blockingOverlays), 'blockingOverlays deve ser array');
});

// -------------------------------------------------------------
// BLOCO 8: PERFORMANCE (60 FPS, TRANSFORMS, OPACITY)
// -------------------------------------------------------------
console.log('\n--- Bloco 8: Performance 60 FPS (Transforms e Opacity) ---');

it('Valida que as transições da interface e tabbar utilizam transforms e opacity', () => {
  const css = fs.readFileSync(path.resolve('./style.css'), 'utf-8');
  assert(css.includes('transform:scale(') || css.includes('transform: scale('), 'Interações devem usar transform: scale');
  assert(css.includes('transition:transform') || css.includes('transition: transform') || css.includes('transition:all'), 'Transições devem ser aceleradas');
});

console.log('\n=================================================');
console.log(`TOTAL DE TESTES V2.3: ${passCount + failCount}`);
console.log(`PASSOU: ${passCount} | FALHOU: ${failCount}`);
console.log('=================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 VIRTUO V2.3 — CORE INTERACTION RECOVERY HOMOLOGADO COM SUCESSO!\n');
}
