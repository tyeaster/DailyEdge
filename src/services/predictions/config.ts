import type { PredictionRecommendation } from "../../models/mlb.ts";

export const PREDICTION_ENGINE_V1_CONFIG = {
  confidence: {
    agreementWeight: 20,
    base: 35,
    clarityWeight: 25,
    edgeWeight: 20,
  },
  homeFieldWinProbability: 0.54,
  dataQuality: {
    weights: {
      bullpen: 15,
      pitchers: 30,
      recentForm: 5,
      sportsbook: 15,
      teamStats: 30,
      weather: 5,
    },
  },
  factorLabels: {
    bullpen: "Bullpen",
    homeField: "Home Field",
    momentum: "Momentum",
    recentForm: "Recent Form",
    seasonStrength: "Season Strength",
    sportsbookMarket: "Sportsbook Market",
    startingPitcher: "Starting Pitcher",
    teamOffense: "Team Offense",
    teamPitching: "Team Pitching",
  },
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
    bullpen: 0.06,
    homeField: 0.06,
    momentum: 0.08,
    recentForm: 0.12,
    seasonStrength: 0.14,
    sportsbookMarket: 0.04,
    startingPitcher: 0.24,
    teamOffense: 0.14,
    teamPitching: 0.12,
  },
  version: "1.3.0",
} as const;
