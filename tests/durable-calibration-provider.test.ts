import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";
import {
  DurableCalibrationProvider,
  getConfiguredCalibrationProvider,
} from "../src/services/calibration/providers.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "reads real recorded predictions from Postgres",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-durable-calibration-${Date.now()}`;

    await new PredictionsRepository().record({
      confidence: 65,
      edgePercent: 3,
      expectedValuePercent: 4,
      fairOdds: -120,
      gameId,
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.55,
      odds: -110,
      predictionId: `${gameId}-prediction`,
      recommendation: "Lean",
      teamId: "mlb-team-119",
      timestamp: new Date().toISOString(),
    });

    const provider = new DurableCalibrationProvider();
    const history = await provider.getHistory();

    assert.equal(history.mode, "live");
    assert.equal(history.provider, "calibration-durable");
    assert.ok(history.predictions.some((p) => p.gameId === gameId));
  },
);

test("getConfiguredCalibrationProvider(\"live\") returns a DurableCalibrationProvider", () => {
  const provider = getConfiguredCalibrationProvider("live");

  assert.ok(provider instanceof DurableCalibrationProvider);
});

test("degrades to empty history without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const provider = new DurableCalibrationProvider();
    const history = await provider.getHistory();

    assert.deepEqual(history.predictions, []);
    assert.deepEqual(history.results, []);
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
