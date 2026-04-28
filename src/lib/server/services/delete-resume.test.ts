import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeStoredResume } from "@/lib/server/adapters/storage";
import { removeResumeVectors } from "@/lib/server/adapters/vector-store";
import { getRepository } from "@/lib/server/repositories";
import { deleteResumeAndAssets } from "@/lib/server/services/delete-resume";

vi.mock("@/lib/server/adapters/storage", () => ({
  removeStoredResume: vi.fn(),
}));

vi.mock("@/lib/server/adapters/vector-store", () => ({
  removeResumeVectors: vi.fn(),
}));

vi.mock("@/lib/server/repositories", () => ({
  getRepository: vi.fn(),
}));

describe("deleteResumeAndAssets", () => {
  const mockedGetRepository = vi.mocked(getRepository);
  const mockedRemoveResumeVectors = vi.mocked(removeResumeVectors);
  const mockedRemoveStoredResume = vi.mocked(removeStoredResume);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the resume does not exist", async () => {
    mockedGetRepository.mockReturnValue({
      getResume: vi.fn().mockResolvedValue(null),
      deleteResume: vi.fn(),
    } as never);

    await expect(deleteResumeAndAssets("missing-id")).resolves.toBe(false);
    expect(mockedRemoveResumeVectors).not.toHaveBeenCalled();
    expect(mockedRemoveStoredResume).not.toHaveBeenCalled();
  });

  it("deletes the database record even when asset cleanup fails", async () => {
    const deleteResume = vi.fn().mockResolvedValue(null);

    mockedGetRepository.mockReturnValue({
      getResume: vi.fn().mockResolvedValue({
        resume: {
          id: "resume-1",
          storageKey: "resumes/resume-1.pdf",
          downloadUrl: "https://blob.example/resume-1.pdf",
        },
      }),
      deleteResume,
    } as never);
    mockedRemoveResumeVectors.mockRejectedValue(new Error("qdrant offline"));
    mockedRemoveStoredResume.mockRejectedValue(new Error("blob not found"));

    await expect(deleteResumeAndAssets("resume-1")).resolves.toBe(true);

    expect(deleteResume).toHaveBeenCalledWith("resume-1");
    expect(mockedRemoveResumeVectors).toHaveBeenCalledWith("resume-1");
    expect(mockedRemoveStoredResume).toHaveBeenCalledWith(
      "resumes/resume-1.pdf",
      "https://blob.example/resume-1.pdf",
    );
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
