import React, { Suspense, lazy, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, testConnection, syncUserProfile } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Song, DEMO_SONGS } from './music/demo-songs.ts';
import { SongsRepository } from './services/songs-repository';

import { Header } from './components/Header';
import { Tabbar } from './components/Tabbar';

const DaviAiModal = lazy(() => import('./components/DaviAiModal').then(module => ({ default: module.DaviAiModal })));
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(module => ({ default: module.HomeScreen })));
const LibraryScreen = lazy(() => import('./screens/LibraryScreen').then(module => ({ default: module.LibraryScreen })));
const SongDetailScreen = lazy(() => import('./screens/SongDetailScreen').then(module => ({ default: module.SongDetailScreen })));
const LiveStageScreen = lazy(() => import('./screens/LiveStageScreen').then(module => ({ default: module.LiveStageScreen })));
const BandScreen = lazy(() => import('./screens/BandScreen').then(module => ({ default: module.BandScreen })));
const EnsaioScreen = lazy(() => import('./screens/EnsaioScreen').then(module => ({ default: module.EnsaioScreen })));
const ComunidadeScreen = lazy(() => import('./screens/ComunidadeScreen').then(module => ({ default: module.ComunidadeScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then(module => ({ default: module.ProfileScreen })));
const TunerScreen = lazy(() => import('./screens/TunerScreen').then(module => ({ default: module.TunerScreen })));
const VocalScreen = lazy(() => import('./screens/VocalScreen').then(module => ({ default: module.VocalScreen })));
const AcademyScreen = lazy(() => import('./screens/AcademyScreen').then(module => ({ default: module.AcademyScreen })));
const CoachScreen = lazy(() => import('./screens/CoachScreen').then(module => ({ default: module.CoachScreen })));
const MinisterScreen = lazy(() => import('./screens/MinisterScreen').then(module => ({ default: module.MinisterScreen })));
const DiagnosticsScreen = lazy(() => import('./screens/DiagnosticsScreen').then(module => ({ default: module.DiagnosticsScreen })));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen').then(module => ({ default: module.NotificationsScreen })));

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>(DEMO_SONGS);
  const [activeSong, setActiveSong] = useState<Song | null>(DEMO_SONGS[0]);
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Verificando conexão com o Firebase...'
  });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Ensaio Geral Agendado',
      message: 'O ensaio geral da equipe de adoração está marcado para sábado às 19:30.',
      time: 'Há 1 hora',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Davi AI • Nova Sugestão de Arranjo',
      message: 'Arranjo worship contemporâneo gerado para "Bondade de Deus" no tom de G.',
      time: 'Há 3 horas',
      read: true
    }
  ]);

  // Auth state listener and Firestore connection check
  useEffect(() => {
    testConnection().then((res) => {
      setFirebaseStatus({ connected: res.ok, message: res.message });
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        loadSongs();
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            const synced = await syncUserProfile(user);
            setUserProfile(synced);
          }
        } catch (e) {
          console.warn('Erro ao carregar perfil do usuário:', e);
        }
      } else {
        setUserProfile(null);
        loadSongs();
      }
    });

    return () => unsubscribe();
  }, []);

  // Load songs on boot
  const loadSongs = async () => {
    try {
      const allSongs = await SongsRepository.getAllSongs();
      setSongs(allSongs);
      if (allSongs.length > 0 && !activeSong) {
        setActiveSong(allSongs[0]);
      }
    } catch (e) {
      console.warn('Erro ao carregar músicas:', e);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const handleOpenSong = (song: Song) => {
    setActiveSong(song);
    setCurrentScreen('songDetail');
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="virtuo-app-root">
      {/* Background Layers */}
      <div className={`background screen-${currentScreen}`}></div>
      <div className="virtuo-aura-ambient" aria-hidden="true">
        <div className="virtuo-aura-mist"></div>
        <div className="virtuo-aura-beams"></div>
      </div>
      <div id="virtuo-fixed-horizon-glow" className="virtuo-fixed-horizon-glow" aria-hidden="true"></div>

      {/* Header */}
      <Header
        onNavigate={(screen) => setCurrentScreen(screen)}
        onOpenAi={() => setIsAiModalOpen(true)}
        onOpenNotifications={() => setCurrentScreen('notifications')}
        unreadNotifications={unreadNotifications}
        currentUser={currentUser}
        userProfile={userProfile}
      />

      {/* Main Content Area */}
      <main id="app" className="screen-transition-enter">
        <Suspense fallback={<div role="status" aria-live="polite">Carregando tela...</div>}>
        {currentScreen === 'home' && (
          <HomeScreen
            currentUser={currentUser}
            userProfile={userProfile}
            lastOpenedSong={activeSong}
            firebaseStatus={firebaseStatus}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenSong={handleOpenSong}
            onOpenAi={() => setIsAiModalOpen(true)}
          />
        )}

        {currentScreen === 'library' && (
          <LibraryScreen
            songs={songs}
            onOpenSong={handleOpenSong}
            onRefreshSongs={loadSongs}
            onOpenAi={() => setIsAiModalOpen(true)}
          />
        )}

        {currentScreen === 'songDetail' && activeSong && (
          <SongDetailScreen
            song={activeSong}
            onBack={() => setCurrentScreen('library')}
            onOpenMinister={() => setCurrentScreen('minister')}
            onOpenEnsaio={() => setCurrentScreen('ensaio')}
            onOpenMetronome={() => setCurrentScreen('band')}
            onOpenAiForSong={() => setIsAiModalOpen(true)}
            onSongDeleted={() => {
              loadSongs();
              setCurrentScreen('library');
            }}
          />
        )}

        {currentScreen === 'live' && (
          <LiveStageScreen
            songs={songs}
            activeSong={activeSong}
            onSelectSong={(s) => setActiveSong(s)}
            onExit={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'band' && <BandScreen />}

        {currentScreen === 'ensaio' && (
          <EnsaioScreen
            songs={songs}
            onOpenSong={handleOpenSong}
            onOpenLive={() => setCurrentScreen('live')}
          />
        )}

        {currentScreen === 'comunidade' && (
          <ComunidadeScreen
            currentUser={currentUser}
            userProfile={userProfile}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            userProfile={userProfile}
            onRefreshUser={async () => {
              if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                setUserProfile(userDoc.data());
              }
            }}
            onOpenAi={() => setIsAiModalOpen(true)}
          />
        )}

        {currentScreen === 'tuner' && <TunerScreen />}

        {currentScreen === 'vocal' && <VocalScreen />}

        {currentScreen === 'academy' && <AcademyScreen />}

        {currentScreen === 'coach' && <CoachScreen />}

        {currentScreen === 'minister' && (
          <MinisterScreen
            song={activeSong}
            onExit={() => setCurrentScreen(activeSong ? 'songDetail' : 'home')}
          />
        )}

        {currentScreen === 'diagnostics' && <DiagnosticsScreen />}

        {currentScreen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllAsRead={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
            onClearAll={() => setNotifications([])}
          />
        )}
        </Suspense>
      </main>

      {/* Tabbar Navigation */}
      <Tabbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Davi AI Modal */}
      {isAiModalOpen && (
        <Suspense fallback={null}>
          <DaviAiModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            activeSong={activeSong}
            currentKey={activeSong?.originalKey || 'G'}
            bpm={activeSong?.bpm || 74}
          />
        </Suspense>
      )}
    </div>
  );
};
