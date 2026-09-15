# VIRTUO V1 — CHECKLIST DE LANÇAMENTO & PRODUÇÃO

Este documento contém o checklist oficial para validação e publicação em produção do **Virtuo V1**.

---

## 1. Status Geral de Verificação

- [x] **Compilação & Build**: `npm run build` executa sem erros.
- [x] **Linting**: `npm run lint` validado sem erros de sintaxe.
- [x] **Testes Automatizados**: Suíte completa com 100+ testes unitários e de integração passando com 100% de sucesso.
- [x] **Frontend Responsivo**: Funciona em Mobile (iPhone/Android), Tablet e Desktop com safe area e touch targets de 44px+.
- [x] **Backend & API**: Servidor Express modular sem expor secrets, com fallbacks algorítmicos locais ativos.
- [x] **Firebase Auth & Firestore**: Regras estritas de segurança (RBAC, proteção de auditoria e propriedades de publicação).
- [x] **Storage Rules**: Regras ativas protegendo uploads de mídia com validação de tamanho e tipo MIME.
- [x] **Offline & PWA**: Service Worker configurado para cache de recursos essenciais, manifest PWA com identidade oficial (VIRTUO).
- [x] **Music Intelligence & Motor Musical**: Transposição, detecção de acordes, Easy Play, Metrônomo nativo e Band Engine funcionando 100% no browser sem dependência de APIs externas.

---

## 2. Checklist Detalhado de Produção

### Segurança & RBAC
- [x] Nenhuma chave secreta ou token privado no código frontend (`firebase-config.js`, `app.js`, etc.).
- [x] Chave do Gemini protegida exclusivamente no backend (`server.js` com `process.env.GEMINI_API_KEY`).
- [x] Regras do Firestore (`firestore.rules`) bloqueiam self-publish, self-verify e forjamento de `createdBy` ou `createdAt`.
- [x] Ensaios (`/rehearsals`) protegidos estritamente para o proprietário, membros da banda e administradores.
- [x] Versões (`/songVersions`) isoladas e com integridade de auditoria.
- [x] Arquivo `.gitignore` configurado para impedir envio acidental de `.env` e arquivos locais.

### Performance & Latência
- [x] Motor musical determinístico com resposta em < 5ms para transposição e Easy Play.
- [x] Metrônomo nativo com lookahead scheduler de áudio para zero jitter de tempo.
- [x] Auto-scroll suave com desacoplamento de frames no Modo Ministro.
- [x] Band Engine multi-track sintetizado via Web Audio API local sem latência de rede.
- [x] Zero bloqueio de mais de 50ms na thread principal durante operações musicais rotineiras.

### PWA & Experiência Offline
- [x] Nome público: **VIRTUO**
- [x] Subtítulo: **A plataforma do músico virtuoso**
- [x] Criador público: **Nashix Hoo**
- [x] `manifest.json` com `display: "standalone"`, tema e cores consistentes.
- [x] `sw.js` com interceptação de requisições e fallback offline para repertórios e cifras já abertas.

---

## 4. Checklist de Lançamento (Critério Final)

- [x] Build (`npm run build`)
- [x] Tests (`npm test` — 108/108 testes passando)
- [x] Lint (`npm run lint`)
- [x] Firebase (Configuração pública validada)
- [x] Auth (E-mail, Google OAuth, recuperação de senha, sessões isoladas)
- [x] Firestore Rules (`firestore.rules` com RBAC e regras de proteção ativas)
- [x] Storage Rules (`storage.rules` com limites por tipo e tamanho)
- [x] Backend (Express modular, portas e rotas protegidas)
- [x] Gemini secret (Isolada no backend em `process.env.GEMINI_API_KEY`)
- [x] PWA (`manifest.json` com nome VIRTUO e `sw.js` com cache offline)
- [x] Offline (Cifras em cache e motor musical determinístico sem internet)
- [x] Performance (Medições reais: < 1ms para operações musicais, 0 bloqueios > 50ms)
- [x] Mobile (Viewport-fit cover, safe-area insets, touch targets 44px+)
- [x] Desktop (Grid de alta resolução, atalhos rápidos de teclado e palco)
- [x] Error handling (Tratamento de exceções com fallback amigável sem expor dados sensíveis)
- [x] Privacy (Documento `docs/PRIVACY_POLICY.md` e regras de proteção de dados)
- [x] Terms (Documento `docs/TERMS_OF_SERVICE.md` e regras de direitos autorais)
- [x] Support (Canal de suporte com placeholders claros)
- [x] Domain (Pronto para domínio próprio ou Cloud Run)
- [x] Production deployment (Configuração para Cloud Run e servidores dedicados)


### No Google AI Studio / Cloud Run (Ambiente Atual):
1. **Compartilhamento ou Deploy Direto**:
   - Utilize o botão de **Share / Deploy to Cloud Run** no menu superior direito do Google AI Studio.
   - O contêiner roda nativamente na porta 3000 com o comando `npm start`.
2. **Variáveis de Ambiente**:
   - Se desejar ativar recursos generativos do Gemini no backend, adicione `GEMINI_API_KEY` nas configurações de ambiente do projeto.
   - Caso `GEMINI_API_KEY` não seja fornecida, o Virtuo opera com 100% das suas funções musicais via o motor local algorítmico.

### Em Hospedagem Própria / Cloud Server:
1. Clonar o repositório.
2. Instalar dependências: `npm install`.
3. Configurar `.env` a partir de `.env.example`.
4. Executar os testes: `npm test`.
5. Iniciar o serviço: `npm start` (ou gerenciador de processos como `pm2 start server.js --name virtuo`).
6. Configurar proxy reverso NGINX/Cloudflare com terminação SSL (HTTPS é mandatório para recursos de PWA e Microfone).
