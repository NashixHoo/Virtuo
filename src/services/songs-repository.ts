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
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { Song, DEMO_SONGS } from '../music/demo-songs.ts';

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
      const publicSongsQuery = query(
        collection(db, 'songs'),
        where('status', '==', 'published'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc')
      );
      const snapshots = [await getDocs(publicSongsQuery)];
      if (auth.currentUser) {
        const ownSongsQuery = query(
          collection(db, 'songs'),
          where('createdBy', '==', auth.currentUser.uid)
        );
        snapshots.push(await getDocs(ownSongsQuery));
      }

      const songsById = new Map<string, Song>();
      for (const snapshot of snapshots) {
        for (const songDocument of snapshot.docs) {
          songsById.set(songDocument.id, {
            id: songDocument.id,
            ...(songDocument.data() as any)
          });
        }
      }

      const firestoreSongs = [...songsById.values()];
      if (firestoreSongs.length === 0) {
        return this.getOfflineSongs();
      }
      firestoreSongs.sort((left, right) => {
        const leftTime = left.createdAt?.toMillis?.() ?? 0;
        const rightTime = right.createdAt?.toMillis?.() ?? 0;
        return rightTime - leftTime;
      });
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
