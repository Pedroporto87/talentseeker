import type { CandidateProfile, HybridScore, RankingCandidate } from "@/lib/types";
import { clamp, normalizeKeyword, summarizeList, uniqueStrings } from "@/lib/utils";

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  "node.js": ["node", "nodejs"],
  nodejs: ["node", "node.js"],
  react: ["react.js", "reactjs"],
  "next.js": ["next", "nextjs"],
  nextjs: ["next", "next.js"],
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
  "ci/cd": ["cicd", "continuous integration", "continuous delivery"],
  kubernetes: ["k8s"],
  "machine learning": ["ml", "aprendizado de maquina"],
};

function parseKeyword(rawKeyword: string) {
  const trimmed = rawKeyword.trim();
  const required =
    trimmed.startsWith("!") || /^obrigat[oó]rio\s*:/i.test(trimmed);
  const value = trimmed
    .replace(/^!+/, "")
    .replace(/^obrigat[oó]rio\s*:/i, "")
    .trim();

  return {
    value,
    required,
  };
}

function expandKeyword(rawKeyword: string) {
  const { value, required } = parseKeyword(rawKeyword);
  const normalized = normalizeKeyword(value);
  const synonyms = KEYWORD_SYNONYMS[normalized] ?? [];

  return {
    value,
    required,
    terms: uniqueStrings([normalized, ...synonyms.map(normalizeKeyword)]),
  };
}

function containsTerm(normalizedHaystack: string, normalizedTerm: string) {
  if (!normalizedTerm) {
    return false;
  }

  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normalizedHaystack);
}

function countKeywordCoverage(haystack: string, keywords: string[]) {
  if (keywords.length === 0) {
    return 0;
  }

  const normalizedHaystack = normalizeKeyword(haystack);
  const expandedKeywords = uniqueStrings(keywords).map(expandKeyword);
  const matches = expandedKeywords.filter((keyword) =>
    keyword.terms.some((term) => containsTerm(normalizedHaystack, term)),
  );

  return matches.length / expandedKeywords.length;
}

function countMissingRequiredKeywords(haystack: string, keywords: string[]) {
  const normalizedHaystack = normalizeKeyword(haystack);
  return uniqueStrings(keywords)
    .map(expandKeyword)
    .filter((keyword) => keyword.required)
    .filter(
      (keyword) =>
        !keyword.terms.some((term) => containsTerm(normalizedHaystack, term)),
    ).length;
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
  const missingRequiredKeywords = countMissingRequiredKeywords(
    params.resumeText,
    params.keywords,
  );
  const rawOverallScore = clamp(
    semanticScore * 0.7 + keywordScore * 0.2 + profileScore * 0.1,
  );
  const overallScore = missingRequiredKeywords
    ? Math.min(rawOverallScore, 0.45)
    : rawOverallScore;

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
    expandKeyword(keyword).terms.some((term) =>
      containsTerm(normalizedResume, term),
    ),
  );
  const missingRequiredKeywords = uniqueStrings(params.keywords)
    .map(expandKeyword)
    .filter((keyword) => keyword.required)
    .filter(
      (keyword) =>
        !keyword.terms.some((term) => containsTerm(normalizedResume, term)),
    )
    .map((keyword) => keyword.value);

  const evidence = [
    matchedKeywords.length
      ? `Cobertura de palavras-chave: ${summarizeList(matchedKeywords)}`
      : null,
    missingRequiredKeywords.length
      ? `Requisitos obrigatorios ausentes: ${summarizeList(missingRequiredKeywords)}`
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

export function aggregateSemanticScore(scores: number[]) {
  const normalizedScores = scores
    .filter((score) => Number.isFinite(score))
    .map((score) => clamp(score))
    .sort((left, right) => right - left);

  if (normalizedScores.length === 0) {
    return 0;
  }

  const topScores = normalizedScores.slice(0, 3);
  const best = topScores[0];
  const averageTopScores =
    topScores.reduce((sum, score) => sum + score, 0) / topScores.length;

  return clamp(best * 0.75 + averageTopScores * 0.25);
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
