// =============================================================
// VIRTUO PROFILE SERVICE 2.0 (ETAPA 4/5)
// src/community/profile-service.js
// Perfil Musical 2.0, Identidade Musical, Reputação e Estatísticas
// =============================================================

import { MUSICAL_INSTRUMENTS, EXPERIENCE_LEVELS, MUSICAL_STYLES } from "./community-constants.js";

const LOCAL_PROFILES_KEY = "virtuo_profiles_cache_v2";

let firestoreCtx = null;

async function getFirestoreCtx() {
  if (firestoreCtx) return firestoreCtx;
  if (typeof window !== "undefined" && typeof window.document !== "undefined" && window.location && typeof window.location.href === "string") {
    try {
      const fbConfig = await import("../../firebase-config.js");
      const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      firestoreCtx = {
        db: fbConfig.db,
        auth: fbConfig.auth,
        collection: firestoreMod.collection,
        doc: firestoreMod.doc,
        getDoc: firestoreMod.getDoc,
        setDoc: firestoreMod.setDoc,
        updateDoc: firestoreMod.updateDoc,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[ProfileService] Firestore import:", err.message);
    }
  }
  return null;
}

export const ProfileService = {
  // Gera um perfil padrão inicial
  getDefaultProfile(uid = "guest", displayName = "Músico Virtuoso") {
    return {
      uid,
      displayName: displayName || "Músico Virtuoso",
      artisticName: displayName || "Músico Virtuoso",
      photoURL: "",
      bio: "Músico dedicado à excelência musical e ao louvor.",
      instruments: ["violao", "vocal"],
      level: "intermediario",
      styles: ["worship", "gospel"],
      location: "Brasil",
      currentBand: "Ministério Local",
      externalLinks: {
        instagram: "",
        youtube: "",
        spotify: ""
      },
      stats: {
        songsStudied: 12,
        rehearsalsCompleted: 5,
        performances: 3,
        postsCount: 2,
        followersCount: 14,
        followingCount: 8
      },
      favoriteSongIds: ["demo-misterio-olaria", "demo-o-escudo"],
      reputationScore: 120, // Pontuação baseada em atividade e qualidade
      reputationBadge: "Instrumentista Ativo",
      isCelestial: false,
      privacy: "public", // 'public' ou 'limited'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Obtém o cache local de perfis
  _getLocalProfilesMap() {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  },

  // Salva no cache local
  _saveLocalProfile(uid, profile) {
    try {
      const map = this._getLocalProfilesMap();
      map[uid] = { ...profile, updatedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(map));
    } catch {}
  },

  // Calcula a reputação musical de forma transparente e determinística
  calculateReputation(stats = {}) {
    const songs = Number(stats.songsStudied || 0) * 5;
    const rehearsals = Number(stats.rehearsalsCompleted || 0) * 10;
    const performances = Number(stats.performances || 0) * 15;
    const posts = Number(stats.postsCount || 0) * 3;
    const followers = Number(stats.followersCount || 0) * 2;

    const total = songs + rehearsals + performances + posts + followers;

    let badge = "Iniciante no Virtuo";
    if (total >= 400) badge = "Mestre Virtuoso";
    else if (total >= 200) badge = "Ministro de Excelência";
    else if (total >= 100) badge = "Instrumentista Consagrado";
    else if (total >= 40) badge = "Músico Ativo";

    return { score: total, badge };
  },

  // Busca perfil por UID (Firestore com fallback seguro local)
  async getProfile(uid) {
    if (!uid) return null;

    // Verifica no Firestore se conectado
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const docRef = ctx.doc(ctx.db, "users", uid);
        const snap = await ctx.getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const merged = { ...this.getDefaultProfile(uid, data.displayName), ...data };
          this._saveLocalProfile(uid, merged);
          return merged;
        }
      } catch (err) {
        console.warn("[ProfileService.getProfile] Erro ao carregar do Firestore:", err.message);
      }
    }

    // Fallback local
    const localMap = this._getLocalProfilesMap();
    if (localMap[uid]) {
      return localMap[uid];
    }

    // Perfil default inicializado
    const defaultProfile = this.getDefaultProfile(uid);
    this._saveLocalProfile(uid, defaultProfile);
    return defaultProfile;
  },

  // Atualiza dados do Perfil Musical 2.0
  async updateProfile(uid, updates) {
    if (!uid) throw new Error("UID de usuário obrigatório.");

    // Sanitização e isolamento de campos proibidos (como role e admin)
    const sanitized = { ...updates };
    delete sanitized.role;
    delete sanitized.isAdmin;
    delete sanitized.admin;
    delete sanitized.uid;

    // Atualiza reputação calculada
    if (sanitized.stats) {
      const rep = this.calculateReputation(sanitized.stats);
      sanitized.reputationScore = rep.score;
      sanitized.reputationBadge = rep.badge;
    }

    // Salva localmente
    const local = await this.getProfile(uid);
    const updatedProfile = { ...local, ...sanitized, updatedAt: new Date().toISOString() };
    this._saveLocalProfile(uid, updatedProfile);

    // Salva no Firestore
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser && ctx.auth.currentUser.uid === uid) {
      try {
        const docRef = ctx.doc(ctx.db, "users", uid);
        await ctx.setDoc(docRef, {
          ...sanitized,
          updatedAt: ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("[ProfileService.updateProfile] Erro ao sincronizar Firestore:", err.message);
      }
    }

    return updatedProfile;
  },

  // Retorna a visão pública do perfil (sem expor e-mail ou dados privados)
  getPublicProfile(profile) {
    if (!profile) return null;
    return {
      uid: profile.uid,
      displayName: profile.artisticName || profile.displayName || "Músico Virtuoso",
      artisticName: profile.artisticName || profile.displayName || "Músico Virtuoso",
      photoURL: profile.photoURL || "",
      bio: profile.bio || "",
      instruments: Array.isArray(profile.instruments) ? profile.instruments : [],
      level: profile.level || "iniciante",
      styles: Array.isArray(profile.styles) ? profile.styles : [],
      location: profile.location || "",
      currentBand: profile.currentBand || "",
      externalLinks: profile.externalLinks || {},
      stats: {
        songsStudied: profile.stats?.songsStudied || 0,
        rehearsalsCompleted: profile.stats?.rehearsalsCompleted || 0,
        performances: profile.stats?.performances || 0,
        postsCount: profile.stats?.postsCount || 0,
        followersCount: profile.stats?.followersCount || 0,
        followingCount: profile.stats?.followingCount || 0
      },
      reputationScore: profile.reputationScore || 0,
      reputationBadge: profile.reputationBadge || "Músico Virtuoso",
      isCelestial: !!profile.isCelestial,
      privacy: profile.privacy || "public"
    };
  }
};
