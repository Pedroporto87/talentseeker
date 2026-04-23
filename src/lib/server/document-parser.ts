import "server-only";
import { createRequire } from "node:module";
import mammoth from "mammoth";
import { normalizeText } from "@/lib/utils";

const require = createRequire(import.meta.url);

type PdfParseResult = {
  text?: string;
};

type PdfParseFunction = (buffer: Buffer) => Promise<PdfParseResult>;

let pdfParserPromise: Promise<PdfParseFunction> | null = null;

async function getPdfParse() {
  if (!pdfParserPromise) {
    pdfParserPromise = Promise.resolve()
      .then(() => require("pdf-parse/lib/pdf-parse.js") as PdfParseFunction)
      .catch((error) => {
        pdfParserPromise = null;
        throw error;
      });
  }

  return pdfParserPromise;
}

export async function extractTextFromDocument(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const fileName = params.fileName.toLowerCase();

  if (params.mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const pdfParse = await getPdfParse();
    const result = await pdfParse(params.buffer);
    return normalizeText(result.text ?? "");
  }

  if (
    params.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer: params.buffer });
    return normalizeText(result.value ?? "");
  }

  throw new Error("Formato de arquivo não suportado.");
}
