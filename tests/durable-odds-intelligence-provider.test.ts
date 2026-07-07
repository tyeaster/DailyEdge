import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { OddsSnapshotsRepository } from "../src/persistence/repositories/odds-snapshots-repository.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";
import {
  DurableOddsIntelligenceProvider,
  getConfiguredOddsIntelligenceProvider,
} from "../src/services/odds-intelligence/providers.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "builds an opening-to-current time series from real snapshots and a real prediction",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-odds-intel-${Date.now()}`;
    const predictionId = `${gameId}-prediction`;

    await new PredictionsRepository().record({
      confidence: 65,
      edgePercent: 5,
      expectedValuePercent: 6,
      fairOdds: -140,
      gameId,
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.58,
      odds: -110,
      predictionId,
      recommendation: "Play",
      teamId: "mlb-team-119",
      timestamp: new Date().toISOString(),
    });

    const oddsRepository = new OddsSnapshotsRepository();

    await oddsRepository.recordGameSnapshot({
      americanOdds: -110,
      capturedAt: new Date("2026-06-25T12:00:00Z"),
      gameId,
      impliedProbability: 0.524,
      market: "moneyline",
      provider: "oddspipe",
      sportsbook: "OddsPipe",
    });
    await oddsRepository.recordGameSnapshot({
      americanOdds: -130,
      capturedAt: new Date("2026-06-25T18:00:00Z"),
      gameId,
      impliedProbability: 0.565,
      market: "moneyline",
      provider: "oddspipe",
      sportsbook: "OddsPipe",
    });

    const provider = new DurableOddsIntelligenceProvider();
    const response = await provider.getHistory();

    assert.equal(response.mode, "live");
    assert.deepEqual(response.closings, []);

    const records = response.history.filter((record) => record.gameId === gameId);

    assert.equal(records.length, 2);
    assert.equal(records[0].openingOdds, -110);
    assert.equal(records[0].currentOdds, -110);
    assert.equal(records[1].openingOdds, -110);
    assert.equal(records[1].currentOdds, -130);
    assert.equal(records[0].fairOdds, -140);
    assert.equal(records[0].predictionId, predictionId);
  },
);

test(
  "excludes games that have snapshots but no matching prediction",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-odds-intel-orphan-${Date.now()}`;

    await new OddsSnapshotsRepository().recordGameSnapshot({
      americanOdds: -110,
      gameId,
      impliedProbability: 0.524,
      market: "moneyline",
      provider: "oddspipe",
      sportsbook: "OddsPipe",
    });

    const provider = new DurableOddsIntelligenceProvider();
    const response = await provider.getHistory();

    assert.ok(!response.history.some((record) => record.gameId === gameId));
  },
);

test("getConfiguredOddsIntelligenceProvider(\"live\") returns a DurableOddsIntelligenceProvider", () => {
  const provider = getConfiguredOddsIntelligenceProvider("live");

  assert.ok(provider instanceof DurableOddsIntelligenceProvider);
});

test("degrades to empty history without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const provider = new DurableOddsIntelligenceProvider();
    const response = await provider.getHistory();

    assert.deepEqual(response.history, []);
    assert.deepEqual(response.closings, []);
  } finally {
    if (original !== undefined) {
      process.env.DATABASE_URL = original;
    }
  }
});

test.after(async () => {
  if (hasDatabase) {
    await closeDb();
  }
});
