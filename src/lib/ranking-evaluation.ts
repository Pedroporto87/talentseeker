export type RankingEvaluationCase = {
  expectedCandidateIds: string[];
  rankedCandidateIds: string[];
};

export type RankingEvaluationResult = {
  cases: number;
  recallAtK: number;
  meanReciprocalRank: number;
};

export function evaluateRanking(
  cases: RankingEvaluationCase[],
  k = 5,
): RankingEvaluationResult {
  if (cases.length === 0) {
    return {
      cases: 0,
      recallAtK: 0,
      meanReciprocalRank: 0,
    };
  }

  const totals = cases.reduce(
    (accumulator, item) => {
      const expected = new Set(item.expectedCandidateIds);
      const topK = item.rankedCandidateIds.slice(0, k);
      const hits = topK.filter((candidateId) => expected.has(candidateId));
      const firstRelevantIndex = item.rankedCandidateIds.findIndex((candidateId) =>
        expected.has(candidateId),
      );

      return {
        recallAtK:
          accumulator.recallAtK +
          (expected.size ? hits.length / expected.size : 0),
        meanReciprocalRank:
          accumulator.meanReciprocalRank +
          (firstRelevantIndex >= 0 ? 1 / (firstRelevantIndex + 1) : 0),
      };
    },
    { recallAtK: 0, meanReciprocalRank: 0 },
  );

  return {
    cases: cases.length,
    recallAtK: totals.recallAtK / cases.length,
    meanReciprocalRank: totals.meanReciprocalRank / cases.length,
  };
}
