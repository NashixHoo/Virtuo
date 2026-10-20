import React from 'react';
import { Song } from '../music/demo-songs';
import { User } from 'firebase/auth';

interface HomeScreenProps {
  currentUser: User | null;
  userProfile: any;
  lastOpenedSong: Song | null;
  firebaseStatus: { connected: boolean; message: string };
  onNavigate: (screen: string) => void;
  onOpenSong: (song: Song) => void;
  onOpenAi: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  userProfile,
  lastOpenedSong,
  firebaseStatus,
  onNavigate,
  onOpenSong,
  onOpenAi
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || 'Músico Virtuoso';
  const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');

  return (
    <div className="home-screen-container">
      {/* Greeting Glass Section */}
      <section className="glass" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="creator" style={{ fontSize: '11px', letterSpacing: '2px', color: '#7EE7FF', textTransform: 'uppercase' }}>
              ✦ Virtuo Worship Platform
            </span>
            <h2 style={{ margin: '6px 0 2px', fontSize: '26px', color: '#F8FAFC' }}>
              {getGreeting()}, {displayName}!
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#A9BDD8' }}>
              Pronto para tocar com excelência e harmonia no palco.
            </p>
          </div>
          {isCelestial && (
            <span className="badge-celestial" style={{ fontSize: '11px', padding: '4px 10px' }}>
              ✦ CELESTIAL
            </span>
          )}
        </div>
      </section>

      {/* Próxima Apresentação / Missão */}
      <section className="glass" style={{ marginBottom: '18px', borderLeft: '4px solid #7EE7FF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="pill" style={{ background: 'rgba(126,231,255,0.12)', color: '#7EE7FF', borderColor: 'rgba(126,231,255,0.3)' }}>
            AO VIVO • PALCO & MINISTRAÇÃO
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live Sync Sincronizado</span>
        </div>
        <h3 style={{ margin: '4px 0 6px', fontSize: '18px', color: '#fff' }}>
          Culto de Celebração & Adoração
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
          Repertório com cifras sincronizadas, transposição dinâmica e rolagem contínua para toda a banda.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="button primary" 
            onClick={() => onNavigate('live')}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
          >
            🎤 Abrir Modo Palco
          </button>
          <button 
            className="button secondary" 
            onClick={() => onNavigate('ensaio')}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            📋 Ver Repertório
          </button>
        </div>
      </section>

      {/* Último Louvor Aberto */}
      {lastOpenedSong && (
        <section className="glass" style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="pill">ÚLTIMO LOUVOR ABERTO</span>
            <span style={{ fontSize: '11px', color: '#7EE7FF' }}>Tom {lastOpenedSong.originalKey} • {lastOpenedSong.bpm} BPM</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: '18px', color: '#fff' }}>{lastOpenedSong.title}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{lastOpenedSong.artist}</p>
            </div>
            <button 
              className="button primary"
              onClick={() => onOpenSong(lastOpenedSong)}
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              🎵 Continuar Cifra
            </button>
          </div>
        </section>
      )}

      {/* Ferramentas Rápidas (Grid) */}
      <section className="glass" style={{ marginBottom: '18px' }}>
        <span className="pill" style={{ marginBottom: '12px' }}>FERRAMENTAS MUSICAIS DE PALCO</span>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginTop: '10px' }}>
          <div className="tile" onClick={onOpenAi} style={{ cursor: 'pointer' }}>
            <div className="icon">🎼</div>
            <h3 style={{ fontSize: '15px' }}>Davi AI</h3>
            <p style={{ fontSize: '11px' }}>Diretor Musical</p>
          </div>

          <div className="tile" onClick={() => onNavigate('tuner')} style={{ cursor: 'pointer' }}>
            <div className="icon">🎸</div>
            <h3 style={{ fontSize: '15px' }}>Afinador</h3>
            <p style={{ fontSize: '11px' }}>Cromático Preciso</p>
          </div>

          <div className="tile" onClick={() => onNavigate('vocal')} style={{ cursor: 'pointer' }}>
            <div className="icon">🎤</div>
            <h3 style={{ fontSize: '15px' }}>Vocal Pro</h3>
            <p style={{ fontSize: '11px' }}>Afinação & Treino</p>
          </div>

          <div className="tile" onClick={() => onNavigate('band')} style={{ cursor: 'pointer' }}>
            <div className="icon">🥁</div>
            <h3 style={{ fontSize: '15px' }}>Modo Banda</h3>
            <p style={{ fontSize: '11px' }}>Metrônomo & Synths</p>
          </div>

          <div className="tile" onClick={() => onNavigate('ensaio')} style={{ cursor: 'pointer' }}>
            <div className="icon">📋</div>
            <h3 style={{ fontSize: '15px' }}>Ensaios</h3>
            <p style={{ fontSize: '11px' }}>Sessões e Setlists</p>
          </div>

          <div className="tile" onClick={() => onNavigate('academy')} style={{ cursor: 'pointer' }}>
            <div className="icon">🎓</div>
            <h3 style={{ fontSize: '15px' }}>Academy</h3>
            <p style={{ fontSize: '11px' }}>Solfejo & Teoria</p>
          </div>

          <div className="tile" onClick={() => onNavigate('coach')} style={{ cursor: 'pointer' }}>
            <div className="icon">⚡</div>
            <h3 style={{ fontSize: '15px' }}>Coach</h3>
            <p style={{ fontSize: '11px' }}>Transição de Acordes</p>
          </div>

          <div className="tile" onClick={() => onNavigate('diagnostics')} style={{ cursor: 'pointer' }}>
            <div className="icon">📊</div>
            <h3 style={{ fontSize: '15px' }}>Saúde</h3>
            <p style={{ fontSize: '11px' }}>Diagnósticos do App</p>
          </div>
        </div>
      </section>

      {/* Status da Infraestrutura */}
      <section className="glass" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#7EE7FF', fontWeight: 700 }}>CLUSTERS & CONEXÃO</span>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#A9BDD8' }}>
              Firebase: <strong>virtuo-7e01b</strong> ({firebaseStatus.connected ? '🟢 Conectado' : `🟡 ${firebaseStatus.message}`})
            </p>
          </div>
          <button 
            className="button secondary" 
            onClick={() => onNavigate('profile')} 
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            Gerenciar
          </button>
        </div>
      </section>
    </div>
  );
};
