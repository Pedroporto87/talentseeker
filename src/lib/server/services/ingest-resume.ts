import { chunkText } from "@/lib/chunking";
import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import { extractCandidateProfile } from "@/lib/server/adapters/llm";
import {
  readStoredResume,
  removeStoredResume,
} from "@/lib/server/adapters/storage";
import {
  removeResumeVectors,
  upsertResumeVectors,
} from "@/lib/server/adapters/vector-store";
import { extractTextFromDocument } from "@/lib/server/document-parser";
import { isQdrantCloudInferenceConfigured } from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";

export async function ingestResume(resumeId: string) {
  const repository = getRepository();
  const bundle = await repository.getResume(resumeId);

  if (!bundle) {
    throw new Error("Currículo não encontrado.");
  }

  const ingestJob = bundle.ingestJob;

  if (!ingestJob) {
    throw new Error("Job de ingestão não encontrado.");
  }

  await repository.updateResume(resumeId, {
    status: "parsing",
    ingestError: null,
  });
  await repository.updateIngestJob(ingestJob.id, {
    status: "parsing",
    errorMessage: null,
  });

  const duplicate = await repository.findResumeByFileHash(bundle.resume.fileHash);
  if (duplicate && duplicate.id !== resumeId && duplicate.status === "indexed") {
    const message =
      "Este curriculo ja foi cadastrado anteriormente. Remova a versao existente antes de reenviar o mesmo arquivo.";
    await repository.updateResume(resumeId, {
      status: "failed",
      ingestError: message,
    });
    await repository.updateIngestJob(ingestJob.id, {
      status: "failed",
      errorMessage: message,
    });
    await removeStoredResume(bundle.resume.storageKey, bundle.resume.downloadUrl);
    return;
  }

  try {
    const buffer = await readStoredResume(
      bundle.resume.storageKey,
      bundle.resume.downloadUrl,
    );
    const extractedText = await extractTextFromDocument({
      buffer,
      mimeType: bundle.resume.mimeType,
      fileName: bundle.resume.fileName,
    });

    if (!extractedText || extractedText.length < 80) {
      await repository.updateResume(resumeId, {
        status: "needs_review",
        ingestError:
          "Não foi possível extrair texto suficiente. Verifique se o PDF possui camada de texto.",
        extractedText,
      });
      await repository.updateIngestJob(ingestJob.id, {
        status: "needs_review",
        errorMessage:
          "Currículo exige revisão manual por falta de texto utilizável.",
      });
      return;
    }

    const extractedProfile = await extractCandidateProfile(extractedText);
    const existingCandidate = await repository.findCandidateByIdentity({
      fullName: extractedProfile.fullName,
      email: extractedProfile.email,
    });
    const candidate = await repository.upsertCandidateProfile(
      extractedProfile,
      existingCandidate?.id,
    );

    await repository.updateResume(resumeId, {
      candidateId: candidate.id,
      extractedText,
      status: "parsing",
      ingestError: null,
    });

    const chunks = chunkText(extractedText, {
      maxTokens: 500,
      overlapTokens: 100,
    });
    const storedChunks = await repository.replaceResumeChunks(resumeId, chunks);
    await removeResumeVectors(resumeId);

    const embeddedChunks = [];
    for (const chunk of storedChunks) {
      embeddedChunks.push({
        id: chunk.id,
        vector: isQdrantCloudInferenceConfigured()
          ? createQdrantDocument(chunk.content)
          : await createEmbedding(chunk.content),
        payload: {
          resumeId,
          candidateId: candidate.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
        },
      });
    }

    await upsertResumeVectors(embeddedChunks);
    await repository.updateResume(resumeId, {
      status: "indexed",
      extractedText,
      candidateId: candidate.id,
      ingestError: null,
    });
    await repository.updateIngestJob(ingestJob.id, {
      status: "indexed",
      errorMessage: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha inesperada na ingestão.";
    await repository.updateResume(resumeId, {
      status: "failed",
      ingestError: message,
    });
    await repository.updateIngestJob(ingestJob.id, {
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}
