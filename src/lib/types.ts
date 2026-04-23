export const RESUME_STATUSES = [
  "uploaded",
  "parsing",
  "indexed",
  "failed",
  "needs_review",
] as const;

export type ResumeIngestStatus = (typeof RESUME_STATUSES)[number];

export const PIPELINE_STAGES = [
  "aderente",
  "triagem",
  "entrevista_inicial",
  "entrevista_tecnica",
  "contratado",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type CandidateProfile = {
  id: string;
  fullName: string;
  email: string | null;
  skills: string[];
  yearsExperience: number | null;
  currentRole: string | null;
  location: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResumeRecord = {
  id: string;
  candidateId: string | null;
  fileName: string;
  mimeType: string;
  fileHash: string;
  storageKey: string;
  downloadUrl: string;
  status: ResumeIngestStatus;
  extractedText: string | null;
  ingestError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResumeChunkRecord = {
  id: string;
  resumeId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  createdAt: string;
};

export type IngestJobRecord = {
  id: string;
  resumeId: string;
  status: ResumeIngestStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobRecord = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
};

export type MatchResultRecord = {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string;
  overallScore: number;
  semanticScore: number;
  keywordScore: number;
  profileScore: number;
  justification: string;
  stage: PipelineStage;
  createdAt: string;
  updatedAt: string;
};

export type PipelineStageHistoryRecord = {
  id: string;
  jobId: string;
  candidateId: string;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  changedAt: string;
};

export type JobInput = {
  title: string;
  description: string;
  keywords: string[];
};

export type DashboardSnapshot = {
  totalResumes: number;
  activeJobs: number;
  processedResumes: number;
  candidatesByStage: Record<PipelineStage, number>;
};

export type MatchCandidateView = {
  candidate: CandidateProfile;
  resume: ResumeRecord;
  result: MatchResultRecord;
};

export type PipelineBoard = Record<PipelineStage, MatchCandidateView[]>;

export type ExtractedCandidateProfile = {
  fullName: string;
  email: string | null;
  skills: string[];
  yearsExperience: number | null;
  currentRole: string | null;
  location: string | null;
  summary: string | null;
};

export type ChunkedText = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
};

export type SearchHit = {
  id: string;
  score: number;
  payload: {
    resumeId: string;
    candidateId?: string | null;
    content: string;
    chunkIndex: number;
  };
};

export type HybridScore = {
  semanticScore: number;
  keywordScore: number;
  profileScore: number;
  overallScore: number;
};

export type RankingCandidate = {
  candidate: CandidateProfile;
  resume: ResumeRecord;
  hybridScore: HybridScore;
  matchingEvidence: string[];
};

export type RerankedCandidate = RankingCandidate & {
  score: number;
  justification: string;
};
