import { chunkText } from "@/lib/chunking";
import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import {
  enhanceCandidateProfileWithGroq,
  extractCandidateProfileByHeuristics,
} from "@/lib/server/adapters/llm";
import {
  readStoredResume,
} from "@/lib/server/adapters/storage";
import {
  removeResumeVectors,
  upsertResumeVectors,
} from "@/lib/server/adapters/vector-store";
import { extractTextFromDocument } from "@/lib/server/document-parser";
import { isQdrantCloudInferenceConfigured } from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";
import type { ExtractedCandidateProfile } from "@/lib/types";

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function createIngestTimer(resumeId: string) {
  const startedAt = performance.now();
  let previousMark = startedAt;

  return (step: string, extra: Record<string, unknown> = {}) => {
    const now = performance.now();
    console.log("[ingest-resume] step", {
      resumeId,
      step,
      stepMs: Math.round(now - previousMark),
      totalMs: Math.round(now - startedAt),
      ...extra,
    });
    previousMark = now;
  };
}

function profilesAreDifferent(
  left: ExtractedCandidateProfile,
  right: ExtractedCandidateProfile,
) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function updateIngestJobInBackground(
  ingestJobId: string,
  patch: Parameters<ReturnType<typeof getRepository>["updateIngestJob"]>[1],
) {
  const repository = getRepository();
  void repository.updateIngestJob(ingestJobId, patch).catch((error) => {
    console.error("[ingest-resume] ingest-job-update-failed", {
      ingestJobId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export async function ingestResume(
  resumeId: string,
  options: {
    buffer?: Buffer;
  } = {},
) {
  const repository = getRepository();
  const mark = createIngestTimer(resumeId);
  const bundle = await repository.getResume(resumeId);

  if (!bundle) {
    throw new Error("Currículo não encontrado.");
  }

  const ingestJob = bundle.ingestJob;

  if (!ingestJob) {
    throw new Error("Job de ingestão não encontrado.");
  }

  await repository.updateResume(resumeId, {
    status: "parsing",
    ingestError: null,
  });
  updateIngestJobInBackground(ingestJob.id, {
    status: "parsing",
    errorMessage: null,
  });
  mark("status-updated");

  try {
    const buffer =
      options.buffer ??
      (await readStoredResume(bundle.resume.storageKey, bundle.resume.downloadUrl));
    mark("file-read", {
      bytes: buffer.length,
      source: options.buffer ? "upload-buffer" : "storage",
    });
    const extractedText = await extractTextFromDocument({
      buffer,
      mimeType: bundle.resume.mimeType,
      fileName: bundle.resume.fileName,
    });
    mark("text-extracted", { characters: extractedText.length });

    if (!extractedText || extractedText.length < 80) {
      await repository.updateResume(resumeId, {
        status: "needs_review",
        ingestError:
          "Não foi possível extrair texto suficiente. Verifique se o PDF possui camada de texto.",
        extractedText,
      });
      await repository.updateIngestJob(ingestJob.id, {
        status: "needs_review",
        errorMessage:
          "Currículo exige revisão manual por falta de texto utilizável.",
      });
      mark("needs-review");
      return;
    }

    const extractedProfile = extractCandidateProfileByHeuristics(extractedText);
    mark("profile-heuristic", { skills: extractedProfile.skills.length });
    const existingCandidate = await repository.findCandidateByIdentity({
      fullName: extractedProfile.fullName,
      email: extractedProfile.email,
    });
    const candidate = await repository.upsertCandidateProfile(
      extractedProfile,
      existingCandidate?.id,
    );

    mark("candidate-saved", { candidateId: candidate.id });

    const chunks = chunkText(extractedText, {
      maxTokens: 700,
      overlapTokens: 80,
    });
    const storedChunks = await repository.replaceResumeChunks(resumeId, chunks);
    mark("chunks-saved", { chunks: storedChunks.length });

    if (bundle.resume.status === "indexed") {
      await removeResumeVectors(resumeId);
      mark("old-vectors-removed");
    }

    const embeddedChunks = await mapWithConcurrency(storedChunks, 4, async (chunk) => {
      return {
        id: chunk.id,
        vector: isQdrantCloudInferenceConfigured()
          ? createQdrantDocument(chunk.content)
          : await createEmbedding(chunk.content),
        payload: {
          resumeId,
          candidateId: candidate.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
        },
      };
    });
    mark("vectors-prepared", { chunks: embeddedChunks.length });

    await upsertResumeVectors(embeddedChunks);
    mark("vectors-upserted", { chunks: embeddedChunks.length });
    await repository.updateResume(resumeId, {
      status: "indexed",
      extractedText,
      candidateId: candidate.id,
      ingestError: null,
    });
    updateIngestJobInBackground(ingestJob.id, {
      status: "indexed",
      errorMessage: null,
    });
    mark("indexed");

    void enhanceCandidateProfileWithGroq(extractedText, extractedProfile)
      .then(async (enhancedProfile) => {
        if (!profilesAreDifferent(extractedProfile, enhancedProfile)) {
          return;
        }

        await repository.upsertCandidateProfile(enhancedProfile, candidate.id);
        console.log("[ingest-resume] profile-enhanced", {
          resumeId,
          candidateId: candidate.id,
        });
      })
      .catch((error) => {
        console.error("[ingest-resume] profile-enhance-failed", {
          resumeId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha inesperada na ingestão.";
    await repository.updateResume(resumeId, {
      status: "failed",
      ingestError: message,
    });
    await repository.updateIngestJob(ingestJob.id, {
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}
