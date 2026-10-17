import React, { useState, useEffect } from 'react';

export const CoachScreen: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);

  const progression = ['G', 'Em7', 'C9', 'D4'];

  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setCurrentChordIndex((idx) => (idx + 1) % progression.length);
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, progression.length]);

  return (
    <div className="coach-screen-container">
      <section className="glass">
        <span className="pill">TREINADOR DE TRANSIÇÃO DE ACORDES</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Guitar & Chord Coach</h2>
        <p className="subtitle" style={{ marginBottom: '18px' }}>
          Melhore a agilidade nas trocas de acordes com metrônomo visual e tempo de transição.
        </p>

        {/* Coach Display */}
        <div 
          style={{ 
            padding: '36px 20px', 
            background: 'rgba(5, 12, 24, 0.85)', 
            borderRadius: '24px', 
            border: '1px solid rgba(126,231,255,0.25)', 
            textAlign: 'center' 
          }}
        >
          <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Toque o acorde:
          </span>

          <div style={{ fontSize: '96px', fontWeight: 800, color: '#7EE7FF', margin: '10px 0', lineHeight: 1 }}>
            {progression[currentChordIndex]}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Próxima troca em:</span>
            <strong style={{ fontSize: '20px', color: '#38bdf8' }}>{secondsLeft}s</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0 10px' }}>
            {progression.map((chord, idx) => (
              <span 
                key={idx}
                className="pill" 
                style={{ 
                  background: idx === currentChordIndex ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                  color: idx === currentChordIndex ? '#07101F' : '#94a3b8',
                  fontWeight: 700
                }}
              >
                {chord}
              </span>
            ))}
          </div>

          <button
            className={`button ${isRunning ? 'outline-danger' : 'primary'}`}
            onClick={() => setIsRunning(!isRunning)}
            style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 700, borderRadius: '20px', marginTop: '10px' }}
          >
            {isRunning ? '⏸ Pausar Treino' : '▶ Iniciar Treino de Trocas'}
          </button>
        </div>
      </section>
    </div>
  );
};
