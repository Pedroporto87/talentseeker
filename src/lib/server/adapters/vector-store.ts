import { QdrantClient } from "@qdrant/js-client-rest";
import type { SearchHit } from "@/lib/types";
import {
  getServerEnv,
  isQdrantCloudInferenceConfigured,
  isQdrantConfigured,
} from "@/lib/server/env";

type UpsertVectorInput = {
  id: string;
  vector: number[] | { text: string; model: string };
  payload: SearchHit["payload"];
};

function isQdrantDocumentVector(
  vector: UpsertVectorInput["vector"] | number[] | { text: string; model: string },
): vector is { text: string; model: string } {
  return !Array.isArray(vector);
}

declare global {
  var __resumeQdrantClient: QdrantClient | undefined;
  var __resumeMemoryVectors:
    | Map<string, UpsertVectorInput>
    | undefined;
  var __resumeVectorCollections: Set<string> | undefined;
  var __resumeVectorPayloadIndexes: Set<string> | undefined;
}

function cosineSimilarity(left: number[], right: number[]) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue ** 2;
    rightNorm += rightValue ** 2;
  }

  return dot / ((Math.sqrt(leftNorm) || 1) * (Math.sqrt(rightNorm) || 1));
}

function getQdrantClient() {
  if (!globalThis.__resumeQdrantClient) {
    const env = getServerEnv();
    globalThis.__resumeQdrantClient = new QdrantClient({
      url: env.qdrantUrl,
      apiKey: env.qdrantApiKey || undefined,
    });
  }

  return globalThis.__resumeQdrantClient;
}

function getMemoryVectors() {
  if (!globalThis.__resumeMemoryVectors) {
    globalThis.__resumeMemoryVectors = new Map<string, UpsertVectorInput>();
  }

  return globalThis.__resumeMemoryVectors;
}

async function ensureCollection(vectorSize: number) {
  if (!isQdrantConfigured()) {
    return;
  }

  const env = getServerEnv();
  if (!globalThis.__resumeVectorCollections) {
    globalThis.__resumeVectorCollections = new Set<string>();
  }

  if (globalThis.__resumeVectorCollections.has(env.qdrantCollection)) {
    return;
  }

  try {
    await getQdrantClient().getCollection(env.qdrantCollection);
  } catch {
    await getQdrantClient().createCollection(env.qdrantCollection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });
  }

  globalThis.__resumeVectorCollections.add(env.qdrantCollection);
}

async function ensurePayloadIndexes() {
  if (!isQdrantConfigured()) {
    return;
  }

  const env = getServerEnv();

  if (!globalThis.__resumeVectorPayloadIndexes) {
    globalThis.__resumeVectorPayloadIndexes = new Set<string>();
  }

  if (globalThis.__resumeVectorPayloadIndexes.has(env.qdrantCollection)) {
    return;
  }

  const exists = await getQdrantClient().collectionExists(env.qdrantCollection);
  if (!exists.exists) {
    return;
  }

  const collection = await getQdrantClient().getCollection(env.qdrantCollection);
  const payloadSchema = collection.payload_schema ?? {};
  const operations = [];

  if (!payloadSchema.resumeId) {
    operations.push(
      getQdrantClient().createPayloadIndex(env.qdrantCollection, {
        wait: true,
        field_name: "resumeId",
        field_schema: "keyword",
      }),
    );
  }

  if (!payloadSchema.candidateId) {
    operations.push(
      getQdrantClient().createPayloadIndex(env.qdrantCollection, {
        wait: true,
        field_name: "candidateId",
        field_schema: "keyword",
      }),
    );
  }

  await Promise.all(operations);
  globalThis.__resumeVectorPayloadIndexes.add(env.qdrantCollection);
}

export async function upsertResumeVectors(points: UpsertVectorInput[]) {
  if (points.length === 0) {
    return;
  }

  if (!isQdrantConfigured()) {
    for (const point of points) {
      getMemoryVectors().set(point.id, point);
    }
    return;
  }

  const env = getServerEnv();
  const firstVector = points[0].vector;
  const vectorSize = isQdrantDocumentVector(firstVector)
    ? env.qdrantVectorSize
    : firstVector.length;

  await ensureCollection(vectorSize);
  await ensurePayloadIndexes();
  await getQdrantClient().upsert(env.qdrantCollection, {
    wait: true,
    points: points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    })),
  });
}

export async function searchResumeVectors(
  vectorOrDocument: number[] | { text: string; model: string },
  limit = 20,
) {
  if (!isQdrantConfigured()) {
    if (!Array.isArray(vectorOrDocument)) {
      throw new Error(
        "Busca textual com Qdrant Cloud Inference exige um cluster Qdrant configurado.",
      );
    }

    return [...getMemoryVectors().values()]
      .map((point) => ({
        id: point.id,
        score: cosineSimilarity(vectorOrDocument, point.vector as number[]),
        payload: point.payload,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  const env = getServerEnv();
  const vectorSize = isQdrantDocumentVector(vectorOrDocument)
    ? env.qdrantVectorSize
    : vectorOrDocument.length;
  await ensureCollection(vectorSize);
  await ensurePayloadIndexes();
  const response =
    isQdrantCloudInferenceConfigured() &&
    isQdrantDocumentVector(vectorOrDocument)
      ? await getQdrantClient().query(env.qdrantCollection, {
          query: vectorOrDocument,
          limit,
          with_payload: true,
        })
      : await getQdrantClient().search(env.qdrantCollection, {
          vector: vectorOrDocument as number[],
          limit,
          with_payload: true,
        });

  const points = Array.isArray(response) ? response : response.points;

  return points.map((item) => ({
    id: String(item.id),
    score: item.score,
    payload: {
      resumeId: String(item.payload?.resumeId ?? ""),
      candidateId: item.payload?.candidateId
        ? String(item.payload.candidateId)
        : null,
      content: String(item.payload?.content ?? ""),
      chunkIndex: Number(item.payload?.chunkIndex ?? 0),
    },
  })) satisfies SearchHit[];
}

export async function removeResumeVectors(resumeId: string) {
  if (!isQdrantConfigured()) {
    for (const [id, point] of getMemoryVectors().entries()) {
      if (point.payload.resumeId === resumeId) {
        getMemoryVectors().delete(id);
      }
    }
    return;
  }

  const env = getServerEnv();
  const exists = await getQdrantClient().collectionExists(env.qdrantCollection);
  if (!exists.exists) {
    return;
  }

  await ensurePayloadIndexes();
  await getQdrantClient().delete(env.qdrantCollection, {
    wait: true,
    filter: {
      must: [
        {
          key: "resumeId",
          match: {
            value: resumeId,
          },
        },
      ],
    },
  });
}

export async function getResumeVectorCount() {
  if (!isQdrantConfigured()) {
    return getMemoryVectors().size;
  }

  const env = getServerEnv();
  const exists = await getQdrantClient().collectionExists(env.qdrantCollection);
  if (!exists.exists) {
    return 0;
  }

  const result = await getQdrantClient().count(env.qdrantCollection, {
    exact: true,
  });

  return result.count ?? 0;
}
