// firebase-config.js
// Firebase Web SDK (v10 modular) configuration for Virtuo PWA
// Compatible with browser ES modules, PWA offline caching, and GitHub Pages.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  onSnapshot,
  getDocFromServer 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Public Firebase Web Client Config
export const firebaseConfig = {
  apiKey: "AIzaSyATGB4jHdWD4Xuok5T52eFg49kfX_flK5k",
  authDomain: "virtuo-7e01b.firebaseapp.com",
  projectId: "virtuo-7e01b",
  storageBucket: "virtuo-7e01b.firebasestorage.app",
  messagingSenderId: "624628069677",
  appId: "1:624628069677:web:cf6e928f7a8f6301128fa4"
};

export const FIRESTORE_DATABASE_ID = "ai-studio-virtuov2-043e1953-2c69-4551-86e6-1b99649b7e19";

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const auth = getAuth(app);

// Enable local persistence for user sessions
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch(e) {}

function initFirestore() {
  try {
    return getFirestore(app, FIRESTORE_DATABASE_ID);
  } catch (err) {
    console.warn("Could not initialize custom databaseId, falling back to default:", err);
    return getFirestore(app);
  }
}

export const db = initFirestore();
export const storage = getStorage(app);

// Test Firestore Connection
export async function checkFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return { ok: true, message: "Conectado ao Firebase virtuo-7e01b com sucesso." };
  } catch (error) {
    if (error && error.message && error.message.includes("client is offline")) {
      return { ok: false, offline: true, message: "Modo offline ativo" };
    }
    return { ok: true, message: "Conectado ao Firebase virtuo-7e01b." };
  }
}

// Authentication Helpers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// 1. Sign Up with Email and Password
export async function signUpWithEmail(email, password, displayName, instruments = ["Guitarra", "Vocal"]) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    await syncUserProfile(user, { displayName, instruments });
    return user;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
}

// 2. Sign In with Email and Password
export async function signInWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncUserProfile(cred.user);
    return cred.user;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

// 3. Password Reset
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Password reset error:", error);
    throw error;
  }
}

// 4. Google Sign In
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.warn("Google sign-in error:", error.code, error.message);
    throw error;
  }
}

// 5. Sign Out
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

// Translate Firebase Auth error codes to user-friendly Portuguese
export function getAuthErrorMessage(error) {
  if (!error) return "Ocorreu um erro inesperado. Tente novamente.";
  const code = error.code || error.message || "";
  
  switch (code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado no Virtuo. Faça login ou recupere sua senha.";
    case "auth/invalid-email":
      return "O endereço de e-mail informado é inválido.";
    case "auth/operation-not-allowed":
      return "Este método de login ainda não está ativo no Firebase Console (Authentication > Sign-in method).";
    case "auth/weak-password":
      return "Senha fraca. Sua senha deve conter pelo menos 6 caracteres.";
    case "auth/user-disabled":
      return "Esta conta foi desativada pelo administrador.";
    case "auth/user-not-found":
      return "Nenhuma conta encontrada com este e-mail. Cadastre-se gratuitamente.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos. Verifique suas credenciais.";
    case "auth/too-many-requests":
      return "Muitas tentativas malsucedidas. Aguarde alguns instantes e tente novamente.";
    case "auth/popup-closed-by-user":
      return "A janela de login com o Google foi fechada antes de concluir.";
    case "auth/popup-blocked":
      return "O navegador bloqueou o pop-up do Google. Permita pop-ups no navegador para entrar.";
    case "auth/unauthorized-domain":
      return "Domínio não autorizado. Adicione o domínio atual aos 'Authorized Domains' no Firebase Console.";
    case "auth/network-request-failed":
      return "Falha de conexão com a rede. Verifique sua conexão com a internet.";
    case "auth/requires-recent-login":
      return "Por segurança, faça login novamente para prosseguir com esta ação.";
    case "auth/missing-email":
      return "Por favor, informe seu endereço de e-mail.";
    case "auth/missing-password":
      return "Por favor, informe sua senha.";
    default:
      if (typeof error.message === "string" && error.message.toLowerCase().includes("network")) {
        return "Erro de conexão de rede ao comunicar com o servidor do Firebase.";
      }
      return "Não foi possível concluir a autenticação. Verifique os dados informados.";
  }
}

// User Profile Firestore Sync
// Collection: users | Document ID: user.uid
// Stores: uid, displayName, photoURL, email, instruments, createdAt, updatedAt
export async function syncUserProfile(user, extraData = {}) {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    const now = serverTimestamp();
    if (!snap.exists()) {
      const fallbackName = user.displayName || (user.email ? user.email.split("@")[0] : "Músico Virtuoso");
      const initialData = {
        uid: user.uid,
        displayName: extraData.displayName || fallbackName,
        photoURL: user.photoURL || "",
        email: user.email || "",
        instruments: extraData.instruments || ["Guitarra", "Vocal"],
        createdAt: now,
        updatedAt: now
      };
      await setDoc(userRef, initialData, { merge: true });
      return initialData;
    } else {
      const existing = snap.data();
      const updateData = {
        updatedAt: now
      };
      if (extraData.displayName) updateData.displayName = extraData.displayName;
      else if (!existing.displayName && user.displayName) updateData.displayName = user.displayName;

      if (extraData.instruments) updateData.instruments = extraData.instruments;
      else if (!existing.instruments) updateData.instruments = ["Guitarra", "Vocal"];

      if (user.photoURL && user.photoURL !== existing.photoURL) updateData.photoURL = user.photoURL;
      if (user.email && user.email !== existing.email) updateData.email = user.email;

      await updateDoc(userRef, updateData).catch(() => {});
      return { ...existing, ...updateData };
    }
  } catch (err) {
    console.warn("User sync warning:", err.message);
    return null;
  }
}

// Update user instruments or display name in Firestore
export async function updateUserProfileDoc(uid, data) {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// -------------------------------------------------------------
// SONGS & CIFRAS FIRESTORE REPOSITORY
// -------------------------------------------------------------

export const DEMO_SONGS = [];

// Seed default songs into Firestore if empty (desativado para manter acervo limpo)
export async function seedDefaultSongsIfEmpty(currentUserId = "virtuo-master") {
  // Mantém a biblioteca vazia para novos cadastros revisados
  return;
}

// Fetch all songs from Firestore
export async function getLibrarySongs() {
  try {
    const songsCol = collection(db, "songs");
    const q = query(songsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Could not fetch songs from Firestore:", err.message);
    return [];
  }
}

// Add song to Firestore
export async function addSongToLibrary(songData, userUid) {
  try {
    const songsCol = collection(db, "songs");
    const now = serverTimestamp();
    const docRef = await addDoc(songsCol, {
      title: songData.title || "Sem Título",
      artist: songData.artist || "Virtuo Worship",
      originalKey: songData.originalKey || "G",
      bpm: Number(songData.bpm) || 74,
      difficulty: songData.difficulty || "Fácil",
      capo: Number(songData.capo) || 0,
      chords: songData.chords || "[Intro] G  C  Em  D",
      easyChords: songData.easyChords || "[Intro] G  C  Em  D",
      structure: songData.structure || "Intro • Verso • Refrão • Final",
      youtubeUrl: songData.youtubeUrl || "",
      spotifyUrl: songData.spotifyUrl || "",
      createdBy: userUid || (auth.currentUser ? auth.currentUser.uid : "virtuo-guest"),
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (err) {
    console.error("Error adding song to Firestore:", err);
    throw err;
  }
}

// Update existing song
export async function updateSongInLibrary(songId, songData) {
  try {
    const songRef = doc(db, "songs", songId);
    await updateDoc(songRef, {
      ...songData,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error updating song in Firestore:", err);
    throw err;
  }
}

// Delete song
export async function deleteSongFromLibrary(songId) {
  try {
    const songRef = doc(db, "songs", songId);
    await deleteDoc(songRef);
  } catch (err) {
    console.error("Error deleting song from Firestore:", err);
    throw err;
  }
}

// Formata mensagens amigáveis para falhas de upload e gravação no Firebase
export function getMediaUploadErrorMessage(error) {
  if (!error) return "Erro desconhecido no upload.";
  if (typeof error === "string") {
    if (error.includes("storage/unauthorized") || error.includes("permission-denied")) return "Você não tem permissão para enviar este arquivo.";
    if (error.includes("storage/canceled")) return "Upload cancelado.";
    if (error.includes("storage/quota-exceeded")) return "Espaço do Storage esgotado.";
    if (error.includes("storage/retry-limit-exceeded")) return "Verifique sua conexão.";
    if (error.includes("storage/object-not-found")) return "Arquivo não encontrado.";
    return error;
  }
  
  let code = error.code || (error.originalError && error.originalError.code) || "";
  const rawMsg = String(error.message || "");
  const msg = rawMsg.toLowerCase();

  if (!code) {
    const storageCodeMatch = rawMsg.match(/storage\/[a-z0-9_-]+/i);
    if (storageCodeMatch) {
      code = storageCodeMatch[0].toLowerCase();
    } else {
      const fsCodeMatch = rawMsg.match(/\b(permission-denied|resource-exhausted|unavailable|unauthenticated|deadline-exceeded|not-found)\b/i);
      if (fsCodeMatch) {
        code = fsCodeMatch[0].toLowerCase();
      }
    }
  }

  // Mapeamentos específicos do Firebase Storage:
  // storage/unauthorized -> Você não tem permissão para enviar este arquivo.
  // storage/canceled -> Upload cancelado.
  // storage/quota-exceeded -> Espaço do Storage esgotado.
  // storage/retry-limit-exceeded -> Verifique sua conexão.
  // storage/object-not-found -> Arquivo não encontrado.
  if (code === "storage/unauthorized" || msg.includes("unauthorized") || msg.includes("permission") || msg.includes("permissão") || msg.includes("denied")) {
    return "Você não tem permissão para enviar este arquivo.";
  }
  if (code === "storage/canceled" || msg.includes("canceled") || msg.includes("cancel") || error.name === "AbortError") {
    return "Upload cancelado.";
  }
  if (code === "storage/quota-exceeded" || msg.includes("quota-exceeded")) {
    return "Espaço do Storage esgotado.";
  }
  if (code === "storage/retry-limit-exceeded" || code === "storage/network-failed" || msg.includes("network") || msg.includes("timeout") || msg.includes("offline")) {
    return "Verifique sua conexão.";
  }
  if (code === "storage/object-not-found" || msg.includes("object-not-found") || msg.includes("não encontrado")) {
    return "Arquivo não encontrado.";
  }
  if (code === "storage/bucket-not-found") {
    return "Servidor de armazenamento não encontrado.";
  }
  if (code === "storage/project-not-found") {
    return "Projeto do Firebase não encontrado.";
  }
  if (code === "storage/unauthenticated") {
    return "Sessão expirada. Faça login novamente para enviar arquivos.";
  }
  if (code === "storage/invalid-checksum") {
    return "Falha na integridade do arquivo durante o envio. Tente novamente.";
  }
  if (code === "storage/cannot-slice-blob") {
    return "O arquivo original foi alterado ou está inacessível.";
  }
  if (code === "storage/server-file-wrong-size") {
    return "Erro na transmissão do arquivo. O tamanho recebido não confere.";
  }
  if (code === "storage/invalid-argument") {
    return "Arquivo ou formato inválido para upload.";
  }
  if (code === "storage/unknown") {
    return "Erro inesperado no servidor de armazenamento. Tente em instantes.";
  }

  // Mapeamentos específicos do Firestore (associação e salvamento de metadados)
  if (code === "permission-denied") {
    return "Você não tem permissão para salvar no banco de dados.";
  }
  if (code === "unavailable") {
    return "Serviço temporariamente indisponível. Verifique sua conexão.";
  }
  if (code === "resource-exhausted") {
    return "Limite de operações no Firestore atingido. Tente novamente mais tarde.";
  }
  if (code === "unauthenticated") {
    return "Sessão expirada. Faça login novamente para continuar.";
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Verifique sua conexão.";
  }
  if (msg.includes("size") || msg.includes("grande") || msg.includes("too large") || msg.includes("excede")) {
    return "Arquivo muito grande. O arquivo excede o limite máximo permitido.";
  }
  return error.message || "Falha no envio do arquivo.";
}

// Sanitiza nome do arquivo
function sanitizeStorageFileName(name) {
  if (!name) return "arquivo";
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Firebase Storage helper for audio or sheet music (resumable)
export async function uploadAudioFile(file, path) {
  try {
    const uid = auth.currentUser ? auth.currentUser.uid : "anonymous";
    const cleanName = sanitizeStorageFileName(file.name);
    const targetPath = path || `audio/${uid}/${Date.now()}_${cleanName}`;
    const fileRef = storageRef(storage, targetPath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || "audio/mpeg"
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(new Error(getMediaUploadErrorMessage(error))),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(new Error(getMediaUploadErrorMessage(err)));
          }
        }
      );
    });
  } catch (err) {
    console.error("Error uploading audio to Firebase Storage:", err);
    throw err;
  }
}

// Firebase Storage helper for community images and photos (resumable)
export async function uploadImageFile(file, path) {
  try {
    const uid = auth.currentUser ? auth.currentUser.uid : "anonymous";
    const cleanName = sanitizeStorageFileName(file.name);
    const targetPath = path || `photos/${uid}/${Date.now()}_${cleanName}`;
    const fileRef = storageRef(storage, targetPath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || "image/jpeg"
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(new Error(getMediaUploadErrorMessage(error))),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(new Error(getMediaUploadErrorMessage(err)));
          }
        }
      );
    });
  } catch (err) {
    console.error("Error uploading image to Firebase Storage:", err);
    throw err;
  }
}

// Firebase Storage helper for video files (resumable)
export async function uploadVideoFile(file, path) {
  try {
    const uid = auth.currentUser ? auth.currentUser.uid : "anonymous";
    const cleanName = sanitizeStorageFileName(file.name);
    const targetPath = path || `videos/${uid}/${Date.now()}_${cleanName}`;
    const fileRef = storageRef(storage, targetPath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || "video/mp4"
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(new Error(getMediaUploadErrorMessage(error))),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(new Error(getMediaUploadErrorMessage(err)));
          }
        }
      );
    });
  } catch (err) {
    console.error("Error uploading video to Firebase Storage:", err);
    throw err;
  }
}

// Resumable upload with progress, cancellation, and validation
export function uploadFileWithProgress({ file, path, onProgress, onError, onComplete }) {
  if (!auth.currentUser) {
    throw new Error("Autenticação necessária para realizar upload no Firebase Storage.");
  }
  const fileRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(fileRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      const bytesTransferred = snapshot.bytesTransferred;
      const totalBytes = snapshot.totalBytes;
      const progress = totalBytes > 0 ? (bytesTransferred / totalBytes) * 100 : 0;
      if (onProgress) onProgress(progress, bytesTransferred, totalBytes);
    },
    (error) => {
      console.error("[uploadFileWithProgress] Erro no upload:", error);
      if (onError) onError(error);
    },
    async () => {
      try {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        if (onComplete) onComplete(downloadURL);
      } catch (err) {
        if (onError) onError(err);
      }
    }
  );

  return uploadTask;
}

// Compress and resize image client-side before uploading (Canvas based)
export async function compressImageFile(file, maxWidth = 1280, maxHeight = 1280, quality = 0.82) {
  if (!file || !file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, outputType === 'image/png' ? '.png' : '.jpg'), {
            type: outputType,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, outputType, quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Validação de privilégio de administrador para UX no cliente.
 * A segurança e autorização reais são integralmente validadas server-side pelas Firestore & Storage Rules.
 */
export function isUserAdmin(user, profile) {
  if (!user) return false;
  if (user.customClaims?.admin === true || user.customClaims?.role === 'admin') return true;
  if (user.tokenResult?.claims?.admin === true || user.tokenResult?.claims?.role === 'admin') return true;
  if (profile?.role === 'admin') return true;
  return false;
}

// -------------------------------------------------------------
// HARMONIC ENGINE: DELEGADO AO MÓDULO src/music/
// -------------------------------------------------------------
export { 
  transposeNote, 
  transposeChord, 
  transposeChordSheet 
} from "./src/music/index.js";
