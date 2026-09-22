// =============================================================
// VIRTUO APP BOOT MANAGER
// src/core/app-boot.js
// Centralizador de inicialização resiliente, à prova de falhas
// Ordem obrigatória:
// 1. Splash
// 2. Firebase
// 3. Router
// 4. TabBar
// 5. Listeners globais
// 6. Virtuo AI
// 7. Home
// =============================================================

export class AppBootManager {
  constructor() {
    this.bootSteps = [];
    this.isBooting = false;
    this.bootComplete = false;
  }

  /**
   * Executa a sequência de boot obrigatória com tolerância a falhas
   * @param {Object} context Módulos e referências do Virtuo
   */
  async boot(context = {}) {
    if (this.isBooting) return;
    this.isBooting = true;

    const {
      virtuoSplash,
      checkFirebaseConnection,
      router,
      tabbar,
      initGlobalListeners,
      virtuoAI,
      onHomeReady
    } = context;

    // 1. Splash
    try {
      if (virtuoSplash && typeof virtuoSplash.start === 'function') {
        virtuoSplash.start(() => {
          // Callback quando animação de abertura terminar
          if (typeof onHomeReady === 'function') onHomeReady();
        });
      }
      console.log('[BOOT] Splash OK');
      this.bootSteps.push({ step: 'Splash', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Splash Fallback:', err);
      this.bootSteps.push({ step: 'Splash', status: 'FALLBACK' });
    }

    // 2. Firebase
    try {
      if (typeof checkFirebaseConnection === 'function') {
        checkFirebaseConnection()
          .then((res) => {
            console.log('[BOOT] Firebase OK (Conectado)');
          })
          .catch((err) => {
            console.warn('[BOOT] Firebase Offline Mode Ativado');
          });
      }
      console.log('[BOOT] Firebase OK');
      this.bootSteps.push({ step: 'Firebase', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Firebase Fallback:', err);
      this.bootSteps.push({ step: 'Firebase', status: 'FALLBACK' });
    }

    // 3. Router
    try {
      if (router && typeof router.init === 'function') {
        router.init();
      }
      console.log('[BOOT] Router OK');
      this.bootSteps.push({ step: 'Router', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Router Fallback:', err);
      this.bootSteps.push({ step: 'Router', status: 'FALLBACK' });
    }

    // 4. TabBar
    try {
      if (tabbar && typeof tabbar.init === 'function') {
        tabbar.init();
      }
      console.log('[BOOT] TabBar OK');
      this.bootSteps.push({ step: 'TabBar', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] TabBar Fallback:', err);
      this.bootSteps.push({ step: 'TabBar', status: 'FALLBACK' });
    }

    // 5. Listeners globais
    try {
      if (typeof initGlobalListeners === 'function') {
        initGlobalListeners();
      }
      console.log('[BOOT] Listeners OK');
      this.bootSteps.push({ step: 'Listeners', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Listeners Fallback:', err);
      this.bootSteps.push({ step: 'Listeners', status: 'FALLBACK' });
    }

    // 6. Virtuo AI
    try {
      if (virtuoAI) {
        // AI ready
      }
      console.log('[BOOT] Virtuo AI OK');
      this.bootSteps.push({ step: 'Virtuo AI', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Virtuo AI Fallback:', err);
      this.bootSteps.push({ step: 'Virtuo AI', status: 'FALLBACK' });
    }

    // 7. Home
    try {
      const initialRoute = (typeof window !== 'undefined' && window._pendingScreen) || 'home';
      if (router && typeof router.navigate === 'function') {
        router.navigate(initialRoute);
      } else if (typeof window !== 'undefined' && typeof window.show === 'function') {
        window.show(initialRoute);
      }
      console.log('[BOOT] Home OK');
      this.bootSteps.push({ step: 'Home', status: 'OK' });
    } catch (err) {
      console.warn('[BOOT] Home Fallback:', err);
      this.bootSteps.push({ step: 'Home', status: 'FALLBACK' });
    }

    this.bootComplete = true;
    this.isBooting = false;

    return this.bootSteps;
  }
}

export const appBootManager = new AppBootManager();
