// =============================================================
// VIRTUO SMART KEY ENGINE
// src/music/smart-key.js
// Sugestão inteligente de tonalidade para execução facilitada
// Preserva a identidade harmônica e minimiza pestanas/dissonâncias
// 100% determinístico e offline
// =============================================================

import { CHROMATIC_SCALE } from "./music-intelligence.js";
import { transposeChord, transposeChordSheet, getSemitoneDistance } from "./transposer.js";
import { simplifyChord } from "./easy-play.js";

// Digitações abertas mais confortáveis para violão e teclado
const OPEN_SHAPES_MAJOR = ["G", "C", "D", "E", "A"];
const OPEN_SHAPES_MINOR = ["Em", "Am", "Dm"];

// Lista de acordes com pestana ou digitação tensa no violão
const BARRE_CHORDS = ["F", "B", "Bb", "F#", "F#m", "Bm", "G#m", "C#m", "D#m", "Ab", "Eb", "Cm", "Fm"];

/**
 * Avalia o índice de esforço mecânico (pestanas e extensões) de uma lista de acordes
 */
function calculateEffortScore(chords) {
  let score = 0;
  for (const chord of chords) {
    if (BARRE_CHORDS.some(b => chord === b || chord.startsWith(b))) {
      score += 3;
    }
    if (chord.includes("/")) {
      score += 1.5;
    }
    if (/(?:maj7|7M|9|11|13|dim|aug|m7b5)/i.test(chord)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Sugere a melhor tonalidade e colocação de capotraste para uma música
 * 
 * @param {Object|string} songOrChords - Música ou lista de acordes
 * @param {string} currentKey - Tom original / atual da música
 * @param {Object} [vocalRange] - Extensão vocal do ministro/cantor (opcional)
 * @returns {Object} Recomendação do Smart Key
 */
export function suggestSmartKey(songOrChords, currentKey = "G", vocalRange = null) {
  const chordsInput = typeof songOrChords === "object" && songOrChords !== null
    ? (songOrChords.chords || songOrChords.chordSheet || "")
    : String(songOrChords || "");

  const origKey = (typeof songOrChords === "object" && songOrChords !== null && (songOrChords.originalKey || songOrChords.key))
    ? (songOrChords.originalKey || songOrChords.key)
    : currentKey || "G";

  const isMinor = origKey.endsWith("m");
  const cleanRoot = origKey.replace("m", "").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
  const rootIndex = CHROMATIC_SCALE.indexOf(cleanRoot);

  // Extrai acordes da cifra
  const matches = chordsInput.match(/[A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|[0-9]+)*(?:\/[A-G][b#]*)?/g) || [];
  const uniqueOriginalChords = [...new Set(matches.map(c => c.trim()).filter(c => /^[A-G]/.test(c)))];

  const originalEffort = calculateEffortScore(uniqueOriginalChords);
  const candidateShapes = isMinor ? OPEN_SHAPES_MINOR : OPEN_SHAPES_MAJOR;

  // Se o tom já for aberto e com pouco esforço mecânico, mantém o tom original
  if (candidateShapes.includes(origKey) && originalEffort <= 4) {
    return {
      originalKey: origKey,
      recommendedKey: origKey,
      recommendedCapo: 0,
      semitoneOffset: 0,
      reason: `A tonalidade original (${origKey}) já utiliza acordes abertos naturais com excelente ressonância e pouca ou nenhuma pestana.`,
      isOriginalBest: true,
      originalEffort,
      targetEffort: originalEffort,
      chordsInTargetKey: uniqueOriginalChords
    };
  }

  // Avalia candidatos com capotraste de 1 a 7 casas
  let bestCandidate = null;
  let lowestEffort = 999;

  for (const shape of candidateShapes) {
    const shapeClean = shape.replace("m", "").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    const shapeIdx = CHROMATIC_SCALE.indexOf(shapeClean);
    if (shapeIdx === -1) continue;

    // Distância para o capo soar na altura da música original
    // targetSound = shapePitch + capo = originalPitch
    // capo = (originalPitch - shapePitch + 12) % 12
    const capoFret = (rootIndex - shapeIdx + 12) % 12;

    if (capoFret >= 0 && capoFret <= 7) {
      // Transpõe os acordes originais para as digitações do shape (deslocamento negativo de capo)
      const transposedChords = uniqueOriginalChords.map(c => transposeChord(c, -capoFret));
      const effort = calculateEffortScore(transposedChords);

      // Penalidade leve para capotraste muito alto na escala
      const totalScore = effort + (capoFret * 0.3);

      if (totalScore < lowestEffort) {
        lowestEffort = totalScore;
        bestCandidate = {
          recommendedKey: shape,
          recommendedCapo: capoFret,
          semitoneOffset: -capoFret,
          effort,
          transposedChords
        };
      }
    }
  }

  if (bestCandidate && (bestCandidate.effort < originalEffort || originalEffort >= 6)) {
    const capoText = bestCandidate.recommendedCapo === 0 
      ? "sem capotraste" 
      : `com Capo na ${bestCandidate.recommendedCapo}ª casa`;

    return {
      originalKey: origKey,
      recommendedKey: bestCandidate.recommendedKey,
      recommendedCapo: bestCandidate.recommendedCapo,
      semitoneOffset: bestCandidate.semitoneOffset,
      reason: `Reduz a dificuldade dos acordes mantendo a região harmônica e o pitch original. Toque em digitações de ${bestCandidate.recommendedKey} ${capoText}.`,
      isOriginalBest: false,
      originalEffort,
      targetEffort: bestCandidate.effort,
      chordsInTargetKey: bestCandidate.transposedChords
    };
  }

  // Fallback caso não haja benefício evidente
  return {
    originalKey: origKey,
    recommendedKey: origKey,
    recommendedCapo: 0,
    semitoneOffset: 0,
    reason: `Mantenha o tom de ${origKey}. Os acordes estão equilibrados para execução instrumental.`,
    isOriginalBest: true,
    originalEffort,
    targetEffort: originalEffort,
    chordsInTargetKey: uniqueOriginalChords
  };
}
