// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: NORMALIZER
// src/database/normalizer.js
// =============================================================

import { parseChord, CHORD_FINDER_REGEX } from "../music/chord-parser.js";
import { 
  createEmptySong, 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  LYRICS_STATUS, 
  SOURCE_TYPES 
} from "./schema.js";

/**
 * Remove acentos, diacríticos e caracteres especiais para normalização textual.
 * Ex: "Canção de Adoração" -> "cancao de adoracao"
 */
export function removeAccents(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c");
}

/**
 * Normaliza um texto para busca: sem acentos, minúsculo, sem pontuação extrema.
 */
export function normalizeSearchText(str) {
  if (!str || typeof str !== "string") return "";
  return removeAccents(str)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera tokens e prefixos de busca para indexação rápida no Firestore.
 */
export function generateSearchKeywords(title = "", artist = "", album = "", genres = [], tags = []) {
  const wordsSet = new Set();

  const addTokensFrom = (text) => {
    if (!text || typeof text !== "string") return;
    const normalized = normalizeSearchText(text);
    if (!normalized) return;

    // Adiciona o termo inteiro
    wordsSet.add(normalized);

    // Adiciona cada palavra individual maior que 1 caractere
    const parts = normalized.split(" ");
    parts.forEach(p => {
      if (p.length >= 2) {
        wordsSet.add(p);
      }
    });

    // Adiciona prefixos das palavras para busca incremental tipo typeahead
    parts.forEach(p => {
      for (let i = 2; i <= p.length; i++) {
        wordsSet.add(p.substring(0, i));
      }
    });
  };

  addTokensFrom(title);
  addTokensFrom(artist);
  addTokensFrom(album);

  if (Array.isArray(genres)) {
    genres.forEach(g => addTokensFrom(g));
  }

  if (Array.isArray(tags)) {
    tags.forEach(t => addTokensFrom(t));
  }

  return Array.from(wordsSet).slice(0, 50); // Limite razoável para Firestore
}

/**
 * Converte estrutura em string ("Intro • Verso • Refrão") ou array
 * para a representação canônica estruturada de seções.
 */
export function parseStructureFromText(structureInput) {
  if (Array.isArray(structureInput) && structureInput.length > 0) {
    // Já é array: garante formato uniforme
    return structureInput.map((sec, idx) => ({
      type: (sec.type || "section").toLowerCase(),
      label: sec.label || `Seção ${idx + 1}`,
      order: typeof sec.order === "number" ? sec.order : idx,
      content: Array.isArray(sec.content) ? sec.content : []
    }));
  }

  if (typeof structureInput !== "string" || !structureInput.trim()) {
    return [
      { type: "intro", label: "Intro", order: 0, content: [] },
      { type: "verse", label: "Verso", order: 1, content: [] },
      { type: "chorus", label: "Refrão", order: 2, content: [] },
      { type: "outro", label: "Final", order: 3, content: [] }
    ];
  }

  // Divide por marcadores como •, |, -, > ou quebras de linha
  const parts = structureInput
    .split(/[•|\->\n,]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return parts.map((part, index) => {
    const lower = removeAccents(part);
    let type = "section";
    if (lower.includes("intro")) type = "intro";
    else if (lower.includes("verso") || lower.includes("estrofe")) type = "verse";
    else if (lower.includes("coro") || lower.includes("refrao")) type = "chorus";
    else if (lower.includes("ponte") || lower.includes("bridge")) type = "bridge";
    else if (lower.includes("solo")) type = "solo";
    else if (lower.includes("espontaneo")) type = "spontaneous";
    else if (lower.includes("climax")) type = "climax";
    else if (lower.includes("final") || lower.includes("outro")) type = "outro";

    return {
      type,
      label: part,
      order: index,
      content: []
    };
  });
}

/**
 * Converte estrutura de seções para string amigável de exibição rápida ("Intro • Verso • Refrão").
 */
export function structureToString(structureInput) {
  if (typeof structureInput === "string") return structureInput;
  if (Array.isArray(structureInput)) {
    return structureInput.map(s => s.label || s.type).join(" • ");
  }
  return "Intro • Verso • Refrão • Final";
}

/**
 * Extrai e estrutura todos os acordes únicos presentes numa cifra.
 */
export function extractChordsFromSheet(sheet) {
  if (!sheet || typeof sheet !== "string") return [];
  const chordsSet = new Set();
  const regex = new RegExp(CHORD_FINDER_REGEX.source, "g");
  let match;
  while ((match = regex.exec(sheet)) !== null) {
    chordsSet.add(match[0]);
  }

  return Array.from(chordsSet).map(raw => {
    const parsed = parseChord(raw);
    return {
      raw,
      root: parsed ? parsed.root : raw,
      modifier: parsed ? parsed.modifier : "",
      bass: parsed ? parsed.bass : null,
      isMinor: parsed ? parsed.isMinor : false,
      hasSlash: parsed ? parsed.hasSlash : false
    };
  });
}

/**
 * Objeto SongNormalizer consolidado.
 */
export const SongNormalizer = {
  removeAccents,
  normalizeSearchText,
  generateSearchKeywords,
  parseStructureFromText,
  structureToString,
  extractChordsFromSheet,

  /**
   * Normaliza um documento bruto de música para o modelo oficial do VIRTUO.
   */
  normalizeSong(rawSong = {}) {
    const title = (rawSong.title || "Sem Título").trim();
    const artistName = (rawSong.artistName || rawSong.artist || "Virtuo Worship").trim();
    const albumName = (rawSong.albumName || rawSong.album || "").trim() || null;
    const originalKey = (rawSong.originalKey || "G").trim();
    const bpm = Number(rawSong.bpm) || 74;
    const capo = Number(rawSong.capo) || 0;
    const difficulty = (rawSong.difficulty || "Fácil").trim();
    const genres = Array.isArray(rawSong.genres) && rawSong.genres.length > 0
      ? rawSong.genres
      : [rawSong.genre || "Gospel"];
    const tags = Array.isArray(rawSong.tags) ? rawSong.tags : [];
    const instruments = Array.isArray(rawSong.instruments) && rawSong.instruments.length > 0
      ? rawSong.instruments
      : ["Violão", "Guitarra", "Teclado", "Vocal"];

    const chordSheet = typeof rawSong.chords === "string" 
      ? rawSong.chords 
      : (rawSong.chordSheet || "");
    const easyChordSheet = typeof rawSong.easyChords === "string" 
      ? rawSong.easyChords 
      : (rawSong.easyChordSheet || chordSheet);

    const structuredChords = Array.isArray(rawSong.chords) 
      ? rawSong.chords 
      : extractChordsFromSheet(chordSheet);
    const structuredEasyChords = Array.isArray(rawSong.easyChords) 
      ? rawSong.easyChords 
      : extractChordsFromSheet(easyChordSheet);

    const structure = parseStructureFromText(rawSong.structure);

    const searchKeywords = generateSearchKeywords(
      title,
      artistName,
      albumName,
      genres,
      tags
    );

    const normalized = createEmptySong({
      id: rawSong.id || null,
      title,
      normalizedTitle: normalizeSearchText(title),
      artistId: rawSong.artistId || null,
      artistName,
      albumId: rawSong.albumId || null,
      albumName,
      originalKey,
      bpm,
      timeSignature: rawSong.timeSignature || "4/4",
      capo,
      difficulty,
      genres,
      tags,
      instruments,
      chords: structuredChords,
      easyChords: structuredEasyChords,
      chordSheet,
      easyChordSheet,
      structure,
      lyrics: rawSong.lyrics || null,
      lyricsStatus: rawSong.lyricsStatus || (rawSong.lyrics ? LYRICS_STATUS.USER_PROVIDED : LYRICS_STATUS.UNAVAILABLE),
      lyricsSource: rawSong.lyricsSource || null,
      lyricsLicense: rawSong.lyricsLicense || null,
      lyricsUpdatedAt: rawSong.lyricsUpdatedAt || null,
      youtubeUrl: rawSong.youtubeUrl || "",
      spotifyUrl: rawSong.spotifyUrl || "",
      coverUrl: rawSong.coverUrl || "",
      audioUrl: rawSong.audioUrl || "",
      sourceType: rawSong.sourceType || (rawSong.source && rawSong.source.type) || SOURCE_TYPES.USER,
      sourceName: rawSong.sourceName || (rawSong.source && rawSong.source.name) || "Virtuo User",
      sourceUrl: rawSong.sourceUrl || (rawSong.source && rawSong.source.url) || "",
      source: rawSong.source || {
        type: rawSong.sourceType || SOURCE_TYPES.USER,
        name: rawSong.sourceName || "Virtuo User",
        url: rawSong.sourceUrl || "",
        importedAt: null,
        verifiedAt: null,
        verifiedBy: null
      },
      createdBy: rawSong.createdBy || null,
      createdAt: rawSong.createdAt || null,
      updatedAt: rawSong.updatedAt || null,
      status: rawSong.status || SONG_STATUS.DRAFT,
      visibility: rawSong.visibility || SONG_VISIBILITY.PRIVATE,
      version: Number(rawSong.version) || 1,
      verified: Boolean(rawSong.verified),
      verifiedBy: rawSong.verifiedBy || null,
      verificationStatus: rawSong.verificationStatus || (rawSong.verified ? "verified" : "unverified"),
      searchKeywords
    });

    // Getters retrocompatíveis para código legado
    normalized.artist = artistName;
    normalized.chords = chordSheet; // Para compatibilidade com string de acordes
    normalized.easyChords = easyChordSheet;
    normalized.structure = structureToString(structure); // Para compatibilidade com string de estrutura
    normalized.structuredChords = structuredChords;
    normalized.structuredEasyChords = structuredEasyChords;
    normalized.structuredSections = structure;

    return normalized;
  }
};
