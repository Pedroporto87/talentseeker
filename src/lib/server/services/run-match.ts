import { buildEvidence, calculateHybridScore } from "@/lib/matching";
import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import { rerankWithGroq } from "@/lib/server/adapters/llm";
import {
  getResumeVectorCount,
  searchResumeVectors,
} from "@/lib/server/adapters/vector-store";
import {
  isQdrantCloudInferenceConfigured,
  isQdrantConfigured,
} from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";
import { ingestResume } from "@/lib/server/services/ingest-resume";
import { ensureResumeVectorsIndexed } from "@/lib/server/services/reindex-resume-vectors";
import type { MatchCandidateView, PipelineStage, RankingCandidate } from "@/lib/types";
import { uniqueStrings } from "@/lib/utils";

export class MatchValidationError extends Error {}

async function processPendingResumes() {
  const repository = getRepository();
  const resumes = await repository.listResumes();
  const pending = resumes
    .filter((item) =>
      item.resume.status === "uploaded" || item.resume.status === "parsing",
    )
    .slice(0, 3);

  for (const item of pending) {
    try {
      console.log("[run-match] ingesting pending resume", {
        resumeId: item.resume.id,
        fileName: item.resume.fileName,
      });
      await ingestResume(item.resume.id);
    } catch (error) {
      console.error("[run-match] pending resume ingest failed", {
        resumeId: item.resume.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return repository.listResumes();
}

export async function runJobMatch(jobId: string): Promise<MatchCandidateView[]> {
  const repository = getRepository();
  const job = await repository.getJob(jobId);

  if (!job) {
    throw new MatchValidationError("Vaga nao encontrada.");
  }

  const resumes = await processPendingResumes();
  const hasIndexedResume = resumes.some((item) => item.resume.status === "indexed");

  if (!hasIndexedResume) {
    throw new MatchValidationError(
      "Cadastre ao menos um curriculo antes de rodar o matching.",
    );
  }

  const query = [job.title, job.description, job.keywords.join(" ")].join("\n");
  const searchQuery = isQdrantCloudInferenceConfigured()
    ? createQdrantDocument(query)
    : await createEmbedding(query);

  console.log("[run-match] searching vectors", {
    jobId,
    indexedResumes: resumes.filter((item) => item.resume.status === "indexed").length,
  });

  let hits = await searchResumeVectors(searchQuery, 20);

  if (hits.length === 0 && isQdrantConfigured()) {
    const vectorCount = await getResumeVectorCount();
    if (vectorCount === 0) {
      await ensureResumeVectorsIndexed();
      hits = await searchResumeVectors(searchQuery, 20);
    }
  }

  console.log("[run-match] vector search completed", {
    jobId,
    hits: hits.length,
  });

  const grouped = new Map<string, { resumeId: string; semanticScore: number }>();

  for (const hit of hits) {
    const current = grouped.get(hit.payload.resumeId);
    if (!current || hit.score > current.semanticScore) {
      grouped.set(hit.payload.resumeId, {
        resumeId: hit.payload.resumeId,
        semanticScore: hit.score,
      });
    }
  }

  const rankedCandidates: RankingCandidate[] = [];

  for (const item of grouped.values()) {
    const bundle = await repository.getResume(item.resumeId);
    if (!bundle?.candidate || bundle.resume.status !== "indexed") {
      continue;
    }

    const hybridScore = calculateHybridScore({
      semanticScore: item.semanticScore,
      candidate: bundle.candidate,
      keywords: job.keywords,
      resumeText: [
        bundle.resume.extractedText,
        bundle.candidate.summary,
        bundle.candidate.skills.join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    });

    rankedCandidates.push({
      candidate: bundle.candidate,
      resume: bundle.resume,
      hybridScore,
      matchingEvidence: uniqueStrings(
        buildEvidence({
          candidate: bundle.candidate,
          keywords: job.keywords,
          resumeText: bundle.resume.extractedText ?? "",
        }),
      ),
    });
  }

  const reranked = await rerankWithGroq({
    job,
    candidates: rankedCandidates
      .sort(
        (left, right) =>
          right.hybridScore.overallScore - left.hybridScore.overallScore,
      )
      .slice(0, 10),
  });

  console.log("[run-match] rerank completed", {
    jobId,
    candidates: reranked.length,
  });

  return repository.replaceMatchResults(
    jobId,
    reranked.slice(0, 5).map((candidate) => ({
      candidateId: candidate.candidate.id,
      resumeId: candidate.resume.id,
      overallScore: candidate.score / 100,
      semanticScore: candidate.hybridScore.semanticScore,
      keywordScore: candidate.hybridScore.keywordScore,
      profileScore: candidate.hybridScore.profileScore,
      justification: candidate.justification,
      stage: "aderente" satisfies PipelineStage,
    })),
  );
}
