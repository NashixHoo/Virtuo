// =============================================================
// VIRTUO PROFESSIONAL SONGS REPOSITORY SERVICE
// Camada de serviço/repositório profissional para o Firestore
// Coleções: 'songs', 'artists', 'albums', 'genres', 'songVersions',
//           'songCollections', 'userFavorites', 'userSongHistory', 'songRatings'
// Projeto: virtuo-7e01b
// =============================================================

import { 
  db, 
  auth 
} from "./firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { 
  SongNormalizer,
  SongValidator,
  SongImporter,
  SongMigration,
  SONG_STATUS,
  SONG_VISIBILITY,
  SOURCE_TYPES,
  LYRICS_STATUS,
  normalizeSearchText
} from "./src/database/index.js";

import { DEMO_SONGS as RAW_DEMO_SONGS } from "./src/music/demo-songs.js";

// Banco de músicas limpo e pronto para novo repertório autêntico e verificado
export const DEMO_SONGS = Array.isArray(RAW_DEMO_SONGS) ? RAW_DEMO_SONGS : [];

// Instâncias migradas em memória para acesso imediato e garantido
export const CANONICAL_MIGRATED_DEMO_SONGS = (DEMO_SONGS || []).map(s => SongMigration.migrateLegacySong(s));

export const SongsRepository = {
  // Chave de cache local para as últimas 10 músicas consultadas (Modo Offline)
  OFFLINE_CACHE_KEY: "virtuo_recent_songs_offline_v2",

  /**
   * Permite remoção e filtragem de todas as músicas marcadas como teste ou legado.
   */
  removeTestSongs(songsList) {
    if (!Array.isArray(songsList)) return [];
    return songsList.filter(s => s.isTestData !== true && !String(s.id).startsWith("test-cc0-") && (s.title || "").toLowerCase() !== "fidelidade");
  },

  /**
   * Obtém todas as músicas do Firestore ordenadas por data de criação.
   * Aplica a migração do schema para garantir retrocompatibilidade.
   */
  async getAllSongs() {
    try {
      const songsCol = collection(db, "songs");
      const q = query(songsCol, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) {
        return [...CANONICAL_MIGRATED_DEMO_SONGS];
      }
      const firestoreSongs = snap.docs
        .map(docSnap => SongMigration.migrateLegacySong({ id: docSnap.id, ...docSnap.data() }))
        .filter(s => s.isTestData !== true && !String(s.id).startsWith("test-cc0-") && (s.title || "").toLowerCase() !== "fidelidade");
      const ids = new Set(firestoreSongs.map(s => s.id));
      const titles = new Set(firestoreSongs.map(s => (s.title || "").toLowerCase()));
      const missingDemo = CANONICAL_MIGRATED_DEMO_SONGS.filter(d => !titles.has((d.title || "").toLowerCase()) && !ids.has(d.id));
      return [...firestoreSongs, ...missingDemo];
    } catch (err) {
      console.warn("[SongsRepository.getAllSongs] Firestore indisponível, servindo acervo local:", err.message);
      return [...CANONICAL_MIGRATED_DEMO_SONGS];
    }
  },

  /**
   * Retorna músicas publicadas com suporte a filtros profissionais:
   * { genre, key, difficulty, artistId, maxBpm, minBpm, limitCount }
   */
  async getPublishedSongs(filters = {}) {
    try {
      const songsCol = collection(db, "songs");
      let constraints = [
        where("status", "==", SONG_STATUS.PUBLISHED),
        where("visibility", "==", SONG_VISIBILITY.PUBLIC),
        orderBy("createdAt", "desc")
      ];

      if (filters.limitCount) {
        constraints.push(limit(Number(filters.limitCount)));
      }

      const q = query(songsCol, ...constraints);
      const snap = await getDocs(q);
      let list = snap.empty 
        ? [] 
        : snap.docs.map(d => SongMigration.migrateLegacySong({ id: d.id, ...d.data() }));

      // Filtros em memória adicionais (evita necessidade excessiva de índices compostos)
      if (filters.genre) {
        const gNorm = normalizeSearchText(filters.genre);
        list = list.filter(s => Array.isArray(s.genres) && s.genres.some(g => normalizeSearchText(g) === gNorm));
      }
      if (filters.key) {
        list = list.filter(s => s.originalKey === filters.key);
      }
      if (filters.difficulty) {
        list = list.filter(s => s.difficulty === filters.difficulty);
      }
      if (filters.artistId) {
        list = list.filter(s => s.artistId === filters.artistId);
      }
      if (filters.minBpm) {
        list = list.filter(s => Number(s.bpm) >= Number(filters.minBpm));
      }
      if (filters.maxBpm) {
        list = list.filter(s => Number(s.bpm) <= Number(filters.maxBpm));
      }

      return list;
    } catch (err) {
      console.warn("[SongsRepository.getPublishedSongs] Fallback local:", err.message);
      return [];
    }
  },

  /**
   * Busca músicas profissional por texto (título, artista, gênero, tonalidade, tags).
   * Utiliza busca fonética/sem acentos (normalizedTitle e searchKeywords).
   */
  async searchSongs(queryText = "", filters = {}) {
    const rawAll = await this.getAllSongs();
    if (!queryText || !queryText.trim()) {
      return this.getPublishedSongs(filters);
    }

    const term = normalizeSearchText(queryText);
    const results = rawAll.filter(song => {
      // 1. Verifica se está publicada (ou do próprio usuário se autenticado)
      const isPublic = song.status === SONG_STATUS.PUBLISHED && song.visibility === SONG_VISIBILITY.PUBLIC;
      const isCreator = auth.currentUser && song.createdBy === auth.currentUser.uid;
      if (!isPublic && !isCreator) return false;

      // 2. Correspondência direta de título normalizado
      if (song.normalizedTitle && song.normalizedTitle.includes(term)) return true;

      // 3. Correspondência com artista
      const artNorm = normalizeSearchText(song.artistName || song.artist || "");
      if (artNorm.includes(term)) return true;

      // 4. Correspondência com tonalidade exata (ex: 'Cm', 'G')
      if (song.originalKey && song.originalKey.toLowerCase() === term.toLowerCase()) return true;

      // 5. Correspondência por searchKeywords indexadas
      if (Array.isArray(song.searchKeywords) && song.searchKeywords.some(kw => kw.includes(term))) {
        return true;
      }

      // 6. Correspondência por gênero ou tags
      if (Array.isArray(song.genres) && song.genres.some(g => normalizeSearchText(g).includes(term))) {
        return true;
      }
      if (Array.isArray(song.tags) && song.tags.some(t => normalizeSearchText(t).includes(term))) {
        return true;
      }

      return false;
    });

    return results;
  },

  /**
   * Busca músicas por artista.
   */
  async getSongsByArtist(artistIdOrName) {
    if (!artistIdOrName) return [];
    const term = normalizeSearchText(artistIdOrName);
    const all = await this.getAllSongs();
    return all.filter(s => 
      s.artistId === artistIdOrName || 
      normalizeSearchText(s.artistName || s.artist || "").includes(term)
    );
  },

  /**
   * Busca músicas por gênero musical.
   */
  async getSongsByGenre(genre) {
    if (!genre) return [];
    const term = normalizeSearchText(genre);
    const all = await this.getAllSongs();
    return all.filter(s => 
      Array.isArray(s.genres) && s.genres.some(g => normalizeSearchText(g).includes(term))
    );
  },

  /**
   * Busca músicas por tonalidade original.
   */
  async getSongsByKey(key) {
    if (!key) return [];
    const all = await this.getAllSongs();
    return all.filter(s => s.originalKey === key);
  },

  /**
   * Busca músicas por nível de dificuldade.
   */
  async getSongsByDifficulty(difficulty) {
    if (!difficulty) return [];
    const all = await this.getAllSongs();
    return all.filter(s => s.difficulty === difficulty);
  },

  /**
   * Retorna as últimas músicas salvas no cache local para uso offline.
   */
  getOfflineRecentSongs() {
    try {
      const raw = localStorage.getItem(this.OFFLINE_CACHE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Limpa o cache offline de músicas
   */
  clearOfflineCache() {
    try {
      localStorage.removeItem(this.OFFLINE_CACHE_KEY);
    } catch {}
  },

  /**
   * Salva a música no cache local das últimas 10 músicas consultadas.
   */
  cacheSongOffline(song) {
    if (!song || !song.id) return;
    try {
      const migrated = SongMigration.migrateLegacySong(song);
      let recent = this.getOfflineRecentSongs();
      recent = recent.filter(s => s.id !== migrated.id);
      recent.unshift({
        ...migrated,
        cachedAt: new Date().toISOString()
      });
      if (recent.length > 10) {
        recent = recent.slice(0, 10);
      }
      localStorage.setItem(this.OFFLINE_CACHE_KEY, JSON.stringify(recent));
    } catch (err) {
      console.warn("Aviso ao salvar música no cache offline:", err);
    }
  },

  /**
   * Obtém uma música por ID no Firestore com fallback offline.
   */
  async getSongById(songId) {
    if (!songId) return null;
    const offlineSongs = this.getOfflineRecentSongs();
    const offlineFound = offlineSongs.find(s => s.id === songId);

    try {
      const songRef = doc(db, "songs", songId);
      const snap = await getDoc(songRef);
      if (snap.exists()) {
        const fullSong = SongMigration.migrateLegacySong({ id: snap.id, ...snap.data() });
        this.cacheSongOffline(fullSong);
        return fullSong;
      }
    } catch (err) {
      console.warn("[SongsRepository.getSongById] Fallback para cache offline:", err.message);
    }

    if (offlineFound) return SongMigration.migrateLegacySong(offlineFound);
    const demoFound = CANONICAL_MIGRATED_DEMO_SONGS.find(s => s.id === songId || (s.title && s.title.toLowerCase() === (songId || "").toLowerCase()));
    if (demoFound) return demoFound;
    return null;
  },

  /**
   * Assina atualizações em tempo real da coleção 'songs'.
   */
  subscribeToSongs(onUpdate, onError) {
    try {
      const songsCol = collection(db, "songs");
      const q = query(songsCol, orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const songs = snapshot.docs
            .map(d => SongMigration.migrateLegacySong({ id: d.id, ...d.data() }))
            .filter(s => s.isTestData !== true && !String(s.id).startsWith("test-cc0-") && (s.title || "").toLowerCase() !== "fidelidade");
          const ids = new Set(songs.map(s => s.id));
          const titles = new Set(songs.map(s => (s.title || "").toLowerCase()));
          const missingDemo = CANONICAL_MIGRATED_DEMO_SONGS.filter(d => !titles.has((d.title || "").toLowerCase()) && !ids.has(d.id));
          onUpdate([...songs, ...missingDemo]);
        } else {
          onUpdate([...CANONICAL_MIGRATED_DEMO_SONGS]);
        }
      }, (err) => {
        console.warn("[SongsRepository.subscribeToSongs] Aviso stream Firestore:", err.message);
        const offline = this.getOfflineRecentSongs();
        const fallbackList = offline.length > 0 ? offline : [...CANONICAL_MIGRATED_DEMO_SONGS];
        if (onError) onError(err);
        else onUpdate(fallbackList);
      });
    } catch (err) {
      console.warn("[SongsRepository.subscribeToSongs] Exceção:", err.message);
      const offline = this.getOfflineRecentSongs();
      const fallbackList = offline.length > 0 ? offline : [...CANONICAL_MIGRATED_DEMO_SONGS];
      onUpdate(fallbackList);
      return () => {};
    }
  },

  /**
   * Cria uma nova música aplicando validação estrita, normalização e moderação.
   */
  async createSong(songData, userUid, isAdmin = false) {
    const creatorId = userUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!creatorId) {
      throw new Error("Usuário deve estar autenticado para criar uma música.");
    }

    // Processa através do pipeline de importação seguro
    const processed = SongImporter.processSongImport(songData, {
      userUid: creatorId,
      isAdmin,
      source: songData.source || null
    });

    const payload = {
      ...processed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    delete payload.id;

    const songsCol = collection(db, "songs");
    const docRef = await addDoc(songsCol, payload);
    const created = { id: docRef.id, ...processed };
    this.cacheSongOffline(created);
    return docRef.id;
  },

  /**
   * Atualiza uma música existente, validando se o autor ou admin realiza a ação.
   * Cria automaticamente um snapshot de versão em 'songVersions' para versionamento auditável.
   */
  async updateSong(songId, songData, userUid, isAdmin = false) {
    const currentUid = userUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!currentUid) {
      throw new Error("Usuário não autenticado.");
    }

    if (songId.startsWith("demo-")) {
      throw new Error("Músicas canônicas de demonstração são protegidas contra alteração direta.");
    }

    const songRef = doc(db, "songs", songId);
    const existingSnap = await getDoc(songRef);
    if (!existingSnap.exists()) {
      throw new Error("Música não encontrada no Firestore.");
    }

    const existingData = existingSnap.data();
    if (existingData.createdBy !== currentUid && !isAdmin) {
      throw new Error("Permissão negada: você só pode editar músicas criadas por você ou como administrador.");
    }

    // Grava versão anterior na coleção songVersions
    try {
      await this.createSongVersion(songId, existingData, currentUid, "Atualização de cifra/dados");
    } catch (verErr) {
      console.warn("Aviso ao salvar histórico de versão:", verErr.message);
    }

    const normalized = SongNormalizer.normalizeSong({
      ...existingData,
      ...songData,
      id: songId
    });

    // Se o usuário comum tentar forjar campos protegidos
    if (!isAdmin) {
      normalized.verified = existingData.verified || false;
      normalized.verifiedBy = existingData.verifiedBy || null;
      normalized.verificationStatus = existingData.verificationStatus || "unverified";
      normalized.sourceType = existingData.sourceType || SOURCE_TYPES.USER;
      normalized.createdBy = existingData.createdBy;
    }

    const validation = SongValidator.validateSong(normalized, { isCreation: false, isAdmin });
    if (!validation.valid) {
      throw new Error(`Validação falhou: ${validation.errors.join("; ")}`);
    }

    const payload = {
      ...normalized,
      version: (Number(existingData.version) || 1) + 1,
      updatedAt: serverTimestamp()
    };
    delete payload.id;
    delete payload.createdAt;
    delete payload.createdBy;

    await updateDoc(songRef, payload);
    const updated = { id: songId, ...existingData, ...payload };
    this.cacheSongOffline(updated);
    return true;
  },

  /**
   * Exclui uma música existente com checagem de autorização.
   */
  async deleteSong(songId, userUid, isAdmin = false) {
    const currentUid = userUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!currentUid) {
      throw new Error("Usuário não autenticado.");
    }

    if (songId.startsWith("demo-")) {
      throw new Error("Músicas canônicas não podem ser excluídas.");
    }

    const songRef = doc(db, "songs", songId);
    const existingSnap = await getDoc(songRef);
    if (!existingSnap.exists()) {
      throw new Error("Música não encontrada no Firestore.");
    }

    const existingData = existingSnap.data();
    if (existingData.createdBy !== currentUid && !isAdmin) {
      throw new Error("Permissão negada: você só pode excluir músicas criadas por você ou como administrador.");
    }

    await deleteDoc(songRef);
    try {
      let recent = this.getOfflineRecentSongs();
      recent = recent.filter(s => s.id !== songId);
      localStorage.setItem(this.OFFLINE_CACHE_KEY, JSON.stringify(recent));
    } catch {}
    return true;
  },

  /**
   * Publica uma música (muda status para 'published').
   */
  async publishSong(songId, userUid, isAdmin = false) {
    return this.updateSong(songId, { 
      status: SONG_STATUS.PUBLISHED,
      visibility: SONG_VISIBILITY.PUBLIC 
    }, userUid, isAdmin);
  },

  /**
   * Arquiva uma música (muda status para 'archived').
   */
  async archiveSong(songId, userUid, isAdmin = false) {
    return this.updateSong(songId, { 
      status: SONG_STATUS.ARCHIVED 
    }, userUid, isAdmin);
  },

  /**
   * Verifica oficialmente uma música (função exclusiva de administrador).
   */
  async verifySong(songId, adminUid) {
    if (!adminUid) throw new Error("Ação exclusiva para administradores.");
    const songRef = doc(db, "songs", songId);
    await updateDoc(songRef, {
      verified: true,
      verifiedBy: adminUid,
      verificationStatus: "verified",
      sourceType: SOURCE_TYPES.OFFICIAL,
      updatedAt: serverTimestamp()
    });
    return true;
  },

  // -----------------------------------------------------------
  // VERSIONAMENTO (songVersions)
  // -----------------------------------------------------------
  async createSongVersion(songId, versionData, userUid, changeSummary = "") {
    if (!songId) return null;
    const versionsCol = collection(db, "songVersions");
    const payload = {
      songId,
      version: Number(versionData.version) || 1,
      title: versionData.title || "",
      originalKey: versionData.originalKey || "G",
      chords: versionData.chords || "",
      easyChords: versionData.easyChords || "",
      structure: versionData.structure || "",
      changeSummary,
      createdBy: userUid || "anonymous",
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(versionsCol, payload);
    return ref.id;
  },

  async getSongVersions(songId) {
    try {
      const versionsCol = collection(db, "songVersions");
      const q = query(versionsCol, where("songId", "==", songId), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  // -----------------------------------------------------------
  // FAVORITOS DO USUÁRIO (userFavorites)
  // -----------------------------------------------------------
  async toggleFavorite(songId, userUid) {
    if (!userUid || !songId) throw new Error("Usuário autenticado necessário.");
    const favCol = collection(db, "userFavorites");
    const q = query(favCol, where("userId", "==", userUid), where("songId", "==", songId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Já é favorito -> remove
      const favId = snap.docs[0].id;
      await deleteDoc(doc(db, "userFavorites", favId));
      return false; // Não é mais favorito
    } else {
      // Adiciona aos favoritos
      await addDoc(favCol, {
        userId: userUid,
        songId,
        createdAt: serverTimestamp()
      });
      return true; // É favorito
    }
  },

  async getUserFavorites(userUid) {
    if (!userUid) return [];
    try {
      const favCol = collection(db, "userFavorites");
      const q = query(favCol, where("userId", "==", userUid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  // -----------------------------------------------------------
  // HISTÓRICO DE MÚSICAS TOCADAS (userSongHistory)
  // -----------------------------------------------------------
  async recordSongHistory(songId, userUid) {
    if (!userUid || !songId) return;
    try {
      const historyCol = collection(db, "userSongHistory");
      await addDoc(historyCol, {
        userId: userUid,
        songId,
        playedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Aviso ao registrar histórico:", err.message);
    }
  },

  async getUserSongHistory(userUid, limitCount = 20) {
    if (!userUid) return [];
    try {
      const historyCol = collection(db, "userSongHistory");
      const q = query(historyCol, where("userId", "==", userUid), orderBy("playedAt", "desc"), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  // -----------------------------------------------------------
  // AVALIAÇÕES DE MÚSICAS (songRatings)
  // -----------------------------------------------------------
  async rateSong(songId, userUid, rating, review = "") {
    if (!userUid || !songId) throw new Error("Usuário autenticado necessário.");
    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const ratingsCol = collection(db, "songRatings");
    const q = query(ratingsCol, where("userId", "==", userUid), where("songId", "==", songId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const ratingId = snap.docs[0].id;
      await updateDoc(doc(db, "songRatings", ratingId), {
        rating: numRating,
        review,
        updatedAt: serverTimestamp()
      });
      return ratingId;
    } else {
      const docRef = await addDoc(ratingsCol, {
        userId: userUid,
        songId,
        rating: numRating,
        review,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  },

  async getSongRatings(songId) {
    if (!songId) return [];
    try {
      const ratingsCol = collection(db, "songRatings");
      const q = query(ratingsCol, where("songId", "==", songId), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  // -----------------------------------------------------------
  // ARTISTAS & ÁLBUNS
  // -----------------------------------------------------------
  async getArtists() {
    try {
      const snap = await getDocs(collection(db, "artists"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  async getArtistById(artistId) {
    if (!artistId) return null;
    try {
      const snap = await getDoc(doc(db, "artists", artistId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  },

  async createArtist(artistData, adminUid) {
    if (!adminUid) throw new Error("Permissão negada.");
    const artistsCol = collection(db, "artists");
    const docRef = await addDoc(artistsCol, {
      name: artistData.name.trim(),
      normalizedName: normalizeSearchText(artistData.name),
      photoUrl: artistData.photoUrl || "",
      bio: artistData.bio || "",
      genres: Array.isArray(artistData.genres) ? artistData.genres : ["Gospel"],
      verified: true,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getAlbums() {
    try {
      const snap = await getDocs(collection(db, "albums"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  async getAlbumById(albumId) {
    if (!albumId) return null;
    try {
      const snap = await getDoc(doc(db, "albums", albumId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  },

  async createAlbum(albumData, adminUid) {
    if (!adminUid) throw new Error("Permissão negada.");
    const albumsCol = collection(db, "albums");
    const docRef = await addDoc(albumsCol, {
      title: albumData.title.trim(),
      normalizedTitle: normalizeSearchText(albumData.title),
      artistId: albumData.artistId || null,
      artistName: albumData.artistName || "",
      releaseYear: Number(albumData.releaseYear) || new Date().getFullYear(),
      coverUrl: albumData.coverUrl || "",
      tracks: Array.isArray(albumData.tracks) ? albumData.tracks : [],
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  /**
   * Semeia repertório oficial autorizado no Firestore quando configurado.
   */
  async seedDefaultSongs(currentUserId) {
    try {
      if (!DEMO_SONGS || DEMO_SONGS.length === 0) {
        return false;
      }
      const songsCol = collection(db, "songs");
      for (const song of DEMO_SONGS) {
        const payload = { ...song };
        delete payload.id;
        await addDoc(songsCol, {
          ...payload,
          createdBy: currentUserId || "virtuo-master",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (err) {
      console.warn("[SongsRepository.seedDefaultSongs] Erro ao semear:", err.message);
      return false;
    }
  },

  /**
   * Remove com segurança registros de louvores antigos ou de teste do Firestore,
   * preservando estritamente: usuários, autenticação, perfis, bandas, playlists,
   * posts, lives, grooves, bass_lines, configurações e segurança.
   */
  async purgeLegacySongsFromFirestore(adminUid) {
    try {
      const songsCol = collection(db, "songs");
      const snap = await getDocs(songsCol);
      if (snap.empty) return { deletedCount: 0 };

      const legacyTitles = ["Mistério na Olaria", "O Escudo", "Deus do Impossível", "Fogo Santo", "Fidelidade"];
      let deletedCount = 0;

      for (const d of snap.docs) {
        const data = d.data();
        const docId = d.id;
        const isLegacyOrTest = docId.startsWith("demo-") || 
                             docId.startsWith("test-cc0-") ||
                             docId === "test-fidelidade-danielle-cristina" ||
                             data.isTestData === true ||
                             data.temporary === true ||
                             data.license === "CC0-1.0" ||
                             legacyTitles.some(t => (data.title || "").toLowerCase() === t.toLowerCase()) ||
                             data.createdBy === "virtuo-master" ||
                             data.createdBy === "virtuo-cc0-seed";
        if (isLegacyOrTest) {
          await deleteDoc(doc(db, "songs", docId));
          deletedCount++;
        }
      }

      this.clearOfflineCache();
      return { deletedCount };
    } catch (err) {
      console.warn("[SongsRepository.purgeLegacySongsFromFirestore] Erro na limpeza:", err.message);
      return { deletedCount: 0, error: err.message };
    }
  }
};
