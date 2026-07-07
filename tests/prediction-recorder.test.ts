import assert from "node:assert/strict";
import test from "node:test";

import type { PredictionResult } from "../src/models/mlb.ts";
import { closeDb } from "../src/persistence/client.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";
import { recordMoneylinePredictions } from "../src/services/PredictionRecorder.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

function buildPrediction(gameId: string): PredictionResult {
  return {
    confidenceScore: 71,
    edgePercent: 4.2,
    expectedValuePercent: 5.8,
    gameId,
    predictionVersion: "prediction-engine-v1",
    recommendation: "Play",
    selectedFairMoneyline: -135,
    selectedTeamId: "mlb-team-119",
    selectedWinProbability: 0.58,
    sportsbook: "OddsPipe",
    sportsbookMoneyline: -120,
  } as unknown as PredictionResult;
}

test(
  "records moneyline predictions to the predictions table",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-prediction-game-${Date.now()}`;

    await recordMoneylinePredictions([buildPrediction(gameId)]);

    const repository = new PredictionsRepository();
    const found = await repository.findByGameId(gameId);

    assert.equal(found.length, 1);
    assert.equal(found[0].market, "moneyline");
    assert.equal(found[0].teamId, "mlb-team-119");
    assert.equal(found[0].modelId, "prediction-engine-v1");
    assert.equal(found[0].recommendation, "Play");
  },
);

test(
  "is idempotent per game - a second call does not duplicate or overwrite",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-prediction-idempotent-${Date.now()}`;

    await recordMoneylinePredictions([buildPrediction(gameId)]);
    await recordMoneylinePredictions([
      { ...buildPrediction(gameId), recommendation: "Strong Play" } as PredictionResult,
    ]);

    const repository = new PredictionsRepository();
    const found = await repository.findByGameId(gameId);

    assert.equal(found.length, 1);
    assert.equal(found[0].recommendation, "Play");
  },
);

test("never throws even without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    await assert.doesNotReject(() =>
      recordMoneylinePredictions([buildPrediction("test-no-db")]),
    );
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
