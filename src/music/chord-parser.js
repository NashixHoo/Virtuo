// =============================================================
// VIRTUO MUSICAL ENGINE: CHORD PARSER
// src/music/chord-parser.js
// Reconhece, analisa e valida acordes musicais com extensões e baixos
// =============================================================

// Notas fundamentais
export const ROOT_NOTES = ["C", "D", "E", "F", "G", "A", "B"];

// Tabela de semitons (0 a 11)
export const NOTE_TO_SEMITONE = {
  "C": 0, "B#": 0,
  "C#": 1, "Db": 1,
  "D": 2,
  "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4,
  "F": 5, "E#": 5,
  "F#": 6, "Gb": 6,
  "G": 7,
  "G#": 8, "Ab": 8,
  "A": 9,
  "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11
};

export const SHARPS_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLATS_SCALE  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Regex canônica para detectar acorde individual.
 * Grupo 1: Raiz (ex: C, C#, Bb)
 * Grupo 2: Qualidade / Extensão combinada completa (ex: m, m7, maj7, 7, 9, dim, aug, sus4, add9, etc.)
 * Grupo 3: Nota do baixo com barra omitida (ex: F#, B)
 */
export const CHORD_REGEX = /^([A-G][b#]?)((?:m(?:aj|in)?|M(?:aj)?|dim|aug|sus[24]?|add[0-9]+|[0-9]+|°|\+|-(?:[0-9]+)?|\([^\)]+\))*)(?:\/([A-G][b#]?))?$/;

/**
 * Regex para encontrar acordes em uma linha de texto.
 * Grupo 1: Raiz
 * Grupo 2: Modificador completo
 * Grupo 3: Baixo invertido
 */
export const CHORD_FINDER_REGEX = /\b([A-G][b#]?)((?:m(?:aj|in)?|M(?:aj)?|dim|aug|sus[24]?|add[0-9]+|[0-9]+|°|\+|-(?:[0-9]+)?|\([^\)]+\))*)(?:\/([A-G][b#]?))?(?=\s|[,\)\]\.;]|$|\b)/g;

/**
 * Analisa uma string e retorna seus componentes harmônicos estruturados.
 * Retorna null se não for um acorde reconhecido.
 */
export function parseChord(token) {
  if (!token || typeof token !== "string") return null;
  const clean = token.trim();
  const match = clean.match(CHORD_REGEX);
  if (!match) return null;

  const root = match[1];
  const modifier = match[2] || "";
  const bass = match[3] || null;

  const isMinor = modifier.startsWith("m") && !modifier.startsWith("maj") && !modifier.startsWith("min");
  const isMinorNamed = modifier.startsWith("min") || modifier.startsWith("-");

  return {
    raw: clean,
    root,
    modifier,
    bass,
    isMinor: isMinor || isMinorNamed,
    hasSlash: !!bass
  };
}

/**
 * Verifica se um token é estritamente um acorde musical válido.
 */
export function isChordToken(token) {
  return parseChord(token) !== null;
}

/**
 * Identifica se uma linha é uma linha exclusiva/predominante de acordes
 * ou se é uma linha de letra (evita transpor palavras em português como 'E', 'A', 'Em').
 */
export function isChordLine(line) {
  if (!line || typeof line !== "string") return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Linhas com tags como [Intro] G C D ou [Refrão] G Em
  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    const afterTag = trimmed.replace(/^\[[^\]]+\]\s*/, "").trim();
    if (afterTag.length === 0) return false; // É apenas etiqueta de seção
    return isChordLine(afterTag);
  }

  // Divide a linha em palavras/tokens
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return false;

  let chordCount = 0;
  for (const token of tokens) {
    // Remove pontuação ao redor se houver
    const cleanToken = token.replace(/^[\[\(\{]+|[\]\)\},;:]+$/g, "");
    if (isChordToken(cleanToken)) {
      chordCount++;
    }
  }

  // Se mais de 60% dos tokens forem acordes, é considerada linha de cifras
  return (chordCount / tokens.length) >= 0.6;
}
