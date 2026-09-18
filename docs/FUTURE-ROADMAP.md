# VIRTUO — ROADMAP FUTURO (PÓS-LANÇAMENTO V1)

> **Documento Oficial de Planejamento Estratégico**  
> **Status:** Planejamento Futuro (Não implementar durante a V1)  
> **Diretiva:** O VIRTUO V1 está focado em estabilidade, segurança e excelência de uso. As funcionalidades abaixo pertencem a ciclos futuros (V1.x e V2).

---

## 1. Visão de Produto

O VIRTUO nasceu para ser a plataforma definitiva para músicos, líderes e ministérios musicais. A versão **V1** entrega o alicerce essencial:
- Afinador Cromático Profissional com detecção FFT e DSP de alta precisão.
- Metrônomo com relógio Web Audio de alta precisão.
- Cifras inteligentes com transposição harmônica e Easy Play.
- Acompanhamento Musical (Band Engine) realista e inteligente.
- Gestão de Ensaios, Missões e Live Sync para apresentações.
- Modo Offline-First total com Progressive Web App (PWA).

Novas ideias não devem competir com a estabilização da V1. Todas as iniciativas abaixo estão catalogadas e priorizadas para os próximos marcos de desenvolvimento.

---

## 2. Marco V1.1 — Refinamentos Pós-Feedback de Usuários

*Estimativa de início: Após a conclusão da Fase 4 do Beta Testing e 30 dias de uso da V1.*

- **Melhorias de Acessibilidade Auditiva e Visual:**
  - Modos de alto contraste dedicados para palcos sob iluminação solar direta.
  - Feedback tátil (vibração) ampliado para marcação de compasso no metrônomo em dispositivos móveis compatíveis.
- **Ampliação do Acervo Básico:**
  - Expansão do catálogo canônico com novas harmonias e cifras verificadas.
- **Exportação de Repertório em PDF:**
  - Geração de cancioneiro diagramado para impressão em papel para equipes que necessitam de backup físico no altar/palco.

---

## 3. Marco V1.2 — Expansão de Integrações e Dispositivos

- **Pedal Bluetooth de Virada de Página:**
  - Mapeamento nativo de pedais AirTurn, PageFlip e dispositivos HID via Web Bluetooth API ou atalhos de teclado (Page Down, Seta Direita, Espaço).
- **Importação Dinâmica de Formatos Externos:**
  - Importador inteligente de ChordPro (.cho, .crd) e texto plano com auto-detecção de acordes.
- **Sincronização com Calendários Externos:**
  - Exportação de escalas e missões aprovadas para Google Calendar e Apple Calendar (.ics).

---

## 4. Marco V2.0 — A Grande Evolução

*A ser iniciado somente após a maturidade e consolidação da V1 em produção.*

- **Virtuo Cloud Sync Multi-Institucional:**
  - Suporte a múltiplas congregações ou filiais sob uma mesma assinatura corporativa.
- **Midi Controller Nativo & Soundfonts HD:**
  - Conexão direta de teclados MIDI via Web MIDI API para controle em tempo real dos instrumentos do Band Engine.
  - Carregamento opcional de amostras de áudio lossless com cache inteligente em IndexedDB para apresentações de alto nível.
- **Virtuo Academy Pro:**
  - Cursos avançados com instrutores convidados, certificados digitais autenticados e análise automática de execução vocal/instrumental assistida por inteligência musical.
- **Aplicativos Nativos Empacotados (Stores):**
  - Publicação nas lojas Google Play Store (TWA) e Apple App Store (Webkit Wrapper / Capacitor) a partir do mesmo núcleo PWA estável.

---

## 5. Critérios de Entrada no Roadmap

Para que uma nova funcionalidade seja admitida no desenvolvimento:
1. Deve resolver uma dor real relatada por múltiplos usuários ativos.
2. Não pode degradar o tempo de inicialização (< 1.5s) nem a velocidade de resposta (< 100ms).
3. Deve funcionar no modo Offline-First ou degradar de forma graciosa.
4. Deve respeitar o princípio da "missão única por tela" e a simplicidade de uso no palco.
