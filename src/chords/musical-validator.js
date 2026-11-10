// =============================================================
// VIRTUO CHORD ENGINE: MUSICAL VALIDATOR
// src/chords/musical-validator.js
// Validador estrito de digitações, notas geradas e integridade harmônica
// =============================================================

import { normalizeNote, noteToMidi, midiToNote } from "./notes.js";
import { parseChordSymbol, buildChord } from "./chord-builder.js";
import { getInstrument } from "./instruments.js";

/**
 * Valida estritamente uma forma de acorde (ChordShape) para um instrumento.
 * Verifica afinação, número de cordas, casas e se as notas resultantes
 * pertencem rigorosamente ao acorde esperado.
 * 
 * Rejeita qualquer forma inconsistente (ex: C maior gerando C, F#, A).
 * 
 * @param {Object} shape - Forma a validar { instrument, frets, chord, ... }
 * @param {string|Object} expectedChord - Símbolo ou objeto de acorde esperado
 * @param {string|Object} targetInstrument - Instrumento alvo
 * @returns {Object} { valid: boolean, errors: string[], notesPlayed: string[], chordDetected: string|null }
 */
export function validateChordShape(shape, expectedChord = null, targetInstrument = null) {
  const errors = [];

  if (!shape || typeof shape !== "object") {
    return { valid: false, errors: ["Forma de acorde inexistente ou inválida."], notesPlayed: [] };
  }

  // Identifica o instrumento
  const instId = shape.instrument || (typeof targetInstrument === "string" ? targetInstrument : targetInstrument?.id) || "acoustic-guitar";
  const inst = getInstrument(instId);

  if (!inst) {
    return { valid: false, errors: [`Instrumento '${instId}' não reconhecido.`], notesPlayed: [] };
  }

  // Instrumentos de cordas precisam de array de trastes
  if (inst.family === "strings") {
    if (!Array.isArray(shape.frets)) {
      return { valid: false, errors: ["A propriedade 'frets' deve ser um array numérico."], notesPlayed: [] };
    }

    if (shape.frets.length !== inst.strings) {
      errors.push(`Número de cordas inválido: a forma tem ${shape.frets.length} cordas, mas o instrumento '${inst.name}' possui ${inst.strings}.`);
    }

    // Valida intervalo de trastes (-1 = mutada, 0 = solta, até fretCount)
    for (let i = 0; i < shape.frets.length; i++) {
      const fret = shape.frets[i];
      if (typeof fret !== "number" || isNaN(fret) || fret < -1 || fret > inst.fretCount) {
        errors.push(`Traste inválido na corda ${i + 1}: ${fret} (limite: -1 a ${inst.fretCount}).`);
      }
    }
  }

  // Se houver erros estruturais básicos, encerra
  if (errors.length > 0) {
    return { valid: false, errors, notesPlayed: [] };
  }

  // Calcula as notas físicas resultantes de cada corda tocada
  const notesPlayed = [];
  const noteSet = new Set();
  let bassNote = null;

  if (inst.family === "strings") {
    for (let i = 0; i < shape.frets.length; i++) {
      const fret = shape.frets[i];
      if (fret === -1) continue; // Corda mutada

      const openTuningNote = inst.tuning[i];
      const openMidi = noteToMidi(openTuningNote);
      if (openMidi === -1) {
        errors.push(`Afinação da corda ${i + 1} (${openTuningNote}) é inválida.`);
        continue;
      }

      const playedMidi = openMidi + fret;
      const pitchClass = midiToNote(playedMidi, true, false); // ex: 'C', 'G', 'E'
      const normalizedPitch = normalizeNote(pitchClass);

      notesPlayed.push(normalizedPitch);
      noteSet.add(normalizedPitch);

      // A primeira corda mais grave tocada define o baixo físico da digitação
      if (!bassNote) {
        bassNote = normalizedPitch;
      }
    }

    if (notesPlayed.length === 0) {
      errors.push("Nenhuma nota está sendo tocada (todas as cordas estão mutadas).");
      return { valid: false, errors, notesPlayed: [] };
    }
  }

  // Resolve o acorde esperado para validação harmônica
  const chordTarget = expectedChord || shape.chord;
  const chordObj = typeof chordTarget === "string" ? parseChordSymbol(chordTarget) : chordTarget;

  if (chordObj && Array.isArray(chordObj.notes)) {
    const validPitchClasses = new Set(chordObj.notes.map(n => normalizeNote(n)));
    
    // Se o acorde tem baixo invertido especificado, inclui o baixo como nota permitida
    if (chordObj.bass) {
      validPitchClasses.add(normalizeNote(chordObj.bass));
    }

    // Checa cada nota tocada: se alguma nota tocada NÃO pertencer ao acorde, REJEITA!
    for (const note of noteSet) {
      if (!validPitchClasses.has(note)) {
        errors.push(
          `Inconsistência Harmônica: A nota '${note}' gerada na digitação não pertence ao acorde esperado '${chordObj.symbol}' [${chordObj.notes.join(", ")}].`
        );
      }
    }

    // Verifica se a fundamental ou pelo menos notas essenciais do acorde estão presentes
    const normalizedRoot = normalizeNote(chordObj.root);
    const hasRoot = noteSet.has(normalizedRoot);
    if (!hasRoot && !chordObj.bass) {
      // Aviso ou erro se a fundamental estiver completamente ausente em uma tríade simples
      if (chordObj.quality === "major" || chordObj.quality === "minor") {
        errors.push(`A nota fundamental '${normalizedRoot}' do acorde não foi encontrada na digitação.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    notesPlayed,
    uniqueNotes: Array.from(noteSet),
    bassNote
  };
}
