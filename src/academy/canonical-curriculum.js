// =============================================================
// VIRTUO ACADEMY: CANONICAL PEDAGOGICAL CURRICULUM
// src/academy/canonical-curriculum.js
// Metodologia de Ensino Musical Puro — Do Nível Zero ao Profissional
// =============================================================

import { ACADEMY_LEVELS, ACADEMY_INSTRUMENTS } from "../database/schema.js";

export const CANONICAL_COURSES = [
  {
    id: "curso-violao-completo",
    title: "Violão Essencial & Louvor: Do Zero ao Profissional",
    slug: "violao",
    instrumentId: "violao",
    instrumentName: "Violão",
    family: "cordas",
    badge: "🎸",
    description: "Método completo de violão para música congregacional e popular. Postura correta, digitação limpa, batidas dinâmicas, dedilhados e arranjos avançados.",
    levelMin: 0,
    levelMax: 5,
    estimatedHours: 48,
    isPublished: true,
    modules: [
      {
        id: "mod-violao-lvl0",
        courseId: "curso-violao-completo",
        level: 0,
        order: 1,
        title: "Nível 0: Primeiros Passos & Anatomia do Instrumento",
        description: "Postura ergonômica sem lesões, afinação cromática precisa e exercícios preliminares de independência dos dedos.",
        icon: "🌱",
        lessons: [
          {
            id: "les-violao-0-1",
            level: 0,
            order: 1,
            title: "Anatomia do Violão e Postura Ergonômica",
            objective: "Aprender a segurar o violão com apoio equilibrado, sem curvar a coluna e sem sobrecarregar o punho esquerdo.",
            targetBpm: 50,
            timeSignature: "4/4",
            theoryText: "O violão possui braço, escala, trastes, cavalete e tampo harmônico. A postura correta mantém o polegar atrás do braço, alinhado entre o dedo 1 e 2, garantindo que a palma da mão não cole na madeira.",
            diagrams: [
              { type: "posture", title: "Posicionamento do Polegar", notes: "Polegar relaxado na linha central da traseira do braço." }
            ],
            exercise: {
              title: "Respiração & Apoio do Instrumento",
              instructions: "Posicione o violão sobre a perna direita (ou esquerda no modo clássico), ajuste o ângulo do braço a 30° e respire fundo mantendo os ombros relaxados por 2 minutos.",
              targetReps: 3,
              minimumDurationSeconds: 120
            },
            checkpoints: [
              "Coluna ereta e ombros relaxados",
              "Violão apoiado firmemente sem escorregar",
              "Punho da mão da escala relaxado e reto"
            ]
          },
          {
            id: "les-violao-0-2",
            level: 0,
            order: 2,
            title: "Afinação Cromática Passo a Passo",
            objective: "Identificar as notas de cada corda solta (E-A-D-G-B-E) e afinar utilizando o afinador de alta precisão do Virtuo.",
            targetBpm: 60,
            timeSignature: "4/4",
            theoryText: "A afinação padrão de um violão de 6 cordas da mais grave para a mais aguda é: 6ª corda (Mi / E2), 5ª corda (Lá / A2), 4ª corda (Ré / D3), 3ª corda (Sol / G3), 2ª corda (Si / B3) e 1ª corda (Mi / E4).",
            diagrams: [
              { type: "tuning", title: "Cordas Soltas Padrão", notes: "6ª=E2 (82.4Hz), 5ª=A2 (110Hz), 4ª=D3 (146.8Hz), 3ª=G3 (196Hz), 2ª=B3 (246.9Hz), 1ª=E4 (329.6Hz)" }
            ],
            exercise: {
              title: "Calibração com Afinador Pro",
              instructions: "Abra o Afinador Pro no Virtuo, toque cada corda solta suavemente com o polegar e gire a tarraxa até a agulha estabilizar no centro verde (±2 cents).",
              targetReps: 6,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "6ª corda em E2 afinada",
              "5ª e 4ª cordas em A2 e D3 afinadas",
              "3ª, 2ª e 1ª cordas em G3, B3 e E4 afinadas"
            ]
          },
          {
            id: "les-violao-0-3",
            level: 0,
            order: 3,
            title: "Independência dos Dedos (Exercício 1-2-3-4)",
            objective: "Desenvolver força e independência mecânica nos dedos 1, 2, 3 e 4 da mão esquerda sem estalar os tendões.",
            targetBpm: 60,
            timeSignature: "4/4",
            theoryText: "Pressione a corda logo atrás do traste metálico, usando a ponta do dedo perpendicular à escala. Isso produz som limpo com mínimo esforço.",
            exercise: {
              title: "Caminhada Cromática Lenta",
              instructions: "Toque as casas 1, 2, 3 e 4 na 1ª corda com os dedos 1, 2, 3 e 4 sequencialmente a 60 BPM. Repita subindo pelas cordas 2, 3, 4, 5 e 6.",
              targetReps: 5,
              minimumDurationSeconds: 240
            },
            checkpoints: [
              "Nenhum dedo trastejando ou abafando o som",
              "Movimento com o metrônomo a 60 BPM",
              "Polegar traseiro sem apertar com força excessiva"
            ]
          }
        ]
      },
      {
        id: "mod-violao-lvl1",
        courseId: "curso-violao-completo",
        level: 1,
        order: 2,
        title: "Nível 1: Fundamentos & Primeiros Acordes Abertos",
        description: "Formação dos acordes naturais maiores e menores abertos (C, D, E, G, A, Em, Am, Dm) e primeira batida 4/4.",
        icon: "🎵",
        lessons: [
          {
            id: "les-violao-1-1",
            level: 1,
            order: 1,
            title: "A Tríade de Ouro: G, C e D",
            objective: "Dominar os três acordes mais utilizados na música e realizar a transição fluida entre eles.",
            targetBpm: 65,
            timeSignature: "4/4",
            theoryText: "Os acordes de G (Sol Maior), C (Dó Maior) e D (Ré Maior) formam a base tonal do Tom de Sol Maior (I, IV e V graus). Praticar a âncora do dedo 3 facilita a troca.",
            exercise: {
              title: "Ciclo de 4 Compassos G - C - D - G",
              instructions: "Toque 4 tempos de G, mude para C por 4 tempos, D por 4 tempos e retorne para G. Mantenha o ritmo constante sem parar na mudança.",
              targetReps: 4,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Dedo 3 ou 4 como âncora na 1ª/2ª corda",
              "Todas as cordas soando límpidas sem abafamento acidental",
              "Transição sem pausar o compasso"
            ]
          },
          {
            id: "les-violao-1-2",
            level: 1,
            order: 2,
            title: "Acordes Menores Abertos: Em, Am e Dm",
            objective: "Introduzir a sonoridade menor melancólica e introspectiva essencial para o louvor.",
            targetBpm: 70,
            timeSignature: "4/4",
            theoryText: "A terça menor confere a sonoridade reflexiva. O Em utiliza apenas dois dedos, servindo de porta de entrada ideal para acordes menores.",
            exercise: {
              title: "Progressão Em - C - G - D",
              instructions: "Toque a clássica sequência vi - IV - I - V a 70 BPM com metrônomo.",
              targetReps: 4,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Em soando com todas as 6 cordas abertas",
              "Am tocado da 5ª corda para baixo",
              "Dm tocado da 4ª corda para baixo"
            ]
          }
        ]
      },
      {
        id: "mod-violao-lvl2",
        courseId: "curso-violao-completo",
        level: 2,
        order: 3,
        title: "Nível 2: Levadas Rítmicas & Mudança Fluida",
        description: "Batidas congregacionais estruturadas, controle de dinâmicas no metrônomo e leitura harmônica de cifras.",
        icon: "🎸",
        lessons: [
          {
            id: "les-violao-2-1",
            level: 2,
            order: 1,
            title: "A Levada Universal de Worship (4/4)",
            objective: "Dominar o padrão rítmico ↓ ↓↑ ↑↓↑ com dinâmica suave nos versos e firmeza no refrão.",
            targetBpm: 72,
            timeSignature: "4/4",
            theoryText: "A levada de Louvor 4/4 distribui os acentos nos tempos 2 e 4 (caixa da bateria), mantendo a subdivisão em colcheias fluindo naturalmente.",
            exercise: {
              title: "Aplicação Rítmica Contínua",
              instructions: "Execute a levada de 4 compassos em G e Em a 72 BPM com o metrônomo Virtuo sem perder a subdivisão rítmica.",
              targetReps: 5,
              minimumDurationSeconds: 200
            },
            checkpoints: [
              "Pulso constante da mão direita sem travar",
              "Acentos no tempo 2 e 4",
              "Dinâmica crescente suave"
            ]
          }
        ]
      },
      {
        id: "mod-violao-lvl3",
        courseId: "curso-violao-completo",
        level: 3,
        order: 4,
        title: "Nível 3: Harmonia Intermediária & Pestanas",
        description: "Técnica biomecânica de pestanas sem sobrecarga articular, dedilhados e introdução a acordes com nona.",
        icon: "🎼",
        lessons: [
          {
            id: "les-violao-3-1",
            level: 3,
            order: 1,
            title: "Desmistificando a Pestana: F e Bm",
            objective: "Posicionar a lateral do dedo 1 próximo ao traste metálico, utilizando o peso do braço em vez da força bruta da mão.",
            targetBpm: 68,
            timeSignature: "4/4",
            theoryText: "A pestana não deve ser feita com a polpa macia do dedo, mas sim com a lateral óssea ligeiramente inclinada. O apoio vem da gravidade do braço esquerdo puxando para trás, e não do polegar esmagando o braço.",
            exercise: {
              title: "Pestana Progressiva de 2 Minutos",
              instructions: "Monte Fá Maior (F), toque corda por corda para verificar o som límpido. Relaxe 5 segundos e monte Si Menor (Bm).",
              targetReps: 5,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Dedo 1 esticado usando a quina óssea",
              "Sem dor na eminência tenar da mão",
              "Todas as cordas ressoando sem abafamento"
            ]
          }
        ]
      },
      {
        id: "mod-violao-lvl4",
        courseId: "curso-violao-completo",
        level: 4,
        order: 5,
        title: "Nível 4: Campo Harmônico, Acordes com Sétima & Arranjos",
        description: "Estrutura do Campo Harmônico Maior, tétrades (7M, m7), voice leading e acompanhamento dinâmico de ministros de louvor.",
        icon: "⚡",
        lessons: [
          {
            id: "les-violao-4-1",
            level: 4,
            order: 1,
            title: "O Campo Harmônico Maior em Tétrades",
            objective: "Compreender e aplicar os 7 graus com suas respectivas qualidades: I7M, IIm7, IIIm7, IV7M, V7, VIm7 e VIIm7(b5).",
            targetBpm: 75,
            timeSignature: "4/4",
            theoryText: "Entender que em qualquer tonalidade maior os acordes I e IV são 7M, os II, III e VI são menores com sétima, o V é dominante e o VII é meio-diminuto liberta o músico de decorar cifras de forma isolada.",
            exercise: {
              title: "Ciclo de Tétrades em C Maior",
              instructions: "Toque C7M - Dm7 - Em7 - F7M - G7 - Am7 - Bm7(b5) - C7M em arpejos lentos a 75 BPM.",
              targetReps: 3,
              minimumDurationSeconds: 240
            },
            checkpoints: [
              "Reconhecimento imediato do grau harmônico",
              "Uso correto das notas de extensão",
              "Condução suave de vozes sem saltos bruscos"
            ]
          }
        ]
      },
      {
        id: "mod-violao-lvl5",
        courseId: "curso-violao-completo",
        level: 5,
        order: 6,
        title: "Nível 5: Profissional, Re-harmonização & Domínio Musical",
        description: "Harmonia moderna, substituições tritonais, re-harmonização congregacional respeitando a melodia e liderança de naipe.",
        icon: "👑",
        lessons: [
          {
            id: "les-violao-5-1",
            level: 5,
            order: 1,
            title: "Re-harmonização Sofisticada: Baixo Pedal e Inversões",
            objective: "Elevar o acompanhamento harmônico utilizando baixos em terças, sétimas e pedal de tônica.",
            targetBpm: 72,
            timeSignature: "4/4",
            theoryText: "Substituir um acorde simples de D por D/F# cria uma linha de baixo ascendente suave (G -> D/F# -> Em7). O uso inteligente de baixos invertidos transforma um arranjo simples em uma experiência orquestrada.",
            exercise: {
              title: "Condução em Voice Leading",
              instructions: "Aplique a cadência G -> G/B -> C -> C/E -> D/F# mantendo notas de apoio contínuas nas cordas agudas.",
              targetReps: 4,
              minimumDurationSeconds: 240
            },
            checkpoints: [
              "Clareza na nota do baixo invertido",
              "Respeito absoluto à nota da melodia vocal",
              "Controle refinado de ataque e sustentação"
            ]
          }
        ]
      }
    ]
  },

  {
    id: "curso-guitarra-moderna",
    title: "Guitarra Elétrica: Timbragem, Dinâmica & Harmonia",
    slug: "guitarra",
    instrumentId: "guitarra",
    instrumentName: "Guitarra",
    family: "cordas",
    badge: "⚡",
    description: "Método contemporâneo para guitarristas: palhetada alternada precisa, tríades nos naipes agudos, modulações modais e ambiência expressiva.",
    levelMin: 0,
    levelMax: 5,
    estimatedHours: 42,
    isPublished: true,
    modules: [
      {
        id: "mod-guitarra-lvl0",
        courseId: "curso-guitarra-completo",
        level: 0,
        order: 1,
        title: "Nível 0: Primeiros Passos na Guitarra Elétrica",
        description: "Postura com correia, empunhadura da palheta, controle de ruídos e primeira palhetada alternada.",
        icon: "🌱",
        lessons: [
          {
            id: "les-guitarra-0-1",
            level: 0,
            order: 1,
            title: "Apoio e Empunhadura da Palheta",
            objective: "Segurar a palheta entre o polegar e a lateral do indicador sem rigidez muscular.",
            targetBpm: 60,
            timeSignature: "4/4",
            theoryText: "Menos é mais: apenas 3 a 4 milímetros da ponta da palheta devem ultrapassar os dedos. Um ataque sutil em ângulo de 15 graus desliza sobre a corda sem prender.",
            exercise: {
              title: "Palhetada Alternada em Cordas Soltas",
              instructions: "Palhete para baixo e para cima (↓ ↑ ↓ ↑) a 60 BPM com metrônomo em cada corda por 1 minuto.",
              targetReps: 6,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Movimento originado no punho, não no cotovelo",
              "Volume idêntico entre palhetada descendente e ascendente",
              "Relaxamento total da mão esquerda"
            ]
          }
        ]
      },
      {
        id: "mod-guitarra-lvl2",
        courseId: "curso-guitarra-completo",
        level: 2,
        order: 2,
        title: "Nível 2: Escala Pentatônica & Expressividade",
        description: "Posições fundamentais da Pentatônica, bends afinados de meio tom e tom inteiro, e vibrato vocal.",
        icon: "🎸",
        lessons: [
          {
            id: "les-guitarra-2-1",
            level: 2,
            order: 1,
            title: "A Pentatônica Menor: Desenho 1 e Bends Precisos",
            objective: "Executar o shape 1 da pentatônica e afinar o bend na nota exata usando o afinador Virtuo como guia.",
            targetBpm: 75,
            timeSignature: "4/4",
            theoryText: "Um bend precisa atingir a altura exata da nota de destino. Apoiar os dedos 1 e 2 atrás do dedo 3 garante força e precisão milimétrica.",
            exercise: {
              title: "Bend com Checagem de Frequência",
              instructions: "Toque a nota Ré na 2ª corda (15ª casa) e aplique bend de 1 tom até Mi. Confirme a afinação no Afinador Virtuo.",
              targetReps: 10,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Entonação precisa do bend (+/- 5 cents)",
              "Vibrato fluido sem oscilações bruscas",
              "Abafamento das cordas adjacentes com a mão direita"
            ]
          }
        ]
      }
    ]
  },

  {
    id: "curso-contrabaixo-fundamentos",
    title: "Contrabaixo: Condução, Groove & Alinhamento Rítmico",
    slug: "baixo",
    instrumentId: "baixo",
    instrumentName: "Contrabaixo",
    family: "cordas",
    badge: "🎻",
    description: "Método para baixistas de 4 e 5 cordas: apoio do polegar, técnica de dois dedos, fundamentais, quintas e perfeita sincronia com o bumbo.",
    levelMin: 0,
    levelMax: 5,
    estimatedHours: 36,
    isPublished: true,
    modules: [
      {
        id: "mod-baixo-lvl0",
        courseId: "curso-baixo-completo",
        level: 0,
        order: 1,
        title: "Nível 0: Primeiros Passos no Contrabaixo",
        description: "Postura, descanso do polegar (floating thumb), toque alternado com indicador e médio e afinação das cordas graves.",
        icon: "🌱",
        lessons: [
          {
            id: "les-baixo-0-1",
            level: 0,
            order: 1,
            title: "Apoio e Alternância de Dedos (Toque com Apoio)",
            objective: "Produzir um som encorpado e gordo apoiando o dedo na corda imediatamente superior após a nota.",
            targetBpm: 60,
            timeSignature: "4/4",
            theoryText: "O toque no contrabaixo repousa o dedo na corda de cima. Isso produz graves profundos e simultaneamente abafa vibrações espúrias.",
            exercise: {
              title: "Caminhada de Dedos nas Cordas Graves",
              instructions: "Toque a corda E e A alternando dedos indicador e médio no tempo do metrônomo Virtuo.",
              targetReps: 4,
              minimumDurationSeconds: 150
            },
            checkpoints: [
              "Alternância rigorosa (i, m, i, m)",
              "Dedo repousando na corda superior",
              "Sem estalar as cordas contra os trastes"
            ]
          }
        ]
      }
    ]
  },

  {
    id: "curso-cordas-orquestrais",
    title: "Cordas Orquestrais: Violino, Viola & Violoncelo",
    slug: "cordas_orquestrais",
    instrumentId: "cordas_orquestrais",
    instrumentName: "Violino / Viola / Cello",
    family: "cordas",
    badge: "🎻",
    description: "Técnica orquestral clássica aplicada ao louvor: postura, condução do arco, afinação temperada pura e execução em naipes.",
    levelMin: 0,
    levelMax: 5,
    estimatedHours: 50,
    isPublished: true,
    modules: [
      {
        id: "mod-violino-lvl0",
        courseId: "curso-violino-completo",
        level: 0,
        order: 1,
        title: "Nível 0: Postura e Equilíbrio do Arco",
        description: "Empunhadura clássica do arco francês, equilíbrio corporal sem queixeira apertada e primeiras cordas soltas.",
        icon: "🌱",
        lessons: [
          {
            id: "les-violino-0-1",
            level: 0,
            order: 1,
            title: "A Empunhadura Ergonômica do Arco",
            objective: "Posicionar os dedos no talão do arco com flexibilidade articular no polegar e no mindinho.",
            targetBpm: 50,
            timeSignature: "4/4",
            theoryText: "O arco é conduzido pelo peso natural do braço, não por compressão. O polegar curvado e o mindinho em arco garantem maleabilidade no ponto de contato.",
            exercise: {
              title: "Exercício do Foguete e Cordas Soltas",
              instructions: "Execute movimentos verticais com o arco no ar para soltar o punho e depois puxe o arco inteiro na corda Ré (D4) por 4 tempos.",
              targetReps: 4,
              minimumDurationSeconds: 180
            },
            checkpoints: [
              "Polegar curvado contra a frouxa",
              "Mindinho arredondado sobre a vara",
              "Arco paralelo ao cavalete durante toda a extensão"
            ]
          }
        ]
      }
    ]
  },

  {
    id: "curso-teoria-musical",
    title: "Teoria & Percepção Harmônica Unificada",
    slug: "teoria_musical",
    instrumentId: "teoria_musical",
    instrumentName: "Teoria Musical",
    family: "teoria",
    badge: "📖",
    description: "Do zero ao profissional: leitura de partituras e cifras, intervalos auditivos, formação de acordes, campos harmônicos e regência rítmica.",
    levelMin: 0,
    levelMax: 5,
    estimatedHours: 30,
    isPublished: true,
    modules: [
      {
        id: "mod-teoria-lvl0",
        courseId: "curso-teoria-completo",
        level: 0,
        order: 1,
        title: "Nível 0: Fundamentos do Som e Notação",
        description: "Propriedades físicas do som (altura, intensidade, timbre, duração), pauta e claves fundamentais.",
        icon: "🌱",
        lessons: [
          {
            id: "les-teoria-0-1",
            level: 0,
            order: 1,
            title: "As Quatro Propriedades do Som e as 12 Notas",
            objective: "Compreender os 12 semitons cromáticos e o conceito fundamental de intervalo.",
            targetBpm: 60,
            timeSignature: "4/4",
            theoryText: "A música ocidental é organizada em 12 notas fundamentais separadas por semitons: C, C#, D, D#, E, F, F#, G, G#, A, A#, B. Compreender essa escala cromática é o alicerce para todos os instrumentos.",
            exercise: {
              title: "Recitação do Ciclo Cromático Ascendente e Descendente",
              instructions: "Recite e identifique no teclado virtual ou instrumento os 12 semitons subindo com sustenidos e descendo com bemóis.",
              targetReps: 3,
              minimumDurationSeconds: 120
            },
            checkpoints: [
              "Entendimento de que entre Mi-Fá e Si-Dó não há sustenido natural",
              "Conceito de enarmonia (C# = Db)",
              "Associação auditiva de frequência grave e aguda"
            ]
          }
        ]
      }
    ]
  }
];
