// =============================================================
// VIRTUO REAL SOUND ENGINE — SAMPLE MANAGER
// src/audio/sample-manager.js
// Gerenciador centralizado de carregamento, decodificação e cache de AudioBuffers
// =============================================================

import { SAMPLE_REGISTRY, getSamplesForInstrument } from "./sample-registry.js";

export class SampleManager {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.cache = new Map(); // id -> AudioBuffer
    this.loadingPromises = new Map(); // id -> Promise<AudioBuffer|null>
    this.offlineCacheKey = "virtuo_audio_samples_cache_v1";
    this.metadata = new Map(); // id -> metadata
  }

  setAudioContext(audioCtx) {
    this.audioCtx = audioCtx;
  }

  /**
   * Verifica se o sample já está disponível na memória
   */
  has(sampleId) {
    return this.cache.has(sampleId);
  }

  /**
   * Recupera o AudioBuffer em cache
   */
  get(sampleId) {
    return this.cache.get(sampleId) || null;
  }

  /**
   * Registra diretamente um AudioBuffer em memória (usado para injeção ou decodificação antecipada)
   */
  registerBuffer(sampleId, audioBuffer, customMeta = null) {
    if (!sampleId || !audioBuffer) return false;
    this.cache.set(sampleId, audioBuffer);
    if (customMeta) {
      this.metadata.set(sampleId, customMeta);
    } else if (SAMPLE_REGISTRY[sampleId]) {
      this.metadata.set(sampleId, SAMPLE_REGISTRY[sampleId]);
    }
    return true;
  }

  /**
   * Carrega e decodifica um sample de áudio a partir de uma URL ou do registro canônico
   */
  async load(sampleId, customUrl = null) {
    if (this.has(sampleId)) {
      return this.get(sampleId);
    }

    if (this.loadingPromises.has(sampleId)) {
      return this.loadingPromises.get(sampleId);
    }

    const reg = SAMPLE_REGISTRY[sampleId];
    const url = customUrl || (reg ? reg.url : null);
    if (!url) {
      return null;
    }

    const loadPromise = (async () => {
      try {
        if (!this.audioCtx) return null;

        let arrayBuffer = null;

        // 1. Tenta recuperar do Cache da Web API (PWA / Offline) se disponível
        if (typeof globalThis.caches !== "undefined") {
          try {
            const cacheStorage = await globalThis.caches.open(this.offlineCacheKey);
            const cachedResponse = await cacheStorage.match(url);
            if (cachedResponse && cachedResponse.ok) {
              arrayBuffer = await cachedResponse.arrayBuffer();
            }
          } catch {}
        }

        // 2. Se não estiver no cache, efetua o fetch
        if (!arrayBuffer && typeof fetch !== "undefined") {
          const response = await fetch(url);
          if (response && response.ok) {
            arrayBuffer = await response.arrayBuffer();

            // Salva no cache local em segundo plano
            if (typeof globalThis.caches !== "undefined") {
              try {
                const cacheStorage = await globalThis.caches.open(this.offlineCacheKey);
                cacheStorage.put(url, new Response(arrayBuffer.slice(0)));
              } catch {}
            }
          }
        }

        if (!arrayBuffer) return null;

        // 3. Decodifica via Web Audio API
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.cache.set(sampleId, audioBuffer);
        if (reg) this.metadata.set(sampleId, reg);
        return audioBuffer;
      } catch (err) {
        // Falha segura sem interrupção da execução musical
        return null;
      } finally {
        this.loadingPromises.delete(sampleId);
      }
    })();

    this.loadingPromises.set(sampleId, loadPromise);
    return loadPromise;
  }

  /**
   * Pré-carrega todos os samples de um instrumento
   */
  async preload(instrument) {
    const list = getSamplesForInstrument(instrument);
    if (list.length === 0) return 0;

    const results = await Promise.all(list.map(s => this.load(s.id, s.url)));
    const loadedCount = results.filter(Boolean).length;
    return loadedCount;
  }

  /**
   * Localiza o melhor sample de referência para pitch shifting
   * Retorna { sampleId, buffer, baseFrequency, playbackRate }
   */
  findBestSampleForNote(instrument, targetFrequency) {
    if (!targetFrequency || targetFrequency <= 0) return null;

    const samples = getSamplesForInstrument(instrument);
    if (samples.length === 0) return null;

    // Filtra samples que já estejam carregados em cache
    const available = samples.filter(s => this.has(s.id));
    if (available.length === 0) return null;

    let bestSample = null;
    let minDiff = Infinity;

    for (const s of available) {
      const baseFreq = s.frequency || 440;
      const ratio = targetFrequency / baseFreq;
      // Proximidade intervalar em semitons
      const semitoneDistance = Math.abs(12 * Math.log2(ratio));
      if (semitoneDistance < minDiff) {
        minDiff = semitoneDistance;
        bestSample = s;
      }
    }

    if (!bestSample) return null;

    const buffer = this.get(bestSample.id);
    if (!buffer) return null;

    const baseFreq = bestSample.frequency || 440;
    let playbackRate = targetFrequency / baseFreq;

    // Limita a transposição natural para evitar artefatos extremos (máx 1.25 oitava acima ou abaixo)
    playbackRate = Math.max(0.42, Math.min(2.4, playbackRate));

    return {
      sampleId: bestSample.id,
      buffer,
      baseFrequency: baseFreq,
      playbackRate,
      metadata: bestSample
    };
  }

  /**
   * Status de prontidão do instrumento
   */
  isInstrumentReady(instrument) {
    const samples = getSamplesForInstrument(instrument);
    if (samples.length === 0) return false;
    return samples.some(s => this.has(s.id));
  }

  /**
   * Limpa o cache em memória
   */
  clear() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.metadata.clear();
  }
}
