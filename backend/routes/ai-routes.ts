// =============================================================
// VIRTUO BACKEND - AI ROUTES (/api/ai)
// backend/routes/ai-routes.ts
// =============================================================

import { Router, Request, Response } from 'express';
import { 
  getGenAIClient, 
  getCached, 
  setCached, 
  generateAlgorithmicHarmonicAdvice, 
  generateFallbackChatReply, 
  callAiWithTimeout 
} from '../services/ai-service';

export const aiRouter = Router();

aiRouter.get('/status', async (req: Request, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    active: true,
    geminiEnabled: hasKey,
    model: 'gemini-2.5-flash',
    engine: hasKey ? 'Google Gemini 2.5 Flash' : 'Virtuo Algorithmic Musical Engine'
  });
});

aiRouter.post('/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { message, economyMode, musicalContext } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem obrigatória' });
    }

    const contextHash = musicalContext?.songTitle ? `${musicalContext.songTitle}:${musicalContext.key || ''}` : 'general';
    const cacheKey = `chat:${contextHash}:${message.trim().toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        reply: cached, 
        source: 'cache',
        elapsedMs: Date.now() - startTime
      });
    }

    if (economyMode) {
      const fallbackReply = generateFallbackChatReply(message, musicalContext);
      setCached(cacheKey, fallbackReply);
      return res.json({ 
        success: true, 
        reply: fallbackReply, 
        source: 'virtuo-local',
        elapsedMs: Date.now() - startTime
      });
    }

    const ai = await getGenAIClient();
    if (ai) {
      try {
        const systemInstruction = `Você é Davi, Diretor Musical do Virtuo, maestro e consultor de arranjo e harmonia de altíssimo nível.
Você orienta instrumentistas, cantores, bandas e diretores musicais sobre:
- Arranjos para apresentações ao vivo, bandas, orquestras e produções musicais contemporâneas.
- Transposição inteligente, acordes com tensões (9, 11, sus, baixos invertidos) e rearmonização.
- Dinâmica instrumental para versos suaves, clímax de refrão e transições harmônicas.
- Dicas práticas e encorajadoras para ensaios e alinhamento de palco.
Sempre responda com acolhimento, clareza e formatação em tópicos fáceis de ler no palco ou ensaio.
${musicalContext ? `
CONTEXTO MUSICAL ATUAL:
- Música: ${musicalContext.songTitle || 'Nenhuma'}
- Artista: ${musicalContext.artist || 'Desconhecido'}
- Tom Atual: ${musicalContext.key || 'G'} (Original: ${musicalContext.originalKey || musicalContext.key || 'G'})
- BPM: ${musicalContext.bpm || 74}
- Dificuldade: ${musicalContext.difficulty || 'Média'}
- Acordes: ${(musicalContext.chords || []).join(', ')}
- Estrutura: ${musicalContext.structure || 'Intro • Verso • Refrão • Final'}
- Modo Ativo: ${musicalContext.currentMode || 'cifra'}
Responda considerando diretamente este contexto musical.` : ''}`;

        const promptWithContext = musicalContext?.songTitle 
          ? `[Contexto da Música: ${musicalContext.songTitle} - Tom: ${musicalContext.key} - ${musicalContext.bpm} BPM]\n${message}`
          : message;

        const response = await callAiWithTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptWithContext,
            config: {
              systemInstruction
            }
          }),
          3500
        );

        const replyText = (response as any).text || '';
        setCached(cacheKey, replyText);
        return res.json({ 
          success: true, 
          reply: replyText, 
          source: 'gemini',
          elapsedMs: Date.now() - startTime
        });
      } catch (geminiErr: any) {
        console.warn('[Virtuo AI Chat] Gemini API error/timeout, using fallback:', geminiErr.message);
      }
    }

    const fallbackReply = generateFallbackChatReply(message, musicalContext);
    setCached(cacheKey, fallbackReply);
    return res.json({ 
      success: true, 
      reply: fallbackReply, 
      source: 'virtuo-local',
      elapsedMs: Date.now() - startTime
    });
  } catch (error: any) {
    console.error('[Virtuo AI Chat] Error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao processar solicitação musical.' });
  }
});

aiRouter.post('/suggest', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { songTitle, currentKey, originalKey, bpm, chords, musicianLevel, economyMode } = req.body || {};

    const cacheKey = `suggest:${songTitle || ''}:${currentKey || ''}:${bpm || ''}:${musicianLevel || ''}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        advice: cached, 
        source: 'cache',
        elapsedMs: Date.now() - startTime
      });
    }

    if (economyMode) {
      const fallbackAdvice = generateAlgorithmicHarmonicAdvice(songTitle, currentKey, bpm, musicianLevel);
      setCached(cacheKey, fallbackAdvice);
      return res.json({ 
        success: true, 
        advice: fallbackAdvice, 
        source: 'virtuo-local',
        elapsedMs: Date.now() - startTime
      });
    }

    const ai = await getGenAIClient();
    if (ai) {
      try {
        const prompt = `Você é o Virtuo AI, um maestro e diretor musical congregacional especialista em louvor e adoração.
Analise a seguinte música e forneça sugestões práticas e inspiradoras para ensaio e ministração ao vivo:
- Música: "${songTitle || 'Sem título'}"
- Tom Atual: ${currentKey || 'G'} (Original: ${originalKey || currentKey || 'G'})
- Andamento: ${bpm || 74} BPM
- Nível da equipe: ${musicianLevel || 'Intermediário'}
- Trecho da cifra / acordes:
${chords ? chords.slice(0, 500) : 'Acordes padrão da canção'}

Responda em JSON com o formato:
{
  "summary": "Resumo em 1 frase do clima e intenção harmônica",
  "recommendations": [
    "Dica de dinâmica de palco e instrumentação",
    "Sugestão de rearmonização ou acordes com tensões (9, sus)",
    "Dica de transição para espontâneo ou final",
    "Orientação para o nível musical da equipe"
  ]
}`;

        const response = await callAiWithTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          }),
          3500
        );

        const text = (response as any).text;
        const parsed = JSON.parse(text);
        setCached(cacheKey, parsed);
        return res.json({ 
          success: true, 
          advice: parsed, 
          source: 'gemini',
          elapsedMs: Date.now() - startTime
        });
      } catch (geminiErr: any) {
        console.warn('[Virtuo AI] Gemini API error/timeout, falling back to algorithmic advice:', geminiErr.message);
      }
    }

    const fallbackAdvice = generateAlgorithmicHarmonicAdvice(songTitle, currentKey, bpm, musicianLevel);
    setCached(cacheKey, fallbackAdvice);
    return res.json({ 
      success: true, 
      advice: fallbackAdvice, 
      source: 'virtuo-local',
      elapsedMs: Date.now() - startTime
    });
  } catch (error: any) {
    console.error('[Virtuo AI] Error handling suggestion:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao processar análise.' });
  }
});
