// =============================================================
// VIRTUO MEDIA UPLOAD SERVICE (HOTFIX — FOTOS, VÍDEOS E MÚSICAS)
// src/services/media-upload.js
// Compatível com iPhone (Safari/PWA), Android e Desktop
// Gerenciador Base: uploadBytesResumable
// Padrão de Armazenamento: categoria/uid/timestamp_nomeOriginal
// Associação com Documento Firestore
// =============================================================

export const MEDIA_TYPES = {
  PHOTO: "foto",
  VIDEO: "video",
  AUDIO: "audio"
};

// Aliases aceitos para compatibilidade
export const MEDIA_TYPE_ALIASES = {
  photo: MEDIA_TYPES.PHOTO,
  foto: MEDIA_TYPES.PHOTO,
  fotos: MEDIA_TYPES.PHOTO,
  image: MEDIA_TYPES.PHOTO,
  imagem: MEDIA_TYPES.PHOTO,
  video: MEDIA_TYPES.VIDEO,
  videos: MEDIA_TYPES.VIDEO,
  audio: MEDIA_TYPES.AUDIO,
  audios: MEDIA_TYPES.AUDIO,
  musica: MEDIA_TYPES.AUDIO,
  track: MEDIA_TYPES.AUDIO
};

export const MEDIA_LIMITS = {
  [MEDIA_TYPES.PHOTO]: 25 * 1024 * 1024,  // 25MB
  [MEDIA_TYPES.VIDEO]: 100 * 1024 * 1024, // 100MB
  [MEDIA_TYPES.AUDIO]: 50 * 1024 * 1024   // 50MB
};

export const ACCEPT_CONFIG = {
  [MEDIA_TYPES.PHOTO]: "image/*",
  [MEDIA_TYPES.VIDEO]: "video/*",
  [MEDIA_TYPES.AUDIO]: "audio/*"
};

/**
 * Normaliza a string do tipo de mídia para 'foto', 'video' ou 'audio'
 */
export function normalizeMediaType(typeStr) {
  if (!typeStr) return MEDIA_TYPES.PHOTO;
  const key = String(typeStr).toLowerCase().trim();
  return MEDIA_TYPE_ALIASES[key] || MEDIA_TYPES.PHOTO;
}

import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_ERROR_CODE_MAP,
  getStorageErrorMessage
} from "../utils/storageErrorHelper.js";

export { STORAGE_ERROR_MESSAGES, STORAGE_ERROR_CODE_MAP, getStorageErrorMessage };

/**
 * Dicionário canônico de mapeamento humano para códigos de erro de gravação no Firestore.
 */
export const FIRESTORE_ERROR_CODE_MAP = {
  "permission-denied": "Você não tem permissão para salvar no banco de dados.",
  "unavailable": "Serviço temporariamente indisponível. Verifique sua conexão.",
  "resource-exhausted": "Limite de operações no Firestore atingido. Tente novamente mais tarde.",
  "unauthenticated": "Sessão expirada. Faça login novamente para continuar.",
  "deadline-exceeded": "Tempo limite de conexão esgotado. Verifique sua conexão.",
  "not-found": "Registro não encontrado no banco de dados.",
  "already-exists": "Este registro já existe.",
  "invalid-argument": "Dados inválidos fornecidos para gravação."
};

/**
 * Fornece orientações contextuais e acionáveis para o usuário resolver o problema.
 */
export function getUploadErrorHint(error) {
  if (!error) return "";
  const code = (error.code || (error.originalError && error.originalError.code) || "").toLowerCase();
  const rawMsg = String(error.message || "").toLowerCase();

  if (code === "storage/unauthorized" || code === "permission-denied" || rawMsg.includes("unauthorized") || rawMsg.includes("permissão")) {
    return "Certifique-se de estar conectado com uma conta ativa e autorizada.";
  }
  if (code === "storage/canceled" || rawMsg.includes("cancel")) {
    return "O envio foi interrompido. Você pode reiniciar o upload quando desejar.";
  }
  if (code === "storage/quota-exceeded" || code === "resource-exhausted" || rawMsg.includes("quota")) {
    return "O limite de armazenamento foi atingido. Tente enviar um arquivo menor ou aguarde alguns instantes.";
  }
  if (code === "storage/retry-limit-exceeded" || code === "storage/network-failed" || code === "unavailable" || rawMsg.includes("conexão") || rawMsg.includes("network") || rawMsg.includes("offline")) {
    return "Verifique seu sinal de Wi-Fi ou dados móveis e tente enviar novamente.";
  }
  if (code === "storage/object-not-found" || rawMsg.includes("não encontrado")) {
    return "O arquivo de mídia não pôde ser localizado para concluir a operação.";
  }
  if (rawMsg.includes("grande") || rawMsg.includes("size") || rawMsg.includes("excede")) {
    return "Tamanho máximo permitido: 25MB para fotos, 50MB para áudio e 100MB para vídeos.";
  }
  return "Tente novamente em instantes. Se o erro persistir, verifique seu sinal de internet.";
}

/**
 * Escapa strings contra injeção de HTML antes de renderizar na UI
 */
function escapeHtml(str) {
  if (typeof str !== "string") return String(str || "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renderiza um card de erro elegante na UI para qualquer etapa do upload ou salvamento.
 * 
 * @param {HTMLElement} container - O elemento container onde o aviso será exibido
 * @param {Error|Object|string} error - O erro capturado na operação
 * @param {Object} [options]
 * @param {string} [options.title] - Título customizado do alerta
 * @param {Function} [options.onDismiss] - Callback ao fechar
 * @param {boolean} [options.scrollIntoView=true] - Se deve rolar suavemente até o aviso
 */
export function renderUploadErrorUI(container, error, options = {}) {
  if (!container) return;
  const friendlyMessage = getFriendlyErrorMessage(error);
  const hint = getUploadErrorHint(error);
  const stage = error?.stage || "";
  
  let defaultTitle = "Falha no envio de mídia";
  if (stage === "firestore_save") {
    defaultTitle = "Falha ao salvar no banco de dados";
  } else if (stage === "get_download_url") {
    defaultTitle = "Falha ao obter URL de download";
  } else if (stage === "validation") {
    defaultTitle = "Arquivo incompatível";
  }

  const title = options.title || defaultTitle;
  const onDismiss = options.onDismiss;

  container.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:12px; background:linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(185, 28, 28, 0.08)); border:1px solid rgba(239, 68, 68, 0.38); border-radius:12px; padding:12px 14px; position:relative; box-shadow:0 6px 16px rgba(0, 0, 0, 0.3); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);">
      <div style="flex-shrink:0; width:30px; height:30px; border-radius:8px; background:rgba(239, 68, 68, 0.22); border:1px solid rgba(239, 68, 68, 0.4); display:flex; align-items:center; justify-content:center; color:#fca5a5; font-size:15px; font-weight:bold;">
        ⚠️
      </div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <h4 style="font-size:13px; font-weight:700; color:#fca5a5; margin:0; letter-spacing:0.2px;">${escapeHtml(title)}</h4>
          <button type="button" class="upload-error-dismiss-btn" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:14px; padding:0 4px; line-height:1; opacity:0.8; transition:opacity 0.2s;" title="Fechar aviso" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
        </div>
        <p style="font-size:12.5px; color:#fecaca; margin:0 0 5px 0; line-height:1.45; font-weight:500;">
          ${escapeHtml(friendlyMessage)}
        </p>
        ${hint ? `
          <div style="font-size:11.5px; color:#cbd5e1; line-height:1.4; display:flex; align-items:center; gap:5px; margin-top:2px;">
            <span style="color:#7EE7FF; font-size:12px;">💡</span> <span>${escapeHtml(hint)}</span>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  container.style.display = "block";

  const closeBtn = container.querySelector(".upload-error-dismiss-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      clearUploadErrorUI(container);
      if (typeof onDismiss === "function") onDismiss();
    });
  }

  if (options.scrollIntoView !== false) {
    try {
      container.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {}
  }
}

/**
 * Oculta e limpa suavemente o container de erro de upload na UI
 */
export function clearUploadErrorUI(container) {
  if (!container) return;
  container.style.display = "none";
  container.innerHTML = "";
}

/**
 * Mapeia erros do Firebase Storage, Firestore e de Rede para mensagens humanas e elegantes em português.
 * Prioriza os códigos de erro exatos do Firebase Storage e Firestore.
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return "Erro desconhecido durante o upload.";

  if (typeof error === "string") {
    for (const [codeKey, msg] of Object.entries(STORAGE_ERROR_CODE_MAP)) {
      if (error.includes(codeKey)) return msg;
    }
    for (const [codeKey, msg] of Object.entries(FIRESTORE_ERROR_CODE_MAP)) {
      if (error.includes(codeKey)) return msg;
    }
    return error;
  }

  // 1. Extração do código de erro
  let code = error.code || (error.originalError && error.originalError.code) || "";
  const rawMsg = String(error.message || "");
  const msgLower = rawMsg.toLowerCase();

  if (!code) {
    const storageCodeMatch = rawMsg.match(/storage\/[a-z0-9_-]+/i);
    if (storageCodeMatch) {
      code = storageCodeMatch[0].toLowerCase();
    } else {
      const fsCodeMatch = rawMsg.match(/\b(permission-denied|resource-exhausted|unavailable|unauthenticated|deadline-exceeded|not-found)\b/i);
      if (fsCodeMatch) {
        code = fsCodeMatch[0].toLowerCase();
      }
    }
  }

  // 2. Consulta direta aos mapas oficiais
  if (code && STORAGE_ERROR_CODE_MAP[code]) {
    return STORAGE_ERROR_CODE_MAP[code];
  }
  if (code && FIRESTORE_ERROR_CODE_MAP[code]) {
    return FIRESTORE_ERROR_CODE_MAP[code];
  }

  // 3. Mapeamentos solicitados e fallbacks semânticos:
  // storage/unauthorized -> Você não tem permissão para enviar este arquivo.
  // storage/canceled -> Upload cancelado.
  // storage/quota-exceeded -> Espaço do Storage esgotado.
  // storage/retry-limit-exceeded -> Verifique sua conexão.
  // storage/object-not-found -> Arquivo não encontrado.
  if (code === "storage/unauthorized" || msgLower.includes("unauthorized") || msgLower.includes("permission") || msgLower.includes("permissão")) {
    if (error.stage === "firestore_save" || msgLower.includes("firestore") || msgLower.includes("banco de dados")) {
      return "Você não tem permissão para salvar no banco de dados.";
    }
    return "Você não tem permissão para enviar este arquivo.";
  }

  if (code === "storage/canceled" || msgLower.includes("canceled") || msgLower.includes("cancel") || error.name === "AbortError") {
    return "Upload cancelado.";
  }

  if (code === "storage/quota-exceeded" || msgLower.includes("quota-exceeded") || (msgLower.includes("quota") && msgLower.includes("storage"))) {
    return "Espaço do Storage esgotado.";
  }

  if (code === "storage/retry-limit-exceeded" || code === "storage/network-failed" || msgLower.includes("retry-limit") || msgLower.includes("network") || msgLower.includes("timeout") || msgLower.includes("offline")) {
    return "Verifique sua conexão.";
  }

  if (code === "storage/object-not-found" || msgLower.includes("object-not-found") || msgLower.includes("não encontrado")) {
    return "Arquivo não encontrado.";
  }

  if (code === "permission-denied" || msgLower.includes("permission-denied")) {
    return "Você não tem permissão para salvar no banco de dados.";
  }
  if (code === "unavailable" || msgLower.includes("unavailable")) {
    return "Serviço temporariamente indisponível. Verifique sua conexão.";
  }
  if (code === "resource-exhausted" || msgLower.includes("resource-exhausted")) {
    return "Limite de operações no Firestore atingido. Tente novamente mais tarde.";
  }
  if (code === "unauthenticated" || msgLower.includes("unauthenticated")) {
    return "Sessão expirada. Faça login novamente para continuar.";
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Verifique sua conexão.";
  }

  if (msgLower.includes("size") || msgLower.includes("grande") || msgLower.includes("too large") || msgLower.includes("excede")) {
    return "Arquivo muito grande para upload.";
  }

  // 4. Se for mensagem limpa sem stack trace técnico, aproveita
  if (rawMsg && !rawMsg.includes("FirebaseError:") && !rawMsg.includes("at ") && rawMsg.length < 160) {
    return rawMsg;
  }

  return "Não foi possível completar o upload.";
}

/**
 * Sanitiza o nome do arquivo preservando a extensão original
 */
export function sanitizeFileName(fileName) {
  if (!fileName) return "arquivo";
  const lastDot = fileName.lastIndexOf(".");
  let name = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
  const ext = lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : "";

  name = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 80);

  return `${name || "arquivo"}${ext}`;
}

/**
 * Gera o caminho estruturado estritamente conforme a especificação do Virtuo:
 * Padrão: photos/{uid}/{timestamp}_{nome}, videos/{uid}/{timestamp}_{nome}, audio/{uid}/{timestamp}_{nome}
 */
export function buildStoragePath(categoria, uid, originalFileName) {
  let cat = "photos";
  if (categoria) {
    const raw = String(categoria).toLowerCase().trim();
    if (raw === "photo" || raw === "photos" || raw === "foto" || raw === "fotos" || raw === "imagem") {
      cat = "photos";
    } else if (raw === "video" || raw === "videos") {
      cat = "videos";
    } else if (raw === "audio" || raw === "audios" || raw === "musica" || raw === "faixa") {
      cat = "audio";
    } else {
      cat = raw.replace(/[^a-z0-9_-]/g, "_");
    }
  }

  const userFolder = uid || "anonymous";
  const timestamp = Date.now();
  const cleanName = sanitizeFileName(originalFileName);

  return `${cat}/${userFolder}/${timestamp}_${cleanName}`;
}

/**
 * Validação rigorosa de arquivo antes de iniciar upload
 */
export function validateMediaFile(file, expectedType) {
  if (!file) {
    throw new Error("Nenhum arquivo foi selecionado.");
  }

  const type = expectedType ? normalizeMediaType(expectedType) : detectMediaType(file);
  const maxLimit = MEDIA_LIMITS[type] || 50 * 1024 * 1024;

  if (file.size > maxLimit) {
    const limitMB = Math.round(maxLimit / (1024 * 1024));
    throw new Error(`Arquivo muito grande. O limite máximo para este formato é de ${limitMB}MB.`);
  }

  // Validação de tipo MIME
  if (type === MEDIA_TYPES.PHOTO && !file.type.startsWith("image/")) {
    throw new Error("Formato inválido. Selecione um arquivo de imagem (JPEG, PNG, WEBP, etc.).");
  }
  if (type === MEDIA_TYPES.VIDEO && !file.type.startsWith("video/")) {
    throw new Error("Formato inválido. Selecione um arquivo de vídeo (MP4, MOV, WEBM, etc.).");
  }
  if (type === MEDIA_TYPES.AUDIO && !file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) {
    throw new Error("Formato inválido. Selecione um arquivo de áudio (MP3, WAV, M4A, AAC, OGG).");
  }

  return { isValid: true, mediaType: type };
}

/**
 * Detecta o tipo de mídia pelo MIME type ou extensão
 */
export function detectMediaType(file) {
  if (!file) return MEDIA_TYPES.PHOTO;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name)) {
    return MEDIA_TYPES.PHOTO;
  }
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv|3gp)$/i.test(name)) {
    return MEDIA_TYPES.VIDEO;
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|m4p)$/i.test(name)) {
    return MEDIA_TYPES.AUDIO;
  }
  return MEDIA_TYPES.PHOTO;
}

/**
 * Gerenciador de Pré-Visualizações com liberação automática de memória (Safari / PWA / iOS)
 */
export class MediaPreviewManager {
  constructor() {
    this.activeUrls = new Set();
  }

  createPreview(file) {
    if (!file || typeof URL === "undefined" || !URL.createObjectURL) {
      return null;
    }
    try {
      const objectUrl = URL.createObjectURL(file);
      this.activeUrls.add(objectUrl);
      return objectUrl;
    } catch (err) {
      console.warn("[MediaPreviewManager] Falha ao criar ObjectURL:", err);
      return null;
    }
  }

  revokePreview(url) {
    if (!url || typeof URL === "undefined" || !URL.revokeObjectURL) return;
    if (this.activeUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.activeUrls.delete(url);
      } catch (err) {
        console.warn("[MediaPreviewManager] Falha ao revogar ObjectURL:", err);
      }
    }
  }

  clearAll() {
    if (typeof URL === "undefined" || !URL.revokeObjectURL) return;
    this.activeUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignora erros ao revogar na limpeza geral
      }
    });
    this.activeUrls.clear();
  }
}

export const globalPreviewManager = new MediaPreviewManager();

/**
 * Lógica base de upload no Firebase Storage com uploadBytesResumable.
 * Segue o padrão estrito de armazenamento: categoria/uid/timestamp_nomeOriginal
 * 
 * @param {Object} options
 * @param {File} options.file - Arquivo a enviar
 * @param {string} options.uid - UID do usuário autenticado
 * @param {string} [options.categoria] - Categoria da pasta (ex: 'foto', 'audio', 'video')
 * @param {string} [options.mediaType] - Tipo ('foto' | 'audio' | 'video')
 * @param {Object} [options.customMetadata] - Metadados adicionais
 * @param {Function} [options.onProgress] - Callback com (percent, bytesTransferred, totalBytes)
 * @param {Function} [options.onMilestone] - Callback com milestones (0%, 25%, 50%, 75%, 100%)
 * @param {Function} [options.onTaskReady] - Callback com a instância do uploadTask para pausar/retomar/cancelar
 * @returns {Promise<{
 *   downloadUrl: string,
 *   storagePath: string,
 *   categoria: string,
 *   mediaType: string,
 *   name: string,
 *   originalName: string,
 *   size: number,
 *   contentType: string,
 *   uploadedAt: string,
 *   uploadedBy: string,
 *   task: any
 * }>}
 */
export async function uploadMediaWithResumable({
  file,
  uid,
  categoria,
  mediaType,
  customMetadata = {},
  onProgress,
  onMilestone,
  onTaskReady
}) {
  if (!uid) {
    throw new Error("Permissão negada. Você precisa estar autenticado para enviar mídias.");
  }

  const detectedType = mediaType ? normalizeMediaType(mediaType) : detectMediaType(file);
  validateMediaFile(file, detectedType);

  const resolvedCategory = categoria ? categoria.toLowerCase().trim() : (
    detectedType === MEDIA_TYPES.PHOTO ? "foto" :
    detectedType === MEDIA_TYPES.VIDEO ? "video" : "audio"
  );

  const storagePath = buildStoragePath(resolvedCategory, uid, file.name);

  // Import dinâmico das funções modulares do Firebase Storage
  let storageRefFn, uploadBytesResumableFn, getDownloadURLFn, storageInstance;
  
  if (typeof window !== "undefined") {
    const fbConfig = await import("../../firebase-config.js");
    storageInstance = fbConfig.storage;
    const storageMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js");
    storageRefFn = storageMod.ref;
    uploadBytesResumableFn = storageMod.uploadBytesResumable;
    getDownloadURLFn = storageMod.getDownloadURL;
  } else {
    throw new Error("Upload de arquivos disponível apenas em ambiente cliente.");
  }

  const fileRef = storageRefFn(storageInstance, storagePath);
  
  const defaultContentType = detectedType === MEDIA_TYPES.PHOTO ? "image/jpeg"
    : detectedType === MEDIA_TYPES.VIDEO ? "video/mp4"
    : "audio/mpeg";

  const metadata = {
    contentType: file.type || defaultContentType,
    customMetadata: {
      uploadedBy: uid,
      categoria: resolvedCategory,
      mediaType: detectedType,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      ...customMetadata
    }
  };

  const uploadTask = uploadBytesResumableFn(fileRef, file, metadata);

  if (typeof onTaskReady === "function") {
    onTaskReady(uploadTask);
  }

  // Marcos de progresso atingidos
  const milestonesReached = new Set();
  const triggerMilestone = (p) => {
    const milestones = [0, 25, 50, 75, 100];
    for (const m of milestones) {
      if (p >= m && !milestonesReached.has(m)) {
        milestonesReached.add(m);
        if (onMilestone) onMilestone(m);
      }
    }
  };

  triggerMilestone(0);
  if (onProgress) onProgress(0, 0, file.size);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const transferred = snapshot.bytesTransferred;
        const total = snapshot.totalBytes;
        const percent = total > 0 ? (transferred / total) * 100 : 0;
        const roundedPercent = Math.min(100, Math.max(0, Math.round(percent)));

        triggerMilestone(roundedPercent);
        if (onProgress) {
          onProgress(roundedPercent, transferred, total);
        }
      },
      (error) => {
        const friendlyMessage = getFriendlyErrorMessage(error);
        const err = new Error(friendlyMessage);
        err.originalError = error;
        err.code = error.code;
        err.stage = "storage_upload";
        reject(err);
      },
      async () => {
        try {
          triggerMilestone(100);
          if (onProgress) onProgress(100, file.size, file.size);
          let downloadUrl;
          try {
            downloadUrl = await getDownloadURLFn(uploadTask.snapshot.ref);
          } catch (urlErr) {
            console.error("[uploadMediaWithResumable] Erro ao obter getDownloadURL:", urlErr);
            const friendlyMsg = getFriendlyErrorMessage(urlErr);
            const err = new Error(friendlyMsg);
            err.originalError = urlErr;
            err.code = urlErr.code;
            err.stage = "get_download_url";
            throw err;
          }

          resolve({
            downloadUrl,
            storagePath,
            categoria: resolvedCategory,
            mediaType: detectedType,
            name: sanitizeFileName(file.name),
            originalName: file.name,
            size: file.size,
            contentType: file.type || defaultContentType,
            uploadedAt: new Date().toISOString(),
            uploadedBy: uid,
            task: uploadTask
          });
        } catch (err) {
          const friendlyMessage = getFriendlyErrorMessage(err);
          const errorToReject = err instanceof Error && err.stage ? err : new Error(friendlyMessage);
          if (!errorToReject.code && err.code) errorToReject.code = err.code;
          if (!errorToReject.stage) errorToReject.stage = "get_download_url";
          reject(errorToReject);
        }
      }
    );
  });
}

/**
 * Associa um arquivo subido ao seu tipo (foto, áudio, vídeo) e referência no documento do Firestore.
 * 
 * Atualiza ou cria o documento no Firestore com:
 * - A URL de download no campo correspondente (imageUrl, videoUrl, audioUrl ou especificado)
 * - A referência de Storage (storagePath: categoria/uid/timestamp_nomeOriginal)
 * - O tipo de mídia (foto, áudio, vídeo)
 * - O objeto estruturado 'mediaReference' com metadados completos
 * 
 * @param {Object} options
 * @param {Object} options.mediaResult - Resultado retornado por uploadMediaWithResumable
 * @param {string} [options.collectionName='posts'] - Coleção do Firestore ('posts', 'songs', 'users', etc.)
 * @param {string} [options.docId] - ID do documento (se omitido, adiciona novo documento)
 * @param {string} [options.fieldName] - Nome do campo para salvar a URL (ex: 'audioUrl', 'photoURL')
 * @param {Object} [options.docData={}] - Campos adicionais para o documento Firestore
 * @returns {Promise<{ docId: string, docRef: any, mediaAssociation: Object }>}
 */
export async function associateMediaWithFirestoreDoc({
  mediaResult,
  collectionName = "posts",
  docId = null,
  fieldName = null,
  docData = {}
}) {
  if (!mediaResult || !mediaResult.downloadUrl || !mediaResult.storagePath) {
    throw new Error("Dados de mídia inválidos para associação com documento do Firestore.");
  }

  // Import dinâmico do Firestore
  const fbConfig = await import("../../firebase-config.js");
  const db = fbConfig.db;
  const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { doc, collection, addDoc, updateDoc, setDoc, serverTimestamp } = firestoreMod;

  const type = mediaResult.mediaType;
  
  // Determina o nome do campo da URL principal se não especificado
  let targetField = fieldName;
  if (!targetField) {
    if (collectionName === "users") {
      targetField = "photoURL";
    } else if (type === MEDIA_TYPES.PHOTO) {
      targetField = "imageUrl";
    } else if (type === MEDIA_TYPES.VIDEO) {
      targetField = "videoUrl";
    } else if (type === MEDIA_TYPES.AUDIO) {
      targetField = "audioUrl";
    } else {
      targetField = "mediaUrl";
    }
  }

  // Metadados padronizados da referência de mídia no documento
  const mediaReference = {
    storagePath: mediaResult.storagePath,
    downloadUrl: mediaResult.downloadUrl,
    mediaType: type,
    categoria: mediaResult.categoria || (type === MEDIA_TYPES.PHOTO ? "foto" : type === MEDIA_TYPES.VIDEO ? "video" : "audio"),
    fileName: mediaResult.name,
    originalName: mediaResult.originalName || mediaResult.name,
    fileSize: mediaResult.size,
    contentType: mediaResult.contentType,
    uploadedAt: mediaResult.uploadedAt || new Date().toISOString(),
    uploadedBy: mediaResult.uploadedBy
  };

  const payload = {
    [targetField]: mediaResult.downloadUrl,
    mediaUrl: mediaResult.downloadUrl,
    mediaType: type,
    mediaCategory: mediaReference.categoria,
    storagePath: mediaResult.storagePath,
    mediaReference,
    ...docData,
    updatedAt: serverTimestamp()
  };

  let finalDocId = docId;
  let finalDocRef = null;

  try {
    if (docId) {
      finalDocRef = doc(db, collectionName, docId);
      await updateDoc(finalDocRef, payload);
    } else {
      payload.createdAt = serverTimestamp();
      const colRef = collection(db, collectionName);
      const addedDoc = await addDoc(colRef, payload);
      finalDocId = addedDoc.id;
      finalDocRef = addedDoc;
    }
  } catch (fsErr) {
    console.error("[associateMediaWithFirestoreDoc] Erro ao salvar no Firestore:", fsErr);
    const friendlyMsg = getFriendlyErrorMessage(fsErr);
    const err = new Error(friendlyMsg);
    err.originalError = fsErr;
    err.code = fsErr.code;
    err.stage = "firestore_save";
    throw err;
  }

  return {
    docId: finalDocId,
    docRef: finalDocRef,
    mediaAssociation: payload
  };
}

/**
 * Pipeline completo de Upload com uploadBytesResumable + Associação Automática ao Firestore
 * 
 * @param {Object} options
 * @param {File} options.file
 * @param {string} options.uid
 * @param {string} [options.categoria]
 * @param {string} [options.mediaType]
 * @param {Object} [options.firestoreTarget] - Configuração para associar ao Firestore
 * @param {string} [options.firestoreTarget.collectionName]
 * @param {string} [options.firestoreTarget.docId]
 * @param {string} [options.firestoreTarget.fieldName]
 * @param {Object} [options.firestoreTarget.docData]
 * @param {Function} [options.onProgress]
 * @param {Function} [options.onMilestone]
 * @param {Function} [options.onTaskReady]
 */
export async function uploadAndAssociateMedia({
  file,
  uid,
  categoria,
  mediaType,
  firestoreTarget = null,
  customMetadata = {},
  onProgress,
  onMilestone,
  onTaskReady
}) {
  const uploadResult = await uploadMediaWithResumable({
    file,
    uid,
    categoria,
    mediaType,
    customMetadata,
    onProgress,
    onMilestone,
    onTaskReady
  });

  let firestoreResult = null;
  if (firestoreTarget && (firestoreTarget.collectionName || firestoreTarget.docId)) {
    firestoreResult = await associateMediaWithFirestoreDoc({
      mediaResult: uploadResult,
      collectionName: firestoreTarget.collectionName || "posts",
      docId: firestoreTarget.docId || null,
      fieldName: firestoreTarget.fieldName || null,
      docData: firestoreTarget.docData || {}
    });
  }

  return {
    ...uploadResult,
    firestore: firestoreResult
  };
}

/**
 * Função retrocompatível: executa o upload com uploadBytesResumable e padrão categoria/uid/timestamp_nomeOriginal
 */
export async function uploadMediaFile(options) {
  return uploadMediaWithResumable(options);
}

