# VOPS-10: PLANO DE RECUPERAÇÃO DE DESASTRES (DISASTER RECOVERY)

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Objetivos de Recuperação

- **RTO (Recovery Time Objective):** Tempo máximo tolerável para restauração dos serviços após incidente crítico: **< 60 minutos**.
- **RPO (Recovery Point Objective):** Janela máxima aceitável de perda de dados: **< 24 horas** (coberto pelo backup diário automatizado do Firestore).

---

## 2. Cenário 1: Indisponibilidade Total do Provedor de Nuvem (Firebase / GCP)

### Impacto:
Usuários não conseguem sincronizar missões, salvar novas cifras ou efetuar login remoto.

### Mitigação Automática Arquitetural (Offline-First):
- O VIRTUO foi concebido para que o núcleo musical **nunca dependa da nuvem para funcionar**.
- O Service Worker continua servindo a aplicação localmente.
- O Afinador Cromático, o Metrônomo, o Band Engine e o acervo local (`DEMO_SONGS` / `localStorage`) continuam 100% operacionais.
- A interface exibe a notificação discreta: *"Você está offline. Algumas funções continuam disponíveis no modo local."*

---

## 3. Cenário 2: Corrupção ou Perda de Dados no Firestore

### Ação de Resposta:
1. Declarar incidente P1 e interromper gravações alterando temporariamente `firestore.rules` para `allow write: if false;`.
2. Acessar o Google Cloud Console do projeto `virtuo-7e01b`.
3. Identificar o snapshot de backup íntegro mais recente no bucket `gs://virtuo-firestore-backups/daily/`.
4. Disparar a operação de importação gerenciada:
   ```bash
   gcloud firestore import gs://virtuo-firestore-backups/daily/YYYY-MM-DD-HHMM --project=virtuo-7e01b
   ```
5. Restabelecer as regras normais de segurança (`firestore.rules`) e notificar a equipe.

---

## 4. Cenário 3: Vazamento ou Comprometimento de Chave de API

### Ação de Resposta:
1. No Google Cloud Console / API Credentials, gerar uma nova chave de API com restrições estritas de domínio HTTP Referer.
2. Atualizar o arquivo de configuração `firebase-config.js` com a nova credencial.
3. Efetuar novo deploy do Hosting / App Shell com atualização de versão de cache em `sw.js`.
4. Deletar imediatamente a chave comprometida no console da nuvem.

---

## 5. Cenário 4: Atualização com Falha Travando o App do Usuário

### Ação de Resposta (Kill Switch do Service Worker):
Caso uma versão defeituosa cause "tela branca" permanente nos usuários devido a cache corrompido:
1. Publicar um arquivo `sw.js` de emergência que execute `caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))` e desregistre o próprio Service Worker (`self.registration.unregister()`).
2. Isso força todos os navegadores e atalhos PWA a recarregar a versão mais recente diretamente do servidor no próximo acesso.
