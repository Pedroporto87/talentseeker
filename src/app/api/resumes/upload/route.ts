import { NextResponse } from "next/server";
import { ACCEPTED_RESUME_TYPES } from "@/lib/constants";
import { createFileHash, storeResumeFile } from "@/lib/server/adapters/storage";
import { shouldUseInngestCloud } from "@/lib/server/env";
import { inngest } from "@/lib/server/inngest";
import { getRepository } from "@/lib/server/repositories";
import { ingestResume } from "@/lib/server/services/ingest-resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
        { error: "Formato inválido. Use apenas PDF com texto ou DOCX." },
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

    if (shouldUseInngestCloud()) {
      await inngest.send({
        name: "resume/uploaded",
        data: {
          resumeId: created.resume.id,
        },
      });
    } else {
      void ingestResume(created.resume.id).catch((error) => {
        console.error("Erro no processamento local do currículo", error);
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao receber currículo.",
      },
      { status: 500 },
    );
  }
}
