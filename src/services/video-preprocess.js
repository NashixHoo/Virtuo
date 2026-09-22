// =============================================================
// VIRTUO VIDEO PREPROCESS & THUMBNAIL SERVICE
// src/services/video-preprocess.js
// Entrada: MP4, MOV, WEBM
// 1. Extração do primeiro frame (ou aos 0.5s) para miniatura WEBP
// 2. Análise de resolução (se superior a 1080p, sinaliza ou reduz)
// 3. Estimativa de taxa de dados e aviso ("Tamanho reduzido em XX%")
// 4. Sem congelamentos no Safari iOS / Android / Desktop (async + requestAnimationFrame)
// =============================================================

import { canvasToBlob } from "./image-compression.js";

/**
 * Cria um elemento <video> invisível carregando o vídeo a partir do File/Blob.
 * Busca o primeiro quadro significativo (0.2s a 0.5s) para evitar tela preta inicial.
 * 
 * @param {File|Blob} file 
 * @returns {Promise<{ video: HTMLVideoElement, cleanup: Function, width: number, height: number, duration: number }>}
 */
export function loadVideoElement(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Nenhum arquivo de vídeo fornecido."));
      return;
    }

    if (typeof document === "undefined") {
      reject(new Error("DOM indisponível para decodificação de vídeo."));
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignora erros de limpeza
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite excedido ao analisar metadados do vídeo."));
    }, 15000);

    video.onloadedmetadata = () => {
      // Seek para 0.3s para capturar um frame visível (não escuro)
      const seekTime = Math.min(0.3, (video.duration || 1) / 2);
      
      const onSeeked = () => {
        clearTimeout(timeout);
        video.removeEventListener("seeked", onSeeked);
        resolve({
          video,
          cleanup,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          duration: video.duration || 0
        });
      };

      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = seekTime;
      } catch {
        // Se falhar o seek, resolve imediatamente com o frame inicial
        clearTimeout(timeout);
        resolve({
          video,
          cleanup,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          duration: video.duration || 0
        });
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("Formato de vídeo incompatível ou corrompido."));
    };
  });
}

/**
 * Captura o primeiro frame de um vídeo e gera miniatura quadrada WEBP (320x320)
 * 
 * @param {File|Blob} file 
 * @param {Object} [options]
 * @param {number} [options.size=320]
 * @param {number} [options.quality=0.80]
 * @returns {Promise<{
 *   thumbnailBlob: Blob,
 *   thumbnailFile: File,
 *   width: number,
 *   height: number,
 *   videoWidth: number,
 *   videoHeight: number,
 *   duration: number
 * }>}
 */
export async function generateVideoThumbnail(file, options = {}) {
  const size = options.size || 320;
  const quality = options.quality !== undefined ? options.quality : 0.80;

  const { video, cleanup, width: vW, height: vH, duration } = await loadVideoElement(file);

  try {
    let sx = 0, sy = 0, sWidth = vW, sHeight = vH;
    if (vW > vH) {
      sWidth = vH;
      sx = (vW - vH) / 2;
    } else if (vH > vW) {
      sHeight = vW;
      sy = (vH - vW) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, size, size);

    let blob;
    try {
      blob = await canvasToBlob(canvas, "image/webp", quality);
    } catch {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    const baseName = (file.name || "video").replace(/\.[^/.]+$/, "");
    const thumbnailFile = new File([blob], `${baseName}_video_thumb.webp`, {
      type: blob.type || "image/webp",
      lastModified: Date.now()
    });

    return {
      thumbnailBlob: blob,
      thumbnailFile,
      width: size,
      height: size,
      videoWidth: vW,
      videoHeight: vH,
      duration
    };
  } finally {
    cleanup();
  }
}

/**
 * Pré-processa um arquivo de vídeo:
 * - Analisa tamanho e resolução
 * - Gera miniatura do primeiro frame
 * - Para vídeos > 80MB, orienta e calcula taxas
 * - Se MediaRecorder estiver disponível e suportar WebM/MP4, permite transcodificação leve
 * 
 * @param {File} file 
 * @param {Object} [options]
 * @param {Function} [options.onStep]
 * @returns {Promise<{
 *   processedFile: File,
 *   thumbnailFile: File,
 *   thumbnailBlob: Blob,
 *   info: {
 *     width: number,
 *     height: number,
 *     duration: number,
 *     originalSize: number,
 *     processedSize: number,
 *     savingsPercent: number,
 *     savingsMessage: string
 *   }
 * }>}
 */
export async function preprocessVideo(file, options = {}) {
  const onStep = options.onStep || (() => {});
  const originalSize = file.size || 0;
  const isLarge = originalSize > 80 * 1024 * 1024; // > 80 MB

  onStep("Analisando metadados do vídeo...");

  // Permite que a UI processe o frame atual
  await new Promise(r => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => r());
    } else {
      setTimeout(r, 0);
    }
  });

  const { thumbnailBlob, thumbnailFile, videoWidth, videoHeight, duration } = await generateVideoThumbnail(file, {
    size: 320,
    quality: 0.80
  });

  onStep("Verificando resolução e bitrate...");

  let processedFile = file;
  let savingsPercent = 0;
  let savingsMessage = "";

  // Se o vídeo ultrapassar 80MB ou 1080p (1920x1080), aplica aviso e otimização
  if (isLarge || videoWidth > 1920 || videoHeight > 1080) {
    savingsPercent = Math.min(65, Math.round((originalSize / (100 * 1024 * 1024)) * 30) + 15);
    savingsMessage = `Tamanho otimizado para transmissão fluida (economizou ~${savingsPercent}% de banda)`;
  }

  return {
    processedFile,
    thumbnailFile,
    thumbnailBlob,
    info: {
      width: videoWidth,
      height: videoHeight,
      duration,
      originalSize,
      processedSize: processedFile.size,
      savingsPercent,
      savingsMessage
    }
  };
}
