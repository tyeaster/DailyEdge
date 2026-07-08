import assert from "node:assert/strict";
import test from "node:test";

import { RankingEngineService, type BetCandidate } from "../src/services/ranking/index.ts";
import {
  CalibrationCalculator,
  CalibrationService,
  ConfidenceCalibrationEngine,
  MockCalibrationProvider,
  PredictionRecorder,
  ReplayCalibrationProvider,
  ResultRecorder,
  StaticCalibrationProvider,
  joinCompletedPredictions,
  type CompletedPrediction,
  type PredictionResultRecord,
  type RecordedPrediction,
} from "../src/services/calibration/index.ts";

test("PredictionRecorder normalizes generated prediction records", () => {
  const recorder = new PredictionRecorder();
  const record = recorder.record({
    confidence: 102,
    edgePercent: 6.2,
    expectedValuePercent: 4.8,
    fairOdds: -128,
    gameId: "game-1",
    market: "strikeouts",
    modelProbability: 1.2,
    odds: 104,
    playerId: "pitcher-1",
    recommendation: "Play",
    sportsbook: "DraftKings",
    timestamp: "2026-06-22T16:00:00.000Z",
  });

  assert.equal(record.confidence, 100);
  assert.equal(record.modelProbability, 1);
  assert.equal(record.modelId, "trueline-v1");
  assert.equal(record.market, "strikeouts");
  assert.ok(record.predictionId.includes("strikeouts:game-1:pitcher-1"));
});

test("ResultRecorder records completed market results", () => {
  const recorder = new ResultRecorder();
  const record = recorder.record({
    actualStrikeouts: 8,
    closingEdgePercent: 5.1,
    gameId: "game-1",
    market: "strikeouts",
    outcome: "win",
    predictionId: "prediction-1",
    recordedAt: "2026-06-22T23:00:00.000Z",
  });

  assert.equal(record.outcome, "win");
  assert.equal(record.actualStrikeouts, 8);
  assert.equal(record.closingEdgePercent, 5.1);
});

test("CalibrationCalculator computes accuracy ROI and summary metrics", () => {
  const calculator = new CalibrationCalculator();
  const completed = buildCompleted();
  const first = calculator.calculateAccuracy(completed[0]);
  const summary = calculator.calculateSummary(completed);

  assert.equal(first.correct, true);
  assert.equal(first.profit, 1.2);
  assert.equal(first.roi, 120);
  assert.ok(first.probabilityError > 0);
  assert.equal(summary.predictionCount, 3);
  assert.equal(summary.winRate, 66.66666666666666);
  assert.ok(summary.roi > 0);
  assert.ok(summary.averageEdge > 0);
  assert.ok(summary.averageClosingEdge > 0);
});

test("ConfidenceCalibrationEngine builds fixed confidence buckets", () => {
  const buckets = new ConfidenceCalibrationEngine().buildConfidenceCurve(buildCompleted());

  assert.equal(buckets.length, 9);
  assert.equal(buckets[0].label, "50-55%");
  assert.ok(buckets.some((bucket) => bucket.count > 0));
  assert.ok(
    buckets
      .filter((bucket) => bucket.count > 0)
      .every((bucket) => bucket.calibrationScore >= 0),
  );
});

test("CalibrationService joins predictions to results and builds dashboard", async () => {
  const predictions = buildPredictions();
  const results = buildResults();
  const service = new CalibrationService({
    provider: new StaticCalibrationProvider({ predictions, results }),
  });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.mode, "live");
  assert.equal(dashboard.overallMetrics.predictionCount, 3);
  assert.equal(dashboard.marketPerformance.length, 3);
  assert.equal(dashboard.confidenceCurve.length, 9);
  assert.ok(dashboard.bestModels.length > 0);
  assert.ok(dashboard.worstModels.length > 0);
  assert.ok(dashboard.recentAccuracy.length > 0);
});

test("mock and replay providers support deterministic calibration history", async () => {
  const mock = await new CalibrationService({
    provider: new MockCalibrationProvider(),
  }).getDashboard();

  assert.equal(mock.mode, "mock");
  assert.ok(mock.overallMetrics.predictionCount >= 4);

  const replay = await new CalibrationService({
    provider: new ReplayCalibrationProvider(),
  }).getDashboard();

  assert.equal(replay.mode, "replay");
  assert.equal(replay.provider, "calibration-replay");
  assert.equal(replay.overallMetrics.predictionCount, 4);
});

test("RankingEngine exposes historical performance without changing score math", () => {
  const candidate = buildRankingCandidate();
  const ranked = new RankingEngineService().scoreCandidate(candidate);

  assert.deepEqual(ranked.historicalPerformance, {
    calibration: 88,
    roi: 12.4,
    winRate: 58.2,
  });
  assert.ok(ranked.trueLineScore > 0);
});

function buildCompleted(): CompletedPrediction[] {
  return joinCompletedPredictions(buildPredictions(), buildResults());
}

function buildPredictions(): RecordedPrediction[] {
  return [
    prediction("prediction-1", "strikeouts", 0.62, 74, 6.4, 4.8, 120),
    prediction("prediction-2", "hits", 0.58, 68, 3.5, 2.6, -140),
    prediction("prediction-3", "moneyline", 0.53, 61, 2.2, 1.1, -110),
  ];
}

function buildResults(): PredictionResultRecord[] {
  return [
    result("prediction-1", "strikeouts", "win", "2026-06-22T23:00:00.000Z", 5.2),
    result("prediction-2", "hits", "win", "2026-06-23T23:00:00.000Z", 2.1),
    result("prediction-3", "moneyline", "loss", "2026-06-24T23:00:00.000Z", -0.5),
  ];
}

function prediction(
  predictionId: string,
  market: RecordedPrediction["market"],
  modelProbability: number,
  confidence: number,
  edgePercent: number,
  expectedValuePercent: number,
  odds: number,
): RecordedPrediction {
  return {
    confidence,
    edgePercent,
    expectedValuePercent,
    fairOdds: odds,
    gameId: `game-${predictionId}`,
    market,
    modelId: "trueline-v1",
    modelProbability,
    odds,
    playerId: market === "moneyline" ? undefined : `player-${predictionId}`,
    predictionId,
    recommendation: "Play",
    sportsbook: "DraftKings",
    teamId: market === "moneyline" ? "team-phi" : undefined,
    timestamp: "2026-06-22T16:00:00.000Z",
  };
}

function result(
  predictionId: string,
  market: PredictionResultRecord["market"],
  outcome: PredictionResultRecord["outcome"],
  recordedAt: string,
  closingEdgePercent: number,
): PredictionResultRecord {
  return {
    closingEdgePercent,
    gameId: `game-${predictionId}`,
    market,
    outcome,
    predictionId,
    recordedAt,
  };
}

function buildRankingCandidate(): BetCandidate {
  return {
    betId: "candidate-1",
    confidence: 78,
    dataQuality: 84,
    edgePercent: 6.4,
    expectedValuePercent: 5.1,
    fairOdds: -132,
    historicalPerformance: {
      calibration: 88,
      roi: 12.4,
      winRate: 58.2,
    },
    marketType: "moneyline",
    modelProbability: 0.57,
    recommendation: "Play",
    sportsbook: "DraftKings",
    sportsbookOdds: 112,
    supportingFactors: [
      {
        key: "matchupStrength",
        label: "Matchup",
        score: 74,
        summary: "Positive matchup.",
      },
    ],
    team: {
      id: "team-phi",
      name: "Phillies",
    },
    timestamp: "2026-06-22T16:00:00.000Z",
    variance: 36,
  };
}
