import { revalidateTag, unstable_cache } from "next/cache";
import { getRepository } from "@/lib/server/repositories";

export const CACHE_TAGS = {
  dashboard: "dashboard",
  jobs: "jobs",
  resumes: "resumes",
  matches: "matches",
  pipelineHistory: "pipeline-history",
} as const;

export function invalidateTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
}

export const getDashboardSnapshotCached = unstable_cache(
  async () => getRepository().getDashboardSnapshot(),
  [CACHE_TAGS.dashboard],
  { tags: [CACHE_TAGS.dashboard], revalidate: 30 },
);

export const listJobsCached = unstable_cache(
  async () => getRepository().listJobs(),
  [CACHE_TAGS.jobs],
  { tags: [CACHE_TAGS.jobs], revalidate: 60 },
);

export const listJobsPreviewCached = unstable_cache(
  async (limit = 4) => getRepository().listJobs(limit),
  [`${CACHE_TAGS.jobs}:preview`],
  { tags: [CACHE_TAGS.jobs], revalidate: 60 },
);

export const listJobOptionsCached = unstable_cache(
  async () => getRepository().listJobOptions(),
  [`${CACHE_TAGS.jobs}:options`],
  { tags: [CACHE_TAGS.jobs], revalidate: 60 },
);

export const getJobCached = unstable_cache(async (jobId: string) => {
  if (!jobId) {
    return null;
  }

  return getRepository().getJob(jobId);
}, [`${CACHE_TAGS.jobs}:detail`], {
  tags: [CACHE_TAGS.jobs],
  revalidate: 60,
});

export const listResumesCached = unstable_cache(
  async () => getRepository().listResumes(),
  [CACHE_TAGS.resumes],
  { tags: [CACHE_TAGS.resumes], revalidate: 15 },
);

export const listMatchesCached = unstable_cache(async (jobId: string | null | undefined) => {
  if (!jobId) {
    return [];
  }

  return getRepository().listMatches(jobId);
}, [CACHE_TAGS.matches], {
  tags: [CACHE_TAGS.matches],
  revalidate: 30,
});

export const listPipelineHistoryCached = unstable_cache(async (
  jobId: string | null | undefined,
) => {
  if (!jobId) {
    return [];
  }

  return getRepository().listPipelineHistory(jobId);
}, [CACHE_TAGS.pipelineHistory], {
  tags: [CACHE_TAGS.pipelineHistory],
  revalidate: 30,
});
