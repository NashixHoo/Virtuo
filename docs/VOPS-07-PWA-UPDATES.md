# VOPS-07: CICLO DE ATUALIZAÇÃO E OPERAÇÃO DO PWA

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Arquitetura do Progressive Web App (PWA)

O VIRTUO V1 é distribuído primariamente como uma aplicação Web Progressiva instalável (PWA), operando como um aplicativo nativo em Android, iOS (Add to Home Screen), iPadOS, Windows e macOS.

### Componentes Chave:
- **`manifest.json`:** Metadados de instalação, nome, orientação portrait primária, tema e ícones de alta densidade.
- **`sw.js`:** Service Worker com estratégia mista:
  - **Cache-First / Precache:** App Shell crítico (HTML, CSS, JS essenciais, fontes, ícones).
  - **Stale-While-Revalidate:** Módulos de aplicação e assets de interface.
  - **Network-Only com Fallback:** Chamadas externas e transmissões em tempo real.

---

## 2. Estratégia de Invalidação e Atualização de Cache

Para garantir que novas correções cheguem aos usuários sem prender o dispositivo em caches antigos:

### 2.1 Nome do Cache Versionado
Em `sw.js`:
```javascript
const CACHE_NAME = "virtuo-v1.0.0-prod";
```
Ao lançar uma nova versão (ex: `1.0.1`), alterar o `CACHE_NAME` para `virtuo-v1.0.1-prod`. O evento `activate` no Service Worker purgará automaticamente os caches legados:
```javascript
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

### 2.2 Suporte a `SKIP_WAITING`
O Service Worker escuta a mensagem de atualização imediata:
```javascript
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
```
Isso permite que um novo Service Worker assuma o controle sem necessidade de fechar todas as abas abertas.

---

## 3. Lista de Arquivos do App Shell

Os seguintes recursos são obrigatórios na lista `APP_SHELL_FILES` de `sw.js`:
- `/` e `/index.html`
- `/style.css`
- `/app.js`
- `/src/version.js`
- `/manifest.json`
- Módulos essenciais de áudio (`/src/features/band/*`, `/src/features/splash/splash.js`)
- Ícones oficiais (`/assets/icon-192.png`, `/assets/icon-512.png`, `/assets/icon-maskable.png`)

---

## 4. Instruções de Suporte para Limpeza de Cache no Usuário

Caso um usuário relate comportamento anômalo em um dispositivo específico:
- **Android (Chrome):** Menu ⋮ → Configurações → Configurações do site → Dados armazenados → Localizar `virtuo` → Limpar e redefinir.
- **iOS (Safari / Atalho na Tela de Início):** Ajustes → Safari → Avançado → Dados dos Sites → Remover dados do VIRTUO. Em seguida, reabrir o app para novo download do shell.
