// =============================================================
// VIRTUO MUSIC INTELLIGENCE ENGINE
// src/music/music-intelligence.js
// Local deterministic musical intelligence - 100% offline
// Zero external API calls, instant execution (< 2ms)
// =============================================================

import { simplifyChord, getSemitoneDistance, calculateKey, transposeChord } from "./index.js";

const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PREFERRED_OPEN_KEYS_MAJOR = ["G", "C", "D", "E", "A"];
const PREFERRED_OPEN_KEYS_MINOR = ["Em", "Am", "Dm"];

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

export class VirtuoMusicIntelligence {
  /**
   * Extrai lista única de acordes a partir de string ou array
   */
  static extractChords(input) {
    if (!input) return [];
    if (Array.isArray(input)) return [...new Set(input.map(c => String(c).trim()).filter(Boolean))];
    // Aceita acordes incluindo sustenido/bemol na fundamental e no baixo invertido (ex: D/F#)
    const matches = String(input).match(/[A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|[0-9]+)*(?:\/[A-G][b#]*)?/g);
    if (!matches) return [];
    return [...new Set(matches.map(c => c.trim()).filter(c => /^[A-G]/.test(c)))];
  }

  /**
   * Sugestão inteligente de Capotraste para violão
   */
  static suggestCapo(key, originalKey = null, preferredTargetKey = null) {
    const rootKey = key || originalKey || "G";
    const isMinor = rootKey.endsWith("m");
    const cleanRoot = rootKey.replace("m", "");
    const rootIndex = CHROMATIC_SCALE.indexOf(cleanRoot.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#"));

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
      const shapeClean = shape.replace("m", "");
      const shapeIdx = CHROMATIC_SCALE.indexOf(shapeClean.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#"));
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
   * Simplificação inteligente de lista ou partitura de acordes (Easy Play)
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
   * Estimativa de dificuldade musical determinística
   */
  static estimateDifficulty(chordsInput, bpm = 74, structure = "") {
    const chords = this.extractChords(chordsInput);
    let score = 0;
    const reasons = [];

    const barreChords = ["F", "B", "Bb", "F#", "F#m", "Bm", "G#m", "C#m", "D#m", "Ab", "Eb"];
    const slashChords = chords.filter(c => c.includes("/"));
    const complexExtensions = chords.filter(c => /(?:maj7|7M|9|11|13|dim|aug|m7b5|sus)/i.test(c));
    const foundBarres = chords.filter(c => barreChords.some(b => c.startsWith(b)));

    if (foundBarres.length > 0) {
      score += foundBarres.length * 2;
      reasons.push(`${foundBarres.length} acorde(s) com pestana (${foundBarres.slice(0, 3).join(", ")})`);
    }

    if (slashChords.length > 0) {
      score += slashChords.length * 1.5;
      reasons.push(`${slashChords.length} baixo(s) invertido(s) (${slashChords.slice(0, 3).join(", ")})`);
    }

    if (complexExtensions.length > 0) {
      score += complexExtensions.length * 1.2;
      reasons.push(`${complexExtensions.length} dissonância(s) ou extensão(ões) (${complexExtensions.slice(0, 3).join(", ")})`);
    }

    if (bpm > 125) {
      score += 3;
      reasons.push(`Andamento acelerado (${bpm} BPM)`);
    } else if (bpm < 55) {
      score += 1.5;
      reasons.push(`Andamento lento que exige sustentação de tempo (${bpm} BPM)`);
    }

    const structureSections = structure ? structure.split(/•|-|\//).length : 4;
    if (structureSections > 6) {
      score += 2;
      reasons.push(`Estrutura longa com ${structureSections} seções`);
    }

    let difficulty = "Fácil";
    if (score >= 12) {
      difficulty = "Avançado";
    } else if (score >= 7) {
      difficulty = "Difícil";
    } else if (score >= 3.5) {
      difficulty = "Médio";
    }

    const level = difficulty === "Fácil" ? "Iniciante" : difficulty === "Médio" ? "Intermediário" : "Avançado";

    return {
      difficulty,
      level,
      score: parseFloat(score.toFixed(1)),
      reasons,
      totalChords: chords.length
    };
  }

  /**
   * Análise harmônica determinística e progressão por graus
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
   * Sequência de treino com metrônomo para transições de acordes
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
   * Transpõe uma progressão por semitons
   */
  static transposeProgression(progression, semitones) {
    if (!Array.isArray(progression)) return [];
    return progression.map(chord => transposeChord(chord, semitones));
  }

  /**
   * Sugestão determinística de arranjo da banda
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
