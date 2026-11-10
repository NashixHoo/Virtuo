// =============================================================
// VIRTUO — MEU EQUIPAMENTO (GEAR SCHEMA)
// src/features/gear/gear-schema.js
// Requisitos 21 e 22: Cadastro e organização de instrumentos, periféricos e acessórios.
// Foco estrito em gestão prática do músico (zero recursos de rede social).
// =============================================================

export const GEAR_CATEGORIES = {
  INSTRUMENT: { id: "instrument", label: "Instrumento", icon: "🎸" },
  STRINGS: { id: "strings", label: "Cordas & Encordoamento", icon: "🧵" },
  PEDALS: { id: "pedals", label: "Pedaleira / Pedais / Efeitos", icon: "🎛️" },
  AMPLIFIER: { id: "amplifier", label: "Amplificador / Caixa / Monitor", icon: "🔊" },
  ACCESSORY: { id: "accessory", label: "Cabos, Afinadores & Acessórios", icon: "🔌" }
};

export const COMMON_STRING_GAUGES = [
  "0.009 - 0.042 (Super Light)",
  "0.010 - 0.046 (Regular Light)",
  "0.011 - 0.049 (Medium)",
  "0.012 - 0.053 (Acoustic Light)",
  "0.013 - 0.056 (Acoustic Medium)",
  "0.040 - 0.100 (Bass 4 cordas Light)",
  "0.045 - 0.105 (Bass 4 cordas Regular)",
  "0.045 - 0.130 (Bass 5 cordas)"
];

export const STANDARD_TUNINGS = [
  "E Standard (E A D G B E)",
  "Drop D (D A D G B E)",
  "Eb / Meio Tom Abaixo (Eb Ab Db Gb Bb Eb)",
  "D Standard (D G C F A D)",
  "Open D (D A D F# A D)",
  "Open G (D G D G B D)",
  "Bass Standard (E A D G)",
  "Bass 5 Cordas (B E A D G)"
];

/**
 * Cria um objeto de equipamento padronizado e validado
 */
export function createGearItem(data = {}) {
  const id = data.id || `gear_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    name: (data.name || "Novo Equipamento").trim(),
    category: data.category || "instrument",
    brand: (data.brand || "").trim(),
    model: (data.model || "").trim(),
    stringsGauge: (data.stringsGauge || "").trim(),
    tuning: data.tuning || "E Standard (E A D G B E)",
    notes: (data.notes || "").trim(),
    isActiveForMissions: Boolean(data.isActiveForMissions ?? true),
    lastStringChangeDate: data.lastStringChangeDate || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
