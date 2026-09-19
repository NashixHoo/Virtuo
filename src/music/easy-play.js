// =============================================================
// VIRTUO MUSICAL ENGINE: EASY PLAY 2.0
// src/music/easy-play.js
// Simplificação e adaptação harmônica inteligente de acordes
// Preserva a função tonal e estrutura harmônica original
// 100% determinístico e offline
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

  const { root, modifier } = parsed;

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
 * Estima a função harmônica do acorde dentro da tonalidade (Tônica, Subdominante, Dominante, etc.)
 */
function estimateHarmonicFunction(chord, key = "G") {
  if (!chord) return "Harmonia";
  const cleanKey = key.replace("m", "");
  const isMinorKey = key.endsWith("m");

  if (chord === key || chord.startsWith(key)) {
    return "Tônica (Repouso Principal)";
  }
  if (chord.includes("/")) {
    return "Condução de Baixo / Inversão";
  }
  if (chord.includes("7") && !chord.includes("7M") && !chord.includes("maj7")) {
    return "Dominante / Preparação";
  }
  if (chord.includes("sus") || chord.includes("4")) {
    return "Suspensão Harmônica";
  }
  if (chord.includes("9") || chord.includes("add9") || chord.includes("7M")) {
    return "Tensão Colorida / Ambiência";
  }
  if (isMinorKey && chord.endsWith("m")) {
    return "Grau Menor Congregacional";
  }
  return "Acorde Harmônico";
}

/**
 * Identifica acordes substituíveis em uma cifra ou lista de acordes,
 * explicando a versão simplificada e preservando a função tonal.
 * 
 * @param {string|string[]} chordsInput - Cifra ou lista de acordes
 * @param {string} key - Tonalidade da canção
 * @returns {Array<Object>} Lista de substituições com justificativa funcional
 */
export function identifySubstitutableChords(chordsInput, key = "G") {
  let chordList = [];
  if (Array.isArray(chordsInput)) {
    chordList = chordsInput;
  } else if (typeof chordsInput === "string") {
    const matches = chordsInput.match(/[A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|[0-9]+)*(?:\/[A-G][b#]*)?/g) || [];
    chordList = matches;
  }

  const unique = [...new Set(chordList.map(c => c.trim()).filter(Boolean))];

  return unique.map(chord => {
    const easy = simplifyChord(chord);
    const canSimplify = easy !== chord;
    const harmonicFunction = estimateHarmonicFunction(chord, key);

    let reason = "Acorde fundamental já otimizado.";
    if (canSimplify) {
      if (chord.includes("/")) {
        reason = `Substitui o baixo invertido por ${easy} fundamental, aliviando a digitação da mão esquerda mantendo a base.`;
      } else if (chord.includes("9") || chord.includes("add")) {
        reason = `Remove a nona de tensão, preservando a tríade ${easy} para sustentação tonal estável.`;
      } else if (chord.includes("7M") || chord.includes("maj7")) {
        reason = `Converte a 7ª maior em tríade ${easy} pura, preservando a função de repouso harmônico.`;
      } else if (chord.includes("sus") || chord.includes("4")) {
        reason = `Resolve a suspensão diretamente na tríade ${easy}.`;
      } else if (chord.includes("m") && (chord.includes("7") || chord.includes("9"))) {
        reason = `Simplifica o acorde menor estendido para ${easy} fundamental.`;
      } else {
        reason = `Converte a dissonância para a tríade fundamental ${easy}.`;
      }
    }

    return {
      original: chord,
      easy,
      canSimplify,
      harmonicFunction,
      reason
    };
  });
}

/**
 * Compara a cifra Original com o Easy Play 2.0
 * 
 * @param {string} chordSheetOrChords - Cifra completa ou texto
 * @param {string} key - Tonalidade da canção
 * @returns {Object} Diagnóstico comparativo estruturado
 */
export function compareOriginalAndEasyPlay(chordSheetOrChords, key = "G") {
  const substitutions = identifySubstitutableChords(chordSheetOrChords, key);
  const totalOriginal = substitutions.length;
  const changedList = substitutions.filter(s => s.canSimplify);
  const changedCount = changedList.length;

  const percentSimplified = totalOriginal > 0 
    ? `${Math.round((changedCount / totalOriginal) * 100)}%`
    : "0%";

  const diffSummary = changedCount > 0
    ? `${changedCount} de ${totalOriginal} acordes (${percentSimplified}) foram simplificados para tríades fundamentais abertas.`
    : "Esta música já utiliza exclusivamente acordes fundamentais abertos.";

  return {
    substitutions,
    changedList,
    totalOriginal,
    changedCount,
    percentSimplified,
    diffSummary
  };
}

/**
 * Gera uma cifra simplificada (Easy Play) a partir de uma cifra completa,
 * substituindo acordes complexos por suas versões amigáveis para iniciantes.
 */
export function generateEasyPlaySheet(chordSheet) {
  if (!chordSheet) return "";

  if (Array.isArray(chordSheet)) {
    return chordSheet.map(c => typeof c === "string" ? simplifyChord(c) : c);
  }

  const sheetStr = typeof chordSheet === "string" ? chordSheet : String(chordSheet || "");

  return sheetStr.split("\n").map(line => {
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

    // Se a linha contiver acordes inline entre colchetes [G] ou [Em7]
    if (/\[[A-G][b#]?[^\]]*\]/.test(line)) {
      return line.replace(/\[([A-G][b#]?[^\]]*)\]/g, (full, chordInside) => {
        return `[${simplifyChord(chordInside)}]`;
      });
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
