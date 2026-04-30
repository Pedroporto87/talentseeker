import { NextResponse } from "next/server";
import { ACCEPTED_RESUME_TYPES } from "@/lib/constants";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { createFileHash, storeResumeFile } from "@/lib/server/adapters/storage";
import { getRepository } from "@/lib/server/repositories";
import { enqueueResumeIngest } from "@/lib/server/services/enqueue-resume-ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

function getResumeContentType(file: File) {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return "application/pdf";
  }

  if (file.name.toLowerCase().endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return file.type;
}

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
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "O arquivo enviado esta vazio." },
        { status: 400 },
      );
    }

    const contentType = getResumeContentType(file);
    const fileHash = createFileHash(buffer);
    const existing = await getRepository().findIndexedResumeByFileHash(fileHash);

    if (existing?.status === "indexed") {
      return NextResponse.json(
        {
          error:
            "Este curriculo ja foi cadastrado anteriormente. Remova a versao existente antes de reenviar o mesmo arquivo.",
          resume: existing,
        },
        { status: 409 },
      );
    }

    const storedFile = await storeResumeFile({
      buffer,
      fileName: file.name,
      contentType,
    });
    const repository = getRepository();
    const created = await repository.createResume({
      fileName: file.name,
      mimeType: contentType,
      fileHash,
      storageKey: storedFile.storageKey,
      downloadUrl: storedFile.downloadUrl,
    });
    createdResumeId = created.resume.id;

    console.log("[api/resumes/upload] created", {
      resumeId: created.resume.id,
      fileName: file.name,
    });

    invalidateTags([CACHE_TAGS.dashboard, CACHE_TAGS.resumes]);
    enqueueResumeIngest(created.resume.id, {
      hostname: new URL(request.url).hostname,
      buffer,
    });

    console.log("[api/resumes/upload] queued", {
      resumeId: created.resume.id,
      status: created.resume.status,
    });

    return NextResponse.json(created, { status: 201 });
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

    if (createdResumeId && refreshed) {
      return NextResponse.json(refreshed, { status: 201 });
    }

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
