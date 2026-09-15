// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: MIGRATION & ADAPTER
// src/database/migration.js
// =============================================================

import { SongNormalizer } from "./normalizer.js";
import { 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  LYRICS_STATUS, 
  SOURCE_TYPES 
} from "./schema.js";

export const SongMigration = {
  /**
   * Migra um documento de música legado para o novo schema relacional profissional.
   * Mantém 100% de retrocompatibilidade com transposição, Easy Play e telas existentes.
   */
  migrateLegacySong(legacySong) {
    if (!legacySong) return null;

    // Normaliza os dados usando a camada SongNormalizer
    const normalized = SongNormalizer.normalizeSong(legacySong);

    // Ajuste específico para Mistério Na Olaria conforme requisito oficial #18 / #19:
    // O tom original deve ser rigorosamente corrigido para 'Cm' e harmonia ajustada matematicamente
    if (
      normalized.id === "demo-misterio-olaria" || 
      normalized.normalizedTitle.includes("misterio na olaria")
    ) {
      normalized.originalKey = "Cm";
      if (typeof normalized.chords === "string" && (normalized.chords.includes("G ") || normalized.chords.includes("G\n") || normalized.chords.includes("G\t"))) {
        normalized.chords = normalized.chords
          .replace(/\bG\b/g, "Cm")
          .replace(/\bC9\b/g, "Fm9")
          .replace(/\bEm7\b/g, "Ab7M")
          .replace(/\bEm\b/g, "Ab")
          .replace(/\bD\/F#\b/g, "G/B")
          .replace(/\bD\b/g, "G")
          .replace(/\bC\b/g, "Fm");
      }
      if (typeof normalized.chordSheet === "string" && (normalized.chordSheet.includes("G ") || normalized.chordSheet.includes("G\n"))) {
        normalized.chordSheet = normalized.chordSheet
          .replace(/\bG\b/g, "Cm")
          .replace(/\bC9\b/g, "Fm9")
          .replace(/\bEm7\b/g, "Ab7M")
          .replace(/\bEm\b/g, "Ab")
          .replace(/\bD\/F#\b/g, "G/B")
          .replace(/\bD\b/g, "G")
          .replace(/\bC\b/g, "Fm");
      }
      if (typeof normalized.easyChords === "string" && (normalized.easyChords.includes("G ") || normalized.easyChords.includes("G\n"))) {
        normalized.easyChords = normalized.easyChords
          .replace(/\bG\b/g, "Cm")
          .replace(/\bC\b/g, "Fm")
          .replace(/\bEm\b/g, "Ab")
          .replace(/\bD\b/g, "G");
      }
      if (typeof normalized.easyChordSheet === "string" && (normalized.easyChordSheet.includes("G ") || normalized.easyChordSheet.includes("G\n"))) {
        normalized.easyChordSheet = normalized.easyChordSheet
          .replace(/\bG\b/g, "Cm")
          .replace(/\bC\b/g, "Fm")
          .replace(/\bEm\b/g, "Ab")
          .replace(/\bD\b/g, "G");
      }
    }

    // Se a música for de demonstração ou oficial do sistema
    const isOfficialDemo = (legacySong.id && String(legacySong.id).startsWith("demo-")) || 
      legacySong.createdBy === "virtuo-master";

    if (isOfficialDemo) {
      normalized.status = SONG_STATUS.PUBLISHED;
      normalized.visibility = SONG_VISIBILITY.PUBLIC;
      normalized.verified = true;
      normalized.verifiedBy = "virtuo-master";
      normalized.verificationStatus = "verified";
      normalized.sourceType = SOURCE_TYPES.OFFICIAL;
      normalized.sourceName = "VIRTUO Oficial";
      normalized.source = {
        type: SOURCE_TYPES.OFFICIAL,
        name: "VIRTUO Oficial",
        url: "",
        importedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        verifiedBy: "virtuo-master"
      };
    }

    // Garante que não há letras inventadas se não disponíveis
    if (!normalized.lyrics) {
      normalized.lyrics = null;
      normalized.lyricsStatus = LYRICS_STATUS.UNAVAILABLE;
    }

    return normalized;
  },

  /**
   * Migra um conjunto de músicas legadas para o novo schema.
   */
  migrateAll(legacySongsList = []) {
    if (!Array.isArray(legacySongsList)) return [];
    return legacySongsList.map(song => this.migrateLegacySong(song));
  }
};
