// =============================================================
// VIRTUO BAND HARMONIC INTELLIGENCE
// src/audio/band-harmony.js
// Cálculo determinístico de acordes, linhas de baixo e voicings
// =============================================================

const NOTE_FREQUENCIES_OCTAVE_1 = {
  "C": 32.70, "C#": 34.65, "Db": 34.65,
  "D": 36.71, "D#": 38.89, "Eb": 38.89,
  "E": 41.20,
  "F": 43.65, "F#": 46.25, "Gb": 46.25,
  "G": 49.00, "G#": 51.91, "Ab": 51.91,
  "A": 55.00, "A#": 58.27, "Bb": 58.27,
  "B": 61.74
};

const SEMITONES_FROM_C = {
  "C": 0, "C#": 1, "Db": 1,
  "D": 2, "D#": 3, "Eb": 3,
  "E": 4,
  "F": 5, "F#": 6, "Gb": 6,
  "G": 7, "G#": 8, "Ab": 8,
  "A": 9, "A#": 10, "Bb": 10,
  "B": 11
};

export class BandHarmony {
  /**
   * Converte uma nota ou raiz de acorde em frequência fundamental
   */
  static getFrequency(noteName, octave = 2) {
    if (!noteName) return 65.41;
    const cleanNote = noteName.replace(/[^A-Ga-g#b]/g, "").toUpperCase();
    const formatted = cleanNote.charAt(0) + (cleanNote.includes("#") ? "#" : (cleanNote.includes("B") && cleanNote.length > 1 ? "b" : ""));
    const baseFreq = NOTE_FREQUENCIES_OCTAVE_1[formatted] || 32.70;
    return baseFreq * Math.pow(2, octave - 1);
  }

  /**
   * Decompõe uma cifra musical em:
   * root (fundamental), isMinor, bass (se houver inversão tipo D/F#), has7, has9
   */
  static parseChord(chordStr = "G") {
    const raw = String(chordStr || "G").trim();
    let rootPart = raw;
    let slashBass = null;

    if (raw.includes("/")) {
      const parts = raw.split("/");
      rootPart = parts[0].trim();
      slashBass = parts[1].trim();
    }

    // Identificar a nota base (ex: C, C#, Bb, F#)
    const match = rootPart.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (!match) {
      return {
        raw,
        root: "G",
        bassNote: slashBass || "G",
        isMinor: false,
        has7: false,
        has9: false
      };
    }

    const note = match[1].charAt(0).toUpperCase() + (match[1].length > 1 ? match[1].charAt(1).toLowerCase().replace("#", "#") : "");
    const suffix = match[2].toLowerCase();

    const isMinor = suffix.includes("m") && !suffix.includes("maj");
    const has7 = suffix.includes("7");
    const has9 = suffix.includes("9");

    return {
      raw,
      root: note,
      bassNote: slashBass ? slashBass.toUpperCase() : note,
      isMinor,
      has7,
      has9
    };
  }

  /**
   * Gera a nota certa do baixo para o step atual
   * Padrão harmônico musical:
   * Ex: C -> C, G, C (fundamental, quinta, fundamental)
   * Am -> A, E, A
   * D/F# -> F#, D, F# (respeita inversões perfeitamente!)
   */
  static getBassNoteForStep(chordStr, step, totalSteps = 8, style = "Worship", intensity = 3) {
    const parsed = this.parseChord(chordStr);
    const bassRootFreq = this.getFrequency(parsed.bassNote, 2); // Oitava 2 do baixo

    // Quinta justa: 7 semitons acima
    const fifthFreq = bassRootFreq * 1.4983;
    // Oitava acima: 12 semitons
    const octaveFreq = bassRootFreq * 2.0;
    // Terça (maior ou menor conforme o acorde)
    const thirdFreq = parsed.isMinor ? bassRootFreq * 1.1892 : bassRootFreq * 1.2599;

    // Em compassos 6/8
    if (totalSteps === 6) {
      if (step === 0) return bassRootFreq;
      if (step === 3) return fifthFreq;
      return bassRootFreq;
    }

    // Em compassos 4/4 (8 steps)
    // Step 0: Sempre a fundamental ou baixo invertido
    if (step === 0) return bassRootFreq;

    // Step 4 (tempo 3 do compasso): Quinta ou fundamental
    if (step === 4) {
      return intensity >= 3 ? fifthFreq : bassRootFreq;
    }

    // Steps sincopados (2, 3, 6, 7) dependem do estilo
    if (step === 2) {
      return intensity >= 4 ? thirdFreq : bassRootFreq;
    }
    if (step === 6) {
      return intensity >= 4 ? octaveFreq : fifthFreq;
    }

    return bassRootFreq;
  }

  /**
   * Voicings harmônicos para o Teclado / Pad
   * Retorna array de frequências (Root, Terça, Quinta, Sétima/Nona)
   */
  static getKeyboardFrequencies(chordStr, octave = 4) {
    const parsed = this.parseChord(chordStr);
    const rootFreq = this.getFrequency(parsed.root, octave);

    const thirdFreq = parsed.isMinor ? rootFreq * 1.1892 : rootFreq * 1.2599;
    const fifthFreq = rootFreq * 1.4983;

    const freqs = [rootFreq, thirdFreq, fifthFreq];

    if (parsed.has7) {
      freqs.push(rootFreq * 1.7818); // Sétima menor aprox
    } else if (parsed.has9) {
      freqs.push(rootFreq * 2.2449); // Nona (oitava + segunda)
    }

    return freqs;
  }

  /**
   * Frequências para dedilhado ou batida de Guitarra
   */
  static getGuitarFrequencies(chordStr, octave = 3) {
    const parsed = this.parseChord(chordStr);
    const rootFreq = this.getFrequency(parsed.root, octave);

    const thirdFreq = parsed.isMinor ? rootFreq * 1.1892 : rootFreq * 1.2599;
    const fifthFreq = rootFreq * 1.4983;
    const octaveFreq = rootFreq * 2.0;

    return [rootFreq, fifthFreq, thirdFreq * 2.0, octaveFreq];
  }

  /**
   * Transpõe um acorde harmonicamente por semitons
   */
  static transposeChord(chordStr, semitones = 0) {
    if (!chordStr || semitones === 0) return chordStr;
    const notesSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    return chordStr.replace(/([A-G][#b]?)/g, (match) => {
      const upper = match.charAt(0).toUpperCase() + (match.length > 1 ? match.charAt(1) : "");
      let currentIdx = SEMITONES_FROM_C[upper];
      if (currentIdx === undefined) return match;
      let newIdx = (currentIdx + semitones) % 12;
      if (newIdx < 0) newIdx += 12;
      return notesSharp[newIdx];
    });
  }
}
