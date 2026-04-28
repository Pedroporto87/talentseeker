import { describe, expect, it } from "vitest";
import { sanitizeStorageFileName } from "@/lib/server/adapters/storage";

describe("sanitizeStorageFileName", () => {
  it("keeps the extension and removes accents and unsafe characters", () => {
    expect(sanitizeStorageFileName("Curriculo João da Silva #2026.pdf")).toBe(
      "Curriculo-Joao-da-Silva-2026.pdf",
    );
  });

  it("falls back to a safe base name", () => {
    expect(sanitizeStorageFileName("💼.docx")).toBe("curriculo.docx");
  });
});
