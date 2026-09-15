// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: SCHEMAS & CONSTANTS
// src/database/schema.js
// =============================================================

export const SONG_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  PENDING_REVIEW: "pendingReview",
  REJECTED: "rejected",
  ARCHIVED: "archived"
};

export const SONG_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  UNLISTED: "unlisted"
};

export const LYRICS_STATUS = {
  UNAVAILABLE: "unavailable",
  AUTHORIZED: "authorized",
  LICENSED: "licensed",
  USER_PROVIDED: "userProvided",
  PENDING_REVIEW: "pendingReview"
};

export const SOURCE_TYPES = {
  OFFICIAL: "official",
  LICENSED: "licensed",
  USER: "user",
  MANUAL: "manual",
  IMPORTED: "imported"
};

export const EASY_PLAY_LEVELS = {
  EASY: "easy",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced"
};

export const CANONICAL_GENRES = [
  "Gospel",
  "Pentecostal",
  "Worship",
  "Pop",
  "Rock",
  "Sertanejo",
  "MPB",
  "Blues",
  "Jazz",
  "Soul",
  "R&B",
  "Country",
  "Reggae",
  "Folk",
  "Clássico",
  "Instrumental"
];

export const CANONICAL_DIFFICULTIES = [
  "Fácil",
  "Médio",
  "Difícil",
  "Avançado"
];

/**
 * Cria a estrutura base de uma entidade Song compatível com o novo schema profissional.
 */
export function createEmptySong(overrides = {}) {
  return {
    id: overrides.id || null,
    title: overrides.title !== undefined ? overrides.title : "",
    normalizedTitle: overrides.normalizedTitle !== undefined ? overrides.normalizedTitle : "",
    artistId: overrides.artistId || null,
    artistName: overrides.artistName !== undefined ? overrides.artistName : "Virtuo Worship",
    albumId: overrides.albumId || null,
    albumName: overrides.albumName || null,

    originalKey: overrides.originalKey !== undefined ? overrides.originalKey : "G",
    bpm: typeof overrides.bpm === "number" ? overrides.bpm : 74,
    timeSignature: overrides.timeSignature || "4/4",

    capo: typeof overrides.capo === "number" ? overrides.capo : 0,
    difficulty: overrides.difficulty || "Fácil",

    genres: Array.isArray(overrides.genres) ? overrides.genres : ["Gospel"],
    tags: Array.isArray(overrides.tags) ? overrides.tags : [],
    instruments: Array.isArray(overrides.instruments) ? overrides.instruments : ["Violão", "Guitarra", "Teclado", "Vocal"],

    chords: overrides.chords || [],
    easyChords: overrides.easyChords || [],
    chordSheet: overrides.chordSheet || "",
    easyChordSheet: overrides.easyChordSheet || "",

    structure: Array.isArray(overrides.structure) ? overrides.structure : [],

    lyrics: overrides.lyrics || null,
    lyricsStatus: overrides.lyricsStatus || LYRICS_STATUS.UNAVAILABLE,
    lyricsSource: overrides.lyricsSource || null,
    lyricsLicense: overrides.lyricsLicense || null,
    lyricsUpdatedAt: overrides.lyricsUpdatedAt || null,

    youtubeUrl: overrides.youtubeUrl || "",
    spotifyUrl: overrides.spotifyUrl || "",
    coverUrl: overrides.coverUrl || "",
    audioUrl: overrides.audioUrl || "",

    sourceType: overrides.sourceType || SOURCE_TYPES.USER,
    sourceName: overrides.sourceName || "Virtuo User",
    sourceUrl: overrides.sourceUrl || "",
    source: overrides.source || {
      type: overrides.sourceType || SOURCE_TYPES.USER,
      name: overrides.sourceName || "Virtuo User",
      url: overrides.sourceUrl || "",
      importedAt: null,
      verifiedAt: null,
      verifiedBy: null
    },

    createdBy: overrides.createdBy || null,
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null,

    status: overrides.status || SONG_STATUS.DRAFT,
    visibility: overrides.visibility || SONG_VISIBILITY.PRIVATE,

    version: typeof overrides.version === "number" ? overrides.version : 1,

    verified: !!overrides.verified,
    verifiedBy: overrides.verifiedBy || null,
    verificationStatus: overrides.verificationStatus || (overrides.verified ? "verified" : "unverified"),

    searchKeywords: Array.isArray(overrides.searchKeywords) ? overrides.searchKeywords : []
  };
}

/**
 * Cria a estrutura base de uma entidade Artist.
 */
export function createEmptyArtist(overrides = {}) {
  return {
    id: overrides.id || null,
    name: overrides.name || "",
    normalizedName: overrides.normalizedName || "",
    photoUrl: overrides.photoUrl || "",
    bio: overrides.bio || "",
    genres: Array.isArray(overrides.genres) ? overrides.genres : ["Gospel"],
    verified: !!overrides.verified,
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

/**
 * Cria a estrutura base de uma entidade Album.
 */
export function createEmptyAlbum(overrides = {}) {
  return {
    id: overrides.id || null,
    title: overrides.title || "",
    normalizedTitle: overrides.normalizedTitle || "",
    artistId: overrides.artistId || null,
    artistName: overrides.artistName || "",
    releaseYear: overrides.releaseYear || new Date().getFullYear(),
    coverUrl: overrides.coverUrl || "",
    tracks: Array.isArray(overrides.tracks) ? overrides.tracks : [],
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}
