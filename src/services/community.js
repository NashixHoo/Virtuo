// =============================================================
// VIRTUO COMMUNITY SERVICE 2.0 (ETAPA 4/5)
// src/services/community.js
// Gestão de postagens ricas, tipos multimídia e Feed 2.0 com Cloud Firestore
// =============================================================

import { POST_TYPES } from "../community/community-constants.js";

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
        getDocs: firestoreMod.getDocs,
        getDoc: firestoreMod.getDoc,
        addDoc: firestoreMod.addDoc,
        updateDoc: firestoreMod.updateDoc,
        deleteDoc: firestoreMod.deleteDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        orderBy: firestoreMod.orderBy,
        limit: firestoreMod.limit,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[CommunityService] Firestore import:", err.message);
    }
  }
  return null;
}

const LOCAL_POSTS_STORAGE_KEY = "virtuo_community_posts_v2";

const DEFAULT_DEMO_POSTS = [
  {
    id: "demo-post-1",
    authorId: "virtuo-master",
    authorName: "Nashix Hoo",
    authorRole: "Fundador & Líder",
    authorPhoto: "",
    type: "dica_musical",
    instrument: "guitarra",
    content: "Bem-vindos à Comunidade Virtuo 2.0! O Modo Ministro e o Metrônomo com Banda Virtual agora estão sincronizados com as cifras da comunidade. Experimentem criar repertórios e agendar ensaios colaborativos.",
    imageUrl: "",
    mediaUrl: "",
    songId: "demo-misterio-olaria",
    songTitle: "Mistério na Olaria",
    likes: ["user-demo-1", "user-demo-2", "demo-minister-1"],
    likesCount: 3,
    commentsCount: 1,
    savesCount: 2,
    visibility: "public",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "demo-post-2",
    authorId: "demo-minister-1",
    authorName: "Lucas Rocha",
    authorRole: "Membro Celestial",
    authorPhoto: "",
    type: "ensaio",
    instrument: "teclado",
    content: "Acabamos de realizar o ensaio de Santa Ceia no Ministério Aliança. Subimos 1 tom para a voz da solista em 'Mistério na Olaria' (em G#m) e o Smart Key facilitou as aberturas harmônicas!",
    imageUrl: "",
    mediaUrl: "",
    songId: "demo-misterio-olaria",
    songTitle: "Mistério na Olaria",
    likes: ["virtuo-master", "demo-bassist-1"],
    likesCount: 2,
    commentsCount: 0,
    savesCount: 1,
    visibility: "public",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "demo-post-3",
    authorId: "demo-bassist-1",
    authorName: "André Silva",
    authorRole: "Baixista",
    authorPhoto: "",
    type: "performance",
    instrument: "baixo",
    content: "Gravando as linhas de baixo na nova seção de estúdio do Virtuo Band Engine. O metrônomo acústico nos fones deu uma estabilidade inacreditável!",
    imageUrl: "",
    mediaUrl: "",
    songId: "demo-o-escudo",
    songTitle: "O Escudo",
    likes: ["virtuo-master"],
    likesCount: 1,
    commentsCount: 0,
    savesCount: 0,
    visibility: "public",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export const CommunityService = {
  getLocalPosts() {
    try {
      const raw = localStorage.getItem(LOCAL_POSTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Fallback v1 se existir
      const v1 = localStorage.getItem("virtuo_community_posts_v1");
      if (v1) {
        const parsedV1 = JSON.parse(v1);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) return parsedV1;
      }
    } catch {}
    return DEFAULT_DEMO_POSTS;
  },

  saveLocalPosts(posts) {
    try {
      localStorage.setItem(LOCAL_POSTS_STORAGE_KEY, JSON.stringify(posts));
    } catch {}
  },

  async getAllPosts({ filterType = null, limitCount = 30 } = {}) {
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const postsCol = ctx.collection(ctx.db, "posts");
        let q = ctx.query(postsCol, ctx.orderBy("createdAt", "desc"), ctx.limit(limitCount));
        if (filterType && filterType !== "todos") {
          q = ctx.query(postsCol, ctx.where("type", "==", filterType), ctx.orderBy("createdAt", "desc"), ctx.limit(limitCount));
        }
        const snap = await ctx.getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
        }
      } catch (err) {
        console.warn("[CommunityService.getAllPosts] Firestore error, using local:", err.message);
      }
    }

    let posts = this.getLocalPosts();
    if (filterType && filterType !== "todos") {
      posts = posts.filter(p => p.type === filterType);
    }
    return posts.slice(0, limitCount);
  },

  async createPost({
    content,
    imageUrl,
    mediaUrl,
    type = "texto",
    instrument = "",
    songId = null,
    songTitle = null,
    visibility = "public",
    authorName,
    authorRole,
    authorPhoto
  }, userUid) {
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : "guest-musician");
    
    const newPost = {
      authorId: currentUid,
      authorName: authorName || "Músico Virtuoso",
      authorRole: authorRole || "Membro",
      authorPhoto: authorPhoto || "",
      type: type || "texto",
      instrument: instrument || "",
      content: (content || "").trim(),
      imageUrl: (imageUrl || "").trim(),
      mediaUrl: (mediaUrl || "").trim(),
      songId: songId || null,
      songTitle: songTitle || null,
      visibility: visibility || "public",
      likes: [],
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      createdAt: ctx && ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString(),
      updatedAt: ctx && ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
    };

    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const postsCol = ctx.collection(ctx.db, "posts");
        const docRef = await ctx.addDoc(postsCol, newPost);
        return { id: docRef.id, ...newPost };
      } catch (err) {
        console.warn("[CommunityService.createPost] Firestore error:", err.message);
      }
    }

    // Salva localmente
    const localPost = { ...newPost, id: `local-post-${Date.now()}`, createdAt: new Date().toISOString() };
    const posts = this.getLocalPosts();
    posts.unshift(localPost);
    this.saveLocalPosts(posts);
    return localPost;
  },

  async toggleLike(postId, userUid) {
    if (!postId) return { success: false, likes: [], likesCount: 0 };
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : "local-user");

    // Local update
    const localPosts = this.getLocalPosts();
    const found = localPosts.find(p => p.id === postId);
    let updatedLikes = [];
    if (found) {
      if (!Array.isArray(found.likes)) found.likes = [];
      const idx = found.likes.indexOf(currentUid);
      if (idx >= 0) {
        found.likes.splice(idx, 1);
      } else {
        found.likes.push(currentUid);
      }
      found.likesCount = found.likes.length;
      updatedLikes = [...found.likes];
      this.saveLocalPosts(localPosts);
    }

    // Firestore update
    if (ctx && ctx.db && !postId.startsWith("demo-") && !postId.startsWith("local-") && ctx.auth && ctx.auth.currentUser) {
      try {
        const postRef = ctx.doc(ctx.db, "posts", postId);
        const snap = await ctx.getDoc(postRef);
        if (snap.exists()) {
          const data = snap.data();
          let likes = Array.isArray(data.likes) ? [...data.likes] : [];
          const idx = likes.indexOf(currentUid);
          if (idx >= 0) {
            likes.splice(idx, 1);
          } else {
            likes.push(currentUid);
          }
          updatedLikes = likes;
          await ctx.updateDoc(postRef, {
            likes,
            likesCount: likes.length,
            updatedAt: ctx.serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("[CommunityService.toggleLike] Firestore error:", err.message);
      }
    }

    return { success: true, likes: updatedLikes, likesCount: updatedLikes.length };
  },

  async deletePost(postId, userUid, isAdmin = false) {
    if (!postId) return false;
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : null);

    // Local delete
    let localPosts = this.getLocalPosts();
    const target = localPosts.find(p => p.id === postId);
    if (target && target.authorId !== currentUid && !isAdmin) {
      throw new Error("Você não tem autorização para excluir esta publicação.");
    }

    localPosts = localPosts.filter(p => p.id !== postId);
    this.saveLocalPosts(localPosts);

    // Firestore delete
    if (ctx && ctx.db && !postId.startsWith("demo-") && !postId.startsWith("local-") && ctx.auth && ctx.auth.currentUser) {
      try {
        const postRef = ctx.doc(ctx.db, "posts", postId);
        await ctx.deleteDoc(postRef);
        return true;
      } catch (err) {
        console.warn("[CommunityService.deletePost] Firestore error:", err.message);
      }
    }
    return true;
  }
};
