import type {
  CandidateProfile,
  DashboardSnapshot,
  IngestJobRecord,
  JobRecord,
  MatchCandidateView,
  PipelineStageHistoryRecord,
  ResumeChunkRecord,
  ResumeRecord,
} from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import type {
  AppRepository,
  CandidateProfileInput,
  ResumeWithCandidate,
} from "@/lib/server/repositories/types";

type MemoryState = {
  candidates: CandidateProfile[];
  resumes: ResumeRecord[];
  resumeChunks: ResumeChunkRecord[];
  jobs: JobRecord[];
  ingestJobs: IngestJobRecord[];
  matchResults: MatchCandidateView["result"][];
  pipelineHistory: PipelineStageHistoryRecord[];
};

declare global {
  var __resumeMemoryRepoState: MemoryState | undefined;
}

function now() {
  return new Date().toISOString();
}

function normalizeYearsExperience(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function getState() {
  if (!globalThis.__resumeMemoryRepoState) {
    globalThis.__resumeMemoryRepoState = {
      candidates: [],
      resumes: [],
      resumeChunks: [],
      jobs: [],
      ingestJobs: [],
      matchResults: [],
      pipelineHistory: [],
    };
  }

  return globalThis.__resumeMemoryRepoState;
}

function getResumeWithCandidate(resumeId: string): ResumeWithCandidate | null {
  const state = getState();
  const resume = state.resumes.find((item) => item.id === resumeId);

  if (!resume) {
    return null;
  }

  return {
    resume,
    candidate:
      state.candidates.find((item) => item.id === resume.candidateId) ?? null,
    ingestJob:
      [...state.ingestJobs]
        .filter((item) => item.resumeId === resumeId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ??
      null,
  };
}

async function hydrateMatchViews(jobId: string) {
  const state = getState();
  return state.matchResults
    .filter((result) => result.jobId === jobId)
    .map((result) => ({
      result,
      candidate:
        state.candidates.find((candidate) => candidate.id === result.candidateId)!,
      resume: state.resumes.find((resume) => resume.id === result.resumeId)!,
    }))
    .sort((left, right) => right.result.overallScore - left.result.overallScore);
}

export const memoryRepository: AppRepository = {
  async getDashboardSnapshot() {
    const state = getState();
    const candidatesByStage = Object.fromEntries(
      PIPELINE_STAGES.map((stage) => [stage, 0]),
    ) as DashboardSnapshot["candidatesByStage"];

    for (const result of state.matchResults) {
      candidatesByStage[result.stage] += 1;
    }

    return {
      totalResumes: state.resumes.length,
      activeJobs: state.jobs.length,
      processedResumes: state.resumes.filter((resume) => resume.status === "indexed")
        .length,
      candidatesByStage,
    };
  },
  async listJobs() {
    return [...getState().jobs].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  },
  async getJob(id) {
    return getState().jobs.find((job) => job.id === id) ?? null;
  },
  async createJob(input) {
    const record: JobRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      keywords: input.keywords,
      createdAt: now(),
      updatedAt: now(),
    };
    getState().jobs.unshift(record);
    return record;
  },
  async updateJob(id, input) {
    const job = getState().jobs.find((item) => item.id === id);
    if (!job) {
      return null;
    }
    job.title = input.title;
    job.description = input.description;
    job.keywords = input.keywords;
    job.updatedAt = now();
    return job;
  },
  async deleteJob(id) {
    const state = getState();
    state.jobs = state.jobs.filter((job) => job.id !== id);
    state.matchResults = state.matchResults.filter((item) => item.jobId !== id);
    state.pipelineHistory = state.pipelineHistory.filter((item) => item.jobId !== id);
  },
  async listResumes() {
    return getState()
      .resumes.map((resume) => getResumeWithCandidate(resume.id)!)
      .sort((left, right) =>
        right.resume.createdAt.localeCompare(left.resume.createdAt),
      );
  },
  async getResume(id) {
    return getResumeWithCandidate(id);
  },
  async createResume(input) {
    const state = getState();
    const resume: ResumeRecord = {
      id: crypto.randomUUID(),
      candidateId: null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileHash: input.fileHash,
      storageKey: input.storageKey,
      downloadUrl: input.downloadUrl,
      status: "uploaded",
      extractedText: null,
      ingestError: null,
      createdAt: now(),
      updatedAt: now(),
    };
    const ingestJob: IngestJobRecord = {
      id: crypto.randomUUID(),
      resumeId: resume.id,
      status: "uploaded",
      errorMessage: null,
      createdAt: now(),
      updatedAt: now(),
    };

    state.resumes.unshift(resume);
    state.ingestJobs.unshift(ingestJob);
    return getResumeWithCandidate(resume.id)!;
  },
  async deleteResume(id) {
    const state = getState();
    const resume = state.resumes.find((item) => item.id === id) ?? null;
    if (!resume) {
      return null;
    }
    state.resumeChunks = state.resumeChunks.filter((chunk) => chunk.resumeId !== id);
    state.ingestJobs = state.ingestJobs.filter((job) => job.resumeId !== id);
    state.matchResults = state.matchResults.filter((result) => result.resumeId !== id);
    state.resumes = state.resumes.filter((item) => item.id !== id);

    if (resume.candidateId) {
      const candidateStillUsed = state.resumes.some(
        (item) => item.candidateId === resume.candidateId,
      );

      if (!candidateStillUsed) {
        state.candidates = state.candidates.filter(
          (candidate) => candidate.id !== resume.candidateId,
        );
      }
    }

    return resume;
  },
  async updateResume(id, patch) {
    const resume = getState().resumes.find((item) => item.id === id);
    if (!resume) {
      return null;
    }
    Object.assign(resume, patch, { updatedAt: now() });
    return resume;
  },
  async findResumeByFileHash(fileHash) {
    return getState().resumes.find((resume) => resume.fileHash === fileHash) ?? null;
  },
  async getLatestIngestJobForResume(resumeId) {
    return (
      [...getState().ingestJobs]
        .filter((item) => item.resumeId === resumeId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ??
      null
    );
  },
  async updateIngestJob(id, patch) {
    const job = getState().ingestJobs.find((item) => item.id === id);
    if (!job) {
      return null;
    }
    Object.assign(job, patch, { updatedAt: now() });
    return job;
  },
  async findCandidateByIdentity({ fullName, email }) {
    return (
      getState().candidates.find((candidate) => {
        const emailMatches =
          email && candidate.email
            ? candidate.email.toLowerCase() === email.toLowerCase()
            : false;
        const nameMatches =
          candidate.fullName.toLowerCase() === fullName.toLowerCase();
        return email ? emailMatches || nameMatches : nameMatches;
      }) ?? null
    );
  },
  async upsertCandidateProfile(input: CandidateProfileInput, existingId?: string) {
    const state = getState();
    const normalizedInput = {
      ...input,
      yearsExperience: normalizeYearsExperience(input.yearsExperience),
    };
    const candidate = state.candidates.find((item) => item.id === existingId);

    if (candidate) {
      Object.assign(candidate, normalizedInput, { updatedAt: now() });
      return candidate;
    }

    const created: CandidateProfile = {
      id: crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now(),
      ...normalizedInput,
    };
    state.candidates.unshift(created);
    return created;
  },
  async replaceResumeChunks(resumeId, chunks) {
    const state = getState();
    state.resumeChunks = state.resumeChunks.filter((chunk) => chunk.resumeId !== resumeId);
    const created = chunks.map((chunk) => ({
      id: crypto.randomUUID(),
      resumeId,
      createdAt: now(),
      ...chunk,
    }));
    state.resumeChunks.push(...created);
    return created;
  },
  async listResumeChunks(resumeId) {
    return getState()
      .resumeChunks.filter((chunk) => chunk.resumeId === resumeId)
      .sort((left, right) => left.chunkIndex - right.chunkIndex);
  },
  async getCandidate(id) {
    return getState().candidates.find((candidate) => candidate.id === id) ?? null;
  },
  async replaceMatchResults(jobId, results) {
    const state = getState();
    state.matchResults = state.matchResults.filter((result) => result.jobId !== jobId);
    state.pipelineHistory = state.pipelineHistory.filter((item) => item.jobId !== jobId);

    const created = results.map((result) => ({
      id: crypto.randomUUID(),
      jobId,
      createdAt: now(),
      updatedAt: now(),
      ...result,
    }));

    state.matchResults.push(...created);
    state.pipelineHistory.push(
      ...created.map((result) => ({
        id: crypto.randomUUID(),
        jobId,
        candidateId: result.candidateId,
        fromStage: null,
        toStage: result.stage,
        changedAt: now(),
      })),
    );

    return hydrateMatchViews(jobId);
  },
  async listMatches(jobId) {
    return hydrateMatchViews(jobId);
  },
  async updateCandidateStage(jobId, candidateId, stage) {
    const state = getState();
    const result = state.matchResults.find(
      (item) => item.jobId === jobId && item.candidateId === candidateId,
    );

    if (!result) {
      return null;
    }

    const previousStage = result.stage;
    result.stage = stage;
    result.updatedAt = now();
    state.pipelineHistory.unshift({
      id: crypto.randomUUID(),
      jobId,
      candidateId,
      fromStage: previousStage,
      toStage: stage,
      changedAt: now(),
    });

    return (await hydrateMatchViews(jobId)).find(
      (item) => item.result.candidateId === candidateId,
    )!;
  },
  async listPipelineHistory(jobId) {
    return getState()
      .pipelineHistory.filter((item) => item.jobId === jobId)
      .sort((left, right) => right.changedAt.localeCompare(left.changedAt));
  },
};
