import type { ChunkedText } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

type ChunkOptions = {
  maxTokens?: number;
  overlapTokens?: number;
};

const SECTION_HEADING_PATTERN =
  /^(resumo|objetivo|experi[eê]ncia|experi[eê]ncia profissional|hist[oó]rico profissional|forma[cç][aã]o|educa[cç][aã]o|compet[eê]ncias|habilidades|skills|tecnologias|projetos|certifica[cç][oõ]es|idiomas|contato)\b[:\s-]*$/i;

function splitIntoSections(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (SECTION_HEADING_PATTERN.test(line) && current.length > 0) {
      sections.push(current.join(" "));
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join(" "));
  }

  return sections
    .map((section) => normalizeText(section))
    .filter((section) => section.split(" ").length >= 5);
}

function chunkWords(
  words: string[],
  startIndex: number,
  maxTokens: number,
  overlapTokens: number,
) {
  const chunks: ChunkedText[] = [];
  let cursor = 0;

  while (cursor < words.length) {
    const end = Math.min(words.length, cursor + maxTokens);
    const slice = words.slice(cursor, end);
    chunks.push({
      chunkIndex: startIndex + chunks.length,
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

  const sections = splitIntoSections(input);
  if (sections.length > 1) {
    const sectionChunks = sections.flatMap((section, sectionIndex) => {
      const prefix = sectionIndex > 0 ? sections[sectionIndex - 1].split(" ").slice(-30) : [];
      const words = [...prefix, ...section.split(" ")];
      return chunkWords(words, 0, maxTokens, overlapTokens);
    });

    return sectionChunks.map((chunk, chunkIndex) => ({
      ...chunk,
      chunkIndex,
    }));
  }

  return chunkWords(normalized.split(" "), 0, maxTokens, overlapTokens);
}
