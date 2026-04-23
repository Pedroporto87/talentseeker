import { buildEvidence, calculateHybridScore, rerankFallback } from "@/lib/matching";
import type { CandidateProfile, RankingCandidate, ResumeRecord } from "@/lib/types";

function createCandidate(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: "candidate-1",
    fullName: "Ana Souza",
    email: "ana@example.com",
    skills: ["Next.js", "Azure", "TypeScript"],
    yearsExperience: 5,
    currentRole: "Frontend Engineer",
    location: "Sao Paulo",
    summary: "Atua com React, Next.js e Azure em produtos B2B.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createResume(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    candidateId: "candidate-1",
    fileName: "ana-souza.pdf",
    mimeType: "application/pdf",
    fileHash: "hash",
    storageKey: "mock://resume-1",
    downloadUrl: "mock://resume-1",
    status: "indexed",
    extractedText:
      "Ana trabalhou 5 anos com Next.js, Azure, TypeScript e arquitetura frontend.",
    ingestError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("matching helpers", () => {
  it("calculates weighted hybrid scores", () => {
    const score = calculateHybridScore({
      semanticScore: 0.82,
      candidate: createCandidate(),
      keywords: ["Next.js", "Azure"],
      resumeText: createResume().extractedText ?? "",
    });

    expect(score.semanticScore).toBe(0.82);
    expect(score.keywordScore).toBeGreaterThan(0.9);
    expect(score.overallScore).toBeGreaterThan(0.8);
  });

  it("creates human-readable evidence", () => {
    const evidence = buildEvidence({
      candidate: createCandidate(),
      keywords: ["Next.js", "Azure"],
      resumeText: createResume().extractedText ?? "",
    });

    expect(evidence.join(" ")).toContain("palavras-chave");
  });

  it("falls back to hybrid ordering when reranking is unavailable", () => {
    const candidate = createCandidate();
    const resume = createResume();

    const ranked = rerankFallback([
      {
        candidate,
        resume,
        hybridScore: {
          semanticScore: 0.9,
          keywordScore: 0.8,
          profileScore: 0.7,
          overallScore: 0.85,
        },
        matchingEvidence: ["Possui Next.js e Azure."],
      },
      {
        candidate: createCandidate({
          id: "candidate-2",
          fullName: "Bruno Lima",
          skills: ["React"],
        }),
        resume: createResume({
          id: "resume-2",
          candidateId: "candidate-2",
          extractedText: "React e JavaScript.",
        }),
        hybridScore: {
          semanticScore: 0.4,
          keywordScore: 0.3,
          profileScore: 0.2,
          overallScore: 0.35,
        },
        matchingEvidence: ["Tem apenas parte da stack pedida."],
      },
    ] satisfies RankingCandidate[]);

    expect(ranked[0].candidate.fullName).toBe("Ana Souza");
    expect(ranked[0].score).toBe(85);
  });
});
