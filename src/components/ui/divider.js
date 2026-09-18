// =============================================================
// VIRTUO UI — VIRTUO DIVIDER (VDS V2.2)
// src/components/ui/divider.js
// Divisor elegante com gradiente celestial suave
// =============================================================

/**
 * Cria elemento DOM VirtuoDivider
 * @param {Object} props
 * @param {string} [props.label='']
 * @param {'horizontal'|'vertical'} [props.orientation='horizontal']
 * @param {string} [props.className='']
 * @returns {HTMLElement}
 */
export function VirtuoDivider(props = {}) {
  const {
    label = '',
    orientation = 'horizontal',
    className = ''
  } = props;

  if (orientation === 'vertical') {
    const el = document.createElement('div');
    el.className = `w-px h-full bg-gradient-to-b from-transparent via-sky-400/25 to-transparent ${className}`.trim();
    el.setAttribute('role', 'separator');
    el.setAttribute('aria-orientation', 'vertical');
    return el;
  }

  if (label) {
    const container = document.createElement('div');
    container.className = `flex items-center gap-4 my-4 w-full ${className}`.trim();
    container.setAttribute('role', 'separator');
    container.innerHTML = `
      <div class="h-px flex-1 bg-gradient-to-r from-transparent to-sky-400/25"></div>
      <span class="virtuo-type-caption font-semibold text-slate-400 uppercase tracking-widest text-xs">${label}</span>
      <div class="h-px flex-1 bg-gradient-to-l from-transparent to-sky-400/25"></div>
    `;
    return container;
  }

  const hr = document.createElement('hr');
  hr.className = `virtuo-divider ${className}`.trim();
  hr.setAttribute('role', 'separator');
  return hr;
}

/**
 * Gera string HTML do VirtuoDivider
 * @param {Object} props
 * @returns {string}
 */
VirtuoDivider.render = function(props = {}) {
  const {
    label = '',
    orientation = 'horizontal',
    className = ''
  } = props;

  if (orientation === 'vertical') {
    return `<div role="separator" aria-orientation="vertical" class="w-px h-full bg-gradient-to-b from-transparent via-sky-400/25 to-transparent ${className}"></div>`;
  }

  if (label) {
    return `
      <div role="separator" class="flex items-center gap-4 my-4 w-full ${className}">
        <div class="h-px flex-1 bg-gradient-to-r from-transparent to-sky-400/25"></div>
        <span class="virtuo-type-caption font-semibold text-slate-400 uppercase tracking-widest text-xs">${label}</span>
        <div class="h-px flex-1 bg-gradient-to-l from-transparent to-sky-400/25"></div>
      </div>
    `.trim();
  }

  return `<hr role="separator" class="virtuo-divider ${className}" />`;
};
