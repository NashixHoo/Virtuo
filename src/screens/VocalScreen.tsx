import React, { useState, useEffect, useRef } from 'react';
import { PitchDetector } from '../utils/audio-engine';

export const VocalScreen: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [pitchData, setPitchData] = useState<{ note: string; octave: number; cents: number; freq: number } | null>(null);
  const [lowestFreq, setLowestFreq] = useState<number | null>(null);
  const [highestFreq, setHighestFreq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'monitor' | 'warmup' | 'exercises'>('monitor');
  const [warmupPhase, setWarmupPhase] = useState(0);
  const [warmupTimer, setWarmupTimer] = useState(45);
  const [isWarmupRunning, setIsWarmupRunning] = useState(false);

  const detectorRef = useRef<PitchDetector | null>(null);

  const warmupPhases = [
    { name: '1. Respiração & Diafragma', desc: 'Inspire pelo nariz por 4s, retenha por 4s e solte em "Sssss" por 8s.', duration: 45 },
    { name: '2. Vibração de Lábios (Trill)', desc: 'Faça o som de "Brrrrr" ou "Trrrrr" deslizando do grave para o agudo suavemente.', duration: 45 },
    { name: '3. Ressonância & Sirene Vocal', desc: 'Com a boca fechada em "Mmmm", sinta a vibração nos lábios e maçãs do rosto.', duration: 45 },
    { name: '4. Arpejo de Quinta (Dó-Ré-Mi-Fá-Sol)', desc: 'Cante em "Nô-Nô-Nô" subindo e descendo com afinação precisa.', duration: 45 },
  ];

  useEffect(() => {
    let interval: any = null;
    if (isWarmupRunning) {
      interval = setInterval(() => {
        setWarmupTimer((prev) => {
          if (prev <= 1) {
            setWarmupPhase((cur) => (cur + 1) % warmupPhases.length);
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWarmupRunning]);

  const startVocal = async () => {
    try {
      detectorRef.current = new PitchDetector();
      await detectorRef.current.start((data) => {
        setPitchData(data);
        if (data && data.freq > 50 && data.freq < 1500) {
          setLowestFreq((cur) => (cur === null || data.freq < cur ? Math.round(data.freq) : cur));
          setHighestFreq((cur) => (cur === null || data.freq > cur ? Math.round(data.freq) : cur));
        }
      });
      setIsListening(true);
    } catch (e) {
      console.warn('Microphone permission not granted for vocal', e);
    }
  };

  const stopVocal = () => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
    }
    setIsListening(false);
    setPitchData(null);
  };

  useEffect(() => {
    return () => {
      stopVocal();
    };
  }, []);

  return (
    <div className="vocal-screen-container">
      <section className="glass">
        <span className="pill">VIRTUO VOCAL PRO</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Treinamento & Monitor Vocal</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Monitoramento de afinação, tessitura e aquecimento guiado para cantores e ministros.
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {[
            { id: 'monitor', label: '🎙️ Monitor de Afinação' },
            { id: 'warmup', label: '🔥 Aquecimento Guiado (3 min)' },
            { id: 'exercises', label: '🎯 Tessitura & Extensão' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`button ${activeTab === tab.id ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'monitor' && (
          <div 
            style={{ 
              padding: '24px', 
              background: 'rgba(5, 12, 24, 0.85)', 
              borderRadius: '24px', 
              border: '1px solid rgba(126,231,255,0.25)', 
              textAlign: 'center' 
            }}
          >
            {!isListening ? (
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎤</div>
                <p style={{ color: '#A9BDD8', fontSize: '14px', marginBottom: '14px' }}>
                  Ative o microfone para cantar notas e verificar estabilidade e afinação em tempo real.
                </p>
                <button 
                  className="button primary" 
                  onClick={startVocal}
                  style={{ padding: '12px 28px', fontSize: '15px' }}
                >
                  Ativar Monitor Vocal
                </button>
              </div>
            ) : (
              <div>
                <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {pitchData ? (
                    <div>
                      <div style={{ fontSize: '72px', fontWeight: 800, color: '#7EE7FF', lineHeight: 1 }}>
                        {pitchData.note}{pitchData.octave}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <span 
                          className="pill"
                          style={{
                            background: Math.abs(pitchData.cents) <= 6 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(126,231,255,0.1)',
                            color: Math.abs(pitchData.cents) <= 6 ? '#4ade80' : '#7EE7FF'
                          }}
                        >
                          {Math.abs(pitchData.cents) <= 6 ? '✓ Afinado' : `${pitchData.cents > 0 ? '+' : ''}${pitchData.cents} cents`}
                        </span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                        {pitchData.freq} Hz
                      </p>
                    </div>
                  ) : (
                    <div style={{ color: '#64748b' }}>Cantando ou vocalizando uma nota...</div>
                  )}
                </div>

                <button 
                  className="button secondary" 
                  onClick={stopVocal}
                  style={{ marginTop: '16px', padding: '6px 16px', fontSize: '12px' }}
                >
                  Pausar Microfone
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'warmup' && (
          <div style={{ padding: '20px', background: 'rgba(5, 12, 24, 0.75)', borderRadius: '20px', border: '1px solid rgba(126,231,255,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="badge-celestial">ETAPA {warmupPhase + 1} DE {warmupPhases.length}</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#7EE7FF' }}>{warmupTimer}s</div>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: '#F8FAFC' }}>
              {warmupPhases[warmupPhase].name}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#A9BDD8', lineHeight: '1.6' }}>
              {warmupPhases[warmupPhase].desc}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`button ${isWarmupRunning ? 'outline-danger' : 'primary'}`}
                onClick={() => setIsWarmupRunning(!isWarmupRunning)}
                style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 700 }}
              >
                {isWarmupRunning ? '⏸ Pausar' : '▶ Iniciar Aquecimento'}
              </button>
              <button 
                className="button secondary"
                onClick={() => {
                  setWarmupPhase((cur) => (cur + 1) % warmupPhases.length);
                  setWarmupTimer(45);
                }}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Próxima Etapa ⏭
              </button>
            </div>
          </div>
        )}

        {activeTab === 'exercises' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="tile" style={{ padding: '18px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Nota Mais Grave Detectada</span>
              <h3 style={{ fontSize: '32px', color: '#38bdf8', margin: '8px 0' }}>
                {lowestFreq ? `${lowestFreq} Hz` : '--'}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Limite inferior da tessitura</p>
            </div>

            <div className="tile" style={{ padding: '18px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Nota Mais Aguda Detectada</span>
              <h3 style={{ fontSize: '32px', color: '#7EE7FF', margin: '8px 0' }}>
                {highestFreq ? `${highestFreq} Hz` : '--'}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Limite superior da tessitura</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
