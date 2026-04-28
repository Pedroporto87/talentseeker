import { removeStoredResume } from "@/lib/server/adapters/storage";
import { removeResumeVectors } from "@/lib/server/adapters/vector-store";
import { getRepository } from "@/lib/server/repositories";

function logCleanupWarning(target: "vetores" | "arquivo", resumeId: string, error: unknown) {
  console.warn(`[delete-resume] Falha ao remover ${target} do curriculo ${resumeId}.`, {
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function deleteResumeAndAssets(resumeId: string) {
  const repository = getRepository();
  const bundle = await repository.getResume(resumeId);

  if (!bundle) {
    return false;
  }

  await repository.deleteResume(resumeId);

  const cleanupResults = await Promise.allSettled([
    removeResumeVectors(resumeId),
    removeStoredResume(bundle.resume.storageKey, bundle.resume.downloadUrl),
  ]);

  const [vectorCleanup, storageCleanup] = cleanupResults;

  if (vectorCleanup.status === "rejected") {
    logCleanupWarning("vetores", resumeId, vectorCleanup.reason);
  }

  if (storageCleanup.status === "rejected") {
    logCleanupWarning("arquivo", resumeId, storageCleanup.reason);
  }

  return true;
}

export async function clearResumeLibrary(scope: "all" | "attempts" = "attempts") {
  const repository = getRepository();
  const resumes = await repository.listResumes();
  const targetResumes = resumes.filter(({ resume }) =>
    scope === "all" ? true : resume.status !== "indexed",
  );

  for (const item of targetResumes) {
    await deleteResumeAndAssets(item.resume.id);
  }

  return {
    deletedCount: targetResumes.length,
  };
}
