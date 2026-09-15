// =============================================================
// VIRTUO SOCIAL SERVICE (ETAPA 4/5)
// src/community/social-service.js
// Gestão de Curtidas, Comentários, Seguir, Denúncias e Busca Global
// =============================================================

import { REPORT_REASONS, DISCOVER_CATEGORIES } from "./community-constants.js";

const LOCAL_COMMENTS_KEY = "virtuo_comments_cache_v2";
const LOCAL_FOLLOWS_KEY = "virtuo_follows_cache_v2";
const LOCAL_SAVED_POSTS_KEY = "virtuo_saved_posts_v2";
const LOCAL_REPORTS_KEY = "virtuo_reports_cache_v2";
const LOCAL_NOTIFS_KEY = "virtuo_notifications_cache_v2";

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
        setDoc: firestoreMod.setDoc,
        addDoc: firestoreMod.addDoc,
        updateDoc: firestoreMod.updateDoc,
        deleteDoc: firestoreMod.deleteDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        orderBy: firestoreMod.orderBy,
        serverTimestamp: firestoreMod.serverTimestamp
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[SocialService] Firestore import:", err.message);
    }
  }
  return null;
}

export const SocialService = {
  // -----------------------------------------------------------
  // 1. SEGUIR MÚSICOS (FOLLOW / UNFOLLOW)
  // -----------------------------------------------------------
  _getLocalFollows() {
    try {
      const raw = localStorage.getItem(LOCAL_FOLLOWS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Seguidas de demonstração
    return [
      { followerId: "demo-user", followingId: "virtuo-master", createdAt: new Date().toISOString() }
    ];
  },

  _saveLocalFollows(list) {
    try {
      localStorage.setItem(LOCAL_FOLLOWS_KEY, JSON.stringify(list));
    } catch {}
  },

  isFollowing(followerUid, targetUid) {
    if (!followerUid || !targetUid || followerUid === targetUid) return false;
    const list = this._getLocalFollows();
    return list.some(f => f.followerId === followerUid && f.followingId === targetUid);
  },

  async toggleFollow(followerUid, targetUid) {
    if (!followerUid || !targetUid) {
      throw new Error("IDs de seguidor e alvo são obrigatórios.");
    }
    if (followerUid === targetUid) {
      throw new Error("Um músico não pode seguir a si mesmo.");
    }

    const list = this._getLocalFollows();
    const existingIndex = list.findIndex(f => f.followerId === followerUid && f.followingId === targetUid);
    const followDocId = `${followerUid}_${targetUid}`;
    let isNowFollowing = false;

    if (existingIndex >= 0) {
      // Unfollow
      list.splice(existingIndex, 1);
      isNowFollowing = false;
    } else {
      // Follow
      list.push({
        followerId: followerUid,
        followingId: targetUid,
        createdAt: new Date().toISOString()
      });
      isNowFollowing = true;

      // Adiciona notificação de novo seguidor
      this.addNotification({
        recipientUid: targetUid,
        senderUid: followerUid,
        type: "new_follower",
        entityId: followerUid,
        message: "começou a seguir o seu perfil musical."
      });
    }

    this._saveLocalFollows(list);

    // Sincroniza Firestore se conectado
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const followDocRef = ctx.doc(ctx.db, "follows", followDocId);
        if (isNowFollowing) {
          await ctx.setDoc(followDocRef, {
            followerId: followerUid,
            followingId: targetUid,
            createdAt: ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
          });
        } else {
          await ctx.deleteDoc(followDocRef);
        }
      } catch (err) {
        console.warn("[SocialService.toggleFollow] Firestore error:", err.message);
      }
    }

    return { success: true, isFollowing: isNowFollowing };
  },

  getFollowersCount(targetUid) {
    const list = this._getLocalFollows();
    return list.filter(f => f.followingId === targetUid).length;
  },

  getFollowingCount(userUid) {
    const list = this._getLocalFollows();
    return list.filter(f => f.followerId === userUid).length;
  },

  // -----------------------------------------------------------
  // 2. SISTEMA DE COMENTÁRIOS (COM CRIAÇÃO, EDIÇÃO, EXCLUSÃO E MODERAÇÃO)
  // -----------------------------------------------------------
  _getLocalComments() {
    try {
      const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: "comment-demo-1",
        postId: "demo-post-1",
        authorId: "demo-minister-1",
        authorName: "Ministério Aliança",
        authorRole: "Líder de Louvor",
        authorPhoto: "",
        content: "A sincronização do metrônomo no ensaio foi essencial para o alinhamento da banda!",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: null
      }
    ];
  },

  _saveLocalComments(comments) {
    try {
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
    } catch {}
  },

  async getCommentsForPost(postId) {
    if (!postId) return [];
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const col = ctx.collection(ctx.db, "comments");
        const q = ctx.query(col, ctx.where("postId", "==", postId), ctx.orderBy("createdAt", "asc"));
        const snap = await ctx.getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err) {
        console.warn("[SocialService.getCommentsForPost] Firestore error:", err.message);
      }
    }

    const local = this._getLocalComments();
    return local.filter(c => c.postId === postId);
  },

  async addComment({ postId, content, authorName, authorPhoto, authorRole }, authorUid) {
    if (!postId || !content || !content.trim()) {
      throw new Error("Comentário não pode ser vazio.");
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 500) {
      throw new Error("O comentário não pode exceder 500 caracteres.");
    }

    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      authorId: authorUid || "guest",
      authorName: authorName || "Músico Virtuoso",
      authorPhoto: authorPhoto || "",
      authorRole: authorRole || "Membro",
      content: cleanContent,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    const local = this._getLocalComments();
    local.push(newComment);
    this._saveLocalComments(local);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const col = ctx.collection(ctx.db, "comments");
        const docRef = await ctx.addDoc(col, {
          ...newComment,
          createdAt: ctx.serverTimestamp ? ctx.serverTimestamp() : newComment.createdAt
        });
        newComment.id = docRef.id;
      } catch (err) {
        console.warn("[SocialService.addComment] Firestore error:", err.message);
      }
    }

    return newComment;
  },

  async editComment(commentId, newContent, userUid) {
    if (!commentId || !newContent || !newContent.trim()) {
      throw new Error("Conteúdo do comentário é obrigatório.");
    }
    const clean = newContent.trim();
    if (clean.length > 500) {
      throw new Error("O comentário não pode exceder 500 caracteres.");
    }

    const local = this._getLocalComments();
    const comment = local.find(c => c.id === commentId);
    if (!comment) throw new Error("Comentário não encontrado.");
    if (comment.authorId !== userUid) {
      throw new Error("Você só pode editar seus próprios comentários.");
    }

    comment.content = clean;
    comment.updatedAt = new Date().toISOString();
    this._saveLocalComments(local);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser && !commentId.startsWith("comment-demo-")) {
      try {
        const docRef = ctx.doc(ctx.db, "comments", commentId);
        await ctx.updateDoc(docRef, {
          content: clean,
          updatedAt: ctx.serverTimestamp ? ctx.serverTimestamp() : new Date().toISOString()
        });
      } catch (err) {
        console.warn("[SocialService.editComment] Firestore error:", err.message);
      }
    }

    return comment;
  },

  async deleteComment(commentId, userUid, isAdmin = false) {
    if (!commentId) return false;

    let local = this._getLocalComments();
    const comment = local.find(c => c.id === commentId);
    if (comment && comment.authorId !== userUid && !isAdmin) {
      throw new Error("Sem autorização para excluir este comentário.");
    }

    local = local.filter(c => c.id !== commentId);
    this._saveLocalComments(local);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser && !commentId.startsWith("comment-demo-")) {
      try {
        const docRef = ctx.doc(ctx.db, "comments", commentId);
        await ctx.deleteDoc(docRef);
      } catch (err) {
        console.warn("[SocialService.deleteComment] Firestore error:", err.message);
      }
    }

    return true;
  },

  // -----------------------------------------------------------
  // 3. POSTS SALVOS (BOOKMARKS)
  // -----------------------------------------------------------
  _getLocalSavedPosts() {
    try {
      const raw = localStorage.getItem(LOCAL_SAVED_POSTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  isPostSaved(postId, userUid) {
    if (!postId || !userUid) return false;
    const list = this._getLocalSavedPosts();
    return list.some(item => item.postId === postId && item.userId === userUid);
  },

  toggleSavePost(postId, userUid) {
    if (!postId || !userUid) return false;
    let list = this._getLocalSavedPosts();
    const idx = list.findIndex(i => i.postId === postId && i.userId === userUid);
    let isSaved = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      isSaved = false;
    } else {
      list.push({ postId, userId: userUid, savedAt: new Date().toISOString() });
      isSaved = true;
    }
    localStorage.setItem(LOCAL_SAVED_POSTS_KEY, JSON.stringify(list));
    return isSaved;
  },

  // -----------------------------------------------------------
  // 4. DENÚNCIAS & MODERAÇÃO (REPORTS)
  // -----------------------------------------------------------
  _getLocalReports() {
    try {
      const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  _saveLocalReports(reports) {
    try {
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
    } catch {}
  },

  async createReport({ targetType, targetId, reason, details }, reporterUid) {
    if (!targetType || !targetId || !reason) {
      throw new Error("Tipo, alvo e motivo da denúncia são obrigatórios.");
    }

    const report = {
      id: `report-${Date.now()}`,
      targetType, // 'post', 'comment', 'user', 'band'
      targetId,
      reason,
      details: (details || "").trim(),
      reporterId: reporterUid || "anonymous",
      status: "pending", // 'pending', 'resolved', 'dismissed'
      createdAt: new Date().toISOString()
    };

    const local = this._getLocalReports();
    local.push(report);
    this._saveLocalReports(local);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && ctx.auth && ctx.auth.currentUser) {
      try {
        const col = ctx.collection(ctx.db, "reports");
        const docRef = await ctx.addDoc(col, {
          ...report,
          createdAt: ctx.serverTimestamp ? ctx.serverTimestamp() : report.createdAt
        });
        report.id = docRef.id;
      } catch (err) {
        console.warn("[SocialService.createReport] Firestore error:", err.message);
      }
    }

    return { success: true, reportId: report.id };
  },

  getPendingReports(isAdmin = false) {
    if (!isAdmin) return [];
    return this._getLocalReports().filter(r => r.status === "pending");
  },

  resolveReport(reportId, action, isAdmin = false) {
    if (!isAdmin) throw new Error("Apenas administradores podem moderar denúncias.");
    const list = this._getLocalReports();
    const report = list.find(r => r.id === reportId);
    if (!report) return false;
    report.status = action; // 'resolved' ou 'dismissed'
    report.resolvedAt = new Date().toISOString();
    this._saveLocalReports(list);
    return true;
  },

  // -----------------------------------------------------------
  // 5. NOTIFICAÇÕES
  // -----------------------------------------------------------
  _getLocalNotifications() {
    try {
      const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  addNotification({ recipientUid, senderUid, type, entityId, message }) {
    if (!recipientUid || recipientUid === senderUid) return;
    const notifs = this._getLocalNotifications();
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      recipientUid,
      senderUid,
      type, // 'new_follower', 'post_like', 'new_comment', 'band_invite', 'rehearsal_invite'
      entityId,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    notifs.unshift(notif);
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs.slice(0, 50)));
  },

  getUserNotifications(uid) {
    if (!uid) return [];
    return this._getLocalNotifications().filter(n => n.recipientUid === uid);
  },

  // -----------------------------------------------------------
  // 6. BUSCA GLOBAL & DESCOBRIR
  // -----------------------------------------------------------
  globalSearch(query, { users = [], songs = [], posts = [], bands = [] }) {
    if (!query || !query.trim()) {
      return { musicians: [], songs: [], posts: [], bands: [], query: "" };
    }

    const q = query.trim().toLowerCase();

    // Músicos
    const musicians = users.filter(u => {
      const name = (u.artisticName || u.displayName || "").toLowerCase();
      const insts = (u.instruments || []).join(" ").toLowerCase();
      const styles = (u.styles || []).join(" ").toLowerCase();
      return name.includes(q) || insts.includes(q) || styles.includes(q);
    }).slice(0, 8);

    // Músicas & Cifras
    const matchedSongs = songs.filter(s => {
      const title = (s.title || "").toLowerCase();
      const artist = (s.artist || "").toLowerCase();
      const chords = (s.chords || "").toLowerCase();
      return title.includes(q) || artist.includes(q) || chords.includes(q);
    }).slice(0, 8);

    // Posts
    const matchedPosts = posts.filter(p => {
      const content = (p.content || "").toLowerCase();
      const author = (p.authorName || "").toLowerCase();
      return content.includes(q) || author.includes(q);
    }).slice(0, 8);

    // Bandas
    const matchedBands = bands.filter(b => {
      const name = (b.name || "").toLowerCase();
      const desc = (b.description || "").toLowerCase();
      const style = (b.style || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || style.includes(q);
    }).slice(0, 8);

    return {
      query,
      musicians,
      songs: matchedSongs,
      posts: matchedPosts,
      bands: matchedBands
    };
  },

  discoverByCategory(categoryKey, users = [], bands = []) {
    const cat = DISCOVER_CATEGORIES.find(c => c.id === categoryKey);
    if (!cat) return { category: null, items: [] };

    if (cat.isBand) {
      return {
        category: cat,
        items: bands
      };
    }

    if (cat.instrument) {
      const filtered = users.filter(u => 
        Array.isArray(u.instruments) && u.instruments.includes(cat.instrument)
      );
      return {
        category: cat,
        items: filtered
      };
    }

    if (cat.role) {
      const filtered = users.filter(u => 
        (u.authorRole || u.role || "").toLowerCase().includes(cat.role)
      );
      return {
        category: cat,
        items: filtered
      };
    }

    return { category: cat, items: users };
  },

  // -----------------------------------------------------------
  // 7. COMPARTILHAMENTO UNIFICADO (WEB SHARE + FALLBACK COPIAR LINK)
  // -----------------------------------------------------------
  async shareContent({ title, text, url }) {
    const shareData = {
      title: title || "Virtuo • A plataforma do músico virtuoso",
      text: text || "Confira no Virtuo!",
      url: url || (typeof window !== "undefined" ? window.location.href : "https://virtuo.app")
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return { success: true, method: "native" };
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[SocialService.shareContent] Web Share fallback:", err);
        }
      }
    }

    // Fallback: copiar para área de transferência
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        const fullShareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(fullShareText);
        return { success: true, method: "clipboard", text: fullShareText };
      } catch (clipErr) {
        console.warn("[SocialService.shareContent] Clipboard error:", clipErr);
      }
    }

    return { success: false, method: "none" };
  }
};
