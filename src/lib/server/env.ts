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
    qdrantEmbeddingModel:
      process.env.QDRANT_EMBEDDING_MODEL ??
      "sentence-transformers/all-MiniLM-L6-v2",
    qdrantVectorSize: Number(process.env.QDRANT_VECTOR_SIZE ?? "384"),
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

export function isQdrantCloudInferenceConfigured() {
  const env = getServerEnv();
  return Boolean(env.qdrantUrl && env.qdrantEmbeddingModel);
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

export function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function shouldUseInngestCloud(hostname?: string) {
  if (!isInngestConfigured() || process.env.NODE_ENV !== "production") {
    return false;
  }

  if (hostname && isLocalHostname(hostname)) {
    return false;
  }

  return true;
}
