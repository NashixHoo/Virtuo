// =============================================================
// VIRTUO I18N SYSTEM (INTERNATIONALIZATION ENGINE)
// src/i18n/index.js
// Offline-first, instantaneous, centralized language provider
// =============================================================

import ptBR from "./locales/pt-BR.js";
import enUS from "./locales/en-US.js";
import esES from "./locales/es-ES.js";
import frFR from "./locales/fr-FR.js";
import deDE from "./locales/de-DE.js";
import zhCN from "./locales/zh-CN.js";
import jaJP from "./locales/ja-JP.js";
import koKR from "./locales/ko-KR.js";
import hiIN from "./locales/hi-IN.js";

const STORAGE_KEY = "virtuo_user_language";
const FALLBACK_LOCALE = "en-US";
const DEFAULT_LOCALE = "pt-BR";

const LOCALES = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
  "fr-FR": frFR,
  "de-DE": deDE,
  "zh-CN": zhCN,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "hi-IN": hiIN
};

export const AVAILABLE_LOCALES = [
  { code: "pt-BR", name: "Português", flag: "🇧🇷" },
  { code: "en-US", name: "English", flag: "🇺🇸" },
  { code: "es-ES", name: "Español", flag: "🇪🇸" },
  { code: "fr-FR", name: "Français", flag: "🇫🇷" },
  { code: "de-DE", name: "Deutsch", flag: "🇩🇪" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "ja-JP", name: "日本語", flag: "🇯🇵" },
  { code: "ko-KR", name: "한국어", flag: "🇰🇷" },
  { code: "hi-IN", name: "हिन्दी", flag: "🇮🇳" }
];

let currentLocaleCode = DEFAULT_LOCALE;

/**
 * Normaliza o código do navegador para um dos locais suportados
 */
function matchSupportedLocale(langTag) {
  if (!langTag || typeof langTag !== "string") return null;
  const normalized = langTag.trim().toLowerCase();

  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("es")) return "es-ES";
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("fr")) return "fr-FR";
  if (normalized.startsWith("de")) return "de-DE";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja-JP";
  if (normalized.startsWith("ko")) return "ko-KR";
  if (normalized.startsWith("hi")) return "hi-IN";

  return null;
}

/**
 * Detecta o idioma preferencial respeitando a precedência:
 * 1. Escolha manual salva no localStorage
 * 2. Idioma do sistema/navegador (se suportado)
 * 3. Fallback (en-US ou pt-BR)
 */
export function detectInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) {
      return saved;
    }
  } catch (e) {
    // LocalStorage indisponível em sandbox estrito
  }

  try {
    const navLanguages = (typeof navigator !== "undefined" && navigator.languages) || [];
    for (const lang of navLanguages) {
      const match = matchSupportedLocale(lang);
      if (match) return match;
    }
    const singleNav = typeof navigator !== "undefined" ? (navigator.language || navigator.userLanguage) : null;
    const matchSingle = matchSupportedLocale(singleNav);
    if (matchSingle) return matchSingle;
  } catch (e) {
    // Falha silenciosa
  }

  return FALLBACK_LOCALE;
}

/**
 * Inicializa o subsistema de i18n
 */
export function initI18n() {
  currentLocaleCode = detectInitialLocale();
  return currentLocaleCode;
}

/**
 * Retorna o código do idioma atual
 */
export function getLocale() {
  return currentLocaleCode;
}

/**
 * Altera o idioma ativo e persiste localmente
 */
export function setLocale(newLocale) {
  if (!LOCALES[newLocale]) {
    console.warn(`[Virtuo i18n] Locale ${newLocale} não suportado. Usando fallback.`);
    newLocale = FALLBACK_LOCALE;
  }

  currentLocaleCode = newLocale;

  try {
    localStorage.setItem(STORAGE_KEY, newLocale);
  } catch (e) {
    console.warn("[Virtuo i18n] Erro ao salvar idioma em localStorage:", e);
  }

  // Notifica o aplicativo para re-renderização
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("virtuo:locale_changed", { detail: { locale: newLocale } }));
    if (typeof window.renderCurrentScreen === "function") {
      window.renderCurrentScreen();
    }
  }

  return currentLocaleCode;
}

/**
 * Obtém o valor traduzido por chave pontilhada (ex: 'home.current_mission')
 */
export function t(keyPath, paramsOrFallback, maybeFallback) {
  let fallback = "";
  let params = null;

  if (typeof paramsOrFallback === "string") {
    fallback = paramsOrFallback;
  } else if (paramsOrFallback && typeof paramsOrFallback === "object") {
    params = paramsOrFallback;
    fallback = typeof maybeFallback === "string" ? maybeFallback : "";
  }

  const currentDict = LOCALES[currentLocaleCode] || LOCALES[DEFAULT_LOCALE];
  const fallbackDict = LOCALES[FALLBACK_LOCALE] || LOCALES[DEFAULT_LOCALE];

  function resolvePath(dict, path) {
    if (!dict) return null;
    const parts = path.split(".");
    let current = dict;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return typeof current === "string" ? current : null;
  }

  let text = resolvePath(currentDict, keyPath);
  if (!text) {
    text = resolvePath(fallbackDict, keyPath);
  }
  if (!text) {
    text = resolvePath(LOCALES["pt-BR"], keyPath);
  }
  if (!text) {
    text = fallback || keyPath;
  }

  if (params && typeof params === "object") {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${pKey}}`, "g"), String(pVal));
    }
  }

  return text;
}

/**
 * Formata data de acordo com a localidade atual
 */
export function formatDate(date, options = {}) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(currentLocaleCode, options).format(d);
  } catch (e) {
    return String(date);
  }
}

/**
 * Formata número de acordo com a localidade atual
 */
export function formatNumber(num, options = {}) {
  try {
    return new Intl.NumberFormat(currentLocaleCode, options).format(num);
  } catch (e) {
    return String(num);
  }
}

// Inicialização imediata
initI18n();

if (typeof window !== "undefined") {
  window.virtuoI18n = {
    t,
    getLocale,
    setLocale,
    formatDate,
    formatNumber,
    AVAILABLE_LOCALES
  };
  window.t = t;
  window.setVirtuoLocale = setLocale;
  window.getVirtuoLocale = getLocale;
}
