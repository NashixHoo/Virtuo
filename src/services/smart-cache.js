// =============================================================
// VIRTUO SMART CACHE (LRU E LIMPEZA AUTOMÁTICA)
// src/services/smart-cache.js
// Gerencia cache LRU de cifras, repertório de missões e limite de 500 músicas
// =============================================================

export class VirtuoSmartCache {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 500;
    this.storageKey = options.storageKey || 'virtuo_smart_cache_songs';
    this.orderKey = options.orderKey || 'virtuo_smart_cache_lru_order';
  }

  /**
   * Salva ou atualiza uma música no cache LRU
   * @param {Object} song Objeto com id, title, chords, etc.
   */
  putSong(song) {
    if (!song || (!song.id && !song.title)) return;
    const songId = song.id || song.title;

    try {
      const cacheMap = this.getCacheMap();
      let order = this.getOrder();

      // Remove da posição anterior se já existir
      order = order.filter(id => id !== songId);
      // Coloca no início (Mais recentemente usado)
      order.unshift(songId);

      cacheMap[songId] = {
        ...song,
        _cachedAt: Date.now()
      };

      // Expurgo automático se passar do limite de 500
      while (order.length > this.maxItems) {
        const evictedId = order.pop();
        delete cacheMap[evictedId];
      }

      this.saveCacheMap(cacheMap);
      this.saveOrder(order);
    } catch (e) {
      console.warn('[SmartCache] Falha ao persistir música no LRU:', e);
    }
  }

  /**
   * Busca uma música no cache e atualiza a ordem LRU
   * @param {string} songId
   */
  getSong(songId) {
    if (!songId) return null;
    try {
      const cacheMap = this.getCacheMap();
      const song = cacheMap[songId];
      if (song) {
        // Promove no LRU
        let order = this.getOrder();
        order = order.filter(id => id !== songId);
        order.unshift(songId);
        this.saveOrder(order);
        return song;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Pré-carrega repertório completo da última missão no Smart Cache
   * @param {Object} mission
   */
  preloadMissionRepertoire(mission) {
    if (!mission || !Array.isArray(mission.repertoire)) return;

    mission.repertoire.forEach(song => {
      this.putSong(song);
    });

    console.log(`[SmartCache] Pré-carregadas ${mission.repertoire.length} músicas da missão ativa.`);
  }

  getCacheMap() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveCacheMap(map) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(map));
  }

  getOrder() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.orderKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveOrder(order) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.orderKey, JSON.stringify(order));
  }

  getCount() {
    return this.getOrder().length;
  }

  clear() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.orderKey);
  }
}

export const virtuoSmartCache = new VirtuoSmartCache();
