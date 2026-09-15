// =============================================================
// VIRTUO MUSICAL ENGINE: EASY PLAY
// src/music/easy-play.js
// Simplificação e adaptação de acordes para músicos iniciantes
// =============================================================

import { parseChord, isChordLine, CHORD_FINDER_REGEX } from "./chord-parser.js";
import { transposeChordSheet } from "./transposer.js";

/**
 * Mapeamento de simplificações inteligentes para acordes complexos.
 * Transforma dissonâncias e extensões difíceis em tríades fundamentais abertas.
 */
export function simplifyChord(chord) {
  if (!chord || typeof chord !== "string") return chord;
  const parsed = parseChord(chord);
  if (!parsed) return chord;

  const { root, modifier, bass } = parsed;

  // Se for acorde menor com extensões (ex: Em7, Bm9, F#m7, C#m7b5) -> converte para menor simples
  if (parsed.isMinor) {
    return `${root}m`;
  }

  // Acordes diminutos ou meio-diminutos -> simplifica para menor
  if (modifier.includes("dim") || modifier.includes("°")) {
    return `${root}m`;
  }

  // Acordes com suspensões ou extensões de nona/sétima (ex: C9, Cadd9, Gsus4, D7, A4) -> tríade maior simples
  // Remove baixo invertido difícil para iniciantes (ex: D/F# -> D, G/B -> G)
  return root;
}

/**
 * Gera uma cifra simplificada (Easy Play) a partir de uma cifra completa,
 * substituindo acordes complexos por suas versões amigáveis para iniciantes.
 */
export function generateEasyPlaySheet(chordSheet) {
  if (!chordSheet) return "";

  return chordSheet.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Se for linha de tag de seção com acordes [Intro] G  C9  Em7  D
    const sectionMatch = line.match(/^(\s*\[[^\]]+\]\s*)(.*)$/);
    if (sectionMatch) {
      const tag = sectionMatch[1];
      const rest = sectionMatch[2];
      if (!rest.trim()) return line;
      const simplifiedRest = rest.replace(CHORD_FINDER_REGEX, (match) => simplifyChord(match));
      return `${tag}${simplifiedRest}`;
    }

    // Se for linha de acordes
    if (isChordLine(line)) {
      return line.replace(CHORD_FINDER_REGEX, (match) => simplifyChord(match));
    }

    return line;
  }).join("\n");
}

/**
 * Obtém a cifra Easy Play pronta para a música e tonalidade atual.
 * 
 * @param {Object} song - Objeto da música
 * @param {number} semitones - Deslocamento em semitons
 * @returns {string} Cifra simplificada e transposta
 */
export function getEasyPlayCifra(song, semitones = 0) {
  if (!song) return "";

  const chordsStr = typeof song.chords === "string" ? song.chords : (song.chordSheet || "");
  const easyChordsStr = typeof song.easyChords === "string" ? song.easyChords : (song.easyChordSheet || "");

  // Prioriza easyChords definidos pelo autor/comunidade; caso contrário, gera automaticamente
  const baseEasy = (easyChordsStr && easyChordsStr.trim().length > 0)
    ? easyChordsStr
    : generateEasyPlaySheet(chordsStr);

  if (semitones === 0) {
    return baseEasy;
  }

  return transposeChordSheet(baseEasy, semitones);
}

/**
 * Retorna se uma música possui Easy Play cadastrado ou gerável.
 */
export function hasEasyPlay(song) {
  if (!song) return false;
  return Boolean(song.easyChords || song.chords || song.chordSheet || song.easyChordSheet);
}
