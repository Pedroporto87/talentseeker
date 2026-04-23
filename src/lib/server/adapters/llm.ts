import Groq from "groq-sdk";
import { KNOWN_SKILLS } from "@/lib/constants";
import { rerankFallback } from "@/lib/matching";
import { getServerEnv, isGroqConfigured } from "@/lib/server/env";
import type {
  ExtractedCandidateProfile,
  JobRecord,
  RankingCandidate,
  RerankedCandidate,
} from "@/lib/types";
import { normalizeKeyword, toTitleCase, uniqueStrings } from "@/lib/utils";

declare global {
  var __resumeGroqClient: Groq | undefined;
}

function getGroqClient() {
  if (!globalThis.__resumeGroqClient) {
    globalThis.__resumeGroqClient = new Groq({
      apiKey: getServerEnv().groqApiKey,
    });
  }

  return globalThis.__resumeGroqClient;
}

function extractByHeuristics(text: string): ExtractedCandidateProfile {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines.find((line) => /^[A-Za-zÀ-ÿ\s]{5,60}$/.test(line)) ?? "";
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const yearsMatch = [...text.matchAll(/(\d+)\s*\+?\s*(anos?|years?)/gi)]
    .map((match) => Number(match[1]))
    .sort((left, right) => right - left)[0];
  const normalized = normalizeKeyword(text);
  const skills = KNOWN_SKILLS.filter((skill) =>
    normalized.includes(normalizeKeyword(skill)),
  );
  const summary = text.replace(/\s+/g, " ").slice(0, 300) || null;
  const nameFromEmail = emailMatch?.[0]
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  return {
    fullName: toTitleCase(firstLine || nameFromEmail || "Candidato sem nome"),
    email: emailMatch?.[0]?.toLowerCase() ?? null,
    skills: uniqueStrings(skills.map((skill) => skill.toString())),
    yearsExperience: Number.isFinite(yearsMatch) ? yearsMatch : null,
    currentRole:
      lines.find((line) =>
        /(desenvolvedor|developer|engineer|analista|designer|product|devops)/i.test(
          line,
        ),
      ) ?? null,
    location:
      lines.find((line) =>
        /(são paulo|rio de janeiro|belo horizonte|recife|porto alegre|curitiba|remote|remoto)/i.test(
          line,
        ),
      ) ?? null,
    summary,
  };
}

function extractJsonBlock<T>(content: string): T | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function extractArrayBlock<T>(content: string): T[] | null {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1)) as T[];
  } catch {
    return null;
  }
}

export async function extractCandidateProfile(text: string) {
  const fallback = extractByHeuristics(text);

  if (!isGroqConfigured()) {
    return fallback;
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: getServerEnv().groqModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Extraia um perfil de currículo e responda apenas JSON válido com: fullName, email, skills, yearsExperience, currentRole, location, summary.",
        },
        {
          role: "user",
          content: text.slice(0, 12000),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonBlock<Partial<ExtractedCandidateProfile>>(content);

    if (!parsed) {
      return fallback;
    }

    return {
      fullName: parsed.fullName?.trim() || fallback.fullName,
      email: parsed.email?.trim() || fallback.email,
      skills: uniqueStrings(parsed.skills ?? fallback.skills),
      yearsExperience: parsed.yearsExperience ?? fallback.yearsExperience,
      currentRole: parsed.currentRole?.trim() || fallback.currentRole,
      location: parsed.location?.trim() || fallback.location,
      summary: parsed.summary?.trim() || fallback.summary,
    } satisfies ExtractedCandidateProfile;
  } catch {
    return fallback;
  }
}

export async function rerankWithGroq(params: {
  job: JobRecord;
  candidates: RankingCandidate[];
}): Promise<RerankedCandidate[]> {
  const fallback = rerankFallback(params.candidates);

  if (!isGroqConfigured() || params.candidates.length === 0) {
    return fallback;
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: getServerEnv().groqModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você é um analista de recrutamento. Ordene os candidatos mais aderentes para a vaga. Responda apenas JSON válido em array com objetos { candidateId, score, justification }. score deve estar entre 0 e 100.",
        },
        {
          role: "user",
          content: JSON.stringify({
            job: {
              title: params.job.title,
              description: params.job.description,
              keywords: params.job.keywords,
            },
            candidates: params.candidates.map((candidate) => ({
              candidateId: candidate.candidate.id,
              fullName: candidate.candidate.fullName,
              currentRole: candidate.candidate.currentRole,
              yearsExperience: candidate.candidate.yearsExperience,
              skills: candidate.candidate.skills,
              summary: candidate.candidate.summary,
              score: Math.round(candidate.hybridScore.overallScore * 100),
              evidence: candidate.matchingEvidence,
            })),
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractArrayBlock<{
      candidateId: string;
      score: number;
      justification: string;
    }>(content);

    if (!parsed) {
      return fallback;
    }

    const map = new Map(parsed.map((item) => [item.candidateId, item]));
    return params.candidates
      .filter((candidate) => map.has(candidate.candidate.id))
      .map((candidate) => {
        const item = map.get(candidate.candidate.id)!;
        return {
          ...candidate,
          score: Math.max(0, Math.min(100, Math.round(item.score))),
          justification:
            item.justification?.trim() ||
            candidate.matchingEvidence[0] ||
            "Boa aderência entre a vaga e o currículo.",
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  } catch {
    return fallback;
  }
}
