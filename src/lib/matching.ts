import type { CandidateProfile, HybridScore, RankingCandidate } from "@/lib/types";
import { clamp, normalizeKeyword, summarizeList, uniqueStrings } from "@/lib/utils";

function countKeywordCoverage(haystack: string, keywords: string[]) {
  if (keywords.length === 0) {
    return 0;
  }

  const normalizedHaystack = normalizeKeyword(haystack);
  const matches = uniqueStrings(keywords).filter((keyword) =>
    normalizedHaystack.includes(normalizeKeyword(keyword)),
  );

  return matches.length / uniqueStrings(keywords).length;
}

function estimateProfileSignals(candidate: CandidateProfile, keywords: string[]) {
  const profileText = [
    candidate.currentRole,
    candidate.location,
    candidate.summary,
    candidate.skills.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const keywordCoverage = countKeywordCoverage(profileText, keywords);
  const experienceBoost = candidate.yearsExperience
    ? clamp(candidate.yearsExperience / 10)
    : 0.2;

  return clamp(keywordCoverage * 0.7 + experienceBoost * 0.3);
}

export function calculateHybridScore(params: {
  semanticScore: number;
  candidate: CandidateProfile;
  keywords: string[];
  resumeText: string;
}): HybridScore {
  const semanticScore = clamp(params.semanticScore);
  const keywordScore = countKeywordCoverage(params.resumeText, params.keywords);
  const profileScore = estimateProfileSignals(params.candidate, params.keywords);
  const overallScore = clamp(
    semanticScore * 0.7 + keywordScore * 0.2 + profileScore * 0.1,
  );

  return {
    semanticScore,
    keywordScore,
    profileScore,
    overallScore,
  };
}

export function buildEvidence(params: {
  candidate: CandidateProfile;
  keywords: string[];
  resumeText: string;
}) {
  const normalizedResume = normalizeKeyword(params.resumeText);
  const matchedKeywords = uniqueStrings(params.keywords).filter((keyword) =>
    normalizedResume.includes(normalizeKeyword(keyword)),
  );

  const evidence = [
    matchedKeywords.length
      ? `Cobertura de palavras-chave: ${summarizeList(matchedKeywords)}`
      : null,
    params.candidate.yearsExperience
      ? `${params.candidate.yearsExperience} anos de experiência identificados`
      : null,
    params.candidate.currentRole
      ? `Última função: ${params.candidate.currentRole}`
      : null,
    params.candidate.skills.length
      ? `Skills detectadas: ${summarizeList(params.candidate.skills)}`
      : null,
  ].filter(Boolean) as string[];

  return evidence.slice(0, 3);
}

export function rerankFallback(candidates: RankingCandidate[]) {
  return [...candidates]
    .sort((left, right) => right.hybridScore.overallScore - left.hybridScore.overallScore)
    .slice(0, 5)
    .map((candidate) => ({
      ...candidate,
      score: Math.round(candidate.hybridScore.overallScore * 100),
      justification:
        candidate.matchingEvidence[0] ??
        "Boa aderência semântica entre a vaga e a experiência do candidato.",
    }));
}
