# TalentSeeker AI

Suite de RH em `Next.js` para concurso, com upload de curriculos, ingestao assincrona, embeddings, busca semantica, ranking com justificativa e pipeline visual.

## Stack

- `Next.js 16` + `TypeScript` + `App Router`
- `Inngest` para jobs assincronos
- `Vercel Blob` para arquivos
- `Qdrant Cloud` para embeddings e busca vetorial
- `Groq` para extracao de perfil e rerank
- `Supabase/Postgres` via `DATABASE_URL`

Quando as credenciais nao estao presentes, o app entra em fallback local:

- storage em memoria
- embeddings heuristicos
- vetores em memoria
- extracao/rerank heuristicos
- repositorio em memoria

Isso permite desenvolver e demonstrar o fluxo sem depender das integracoes externas no primeiro momento.

## Modulos entregues

- `Dashboard`
- `Vagas`
- `Curriculos`
- `Ranking`
- `Pipeline`

## APIs

- `POST /api/resumes/upload`
- `DELETE /api/resumes/:id`
- `POST /api/jobs`
- `PATCH /api/jobs/:id`
- `DELETE /api/jobs/:id`
- `POST /api/jobs/:id/match`
- `GET /api/jobs/:id/matches`
- `PATCH /api/candidates/:id/stage`
- `GET|POST|PUT /api/inngest`

## Setup

1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.example`.

3. Rode o projeto:

```bash
npm run dev
```

4. Abra `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run db:setup
```

## Banco e migracao

- O schema SQL inicial esta em `drizzle/0000_initial.sql`
- A configuracao do Drizzle esta em `drizzle.config.ts`
- Em producao, aplique o schema no Postgres/Supabase antes de subir o app

## Variaveis de ambiente

Use `.env.example` como base. As principais sao:

- `DATABASE_URL`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `QDRANT_EMBEDDING_MODEL`
- `QDRANT_VECTOR_SIZE`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `BLOB_READ_WRITE_TOKEN`
- `BLOB_STORE_ACCESS`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `NEXT_PUBLIC_APP_URL`

## Fluxo principal

1. RH cria a vaga com titulo, descricao e palavras-chave.
2. RH faz upload do curriculo em `PDF` ou `DOCX`.
3. O app extrai texto, faz chunking e indexa os blocos com `Qdrant Cloud Inference`.
4. O matching busca os curriculos mais aderentes.
5. O rerank gera nota e justificativa curta.
6. O RH move candidatos entre `Aderente`, `Triagem`, `Entrevista inicial`, `Entrevista tecnica` e `Contratado`.

## Testes implementados

- chunking com overlap
- score hibrido
- fallback de rerank

## Observacao de seguranca

Para o demo, o Blob esta preparado com fluxo simples. Em producao, recomenda-se endurecer acesso a curriculos, usar storage privado e adicionar autenticacao/autorizacao.
