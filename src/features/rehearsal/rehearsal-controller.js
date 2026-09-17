// =============================================================
// VIRTUO REHEARSAL CONTROLLER
// src/features/rehearsal/rehearsal-controller.js
// Controlador de regras de negócio e estado para o Modo Ensaio
// =============================================================

import { RehearsalsService, CANONICAL_INSTRUMENTS, REHEARSAL_STATUSES, DEFAULT_DEMO_REHEARSAL } from "../../services/rehearsals.js";
import { calculateKey, getSemitoneDistance, DEMO_SONGS } from "../../music/index.js";
import { musicIntelligence } from "../../music/music-intelligence.js";
import { virtuoMinister } from "../minister/index.js";
import { virtuoMetronome, virtuoBand } from "../../audio/index.js";

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
    this.rehearsalAnalysis = null;
    this.isAnalysisOpen = false;
    this.subscribers = new Set();
    this.activePlayingSongIndex = null;

    // Conecta ouvintes da Banda Virtual para sincronia de tela em tempo real
    if (typeof virtuoBand !== "undefined" && virtuoBand.onStateChange) {
      virtuoBand.onStateChange((bandState) => {
        if (this.activePlayingSongIndex !== null) {
          if (!bandState.isPlaying && this.activePlayingSongIndex !== null) {
            this.activePlayingSongIndex = null;
          }
          this._notify();
        }
      });
    }
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
   * Abre o ensaio vinculado a uma Missão aprovada ou cria um novo com transporte integral:
   * músicas, tom, BPM, Easy Play, ordem do repertório e seções.
   * Evita duplicar ensaios caso já exista um ensaio da mesma missão.
   * @param {Object} mission
   * @param {string} userUid
   */
  async openOrCreateRehearsalForMission(mission, userUid = null) {
    if (!mission) return null;

    // 1. Procura se já existe ensaio vinculado à missão
    const existing = this.rehearsals.find(r => r.missionId === mission.id);
    if (existing) {
      this.activeRehearsalId = existing.id;
      this._notify();
      return existing;
    }

    // 2. Mapeia as músicas da missão transportando parâmetros musicais integrais
    const formattedSongs = (mission.songs || []).map((s, idx) => {
      return {
        songId: s.id || s.songId,
        order: s.order || (idx + 1),
        key: s.key || s.originalKey || "G",
        keyOffset: s.keyOffset || 0,
        bpm: Number(s.bpm) || 74,
        playMode: s.easyPlay ? "easy" : "original",
        section: s.currentSection || s.section || "Intro",
        status: s.status === "ready" ? REHEARSAL_STATUSES.REHEARSED : 
               (s.status === "studying" ? REHEARSAL_STATUSES.IN_PROGRESS : REHEARSAL_STATUSES.NOT_REHEARSED)
      };
    });

    const newRehearsalPayload = {
      name: `Ensaio: ${mission.title}`,
      date: mission.eventDate || new Date().toISOString().slice(0, 10),
      description: `Repertório aprovado para ministração em ${mission.churchName || 'Igreja'}.`,
      missionId: mission.id,
      instruments: ["guitar", "acoustic_guitar", "bass", "keyboard", "drums", "vocals"],
      songs: formattedSongs
    };

    try {
      const newId = await RehearsalsService.createRehearsal(newRehearsalPayload, userUid);
      const created = await RehearsalsService.getRehearsalById(newId);
      const finalObj = created || { id: newId, ...newRehearsalPayload };
      this.rehearsals.unshift(finalObj);
      this.activeRehearsalId = finalObj.id;
      this._notify();
      return finalObj;
    } catch (err) {
      console.warn("[RehearsalController.openOrCreateRehearsalForMission] Erro ao criar ensaio:", err);
      return null;
    }
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

    const song = this.songsMap.get(songId) || DEMO_SONGS.find(s => s.id === songId) || { id: songId, bpm: 74, title: songId, originalKey: "C" };
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
   * Toca a canção do ensaio com a Banda Virtual Real (arranjos acústicos sincronizados)
   */
  playSongWithBand(index) {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || !active.songs[index]) return;

    // Se já estiver tocando esta mesma música, pausa ou desliga
    if (this.activePlayingSongIndex === index && virtuoBand.isPlaying) {
      virtuoBand.pause();
      this.activePlayingSongIndex = null;
      this._notify();
      return;
    }

    const item = active.songs[index];
    const song = this.songsMap.get(item.songId) || DEMO_SONGS.find(s => s.id === item.songId) || {
      id: item.songId,
      title: "Louvor do Ensaio",
      originalKey: "G",
      bpm: item.bpm || 74
    };

    const keyOffset = item.keyOffset || 0;
    const isEasy = item.playMode === "easy";
    const bpm = item.bpm || song.bpm || 74;

    virtuoBand.loadSong(song, keyOffset, isEasy, bpm);
    virtuoBand.start();
    this.activePlayingSongIndex = index;
    this._notify();
  }

  /**
   * Interrompe a execução da banda virtual no ensaio
   */
  stopBand() {
    virtuoBand.stop();
    this.activePlayingSongIndex = null;
    this._notify();
  }

  /**
   * Executa a análise inteligente determinística do repertório
   */
  analyzeRehearsalIntelligence() {
    const active = this.getActiveRehearsal();
    if (!active || !active.songs || active.songs.length === 0) {
      this.rehearsalAnalysis = null;
      this._notify();
      return null;
    }

    const songs = active.songs.map((item, idx) => {
      const originalSong = this.songsMap.get(item.songId) || {
        title: "Música",
        originalKey: "G",
        bpm: 74,
        difficulty: "Fácil"
      };
      const keyOffset = item.keyOffset || 0;
      const key = calculateKey(originalSong.originalKey || "G", keyOffset);
      const bpm = item.bpm || originalSong.bpm || 74;
      const capoInfo = musicIntelligence.suggestCapo(key);

      return {
        index: idx + 1,
        title: originalSong.title,
        key,
        originalKey: originalSong.originalKey,
        bpm,
        capoInfo,
        difficulty: originalSong.difficulty || "Fácil"
      };
    });

    const totalBpm = songs.reduce((acc, s) => acc + s.bpm, 0);
    const avgBpm = Math.round(totalBpm / songs.length);

    const tempoDistribution = {
      lentas: songs.filter(s => s.bpm < 68).length,
      medias: songs.filter(s => s.bpm >= 68 && s.bpm <= 95).length,
      rapidas: songs.filter(s => s.bpm > 95).length
    };

    // Análise de transições de tom entre músicas consecutivas
    const transitions = [];
    for (let i = 0; i < songs.length - 1; i++) {
      const fromSong = songs[i];
      const toSong = songs[i + 1];
      const dist = getSemitoneDistance(fromSong.key, toSong.key);
      let noteType = "Suave";
      let tip = `Transição de ${fromSong.key} para ${toSong.key}.`;

      if (dist === 0) {
        noteType = "Mesmo Tom (Perfeita)";
        tip = `Ambas no mesmo tom (${fromSong.key}). Emenda direta recomendada.`;
      } else if (dist === 1 || dist === 11) {
        noteType = "Subida de Meio Tom";
        tip = `Subida de 1 semitom (${fromSong.key} → ${toSong.key}). Eleva a intensidade da ministração.`;
      } else if (dist === 5 || dist === 7) {
        noteType = "Ciclo de Quintas/Quartas";
        tip = `Harmonia natural de quinta/quarta (${fromSong.key} → ${toSong.key}). Transição agradável.`;
      } else if (dist === 6) {
        noteType = "Salto Harmônico (Atenção)";
        tip = `Intervalo de trítono (${fromSong.key} → ${toSong.key}). Recomendado momento de oração ou solo antes de entrar.`;
      }

      transitions.push({
        from: fromSong.title,
        to: toSong.title,
        fromKey: fromSong.key,
        toKey: toSong.key,
        distance: dist,
        type: noteType,
        tip
      });
    }

    this.rehearsalAnalysis = {
      avgBpm,
      tempoDistribution,
      transitions,
      songs,
      timestamp: new Date().toLocaleTimeString("pt-BR")
    };

    this.isAnalysisOpen = true;
    this._notify();
    return this.rehearsalAnalysis;
  }

  toggleAnalysis() {
    this.isAnalysisOpen = !this.isAnalysisOpen;
    if (this.isAnalysisOpen && !this.rehearsalAnalysis) {
      this.analyzeRehearsalIntelligence();
    } else {
      this._notify();
    }
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
