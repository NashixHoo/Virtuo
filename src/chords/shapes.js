// =============================================================
// VIRTUO CHORD ENGINE: SHAPES & VOICINGS
// src/chords/shapes.js
// Biblioteca estrutural de formas, posições CAGED, baixo, ukulele, cavaquinho e piano
// =============================================================

import { normalizeNote, getSemitoneDistance, NOTE_SEMITONES } from "./notes.js";
import { parseChordSymbol, buildChord } from "./chord-builder.js";
import { validateChordShape } from "./musical-validator.js";

/**
 * Cria um objeto ChordShape canônico e preenche campos automáticos como mutedStrings e openStrings
 */
export function createChordShape({
  instrument = "acoustic-guitar",
  chord = "C",
  tuning = "standard",
  frets = [-1, 3, 2, 0, 1, 0],
  fingers = [0, 3, 2, 0, 1, 0],
  baseFret = 1,
  position = "open",
  cagedForm = null,
  difficulty = "beginner"
}) {
  const mutedStrings = [];
  const openStrings = [];

  frets.forEach((fret, idx) => {
    if (fret === -1) mutedStrings.push(idx);
    else if (fret === 0) openStrings.push(idx);
  });

  return {
    instrument,
    chord,
    tuning,
    frets: [...frets],
    fingers: [...fingers],
    mutedStrings,
    openStrings,
    baseFret,
    position,
    cagedForm,
    difficulty
  };
}

// =============================================================
// 1. FORMAS FUNDAMENTAIS DE VIOLÃO / GUITARRA (6 CORDAS EADGBE)
// =============================================================
const GUITAR_SHAPES_DATABASE = {
  // C maior
  "C": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C",
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C",
      frets: [-1, 3, 5, 5, 5, 3],
      fingers: [0, 1, 3, 3, 3, 1],
      baseFret: 3,
      position: "barre",
      cagedForm: "A",
      difficulty: "intermediate"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C",
      frets: [8, 10, 10, 9, 8, 8],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 8,
      position: "barre",
      cagedForm: "E",
      difficulty: "intermediate"
    })
  ],

  // C menor
  "Cm": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cm",
      frets: [-1, 3, 5, 5, 4, 3],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 3,
      position: "barre",
      cagedForm: "A",
      difficulty: "intermediate"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cm",
      frets: [8, 10, 10, 8, 8, 8],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 8,
      position: "barre",
      cagedForm: "E",
      difficulty: "intermediate"
    })
  ],

  // C7 (Dominante)
  "C7": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C7",
      frets: [-1, 3, 2, 3, 1, 0],
      fingers: [0, 3, 2, 4, 1, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C7",
      frets: [-1, 3, 5, 3, 5, 3],
      fingers: [0, 1, 3, 1, 4, 1],
      baseFret: 3,
      position: "barre",
      cagedForm: "A",
      difficulty: "intermediate"
    })
  ],

  // Cmaj7
  "Cmaj7": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cmaj7",
      frets: [-1, 3, 2, 0, 0, 0],
      fingers: [0, 3, 2, 0, 0, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cmaj7",
      frets: [-1, 3, 5, 4, 5, 3],
      fingers: [0, 1, 3, 2, 4, 1],
      baseFret: 3,
      position: "barre",
      cagedForm: "A",
      difficulty: "intermediate"
    })
  ],

  // Csus2
  "Csus2": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Csus2",
      frets: [-1, 3, 0, 0, 1, -1],
      fingers: [0, 3, 0, 0, 1, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    })
  ],

  // Csus4
  "Csus4": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Csus4",
      frets: [-1, 3, 3, 0, 1, 1],
      fingers: [0, 3, 4, 0, 1, 2],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    })
  ],

  // Cadd9
  "Cadd9": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cadd9",
      frets: [-1, 3, 2, 0, 3, 0],
      fingers: [0, 2, 1, 0, 3, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "beginner"
    })
  ],

  // C6
  "C6": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "C6",
      frets: [-1, 3, 2, 2, 1, 0],
      fingers: [0, 3, 2, 4, 1, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "C",
      difficulty: "intermediate"
    })
  ],

  // Cm7
  "Cm7": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Cm7",
      frets: [-1, 3, 5, 3, 4, 3],
      fingers: [0, 1, 3, 1, 2, 1],
      baseFret: 3,
      position: "barre",
      cagedForm: "A",
      difficulty: "intermediate"
    })
  ],

  // D maior
  "D": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "D",
      frets: [-1, -1, 0, 2, 3, 2],
      fingers: [0, 0, 0, 1, 3, 2],
      baseFret: 1,
      position: "open",
      cagedForm: "D",
      difficulty: "beginner"
    })
  ],

  // G maior
  "G": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "G",
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, 0, 0, 0, 3],
      baseFret: 1,
      position: "open",
      cagedForm: "G",
      difficulty: "beginner"
    }),
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "G",
      frets: [3, 2, 0, 0, 3, 3],
      fingers: [2, 1, 0, 0, 3, 4],
      baseFret: 1,
      position: "open",
      cagedForm: "G",
      difficulty: "beginner"
    })
  ],

  // E menor
  "Em": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Em",
      frets: [0, 2, 2, 0, 0, 0],
      fingers: [0, 2, 3, 0, 0, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "E",
      difficulty: "beginner"
    })
  ],

  // A menor
  "Am": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "Am",
      frets: [-1, 0, 2, 2, 1, 0],
      fingers: [0, 0, 2, 3, 1, 0],
      baseFret: 1,
      position: "open",
      cagedForm: "A",
      difficulty: "beginner"
    })
  ],

  // F maior
  "F": [
    createChordShape({
      instrument: "acoustic-guitar",
      chord: "F",
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      position: "barre",
      cagedForm: "E",
      difficulty: "intermediate"
    })
  ]
};

// =============================================================
// 2. SISTEMA CAGED E GERAÇÃO MÓVEL DE FORMAS
// =============================================================
/**
 * Modelos CAGED padrão para transposição dinâmica ao longo do braço:
 * C-Form, A-Form, G-Form, E-Form, D-Form
 */
export const CAGED_ROOT_OFFSETS = {
  "E": { stringRoot: 0, openSemitone: 4, shapeFrets: [0, 2, 2, 1, 0, 0], shapeFingers: [1, 3, 4, 2, 1, 1] },
  "A": { stringRoot: 1, openSemitone: 9, shapeFrets: [-1, 0, 2, 2, 2, 0], shapeFingers: [0, 1, 3, 3, 3, 1] },
  "D": { stringRoot: 2, openSemitone: 2, shapeFrets: [-1, -1, 0, 2, 3, 2], shapeFingers: [0, 0, 1, 3, 4, 2] },
  "C": { stringRoot: 1, openSemitone: 0, shapeFrets: [-1, 3, 2, 0, 1, 0], shapeFingers: [0, 4, 3, 1, 2, 1] },
  "G": { stringRoot: 0, openSemitone: 7, shapeFrets: [3, 2, 0, 0, 0, 3], shapeFingers: [4, 3, 1, 1, 1, 4] }
};

/**
 * Gera formas CAGED para qualquer tonalidade maior
 * @param {string} rootNote 
 * @returns {Object[]}
 */
export function generateCagedShapes(rootNote) {
  const normRoot = normalizeNote(rootNote);
  const targetSemi = NOTE_SEMITONES[normRoot];
  if (targetSemi === undefined) return [];

  const forms = [];
  const cagedKeys = ["C", "A", "G", "E", "D"];

  for (const formKey of cagedKeys) {
    const template = CAGED_ROOT_OFFSETS[formKey];
    const shift = (targetSemi - template.openSemitone + 12) % 12;
    const baseFret = shift === 0 ? 1 : shift;

    // Transpõe os trastes do template
    const frets = template.shapeFrets.map(f => {
      if (f === -1) return -1;
      return f + shift;
    });

    const shape = createChordShape({
      instrument: "acoustic-guitar",
      chord: rootNote,
      frets,
      fingers: template.shapeFingers,
      baseFret,
      position: shift === 0 ? "open" : "barre",
      cagedForm: formKey,
      difficulty: shift === 0 ? "beginner" : "intermediate"
    });

    // Valida musicalmente a forma gerada antes de retornar
    const val = validateChordShape(shape, { root: normRoot, quality: "major", notes: buildChord(normRoot, "major").notes });
    if (val.valid) {
      forms.push(shape);
    }
  }

  return forms;
}

// =============================================================
// 3. POSIÇÕES DE BAIXO (BASS POSITIONS)
// =============================================================
/**
 * Gera dados específicos para baixistas:
 * Raiz, terça, quinta, oitava, arpejos e padrões de condução
 * @param {string} chordSymbol 
 * @param {number} stringsCount 
 * @returns {Object} BassPosition
 */
export function getBassPosition(chordSymbol, stringsCount = 4) {
  const chord = parseChordSymbol(chordSymbol) || buildChord("C", "major");
  const rootSemi = NOTE_SEMITONES[normalizeNote(chord.root)] ?? 0;

  // No baixo EADG (4 cordas):
  // Corda E (0): nota E1 (semitom 4)
  // Corda A (1): nota A1 (semitom 9)
  // Corda D (2): nota D2 (semitom 2)
  // Corda G (3): nota G2 (semitom 7)

  // Encontra a casa da fundamental na corda E ou A
  const rootFretE = (rootSemi - 4 + 12) % 12;
  const rootFretA = (rootSemi - 9 + 12) % 12;

  const preferString = rootFretE <= 7 ? 0 : 1; // prefere corda E se até casa 7
  const rootFret = preferString === 0 ? rootFretE : rootFretA;

  const isMinor = chord.quality.includes("minor") || chord.quality === "diminished";
  const thirdInterval = isMinor ? 3 : 4;
  const fifthInterval = chord.quality === "diminished" || chord.quality === "minor7b5" ? 6 : 7;

  // Mapeamento de arpejo (fundamental, terça, quinta, oitava)
  const arpeggio = [
    { degree: "1", note: chord.root, string: preferString, fret: rootFret },
    { degree: isMinor ? "b3" : "3", note: chord.notes[1] || "", string: preferString + 1, fret: rootFret + (thirdInterval === 4 ? -1 : -2) },
    { degree: fifthInterval === 6 ? "b5" : "5", note: chord.notes[2] || "", string: preferString + 1, fret: rootFret + 2 },
    { degree: "8", note: chord.root, string: preferString + 2, fret: rootFret + 2 }
  ].filter(p => p.string < stringsCount && p.fret >= 0);

  return {
    chord: chord.symbol,
    root: chord.root,
    intervals: chord.intervals,
    frets: [rootFret],
    string: preferString,
    position: rootFret <= 4 ? "open/low" : "mid-neck",
    arpeggio,
    walkingPattern: {
      roots: [rootFret],
      approachNotes: [(rootFret - 1 + 12) % 12, (rootFret + 1) % 12]
    }
  };
}

// =============================================================
// 4. UKULELE (G4 C4 E4 A4)
// =============================================================
const UKULELE_DATABASE = {
  "C": [
    createChordShape({
      instrument: "ukulele",
      chord: "C",
      tuning: "G4 C4 E4 A4",
      frets: [0, 0, 0, 3],
      fingers: [0, 0, 0, 3],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "Cm": [
    createChordShape({
      instrument: "ukulele",
      chord: "Cm",
      tuning: "G4 C4 E4 A4",
      frets: [0, 3, 3, 3],
      fingers: [0, 1, 2, 3],
      baseFret: 1,
      position: "open",
      difficulty: "intermediate"
    })
  ],
  "C7": [
    createChordShape({
      instrument: "ukulele",
      chord: "C7",
      tuning: "G4 C4 E4 A4",
      frets: [0, 0, 0, 1],
      fingers: [0, 0, 0, 1],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "G": [
    createChordShape({
      instrument: "ukulele",
      chord: "G",
      tuning: "G4 C4 E4 A4",
      frets: [0, 2, 3, 2],
      fingers: [0, 1, 3, 2],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "F": [
    createChordShape({
      instrument: "ukulele",
      chord: "F",
      tuning: "G4 C4 E4 A4",
      frets: [2, 0, 1, 0],
      fingers: [2, 0, 1, 0],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "Am": [
    createChordShape({
      instrument: "ukulele",
      chord: "Am",
      tuning: "G4 C4 E4 A4",
      frets: [2, 0, 0, 0],
      fingers: [2, 0, 0, 0],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ]
};

// =============================================================
// 5. CAVAQUINHO (D4 G4 B4 D5)
// =============================================================
const CAVAQUINHO_DATABASE = {
  "C": [
    createChordShape({
      instrument: "cavaquinho",
      chord: "C",
      tuning: "D4 G4 B4 D5",
      frets: [2, 0, 1, 2],
      fingers: [2, 0, 1, 3],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "Cm": [
    createChordShape({
      instrument: "cavaquinho",
      chord: "Cm",
      tuning: "D4 G4 B4 D5",
      frets: [1, 0, 1, 1],
      fingers: [1, 0, 2, 3],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "G": [
    createChordShape({
      instrument: "cavaquinho",
      chord: "G",
      tuning: "D4 G4 B4 D5",
      frets: [0, 0, 0, 0],
      fingers: [0, 0, 0, 0],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ],
  "D7": [
    createChordShape({
      instrument: "cavaquinho",
      chord: "D7",
      tuning: "D4 G4 B4 D5",
      frets: [0, 2, 1, 0],
      fingers: [0, 2, 1, 0],
      baseFret: 1,
      position: "open",
      difficulty: "beginner"
    })
  ]
};

// =============================================================
// 6. PIANO / TECLADO (VOICINGS & INVERSÕES)
// =============================================================
/**
 * Constrói voicings e inversões para Piano/Teclado
 * @param {string} chordSymbol 
 * @param {number} baseOctave 
 * @returns {Object[]}
 */
export function getPianoVoicings(chordSymbol, baseOctave = 4) {
  const chord = parseChordSymbol(chordSymbol) || buildChord("C", "major");
  const notes = chord.notes;
  const voicings = [];

  // Posição Fundamental (Inversão 0)
  voicings.push({
    chord: chord.symbol,
    inversion: 0,
    inversionName: "Posição Fundamental",
    notes: [...notes],
    octave: baseOctave,
    hand: "both",
    leftHandNotes: [`${chord.root}${baseOctave - 1}`],
    rightHandNotes: notes.map((n, i) => `${n}${baseOctave + (i > 1 && NOTE_SEMITONES[normalizeNote(n)] < NOTE_SEMITONES[normalizeNote(notes[0])] ? 1 : 0)}`)
  });

  // Primeira Inversão (3ª no baixo)
  if (notes.length >= 3) {
    const inv1Notes = [...notes.slice(1), notes[0]];
    voicings.push({
      chord: chord.symbol,
      inversion: 1,
      inversionName: "1ª Inversão",
      notes: inv1Notes,
      octave: baseOctave,
      hand: "right",
      leftHandNotes: [`${notes[1]}${baseOctave - 1}`],
      rightHandNotes: inv1Notes.map((n, i) => `${n}${baseOctave + (i === inv1Notes.length - 1 ? 1 : 0)}`)
    });

    // Segunda Inversão (5ª no baixo)
    const inv2Notes = [...notes.slice(2), ...notes.slice(0, 2)];
    voicings.push({
      chord: chord.symbol,
      inversion: 2,
      inversionName: "2ª Inversão",
      notes: inv2Notes,
      octave: baseOctave,
      hand: "right",
      leftHandNotes: [`${notes[2]}${baseOctave - 1}`],
      rightHandNotes: inv2Notes.map((n, i) => `${n}${baseOctave + (i >= 1 ? 1 : 0)}`)
    });
  }

  // Terceira Inversão (Sétima no baixo, se tétrade)
  if (notes.length >= 4) {
    const inv3Notes = [...notes.slice(3), ...notes.slice(0, 3)];
    voicings.push({
      chord: chord.symbol,
      inversion: 3,
      inversionName: "3ª Inversão",
      notes: inv3Notes,
      octave: baseOctave,
      hand: "right",
      leftHandNotes: [`${notes[3]}${baseOctave - 1}`],
      rightHandNotes: inv3Notes.map((n, i) => `${n}${baseOctave + (i >= 1 ? 1 : 0)}`)
    });
  }

  return voicings;
}

// =============================================================
// 7. OBTENÇÃO GERAL DE FORMAS (RESOLVER)
// =============================================================
/**
 * Obtém todas as formas disponíveis de um acorde para determinado instrumento
 * @param {string} chordSymbol 
 * @param {string} instrumentId 
 * @returns {Object[]}
 */
export function getChordShapes(chordSymbol, instrumentId = "acoustic-guitar") {
  const clean = chordSymbol ? chordSymbol.trim() : "C";
  const instId = (instrumentId || "acoustic-guitar").toLowerCase();

  if (instId === "ukulele") {
    return UKULELE_DATABASE[clean] || [];
  }

  if (instId === "cavaquinho") {
    return CAVAQUINHO_DATABASE[clean] || [];
  }

  if (instId === "bass" || instId === "bass-5") {
    return [getBassPosition(clean, instId === "bass-5" ? 5 : 4)];
  }

  if (instId === "keyboard" || instId === "piano") {
    return getPianoVoicings(clean);
  }

  // Violão ou Guitarra
  const stored = GUITAR_SHAPES_DATABASE[clean];
  if (stored && stored.length > 0) {
    return stored;
  }

  // Se não estiver no banco fixo, tenta deduzir via CAGED dinâmico
  const chordObj = parseChordSymbol(clean);
  if (chordObj && chordObj.quality === "major") {
    return generateCagedShapes(chordObj.root);
  }

  return [];
}
