import React, { useState } from 'react';
import { Song } from '../music/demo-songs';
import { SongsRepository } from '../services/songs-repository';

interface LibraryScreenProps {
  songs: Song[];
  onOpenSong: (song: Song) => void;
  onRefreshSongs: () => Promise<void>;
  onOpenAi: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  songs,
  onOpenSong,
  onRefreshSongs
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [division, setDivision] = useState<'public' | 'private'>('public');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new song
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('G');
  const [bpm, setBpm] = useState(74);
  const [difficulty, setDifficulty] = useState('Fácil');
  const [capo, setCapo] = useState(0);
  const [structure, setStructure] = useState('Intro • Verso • Refrão • Final');
  const [chords, setChords] = useState('');
  const [easyChords, setEasyChords] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  const filteredSongs = songs.filter((s) => {
    if (division === 'private' && s.visibility !== 'private') return false;
    if (division === 'public' && s.visibility === 'private') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q) ||
      (s.composer || '').toLowerCase().includes(q) ||
      (s.originalKey || '').toLowerCase() === q ||
      (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  });

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor, informe o título da música.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SongsRepository.addSong({
        title: title.trim(),
        artist: artist.trim() || 'Virtuo Worship',
        originalKey: key.trim() || 'G',
        key: key.trim() || 'G',
        bpm: Number(bpm) || 74,
        difficulty: difficulty || 'Fácil',
        capo: Number(capo) || 0,
        structure: structure.trim() || 'Intro • Verso • Refrão • Final',
        chords: chords.trim() || '[Intro] G  C  Em  D',
        easyChords: easyChords.trim() || chords.trim(),
        youtubeUrl: youtubeUrl.trim(),
        spotifyUrl: spotifyUrl.trim(),
        visibility: division === 'private' ? 'private' : 'public'
      });
      await onRefreshSongs();
      setIsAddModalOpen(false);
      // Reset form
      setTitle('');
      setArtist('');
      setChords('');
      setEasyChords('');
    } catch (err) {
      console.error('Erro ao salvar música:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="library-screen-container">
      {/* Division Navigation */}
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
          className={`button ${division === 'public' ? 'primary' : 'secondary'}`}
          onClick={() => setDivision('public')}
          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
        >
          🎵 Biblioteca Geral ({songs.filter(s => s.visibility !== 'private').length})
        </button>
        <button
          className={`button ${division === 'private' ? 'primary' : 'secondary'}`}
          onClick={() => setDivision('private')}
          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
        >
          🔒 Repertório da Banda ({songs.filter(s => s.visibility === 'private').length})
        </button>
      </div>

      <section className="glass">
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pill">BANCO DE MÚSICAS & CIFRAS</span>
            <span 
              className="pill" 
              style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(126,231,255,0.12)', color: '#7EE7FF', borderColor: 'rgba(126,231,255,0.3)' }}
            >
              🎵 {filteredSongs.length} LOUVORES
            </span>
          </div>
          <button 
            className="button primary" 
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            + Nova Música
          </button>
        </div>

        <h2 style={{ marginTop: '12px', marginBottom: '4px' }}>
          {division === 'public' ? 'Biblioteca Virtuo' : 'Repertório Privado da Banda'}
        </h2>
        <p className="subtitle" style={{ marginBottom: '14px' }}>
          Cifras harmonizadas com transposição em semitons e Easy Play integrado.
        </p>

        {/* Search Input */}
        <div>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Buscar música por título, artista ou tom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Songs Grid */}
        <div className="grid" style={{ marginTop: '16px' }}>
          {filteredSongs.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 12px', color: '#94a3b8' }}>
              <p>Nenhuma música encontrada para "<strong>{searchQuery}</strong>".</p>
              {searchQuery && (
                <button className="button secondary" style={{ marginTop: '8px' }} onClick={() => setSearchQuery('')}>
                  Limpar Busca
                </button>
              )}
            </div>
          ) : (
            filteredSongs.map((song) => (
              <div 
                key={song.id} 
                className="tile" 
                onClick={() => onOpenSong(song)} 
                style={{ cursor: 'pointer' }}
              >
                <div className="icon">🎵</div>
                <h3>{song.title}</h3>
                <p>
                  {song.artist} • Tom {song.originalKey}
                  {song.capo ? ` • Capo ${song.capo}ª` : ''}
                  {song.bpm ? ` • ${song.bpm} BPM` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Add Song Modal */}
      {isAddModalOpen && (
        <div 
          className="rehearsal-modal-backdrop" 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
        >
          <div className="rehearsal-modal-card" style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <span className="badge-celestial">✦ NOVA MÚSICA</span>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <h3 style={{ marginTop: '10px', fontSize: '18px', color: '#fff' }}>Cadastrar Cifra no Virtuo</h3>

            <form onSubmit={handleSaveSong} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Título da Música *</label>
                  <input type="text" className="form-input" placeholder="Ex: Bondade de Deus" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Artista / Ministério</label>
                  <input type="text" className="form-input" placeholder="Ex: Isaías Saad" value={artist} onChange={(e) => setArtist(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Tom Original</label>
                  <input type="text" className="form-input" placeholder="Ex: G, C, Em" value={key} onChange={(e) => setKey(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>BPM</label>
                  <input type="number" className="form-input" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Dificuldade</label>
                  <input type="text" className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Capotraste (Casa)</label>
                <input type="number" className="form-input" min={0} max={12} value={capo} onChange={(e) => setCapo(Number(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Estrutura Harmônica</label>
                <input type="text" className="form-input" value={structure} onChange={(e) => setStructure(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Cifra Completa (com seções e acordes)</label>
                <textarea 
                  className="form-input" 
                  rows={6} 
                  placeholder="[Intro] G  C  Em  D&#10;G               C&#10;Eu fui na olaria ver o vaso se formar..." 
                  value={chords} 
                  onChange={(e) => setChords(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Easy Chords (Versão Simplificada Opcional)</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  placeholder="Acordes simplificados sem dissonâncias complexas" 
                  value={easyChords} 
                  onChange={(e) => setEasyChords(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Link YouTube</label>
                  <input type="url" className="form-input" placeholder="https://youtube.com/..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Link Spotify</label>
                  <input type="url" className="form-input" placeholder="https://spotify.com/..." value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="button secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                <button type="submit" className="button primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Cifra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
