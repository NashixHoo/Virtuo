// =============================================================
// VIRTUO BRAND KIT V3 — BRANDING EXPORT
// src/design/branding.js
// =============================================================

import { VDS, DESIGN_TOKENS, VIRTUO_PALETTE, BRAND_ASSETS, getComputedToken } from "./design-system.js";
import { HorizonWaveManager } from "./horizon-wave.js";

export { VDS, DESIGN_TOKENS, VIRTUO_PALETTE, BRAND_ASSETS, getComputedToken, HorizonWaveManager };

export const VIRTUO_BRAND_SYSTEM = {
  vds: VDS,
  tokens: DESIGN_TOKENS,
  palette: VIRTUO_PALETTE,
  assets: BRAND_ASSETS,
  horizonWave: HorizonWaveManager
};

export default VIRTUO_BRAND_SYSTEM;
