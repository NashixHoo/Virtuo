import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  loginWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  sendPasswordReset, 
  logoutUser 
} from '../firebase';
import { playStartupChime } from '../utils/audio-engine';

interface ProfileScreenProps {
  currentUser: User | null;
  userProfile: any;
  onRefreshUser: () => Promise<void>;
  onOpenAi: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  userProfile,
  onRefreshUser,
  onOpenAi
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authFeedback, setAuthFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isStartupSoundEnabled, setIsStartupSoundEnabled] = useState(
    localStorage.getItem('virtuo_startup_sound') !== 'false'
  );

  const isCelestial = !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true');
  const availableInstruments = ['Guitarra', 'Violão', 'Teclado', 'Baixo', 'Bateria', 'Vocal', 'Sax'];
  const userInstruments: string[] = userProfile?.instruments || ['Guitarra', 'Vocal'];

  const handleGoogleLogin = async () => {
    try {
      setAuthFeedback({ text: 'Conectando ao Google...', type: 'success' });
      await loginWithGoogle();
      await onRefreshUser();
      setAuthFeedback({ text: 'Login realizado com sucesso!', type: 'success' });
    } catch (err: any) {
      setAuthFeedback({ text: err.message || 'Erro ao conectar com Google.', type: 'error' });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthFeedback({ text: 'Preencha e-mail e senha.', type: 'error' });
      return;
    }
    try {
      await signInWithEmail(email, password);
      await onRefreshUser();
      setAuthFeedback({ text: 'Login com e-mail realizado!', type: 'success' });
    } catch (err: any) {
      setAuthFeedback({ text: err.message || 'E-mail ou senha inválidos.', type: 'error' });
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || password.length < 6) {
      setAuthFeedback({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    try {
      await signUpWithEmail(email, password, name);
      await onRefreshUser();
      setAuthFeedback({ text: 'Conta criada e perfil sincronizado!', type: 'success' });
    } catch (err: any) {
      setAuthFeedback({ text: err.message || 'Erro ao criar conta.', type: 'error' });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthFeedback({ text: 'Informe seu e-mail.', type: 'error' });
      return;
    }
    try {
      await sendPasswordReset(email);
      setAuthFeedback({ text: `Link enviado para ${email}! Verifique a caixa de entrada.`, type: 'success' });
    } catch (err: any) {
      setAuthFeedback({ text: err.message || 'Erro ao enviar link de recuperação.', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    await onRefreshUser();
    setAuthFeedback({ text: 'Sessão encerrada com sucesso.', type: 'success' });
  };

  const activateCelestial = () => {
    localStorage.setItem('virtuo_celestial_member', 'true');
    setIsUpgradeModalOpen(false);
    alert('✦ Parabéns! Status de Membro Celestial ativado!');
    onRefreshUser();
  };

  const toggleStartupSound = () => {
    const next = !isStartupSoundEnabled;
    setIsStartupSoundEnabled(next);
    localStorage.setItem('virtuo_startup_sound', String(next));
  };

  return (
    <div className="profile-screen-container">
      <section className="glass">
        {/* Avatar and basic info */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              margin: '0 auto 12px', 
              borderRadius: '50%', 
              background: 'rgba(126,231,255,0.12)', 
              border: '2px solid #7EE7FF',
              display: 'grid',
              placeItems: 'center',
              fontSize: '36px',
              fontWeight: 800,
              color: '#7EE7FF',
              overflow: 'hidden'
            }}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (userProfile?.displayName || currentUser?.displayName || 'V')[0].toUpperCase()
            )}
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '24px', color: '#F8FAFC' }}>
            {userProfile?.displayName || currentUser?.displayName || 'Músico Virtuoso'}
          </h2>
          <p className="subtitle" style={{ margin: 0, fontSize: '13px' }}>
            {currentUser?.email || 'Conta Local / Offline'}
          </p>

          <div style={{ marginTop: '12px' }}>
            {isCelestial ? (
              <span className="badge-celestial" style={{ fontSize: '12px', padding: '6px 16px' }}>
                ✦ MEMBRO CELESTIAL ATIVO
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className="badge-free">MEMBRO GRATUITO</span>
                <button 
                  className="button primary" 
                  onClick={() => setIsUpgradeModalOpen(true)}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
                >
                  ✦ Tornar-se Membro Celestial
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reputation and stats */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div className="tile" style={{ textAlign: 'center', padding: '14px' }}>
            <div className="icon">⭐</div>
            <h3>{userProfile?.reputationScore || 100}</h3>
            <p>Reputação Musical</p>
          </div>
          <div className="tile" style={{ textAlign: 'center', padding: '14px' }}>
            <div className="icon">🎸</div>
            <h3>{userProfile?.currentBand || 'Ministério Virtuo'}</h3>
            <p>Banda Ativa</p>
          </div>
        </div>

        {/* Instruments chips */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#7EE7FF', display: 'block', marginBottom: '8px' }}>
            MEUS INSTRUMENTOS
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availableInstruments.map((inst) => {
              const isSelected = userInstruments.includes(inst);
              return (
                <span
                  key={inst}
                  className={`instrument-chip ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: 'default' }}
                >
                  {isSelected ? '✓ ' : ''} {inst}
                </span>
              );
            })}
          </div>
        </div>

        {/* Auth Section */}
        {currentUser ? (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#7EE7FF', fontWeight: 700 }}>SESSÃO FIREBASE ATIVA</span>
              <span className="pill" style={{ fontSize: '10px', color: '#4ade80' }}>🟢 Conectado</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
              UID: {currentUser.uid}
            </p>
            <button 
              className="button outline-danger" 
              onClick={handleLogout}
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              Encerrar Sessão
            </button>
          </div>
        ) : (
          <div style={{ padding: '18px', background: 'rgba(14,27,53,0.85)', borderRadius: '20px', border: '1px solid rgba(126,231,255,0.25)', marginBottom: '20px' }}>
            {/* Auth Tab Switcher */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[
                { id: 'login', label: 'Entrar' },
                { id: 'signup', label: 'Cadastrar' },
                { id: 'reset', label: 'Recuperar Senha' }
              ].map((t) => (
                <button
                  key={t.id}
                  className={`button ${authTab === t.id ? 'primary' : 'secondary'}`}
                  onClick={() => { setAuthTab(t.id as any); setAuthFeedback(null); }}
                  style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {authFeedback && (
              <div 
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  marginBottom: '12px',
                  background: authFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: authFeedback.type === 'success' ? '#4ade80' : '#f87171',
                  border: `1px solid ${authFeedback.type === 'success' ? '#22c55e' : '#ef4444'}`
                }}
              >
                {authFeedback.text}
              </div>
            )}

            {authTab === 'login' && (
              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Seu e-mail" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button type="submit" className="button primary" style={{ width: '100%', padding: '10px', marginTop: '4px' }}>
                  Entrar com E-mail
                </button>
              </form>
            )}

            {authTab === 'signup' && (
              <form onSubmit={handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Seu nome completo" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Seu e-mail" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Senha (mínimo 6 caracteres)" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button type="submit" className="button primary" style={{ width: '100%', padding: '10px', marginTop: '4px' }}>
                  Criar Conta
                </button>
              </form>
            )}

            {authTab === 'reset' && (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="E-mail cadastrado" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
                <button type="submit" className="button primary" style={{ width: '100%', padding: '10px', marginTop: '4px' }}>
                  Enviar Link de Recuperação
                </button>
              </form>
            )}

            <div className="divider-line" style={{ margin: '14px 0', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
              ou continue com
            </div>

            <button 
              className="button secondary" 
              onClick={handleGoogleLogin}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Conectar com Google
            </button>
          </div>
        )}

        {/* Settings: Audio & Chime */}
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#F8FAFC', display: 'block' }}>Som de Abertura (2.4s)</strong>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Acorde harmônico pad Web Audio sintetizado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="button secondary" onClick={playStartupChime} style={{ padding: '6px 10px', fontSize: '11px' }}>
                🔊 Testar
              </button>
              <button 
                className={`button ${isStartupSoundEnabled ? 'primary' : 'secondary'}`} 
                onClick={toggleStartupSound}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                {isStartupSoundEnabled ? 'Ligado' : 'Desligado'}
              </button>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        {isUpgradeModalOpen && (
          <div className="rehearsal-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsUpgradeModalOpen(false); }}>
            <div className="rehearsal-modal-card" style={{ maxWidth: '440px', width: '92%', borderColor: 'rgba(250,204,21,0.5)' }}>
              <div className="modal-header">
                <span className="badge-celestial">✦ PLANO CELESTIAL</span>
                <button type="button" className="modal-close-btn" onClick={() => setIsUpgradeModalOpen(false)}>✕</button>
              </div>
              <h3 style={{ marginTop: '10px', fontSize: '18px', color: '#fff' }}>Eleve sua Performance Musical</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.5' }}>
                O Membro Celestial é a experiência definitiva para instrumentistas, cantores e equipes de adoração.
              </p>
              <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                  <span style={{ color: '#fde047' }}>✓</span> Davi • Consultoria Harmônica ilimitada
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                  <span style={{ color: '#fde047' }}>✓</span> Multi-Track Band Synthesizer completo
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                  <span style={{ color: '#fde047' }}>✓</span> Selo Dourado Celestial no Feed
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                  <span style={{ color: '#fde047' }}>✓</span> Cifras e áudios ilimitados no Firestore
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="button secondary" onClick={() => setIsUpgradeModalOpen(false)}>Agora Não</button>
                <button 
                  type="button" 
                  className="button primary" 
                  onClick={activateCelestial}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                >
                  ✦ Ativar Status Celestial
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
