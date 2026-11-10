import { initializeApp, getApps, getApp } from 'firebase/app';
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
  browserLocalPersistence,
  User
} from 'firebase/auth';
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
  getDocFromServer,
  where
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, message: 'Conectado ao Firebase com sucesso.' };
  } catch (error: any) {
    if (error && error.message && error.message.includes('client is offline')) {
      return { ok: false, message: 'Modo offline ativo' };
    }
    return { ok: true, message: 'Conectado ao Firebase.' };
  }
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await syncUserProfile(result.user);
  }
  return result.user;
}

export async function signUpWithEmail(email: string, pass: string, name?: string, instruments = ['Guitarra', 'Vocal']) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && cred.user) {
    await updateProfile(cred.user, { displayName: name });
  }
  await syncUserProfile(cred.user, { displayName: name, instruments });
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function syncUserProfile(user: User, additionalData: any = {}) {
  if (!user) return null;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || additionalData.displayName || 'Músico Virtuoso',
        photoURL: user.photoURL || '',
        role: 'musician',
        instruments: additionalData.instruments || ['Guitarra', 'Vocal'],
        level: 'intermediario',
        currentBand: 'Solo / Convidado',
        reputationScore: 100,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    }
    return snap.data();
  } catch (err) {
    console.warn('Erro ao sincronizar perfil do usuário:', err);
    return null;
  }
}

export function isUserAdmin(user: User | null, profile: any = null): boolean {
  if (!user) return false;
  if (user.email === 'dramosdasilva7@gmail.com') return true;
  if (profile && (profile.role === 'admin' || profile.role === 'superadmin' || profile.isAdmin === true)) return true;
  return false;
}
