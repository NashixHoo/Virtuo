// =============================================================
// VIRTUO STORAGE SERVICE
// src/services/storage-service.js
// Ponto único oficial para upload de Imagens, Vídeos e Áudios
// Utiliza uploadBytesResumable do Firebase Storage Modular v10
// Retorna sempre { downloadURL, fullPath, metadata }
// Suporta retries automáticos com aviso de reconexão
// Compatível com Safari iPhone, Android, Desktop e PWA
// =============================================================

import { storage, auth, firebaseConfig } from "../../firebase-config.js";
import { 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { 
  getStorageErrorMessage, 
  STORAGE_ERROR_MESSAGES 
} from "../utils/storageErrorHelper.js";
import { 
  sanitizeFileName, 
  validateMediaFile 
} from "./media-upload.js";

export { STORAGE_ERROR_MESSAGES, getStorageErrorMessage };

/**
 * Normaliza e gera o caminho no formato:
 * photos/{uid}/{timestamp}_{sanitizedName}
 * videos/{uid}/{timestamp}_{sanitizedName}
 * audio/{uid}/{timestamp}_{sanitizedName}
 */
export function buildStoragePath(category, uid, fileName) {
  const cleanCategory = String(category || "photos").toLowerCase().trim();
  const folder = cleanCategory.startsWith("video") ? "videos" 
               : cleanCategory.startsWith("audio") || cleanCategory.startsWith("musica") ? "audio" 
               : "photos";
  const user = String(uid || "anonymous").trim();
  const safeName = sanitizeFileName(fileName || "media_file");
  const timestamp = Date.now();
  return `${folder}/${user}/${timestamp}_${safeName}`;
}

/**
 * Realiza upload com uploadBytesResumable() e resiliência de até 3 tentativas (retry).
 * 
 * @param {Object} options
 * @param {File|Blob} options.file - Arquivo a ser enviado
 * @param {string} options.uid - UID do usuário autenticado
 * @param {'photos'|'videos'|'audio'} options.category - Categoria do armazenamento
 * @param {string} options.contentType - MIME-type do arquivo
 * @param {Function} [options.onProgress] - Callback com porcentagem e status (ex: "Reconectando...")
 * @param {Function} [options.onMilestone] - Callback para marcos visuais (0, 25, 50, 75, 100)
 * @param {number} [options.maxRetries=3] - Número máximo de tentativas automáticas
 * @returns {Promise<{ downloadURL: string, fullPath: string, metadata: Object }>}
 */
export async function uploadMediaWithResumable({
  file,
  uid,
  category = "photos",
  contentType = "",
  onProgress = null,
  onMilestone = null,
  maxRetries = 3
}) {
  if (!file) {
    throw new Error("Nenhum arquivo fornecido para upload.");
  }
  const currentUid = uid || (auth && auth.currentUser ? auth.currentUser.uid : null);
  if (!currentUid) {
    const err = new Error("Você não tem permissão para enviar este arquivo.");
    err.code = "storage/unauthorized";
    throw err;
  }

  const path = buildStoragePath(category, currentUid, file.name);
  const fileRef = storageRef(storage, path);

  const fileMetadata = {
    contentType: contentType || file.type || "application/octet-stream",
    customMetadata: {
      originalName: file.name,
      uploadedBy: currentUid,
      category,
      uploadedAt: new Date().toISOString()
    }
  };

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      if (attempt > 1) {
        console.warn(`[storage-service] Tentativa de reconexão ${attempt}/${maxRetries}...`);
        if (typeof onProgress === "function") {
          onProgress(null, "Reconectando...");
        }
        // Espera com backoff exponencial antes da nova tentativa
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(1.5, attempt - 1), 5000)));
      }

      const result = await executeSingleResumableUpload(fileRef, file, fileMetadata, onProgress, onMilestone, currentUid, path);
      return result;
    } catch (err) {
      lastError = err;
      console.error(`[storage-service] Erro na tentativa ${attempt}:`, err.code || err.message);

      // Não tentar novamente se for erro terminal de permissão ou cancelamento
      if (err.code === "storage/unauthorized" || err.code === "storage/canceled" || err.code === "storage/quota-exceeded") {
        throw err;
      }

      if (attempt > maxRetries) {
        break;
      }
    }
  }

  // Se todas as tentativas falharem
  const friendlyMsg = getStorageErrorMessage(lastError);
  const finalError = new Error(friendlyMsg);
  finalError.code = lastError?.code || "storage/retry-limit-exceeded";
  finalError.originalError = lastError;
  throw finalError;
}

/**
 * Executa uma única tentativa de uploadBytesResumable
 */
function executeSingleResumableUpload(fileRef, file, metadata, onProgress, onMilestone, currentUid, path) {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file, metadata);
    const milestonesReached = new Set();

    const triggerMilestone = (p) => {
      [0, 25, 50, 75, 100].forEach(m => {
        if (p >= m && !milestonesReached.has(m)) {
          milestonesReached.add(m);
          if (typeof onMilestone === "function") onMilestone(m);
        }
      });
    };

    triggerMilestone(0);
    if (typeof onProgress === "function") onProgress(0, "Iniciando...");

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const transferred = snapshot.bytesTransferred;
        const total = snapshot.totalBytes;
        const percent = total > 0 ? (transferred / total) * 100 : 0;
        const rounded = Math.min(100, Math.max(0, Math.round(percent)));

        triggerMilestone(rounded);
        if (typeof onProgress === "function") {
          onProgress(rounded, `${rounded}%`);
        }
      },
      (error) => {
        // FASE 6 — LOG REAL: Registro obrigatório estruturado
        console.error({
          code: error.code || "storage/unknown",
          message: error.message,
          path: path || fileRef?.fullPath,
          uid: currentUid,
          bucket: storage?.app?.options?.storageBucket || firebaseConfig?.storageBucket || "virtuo-7e01b.firebasestorage.app",
          fileType: file?.type,
          fileSize: file?.size
        });

        const friendlyMessage = getStorageErrorMessage(error);
        const err = new Error(friendlyMessage);
        err.code = error.code || "storage/unknown";
        err.originalError = error;
        err.stage = "storage_upload";
        reject(err);
      },
      async () => {
        try {
          triggerMilestone(100);
          if (typeof onProgress === "function") {
            onProgress(100, "100%");
          }

          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fullPath = uploadTask.snapshot.ref.fullPath;
          const resultMetadata = uploadTask.snapshot.metadata || metadata;

          resolve({
            downloadURL,
            fullPath,
            metadata: resultMetadata
          });
        } catch (urlErr) {
          // FASE 6 — LOG REAL para falha na obtenção da downloadURL
          console.error({
            code: urlErr.code || "storage/unknown",
            message: urlErr.message,
            path: path || fileRef?.fullPath,
            uid: currentUid,
            bucket: storage?.app?.options?.storageBucket || firebaseConfig?.storageBucket || "virtuo-7e01b.firebasestorage.app",
            fileType: file?.type,
            fileSize: file?.size
          });

          const friendlyMessage = getStorageErrorMessage(urlErr);
          const err = new Error(friendlyMessage);
          err.code = urlErr.code || "storage/unknown";
          err.originalError = urlErr;
          err.stage = "get_download_url";
          reject(err);
        }
      }
    );
  });
}

/**
 * uploadImage(file, uid, options)
 * Valida como imagem e realiza upload via uploadBytesResumable
 * 
 * @param {File|Blob} file 
 * @param {string} uid 
 * @param {Object} [options]
 * @returns {Promise<{ downloadURL: string, fullPath: string, metadata: Object }>}
 */
export async function uploadImage(file, uid, options = {}) {
  validateMediaFile(file, "photo");
  return uploadMediaWithResumable({
    file,
    uid,
    category: "photos",
    contentType: file.type || "image/jpeg",
    onProgress: options.onProgress,
    onMilestone: options.onMilestone,
    maxRetries: options.maxRetries || 3
  });
}

/**
 * uploadVideo(file, uid, options)
 * Valida como vídeo e realiza upload via uploadBytesResumable
 * 
 * @param {File|Blob} file 
 * @param {string} uid 
 * @param {Object} [options]
 * @returns {Promise<{ downloadURL: string, fullPath: string, metadata: Object }>}
 */
export async function uploadVideo(file, uid, options = {}) {
  validateMediaFile(file, "video");
  return uploadMediaWithResumable({
    file,
    uid,
    category: "videos",
    contentType: file.type || "video/mp4",
    onProgress: options.onProgress,
    onMilestone: options.onMilestone,
    maxRetries: options.maxRetries || 3
  });
}

/**
 * uploadAudio(file, uid, options)
 * Valida como áudio e realiza upload via uploadBytesResumable
 * 
 * @param {File|Blob} file 
 * @param {string} uid 
 * @param {Object} [options]
 * @returns {Promise<{ downloadURL: string, fullPath: string, metadata: Object }>}
 */
export async function uploadAudio(file, uid, options = {}) {
  validateMediaFile(file, "audio");
  return uploadMediaWithResumable({
    file,
    uid,
    category: "audio",
    contentType: file.type || "audio/mpeg",
    onProgress: options.onProgress,
    onMilestone: options.onMilestone,
    maxRetries: options.maxRetries || 3
  });
}

export default {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadMediaWithResumable,
  buildStoragePath,
  getStorageErrorMessage
};
