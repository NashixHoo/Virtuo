import React, { useState, useEffect } from 'react';
import { testConnection } from './firebase';
import { Song, DEMO_SONGS } from './music/demo-songs';
import { SongsRepository } from './services/songs-repository';
import { UserProvider, useUser } from './context/UserProvider';

import { Header } from './components/Header';
import { Tabbar } from './components/Tabbar';
import { DaviAiModal } from './components/DaviAiModal';

import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SongDetailScreen } from './screens/SongDetailScreen';
import { LiveStageScreen } from './screens/LiveStageScreen';
import { BandScreen } from './screens/BandScreen';
import { EnsaioScreen } from './screens/EnsaioScreen';
import { ComunidadeScreen } from './screens/ComunidadeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TunerScreen } from './screens/TunerScreen';
import { VocalScreen } from './screens/VocalScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { CoachScreen } from './screens/CoachScreen';
import { MinisterScreen } from './screens/MinisterScreen';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [songs, setSongs] = useState<Song[]>(DEMO_SONGS);
  const [activeSong, setActiveSong] = useState<Song | null>(DEMO_SONGS[0]);
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; message: string }>({
    connected: true,
    message: 'Conectando ao Firebase...'
  });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Centralized user profile & auth from UserProvider context
  const { currentUser, userProfile, refreshProfile } = useUser();

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

  // Firestore connection status check
  useEffect(() => {
    testConnection().then((res) => {
      setFirebaseStatus({ connected: res.ok, message: res.message });
    });
  }, []);

  // Load songs from repository
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
            onRefreshUser={refreshProfile}
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
      </main>

      {/* Tabbar Navigation */}
      <Tabbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Davi AI Modal */}
      <DaviAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeSong={activeSong}
        currentKey={activeSong?.originalKey || 'G'}
        bpm={activeSong?.bpm || 74}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
