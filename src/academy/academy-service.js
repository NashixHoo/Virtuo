// =============================================================
// VIRTUO ACADEMY: DATA SERVICE & PERSISTENCE
// src/academy/academy-service.js
// =============================================================

import { CANONICAL_COURSES } from "./canonical-curriculum.js";
import {
  createEmptyUserAcademyProgress,
  ACADEMY_LEVELS,
  ACADEMY_INSTRUMENTS
} from "../database/schema.js";

const LOCAL_STORAGE_KEY_PREFIX = "virtuo_academy_progress_";

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
        updateDoc: firestoreMod.updateDoc,
        query: firestoreMod.query,
        where: firestoreMod.where,
        onSnapshot: firestoreMod.onSnapshot
      };
      return firestoreCtx;
    } catch (err) {
      console.warn("[AcademyService] Firestore dynamic import fallback:", err.message);
    }
  }
  return null;
}

class AcademyServiceClass {
  constructor() {
    this.subscribers = new Set();
    this.cachedProgress = null;
    this.activeUserId = null;
    this.firestoreUnsubscribe = null;
  }

  /**
   * Obtém todos os cursos cadastrados (com fallback canônico puro e determinístico).
   */
  async getCourses(instrumentFilter = null) {
    let courses = [...CANONICAL_COURSES];

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const snap = await ctx.getDocs(ctx.collection(ctx.db, "academy_courses"));
        if (!snap.empty) {
          const remoteCourses = [];
          snap.forEach(d => remoteCourses.push({ id: d.id, ...d.data() }));
          if (remoteCourses.length > 0) {
            courses = remoteCourses;
          }
        }
      } catch (err) {
        console.warn("[AcademyService.getCourses] Firestore offline ou inacessível. Usando acervo canônico local.", err.message);
      }
    }

    if (instrumentFilter) {
      courses = courses.filter(c => c.instrumentId === instrumentFilter);
    }

    return courses;
  }

  /**
   * Obtém um curso específico pelo ID ou Slug.
   */
  async getCourseById(courseIdOrSlug) {
    const courses = await this.getCourses();
    return courses.find(c => c.id === courseIdOrSlug || c.slug === courseIdOrSlug) || courses[0];
  }

  /**
   * Obtém os dados de progresso do aluno para o usuário ativo.
   */
  async getUserProgress(userId) {
    if (!userId) {
      return this._getLocalProgress("guest");
    }

    // 1. Tenta carregar do Firestore
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db) {
      try {
        const ref = ctx.doc(ctx.db, "user_academy_progress", userId);
        const snap = await ctx.getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          this.cachedProgress = { ...data, userId };
          this._saveLocalProgress(userId, this.cachedProgress);
          return this.cachedProgress;
        }
      } catch (err) {
        console.warn("[AcademyService.getUserProgress] Falha ao ler Firestore:", err.message);
      }
    }

    // 2. Fallback para LocalStorage
    const local = this._getLocalProgress(userId);
    this.cachedProgress = local;
    return local;
  }

  /**
   * Marca uma aula como concluída pelo aluno.
   */
  async completeLesson(userId, courseId, moduleId, lessonId, score = 100, practiceDurationMinutes = 5) {
    const safeUserId = userId || "guest";
    let progress = await this.getUserProgress(safeUserId);

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    progress.lessonScores = progress.lessonScores || {};
    progress.lessonScores[lessonId] = Math.max(score, progress.lessonScores[lessonId] || 0);

    progress.practiceTimeMinutes = (progress.practiceTimeMinutes || 0) + practiceDurationMinutes;
    progress.lastPracticedAt = new Date().toISOString();
    progress.updatedAt = new Date().toISOString();

    // Recalcula o nível atual baseado nas aulas concluídas
    progress.currentLevel = this._calculateCurrentLevel(progress.completedLessons);

    this.cachedProgress = progress;
    this._saveLocalProgress(safeUserId, progress);
    this._notifySubscribers(progress);

    // Se conectado com usuário real, persiste no Firestore
    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_academy_progress", userId);
        await ctx.setDoc(ref, progress, { merge: true });
      } catch (err) {
        console.warn("[AcademyService.completeLesson] Erro ao sincronizar com Firestore:", err.message);
      }
    }

    return progress;
  }

  /**
   * Alterna instrumento em estudo pelo aluno.
   */
  async setStudentInstrument(userId, instrumentId) {
    const safeUserId = userId || "guest";
    let progress = await this.getUserProgress(safeUserId);
    progress.currentInstrument = instrumentId;
    progress.updatedAt = new Date().toISOString();

    this.cachedProgress = progress;
    this._saveLocalProgress(safeUserId, progress);
    this._notifySubscribers(progress);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_academy_progress", userId);
        await ctx.setDoc(ref, { currentInstrument: instrumentId, updatedAt: progress.updatedAt }, { merge: true });
      } catch (err) {}
    }

    return progress;
  }

  /**
   * Registra tempo de prática livre com metrônomo / afinador.
   */
  async logPracticeSession(userId, minutes) {
    const safeUserId = userId || "guest";
    let progress = await this.getUserProgress(safeUserId);
    progress.practiceTimeMinutes = (progress.practiceTimeMinutes || 0) + minutes;
    progress.lastPracticedAt = new Date().toISOString();
    progress.updatedAt = new Date().toISOString();

    this.cachedProgress = progress;
    this._saveLocalProgress(safeUserId, progress);
    this._notifySubscribers(progress);

    const ctx = await getFirestoreCtx();
    if (ctx && ctx.db && userId && userId !== "guest") {
      try {
        const ref = ctx.doc(ctx.db, "user_academy_progress", userId);
        await ctx.setDoc(ref, {
          practiceTimeMinutes: progress.practiceTimeMinutes,
          lastPracticedAt: progress.lastPracticedAt
        }, { merge: true });
      } catch (err) {}
    }

    return progress;
  }

  /**
   * Inscreve um callback para ser notificado de alterações de progresso.
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notifySubscribers(progress) {
    this.subscribers.forEach(cb => {
      try {
        cb(progress);
      } catch (e) {
        console.error("[AcademyService] Erro em listener:", e);
      }
    });
  }

  /**
   * Inicia sincronização em tempo real do Firestore se usuário estiver logado.
   */
  async attachUserRealtime(userId) {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    if (!userId || userId === "guest") {
      return;
    }

    const ctx = await getFirestoreCtx();
    if (!ctx || !ctx.db) {
      return;
    }

    this.activeUserId = userId;
    try {
      const ref = ctx.doc(ctx.db, "user_academy_progress", userId);
      this.firestoreUnsubscribe = ctx.onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data();
          this.cachedProgress = { ...remoteData, userId };
          this._saveLocalProgress(userId, this.cachedProgress);
          this._notifySubscribers(this.cachedProgress);
        }
      }, (err) => {
        console.warn("[AcademyService.attachUserRealtime] Erro no listener:", err.message);
      });
    } catch (err) {
      console.warn("[AcademyService.attachUserRealtime] Falha ao inicializar listener:", err.message);
    }
  }

  _getLocalProgress(userId) {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (err) {}
    }
    return createEmptyUserAcademyProgress({ userId });
  }

  _saveLocalProgress(userId, progress) {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(progress));
      } catch (err) {}
    }
  }

  _calculateCurrentLevel(completedLessons = []) {
    if (!Array.isArray(completedLessons)) return 0;
    let maxLvl = 0;
    CANONICAL_COURSES.forEach(c => {
      (c.modules || []).forEach(m => {
        const hasCompletedInModule = (m.lessons || []).some(l => completedLessons.includes(l.id));
        if (hasCompletedInModule && m.level > maxLvl) {
          maxLvl = m.level;
        }
      });
    });
    return Math.min(5, maxLvl);
  }
}

export const VirtuoAcademyService = new AcademyServiceClass();
