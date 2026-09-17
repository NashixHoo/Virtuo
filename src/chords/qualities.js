// =============================================================
// VIRTUO CHORD ENGINE: CHORD QUALITIES
// src/chords/qualities.js
// Fórmulas intervalares universais para qualidades de acordes
// =============================================================

export const CHORD_QUALITIES = {
  major: {
    id: "major",
    name: "Maior",
    symbol: "",
    display: "Maior",
    intervals: [0, 4, 7],
    aliases: ["", "maj", "M"],
    category: "triad"
  },
  minor: {
    id: "minor",
    name: "Menor",
    symbol: "m",
    display: "m",
    intervals: [0, 3, 7],
    aliases: ["m", "min", "-"],
    category: "triad"
  },
  diminished: {
    id: "diminished",
    name: "Diminuto",
    symbol: "dim",
    display: "dim",
    intervals: [0, 3, 6],
    aliases: ["dim", "°", "o"],
    category: "triad"
  },
  augmented: {
    id: "augmented",
    name: "Aumentado",
    symbol: "aug",
    display: "aug",
    intervals: [0, 4, 8],
    aliases: ["aug", "+", "5+"],
    category: "triad"
  },
  sus2: {
    id: "sus2",
    name: "Suspenso 2",
    symbol: "sus2",
    display: "sus2",
    intervals: [0, 2, 7],
    aliases: ["sus2", "2"],
    category: "suspended"
  },
  sus4: {
    id: "sus4",
    name: "Suspenso 4",
    symbol: "sus4",
    display: "sus4",
    intervals: [0, 5, 7],
    aliases: ["sus4", "sus", "4"],
    category: "suspended"
  },
  dominant7: {
    id: "dominant7",
    name: "Dominante com Sétima",
    symbol: "7",
    display: "7",
    intervals: [0, 4, 7, 10],
    aliases: ["7", "dom7"],
    category: "seventh"
  },
  major7: {
    id: "major7",
    name: "Sétima Maior",
    symbol: "maj7",
    display: "maj7",
    intervals: [0, 4, 7, 11],
    aliases: ["maj7", "M7", "7M", "Δ"],
    category: "seventh"
  },
  minor7: {
    id: "minor7",
    name: "Menor com Sétima",
    symbol: "m7",
    display: "m7",
    intervals: [0, 3, 7, 10],
    aliases: ["m7", "min7", "-7"],
    category: "seventh"
  },
  minor7b5: {
    id: "minor7b5",
    name: "Menor com Sétima e Quinta Bemol (Meio-Diminuto)",
    symbol: "m7b5",
    display: "m7(b5)",
    intervals: [0, 3, 6, 10],
    aliases: ["m7b5", "m7(b5)", "ø", "half-dim"],
    category: "seventh"
  },
  diminished7: {
    id: "diminished7",
    name: "Diminuto com Sétima",
    symbol: "dim7",
    display: "dim7",
    intervals: [0, 3, 6, 9],
    aliases: ["dim7", "°7", "o7"],
    category: "seventh"
  },
  add9: {
    id: "add9",
    name: "Com Nona Adicionada",
    symbol: "add9",
    display: "add9",
    intervals: [0, 4, 7, 14],
    aliases: ["add9", "2", "add2"],
    category: "extended"
  },
  "6": {
    id: "6",
    name: "Com Sexta",
    symbol: "6",
    display: "6",
    intervals: [0, 4, 7, 9],
    aliases: ["6", "maj6"],
    category: "sixth"
  },
  minor6: {
    id: "minor6",
    name: "Menor com Sexta",
    symbol: "m6",
    display: "m6",
    intervals: [0, 3, 7, 9],
    aliases: ["m6", "min6"],
    category: "sixth"
  },

  // Extensões avançadas preparadas
  "9": {
    id: "9",
    name: "Nona Dominante",
    symbol: "9",
    display: "9",
    intervals: [0, 4, 7, 10, 14],
    aliases: ["9", "dom9"],
    category: "extended"
  },
  major9: {
    id: "major9",
    name: "Nona Maior",
    symbol: "maj9",
    display: "maj9",
    intervals: [0, 4, 7, 11, 14],
    aliases: ["maj9", "7M(9)", "M9"],
    category: "extended"
  },
  minor9: {
    id: "minor9",
    name: "Menor com Nona",
    symbol: "m9",
    display: "m9",
    intervals: [0, 3, 7, 10, 14],
    aliases: ["m9", "min9"],
    category: "extended"
  },
  "11": {
    id: "11",
    name: "Décima Primeira",
    symbol: "11",
    display: "11",
    intervals: [0, 4, 7, 10, 14, 17],
    aliases: ["11"],
    category: "extended"
  },
  "13": {
    id: "13",
    name: "Décima Terceira",
    symbol: "13",
    display: "13",
    intervals: [0, 4, 7, 10, 14, 21],
    aliases: ["13"],
    category: "extended"
  },
  altered: {
    id: "altered",
    name: "Alterado",
    symbol: "7alt",
    display: "7alt",
    intervals: [0, 4, 6, 10, 13],
    aliases: ["7alt", "alt"],
    category: "altered"
  }
};

/**
 * Resolve uma qualidade por string (ex: 'major', 'm', 'm7', 'maj7', 'dim', etc.)
 * Respeita a distinção harmônica entre 'm' (menor) e 'M' (Maior).
 * @param {string} qualityKey 
 * @returns {Object|null}
 */
export function resolveQuality(qualityKey) {
  if (!qualityKey && qualityKey !== "") return CHORD_QUALITIES.major;
  const raw = qualityKey.toString().trim();

  // 1. Busca exata com diferenciação de maiúsculas/minúsculas para 'M' e 'm'
  for (const q of Object.values(CHORD_QUALITIES)) {
    if (q.id === raw || q.aliases.includes(raw)) {
      return q;
    }
  }

  // 2. Busca insensible para nomes longos como 'minor', 'major', 'diminished', 'augmented'
  const lower = raw.toLowerCase();
  for (const q of Object.values(CHORD_QUALITIES)) {
    if (q.id.toLowerCase() === lower) {
      return q;
    }
    // Permite aliases insensíveis exceto casos onde M e m colidem
    if (q.aliases.some(a => a.toLowerCase() === lower && !((a === "M" || a === "M7") && (raw === "m" || raw === "m7")))) {
      return q;
    }
  }

  return null;
}
