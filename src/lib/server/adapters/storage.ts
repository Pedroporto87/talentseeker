import { del, get, put } from "@vercel/blob";
import { createHash } from "crypto";
import { getServerEnv, isBlobConfigured } from "@/lib/server/env";

type MemoryFile = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

declare global {
  var __resumeMemoryFiles: Map<string, MemoryFile> | undefined;
}

function getMemoryFiles() {
  if (!globalThis.__resumeMemoryFiles) {
    globalThis.__resumeMemoryFiles = new Map<string, MemoryFile>();
  }

  return globalThis.__resumeMemoryFiles;
}

export function createFileHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.toLowerCase().match(/\.(pdf|docx)$/);
  const extension = extensionMatch?.[0] ?? "";
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const safeBaseName =
    baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "curriculo";

  return `${safeBaseName}${extension}`;
}

export async function storeResumeFile(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}) {
  const storageKey = `resumes/${crypto.randomUUID()}-${sanitizeStorageFileName(
    params.fileName,
  )}`;

  if (isBlobConfigured()) {
    const env = getServerEnv();
    const blob = await put(storageKey, params.buffer, {
      access: env.blobAccess,
      contentType: params.contentType,
      addRandomSuffix: false,
    });

    return {
      storageKey: blob.pathname,
      downloadUrl: blob.downloadUrl,
    };
  }

  getMemoryFiles().set(storageKey, {
    buffer: params.buffer,
    contentType: params.contentType,
    fileName: params.fileName,
  });

  return {
    storageKey,
    downloadUrl: `memory://${storageKey}`,
  };
}

export async function readStoredResume(storageKey: string, downloadUrl: string) {
  if (downloadUrl.startsWith("memory://")) {
    const memoryFile = getMemoryFiles().get(storageKey);

    if (!memoryFile) {
      throw new Error("Arquivo em memória não encontrado.");
    }

    return memoryFile.buffer;
  }

  const env = getServerEnv();
  const blob = await get(storageKey, {
    access: env.blobAccess,
    useCache: false,
  });

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    throw new Error("Não foi possível baixar o arquivo armazenado.");
  }

  return Buffer.from(await new Response(blob.stream).arrayBuffer());
}

export async function removeStoredResume(storageKey: string, downloadUrl: string) {
  if (downloadUrl.startsWith("memory://")) {
    getMemoryFiles().delete(storageKey);
    return;
  }

  await del(storageKey);
}
