import assert from "node:assert/strict";
import test from "node:test";

import { BacktestRunner, buildMockHistoricalSlates } from "../src/services/backtesting/index.ts";
import { CalibrationCalculator, joinCompletedPredictions } from "../src/services/calibration/index.ts";
import {
  ClosingLineCalculator,
  MarketMovementAnalyzer,
  MockOddsIntelligenceProvider,
  OddsIntelligenceService,
  ReplayOddsIntelligenceProvider,
  SteamMoveDetector,
  buildMockClosings,
  buildMockHistory,
  buildMovementHistory,
} from "../src/services/odds-intelligence/index.ts";

test("ClosingLineCalculator calculates CLV and edge metrics", () => {
  const calculator = new ClosingLineCalculator();
  const record = buildMockHistory()[0];
  const closing = buildMockClosings()[0];

  assert.ok(Number.isFinite(calculator.calculateClv(record, closing)));
  assert.ok(calculator.calculateOpeningEdge(record) > 0);
  assert.ok(Number.isFinite(calculator.calculateClosingEdge(record, closing)));
  assert.ok(Number.isFinite(calculator.calculateMarketDrift(record.openingOdds, record.currentOdds)));
  assert.ok(Number.isFinite(calculator.calculateExpectedClosingEdge(record, closing)));
});

test("MarketMovementAnalyzer detects steam and sharp movement", () => {
  const history = buildMockHistory().filter((record) => record.predictionId === "odds-k-1");
  const movement = buildMovementHistory({
    calculator: new ClosingLineCalculator(),
    closings: buildMockClosings(),
    history,
    movementAnalyzer: new MarketMovementAnalyzer(),
    steamDetector: new SteamMoveDetector(),
  })[0];

  assert.equal(movement.analysis.movementType, "steam-move");
  assert.ok(movement.analysis.steamAlert);
  assert.ok(movement.timeline.length >= 2);
});

test("SteamMoveDetector flags large timeline movement", () => {
  const alert = new SteamMoveDetector().detect([
    {
      currentOdds: 120,
      movementPercent: 0,
      openingEdgePercent: 4,
      timestamp: "2026-06-22T12:00:00.000Z",
    },
    {
      currentOdds: -120,
      movementPercent: -200,
      openingEdgePercent: 4,
      timestamp: "2026-06-22T18:00:00.000Z",
    },
  ]);

  assert.ok(alert?.includes("Steam move"));
});

test("OddsIntelligenceService builds dashboard from mock and replay providers", async () => {
  const mock = await new OddsIntelligenceService({
    provider: new MockOddsIntelligenceProvider(),
  }).getDashboard();
  const replay = await new OddsIntelligenceService({
    provider: new ReplayOddsIntelligenceProvider(),
  }).getDashboard();

  assert.equal(mock.mode, "mock");
  assert.ok(mock.movementHistory.length > 0);
  assert.ok(mock.bestClv);
  assert.ok(mock.worstClv);
  assert.equal(replay.mode, "replay");
  assert.ok(replay.movementHistory.length > 0);
});

test("Calibration summary exposes CLV and prediction-vs-market fields", () => {
  const slates = buildMockHistoricalSlates();
  const completed = joinCompletedPredictions(
    slates.flatMap((slate) => slate.calibrationRecords.predictions),
    slates.flatMap((slate) => slate.calibrationRecords.results),
  );
  const summary = new CalibrationCalculator().calculateSummary(completed);

  assert.ok(Number.isFinite(summary.averageClv));
  assert.ok(Number.isFinite(summary.closingAccuracy));
  assert.ok(Number.isFinite(summary.predictionVsMarket));
});

test("Backtesting output compares ROI by opening current and closing lines", () => {
  const output = new BacktestRunner().run(buildMockHistoricalSlates(), {
    bankroll: {
      mode: "flat",
      startingBankroll: 1000,
      unitSize: 10,
    },
    settings: {
      minimumEdge: 0,
    },
  });

  assert.equal(output.roiByLineSource.length, 3);
  assert.deepEqual(
    output.roiByLineSource.map((point) => point.label),
    ["Opening Lines", "Current Lines", "Closing Lines"],
  );
});
