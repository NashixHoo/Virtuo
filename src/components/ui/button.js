// =============================================================
// VIRTUO UI — VIRTUO BUTTON (VDS V2.2)
// src/components/ui/button.js
// Variantes: primary, secondary, ghost
// Estados: normal, pressed, disabled, loading (120ms)
// Touch target mínimo: 44px
// =============================================================

import { VirtuoLoader } from "./loader.js";

/**
 * Cria elemento DOM VirtuoButton
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.className]
 * @param {string} [props.label='']
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.icon=''] SVG ou HTML string
 * @param {string} [props.iconPosition='left'] 'left' | 'right'
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {Function} [props.onClick]
 * @param {string} [props.type='button']
 * @param {string} [props.ariaLabel]
 * @returns {HTMLButtonElement}
 */
export function VirtuoButton(props = {}) {
  const {
    id = '',
    className = '',
    label = '',
    variant = 'primary',
    size = 'md',
    icon = '',
    iconPosition = 'left',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    ariaLabel = ''
  } = props;

  const btn = document.createElement('button');
  btn.type = type;
  if (id) btn.id = id;

  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 min-h-[36px]',
    md: 'text-sm py-2.5 px-5 min-h-[44px]',
    lg: 'text-base py-3.5 px-6 min-h-[50px]'
  };

  const variantClass = `virtuo-btn-${variant}`;
  btn.className = `virtuo-btn ${variantClass} ${sizeClasses[size] || sizeClasses.md} ${className}`.trim();
  
  if (ariaLabel || label) {
    btn.setAttribute('aria-label', ariaLabel || label);
  }

  btn.disabled = !!disabled;
  if (disabled) btn.classList.add('is-disabled');
  if (loading) btn.classList.add('is-loading');

  const updateContent = (isLoading) => {
    btn.innerHTML = '';
    
    if (isLoading) {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      spinner.innerHTML = VirtuoLoader.render({ size: 20 });
      btn.appendChild(spinner);
    } else {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
    }

    const contentWrapper = document.createElement('span');
    contentWrapper.className = 'btn-content inline-flex items-center gap-2';

    if (icon && iconPosition === 'left') {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-icon';
      iconSpan.innerHTML = icon;
      contentWrapper.appendChild(iconSpan);
    }

    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'btn-label';
      labelSpan.textContent = label;
      contentWrapper.appendChild(labelSpan);
    }

    if (icon && iconPosition === 'right') {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-icon';
      iconSpan.innerHTML = icon;
      contentWrapper.appendChild(iconSpan);
    }

    btn.appendChild(contentWrapper);
  };

  updateContent(loading);

  if (onClick && typeof onClick === 'function') {
    btn.addEventListener('click', (e) => {
      if (btn.disabled || btn.classList.contains('is-loading')) {
        e.preventDefault();
        return;
      }
      onClick(e);
    });
  }

  // Métodos dinâmicos auxiliares
  btn.setLoading = (isLoading) => {
    updateContent(isLoading);
  };

  btn.setDisabled = (isDisabled) => {
    btn.disabled = !!isDisabled;
    if (isDisabled) {
      btn.classList.add('is-disabled');
    } else {
      btn.classList.remove('is-disabled');
    }
  };

  btn.setLabel = (newLabel) => {
    const labelSpan = btn.querySelector('.btn-label');
    if (labelSpan) {
      labelSpan.textContent = newLabel;
    }
  };

  return btn;
}

/**
 * Gera string HTML do VirtuoButton
 * @param {Object} props
 * @returns {string}
 */
VirtuoButton.render = function(props = {}) {
  const {
    id = '',
    className = '',
    label = '',
    variant = 'primary',
    size = 'md',
    icon = '',
    iconPosition = 'left',
    disabled = false,
    loading = false,
    type = 'button',
    ariaLabel = '',
    dataAttributes = ''
  } = props;

  const idAttr = id ? `id="${id}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const disabledClass = disabled ? 'is-disabled' : '';
  const loadingClass = loading ? 'is-loading' : '';
  const variantClass = `virtuo-btn-${variant}`;
  const ariaAttr = (ariaLabel || label) ? `aria-label="${ariaLabel || label}"` : '';
  
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 min-h-[36px]',
    md: 'text-sm py-2.5 px-5 min-h-[44px]',
    lg: 'text-base py-3.5 px-6 min-h-[50px]'
  };

  const classes = `virtuo-btn ${variantClass} ${sizeClasses[size] || sizeClasses.md} ${disabledClass} ${loadingClass} ${className}`.trim();

  let leftIconHtml = (icon && iconPosition === 'left') ? `<span class="btn-icon">${icon}</span>` : '';
  let rightIconHtml = (icon && iconPosition === 'right') ? `<span class="btn-icon">${icon}</span>` : '';
  let spinnerHtml = loading ? `<span class="btn-spinner">${VirtuoLoader.render({ size: 20 })}</span>` : '';

  return `
    <button 
      type="${type}" 
      ${idAttr} 
      class="${classes}" 
      ${disabledAttr} 
      ${ariaAttr} 
      ${dataAttributes}
    >
      ${spinnerHtml}
      <span class="btn-content inline-flex items-center gap-2">
        ${leftIconHtml}
        <span class="btn-label">${label}</span>
        ${rightIconHtml}
      </span>
    </button>
  `.trim();
};
