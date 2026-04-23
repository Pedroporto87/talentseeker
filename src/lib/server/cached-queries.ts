import { revalidateTag, unstable_cache } from "next/cache";
import { getRepository } from "@/lib/server/repositories";

export const CACHE_TAGS = {
  dashboard: "dashboard",
  jobs: "jobs",
  resumes: "resumes",
  matches: "matches",
  pipelineHistory: "pipeline-history",
} as const;

const CACHE_WINDOWS = {
  dashboard: 5,
  jobs: 30,
  matches: 10,
  pipelineHistory: 10,
} as const;

export function invalidateTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}

export async function getDashboardSnapshotCached() {
  return unstable_cache(
    async () => getRepository().getDashboardSnapshot(),
    ["dashboard-snapshot"],
    {
      revalidate: CACHE_WINDOWS.dashboard,
      tags: [CACHE_TAGS.dashboard],
    },
  )();
}

export async function listJobsCached() {
  return unstable_cache(async () => getRepository().listJobs(), ["jobs-list"], {
    revalidate: CACHE_WINDOWS.jobs,
    tags: [CACHE_TAGS.jobs],
  })();
}

export async function getJobCached(jobId: string) {
  if (!jobId) {
    return null;
  }

  return unstable_cache(async () => getRepository().getJob(jobId), ["job", jobId], {
    revalidate: CACHE_WINDOWS.jobs,
    tags: [CACHE_TAGS.jobs, `${CACHE_TAGS.jobs}:${jobId}`],
  })();
}

export async function listResumesCached() {
  return unstable_cache(async () => getRepository().listResumes(), ["resumes-list"], {
    revalidate: CACHE_WINDOWS.matches,
    tags: [CACHE_TAGS.resumes],
  })();
}

export async function listMatchesCached(jobId: string | null | undefined) {
  if (!jobId) {
    return [];
  }

  return unstable_cache(
    async () => getRepository().listMatches(jobId),
    ["matches", jobId],
    {
      revalidate: CACHE_WINDOWS.matches,
      tags: [CACHE_TAGS.matches, `${CACHE_TAGS.matches}:${jobId}`],
    },
  )();
}

export async function listPipelineHistoryCached(jobId: string | null | undefined) {
  if (!jobId) {
    return [];
  }

  return unstable_cache(
    async () => getRepository().listPipelineHistory(jobId),
    ["pipeline-history", jobId],
    {
      revalidate: CACHE_WINDOWS.pipelineHistory,
      tags: [
        CACHE_TAGS.pipelineHistory,
        `${CACHE_TAGS.pipelineHistory}:${jobId}`,
      ],
    },
  )();
}
