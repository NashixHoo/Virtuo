// =============================================================
// VIRTUO UI — VIRTUO LOADER (VDS V2.2)
// src/components/ui/loader.js
// V oficial metálico girando suavemente (1 volta em 1,2s) com glow azul
// Substitui spinners genéricos
// =============================================================

/**
 * Cria elemento DOM VirtuoLoader
 * @param {Object} props
 * @param {number} [props.size=32] Diâmetro em pixels
 * @param {string} [props.label=''] Texto opcional abaixo do loader
 * @param {string} [props.className='']
 * @param {string} [props.ariaLabel='Carregando...']
 * @returns {HTMLDivElement}
 */
export function VirtuoLoader(props = {}) {
  const {
    size = 32,
    label = '',
    className = '',
    ariaLabel = 'Carregando...'
  } = props;

  const container = document.createElement('div');
  container.className = `inline-flex flex-col items-center justify-center gap-2 ${className}`.trim();
  container.setAttribute('role', 'status');
  container.setAttribute('aria-label', ariaLabel);

  const spinner = document.createElement('div');
  spinner.className = 'virtuo-loader-v';
  spinner.style.width = `${size}px`;
  spinner.style.height = `${size}px`;

  spinner.innerHTML = `
    <svg viewBox="0 0 300 300" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vLoaderGradL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
          <stop offset="50%" stop-color="#7EE7FF"/>
          <stop offset="100%" stop-color="#1A4363"/>
        </linearGradient>
        <linearGradient id="vLoaderGradR" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#E8F8FF"/>
          <stop offset="50%" stop-color="#55ACD4"/>
          <stop offset="100%" stop-color="#0E2D44"/>
        </linearGradient>
      </defs>
      <!-- Haste Esquerda -->
      <path d="M 60 50 L 115 50 L 150 220 L 110 220 Z" fill="url(#vLoaderGradL)"/>
      <!-- Haste Direita com Curva Interna Sutil -->
      <path d="M 240 50 L 185 50 C 170 110, 158 160, 150 220 L 190 220 C 205 160, 220 110, 240 50 Z" fill="url(#vLoaderGradR)"/>
      <!-- Chanfro Inferior -->
      <polygon points="110,220 150,220 190,220 150,250" fill="#7EE7FF"/>
    </svg>
  `;

  container.appendChild(spinner);

  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'virtuo-type-caption text-slate-300';
    labelEl.textContent = label;
    container.appendChild(labelEl);
  }

  return container;
}

/**
 * Gera string HTML do VirtuoLoader
 * @param {Object} props
 * @returns {string}
 */
VirtuoLoader.render = function(props = {}) {
  const {
    size = 32,
    label = '',
    className = '',
    ariaLabel = 'Carregando...'
  } = props;

  const labelHtml = label ? `<span class="virtuo-type-caption text-slate-300">${label}</span>` : '';

  return `
    <div class="inline-flex flex-col items-center justify-center gap-2 ${className}" role="status" aria-label="${ariaLabel}">
      <div class="virtuo-loader-v" style="width: ${size}px; height: ${size}px;">
        <svg viewBox="0 0 300 300" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vLoaderGradL" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
              <stop offset="50%" stop-color="#7EE7FF"/>
              <stop offset="100%" stop-color="#1A4363"/>
            </linearGradient>
            <linearGradient id="vLoaderGradR" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#E8F8FF"/>
              <stop offset="50%" stop-color="#55ACD4"/>
              <stop offset="100%" stop-color="#0E2D44"/>
            </linearGradient>
          </defs>
          <path d="M 60 50 L 115 50 L 150 220 L 110 220 Z" fill="url(#vLoaderGradL)"/>
          <path d="M 240 50 L 185 50 C 170 110, 158 160, 150 220 L 190 220 C 205 160, 220 110, 240 50 Z" fill="url(#vLoaderGradR)"/>
          <polygon points="110,220 150,220 190,220 150,250" fill="#7EE7FF"/>
        </svg>
      </div>
      ${labelHtml}
    </div>
  `.trim();
};
