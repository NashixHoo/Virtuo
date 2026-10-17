import React, { useState } from 'react';
import { Song } from '../music/demo-songs';

interface EnsaioScreenProps {
  songs: Song[];
  onOpenSong: (song: Song) => void;
  onOpenLive: () => void;
}

export const EnsaioScreen: React.FC<EnsaioScreenProps> = ({
  songs,
  onOpenSong,
  onOpenLive
}) => {
  const [rehearsals, setRehearsals] = useState([
    {
      id: 'ens-1',
      title: 'Ensaio Geral • Culto de Adoração',
      date: 'Sábado • 19:30',
      venue: 'Templo Central / Palco Principal',
      leader: 'Ministério Aliança',
      songIds: ['bondade-de-deus', 'ousado-amor', 'a-casa-e-sua']
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newVenue, setNewVenue] = useState('Palco Principal');

  const handleCreateRehearsal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newEnsaio = {
      id: 'ens-' + Date.now(),
      title: newTitle.trim(),
      date: newDate.trim() || 'Data a definir',
      venue: newVenue.trim() || 'Palco Principal',
      leader: 'Ministério Virtuo',
      songIds: songs.slice(0, 3).map(s => s.id)
    };
    setRehearsals([newEnsaio, ...rehearsals]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDate('');
  };

  return (
    <div className="ensaio-screen-container">
      <section className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span className="pill">SESSÕES DE ENSAIO & REPERTÓRIO</span>
            <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Ensaios da Equipe</h2>
            <p className="subtitle" style={{ margin: 0 }}>
              Planejamento de repertório, alinhamento musical e dinâmica de palco.
            </p>
          </div>
          <button 
            className="button primary" 
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            + Novo Ensaio
          </button>
        </div>

        {/* Rehearsals list */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rehearsals.map((ens) => {
            const setlistSongs = songs.filter(s => ens.songIds.includes(s.id));
            return (
              <div 
                key={ens.id}
                style={{
                  background: 'rgba(5, 12, 24, 0.75)',
                  border: '1px solid rgba(126,231,255,0.25)',
                  borderRadius: '20px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="pill" style={{ background: 'rgba(126,231,255,0.1)', color: '#7EE7FF' }}>
                      {ens.date}
                    </span>
                    <h3 style={{ margin: '8px 0 4px', fontSize: '20px', color: '#F8FAFC' }}>{ens.title}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                      📍 {ens.venue} • Líder: {ens.leader}
                    </p>
                  </div>
                  <button 
                    className="button primary"
                    onClick={onOpenLive}
                    style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 700 }}
                  >
                    ▶ Iniciar no Modo Palco
                  </button>
                </div>

                {/* Setlist songs */}
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7EE7FF', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Repertório Selecionado ({setlistSongs.length} músicas):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {setlistSongs.map((song, idx) => (
                      <div
                        key={song.id}
                        onClick={() => onOpenSong(song)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>#{idx + 1}</span>
                          <div>
                            <strong style={{ fontSize: '14px', color: '#fff' }}>{song.title}</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{song.artist}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pill" style={{ fontSize: '10px' }}>Tom {song.originalKey}</span>
                          <span style={{ fontSize: '11px', color: '#7EE7FF' }}>{song.bpm} BPM</span>
                          <span style={{ color: '#94a3b8', fontSize: '14px' }}>›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* New Rehearsal Modal */}
      {isModalOpen && (
        <div 
          className="rehearsal-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="rehearsal-modal-card" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <span className="badge-celestial">NOVO ENSAIO</span>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <h3 style={{ marginTop: '10px', fontSize: '18px', color: '#fff' }}>Agendar Sessão de Ensaio</h3>
            <form onSubmit={handleCreateRehearsal} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Título do Ensaio *</label>
                <input type="text" className="form-input" placeholder="Ex: Ensaio Quarta de Louvor" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Data e Horário</label>
                <input type="text" className="form-input" placeholder="Ex: Sexta • 20:00" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Local / Templo</label>
                <input type="text" className="form-input" value={newVenue} onChange={(e) => setNewVenue(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="button secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="button primary">Criar Ensaio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
