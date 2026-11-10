# VOPS-04: GESTÃO DE AMBIENTES E CONFIGURAÇÃO

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Topologia de Ambientes

O ciclo de vida do VIRTUO é segmentado em três ambientes estritamente isolados:

| Ambiente | Propósito | Domínio / URL | Banco de Dados / Auth |
| :--- | :--- | :--- | :--- |
| **Desenvolvimento (Dev)** | Codificação, testes unitários e novos recursos | `localhost:3000` / Sandbox | Firebase Emulators ou Projeto Staging |
| **Homologação (Staging / Beta)** | Testes de aceitação com usuários beta (Fases 1 a 4) | `staging.virtuo.app` (ou preview fechado) | Projeto Firebase dedicado com dados controlados |
| **Produção (Prod)** | Lançamento público oficial aos músicos e igrejas | `app.virtuo.com` (ou domínio oficial) | Projeto `virtuo-7e01b` com regras estritas |

---

## 2. Configurações de Rede e Restrições de Porta

- **Porta 3000:** A porta de escuta do servidor HTTP/Dev Server deve ser **3000**.
- **HTTPS Obrigatório:** Todas as APIs de hardware utilizadas pelo VIRTUO (Web Audio API, AudioContext, Navigator MediaDevices / Microfone para o afinador cromático, Service Worker PWA) exigem contexto seguro (`https://` ou `localhost`).

---

## 3. Gestão de Variáveis de Ambiente

### Regra Fundamental:
Nenhum segredo (chaves privadas, tokens mestres, senhas de banco) deve ser comitado no repositório.

### Declaração em `.env.example`:
Todas as variáveis necessárias devem ser documentadas em `.env.example`:
```env
PORT=3000
NODE_ENV=production
# Chaves públicas do Firebase (visíveis no cliente Web)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
# Chaves de serviços opcionais
GEMINI_API_KEY=
```

### Segurança das Credenciais no Cliente:
- O Firebase Web SDK foi projetado para expor as credenciais do app (`apiKey`, `projectId`) no cliente.
- A verdadeira segurança dos dados é garantida pelas **Regras de Segurança do Firestore (`firestore.rules`)** e do **Storage (`storage.rules`)**, que impõem autenticação, validação de tipos de dados e controle de acesso baseado em funções (RBAC).

---

## 4. Domínios Autorizados no Firebase Authentication

Para prevenir ataques de spoofing ou redirecionamentos maliciosos, o console do Firebase deve autorizar exclusivamente:
- `localhost`
- `127.0.0.1`
- Domínios oficiais do applet AI Studio / Cloud Run
- O domínio oficial de produção do VIRTUO
