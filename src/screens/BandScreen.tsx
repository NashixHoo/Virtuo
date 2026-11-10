import React, { useState, useEffect } from 'react';
import { metronome, MetronomeState, playStartupChime } from '../utils/audio-engine';

export const BandScreen: React.FC = () => {
  const [metroState, setMetroState] = useState<MetronomeState>(metronome.getState());
  const [activePreset, setActivePreset] = useState('worship');

  useEffect(() => {
    const unsub = metronome.subscribe((state) => {
      setMetroState({ ...state });
    });
    return () => {
      unsub();
    };
  }, []);

  const presets = [
    { id: 'worship', label: 'Worship Suave', bpm: 70, timeSig: '4/4' },
    { id: 'poprock', label: 'Pop Rock Adoração', bpm: 115, timeSig: '4/4' },
    { id: 'balada68', label: 'Balada 6/8', bpm: 68, timeSig: '6/8' },
    { id: 'meiotempo', label: 'Meio Tempo Congregacional', bpm: 82, timeSig: '4/4' },
  ];

  const handleSelectPreset = (p: typeof presets[0]) => {
    setActivePreset(p.id);
    metronome.setBpm(p.bpm);
  };

  return (
    <div className="band-screen-container">
      <section className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="pill">MODO BANDA & SINTETIZADOR</span>
            <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Metrônomo & Andamento</h2>
            <p className="subtitle" style={{ margin: 0 }}>
              Sincronização de palco em tempo real com Web Audio API.
            </p>
          </div>
          <button 
            className="button secondary"
            onClick={playStartupChime}
            title="Tocar acorde de abertura"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            🔊 Acorde Virtuo
          </button>
        </div>

        {/* Big Metronome Display */}
        <div 
          style={{ 
            marginTop: '20px', 
            padding: '24px', 
            background: 'rgba(5, 12, 24, 0.75)', 
            borderRadius: '24px', 
            border: '1px solid rgba(126,231,255,0.2)',
            textAlign: 'center'
          }}
        >
          {/* Visual Beat Indicator Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '18px' }}>
            {[1, 2, 3, 4].map((beat) => {
              const isActive = metroState.isPlaying && metroState.currentBeat === beat;
              const isAccent = beat === 1;
              return (
                <div
                  key={beat}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isActive 
                      ? (isAccent ? '#38bdf8' : '#7EE7FF') 
                      : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                    boxShadow: isActive ? '0 0 20px #38bdf8' : 'none',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isActive ? '#07101F' : '#94a3b8',
                    transition: 'all 0.08s ease'
                  }}
                >
                  {beat}
                </div>
              );
            })}
          </div>

          {/* BPM display with [-] [+] buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', margin: '14px 0' }}>
            <button
              className="button secondary"
              onClick={() => metronome.adjustBpm(-5)}
              style={{ width: '48px', height: '48px', fontSize: '20px', borderRadius: '50%', padding: 0 }}
            >
              -5
            </button>
            <button
              className="button secondary"
              onClick={() => metronome.adjustBpm(-1)}
              style={{ width: '42px', height: '42px', fontSize: '18px', borderRadius: '50%', padding: 0 }}
            >
              -1
            </button>

            <div style={{ minWidth: '140px' }}>
              <div style={{ fontSize: '64px', fontWeight: 800, color: '#7EE7FF', lineHeight: 1, letterSpacing: '-1px' }}>
                {metroState.bpm}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
                BPM
              </div>
            </div>

            <button
              className="button secondary"
              onClick={() => metronome.adjustBpm(1)}
              style={{ width: '42px', height: '42px', fontSize: '18px', borderRadius: '50%', padding: 0 }}
            >
              +1
            </button>
            <button
              className="button secondary"
              onClick={() => metronome.adjustBpm(5)}
              style={{ width: '48px', height: '48px', fontSize: '20px', borderRadius: '50%', padding: 0 }}
            >
              +5
            </button>
          </div>

          {/* BPM Slider */}
          <div style={{ maxWidth: '320px', margin: '0 auto 18px' }}>
            <input
              type="range"
              min="40"
              max="240"
              value={metroState.bpm}
              onChange={(e) => metronome.setBpm(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7EE7FF' }}
            />
          </div>

          {/* Main Play / Pause and Tap Tempo Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
            <button
              className={`button ${metroState.isPlaying ? 'outline-danger' : 'primary'}`}
              onClick={() => metronome.toggle()}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 700,
                borderRadius: '20px',
                minWidth: '150px',
                boxShadow: metroState.isPlaying ? '0 0 25px rgba(239, 68, 68, 0.4)' : '0 0 25px rgba(126, 231, 255, 0.3)'
              }}
            >
              {metroState.isPlaying ? '⏸ Pausar' : '▶ Iniciar Metrônomo'}
            </button>

            <button
              className="button secondary"
              onClick={() => metronome.tap()}
              style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '20px' }}
            >
              👆 Tap Tempo
            </button>
          </div>
        </div>

        {/* Subdivisions & Volume Settings */}
        <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Subdivisions */}
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              SUBDIVISÃO RÍTMICA
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['1/4', '1/8', '1/16', '3/8'].map((sub) => (
                <button
                  key={sub}
                  className={`button ${metroState.subdivision === sub ? 'primary' : 'secondary'}`}
                  onClick={() => metronome.setSubdivision(sub)}
                  style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8' }}>VOLUME DO CLIQUE</label>
              <span style={{ fontSize: '11px', color: '#7EE7FF' }}>{Math.round(metroState.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={metroState.volume}
              onChange={(e) => metronome.setVolume(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7EE7FF' }}
            />
          </div>
        </div>

        {/* Presets Grid */}
        <div style={{ marginTop: '20px' }}>
          <span className="pill" style={{ marginBottom: '10px' }}>PRESETS RÍTMICOS DE ADORAÇÃO</span>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
            {presets.map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <div
                  key={p.id}
                  className="tile"
                  onClick={() => handleSelectPreset(p)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? '#7EE7FF' : 'rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(126,231,255,0.08)' : 'rgba(14,27,53,0.5)'
                  }}
                >
                  <div className="icon">🥁</div>
                  <h3>{p.label}</h3>
                  <p>{p.bpm} BPM • Compasso {p.timeSig}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
