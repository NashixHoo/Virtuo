// =============================================================
// VIRTUO SINGLE ROUTER & SCREEN CONTROLLER
// src/core/router.js
// Controlador centralizado de navegação à prova de falhas com fallback de tela
// =============================================================

import { safeClick } from './safe-click.js';

export class VirtuoRouter {
  constructor() {
    this.currentRoute = 'home';
    this.previousRoute = null;
    this.screens = {};
    this.listeners = [];
    this.isNavigating = false;
    this.fallbackRetries = {};
  }

  /**
   * Registra o mapa de geradores de telas
   * @param {Object} screensMap
   */
  registerScreens(screensMap) {
    this.screens = screensMap;
  }

  /**
   * Inicializa o router e escuta o popstate se necessário
   */
  init() {
    if (typeof window !== 'undefined') {
      window.navigate = (route) => this.navigate(route);
      window.show = (route) => this.navigate(route);
      window._virtuoShow = (route) => this.navigate(route);

      // Sincroniza rota pendente
      if (window._pendingScreen) {
        const pending = window._pendingScreen;
        window._pendingScreen = null;
        this.navigate(pending);
      }
    }
  }

  /**
   * Navega para uma rota canônica com Safe Navigation (redireciona para home se inválida)
   * @param {string} route
   */
  navigate(route) {
    if (!route) {
      console.warn('[Safe Navigation] Rota indefinida interceptada. Redirecionando para home.');
      route = 'home';
    }
    const normalized = (route === 'hoje' || route === 'inicio') ? 'home' : route;

    // BLOCO 5: Safe Navigation — Proteção contra rotas inválidas
    if (this.screens && Object.keys(this.screens).length > 0 && !this.screens[normalized]) {
      console.warn(`[Safe Navigation] Rota inválida '${normalized}' interceptada. Redirecionando para Home com segurança.`);
      return this.navigate('home');
    }

    this.previousRoute = this.currentRoute;
    this.currentRoute = normalized;

    if (typeof window !== 'undefined') {
      window.currentScreen = normalized;

      // Teardown microfones e timers ao sair das telas de áudio
      if (this.previousRoute === 'tuner' && normalized !== 'tuner') {
        if (typeof window.virtuoTuner !== 'undefined' && window.virtuoTuner.stop) {
          window.virtuoTuner.stop();
        }
      }
      if (this.previousRoute === 'vocal' && normalized !== 'vocal') {
        if (typeof window.virtuoVocal !== 'undefined' && window.virtuoVocal.stop) {
          window.virtuoVocal.stop();
        }
      }
      if (this.previousRoute === 'coach' && normalized !== 'coach') {
        if (typeof window.virtuoGuitarCoach !== 'undefined' && window.virtuoGuitarCoach.stop) {
          window.virtuoGuitarCoach.stop();
        }
      }

      // Atualiza fundo contextual com transição otimizada
      const bg = (typeof document !== 'undefined' && typeof document.querySelector === 'function') 
        ? document.querySelector('.background') 
        : null;
      if (bg) {
        bg.className = `background screen-${normalized}`;
      }
    }

    // Renderiza a tela via requestAnimationFrame (Performance 60 FPS)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        this.render();
      });
    } else {
      this.render();
    }

    // Notifica ouvintes
    this.listeners.forEach(fn => {
      try { fn(normalized, this.previousRoute); } catch (e) {}
    });
  }

  /**
   * BLOCO 6: Auto Recovery — Desmonta, limpa listeners e remonta a tela
   */
  recoverScreen(screenName = null) {
    const target = screenName || this.currentRoute;
    console.log(`[Auto Recovery] Iniciando recuperação resiliente para tela: '${target}'`);

    const container = typeof document !== 'undefined' ? document.getElementById('app') : null;
    if (container) {
      // 1. Desmontar
      container.innerHTML = '';
      
      // 2. Limpar listeners / timers pendentes
      // Incrementa ou mantém registro para evitar loop se a tela continuar falhando
      this.fallbackRetries[target] = (this.fallbackRetries[target] || 0) + 1;

      // 3. Montar novamente via requestAnimationFrame
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          this.render();
        });
      } else {
        this.render();
      }
    }
  }

  /**
   * Renderiza a tela atual no container #app com Fallback Resiliente
   */
  render() {
    if (typeof document === 'undefined') return;

    const container = document.getElementById('app');
    if (!container) return;

    try {
      let screenContent = '';
      if (this.screens && this.screens[this.currentRoute] !== undefined) {
        const target = this.screens[this.currentRoute];
        screenContent = typeof target === 'function' ? target() : target;
      } else {
        // Safe navigation fallback se screens não estiver registrado ainda
        screenContent = `<div style="padding:40px 20px; text-align:center;"><h2>Tela em desenvolvimento</h2><button class="button primary" onclick="navigate('home')">Voltar ao Início</button></div>`;
      }

      container.innerHTML = screenContent || '';

      // Reset contador de fallback em caso de sucesso
      delete this.fallbackRetries[this.currentRoute];

      // Transição suave acelerada por hardware
      container.classList.remove('screen-transition-enter');
      void container.offsetWidth; // Força repaint rápido
      container.classList.add('screen-transition-enter');

      // Atualiza TabBar ativa
      this.updateTabBar();
    } catch (renderError) {
      console.error(`[Router Render Error on '${this.currentRoute}']`, renderError);

      const current = this.currentRoute;
      const retryCount = (this.fallbackRetries[current] || 0) + 1;
      this.fallbackRetries[current] = retryCount;

      // BLOCO 1 & BLOCO 7: Tela Elegante "Estamos recuperando o Virtuo"
      container.innerHTML = `
        <div class="glass" style="padding:32px 20px; text-align:center; max-width:480px; margin:40px auto; border-radius:28px; border:1px solid rgba(126,231,255,0.25); box-shadow:0 12px 40px rgba(7,16,31,0.6);">
          <div style="font-size:36px; margin-bottom:12px;">🛡️</div>
          <h3 style="margin:0 0 8px 0; color:#F8FAFC; font-size:18px; font-weight:700;">Estamos recuperando o Virtuo</h3>
          <p style="margin:0 0 20px 0; color:#A9BDD8; font-size:14px; line-height:1.5;">
            Estamos recuperando esta tela. O Virtuo identificou uma oscilação na renderização de <strong>${current}</strong> e está restaurando o estado seguro.
          </p>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button class="button primary" onclick="window.virtuoRouter.recoverScreen('${current}')" style="min-height:44px; padding:10px 20px;">
              🔄 Tentar Novamente
            </button>
            <button class="button secondary" onclick="window.navigate('home')" style="min-height:44px; padding:10px 20px;">
              🏠 Voltar para Início
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Atualiza a TabBar oficial
   */
  updateTabBar() {
    if (typeof document === 'undefined') return;

    const current = this.currentRoute;

    document.querySelectorAll('.tabbar button').forEach((btn) => {
      btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`tab-btn-${current}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Atalhos da barra rápida
    document.querySelectorAll('.quick-toolbar button').forEach((btn) => {
      btn.classList.remove('active');
    });
    const quickBtn = document.getElementById(`quick-btn-${current}`);
    if (quickBtn) {
      quickBtn.classList.add('active');
    }
  }

  /**
   * Adiciona ouvinte de navegação
   */
  onRouteChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  }
}

export const virtuoRouter = new VirtuoRouter();
export const navigate = (route) => virtuoRouter.navigate(route);
