# VIRTUO — A Plataforma do Músico Virtuoso

> **Criado por Nashix Hoo**  
> Virtuo é uma aplicação web progressiva (PWA) de alta performance projetada especificamente para ministros de louvor, músicos, instrumentistas e bandas congregacionais.

---

## 🎵 Visão Geral e Recursos

- **Banco Musical & Cifras Inteligentes**: Suporte a cifras completas, transposição instantânea sem recarregar a página, detecção automática de acordes e modo **Easy Play** para simplificação harmônica rápida.
- **Modo Ministro de Alta Concentração**: Visualização sem distrações para uso em púlpito ou palco, com controle de auto-scroll, transposição ao vivo, visualização de seções estruturais e integração de metrônomo.
- **Metrônomo Nativo de Alta Precisão**: Motor baseado em Web Audio API com lookahead scheduling (sem deriva de tempo do JavaScript), Tap Tempo, acentuação de primeiro tempo e subdivisões rítmicas.
- **Modo Banda (Band Engine)**: Sintetizador de acompanhamento multi-track em tempo real (bateria, baixo e teclado/pad) executado 100% no navegador sem latência.
- **Modo Ensaio Colaborativo**: Planejamento de repertório, reordenação de canções, ajuste individual de tom e BPM para a equipe.
- **Comunidade & Status Celestial**: Feed interativo da comunidade com curtidas, comentários e selo de membro celestial.
- **Virtuo AI & Fallback Local**: Diretor musical inteligente operando com Gemini 3.8 Flash no backend e fallback algorítmico 100% determinístico quando offline ou sem API key configurada.
- **PWA & Offline First**: Funciona sem internet para cifras já abertas e ferramentas locais de áudio e ritmo.

---

## 🏛️ Arquitetura

```
├── assets/                  # Ícones, vetores e assets estáticos
├── docs/                    # Checklists e documentação de lançamento
├── src/
│   ├── audio/               # Voice detector, metrônomo e síntese de áudio
│   ├── database/            # Schemas, validadores, migradores e repositórios
│   ├── features/            # Painéis funcionais (admin, ensaio, ministro)
│   ├── music/               # Transposição, inteligência harmônica e cifras
│   └── services/            # Serviços de integração e sincronização
├── app.js                   # Controlador principal da interface e SPA
├── firebase-config.js       # Inicialização segura do Firebase SDK no cliente
├── firestore.rules          # Regras de segurança do Firestore (RBAC estrito)
├── storage.rules            # Regras de upload do Firebase Storage
├── server.js                # Servidor Express com rotas de API protegidas
├── sw.js                    # Service Worker para cache e PWA
└── test-*.js                # Suíte de testes automatizados de unidade e integração
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- NPM ou Bun

### Instalação
```bash
# 1. Instalar as dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# (Opcional) Adicione sua GEMINI_API_KEY no arquivo .env

# 3. Executar os testes automatizados
npm test

# 4. Iniciar o servidor de desenvolvimento
npm start
```
O aplicativo estará acessível em `http://localhost:3000`.

---

## 🧪 Testes Automatizados

Para rodar toda a suíte de testes musicais, de segurança e de regras de banco:

```bash
npm test
```

A suíte cobre:
- Validação e integridade do banco musical (`test-music-database.js`)
- Motor harmônico, transposição e Easy Play (`test-musical-engine.js`)
- Painel administrativo e integridade de letras (`test-admin-song-manager.js`)
- Auto-scroll e estado do Modo Ministro (`test-minister-mode.js`)
- Precisão rítmica do Metrônomo nativo (`test-metronome-engine.js`)
- Isolamento e repertórios do Modo Ensaio (`test-rehearsal-mode.js`)
- Interações sociais e Band Engine (`test-community-and-band.js`)

---

## 🔒 Segurança e Regras do Firestore

- **RBAC Estrito**: Usuários comuns podem criar apenas rascunhos (`draft` ou `pendingReview`) e não podem alterar status de publicação ou verificação.
- **Campos de Auditoria Imutáveis**: `createdBy`, `createdAt`, `verified`, `verifiedBy` e `version` são protegidos contra mutação não autorizada.
- **Repertórios Privados**: Ensaios são acessíveis unicamente pelo criador, membros listados ou administradores.
- **Zero Secrets no Frontend**: Chaves privadas e tokens de API permanecem estritamente no backend.

---

## 🌐 Como Publicar (Deploy)

### 1. No Google AI Studio / Cloud Run
Basta clicar no botão **Share / Deploy to Cloud Run** localizado no topo do painel. A plataforma constrói o contêiner e publica a aplicação na porta 3000 automaticamente.

### 2. Em Servidor Próprio / VPS / Docker
Configure o servidor para executar `npm start` em porta 3000 com um proxy reverso (NGINX/Caddy) apontando para ele e com certificado SSL ativo.
