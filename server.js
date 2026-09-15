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
    model: 'gemini-3.8-flash',
    engine: hasKey ? 'Google Gemini 3.8 Flash' : 'Virtuo Algorithmic Musical Engine'
  });
});

// Virtuo AI Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem obrigatória' });
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

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: message,
          config: {
            systemInstruction
          }
        });

        const replyText = response.text || '';
        return res.json({ success: true, reply: replyText, source: 'gemini' });
      } catch (geminiErr) {
        console.warn('[Virtuo AI Chat] Gemini API error, using fallback:', geminiErr.message);
      }
    }

    const fallbackReply = generateFallbackChatReply(message);
    return res.json({ success: true, reply: fallbackReply, source: 'virtuo-engine' });
  } catch (error) {
    console.error('[Virtuo AI Chat] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Virtuo AI Endpoint: Análise Harmônica e Sugestões Musicais
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { songTitle, currentKey, originalKey, bpm, chords, musicianLevel } = req.body || {};
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

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const text = response.text;
        const parsed = JSON.parse(text);
        return res.json({ success: true, advice: parsed, source: 'gemini' });
      } catch (geminiErr) {
        console.warn('[Virtuo AI] Gemini API error, falling back to algorithmic advice:', geminiErr.message);
      }
    }

    // Fallback algorítmico seguro
    const fallbackAdvice = generateAlgorithmicHarmonicAdvice(songTitle, currentKey, bpm, musicianLevel);
    return res.json({ success: true, advice: fallbackAdvice, source: 'virtuo-engine' });
  } catch (error) {
    console.error('[Virtuo AI] Error handling suggestion:', error);
    res.status(500).json({ success: false, error: error.message });
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

