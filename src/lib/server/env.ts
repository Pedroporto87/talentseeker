import { DEFAULT_QDRANT_COLLECTION } from "@/lib/constants";

export function getServerEnv() {
  const blobAccess: "public" | "private" =
    process.env.BLOB_STORE_ACCESS === "public" ? "public" : "private";

  return {
    databaseUrl: process.env.DATABASE_URL ?? "",
    qdrantUrl: process.env.QDRANT_URL ?? "",
    qdrantApiKey: process.env.QDRANT_API_KEY ?? "",
    qdrantCollection:
      process.env.QDRANT_COLLECTION ?? DEFAULT_QDRANT_COLLECTION,
    ollamaUrl: process.env.OLLAMA_URL ?? "",
    ollamaEmbeddingModel:
      process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma",
    groqApiKey: process.env.GROQ_API_KEY ?? "",
    groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
    blobAccess,
    inngestEventKey: process.env.INNGEST_EVENT_KEY ?? "",
    inngestSigningKey: process.env.INNGEST_SIGNING_KEY ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function isDatabaseConfigured() {
  return Boolean(getServerEnv().databaseUrl);
}

export function isQdrantConfigured() {
  return Boolean(getServerEnv().qdrantUrl);
}

export function isOllamaConfigured() {
  return Boolean(getServerEnv().ollamaUrl);
}

export function isGroqConfigured() {
  return Boolean(getServerEnv().groqApiKey);
}

export function isBlobConfigured() {
  return Boolean(getServerEnv().blobToken);
}

export function isInngestConfigured() {
  return Boolean(getServerEnv().inngestEventKey);
}

export function shouldUseInngestCloud() {
  return isInngestConfigured() && process.env.NODE_ENV === "production";
}
