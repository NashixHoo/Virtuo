# VOPS-03: POLÍTICA OFICIAL DE VERSIONAMENTO

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Decisão Oficial de Produto: VIRTUO V1

Esta é a diretriz fundamental de governança do produto:

> **O VIRTUO NUNCA FOI LANÇADO PUBLICAMENTE.**  
> Nomes utilizados durante o ciclo de engenharia (como *V1*, *V2*, *V2.1*, *V2.2 Final*, *V2 Experience*) representaram apenas marcos internos de desenvolvimento.  
> Para fins oficiais de produto, marketing, documentação de usuário, publicação em lojas e histórico de lançamento:  
> **TUDO O QUE FOI DESENVOLVIDO ATÉ AGORA COMPÕE A PRIMEIRA VERSÃO OFICIAL DO VIRTUO.**

### Nome Oficial da Versão:
**`VIRTUO V1`** (Número de versão SemVer: `1.0.0`)

### Regra para Versões Futuras:
Somente após o lançamento público da V1, quando uma evolução de grande porte for disponibilizada aos usuários finais com quebra de arquitetura ou novas categorias de produto, ela poderá ser denominada **`VIRTUO V2`**.

---

## 2. Padrão SemVer (Semantic Versioning 2.0.0)

O formato oficial de versão segue a regra:
`MAJOR.MINOR.PATCH`

- **MAJOR (1.x.x):** Reservado para marcos estruturais do produto. Permanece `1` durante todo o ciclo de vida do primeiro lançamento. A transição para `2.0.0` requer aprovação executiva do produto.
- **MINOR (1.1.x, 1.2.x):** Novas funcionalidades compatíveis com a versão anterior (ex: adição de suporte a pedal Bluetooth, novos instrumentos na banda).
- **PATCH (1.0.1, 1.0.2):** Correções de bugs, ajustes de performance, polimento visual ou correções de segurança.

---

## 3. Fontes de Verdade no Código

Para evitar divergências de versão entre arquivos, as seguintes referências devem permanecer estritamente sincronizadas:

1. **`src/version.js` (Fonte Primária de Runtime):**
   ```javascript
   export const APP_VERSION = "1.0.0";
   export const APP_RELEASE_NAME = "VIRTUO V1 — Primeira Versão Oficial";
   export const VERSION_LABEL = "VIRTUO V1 (1.0.0)";
   ```
2. **`package.json`:** `"version": "1.0.0"`
3. **`VERSION`:** `1.0.0-v1-official-release`
4. **`sw.js` (Cache do Service Worker):** `const CACHE_NAME = "virtuo-v1.0.0-prod";`

---

## 4. Fluxo de Publicação de Nova Versão

Ao preparar um novo release:
1. Atualizar o número de versão em `src/version.js`, `package.json`, `VERSION` e o nome do cache em `sw.js`.
2. Executar e aprovar a suíte completa de testes (`npm test`).
3. Registrar a alteração no histórico de mudanças (`CHANGELOG.md`).
4. Criar uma tag git anotada:
   ```bash
   git tag -a v1.0.0 -m "Release Oficial: VIRTUO V1"
   git push origin v1.0.0
   ```
