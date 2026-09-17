// =============================================================
// VIRTUO MODO CULTO (SETLIST & WORSHIP FLOW)
// src/audio/culto-mode.js
// Montagem de sequência de louvores com Tom, BPM, Banda e Dinâmica
// =============================================================

import { HorizonWaveManager } from "../design/horizon-wave.js";

export class CultoModeController {
  constructor() {
    this.storageKey = "virtuo_culto_setlist_v2";
    this.songsSequence = [];
    this.currentIndex = 0;
    this.listeners = new Set();
    this.loadSequence();
  }

  loadSequence() {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.songsSequence = parsed;
            return;
          }
        }
      } catch {}
    }

    // Setlist Padrão de Culto de Demonstração
    this.songsSequence = [
      {
        id: "culto-1",
        title: "Mistério na Olaria",
        artist: "Comunidade Virtuo",
        key: "G",
        bpm: 74,
        style: "Worship",
        intensity: 2,
        section: "intro"
      },
      {
        id: "culto-2",
        title: "Graça Infinita",
        artist: "Ministério Aliança",
        key: "C",
        bpm: 82,
        style: "Congregacional",
        intensity: 3,
        section: "verse"
      },
      {
        id: "culto-3",
        title: "Leão de Judá",
        artist: "Celebração Louvor",
        key: "D",
        bpm: 120,
        style: "Rock",
        intensity: 4,
        section: "chorus"
      }
    ];
    this.saveSequence();
  }

  saveSequence() {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.songsSequence));
      } catch {}
    }
    this._notify();
  }

  subscribe(fn) {
    if (typeof fn === "function") {
      this.listeners.add(fn);
      fn(this.getState());
    }
    return () => this.listeners.delete(fn);
  }

  _notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try { fn(state); } catch {}
    });
  }

  getState() {
    return {
      songs: [...this.songsSequence],
      currentIndex: this.currentIndex,
      currentSong: this.songsSequence[this.currentIndex] || null
    };
  }

  addSong(songData) {
    const newSong = {
      id: `culto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: songData.title || "Novo Louvor",
      artist: songData.artist || "Virtuo",
      key: songData.key || "G",
      bpm: parseInt(songData.bpm, 10) || 74,
      style: songData.style || "Worship",
      intensity: parseInt(songData.intensity, 10) || 3,
      section: songData.section || "intro"
    };
    this.songsSequence.push(newSong);
    this.saveSequence();
    return newSong;
  }

  removeSong(index) {
    if (index >= 0 && index < this.songsSequence.length) {
      this.songsSequence.splice(index, 1);
      if (this.currentIndex >= this.songsSequence.length) {
        this.currentIndex = Math.max(0, this.songsSequence.length - 1);
      }
      this.saveSequence();
    }
  }

  updateSong(index, partialData) {
    if (this.songsSequence[index]) {
      this.songsSequence[index] = {
        ...this.songsSequence[index],
        ...partialData
      };
      this.saveSequence();
    }
  }

  selectSong(index) {
    if (index >= 0 && index < this.songsSequence.length) {
      this.currentIndex = index;
      HorizonWaveManager.triggerCultoAura(true);
      this._notify();
      return this.songsSequence[index];
    }
    return null;
  }

  nextSong() {
    if (this.currentIndex < this.songsSequence.length - 1) {
      this.currentIndex++;
      HorizonWaveManager.triggerCultoAura(true);
      this._notify();
      return this.songsSequence[this.currentIndex];
    }
    return null;
  }

  previousSong() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      HorizonWaveManager.triggerCultoAura(true);
      this._notify();
      return this.songsSequence[this.currentIndex];
    }
    return null;
  }
}

export const virtuoCulto = new CultoModeController();
