// =============================================================
// VIRTUO CHORD ENGINE: MAIN ENGINE FACADE
// src/chords/chord-engine.js
// API unificada, cache de alto desempenho em memória e offline-first
// =============================================================

import { normalizeNote, noteToMidi, midiToNote, enharmonicEquivalent, getSemitoneDistance } from "./notes.js";
import { INTERVALS, INTERVAL_LIST, getInterval } from "./intervals.js";
import { CHORD_QUALITIES, resolveQuality } from "./qualities.js";
import { buildChord, parseChordSymbol } from "./chord-builder.js";
import { INSTRUMENTS, getInstrument, getAllInstruments, registerInstrument } from "./instruments.js";
import { getChordShapes, generateCagedShapes, getBassPosition, getPianoVoicings, createChordShape } from "./shapes.js";
import { validateChordShape } from "./musical-validator.js";
import { transposeChord, transposeNote, transposeProgression } from "./transposer.js";
import { searchChords, identifyChordFromNotes } from "./search.js";
import { toEasyPlay, getSmartKeySubstitutions } from "./easy-play-integration.js";
import { ExternalChordImporter } from "./external-importer.js";
import { renderFretboardDiagramSvg, renderKeyboardDiagramSvg } from "./diagram-renderer.js";

/**
 * Motor Central de Acordes Virtuo (Virtuo Chord Engine)
 */
export class ChordEngine {
  // Cache de desempenho em memória (LRU / Map de alta velocidade)
  static #chordCache = new Map();
  static #shapesCache = new Map();

  /**
   * Obtém um acorde completo a partir de seu símbolo (ex: 'C', 'Cm7', 'D/F#')
   * Utiliza cache instantâneo sub-milissegundo
   * @param {string} symbol 
   * @returns {Object|null}
   */
  static getChord(symbol) {
    if (!symbol || typeof symbol !== "string") return null;
    const clean = symbol.trim();
    if (this.#chordCache.has(clean)) {
      return this.#chordCache.get(clean);
    }
    const chord = parseChordSymbol(clean);
    if (chord) {
      this.#chordCache.set(clean, chord);
    }
    return chord;
  }

  /**
   * Constrói teoricamente um acorde a partir da fundamental e qualidade
   * @param {string} root 
   * @param {string|Object} quality 
   * @param {string|null} bass 
   * @returns {Object|null}
   */
  static buildChord(root, quality = "major", bass = null) {
    const key = `${root}_${typeof quality === 'object' ? quality.id : quality}_${bass || ''}`;
    if (this.#chordCache.has(key)) {
      return this.#chordCache.get(key);
    }
    const chord = buildChord(root, quality, bass);
    if (chord) {
      this.#chordCache.set(key, chord);
    }
    return chord;
  }

  /**
   * Obtém formas de digitação para determinado instrumento
   * @param {string|Object} chordOrSymbol 
   * @param {string} instrumentId 
   * @returns {Object[]}
   */
  static getShapes(chordOrSymbol, instrumentId = "acoustic-guitar") {
    const symbol = typeof chordOrSymbol === "object" && chordOrSymbol !== null 
      ? chordOrSymbol.symbol 
      : chordOrSymbol;
    const cacheKey = `${symbol}_${instrumentId}`;
    if (this.#shapesCache.has(cacheKey)) {
      return this.#shapesCache.get(cacheKey);
    }
    const shapes = getChordShapes(symbol, instrumentId);
    this.#shapesCache.set(cacheKey, shapes);
    return shapes;
  }

  /**
   * Obtém a definição estrutural de um instrumento
   * @param {string} instrumentId 
   * @returns {Object|null}
   */
  static getInstrument(instrumentId) {
    return getInstrument(instrumentId);
  }

  /**
   * Retorna todos os instrumentos suportados
   * @returns {Object[]}
   */
  static getAllInstruments() {
    return getAllInstruments();
  }

  /**
   * Transpõe um acorde por número de semitons
   * @param {string|Object} chordOrSymbol 
   * @param {number} semitones 
   * @param {boolean|null} preferFlats 
   * @returns {string|Object}
   */
  static transpose(chordOrSymbol, semitones, preferFlats = null) {
    return transposeChord(chordOrSymbol, semitones, preferFlats);
  }

  /**
   * Transpõe uma progressão completa
   * @param {string[]|string} progression 
   * @param {number} semitones 
   * @param {boolean|null} preferFlats 
   * @returns {string[]|string}
   */
  static transposeProgression(progression, semitones, preferFlats = null) {
    return transposeProgression(progression, semitones, preferFlats);
  }

  /**
   * Obtém a lista teórica de notas de um acorde
   * @param {string|Object} chordOrSymbol 
   * @returns {string[]}
   */
  static getNotes(chordOrSymbol) {
    const chord = typeof chordOrSymbol === "object" && chordOrSymbol !== null
      ? chordOrSymbol
      : this.getChord(chordOrSymbol);
    return chord && Array.isArray(chord.notes) ? [...chord.notes] : [];
  }

  /**
   * Obtém os intervalos de uma qualidade ou acorde
   * @param {string|Object} qualityOrChord 
   * @returns {number[]}
   */
  static getIntervals(qualityOrChord) {
    if (typeof qualityOrChord === "object" && qualityOrChord !== null) {
      return Array.isArray(qualityOrChord.intervals) ? [...qualityOrChord.intervals] : [];
    }
    const q = resolveQuality(qualityOrChord);
    if (q) return [...q.intervals];
    const c = this.getChord(qualityOrChord);
    return c ? [...c.intervals] : [];
  }

  /**
   * Realiza busca de acordes (por nome ou notas)
   * @param {string|string[]} query 
   * @returns {Object[]}
   */
  static search(query) {
    if (Array.isArray(query) || (typeof query === "string" && query.includes(" "))) {
      return identifyChordFromNotes(query);
    }
    return searchChords(query);
  }

  /**
   * Valida musicalmente uma digitação contra um acorde esperado
   */
  static validateShape(shape, expectedChord, instrumentId = null) {
    return validateChordShape(shape, expectedChord, instrumentId);
  }

  /**
   * Converte para modo Easy Play mantendo integridade do original
   */
  static toEasyPlay(chordSymbol) {
    return toEasyPlay(chordSymbol);
  }

  /**
   * Obtém recomendações do Smart Key
   */
  static getSmartKeySubstitutions(chordSymbol, instrumentId) {
    return getSmartKeySubstitutions(chordSymbol, instrumentId);
  }

  /**
   * Renderiza diagrama SVG de braço ou teclado
   */
  static renderDiagramSvg(shapeOrNotes, type = "fretboard", options = {}) {
    if (type === "keyboard" || type === "piano") {
      const notes = Array.isArray(shapeOrNotes) 
        ? shapeOrNotes 
        : (shapeOrNotes?.notes || this.getNotes(shapeOrNotes));
      return renderKeyboardDiagramSvg(notes, options);
    }
    return renderFretboardDiagramSvg(shapeOrNotes, options);
  }

  /**
   * Limpa os caches em memória se necessário
   */
  static clearCache() {
    this.#chordCache.clear();
    this.#shapesCache.clear();
  }
}
