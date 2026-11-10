import React, { useState } from 'react';
import { Song } from '../music/demo-songs';

interface MinisterScreenProps {
  song: Song | null;
  onExit: () => void;
}

export const MinisterScreen: React.FC<MinisterScreenProps> = ({ song, onExit }) => {
  const [spontaneousNotes, setSpontaneousNotes] = useState(
    'Momento de clamor: Salmo 23 • A transição deve ser bem suave na tônica sustentada.'
  );

  return (
    <div className="minister-screen-container" style={{ minHeight: '90vh' }}>
      <section className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span className="pill" style={{ background: 'rgba(245,197,66,0.15)', borderColor: 'rgba(245,197,66,0.3)', color: '#F5C542' }}>
              MODO MINISTRO DE PALCO
            </span>
            <h2 style={{ margin: '6px 0 0', fontSize: '24px' }}>{song?.title || 'Ministração Espontânea'}</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Tom: {song?.originalKey || 'G'} • Andamento: {song?.bpm || 70} BPM
            </p>
          </div>
          <button className="tag-btn" onClick={onExit} style={{ fontSize: '11px' }}>
            ✕ Sair do Modo Ministro
          </button>
        </div>

        {/* Spontaneous Notes Card */}
        <div style={{ padding: '16px', background: 'rgba(245,197,66,0.06)', borderRadius: '16px', border: '1px solid rgba(245,197,66,0.25)', marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#F5C542', display: 'block', marginBottom: '6px' }}>
            📖 ANOTAÇÕES & ESPONTÂNEO:
          </label>
          <textarea
            className="form-input"
            rows={3}
            value={spontaneousNotes}
            onChange={(e) => setSpontaneousNotes(e.target.value)}
            style={{ fontSize: '13px', lineHeight: '1.5', margin: 0 }}
          />
        </div>

        {/* Big Clean Reading Display */}
        <div 
          style={{ 
            background: 'rgba(0,0,0,0.4)', 
            padding: '24px', 
            borderRadius: '20px', 
            border: '1px solid rgba(255,255,255,0.08)' 
          }}
        >
          <pre 
            style={{ 
              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '17px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              color: '#F8FAFC',
              margin: 0
            }}
          >
            {song?.chords || 'Nenhuma cifra carregada para esta ministração.'}
          </pre>
        </div>
      </section>
    </div>
  );
};
