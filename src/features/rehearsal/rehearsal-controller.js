// =============================================================
// VIRTUO REHEARSAL CONTROLLER
// src/features/rehearsal/rehearsal-controller.js
// Controlador de regras de negócio e estado para o Modo Ensaio
// =============================================================

import { RehearsalsService, CANONICAL_INSTRUMENTS, REHEARSAL_STATUSES, DEFAULT_DEMO_REHEARSAL } from "../../services/rehearsals.js";
import { calculateKey, DEMO_SONGS } from "../../music/index.js";
import { virtuoMinister } from "../minister/index.js";
import { virtuoMetronome } from "../../audio/index.js";

export class RehearsalController {
  constructor() {
    this.rehearsals = [];
    this.activeRehearsalId = "demo-ensaio-domingo";
    this.songsMap = new Map();
    this.allSongsList = [];
    this.isLoading = false;
    this.isAddSongModalOpen = false;
    this.isEditModalOpen = false;
    this.isCreateModalOpen = false;
    this.editingRehearsalData = null;
    this.subscribers = new Set();
  }

  /**
   * Inicializa o controlador carregando músicas e ensaios.
   */
  async init(userUid = null) {
    this.isLoading = true;
    this._notify();

    try {
      // Carrega catálogo de músicas
      let songs = [];
      if (typeof window !== "undefined" && window.SongsRepository) {
        songs = await window.SongsRepository.getAllSongs();
      } else if (typeof window !== "undefined") {
        try {
          const repo = await import("../../../songs-service.js");
          songs = await repo.SongsRepository.getAllSongs();
        } catch {
          songs = DEMO_SONGS;
        }
      } else {
        songs = DEMO_SONGS;
      }
      this.allSongsList = Array.isArray(songs) && songs.length > 0 ? songs : DEMO_SONGS;
      this.songsMap.clear();
      this.allSongsList.forEach(s => this.songsMap.set(s.id, s));

      // Carrega ensaios do serviço
      const list = await RehearsalsService.getAllRehearsals(userUid);
      this.rehearsals = Array.isArray(list) && list.length > 0 ? list : [DEFAULT_DEMO_REHEARSAL];

      // Se o ensaio ativo atual não existir na lista, seleciona o primeiro
      if (!this.rehearsals.some(r => r.id === this.activeRehearsalId)) {
        this.activeRehearsalId = this.rehearsals[0] ? this.rehearsals[0].id : null;
      }
    } catch (err) {
      console.warn("[RehearsalController.init] Erro ao inicializar:", err);
      this.rehearsals = [DEFAULT_DEMO_REHEARSAL];
      this.activeRehearsalId = DEFAULT_DEMO_REHEARSAL.id;
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Obtém o ensaio atualmente ativo.
   */
  getActiveRehearsal() {
    if (!this.activeRehearsalId) return null;
    return this.rehearsals.find(r => r.id === this.activeRehearsalId) || null;
  }

  /**
   * Define o ensaio ativo pelo ID.
   */
  openRehearsal(id) {
    this.activeRehearsalId = id;
    this._notify();
  }

  /**
   * Retorna para a visão de lista geral de ensaios.
   */
  backToList() {
    this.activeRehearsalId = null;
    this._notify();
  }

  /**
   * Abre modal para criar novo ensaio.
   */
  openCreateModal() {
    this.isCreateModalOpen = true;
    this.editingRehearsalData = {
      name: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
      instruments: ["guitar", "acoustic_guitar", "bass", "keyboard", "drums", "vocals"]
    };
    this._notify();
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.editingRehearsalData = null;
    this._notify();
  }

  /**
   * Salva novo ensaio no serviço.
   */
  async saveNewRehearsal(data, userUid = null) {
    if (!data.name || !data.name.trim()) return;

    this.isLoading = true;
    this._notify();

    try {
      const newId = await RehearsalsService.createRehearsal({
        name: data.name.trim(),
        date: data.date || new Date().toISOString().slice(0, 10),
        description: data.description || "",
        instruments: data.instruments || ["guitar", "bass", "drums", "keyboard", "vocals"],
        songs: []
      }, userUid);

      const createdObj = await RehearsalsService.getRehearsalById(newId);
      if (createdObj) {
        this.rehearsals.unshift(createdObj);
        this.activeRehearsalId = createdObj.id;
      }
    } catch (err) {
      console.error("[RehearsalController.saveNewRehearsal] Erro:", err);
    } finally {
      this.isCreateModalOpen = false;
      this.editingRehearsalData = null;
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Alterna a presença de um instrumento no ensaio ativo.
   */
  async toggleInstrument(instrumentId, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active) return;

    let instruments = Array.isArray(active.instruments) ? [...active.instruments] : [];
    if (instruments.includes(instrumentId)) {
      instruments = instruments.filter(id => id !== instrumentId);
    } else {
      instruments.push(instrumentId);
    }

    active.instruments = instruments;
    this._notify();

    await RehearsalsService.updateRehearsal(active.id, { instruments }, userUid);
  }

  /**
   * Abre o modal de adicionar música.
   */
  openAddSongModal() {
    this.isAddSongModalOpen = true;
    this._notify();
  }

  closeAddSongModal() {
    this.isAddSongModalOpen = false;
    this._notify();
  }

  /**
   * Adiciona uma música existente do acervo ao ensaio com estado de sessão próprio.
   */
  async addSongToRehearsal(songId, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active) return;

    const song = this.songsMap.get(songId) || DEMO_SONGS.find(s => s.id === songId);
    if (!song) return;

    active.songs = active.songs || [];
    
    // Evita duplicar se já estiver na lista, ou permite com nova ordem
    const nextOrder = active.songs.length + 1;
    const newSessionItem = {
      songId: song.id,
      order: nextOrder,
      keyOffset: 0,
      bpm: song.bpm || 74,
      playMode: "original",
      status: REHEARSAL_STATUSES.NOT_REHEARSED
    };

    active.songs.push(newSessionItem);
    this.isAddSongModalOpen = false;
    this._notify();

    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Remove uma música do ensaio pelo índice.
   */
  async removeSongFromRehearsal(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || index < 0 || index >= active.songs.length) return;

    active.songs.splice(index, 1);
    // Reindexar ordem
    active.songs.forEach((s, idx) => { s.order = idx + 1; });
    this._notify();

    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Reordena uma música no repertório do ensaio.
   */
  async moveSongOrder(fromIndex, toIndex, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs) return;
    if (fromIndex < 0 || fromIndex >= active.songs.length) return;
    if (toIndex < 0 || toIndex >= active.songs.length) return;

    const [moved] = active.songs.splice(fromIndex, 1);
    active.songs.splice(toIndex, 0, moved);
    active.songs.forEach((s, idx) => { s.order = idx + 1; });
    this._notify();

    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Altera o tom da banda para uma música do ensaio (keyOffset).
   * Não altera a música original no Firestore!
   */
  async updateSongKeyOffset(index, delta, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    const newOffset = (item.keyOffset || 0) + delta;
    // Limita entre -11 e +11 semitons
    if (newOffset >= -11 && newOffset <= 11) {
      item.keyOffset = newOffset;
      this._notify();
      await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
    }
  }

  /**
   * Restaura o tom da música para o originalKey no ensaio.
   */
  async resetSongKey(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    active.songs[index].keyOffset = 0;
    this._notify();
    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Atualiza o BPM específico da música no ensaio (40 a 240).
   * Não altera o BPM da música original no Firestore!
   */
  async updateSongBpm(index, deltaOrValue, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    let newBpm = item.bpm || 74;

    if (typeof deltaOrValue === "number" && (deltaOrValue === 1 || deltaOrValue === -1 || deltaOrValue === 5 || deltaOrValue === -5)) {
      newBpm += deltaOrValue;
    } else {
      newBpm = Number(deltaOrValue) || 74;
    }

    item.bpm = Math.max(40, Math.min(240, newBpm));
    this._notify();
    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Restaura o BPM da música para o valor original da cifra.
   */
  async resetSongBpm(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    const song = this.songsMap.get(item.songId);
    if (song && song.bpm) {
      item.bpm = song.bpm;
      this._notify();
      await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
    }
  }

  /**
   * Alterna entre a versão Original e Easy Play para a música no ensaio.
   */
  async toggleSongPlayMode(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    item.playMode = item.playMode === "easy" ? "original" : "easy";
    this._notify();
    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Alterna o status do checklist: Não ensaiada -> Em ensaio -> Ensaiada.
   */
  async cycleSongStatus(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    if (item.status === REHEARSAL_STATUSES.NOT_REHEARSED) {
      item.status = REHEARSAL_STATUSES.IN_PROGRESS;
    } else if (item.status === REHEARSAL_STATUSES.IN_PROGRESS) {
      item.status = REHEARSAL_STATUSES.REHEARSED;
    } else {
      item.status = REHEARSAL_STATUSES.NOT_REHEARSED;
    }

    this._notify();
    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Define o status diretamente para 'rehearsed'.
   */
  async markAsRehearsed(index, userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    active.songs[index].status = REHEARSAL_STATUSES.REHEARSED;
    this._notify();
    await RehearsalsService.updateRehearsal(active.id, { songs: active.songs }, userUid);
  }

  /**
   * Exclui o ensaio ativo após confirmação.
   */
  async deleteActiveRehearsal(userUid = null) {
    const active = this.getActiveRehearsal();
    if (!active) return;

    const id = active.id;
    this.rehearsals = this.rehearsals.filter(r => r.id !== id);
    this.activeRehearsalId = this.rehearsals[0] ? this.rehearsals[0].id : null;
    this._notify();

    await RehearsalsService.deleteRehearsal(id, userUid);
  }

  /**
   * Abre a música no Modo Ministro com as configurações específicas daquele ensaio:
   * - tom transposto da banda (keyOffset)
   * - BPM do ensaio
   * - Original / Easy Play
   */
  openInMinisterMode(index) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    const song = this.songsMap.get(item.songId) || DEMO_SONGS.find(s => s.id === item.songId);
    if (!song) return;

    const keyOffset = item.keyOffset || 0;
    const isEasy = item.playMode === "easy";
    const bpm = item.bpm || song.bpm || 74;

    virtuoMinister.open(song, keyOffset, isEasy, bpm);
  }

  /**
   * Dispara o Metrônomo com o BPM específico da música naquele ensaio.
   */
  triggerMetronomeForSong(index) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    const item = active.songs[index];
    const song = this.songsMap.get(item.songId);
    const bpm = item.bpm || (song ? song.bpm : 74);

    virtuoMetronome.useSongBpm(bpm);
    virtuoMetronome.start();
  }

  /**
   * Inscreve um ouvinte de renderização.
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify() {
    this.subscribers.forEach(cb => {
      try { cb(this); } catch (e) { console.error("[RehearsalController._notify]", e); }
    });
  }
}

export const virtuoRehearsal = new RehearsalController();
