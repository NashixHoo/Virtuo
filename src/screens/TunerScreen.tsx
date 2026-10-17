import React, { useState, useEffect, useRef } from 'react';
import { PitchDetector } from '../utils/audio-engine';

export const TunerScreen: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [pitchData, setPitchData] = useState<{ note: string; octave: number; cents: number; freq: number } | null>(null);
  const [instrument, setInstrument] = useState<'guitar' | 'bass' | 'ukulele' | 'chromatic'>('guitar');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const detectorRef = useRef<PitchDetector | null>(null);

  const presets = {
    guitar: [
      { note: 'E', octave: 2, freq: 82.4, string: '6ª' },
      { note: 'A', octave: 2, freq: 110.0, string: '5ª' },
      { note: 'D', octave: 3, freq: 146.8, string: '4ª' },
      { note: 'G', octave: 3, freq: 196.0, string: '3ª' },
      { note: 'B', octave: 3, freq: 246.9, string: '2ª' },
      { note: 'E', octave: 4, freq: 329.6, string: '1ª' }
    ],
    bass: [
      { note: 'E', octave: 1, freq: 41.2, string: '4ª' },
      { note: 'A', octave: 1, freq: 55.0, string: '3ª' },
      { note: 'D', octave: 2, freq: 73.4, string: '2ª' },
      { note: 'G', octave: 2, freq: 98.0, string: '1ª' }
    ],
    ukulele: [
      { note: 'G', octave: 4, freq: 392.0, string: '4ª' },
      { note: 'C', octave: 4, freq: 261.6, string: '3ª' },
      { note: 'E', octave: 4, freq: 329.6, string: '2ª' },
      { note: 'A', octave: 4, freq: 440.0, string: '1ª' }
    ],
    chromatic: []
  };

  const startTuner = async () => {
    try {
      setErrorMsg(null);
      detectorRef.current = new PitchDetector();
      await detectorRef.current.start((data) => {
        setPitchData(data);
      });
      setIsListening(true);
    } catch (err: any) {
      console.error('Tuner mic error:', err);
      setErrorMsg('Permissão de microfone necessária para o afinador.');
      setIsListening(false);
    }
  };

  const stopTuner = () => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
    }
    setIsListening(false);
    setPitchData(null);
  };

  useEffect(() => {
    return () => {
      stopTuner();
    };
  }, []);

  const isTuned = pitchData ? Math.abs(pitchData.cents) <= 4 : false;

  return (
    <div className="tuner-screen-container">
      <section className="glass">
        <span className="pill">AFINADOR CROMÁTICO DE ALTA PRECISÃO</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Afinador Profissional Virtuo</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Detecção de afinação em tempo real por autocorrelação e resposta em hertz.
        </p>

        {/* Instrument Selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { id: 'guitar', label: '🎸 Violão / Guitarra' },
            { id: 'bass', label: '🎸 Baixo 4C' },
            { id: 'ukulele', label: '🪕 Ukulele' },
            { id: 'chromatic', label: '🎵 Cromático Livre' }
          ].map((item) => (
            <button
              key={item.id}
              className={`button ${instrument === item.id ? 'primary' : 'secondary'}`}
              onClick={() => setInstrument(item.id as any)}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Big Tuner Card & Gauge */}
        <div 
          style={{ 
            padding: '30px 20px', 
            background: 'rgba(5, 12, 24, 0.85)', 
            borderRadius: '24px', 
            border: `1px solid ${isTuned ? '#22c55e' : 'rgba(126,231,255,0.25)'}`,
            textAlign: 'center',
            boxShadow: isTuned ? '0 0 35px rgba(34, 197, 94, 0.25)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        >
          {errorMsg ? (
            <div style={{ color: '#ef4444', padding: '20px' }}>
              <p>{errorMsg}</p>
              <button className="button primary" onClick={startTuner} style={{ marginTop: '10px' }}>
                Tentar Novamente
              </button>
            </div>
          ) : !isListening ? (
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎙️</div>
              <p style={{ color: '#A9BDD8', fontSize: '14px', marginBottom: '16px' }}>
                Toque no botão abaixo para ativar a escuta do microfone e afinar seu instrumento corda por corda.
              </p>
              <button 
                className="button primary" 
                onClick={startTuner}
                style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 700 }}
              >
                Ativar Afinador
              </button>
            </div>
          ) : (
            <div>
              {/* Pitch Note & Octave */}
              <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {pitchData ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                      <span 
                        style={{ 
                          fontSize: '84px', 
                          fontWeight: 800, 
                          color: isTuned ? '#22c55e' : '#7EE7FF',
                          lineHeight: 1
                        }}
                      >
                        {pitchData.note}
                      </span>
                      <span style={{ fontSize: '28px', fontWeight: 700, color: '#94a3b8' }}>
                        {pitchData.octave}
                      </span>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <span 
                        className="pill" 
                        style={{ 
                          background: isTuned ? 'rgba(34, 197, 94, 0.2)' : 'rgba(126,231,255,0.1)',
                          borderColor: isTuned ? '#22c55e' : 'rgba(126,231,255,0.3)',
                          color: isTuned ? '#4ade80' : '#7EE7FF',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {isTuned ? '✓ AFINAÇÃO PERFEITA' : `${pitchData.cents > 0 ? '+' : ''}${pitchData.cents} cents`}
                      </span>
                    </div>

                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                      {pitchData.freq} Hz
                    </p>
                  </>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '15px' }}>
                    Tocando uma corda para detectar afinação...
                  </div>
                )}
              </div>

              {/* Gauge Needle Bar (-50 to +50 cents) */}
              <div style={{ maxWidth: '340px', margin: '24px auto 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
                  <span>-50</span>
                  <span>-25</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>0 (Perfeito)</span>
                  <span>+25</span>
                  <span>+50</span>
                </div>

                <div 
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '10px', 
                    background: 'rgba(255,255,255,0.08)', 
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Center line */}
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#22c55e', zIndex: 1 }} />
                  {/* Needle indicator */}
                  {pitchData && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        bottom: 0, 
                        width: '8px', 
                        borderRadius: '4px',
                        background: isTuned ? '#22c55e' : '#7EE7FF',
                        left: `${Math.min(96, Math.max(0, 50 + pitchData.cents))}%`,
                        transform: 'translateX(-50%)',
                        transition: 'left 0.1s ease',
                        boxShadow: `0 0 10px ${isTuned ? '#22c55e' : '#7EE7FF'}`
                      }} 
                    />
                  )}
                </div>
              </div>

              <button 
                className="button secondary" 
                onClick={stopTuner}
                style={{ marginTop: '12px', padding: '6px 18px', fontSize: '12px' }}
              >
                Desativar Microfone
              </button>
            </div>
          )}
        </div>

        {/* Instrument Target Strings Reference */}
        {instrument !== 'chromatic' && (
          <div style={{ marginTop: '18px' }}>
            <span className="pill" style={{ marginBottom: '8px' }}>CORDAS DE REFERÊNCIA</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginTop: '8px' }}>
              {presets[instrument].map((str, idx) => (
                <div key={idx} className="tile" style={{ padding: '10px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '16px', color: '#7EE7FF', display: 'block' }}>{str.note}{str.octave}</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{str.string} corda</span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{str.freq} Hz</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
