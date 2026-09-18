# VOPS-05: DIRETRIZES DE SEGURANÇA DA INFORMAÇÃO E RBAC

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Princípio do Menor Privilégio

O VIRTUO implementa uma política estrita de controle de acesso (RBAC - Role-Based Access Control). Nenhum usuário tem privilégios concedidos por padrão além da leitura do seu próprio conteúdo e dos recursos públicos essenciais.

### Papéis Reconhecidos no Sistema:
1. **Administrador (`admin` / `superAdmin`):** Controle total de acervo oficial, moderação de relatórios e gestão de permissões.
2. **Diretor Musical / Pastor / Proprietário:** Criação e aprovação final de missões, definição de repertório e escalas de apresentação.
3. **Líder Musical / Maestro:** Revisão de repertório, ajustes de tom, início de transmissões Live Sync no palco e conclusão de apresentações.
4. **Músico / Instrumentista / Cantor:** Estudo de cifras, check-in de presença, afinação individual e acompanhamento do Live Sync.

---

## 2. Proteção Contra Escalação de Privilégios no Firestore

Conforme definido em `firestore.rules`:
- O usuário **não pode** definir ou alterar seu próprio campo `role` ou privilégios especiais (`celestialMember`, `isCelestial`, `verified`, `superAdmin`, `isAdmin`).
- Apenas administradores autenticados podem atribuir ou revogar papéis privilegiados.
- Regra de criação de perfil (`users/{userId}`):
  ```cel
  allow create: if isAuthenticated() && (isOwner(userId) || isAdmin()) && (
    !request.resource.data.keys().hasAny(['role', 'celestialMember', 'isCelestial', 'verified', 'superAdmin', 'isAdmin']) || isAdmin()
  );
  ```
- Regra de atualização de perfil (`users/{userId}`):
  ```cel
  allow update: if isAuthenticated() && (
    isAdmin() ||
    (isOwner(userId) && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'celestialMember', 'isCelestial', 'verified', 'superAdmin', 'isAdmin'])))
  );
  ```

---

## 3. Prevenção de XSS e Injeção de Dados

- **Sanitização de HTML:** Toda informação vinda de entrada de usuário ou do banco de dados (títulos de músicas, letras, comentários da comunidade, notas ministeriais) deve passar pela função `escapeHtml()` antes de ser inserida no DOM via `innerHTML`.
- **Validação de Tamanho de Payload:** Comentários da comunidade têm limite estrito de 500 caracteres, impedindo ataques de negação de serviço ou armazenamento abusivo.

---

## 4. Segurança de Hardware: Microfone e Áudio

- O Afinador Cromático acessa o microfone do dispositivo exclusivamente via `navigator.mediaDevices.getUserMedia({ audio: true })`.
- **Ciclo de Vida do Stream de Microfone:**
  - Quando o usuário sai da tela do afinador, o método `stop()` desativa todos os `MediaStreamTracks`, liberando o microfone do dispositivo e apagando o indicador do sistema operacional (LED ou barra vermelha no iOS/Android).
  - Nunca manter escuta de áudio em segundo plano.

---

## 5. Auditoria Periódica de Regras de Segurança

Sempre que um novo recurso exigir campos no banco de dados:
1. Atualizar `firestore.rules`.
2. Validar que nenhuma regra expõe `allow write: if true;`.
3. Executar o deploy seguro com a ferramenta oficial:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
