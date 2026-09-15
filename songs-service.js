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

// Músicas de demonstração originais com acordes ricos, Easy Play e tom canônico Cm para Mistério na Olaria
export const DEMO_SONGS = [
  {
    id: "demo-misterio-olaria",
    title: "Mistério na Olaria",
    artist: "Raquel Pereira",
    artistName: "Raquel Pereira",
    originalKey: "Cm",
    bpm: 74,
    timeSignature: "4/4",
    difficulty: "Fácil",
    capo: 0,
    genres: ["Pentecostal", "Gospel"],
    tags: ["louvor", "avivamento", "olaria"],
    instruments: ["Violão", "Guitarra", "Teclado", "Baixo", "Bateria", "Vocal"],
    structure: "Intro • Verso 1 • Refrão • Verso 2 • Refrão • Final",
    youtubeUrl: "https://www.youtube.com/results?search_query=Mistério+na+Olaria+Raquel+Pereira",
    spotifyUrl: "https://open.spotify.com/search/Mistério%20na%20Olaria%20Raquel%20Pereira",
    chords: `[Intro] G  C9  Em7  D

[Verso 1]
G               C9
Eu fui na olaria ver o vaso se formar
Em7               D
O oleiro trabalhava sem cessar
G               C9
Se o vaso quebrava, tornava a refazer
Em7               D
Com paciência e poder

[Refrão]
G               D/F#
É mistério na olaria de Jeová
Em7               C9
Ele quebra, ele molda no lugar
G               D/F#
Se você se humilhar nas mãos do Criador
Em7               C9
Ele faz vaso novo com amor

[Verso 2]
G               C9
Desce como barro no chão do oleiro
Em7               D
Deixa ele tirar o que não presta por inteiro
G               C9
Sai de lá brilhando cheio da unção
Em7               D
Um vaso de honra nesta geração

[Refrão]
G               D/F#
É mistério na olaria de Jeová
Em7               C9
Ele quebra, ele molda no lugar
G               D/F#
Se você se humilhar nas mãos do Criador
Em7               C9
Ele faz vaso novo com amor`,
    easyChords: `[Intro] G  C  Em  D

[Verso]
G           C
Eu fui na olaria ver o vaso se formar
Em          D
O oleiro trabalhava sem cessar

[Refrão]
G           D
É mistério na olaria de Jeová
Em          C
Ele quebra, ele molda no lugar`,
    lyrics: null,
    lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
    status: SONG_STATUS.PUBLISHED,
    visibility: SONG_VISIBILITY.PUBLIC,
    verified: true,
    verifiedBy: "virtuo-master",
    verificationStatus: "verified",
    sourceType: SOURCE_TYPES.OFFICIAL,
    sourceName: "VIRTUO Oficial",
    createdBy: "virtuo-master"
  },
  {
    id: "demo-o-escudo",
    title: "O Escudo",
    artist: "Aline Barros / Voz da Verdade",
    artistName: "Aline Barros / Voz da Verdade",
    originalKey: "Em",
    bpm: 68,
    timeSignature: "4/4",
    difficulty: "Médio",
    capo: 0,
    genres: ["Worship", "Gospel"],
    tags: ["adom", "protecao", "escudo"],
    instruments: ["Violão", "Guitarra", "Teclado", "Baixo", "Bateria", "Vocal"],
    structure: "Intro • Verso • Refrão • Ponte • Final",
    youtubeUrl: "https://www.youtube.com/results?search_query=O+Escudo+Voz+da+Verdade",
    spotifyUrl: "https://open.spotify.com/search/O%20Escudo",
    chords: `[Intro] Em  C  G  D

[Verso 1]
Em                   C
Por toda a minha vida, ó Senhor, te louvarei
G                    D
Pois meu fôlego é a tua vida, e nunca me cansarei
Em                   C
Posso ouvir a tua voz, é mais doce que o mel
G                    D
Que me tira desta cova e me leva até o céu

[Refrão]
Em                   C
Já cheguei até aqui e eu não posso desistir
G                    D
Pois a pedra preciosa eu já encontrei
Em                   C
Existe um Deus no céu que cuida de você
G                    D
Ele é o teu escudo, nada vai temer`,
    easyChords: `[Intro] Em  C  G  D

[Verso]
Em        C
Por toda a minha vida te louvarei
G         D
Pois meu fôlego é tua vida

[Refrão]
Em        C
Existe um Deus no céu que cuida de você
G         D
Ele é o teu escudo, nada vai temer`,
    lyrics: null,
    lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
    status: SONG_STATUS.PUBLISHED,
    visibility: SONG_VISIBILITY.PUBLIC,
    verified: true,
    verifiedBy: "virtuo-master",
    verificationStatus: "verified",
    sourceType: SOURCE_TYPES.OFFICIAL,
    sourceName: "VIRTUO Oficial",
    createdBy: "virtuo-master"
  },
  {
    id: "demo-deus-impossivel",
    title: "Deus do Impossível",
    artist: "Toque no Altar",
    artistName: "Toque no Altar",
    originalKey: "D",
    bpm: 72,
    timeSignature: "4/4",
    difficulty: "Médio",
    capo: 0,
    genres: ["Worship", "Gospel"],
    tags: ["fe", "milagre", "clamor"],
    instruments: ["Violão", "Guitarra", "Teclado", "Baixo", "Bateria", "Vocal"],
    structure: "Intro • Verso • Refrão • Solo • Refrão",
    youtubeUrl: "https://www.youtube.com/results?search_query=Deus+do+Impossivel+Toque+no+Altar",
    spotifyUrl: "https://open.spotify.com/search/Deus%20do%20Impossivel",
    chords: `[Intro] D  A/C#  Bm7  G

[Verso 1]
D                 A/C#
Quando tudo diz que não
Bm7               G
A tua voz me encoraja a prosseguir
D                 A/C#
Quando as forças se acabam
Bm7               G
O teu poder se aperfeiçoa em mim

[Refrão]
D                 A
O Deus do impossível não desiste de você
Bm7               G
Ele faz o milagre acontecer
D                 A
Abre porta no deserto, faz a fonte brotar
Bm7               G
Com sua destra fiel vai te sustentar`,
    easyChords: `[Intro] D  A  Bm  G

[Verso]
D          A
Quando tudo diz que não
Bm         G
A tua voz me encoraja a prosseguir

[Refrão]
D          A
O Deus do impossível não desiste de você
Bm         G
Ele faz o milagre acontecer`,
    lyrics: null,
    lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
    status: SONG_STATUS.PUBLISHED,
    visibility: SONG_VISIBILITY.PUBLIC,
    verified: true,
    verifiedBy: "virtuo-master",
    verificationStatus: "verified",
    sourceType: SOURCE_TYPES.OFFICIAL,
    sourceName: "VIRTUO Oficial",
    createdBy: "virtuo-master"
  },
  {
    id: "demo-fogo-santo",
    title: "Fogo Santo",
    artist: "Virtuo Worship",
    artistName: "Virtuo Worship",
    originalKey: "C",
    bpm: 76,
    timeSignature: "4/4",
    difficulty: "Fácil",
    capo: 0,
    genres: ["Worship", "Gospel"],
    tags: ["avivamento", "espirito santo", "adoracao"],
    instruments: ["Violão", "Guitarra", "Teclado", "Baixo", "Bateria", "Vocal"],
    structure: "Intro • Verso • Refrão • Espontâneo",
    youtubeUrl: "https://www.youtube.com/results?search_query=Fogo+Santo+Worship",
    spotifyUrl: "https://open.spotify.com/search/Fogo%20Santo",
    chords: `[Intro] C  G  Am  F

[Verso 1]
C                 G
Enche este lugar com tua glória
Am                F
Vem queimar em nossos corações
C                 G
Somos tua igreja reunida
Am                F
Esperando o teu mover chegar

[Refrão]
C                 G
Fogo santo, queima aqui
Am                F
Tua presença é o nosso anseio
C                 G
Purifica, faz fluir
Am                F
Um avivamento verdadeiro`,
    easyChords: `[Intro] C  G  Am  F

[Verso]
C          G
Enche este lugar com tua glória
Am         F
Vem queimar em nossos corações

[Refrão]
C          G
Fogo santo, queima aqui
Am         F
Tua presença é o nosso anseio`,
    lyrics: null,
    lyricsStatus: LYRICS_STATUS.UNAVAILABLE,
    status: SONG_STATUS.PUBLISHED,
    visibility: SONG_VISIBILITY.PUBLIC,
    verified: true,
    verifiedBy: "virtuo-master",
    verificationStatus: "verified",
    sourceType: SOURCE_TYPES.OFFICIAL,
    sourceName: "VIRTUO Oficial",
    createdBy: "virtuo-master"
  }
];

// Instâncias migradas em memória para acesso imediato e garantido
export const CANONICAL_MIGRATED_DEMO_SONGS = SongMigration.migrateAll(DEMO_SONGS);

export const SongsRepository = {
  // Chave de cache local para as últimas 10 músicas consultadas (Modo Offline)
  OFFLINE_CACHE_KEY: "virtuo_recent_songs_offline_v2",

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
        return CANONICAL_MIGRATED_DEMO_SONGS;
      }
      return snap.docs.map(docSnap => {
        const raw = { id: docSnap.id, ...docSnap.data() };
        return SongMigration.migrateLegacySong(raw);
      });
    } catch (err) {
      console.warn("[SongsRepository.getAllSongs] Aviso Firestore, fallback para canônicas:", err.message);
      return CANONICAL_MIGRATED_DEMO_SONGS;
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
        ? CANONICAL_MIGRATED_DEMO_SONGS 
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
      let list = [...CANONICAL_MIGRATED_DEMO_SONGS];
      if (filters.genre) {
        const gNorm = normalizeSearchText(filters.genre);
        list = list.filter(s => Array.isArray(s.genres) && s.genres.some(g => normalizeSearchText(g) === gNorm));
      }
      if (filters.key) list = list.filter(s => s.originalKey === filters.key);
      if (filters.difficulty) list = list.filter(s => s.difficulty === filters.difficulty);
      return list;
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
      return raw ? JSON.parse(raw) : CANONICAL_MIGRATED_DEMO_SONGS.slice(0, 4);
    } catch {
      return CANONICAL_MIGRATED_DEMO_SONGS.slice(0, 4);
    }
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
   * Obtém uma música por ID no Firestore com fallback offline e demo.
   */
  async getSongById(songId) {
    if (!songId) return null;
    const offlineSongs = this.getOfflineRecentSongs();
    const offlineFound = offlineSongs.find(s => s.id === songId);
    const demoFound = CANONICAL_MIGRATED_DEMO_SONGS.find(s => s.id === songId);

    try {
      const songRef = doc(db, "songs", songId);
      const snap = await getDoc(songRef);
      if (snap.exists()) {
        const fullSong = SongMigration.migrateLegacySong({ id: snap.id, ...snap.data() });
        this.cacheSongOffline(fullSong);
        return fullSong;
      }
    } catch (err) {
      console.warn("[SongsRepository.getSongById] Fallback para cache offline/demo:", err.message);
    }

    if (offlineFound) return SongMigration.migrateLegacySong(offlineFound);
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
          const songs = snapshot.docs.map(d => SongMigration.migrateLegacySong({ id: d.id, ...d.data() }));
          onUpdate(songs);
        } else {
          const offline = this.getOfflineRecentSongs();
          onUpdate(offline.length > 0 ? offline : CANONICAL_MIGRATED_DEMO_SONGS);
        }
      }, (err) => {
        console.warn("[SongsRepository.subscribeToSongs] Aviso stream Firestore:", err.message);
        const offline = this.getOfflineRecentSongs();
        const fallback = offline.length > 0 ? offline : CANONICAL_MIGRATED_DEMO_SONGS;
        if (onError) onError(err);
        else onUpdate(fallback);
      });
    } catch (err) {
      console.warn("[SongsRepository.subscribeToSongs] Exceção:", err.message);
      const offline = this.getOfflineRecentSongs();
      onUpdate(offline.length > 0 ? offline : CANONICAL_MIGRATED_DEMO_SONGS);
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
   * Semeia as músicas padrão para o Firestore caso a coleção esteja vazia.
   * Utiliza a versão migrada canônica (garantindo Mistério Na Olaria em Cm).
   */
  async seedDefaultSongs(currentUserId) {
    const songsCol = collection(db, "songs");
    const snap = await getDocs(songsCol);
    if (snap.empty) {
      for (const song of CANONICAL_MIGRATED_DEMO_SONGS) {
        const { id, ...data } = song;
        await addDoc(songsCol, {
          ...data,
          createdBy: currentUserId || "virtuo-master",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      return true;
    }
    return false;
  }
};
