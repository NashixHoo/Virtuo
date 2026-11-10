// =============================================================
// VIRTUO UI — VIRTUO TOAST (VDS V2.2)
// src/components/ui/toast.js
// Notificações discretas na posição inferior com auto dismiss
// Exemplos: Tom alterado, Missão criada, Offline, Sincronizado
// =============================================================

class VirtuoToastManager {
  constructor() {
    this.host = null;
  }

  _ensureHost() {
    if (this.host && document.body.contains(this.host)) return this.host;
    if (typeof document === 'undefined') return null;

    let host = document.getElementById('virtuo-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'virtuo-toast-host';
      host.className = 'virtuo-toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    this.host = host;
    return host;
  }

  /**
   * Exibe uma notificação toast
   * @param {Object|string} options
   * @param {string} [options.message]
   * @param {'info'|'success'|'warning'|'offline'|'music'} [options.type='info']
   * @param {number} [options.duration=3000]
   * @param {string} [options.icon]
   * @returns {HTMLElement}
   */
  show(options = {}) {
    const opts = typeof options === 'string' ? { message: options } : options;
    const {
      message = '',
      type = 'info',
      duration = 3000,
      icon = ''
    } = opts;

    const host = this._ensureHost();
    if (!host) return null;

    const toast = document.createElement('div');
    toast.className = 'virtuo-toast';
    toast.setAttribute('role', 'alert');

    const defaultIcons = {
      info: `
        <svg class="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `,
      success: `
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      `,
      warning: `
        <svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      `,
      offline: `
        <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829M9.879 9.879a3 3 0 014.242 0M3 3l18 18"/>
        </svg>
      `,
      music: `
        <svg class="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>
      `
    };

    const iconHtml = icon || defaultIcons[type] || defaultIcons.info;
    toast.innerHTML = `
      <span class="flex items-center justify-center">${iconHtml}</span>
      <span class="virtuo-type-body text-slate-100 font-medium">${message}</span>
    `;

    host.appendChild(toast);

    // Entrada suave em 60 FPS
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    const dismiss = () => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 180);
    };

    let timer = setTimeout(dismiss, duration);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss();
    });

    return toast;
  }

  success(message, duration = 3000) {
    return this.show({ message, type: 'success', duration });
  }

  info(message, duration = 3000) {
    return this.show({ message, type: 'info', duration });
  }

  warning(message, duration = 3500) {
    return this.show({ message, type: 'warning', duration });
  }

  offline(message = 'Modo Offline Ativado', duration = 3000) {
    return this.show({ message, type: 'offline', duration });
  }

  music(message = 'Tom alterado', duration = 2500) {
    return this.show({ message, type: 'music', duration });
  }

  mission(message = 'Missão criada', duration = 3000) {
    return this.show({ message, type: 'success', duration });
  }
}

export const virtuoToast = new VirtuoToastManager();

export function VirtuoToast(options = {}) {
  return virtuoToast.show(options);
}

VirtuoToast.show = (opts) => virtuoToast.show(opts);
VirtuoToast.success = (msg, d) => virtuoToast.success(msg, d);
VirtuoToast.info = (msg, d) => virtuoToast.info(msg, d);
VirtuoToast.warning = (msg, d) => virtuoToast.warning(msg, d);
VirtuoToast.offline = (msg, d) => virtuoToast.offline(msg, d);
VirtuoToast.music = (msg, d) => virtuoToast.music(msg, d);
VirtuoToast.mission = (msg, d) => virtuoToast.mission(msg, d);
