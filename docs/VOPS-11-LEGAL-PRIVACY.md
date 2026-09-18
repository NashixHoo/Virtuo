# VOPS-11: CONFORMIDADE LEGAL, PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD/GDPR)

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Filosofia de Privacidade por Design (Privacy by Design)

O VIRTUO coleta apenas as informações estritamente necessárias para a prestação do serviço musical. Os princípios aplicados são:

1. **Minimização de Dados:** Não coletamos localização geográfica em tempo real, contatos telefônicos nem dados financeiros dentro do cliente básico.
2. **Finalidade Específica:** O e-mail e nome são utilizados exclusivamente para autenticação, sincronização de cifras e identificação na escala de apresentação da banda.
3. **Transparência:** Os usuários têm acesso a `docs/PRIVACY_POLICY.md` e `docs/TERMS_OF_SERVICE.md` diretamente nas configurações do aplicativo.

---

## 2. Processamento de Áudio e Microfone (Declaração Rigorosa)

Esta é uma garantia técnica e contratual do VIRTUO:

> **O ÁUDIO CAPTADO PELO MICROFONE NO AFINADOR CROMÁTICO NUNCA É GRAVADO, NUNCA É TRANSMITIDO E NUNCA É ARMAZENADO EM QUALQUER SERVIDOR.**

- O fluxo de áudio é capturado via Web Audio API e processado instantaneamente na CPU/GPU do próprio dispositivo do usuário por algoritmos de Transformada Rápida de Fourier (FFT) e autocorrelação no arquivo `src/components/tuner/tuner-dsp.js`.
- O stream do microfone é encerrado imediatamente no momento em que o usuário fecha ou sai da tela do afinador.

---

## 3. Direitos dos Titulares (LGPD Art. 18 / GDPR Art. 17)

### 3.1 Direito de Acesso e Exportação
O usuário pode visualizar todas as cifras, missões e histórico salvos em sua conta a qualquer momento na interface.

### 3.2 Direito de Exclusão ("Direito ao Esquecimento")
Quando um usuário solicita o encerramento da conta:
1. As cifras criadas pessoalmente por ele (`createdBy == uid`) são desvinculadas ou excluídas.
2. O documento do usuário em `users/{userId}` é removido.
3. O cadastro de autenticação é excluído do Firebase Auth via `user.delete()`.
4. Os dados em cache local (`localStorage`, IndexedDB) são purgados via `localStorage.clear()`.

---

## 4. Segurança no Armazenamento de Credenciais

- As senhas dos usuários nunca são conhecidas nem acessíveis pela equipe do VIRTUO: são gerenciadas com criptografia salt/hash robusta pela infraestrutura segura do Google Identity / Firebase Authentication.
- O aplicativo não armazena tokens de acesso em texto plano em locais inseguros.
