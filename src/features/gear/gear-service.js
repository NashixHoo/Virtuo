// =============================================================
// VIRTUO — MEU EQUIPAMENTO (GEAR SERVICE)
// src/features/gear/gear-service.js
// Gestão de instrumentos e periféricos offline-first com sincronização Firestore
// =============================================================

import { createGearItem } from "./gear-schema.js";

const LOCAL_STORAGE_KEY_PREFIX = "virtuo_user_gear_";

let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        doc: firestoreMod.doc,
        getDoc: firestoreMod.getDoc,
        setDoc: firestoreMod.setDoc
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[GearService] Firestore fallback:", err.message);
    }
  }
  return null;
}

class GearServiceClass {
  constructor() {
    this.listeners = new Set();
    this.cachedList = new Map(); // userId -> Array<GearItem>
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(userId, items) {
    for (const cb of this.listeners) {
      try { cb(userId, items); } catch {}
    }
  }

  _getLocalGear(userId) {
    if (this.cachedList.has(userId)) {
      return this.cachedList.get(userId);
    }
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.cachedList.set(userId, parsed);
          return parsed;
        }
      } catch {}
    }
    return [];
  }

  _saveLocalGear(userId, items) {
    this.cachedList.set(userId, items);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(items));
      } catch {}
    }
  }

  /**
   * Obtém a lista de equipamentos do músico
   */
  async getGearList(userId = "guest") {
    // 1. Tenta Firestore se online e usuário autenticado
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_gear", userId);
        const snap = await ctx.getDoc(ref);
        const localItems = this._getLocalGear(userId);

        if (snap.exists()) {
          const remote = snap.data();
          const remoteItems = Array.isArray(remote.items) ? remote.items : [];
          
          // Reconciliação sem perda
          const itemMap = new Map();
          for (const item of localItems) itemMap.set(item.id, item);
          for (const item of remoteItems) {
            const local = itemMap.get(item.id);
            if (!local || new Date(item.updatedAt || 0) > new Date(local.updatedAt || 0)) {
              itemMap.set(item.id, item);
            }
          }
          const merged = Array.from(itemMap.values());
          this._saveLocalGear(userId, merged);
          this.cachedList.set(userId, merged);
          return merged;
        } else if (localItems.length > 0) {
          // Se não há remoto mas há itens locais, sincroniza com Firestore
          ctx.setDoc(ref, { items: localItems, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          this.cachedList.set(userId, localItems);
          return localItems;
        }
      } catch (err) {
        console.warn("[GearService.getGearList] Falha ao ler Firestore:", err.message);
      }
    }

    // 2. Fallback offline local
    const local = this._getLocalGear(userId);
    this.cachedList.set(userId, local);
    return local;
  }

  /**
   * Salva ou atualiza um item de equipamento
   */
  async saveGearItem(userId = "guest", data = {}) {
    const item = createGearItem(data);
    const list = await this.getGearList(userId);
    const index = list.findIndex(g => g.id === item.id);

    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }

    this._saveLocalGear(userId, list);
    this.cachedList.set(userId, list);
    this._notify(userId, list);

    // Sincroniza com Firestore
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_gear", userId);
        await ctx.setDoc(ref, { items: list, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn("[GearService.saveGearItem] Erro ao sincronizar Firestore:", err.message);
      }
    }

    return item;
  }

  /**
   * Remove um item de equipamento
   */
  async deleteGearItem(userId = "guest", itemId) {
    let list = await this.getGearList(userId);
    list = list.filter(g => g.id !== itemId);

    this._saveLocalGear(userId, list);
    this.cachedList.set(userId, list);
    this._notify(userId, list);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_gear", userId);
        await ctx.setDoc(ref, { items: list, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn("[GearService.deleteGearItem] Erro ao sincronizar Firestore:", err.message);
      }
    }

    return true;
  }
}

export const VirtuoGearService = new GearServiceClass();
