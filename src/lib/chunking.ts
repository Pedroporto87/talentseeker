import type { ChunkedText } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

type ChunkOptions = {
  maxTokens?: number;
  overlapTokens?: number;
};

export function chunkText(
  input: string,
  options: ChunkOptions = {},
): ChunkedText[] {
  const maxTokens = options.maxTokens ?? 500;
  const overlapTokens = options.overlapTokens ?? 100;
  const normalized = normalizeText(input);

  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const chunks: ChunkedText[] = [];
  let cursor = 0;

  while (cursor < words.length) {
    const end = Math.min(words.length, cursor + maxTokens);
    const slice = words.slice(cursor, end);
    chunks.push({
      chunkIndex: chunks.length,
      content: slice.join(" "),
      tokenCount: slice.length,
    });

    if (end === words.length) {
      break;
    }

    cursor = Math.max(end - overlapTokens, cursor + 1);
  }

  return chunks;
}
