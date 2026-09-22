// =============================================================
// SUÍTE DE TESTES AUTOMATIZADOS: VIRTUO V2.4 RESILIENCE CORE
// test-resilience-core.js
// Testa: Error Boundary, Watchdog, Smart Cache, Auto Recovery e Safe Navigation
// =============================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { VirtuoErrorBoundary } from './src/core/error-boundary.js';
import { VirtuoFirebaseWatchdog } from './src/core/firebase-watchdog.js';
import { VirtuoSmartCache } from './src/services/smart-cache.js';
import { VirtuoRouter } from './src/core/router.js';
import { VirtuoHealthMonitor } from './src/core/health-monitor.js';
import { debounce, memoize, nextFrame, SafeEventListenerManager } from './src/core/performance-utils.js';

console.log('=================================================');
console.log('🛡️ TEST SUITE: VIRTUO V2.4 — RESILIENCE CORE');
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
// BLOCO 1: ERROR BOUNDARY GLOBAL
// -------------------------------------------------------------
console.log('\n--- Bloco 1: Error Boundary Global ---');

it('Intercepta erros de renderização e registra no log sem tela branca', () => {
  const boundary = new VirtuoErrorBoundary();
  let capturedMessage = '';
  
  // Mock DOM
  const mockContainer = { innerHTML: '', children: [] };
  global.document = {
    getElementById: (id) => id === 'app' ? mockContainer : null
  };

  boundary.handleGlobalError(new Error('Simulated Render Crash'), 'Render Test');
  assert.strictEqual(boundary.hasError, true, 'Deve marcar hasError como true');
  assert(mockContainer.innerHTML.includes('Estamos recuperando o Virtuo'), 'Deve exibir tela com "Estamos recuperando o Virtuo"');
  assert(mockContainer.innerHTML.includes('Tentar novamente'), 'Deve fornecer botão Tentar novamente');
  assert(mockContainer.innerHTML.includes('Voltar para Início'), 'Deve fornecer botão Voltar para Início');
});

it('Fornece funções de recuperação retryRecovery e returnHome', () => {
  const boundary = new VirtuoErrorBoundary();
  let navigatedTo = '';
  global.window = {
    currentScreen: 'live',
    navigate: (route) => { navigatedTo = route; }
  };

  boundary.retryRecovery();
  assert.strictEqual(navigatedTo, 'live', 'retryRecovery deve chamar navigate com a tela atual');

  boundary.returnHome();
  assert.strictEqual(navigatedTo, 'home', 'returnHome deve navegar para home');
});

// -------------------------------------------------------------
// BLOCO 2: HEALTH MONITOR (OWNER)
// -------------------------------------------------------------
console.log('\n--- Bloco 2: Health Monitor (Owner) ---');

it('Monitora métricas e gera relatório estruturado', () => {
  const monitor = new VirtuoHealthMonitor();
  const report = monitor.getReport();

  assert.strictEqual(typeof report.fps, 'number', 'FPS deve ser número');
  assert.strictEqual(typeof report.liveLatencyMs, 'number', 'Latência deve ser número');
  assert(report.timestamp, 'Timestamp deve estar presente');
  assert.strictEqual(typeof monitor.toggleOwnerPanel, 'function', 'Deve permitir alternar painel');
});

// -------------------------------------------------------------
// BLOCO 3: FIREBASE WATCHDOG
// -------------------------------------------------------------
console.log('\n--- Bloco 3: Firebase Watchdog & Auto Recovery ---');

it('Detecta falhas, timeouts e recupera automaticamente', async () => {
  let statesNotified = [];
  const watchdog = new VirtuoFirebaseWatchdog({ checkIntervalMs: 100, timeoutLimitMs: 50 });
  
  watchdog.onStateChange((status) => {
    statesNotified.push(status);
  });

  // Simula queda de rede
  watchdog.handleNetworkChange(false);
  assert.strictEqual(watchdog.isOnline, false, 'Deve identificar estado offline');
  assert(statesNotified.includes('offline'), 'Deve emitir evento offline');

  // Simula recuperação automática
  watchdog.handleRecovery();
  assert.strictEqual(watchdog.isOnline, true, 'Deve restabelecer estado online');
  assert(statesNotified.includes('recovered'), 'Deve emitir evento recovered');
});

// -------------------------------------------------------------
// BLOCO 4: SMART CACHE (LRU, EXPURGO E LIMITE 500)
// -------------------------------------------------------------
console.log('\n--- Bloco 4: Smart Cache (LRU, Expurgo Automático e Limite 500) ---');

it('Implementa LRU e expurgo automático respeitando o limite de 500 músicas', () => {
  const memoryStore = {};
  global.localStorage = {
    getItem: (key) => memoryStore[key] || null,
    setItem: (key, val) => { memoryStore[key] = String(val); },
    removeItem: (key) => { delete memoryStore[key]; }
  };

  const cache = new VirtuoSmartCache({ maxItems: 3, storageKey: 'test_songs', orderKey: 'test_order' });

  // Insere 4 músicas (limite maxItems = 3 para o teste)
  cache.putSong({ id: 's1', title: 'Música 1' });
  cache.putSong({ id: 's2', title: 'Música 2' });
  cache.putSong({ id: 's3', title: 'Música 3' });
  cache.putSong({ id: 's4', title: 'Música 4' });

  assert.strictEqual(cache.getCount(), 3, 'Deve manter no máximo 3 itens');
  assert.strictEqual(cache.getSong('s1'), null, 's1 deve ter sido expurgado pelo LRU');
  assert.notStrictEqual(cache.getSong('s4'), null, 's4 deve estar no cache');
});

it('Pré-carrega repertório de missão no Smart Cache', () => {
  const cache = new VirtuoSmartCache({ maxItems: 500, storageKey: 'test_mission_songs', orderKey: 'test_mission_order' });
  
  const mission = {
    title: 'Culto de Domingo',
    repertoire: [
      { id: 'm1', title: 'Aclame ao Senhor' },
      { id: 'm2', title: 'Porque Ele Vive' }
    ]
  };

  cache.preloadMissionRepertoire(mission);
  assert.strictEqual(cache.getCount(), 2, 'Deve pré-carregar as 2 músicas da missão');
  assert.strictEqual(cache.getSong('m1').title, 'Aclame ao Senhor');
});

// -------------------------------------------------------------
// BLOCO 5: SAFE NAVIGATION
// -------------------------------------------------------------
console.log('\n--- Bloco 5: Safe Navigation (Proteção de Rotas Inválidas) ---');

it('Redireciona rotas inexistentes ou indefinidas para Home sem quebrar o app', () => {
  const router = new VirtuoRouter();
  const mockContainer = { innerHTML: '', classList: { remove: () => {}, add: () => {} }, offsetWidth: 100 };
  global.document = {
    getElementById: (id) => id === 'app' ? mockContainer : null,
    querySelectorAll: () => []
  };

  router.registerScreens({
    home: () => '<div>Home</div>',
    live: () => '<div>Live</div>'
  });

  router.navigate('rota-que-nao-existe-xyz');
  assert.strictEqual(router.currentRoute, 'home', 'Deve redirecionar rota desconhecida para Home');

  router.navigate(null);
  assert.strictEqual(router.currentRoute, 'home', 'Deve redirecionar rota nula para Home');
});

// -------------------------------------------------------------
// BLOCO 6: AUTO RECOVERY
// -------------------------------------------------------------
console.log('\n--- Bloco 6: Auto Recovery (Desmontar -> Limpar -> Remontar) ---');

it('Executa recuperação de tela (desmontar, limpar e remontar) sem recarregar o navegador', () => {
  const router = new VirtuoRouter();
  let renderedCount = 0;

  const mockContainer = { innerHTML: '', classList: { remove: () => {}, add: () => {} }, offsetWidth: 100 };
  global.document = {
    getElementById: (id) => id === 'app' ? mockContainer : null,
    querySelectorAll: () => []
  };

  router.registerScreens({
    home: () => {
      renderedCount++;
      return '<div>Home Screen</div>';
    }
  });

  router.navigate('home');
  assert.strictEqual(renderedCount, 1, 'Deve renderizar inicialmente');

  // Executa Auto Recovery
  router.recoverScreen('home');
  assert.strictEqual(renderedCount, 2, 'Deve remontar a tela com sucesso');
});

// -------------------------------------------------------------
// BLOCO 7: EXPERIÊNCIA PREMIUM (CSS HORIZON GLOW E BADGES)
// -------------------------------------------------------------
console.log('\n--- Bloco 7: Experiência Premium (Glass, Horizon Glow e Badges) ---');

it('Valida declaração das classes CSS premium de feedback e resiliência', () => {
  const css = fs.readFileSync(path.resolve('./style.css'), 'utf-8');

  assert(css.includes('.horizon-glow-card'), 'Deve definir .horizon-glow-card');
  assert(css.includes('.resilience-status-badge'), 'Deve definir .resilience-status-badge');
  assert(css.includes('.resilience-status-badge.reconnecting'), 'Deve definir estado reconnecting');
  assert(css.includes('.resilience-status-badge.synchronized'), 'Deve definir estado synchronized');
});

// -------------------------------------------------------------
// BLOCO 8: PERFORMANCE (DEBOUNCE, MEMOIZE, NEXTFRAME, CLEANUP)
// -------------------------------------------------------------
console.log('\n--- Bloco 8: Performance 60 FPS (Debounce, Memoize, RAF e Cleanup) ---');

it('Testa debounce, memoização e limpeza de listeners', () => {
  // 1. Debounce
  let callCount = 0;
  const debounced = debounce(() => { callCount++; }, 30);
  debounced();
  debounced();
  debounced();
  assert.strictEqual(callCount, 0, 'Não deve chamar imediatamente');

  // 2. Memoize
  let calcCount = 0;
  const memoizedCalc = memoize((a, b) => {
    calcCount++;
    return a + b;
  });

  assert.strictEqual(memoizedCalc(2, 3), 5);
  assert.strictEqual(memoizedCalc(2, 3), 5);
  assert.strictEqual(calcCount, 1, 'Memoize deve computar apenas uma vez para os mesmos argumentos');

  // 3. Listener Cleanup
  const manager = new SafeEventListenerManager();
  let eventsHandled = 0;
  const mockEl = {
    addEventListener: (type, fn) => { mockEl._fn = fn; },
    removeEventListener: () => { mockEl._fn = null; }
  };
  manager.add(mockEl, 'click', () => { eventsHandled++; });
  assert(mockEl._fn, 'Listener deve ser anexado');
  manager.cleanup();
  assert.strictEqual(mockEl._fn, null, 'Cleanup deve remover listeners registrados');
});

// Aguarda conclusão do teste assíncrono
setTimeout(() => {
  console.log('\n=================================================');
  console.log(`TOTAL DE TESTES V2.4: ${passCount + failCount}`);
  console.log(`PASSOU: ${passCount} | FALHOU: ${failCount}`);
  console.log('=================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 VIRTUO V2.4 — RESILIENCE CORE HOMOLOGADO COM SUCESSO!\n');
    process.exit(0);
  }
}, 100);
