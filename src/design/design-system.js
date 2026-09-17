// =============================================================
// VIRTUO EXPERIENCE SYSTEM — DESIGN SYSTEM TOKENS
// src/design/design-system.js
// Padrão de tokens visuais oficiais e imutáveis da Virtuo V2
// =============================================================

export const DESIGN_TOKENS = {
  colors: {
    background: '#07101F',
    backgroundSecondary: '#0E1B35',
    celestialBlue: '#7EE7FF',
    white: '#F8FAFC',
    goldPremium: '#F5C542',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(126, 231, 255, 0.35)',
    borderGold: 'rgba(245, 197, 66, 0.40)',
    cardBg: 'rgba(14, 27, 53, 0.70)',
    cardHover: 'rgba(18, 35, 68, 0.85)'
  },
  radii: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    pill: '9999px'
  },
  shadows: {
    subtle: '0 2px 10px rgba(0, 0, 0, 0.25)',
    card: '0 4px 20px rgba(0, 0, 0, 0.35)',
    cardHover: '0 8px 30px rgba(0, 0, 0, 0.45)',
    celestialGlow: '0 0 24px rgba(126, 231, 255, 0.22)',
    goldGlow: '0 0 24px rgba(245, 197, 66, 0.25)',
    floatingPulse: '0 6px 24px rgba(0, 0, 0, 0.50)'
  },
  spacing: {
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  transitions: {
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '160ms cubic-bezier(0.16, 1, 0.3, 1)',
    screen: '180ms ease-out',
    spring: '180ms cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  layout: {
    pulseMaxHeight: '44px',
    minTouchTarget: '44px',
    containerMaxWidth: '1120px'
  }
};

/**
 * Utilitário para aplicar classes de tema ou estilos em runtime
 */
export function getComputedToken(category, key) {
  return DESIGN_TOKENS[category]?.[key] || null;
}
