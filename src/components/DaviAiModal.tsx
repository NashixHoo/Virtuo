import React, { useState } from 'react';
import { Song } from '../music/demo-songs';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

interface DaviAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSong: Song | null;
  currentKey: string;
  bpm: number;
}

export const DaviAiModal: React.FC<DaviAiModalProps> = ({
  isOpen,
  onClose,
  activeSong,
  currentKey,
  bpm
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou Davi, Diretor Musical do Virtuo. Como posso apoiar você e sua equipe com repertório, arranjos, transposição harmônica ou preparação para o próximo ensaio e apresentação?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Como facilitar esta música?',
    'Qual tom devo usar para voz feminina?',
    'Plano de estudo semanal',
    'Checklist de ensaio para a banda',
    'Explicar acordes e tensões'
  ];

  const sendMessage = async (textToSend: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const newMsgs: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMsgs);
    setInputMessage('');
    setIsLoading(true);

    try {
      const musicalContext = activeSong ? {
        songTitle: activeSong.title,
        artist: activeSong.artist,
        key: currentKey || activeSong.key || 'G',
        originalKey: activeSong.originalKey || 'G',
        bpm: bpm || activeSong.bpm || 74,
        difficulty: activeSong.difficulty || 'Fácil',
        structure: activeSong.structure || 'Intro • Verso • Refrão • Final'
      } : null;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          musicalContext
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...newMsgs, { role: 'assistant', text: data.reply }]);
      } else {
        setMessages([...newMsgs, { role: 'assistant', text: data.error || 'Não consegui analisar no momento. Tente novamente.' }]);
      }
    } catch (err: any) {
      setMessages([...newMsgs, { role: 'assistant', text: 'Modo local ativo: pratique as transições mais difíceis em andamento reduzido e mantenha o metrônomo cravado.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="rehearsal-modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 99999 }}
    >
      <div 
        className="rehearsal-modal-card" 
        style={{ 
          maxWidth: '560px', 
          width: '94%', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          borderColor: 'rgba(126,231,255,0.4)',
          background: '#07101F',
          padding: '20px'
        }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎼</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#F8FAFC' }}>Davi • Diretor Musical</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#7EE7FF' }}>
                {activeSong ? `Música ativa: ${activeSong.title} (Tom ${currentKey} • ${bpm} BPM)` : 'Consultoria Harmônica e Arranjo'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Quick Prompts */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              className="tag-btn"
              onClick={() => sendMessage(p)}
              style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '4px 10px', background: 'rgba(126,231,255,0.08)', borderColor: 'rgba(126,231,255,0.25)', color: '#7EE7FF' }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat message history */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div 
                key={idx} 
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: isUser ? 'linear-gradient(135deg, #1e3a8a, #0369a1)' : 'rgba(14,27,53,0.85)',
                  border: `1px solid ${isUser ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#F8FAFC',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {!isUser && (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#7EE7FF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🎼 Davi</span>
                  </div>
                )}
                {m.text}
              </div>
            );
          })}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'rgba(14,27,53,0.85)', borderRadius: '14px', fontSize: '12px', color: '#7EE7FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="auth-spinner" style={{ width: '14px', height: '14px' }}></div>
              <span>Davi analisando dinâmica e harmonia...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Pergunte sobre arranjo, dinâmicas, acordes ou ensaio..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(''); }}
            style={{ margin: 0, flex: 1, fontSize: '13px' }}
          />
          <button
            type="button"
            className="button primary"
            onClick={() => sendMessage('')}
            disabled={isLoading}
            style={{ padding: '8px 18px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};
