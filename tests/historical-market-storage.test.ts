import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { HistoricalMarketRepository } from "../src/persistence/repositories/historical-market-repository.ts";
import {
  buildGameMarketSettlement,
  HistoricalMarketStorageService,
  MockHistoricalMarketProvider,
  ReplayHistoricalMarketProvider,
  StaticHistoricalMarketProvider,
} from "../src/services/historical-market-storage/index.ts";
import {
  toBetCandidate,
  toOddsClosingRecord,
  toOddsHistoryRecord,
  toPredictionResultRecord,
  toRecordedPrediction,
} from "../src/services/historical-market-storage/mappers.ts";
import type {
  HistoricalMarketResult,
  HistoricalMarketSnapshot,
} from "../src/services/historical-market-storage/types.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test("maps historical snapshots into calibration predictions and results", () => {
  const snapshot = buildSnapshot();
  const result = buildResult();
  const prediction = toRecordedPrediction(snapshot);
  const predictionResult = toPredictionResultRecord({ result, snapshot });

  assert.ok(prediction);
  assert.equal(prediction.predictionId, "prediction-1");
  assert.equal(prediction.market, "strikeouts");
  assert.equal(prediction.odds, -110);
  assert.equal(prediction.fairOdds, -132);
  assert.equal(prediction.confidence, 82);
  assert.equal(prediction.modelId, "strikeouts-model-v1");
  assert.equal(predictionResult?.outcome, "win");
  assert.equal(predictionResult?.actualStrikeouts, 7);
});

test("maps historical snapshots into odds history closings and ranking candidates", () => {
  const snapshot = buildSnapshot();
  const history = toOddsHistoryRecord(snapshot);
  const closing = toOddsClosingRecord(snapshot);
  const candidate = toBetCandidate(snapshot);

  assert.equal(history?.openingOdds, 104);
  assert.equal(history?.currentOdds, -110);
  assert.equal(closing?.closingOdds, -118);
  assert.equal(candidate?.marketType, "strikeouts");
  assert.equal(candidate?.sportsbookOdds, -110);
  assert.equal(candidate?.confidence, 82);
  assert.equal(candidate?.dataQuality, 91);
});

test("replay provider loads stored historical snapshots without network access", async () => {
  const service = new HistoricalMarketStorageService(
    new ReplayHistoricalMarketProvider(),
  );
  const calibration = await service.getCalibrationHistory();
  const odds = await service.getOddsHistory();
  const ranking = await service.getRankingHistory();
  const slates = await service.getHistoricalSlates();
  const dailySlates = await service.getDailySlateHistory();

  assert.equal(calibration.predictions.length, 1);
  assert.equal(calibration.results.length, 1);
  assert.equal(odds.history.length, 1);
  assert.equal(odds.closings.length, 1);
  assert.equal(ranking.candidates.length, 1);
  assert.equal(slates.length, 1);
  assert.equal(dailySlates.length, 1);
  assert.equal(dailySlates[0].games[0].markets.length, 2);
});

test("settles game and team markets from official final scores", () => {
  const result = {
    awayScore: 3,
    awayTeamId: "team-away",
    completedAt: "2026-07-08T23:30:00.000Z",
    gameId: "game-1",
    homeScore: 5,
    homeTeamId: "team-home",
    winningTeamId: "team-home",
  };

  assert.equal(
    buildGameMarketSettlement(
      { ...buildSnapshot(), market: "moneyline", teamId: "team-home" },
      result,
    )?.outcome,
    "win",
  );
  assert.equal(
    buildGameMarketSettlement(
      { ...buildSnapshot(), line: -1.5, market: "run-line", teamId: "team-home" },
      result,
    )?.outcome,
    "win",
  );
  assert.equal(
    buildGameMarketSettlement(
      { ...buildSnapshot(), line: 9.5, market: "game-total", selection: "Under" },
      result,
    )?.outcome,
    "win",
  );
  assert.equal(
    buildGameMarketSettlement(
      { ...buildSnapshot(), line: 4.5, market: "team-total", teamId: "team-home" },
      result,
    )?.outcome,
    "win",
  );
  assert.equal(
    buildGameMarketSettlement(
      { ...buildSnapshot(), market: "strikeouts" },
      result,
    ),
    undefined,
  );
});

test("mock provider mirrors the live historical market contract", async () => {
  const service = new HistoricalMarketStorageService(
    new MockHistoricalMarketProvider(),
  );
  const calibration = await service.getCalibrationHistory();

  assert.equal(calibration.predictions.length, 1);
  assert.equal(calibration.results.length, 1);
});

test("static provider gracefully returns empty history", async () => {
  const service = new HistoricalMarketStorageService(
    new StaticHistoricalMarketProvider(),
  );

  assert.deepEqual(await service.getCalibrationHistory(), {
    predictions: [],
    results: [],
  });
});

test(
  "repository records snapshots and settlement rows",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const repository = new HistoricalMarketRepository();
    const snapshotId = `historical-market-${Date.now()}`;

    const snapshot = await repository.recordSnapshot({
      capturedAt: "2026-07-08T18:00:00.000Z",
      currentOdds: -110,
      edgePercent: 5.4,
      expectedValuePercent: 4.8,
      fairOdds: -132,
      gameId: "game-db-1",
      line: 6.5,
      market: "strikeouts",
      openingOdds: 104,
      playerId: "player-db",
      predictionId: `${snapshotId}:prediction`,
      provider: "test",
      selection: "Over",
      snapshotId,
      sportsbook: "DraftKings",
      trueLineProbability: 0.57,
    });
    const result = await repository.settleMarket({
      actualStat: 8,
      outcome: "win",
      snapshotId,
    });
    const found = await repository.findSnapshot(snapshotId);

    assert.equal(snapshot.snapshotId, snapshotId);
    assert.equal(result.market, "strikeouts");
    assert.equal(found?.currentOdds, -110);
  },
);

test.after(async () => {
  if (hasDatabase) {
    await closeDb();
  }
});

function buildSnapshot(): HistoricalMarketSnapshot {
  return {
    capturedAt: "2026-07-08T18:00:00.000Z",
    closingOdds: -118,
    currentOdds: -110,
    edgePercent: 5.4,
    expectedValuePercent: 4.8,
    fairOdds: -132,
    gameId: "game-1",
    calibrationVersion: "calibration-v1",
    dataQuality: 91,
    line: 6.5,
    market: "strikeouts",
    modelConfidence: 82,
    modelVersion: "strikeouts-model-v1",
    openingOdds: 104,
    playerId: "player-wheeler",
    predictionId: "prediction-1",
    predictionVersion: "strikeouts-prediction-v1",
    provider: "oddspipe",
    recommendation: "Play",
    selection: "Over",
    snapshotId: "snapshot-1",
    sportsbook: "DraftKings",
    teamId: "team-phi",
    trueLineProbability: 0.57,
    updatedAt: "2026-07-08T22:30:00.000Z",
    variance: 45,
  };
}

function buildResult(): HistoricalMarketResult {
  return {
    actualStat: 7,
    finalResult: "Wheeler over 6.5 strikeouts",
    market: "strikeouts",
    outcome: "win",
    resultId: "result-1",
    settledAt: "2026-07-08T23:15:00.000Z",
    snapshotId: "snapshot-1",
  };
}
