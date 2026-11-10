// =============================================================
// VIRTUO UI — VIRTUO BADGE (VDS V2.2)
// src/components/ui/badge.js
// Badges oficiais: Ao Vivo, Nova Missão, Celestial, Verificado, Offline, Ensaio, Owner
// Dourado (#F5C542) exclusivo para Celestial e Owner
// =============================================================

export const BADGE_VARIANTS = {
  LIVE: 'live',
  MISSION: 'mission',
  CELESTIAL: 'celestial',
  VERIFIED: 'verified',
  OFFLINE: 'offline',
  REHEARSAL: 'rehearsal',
  OWNER: 'owner'
};

/**
 * Cria elemento DOM VirtuoBadge
 * @param {Object} props
 * @param {string} [props.label='']
 * @param {'live'|'mission'|'celestial'|'verified'|'offline'|'rehearsal'|'owner'} [props.variant='mission']
 * @param {string} [props.icon='']
 * @param {boolean} [props.pulse=false]
 * @param {string} [props.className='']
 * @returns {HTMLSpanElement}
 */
export function VirtuoBadge(props = {}) {
  const {
    label = '',
    variant = 'mission',
    icon = '',
    pulse = (variant === 'live'),
    className = ''
  } = props;

  const badge = document.createElement('span');
  const variantClass = `virtuo-badge-${variant}`;
  badge.className = `virtuo-badge ${variantClass} ${className}`.trim();

  if (pulse) {
    const dot = document.createElement('span');
    dot.className = 'w-2 h-2 rounded-full bg-current animate-pulse';
    badge.appendChild(dot);
  }

  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'flex items-center justify-center';
    iconSpan.innerHTML = icon;
    badge.appendChild(iconSpan);
  }

  if (label) {
    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    badge.appendChild(textSpan);
  }

  return badge;
}

/**
 * Gera string HTML do VirtuoBadge
 * @param {Object} props
 * @returns {string}
 */
VirtuoBadge.render = function(props = {}) {
  const {
    label = '',
    variant = 'mission',
    icon = '',
    pulse = (variant === 'live'),
    className = ''
  } = props;

  const variantClass = `virtuo-badge-${variant}`;
  const pulseDotHtml = pulse ? '<span class="w-2 h-2 rounded-full bg-current animate-pulse"></span>' : '';
  const iconHtml = icon ? `<span class="flex items-center justify-center">${icon}</span>` : '';

  return `
    <span class="virtuo-badge ${variantClass} ${className}">
      ${pulseDotHtml}
      ${iconHtml}
      <span>${label}</span>
    </span>
  `.trim();
};
