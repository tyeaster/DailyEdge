import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { GameResultsRepository } from "../src/persistence/repositories/game-results-repository.ts";
import { PredictionResultsRepository } from "../src/persistence/repositories/prediction-results-repository.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";
import { reconcileGameResult } from "../src/services/ResultReconciler.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "reconciles a winning moneyline prediction to a win outcome",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-reconcile-win-${Date.now()}`;
    const predictionId = `${gameId}-prediction`;

    await new GameResultsRepository().record({
      awayScore: 3,
      awayTeamId: "mlb-team-137",
      completedAt: new Date().toISOString(),
      gameId,
      homeScore: 5,
      homeTeamId: "mlb-team-119",
      winningTeamId: "mlb-team-119",
    });

    await new PredictionsRepository().record({
      confidence: 70,
      edgePercent: 4,
      expectedValuePercent: 5,
      fairOdds: -130,
      gameId,
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.58,
      odds: -120,
      predictionId,
      recommendation: "Play",
      teamId: "mlb-team-119",
      timestamp: new Date().toISOString(),
    });

    const { reconciled } = await reconcileGameResult(gameId);

    assert.equal(reconciled, 1);

    const result = await new PredictionResultsRepository().findByPredictionId(
      predictionId,
    );

    assert.ok(result);
    assert.equal(result?.outcome, "win");
    assert.equal(result?.moneylineWinnerTeamId, "mlb-team-119");
  },
);

test(
  "reconciles a losing moneyline prediction to a loss outcome",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-reconcile-loss-${Date.now()}`;
    const predictionId = `${gameId}-prediction`;

    await new GameResultsRepository().record({
      awayScore: 6,
      awayTeamId: "mlb-team-147",
      completedAt: new Date().toISOString(),
      gameId,
      homeScore: 2,
      homeTeamId: "mlb-team-111",
      winningTeamId: "mlb-team-147",
    });

    await new PredictionsRepository().record({
      confidence: 60,
      edgePercent: 2,
      expectedValuePercent: 1,
      fairOdds: -110,
      gameId,
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.52,
      odds: -105,
      predictionId,
      recommendation: "Lean",
      teamId: "mlb-team-111",
      timestamp: new Date().toISOString(),
    });

    const { reconciled } = await reconcileGameResult(gameId);

    assert.equal(reconciled, 1);

    const result = await new PredictionResultsRepository().findByPredictionId(
      predictionId,
    );

    assert.equal(result?.outcome, "loss");
  },
);

test(
  "does nothing when no game result exists yet",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const { reconciled } = await reconcileGameResult(
      `test-reconcile-missing-${Date.now()}`,
    );

    assert.equal(reconciled, 0);
  },
);

test("never throws even without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const { reconciled } = await reconcileGameResult("test-no-db");

    assert.equal(reconciled, 0);
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
