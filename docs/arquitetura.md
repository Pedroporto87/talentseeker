# Arquitetura do TalentSeeker AI

## Visao geral

O `TalentSeeker AI` e uma plataforma de recrutamento inteligente focada em:

- cadastro de vagas
- upload e processamento de curriculos
- matching semantico entre vaga e candidatos
- ranking com justificativa
- pipeline visual do processo seletivo

O projeto foi construído em `Next.js 16` com `TypeScript` e utiliza banco relacional, armazenamento de arquivos, busca vetorial e IA generativa para apoiar o RH na triagem inicial de perfis.

---

## Objetivo da solucao

O principal objetivo da aplicacao e reduzir o tempo gasto na analise manual de curriculos e tornar a triagem inicial mais consistente.

Em vez de o RH precisar abrir e comparar curriculos individualmente, o sistema:

1. recebe a vaga com descricao e palavras-chave
2. recebe os curriculos em `PDF` ou `DOCX`
3. extrai o texto dos arquivos
4. estrutura o perfil do candidato
5. indexa o conteudo semanticamente
6. encontra os candidatos mais aderentes
7. exibe ranking e justificativas

---

## Stack principal

### Frontend e backend de aplicacao

- `Next.js 16`
- `React 19`
- `TypeScript`
- `App Router`

O `Next.js` concentra tanto a interface quanto as APIs do sistema.

### Validacao e formularios

- `react-hook-form`
- `zod`

Essas bibliotecas garantem que os dados enviados pelo usuario estejam no formato esperado.

### Banco de dados relacional

- `Postgres`
- `Supabase`
- `postgres` client
- `Drizzle schema`

O banco armazena vagas, curriculos, candidatos, chunks, resultados de matching e historico do pipeline.

### Armazenamento de arquivos

- `Vercel Blob`

Os arquivos originais enviados pelo usuario sao salvos no Blob.

### Extracao de texto de documentos

- `pdf-parse` para arquivos `PDF`
- `mammoth` para arquivos `DOCX`

### Busca semantica e vetores

- `Qdrant Cloud`
- `@qdrant/js-client-rest`

O Qdrant armazena os vetores dos chunks dos curriculos e executa a busca semantica.

### IA generativa

- `Groq`
- `groq-sdk`

O Groq e usado em dois momentos:

- extracao estruturada do perfil do candidato
- rerank final com justificativa

### Processamento assincrono

- `Inngest`

O projeto esta preparado para processamento assincrono, embora o fluxo atual de upload esteja processando inline para tornar a demonstracao mais confiavel.

---

## Principais modulos da interface

- `Dashboard`
- `Vagas`
- `Curriculos`
- `Ranking`
- `Pipeline`

Cada modulo atende uma etapa do fluxo do RH.

---

## Estrutura de dados principal

As tabelas principais estao definidas em [src/lib/server/schema.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/schema.ts).

### `jobs`

Armazena as vagas cadastradas:

- `id`
- `title`
- `description`
- `keywords`
- `createdAt`
- `updatedAt`

### `resumes`

Armazena os metadados do curriculo:

- `fileName`
- `mimeType`
- `fileHash`
- `storageKey`
- `downloadUrl`
- `status`
- `extractedText`
- `ingestError`
- `candidateId`

### `ingest_jobs`

Armazena o estado tecnico do processamento do curriculo.

### `candidate_profiles`

Armazena o perfil estruturado extraido do curriculo:

- nome
- email
- skills
- anos de experiencia
- cargo atual
- localizacao
- resumo

### `resume_chunks`

Armazena os blocos de texto gerados a partir do curriculo.

### `match_results`

Armazena o ranking salvo de candidatos por vaga:

- score geral
- score semantico
- score por keywords
- score de perfil
- justificativa
- etapa atual do pipeline

### `pipeline_stage_history`

Armazena o historico de movimentacao de candidatos entre etapas.

---

## Variaveis de ambiente principais

As configuracoes ficam centralizadas em [src/lib/server/env.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/env.ts).

### Banco e armazenamento

- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `BLOB_STORE_ACCESS`

### Busca vetorial

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `QDRANT_EMBEDDING_MODEL`
- `QDRANT_VECTOR_SIZE`

### IA

- `GROQ_API_KEY`
- `GROQ_MODEL`

### Orquestracao

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

### Aplicacao

- `NEXT_PUBLIC_APP_URL`

---

## Fluxo 1: criacao de vaga

### O que o usuario faz

O usuario acessa a tela de `Vagas` e informa:

- titulo da vaga
- descricao da vaga
- palavras-chave

### O que a aplicacao faz

1. O frontend envia os dados para `POST /api/jobs`.
2. A rota valida o corpo da requisicao com `zod`.
3. O repositório persiste a vaga no banco.
4. A vaga passa a ficar disponivel para:
   - tela de vagas
   - ranking
   - pipeline
   - matching

Arquivo principal da API:

- [src/app/api/jobs/route.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/app/api/jobs/route.ts)

### Onde a vaga fica armazenada

No `Postgres`, na tabela `jobs`.

### O papel das palavras-chave

As palavras-chave tem dois usos:

1. compor a consulta da vaga para busca semantica
2. influenciar o score de aderencia por cobertura de keywords

Ou seja, elas nao sao apenas exibidas. Elas participam de fato do algoritmo de matching.

---

## Fluxo 2: upload de curriculo em PDF ou DOCX

### O que o usuario faz

Na tela de `Curriculos`, o usuario envia um arquivo `PDF` ou `DOCX`.

### O que a API faz ao receber o arquivo

Arquivo principal:

- [src/app/api/resumes/upload/route.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/app/api/resumes/upload/route.ts)

Passo a passo:

1. valida se o arquivo existe
2. valida se o formato e `PDF` ou `DOCX`
3. converte o arquivo em `Buffer`
4. gera um `SHA-256` do arquivo
5. envia o arquivo para o `Vercel Blob`
6. grava um registro em `resumes`
7. cria um registro em `ingest_jobs`
8. chama o processo de ingestao

### Onde o arquivo fica armazenado

O arquivo original fica salvo no `Vercel Blob`.

Os campos de referencia ficam no banco:

- `storageKey`
- `downloadUrl`

### Onde os metadados ficam armazenados

Na tabela `resumes`.

### Deduplicacao

O sistema calcula um `fileHash` para detectar arquivos duplicados.

Se o mesmo curriculo for reenviado e ja existir uma versao indexada com o mesmo hash, o novo registro falha com mensagem amigavel.

---

## Fluxo 3: processamento e varredura do curriculo

O processamento principal esta em:

- [src/lib/server/services/ingest-resume.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/services/ingest-resume.ts)

### Etapa 1: leitura do arquivo armazenado

O sistema baixa novamente o arquivo do Blob usando:

- [src/lib/server/adapters/storage.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/storage.ts)

### Etapa 2: extracao de texto

O sistema identifica o tipo do arquivo e extrai texto com:

- `pdf-parse` para `PDF`
- `mammoth` para `DOCX`

Arquivo responsavel:

- [src/lib/server/document-parser.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/document-parser.ts)

### Como a varredura do arquivo acontece

No caso do `PDF`, o parser tenta ler a camada de texto do documento.

Isso significa:

- PDFs com texto normal funcionam bem
- PDFs escaneados sem OCR podem nao ter texto suficiente

Se o texto extraido for muito pequeno, o curriculo vai para `needs_review`.

### Etapa 3: normalizacao do texto

Depois da extracao, o texto e normalizado para remover ruido, espacos excessivos e padronizar o conteudo antes do processamento.

### Etapa 4: extracao do perfil estruturado

O texto completo e enviado para o Groq, que tenta devolver um JSON com:

- `fullName`
- `email`
- `skills`
- `yearsExperience`
- `currentRole`
- `location`
- `summary`

Arquivo responsavel:

- [src/lib/server/adapters/llm.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/llm.ts)

Se o Groq falhar, o sistema usa heuristicas locais para tentar montar o perfil.

### Etapa 5: persistencia do perfil estruturado

Os dados extraidos vao para a tabela `candidate_profiles`.

O curriculo passa a apontar para esse candidato via `candidateId`.

### Etapa 6: chunking

O texto completo e dividido em blocos menores para indexacao.

Arquivo:

- [src/lib/chunking.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/chunking.ts)

Configuracao atual:

- `500` tokens por chunk
- `100` tokens de overlap

Isso ajuda a nao perder contexto entre os blocos.

### Etapa 7: gravacao dos chunks

Os chunks sao salvos no banco na tabela `resume_chunks`.

### Etapa 8: vetorizacao e indexacao

Cada chunk e enviado para a camada vetorial.

Arquivos:

- [src/lib/server/adapters/embeddings.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/embeddings.ts)
- [src/lib/server/adapters/vector-store.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/vector-store.ts)

Quando o `Qdrant Cloud Inference` esta configurado, o projeto envia um objeto com:

- `text`
- `model`

O proprio Qdrant aplica o embedding com o modelo configurado.

Cada vetor salvo leva junto um payload com:

- `resumeId`
- `candidateId`
- `content`
- `chunkIndex`

### Etapa 9: finalizacao

Se tudo funcionar:

- o curriculo vira `indexed`
- o `ingest_job` vira `indexed`

Se houver falha:

- o curriculo vira `failed`
- a mensagem e salva em `ingestError`

---

## Status dos curriculos

Os status estao definidos em [src/lib/types.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/types.ts).

### `uploaded`

Arquivo recebido pela API.

### `parsing`

Arquivo em processamento.

### `indexed`

Curriculo processado com sucesso e pronto para participar do matching.

### `failed`

Falha tecnica no processamento.

### `needs_review`

Texto insuficiente ou documento sem conteudo util suficiente.

---

## Fluxo 4: matching da vaga com os curriculos

Arquivo principal:

- [src/lib/server/services/run-match.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/services/run-match.ts)

### O que acontece quando o usuario clica em `Rodar matching`

1. O frontend chama `POST /api/jobs/:id/match`.
2. O sistema busca a vaga pelo `id`.
3. O sistema verifica se existem curriculos indexados.
4. Se existirem curriculos pendentes, ele tenta processar alguns antes de continuar.
5. O sistema monta uma consulta com:
   - titulo
   - descricao
   - palavras-chave
6. Essa consulta e enviada para a busca vetorial.

### Como a busca semantica acontece

O sistema consulta o `Qdrant` para encontrar os chunks mais proximos semanticamente da vaga.

Ele pede os `top 20` resultados mais relevantes.

Depois disso:

1. agrupa os hits por curriculo
2. mantem o melhor score semantico por curriculo
3. busca os dados do candidato e do curriculo

### Como o score e calculado

Arquivo responsavel:

- [src/lib/matching.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/matching.ts)

O score hibrido usa:

- `70%` score semantico
- `20%` cobertura de palavras-chave
- `10%` sinais do perfil estruturado

### O que entra em sinais de perfil

O sistema considera principalmente:

- skills
- resumo
- cargo atual
- localizacao
- anos de experiencia

### Evidencias geradas

Antes do rerank, o sistema monta evidencias como:

- cobertura de keywords
- anos de experiencia detectados
- ultima funcao
- skills detectadas

### Rerank com Groq

Depois do score hibrido, o Groq recebe os candidatos mais promissores para:

- reordenar os perfis
- gerar uma nota de `0 a 100`
- escrever uma justificativa curta

### Persistencia do ranking

O resultado final e salvo em `match_results`.

Cada candidato entra inicialmente no pipeline como:

- `aderente`

---

## Fluxo 5: ranking

Depois que o matching e executado:

- a tela de `Ranking` exibe os top candidatos
- cada item mostra nota e justificativa

Esses dados nao sao recalculados a cada render. Eles sao lidos da tabela `match_results`.

---

## Fluxo 6: pipeline

O pipeline usa os dados do ranking salvo e permite mover o candidato entre:

- `aderente`
- `triagem`
- `entrevista_inicial`
- `entrevista_tecnica`
- `contratado`

Quando a etapa muda:

1. o `stage` do candidato em `match_results` e atualizado
2. um historico e salvo em `pipeline_stage_history`

Assim a aplicacao mantem o estado atual e tambem a trilha das mudancas.

---

## Fallbacks e resiliencia

O projeto foi preparado para continuar funcionando mesmo com falhas em algumas integracoes.

### Se o Groq falhar

- o perfil do candidato pode ser extraido por heuristicas locais
- o rerank usa fallback local baseado no score hibrido

### Se o Qdrant falhar

- o matching tenta fallback local para nao quebrar o fluxo

### Se o Blob nao estiver configurado

- o projeto pode operar em memoria para desenvolvimento local

### Se o banco nao estiver configurado

- existe repositorio em memoria para desenvolvimento

---

## APIs principais

### Vagas

- `POST /api/jobs`
- `PATCH /api/jobs/:id`
- `DELETE /api/jobs/:id`

### Curriculos

- `POST /api/resumes/upload`
- `DELETE /api/resumes/:id`

### Matching

- `POST /api/jobs/:id/match`
- `GET /api/jobs/:id/matches`

### Pipeline

- `PATCH /api/candidates/:id/stage`

### Inngest

- `GET|POST|PUT /api/inngest`

---

## Resumo do fluxo completo

### Quando o usuario cria uma vaga

- os dados saem da interface
- passam pela API
- sao validados
- ficam salvos no `Postgres`
- as palavras-chave passam a influenciar a busca e o score

### Quando o usuario envia um curriculo

- o arquivo vai para o `Vercel Blob`
- os metadados vao para `resumes`
- o arquivo e relido
- o texto e extraido com `pdf-parse` ou `mammoth`
- o perfil estruturado e gerado com `Groq`
- os chunks vao para `resume_chunks`
- os vetores vao para `Qdrant`
- o curriculo fica `indexed`

### Quando o usuario roda o matching

- a vaga e carregada do banco
- a consulta semantica e montada
- o Qdrant procura os chunks mais proximos
- o sistema calcula score hibrido
- o Groq gera justificativa e nota final
- o ranking vai para `match_results`
- o candidato entra no pipeline

---

## Arquivos-chave para estudo

### APIs

- [src/app/api/jobs/route.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/app/api/jobs/route.ts)
- [src/app/api/resumes/upload/route.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/app/api/resumes/upload/route.ts)
- [src/app/api/jobs/[id]/match/route.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/app/api/jobs/[id]/match/route.ts)

### Servicos

- [src/lib/server/services/ingest-resume.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/services/ingest-resume.ts)
- [src/lib/server/services/run-match.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/services/run-match.ts)

### Infraestrutura tecnica

- [src/lib/server/document-parser.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/document-parser.ts)
- [src/lib/server/adapters/storage.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/storage.ts)
- [src/lib/server/adapters/embeddings.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/embeddings.ts)
- [src/lib/server/adapters/vector-store.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/vector-store.ts)
- [src/lib/server/adapters/llm.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/adapters/llm.ts)
- [src/lib/server/schema.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/schema.ts)
- [src/lib/server/env.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/server/env.ts)

### Regras de negocio

- [src/lib/chunking.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/chunking.ts)
- [src/lib/matching.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/matching.ts)
- [src/lib/types.ts](/C:/Users/Administrador/Desktop/leitor-de-curriculo/src/lib/types.ts)

---

## Conclusao

O projeto foi desenhado para mostrar uma jornada completa de recrutamento assistido por IA:

- a vaga nasce estruturada
- o curriculo e transformado em dado pesquisavel
- a busca semantica encontra aderencia real
- o LLM melhora a interpretacao final
- o RH recebe ranking e pipeline em uma unica plataforma

Essa arquitetura permite evoluir futuramente para:

- autenticacao
- multiempresa
- analytics
- OCR
- integracao com sistemas internos
- trilhas de auditoria mais profundas

