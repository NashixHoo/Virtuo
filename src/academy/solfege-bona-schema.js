// =============================================================
// VIRTUO ACADEMY — INFRAESTRUTURA PEDAGÓGICA DE SOLFEJO E BONA
// src/academy/solfege-bona-schema.js
// Requisito 20: Infraestrutura técnica tipada para solfejo rítmico,
// métrica musical e método Bona (Pasquale Bona, 1888 - Domínio Público).
// NÃO inventa exercícios apócrifos: modela a especificação pedagógica formal.
// =============================================================

export const BONA_HISTORICAL_METADATA = {
  treatise: "Metodo Completo per la Divisione Musicale",
  author: "Pasquale Bona (1808-1878)",
  edition: "Milão, Ricordi (1888) / Domínio Público Universal",
  curriculumCategory: "Divisão e Solfejo Rítmico / Melódico",
  license: "Public Domain / CC0-Compatible Pedagogical Framework"
};

export const TIME_SIGNATURE_DEFINITIONS = {
  "2/4": { numerator: 2, denominator: 4, beatFigure: "quarter", pulsesPerBar: 2 },
  "3/4": { numerator: 3, denominator: 4, beatFigure: "quarter", pulsesPerBar: 3 },
  "4/4": { numerator: 4, denominator: 4, beatFigure: "quarter", pulsesPerBar: 4 },
  "6/8": { numerator: 6, denominator: 8, beatFigure: "dotted_quarter", pulsesPerBar: 2 }
};

export const NOTE_DURATION_RATIOS = {
  whole: 4.0,           // Semibreve
  half: 2.0,            // Mínima
  quarter: 1.0,         // Semínima (unidade de tempo em 4/4)
  eighth: 0.5,          // Colcheia
  sixteenth: 0.25,      // Semicolcheia
  dotted_half: 3.0,     // Mínima pontuada
  dotted_quarter: 1.5,  // Semínima pontuada
  dotted_eighth: 0.75   // Colcheia pontuada
};

/**
 * Validador da integridade rítmica de um compasso do método Bona
 */
export function validateBarDuration(figures = [], timeSignature = "4/4") {
  const spec = TIME_SIGNATURE_DEFINITIONS[timeSignature] || TIME_SIGNATURE_DEFINITIONS["4/4"];
  const targetBeats = (spec.numerator / spec.denominator) * 4;

  const totalDuration = figures.reduce((acc, fig) => {
    const duration = NOTE_DURATION_RATIOS[fig.duration] || 0;
    return acc + duration;
  }, 0);

  return {
    valid: Math.abs(totalDuration - targetBeats) < 0.001,
    expectedBeats: targetBeats,
    actualBeats: totalDuration
  };
}

/**
 * Avaliador de precisão do aluno no solfejo rítmico (milissegundos de desvio)
 */
export function evaluateRhythmPrecision(userTapTimeMs, expectedTimeMs, toleranceMs = 80) {
  const deviation = Math.abs(userTapTimeMs - expectedTimeMs);
  let score = 0;
  let grade = "miss";

  if (deviation <= toleranceMs * 0.3) {
    score = 100;
    grade = "perfect";
  } else if (deviation <= toleranceMs * 0.7) {
    score = 80;
    grade = "good";
  } else if (deviation <= toleranceMs) {
    score = 60;
    grade = "acceptable";
  }

  return { score, grade, deviationMs: Math.round(deviation) };
}
