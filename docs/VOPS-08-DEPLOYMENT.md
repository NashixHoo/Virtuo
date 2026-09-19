# VOPS-08: PROCEDIMENTO DE IMPLANTAÇÃO (DEPLOYMENT) E ROLLBACK

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Pré-Requisitos de Implantação

Nenhum deploy para ambiente de homologação ou produção pode ser iniciado sem a validação do pipeline:

1. **Testes Unitários e de Integração:**
   ```bash
   npm test
   ```
   *Critério:* 100% dos testes aprovados (0 falhas).
2. **Auditoria de Regras do Firestore e Storage:**
   Verificar ausência de regras permissivas indevidas.
3. **Sincronização de Versão:**
   Garantir que `src/version.js`, `package.json`, `VERSION` e `sw.js` estejam alinhados em `1.0.0`.
4. **Build Limpo:**
   Se houver processo de empacotamento, certificar que a compilação é concluída sem avisos críticos.

---

## 2. Passo a Passo de Implantação em Produção

### 2.1 Implantação de Regras e Índices
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project=virtuo-7e01b
```

### 2.2 Implantação dos Arquivos Estáticos e PWA (Hosting / Cloud Run)
```bash
firebase deploy --only hosting --project=virtuo-7e01b
```
*(Ou, caso hospedado via container Cloud Run, efetuar o build da imagem Docker oficial na porta 3000 e acionar a nova revisão de serviço).*

---

## 3. Verificação Imediata Pós-Deploy (Smoke Testing)

A equipe deve executar em até 5 minutos após o deploy:
1. Abrir a aplicação em uma janela anônima no desktop e em um dispositivo móvel real (iOS e Android).
2. Confirmar que a Splash Screen dura exatamente 2.4s e transiciona suavemente.
3. Abrir o **Afinador Cromático**: autorizar microfone e conferir resposta de frequência.
4. Abrir o **Metrônomo**: dar Play e verificar áudio Web Audio sem latência.
5. Acessar a biblioteca de cifras e testar transposição de tom e Easy Play.
6. Iniciar o **Band Engine**: verificar se baixo, bateria, teclado e violão tocam sincronizados.

---

## 4. Plano de Rollback de Emergência

Caso ocorra um bug impeditivo (crash em runtime, falha de áudio em massa, erro de autorização no Firebase):

### Rollback no Firebase Hosting:
O Firebase armazena o histórico de todas as versões anteriores:
```bash
firebase hosting:rollback --project=virtuo-7e01b
```
O console do Firebase permite reativar a versão anterior em 1 clique com propagação global em menos de 60 segundos.

### Rollback do Service Worker:
Se o problema estiver no cache dos clientes:
1. Publicar um `sw.js` com incremento no `CACHE_NAME` e forçar `self.skipWaiting()`.
2. O novo Service Worker limpará o cache defeituoso e rebaixará os arquivos íntegros.
