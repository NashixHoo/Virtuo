// =============================================================
// VIRTUO STUDY PLAN GENERATOR
// src/music/study-plan.js
// Gera planos de estudo estruturados em 7 dias para domínio ministerial
// 100% determinístico, offline e adaptativo à dificuldade da música
// =============================================================

import { simplifyChord } from "./easy-play.js";

/**
 * Gera um plano de estudo de 7 dias com base na análise harmônica e técnica da música
 * 
 * @param {Object} song - Objeto da canção
 * @param {Object} [analysis] - Análise de Music Intelligence (opcional)
 * @returns {Object} Plano de estudo estruturado
 */
export function generateStudyPlan(song, analysis = null) {
  const title = song?.title || "Louvor Selecionado";
  const artist = song?.artist || "Ministério de Louvor";
  const key = song?.key || song?.originalKey || "G";
  const bpm = Number(song?.bpm) || 74;
  const warmUpBpm = Math.max(40, Math.round(bpm * 0.75));

  const chords = (analysis?.uniqueChords && analysis.uniqueChords.length > 0)
    ? analysis.uniqueChords
    : (typeof song?.chords === "string" 
        ? [...new Set(song.chords.match(/[A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|[0-9]+)*(?:\/[A-G][b#]*)?/g) || [])]
        : ["G", "C", "D", "Em"]);

  const difficulty = analysis?.difficulty || song?.difficulty || "Médio";

  // Gera transições-chave de acordes
  const keyTransitions = [];
  for (let i = 0; i < chords.length - 1 && keyTransitions.length < 4; i++) {
    keyTransitions.push(`${chords[i]} ➔ ${chords[i + 1]}`);
  }
  if (chords.length > 2 && keyTransitions.length < 4) {
    keyTransitions.push(`${chords[chords.length - 1]} ➔ ${chords[0]}`);
  }

  const days = [
    {
      day: 1,
      name: "Dia 1",
      title: "Acordes",
      subtitle: "Formação e Postura",
      focus: "Memorização física e sonoridade limpa de cada acorde",
      practiceMinutes: 20,
      tasks: [
        `Memorizar a digitação dos acordes principais da música: ${chords.slice(0, 6).join(", ")}.`,
        `Tocar cada acorde corda por corda (ou nota por nota no teclado) garantindo que todas as notas soem limpas.`,
        `Se algum acorde apresentar dificuldade, utilize a versão alternativa do Easy Play.`
      ],
      tip: "Mantenha o polegar atrás do braço do instrumento para facilitar a abertura dos dedos."
    },
    {
      day: 2,
      name: "Dia 2",
      title: "Trocas",
      subtitle: "Transições sem Interrupção",
      focus: "Fluidez na transição entre acordes consecutivos",
      practiceMinutes: 25,
      tasks: [
        `Treinar as transições críticas: ${keyTransitions.slice(0, 3).join(" | ")}.`,
        `Utilizar o metrônomo a ${warmUpBpm} BPM (75% da velocidade final) sem parar entre as trocas.`,
        `Antecipar mentalmente o próximo formato 1 tempo antes da mudança de compasso.`
      ],
      tip: "Identifique dedos guias (que não saem da corda) para economizar movimento e ganhar agilidade."
    },
    {
      day: 3,
      name: "Dia 3",
      title: "Ritmo",
      subtitle: "Pulsação e Condução Worship",
      focus: "Precisão rítmica com o metrônomo no andamento canônico",
      practiceMinutes: 20,
      tasks: [
        `Configurar o metrônomo Virtuo para ${bpm} BPM.`,
        `Praticar a levada da mão direita/ritmo no chimbal ou violão abafado (sem acordes) até internalizar a acentuação.`,
        `Unir a levada rítmica com a progressão básica de 4 compassos.`
      ],
      tip: "No worship congregacional, a firmeza nos tempos 1 e 3 do compasso traz segurança para a congregação."
    },
    {
      day: 4,
      name: "Dia 4",
      title: "Refrão",
      subtitle: "Clímax e Dinâmica Musical",
      focus: "Transição do verso para o refrão com elevação da dinâmica",
      practiceMinutes: 25,
      tasks: [
        `Isolar a seção do refrão da música e praticar 5 repetições completas.`,
        `Trabalhar o crescendo instrumental nos dois compassos que antecedem o refrão.`,
        `Praticar a sustentação harmônica durante o refrão para dar espaço à melodia das vozes.`
      ],
      tip: "Abra os acordes nas regiões mais agudas para dar brilho e expansão sonora no refrão."
    },
    {
      day: 5,
      name: "Dia 5",
      title: "Música completa",
      subtitle: "Execução de Ponta a Ponta",
      focus: "Integração das seções com o mapa estrutural",
      practiceMinutes: 30,
      tasks: [
        `Executar a música inteira do início ao fim acompanhando a cifra no Virtuo.`,
        `Ativar a rolagem automática (Auto-scroll) na velocidade adequada.`,
        `Fazer 3 passagens completas sem interromper mesmo em caso de pequenas falhas.`
      ],
      tip: "Se errar uma nota no palco, continue no tempo! O ritmo é mais importante que uma nota isolada."
    },
    {
      day: 6,
      name: "Dia 6",
      title: "Modo Banda",
      subtitle: "Simulação de Grupo com Synthesizer",
      focus: "Alinhamento com bateria, baixo e teclado sintetizados",
      practiceMinutes: 30,
      tasks: [
        `Abrir o Modo Banda do Virtuo na tonalidade de ${key} a ${bpm} BPM.`,
        `Ajustar os volumes individuais dos canais (bateria, baixo e teclado) para criar sua mix de estúdio.`,
        `Tocar junto com o sintetizador prestando atenção nas entradas do baixo e nas viradas de bateria.`
      ],
      tip: "Ouça o bumbo da bateria para sincronizar o ataque da mão direita perfeitamente no tempo forte."
    },
    {
      day: 7,
      name: "Dia 7",
      title: "Simulação de apresentação",
      subtitle: "Ensaio Geral em Modo Ministro",
      focus: "Preparação espiritual e técnica em modo palco sem distrações",
      practiceMinutes: 25,
      tasks: [
        `Abrir a música no Modo Ministro (tela limpa com metrônomo visual discreto).`,
        `Fazer a passagem completa em pé, com postura de ministração real.`,
        `Conferir afinação com o Afinador Cromático Virtuo antes de iniciar.`
      ],
      tip: "Toque com o coração em adoração. A técnica serve para liberar a liberdade espiritual no culto."
    }
  ];

  return {
    songTitle: title,
    artist,
    key,
    bpm,
    difficulty,
    days,
    totalDays: 7,
    totalPracticeMinutes: days.reduce((acc, d) => acc + d.practiceMinutes, 0),
    summary: `Plano de 7 dias desenvolvido pelo Virtuo Music Intelligence para dominar "${title}" no tom de ${key} a ${bpm} BPM.`
  };
}
