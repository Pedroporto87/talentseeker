import type {
  CandidateProfile,
  DashboardSnapshot,
  IngestJobRecord,
  JobInput,
  JobRecord,
  MatchCandidateView,
  PipelineStage,
  PipelineStageHistoryRecord,
  ResumeChunkRecord,
  ResumeRecord,
} from "@/lib/types";

export type ResumeWithCandidate = {
  resume: ResumeRecord;
  candidate: CandidateProfile | null;
  ingestJob: IngestJobRecord | null;
};

export type MatchResultInsert = {
  candidateId: string;
  resumeId: string;
  overallScore: number;
  semanticScore: number;
  keywordScore: number;
  profileScore: number;
  justification: string;
  stage: PipelineStage;
};

export type CandidateProfileInput = {
  fullName: string;
  email: string | null;
  skills: string[];
  yearsExperience: number | null;
  currentRole: string | null;
  location: string | null;
  summary: string | null;
};

export type AppRepository = {
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  listJobs(limit?: number): Promise<JobRecord[]>;
  getJob(id: string): Promise<JobRecord | null>;
  createJob(input: JobInput): Promise<JobRecord>;
  updateJob(id: string, input: JobInput): Promise<JobRecord | null>;
  deleteJob(id: string): Promise<void>;
  listResumes(): Promise<ResumeWithCandidate[]>;
  getResume(id: string): Promise<ResumeWithCandidate | null>;
  createResume(input: {
    fileName: string;
    mimeType: string;
    fileHash: string;
    storageKey: string;
    downloadUrl: string;
  }): Promise<ResumeWithCandidate>;
  deleteResume(id: string): Promise<ResumeRecord | null>;
  updateResume(
    id: string,
    patch: Partial<
      Pick<
        ResumeRecord,
        "candidateId" | "status" | "extractedText" | "ingestError"
      >
    >,
  ): Promise<ResumeRecord | null>;
  findResumeByFileHash(fileHash: string): Promise<ResumeRecord | null>;
  getLatestIngestJobForResume(resumeId: string): Promise<IngestJobRecord | null>;
  updateIngestJob(
    id: string,
    patch: Partial<Pick<IngestJobRecord, "status" | "errorMessage">>,
  ): Promise<IngestJobRecord | null>;
  findCandidateByIdentity(params: {
    fullName: string;
    email: string | null;
  }): Promise<CandidateProfile | null>;
  upsertCandidateProfile(
    input: CandidateProfileInput,
    existingId?: string,
  ): Promise<CandidateProfile>;
  replaceResumeChunks(
    resumeId: string,
    chunks: Array<{
      content: string;
      tokenCount: number;
      chunkIndex: number;
    }>,
  ): Promise<ResumeChunkRecord[]>;
  listResumeChunks(resumeId: string): Promise<ResumeChunkRecord[]>;
  getCandidate(id: string): Promise<CandidateProfile | null>;
  replaceMatchResults(
    jobId: string,
    results: MatchResultInsert[],
  ): Promise<MatchCandidateView[]>;
  listMatches(jobId: string): Promise<MatchCandidateView[]>;
  updateCandidateStage(
    jobId: string,
    candidateId: string,
    stage: PipelineStage,
  ): Promise<MatchCandidateView | null>;
  listPipelineHistory(jobId: string): Promise<PipelineStageHistoryRecord[]>;
};
