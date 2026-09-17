// =============================================================
// VIRTUO CHORD ENGINE: EXTERNAL CHORD IMPORTER
// src/chords/external-importer.js
// Pipeline seguro com validação de licença, normalização e auditoria musical
// =============================================================

import { validateChordShape } from "./musical-validator.js";
import { parseChordSymbol } from "./chord-builder.js";
import { normalizeNote } from "./notes.js";

// Licenças abertas estritamente autorizadas para acervo estrutural
const ALLOWED_LICENSES = new Set([
  "MIT",
  "APACHE-2.0",
  "CC0",
  "CC-BY",
  "CC-BY-SA",
  "PUBLIC DOMAIN",
  "OPEN-DATA",
  "BSD-2-CLAUSE",
  "BSD-3-CLAUSE"
]);

/**
 * Pipeline estrito de importação externa
 */
export class ExternalChordImporter {
  /**
   * Valida metadados de licença e autoria de um lote de dados externos
   * @param {Object} metadata 
   * @returns {Object} { authorized: boolean, reason: string }
   */
  static verifyLicense(metadata) {
    if (!metadata || typeof metadata !== "object") {
      return { authorized: false, reason: "Metadados de fonte externa ausentes." };
    }

    const { source, license, attribution } = metadata;

    if (!source || typeof source !== "string") {
      return { authorized: false, reason: "Fonte de origem (source) não especificada." };
    }

    if (!license || typeof license !== "string") {
      return { authorized: false, reason: "Licença de distribuição não informada. Importação rejeitada por segurança." };
    }

    const cleanLic = license.trim().toUpperCase();
    if (!ALLOWED_LICENSES.has(cleanLic)) {
      return {
        authorized: false,
        reason: `Licença '${license}' não consta na lista de licenças abertas permitidas (Exigido: MIT, CC0, CC-BY, etc.).`
      };
    }

    if (!attribution || typeof attribution !== "string") {
      return { authorized: false, reason: "Atribuição de autoria ou fonte (attribution) obrigatória não informada." };
    }

    return { authorized: true, reason: "Licença verificada e autorizada." };
  }

  /**
   * Processa e valida um lote de formas externas seguindo as 5 etapas canônicas:
   * 1. Validação estrutural
   * 2. Verificação de licença
   * 3. Normalização
   * 4. Validação musical estrita
   * 5. Importação para o acervo
   * 
   * @param {Object[]} rawShapes - Formas a importar
   * @param {Object} sourceMetadata - Metadados de licença e origem
   * @returns {Object} Relatório detalhado da importação
   */
  static importBatch(rawShapes, sourceMetadata) {
    // Etapa 1 e 2: Verificação de licença
    const licenseCheck = this.verifyLicense(sourceMetadata);
    if (!licenseCheck.authorized) {
      return {
        success: false,
        importedCount: 0,
        rejectedCount: rawShapes ? rawShapes.length : 0,
        errors: [licenseCheck.reason],
        importedShapes: []
      };
    }

    if (!Array.isArray(rawShapes) || rawShapes.length === 0) {
      return {
        success: true,
        importedCount: 0,
        rejectedCount: 0,
        errors: ["Nenhum registro para importar."],
        importedShapes: []
      };
    }

    const importedShapes = [];
    const rejectionLogs = [];

    // Etapa 3 e 4: Normalização e Validação Musical
    rawShapes.forEach((raw, idx) => {
      // Bloqueio rigoroso contra letras de músicas ou material protegido
      if (raw.lyrics || raw.songTitle || raw.cifraSheet || raw.artist) {
        rejectionLogs.push(`Item #${idx}: Rejeitado por conter letras/cifras de músicas. O Chord Engine aceita exclusivamente formas estruturais.`);
        return;
      }

      if (!raw.chord || !Array.isArray(raw.frets)) {
        rejectionLogs.push(`Item #${idx}: Formato inválido (chord ou frets ausentes).`);
        return;
      }

      // Normaliza
      const normalizedChord = raw.chord.trim();
      const normalizedShape = {
        instrument: raw.instrument || "acoustic-guitar",
        chord: normalizedChord,
        frets: raw.frets.map(f => typeof f === "number" ? f : parseInt(f, 10)),
        fingers: Array.isArray(raw.fingers) ? raw.fingers : [],
        baseFret: raw.baseFret || 1,
        position: raw.position || "open",
        cagedForm: raw.cagedForm || null,
        difficulty: raw.difficulty || "intermediate",
        // Metadados de proveniência rastreável
        provenance: {
          source: sourceMetadata.source,
          license: sourceMetadata.license,
          attribution: sourceMetadata.attribution,
          version: sourceMetadata.version || "1.0",
          importDate: new Date().toISOString(),
          verified: true
        }
      };

      // Validação musical estrita (rejeita se notas geradas divergirem do acorde esperado)
      const validation = validateChordShape(normalizedShape, normalizedShape.chord, normalizedShape.instrument);
      if (!validation.valid) {
        rejectionLogs.push(`Item #${idx} (${normalizedChord}): Falha na validação musical -> ${validation.errors.join("; ")}`);
        return;
      }

      importedShapes.push(normalizedShape);
    });

    return {
      success: rejectionLogs.length === 0,
      importedCount: importedShapes.length,
      rejectedCount: rejectionLogs.length,
      errors: rejectionLogs,
      importedShapes,
      metadata: {
        ...sourceMetadata,
        importDate: new Date().toISOString()
      }
    };
  }
}
