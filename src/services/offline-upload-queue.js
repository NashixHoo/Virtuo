// =============================================================
// VIRTUO OFFLINE UPLOAD QUEUE (INDEXEDDB)
// src/services/offline-upload-queue.js
// Salva arquivos e metadados no IndexedDB quando a rede estiver offline
// Ao retornar online, envia automaticamente via storage-service
// Exibe indicador "Pendente de envio."
// =============================================================

import { uploadImage, uploadVideo, uploadAudio } from "./storage-service.js";

const DB_NAME = "virtuo_media_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_uploads";

let dbInstancePromise = null;

function getDB() {
  if (!dbInstancePromise) {
    dbInstancePromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB não suportado neste ambiente."));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  return dbInstancePromise;
}

/**
 * Salva um upload pendente no IndexedDB
 * 
 * @param {Object} item
 * @param {File|Blob} item.file
 * @param {string} item.type - 'photo' | 'video' | 'audio'
 * @param {string} item.uid
 * @param {Object} item.postPayload
 * @returns {Promise<string>} ID do item gravado
 */
export async function savePendingUpload({ file, type, uid, postPayload }) {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    type,
    uid,
    blob: file, // Blobs e Files podem ser salvos diretamente no IndexedDB
    postPayload: postPayload || {},
    status: "Pendente de envio.",
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => {
      console.log(`[OfflineUploadQueue] Upload salvo offline no IndexedDB: ${id} (${record.status})`);
      resolve(id);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retorna todos os uploads pendentes
 */
export async function getPendingUploads() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Remove um item pendente da fila após upload concluído
 */
export async function removePendingUpload(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Processa todos os uploads pendentes quando a conexão for restabelecida
 */
export async function processPendingUploads(onPostPublished) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.log("[OfflineUploadQueue] Dispositivo ainda offline.");
    return { processed: 0, pending: 0 };
  }

  try {
    const pendingList = await getPendingUploads();
    if (pendingList.length === 0) return { processed: 0, pending: 0 };

    console.log(`[OfflineUploadQueue] Sincronizando ${pendingList.length} mídia(s) pendente(s)...`);
    let processedCount = 0;

    for (const item of pendingList) {
      try {
        let uploadRes;
        const file = item.blob;
        if (item.type === "photo") {
          uploadRes = await uploadImage(file, item.uid);
        } else if (item.type === "video") {
          uploadRes = await uploadVideo(file, item.uid);
        } else {
          uploadRes = await uploadAudio(file, item.uid);
        }

        if (uploadRes && uploadRes.downloadURL) {
          if (typeof onPostPublished === "function") {
            await onPostPublished(item, uploadRes);
          }
          await removePendingUpload(item.id);
          processedCount++;
          console.log(`[OfflineUploadQueue] ✓ Mídia ${item.id} enviada com sucesso!`);
        }
      } catch (err) {
        console.error(`[OfflineUploadQueue] Falha ao processar item ${item.id}:`, err);
      }
    }

    return { processed: processedCount, pending: pendingList.length - processedCount };
  } catch (e) {
    console.warn("[OfflineUploadQueue] Erro ao sincronizar fila offline:", e);
    return { processed: 0, error: e.message };
  }
}

// Ouvinte automático do navegador para evento 'online'
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[OfflineUploadQueue] Conexão restabelecida. Disparando envio de mídias pendentes...");
    processPendingUploads(async (item, uploadRes) => {
      if (typeof window.syncOfflinePostToCommunity === "function") {
        await window.syncOfflinePostToCommunity(item, uploadRes);
      }
    });
  });
}

export default {
  savePendingUpload,
  getPendingUploads,
  removePendingUpload,
  processPendingUploads
};
