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

function generateFallbackChatReply(message, musicalContext = null) {
  const lower = (message || '').toLowerCase();
  const songTitle = musicalContext?.songTitle || 'a música selecionada';
  const key = musicalContext?.key || 'G';
  const bpm = musicalContext?.bpm || 74;
  const difficulty = musicalContext?.difficulty || 'Médio';
  const chords = Array.isArray(musicalContext?.chords) ? musicalContext.chords : [];
  const chordsList = chords.length > 0 ? chords.join(', ') : 'acordes fundamentais';
  const structure = musicalContext?.structure || 'Intro • Verso • Refrão • Final';
  const isOlaria = songTitle.toLowerCase().includes('olaria') || chords.includes('Ab7M') || key === 'Cm';

  // 1. Contextual: "Facilitar música" / Easy Play
  if (lower.includes('facilitar') || lower.includes('fácil') || lower.includes('facil') || lower.includes('easy play')) {
    return `Para tocar **"${songTitle}"** de forma mais fácil:
1. **Ative o Easy Play 2.0**: No Virtuo, as dissonâncias e extensões complexas (como 9ª, 7M e baixos invertidos) são convertidas automaticamente para tríades fundamentais abertas.
2. **Uso de Capotraste (Smart Key)**: Se o tom ${key} exigir muitas pestanas, coloque o Capo para usar digitações abertas (como formato de Am ou Em) mantendo o pitch original.
3. **Mão Esquerda Suave**: Simplifique baixos invertidos (ex: toque a nota fundamental do acorde) para garantir estabilidade rítmica antes de adicionar passagens elaboradas.`;
  }

  // 2. Contextual: "Qual tom devo usar?" / Smart Key
  if (lower.includes('qual tom') || lower.includes('tom devo') || lower.includes('tom usar') || lower.includes('mudar tom')) {
    return `Diretriz de Tonalidade para **"${songTitle}"**:
- **Tom Atual**: ${key} (Andamento: ${bpm} BPM).
- **Voz e Tessitura**: Se o cantor(a) tiver extensão vocal mais grave (barítono/contralto), experimente descer 1 ou 2 semitons. Se for tenor/soprano, o tom atual (${key}) garante potência e brilho no clímax do refrão.
- **Instrumentistas**: O Virtuo Smart Key recomenda tocar com digitações abertas para garantir maior ressonância nos instrumentos acústicos.`;
  }

  // 3. Contextual: "Como estudar?" / Plano de Estudo
  if (lower.includes('como estudar') || lower.includes('estudo') || lower.includes('plano de')) {
    return `Plano de Estudo Estruturado para **"${songTitle}"** (${difficulty}):
- **Dia 1 (Acordes)**: Formação e digitação limpa dos acordes (${chordsList}).
- **Dia 2 (Trocas)**: Prática das transições mais rápidas com metrônomo a ${Math.round(bpm * 0.75)} BPM.
- **Dia 3 (Ritmo)**: Levada constante e acentuação no andamento alvo de ${bpm} BPM.
- **Dia 4 (Refrão)**: Dinâmica de crescendo e sustentação harmônica no refrão.
- **Dia 5 (Música Completa)**: Passagem de ponta a ponta com auto-scroll no Virtuo.
- **Dia 6 (Modo Banda)**: Sincronização com bateria, baixo e teclado sintetizados.
- **Dia 7 (Simulação de Apresentação)**: Ensaio geral no Modo Palco com leitura em tela cheia.`;
  }

  // 4. Contextual: "Montar ensaio" / Reunião de Equipe
  if (lower.includes('montar ensaio') || lower.includes('ensaio') || lower.includes('equipe') || lower.includes('repert')) {
    return `Checklist de Ensaio para **"${songTitle}"**:
1. **Andamento Travado**: Inicie o ensaio com o metrônomo fixado em ${bpm} BPM para que toda a banda internalize a pulsação.
2. **Mapa Estrutural**: Alinhe as seções com a equipe: ${structure}.
3. **Dinâmica em Camadas**:
   - **Verso**: Teclado em Pad contínuo e violão em arpejos limpos.
   - **Verso 2**: Entrada do bumbo suave e condução de baixo nas fundamentais.
   - **Refrão**: Toda a banda entra com dinâmica forte e abertura vocal.
4. **Passagem / Clímax**: Combine previamente a sustentação harmônica em ${key} para momentos de solo ou improviso.`;
  }

  // 5. Contextual: "Explicar acordes" / Análise Harmônica
  if (lower.includes('explicar acordes') || lower.includes('harmonia') || lower.includes('acordes') || lower.includes('graus')) {
    return `Análise Harmônica de **"${songTitle}"** (Tom ${key}):
- **Acordes Principais**: ${chordsList}.
- **Função Harmônica**: A harmonia combina repousos tonais estáveis com acordes de tensão expressiva, gerando atmosfera envolvente e dinâmica sonora moderna.
- **Dica para Teclado/Violão**: Evite duplicar notas graves já conduzidas pelo contrabaixo; utilize voicings abertos na região média para dar espaço à voz principal.`;
  }

  // 6. Contextual: "Preparar para tocar" / Palco
  if (lower.includes('preparar para') || lower.includes('palco') || lower.includes('ao vivo') || lower.includes('apresentar')) {
    return `Checklist de Palco Virtuo para **"${songTitle}"**:
- 🎯 **Afinação**: Use o Afinador Cromático do Virtuo para conferir corda por corda antes de iniciar a apresentação.
- 🥁 **BPM**: Confirme o metrônomo a ${bpm} BPM no Modo Palco.
- 📜 **Modo Palco Ativo**: Ative o Modo Palco para rolagem automática limpa e leitura sem distrações.
- 🎵 **Conexão Musical**: Respire fundo, mantenha a escuta ativa com o restante da banda e divirta-se tocando com excelência.`;
  }

  // Transições genéricas
  if (lower.includes('transi') || lower.includes('tom') || lower.includes('modula')) {
    return `Para transições harmônicas ao vivo:
1. **Acorde de Passagem (V7 ou V/V)**: Antes de entrar no novo tom, utilize a dominante da nova tonalidade (ex: para ir de G para D, prepare com A7 ou A/C#).
2. **Pivô Comum**: Encontre um acorde compartilhado pelas tonalidades (ex: entre G e D, Em é o vi de G e o ii de D).
3. **Pad e Dinâmica**: Deixe a banda recolher a dinâmica (pianíssimo), sustentando a nota fundamental no teclado enquanto a condução instrumental introduz o novo tema.`;
  }

  return `Como Diretor Musical Davi, oriento para **"${songTitle}"** (Tom ${key} • ${bpm} BPM):
- Mantenha a pulsação estável acompanhando o metrônomo integrado.
- Enriqueça os acordes com notas de tensão controladas mantendo clareza e sem embolar o som da banda.
- Conduza a dinâmica com sensibilidade: comece suave, construa o crescendo para o refrão e sustente a atmosfera nos momentos de clímax musical.`;
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

    // No modo econômico explícito ou sem API Key, atende localmente
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

    const fallbackReply = generateFallbackChatReply(message, musicalContext);
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

