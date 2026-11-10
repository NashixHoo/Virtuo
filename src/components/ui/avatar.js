// =============================================================
// VIRTUO UI — VIRTUO AVATAR (VDS V2.2)
// src/components/ui/avatar.js
// Avatar oficial com borda azul e glow sutil
// =============================================================

/**
 * Cria elemento DOM VirtuoAvatar
 * @param {Object} props
 * @param {string} [props.src='']
 * @param {string} [props.name='']
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {string} [props.className='']
 * @returns {HTMLDivElement}
 */
export function VirtuoAvatar(props = {}) {
  const {
    src = '',
    name = '',
    size = 'md',
    className = ''
  } = props;

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const avatar = document.createElement('div');
  avatar.className = `virtuo-avatar ${sizeMap[size] || sizeMap.md} ${className}`.trim();
  avatar.setAttribute('aria-label', name || 'Avatar do usuário');

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name || 'Avatar';
    img.className = 'w-full h-full object-cover';
    img.loading = 'lazy';
    img.onerror = () => {
      // Fallback para iniciais caso imagem falhe
      avatar.innerHTML = '';
      avatar.textContent = getInitials(name);
    };
    avatar.appendChild(img);
  } else {
    avatar.textContent = getInitials(name);
  }

  return avatar;
}

function getInitials(name) {
  if (!name) return 'V';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Gera string HTML do VirtuoAvatar
 * @param {Object} props
 * @returns {string}
 */
VirtuoAvatar.render = function(props = {}) {
  const {
    src = '',
    name = '',
    size = 'md',
    className = ''
  } = props;

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const initials = getInitials(name);
  const content = src 
    ? `<img src="${src}" alt="${name || 'Avatar'}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="display:none;" class="w-full h-full items-center justify-center">${initials}</span>`
    : `<span>${initials}</span>`;

  return `
    <div class="virtuo-avatar ${sizeMap[size] || sizeMap.md} ${className}" aria-label="${name || 'Avatar do usuário'}">
      ${content}
    </div>
  `.trim();
};
