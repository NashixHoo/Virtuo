// =============================================================
// VIRTUO ADMIN: BANCO MUSICAL - CADASTRO & GESTÃO PROFISSIONAL
// src/features/admin/song-manager.js
// 
// Interface administrativa para alimentar o catálogo do VIRTUO
// Usando exclusivamente: SongsRepository, schema, validator, importer e normalizer
// Segurança: RBAC validado pelas Firestore Rules + verificação client-side de Admin
// =============================================================

import {
  SONG_STATUS,
  SONG_VISIBILITY,
  LYRICS_STATUS,
  SOURCE_TYPES,
  CANONICAL_GENRES,
  CANONICAL_DIFFICULTIES,
  createEmptySong
} from "../../database/schema.js";
import {
  SongNormalizer,
  normalizeSearchText,
  parseStructureFromText,
  structureToString,
  extractChordsFromSheet
} from "../../database/normalizer.js";
import { SongValidator } from "../../database/validator.js";
import { SongImporter } from "../../database/importer.js";
import {
  transposeChordSheet,
  calculateKey
} from "../../music/transposer.js";
import {
  generateEasyPlaySheet,
  getEasyPlayCifra
} from "../../music/easy-play.js";
import { isChordLine, CHORD_FINDER_REGEX } from "../../music/chord-parser.js";

// Lista de instrumentos canônicos suportados
export const ADMIN_INSTRUMENTS = [
  "Violão", "Teclado", "Baixo", "Bateria", "Voz",
  "Guitarra", "Saxofone", "Metais", "Cordas", "Flauta"
];

// Tonalidades musicais para seleção
export const MUSICAL_KEYS = [
  // Maiores
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  // Menores
  "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"
];

// Fórmulas de compasso
export const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "2/4", "12/8", "5/4"];

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class SongManagerController {
  constructor(songsRepo = null) {
    this.songsRepository = songsRepo || globalThis.SongsRepository || null;
    this.currentView = "form"; // 'form' | 'catalog' | 'versions'
    this.currentStep = 1;      // 1 a 7
    this.editingSongId = null;
    this.formData = createEmptySong({
      timeSignature: "4/4",
      bpm: 74,
      difficulty: "Fácil",
      capo: 0,
      originalKey: "G",
      genres: [],
      instruments: [],
      lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
      sourceType: SOURCE_TYPES.OFFICIAL,
      status: SONG_STATUS.DRAFT,
      visibility: SONG_VISIBILITY.PRIVATE
    });
    
    // Estado de prévia interativa
    this.previewSemitones = 0;
    this.previewEasyPlay = false;
    
    // Estado de catálogo e versões
    this.catalogSongs = [];
    this.catalogFilter = "all"; // 'all' | 'published' | 'draft' | 'pending_review' | 'archived'
    this.catalogSearch = "";
    this.isLoadingCatalog = false;
    this.songVersions = [];
    this.changeSummary = "";
    this.showHistoryModal = false;
    this.selectedHistorySongId = null;
    this.selectedHistorySongTitle = "";

    // Estado de Upload de Áudio
    this.audioUploadProgress = null; // { percent, transferred, total, filename }
    this.audioUploadTask = null;
    this.audioUploadError = null;
    
    // Notificações / Alertas
    this.notification = null; // { type: 'success' | 'error' | 'info', message: '' }
    this.validationErrors = [];
    this.isSaving = false;
  }

  setRepository(repo) {
    this.songsRepository = repo;
  }

  getRepository() {
    if (this.songsRepository) return this.songsRepository;
    if (typeof window !== "undefined" && window.SongsRepository) {
      this.songsRepository = window.SongsRepository;
      return this.songsRepository;
    }
    if (typeof globalThis !== "undefined" && globalThis.SongsRepository) {
      this.songsRepository = globalThis.SongsRepository;
      return this.songsRepository;
    }
    return null;
  }

  setNotification(type, message) {
    this.notification = { type, message };
    const timer = setTimeout(() => {
      if (this.notification && this.notification.message === message) {
        this.notification = null;
        this.requestRender();
      }
    }, 6000);
    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }
  }

  requestRender() {
    if (typeof window !== "undefined" && typeof window.renderCurrentScreen === "function") {
      window.renderCurrentScreen();
    }
  }

  // -----------------------------------------------------------
  // NAVEGAÇÃO ENTRE ETAPAS (1 a 7)
  // -----------------------------------------------------------
  setStep(step) {
    if (step >= 1 && step <= 7) {
      this.currentStep = step;
      this.requestRender();
    }
  }

  nextStep() {
    if (this.currentStep < 7) {
      this.currentStep++;
      this.requestRender();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.requestRender();
    }
  }

  setView(view) {
    this.currentView = view;
    if (view === "catalog") {
      this.loadCatalog();
    }
    this.requestRender();
  }

  // -----------------------------------------------------------
  // MANIPULAÇÃO DE CAMPOS DO FORMULÁRIO
  // -----------------------------------------------------------
  updateField(field, value) {
    this.formData[field] = value;
    
    // Se alterar o status da letra para 'unavailable', limpa o conteúdo para não violar direitos autorais
    if (field === "lyricsStatus" && value === LYRICS_STATUS.UNAVAILABLE) {
      this.formData.lyrics = "";
    }
    
    // Se atualizar a partitura, atualiza a prévia
    if (field === "chordSheet") {
      this.formData.chords = value;
    }
    
    this.requestRender();
  }

  toggleGenre(genre) {
    if (!Array.isArray(this.formData.genres)) {
      this.formData.genres = [];
    }
    const idx = this.formData.genres.indexOf(genre);
    if (idx > -1) {
      this.formData.genres.splice(idx, 1);
    } else {
      this.formData.genres.push(genre);
    }
    this.requestRender();
  }

  toggleInstrument(inst) {
    if (!Array.isArray(this.formData.instruments)) {
      this.formData.instruments = [];
    }
    const idx = this.formData.instruments.indexOf(inst);
    if (idx > -1) {
      this.formData.instruments.splice(idx, 1);
    } else {
      this.formData.instruments.push(inst);
    }
    this.requestRender();
  }

  // -----------------------------------------------------------
  // ESTRUTURA MUSICAL (Etapa 3)
  // -----------------------------------------------------------
  addStructureSection(type, label) {
    if (!Array.isArray(this.formData.structure)) {
      this.formData.structure = [];
    }
    const countOfType = this.formData.structure.filter(s => s.type === type).length;
    const finalLabel = countOfType > 0 ? `${label} ${countOfType + 1}` : label;
    
    this.formData.structure.push({
      type,
      label: finalLabel,
      order: this.formData.structure.length
    });
    this.syncStructureString();
    this.requestRender();
  }

  removeStructureSection(index) {
    if (Array.isArray(this.formData.structure)) {
      this.formData.structure.splice(index, 1);
      this.formData.structure.forEach((s, idx) => { s.order = idx; });
      this.syncStructureString();
      this.requestRender();
    }
  }

  moveStructureSection(index, direction) {
    const arr = this.formData.structure;
    if (!Array.isArray(arr)) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    
    const temp = arr[index];
    arr[index] = arr[targetIdx];
    arr[targetIdx] = temp;
    arr.forEach((s, idx) => { s.order = idx; });
    this.syncStructureString();
    this.requestRender();
  }

  syncStructureString() {
    // Mantém o campo textual sinótico sincronizado
    this.structureText = structureToString(this.formData.structure);
  }

  handleStructureTextChange(text) {
    this.structureText = text;
    this.formData.structure = parseStructureFromText(text);
    this.requestRender();
  }

  // -----------------------------------------------------------
  // HARMONIA & EASY PLAY (Etapa 2)
  // -----------------------------------------------------------
  detectChords() {
    const sheet = this.formData.chordSheet || this.formData.chords || "";
    if (!sheet) {
      this.setNotification("info", "Cole ou digite a cifra para detectar os acordes.");
      return;
    }
    const chords = extractChordsFromSheet(sheet);
    this.detectedChords = chords;
    this.setNotification("success", `${chords.length} acordes detectados com sucesso!`);
    this.requestRender();
  }

  generateEasyPlay() {
    const sheet = this.formData.chordSheet || this.formData.chords || "";
    if (!sheet) {
      this.setNotification("info", "Insira a cifra padrão antes de gerar o Easy Play.");
      return;
    }
    const simplified = generateEasyPlaySheet(sheet);
    this.formData.easyChordSheet = simplified;
    this.formData.easyChords = simplified;
    this.setNotification("success", "Cifra Easy Play gerada com simplificação de tríades abertas!");
    this.requestRender();
  }

  // -----------------------------------------------------------
  // PRÉVIA INTERATIVA (Etapa 6)
  // -----------------------------------------------------------
  transposePreview(delta) {
    this.previewSemitones += delta;
    this.requestRender();
  }

  resetPreviewTranspose() {
    this.previewSemitones = 0;
    this.requestRender();
  }

  togglePreviewEasyPlay() {
    this.previewEasyPlay = !this.previewEasyPlay;
    this.requestRender();
  }

  // -----------------------------------------------------------
  // VALIDAÇÃO FORMAL (SongValidator)
  // -----------------------------------------------------------
  validate() {
    const normalized = SongNormalizer.normalizeSong({
      ...this.formData,
      id: this.editingSongId || null
    });
    const result = SongValidator.validateSong(normalized, {
      isCreation: !this.editingSongId,
      isAdmin: true
    });
    this.validationErrors = result.errors;
    return result.valid;
  }

  // -----------------------------------------------------------
  // PERSISTÊNCIA: SALVAR RASCUNHO, PUBLICAR E ARQUIVAR
  // Usando exclusivamente SongsRepository
  // -----------------------------------------------------------
  async saveDraft(userUid, isAdmin = true) {
    return this.saveSongWithStatus(SONG_STATUS.DRAFT, SONG_VISIBILITY.PRIVATE, userUid, isAdmin);
  }

  async publishSong(userUid, isAdmin = true) {
    return this.saveSongWithStatus(SONG_STATUS.PUBLISHED, SONG_VISIBILITY.PUBLIC, userUid, isAdmin);
  }

  async archiveSong(userUid, isAdmin = true) {
    if (!this.editingSongId) {
      this.setNotification("error", "Apenas músicas já salvas podem ser arquivadas.");
      return;
    }
    const repo = this.getRepository();
    if (!repo) {
      this.setNotification("error", "Repositório de músicas indisponível.");
      return;
    }
    this.isSaving = true;
    this.requestRender();
    try {
      await repo.archiveSong(this.editingSongId, userUid, isAdmin);
      this.formData.status = SONG_STATUS.ARCHIVED;
      this.formData.visibility = SONG_VISIBILITY.PRIVATE;
      this.setNotification("success", "Música arquivada com sucesso!");
    } catch (err) {
      this.setNotification("error", `Erro ao arquivar: ${err.message}`);
    } finally {
      this.isSaving = false;
      this.requestRender();
    }
  }

  async saveSongWithStatus(status, visibility, userUid, isAdmin) {
    this.formData.status = status;
    this.formData.visibility = visibility;
    
    // Regra estrita de Direitos Autorais:
    if (this.formData.lyrics && this.formData.lyrics.trim().length > 0) {
      if (this.formData.lyricsStatus === LYRICS_STATUS.UNAVAILABLE) {
        this.setNotification("error", "Não é permitido inserir letra protegida sem autorização ou licença válida.");
        this.currentStep = 5;
        this.requestRender();
        return false;
      }
    }

    if (!this.validate()) {
      this.setNotification("error", `Corrija as pendências antes de salvar: ${this.validationErrors.join("; ")}`);
      this.currentStep = 7;
      this.requestRender();
      return false;
    }

    this.isSaving = true;
    this.requestRender();

    try {
      const songPayload = {
        ...this.formData,
        chords: this.formData.chordSheet || this.formData.chords,
        easyChords: this.formData.easyChordSheet || this.formData.easyChords,
        verified: isAdmin,
        sourceType: this.formData.sourceType || SOURCE_TYPES.OFFICIAL
      };

      const repo = this.getRepository();
      if (!repo) {
        throw new Error("Repositório de músicas indisponível.");
      }

      if (this.editingSongId) {
        // Atualiza música existente
        await repo.updateSong(this.editingSongId, songPayload, userUid, isAdmin);
        
        // Se houver resumo de versão, registra no histórico
        if (this.changeSummary && this.changeSummary.trim()) {
          try {
            await repo.createSongVersion(
              this.editingSongId,
              songPayload,
              userUid,
              this.changeSummary.trim()
            );
          } catch (vErr) {
            console.warn("Aviso ao registrar histórico de versão:", vErr.message);
          }
        }

        this.setNotification("success", `Música "${songPayload.title}" atualizada com sucesso (${status === SONG_STATUS.PUBLISHED ? 'Publicada' : 'Rascunho'})!`);
      } else {
        // Cria nova música
        const newId = await repo.createSong(songPayload, userUid, isAdmin);
        this.editingSongId = newId;
        this.formData.id = newId;
        this.setNotification("success", `Música "${songPayload.title}" criada com sucesso no Banco Musical!`);
      }

      this.changeSummary = "";
      return true;
    } catch (err) {
      this.setNotification("error", `Erro ao salvar música: ${err.message}`);
      return false;
    } finally {
      this.isSaving = false;
      this.requestRender();
    }
  }

  // -----------------------------------------------------------
  // EDIÇÃO DE MÚSICA EXISTENTE & HISTÓRICO
  // -----------------------------------------------------------
  async openEdit(songId, userUid, isAdmin = true) {
    if (!songId) return;
    this.isSaving = true;
    this.requestRender();

    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório de músicas indisponível.");
      const song = await repo.getSongById(songId);
      if (!song) {
        throw new Error("Música não encontrada no catálogo.");
      }

      this.editingSongId = song.id;
      this.formData = {
        ...createEmptySong(),
        ...song,
        chordSheet: typeof song.chords === "string" ? song.chords : (song.chordSheet || ""),
        easyChordSheet: typeof song.easyChords === "string" ? song.easyChords : (song.easyChordSheet || "")
      };
      
      this.currentStep = 1;
      this.currentView = "form";
      this.syncStructureString();
      this.loadVersionHistory(songId);
      this.setNotification("info", `Editando: ${song.title}`);
    } catch (err) {
      this.setNotification("error", `Erro ao carregar música: ${err.message}`);
    } finally {
      this.isSaving = false;
      this.requestRender();
    }
  }

  async loadVersionHistory(songId) {
    if (!songId) {
      this.songVersions = [];
      return;
    }
    try {
      const repo = this.getRepository();
      if (repo && typeof repo.getSongVersions === "function") {
        this.songVersions = await repo.getSongVersions(songId);
      } else {
        this.songVersions = [];
      }
    } catch (err) {
      console.warn("Aviso ao buscar versões:", err.message);
      this.songVersions = [];
    }
  }

  async loadCatalog() {
    this.isLoadingCatalog = true;
    this.requestRender();
    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório indisponível.");
      this.catalogSongs = await repo.getAllSongs();
    } catch (err) {
      this.setNotification("error", `Erro ao listar acervo: ${err.message}`);
    } finally {
      this.isLoadingCatalog = false;
      this.requestRender();
    }
  }

  resetForm() {
    this.editingSongId = null;
    this.formData = createEmptySong({
      timeSignature: "4/4",
      bpm: 74,
      difficulty: "Fácil",
      capo: 0,
      originalKey: "G",
      genres: [],
      instruments: [],
      lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
      sourceType: SOURCE_TYPES.OFFICIAL,
      status: SONG_STATUS.DRAFT,
      visibility: SONG_VISIBILITY.PRIVATE
    });
    this.structureText = "";
    this.detectedChords = [];
    this.changeSummary = "";
    this.currentStep = 1;
    this.songVersions = [];
    this.currentView = "form";
    this.setNotification("info", "Formulário limpo para nova inclusão.");
    this.requestRender();
  }

  // -----------------------------------------------------------
  // RENDERIZAÇÃO COMPLETA DA INTERFACE ADMINISTRATIVA
  // -----------------------------------------------------------
  render(currentUser, userProfile, isAdmin) {
    // 1. Verificação de Segurança (Acesso Restrito)
    if (!isAdmin) {
      return `
        <div class="glass" style="max-width:560px; margin:40px auto; text-align:center; padding:36px 24px;">
          <div style="font-size:48px; margin-bottom:14px;">🛡️</div>
          <span class="pill" style="border-color:#ef4444; color:#ef4444;">ÁREA RESTRITA</span>
          <h2 style="margin-top:14px; font-size:20px; color:#fff;">Acesso Exclusivo para Administradores</h2>
          <p style="color:#94a3b8; font-size:14px; margin-top:8px; line-height:1.6;">
            Esta área é reservada para a curadoria musical oficial do VIRTUO.
            Para cadastrar ou gerenciar músicas no catálogo profissional, faça login com uma conta com privilégios de administrador.
          </p>
          <div style="margin-top:24px; display:flex; gap:10px; justify-content:center;">
            <button class="button primary" onclick="show('library')">← Ir para Biblioteca</button>
            <button class="button secondary" onclick="show('profile')">Ver Meu Perfil</button>
          </div>
        </div>
      `;
    }

    const currentUid = currentUser ? currentUser.uid : null;

    return `
      <div class="admin-song-manager-container" style="max-width:960px; margin:0 auto; padding-bottom:60px;">
        
        <!-- BREADCRUMBS & HEADER -->
        <div class="admin-breadcrumb-bar" style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; font-weight:600; letter-spacing:0.04em;">
              <span style="cursor:pointer;" onclick="show('profile')">ADMIN</span>
              <span>›</span>
              <span style="cursor:pointer; color:#7EE7FF;" onclick="window.adminSongManager.setView('catalog')">BANCO MUSICAL</span>
              <span>›</span>
              <span style="color:#fff;">${this.editingSongId ? `EDITAR MÚSICA` : `ADICIONAR MÚSICA`}</span>
            </div>
            
            <div style="display:flex; gap:8px;">
              <button class="button ${this.currentView === 'form' ? 'primary' : 'secondary'}" 
                      style="font-size:12px; padding:6px 14px;" 
                      onclick="window.adminSongManager.setView('form')">
                ➕ ${this.editingSongId ? 'Editando Música' : 'Nova Música'}
              </button>
              <button class="button ${this.currentView === 'catalog' ? 'primary' : 'secondary'}" 
                      style="font-size:12px; padding:6px 14px;" 
                      onclick="window.adminSongManager.setView('catalog')">
                📋 Catálogo & Gestão
              </button>
            </div>
          </div>

          <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <h2 style="font-size:22px; font-weight:800; color:#fff; margin:0;">
                ${this.currentView === 'catalog' ? 'Catálogo & Moderação Musical' : (this.editingSongId ? `Editando: ${this.formData.title || 'Música'}` : 'Adicionar Nova Música')}
              </h2>
              <p style="font-size:13px; color:#94a3b8; margin:4px 0 0 0;">
                ${this.currentView === 'catalog' 
                  ? 'Gerencie todas as músicas publicadas, rascunhos e controle de versões do VIRTUO.' 
                  : 'Preencha o formulário em 7 etapas para registrar partituras com validação harmônica estrita.'}
              </p>
            </div>
            
            ${this.editingSongId ? `
              <button class="button secondary" style="font-size:11px; padding:6px 10px;" onclick="window.adminSongManager.resetForm()">
                ✕ Cancelar Edição
              </button>
            ` : ''}
          </div>
        </div>

        <!-- NOTIFICAÇÕES -->
        ${this.notification ? `
          <div class="admin-notification ${this.notification.type}" style="
            padding: 12px 16px; 
            border-radius: 12px; 
            margin-bottom: 16px; 
            font-size: 13px; 
            display: flex; 
            align-items: center; 
            gap: 10px;
            background: ${this.notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : (this.notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(126, 231, 255, 0.15)')};
            border: 1px solid ${this.notification.type === 'success' ? '#10B981' : (this.notification.type === 'error' ? '#EF4444' : '#7EE7FF')};
            color: #fff;
          ">
            <span>${this.notification.type === 'success' ? '✓' : (this.notification.type === 'error' ? '⚠️' : 'ℹ️')}</span>
            <span style="flex:1;">${this.notification.message}</span>
            <button style="background:none; border:none; color:#94a3b8; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
          </div>
        ` : ''}

        <!-- VISUALIZAÇÃO: CATÁLOGO DE MÚSICAS -->
        ${this.currentView === 'catalog' ? this.renderCatalogView(currentUid, isAdmin) : this.renderFormView(currentUid, isAdmin)}

      </div>
    `;
  }

  // -----------------------------------------------------------
  // SUB-TELA: CATÁLOGO & GESTÃO
  // -----------------------------------------------------------
  renderCatalogView(currentUid, isAdmin) {
    const filter = this.catalogFilter;
    const search = (this.catalogSearch || "").trim();

    let filtered = this.catalogSongs.filter(s => {
      if (filter === "published" && s.status !== SONG_STATUS.PUBLISHED) return false;
      if (filter === "draft" && s.status !== SONG_STATUS.DRAFT) return false;
      if (filter === "archived" && s.status !== SONG_STATUS.ARCHIVED) return false;
      if (filter === "pending_review" && s.status !== SONG_STATUS.PENDING_REVIEW && s.status !== "pending_review" && s.status !== "pendingReview") return false;
      
      if (search) {
        const normSearch = normalizeSearchText(search);
        const titleMatch = normalizeSearchText(s.title || "").includes(normSearch);
        const artistMatch = normalizeSearchText(s.artistName || s.artist || "").includes(normSearch);
        const keyMatch = (s.originalKey || "").toLowerCase().includes(search.toLowerCase());
        const genreMatch = Array.isArray(s.genres) && s.genres.some(g => normalizeSearchText(g).includes(normSearch));
        const tagMatch = Array.isArray(s.tags) && s.tags.some(t => normalizeSearchText(t).includes(normSearch));
        return titleMatch || artistMatch || keyMatch || genreMatch || tagMatch;
      }
      return true;
    });

    // Modal de Histórico de Versões
    const historyModalHtml = (this.showHistoryModal) ? `
      <div class="modal-backdrop" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:10000; padding:16px;">
        <div class="glass" style="max-width:680px; width:100%; max-height:85vh; display:flex; flex-direction:column; padding:24px; border-radius:20px; border:1px solid rgba(126,231,255,0.3); background:#0B1528;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
            <div>
              <span class="pill" style="font-size:10px; border-color:#7EE7FF; color:#7EE7FF;">AUDITORIA & HISTÓRICO</span>
              <h3 style="margin-top:6px; color:#fff; font-size:18px;">Versões de "${escapeHtml(this.selectedHistorySongTitle || 'Música')}"</h3>
            </div>
            <button class="button secondary" style="padding:6px 12px; font-size:13px;" onclick="window.adminSongManager.closeSongHistoryModal()">✕ Fechar</button>
          </div>

          <div style="flex:1; overflow-y:auto; padding-right:6px;">
            ${this.songVersions.length === 0 ? `
              <div style="text-align:center; padding:32px 16px; color:#94a3b8;">
                <p style="font-size:14px;">Nenhuma versão histórica anterior registrada para esta música.</p>
                <small style="display:block; margin-top:6px; color:#64748b;">Novas versões são salvas automaticamente quando a música é editada ou manualmente ao registrar versão.</small>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${this.songVersions.map((v, vIdx) => `
                  <div style="padding:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                      <div>
                        <strong style="color:#7EE7FF; font-size:14px;">Versão #${v.version || (this.songVersions.length - vIdx)}</strong>
                        <span style="font-size:12px; color:#94a3b8; margin-left:8px;">
                          ${v.createdAt ? (typeof v.createdAt === 'string' ? new Date(v.createdAt).toLocaleString('pt-BR') : 'Data registrada') : 'Recente'}
                        </span>
                      </div>
                      <button class="button secondary" style="font-size:11px; padding:4px 10px;" onclick='window.adminSongManager.restoreVersion(${JSON.stringify(v)})' title="Carregar acordes e estrutura desta versão no formulário">
                        ↺ Restaurar no Formulário
                      </button>
                    </div>
                    <div style="margin-top:8px; font-size:13px; color:#e2e8f0;">
                      ${escapeHtml(v.changeSummary || v.notes || "Atualização de cifra e harmonia")}
                    </div>
                    <div style="margin-top:8px; display:flex; gap:12px; font-size:11px; color:#94a3b8;">
                      <span>Tom: <strong style="color:#fff;">${escapeHtml(v.originalKey || 'G')}</strong></span>
                      <span>Modificado por: <strong style="color:#fff;">${escapeHtml(v.authorName || v.authorUid || 'Admin')}</strong></span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    ` : '';

    return `
      <section class="glass" style="padding:20px;">
        <!-- BARRA DE FILTROS E BUSCA -->
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="pill ${filter === 'all' ? 'active' : ''}" style="cursor:pointer;" onclick="window.adminSongManager.setCatalogFilter('all')">
              Todas (${this.catalogSongs.length})
            </button>
            <button class="pill ${filter === 'published' ? 'active' : ''}" style="cursor:pointer; border-color:#10B981; color:${filter === 'published' ? '#fff' : '#10B981'};" onclick="window.adminSongManager.setCatalogFilter('published')">
              Publicadas
            </button>
            <button class="pill ${filter === 'draft' ? 'active' : ''}" style="cursor:pointer; border-color:#F59E0B; color:${filter === 'draft' ? '#fff' : '#F59E0B'};" onclick="window.adminSongManager.setCatalogFilter('draft')">
              Rascunhos
            </button>
            <button class="pill ${filter === 'pending_review' ? 'active' : ''}" style="cursor:pointer; border-color:#818cf8; color:${filter === 'pending_review' ? '#fff' : '#818cf8'};" onclick="window.adminSongManager.setCatalogFilter('pending_review')">
              Em Revisão
            </button>
            <button class="pill ${filter === 'archived' ? 'active' : ''}" style="cursor:pointer; border-color:#64748b; color:${filter === 'archived' ? '#fff' : '#94a3b8'};" onclick="window.adminSongManager.setCatalogFilter('archived')">
              Arquivadas
            </button>
          </div>

          <div style="flex:1; max-width:320px; min-width:200px;">
            <input type="search" class="input" placeholder="Buscar título, artista, gênero..." value="${escapeHtml(this.catalogSearch)}" 
                   oninput="window.adminSongManager.setCatalogSearch(this.value)" style="padding:8px 14px; font-size:13px;">
          </div>
        </div>

        ${this.isLoadingCatalog ? `
          <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
            <div style="font-size:24px; animation:spin 1s linear infinite;">⏳</div>
            <p style="margin-top:10px; font-size:13px;">Carregando músicas do acervo...</p>
          </div>
        ` : (filtered.length === 0 ? `
          <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
            <p style="font-size:15px; color:#cbd5e1;">Nenhuma música encontrada com este filtro.</p>
            <button class="button primary" style="margin-top:14px; font-size:12px;" onclick="window.adminSongManager.resetForm()">
              ➕ Cadastrar Primeira Música
            </button>
          </div>
        ` : `
          <div class="admin-catalog-table" style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#94a3b8;">
                  <th style="padding:10px 12px;">Música / Artista</th>
                  <th style="padding:10px 12px;">Tom</th>
                  <th style="padding:10px 12px;">BPM</th>
                  <th style="padding:10px 12px;">Status</th>
                  <th style="padding:10px 12px;">Easy Play</th>
                  <th style="padding:10px 12px;">Áudio</th>
                  <th style="padding:10px 12px; text-align:right;">Ações Administrativas</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(s => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:12px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <strong style="color:#fff;">${escapeHtml(s.title)}</strong>
                        ${s.isVerified ? `<span class="pill" style="border-color:#10B981; color:#10B981; font-size:10px; padding:1px 6px;" title="Oficial VIRTUO Verificada">✓ Oficial</span>` : ''}
                      </div>
                      <div style="font-size:12px; color:#94a3b8;">${escapeHtml(s.artistName || s.artist || 'Artista desconhecido')}</div>
                    </td>
                    <td style="padding:12px;">
                      <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF; font-size:11px;">${escapeHtml(s.originalKey || 'G')}</span>
                    </td>
                    <td style="padding:12px; color:#cbd5e1;">
                      ${s.bpm || 74} BPM
                    </td>
                    <td style="padding:12px;">
                      <span class="pill" style="
                        font-size:11px;
                        border-color:${s.status === 'published' ? '#10B981' : (s.status === 'draft' ? '#F59E0B' : (s.status === 'pendingReview' || s.status === 'pending_review' ? '#818cf8' : '#64748b'))};
                        color:${s.status === 'published' ? '#10B981' : (s.status === 'draft' ? '#F59E0B' : (s.status === 'pendingReview' || s.status === 'pending_review' ? '#818cf8' : '#94a3b8'))};
                      ">
                        ${s.status === 'published' ? '● Publicada' : (s.status === 'draft' ? '○ Rascunho' : (s.status === 'pendingReview' || s.status === 'pending_review' ? '⏳ Em Revisão' : 'Arquivada'))}
                      </span>
                    </td>
                    <td style="padding:12px;">
                      ${(s.easyChords || s.easyChordSheet) ? `<span style="color:#10B981; font-size:12px;">✓ Ativo</span>` : `<span style="color:#64748b; font-size:12px;">Gerável</span>`}
                    </td>
                    <td style="padding:12px; font-size:11px;">
                      ${s.audioUrl ? `<span style="color:#7EE7FF;">🎧 Áudio Ok</span>` : `<span style="color:#64748b;">Sem áudio</span>`}
                    </td>
                    <td style="padding:12px; text-align:right;">
                      <div style="display:inline-flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                        <!-- Editar Formulário Completo -->
                        <button class="button secondary" style="font-size:11px; padding:4px 8px;" onclick="window.adminSongManager.openEdit('${s.id}', '${currentUid}', ${isAdmin})" title="Editar Música">
                          ✏️ Editar
                        </button>

                        <!-- Prévia & Revisão Rápida -->
                        <button class="button secondary" style="font-size:11px; padding:4px 8px; color:#7EE7FF; border-color:rgba(126,231,255,0.4);" onclick="window.adminSongManager.openPreviewDirectly('${s.id}', '${currentUid}', ${isAdmin})" title="Revisar e Pré-visualizar no Palco">
                          👁️ Prévia
                        </button>

                        <!-- Histórico de Versões -->
                        <button class="button secondary" style="font-size:11px; padding:4px 8px;" onclick="window.adminSongManager.viewSongHistoryModal('${s.id}')" title="Ver Histórico de Versões">
                          📜 Versões
                        </button>

                        <!-- Verificar (Admin) -->
                        ${isAdmin && !s.isVerified ? `
                          <button class="button secondary" style="font-size:11px; padding:4px 8px; color:#10B981; border-color:rgba(16,185,129,0.4);" onclick="window.adminSongManager.quickVerify('${s.id}', '${currentUid}')" title="Marcar como Oficial Verificada">
                            ⭐ Verificar
                          </button>
                        ` : ''}

                        <!-- Publicar ou Arquivar -->
                        ${s.status === 'draft' || s.status === 'pendingReview' || s.status === 'pending_review' ? `
                          <button class="button primary" style="font-size:11px; padding:4px 8px;" onclick="window.adminSongManager.quickPublish('${s.id}', '${currentUid}')" title="Publicar Música">
                            🚀 Publicar
                          </button>
                        ` : (s.status === 'published' ? `
                          <button class="button secondary" style="font-size:11px; padding:4px 8px;" onclick="window.adminSongManager.quickArchive('${s.id}', '${currentUid}')" title="Arquivar Música">
                            📦 Arquivar
                          </button>
                        ` : '')}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `)}
      </section>
      ${historyModalHtml}
    `;
  }

  setCatalogFilter(f) {
    this.catalogFilter = f;
    this.requestRender();
  }

  setCatalogSearch(s) {
    this.catalogSearch = s;
    this.requestRender();
  }

  async quickPublish(songId, userUid) {
    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório indisponível.");
      await repo.publishSong(songId, userUid, true);
      this.setNotification("success", "Música publicada com sucesso!");
      this.loadCatalog();
    } catch (err) {
      this.setNotification("error", `Erro ao publicar: ${err.message}`);
    }
  }

  async quickArchive(songId, userUid) {
    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório indisponível.");
      await repo.archiveSong(songId, userUid, true);
      this.setNotification("success", "Música arquivada!");
      this.loadCatalog();
    } catch (err) {
      this.setNotification("error", `Erro ao arquivar: ${err.message}`);
    }
  }

  async quickVerify(songId, userUid) {
    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório indisponível.");
      await repo.verifySong(songId, userUid);
      this.setNotification("success", "Música verificada com sucesso como Oficial VIRTUO!");
      this.loadCatalog();
    } catch (err) {
      this.setNotification("error", `Erro ao verificar música: ${err.message}`);
    }
  }

  async openPreviewDirectly(songId, currentUid, isAdmin) {
    await this.openEdit(songId, currentUid, isAdmin);
    this.goToStep(6);
  }

  async viewSongHistoryModal(songId) {
    this.selectedHistorySongId = songId;
    const song = this.catalogSongs.find(s => s.id === songId) || this.formData;
    this.selectedHistorySongTitle = song ? (song.title || "Música") : "Música";
    await this.loadVersionHistory(songId);
    this.showHistoryModal = true;
    this.requestRender();
  }

  closeSongHistoryModal() {
    this.showHistoryModal = false;
    this.selectedHistorySongId = null;
    this.requestRender();
  }

  restoreVersion(versionData) {
    if (!versionData) return;
    if (versionData.chords || versionData.chordSheet) {
      const chords = versionData.chords || versionData.chordSheet;
      this.formData.chordSheet = chords;
      this.formData.chords = chords;
    }
    if (versionData.easyChords || versionData.easyChordSheet) {
      const easy = versionData.easyChords || versionData.easyChordSheet;
      this.formData.easyChordSheet = easy;
      this.formData.easyChords = easy;
    }
    if (versionData.originalKey) {
      this.formData.originalKey = versionData.originalKey;
    }
    if (versionData.structure) {
      this.formData.structure = typeof versionData.structure === "string" 
        ? parseStructureFromText(versionData.structure)
        : versionData.structure;
      this.syncStructureString();
    }
    this.changeSummary = `Restaurado da versão #${versionData.version || 'anterior'}`;
    this.showHistoryModal = false;
    this.setNotification("info", `Versão #${versionData.version || ''} restaurada no formulário para revisão.`);
    this.currentView = "form";
    this.currentStep = 6; // leva direto para prévia da versão restaurada
    this.requestRender();
  }

  async createExplicitVersion(userUid, changeNote = "") {
    if (!this.editingSongId) {
      this.setNotification("error", "É necessário que a música já esteja cadastrada para criar nova versão.");
      return;
    }
    try {
      const repo = this.getRepository();
      if (!repo) throw new Error("Repositório indisponível.");
      await repo.createSongVersion(this.editingSongId, this.formData, userUid, changeNote || this.changeSummary || "Nova versão cadastrada");
      this.setNotification("success", "Nova versão registrada com sucesso no histórico!");
      await this.loadVersionHistory(this.editingSongId);
      this.requestRender();
    } catch (err) {
      this.setNotification("error", `Erro ao salvar versão: ${err.message}`);
    }
  }

  async handleAudioFileUpload(file, userUid) {
    if (!file) return;
    const allowedExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!file.type.startsWith('audio/') && !allowedExts.includes(ext)) {
      this.audioUploadError = "Formato não suportado. Envie arquivos MP3, WAV, OGG, M4A ou AAC.";
      this.requestRender();
      return;
    }

    const MAX_SIZE = 35 * 1024 * 1024; // 35MB (limite Storage rules)
    if (file.size > MAX_SIZE) {
      this.audioUploadError = "O arquivo excede o limite máximo permitido de 35MB para áudio.";
      this.requestRender();
      return;
    }

    this.audioUploadError = null;
    this.audioUploadProgress = {
      percent: 0,
      transferred: 0,
      total: file.size,
      filename: file.name
    };
    this.requestRender();

    try {
      const fbConfig = await import("../../../firebase-config.js");
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `audios/${Date.now()}_${sanitizedName}`;

      this.audioUploadTask = fbConfig.uploadFileWithProgress({
        file,
        path,
        onProgress: (percent, bytesTransferred, totalBytes) => {
          this.audioUploadProgress = {
            percent: Math.round(percent),
            transferred: bytesTransferred,
            total: totalBytes,
            filename: file.name
          };
          this.requestRender();
        },
        onError: (err) => {
          this.audioUploadError = `Falha no upload: ${err.message || 'Erro desconhecido'}`;
          this.audioUploadProgress = null;
          this.audioUploadTask = null;
          this.requestRender();
        },
        onComplete: (downloadUrl) => {
          this.formData.audioUrl = downloadUrl;
          this.audioUploadProgress = null;
          this.audioUploadTask = null;
          this.setNotification("success", "Áudio de referência enviado com sucesso!");
          this.requestRender();
        }
      });
    } catch (err) {
      this.audioUploadError = `Erro ao iniciar upload: ${err.message}`;
      this.audioUploadProgress = null;
      this.audioUploadTask = null;
      this.requestRender();
    }
  }

  cancelAudioUpload() {
    if (this.audioUploadTask && typeof this.audioUploadTask.cancel === "function") {
      this.audioUploadTask.cancel();
      this.audioUploadTask = null;
      this.audioUploadProgress = null;
      this.setNotification("info", "Upload de áudio cancelado.");
      this.requestRender();
    }
  }

  removeAudioUrl() {
    this.formData.audioUrl = "";
    this.audioUploadProgress = null;
    this.audioUploadError = null;
    this.requestRender();
  }

  // -----------------------------------------------------------
  // SUB-TELA: FORMULÁRIO WIZARD (7 ETAPAS)
  // -----------------------------------------------------------
  renderFormView(currentUid, isAdmin) {
    const step = this.currentStep;
    const f = this.formData;

    const stepTitles = [
      "Informações",
      "Harmonia",
      "Estrutura",
      "Links & Fontes",
      "Direitos Autorais",
      "Prévia",
      "Publicação"
    ];

    return `
      <!-- STEPPER NAVEGADOR -->
      <div class="admin-stepper-bar glass" style="padding:14px 16px; margin-bottom:20px; overflow-x:auto;">
        <div style="display:flex; justify-content:space-between; min-width:620px; gap:8px;">
          ${stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return `
              <div onclick="window.adminSongManager.setStep(${stepNum})" 
                   style="
                     display:flex; 
                     align-items:center; 
                     gap:8px; 
                     cursor:pointer; 
                     padding:6px 10px; 
                     border-radius:10px;
                     background:${isActive ? 'rgba(126, 231, 255, 0.12)' : 'transparent'};
                     border:1px solid ${isActive ? '#7EE7FF' : 'transparent'};
                     transition:all 0.2s ease;
                   ">
                <div style="
                  width:24px; 
                  height:24px; 
                  border-radius:50%; 
                  display:flex; 
                  align-items:center; 
                  justify-content:center; 
                  font-size:12px; 
                  font-weight:700;
                  background:${isActive ? '#7EE7FF' : (isCompleted ? '#10B981' : 'rgba(255,255,255,0.1)')};
                  color:${isActive ? '#07101F' : '#fff'};
                ">
                  ${isCompleted ? '✓' : stepNum}
                </div>
                <span style="
                  font-size:12px; 
                  font-weight:${isActive ? '700' : '500'}; 
                  color:${isActive ? '#fff' : (isCompleted ? '#cbd5e1' : '#64748b')}; 
                  white-space:nowrap;
                ">
                  ${title}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- FORMULÁRIO DINÂMICO CONFORME ETAPA ATUAL -->
      <div class="admin-step-content glass" style="padding:24px;">
        ${this.renderStepContent(step, f, currentUid, isAdmin)}
      </div>

      <!-- BARRA DE AÇÕES INFERIOR (PERSISTENTE) -->
      <div class="admin-footer-bar" style="
        margin-top:20px; 
        display:flex; 
        justify-content:space-between; 
        align-items:center; 
        flex-wrap:wrap; 
        gap:12px;
      ">
        <div style="display:flex; gap:10px;">
          ${step > 1 ? `
            <button class="button secondary" onclick="window.adminSongManager.prevStep()">
              ← Anterior
            </button>
          ` : `
            <button class="button secondary" onclick="window.adminSongManager.setView('catalog')">
              📋 Ver Catálogo
            </button>
          `}
          <button class="button secondary" style="border-color:#F59E0B; color:#F59E0B;" 
                  onclick="window.adminSongManager.saveDraft('${currentUid}', ${isAdmin})">
            💾 Salvar Rascunho
          </button>
        </div>

        <div style="display:flex; gap:10px;">
          ${step < 7 ? `
            <button class="button secondary" onclick="window.adminSongManager.setStep(6)">
              👁️ Ir para Prévia
            </button>
            <button class="button primary" onclick="window.adminSongManager.nextStep()">
              Próxima Etapa →
            </button>
          ` : `
            <button class="button primary" style="background:#10B981; border-color:#10B981;" 
                    onclick="window.adminSongManager.publishSong('${currentUid}', ${isAdmin})">
              🚀 Publicar Música Oficial
            </button>
          `}
        </div>
      </div>
    `;
  }

  // -----------------------------------------------------------
  // CONTEÚDO DE CADA ETAPA
  // -----------------------------------------------------------
  renderStepContent(step, f, currentUid, isAdmin) {
    switch(step) {
      case 1:
        return this.renderStep1(f);
      case 2:
        return this.renderStep2(f);
      case 3:
        return this.renderStep3(f);
      case 4:
        return this.renderStep4(f);
      case 5:
        return this.renderStep5(f);
      case 6:
        return this.renderStep6(f);
      case 7:
        return this.renderStep7(f, currentUid, isAdmin);
      default:
        return `<p>Etapa desconhecida.</p>`;
    }
  }

  // ETAPA 1: INFORMAÇÕES BÁSICAS
  renderStep1(f) {
    return `
      <div>
        <h3 style="font-size:18px; margin-bottom:4px; color:#fff;">Etapa 1: Informações Básicas</h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">
          Metadados primários para indexação, busca fonética e catálogo do VIRTUO.
        </p>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          
          <!-- Título -->
          <div>
            <label class="label">Título da Música *</label>
            <input type="text" class="input" placeholder="Ex: Grandioso És Tu, O Escudo..." 
                   value="${f.title || ''}" 
                   oninput="window.adminSongManager.updateField('title', this.value)" required>
          </div>

          <!-- Artista -->
          <div>
            <label class="label">Artista / Ministério *</label>
            <input type="text" class="input" placeholder="Ex: Harpa Cristã, Fernandinho..." 
                   value="${f.artistName || f.artist || ''}" 
                   oninput="window.adminSongManager.updateField('artistName', this.value)" required>
          </div>

          <!-- Álbum -->
          <div>
            <label class="label">Álbum ou Single</label>
            <input type="text" class="input" placeholder="Ex: Clássicos Inesquecíveis" 
                   value="${f.albumName || ''}" 
                   oninput="window.adminSongManager.updateField('albumName', this.value)">
          </div>

          <!-- Tom Original -->
          <div>
            <label class="label">Tonalidade Original (Tom) *</label>
            <select class="input" onchange="window.adminSongManager.updateField('originalKey', this.value)">
              ${MUSICAL_KEYS.map(k => `
                <option value="${k}" ${f.originalKey === k ? 'selected' : ''}>${k}</option>
              `).join('')}
            </select>
          </div>

          <!-- BPM -->
          <div>
            <label class="label">BPM (Andamento: 20 a 300)</label>
            <div style="display:flex; gap:10px; align-items:center;">
              <input type="range" min="20" max="260" value="${f.bpm || 74}" 
                     oninput="window.adminSongManager.updateField('bpm', Number(this.value))" style="flex:1;">
              <input type="number" class="input" style="width:75px; text-align:center;" min="20" max="300" 
                     value="${f.bpm || 74}" 
                     oninput="window.adminSongManager.updateField('bpm', Number(this.value))">
            </div>
          </div>

          <!-- Compasso -->
          <div>
            <label class="label">Fórmula de Compasso</label>
            <select class="input" onchange="window.adminSongManager.updateField('timeSignature', this.value)">
              ${TIME_SIGNATURES.map(ts => `
                <option value="${ts}" ${f.timeSignature === ts ? 'selected' : ''}>${ts}</option>
              `).join('')}
            </select>
          </div>

          <!-- Capotraste -->
          <div>
            <label class="label">Capotraste</label>
            <select class="input" onchange="window.adminSongManager.updateField('capo', Number(this.value))">
              <option value="0" ${f.capo === 0 ? 'selected' : ''}>Sem capotraste (0)</option>
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(c => `
                <option value="${c}" ${f.capo === c ? 'selected' : ''}>${c}ª casa</option>
              `).join('')}
            </select>
          </div>

          <!-- Dificuldade -->
          <div>
            <label class="label">Nível de Dificuldade</label>
            <select class="input" onchange="window.adminSongManager.updateField('difficulty', this.value)">
              ${CANONICAL_DIFFICULTIES.map(d => `
                <option value="${d}" ${f.difficulty === d ? 'selected' : ''}>${d}</option>
              `).join('')}
            </select>
          </div>

        </div>

        <!-- Gêneros Musicais (Chips) -->
        <div style="margin-top:20px;">
          <label class="label">Gênero(s) Musical(is)</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
            ${CANONICAL_GENRES.map(g => {
              const selected = Array.isArray(f.genres) && f.genres.includes(g);
              return `
                <button type="button" class="pill ${selected ? 'active' : ''}" 
                        style="cursor:pointer;" 
                        onclick="window.adminSongManager.toggleGenre('${g}')">
                  ${selected ? '✓ ' : '+ '}${g}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Instrumentos Recomendados -->
        <div style="margin-top:20px;">
          <label class="label">Instrumentos da Formação</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
            ${ADMIN_INSTRUMENTS.map(inst => {
              const selected = Array.isArray(f.instruments) && f.instruments.includes(inst);
              return `
                <button type="button" class="pill ${selected ? 'active' : ''}" 
                        style="cursor:pointer; border-color:${selected ? '#7EE7FF' : 'rgba(255,255,255,0.15)'};" 
                        onclick="window.adminSongManager.toggleInstrument('${inst}')">
                  ${selected ? '✓ ' : '+ '}${inst}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tags / Marcadores -->
        <div style="margin-top:20px;">
          <label class="label">Tags Temáticas (separadas por vírgula)</label>
          <input type="text" class="input" placeholder="Ex: Comunhão, Ceia, Gratidão, Pentecostal, Avivamento" 
                 value="${Array.isArray(f.tags) ? f.tags.join(', ') : (f.tags || '')}" 
                 oninput="window.adminSongManager.updateField('tags', this.value.split(',').map(t => t.trim()).filter(Boolean))">
        </div>

      </div>
    `;
  }

  // ETAPA 2: HARMONIA & CIFRA ESTRUTURADA
  renderStep2(f) {
    const chordsList = this.detectedChords || extractChordsFromSheet(f.chordSheet || f.chords || "");

    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:18px; margin:0; color:#fff;">Etapa 2: Harmonia & Cifra</h3>
            <p style="font-size:13px; color:#94a3b8; margin:4px 0 0 0;">
              Insira a partitura alinhada. O motor harmônico do VIRTUO gerencia acordes e Easy Play.
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button secondary" style="font-size:11px; padding:6px 12px;" onclick="window.adminSongManager.detectChords()">
              ✨ Detectar Acordes
            </button>
            <button class="button primary" style="font-size:11px; padding:6px 12px;" onclick="window.adminSongManager.generateEasyPlay()">
              🪄 Gerar Easy Play Auto
            </button>
          </div>
        </div>

        <!-- Cifra Padrão Completa -->
        <div style="margin-bottom:20px;">
          <label class="label">Cifra Completa Oficial (com acordes nas linhas superiores ou entre colchetes)</label>
          <textarea class="input" rows="12" style="font-family:monospace; font-size:13px; line-height:1.5; white-space:pre;" 
                    placeholder="[Intro] G  C9  Em7  D\n\n[Verso 1]\nG                 C9\nEu fui na olaria ver o vaso se formar..." 
                    oninput="window.adminSongManager.updateField('chordSheet', this.value)">${f.chordSheet || f.chords || ''}</textarea>
        </div>

        <!-- Acordes Detectados -->
        ${chordsList.length > 0 ? `
          <div style="margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:12px; font-weight:700; color:#7EE7FF; margin-bottom:8px;">
              ✨ ${chordsList.length} Acordes Identificados na Cifra:
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${chordsList.map(c => `
                <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF; font-size:11px;">
                  ${c.raw || c}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Easy Play Cifra -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label class="label" style="margin:0;">Cifra Simplificada (Easy Play - Para iniciantes sem extensões difíceis)</label>
            <span style="font-size:11px; color:#94a3b8;">Tríades fundamentais sem dissonâncias</span>
          </div>
          <textarea class="input" rows="8" style="font-family:monospace; font-size:13px; line-height:1.5; white-space:pre;" 
                    placeholder="Clique em 'Gerar Easy Play Auto' ou digite a cifra simplificada..." 
                    oninput="window.adminSongManager.updateField('easyChordSheet', this.value)">${f.easyChordSheet || f.easyChords || ''}</textarea>
        </div>

      </div>
    `;
  }

  // ETAPA 3: ESTRUTURA MUSICAL (CONSTRUTOR VISUAL)
  renderStep3(f) {
    const structure = Array.isArray(f.structure) ? f.structure : [];

    const sectionOptions = [
      { type: "intro", label: "Intro" },
      { type: "verse", label: "Verso" },
      { type: "pre_chorus", label: "Pré-refrão" },
      { type: "chorus", label: "Refrão" },
      { type: "bridge", label: "Ponte" },
      { type: "solo", label: "Solo" },
      { type: "spontaneous", label: "Espontâneo" },
      { type: "outro", label: "Final" }
    ];

    return `
      <div>
        <h3 style="font-size:18px; margin-bottom:4px; color:#fff;">Etapa 3: Estrutura da Música</h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:16px;">
          Monte os blocos da ordem de execução para exibição no Modo Ministro e ensaios.
        </p>

        <!-- Botões de Adicionar Bloco com 1 Clique -->
        <div style="margin-bottom:18px;">
          <label class="label">Adicionar Bloco com 1 Clique:</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
            ${sectionOptions.map(opt => `
              <button type="button" class="button secondary" style="font-size:11px; padding:6px 12px;" 
                      onclick="window.adminSongManager.addStructureSection('${opt.type}', '${opt.label}')">
                + ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Lista de Blocos Adicionados -->
        <div style="margin-bottom:20px;">
          <label class="label">Ordem de Execução dos Blocos (${structure.length}):</label>
          ${structure.length === 0 ? `
            <div style="padding:20px; text-align:center; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed rgba(255,255,255,0.1); color:#94a3b8; font-size:13px;">
              Nenhum bloco estrutural adicionado ainda. Clique nos botões acima ou digite no campo abaixo.
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
              ${structure.map((sec, idx) => `
                <div style="
                  display:flex; 
                  align-items:center; 
                  justify-content:space-between; 
                  padding:8px 12px; 
                  background:rgba(255,255,255,0.04); 
                  border:1px solid rgba(255,255,255,0.08); 
                  border-radius:10px;
                ">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:11px; color:#64748b; font-weight:700; width:20px;">${idx + 1}.</span>
                    <span class="pill" style="font-size:11px; border-color:#7EE7FF; color:#7EE7FF;">${sec.type.toUpperCase()}</span>
                    <strong style="font-size:13px; color:#fff;">${sec.label}</strong>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button type="button" style="background:none; border:none; color:#cbd5e1; cursor:pointer;" 
                            onclick="window.adminSongManager.moveStructureSection(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
                    <button type="button" style="background:none; border:none; color:#cbd5e1; cursor:pointer;" 
                            onclick="window.adminSongManager.moveStructureSection(${idx}, 1)" ${idx === structure.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
                    <button type="button" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:6px;" 
                            onclick="window.adminSongManager.removeStructureSection(${idx})">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Campo Sinótico Textual -->
        <div>
          <label class="label">Representação Textual Contínua (Sincronizada)</label>
          <input type="text" class="input" 
                 value="${this.structureText || structureToString(structure)}" 
                 placeholder="Ex: Intro • Verso 1 • Refrão • Ponte • Final" 
                 oninput="window.adminSongManager.handleStructureTextChange(this.value)">
          <p style="font-size:11px; color:#94a3b8; margin-top:4px;">
            Separe com "•" ou traços para adicionar múltiplos blocos instantaneamente.
          </p>
        </div>

      </div>
    `;
  }

  // ETAPA 4: LINKS & FONTES
  renderStep4(f) {
    const isUploadingAudio = !!this.audioUploadProgress;

    return `
      <div>
        <h3 style="font-size:18px; margin-bottom:4px; color:#fff;">Etapa 4: Áudio & Fontes de Referência</h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">
          Adicione o áudio de referência do louvor e links complementares para estudo da equipe.
        </p>

        <!-- UPLOAD NATIVO DE ÁUDIO (FIREBASE STORAGE) -->
        <div style="margin-bottom:24px; padding:18px; background:rgba(255,255,255,0.03); border:1px solid rgba(126,231,255,0.2); border-radius:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <div>
              <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF; font-size:10px;">ÁUDIO OFICIAL</span>
              <strong style="color:#fff; font-size:14px; margin-left:6px;">Upload de Áudio da Música</strong>
            </div>
            <small style="color:#94a3b8; font-size:11px;">Formatos: MP3, WAV, OGG, M4A, AAC • Limite: 35MB</small>
          </div>

          ${this.audioUploadError ? `
            <div style="padding:10px 14px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:10px; color:#fca5a5; font-size:12px; margin-bottom:12px;">
              ⚠️ ${escapeHtml(this.audioUploadError)}
            </div>
          ` : ''}

          ${isUploadingAudio ? `
            <div style="padding:14px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(126,231,255,0.3);">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
                <span style="color:#7EE7FF;">Enviando "${escapeHtml(this.audioUploadProgress.filename)}"...</span>
                <strong style="color:#fff;">${this.audioUploadProgress.percent}%</strong>
              </div>
              <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:10px;">
                <div style="width:${this.audioUploadProgress.percent}%; height:100%; background:#7EE7FF; transition:width 0.2s ease;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; color:#94a3b8;">
                  ${Math.round((this.audioUploadProgress.transferred || 0) / 1024 / 1024 * 10) / 10} MB de ${Math.round((this.audioUploadProgress.total || 0) / 1024 / 1024 * 10) / 10} MB
                </span>
                <button type="button" class="button secondary" style="font-size:11px; padding:4px 10px; color:#ef4444; border-color:rgba(239,68,68,0.4);" onclick="window.adminSongManager.cancelAudioUpload()">
                  ✕ Cancelar
                </button>
              </div>
            </div>
          ` : `
            ${f.audioUrl ? `
              <div style="padding:12px 14px; background:rgba(0,0,0,0.25); border-radius:12px; border:1px solid rgba(16,185,129,0.3); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:12px; color:#10B981; font-weight:600;">✓ Áudio carregado e pronto para reprodução:</span>
                  <button type="button" class="button secondary" style="font-size:11px; padding:2px 8px; color:#ef4444;" onclick="window.adminSongManager.removeAudioUrl()" title="Remover áudio atual">
                    Remover
                  </button>
                </div>
                <audio controls src="${escapeHtml(f.audioUrl)}" style="width:100%; height:36px; outline:none;"></audio>
              </div>
            ` : ''}

            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <input type="file" id="admin-audio-input" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" style="display:none;" 
                     onchange="if(this.files &amp;&amp; this.files[0]) window.adminSongManager.handleAudioFileUpload(this.files[0], '${this.currentUid || 'admin'}')">
              <button type="button" class="button primary" style="font-size:12px; display:inline-flex; align-items:center; gap:6px;" 
                      onclick="document.getElementById('admin-audio-input').click()">
                <span>📁</span>
                <span>${f.audioUrl ? 'Substituir Arquivo de Áudio' : 'Selecionar Arquivo de Áudio do Dispositivo'}</span>
              </button>
              <span style="font-size:11px; color:#94a3b8;">ou informe link direto abaixo</span>
            </div>
          `}
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          
          <!-- YouTube -->
          <div>
            <label class="label">Link do YouTube</label>
            <input type="url" class="input" placeholder="https://www.youtube.com/watch?v=..." 
                   value="${f.youtubeUrl || ''}" 
                   oninput="window.adminSongManager.updateField('youtubeUrl', this.value)">
          </div>

          <!-- Spotify -->
          <div>
            <label class="label">Link do Spotify</label>
            <input type="url" class="input" placeholder="https://open.spotify.com/track/..." 
                   value="${f.spotifyUrl || ''}" 
                   oninput="window.adminSongManager.updateField('spotifyUrl', this.value)">
          </div>

          <!-- Capa do Álbum -->
          <div>
            <label class="label">URL da Imagem de Capa</label>
            <input type="url" class="input" placeholder="https://.../capa.jpg" 
                   value="${f.coverUrl || ''}" 
                   oninput="window.adminSongManager.updateField('coverUrl', this.value)">
          </div>

          <!-- URL Manual de Áudio Alternativa -->
          <div>
            <label class="label">URL Direta de Áudio (Alternativa)</label>
            <input type="url" class="input" placeholder="https://.../audio.mp3" 
                   value="${f.audioUrl || ''}" 
                   oninput="window.adminSongManager.updateField('audioUrl', this.value)">
          </div>

          <!-- Tipo de Fonte -->
          <div>
            <label class="label">Tipo de Fonte Cadastral</label>
            <select class="input" onchange="window.adminSongManager.updateField('sourceType', this.value)">
              <option value="${SOURCE_TYPES.OFFICIAL}" ${f.sourceType === SOURCE_TYPES.OFFICIAL ? 'selected' : ''}>VIRTUO Oficial</option>
              <option value="${SOURCE_TYPES.LICENSED}" ${f.sourceType === SOURCE_TYPES.LICENSED ? 'selected' : ''}>Licenciado por Gravadora</option>
              <option value="${SOURCE_TYPES.MANUAL}" ${f.sourceType === SOURCE_TYPES.MANUAL ? 'selected' : ''}>Cadastrado Manualmente</option>
              <option value="${SOURCE_TYPES.USER}" ${f.sourceType === SOURCE_TYPES.USER ? 'selected' : ''}>Comunidade de Músicos</option>
            </select>
          </div>

          <!-- Nome da Fonte -->
          <div>
            <label class="label">Nome da Fonte / Gravadora / Ministério</label>
            <input type="text" class="input" placeholder="Ex: MK Music, Todah Music, Domínio Público..." 
                   value="${f.sourceName || ''}" 
                   oninput="window.adminSongManager.updateField('sourceName', this.value)">
          </div>

        </div>
      </div>
    `;
  }

  // ETAPA 5: DIREITOS AUTORAIS & LETRA (PROTEÇÃO RIGOROSA)
  renderStep5(f) {
    const isUnavailable = !f.lyricsStatus || f.lyricsStatus === LYRICS_STATUS.UNAVAILABLE;

    return `
      <div>
        <h3 style="font-size:18px; margin-bottom:4px; color:#fff;">Etapa 5: Direitos Autorais & Letra Oficial</h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">
          O VIRTUO respeita rigorosamente a Lei de Direitos Autorais. A inclusão de letras completas só é permitida mediante autorização ou licença válida.
        </p>

        <!-- Seletor de Status de Direitos Autorais -->
        <div style="margin-bottom:20px;">
          <label class="label">Status de Licenciamento da Letra *</label>
          <select class="input" style="font-size:14px; font-weight:600;" 
                  onchange="window.adminSongManager.updateField('lyricsStatus', this.value)">
            <option value="${LYRICS_STATUS.UNAVAILABLE}" ${f.lyricsStatus === LYRICS_STATUS.UNAVAILABLE ? 'selected' : ''}>
              🔒 Indisponível / Não Autorizada (Padrão Seguro - Sem Letra)
            </option>
            <option value="${LYRICS_STATUS.AUTHORIZED}" ${f.lyricsStatus === LYRICS_STATUS.AUTHORIZED ? 'selected' : ''}>
              🟢 Autorizada Diretamente pelo Artista / Titular
            </option>
            <option value="${LYRICS_STATUS.LICENSED}" ${f.lyricsStatus === LYRICS_STATUS.LICENSED ? 'selected' : ''}>
              🟢 Licenciada por Editora / Órgão Musical
            </option>
            <option value="${LYRICS_STATUS.PENDING_REVIEW}" ${f.lyricsStatus === LYRICS_STATUS.PENDING_REVIEW ? 'selected' : ''}>
              🟡 Em Análise Jurídica / Moderação
            </option>
          </select>
        </div>

        <!-- Banner Explicativo de Segurança -->
        ${isUnavailable ? `
          <div style="padding:16px; border-radius:12px; background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.3); margin-bottom:20px;">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="font-size:20px;">🔒</span>
              <div>
                <strong style="color:#ef4444; font-size:14px;">Inserção de Letra Desativada</strong>
                <p style="color:#cbd5e1; font-size:12px; margin-top:4px; line-height:1.5;">
                  A cópia de letras protegidas sem contrato ou autorização legal é proibida no catálogo VIRTUO.
                  Caso possua a documentação ou contrato de licença, selecione "Autorizada" ou "Licenciada" acima e informe a licença.
                </p>
              </div>
            </div>
          </div>
        ` : `
          <div style="padding:16px; border-radius:12px; background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); margin-bottom:20px;">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="font-size:20px;">✓</span>
              <div>
                <strong style="color:#10B981; font-size:14px;">Declaração de Conformidade Jurídica</strong>
                <p style="color:#cbd5e1; font-size:12px; margin-top:4px; line-height:1.5;">
                  Preencha os dados do contrato de licença e titular legal abaixo para registrar a letra com total segurança jurídica.
                </p>
              </div>
            </div>
          </div>
        `}

        <!-- Campos de Licença (Obrigatórios se autorizado/licenciado) -->
        ${!isUnavailable ? `
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:20px;">
            <div>
              <label class="label">Código do Contrato / Licença *</label>
              <input type="text" class="input" placeholder="Ex: Licença VIRTUO-LOUVOR-2026 / Contrato nº 412" 
                     value="${f.lyricsLicense || ''}" 
                     oninput="window.adminSongManager.updateField('lyricsLicense', this.value)">
            </div>
            <div>
              <label class="label">Titular da Fonte / Editora *</label>
              <input type="text" class="input" placeholder="Ex: Universal Music Publishing / Autorização por e-mail" 
                     value="${f.lyricsSource || ''}" 
                     oninput="window.adminSongManager.updateField('lyricsSource', this.value)">
            </div>
          </div>
        ` : ''}

        <!-- Campo de Letra -->
        <div>
          <label class="label">Letra Completa da Música</label>
          <textarea class="input" rows="10" 
                    style="font-size:13px; line-height:1.6; opacity:${isUnavailable ? '0.4' : '1'}; background:${isUnavailable ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.03)'};" 
                    placeholder="${isUnavailable ? 'Inserção de letra desativada para proteger direitos autorais...' : 'Digite a letra oficial autorizada...'}" 
                    ${isUnavailable ? 'disabled' : ''} 
                    oninput="window.adminSongManager.updateField('lyrics', this.value)">${f.lyrics || ''}</textarea>
        </div>

      </div>
    `;
  }

  // ETAPA 6: PRÉVIA INTERATIVA (COM TRANSPOSIÇÃO E EASY PLAY EM TEMPO REAL)
  renderStep6(f) {
    const semitones = this.previewSemitones;
    const isEasy = this.previewEasyPlay;
    
    const originalKey = f.originalKey || "G";
    const currentKey = calculateKey(originalKey, semitones);

    // Cifra base para exibição
    const rawSheet = isEasy 
      ? (f.easyChordSheet || f.easyChords || generateEasyPlaySheet(f.chordSheet || f.chords || ''))
      : (f.chordSheet || f.chords || '');

    const transposedSheet = semitones === 0 
      ? rawSheet 
      : transposeChordSheet(rawSheet, semitones);

    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:18px; margin:0; color:#fff;">Etapa 6: Prévia Interativa da Música</h3>
            <p style="font-size:13px; color:#94a3b8; margin:4px 0 0 0;">
              Teste a transposição harmônica e o Easy Play exatamente como o músico verá no palco.
            </p>
          </div>

          <!-- Controles de Teste: Transposição & Easy Play -->
          <div style="display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.04); padding:6px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
            
            <!-- Botões de Transposição -->
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:#94a3b8; font-weight:700;">TOM:</span>
              <button class="button secondary" style="padding:4px 10px; font-size:13px;" onclick="window.adminSongManager.transposePreview(-1)">-</button>
              <strong style="font-size:14px; color:#7EE7FF; min-width:32px; text-align:center;">${currentKey}</strong>
              <button class="button secondary" style="padding:4px 10px; font-size:13px;" onclick="window.adminSongManager.transposePreview(1)">+</button>
              ${semitones !== 0 ? `
                <button class="pill" style="font-size:10px; cursor:pointer;" onclick="window.adminSongManager.resetPreviewTranspose()">
                  Reset (${semitones > 0 ? `+${semitones}` : semitones})
                </button>
              ` : ''}
            </div>

            <div style="width:1px; height:20px; background:rgba(255,255,255,0.1);"></div>

            <!-- Alternador Easy Play -->
            <button class="pill ${isEasy ? 'active' : ''}" style="cursor:pointer; border-color:${isEasy ? '#10B981' : 'rgba(255,255,255,0.2)'};" 
                    onclick="window.adminSongManager.togglePreviewEasyPlay()">
              ${isEasy ? '✓ Easy Play Ativo' : 'Cifra Normal'}
            </button>

            <!-- Teste no Modo Ministro -->
            <button type="button" class="button primary" style="font-size:11px; padding:4px 10px; background:#7EE7FF; color:#0B1528; font-weight:700; border:none;" 
                    onclick="if(window.VirtuoMinister && window.VirtuoMinister.open){ window.VirtuoMinister.open(window.adminSongManager.formData, window.adminSongManager.previewSemitones, window.adminSongManager.previewEasyPlay); } else { window.adminSongManager.setNotification('info', 'Modo Ministro ativado nas telas de palco.'); }">
              🎤 Testar no Modo Ministro
            </button>

          </div>
        </div>

        <!-- Card de Prévia Visual da Música -->
        <div class="glass" style="padding:20px; border:1px solid rgba(126, 231, 255, 0.2); border-radius:16px;">
          
          <!-- Cabeçalho do Card -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="pill" style="border-color:#7EE7FF; color:#7EE7FF; font-size:11px;">
                  TOM: ${currentKey} ${semitones !== 0 ? `(Orig: ${originalKey})` : ''}
                </span>
                <span class="pill" style="border-color:#d4af37; color:#fce793; font-size:11px;">
                  ${f.bpm || 74} BPM
                </span>
                <span class="pill" style="font-size:11px;">
                  ${f.difficulty || 'Fácil'}
                </span>
                ${f.capo > 0 ? `<span class="pill" style="font-size:11px;">Capo ${f.capo}ª</span>` : ''}
              </div>
              
              <h2 style="font-size:24px; font-weight:800; color:#fff; margin:10px 0 2px 0;">
                ${f.title || 'Título da Música'}
              </h2>
              <div style="font-size:14px; color:#94a3b8;">
                ${f.artistName || f.artist || 'Nome do Artista'} ${f.albumName ? `• Álbum: ${f.albumName}` : ''}
              </div>
            </div>

            <div style="text-align:right;">
              <span class="pill" style="font-size:11px; border-color:${f.status === 'published' ? '#10B981' : '#F59E0B'}; color:${f.status === 'published' ? '#10B981' : '#F59E0B'};">
                ${f.status === 'published' ? '● Publicada' : '○ Rascunho'}
              </span>
            </div>
          </div>

          <!-- Badges de Estrutura -->
          ${Array.isArray(f.structure) && f.structure.length > 0 ? `
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
              ${f.structure.map(s => `
                <span class="pill" style="font-size:10px; background:rgba(255,255,255,0.04);">
                  ${s.label || s.type}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <!-- Visualização da Cifra Formatada -->
          <div style="background:rgba(0,0,0,0.25); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); overflow-x:auto;">
            <pre style="font-family:monospace; font-size:14px; line-height:1.6; color:#cbd5e1; margin:0; white-space:pre;">${this.highlightChordsInText(transposedSheet || 'Nenhuma cifra inserida ainda.')}</pre>
          </div>

          <!-- Letra quando disponível -->
          ${f.lyrics && f.lyricsStatus !== LYRICS_STATUS.UNAVAILABLE ? `
            <div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);">
              <h4 style="font-size:13px; color:#7EE7FF; margin-bottom:8px;">Letra Autorizada:</h4>
              <div style="font-size:13px; line-height:1.7; color:#94a3b8; white-space:pre-wrap;">${f.lyrics}</div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  // Destaca acordes em HTML para a prévia interativa
  highlightChordsInText(text) {
    if (!text) return "";
    return text.split("\n").map(line => {
      if (isChordLine(line)) {
        return line.replace(CHORD_FINDER_REGEX, (match) => `<span style="color:#7EE7FF; font-weight:700;">${match}</span>`);
      }
      return line;
    }).join("\n");
  }

  // ETAPA 7: PUBLICAÇÃO & GESTÃO DE VERSÕES
  renderStep7(f, currentUid, isAdmin) {
    const isValid = this.validate();
    const errors = this.validationErrors || [];

    return `
      <div>
        <h3 style="font-size:18px; margin-bottom:4px; color:#fff;">Etapa 7: Publicação & Versionamento</h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:20px;">
          Verifique o diagnóstico estrito de integridade do VIRTUO e escolha a ação de estado.
        </p>

        <!-- Card de Diagnóstico de Validação -->
        <div style="
          padding:16px; 
          border-radius:12px; 
          margin-bottom:20px;
          background:${isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
          border:1px solid ${isValid ? '#10B981' : '#EF4444'};
        ">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
            <span style="font-size:20px;">${isValid ? '✓' : '⚠️'}</span>
            <strong style="font-size:15px; color:${isValid ? '#10B981' : '#EF4444'};">
              ${isValid ? 'Diagnóstico Positivo: Música Pronta para Publicação!' : 'Pendências Encontradas na Validação:'}
            </strong>
          </div>

          ${!isValid ? `
            <ul style="margin:8px 0 0 20px; font-size:13px; color:#fca5a5; line-height:1.6;">
              ${errors.map(err => `<li>${err}</li>`).join('')}
            </ul>
          ` : `
            <p style="margin:4px 0 0 0; font-size:13px; color:#cbd5e1;">
              Título, artista, tom original (${f.originalKey}), BPM (${f.bpm || 74}) e conformidade autoral verificados pelo <code>SongValidator</code>.
            </p>
          `}
        </div>

        <!-- Resumo da Alteração para Versionamento -->
        <div style="margin-bottom:20px;">
          <label class="label">Resumo da Alteração (Histórico de Versão Auditável)</label>
          <input type="text" class="input" placeholder="Ex: Inclusão do arranjo da intro e transposição para Cm oficial" 
                 value="${this.changeSummary || ''}" 
                 oninput="window.adminSongManager.changeSummary = this.value">
          <p style="font-size:11px; color:#94a3b8; margin-top:4px;">
            Ao salvar ou atualizar, uma cópia imutável é arquivada na coleção <code>songVersions</code> para auditoria.
          </p>
        </div>

        <!-- Ações Primárias -->
        <div style="padding:16px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.08); margin-bottom:20px;">
          <h4 style="font-size:14px; color:#fff; margin-bottom:12px;">Ações Disponíveis:</h4>
          
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <!-- Salvar como Rascunho -->
            <button class="button secondary" style="border-color:#F59E0B; color:#F59E0B;" 
                    onclick="window.adminSongManager.saveDraft('${currentUid}', ${isAdmin})">
              💾 Salvar como Rascunho
            </button>

            <!-- Publicar Oficialmente -->
            <button class="button primary" style="background:#10B981; border-color:#10B981;" 
                    onclick="window.adminSongManager.publishSong('${currentUid}', ${isAdmin})">
              🚀 Publicar Oficialmente
            </button>

            <!-- Registrar Nova Versão Manualmente -->
            ${this.editingSongId ? `
              <button class="button secondary" style="border-color:#7EE7FF; color:#7EE7FF;" 
                      onclick="window.adminSongManager.createExplicitVersion('${currentUid}')">
                📜 Registrar Nova Versão
              </button>
            ` : ''}

            <!-- Arquivar (se já existir) -->
            ${this.editingSongId ? `
              <button class="button secondary" style="border-color:#64748b; color:#94a3b8;" 
                      onclick="window.adminSongManager.archiveSong('${currentUid}', ${isAdmin})">
                📦 Arquivar Música
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Histórico de Versões da Música (se existir) -->
        ${this.songVersions.length > 0 ? `
          <div style="margin-top:24px;">
            <h4 style="font-size:14px; color:#7EE7FF; margin-bottom:10px;">
              📜 Histórico de Alterações (${this.songVersions.length} versões registradas):
            </h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${this.songVersions.map((v, idx) => `
                <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(255,255,255,0.06); font-size:12px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; color:#fff; font-weight:700;">
                    <span>Versão #${this.songVersions.length - idx} ${v.version ? `(v${v.version})` : ''}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <span style="color:#94a3b8; font-weight:400;">Tom: ${escapeHtml(v.originalKey || 'G')}</span>
                      <button class="button secondary" style="font-size:10px; padding:2px 8px;" onclick='window.adminSongManager.restoreVersion(${JSON.stringify(v)})'>
                        ↺ Restaurar
                      </button>
                    </div>
                  </div>
                  <div style="color:#cbd5e1; margin-top:4px;">
                    ${escapeHtml(v.changeSummary || v.notes || 'Atualização sem nota descritiva')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }
}

// Instância Singleton
export const adminSongManager = new SongManagerController();
if (typeof window !== "undefined") {
  window.adminSongManager = adminSongManager;
}
