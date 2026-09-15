import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Lazy Google GenAI Client
let genAIClient = null;
async function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (err) {
      console.warn('Failed to load @google/genai:', err.message);
      return null;
    }
  }
  return genAIClient;
}

// In-Memory Smart Cache for AI requests (prevents token waste)
const aiResponseCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de retenção

function getCached(key) {
  const item = aiResponseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    aiResponseCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  // Limita tamanho do cache
  if (aiResponseCache.size > 150) {
    const oldestKey = aiResponseCache.keys().next().value;
    aiResponseCache.delete(oldestKey);
  }
  aiResponseCache.set(key, { data, timestamp: Date.now() });
}

// Algorithmic musical analysis fallback (guarantees 100% reliability offline or without key)
function generateAlgorithmicHarmonicAdvice(songTitle, currentKey, bpm, musicianLevel) {
  return {
    summary: `Arranjo para "${songTitle || 'Música'}" no tom de ${currentKey || 'G'} a ${bpm || 74} BPM.`,
    recommendations: [
      `Dinâmica de Worship: Comece com teclado em pad suave e violão arpejado, adicionando baixo e bumbo suave no segundo verso.`,
      `Substituições Harmônicas: Substitua acordes maiores simples por 9ª ou sus4 (ex: ${currentKey || 'G'}9, C9, D4) para uma atmosfera congregacional mais rica.`,
      `Transição e Clímax: No refrão final e ministração espontânea, mantenha a marcação de semínima no bumbo e eleve a intensidade das guitarras com delay e shimmer.`,
      `Dica para nível ${musicianLevel || 'Intermediário'}: Use acordes com baixo invertido (ex: D/F#, C/E) para condução vocal e harmônica suave entre as estrofes.`
    ],
    generatedBy: "Virtuo Musical Engine"
  };
}

function generateFallbackChatReply(message) {
  const lower = (message || '').toLowerCase();
  if (lower.includes('transi') || lower.includes('tom') || lower.includes('modula')) {
    return `Para transições harmônicas no louvor congregacional:
1. **Acorde de Passagem (V7 ou V/V)**: Antes de entrar no novo tom, utilize a dominante da nova tonalidade (ex: para ir de G para D, prepare com A7 ou A/C#).
2. **Pivô Comum**: Encontre um acorde compartilhado pelas tonalidades (ex: entre G e D, Em é o vi de G e o ii de D).
3. **Pad e Dinâmica**: Deixe a banda recolher a dinâmica (pianíssimo), sustentando a nota fundamental no teclado enquanto a condução vocal introduz o novo tema.`;
  }
  if (lower.includes('ensaio') || lower.includes('equipe') || lower.includes('dinam')) {
    return `Dicas do Virtuo para um ensaio ministerial de alta qualidade:
1. **Alinhamento do Andamento**: Inicie fixando o BPM no metrônomo antes de começar a música.
2. **Mapa Dinâmico**: Combine previamente onde a bateria entra (Verso 1 em pad, Verso 2 bumbo suave, Refrão forte, Espontâneo aberto).
3. **Simplificação Inteligente (Easy Play)**: Se algum músico estiver em desenvolvimento, utilize acordes fundamentais sem dissonâncias complexas para manter a solidez da base.`;
  }
  return `Como Diretor Musical Virtuo, recomendo:
- Manter o andamento firme com o metrônomo integrado.
- Enriquecer os acordes com notas de tensão controladas (9ª, sus4) mantendo clareza sonora.
- Conduzir o baixo por graus conjuntos para suavizar a transição entre estrofes e refrão.`;
}

// Virtuo AI Status Endpoint
app.get('/api/ai/status', async (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    active: true,
    geminiEnabled: hasKey,
    model: 'gemini-2.5-flash',
    engine: hasKey ? 'Google Gemini 2.5 Flash' : 'Virtuo Algorithmic Musical Engine'
  });
});

// Helper to run AI call with strict timeout fallback
async function callAiWithTimeout(promise, timeoutMs = 3500) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Virtuo AI Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, economyMode } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem obrigatória' });
    }

    const cacheKey = `chat:${message.trim().toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        reply: cached, 
        source: 'cache',
        elapsedMs: Date.now() - startTime
      });
    }

    // No modo econômico explícito ou sem API Key, atende localmente
    if (economyMode) {
      const fallbackReply = generateFallbackChatReply(message);
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
        const systemInstruction = `Você é o Virtuo AI, um maestro, diretor musical e pastor de louvor de altíssimo nível.
Você orienta ministros, músicos e equipes de louvor sobre:
- Arranjos para worship, hinos e louvores contemporâneos.
- Transposição inteligente, acordes com tensões (9, 11, sus, baixos invertidos) e rearmonização.
- Dinâmica instrumental para momentos de oração, ministração da palavra e cântico espontâneo.
- Dicas práticas e encorajadoras para ensaios e alinhamento de palco.
Responda de forma direta, clara, acolhedora e com formatação em tópicos fáceis de ler no palco ou ensaio.`;

        const response = await callAiWithTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
              systemInstruction
            }
          }),
          3500
        );

        const replyText = response.text || '';
        setCached(cacheKey, replyText);
        return res.json({ 
          success: true, 
          reply: replyText, 
          source: 'gemini',
          elapsedMs: Date.now() - startTime
        });
      } catch (geminiErr) {
        console.warn('[Virtuo AI Chat] Gemini API error/timeout, using fallback:', geminiErr.message);
      }
    }

    const fallbackReply = generateFallbackChatReply(message);
    setCached(cacheKey, fallbackReply);
    return res.json({ 
      success: true, 
      reply: fallbackReply, 
      source: 'virtuo-local',
      elapsedMs: Date.now() - startTime
    });
  } catch (error) {
    console.error('[Virtuo AI Chat] Error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao processar solicitação musical. Utilizando modo inteligente local.' });
  }
});

// Virtuo AI Endpoint: Análise Harmônica e Sugestões Musicais
app.post('/api/ai/suggest', async (req, res) => {
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

    // Se solicitado modo econômico, responde com motor algorítmico local
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

        const text = response.text;
        const parsed = JSON.parse(text);
        setCached(cacheKey, parsed);
        return res.json({ 
          success: true, 
          advice: parsed, 
          source: 'gemini',
          elapsedMs: Date.now() - startTime
        });
      } catch (geminiErr) {
        console.warn('[Virtuo AI] Gemini API error/timeout, falling back to algorithmic advice:', geminiErr.message);
      }
    }

    // Fallback algorítmico seguro
    const fallbackAdvice = generateAlgorithmicHarmonicAdvice(songTitle, currentKey, bpm, musicianLevel);
    setCached(cacheKey, fallbackAdvice);
    return res.json({ 
      success: true, 
      advice: fallbackAdvice, 
      source: 'virtuo-local',
      elapsedMs: Date.now() - startTime
    });
  } catch (error) {
    console.error('[Virtuo AI] Error handling suggestion:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao processar análise. Utilizando arranjo inteligente local.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

