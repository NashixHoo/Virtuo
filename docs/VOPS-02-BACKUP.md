# VOPS-02: POLÍTICA E ROTINA DE BACKUPS

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Visão Geral da Política de Backup

A integridade dos dados musicais, cifras cadastradas pelos usuários, histórico de ensaios e arquivos de configuração é vital para a operação contínua do VIRTUO. A estratégia de backup é dividida em três camadas:

1. **Repositório de Código (Codebase):** Versionamento estrito com tags imutáveis.
2. **Banco de Dados (Cloud Firestore):** Exportação programada e snapshots de acervo.
3. **Armazenamento de Mídia (Firebase Storage):** Replicação de áudios e stems musicais.

---

## 2. Backup do Código-Fonte e Configurações

- **Git Remoto Primário:** Todo código homologado deve ser empurrado para o repositório principal com tags assinadas (ex: `v1.0.0`).
- **Arquivos Sensíveis Excluídos do Git:**
  - Chaves de serviço (`serviceAccountKey.json`).
  - Arquivos `.env` de produção e segredos de API.
  - Certificados SSL/TLS e chaves privadas (`*.pem`, `*.key`).
- **Armazenamento Seguro de Segredos:**
  - Os segredos e credenciais de produção devem ser mantidos em cofre criptografado (ex: Google Cloud Secret Manager ou Bitwarden Vault da equipe de infraestrutura).

---

## 3. Rotina de Backup do Cloud Firestore

### 3.1 Exportação Automática Diária
Utilizar o serviço nativo de Managed Export do Google Cloud Firestore para um bucket do Cloud Storage dedicado (`gs://virtuo-firestore-backups/`):

```bash
gcloud firestore export gs://virtuo-firestore-backups/daily/$(date +%Y-%m-%d) \
  --project=virtuo-7e01b
```

### 3.2 Retenção de Dados
- **Backups Diários:** Retidos por 14 dias.
- **Backups Semanais (Domingo 23:59 UTC):** Retidos por 8 semanas.
- **Backups Mensais:** Retidos por 12 meses.
- O ciclo de vida do bucket deve ser configurado com regras de expiração automática (Lifecycle Rule) para otimização de custos.

---

## 4. Backup do Acervo Canônico de Músicas (Fallback Local)

Para proteger o acervo contra exclusões acidentais ou problemas de conectividade:
- O arquivo `songs-service.js` mantém o array `DEMO_SONGS` com o repertório canônico verificado.
- A função administrativa `SongsRepository.seedDefaultSongs()` permite restabelecer instantaneamente o acervo básico no Firestore se necessário.
- Antes de qualquer operação de migração em massa no Firestore, deve ser executado um dump manual das coleções `songs`, `users` e `missions` via script administrativo.

---

## 5. Testes de Restauração (Dry-Run)

Um backup só é válido se for testado. Trimestralmente, a equipe deve:
1. Criar um projeto de teste ou emulador local do Firestore.
2. Restaurar o snapshot mais recente:
   ```bash
   gcloud firestore import gs://virtuo-firestore-backups/daily/YYYY-MM-DD \
     --project=virtuo-staging-test
   ```
3. Validar a integridade das coleções de cifras, perfis de usuários e missões.
