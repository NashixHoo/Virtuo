# VOPS-01: ARQUITETURA E PADRÕES DO CODEBASE

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Visão Geral da Arquitetura

O VIRTUO V1 foi construído sobre uma arquitetura modular em Vanilla JavaScript / ES Modules, complementada por Tailwind CSS para estilização e Firebase (Auth, Firestore, Storage) para sincronização em nuvem e autenticação.

### Princípios Inegociáveis:
1. **Velocidade Primeiro:** Nenhuma operação de interface pode bloquear o loop principal do navegador. Renderizações críticas devem ocorrer a 60 FPS (16.6ms por frame).
2. **Offline-First:** O núcleo musical da aplicação (Afinador, Metrônomo, Cifras locais, Band Engine) opera de forma totalmente independente de conexão com a internet através do Service Worker (`sw.js`).
3. **Sem Framework Bloat:** A aplicação não utiliza frameworks pesados que oneram o bundle inicial (sem React, Vue ou Angular no runtime de produção), garantindo carregamento instantâneo em qualquer smartphone.
4. **Uma Tela = Uma Missão:** Cada visualização concentra uma intenção clara do músico, evitando poluição visual e confusão no momento do ensaio ou culto.

---

## 2. Estrutura de Diretórios

```
/
├── index.html                  # Ponto de entrada HTML, metadados PWA, fontes e viewport
├── app.js                      # Controlador de aplicação, roteamento de telas e estado mestre
├── style.css                   # Estilos canônicos, variáveis VDS, reset e animações GPU
├── sw.js                       # Service Worker PWA com cache 'stale-while-revalidate'
├── manifest.json               # Configuração oficial do Web App Manifest
├── firebase-config.js          # Inicialização segura dos serviços Firebase
├── firestore.rules             # Regras de segurança de acesso (RBAC) do banco de dados
├── storage.rules               # Regras de segurança de armazenamento de arquivos
├── src/                        # Código-fonte modular da aplicação
│   ├── version.js              # Fonte única de verdade de versão e build
│   ├── components/             # Componentes de interface do Virtuo Design System (VDS)
│   │   ├── ui/                 # Cards, botões, inputs, modais, toasts e badges
│   │   ├── navigation/         # Header de topo e barra inferior (bottom-nav)
│   │   ├── tuner/              # Visualizadores de afinação e ponteiros DSP
│   │   └── metronome/          # Visualizadores de pulso e subdivision rítmica
│   ├── features/               # Módulos verticais de domínio de negócio
│   │   ├── splash/             # Ciclo calibrado da Splash Screen de abertura
│   │   ├── band/               # Real Band Engine 2.0 (bateria, baixo, piano, violão)
│   │   ├── rehearsal/          # Gestor de ensaios e setlists
│   │   ├── live-sync/          # Sincronização ao vivo para músicos no palco
│   │   ├── missions/           # Planejamento ministerial (Diretor, Líder e Músico)
│   │   ├── moments/            # Celebrações e conquistas pós-missão
│   │   ├── notifications/      # Central reativa de avisos
│   │   ├── gear/               # Cadastro e inventário de equipamentos
│   │   └── davi/               # Diretor Musical (IA de apoio ao repertório e harmonia)
│   ├── academy/                # Virtuo Academy (método Bona, solfejo e aulas)
│   ├── i18n/                   # Internacionalização oficial (PT-BR, EN, ES)
│   └── database/               # Camada de repositório, normalização e validação de cifras
└── docs/                       # Documentação técnica e operacional (VOPS Series)
```

---

## 3. Convenções de Código

- **Padrão de Módulos:** Todo novo arquivo JavaScript deve ser um ES Module (`import` / `export`).
- **Nomenclatura:**
  - Arquivos e pastas: `kebab-case` (ex: `live-sync-engine.js`).
  - Classes e Componentes: `PascalCase` (ex: `RealBandEngine`).
  - Funções e Métodos: `camelCase` (ex: `calculateKey`).
  - Constantes Globais: `UPPER_SNAKE_CASE` (ex: `APP_VERSION`).
- **Tratamento de Estado:** O estado global da aplicação em `app.js` é gerenciado de forma reativa com emissão de eventos ou chamadas diretas a `renderCurrentScreen()`.
- **Tratamento de Áudio Web:** Todo `AudioContext` deve ser inicializado ou resumido a partir de um gesto de usuário (`pointerdown`, `click`) para cumprir as políticas de reprodução do Chrome, Safari iOS e Firefox.

---

## 4. Auditoria e Validação Automatizada

Antes de qualquer commit ou implantação, é obrigatório executar a suíte completa de testes:
```bash
npm test
```
A suíte valida mais de 100 asserções cobrindo afinação, harmonia, transposição, orquestração de banda e renderização visual.
