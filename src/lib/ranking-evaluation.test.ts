import { evaluateRanking } from "@/lib/ranking-evaluation";

describe("evaluateRanking", () => {
  it("calculates recall@k and mean reciprocal rank", () => {
    const result = evaluateRanking(
      [
        {
          expectedCandidateIds: ["ana", "bia"],
          rankedCandidateIds: ["ana", "carlos", "bia"],
        },
        {
          expectedCandidateIds: ["diego"],
          rankedCandidateIds: ["eva", "diego", "felipe"],
        },
      ],
      2,
    );

    expect(result.cases).toBe(2);
    expect(result.recallAtK).toBe(0.75);
    expect(result.meanReciprocalRank).toBe(0.75);
  });

  it("returns zeroed metrics for an empty suite", () => {
    expect(evaluateRanking([])).toEqual({
      cases: 0,
      recallAtK: 0,
      meanReciprocalRank: 0,
    });
  });
});
