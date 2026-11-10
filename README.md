# VIRTUO — A Plataforma do Músico Virtuoso (React + Vite)

> **Criado por Nashix Hoo • Reescrevido em React 19 + TypeScript + Vite**  
> Virtuo é uma aplicação web progressiva (PWA) de alta performance projetada especificamente para ministros de louvor, músicos, instrumentistas e bandas congregacionais.

---

## 🎵 Visão Geral e Recursos

- **Banco Musical & Cifras Inteligentes**: Suporte a cifras completas, transposição instantânea em semitons, detecção de acordes e modo **Easy Play** para simplificação harmônica rápida.
- **Modo Ministro de Alta Concentração**: Visualização sem distrações para púlpito ou palco, com controle de auto-scroll, transposição ao vivo e integração de metrônomo.
- **Metrônomo Nativo de Alta Precisão**: Motor baseado em Web Audio API com lookahead scheduling (sem deriva de tempo do JavaScript), Tap Tempo, acentuação de primeiro tempo e subdivisões rítmicas.
- **Afinador Cromático & Virtuo Vocal**: Afinador por autocorrelação YIN com ponteiro de cents em tempo real, além de monitor de extensão vocal e aquecimento guiado de 3 minutos.
- **Modo Banda (Band Engine)**: Sintetizador de acompanhamento rítmico em tempo real executado 100% no navegador sem latência.
- **Modo Ensaio Colaborativo**: Planejamento de repertório, reordenação de canções, ajuste individual de tom e BPM para a equipe.
- **Comunidade & Status Celestial**: Feed interativo da comunidade com curtidas, comentários e selo de membro celestial.
- **Davi AI • Diretor Musical**: Assistente musical inteligente operando com Gemini 2.5 Flash no backend Express e fallback algorítmico 100% determinístico quando offline.
- **Firebase Firestore & Auth**: Autenticação com Google e E-mail/Senha, persistência de dados no projeto `virtuo-7e01b`.

---

## 🏛️ Arquitetura React

```
├── assets/                  # Ícones, vetores e branding oficial
├── src/
│   ├── components/          # Componentes React (Header, Tabbar, DaviAiModal)
│   ├── screens/             # Telas da aplicação (Home, Library, SongDetail, Live, Band, Ensaio, Comunidade, Profile, Tuner, Vocal, etc.)
│   ├── music/               # Transposição harmônica, cifras e demo songs
│   ├── services/            # Repositório de músicas e persistência
│   ├── utils/               # Audio Engine (Metrônomo, Afinador, Chime)
│   ├── firebase.ts          # Conexão Firestore e Firebase Auth
│   ├── App.tsx              # Componente raiz da aplicação React
│   └── main.tsx             # Ponto de montagem React DOM
├── server.ts                # Servidor Express com rotas de IA (/api/ai/*) e Vite middleware
├── vite.config.ts           # Configuração Vite
├── tsconfig.json            # Configuração TypeScript
├── style.css                # Estilos do Virtuo Design System
└── package.json             # Dependências e scripts npm
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js (versão 20 ou superior)
- npm

### Instalação & Execução
```bash
# 1. Instalar as dependências
npm install

# 2. Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# 3. Compilar para produção
npm run build
```
