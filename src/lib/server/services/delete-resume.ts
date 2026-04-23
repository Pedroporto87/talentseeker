import { removeStoredResume } from "@/lib/server/adapters/storage";
import { removeResumeVectors } from "@/lib/server/adapters/vector-store";
import { getRepository } from "@/lib/server/repositories";

export async function deleteResumeAndAssets(resumeId: string) {
  const repository = getRepository();
  const bundle = await repository.getResume(resumeId);

  if (!bundle) {
    return false;
  }

  await removeResumeVectors(resumeId);
  await removeStoredResume(bundle.resume.storageKey, bundle.resume.downloadUrl);
  await repository.deleteResume(resumeId);

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
