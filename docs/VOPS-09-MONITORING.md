# VOPS-09: MONITORAMENTO, TELEMETRIA E SAÚDE DO SISTEMA

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Objetivos de Nível de Serviço (SLOs)

O VIRTUO é uma ferramenta utilizada em situações ao vivo e de alta pressão (cultos, shows, ensaios). As métricas de qualidade devem atender aos seguintes limites:

| Métrica | Meta (SLO) | Limite Crítico (Alerta) |
| :--- | :--- | :--- |
| **Tempo de Abertura Inicial (FCP)** | < 1.5s em 4G | > 2.5s |
| **Duração da Splash Screen** | Exatamente 2.4s | > 2.6s |
| **Taxa de Quadros da Interface** | 60 FPS estáveis | < 45 FPS |
| **Latência de Disparo do Áudio** | < 15ms | > 40ms |
| **Tempo de Resposta do Live Sync** | < 250ms | > 1000ms |
| **Taxa de Sucesso de Autenticação** | > 99.5% | < 98% |

---

## 2. Monitoramento de Erros e Diagnóstico em Produção

### 2.1 Política de Logs no Cliente
- Erros técnicos não devem ser mostrados ao usuário final em caixas de diálogo feias ou intrusivas.
- Todo erro tratado via `formatFriendlyErrorMessage(err)` emite automaticamente um log estruturado:
  ```javascript
  console.error("[VIRTUO Technical Diagnostics]", err);
  ```
- Para ambientes de produção com telemetria ativa (ex: Sentry ou Google Cloud Error Reporting), esses eventos devem ser encaminhados com tags de contexto:
  - `app_version`: `1.0.0`
  - `screen`: tela ativa no momento do erro
  - `user_role`: perfil do usuário
  - `online_status`: `navigator.onLine`

---

## 3. Monitoramento de Quotas e Uso do Cloud Firestore

No console do Google Cloud / Firebase:
- **Painel de Operações:** Acompanhar leituras e gravações diárias.
- **Alertas de Custo:** Configurar orçamento com alertas em 50%, 80% e 100% da cota contratada.
- **Prevenção de Loops Infinitos:** Listeners de Firestore em tempo real (`onSnapshot`) devem ser descadastrados (`unsubscribe()`) quando o componente ou tela for destruído, evitando vazamentos de memória e consumo desnecessário de leituras.

---

## 4. Matriz de Resposta a Incidentes

| Severidade | Descrição | Ação Imediata | Responsável |
| :--- | :--- | :--- | :--- |
| **P1 - Crítico** | App não abre, afinador mudo ou Firestore inacessível globalmente | Rollback imediato (VOPS-08) ou ativação do modo Offline-Only | Tech Lead / DevOps |
| **P2 - Alto** | Falha de login ou upload de áudios no Storage | Investigar regras de segurança e autenticação | Backend / Security |
| **P3 - Médio** | Bug cosmético ou problema em uma cifra específica | Correção em sprint de patch (1.0.1) | Frontend Lead |
