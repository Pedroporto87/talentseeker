import {
  getServerEnv,
  isOllamaConfigured,
  isQdrantCloudInferenceConfigured,
} from "@/lib/server/env";

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function pseudoEmbed(text: string, dimensions = 128) {
  const vector = Array.from({ length: dimensions }, () => 0);

  for (const token of tokenize(text)) {
    let hash = 0;
    for (let index = 0; index < token.length; index += 1) {
      hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
    }
    vector[hash % dimensions] += 1;
  }

  const magnitude =
    Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

type OllamaEmbedResponse = {
  embeddings?: number[][];
};

async function createOllamaEmbedding(text: string) {
  const env = getServerEnv();
  const response = await fetch(`${env.ollamaUrl}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ollamaEmbeddingModel,
      input: text,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Ollama embedding falhou com status ${response.status}${message ? `: ${message}` : ""}.`,
    );
  }

  const payload = (await response.json()) as OllamaEmbedResponse;
  return payload.embeddings?.[0];
}

export async function createEmbedding(text: string) {
  if (isQdrantCloudInferenceConfigured()) {
    return pseudoEmbed(text);
  }

  if (!isOllamaConfigured()) {
    return pseudoEmbed(text);
  }

  try {
    const embedding = await createOllamaEmbedding(text);
    return embedding ?? pseudoEmbed(text);
  } catch (error) {
    console.error(
      "Falha ao gerar embedding com Ollama. Usando fallback local.",
      error,
    );
    return pseudoEmbed(text);
  }
}

export function createQdrantDocument(text: string) {
  const env = getServerEnv();

  return {
    text,
    model: env.qdrantEmbeddingModel,
  };
}
