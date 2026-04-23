import { chunkText } from "@/lib/chunking";

describe("chunkText", () => {
  it("creates overlapping chunks close to the requested size", () => {
    const input = Array.from({ length: 1200 }, (_, index) => `token${index}`).join(
      " ",
    );

    const chunks = chunkText(input, {
      maxTokens: 500,
      overlapTokens: 100,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0].tokenCount).toBe(500);
    expect(chunks[1].tokenCount).toBe(500);
    expect(chunks[2].tokenCount).toBe(400);

    const tailOfFirst = chunks[0].content.split(" ").slice(-100);
    const headOfSecond = chunks[1].content.split(" ").slice(0, 100);
    expect(headOfSecond).toEqual(tailOfFirst);
  });

  it("returns no chunks for empty input", () => {
    expect(chunkText("   ")).toEqual([]);
  });
});
