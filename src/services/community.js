// =============================================================
// VIRTUO COMMUNITY SERVICE
// src/services/community.js
// Gestão de postagens e interações da comunidade com Cloud Firestore
// =============================================================

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
        orderBy: firestoreMod.orderBy,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[CommunityService] Firestore import:", err.message);
    }
  }
  return null;
}

const LOCAL_POSTS_STORAGE_KEY = "virtuo_community_posts_v1";

const DEFAULT_DEMO_POSTS = [
  {
    id: "demo-post-1",
    authorId: "virtuo-master",
    authorName: "Nashix Hoo",
    authorRole: "Fundador",
    authorPhoto: "",
    content: "Bem-vindos ao Virtuo! O Modo Ministro e o Metrônomo Acústico já estão calibrados para o próximo culto. Experimentem a transposição com Easy Play!",
    imageUrl: "",
    likes: ["user-demo-1", "user-demo-2"],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "demo-post-2",
    authorId: "demo-minister-1",
    authorName: "Ministério Aliança",
    authorRole: "Líder de Louvor",
    authorPhoto: "",
    content: "Acabamos de ensaiar 'Mistério na Olaria' subindo 1 tom para a voz da solista (em G#). O fluxo com o metrônomo a 74 BPM ficou impecável!",
    imageUrl: "",
    likes: ["virtuo-master"],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
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
    } catch {}
    return DEFAULT_DEMO_POSTS;
  },

  saveLocalPosts(posts) {
    try {
      localStorage.setItem(LOCAL_POSTS_STORAGE_KEY, JSON.stringify(posts));
    } catch {}
  },

  async getAllPosts() {
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const postsCol = ctx.collection(ctx.db, "posts");
        const q = ctx.query(postsCol, ctx.orderBy("createdAt", "desc"));
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
    return this.getLocalPosts();
  },

  async createPost({ content, imageUrl, authorName, authorRole, authorPhoto }, userUid) {
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : "guest-musician");
    
    const newPost = {
      authorId: currentUid,
      authorName: authorName || "Músico Virtuoso",
      authorRole: authorRole || "Membro",
      authorPhoto: authorPhoto || "",
      content: (content || "").trim(),
      imageUrl: (imageUrl || "").trim(),
      likes: [],
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
    if (!postId) return { success: false, likes: [] };
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
            updatedAt: ctx.serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("[CommunityService.toggleLike] Firestore error:", err.message);
      }
    }

    return { success: true, likes: updatedLikes };
  },

  async deletePost(postId, userUid) {
    if (!postId) return false;
    const ctx = await getFirestoreCtx();
    const currentUid = userUid || (ctx && ctx.auth && ctx.auth.currentUser ? ctx.auth.currentUser.uid : null);

    // Local delete
    let localPosts = this.getLocalPosts();
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
