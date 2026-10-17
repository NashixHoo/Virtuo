import React, { useState } from 'react';

export const AcademyScreen: React.FC = () => {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  const lessons = [
    { id: 1, title: 'Lição 1 — Compasso Quaternário 4/4', notes: 'Dó • Ré • Mi • Fá • Sol • Lá • Si • Dó', tempo: '60 BPM', level: 'Iniciante' },
    { id: 2, title: 'Lição 2 — Pausas e Semínimas', notes: 'Dó [pausa] Mi [pausa] Sol [pausa] Dó', tempo: '65 BPM', level: 'Iniciante' },
    { id: 3, title: 'Lição 3 — Compasso Ternário 3/4', notes: 'Dó • Mi • Sol • Mi • Dó', tempo: '72 BPM', level: 'Intermediário' },
    { id: 4, title: 'Lição 4 — Colcheias e Síncopes', notes: 'Dó-Ré Mi-Fá Sol-Lá Si-Dó', tempo: '80 BPM', level: 'Intermediário' },
  ];

  return (
    <div className="academy-screen-container">
      <section className="glass">
        <span className="pill">VIRTUO ACADEMY • MÉTODO BONA & SOLFEJO</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Ensino Musical Estruturado</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Do nível 0 ao profissional com solfejo rítmico, leitura de partitura e percepção auditiva.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="tile"
              onClick={() => setSelectedLesson(selectedLesson === lesson.id ? null : lesson.id)}
              style={{
                cursor: 'pointer',
                borderColor: selectedLesson === lesson.id ? '#7EE7FF' : 'rgba(255,255,255,0.08)',
                background: selectedLesson === lesson.id ? 'rgba(126,231,255,0.06)' : 'rgba(14,27,53,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>{lesson.title}</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Andamento: {lesson.tempo} • Nível: {lesson.level}
                  </p>
                </div>
                <span className="pill" style={{ fontSize: '11px' }}>
                  {selectedLesson === lesson.id ? 'Fechar' : 'Praticar'}
                </span>
              </div>

              {selectedLesson === lesson.id && (
                <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#7EE7FF', fontWeight: 700 }}>EXERCÍCIO DE LEITURA & SOLFEJO:</span>
                  <div 
                    style={{ 
                      marginTop: '8px', 
                      padding: '14px', 
                      background: 'rgba(0,0,0,0.3)', 
                      borderRadius: '12px', 
                      fontSize: '18px', 
                      letterSpacing: '2px', 
                      color: '#F8FAFC',
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  >
                    {lesson.notes}
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
                    Siga o metrônomo e cante as notas na altura correta mantendo a pulsação de semínima.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
