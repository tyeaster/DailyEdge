import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { PredictionResultsRepository } from "../src/persistence/repositories/prediction-results-repository.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";
import {
  DurableHistoricalSlateProvider,
  getConfiguredHistoricalSlateProvider,
} from "../src/services/backtesting/providers.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "groups real predictions and results into a daily slate",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-slate-${Date.now()}`;
    const predictionId = `${gameId}-prediction`;
    const timestamp = "2026-06-25T16:00:00.000Z";

    await new PredictionsRepository().record({
      confidence: 68,
      edgePercent: 5,
      expectedValuePercent: 6,
      fairOdds: -140,
      gameId,
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.6,
      odds: -125,
      predictionId,
      recommendation: "Play",
      teamId: "mlb-team-119",
      timestamp,
    });

    await new PredictionResultsRepository().record({
      gameId,
      market: "moneyline",
      moneylineWinnerTeamId: "mlb-team-119",
      outcome: "win",
      predictionId,
      recordedAt: new Date().toISOString(),
    });

    const provider = new DurableHistoricalSlateProvider();
    const response = await provider.getSlates();

    assert.equal(response.mode, "live");

    const slate = response.slates.find((s) => s.date === "2026-06-25");

    assert.ok(slate);
    assert.ok(
      slate?.calibrationRecords.predictions.some((p) => p.predictionId === predictionId),
    );
    assert.ok(
      slate?.calibrationRecords.results.some((r) => r.predictionId === predictionId),
    );
  },
);

test("getConfiguredHistoricalSlateProvider(\"live\") returns a DurableHistoricalSlateProvider", () => {
  const provider = getConfiguredHistoricalSlateProvider("live");

  assert.ok(provider instanceof DurableHistoricalSlateProvider);
});

test("degrades to empty slates without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const provider = new DurableHistoricalSlateProvider();
    const response = await provider.getSlates();

    assert.deepEqual(response.slates, []);
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
