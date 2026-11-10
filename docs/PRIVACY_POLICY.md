# Política de Privacidade — VIRTUO

**Última atualização:** 15 de setembro de 2026  
**Plataforma:** VIRTUO — A plataforma do músico virtuoso  
**Criador / Desenvolvedor:** Nashix Hoo  
**Encarregado / Contato de Privacidade:** [privacidade@virtuomusic.app — Placeholder de Suporte]

---

## 1. Informações Gerais
A sua privacidade é fundamental para o VIRTUO. Esta Política de Privacidade explica de forma transparente como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais ao utilizar nossa plataforma, em conformidade com as leis de proteção de dados aplicáveis (incluindo a LGPD — Lei Geral de Proteção de Dados, Lei nº 13.709/2018).

## 2. Dados Coletados
Coletamos estritamente os dados necessários para o funcionamento e personalização das ferramentas musicais:
1. **Dados de Conta e Autenticação**:
   - Nome de exibição, endereço de e-mail, identificador exclusivo (UID) fornecido pelo Firebase Authentication e foto de perfil opcional (quando fornecida via login Google ou URL informada).
2. **Dados de Uso e Preferências Musicais**:
   - Instrumentos selecionados pelo músico (ex: violão, teclado, vocal, baixo, bateria);
   - Listas de ensaios e repertórios criados no Modo Ensaio;
   - Cifras favoritas e histórico recente de músicas abertas;
   - Posts e interações no feed da Comunidade.
3. **Mídias e Arquivos (Opcionais)**:
   - Áudios de referência e fotos de perfil enviadas voluntariamente para o Firebase Storage, submetidas às regras de limite e propriedade do usuário.
4. **Permissões de Hardware**:
   - **Microfone**: Solicitado exclusivamente quando o usuário opta por utilizar o Afinador Cromático ou o Detector de Tom Vocal. O processamento de áudio do microfone ocorre **100% no dispositivo (client-side)** via Web Audio API e NENHUM dado de voz ou áudio é gravado, transmitido ou armazenado em nossos servidores.

## 3. Uso de Inteligência Artificial (Virtuo AI)
- As consultas enviadas ao assistente Virtuo AI são processadas de forma segura através do nosso backend proxy.
- **Privacidade da IA**: Nenhuma credencial pessoal, senha ou dado sensível do usuário é enviado aos modelos do Gemini. Apenas os títulos das canções, tonalidades e dúvidas sobre arranjos musicais são transmitidos para gerar as recomendações harmônicas.
- Não utilizamos suas cifras ou dados de ensaio privados para treinamento de modelos públicos sem consentimento prévio.

## 4. Compartilhamento de Dados
O VIRTUO **NÃO vende, aluga ou compartilha** dados pessoais com terceiros para fins de marketing ou publicidade. Os dados trafegam exclusivamente por provedores essenciais de infraestrutura em nuvem:
- **Google Cloud Platform & Firebase**: Hospedagem de banco de dados (Firestore), autenticação segura e armazenamento de arquivos;
- **Google GenAI / Gemini API**: Processamento de inteligência musical via backend dedicado.

## 5. Armazenamento e Segurança
- Todo o tráfego de dados é criptografado em trânsito através de protocolos seguros (HTTPS / TLS).
- Os acessos ao banco de dados são estritamente governados por regras de segurança do Firestore (`firestore.rules`), impedindo que usuários não autorizados visualizem seus ensaios privados ou alterem seus dados.

## 6. Seus Direitos (LGPD)
Você tem o direito de, a qualquer momento:
- Acessar seus dados armazenados em seu perfil;
- Corrigir dados incompletos ou inexatos;
- Excluir sua conta e seus dados associados enviando uma solicitação para `[privacidade@virtuomusic.app — Placeholder]`.

## 7. Contato e Suporte
Para qualquer dúvida referente à proteção de dados ou a estes termos, entre em contato através de:
- **E-mail de Contato**: `[privacidade@virtuomusic.app — Placeholder]`
- **Canal de Suporte Geral**: `[suporte@virtuomusic.app — Placeholder]`

---
*VIRTUO © 2026 Nashix Hoo. Todos os direitos reservados.*
