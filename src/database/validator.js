// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: VALIDATOR
// src/database/validator.js
// =============================================================

import { 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  LYRICS_STATUS, 
  SOURCE_TYPES,
  CANONICAL_DIFFICULTIES
} from "./schema.js";
import { parseChord } from "../music/chord-parser.js";

const VALID_STATUSES = Object.values(SONG_STATUS);
const VALID_VISIBILITIES = Object.values(SONG_VISIBILITY);
const VALID_LYRICS_STATUSES = Object.values(LYRICS_STATUS);
const VALID_SOURCE_TYPES = Object.values(SOURCE_TYPES);

/**
 * Valida URLs web de forma segura.
 */
function isValidUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const SongValidator = {
  /**
   * Valida integralmente um documento de música.
   */
  validateSong(song, options = { isCreation: false, isAdmin: false }) {
    const errors = [];

    if (!song || typeof song !== "object") {
      return { valid: false, errors: ["Dados da música devem ser um objeto válido."] };
    }

    // 1. Título
    if (!song.title || typeof song.title !== "string" || !song.title.trim()) {
      errors.push("O título da música é obrigatório.");
    } else if (song.title.trim().length > 200) {
      errors.push("O título não pode exceder 200 caracteres.");
    }

    // 2. Artista
    const artist = song.artistName || song.artist;
    if (!artist || typeof artist !== "string" || !artist.trim()) {
      errors.push("O nome do artista é obrigatório.");
    } else if (artist.trim().length > 200) {
      errors.push("O nome do artista não pode exceder 200 caracteres.");
    }

    // 3. Tonalidade original
    if (!song.originalKey || typeof song.originalKey !== "string" || !song.originalKey.trim()) {
      errors.push("A tonalidade original é obrigatória.");
    } else {
      const parsedKey = parseChord(song.originalKey.trim());
      if (!parsedKey) {
        errors.push(`A tonalidade "${song.originalKey}" não é uma tonalidade musical válida.`);
      }
    }

    // 4. BPM
    if (song.bpm !== undefined && song.bpm !== null) {
      const bpmNum = Number(song.bpm);
      if (isNaN(bpmNum) || bpmNum < 20 || bpmNum > 300) {
        errors.push("O BPM deve ser um número entre 20 e 300.");
      }
    }

    // 5. Capotraste
    if (song.capo !== undefined && song.capo !== null) {
      const capoNum = Number(song.capo);
      if (isNaN(capoNum) || capoNum < 0 || capoNum > 12) {
        errors.push("O capotraste deve ser um valor entre 0 e 12.");
      }
    }

    // 6. Dificuldade (Canonical Difficulties)
    if (song.difficulty !== undefined && song.difficulty !== null && song.difficulty !== "") {
      if (!CANONICAL_DIFFICULTIES.includes(song.difficulty)) {
        errors.push(`Dificuldade inválida: "${song.difficulty}". Valores permitidos: ${CANONICAL_DIFFICULTIES.join(", ")}.`);
      }
    }

    // 7. Fórmula de Compasso (Time Signature)
    if (song.timeSignature) {
      if (typeof song.timeSignature !== "string" || !/^\d+\/\d+$/.test(song.timeSignature.trim())) {
        errors.push("A fórmula de compasso deve estar no formato padrão (ex: '4/4', '6/8', '3/4').");
      }
    }

    // 8. Status e Visibilidade
    if (song.status && !VALID_STATUSES.includes(song.status)) {
      errors.push(`Status inválido: "${song.status}". Valores permitidos: ${VALID_STATUSES.join(", ")}.`);
    }

    if (song.visibility && !VALID_VISIBILITIES.includes(song.visibility)) {
      errors.push(`Visibilidade inválida: "${song.visibility}". Valores permitidos: ${VALID_VISIBILITIES.join(", ")}.`);
    }

    // 9. Status de Verificação
    const VALID_VERIFICATION_STATUSES = ["unverified", "verified", "rejected", "pending"];
    if (song.verificationStatus !== undefined && song.verificationStatus !== null && song.verificationStatus !== "") {
      if (!VALID_VERIFICATION_STATUSES.includes(song.verificationStatus)) {
        errors.push(`Status de verificação inválido: "${song.verificationStatus}".`);
      }
    }

    // 10. Versão
    if (song.version !== undefined && song.version !== null) {
      const verNum = Number(song.version);
      if (isNaN(verNum) || verNum < 1 || !Number.isInteger(verNum)) {
        errors.push("A versão deve ser um número inteiro maior ou igual a 1.");
      }
    }

    // 11. Status e Proteção de Direitos Autorais de Letra
    if (song.lyricsStatus && !VALID_LYRICS_STATUSES.includes(song.lyricsStatus)) {
      errors.push(`Status de letra inválido: "${song.lyricsStatus}".`);
    }

    if (song.lyrics && typeof song.lyrics === "string" && song.lyrics.trim().length > 0) {
      if (!song.lyricsStatus || song.lyricsStatus === LYRICS_STATUS.UNAVAILABLE) {
        errors.push("Não é permitido inserir letra de música quando o status de direitos autorais for 'Indisponível / Protegida'.");
      }
      if ((song.lyricsStatus === LYRICS_STATUS.AUTHORIZED || song.lyricsStatus === LYRICS_STATUS.LICENSED) &&
          (!song.lyricsLicense || !song.lyricsLicense.trim()) &&
          (!song.lyricsSource || !song.lyricsSource.trim())) {
        errors.push("Para cadastrar letra com status 'Autorizada' ou 'Licenciada', é obrigatório informar a fonte ou a licença legal correspondente.");
      }
    }

    // 12. Tipo de Fonte
    const sourceType = song.sourceType || (song.source && song.source.type);
    if (sourceType && !VALID_SOURCE_TYPES.includes(sourceType)) {
      errors.push(`Tipo de fonte inválido: "${sourceType}".`);
    }

    // 13. URLs (opcionais, mas devem ser válidas se fornecidas)
    if (song.youtubeUrl && !isValidUrl(song.youtubeUrl)) {
      errors.push("A URL do YouTube informada não é uma URL válida.");
    }
    if (song.spotifyUrl && !isValidUrl(song.spotifyUrl)) {
      errors.push("A URL do Spotify informada não é uma URL válida.");
    }
    if (song.audioUrl && !isValidUrl(song.audioUrl)) {
      errors.push("A URL do áudio informada não é uma URL válida.");
    }
    if (song.coverUrl && !isValidUrl(song.coverUrl)) {
      errors.push("A URL da capa informada não é uma URL válida.");
    }

    // 14. Regras de Integridade de Autoria e Moderação (Não-admins não podem se auto-atribuir selo oficial ou verificado)
    if (!options.isAdmin) {
      if (song.verified === true) {
        errors.push("Apenas administradores podem marcar músicas como verificadas.");
      }
      if (song.verificationStatus === "verified") {
        errors.push("Apenas administradores podem definir status de verificação como verificado.");
      }
      if (sourceType === SOURCE_TYPES.OFFICIAL) {
        errors.push("Apenas administradores podem publicar conteúdo com fonte 'official'.");
      }
      if (options.isCreation && song.status === SONG_STATUS.PUBLISHED) {
        errors.push("Usuários comuns não podem criar músicas diretamente com status publicado.");
      }
      if (options.isCreation && song.visibility === SONG_VISIBILITY.PUBLIC) {
        errors.push("Usuários comuns não podem criar músicas diretamente com visibilidade pública.");
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida um artista.
   */
  validateArtist(artist) {
    const errors = [];
    if (!artist || typeof artist !== "object") {
      return { valid: false, errors: ["Dados do artista devem ser um objeto válido."] };
    }
    if (!artist.name || typeof artist.name !== "string" || !artist.name.trim()) {
      errors.push("O nome do artista é obrigatório.");
    }
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida um álbum.
   */
  validateAlbum(album) {
    const errors = [];
    if (!album || typeof album !== "object") {
      return { valid: false, errors: ["Dados do álbum devem ser um objeto válido."] };
    }
    if (!album.title || typeof album.title !== "string" || !album.title.trim()) {
      errors.push("O título do álbum é obrigatório.");
    }
    if (!album.artistName && !album.artistId) {
      errors.push("O artista do álbum é obrigatório.");
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
};
