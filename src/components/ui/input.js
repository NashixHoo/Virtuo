// =============================================================
// VIRTUO UI — VIRTUO INPUT (VDS V2.2)
// src/components/ui/input.js
// Campos elegantes com borda azul e glow suave ao focar
// Placeholder cinza claro, min-height 44px
// =============================================================

/**
 * Cria elemento DOM VirtuoInput com container, rótulo e tratamento de erros
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.name]
 * @param {string} [props.type='text']
 * @param {string} [props.value='']
 * @param {string} [props.placeholder='']
 * @param {string} [props.label='']
 * @param {string} [props.helperText='']
 * @param {string} [props.error='']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 * @param {string} [props.className='']
 * @param {Function} [props.onInput]
 * @param {Function} [props.onChange]
 * @param {string} [props.icon=''] SVG de ícone inicial
 * @returns {HTMLDivElement}
 */
export function VirtuoInput(props = {}) {
  const {
    id = `virtuo-input-${Math.random().toString(36).substring(2, 9)}`,
    name = '',
    type = 'text',
    value = '',
    placeholder = '',
    label = '',
    helperText = '',
    error = '',
    disabled = false,
    required = false,
    className = '',
    onInput,
    onChange,
    icon = ''
  } = props;

  const container = document.createElement('div');
  container.className = `flex flex-col gap-1.5 w-full ${className}`.trim();

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.className = 'virtuo-type-caption font-semibold text-slate-300 flex items-center justify-between';
    labelEl.innerHTML = `
      <span>${label} ${required ? '<span class="text-sky-400">*</span>' : ''}</span>
    `;
    container.appendChild(labelEl);
  }

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'relative flex items-center w-full';

  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center';
    iconSpan.innerHTML = icon;
    inputWrapper.appendChild(iconSpan);
  }

  const input = document.createElement('input');
  input.id = id;
  input.name = name || id;
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.disabled = disabled;
  input.required = required;
  input.className = `virtuo-input ${icon ? 'pl-10' : ''} ${error ? '!border-red-400 !shadow-[0_0_12px_rgba(239,68,68,0.3)]' : ''}`.trim();

  if (onInput && typeof onInput === 'function') {
    input.addEventListener('input', (e) => onInput(e.target.value, e));
  }
  if (onChange && typeof onChange === 'function') {
    input.addEventListener('change', (e) => onChange(e.target.value, e));
  }

  inputWrapper.appendChild(input);
  container.appendChild(inputWrapper);

  const feedbackEl = document.createElement('div');
  feedbackEl.className = 'virtuo-type-caption text-xs min-h-[16px] transition-opacity duration-150';
  if (error) {
    feedbackEl.textContent = error;
    feedbackEl.classList.add('text-red-400');
  } else if (helperText) {
    feedbackEl.textContent = helperText;
    feedbackEl.classList.add('text-slate-400');
  }
  container.appendChild(feedbackEl);

  // Helper APIs no elemento retornado
  container.input = input;
  container.getValue = () => input.value;
  container.setValue = (val) => { input.value = val; };
  container.setError = (err) => {
    if (err) {
      input.classList.add('!border-red-400', '!shadow-[0_0_12px_rgba(239,68,68,0.3)]');
      feedbackEl.textContent = err;
      feedbackEl.className = 'virtuo-type-caption text-xs min-h-[16px] text-red-400';
    } else {
      input.classList.remove('!border-red-400', '!shadow-[0_0_12px_rgba(239,68,68,0.3)]');
      feedbackEl.textContent = helperText;
      feedbackEl.className = 'virtuo-type-caption text-xs min-h-[16px] text-slate-400';
    }
  };

  return container;
}

/**
 * Gera string HTML do VirtuoInput
 * @param {Object} props
 * @returns {string}
 */
VirtuoInput.render = function(props = {}) {
  const {
    id = `virtuo-input-${Math.random().toString(36).substring(2, 9)}`,
    name = '',
    type = 'text',
    value = '',
    placeholder = '',
    label = '',
    helperText = '',
    error = '',
    disabled = false,
    required = false,
    className = '',
    icon = '',
    dataAttributes = ''
  } = props;

  const disabledAttr = disabled ? 'disabled' : '';
  const requiredAttr = required ? 'required' : '';
  const errorClass = error ? '!border-red-400 !shadow-[0_0_12px_rgba(239,68,68,0.3)]' : '';
  const iconPadding = icon ? 'pl-10' : '';

  const labelHtml = label ? `
    <label for="${id}" class="virtuo-type-caption font-semibold text-slate-300 flex items-center justify-between">
      <span>${label} ${required ? '<span class="text-sky-400">*</span>' : ''}</span>
    </label>
  ` : '';

  const iconHtml = icon ? `
    <span class="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
      ${icon}
    </span>
  ` : '';

  const feedbackHtml = error ? `
    <span class="virtuo-type-caption text-xs text-red-400">${error}</span>
  ` : (helperText ? `
    <span class="virtuo-type-caption text-xs text-slate-400">${helperText}</span>
  ` : '');

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${labelHtml}
      <div class="relative flex items-center w-full">
        ${iconHtml}
        <input 
          id="${id}" 
          name="${name || id}" 
          type="${type}" 
          value="${value}" 
          placeholder="${placeholder}" 
          class="virtuo-input ${iconPadding} ${errorClass}" 
          ${disabledAttr} 
          ${requiredAttr} 
          ${dataAttributes}
        />
      </div>
      <div class="min-h-[16px]">${feedbackHtml}</div>
    </div>
  `.trim();
};
