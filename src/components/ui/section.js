// =============================================================
// VIRTUO UI — VIRTUO SECTION (VDS V2.2)
// src/components/ui/section.js
// Seção canônica com header, título, ação e espaçamento do VDS
// =============================================================

/**
 * Cria elemento DOM VirtuoSection
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {HTMLElement|string} [props.action]
 * @param {HTMLElement|string} [props.children]
 * @param {string} [props.className='']
 * @returns {HTMLElement}
 */
export function VirtuoSection(props = {}) {
  const {
    id = '',
    title = '',
    subtitle = '',
    action = null,
    children = null,
    className = ''
  } = props;

  const section = document.createElement('section');
  if (id) section.id = id;
  section.className = `virtuo-section ${className}`.trim();

  if (title || action) {
    const header = document.createElement('div');
    header.className = 'virtuo-section-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'flex flex-col gap-0.5';

    if (title) {
      const h = document.createElement('h2');
      h.className = 'virtuo-type-title text-xl font-bold tracking-tight';
      h.textContent = title;
      titleGroup.appendChild(h);
    }

    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'virtuo-type-caption text-slate-400';
      sub.textContent = subtitle;
      titleGroup.appendChild(sub);
    }

    header.appendChild(titleGroup);

    if (action) {
      const actionContainer = document.createElement('div');
      actionContainer.className = 'flex items-center gap-2 shrink-0';
      if (typeof action === 'string') {
        actionContainer.innerHTML = action;
      } else if (action instanceof Node) {
        actionContainer.appendChild(action);
      }
      header.appendChild(actionContainer);
    }

    section.appendChild(header);
  }

  if (children) {
    const body = document.createElement('div');
    body.className = 'flex flex-col gap-3 w-full';
    if (typeof children === 'string') {
      body.innerHTML = children;
    } else if (Array.isArray(children)) {
      children.forEach(c => { if (c instanceof Node) body.appendChild(c); });
    } else if (children instanceof Node) {
      body.appendChild(children);
    }
    section.appendChild(body);
  }

  return section;
}

/**
 * Gera string HTML do VirtuoSection
 * @param {Object} props
 * @returns {string}
 */
VirtuoSection.render = function(props = {}) {
  const {
    id = '',
    title = '',
    subtitle = '',
    action = '',
    content = '',
    className = ''
  } = props;

  const idAttr = id ? `id="${id}"` : '';
  const subHtml = subtitle ? `<p class="virtuo-type-caption text-slate-400">${subtitle}</p>` : '';
  const actionHtml = action ? `<div class="flex items-center gap-2 shrink-0">${action}</div>` : '';

  const headerHtml = (title || action) ? `
    <div class="virtuo-section-header">
      <div class="flex flex-col gap-0.5">
        <h2 class="virtuo-type-title text-xl font-bold tracking-tight">${title}</h2>
        ${subHtml}
      </div>
      ${actionHtml}
    </div>
  ` : '';

  return `
    <section ${idAttr} class="virtuo-section ${className}">
      ${headerHtml}
      <div class="flex flex-col gap-3 w-full">
        ${content}
      </div>
    </section>
  `.trim();
};
