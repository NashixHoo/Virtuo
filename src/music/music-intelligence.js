// =============================================================
// VIRTUO MUSIC INTELLIGENCE ENGINE 2.0
// src/music/music-intelligence.js
// Análise musical determinística avançada - 100% offline
// Zero chamadas a APIs externas, execução imediata (< 2ms)
// =============================================================

import { simplifyChord, identifySubstitutableChords } from "./easy-play.js";
import { transposeChord, calculateKey, getSemitoneDistance } from "./transposer.js";
import { suggestSmartKey } from "./smart-key.js";
import { generateStudyPlan } from "./study-plan.js";
import { parseChord, CHORD_FINDER_REGEX } from "./chord-parser.js";

export const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const PREFERRED_OPEN_KEYS_MAJOR = ["G", "C", "D", "E", "A"];
export const PREFERRED_OPEN_KEYS_MINOR = ["Em", "Am", "Dm"];

const MAJOR_SCALE_DEGREES = {
  0: { roman: "I", quality: "maj" },
  2: { roman: "ii", quality: "min" },
  4: { roman: "iii", quality: "min" },
  5: { roman: "IV", quality: "maj" },
  7: { roman: "V", quality: "maj" },
  9: { roman: "vi", quality: "min" },
  11: { roman: "vii°", quality: "dim" }
};

const MINOR_SCALE_DEGREES = {
  0: { roman: "i", quality: "min" },
  2: { roman: "ii°", quality: "dim" },
  3: { roman: "III", quality: "maj" },
  5: { roman: "iv", quality: "min" },
  7: { roman: "v", quality: "min" },
  8: { roman: "VI", quality: "maj" },
  10: { roman: "VII", quality: "maj" }
};

// Tabela de equivalências harmônicas diretas para relativos maiores e menores
const RELATIVE_KEYS_MAP = {
  // Menores -> Relativas Maiores
  "Am": "C", "Em": "G", "Bm": "D", "F#m": "A", "C#m": "E", "G#m": "B",
  "Dm": "F", "Gm": "Bb", "Cm": "Eb", "Fm": "Ab", "Bbm": "Db", "D#m": "F#",
  "A#m": "C#", "Ebm": "Gb",
  // Maiores -> Relativas Menores
  "C": "Am", "G": "Em", "D": "Bm", "A": "F#m", "E": "C#m", "B": "G#m",
  "F": "Dm", "Bb": "Gm", "Eb": "Cm", "Ab": "Fm", "Db": "Bbm", "F#": "D#m",
  "C#": "A#m", "Gb": "Ebm"
};

export class VirtuoMusicIntelligence {
  /**
   * Obtém a tonalidade relativa direta (maior <-> menor)
   */
  static getRelativeKey(key = "G") {
    if (!key) return "Em";
    const clean = key.trim();
    if (RELATIVE_KEYS_MAP[clean]) {
      return RELATIVE_KEYS_MAP[clean];
    }
    const isMinor = clean.endsWith("m");
    const root = clean.replace("m", "")
      .replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    const idx = CHROMATIC_SCALE.indexOf(root);
    if (idx === -1) return isMinor ? "C" : "Am";

    if (isMinor) {
      // Menor -> Maior (+3 semitons)
      const majorIdx = (idx + 3) % 12;
      const target = CHROMATIC_SCALE[majorIdx];
      // Ajuste enarmônico usual para tonalidades com bemóis
      const flatEquivalents = { "D#": "Eb", "G#": "Ab", "A#": "Bb", "C#": "Db" };
      return flatEquivalents[target] || target;
    } else {
      // Maior -> Menor (-3 semitons = +9)
      const minorIdx = (idx + 9) % 12;
      const target = CHROMATIC_SCALE[minorIdx];
      return `${target}m`;
    }
  }

  /**
   * Extrai lista sequencial e total de acordes da partitura/cifra
   */
  static extractChords(input) {
    if (!input) return [];
    if (Array.isArray(input)) return [...new Set(input.map(c => String(c).trim()).filter(Boolean))];
    const text = String(input);
    const matches = text.match(CHORD_FINDER_REGEX);
    if (!matches) return [];
    return [...new Set(matches.map(c => c.trim()).filter(c => parseChord(c) !== null))];
  }

  /**
   * Extrai todos os tokens de acordes preservando repetições e ordem sequencial
   */
  static extractSequentialChords(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(c => String(c).trim()).filter(Boolean);
    const text = String(input);
    const matches = text.match(CHORD_FINDER_REGEX);
    if (!matches) return [];
    return matches.map(c => c.trim()).filter(c => parseChord(c) !== null);
  }

  /**
   * Extrai seções estruturais de uma música
   */
  static extractSections(song) {
    const sections = [];
    if (song?.structure && typeof song.structure === "string") {
      const parts = song.structure.split(/•|-|\/|,/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }

    const chordsText = typeof song?.chords === "string" ? song.chords : (song?.chordSheet || "");
    const tagMatches = chordsText.match(/\[([^\]]+)\]/g);
    if (tagMatches && tagMatches.length > 0) {
      tagMatches.forEach(tag => {
        const clean = tag.replace(/\[|\]/g, "").trim();
        if (clean && !sections.includes(clean)) {
          sections.push(clean);
        }
      });
    }

    if (sections.length > 0) return sections;
    return ["Intro", "Verso", "Refrão", "Final"];
  }

  /**
   * Cálculo determinístico e transparente de dificuldade
   */
  static calculateDeterministicDifficulty(chordsInput, bpm = 74, structureInput = "") {
    const uniqueChords = this.extractChords(chordsInput);
    const sequentialChords = this.extractSequentialChords(chordsInput);
    let score = 0;
    const reasons = [];

    const barreChords = ["F", "B", "Bb", "F#", "F#m", "Bm", "G#m", "C#m", "D#m", "Ab", "Eb", "Cm", "Fm"];
    const slashChords = uniqueChords.filter(c => c.includes("/"));
    const seventhChords = uniqueChords.filter(c => /(?:7|7M|maj7|m7)/i.test(c));
    const complexExtensions = uniqueChords.filter(c => /(?:9|11|13|dim|aug|m7b5|sus|add|°|\+)/i.test(c));
    const foundBarres = uniqueChords.filter(c => barreChords.some(b => c === b || c.startsWith(b)));

    // 1. Quantidade de acordes
    if (uniqueChords.length >= 9) {
      score += 4;
      reasons.push(`${uniqueChords.length} acordes diferentes na harmonia`);
    } else if (uniqueChords.length >= 6) {
      score += 2;
      reasons.push(`${uniqueChords.length} acordes diferentes`);
    }

    // 2. Acordes com pestana
    if (foundBarres.length > 0) {
      score += foundBarres.length * 2;
      reasons.push(`${foundBarres.length} acorde(s) com pestana (${foundBarres.slice(0, 3).join(", ")})`);
    }

    // 3. Baixos invertidos
    if (slashChords.length > 0) {
      score += slashChords.length * 1.5;
      reasons.push(`${slashChords.length} baixo(s) invertido(s) (${slashChords.slice(0, 3).join(", ")})`);
    }

    // 4. Extensões e dissonâncias
    if (complexExtensions.length > 0) {
      score += complexExtensions.length * 1.5;
      reasons.push(`${complexExtensions.length} acorde(s) com extensão (${complexExtensions.slice(0, 3).join(", ")})`);
    }

    // 5. Acordes com sétima
    if (seventhChords.length > 0 && complexExtensions.length === 0) {
      score += seventhChords.length * 0.8;
      reasons.push(`${seventhChords.length} acorde(s) com sétima (${seventhChords.slice(0, 3).join(", ")})`);
    }

    // 6. Andamento (BPM)
    const numericBpm = Number(bpm) || 74;
    if (numericBpm > 125) {
      score += 3;
      reasons.push(`Andamento acelerado (${numericBpm} BPM)`);
    } else if (numericBpm < 55) {
      score += 1.5;
      reasons.push(`Andamento lento que exige sustentação de tempo (${numericBpm} BPM)`);
    }

    // 7. Mudanças rápidas de acordes
    const chordsText = typeof chordsInput === "string" ? chordsInput : "";
    let hasFastChanges = false;
    const lines = chordsText.split("\n");
    for (const line of lines) {
      const lineChords = line.match(/[A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|[0-9]+)*(?:\/[A-G][b#]*)?/g) || [];
      if (lineChords.length >= 4) {
        hasFastChanges = true;
        break;
      }
    }
    if (hasFastChanges) {
      score += 2;
      reasons.push("Mudanças rápidas de acordes entre os compassos");
    }

    // 8. Seções da estrutura
    const sectionsCount = structureInput ? structureInput.split(/•|-|\/|,/).length : 4;
    if (sectionsCount > 5) {
      score += 2;
      reasons.push(`Estrutura longa com ${sectionsCount} seções`);
    }

    // Classificação estrita conforme especificação V2
    let difficulty = "Fácil";
    if (score >= 14) {
      difficulty = "Avançado";
    } else if (score >= 8) {
      difficulty = "Difícil";
    } else if (score >= 3.5) {
      difficulty = "Médio";
    }

    if (reasons.length === 0) {
      reasons.push("Harmonia direta com digitações abertas e progressão estável");
    }

    return {
      difficulty,
      score: parseFloat(score.toFixed(1)),
      reasons,
      totalChords: sequentialChords.length,
      uniqueCount: uniqueChords.length
    };
  }

  /**
   * Análise completa estruturada de uma música (VIRTUO MUSIC INTELLIGENCE 2.0)
   * 
   * @param {Object} song - Canção com título, tom, bpm, acordes e estrutura
   * @returns {Object} Análise estruturada completa
   */
  static analyzeSong(song) {
    const chordsText = typeof song?.chords === "string" ? song.chords : (song?.chordSheet || "");
    const key = song?.key || song?.originalKey || "G";
    const bpm = Number(song?.bpm) || 74;
    const timeSignature = song?.timeSignature || "4/4";

    const uniqueChords = this.extractChords(chordsText);
    const sequentialChords = this.extractSequentialChords(chordsText);
    const relativeKey = this.getRelativeKey(key);
    const sections = this.extractSections(song);

    // Dificuldade determinística
    const diffAnalysis = this.calculateDeterministicDifficulty(chordsText, bpm, song?.structure || sections.join(" • "));
    const difficulty = diffAnalysis.difficulty;
    const difficultyReasons = diffAnalysis.reasons;

    // Detecção de acordes com sétima, extensões e slash chords
    const seventhChords = uniqueChords.filter(c => /(?:7|7M|maj7|m7)/i.test(c));
    const extendedChords = uniqueChords.filter(c => /(?:9|11|13|dim|aug|m7b5|sus|add|°|\+)/i.test(c));
    const slashChords = uniqueChords.filter(c => c.includes("/"));

    // Mudanças rápidas de acordes
    const fastChanges = diffAnalysis.reasons.some(r => r.toLowerCase().includes("mudanças rápidas"));

    // Progressão harmônica e graus
    const progressionAnalysis = this.analyzeProgression(uniqueChords, key);

    // Repetições de progressões
    const repeatingProgressions = this.detectProgressionLoops(sequentialChords);

    // Capotraste inteligente
    const capoSuggestion = this.suggestCapo(key, song?.originalKey);

    // Smart Key
    const smartKeySuggestion = suggestSmartKey(song, key);

    // Simplificação e Easy Play
    const substitutableChords = identifySubstitutableChords(uniqueChords, key);
    const easyPlayAvailable = substitutableChords.some(s => s.canSimplify);

    const simplificationSuggestions = substitutableChords
      .filter(s => s.canSimplify)
      .map(s => ({
        original: s.original,
        easy: s.easy,
        harmonicFunction: s.harmonicFunction,
        reason: s.reason
      }));

    // Plano de estudo estruturado em 7 dias
    const studyPlan = generateStudyPlan(song, { uniqueChords, difficulty, bpm });

    return {
      key,
      relativeKey,
      bpm,
      timeSignature,
      difficulty,
      chordCount: sequentialChords.length,
      uniqueChords,
      progression: progressionAnalysis.progressionDegrees || [],
      progressionDetails: progressionAnalysis.progression || [],
      cadence: progressionAnalysis.cadence,
      sections,
      capoSuggestion,
      smartKeySuggestion,
      easyPlayAvailable,
      difficultyReasons,
      seventhChords,
      extendedChords,
      slashChords,
      fastChanges,
      repeatingProgressions,
      simplificationSuggestions,
      studyPlan,
      score: diffAnalysis.score
    };
  }

  /**
   * Detecta loops ou ciclos repetitivos de progressão
   */
  static detectProgressionLoops(chords) {
    if (!Array.isArray(chords) || chords.length < 6) return [];
    const loops = [];
    const windowSize = 4;

    for (let i = 0; i <= chords.length - (windowSize * 2); i++) {
      const pattern = chords.slice(i, i + windowSize).join(" - ");
      const nextPattern = chords.slice(i + windowSize, i + (windowSize * 2)).join(" - ");
      if (pattern === nextPattern && !loops.includes(pattern)) {
        loops.push(pattern);
      }
    }
    return loops;
  }

  /**
   * Sugestão inteligente de Capotraste para violão (Compatível V1)
   */
  static suggestCapo(key, originalKey = null, preferredTargetKey = null) {
    const rootKey = key || originalKey || "G";
    const isMinor = rootKey.endsWith("m");
    const cleanRoot = rootKey.replace("m", "")
      .replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    const rootIndex = CHROMATIC_SCALE.indexOf(cleanRoot);

    if (rootIndex === -1) {
      return { suggestedCapo: 0, capoFret: 0, shapeKey: rootKey, explanation: "Tom padrão sem capotraste necessário." };
    }

    const preferredShapes = isMinor ? PREFERRED_OPEN_KEYS_MINOR : PREFERRED_OPEN_KEYS_MAJOR;

    // Se já for uma tonalidade aberta ideal, capo 0
    if (preferredShapes.includes(rootKey)) {
      return {
        suggestedCapo: 0,
        capoFret: 0,
        shapeKey: rootKey,
        explanation: `O tom ${rootKey} já utiliza digitações abertas naturais ideais para violão e teclado.`
      };
    }

    let bestCapo = 0;
    let bestShape = rootKey;
    let minCapo = 12;

    for (const shape of preferredShapes) {
      const shapeClean = shape.replace("m", "")
        .replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
      const shapeIdx = CHROMATIC_SCALE.indexOf(shapeClean);
      if (shapeIdx === -1) continue;

      let capoFret = (rootIndex - shapeIdx + 12) % 12;
      if (capoFret > 0 && capoFret <= 7 && capoFret < minCapo) {
        minCapo = capoFret;
        bestCapo = capoFret;
        bestShape = shape;
      }
    }

    if (bestCapo === 0) {
      return {
        suggestedCapo: 0,
        capoFret: 0,
        shapeKey: rootKey,
        explanation: `Toque diretamente no tom de ${rootKey}.`
      };
    }

    return {
      suggestedCapo: bestCapo,
      capoFret: bestCapo,
      shapeKey: bestShape,
      explanation: `Coloque o Capotraste na ${bestCapo}ª casa e toque com digitações de ${bestShape} para obter acordes abertos e sonoros.`
    };
  }

  /**
   * Estimativa de dificuldade musical (Compatibilidade V1)
   */
  static estimateDifficulty(chordsInput, bpm = 74, structure = "") {
    const result = this.calculateDeterministicDifficulty(chordsInput, bpm, structure);
    const level = result.difficulty === "Fácil" ? "Iniciante" : result.difficulty === "Médio" ? "Intermediário" : "Avançado";
    return {
      difficulty: result.difficulty,
      level,
      score: result.score,
      reasons: result.reasons,
      totalChords: result.totalChords
    };
  }

  /**
   * Simplificação inteligente de lista de acordes (Compatibilidade V1)
   */
  static suggestEasyChords(chordsInput, key = "G") {
    const list = this.extractChords(chordsInput);
    const easyMap = {};
    const easyList = [];

    for (const chord of list) {
      const simplified = simplifyChord(chord);
      easyMap[chord] = simplified;
      if (!easyList.includes(simplified)) {
        easyList.push(simplified);
      }
    }

    return {
      originalChords: list,
      easyChords: easyList,
      chordMap: easyMap,
      reductionCount: list.length - easyList.length
    };
  }

  /**
   * Análise harmônica determinística e progressão por graus (Compatibilidade V1)
   */
  static analyzeProgression(chordsInput, key = "G") {
    const chords = this.extractChords(chordsInput);
    const isMinor = key.endsWith("m");
    const tonicClean = key.replace("m", "").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    const tonicIdx = CHROMATIC_SCALE.indexOf(tonicClean);

    if (tonicIdx === -1) {
      return { progression: [], progressionDegrees: [], cadence: "Progressão Livre", characteristics: [] };
    }

    const degreeTable = isMinor ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;

    const progression = chords.map(chord => {
      const baseNote = chord.split("/")[0].replace("m", "").replace("7", "").replace("9", "").replace("sus4", "").replace("4", "");
      const cleanBase = baseNote.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
      const baseIdx = CHROMATIC_SCALE.indexOf(cleanBase);

      if (baseIdx === -1) {
        return { chord, degree: "?" };
      }

      const interval = (baseIdx - tonicIdx + 12) % 12;
      const degInfo = degreeTable[interval];
      return {
        chord,
        degree: degInfo ? degInfo.roman : `b${interval}`,
        interval
      };
    });

    const progressionDegrees = progression.map(p => p.degree);

    // Detectar cadências conhecidas de Louvor e Adoração
    const degreesStr = progression.map(p => p.degree).join(" - ");
    let cadence = "Harmonia Contemporânea";

    if (degreesStr.includes("I - V - vi - IV") || degreesStr.includes("I - IV - vi - V")) {
      cadence = "Worship Standard (I - V - vi - IV / I - IV - vi - V)";
    } else if (degreesStr.includes("vi - IV - I - V")) {
      cadence = "Worship Contemplativo (vi - IV - I - V)";
    } else if (degreesStr.includes("ii - V - I")) {
      cadence = "Cadência Autêntica Clássica (ii - V - I)";
    } else if (degreesStr.includes("I - IV - I")) {
      cadence = "Cadência Plagal de Adoração (I - IV - I)";
    } else if (degreesStr.includes("i - VII - VI - v") || degreesStr.includes("i - VI - III - VII")) {
      cadence = "Cadência Menor Worship (i - VI - III - VII)";
    }

    return {
      key,
      isMinor,
      progression,
      progressionDegrees,
      cadence,
      summary: `Tonalidade de ${key} com ${progression.length} acordes analisados sob a cadência ${cadence}.`
    };
  }

  /**
   * Sequência de treino com metrônomo para transições de acordes (Compatibilidade V1)
   */
  static suggestPracticeSequence(chordsInput, bpm = 74, difficulty = "Médio") {
    const chords = this.extractChords(chordsInput);
    if (chords.length === 0) {
      return { drills: [], targetBpm: bpm, warmUpBpm: 60 };
    }

    const warmUpBpm = Math.max(40, Math.round(bpm * 0.75));
    const pairs = [];
    for (let i = 0; i < chords.length - 1; i++) {
      pairs.push({ from: chords[i], to: chords[i + 1] });
    }
    if (chords.length > 2) {
      pairs.push({ from: chords[chords.length - 1], to: chords[0] });
    }

    const drills = pairs.slice(0, 4).map((pair, idx) => ({
      step: idx + 1,
      from: pair.from,
      to: pair.to,
      title: `Transição ${pair.from} → ${pair.to}`,
      durationSeconds: 60,
      bars: 4,
      instruction: `Execute 4 compassos alternando entre ${pair.from} e ${pair.to} a ${warmUpBpm} BPM, subindo gradualmente até ${bpm} BPM.`
    }));

    return {
      drills,
      warmUpBpm,
      targetBpm: bpm,
      totalExercises: drills.length
    };
  }

  /**
   * Transpõe uma progressão por semitons (Compatibilidade V1)
   */
  static transposeProgression(progression, semitones) {
    if (!Array.isArray(progression)) return [];
    return progression.map(chord => transposeChord(chord, semitones));
  }

  /**
   * Sugestão determinística de arranjo da banda (Compatibilidade V1)
   */
  static suggestBandArrangement(song, preset = "Worship", instruments = []) {
    const title = song?.title || "Louvor";
    const key = song?.key || song?.originalKey || "G";
    const bpm = song?.bpm || 74;

    const baseArrangement = {
      song: title,
      key,
      bpm,
      preset,
      roles: {
        vocals: `Condução vocal no tom ${key}. Verso 1 com voz solo suave; abrir vozes (soprano/contralto) no refrão.`,
        acousticGuitar: `Violão com arpejos limpos na introdução e levada rítmica constante a partir do refrão.`,
        electricGuitar: `Guitarra base em ambiência (delay 1/8 pontuada + reverb shimmer) no verso. Power chords no clímax.`,
        bass: `Baixo entra firme no segundo verso. Sustentar notas fundamentais e conduzir nos baixos invertidos.`,
        keyboard: `Teclado sustentando Pad celestial contínuo e piano acústico marcando as cabeças de compasso.`,
        drums: `Bateria com condução no chimbal fechado no verso, entrando bumbo no tempo 1 e 3, explodindo no refrão.`
      }
    };

    if (preset === "Congregacional") {
      baseArrangement.roles.drums = "Bateria com marcação firme de semínima, bumbo marcante e condução no prato de condução.";
      baseArrangement.roles.keyboard = "Piano marcando os acordes cheios para sustentação da congregação.";
    } else if (preset === "Pop" || preset === "Rock") {
      baseArrangement.roles.electricGuitar = "Overdrive médio, palm-muting nos versos e riffs nos espaços entre as frases.";
      baseArrangement.roles.drums = "Caixa no aro no verso e caixa aberta no centro com ghost notes no refrão.";
    }

    return baseArrangement;
  }
}

export const musicIntelligence = VirtuoMusicIntelligence;
