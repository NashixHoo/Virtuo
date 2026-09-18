// =============================================================
// VIRTUO UI — VIRTUO MODAL (VDS V2.2)
// src/components/ui/modal.js
// Modal oficial com fundo escurecido, blur profundo e transição 180ms
// =============================================================

import { VirtuoButton } from "./button.js";

export class VirtuoModalController {
  constructor(options = {}) {
    this.options = {
      id: `virtuo-modal-${Math.random().toString(36).substring(2, 9)}`,
      title: '',
      content: '',
      confirmText: '',
      cancelText: '',
      onConfirm: null,
      onCancel: null,
      onClose: null,
      showClose: true,
      closeOnBackdrop: true,
      closeOnEsc: true,
      size: 'md', // 'sm' | 'md' | 'lg'
      ...options
    };

    this.backdrop = null;
    this.container = null;
    this.isOpen = false;
    this.previousActiveElement = null;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Abre o modal com animação suave de 180ms
   */
  open() {
    if (this.isOpen) return this;
    if (typeof document === 'undefined') return this;

    this.previousActiveElement = document.activeElement;

    this.backdrop = document.createElement('div');
    this.backdrop.id = this.options.id;
    this.backdrop.className = 'virtuo-modal-backdrop';
    this.backdrop.setAttribute('role', 'dialog');
    this.backdrop.setAttribute('aria-modal', 'true');
    if (this.options.title) {
      this.backdrop.setAttribute('aria-labelledby', `${this.options.id}-title`);
    }

    const maxWidthClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl'
    };

    this.container = document.createElement('div');
    this.container.className = `virtuo-modal-container ${maxWidthClasses[this.options.size] || 'max-w-lg'}`;

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-6 border-b border-sky-400/20';
    
    const titleEl = document.createElement('h3');
    titleEl.id = `${this.options.id}-title`;
    titleEl.className = 'virtuo-type-title text-lg font-bold text-white';
    titleEl.textContent = this.options.title;
    header.appendChild(titleEl);

    if (this.options.showClose) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'text-slate-400 hover:text-white p-2 rounded-lg transition-colors';
      closeBtn.setAttribute('aria-label', 'Fechar modal');
      closeBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      `;
      closeBtn.addEventListener('click', () => this.close('close-button'));
      header.appendChild(closeBtn);
    }
    this.container.appendChild(header);

    // Body Content
    const body = document.createElement('div');
    body.className = 'p-6 max-h-[70vh] overflow-y-auto text-slate-200 text-sm leading-relaxed';
    if (typeof this.options.content === 'string') {
      body.innerHTML = this.options.content;
    } else if (this.options.content instanceof Node) {
      body.appendChild(this.options.content);
    }
    this.container.appendChild(body);

    // Footer
    if (this.options.confirmText || this.options.cancelText) {
      const footer = document.createElement('div');
      footer.className = 'flex items-center justify-end gap-3 p-6 border-t border-sky-400/15 bg-slate-900/40';

      if (this.options.cancelText) {
        const cancelBtn = VirtuoButton({
          label: this.options.cancelText,
          variant: 'secondary',
          size: 'md',
          onClick: () => {
            if (this.options.onCancel) this.options.onCancel();
            this.close('cancel');
          }
        });
        footer.appendChild(cancelBtn);
      }

      if (this.options.confirmText) {
        const confirmBtn = VirtuoButton({
          label: this.options.confirmText,
          variant: 'primary',
          size: 'md',
          onClick: async () => {
            if (this.options.onConfirm) {
              const res = await this.options.onConfirm();
              if (res === false) return;
            }
            this.close('confirm');
          }
        });
        footer.appendChild(confirmBtn);
      }

      this.container.appendChild(footer);
    }

    this.backdrop.appendChild(this.container);

    if (this.options.closeOnBackdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close('backdrop');
        }
      });
    }

    document.body.appendChild(this.backdrop);
    document.body.style.overflow = 'hidden';

    // Dispara animação de entrada (180ms)
    requestAnimationFrame(() => {
      this.backdrop.classList.add('is-open');
    });

    if (this.options.closeOnEsc) {
      document.addEventListener('keydown', this._handleKeyDown);
    }

    this.isOpen = true;
    return this;
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close('escape');
    }
  }

  /**
   * Fecha o modal com animação suave de 180ms
   */
  close(reason = 'programmatic') {
    if (!this.isOpen || !this.backdrop) return;

    this.isOpen = false;
    this.isClosing = true;
    this.backdrop.classList.remove('is-open');
    document.removeEventListener('keydown', this._handleKeyDown);

    setTimeout(() => {
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      document.body.style.overflow = '';
      this.isClosing = false;
      this.backdrop = null;
      this.container = null;

      if (this.options.onClose) {
        this.options.onClose(reason);
      }

      if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
        this.previousActiveElement.focus();
      }
    }, 180);
  }
}

/**
 * Atalho estático para abrir modais com comodidade
 */
export function VirtuoModal(options = {}) {
  const modal = new VirtuoModalController(options);
  return modal.open();
}

VirtuoModal.open = function(options = {}) {
  const modal = new VirtuoModalController(options);
  return modal.open();
};
