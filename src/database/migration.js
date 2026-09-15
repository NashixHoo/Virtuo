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
    // O tom original deve ser rigorosamente corrigido para 'Cm'
    if (
      normalized.id === "demo-misterio-olaria" || 
      normalized.normalizedTitle.includes("misterio na olaria")
    ) {
      normalized.originalKey = "Cm";
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
