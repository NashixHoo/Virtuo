// =============================================================
// VIRTUO UI — VIRTUO TYPOGRAPHY & SPACING (VDS V2.2)
// src/components/ui/typography.js
// Escala tipográfica oficial e escala de espaçamento canônica
// =============================================================

export const TYPOGRAPHY_VARIANTS = {
  DISPLAY: 'display',
  HERO: 'hero',
  TITLE: 'title',
  SUBTITLE: 'subtitle',
  BODY: 'body',
  CAPTION: 'caption'
};

export const TYPOGRAPHY_CLASSES = {
  display: 'virtuo-type-display font-black tracking-tight',
  hero: 'virtuo-type-hero font-extrabold tracking-tight',
  title: 'virtuo-type-title font-bold tracking-normal',
  subtitle: 'virtuo-type-subtitle font-semibold tracking-normal',
  body: 'virtuo-type-body font-normal tracking-normal',
  caption: 'virtuo-type-caption font-normal tracking-wide'
};

export const SPACING_TOKENS = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  24: '24px',
  32: '32px',
  48: '48px'
};

/**
 * Cria elemento tipográfico
 * @param {Object} props
 * @param {'display'|'hero'|'title'|'subtitle'|'body'|'caption'} [props.variant='body']
 * @param {string} [props.as] Tag HTML customizada ('h1','h2','p','span', etc)
 * @param {string} [props.text='']
 * @param {string} [props.className='']
 * @returns {HTMLElement}
 */
export function VirtuoText(props = {}) {
  const {
    variant = 'body',
    as = '',
    text = '',
    className = ''
  } = props;

  const defaultTags = {
    display: 'h1',
    hero: 'h1',
    title: 'h2',
    subtitle: 'h3',
    body: 'p',
    caption: 'span'
  };

  const tag = as || defaultTags[variant] || 'p';
  const el = document.createElement(tag);
  el.className = `${TYPOGRAPHY_CLASSES[variant] || TYPOGRAPHY_CLASSES.body} ${className}`.trim();
  el.textContent = text;
  return el;
}
