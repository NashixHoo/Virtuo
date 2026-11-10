// =============================================================
// VIRTUO UI — VIRTUO CARD (VDS V2.2)
// src/components/ui/card.js
// Vidro fosco, blur 20px, borda azul discreta, glow suave, radius 28px
// =============================================================

/**
 * Cria elemento DOM VirtuoCard
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.className]
 * @param {string|HTMLElement|Array<HTMLElement>} [props.children]
 * @param {string} [props.content]
 * @param {Function} [props.onClick]
 * @param {boolean} [props.hero=false]
 * @param {string|number} [props.padding='24px']
 * @param {string} [props.ariaLabel]
 * @returns {HTMLDivElement}
 */
export function VirtuoCard(props = {}) {
  const {
    id = '',
    className = '',
    children,
    content = '',
    onClick,
    hero = false,
    padding = '24px',
    ariaLabel = ''
  } = props;

  const card = document.createElement('div');
  if (id) card.id = id;
  
  const baseClasses = ['virtuo-card'];
  if (hero) baseClasses.push('virtuo-card-hero');
  if (onClick) baseClasses.push('cursor-pointer');
  if (className) baseClasses.push(className);
  card.className = baseClasses.join(' ');

  if (padding) {
    card.style.padding = typeof padding === 'number' ? `${padding}px` : padding;
  }

  if (ariaLabel) {
    card.setAttribute('aria-label', ariaLabel);
  }

  if (onClick && typeof onClick === 'function') {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    });
  }

  if (children) {
    if (typeof children === 'string') {
      card.innerHTML = children;
    } else if (Array.isArray(children)) {
      children.forEach((child) => {
        if (child instanceof Node) card.appendChild(child);
      });
    } else if (children instanceof Node) {
      card.appendChild(children);
    }
  } else if (content) {
    card.innerHTML = content;
  }

  return card;
}

/**
 * Gera string HTML do VirtuoCard
 * @param {Object} props
 * @returns {string}
 */
VirtuoCard.render = function(props = {}) {
  const {
    id = '',
    className = '',
    content = '',
    hero = false,
    padding = '24px',
    ariaLabel = '',
    role = '',
    tabindex = '',
    dataAttributes = ''
  } = props;

  const idAttr = id ? `id="${id}"` : '';
  const heroClass = hero ? 'virtuo-card-hero' : '';
  const classes = `virtuo-card ${heroClass} ${className}`.trim();
  const paddingStyle = padding ? `padding: ${typeof padding === 'number' ? padding + 'px' : padding};` : '';
  const ariaAttr = ariaLabel ? `aria-label="${ariaLabel}"` : '';
  const roleAttr = role ? `role="${role}"` : '';
  const tabAttr = tabindex !== '' ? `tabindex="${tabindex}"` : '';

  return `
    <div 
      ${idAttr} 
      class="${classes}" 
      style="${paddingStyle}" 
      ${ariaAttr} 
      ${roleAttr} 
      ${tabAttr} 
      ${dataAttributes}
    >
      ${content}
    </div>
  `.trim();
};
