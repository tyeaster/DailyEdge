import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPredictionRecommendations,
  calculateConfidence,
  calculateDataQuality,
  calculateExpectedValuePercent,
  calculateModelBreakdown,
  getRecommendation,
  PredictionEngine,
} from "../src/services/predictions/PredictionEngine.ts";
import { PREDICTION_ENGINE_V1_CONFIG } from "../src/services/predictions/config.ts";
import { PredictionDiagnosticsService } from "../src/services/predictions/PredictionDiagnosticsService.ts";
import {
  buildTeamRecentForm,
  calculateRecentFormWindow,
} from "../src/providers/recent-form/rating.ts";
import type {
  Game,
  Pitcher,
  RecentFormWindow,
  RecentFormWindowStats,
  Team,
} from "../src/models/mlb.ts";

const homeTeam: Team = {
  abbreviation: "LAD",
  city: "Los Angeles",
  division: "West",
  id: "team-lad",
  league: "NL",
  name: "Dodgers",
  record: {
    losses: 35,
    winPercentage: 0.62,
    wins: 57,
  },
  strength: {
    bullpen: {
      available: true,
      era: 3.4,
      source: "live",
      value: 72,
      whip: 1.18,
      workloadRating: 84,
    },
    fetchedAt: "2026-06-24T12:00:00.000Z",
    offense: {
      available: true,
      battingAverage: 0.261,
      ops: 0.783,
      runsPerGame: 5.24,
      strikeoutRate: 0.205,
      value: 70,
      walkRate: 0.106,
    },
    overall: { available: true, runDifferential: 143, value: 81 },
    pitching: {
      available: true,
      era: 3.42,
      runsAllowedPerGame: 3.45,
      value: 85,
      whip: 1.1,
    },
    source: "live",
  },
};

const awayTeam: Team = {
  abbreviation: "SF",
  city: "San Francisco",
  division: "West",
  id: "team-sf",
  league: "NL",
  name: "Giants",
  record: {
    losses: 48,
    winPercentage: 0.47,
    wins: 42,
  },
  strength: {
    bullpen: {
      available: true,
      era: 4.4,
      source: "live",
      value: 42,
      whip: 1.36,
      workloadRating: 55,
    },
    fetchedAt: "2026-06-24T12:00:00.000Z",
    offense: {
      available: true,
      battingAverage: 0.235,
      ops: 0.69,
      runsPerGame: 3.9,
      strikeoutRate: 0.25,
      value: 38,
      walkRate: 0.075,
    },
    overall: { available: true, runDifferential: -40, value: 42 },
    pitching: {
      available: true,
      era: 4.3,
      runsAllowedPerGame: 4.7,
      value: 43,
      whip: 1.32,
    },
    source: "live",
  },
};

const homePitcher: Pitcher = {
  arsenal: ["Fastball"],
  bats: "R",
  era: 2.8,
  fullName: "Home Starter",
  handedness: "R",
  id: "pitcher-home",
  inningsPitched: 120,
  position: "SP",
  strikeoutRate: 27,
  teamId: homeTeam.id,
  throws: "R",
  whip: 1.05,
};

const awayPitcher: Pitcher = {
  arsenal: ["Sinker"],
  bats: "R",
  era: 4.5,
  fullName: "Away Starter",
  handedness: "R",
  id: "pitcher-away",
  inningsPitched: 96,
  position: "SP",
  strikeoutRate: 18,
  teamId: awayTeam.id,
  throws: "R",
  whip: 1.34,
};

const game: Game = {
  awayPitcherId: awayPitcher.id,
  awayTeamId: awayTeam.id,
  confidence: { label: "Medium", value: 60 },
  detail: "Pending model.",
  homePitcherId: homePitcher.id,
  homeTeamId: homeTeam.id,
  id: "game-lad-sf",
  modelProbability: 0.5,
  odds: {
    moneyline: {
      displayLine: "LAD -120 / SF +105",
      id: "odds-moneyline",
      impliedProbability: 0.5454545455,
      line: -120,
      market: "moneyline",
      movement: "Live",
      outcomes: [
        {
          impliedProbability: 0.5454545455,
          price: -120,
          selection: "Los Angeles Dodgers",
          side: "home",
          sportsbook: "OddsPipe",
          updatedAt: "2026-06-23T12:00:00.000Z",
        },
        {
          impliedProbability: 0.487804878,
          price: 105,
          selection: "San Francisco Giants",
          side: "away",
          sportsbook: "OddsPipe",
          updatedAt: "2026-06-23T12:00:00.000Z",
        },
      ],
      price: -120,
      sportsbook: "OddsPipe",
    },
    spread: {
      displayLine: "LAD -1.5",
      id: "odds-spread",
      line: -1.5,
      market: "spread",
      movement: "Live",
      price: 135,
      sportsbook: "OddsPipe",
    },
    total: {
      displayLine: "Over 8.5",
      id: "odds-total",
      line: 8.5,
      market: "total",
      movement: "Live",
      price: -110,
      sportsbook: "OddsPipe",
    },
  },
  scheduledAt: "2026-06-23T23:10:00.000Z",
  status: "scheduled",
  venue: "Dodger Stadium",
  weatherId: "weather-lad-sf",
};

test("produces a deterministic V1 prediction result", () => {
  const prediction = new PredictionEngine().predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  });

  assert.equal(Number(prediction.homeWinProbability.toFixed(3)), 0.603);
  assert.equal(Number(prediction.awayWinProbability.toFixed(3)), 0.397);
  assert.equal(prediction.homeProjectedRuns, 5.1);
  assert.equal(prediction.awayProjectedRuns, 3.4);
  assert.equal(prediction.projectedTotalRuns, 8.5);
  assert.equal(prediction.homeFairMoneyline, -152);
  assert.equal(prediction.awayFairMoneyline, 152);
  assert.equal(prediction.edgePercent, 5.8);
  assert.equal(prediction.expectedValuePercent, 10.6);
  assert.equal(prediction.confidenceScore, 79);
  assert.equal(prediction.recommendation, "Strong Play");
  assert.equal(prediction.predictedWinnerTeamId, homeTeam.id);
  assert.ok(prediction.explanations.length >= 4);
  assert.ok(
    prediction.explanations.some((explanation) =>
      explanation.includes("Fresher Bullpen"),
    ),
  );
  assert.equal(prediction.predictionVersion, "1.3.0");
  assert.equal(prediction.dataQuality.score, 90);
  assert.ok(prediction.modelBreakdown.totalContributionPercent > 0);
});

test("calculates expected value per one unit risked", () => {
  assert.equal(
    Number(calculateExpectedValuePercent(0.6, -120).toFixed(1)),
    10,
  );
  assert.equal(
    Number(calculateExpectedValuePercent(0.4, 150).toFixed(1)),
    0,
  );
});

test("confidence rises with clearer advantage, larger edge, and factor agreement", () => {
  const evenConfidence = calculateConfidence({
    edgePercent: 0.5,
    factors: {
      bullpen: 0.5,
      homeField: 0.5,
      momentum: 0.5,
      recentForm: 0.5,
      seasonStrength: 0.5,
      sportsbookMarket: 0.5,
      startingPitcher: 0.5,
      teamOffense: 0.5,
      teamPitching: 0.5,
    },
    homeWinProbability: 0.51,
  });
  const clearConfidence = calculateConfidence({
    edgePercent: 8,
    factors: {
      bullpen: 0.63,
      homeField: 0.54,
      momentum: 0.61,
      recentForm: 0.5,
      seasonStrength: 0.64,
      sportsbookMarket: 0.58,
      startingPitcher: 0.65,
      teamOffense: 0.65,
      teamPitching: 0.66,
    },
    homeWinProbability: 0.64,
  });

  assert.ok(clearConfidence > evenConfidence);
  assert.ok(clearConfidence <= 100);
});

test("team strength inputs change the model probability", () => {
  const engine = new PredictionEngine();
  const strongHomePrediction = engine.predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  });
  const neutralHomePrediction = engine.predictGame({
    awayPitcher,
    awayTeam: { ...awayTeam, strength: undefined },
    game,
    homePitcher,
    homeTeam: { ...homeTeam, strength: undefined },
  });

  assert.ok(
    strongHomePrediction.homeWinProbability >
      neutralHomePrediction.homeWinProbability,
  );
  assert.ok(
    strongHomePrediction.explanations.some((explanation) =>
      explanation.includes("Better Team Offense"),
    ),
  );
  assert.ok(
    strongHomePrediction.explanations.some((explanation) =>
      explanation.includes("Better Team Pitching"),
    ),
  );
});

test("recent form and momentum change probability and explanations", () => {
  const engine = new PredictionEngine();
  const trendingHome = {
    ...homeTeam,
    recentForm: createRecentForm({
      era: 2.9,
      losses: 1,
      ops: 0.84,
      runsAllowedPerGame: 3,
      runsPerGame: 5.8,
      whip: 1.08,
      wins: 6,
    }),
  };
  const slidingAway = {
    ...awayTeam,
    recentForm: createRecentForm({
      era: 5.1,
      losses: 6,
      ops: 0.65,
      runsAllowedPerGame: 5.5,
      runsPerGame: 3.4,
      whip: 1.48,
      wins: 1,
    }),
  };
  const trendPrediction = engine.predictGame({
    awayPitcher,
    awayTeam: slidingAway,
    game,
    homePitcher,
    homeTeam: trendingHome,
  });
  const neutralPrediction = engine.predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  });

  assert.ok(
    trendPrediction.homeWinProbability >
      neutralPrediction.homeWinProbability,
  );
  assert.equal(trendPrediction.dataQuality.inputs.recentForm.status, "available");
  assert.ok(
    trendPrediction.explanations.some((explanation) =>
      explanation.includes("Better Recent Form"),
    ),
  );
  assert.ok(
    trendPrediction.explanations.some((explanation) =>
      explanation.includes("Positive Momentum"),
    ),
  );
  assert.ok(
    trendPrediction.explanations.some((explanation) =>
      explanation.includes("Superior Recent Run Differential"),
    ),
  );
});

test("keeps every model weight in one documented configuration", () => {
  assert.deepEqual(Object.keys(PREDICTION_ENGINE_V1_CONFIG.weights).sort(), [
    "bullpen",
    "homeField",
    "momentum",
    "recentForm",
    "seasonStrength",
    "sportsbookMarket",
    "startingPitcher",
    "teamOffense",
    "teamPitching",
  ]);
  assert.equal(
    Object.values(PREDICTION_ENGINE_V1_CONFIG.weights).reduce<number>(
      (total, weight) => total + weight,
      0,
    ),
    1,
  );
  assert.equal(PREDICTION_ENGINE_V1_CONFIG.weights.recentForm, 0.12);
});

test("calculates a deterministic per-factor model breakdown", () => {
  const breakdown = calculateModelBreakdown({
    bullpen: 0.55,
    homeField: 0.54,
    momentum: 0.58,
    recentForm: 0.5,
    seasonStrength: 0.62,
    sportsbookMarket: 0.48,
    startingPitcher: 0.7,
    teamOffense: 0.6,
    teamPitching: 0.55,
  });

  assert.equal(
    breakdown.factors.startingPitcher.contributionPercent,
    4.8,
  );
  assert.equal(breakdown.factors.teamOffense.contributionPercent, 1.4);
  assert.equal(breakdown.factors.sportsbookMarket.contributionPercent, -0.1);
  assert.equal(breakdown.factors.recentForm.contributionPercent, 0);
  assert.equal(breakdown.factors.momentum.contributionPercent, 0.6);
  assert.equal(breakdown.factors.seasonStrength.contributionPercent, 1.7);
  assert.equal(breakdown.totalContributionPercent, 9.5);
});

test("scores data quality from available normalized inputs", () => {
  const quality = calculateDataQuality({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  });

  assert.equal(quality.score, 90);
  assert.equal(quality.inputs.pitchers.status, "available");
  assert.equal(quality.inputs.teamStats.status, "available");
  assert.equal(quality.inputs.bullpen.status, "available");
  assert.equal(quality.inputs.bullpen.source, "live");
  assert.equal(quality.inputs.weather.status, "missing");
  assert.deepEqual(quality.missingInputs, ["Recent Form", "Weather"]);
});

test("missing data lowers quality, caps confidence, and emits no missing-data explanations", () => {
  const prediction = new PredictionEngine().predictGame({
    awayTeam: { ...awayTeam, strength: undefined },
    game,
    homeTeam: { ...homeTeam, strength: undefined },
  });

  assert.equal(prediction.dataQuality.score, 15);
  assert.equal(prediction.confidenceScore, 15);
  assert.equal(prediction.modelBreakdown.factors.startingPitcher.available, false);
  assert.equal(prediction.modelBreakdown.factors.teamOffense.available, false);
  assert.ok(
    prediction.explanations.every(
      (explanation) =>
        !explanation.toLowerCase().includes("missing") &&
        !explanation.toLowerCase().includes("unavailable") &&
        !explanation.toLowerCase().includes("incomplete"),
    ),
  );
});

test("developer diagnostics expose version, weights, sources, and missing inputs", () => {
  const prediction = new PredictionEngine().predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  });
  const diagnostics = new PredictionDiagnosticsService().create(prediction);

  assert.equal(diagnostics.predictionVersion, "1.3.0");
  assert.equal(diagnostics.weights.startingPitcher, 0.24);
  assert.equal(diagnostics.inputSources["Sportsbook Market"], "OddsPipe");
  assert.deepEqual(diagnostics.missingInputs, ["Recent Form", "Weather"]);
});

test("applies recommendation thresholds deterministically", () => {
  assert.equal(
    getRecommendation({
      confidenceScore: 50,
      edgePercent: -1,
      expectedValuePercent: -2,
    }),
    "Pass",
  );
  assert.equal(
    getRecommendation({
      confidenceScore: 55,
      edgePercent: 1,
      expectedValuePercent: 1,
    }),
    "Lean",
  );
  assert.equal(
    getRecommendation({
      confidenceScore: 60,
      edgePercent: 3,
      expectedValuePercent: 1,
    }),
    "Play",
  );
  assert.equal(
    getRecommendation({
      confidenceScore: 70,
      edgePercent: 5,
      expectedValuePercent: 3,
    }),
    "Strong Play",
  );
  assert.equal(
    getRecommendation({
      confidenceScore: 75,
      edgePercent: 8,
      expectedValuePercent: 5,
    }),
    "Best Bet",
  );
});

test("builds recommendation records from prediction results", () => {
  const engine = new PredictionEngine();
  const predictions = engine.predictSlate({
    games: [game],
    pitcherById: {
      [awayPitcher.id]: awayPitcher,
      [homePitcher.id]: homePitcher,
    },
    teamById: {
      [awayTeam.id]: awayTeam,
      [homeTeam.id]: homeTeam,
    },
  });
  const recommendations = buildPredictionRecommendations({
    games: [game],
    predictions,
    teamById: {
      [awayTeam.id]: awayTeam,
      [homeTeam.id]: homeTeam,
    },
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].selection, "LAD moneyline");
  assert.equal(recommendations[0].prediction.projection, "-152");
  assert.equal(recommendations[0].rank, 1);
  assert.equal(recommendations[0].recommendedUnits, 1);
});

function createRecentForm({
  era,
  losses,
  ops,
  runsAllowedPerGame,
  runsPerGame,
  whip,
  wins,
}: {
  era: number;
  losses: number;
  ops: number;
  runsAllowedPerGame: number;
  runsPerGame: number;
  whip: number;
  wins: number;
}) {
  const windows = Object.fromEntries(
    ([7, 14, 30] as RecentFormWindow[]).map((window) => [
      window,
      calculateRecentFormWindow({
        battingAverage: ops > 0.75 ? 0.27 : 0.23,
        era: era + (window === 30 ? 0.4 : 0),
        gamesPlayed: window,
        losses:
          window === 7
            ? losses
            : Math.round((losses / 7) * window),
        ops: ops - (window === 30 ? 0.04 : 0),
        runsAllowed: runsAllowedPerGame * window,
        runsScored: runsPerGame * window,
        whip: whip + (window === 30 ? 0.08 : 0),
        wins:
          window === 7 ? wins : Math.round((wins / 7) * window),
        window,
      }),
    ]),
  ) as Record<RecentFormWindow, RecentFormWindowStats>;

  return buildTeamRecentForm({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    source: "live",
    windows,
  });
}
