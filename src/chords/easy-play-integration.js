// =============================================================
// VIRTUO CHORD ENGINE: EASY PLAY & SMART KEY INTEGRATION
// src/chords/easy-play-integration.js
// Conexão entre o motor de acordes, Easy Play e recomendações Smart Key
// =============================================================

import { parseChordSymbol, buildChord } from "./chord-builder.js";
import { getChordShapes } from "./shapes.js";
import { transposeChord } from "./transposer.js";

/**
 * Converte um acorde complexo para sua versão Easy Play simplificada (tríade direta),
 * preservando SEMPRE o acorde original em metadados intactos.
 * 
 * Exemplo: Cmaj7 -> C, Em7 -> Em, D/F# -> D, Cadd9 -> C
 * 
 * @param {string|Object} chordInput 
 * @returns {Object}
 */
export function toEasyPlay(chordInput) {
  const originalSymbol = typeof chordInput === "string" ? chordInput.trim() : chordInput?.symbol || "C";
  const parsed = parseChordSymbol(originalSymbol);

  if (!parsed) {
    return {
      originalChord: originalSymbol,
      easyChord: originalSymbol,
      isSimplified: false,
      easyQuality: "major"
    };
  }

  // Identifica se é acorde de qualidade menor
  const isMinor = parsed.quality.includes("minor") || parsed.quality === "diminished" || parsed.quality === "minor7";
  const easyQuality = isMinor ? "minor" : "major";
  const easyChordObj = buildChord(parsed.root, easyQuality);
  const easySymbol = easyChordObj.symbol;

  return {
    originalChord: originalSymbol,
    originalDetails: parsed,
    easyChord: easySymbol,
    easyDetails: easyChordObj,
    isSimplified: originalSymbol !== easySymbol,
    easyQuality
  };
}

/**
 * Sugestões inteligentes do Smart Key para facilitar a execução instrumental
 * @param {string} chordSymbol 
 * @param {string} instrumentId 
 * @returns {Object}
 */
export function getSmartKeySubstitutions(chordSymbol, instrumentId = "acoustic-guitar") {
  const clean = chordSymbol ? chordSymbol.trim() : "C";
  const easy = toEasyPlay(clean);
  const shapes = getChordShapes(clean, instrumentId);
  const easyShapes = easy.isSimplified ? getChordShapes(easy.easyChord, instrumentId) : shapes;

  // Filtra formas mais fáceis (beginner)
  const beginnerShapes = shapes.filter(s => s.difficulty === "beginner");
  const recommendedShape = beginnerShapes[0] || shapes[0] || null;

  return {
    originalChord: clean,
    easyPlay: easy,
    recommendedShape,
    alternativeShapes: shapes,
    easyShapes,
    hasOpenPosition: shapes.some(s => s.position === "open")
  };
}
