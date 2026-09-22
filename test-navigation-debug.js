// =============================================================
// TEST NAVIGATION DEBUG & ROUTING
// test-navigation-debug.js
// Testa detecção de rotas, overlays e elementos sem listener
// =============================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { NavigationDebugger } from './src/debug/navigation-debug.js';

console.log('🧪 Iniciando teste do Modo Diagnóstico de Navegação...');

// 1. Instanciação e verificação de métodos
const dbg = new NavigationDebugger({ enabled: true });
assert.strictEqual(typeof dbg.init, 'function', 'init deve ser uma função');
assert.strictEqual(typeof dbg.instrumentAll, 'function', 'instrumentAll deve ser uma função');
assert.strictEqual(typeof dbg.detectOverlays, 'function', 'detectOverlays deve ser uma função');
assert.strictEqual(typeof dbg.testRoutes, 'function', 'testRoutes deve ser uma função');
assert.strictEqual(typeof dbg.hasInteractiveListener, 'function', 'hasInteractiveListener deve ser uma função');
console.log('✅ NavigationDebugger instanciado com sucesso.');

// 2. Teste de detecção de listeners interativos
const mockElWithOnclick = { onclick: () => {}, getAttribute: (attr) => attr === 'onclick' ? 'show()' : null };
assert.strictEqual(dbg.hasInteractiveListener(mockElWithOnclick), true, 'Deve reconhecer inline onclick');

const mockElWithHref = { tagName: 'A', getAttribute: (attr) => attr === 'href' ? '/home' : null };
assert.strictEqual(dbg.hasInteractiveListener(mockElWithHref), true, 'Deve reconhecer link href');

const mockElWithDataRoute = { tagName: 'DIV', dataset: { route: 'home' }, getAttribute: () => null };
assert.strictEqual(dbg.hasInteractiveListener(mockElWithDataRoute), true, 'Deve reconhecer data-route');

const mockElWithoutListener = { tagName: 'BUTTON', getAttribute: () => null };
assert.strictEqual(dbg.hasInteractiveListener(mockElWithoutListener), false, 'Deve identificar botão sem listener');
console.log('✅ Detecção de manipuladores interativos validada.');

// 3. Teste de rotas do Router Virtuo
const executedRoutes = [];
const mockRouter = (name) => {
  executedRoutes.push(name);
};

const routeTestResult = dbg.testRoutes(mockRouter);
assert.strictEqual(routeTestResult.tested, 8, 'Deve testar as 8 rotas canônicas');
assert.strictEqual(routeTestResult.broken.length, 0, 'Nenhuma rota canônica deve estar quebrada');
assert.deepStrictEqual(executedRoutes, [
  'home',
  'live',
  'missions',
  'library',
  'ensaio',
  'band',
  'comunidade',
  'profile'
]);
console.log('✅ Todas as 8 rotas canônicas (Início, Live, Missões, Biblioteca, Ensaio, Banda, Comunidade, Perfil) foram executadas com sucesso.');

// 4. Verificação estática do index.html (TabBar e botões principais)
const indexHtml = fs.readFileSync(path.resolve('./index.html'), 'utf-8');

const requiredTabbarButtons = [
  { id: 'tab-btn-home', route: 'home' },
  { id: 'tab-btn-library', route: 'library' },
  { id: 'tab-btn-live', route: 'live' },
  { id: 'tab-btn-ensaio', route: 'ensaio' },
  { id: 'tab-btn-band', route: 'band' },
  { id: 'tab-btn-comunidade', route: 'comunidade' },
  { id: 'tab-btn-profile', route: 'profile' }
];

requiredTabbarButtons.forEach(btn => {
  assert(indexHtml.includes(`id="${btn.id}"`), `Botão ${btn.id} deve existir no index.html`);
  assert(indexHtml.includes(`onclick="window.show('${btn.route}')"`), `Botão ${btn.id} deve chamar show('${btn.route}')`);
});
console.log('✅ Todos os botões da TabBar estão devidamente declarados com onclick apontando para suas rotas.');

// 5. Verificação de ausência de overlays bloqueantes no CSS / DOM inicial
assert(!indexHtml.includes('pointer-events: auto; z-index: 999999'), 'Não deve haver overlay rogue no index.html');
console.log('✅ Nenhum overlay bloqueante detectado nas estruturas estáticas.');

console.log('🎉 Todos os testes de diagnóstico de navegação passaram com êxito!');
