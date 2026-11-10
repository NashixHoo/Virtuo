// =============================================================
// VIRTUO ERROR BOUNDARY GLOBAL & RESILIENCE CONTROLLER
// src/core/error-boundary.js
// Captura erros de renderização, navegação, Firebase e módulos dinâmicos
// Sem tela branca: renderiza tela elegante com Horizon Glow e ações de retorno
// =============================================================

export class VirtuoErrorBoundary {
  constructor() {
    this.hasError = false;
    this.errorLog = [];
    this.maxLogs = 50;
    this.installed = false;
  }

  /**
   * Instala os interceptores globais de erro no window
   */
  install() {
    if (typeof window === 'undefined' || this.installed) return;
    this.installed = true;

    // 1. Intercepta erros síncronos e de execução JS
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error || event.message, 'JavaScript Error');
    });

    // 2. Intercepta Promises não tratadas (ex: Firebase async, dynamic imports)
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason || 'Unhandled Promise Rejection';
      this.handleGlobalError(reason, 'Unhandled Promise');
    });

    console.log('%c[Virtuo Resilience] Error Boundary Global Ativado', 'color:#7EE7FF; font-weight:bold;');
  }

  /**
   * Registra e decide quando intervir na interface
   */
  handleGlobalError(error, source = 'Unknown') {
    const errorDetails = {
      timestamp: Date.now(),
      message: error?.message || String(error),
      stack: error?.stack || null,
      source
    };

    this.errorLog.push(errorDetails);
    if (this.errorLog.length > this.maxLogs) {
      this.errorLog.shift();
    }

    console.warn(`[Virtuo Error Boundary] Interceptado: [${source}]`, errorDetails.message);

    // Se o erro atingir o container da aplicação ou quebrar o fluxo de renderização
    const container = typeof document !== 'undefined' ? document.getElementById('app') : null;
    if (container && (!container.children.length || container.innerHTML.trim() === '')) {
      this.renderRecoveryScreen('Recuperação de Interface');
    }
  }

  /**
   * Renderiza a tela elegante de recuperação resiliente
   * @param {string} [context=""]
   */
  renderRecoveryScreen(context = '') {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('app');
    if (!container) return;

    this.hasError = true;

    container.innerHTML = `
      <section class="glass" style="max-width:520px; margin:40px auto; padding:36px 24px; text-align:center; border-radius:28px; border:1px solid rgba(126,231,255,0.25); box-shadow:0 12px 40px rgba(7,16,31,0.6);">
        <div style="width:64px; height:64px; margin:0 auto 16px; border-radius:20px; background:linear-gradient(135deg, rgba(126,231,255,0.2), rgba(87,169,255,0.1)); display:flex; align-items:center; justify-content:center; border:1px solid rgba(126,231,255,0.3); font-size:32px;">
          🛡️
        </div>
        <h2 style="font-size:22px; font-weight:800; color:#F8FAFC; margin:0 0 8px 0; letter-spacing:0.5px;">
          Estamos recuperando o Virtuo
        </h2>
        <p style="font-size:14px; color:#A9BDD8; line-height:1.6; margin:0 0 24px 0;">
          Uma oscilação pontual foi interceptada com sucesso. Seus dados e cifras continuam seguros offline.
        </p>

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <button class="button primary" onclick="window.virtuoErrorBoundary.retryRecovery()" style="min-height:44px; padding:12px 24px; font-size:14px; font-weight:700;">
            🔄 Tentar novamente
          </button>
          <button class="button secondary" onclick="window.virtuoErrorBoundary.returnHome()" style="min-height:44px; padding:12px 24px; font-size:14px; font-weight:700;">
            🏠 Voltar para Início
          </button>
        </div>
      </section>
    `;
  }

  /**
   * Tenta recuperar a tela atual
   */
  retryRecovery() {
    this.hasError = false;
    if (typeof window !== 'undefined') {
      const current = window.currentScreen || 'home';
      if (typeof window.navigate === 'function') {
        window.navigate(current);
      } else if (typeof window.renderCurrentScreen === 'function') {
        window.renderCurrentScreen();
      }
    }
  }

  /**
   * Retorna com segurança para a tela Home
   */
  returnHome() {
    this.hasError = false;
    if (typeof window !== 'undefined') {
      if (typeof window.navigate === 'function') {
        window.navigate('home');
      } else if (typeof window.show === 'function') {
        window.show('home');
      }
    }
  }

  /**
   * Obtém histórico de erros capturados
   */
  getErrors() {
    return [...this.errorLog];
  }
}

export const virtuoErrorBoundary = new VirtuoErrorBoundary();
if (typeof window !== 'undefined') {
  window.virtuoErrorBoundary = virtuoErrorBoundary;
}
