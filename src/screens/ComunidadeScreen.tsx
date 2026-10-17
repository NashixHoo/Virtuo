import React, { useState } from 'react';
import { User } from 'firebase/auth';

interface ComunidadeScreenProps {
  currentUser: User | null;
  userProfile: any;
}

export const ComunidadeScreen: React.FC<ComunidadeScreenProps> = ({
  currentUser,
  userProfile
}) => {
  const [subTab, setSubTab] = useState<'feed' | 'descobrir' | 'bandas'>('feed');
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([
    {
      id: 'p-1',
      author: 'Gabriel Santos',
      role: 'Guitarrista',
      band: 'Ministério Aliança',
      isCelestial: true,
      time: 'Há 2 horas',
      content: 'Acabei de passar "Bondade de Deus" no tom de G com a equipe! O Easy Play no Virtuo ajudou demais o nosso violonista iniciante a pegar a levada sem pestana pesada.',
      likes: 14,
      comments: 3
    },
    {
      id: 'p-2',
      author: 'Débora Lima',
      role: 'Ministra de Louvor',
      band: 'Comunidade da Fé',
      isCelestial: false,
      time: 'Há 5 horas',
      content: 'Dica do Diretor Musical Davi para a música "A Casa É Sua": comecem apenas com teclado em pad suave e violão arpejado. O clímax no refrão final fica espetacular!',
      likes: 28,
      comments: 7
    }
  ]);

  const [bands, setBands] = useState([
    { id: 'b-1', name: 'Ministério Aliança', style: 'Worship Congregacional', membersCount: 6, leader: 'Gabriel Santos' },
    { id: 'b-2', name: 'Geração Eleita Worship', style: 'Pop Rock Adoração', membersCount: 5, leader: 'Mateus Oliveira' }
  ]);

  const [isCreateBandOpen, setIsCreateBandOpen] = useState(false);
  const [newBandName, setNewBandName] = useState('');
  const [newBandStyle, setNewBandStyle] = useState('Worship Congregacional');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    const newPost = {
      id: 'p-' + Date.now(),
      author: userProfile?.displayName || currentUser?.displayName || 'Músico Virtuoso',
      role: (userProfile?.instruments && userProfile.instruments[0]) || 'Músico',
      band: userProfile?.currentBand || 'Solo / Convidado',
      isCelestial: !!(userProfile?.isCelestial || localStorage.getItem('virtuo_celestial_member') === 'true'),
      time: 'Agora mesmo',
      content: postText.trim(),
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setPostText('');
  };

  const handleLike = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleCreateBand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBandName.trim()) return;
    setBands([
      ...bands,
      {
        id: 'b-' + Date.now(),
        name: newBandName.trim(),
        style: newBandStyle,
        membersCount: 1,
        leader: userProfile?.displayName || currentUser?.displayName || 'Líder'
      }
    ]);
    setIsCreateBandOpen(false);
    setNewBandName('');
  };

  return (
    <div className="comunidade-screen-container">
      {/* Subtab navigation */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px', 
          background: 'rgba(12,24,43,0.6)', 
          padding: '6px', 
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)' 
        }}
      >
        <button
          className={`button ${subTab === 'feed' ? 'primary' : 'secondary'}`}
          onClick={() => setSubTab('feed')}
          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
        >
          📰 Feed de Louvor
        </button>
        <button
          className={`button ${subTab === 'bandas' ? 'primary' : 'secondary'}`}
          onClick={() => setSubTab('bandas')}
          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
        >
          🎸 Bandas & Ministérios
        </button>
        <button
          className={`button ${subTab === 'descobrir' ? 'primary' : 'secondary'}`}
          onClick={() => setSubTab('descobrir')}
          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
        >
          🔍 Descobrir Músicos
        </button>
      </div>

      {subTab === 'feed' && (
        <>
          {/* Post Creator */}
          <section className="glass" style={{ marginBottom: '18px' }}>
            <span className="pill">COMPARTILHAR COM A COMUNIDADE</span>
            <form onSubmit={handleCreatePost} style={{ marginTop: '12px' }}>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Compartilhe dicas de ensaio, arranjos, dúvidas de harmonia ou testemunhos de palco..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="button primary" style={{ padding: '8px 20px', fontSize: '12px' }}>
                  Publicar no Feed
                </button>
              </div>
            </form>
          </section>

          {/* Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {posts.map((post) => (
              <div key={post.id} className="glass" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '50%', 
                        background: 'rgba(126,231,255,0.15)', 
                        border: '1px solid rgba(126,231,255,0.3)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#7EE7FF',
                        fontWeight: 700
                      }}
                    >
                      {post.author[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>{post.author}</strong>
                        {post.isCelestial && (
                          <span className="badge-celestial" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            ✦ CELESTIAL
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {post.role} • {post.band} • {post.time}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  {post.content}
                </p>

                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <button 
                    className="tag-btn" 
                    onClick={() => handleLike(post.id)}
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ❤️ {post.likes} Curtidas
                  </button>
                  <button 
                    className="tag-btn" 
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    💬 {post.comments} Comentários
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {subTab === 'bandas' && (
        <section className="glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span className="pill">EQUIPES & MINISTÉRIOS</span>
              <h3 style={{ margin: '6px 0 0', fontSize: '20px' }}>Bandas Cadastradas</h3>
            </div>
            <button className="button primary" onClick={() => setIsCreateBandOpen(true)} style={{ padding: '6px 14px', fontSize: '12px' }}>
              + Criar Banda
            </button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {bands.map((b) => (
              <div key={b.id} className="tile" style={{ padding: '16px' }}>
                <div className="icon">🎸</div>
                <h3>{b.name}</h3>
                <p>{b.style}</p>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#7EE7FF' }}>
                  👥 {b.membersCount} integrantes • Líder: {b.leader}
                </div>
              </div>
            ))}
          </div>

          {isCreateBandOpen && (
            <div className="rehearsal-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateBandOpen(false); }}>
              <div className="rehearsal-modal-card" style={{ maxWidth: '440px', width: '92%' }}>
                <div className="modal-header">
                  <span className="badge-celestial">NOVA BANDA</span>
                  <button type="button" className="modal-close-btn" onClick={() => setIsCreateBandOpen(false)}>✕</button>
                </div>
                <h3 style={{ marginTop: '10px', fontSize: '18px', color: '#fff' }}>Cadastrar Banda ou Ministério</h3>
                <form onSubmit={handleCreateBand} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nome da Banda *</label>
                    <input type="text" className="form-input" placeholder="Ex: Ministério Aliança" value={newBandName} onChange={(e) => setNewBandName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Estilo Musical</label>
                    <input type="text" className="form-input" value={newBandStyle} onChange={(e) => setNewBandStyle(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button type="button" className="button secondary" onClick={() => setIsCreateBandOpen(false)}>Cancelar</button>
                    <button type="submit" className="button primary">Criar Banda</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {subTab === 'descobrir' && (
        <section className="glass">
          <span className="pill">DESCOBRIR MÚSICOS</span>
          <h3 style={{ margin: '8px 0 14px', fontSize: '20px' }}>Instrumentistas por Categoria</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {['Guitarra', 'Violão', 'Teclado', 'Baixo', 'Bateria', 'Vocal', 'Sax'].map((inst) => (
              <div key={inst} className="tile" style={{ textAlign: 'center', padding: '14px' }}>
                <div className="icon">🎵</div>
                <strong style={{ fontSize: '13px', color: '#F8FAFC' }}>{inst}</strong>
                <p style={{ fontSize: '10px', color: '#7EE7FF', margin: '4px 0 0' }}>Ver Músicos</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
