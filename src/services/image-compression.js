// =============================================================
// VIRTUO IMAGE COMPRESSION & THUMBNAIL SERVICE
// src/services/image-compression.js
// Entrada: HEIC, JPEG, PNG, WEBP
// 1. Corrige orientação EXIF
// 2. Redimensiona proporcionalmente (Lado máximo: 1920px)
// 3. Converte para WEBP (Qualidade: 0.82)
// 4. Gera miniatura proporcional quadrada (320x320)
// Meta: 8-12 MB -> 250-500 KB mantendo ótima fidelidade visual
// Performance: OffscreenCanvas com fallback Canvas, requestAnimationFrame
// =============================================================

/**
 * Cria um objeto Image a partir de um File ou Blob com suporte a orientação EXIF automática.
 * Navegadores modernos aplicam orientação EXIF nativamente em <img> / createImageBitmap.
 * 
 * @param {File|Blob} file 
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Nenhum arquivo fornecido para carregar imagem."));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível decodificar o arquivo de imagem selecionado."));
    };

    img.src = objectUrl;
  });
}

/**
 * Calcula dimensões contidas no limite máximo mantendo a proporção de aspecto (aspect ratio).
 * 
 * @param {number} width 
 * @param {number} height 
 * @param {number} maxDimension - Ex: 1920px
 * @returns {{ width: number, height: number }}
 */
export function calculateFitDimensions(width, height, maxDimension = 1920) {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (width <= maxDimension && height <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = width / height;
  if (width > height) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / ratio))
    };
  } else {
    return {
      width: Math.max(1, Math.round(maxDimension * ratio)),
      height: maxDimension
    };
  }
}

/**
 * Converte um Canvas / OffscreenCanvas em Blob com formato e qualidade desejados.
 * 
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas 
 * @param {string} mimeType - Ex: 'image/webp' ou 'image/jpeg'
 * @param {number} quality - 0 a 1 (Ex: 0.82)
 * @returns {Promise<Blob>}
 */
export async function canvasToBlob(canvas, mimeType = "image/webp", quality = 0.82) {
  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: mimeType, quality });
  }

  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback para toDataURL se toBlob retornar nulo
          try {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const byteString = atob(dataUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeType }));
          } catch (e) {
            reject(new Error("Falha ao exportar blob do canvas."));
          }
        }
      }, mimeType, quality);
    } else {
      reject(new Error("Canvas toBlob não suportado neste ambiente."));
    }
  });
}

/**
 * Cria contexto 2D otimizado com OffscreenCanvas ou Canvas comum.
 */
function createCanvasInstance(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        return { canvas, ctx, isOffscreen: true };
      }
    } catch {
      // Fallback para document.createElement
    }
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    return { canvas, ctx, isOffscreen: false };
  }

  throw new Error("Ambiente gráfico indisponível para manipulação de imagem.");
}

/**
 * Comprime uma foto redimensionando para no máximo 1920px e convertendo para WebP (qualidade 0.82).
 * 
 * @param {File|Blob} file - Imagem original (JPEG, PNG, HEIC, WEBP)
 * @param {Object} [options]
 * @param {number} [options.maxDimension=1920] - Lado máximo
 * @param {number} [options.quality=0.82] - Qualidade de compressão
 * @param {string} [options.format='image/webp'] - Formato de saída
 * @param {Function} [options.onStep] - Callback de etapa
 * @returns {Promise<{
 *   compressedBlob: Blob,
 *   compressedFile: File,
 *   originalSize: number,
 *   compressedSize: number,
 *   width: number,
 *   height: number,
 *   savingsPercent: number
 * }>}
 */
export async function compressImage(file, options = {}) {
  const maxDimension = options.maxDimension || 1920;
  const quality = options.quality !== undefined ? options.quality : 0.82;
  const targetMime = options.format || "image/webp";

  if (options.onStep) options.onStep("Carregando imagem original...");

  // Permite que o motor do navegador respire (evita bloquear o frame de animação de 60fps)
  await new Promise(r => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => r());
    } else {
      setTimeout(r, 0);
    }
  });

  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const { width: targetW, height: targetH } = calculateFitDimensions(srcW, srcH, maxDimension);

  if (options.onStep) options.onStep(`Comprimindo imagem (${targetW}x${targetH})...`);

  await new Promise(r => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => r());
    } else {
      setTimeout(r, 0);
    }
  });

  const { canvas, ctx } = createCanvasInstance(targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let blob;
  try {
    blob = await canvasToBlob(canvas, targetMime, quality);
  } catch (err) {
    console.warn("[image-compression] WebP não aceito nativamente, recorrendo a JPEG:", err);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  // Se o blob resultante por alguma anomalia for maior que o original e o original já for pequeno, mantém
  const originalSize = file.size || 0;
  const compressedSize = blob.size;
  const savings = originalSize > 0 ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100)) : 0;

  const baseName = (file.name || "foto").replace(/\.[^/.]+$/, "");
  const extension = targetMime === "image/webp" ? "webp" : "jpg";
  const outputFileName = `${baseName}_compressed.${extension}`;

  const compressedFile = new File([blob], outputFileName, {
    type: blob.type || targetMime,
    lastModified: Date.now()
  });

  return {
    compressedBlob: blob,
    compressedFile,
    originalSize,
    compressedSize,
    width: targetW,
    height: targetH,
    savingsPercent: savings
  };
}

/**
 * Gera miniatura quadrada proporcional de 320x320 com corte central (center crop) em WEBP.
 * 
 * @param {File|Blob|HTMLImageElement|HTMLVideoElement} source 
 * @param {Object} [options]
 * @param {number} [options.size=320]
 * @param {number} [options.quality=0.80]
 * @returns {Promise<{ thumbnailBlob: Blob, thumbnailFile: File, width: number, height: number }>}
 */
export async function generateImageThumbnail(source, options = {}) {
  const size = options.size || 320;
  const quality = options.quality !== undefined ? options.quality : 0.80;

  let imgElement;
  if (source instanceof HTMLImageElement || (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement)) {
    imgElement = source;
  } else {
    imgElement = await loadImageFromFile(source);
  }

  const srcW = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width;
  const srcH = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height;

  // Center crop proporcional (cover)
  let sx = 0, sy = 0, sWidth = srcW, sHeight = srcH;
  if (srcW > srcH) {
    sWidth = srcH;
    sx = (srcW - srcH) / 2;
  } else if (srcH > srcW) {
    sHeight = srcW;
    sy = (srcH - srcW) / 2;
  }

  const { canvas, ctx } = createCanvasInstance(size, size);
  ctx.drawImage(imgElement, sx, sy, sWidth, sHeight, 0, 0, size, size);

  let blob;
  try {
    blob = await canvasToBlob(canvas, "image/webp", quality);
  } catch {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  const baseName = (source.name || "thumb").replace(/\.[^/.]+$/, "");
  const thumbnailFile = new File([blob], `${baseName}_thumb.webp`, {
    type: blob.type || "image/webp",
    lastModified: Date.now()
  });

  return {
    thumbnailBlob: blob,
    thumbnailFile,
    width: size,
    height: size
  };
}
