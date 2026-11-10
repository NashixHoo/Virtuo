// =============================================================
// VIRTUO BACKEND - AI SERVICE (Davi Musical Director)
// backend/services/ai-service.ts
// =============================================================

let genAIClient: any = null;

export async function getGenAIClient() {
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
    } catch (err: any) {
      console.warn('Failed to load @google/genai:', err.message);
      return null;
    }
  }
  return genAIClient;
}

// In-Memory Smart Cache for AI requests
const aiResponseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export function getCached(key: string) {
  const item = aiResponseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    aiResponseCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCached(key: string, data: any) {
  if (aiResponseCache.size > 150) {
    const oldestKey = aiResponseCache.keys().next().value;
    if (oldestKey) aiResponseCache.delete(oldestKey);
  }
  aiResponseCache.set(key, { data, timestamp: Date.now() });
}

export function generateAlgorithmicHarmonicAdvice(songTitle?: string, currentKey?: string, bpm?: number, musicianLevel?: string) {
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

export function generateFallbackChatReply(message: string, musicalContext: any = null) {
  const lower = (message || '').toLowerCase();
  const songTitle = musicalContext?.songTitle || 'a música selecionada';
  const key = musicalContext?.key || 'G';
  const bpm = musicalContext?.bpm || 74;
  const difficulty = musicalContext?.difficulty || 'Médio';
  const chords = Array.isArray(musicalContext?.chords) ? musicalContext.chords : [];
  const chordsList = chords.length > 0 ? chords.join(', ') : 'acordes fundamentais';
  const structure = musicalContext?.structure || 'Intro • Verso • Refrão • Final';

  if (lower.includes('facilitar') || lower.includes('fácil') || lower.includes('facil') || lower.includes('easy play')) {
    return `Para tocar **"${songTitle}"** de forma mais fácil:
1. **Ative o Easy Play 2.0**: No Virtuo, as dissonâncias e extensões complexas (como 9ª, 7M e baixos invertidos) são convertidas automaticamente para tríades fundamentais abertas.
2. **Uso de Capotraste (Smart Key)**: Se o tom ${key} exigir muitas pestanas, coloque o Capo para usar digitações abertas (como formato de Am ou Em) mantendo o pitch original.
3. **Mão Esquerda Suave**: Simplifique baixos invertidos (ex: toque a nota fundamental do acorde) para garantir estabilidade rítmica antes de adicionar passagens elaboradas.`;
  }

  if (lower.includes('qual tom') || lower.includes('tom devo') || lower.includes('tom usar') || lower.includes('mudar tom')) {
    return `Diretriz de Tonalidade para **"${songTitle}"**:
- **Tom Atual**: ${key} (Andamento: ${bpm} BPM).
- **Voz e Tessitura**: Se o cantor(a) tiver extensão vocal mais grave (barítono/contralto), experimente descer 1 ou 2 semitons. Se for tenor/soprano, o tom atual (${key}) garante potência e brilho no clímax do refrão.
- **Instrumentistas**: O Virtuo Smart Key recomenda tocar com digitações abertas para garantir maior ressonância nos instrumentos acústicos.`;
  }

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

  if (lower.includes('explicar acordes') || lower.includes('harmonia') || lower.includes('acordes') || lower.includes('graus')) {
    return `Análise Harmônica de **"${songTitle}"** (Tom ${key}):
- **Acordes Principais**: ${chordsList}.
- **Função Harmônica**: A harmonia combina repousos tonais estáveis com acordes de tensão expressiva, gerando atmosfera envolvente e dinâmica sonora moderna.
- **Dica para Teclado/Violão**: Evite duplicar notas graves já conduzidas pelo contrabaixo; utilize voicings abertos na região média para dar espaço à voz principal.`;
  }

  if (lower.includes('preparar para') || lower.includes('palco') || lower.includes('ao vivo') || lower.includes('apresentar')) {
    return `Checklist de Palco Virtuo para **"${songTitle}"**:
- 🎯 **Afinação**: Use o Afinador Cromático do Virtuo para conferir corda por corda antes de iniciar a apresentação.
- 🥁 **BPM**: Confirme o metrônomo a ${bpm} BPM no Modo Palco.
- 📜 **Modo Palco Ativo**: Ative o Modo Palco para rolagem automática limpa e leitura sem distrações.
- 🎵 **Conexão Musical**: Respire fundo, mantenha a escuta ativa com o restante da banda e divirta-se tocando com excelência.`;
  }

  return `Como Diretor Musical Davi, oriento para **"${songTitle}"** (Tom ${key} • ${bpm} BPM):
- Mantenha a pulsação estável acompanhando o metrônomo integrado.
- Enriqueça os acordes com notas de tensão controladas mantendo clareza e sem embolar o som da banda.
- Conduza a dinâmica com sensibilidade: comece suave, construa o crescendo para o refrão e sustente a atmosfera nos momentos de clímax musical.`;
}

export async function callAiWithTimeout<T>(promise: Promise<T>, timeoutMs = 3500): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
