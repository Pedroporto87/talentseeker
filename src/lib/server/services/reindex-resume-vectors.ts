import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import { upsertResumeVectors } from "@/lib/server/adapters/vector-store";
import { isQdrantCloudInferenceConfigured } from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";

declare global {
  var __resumeVectorReindexPromise: Promise<number> | undefined;
}

async function rebuildResumeVectors() {
  const repository = getRepository();
  const resumes = await repository.listResumes();
  let indexedChunks = 0;

  for (const bundle of resumes) {
    if (bundle.resume.status !== "indexed" || !bundle.candidate) {
      continue;
    }

    const chunks = await repository.listResumeChunks(bundle.resume.id);
    if (chunks.length === 0) {
      continue;
    }

    await upsertResumeVectors(
      await Promise.all(
        chunks.map(async (chunk) => ({
          id: chunk.id,
          vector: isQdrantCloudInferenceConfigured()
            ? createQdrantDocument(chunk.content)
            : await createEmbedding(chunk.content),
          payload: {
            resumeId: bundle.resume.id,
            candidateId: bundle.candidate!.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
          },
        })),
      ),
    );

    indexedChunks += chunks.length;
  }

  return indexedChunks;
}

export async function ensureResumeVectorsIndexed() {
  if (!globalThis.__resumeVectorReindexPromise) {
    globalThis.__resumeVectorReindexPromise = rebuildResumeVectors().finally(() => {
      globalThis.__resumeVectorReindexPromise = undefined;
    });
  }

  return globalThis.__resumeVectorReindexPromise;
}
