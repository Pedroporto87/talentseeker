import { getRepository } from "@/lib/server/repositories";

export const CACHE_TAGS = {
  dashboard: "dashboard",
  jobs: "jobs",
  resumes: "resumes",
  matches: "matches",
  pipelineHistory: "pipeline-history",
} as const;

export function invalidateTags(tags: string[]) {
  void tags;
  // Cache de dados desativado para refletir o banco imediatamente na interface.
}

export async function getDashboardSnapshotCached() {
  return getRepository().getDashboardSnapshot();
}

export async function listJobsCached() {
  return getRepository().listJobs();
}

export async function listJobsPreviewCached(limit = 4) {
  return getRepository().listJobs(limit);
}

export async function getJobCached(jobId: string) {
  if (!jobId) {
    return null;
  }

  return getRepository().getJob(jobId);
}

export async function listResumesCached() {
  return getRepository().listResumes();
}

export async function listMatchesCached(jobId: string | null | undefined) {
  if (!jobId) {
    return [];
  }

  return getRepository().listMatches(jobId);
}

export async function listPipelineHistoryCached(jobId: string | null | undefined) {
  if (!jobId) {
    return [];
  }

  return getRepository().listPipelineHistory(jobId);
}
