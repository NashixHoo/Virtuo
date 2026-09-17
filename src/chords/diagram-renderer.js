// =============================================================
// VIRTUO CHORD ENGINE: DIAGRAM RENDERER (VDS)
// src/chords/diagram-renderer.js
// Renderizador SVG de alta precisão para braço de cordas e teclado/piano
// Virtuo Design System: #07101F, #0E1B35, #7EE7FF, #F8FAFC
// =============================================================

import { normalizeNote, NOTE_SEMITONES } from "./notes.js";

/**
 * Renderiza um diagrama de acordes para instrumentos de cordas em formato SVG puro e responsivo
 * @param {Object} shape - Objeto ChordShape
 * @param {Object} options - Configurações visuais
 * @returns {string} Código SVG
 */
export function renderFretboardDiagramSvg(shape, options = {}) {
  if (!shape || !Array.isArray(shape.frets)) {
    return `<svg width="140" height="170" viewBox="0 0 140 170"><text x="70" y="85" fill="#94A3B8" text-anchor="middle" font-size="12">Sem diagrama</text></svg>`;
  }

  const {
    width = 160,
    height = 200,
    title = shape.chord || "",
    showTitle = true,
    showFingers = true,
    theme = "virtuo"
  } = options;

  const numStrings = shape.frets.length;
  const numFrets = 5; // exibe janela padrão de 5 trastes
  const baseFret = shape.baseFret || 1;

  // Dimensões do grid
  const startX = 28;
  const startY = showTitle ? 48 : 26;
  const gridWidth = 104;
  const gridHeight = 118;
  const stringSpacing = gridWidth / (numStrings - 1);
  const fretSpacing = gridHeight / numFrets;

  let svgElements = [];

  // 1. Título do acorde
  if (showTitle && title) {
    svgElements.push(
      `<text x="${width / 2}" y="24" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" text-anchor="middle">${title}</text>`
    );
  }

  // 2. Nut (pestana superior) ou indicador de casa
  if (baseFret === 1) {
    // Pestana superior espessa
    svgElements.push(
      `<rect x="${startX - 2}" y="${startY - 4}" width="${gridWidth + 4}" height="5" rx="1" fill="#7EE7FF" opacity="0.85" />`
    );
  } else {
    // Indicador da casa base na lateral esquerda
    svgElements.push(
      `<text x="${startX - 8}" y="${startY + fretSpacing * 0.7}" fill="#7EE7FF" font-family="monospace" font-size="12" font-weight="700" text-anchor="end">${baseFret}ª</text>`
    );
    // Linha de traste normal
    svgElements.push(
      `<line x1="${startX}" y1="${startY}" x2="${startX + gridWidth}" y2="${startY}" stroke="#475569" stroke-width="2" />`
    );
  }

  // 3. Linhas dos trastes horizontais
  for (let f = 1; f <= numFrets; f++) {
    const y = startY + f * fretSpacing;
    svgElements.push(
      `<line x1="${startX}" y1="${y}" x2="${startX + gridWidth}" y2="${y}" stroke="#334155" stroke-width="1.2" />`
    );
  }

  // 4. Linhas das cordas verticais
  for (let s = 0; s < numStrings; s++) {
    const x = startX + s * stringSpacing;
    const strokeWidth = 1.0 + (numStrings - 1 - s) * 0.25; // cordas mais graves ligeiramente mais espessas
    svgElements.push(
      `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + gridHeight}" stroke="#64748B" stroke-width="${strokeWidth}" />`
    );
  }

  // 5. Indicadores de corda solta (O) ou mutada (X) no topo
  for (let s = 0; s < numStrings; s++) {
    const fret = shape.frets[s];
    const x = startX + s * stringSpacing;
    const y = startY - 12;

    if (fret === -1) {
      // X para mutada
      svgElements.push(
        `<text x="${x}" y="${y}" fill="#94A3B8" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">×</text>`
      );
    } else if (fret === 0) {
      // O para solta
      svgElements.push(
        `<circle cx="${x}" cy="${y - 4}" r="4" fill="none" stroke="#7EE7FF" stroke-width="1.8" />`
      );
    }
  }

  // 6. Pontos de digitação (bolinhas com números de dedo)
  for (let s = 0; s < numStrings; s++) {
    const fret = shape.frets[s];
    if (fret > 0) {
      // Normaliza para a janela visual
      const visualFret = baseFret === 1 ? fret : (fret - baseFret + 1);
      if (visualFret >= 1 && visualFret <= numFrets) {
        const x = startX + s * stringSpacing;
        const y = startY + (visualFret - 0.5) * fretSpacing;
        const finger = Array.isArray(shape.fingers) && shape.fingers[s] ? shape.fingers[s] : "";

        // Ponto principal em azul celestial Virtuo (#7EE7FF)
        svgElements.push(
          `<circle cx="${x}" cy="${y}" r="7.5" fill="#7EE7FF" filter="drop-shadow(0 0 4px rgba(126,231,255,0.4))" />`
        );

        // Número do dedo
        if (showFingers && finger && finger > 0) {
          svgElements.push(
            `<text x="${x}" y="${y + 3.5}" fill="#07101F" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${finger}</text>`
          );
        }
      }
    }
  }

  return `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 ${width} ${height}" 
      width="${width}" 
      height="${height}" 
      style="background:#0E1B35; border:1px solid rgba(126,231,255,0.15); border-radius:12px; display:block; margin:0 auto;"
    >
      ${svgElements.join("\n")}
    </svg>
  `;
}

/**
 * Renderiza um teclado/piano interativo com as teclas destacadas do acorde
 * @param {string[]} chordNotes - Array de notas (ex: ['C', 'E', 'G'])
 * @param {Object} options 
 * @returns {string} Código SVG
 */
export function renderKeyboardDiagramSvg(chordNotes = ["C", "E", "G"], options = {}) {
  const {
    width = 240,
    height = 90,
    title = "",
    startOctaveNote = 0, // Dó
    numKeys = 14 // 2 oitavas diatônicas (14 brancas)
  } = options;

  const normalizedTones = new Set(chordNotes.map(n => NOTE_SEMITONES[normalizeNote(n)]));

  // Mapa de notas brancas para 2 oitavas (C, D, E, F, G, A, B x2)
  const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11]; // semitons
  const blackKeyOffsets = [
    { semitone: 1, whiteIndex: 0 }, // C#
    { semitone: 3, whiteIndex: 1 }, // D#
    { semitone: 6, whiteIndex: 3 }, // F#
    { semitone: 8, whiteIndex: 4 }, // G#
    { semitone: 10, whiteIndex: 5 } // A#
  ];

  const whiteKeyWidth = width / 14;
  const whiteKeyHeight = height - 12;
  const blackKeyWidth = whiteKeyWidth * 0.65;
  const blackKeyHeight = whiteKeyHeight * 0.62;

  let elements = [];

  // Desenha teclas brancas primeiro
  for (let i = 0; i < 14; i++) {
    const semitone = whiteKeyPattern[i % 7];
    const isPlayed = normalizedTones.has(semitone);
    const x = i * whiteKeyWidth;
    const fill = isPlayed ? "#7EE7FF" : "#F8FAFC";

    elements.push(
      `<rect x="${x}" y="6" width="${whiteKeyWidth - 1}" height="${whiteKeyHeight}" rx="2" fill="${fill}" stroke="#334155" stroke-width="1" />`
    );
  }

  // Desenha teclas pretas por cima
  for (let oct = 0; oct < 2; oct++) {
    for (const b of blackKeyOffsets) {
      const whiteIdx = oct * 7 + b.whiteIndex;
      const x = (whiteIdx + 1) * whiteKeyWidth - blackKeyWidth / 2;
      const isPlayed = normalizedTones.has(b.semitone);
      const fill = isPlayed ? "#7EE7FF" : "#07101F";

      elements.push(
        `<rect x="${x}" y="6" width="${blackKeyWidth}" height="${blackKeyHeight}" rx="1.5" fill="${fill}" stroke="#1E293B" stroke-width="1" />`
      );
    }
  }

  return `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 ${width} ${height}" 
      width="${width}" 
      height="${height}" 
      style="background:#0E1B35; border:1px solid rgba(126,231,255,0.15); border-radius:12px; display:block; margin:0 auto; padding:4px;"
    >
      ${elements.join("\n")}
    </svg>
  `;
}
