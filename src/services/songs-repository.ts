import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { Song, DEMO_SONGS } from '../music/demo-songs';

const OFFLINE_KEY = 'virtuo_offline_songs_cache_v2';

export const SongsRepository = {
  getOfflineSongs(): Song[] {
    try {
      const raw = localStorage.getItem(OFFLINE_KEY);
      if (!raw) return DEMO_SONGS;
      const list = JSON.parse(raw);
      return Array.isArray(list) && list.length > 0 ? list : DEMO_SONGS;
    } catch {
      return DEMO_SONGS;
    }
  },

  saveOfflineSongs(songs: Song[]) {
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(songs));
    } catch (e) {
      console.warn('Could not save offline songs cache', e);
    }
  },

  async getAllSongs(): Promise<Song[]> {
    try {
      const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        return this.getOfflineSongs();
      }
      const firestoreSongs: Song[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      // Merge with default demo songs if needed
      const ids = new Set(firestoreSongs.map(s => s.id));
      const titles = new Set(firestoreSongs.map(s => (s.title || '').toLowerCase()));
      const missingDemo = DEMO_SONGS.filter(d => !ids.has(d.id) && !titles.has(d.title.toLowerCase()));
      const combined = [...firestoreSongs, ...missingDemo];
      this.saveOfflineSongs(combined);
      return combined;
    } catch (err) {
      console.warn('Firestore offline or permission denied, using cached songs:', err);
      return this.getOfflineSongs();
    }
  },

  async addSong(song: Omit<Song, 'id'>): Promise<Song> {
    const payload = {
      ...song,
      createdBy: auth.currentUser?.uid || 'offline-user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, 'songs'), payload);
      const newSong = { id: docRef.id, ...payload };
      const current = this.getOfflineSongs();
      this.saveOfflineSongs([newSong as Song, ...current]);
      return newSong as Song;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'songs');
      const fallbackId = 'local-' + Date.now();
      const localSong = { id: fallbackId, ...payload } as Song;
      const current = this.getOfflineSongs();
      this.saveOfflineSongs([localSong, ...current]);
      return localSong;
    }
  },

  async updateSong(id: string, updates: Partial<Song>): Promise<void> {
    try {
      const docRef = doc(db, 'songs', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `songs/${id}`);
    }
    const current = this.getOfflineSongs().map(s => s.id === id ? { ...s, ...updates } : s);
    this.saveOfflineSongs(current);
  },

  async deleteSong(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'songs', id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `songs/${id}`);
    }
    const current = this.getOfflineSongs().filter(s => s.id !== id);
    this.saveOfflineSongs(current);
  }
};
