import type { PredictionRecommendation } from "../../models/mlb.ts";

export const PREDICTION_ENGINE_V1_CONFIG = {
  confidence: {
    agreementWeight: 20,
    base: 35,
    clarityWeight: 25,
    edgeWeight: 20,
  },
  homeFieldWinProbability: 0.54,
  neutralProjectedRuns: 8.6,
  probabilityBounds: {
    maximum: 0.75,
    minimum: 0.25,
  },
  recommendationThresholds: [
    {
      minimumConfidence: 75,
      minimumEdgePercent: 8,
      minimumExpectedValuePercent: 5,
      recommendation: "Best Bet",
    },
    {
      minimumConfidence: 70,
      minimumEdgePercent: 5,
      minimumExpectedValuePercent: 3,
      recommendation: "Strong Play",
    },
    {
      minimumConfidence: 60,
      minimumEdgePercent: 3,
      minimumExpectedValuePercent: 1,
      recommendation: "Play",
    },
    {
      minimumConfidence: 0,
      minimumEdgePercent: 0.1,
      minimumExpectedValuePercent: 0.1,
      recommendation: "Lean",
    },
  ] satisfies Array<{
    minimumConfidence: number;
    minimumEdgePercent: number;
    minimumExpectedValuePercent: number;
    recommendation: Exclude<PredictionRecommendation, "Pass">;
  }>,
  weights: {
    homeField: 0.2,
    sportsbook: 0.1,
    startingPitcher: 0.45,
    teamRecord: 0.25,
  },
} as const;
