// =============================================================
// VIRTUO PROFESSIONAL MUSIC DATABASE: SCHEMAS & CONSTANTS
// src/database/schema.js
// =============================================================

export const SONG_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  PENDING_REVIEW: "pendingReview",
  REJECTED: "rejected",
  ARCHIVED: "archived"
};

export const SONG_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  UNLISTED: "unlisted"
};

export const LYRICS_STATUS = {
  UNAVAILABLE: "unavailable",
  AUTHORIZED: "authorized",
  LICENSED: "licensed",
  USER_PROVIDED: "userProvided",
  PENDING_REVIEW: "pendingReview"
};

export const SOURCE_TYPES = {
  OFFICIAL: "official",
  LICENSED: "licensed",
  USER: "user",
  MANUAL: "manual",
  IMPORTED: "imported"
};

export const EASY_PLAY_LEVELS = {
  EASY: "easy",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced"
};

export const CANONICAL_GENRES = [
  "Gospel",
  "Pentecostal",
  "Worship",
  "Pop",
  "Rock",
  "Sertanejo",
  "MPB",
  "Blues",
  "Jazz",
  "Soul",
  "R&B",
  "Country",
  "Reggae",
  "Folk",
  "Clássico",
  "Instrumental"
];

export const CANONICAL_DIFFICULTIES = [
  "Fácil",
  "Médio",
  "Difícil",
  "Avançado"
];

/**
 * Cria a estrutura base de uma entidade Song compatível com o novo schema profissional.
 */
export function createEmptySong(overrides = {}) {
  return {
    id: overrides.id || null,
    title: overrides.title !== undefined ? overrides.title : "",
    normalizedTitle: overrides.normalizedTitle !== undefined ? overrides.normalizedTitle : "",
    artistId: overrides.artistId || null,
    artist: overrides.artist !== undefined ? overrides.artist : (overrides.artistName !== undefined ? overrides.artistName : "Virtuo Worship"),
    artistName: overrides.artistName !== undefined ? overrides.artistName : (overrides.artist !== undefined ? overrides.artist : "Virtuo Worship"),
    composer: overrides.composer || null,
    performer: overrides.performer || overrides.artist || overrides.artistName || null,
    albumId: overrides.albumId || null,
    album: overrides.album || overrides.albumName || null,
    albumName: overrides.albumName || overrides.album || null,

    key: overrides.key || overrides.originalKey || "G",
    originalKey: overrides.originalKey !== undefined ? overrides.originalKey : (overrides.key || "G"),
    bpm: typeof overrides.bpm === "number" ? overrides.bpm : 74,
    timeSignature: overrides.timeSignature || "4/4",

    capo: typeof overrides.capo === "number" ? overrides.capo : 0,
    shapeKey: overrides.shapeKey || overrides.shape || null,
    testOnly: Boolean(overrides.testOnly),
    category: overrides.category || "worship",
    difficulty: overrides.difficulty || "Fácil",
    tuning: overrides.tuning || "E A D G B E (Padrão)",

    genres: Array.isArray(overrides.genres) ? overrides.genres : ["Gospel"],
    tags: Array.isArray(overrides.tags) ? overrides.tags : [],
    instruments: Array.isArray(overrides.instruments) ? overrides.instruments : ["Violão", "Guitarra", "Teclado", "Vocal"],

    chords: overrides.chords || [],
    easyChords: overrides.easyChords || [],
    chordSheet: overrides.chordSheet || "",
    easyChordSheet: overrides.easyChordSheet || "",
    notes: overrides.notes || overrides.musicalNotes || null,
    musicalNotes: overrides.musicalNotes || overrides.notes || null,
    easyPlay: overrides.easyPlay || (overrides.easyChordSheet ? true : false),

    structure: Array.isArray(overrides.structure) ? overrides.structure : [],

    lyrics: overrides.lyrics || null,
    lyricsStatus: overrides.lyricsStatus || LYRICS_STATUS.UNAVAILABLE,
    lyricsSource: overrides.lyricsSource || null,
    lyricsLicense: overrides.lyricsLicense || overrides.license || null,
    license: overrides.license || overrides.lyricsLicense || "Domínio Público / Uso Autorizado",
    authorship: overrides.authorship || (overrides.composer ? `Compositor: ${overrides.composer}` : null),
    lyricsUpdatedAt: overrides.lyricsUpdatedAt || null,

    links: overrides.links || {
      youtubeUrl: overrides.youtubeUrl || "",
      spotifyUrl: overrides.spotifyUrl || "",
      audioUrl: overrides.audioUrl || ""
    },
    youtubeUrl: overrides.youtubeUrl || "",
    spotifyUrl: overrides.spotifyUrl || "",
    coverUrl: overrides.coverUrl || "",
    audioUrl: overrides.audioUrl || "",

    sourceType: overrides.sourceType || SOURCE_TYPES.USER,
    sourceName: overrides.sourceName || "Virtuo User",
    sourceUrl: overrides.sourceUrl || "",
    source: overrides.source || {
      type: overrides.sourceType || SOURCE_TYPES.USER,
      name: overrides.sourceName || "Virtuo User",
      url: overrides.sourceUrl || "",
      importedAt: null,
      verifiedAt: null,
      verifiedBy: null
    },

    createdBy: overrides.createdBy || null,
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null,

    status: overrides.status || SONG_STATUS.DRAFT,
    visibility: overrides.visibility || SONG_VISIBILITY.PRIVATE,

    version: typeof overrides.version === "number" ? overrides.version : 1,

    verified: !!overrides.verified,
    verifiedBy: overrides.verifiedBy || null,
    verificationStatus: overrides.verificationStatus || (overrides.verified ? "verified" : "unverified"),

    searchKeywords: Array.isArray(overrides.searchKeywords) ? overrides.searchKeywords : []
  };
}

/**
 * Cria a estrutura base de uma entidade Artist.
 */
export function createEmptyArtist(overrides = {}) {
  return {
    id: overrides.id || null,
    name: overrides.name || "",
    normalizedName: overrides.normalizedName || "",
    photoUrl: overrides.photoUrl || "",
    bio: overrides.bio || "",
    genres: Array.isArray(overrides.genres) ? overrides.genres : ["Gospel"],
    verified: !!overrides.verified,
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

/**
 * Cria a estrutura base de uma entidade Album.
 */
export function createEmptyAlbum(overrides = {}) {
  return {
    id: overrides.id || null,
    title: overrides.title || "",
    normalizedTitle: overrides.normalizedTitle || "",
    artistId: overrides.artistId || null,
    artistName: overrides.artistName || "",
    releaseYear: overrides.releaseYear || new Date().getFullYear(),
    coverUrl: overrides.coverUrl || "",
    tracks: Array.isArray(overrides.tracks) ? overrides.tracks : [],
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

// =============================================================
// VIRTUO ACADEMY: SCHEMAS, CONSTANTS & FACTORY FUNCTIONS
// =============================================================

export const ACADEMY_LEVELS = {
  LEVEL_0: {
    level: 0,
    slug: "zero",
    title: "Nível 0: Primeiros Passos & Postura",
    shortTitle: "Nível Zero",
    description: "Conhecimento anatômico do instrumento, afinação cromática, postura sem lesões e primeiros exercícios de coordenação.",
    badge: "🌱",
    color: "#38bdf8"
  },
  LEVEL_1: {
    level: 1,
    slug: "iniciante",
    title: "Nível 1: Fundamentos & Primeiros Acordes",
    shortTitle: "Iniciante",
    description: "Digitação correta, primeiros acordes fundamentais abertos, leitura de tablaturas/diagramas e sincronia motora.",
    badge: "🎵",
    color: "#34d399"
  },
  LEVEL_2: {
    level: 2,
    slug: "intermediario-basico",
    title: "Nível 2: Levadas Rítmicas & Mudança Fluida",
    shortTitle: "Ritmo & Fluência",
    description: "Domínio do metrônomo, padrões rítmicos congregacionais, transição limpa de acordes sem quebrar o compasso e cifras básicas.",
    badge: "🎸",
    color: "#fbbf24"
  },
  LEVEL_3: {
    level: 3,
    slug: "intermediario",
    title: "Nível 3: Harmonia Intermediária & Pestanas",
    shortTitle: "Intermediário",
    description: "Técnica biomecânica de pestanas sem dor, dedilhados e arpejos estruturados, dinâmicas de apoio e introdução às escalas.",
    badge: "🎼",
    color: "#f97316"
  },
  LEVEL_4: {
    level: 4,
    slug: "avancado",
    title: "Nível 4: Campo Harmônico, Acordes com Sétima & Arranjos",
    shortTitle: "Avançado",
    description: "Formação de tríades e tétrades, funções harmônicas tonais, condução de vozes (voice leading) e acompanhamento em banda.",
    badge: "⚡",
    color: "#a855f7"
  },
  LEVEL_5: {
    level: 5,
    slug: "profissional",
    title: "Nível 5: Profissional, Re-harmonização & Domínio Musical",
    shortTitle: "Profissional / Mestre",
    description: "Re-harmonização sofisticada, substituições tritonais, modos gregos, improvisação expressiva, afinação fina por harmônicos e direção de naipe.",
    badge: "👑",
    color: "#7EE7FF"
  }
};

export const ACADEMY_INSTRUMENTS = {
  VIOLAO: {
    id: "violao",
    name: "Violão",
    family: "cordas",
    priority: 1,
    icon: "🎸",
    description: "Violão de aço e náilon: postura, digitação, batidas e dedilhados congregacionais."
  },
  GUITARRA: {
    id: "guitarra",
    name: "Guitarra",
    family: "cordas",
    priority: 2,
    icon: "⚡",
    description: "Guitarra moderna: palhetada alternada, tríades, voicings de louvor, ambiência e solos com expressividade."
  },
  BAIXO: {
    id: "baixo",
    name: "Contrabaixo",
    family: "cordas",
    priority: 3,
    icon: "🎻",
    description: "Contrabaixo de 4 e 5 cordas: fundamental, quinta, oitavas, sincronia com o bumbo e condução sólida da banda."
  },
  CORDAS_ORQUESTRAIS: {
    id: "cordas_orquestrais",
    name: "Violino / Viola / Cello",
    family: "cordas",
    priority: 4,
    icon: "🎻",
    description: "Cordas de orquestra: postura clássica, condução do arco, afinação precisa e execução em naipes harmônicos."
  },
  TEORIA_MUSICAL: {
    id: "teoria_musical",
    name: "Teoria & Percepção Harmônica",
    family: "teoria",
    priority: 5,
    icon: "📖",
    description: "Fundamentos teóricos: leitura de claves, intervalos, formação de acordes, armaduras de clave e percepção auditiva."
  }
};

/**
 * Cria a estrutura base de um Curso da Virtuo Academy.
 */
export function createEmptyAcademyCourse(overrides = {}) {
  return {
    id: overrides.id || null,
    title: overrides.title || "",
    slug: overrides.slug || "",
    instrumentId: overrides.instrumentId || "violao",
    instrumentName: overrides.instrumentName || "Violão",
    family: overrides.family || "cordas",
    description: overrides.description || "",
    levelMin: typeof overrides.levelMin === "number" ? overrides.levelMin : 0,
    levelMax: typeof overrides.levelMax === "number" ? overrides.levelMax : 5,
    totalModules: typeof overrides.totalModules === "number" ? overrides.totalModules : 0,
    totalLessons: typeof overrides.totalLessons === "number" ? overrides.totalLessons : 0,
    estimatedHours: typeof overrides.estimatedHours === "number" ? overrides.estimatedHours : 20,
    badge: overrides.badge || "🎸",
    isPublished: overrides.isPublished !== undefined ? overrides.isPublished : true,
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

/**
 * Cria a estrutura base de um Módulo da Virtuo Academy.
 */
export function createEmptyAcademyModule(overrides = {}) {
  return {
    id: overrides.id || null,
    courseId: overrides.courseId || "",
    level: typeof overrides.level === "number" ? overrides.level : 0,
    order: typeof overrides.order === "number" ? overrides.order : 1,
    title: overrides.title || "",
    description: overrides.description || "",
    icon: overrides.icon || "📚",
    lessonsCount: typeof overrides.lessonsCount === "number" ? overrides.lessonsCount : 0,
    prerequisites: Array.isArray(overrides.prerequisites) ? overrides.prerequisites : [],
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

/**
 * Cria a estrutura base de uma Aula da Virtuo Academy.
 */
export function createEmptyAcademyLesson(overrides = {}) {
  return {
    id: overrides.id || null,
    courseId: overrides.courseId || "",
    moduleId: overrides.moduleId || "",
    level: typeof overrides.level === "number" ? overrides.level : 0,
    order: typeof overrides.order === "number" ? overrides.order : 1,
    title: overrides.title || "",
    description: overrides.description || "",
    objective: overrides.objective || "",
    theoryText: overrides.theoryText || "",
    diagrams: Array.isArray(overrides.diagrams) ? overrides.diagrams : [],
    targetBpm: typeof overrides.targetBpm === "number" ? overrides.targetBpm : 60,
    timeSignature: overrides.timeSignature || "4/4",
    exercise: overrides.exercise || {
      title: "Exercício Prático",
      instructions: "Pratique o exercício lentamente com metrônomo.",
      targetReps: 5,
      minimumDurationSeconds: 120
    },
    audioReferenceUrl: overrides.audioReferenceUrl || null,
    videoReferenceUrl: overrides.videoReferenceUrl || null,
    checkpoints: Array.isArray(overrides.checkpoints) ? overrides.checkpoints : [],
    createdAt: overrides.createdAt || null,
    updatedAt: overrides.updatedAt || null
  };
}

/**
 * Cria a estrutura base do Progresso de um Usuário na Virtuo Academy.
 */
export function createEmptyUserAcademyProgress(overrides = {}) {
  return {
    userId: overrides.userId || "",
    currentInstrument: overrides.currentInstrument || "violao",
    currentLevel: typeof overrides.currentLevel === "number" ? overrides.currentLevel : 0,
    completedLessons: Array.isArray(overrides.completedLessons) ? overrides.completedLessons : [],
    lessonScores: overrides.lessonScores || {},
    practiceTimeMinutes: typeof overrides.practiceTimeMinutes === "number" ? overrides.practiceTimeMinutes : 0,
    streakDays: typeof overrides.streakDays === "number" ? overrides.streakDays : 0,
    lastPracticedAt: overrides.lastPracticedAt || null,
    updatedAt: overrides.updatedAt || null
  };
}
