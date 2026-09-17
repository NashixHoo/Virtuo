// =============================================================
// VIRTUO MUSICAL ARRANGEMENT 2.0
// src/audio/musical-arrangement.js
// Estrutura canônica de arranjo musical para o Virtuo Real Band Engine
// Suporta seções, progressões ricas, múltiplos acordes por compasso,
// inversões de baixo independentes, dinâmicas e humanização.
// =============================================================

import {
  parseChordSymbol,
  buildChord,
  toEasyPlay,
  transposeChord,
  transposeProgression
} from "../chords/index.js";

export const CANONICAL_SECTIONS = [
  "intro",
  "verse",
  "preChorus",
  "chorus",
  "bridge",
  "instrumental",
  "solo",
  "breakdown",
  "ending"
];

export const DEFAULT_SECTION_DYNAMICS = {
  intro: 0.25,
  verse: 0.45,
  preChorus: 0.60,
  chorus: 0.75,
  bridge: 0.50,
  instrumental: 0.65,
  solo: 0.85,
  breakdown: 0.20,
  ending: 0.30
};

export class MusicalArrangement {
  constructor(options = {}) {
    this.songKey = String(options.songKey || options.key || "G").trim();
    this.tempo = Math.max(40, Math.min(240, parseInt(options.tempo || options.bpm, 10) || 74));
    this.timeSignature = options.timeSignature || options.meter || "4/4";
    this.beatsPerBar = this.timeSignature === "6/8" ? 6 : (this.timeSignature === "3/4" ? 3 : 4);
    this.stepsPerBar = this.timeSignature === "6/8" ? 6 : 8;

    this.style = options.style || "Worship";
    this.intensity = typeof options.intensity === "number" ? Math.max(0.0, Math.min(1.0, options.intensity)) : 0.5;

    this.sections = options.sections || {
      intro: { name: "Intro", bars: 2, defaultIntensity: 0.25 },
      verse: { name: "Verso", bars: 4, defaultIntensity: 0.45 },
      preChorus: { name: "Pré-Refrão", bars: 2, defaultIntensity: 0.60 },
      chorus: { name: "Refrão", bars: 4, defaultIntensity: 0.75 },
      bridge: { name: "Ponte", bars: 4, defaultIntensity: 0.50 },
      instrumental: { name: "Instrumental", bars: 2, defaultIntensity: 0.65 },
      solo: { name: "Solo", bars: 4, defaultIntensity: 0.85 },
      breakdown: { name: "Breakdown", bars: 2, defaultIntensity: 0.20 },
      ending: { name: "Final", bars: 2, defaultIntensity: 0.30 }
    };

    this.dynamics = { ...DEFAULT_SECTION_DYNAMICS, ...(options.dynamics || {}) };

    this.instruments = {
      drums: { enabled: true, volume: 0.8, mode: "worship" },
      bass: { enabled: true, volume: 0.75, mode: "BASS_NORMAL" },
      keyboard: { enabled: true, volume: 0.7, mode: "KEYS_PAD" },
      guitar: { enabled: true, volume: 0.7, mode: "strum" },
      ...(options.instruments || {})
    };

    // Lista ordenada de acordes estruturados
    this.progression = [];
    if (options.progression) {
      this.setProgression(options.progression);
    }
  }

  /**
   * Normaliza um acorde para objeto estruturado com root, bass, quality, notes e durações
   */
  structureChord(chordInput, defaultBar = 1, defaultStartBeat = 1, defaultDuration = null) {
    const rawSymbol = typeof chordInput === "string" ? chordInput.trim() : (chordInput?.symbol || chordInput?.raw || "G");
    const durationBeats = defaultDuration || chordInput?.durationBeats || this.beatsPerBar;
    const bar = chordInput?.bar !== undefined ? chordInput.bar : defaultBar;
    const startBeat = chordInput?.startBeat !== undefined ? chordInput.startBeat : defaultStartBeat;
    const section = chordInput?.section || "verse";

    let parsed = null;
    try {
      parsed = parseChordSymbol(rawSymbol);
    } catch {}

    let chordData = null;
    try {
      chordData = buildChord(rawSymbol);
    } catch {}

    const root = parsed?.root || chordData?.root || rawSymbol.replace(/[^A-Ga-g#b]/g, "") || "G";
    const bass = parsed?.bass || chordData?.bassNote || root;
    const isMinor = !!(
      (parsed?.quality && parsed.quality.includes("minor")) ||
      (chordData?.quality && chordData.quality.isMinor) ||
      (rawSymbol.includes("m") && !rawSymbol.toLowerCase().includes("maj"))
    );
    const quality = parsed?.quality || (isMinor ? "minor" : "major");

    let notes = parsed?.notes && parsed.notes.length > 0
      ? parsed.notes
      : (Array.isArray(chordData?.theoreticalNotes) && chordData.theoreticalNotes.length > 0
        ? chordData.theoreticalNotes
        : [root]);

    return {
      symbol: rawSymbol,
      root,
      bass,
      quality,
      notes,
      isMinor,
      durationBeats,
      startBeat,
      bar,
      section,
      originalChord: rawSymbol,
      easyPlayChord: toEasyPlay(rawSymbol)?.simplified || rawSymbol
    };
  }

  /**
   * Define uma progressão musical completa e calcula o posicionamento temporal
   */
  setProgression(progressionList) {
    if (!progressionList) return;
    const list = Array.isArray(progressionList)
      ? progressionList
      : String(progressionList).split(/[\s,-]+/).filter(Boolean);

    let currentBar = 1;
    let accumulatedBeat = 1;

    this.progression = list.map((item, idx) => {
      const structured = this.structureChord(item, currentBar, accumulatedBeat, this.beatsPerBar);
      currentBar += Math.max(1, Math.round(structured.durationBeats / this.beatsPerBar));
      accumulatedBeat += structured.durationBeats;
      return structured;
    });
  }

  /**
   * Obtém o acorde estruturado correspondente a um compasso e tempo específico
   */
  getChordAt(bar = 1, beat = 1) {
    if (this.progression.length === 0) {
      return this.structureChord(this.songKey, bar, beat, this.beatsPerBar);
    }

    // Se o compasso estiver mapeado diretamente
    const matched = this.progression.find(c => {
      if (c.bar === bar) {
        return beat >= c.startBeat && beat < (c.startBeat + c.durationBeats);
      }
      return false;
    });

    if (matched) return matched;

    // Fallback circular pelo índice do compasso (0-indexed)
    const circularIdx = Math.max(0, (bar - 1) % this.progression.length);
    return this.progression[circularIdx] || this.progression[0];
  }

  /**
   * Retorna o acorde seguinte para permitir condução harmônica e aproximações
   */
  getNextChord(currentBar = 1) {
    if (this.progression.length <= 1) {
      return this.progression[0] || this.structureChord(this.songKey);
    }
    const nextBar = currentBar + 1;
    return this.getChordAt(nextBar, 1);
  }

  /**
   * Obtém a intensidade recomendada para uma seção
   */
  getIntensityForSection(sectionName) {
    const norm = String(sectionName || "verse").toLowerCase().trim();
    if (norm.includes("intro")) return this.dynamics.intro;
    if (norm.includes("refr") || norm.includes("chorus")) return this.dynamics.chorus;
    if (norm.includes("pré") || norm.includes("pre")) return this.dynamics.preChorus;
    if (norm.includes("pont") || norm.includes("bridge")) return this.dynamics.bridge;
    if (norm.includes("solo")) return this.dynamics.solo;
    if (norm.includes("break")) return this.dynamics.breakdown;
    if (norm.includes("ending") || norm.includes("fim") || norm.includes("outro")) return this.dynamics.ending;
    return this.dynamics.verse;
  }

  /**
   * Fábrica estática a partir de uma lista simples de acordes
   */
  static fromProgression(chords, key = "G", tempo = 74, timeSignature = "4/4", style = "Worship") {
    return new MusicalArrangement({
      songKey: key,
      tempo,
      timeSignature,
      style,
      progression: chords
    });
  }

  /**
   * Fábrica estática a partir de um objeto de música do Virtuo
   */
  static fromSong(song, keyOffset = 0, isEasy = false, rehearsalBpm = null) {
    if (!song) {
      return new MusicalArrangement();
    }
    let baseKey = song.originalKey || song.key || "G";
    let targetKey = baseKey;
    if (keyOffset !== 0) {
      try {
        targetKey = transposeChord(baseKey, keyOffset);
      } catch {
        targetKey = baseKey;
      }
    }

    const rawChords = (isEasy && song.easyChords) ? song.easyChords : (song.chords || "");
    const cleanText = String(rawChords).replace(/\[[^\]]+\]/g, " ");
    const regex = /\b([A-G][#b]?(?:m(?:aj|in)?|M(?:aj)?|dim|aug|sus[24]?|add[0-9]+|[0-9]+|°|\+)?(?:\/[A-G][#b]?)?)\b/g;
    let tokens = cleanText.match(regex) || [];

    if (tokens.length === 0) {
      tokens = [targetKey];
    } else if (keyOffset !== 0) {
      tokens = transposeProgression(tokens, keyOffset);
    }

    if (isEasy) {
      tokens = tokens.map(c => toEasyPlay(c)?.simplified || c);
    }

    return new MusicalArrangement({
      songKey: targetKey,
      tempo: rehearsalBpm || song.bpm || 74,
      timeSignature: song.meter || "4/4",
      style: song.style || "Worship",
      progression: tokens
    });
  }
}
