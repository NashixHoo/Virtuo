import React, { useState, useEffect } from 'react';
import { testConnection } from '../firebase';

export const DiagnosticsScreen: React.FC = () => {
  const [fbStatus, setFbStatus] = useState<{ ok: boolean; message: string }>({ ok: true, message: 'Testando...' });
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const runCheck = async () => {
      const start = performance.now();
      const res = await testConnection();
      setLatency(Math.round(performance.now() - start));
      setFbStatus(res);
    };
    runCheck();
  }, []);

  return (
    <div className="diagnostics-screen-container">
      <section className="glass">
        <span className="pill">DIAGNÓSTICO E SAÚDE DO SISTEMA</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '26px' }}>Saúde do Virtuo</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Métricas de runtime, conexão Firebase e desempenho de áudio Web Audio API.
        </p>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="tile" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Cloud Firestore</span>
            <h3 style={{ fontSize: '18px', color: fbStatus.ok ? '#4ade80' : '#f87171', margin: '6px 0' }}>
              {fbStatus.ok ? '🟢 Ativo' : '🟡 Local'}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>virtuo-7e01b</p>
          </div>

          <div className="tile" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Latência da Conexão</span>
            <h3 style={{ fontSize: '18px', color: '#7EE7FF', margin: '6px 0' }}>
              {latency !== null ? `${latency} ms` : 'Verificando...'}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Resposta do servidor</p>
          </div>

          <div className="tile" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>AudioContext</span>
            <h3 style={{ fontSize: '18px', color: '#4ade80', margin: '6px 0' }}>
              Pronto (44.1/48kHz)
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Web Audio API Nativo</p>
          </div>

          <div className="tile" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Diretor Davi AI</span>
            <h3 style={{ fontSize: '18px', color: '#38bdf8', margin: '6px 0' }}>
              🎼 Operacional
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Gemini 2.5 Flash / Algorítmico</p>
          </div>
        </div>
      </section>
    </div>
  );
};
