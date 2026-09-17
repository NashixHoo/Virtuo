// =============================================================
// VIRTUO CHORD ENGINE: SEARCH & REVERSE CHORD FINDER
// src/chords/search.js
// Busca fonética por símbolo e reconhecimento reverso a partir de notas
// =============================================================

import { normalizeNote, NOTE_SEMITONES, CHROMATIC_SHARPS } from "./notes.js";
import { CHORD_QUALITIES } from "./qualities.js";
import { buildChord, parseChordSymbol } from "./chord-builder.js";

/**
 * Busca acordes a partir de um termo de pesquisa (ex: 'C', 'F#', 'sus', 'm7')
 * Retorna lista de acordes calculados
 * @param {string} query 
 * @param {number} limit 
 * @returns {Object[]}
 */
export function searchChords(query, limit = 20) {
  if (!query || typeof query !== "string") return [];
  const clean = query.trim().toUpperCase();

  // Verifica se o usuário digitou uma fundamental direta (ex: 'C', 'G#', 'Eb')
  const rootMatch = clean.match(/^([A-G][#B]?)(.*)$/);
  const results = [];

  if (rootMatch) {
    const root = rootMatch[1].charAt(0) + (rootMatch[1].charAt(1) ? rootMatch[1].charAt(1).toLowerCase() === "b" ? "b" : "#" : "");
    const remainder = rootMatch[2].trim().toLowerCase();

    for (const [qKey, qObj] of Object.entries(CHORD_QUALITIES)) {
      if (!remainder || qKey.includes(remainder) || qObj.aliases.some(a => a.toLowerCase().includes(remainder))) {
        const chord = buildChord(root, qKey);
        if (chord) results.push(chord);
      }
    }
  } else {
    // Busca por nome de qualidade em todas as 12 notas fundamentais
    const searchLow = query.toLowerCase().trim();
    for (const root of ["C", "D", "E", "F", "G", "A", "B"]) {
      for (const [qKey, qObj] of Object.entries(CHORD_QUALITIES)) {
        if (qKey.includes(searchLow) || qObj.name.toLowerCase().includes(searchLow) || qObj.symbol.toLowerCase() === searchLow) {
          const chord = buildChord(root, qKey);
          if (chord) results.push(chord);
        }
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * Reconhece acordes e inversões a partir de um conjunto de notas (Busca por Notas / Reverse Chord Finder)
 * Ex: ['E', 'G', 'C'] -> 'C/E' e 'C'
 * @param {string[]|string} notesInput 
 * @returns {Object[]} Acordes compatíveis ordenados por relevância
 */
export function identifyChordFromNotes(notesInput) {
  if (!notesInput) return [];

  // Converte input para array de notas normalizadas
  let noteArray = [];
  if (Array.isArray(notesInput)) {
    noteArray = notesInput.map(n => normalizeNote(n)).filter(Boolean);
  } else if (typeof notesInput === "string") {
    noteArray = notesInput
      .trim()
      .split(/[\s,;-]+/)
      .map(n => normalizeNote(n))
      .filter(Boolean);
  }

  if (noteArray.length < 2) return [];

  // A primeira nota tocada ou mais grave define o baixo potencial
  const bassNote = noteArray[0];
  const uniqueSemitones = Array.from(new Set(noteArray.map(n => NOTE_SEMITONES[n]))).sort((a, b) => a - b);
  const candidates = [];

  // Testa cada nota presente como potencial fundamental do acorde
  for (const rootCandidate of uniqueSemitones) {
    const rootName = CHROMATIC_SHARPS[rootCandidate];

    // Calcula intervalos relativos a esta fundamental
    const relativeIntervals = uniqueSemitones
      .map(s => (s - rootCandidate + 12) % 12)
      .sort((a, b) => a - b);

    // Compara com as qualidades conhecidas
    for (const [qKey, qObj] of Object.entries(CHORD_QUALITIES)) {
      const qIntervals = Array.from(new Set(qObj.intervals.map(i => i % 12))).sort((a, b) => a - b);

      // Verifica se os intervalos batem perfeitamente
      const isExactMatch = 
        relativeIntervals.length === qIntervals.length &&
        relativeIntervals.every((val, idx) => val === qIntervals[idx]);

      if (isExactMatch) {
        const isSlash = bassNote !== rootName;
        const chord = buildChord(rootName, qKey, isSlash ? bassNote : null);
        if (chord) {
          candidates.push({
            chord,
            isRootPosition: !isSlash,
            matchScore: isSlash ? 85 : 100
          });
        }
      }
    }
  }

  // Ordena fundamentais primeiro, depois inversões
  return candidates
    .sort((a, b) => b.matchScore - a.matchScore)
    .map(c => c.chord);
}
