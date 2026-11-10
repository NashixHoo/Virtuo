// =============================================================
// VIRTUO MUSICAL ENGINE: TRANSPOSER
// src/music/transposer.js
// Motor de transposição harmônica baseada em semitons
// =============================================================

import {
  NOTE_TO_SEMITONE,
  SHARPS_SCALE,
  FLATS_SCALE,
  parseChord,
  isChordLine,
  CHORD_FINDER_REGEX
} from "./chord-parser.js";

// Tonalidades que tradicionalmente utilizam bemóis
const FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];

/**
 * Transpõe uma nota musical individual por um número de semitons.
 * 
 * @param {string} note - Nota musical (ex: 'G', 'C#', 'Bb')
 * @param {number} semitones - Deslocamento em semitons (positivo ou negativo)
 * @param {boolean|null} preferFlats - Se deve preferir bemol (true) ou sustenido (false). Se null, escolhe automaticamente.
 * @returns {string} Nota transposta
 */
export function transposeNote(note, semitones = 0, preferFlats = null) {
  if (!note || semitones === 0) return note;
  const cleanNote = note.trim();
  const currentSemitone = NOTE_TO_SEMITONE[cleanNote];
  if (currentSemitone === undefined) return note;

  let targetSemitone = (currentSemitone + semitones) % 12;
  if (targetSemitone < 0) targetSemitone += 12;

  // Determina se devemos preferir a escala de bemóis ou sustenidos
  let useFlats = false;
  if (preferFlats !== null) {
    useFlats = preferFlats;
  } else if (cleanNote.includes("b")) {
    useFlats = true;
  }

  return useFlats ? FLATS_SCALE[targetSemitone] : SHARPS_SCALE[targetSemitone];
}

/**
 * Transpõe um acorde estruturado completo (ex: Em7, D/F#, C#m9, Gsus4).
 * 
 * @param {string} chord - Acorde em texto (ex: 'D/F#', 'Em')
 * @param {number} semitones - Deslocamento em semitons
 * @param {boolean|null} preferFlats - Preferência por bemóis
 * @returns {string} Acorde transposto
 */
export function transposeChord(chord, semitones = 0, preferFlats = null) {
  if (!chord || semitones === 0) return chord;

  const parsed = parseChord(chord);
  if (parsed) {
    const newRoot = transposeNote(parsed.root, semitones, preferFlats);
    const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, preferFlats) : null;
    return `${newRoot}${parsed.modifier}${newBass ? "/" + newBass : ""}`;
  }

  // Se contiver múltiplos caracteres ou tokens, substitui via regex
  return chord.replace(CHORD_FINDER_REGEX, (full, root, modifier = "", slash = "") => {
    const newRoot = transposeNote(root, semitones, preferFlats);
    let newSlash = "";
    if (slash) {
      newSlash = "/" + transposeNote(slash, semitones, preferFlats);
    }
    return `${newRoot}${modifier}${newSlash}`;
  });
}

/**
 * Transpõe uma linha de acordes mantendo o alinhamento de colunas em relação às letras.
 */
function transposeChordLineAligned(line, semitones, preferFlats) {
  const regex = new RegExp(CHORD_FINDER_REGEX.source, "g");
  const matches = [];
  let m;
  while ((m = regex.exec(line)) !== null) {
    matches.push({
      index: m.index,
      raw: m[0],
      length: m[0].length
    });
  }

  if (matches.length === 0) return line;

  let result = "";
  let lastIndex = 0;
  let charDelta = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    let beforeText = line.substring(lastIndex, match.index);

    // Compensa espaços para manter o alinhamento das colunas sem colapsar espaçamentos curtos
    if (charDelta > 0) {
      const spacesAvailable = (beforeText.match(/ +$/) || [""])[0].length;
      const spacesToRemove = Math.min(charDelta, spacesAvailable > 2 ? spacesAvailable - 2 : 0);
      if (spacesToRemove > 0) {
        beforeText = beforeText.slice(0, -spacesToRemove);
        charDelta -= spacesToRemove;
      }
    } else if (charDelta < 0) {
      const spacesToAdd = -charDelta;
      beforeText = beforeText + " ".repeat(spacesToAdd);
      charDelta = 0;
    }

    result += beforeText;

    const transposed = transposeChord(match.raw, semitones, preferFlats);
    result += transposed;

    charDelta += (transposed.length - match.length);
    lastIndex = match.index + match.length;
  }

  result += line.substring(lastIndex);
  return result;
}

/**
 * Transpõe uma partitura / cifra em texto completo preservando a diagramação e espaços.
 * 
 * @param {string} sheet - Texto da cifra
 * @param {number} semitones - Deslocamento em semitons
 * @param {string} targetKeyReference - Tonalidade alvo de referência para decidir sustenidos/bemóis
 * @returns {string} Cifra transposta
 */
export function transposeChordSheet(sheet, semitones = 0, targetKeyReference = "") {
  if (!sheet || semitones === 0) return sheet;

  const preferFlats = targetKeyReference ? FLAT_KEYS.includes(targetKeyReference) : null;

  if (Array.isArray(sheet)) {
    return sheet.map(c => typeof c === "string" ? transposeChord(c, semitones, preferFlats) : c);
  }

  const sheetStr = typeof sheet === "string" ? sheet : String(sheet || "");

  return sheetStr.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 1. Linhas com tags de seção: [Intro] G  C9  Em7  D
    const sectionMatch = line.match(/^(\s*\[[^\]]+\]\s*)(.*)$/);
    if (sectionMatch) {
      const tag = sectionMatch[1];
      const rest = sectionMatch[2];
      if (rest.trim().length === 0) {
        // Apenas uma tag pura como [Verso 1] ou [Refrão]
        return line;
      }
      // Há acordes na mesma linha da tag (ex: [Intro] G  C  Em  D)
      const transposedRest = transposeChordLineAligned(rest, semitones, preferFlats);
      return `${tag}${transposedRest}`;
    }

    // 2. Se a linha contiver acordes inline entre colchetes [G] ou [Em7]
    if (/\[[A-G][b#]?[^\]]*\]/.test(line)) {
      return line.replace(/\[([A-G][b#]?[^\]]*)\]/g, (full, chordInside) => {
        return `[${transposeChord(chordInside, semitones, preferFlats)}]`;
      });
    }

    // 3. Linhas dedicadas de acordes (acima das letras)
    if (isChordLine(line)) {
      return transposeChordLineAligned(line, semitones, preferFlats);
    }

    // 4. Linha de letra pura (não altera palavras como 'A', 'E', 'Em')
    return line;
  }).join("\n");
}

/**
 * Calcula a nova tonalidade a partir da tonalidade original e do deslocamento.
 */
export function calculateKey(originalKey, semitones = 0) {
  if (!originalKey) return "G";
  if (semitones === 0) return originalKey;

  const parsed = parseChord(originalKey);
  if (!parsed) {
    return transposeNote(originalKey, semitones);
  }

  const newRoot = transposeNote(parsed.root, semitones);
  return `${newRoot}${parsed.modifier}`;
}

/**
 * Retorna o delta em semitons de uma tonalidade para outra.
 */
export function getSemitoneDistance(fromKey, toKey) {
  const fromClean = (fromKey || "").replace(/m.*$/, "");
  const toClean = (toKey || "").replace(/m.*$/, "");
  const fromSemi = NOTE_TO_SEMITONE[fromClean];
  const toSemi = NOTE_TO_SEMITONE[toClean];

  if (fromSemi === undefined || toSemi === undefined) return 0;
  let diff = (toSemi - fromSemi) % 12;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}
