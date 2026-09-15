// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: BARREL EXPORT
// src/database/index.js
// =============================================================

export {
  SONG_STATUS,
  SONG_VISIBILITY,
  LYRICS_STATUS,
  SOURCE_TYPES,
  EASY_PLAY_LEVELS,
  CANONICAL_GENRES,
  CANONICAL_DIFFICULTIES,
  createEmptySong,
  createEmptyArtist,
  createEmptyAlbum
} from "./schema.js";

export {
  SongNormalizer,
  removeAccents,
  normalizeSearchText,
  generateSearchKeywords,
  parseStructureFromText,
  structureToString,
  extractChordsFromSheet
} from "./normalizer.js";

export {
  SongValidator
} from "./validator.js";

export {
  SongImporter
} from "./importer.js";

export {
  SongMigration
} from "./migration.js";
