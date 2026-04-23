import {
  isBlobConfigured,
  isDatabaseConfigured,
  isGroqConfigured,
  isInngestConfigured,
  isOllamaConfigured,
  isQdrantConfigured,
} from "@/lib/server/env";

export function getServiceStatus() {
  return [
    {
      label: "Banco",
      value: isDatabaseConfigured() ? "Supabase/Postgres" : "Memoria local",
      enabled: isDatabaseConfigured(),
    },
    {
      label: "Storage",
      value: isBlobConfigured() ? "Vercel Blob" : "Memoria local",
      enabled: isBlobConfigured(),
    },
    {
      label: "Embeddings",
      value: isOllamaConfigured() ? "Ollama" : "Embedding heuristico",
      enabled: isOllamaConfigured(),
    },
    {
      label: "Vetores",
      value: isQdrantConfigured() ? "Qdrant" : "Busca local",
      enabled: isQdrantConfigured(),
    },
    {
      label: "LLM",
      value: isGroqConfigured() ? "Groq" : "Fallback heuristico",
      enabled: isGroqConfigured(),
    },
    {
      label: "Jobs",
      value: isInngestConfigured() ? "Inngest" : "Fila local",
      enabled: isInngestConfigured(),
    },
  ];
}
