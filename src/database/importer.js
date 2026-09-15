// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: IMPORTER & WORKFLOW
// src/database/importer.js
// =============================================================

import { SongNormalizer } from "./normalizer.js";
import { SongValidator } from "./validator.js";
import { 
  SONG_STATUS, 
  SONG_VISIBILITY, 
  LYRICS_STATUS, 
  SOURCE_TYPES 
} from "./schema.js";

export const SongImporter = {
  /**
   * Processa uma entrada bruta de música aplicando o fluxo canônico:
   * Entrada Bruta -> Normalização -> Validação -> Moderação -> Payload Seguro
   */
  processSongImport(rawData, context = { userUid: null, isAdmin: false, source: null }) {
    // 1. Normalização
    const normalized = SongNormalizer.normalizeSong(rawData);

    // 2. Proteção de Autoria e Moderação
    if (!context.isAdmin) {
      // Usuário comum não pode forjar verified ou fonte oficial
      normalized.verified = false;
      normalized.verifiedBy = null;
      normalized.verificationStatus = "unverified";
      normalized.sourceType = SOURCE_TYPES.USER;
      normalized.sourceName = "Comunidade Virtuo";
      normalized.source = {
        type: SOURCE_TYPES.USER,
        name: "Comunidade Virtuo",
        url: rawData.sourceUrl || "",
        importedAt: new Date().toISOString(),
        verifiedAt: null,
        verifiedBy: null
      };

      // Se não for admin e o input não solicitou explicitamente draft, envia para pendingReview
      if (rawData.status !== SONG_STATUS.DRAFT) {
        normalized.status = SONG_STATUS.PENDING_REVIEW;
      }
      normalized.visibility = SONG_VISIBILITY.PRIVATE;
    } else {
      // Admin pode definir status oficial e verificado
      if (rawData.verified) {
        normalized.verified = true;
        normalized.verifiedBy = context.userUid || "admin";
        normalized.verificationStatus = "verified";
      }
      if (rawData.sourceType) {
        normalized.sourceType = rawData.sourceType;
        normalized.sourceName = rawData.sourceName || "VIRTUO Oficial";
      }
    }

    // 3. Regra de Letras e Direitos Autorais
    // Não permite copiar letras protegidas sem licença ou autorização explícita
    if (!normalized.lyrics || !normalized.lyrics.trim()) {
      normalized.lyrics = null;
      normalized.lyricsStatus = LYRICS_STATUS.UNAVAILABLE;
      normalized.lyricsSource = null;
      normalized.lyricsLicense = null;
    } else {
      // Se há letra, verifica a licença informada
      if (normalized.lyricsStatus === LYRICS_STATUS.AUTHORIZED || normalized.lyricsStatus === LYRICS_STATUS.LICENSED) {
        if (!context.isAdmin) {
          // Usuário comum não pode auto-declarar licença sem revisão
          normalized.lyricsStatus = LYRICS_STATUS.PENDING_REVIEW;
        }
      } else if (!normalized.lyricsStatus || normalized.lyricsStatus === LYRICS_STATUS.UNAVAILABLE) {
        normalized.lyricsStatus = LYRICS_STATUS.USER_PROVIDED;
      }
      normalized.lyricsUpdatedAt = new Date().toISOString();
    }

    // 4. Validação
    const validation = SongValidator.validateSong(normalized, {
      isCreation: true,
      isAdmin: context.isAdmin
    });

    if (!validation.valid) {
      throw new Error(`Falha na validação da música: ${validation.errors.join("; ")}`);
    }

    // 5. Atribuição de autoria
    normalized.createdBy = context.userUid || normalized.createdBy || "virtuo-anonymous";

    return normalized;
  }
};
