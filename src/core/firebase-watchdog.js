// =============================================================
// VIRTUO FIREBASE WATCHDOG & AUTO-RECOVERY
// src/core/firebase-watchdog.js
// Detecção contínua de conexão, timeout e recuperação automática do Firestore/Auth
// =============================================================

export class VirtuoFirebaseWatchdog {
  constructor(options = {}) {
    this.checkIntervalMs = options.checkIntervalMs || 15000;
    this.timeoutLimitMs = options.timeoutLimitMs || 8000;
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.timer = null;
    this.listeners = [];
  }

  /**
   * Inicia o monitoramento inteligente
   */
  start(checkFn = null) {
    if (typeof window === 'undefined') return;

    // 1. Escuta eventos nativos de conectividade do navegador
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    this.checkFn = checkFn;

    this.timer = setInterval(() => {
      this.pingFirebase();
    }, this.checkIntervalMs);

    console.log('[Virtuo Watchdog] Firebase Watchdog ativo.');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Realiza verificação periódica com proteção de timeout
   */
  async pingFirebase() {
    if (!navigator.onLine) {
      this.handleNetworkChange(false);
      return;
    }

    if (typeof this.checkFn === 'function') {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Watchdog Ping Timeout')), this.timeoutLimitMs)
        );

        await Promise.race([this.checkFn(), timeoutPromise]);
        
        if (!this.isOnline) {
          this.handleRecovery();
        }
      } catch (err) {
        console.warn('[Virtuo Watchdog] Falha de comunicação com Firebase:', err.message);
        this.handleFailure();
      }
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    this.notify(online ? 'online' : 'offline');

    if (online) {
      this.handleRecovery();
    } else {
      this.showStatusToast('Você está offline. Músicas salvas continuam disponíveis.', 'warning');
    }
  }

  handleFailure() {
    this.reconnectAttempts++;
    this.isOnline = false;
    this.notify('degraded');

    if (this.reconnectAttempts === 1) {
      this.showStatusToast('Reconectando aos serviços do Virtuo...', 'info');
    }
  }

  handleRecovery() {
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.notify('recovered');

    this.showStatusToast('✓ Sincronizado com Firestore', 'success');

    // Se houver uploads pendentes, processa silenciosamente
    if (typeof window !== 'undefined' && typeof window.processPendingUploads === 'function') {
      window.processPendingUploads().catch(() => {});
    }
  }

  showStatusToast(message, type = 'info') {
    if (typeof window !== 'undefined' && window.VirtuoToast) {
      if (type === 'success' && window.VirtuoToast.success) window.VirtuoToast.success(message);
      else if (type === 'warning' && window.VirtuoToast.warning) window.VirtuoToast.warning(message);
      else if (window.VirtuoToast.info) window.VirtuoToast.info(message);
    }
  }

  onStateChange(fn) {
    if (typeof fn === 'function') this.listeners.push(fn);
  }

  notify(status) {
    this.listeners.forEach(fn => {
      try { fn(status, this.isOnline); } catch (e) {}
    });
  }
}

export const virtuoFirebaseWatchdog = new VirtuoFirebaseWatchdog();
