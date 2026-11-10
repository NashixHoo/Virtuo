import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, syncUserProfile, isUserAdmin } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  instruments?: string[];
  level?: string;
  currentBand?: string;
  reputationScore?: number;
  isCelestial?: boolean;
  isAdmin?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface UserContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isCelestial: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  loginGoogle: () => Promise<User | null>;
  loginEmail: (email: string, pass: string) => Promise<User | null>;
  signUpEmail: (email: string, pass: string, name?: string, instruments?: string[]) => Promise<User | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time synchronization of authentication state and user profile
  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError(null);

      // Clean up previous Firestore listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          
          // Subscribe to real-time updates for dynamic profile sync
          unsubscribeSnapshot = onSnapshot(
            userRef,
            async (snapshot) => {
              if (snapshot.exists()) {
                setUserProfile(snapshot.data() as UserProfile);
              } else {
                // Initialize default profile if it doesn't exist
                const initialProfile = await syncUserProfile(user);
                if (initialProfile) {
                  setUserProfile(initialProfile as UserProfile);
                }
              }
              setLoading(false);
            },
            (err) => {
              console.warn('Real-time profile sync error:', err);
              // Fallback to local profile or one-time getDoc
              getDoc(userRef)
                .then((snap) => {
                  if (snap.exists()) {
                    setUserProfile(snap.data() as UserProfile);
                  }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
            }
          );
        } catch (err: any) {
          console.warn('Error setting up user listener:', err);
          setError(err.message || 'Erro ao sincronizar perfil');
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    } catch (err: any) {
      console.warn('Error refreshing profile:', err);
      setError(err.message || 'Falha ao atualizar perfil');
    }
  }, [currentUser]);

  const updateProfileData = useCallback(async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    const userRef = doc(db, 'users', currentUser.uid);
    const updatedPayload = {
      ...data,
      updatedAt: serverTimestamp()
    };
    await updateDoc(userRef, updatedPayload);
    // Real-time snapshot will automatically update userProfile state
  }, [currentUser]);

  const loginGoogle = useCallback(async (): Promise<User | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
      return result.user;
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar com Google');
      throw err;
    }
  }, []);

  const loginEmail = useCallback(async (email: string, pass: string): Promise<User | null> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return cred.user;
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar com e-mail');
      throw err;
    }
  }, []);

  const signUpEmail = useCallback(async (
    email: string, 
    pass: string, 
    name?: string, 
    instruments: string[] = ['Guitarra', 'Vocal']
  ): Promise<User | null> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
      await syncUserProfile(cred.user, { displayName: name, instruments });
      return cred.user;
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar com e-mail');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const isAdmin = isUserAdmin(currentUser, userProfile);
  const isCelestial = Boolean(
    userProfile?.isCelestial || 
    userProfile?.celestialMember || 
    localStorage.getItem('virtuo_celestial_member') === 'true'
  );

  const value: UserContextType = {
    currentUser,
    userProfile,
    loading,
    error,
    isAdmin,
    isCelestial,
    refreshProfile,
    updateProfileData,
    loginGoogle,
    loginEmail,
    signUpEmail,
    logout,
    resetPassword
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export { UserContext };
