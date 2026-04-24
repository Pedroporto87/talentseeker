import { NextResponse } from "next/server";
import { ACCEPTED_RESUME_TYPES } from "@/lib/constants";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { createFileHash, storeResumeFile } from "@/lib/server/adapters/storage";
import { getRepository } from "@/lib/server/repositories";
import { ingestResume } from "@/lib/server/services/ingest-resume";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let createdResumeId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie um arquivo PDF ou DOCX." },
        { status: 400 },
      );
    }

    const byMime = ACCEPTED_RESUME_TYPES.includes(
      file.type as (typeof ACCEPTED_RESUME_TYPES)[number],
    );
    const byExtension =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".docx");

    if (!byMime && !byExtension) {
      return NextResponse.json(
        { error: "Formato invalido. Use apenas PDF com texto ou DOCX." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createFileHash(buffer);
    const storedFile = await storeResumeFile({
      buffer,
      fileName: file.name,
      contentType: file.type,
    });
    const repository = getRepository();
    const created = await repository.createResume({
      fileName: file.name,
      mimeType: file.type,
      fileHash,
      storageKey: storedFile.storageKey,
      downloadUrl: storedFile.downloadUrl,
    });
    createdResumeId = created.resume.id;

    console.log("[api/resumes/upload] created", {
      resumeId: created.resume.id,
      fileName: file.name,
    });

    await ingestResume(created.resume.id);

    invalidateTags([CACHE_TAGS.dashboard, CACHE_TAGS.resumes]);
    const refreshed = await repository.getResume(created.resume.id);

    console.log("[api/resumes/upload] completed", {
      resumeId: created.resume.id,
      status: refreshed?.resume.status ?? created.resume.status,
    });

    return NextResponse.json(refreshed ?? created, { status: 201 });
  } catch (error) {
    const repository = getRepository();
    const refreshed = createdResumeId
      ? await repository.getResume(createdResumeId).catch(() => null)
      : null;

    if (createdResumeId) {
      invalidateTags([CACHE_TAGS.dashboard, CACHE_TAGS.resumes]);
    }

    console.error("[api/resumes/upload] failed", {
      resumeId: createdResumeId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao receber curriculo.",
        resume: refreshed?.resume ?? null,
      },
      { status: 500 },
    );
  }
}
