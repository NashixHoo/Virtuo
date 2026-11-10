import React from 'react';
import { User } from 'firebase/auth';

interface HeaderProps {
  onNavigate: (screen: string) => void;
  onOpenAi: () => void;
  onOpenNotifications: () => void;
  unreadNotifications: number;
  currentUser: User | null;
  userProfile: any;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenAi,
  onOpenNotifications,
  unreadNotifications,
  currentUser,
  userProfile
}) => {
  const avatarLetter = (userProfile?.displayName || currentUser?.displayName || currentUser?.email || '✦')[0].toUpperCase();

  return (
    <header>
      <div 
        className="virtuo-horizon" 
        style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', touchAction: 'manipulation' }} 
        onClick={() => onNavigate('home')} 
        title="Virtuo • Ir para Início"
      >
        <div 
          className="virtuo-logo-glow" 
          style={{ width: '44px', height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
          <img 
            src="/assets/branding/logo/logo-principal.svg" 
            alt="Virtuo Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
          />
        </div>

        <div style={{ pointerEvents: 'none' }}>
          <h1 style={{ margin: '2px 0 2px', fontSize: '28px', letterSpacing: '4px', lineHeight: 1.1 }}>VIRTUO</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#A9BDD8' }}>A plataforma do músico virtuoso</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          className="ai-header-btn" 
          onClick={onOpenAi} 
          title="Davi • Diretor Musical"
        >
          <span style={{ fontSize: '15px' }}>🎼</span>
          <span style={{ fontSize: '11px', fontWeight: 700 }}>Davi</span>
        </button>

        <button 
          className="ai-header-btn" 
          onClick={onOpenNotifications} 
          title="Notificações e Alertas"
          style={{ position: 'relative', width: '38px', padding: 0, justifyContent: 'center' }}
        >
          <span style={{ fontSize: '16px' }}>🔔</span>
          {unreadNotifications > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid #07101F'
              }}
            />
          )}
        </button>

        <div 
          className="avatar" 
          onClick={() => onNavigate('profile')} 
          style={{ cursor: 'pointer' }} 
          title="Meu Perfil"
        >
          {currentUser?.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
            />
          ) : (
            avatarLetter
          )}
        </div>
      </div>
    </header>
  );
};
