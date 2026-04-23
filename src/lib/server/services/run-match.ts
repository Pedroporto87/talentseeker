import { buildEvidence, calculateHybridScore } from "@/lib/matching";
import { createEmbedding } from "@/lib/server/adapters/embeddings";
import { rerankWithGroq } from "@/lib/server/adapters/llm";
import { searchResumeVectors } from "@/lib/server/adapters/vector-store";
import { getRepository } from "@/lib/server/repositories";
import type { MatchCandidateView, PipelineStage, RankingCandidate } from "@/lib/types";
import { uniqueStrings } from "@/lib/utils";

export async function runJobMatch(jobId: string): Promise<MatchCandidateView[]> {
  const repository = getRepository();
  const job = await repository.getJob(jobId);

  if (!job) {
    throw new Error("Vaga não encontrada.");
  }

  const query = [job.title, job.description, job.keywords.join(" ")].join("\n");
  const embedding = await createEmbedding(query);
  const hits = await searchResumeVectors(embedding, 20);
  const grouped = new Map<
    string,
    { resumeId: string; semanticScore: number }
  >();

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
