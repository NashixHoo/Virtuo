// =============================================================
// VIRTUO HARMONIC ENGINE
// src/audio/harmonic-engine.js
// Interpretação harmônica em tempo real, progressões e voice leading
// Integração profunda com o Virtuo Chord Engine (src/chords/)
// =============================================================

import {
  buildChord,
  parseChordSymbol,
  toEasyPlay,
  getPianoVoicings,
  getBassPosition,
  transposeChord,
  transposeProgression,
  noteToMidi,
  normalizeNote,
  CHROMATIC_SHARPS
} from "../chords/index.js";

/**
 * Converte número MIDI (0 a 127) para frequência em Hertz
 */
export function midiToFrequency(midi) {
  if (typeof midi !== "number" || isNaN(midi)) return 440;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converte nome de nota e oitava para frequência em Hertz
 */
export function noteToFrequency(noteName, octave = 4) {
  const midi = noteToMidi(noteName, octave);
  return midiToFrequency(midi);
}

export class HarmonicEngine {
  constructor() {
    this.currentKey = "G";
    this.currentChord = "G";
    this.activeProgression = ["G"];
    this.progressionIndex = 0;
    this.isEasyPlay = false;

    // Cache de acordes analisados para performance instantânea (< 0.1ms)
    this.chordCache = new Map();
  }

  setKey(key) {
    if (!key) return;
    this.currentKey = String(key).trim();
    // Se a progressão só tinha 1 acorde ou se o acorde atual era o tom antigo, atualiza
    if (this.activeProgression.length <= 1) {
      this.setChord(this.currentKey);
    }
  }

  setChord(chordSymbol) {
    if (!chordSymbol) return;
    this.currentChord = String(chordSymbol).trim();
    if (this.activeProgression.length <= 1) {
      this.activeProgression = [this.currentChord];
      this.progressionIndex = 0;
    }
  }

  setEasyPlay(enable) {
    this.isEasyPlay = !!enable;
  }

  /**
   * Define uma progressão explícita de acordes
   * @param {string[]|string} progression - Lista de acordes ou string separada por espaços/hífens
   */
  setProgression(progression) {
    if (!progression) return;

    let chords = [];
    if (Array.isArray(progression)) {
      chords = progression.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof progression === "string") {
      chords = this.parseChordsFromText(progression);
    }

    if (chords.length > 0) {
      this.activeProgression = chords;
      this.progressionIndex = 0;
      this.currentChord = this.activeProgression[0];
    }
  }

  /**
   * Extrai lista sequencial de acordes de um texto (cifra, seção ou linha)
   */
  parseChordsFromText(text) {
    if (!text || typeof text !== "string") return [];
    // Remove cabeçalhos de seção entre colchetes [Intro], [Refrão], etc.
    const cleanText = text.replace(/\[[^\]]+\]/g, " ");

    // Regex para identificar cifras musicais universais
    const regex = /\b([A-G][#b]?(?:m(?:aj|in)?|M(?:aj)?|dim|aug|sus[24]?|add[0-9]+|[0-9]+|°|\+)?(?:\/[A-G][#b]?)?)\b/g;
    const matches = cleanText.match(regex) || [];

    // Filtra tokens que são acordes válidos
    const validChords = [];
    for (const token of matches) {
      const parsed = parseChordSymbol(token);
      if (parsed && parsed.root) {
        validChords.push(token);
      }
    }

    return validChords.length > 0 ? validChords : ["G"];
  }

  /**
   * Carrega progressão a partir de um objeto de canção ou texto de cifra
   */
  loadSongProgression(songOrChords, keyOffset = 0, isEasy = false) {
    let rawChords = "";
    let baseKey = this.currentKey || "G";

    if (typeof songOrChords === "string") {
      rawChords = songOrChords;
    } else if (songOrChords && typeof songOrChords === "object") {
      rawChords = (isEasy && songOrChords.easyChords) ? songOrChords.easyChords : (songOrChords.chords || "");
      baseKey = songOrChords.originalKey || songOrChords.key || "G";
    }

    let parsedProgression = this.parseChordsFromText(rawChords);

    // Se a canção não tiver acordes explicitados, cria progressão harmônica baseada no tom
    if (parsedProgression.length === 0) {
      parsedProgression = this.getDefaultProgressionForKey(baseKey);
    }

    // Aplica transposição se keyOffset !== 0
    if (keyOffset !== 0) {
      parsedProgression = transposeProgression(parsedProgression, keyOffset);
    }

    // Aplica Easy Play se solicitado
    if (isEasy) {
      parsedProgression = parsedProgression.map(c => toEasyPlay(c).simplified);
    }

    this.activeProgression = parsedProgression;
    this.progressionIndex = 0;
    this.currentChord = this.activeProgression[0] || baseKey;
    this.isEasyPlay = !!isEasy;

    return this.activeProgression;
  }

  /**
   * Retorna progressão padrão para um tom (Worship I - V - vi - IV ou i - V - i - iv)
   */
  getDefaultProgressionForKey(key = "G") {
    const cleanKey = String(key || "G").trim();
    const isMinor = cleanKey.includes("m") && !cleanKey.includes("maj");
    const root = cleanKey.replace(/m.*/i, "");

    if (isMinor) {
      // Progressão menor congregacional: Im - bVI - bIII - bVII (ex: Cm - Ab - Eb - Bb)
      const prog = [cleanKey];
      try {
        const vi = transposeChord(cleanKey, 8); // bVI
        const iii = transposeChord(cleanKey, 3); // bIII
        const vii = transposeChord(cleanKey, 10); // bVII
        return [cleanKey, vi.replace(/m.*/, ""), iii.replace(/m.*/, ""), vii.replace(/m.*/, "")];
      } catch {
        return [cleanKey];
      }
    } else {
      // Progressão maior clássica de adoração: I - V - vi - IV
      try {
        const I = root;
        const V = transposeChord(root, 7);
        const vi = transposeChord(root, 9) + "m";
        const IV = transposeChord(root, 5);
        return [I, V, vi, IV];
      } catch {
        return [root];
      }
    }
  }

  /**
   * Avança para o próximo compasso na progressão
   */
  advanceBar() {
    if (this.activeProgression.length > 1) {
      this.progressionIndex = (this.progressionIndex + 1) % this.activeProgression.length;
      this.currentChord = this.activeProgression[this.progressionIndex];
    }
    return this.getCurrentChordInfo();
  }

  /**
   * Analisa e retorna informações detalhadas do acorde atual
   */
  getCurrentChordInfo() {
    const rawSymbol = this.currentChord || this.currentKey || "G";
    const resolvedSymbol = this.isEasyPlay ? toEasyPlay(rawSymbol).simplified : rawSymbol;

    const cacheKey = `${resolvedSymbol}:${this.isEasyPlay}`;
    if (this.chordCache.has(cacheKey)) {
      return this.chordCache.get(cacheKey);
    }

    let chordData = null;
    try {
      chordData = buildChord(resolvedSymbol);
    } catch {}

    if (!chordData) {
      // Fallback seguro se buildChord retornar null ou falhar
      const parsed = parseChordSymbol(resolvedSymbol);
      chordData = {
        root: parsed?.root || "G",
        bassNote: parsed?.bassNote || parsed?.root || "G",
        theoreticalNotes: [parsed?.root || "G"],
        quality: { isMinor: !!(parsed?.modifier && parsed.modifier.includes("m")) }
      };
    }

    const info = {
      raw: rawSymbol,
      symbol: resolvedSymbol,
      root: chordData.root || "G",
      bassNote: chordData.bassNote || chordData.root || "G",
      notes: Array.isArray(chordData.theoreticalNotes) && chordData.theoreticalNotes.length > 0
        ? chordData.theoreticalNotes
        : [chordData.root || "G"],
      isMinor: !!(chordData.quality && chordData.quality.isMinor),
      progressionIndex: this.progressionIndex,
      progressionLength: this.activeProgression.length,
      nextChordSymbol: this.getNextChordSymbol()
    };

    this.chordCache.set(cacheKey, info);
    return info;
  }

  getNextChordSymbol() {
    if (this.activeProgression.length <= 1) return this.currentChord;
    const nextIdx = (this.progressionIndex + 1) % this.activeProgression.length;
    const nextRaw = this.activeProgression[nextIdx];
    return this.isEasyPlay ? toEasyPlay(nextRaw).simplified : nextRaw;
  }

  /**
   * Retorna a frequência exata para a linha do baixo em cada step
   * NUNCA toca uma nota fixa:
   * - Step 0 (tempo 1): Fundamental ou baixo invertido (ex: D/F# toca F#)
   * - Step 2 (tempo 2): Fundamental ou terça
   * - Step 4 (tempo 3): Quinta justa (ou fundamental se suave)
   * - Step 6/7 (tempo 4 / condução): Oitava ou nota de aproximação cromática para o próximo acorde!
   */
  getBassFrequency(step, totalSteps = 8, style = "Worship", intensity = 3) {
    const currentInfo = this.getCurrentChordInfo();
    const bassNoteName = currentInfo.bassNote || currentInfo.root;

    // Oitava 2 é o registro natural do contrabaixo (E1 a G2)
    const fundamentalFreq = noteToFrequency(bassNoteName, 2);

    // Quinta justa (7 semitons acima)
    const fifthFreq = fundamentalFreq * 1.498307;
    // Oitava justa (12 semitons acima)
    const octaveFreq = fundamentalFreq * 2.0;
    // Terça (maior: 4 semitons, menor: 3 semitons)
    const thirdFreq = currentInfo.isMinor ? fundamentalFreq * 1.189207 : fundamentalFreq * 1.259921;

    // Se estiver em compasso 6/8
    if (totalSteps === 6) {
      if (step === 0) return fundamentalFreq;
      if (step === 3) return intensity >= 3 ? fifthFreq : fundamentalFreq;
      return fundamentalFreq;
    }

    // Compasso 4/4 (8 steps de colcheia)
    // 1. Tempo 1 (Step 0): SEMPRE a fundamental ou o baixo da inversão
    if (step === 0) {
      return fundamentalFreq;
    }

    // 2. Tempo 3 (Step 4): Quinta justa no andamento padrão
    if (step === 4) {
      return intensity >= 3 ? fifthFreq : fundamentalFreq;
    }

    // 3. Tempo 2 (Step 2): Terça em intensidades maiores, fundamental em suaves
    if (step === 2) {
      return intensity >= 4 ? thirdFreq : fundamentalFreq;
    }

    // 4. Último tempo do compasso (Step 6 ou 7): Condução / Walking Bass dinâmico
    // Prepara aproximação harmônica para o próximo acorde!
    if (step === 6 || step === 7) {
      if (this.activeProgression.length > 1 && intensity >= 3) {
        const nextInfo = this.getCurrentChordInfo();
        const nextRoot = this.getNextChordSymbol().replace(/[^A-Ga-g#b]/g, "");
        if (nextRoot && nextRoot !== bassNoteName) {
          // Aproximação cromática meio-tom abaixo da próxima fundamental
          const nextTargetFreq = noteToFrequency(nextRoot, 2);
          const approachHalfStep = nextTargetFreq * 0.943874; // -1 semitom
          return approachHalfStep;
        }
      }
      return intensity >= 4 ? octaveFreq : fifthFreq;
    }

    return fundamentalFreq;
  }

  /**
   * Retorna frequências para o teclado (Pad ou Piano) com voice leading natural
   */
  getKeyboardFrequencies(mode = "pad", octave = 4) {
    const currentInfo = this.getCurrentChordInfo();

    try {
      // Utiliza os voicings reais gerados pelo Virtuo Chord Engine
      const voicings = getPianoVoicings(currentInfo.symbol);
      if (voicings && voicings.length > 0) {
        // Seleciona o voicing da posição fundamental ou 1ª inversão
        const selectedVoicing = mode === "pad" ? (voicings[0] || voicings[1]) : voicings[0];
        if (selectedVoicing && Array.isArray(selectedVoicing.notes)) {
          return selectedVoicing.notes.map((noteName, idx) => {
            // Distribui as notas suavemente nas oitavas 3 e 4
            const noteOctave = idx === 0 ? 3 : (idx === 1 ? 4 : 4);
            return noteToFrequency(noteName, noteOctave);
          });
        }
      }
    } catch {}

    // Fallback acústico com notas teóricas
    const notes = currentInfo.notes;
    return notes.slice(0, 4).map((noteName, idx) => {
      const noteOctave = idx === 0 ? 3 : 4;
      return noteToFrequency(noteName, noteOctave);
    });
  }

  /**
   * Retorna frequências para as cordas do violão / guitarra
   */
  getGuitarFrequencies(octave = 3) {
    const currentInfo = this.getCurrentChordInfo();
    const notes = currentInfo.notes;

    // Constrói arranjo de 4 cordas abertas no registro médio do violão
    const rootFreq = noteToFrequency(currentInfo.root, octave);
    const fifthFreq = rootFreq * 1.498307;
    const thirdFreq = currentInfo.isMinor ? rootFreq * 1.189207 : rootFreq * 1.259921;
    const octaveFreq = rootFreq * 2.0;

    return [rootFreq, fifthFreq, thirdFreq * 2.0, octaveFreq];
  }
}
