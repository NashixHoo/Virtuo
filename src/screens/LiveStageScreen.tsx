import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../music/demo-songs';
import { transposeChordSheet, calculateKey } from '../music/transposer';

interface LiveStageScreenProps {
  songs: Song[];
  activeSong: Song | null;
  onSelectSong: (song: Song) => void;
  onExit: () => void;
}

export const LiveStageScreen: React.FC<LiveStageScreenProps> = ({
  songs,
  activeSong,
  onSelectSong,
  onExit
}) => {
  const currentSong = activeSong || songs[0] || null;
  const currentIndex = currentSong ? songs.findIndex(s => s.id === currentSong.id) : 0;

  const [transposeOffset, setTransposeOffset] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const scrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAutoScrolling) {
      scrollRef.current = window.setInterval(() => {
        window.scrollBy({ top: scrollSpeed, behavior: 'smooth' });
      }, 50);
    } else {
      if (scrollRef.current) clearInterval(scrollRef.current);
    }
    return () => {
      if (scrollRef.current) clearInterval(scrollRef.current);
    };
  }, [isAutoScrolling, scrollSpeed]);

  if (!currentSong) {
    return (
      <div className="glass" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3>Nenhuma música no repertório do palco</h3>
        <button className="button primary" onClick={onExit} style={{ marginTop: '12px' }}>
          Voltar
        </button>
      </div>
    );
  }

  const currentKey = calculateKey(currentSong.originalKey, transposeOffset);
  const displayedChords = transposeChordSheet(currentSong.chords, transposeOffset);

  const prevSong = () => {
    if (currentIndex > 0) {
      setTransposeOffset(0);
      onSelectSong(songs[currentIndex - 1]);
    }
  };

  const nextSong = () => {
    if (currentIndex < songs.length - 1) {
      setTransposeOffset(0);
      onSelectSong(songs[currentIndex + 1]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="live-stage-screen" style={{ minHeight: '90vh', paddingBottom: '80px' }}>
      {/* Live Stage HUD Top Bar */}
      <div 
        style={{ 
          position: 'sticky', 
          top: '10px', 
          zIndex: 100, 
          background: 'rgba(7, 16, 31, 0.95)', 
          backdropFilter: 'blur(16px)', 
          padding: '12px 16px', 
          borderRadius: '18px', 
          border: '1px solid rgba(126,231,255,0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="tag-btn" onClick={onExit} style={{ fontSize: '11px' }}>
            ✕ Sair do Palco
          </button>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#F8FAFC' }}>{currentSong.title}</h3>
            <span style={{ fontSize: '11px', color: '#7EE7FF' }}>
              Tom: <strong>{currentKey}</strong> • {currentSong.bpm} BPM • Música {currentIndex + 1} de {songs.length}
            </span>
          </div>
        </div>

        {/* Stage controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Tone changer */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '2px 4px' }}>
            <button 
              onClick={() => setTransposeOffset(prev => prev - 1)}
              style={{ background: 'transparent', border: 'none', color: '#7EE7FF', fontSize: '16px', padding: '2px 8px', cursor: 'pointer' }}
            >
              −
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', alignSelf: 'center', padding: '0 4px' }}>
              {currentKey}
            </span>
            <button 
              onClick={() => setTransposeOffset(prev => prev + 1)}
              style={{ background: 'transparent', border: 'none', color: '#7EE7FF', fontSize: '16px', padding: '2px 8px', cursor: 'pointer' }}
            >
              +
            </button>
          </div>

          {/* Auto-scroll toggle */}
          <button
            className={`button ${isAutoScrolling ? 'primary' : 'secondary'}`}
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            {isAutoScrolling ? '⏸ Pausar' : '▶ Rolar'}
          </button>

          {/* Fullscreen button */}
          <button className="tag-btn" onClick={toggleFullscreen} title="Tela cheia">
            ⛶
          </button>

          {/* Song switcher */}
          <button 
            className="button secondary" 
            onClick={prevSong} 
            disabled={currentIndex === 0}
            style={{ padding: '6px 10px', fontSize: '11px' }}
          >
            ◀ Anterior
          </button>
          <button 
            className="button secondary" 
            onClick={nextSong} 
            disabled={currentIndex === songs.length - 1}
            style={{ padding: '6px 10px', fontSize: '11px' }}
          >
            Próxima ▶
          </button>
        </div>
      </div>

      {/* Main Cifra Display */}
      <div 
        className="glass" 
        style={{ 
          background: 'rgba(5, 12, 24, 0.9)', 
          padding: '24px', 
          borderRadius: '24px',
          border: '1px solid rgba(126,231,255,0.15)'
        }}
      >
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Estrutura: <strong>{currentSong.structure}</strong>
          </span>
          {currentSong.capo ? (
            <span className="pill" style={{ fontSize: '11px', background: 'rgba(245,158,11,0.2)', color: '#fde047' }}>
              Capo {currentSong.capo}ª casa
            </span>
          ) : null}
        </div>

        <pre 
          style={{ 
            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '16px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            color: '#F8FAFC',
            margin: 0
          }}
        >
          {displayedChords}
        </pre>
      </div>
    </div>
  );
};
