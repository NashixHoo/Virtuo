// src/utils/storageErrorHelper.js
// Utilitário de mapeamento amigável para erros do Firebase Storage

/**
 * Objeto de mapeamento para os códigos de erro do Firebase Storage para mensagens em português.
 */
export const STORAGE_ERROR_MESSAGES = {
  // Principais códigos solicitados (com suporte a variantes resumidas e completas)
  "storage/unauthorized": "Você não tem permissão para enviar este arquivo.",
  "storage/canceled": "Upload cancelado.",
  "storage/quota-exceeded": "Espaço do Storage esgotado.",
  "storage/retry-limit-exceeded": "Verifique sua conexão.",
  "storage/object-not-found": "Arquivo não encontrado.",

  // Traduções sucintas específicas do bloco 7
  "storage/unauthorized-short": "Sem permissão.",
  "storage/quota-exceeded-short": "Espaço do Storage esgotado.",
  "storage/retry-limit-exceeded-short": "Conexão instável.",
  "storage/canceled-short": "Upload cancelado.",
  "storage/object-not-found-short": "Arquivo indisponível.",

  // Códigos adicionais oficiais do Firebase Storage
  "storage/bucket-not-found": "Servidor de armazenamento não encontrado.",
  "storage/project-not-found": "Projeto do Firebase não encontrado.",
  "storage/unauthenticated": "Sessão expirada. Faça login novamente para enviar arquivos.",
  "storage/invalid-checksum": "Falha na integridade do arquivo durante o envio. Tente novamente.",
  "storage/cannot-slice-blob": "O arquivo original foi alterado ou está inacessível.",
  "storage/server-file-wrong-size": "Erro na transmissão do arquivo. O tamanho recebido não confere.",
  "storage/invalid-argument": "Arquivo ou formato inválido para upload.",
  "storage/network-failed": "Verifique sua conexão.",
  "storage/unknown": "Erro inesperado no servidor de armazenamento. Tente em instantes.",
  "storage/invalid-event-name": "Operação de upload inválida.",
  "storage/no-default-bucket": "Configuração de armazenamento ausente.",
  "storage/invalid-format": "Formato de arquivo incompatível."
};

// Alias de retrocompatibilidade
export const STORAGE_ERROR_CODE_MAP = STORAGE_ERROR_MESSAGES;

/**
 * Mensagem padrão caso o código de erro não seja identificado.
 */
export const DEFAULT_STORAGE_ERROR_MESSAGE = "Não foi possível completar o upload. Tente novamente.";

/**
 * Função exportável que recebe o objeto de erro do Firebase Storage e retorna a mensagem amigável apropriada.
 * 
 * @param {Error|Object|string} error - Objeto de erro ou código/string do Firebase Storage
 * @param {string} [customDefault] - Mensagem padrão caso o erro não seja reconhecido
 * @returns {string} Mensagem de feedback em português
 */
export function getStorageErrorMessage(error, customDefault = DEFAULT_STORAGE_ERROR_MESSAGE) {
  if (!error) return "Erro desconhecido durante o upload.";

  // Se o erro for fornecido como string (ex: 'storage/unauthorized' ou mensagem)
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (STORAGE_ERROR_MESSAGES[trimmed]) {
      return STORAGE_ERROR_MESSAGES[trimmed];
    }
    for (const [code, msg] of Object.entries(STORAGE_ERROR_MESSAGES)) {
      if (trimmed.includes(code)) return msg;
    }
    if (trimmed.length > 0 && !trimmed.includes("FirebaseError:") && trimmed.length < 150) {
      return trimmed;
    }
    return customDefault;
  }

  // Extração do código de erro (error.code ou error.originalError.code)
  let code = error.code || (error.originalError && error.originalError.code) || "";
  const rawMsg = String(error.message || "");
  const msgLower = rawMsg.toLowerCase();

  // Caso o código venha dentro da mensagem
  if (!code) {
    const match = rawMsg.match(/storage\/[a-z0-9_-]+/i);
    if (match) {
      code = match[0].toLowerCase();
    }
  }

  // Mapeamento direto
  if (code && STORAGE_ERROR_MESSAGES[code]) {
    return STORAGE_ERROR_MESSAGES[code];
  }

  // Tratamentos semânticos e termos-chave
  if (code === "storage/unauthorized" || msgLower.includes("unauthorized") || msgLower.includes("permissão") || msgLower.includes("permission denied")) {
    return STORAGE_ERROR_MESSAGES["storage/unauthorized"];
  }

  if (code === "storage/canceled" || msgLower.includes("canceled") || msgLower.includes("cancelado") || error.name === "AbortError") {
    return STORAGE_ERROR_MESSAGES["storage/canceled"];
  }

  if (code === "storage/quota-exceeded" || msgLower.includes("quota-exceeded") || (msgLower.includes("quota") && msgLower.includes("storage"))) {
    return STORAGE_ERROR_MESSAGES["storage/quota-exceeded"];
  }

  if (code === "storage/retry-limit-exceeded" || code === "storage/network-failed" || msgLower.includes("retry-limit") || msgLower.includes("network") || msgLower.includes("timeout") || msgLower.includes("offline")) {
    return STORAGE_ERROR_MESSAGES["storage/retry-limit-exceeded"];
  }

  if (code === "storage/object-not-found" || msgLower.includes("object-not-found") || msgLower.includes("não encontrado")) {
    return STORAGE_ERROR_MESSAGES["storage/object-not-found"];
  }

  // Verificação de conectividade offline no navegador
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Verifique sua conexão.";
  }

  // Verificação de limite de tamanho
  if (msgLower.includes("size") || msgLower.includes("grande") || msgLower.includes("too large") || msgLower.includes("excede")) {
    return "Arquivo muito grande para upload.";
  }

  // Mensagem textual limpa
  if (rawMsg && !rawMsg.includes("FirebaseError:") && !rawMsg.includes("at ") && rawMsg.length < 160) {
    return rawMsg;
  }

  return customDefault;
}

export default {
  STORAGE_ERROR_MESSAGES,
  STORAGE_ERROR_CODE_MAP,
  DEFAULT_STORAGE_ERROR_MESSAGE,
  getStorageErrorMessage
};
