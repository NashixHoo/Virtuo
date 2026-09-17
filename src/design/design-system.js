// =============================================================
// VIRTUO BRAND KIT V3 — DESIGN SYSTEM OFICIAL
// src/design/design-system.js
// Central de tokens visuais, paleta congelada, sombras, bordas e motion
// =============================================================

export const VIRTUO_PALETTE = {
  background: '#07101F',
  backgroundSecondary: '#0E1B35',
  celestialBlue: '#7EE7FF',
  white: '#F8FAFC',
  premiumGold: '#F5C542'
};

export const DESIGN_TOKENS = {
  colors: {
    background: VIRTUO_PALETTE.background,
    backgroundSecondary: VIRTUO_PALETTE.backgroundSecondary,
    celestialBlue: VIRTUO_PALETTE.celestialBlue,
    white: VIRTUO_PALETTE.white,
    premiumGold: VIRTUO_PALETTE.premiumGold,
    goldPremium: VIRTUO_PALETTE.premiumGold, // compatibilidade
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    borderSubtle: 'rgba(126, 231, 255, 0.15)',
    borderActive: 'rgba(126, 231, 255, 0.45)',
    borderGold: 'rgba(245, 197, 66, 0.40)',
    cardBg: 'rgba(14, 27, 53, 0.65)',
    cardHover: 'rgba(18, 35, 68, 0.85)',
    glassBg: 'rgba(14, 27, 53, 0.55)'
  },
  radii: {
    xs: '4px',
    sm: '12px',
    md: '18px',
    lg: '28px',
    xl: '32px',
    pill: '9999px'
  },
  shadows: {
    subtle: '0 2px 10px rgba(0, 0, 0, 0.25)',
    card: '0 4px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(126, 231, 255, 0.08)',
    cardHover: '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 24px rgba(126, 231, 255, 0.16)',
    glass: '0 0 32px rgba(126, 231, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.45)',
    celestialGlow: '0 0 24px rgba(126, 231, 255, 0.35)',
    horizonGlow: '0 0 45px rgba(126, 231, 255, 0.45)',
    goldGlow: '0 0 24px rgba(245, 197, 66, 0.35)',
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
  animation: {
    button: '120ms',
    card: '150ms',
    pulse: '140ms',
    screen: '180ms',
    splash: '1400ms',
    wave: '600ms',
    auraCycle: '10s' // Ciclo entre 8s e 12s
  },
  motion: {
    button: '120ms',
    card: '150ms',
    pulse: '140ms',
    screen: '180ms',
    splash: '1400ms',
    wave: '600ms',
    auraCycle: '10s'
  },
  transitions: {
    button: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    card: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    pulse: '140ms ease',
    screen: '180ms cubic-bezier(0.16, 1, 0.3, 1)',
    wave: '600ms cubic-bezier(0.16, 1, 0.3, 1)',
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    spring: '180ms cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  layout: {
    pulseMaxHeight: '44px',
    minTouchTarget: '44px',
    containerMaxWidth: '1120px'
  }
};

// Objeto VDS oficial requerido pelo Brand Kit
export const VDS = {
  colors: {
    background: DESIGN_TOKENS.colors.background,
    backgroundSecondary: DESIGN_TOKENS.colors.backgroundSecondary,
    celestialBlue: DESIGN_TOKENS.colors.celestialBlue,
    white: DESIGN_TOKENS.colors.white,
    premiumGold: DESIGN_TOKENS.colors.premiumGold
  },
  radius: {
    sm: DESIGN_TOKENS.radii.sm,
    md: DESIGN_TOKENS.radii.md,
    lg: DESIGN_TOKENS.radii.lg
  },
  animation: {
    button: DESIGN_TOKENS.animation.button,
    card: DESIGN_TOKENS.animation.card,
    pulse: DESIGN_TOKENS.animation.pulse,
    screen: DESIGN_TOKENS.animation.screen,
    splash: DESIGN_TOKENS.animation.splash
  }
};

export const BRAND_ASSETS = {
  logos: {
    principal: "assets/branding/logo/logo-principal.svg",
    iconSquare: "assets/branding/logo/logo-icon-square.svg",
    iconCircle: "assets/branding/logo/logo-icon-circle.svg",
    favicon: "assets/branding/logo/favicon.svg",
    splash: "assets/branding/logo/logo-splash.svg",
    monochrome: "assets/branding/logo/logo-monochrome.svg",
    white: "assets/branding/logo/logo-white.svg",
    blue: "assets/branding/logo/logo-blue.svg"
  },
  backgrounds: {
    home: "assets/backgrounds/virtuo-background-home.svg",
    splash: "assets/backgrounds/virtuo-background-splash.svg",
    missions: "assets/backgrounds/virtuo-background-missions.svg",
    live: "assets/backgrounds/virtuo-background-live.svg",
    login: "assets/backgrounds/virtuo-background-login.svg"
  },
  icons: {
    afinador: "assets/branding/icons/afinador.svg",
    vocal: "assets/branding/icons/vocal.svg",
    missoes: "assets/branding/icons/missoes.svg",
    live: "assets/branding/icons/live.svg",
    maestro: "assets/branding/icons/maestro.svg",
    banda: "assets/branding/icons/banda.svg",
    cifras: "assets/branding/icons/cifras.svg",
    perfil: "assets/branding/icons/perfil.svg",
    configuracoes: "assets/branding/icons/configuracoes.svg",
    biblioteca: "assets/branding/icons/biblioteca.svg"
  }
};

/**
 * Utilitário para aplicar classes de tema ou estilos em runtime
 */
export function getComputedToken(category, key) {
  return DESIGN_TOKENS[category]?.[key] || null;
}
