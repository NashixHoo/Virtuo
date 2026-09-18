# VOPS-06: MODELAGEM E GOVERNANÇA DO BANCO DE DADOS (FIRESTORE)

> **Série Operacional VIRTUO (VOPS)**  
> **Versão:** VIRTUO V1 (1.0.0)  
> **Data:** Setembro 2026  
> **Status:** Ativo e Obrigatório

---

## 1. Visão Geral das Coleções

O Cloud Firestore armazena a camada de dados persistentes do VIRTUO V1. A estrutura de coleções reflete a arquitetura de domínio:

| Coleção | Propósito | Regra de Acesso Primária |
| :--- | :--- | :--- |
| `users` | Perfis públicos de músicos e diretores | Leitura pública, escrita restrita ao dono |
| `admins` | Lista autoritativa de administradores | Leitura por autenticados, escrita bloqueada |
| `songs` | Acervo musical, letras e cifras verificadas | Leitura pública, escrita por criador/admin |
| `missions` | Escalas ministeriais e apresentações ao vivo | Diretor, Líder e membros da equipe |
| `rehearsals` | Sessões de ensaio e setlists de banda | Criador, membros da banda e convidados |
| `bands` | Cadastro de grupos, ministérios e bandas | Proprietário e integrantes da banda |
| `academy_courses` | Cursos oficiais do Virtuo Academy | Leitura pública, escrita apenas admin |
| `user_gear` | Inventário de instrumentos e pedais do músico | Estritamente isolado por `userId` |
| `user_activity` | Músicas recentes, favoritos e histórico | Estritamente isolado por `userId` |

---

## 2. Estrutura do Documento de Música (`songs/{songId}`)

```json
{
  "id": "song-12345",
  "title": "Fidelidade",
  "artist": "Virtuo Worship",
  "originalKey": "Am",
  "shapeKey": "Am",
  "bpm": 74,
  "timeSignature": "4/4",
  "difficulty": "Fácil",
  "capo": 0,
  "structure": "Intro • Verso • Refrão • Ponte • Final",
  "chords": "[Intro]\nAm  F  C  G\n\n[Verso]\nAm                  F\nTua fidelidade é grande...",
  "easyChords": "[Intro]\nAm  F  C  G\n...",
  "audioUrl": "",
  "youtubeUrl": "",
  "spotifyUrl": "",
  "createdBy": "uid-do-autor",
  "createdAt": "TIMESTAMP",
  "updatedAt": "TIMESTAMP"
}
```

---

## 3. Índices Compostos e Otimização de Consultas

As consultas de ordenação e filtro estão indexadas em `firestore.indexes.json`:
- Consulta por `createdBy` + `createdAt DESC` para listagem de músicas do próprio músico.
- Consulta de missões por `date DESC` + `status` para o painel de comando.

Caso uma nova consulta composta gere um erro de índice no console do navegador, deve-se:
1. Copiar a URL de geração de índice fornecida pelo Firebase.
2. Criar o índice no console do Cloud Firestore.
3. Exportar a definição atualizada para `firestore.indexes.json`.

---

## 4. Estratégia de Fallback e Cache Offline

O VIRTUO opera em ambientes onde a conexão de internet é instável ou inexistente (palcos, retiros, salas de ensaio):
- **Camada de Repositório (`SongsRepository`):** Em caso de falha de rede ou modo offline, a aplicação utiliza o acervo canônico local (`DEMO_SONGS`) e o `localStorage` do navegador para manter as cifras e ferramentas disponíveis.
- **Persistência de Sessão:** O estado de login e perfil é armazenado com persistência local do Firebase Auth (`browserLocalPersistence`), permitindo uso do app mesmo sem sinal de rede.
