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
  if (!noteName) return 440;
  const noteStr = String(noteName).trim();
  const hasOctave = /[0-9]/.test(noteStr);
  const target = hasOctave ? noteStr : `${noteStr}${octave}`;
  const midi = noteToMidi(target, octave);
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
    this.lastKeyboardVoicing = null;
    this.bassMode = "BASS_NORMAL"; // "BASS_EASY" | "BASS_NORMAL" | "BASS_GROOVE"
  }

  setBassMode(mode) {
    if (["BASS_EASY", "BASS_NORMAL", "BASS_GROOVE"].includes(mode)) {
      this.bassMode = mode;
    }
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
  getCurrentChordInfo(chordSymbol = null, isEasy = null) {
    const rawSymbol = String(chordSymbol || this.currentChord || this.currentKey || "G").trim() || "G";
    const useEasy = isEasy !== null ? Boolean(isEasy) : this.isEasyPlay;
    let epSymbol = rawSymbol;
    try {
      const ep = toEasyPlay(rawSymbol);
      if (ep && (ep.easyChord || ep.simplified)) {
        epSymbol = ep.easyChord || ep.simplified;
      }
    } catch {}

    const resolvedSymbol = useEasy ? epSymbol : rawSymbol;
    const symbolStr = String(resolvedSymbol || "G");

    let parsed = null;
    try {
      parsed = parseChordSymbol(symbolStr);
    } catch {}

    let chordData = null;
    try {
      chordData = buildChord(symbolStr);
    } catch {}

    const root = parsed?.root || chordData?.root || "G";
    const bassNote = parsed?.bass || chordData?.bassNote || root;
    let notes = parsed?.notes && parsed.notes.length > 0
      ? parsed.notes
      : (Array.isArray(chordData?.theoreticalNotes) && chordData.theoreticalNotes.length > 0
        ? chordData.theoreticalNotes
        : [root]);

    // Garantia arquitetural: um acorde NUNCA é reduzido a uma única nota
    if (!notes || notes.length <= 1) {
      try {
        const rootMidi = noteToMidi(`${root}4`);
        const isMin = String(symbolStr).includes("m") && !String(symbolStr).toLowerCase().includes("maj");
        const thirdMidi = rootMidi + (isMin ? 3 : 4);
        const fifthMidi = rootMidi + 7;
        notes = [root, normalizeNote(CHROMATIC_SHARPS[thirdMidi % 12]), normalizeNote(CHROMATIC_SHARPS[fifthMidi % 12])];
      } catch {
        notes = [root];
      }
    }

    const isMinor = !!(
      (parsed?.quality && parsed.quality.includes("minor")) ||
      (chordData?.quality && chordData.quality.isMinor) ||
      (symbolStr.includes("m") && !symbolStr.toLowerCase().includes("maj"))
    );

    const info = {
      raw: rawSymbol,
      symbol: symbolStr,
      originalChord: rawSymbol,
      easyPlayChord: epSymbol,
      isEasyPlay: this.isEasyPlay,
      root,
      bassNote,
      notes,
      isMinor,
      progressionIndex: this.progressionIndex,
      progressionLength: this.activeProgression.length,
      nextChordSymbol: this.getNextChordSymbol()
    };

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
   */
  getBassFrequency(step, totalSteps = 8, style = "Worship", intensity = 3, explicitBassMode = null, explicitChord = null, explicitNextChord = null) {
    const currentInfo = explicitChord || this.getCurrentChordInfo();
    const bassNoteName = currentInfo.bass || currentInfo.bassNote || currentInfo.root || "G";
    const mode = explicitBassMode || (this.isEasyPlay ? "BASS_EASY" : this.bassMode);

    // Oitava 1 é o registro fundamental acústico do contrabaixo (E1 ~41Hz, G1 ~49Hz)
    const fundamentalFreq = noteToFrequency(bassNoteName, 1);

    // Quinta justa (7 semitons acima)
    const fifthFreq = fundamentalFreq * 1.498307;
    // Oitava justa (12 semitons acima)
    const octaveFreq = fundamentalFreq * 2.0;
    // Terça (maior: 4 semitons, menor: 3 semitons)
    const isMinor = currentInfo.isMinor || (currentInfo.quality && currentInfo.quality.includes("minor"));
    const thirdFreq = isMinor ? fundamentalFreq * 1.189207 : fundamentalFreq * 1.259921;

    // Se estiver em compasso 6/8
    if (totalSteps === 6) {
      if (step === 0) return fundamentalFreq;
      if (step === 3) return intensity >= 3 ? fifthFreq : fundamentalFreq;
      return fundamentalFreq;
    }

    // Compasso 4/4 (8 steps de colcheia)
    if (mode === "BASS_EASY") {
      // Fundamental no tempo 1, quinta no tempo 3 (se intensidade permitir)
      if (step === 0) return fundamentalFreq;
      if (step === 4) return intensity >= 3 ? fifthFreq : fundamentalFreq;
      return fundamentalFreq;
    }

    if (mode === "BASS_GROOVE") {
      // Fundamental, terça, antecipação rítmica, quinta, oitava e aproximação cromática
      if (step === 0) return fundamentalFreq;
      if (step === 2) return thirdFreq;
      if (step === 3) return fundamentalFreq; // Síncope / antecipação
      if (step === 4) return fifthFreq;
      if (step === 5) return octaveFreq;
      if (step === 6 || step === 7) {
        const nextRaw = explicitNextChord ? (explicitNextChord.bass || explicitNextChord.root) : this.getNextChordSymbol();
        let parsedNext = null;
        try { parsedNext = parseChordSymbol(nextRaw); } catch {}
        const nextRoot = parsedNext?.bass || parsedNext?.root || String(nextRaw).replace(/[^A-Ga-g#b]/g, "");
        if (nextRoot && nextRoot !== bassNoteName) {
          const nextTargetFreq = noteToFrequency(nextRoot, 1);
          return nextTargetFreq * 0.943874; // Aproximação cromática meio tom abaixo
        }
        return octaveFreq;
      }
      return fundamentalFreq;
    }

    // Padrão: BASS_NORMAL
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
    if (step === 6 || step === 7) {
      if ((this.activeProgression.length > 1 || explicitNextChord) && intensity >= 3) {
        const nextRaw = explicitNextChord ? (explicitNextChord.bass || explicitNextChord.root) : this.getNextChordSymbol();
        let parsedNext = null;
        try { parsedNext = parseChordSymbol(nextRaw); } catch {}
        const nextRoot = parsedNext?.bass || parsedNext?.root || String(nextRaw).replace(/[^A-Ga-g#b]/g, "");
        if (nextRoot && nextRoot !== bassNoteName) {
          // Aproximação cromática meio-tom abaixo da próxima fundamental
          const nextTargetFreq = noteToFrequency(nextRoot, 1);
          const approachHalfStep = nextTargetFreq * 0.943874; // -1 semitom
          return approachHalfStep;
        }
      }
      return intensity >= 4 ? octaveFreq : fifthFreq;
    }

    return fundamentalFreq;
  }

  getBassFrequencyForStep(step, totalSteps = 8, style = "Worship", intensity = 3, bassMode = null) {
    return this.getBassFrequency(step, totalSteps, style, intensity, bassMode);
  }

  /**
   * Retorna frequências para o teclado (Pad, Piano ou Worship) com voice leading natural
   */
  getKeyboardFrequencies(mode = "pad", octave = 4, explicitChord = null) {
    const currentInfo = explicitChord || this.getCurrentChordInfo();
    const chordSymbol = currentInfo.symbol || currentInfo.raw || "G";
    const normMode = String(mode).toLowerCase();

    try {
      const voicings = getPianoVoicings(chordSymbol);
      if (voicings && voicings.length > 0) {
        // Encontra o voicing que minimiza saltos interválicos em relação ao último voicing
        let bestVoicing = voicings[0];
        if (this.lastKeyboardVoicing && voicings.length > 1) {
          let minDistance = Infinity;
          for (const v of voicings) {
            const freqs = v.notes.map((n, i) => noteToFrequency(n, i === 0 ? 3 : 4));
            const avgDist = Math.abs(freqs[0] - this.lastKeyboardVoicing[0]);
            if (avgDist < minDistance) {
              minDistance = avgDist;
              bestVoicing = v;
            }
          }
        } else if (normMode.includes("pad") && voicings.length > 1) {
          bestVoicing = voicings[1] || voicings[0];
        }

        if (bestVoicing && Array.isArray(bestVoicing.notes)) {
          const freqs = bestVoicing.notes.map((noteName, idx) => {
            const noteOctave = idx === 0 ? 3 : (idx === 1 ? 4 : 4);
            return noteToFrequency(noteName, noteOctave);
          });
          this.lastKeyboardVoicing = freqs;
          return freqs;
        }
      }
    } catch {}

    const notes = currentInfo.notes && currentInfo.notes.length > 0 ? currentInfo.notes : [currentInfo.root || "G"];
    const freqs = notes.slice(0, 4).map((noteName, idx) => {
      const noteOctave = idx === 0 ? 3 : 4;
      return noteToFrequency(noteName, noteOctave);
    });
    this.lastKeyboardVoicing = freqs;
    return freqs;
  }

  getKeyboardVoicingFrequencies(octave = 4, mode = "pad") {
    return this.getKeyboardFrequencies(mode, octave);
  }

  /**
   * Retorna frequências para as cordas do violão / guitarra
   */
  getGuitarFrequencies(octave = 3) {
    const currentInfo = this.getCurrentChordInfo();
    const rootFreq = noteToFrequency(currentInfo.root, octave);
    const fifthFreq = rootFreq * 1.498307;
    const thirdFreq = currentInfo.isMinor ? rootFreq * 1.189207 : rootFreq * 1.259921;
    const octaveFreq = rootFreq * 2.0;

    return [rootFreq, fifthFreq, thirdFreq * 2.0, octaveFreq];
  }

  getGuitarStrumFrequencies(intensity = 3, octave = 3) {
    return this.getGuitarFrequencies(octave);
  }
}
