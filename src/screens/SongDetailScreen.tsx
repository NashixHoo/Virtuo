import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../music/demo-songs';
import { transposeChordSheet, calculateKey } from '../music/transposer';
import { SongsRepository } from '../services/songs-repository';
import { metronome } from '../utils/audio-engine';

interface SongDetailScreenProps {
  song: Song;
  onBack: () => void;
  onOpenMinister: () => void;
  onOpenEnsaio: () => void;
  onOpenMetronome: (bpm: number) => void;
  onOpenAiForSong: () => void;
  onSongDeleted: () => void;
}

export const SongDetailScreen: React.FC<SongDetailScreenProps> = ({
  song,
  onBack,
  onOpenMinister,
  onOpenEnsaio,
  onOpenMetronome,
  onOpenAiForSong,
  onSongDeleted
}) => {
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [isEasyPlay, setIsEasyPlay] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.5);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist);
  const [editKey, setEditKey] = useState(song.originalKey);
  const [editBpm, setEditBpm] = useState(song.bpm);
  const [editChords, setEditChords] = useState(song.chords);
  const scrollIntervalRef = useRef<number | null>(null);

  const originalKey = song.originalKey || song.key || 'G';
  const currentKey = calculateKey(originalKey, transposeOffset);

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrolling) {
      scrollIntervalRef.current = window.setInterval(() => {
        window.scrollBy({ top: scrollSpeed, behavior: 'smooth' });
      }, 50);
    } else {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isAutoScrolling, scrollSpeed]);

  const changeTone = (delta: number) => {
    setTransposeOffset((prev) => {
      const next = prev + delta;
      if (next > 11) return -12 + (next % 12);
      if (next < -11) return 12 + (next % 12);
      return next;
    });
  };

  const resetTone = () => {
    setTransposeOffset(0);
  };

  const getDisplayedCifra = () => {
    const baseChords = isEasyPlay && song.easyChords ? song.easyChords : song.chords;
    return transposeChordSheet(baseChords, transposeOffset);
  };

  const handleDelete = async () => {
    if (confirm(`Tem certeza de que deseja excluir "${song.title}"?`)) {
      await SongsRepository.deleteSong(song.id);
      onSongDeleted();
    }
  };

  const handleSaveEdit = async () => {
    await SongsRepository.updateSong(song.id, {
      title: editTitle,
      artist: editArtist,
      originalKey: editKey,
      bpm: Number(editBpm),
      chords: editChords
    });
    setIsEditing(false);
  };

  // Format chords in HTML with styling
  const renderFormattedCifra = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: '14px' }} />;

      // Section tag like [Intro], [Verso 1], [Refrão], [Ponte]
      const sectionMatch = line.match(/^(\s*\[(Intro|Verso|Verse|Refrão|Refrao|Chorus|Ponte|Bridge|Final|Outro|Solo|Instrumental|Estrutura)[^\]]*\]\s*)(.*)$/i);
      if (sectionMatch) {
        return (
          <div key={idx} style={{ margin: '14px 0 6px' }}>
            <span className="section-tag">{sectionMatch[1]}</span>
            {sectionMatch[3] && <span className="chord-highlight">{sectionMatch[3]}</span>}
          </div>
        );
      }

      // Check if line contains chords
      return (
        <div 
          key={idx} 
          style={{ 
            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre',
            color: line.match(/[A-G][b#]?(m|maj|dim|aug|sus|add|[0-9])?/g) ? '#7EE7FF' : '#F8FAFC'
          }}
        >
          {line}
        </div>
      );
    });
  };

  return (
    <div className="song-detail-container">
      <section className="glass cifra-viewer">
        {/* Top bar with back and badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button className="tag-btn" onClick={onBack}>
            ← Voltar à Biblioteca
          </button>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {song.visibility === 'private' && (
              <span className="pill" style={{ background: 'rgba(245,197,66,0.15)', borderColor: 'rgba(245,197,66,0.4)', color: '#F5C542', fontSize: '11px', fontWeight: 700 }}>
                🔒 REPERTÓRIO DA BANDA
              </span>
            )}
            {song.capo ? (
              <span className="pill" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)', color: '#fde047', fontSize: '11px' }}>
                🎸 CAPO {song.capo}ª casa
              </span>
            ) : null}
            <span className="pill">
              {isEasyPlay ? '⚡ MODO EASY PLAY' : `TOM: ${currentKey}`}
            </span>
          </div>
        </div>

        {/* Title and metadata */}
        <h2 style={{ marginTop: '14px', marginBottom: '4px', fontSize: '28px' }}>{song.title}</h2>
        <p className="subtitle" style={{ marginBottom: '14px' }}>
          {song.artist} • {song.bpm} BPM • {song.difficulty}
          {song.capo ? ` • Capo ${song.capo}ª casa` : ''}
        </p>

        {/* Transposer Toolbar */}
        <div className="transposer-toolbar">
          <div className="transposer-row">
            <div className="tone-display-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Stepper */}
              <div className="tone-stepper-group" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2px 4px' }}>
                <button 
                  className="tone-stepper-btn" 
                  onClick={() => changeTone(-1)} 
                  title="Baixar 1 semitom"
                  style={{ background: 'transparent', border: 'none', color: '#7EE7FF', fontSize: '18px', width: '32px', height: '32px', cursor: 'pointer' }}
                >
                  −
                </button>
                <span className="tone-stepper-label" style={{ padding: '0 8px', fontSize: '12px', fontWeight: 700, color: '#A9BDD8' }}>
                  TOM
                </span>
                <button 
                  className="tone-stepper-btn" 
                  onClick={() => changeTone(1)} 
                  title="Subir 1 semitom"
                  style={{ background: 'transparent', border: 'none', color: '#7EE7FF', fontSize: '18px', width: '32px', height: '32px', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>

              {/* Current Tone Badge */}
              <div className="tone-current-badge" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tom atual:</span>
                <strong style={{ fontSize: '17px', color: '#7EE7FF' }}>{currentKey}</strong>
                {transposeOffset !== 0 && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ({transposeOffset > 0 ? '+' : ''}{transposeOffset} semitons)
                  </span>
                )}
              </div>

              <span className="tone-original-meta" style={{ fontSize: '12px', color: '#94a3b8' }}>
                Original: <strong>{originalKey}</strong>
              </span>

              {transposeOffset !== 0 && (
                <button 
                  className="tone-reset-link" 
                  onClick={resetTone}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ↺ Voltar ao tom original
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="button primary" 
                onClick={onOpenEnsaio}
                style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 700 }}
              >
                🥁 ENSAIAR
              </button>
              <button 
                className="tag-btn" 
                onClick={() => {
                  metronome.setBpm(song.bpm);
                  onOpenMetronome(song.bpm);
                }}
              >
                🥁 Usar BPM ({song.bpm})
              </button>
              <button 
                className="tag-btn" 
                onClick={onOpenMinister}
              >
                🎤 Modo Ministro
              </button>
            </div>
          </div>

          {/* Mode Switcher & Auto-Scroll row */}
          <div className="transposer-row" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Versão:</span>
              <div className="segmented-mode-control" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2px' }}>
                <button 
                  className={`segmented-mode-btn ${!isEasyPlay ? 'active' : ''}`}
                  onClick={() => setIsEasyPlay(false)}
                  style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: !isEasyPlay ? '#0369a1' : 'transparent', color: '#fff' }}
                >
                  🎵 Cifra Original
                </button>
                <button 
                  className={`segmented-mode-btn ${isEasyPlay ? 'active' : ''}`}
                  onClick={() => setIsEasyPlay(true)}
                  style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: isEasyPlay ? '#0369a1' : 'transparent', color: '#fff' }}
                >
                  ⚡ Easy Play
                </button>
              </div>
            </div>

            {/* Auto-scroll controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className={`button ${isAutoScrolling ? 'primary' : 'secondary'}`}
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>{isAutoScrolling ? '⏸ Pausar Rolagem' : '▶ Rolar Cifra'}</span>
              </button>
              {isAutoScrolling && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button 
                    className="tag-btn" 
                    onClick={() => setScrollSpeed(Math.max(0.5, scrollSpeed - 0.5))}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '10px', color: '#7EE7FF' }}>{scrollSpeed}x</span>
                  <button 
                    className="tag-btn" 
                    onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.5))}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Song Structure tag */}
        <div style={{ margin: '14px 0 10px', fontSize: '12px', color: '#94a3b8' }}>
          <strong>Estrutura:</strong> {song.structure || 'Intro • Verso • Refrão • Final'}
        </div>

        {/* Preformatted Cifra Display */}
        <div 
          className="cifra-pre" 
          style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '18px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.06)',
            overflowX: 'auto',
            marginBottom: '16px'
          }}
        >
          {renderFormattedCifra(getDisplayedCifra())}
        </div>

        {/* Media Links */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {song.youtubeUrl && (
            <a 
              className="button primary" 
              href={song.youtubeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '12px', textDecoration: 'none' }}
            >
              ▶ Assistir no YouTube
            </a>
          )}
          {song.spotifyUrl && (
            <a 
              className="button secondary" 
              href={song.spotifyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '12px', textDecoration: 'none' }}
            >
              🎧 Ouvir no Spotify
            </a>
          )}
        </div>

        {/* Davi AI Harmonic Advice Banner */}
        <div style={{ marginBottom: '16px' }}>
          <button 
            className="button secondary" 
            onClick={onOpenAiForSong}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              borderColor: 'rgba(126,231,255,0.35)', 
              color: '#7EE7FF',
              padding: '12px'
            }}
          >
            <span>✨ Virtuo AI 2.0</span>
            <span>Consultar Davi: Análise Harmônica, Smart Key e Estudo</span>
          </button>
        </div>

        {/* Management Actions */}
        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ações da Cifra</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button secondary" onClick={() => setIsEditing(!isEditing)} style={{ padding: '4px 10px', fontSize: '11px' }}>
              {isEditing ? 'Cancelar Edição' : '✏️ Editar'}
            </button>
            <button className="button outline-danger" onClick={handleDelete} style={{ padding: '4px 10px', fontSize: '11px' }}>
              🗑️ Excluir
            </button>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <div style={{ marginTop: '14px', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(126,231,255,0.2)' }}>
            <h4 style={{ margin: '0 0 10px', color: '#7EE7FF' }}>Editar Cifra</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input type="text" className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" />
              <input type="text" className="form-input" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} placeholder="Artista" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input type="text" className="form-input" value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="Tom" />
              <input type="number" className="form-input" value={editBpm} onChange={(e) => setEditBpm(Number(e.target.value))} placeholder="BPM" />
            </div>
            <textarea className="form-input" rows={6} value={editChords} onChange={(e) => setEditChords(e.target.value)} />
            <button className="button primary" onClick={handleSaveEdit} style={{ marginTop: '8px', padding: '6px 14px', fontSize: '12px' }}>
              Salvar Alterações
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
