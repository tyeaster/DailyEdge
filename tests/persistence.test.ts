import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { OddsSnapshotsRepository } from "../src/persistence/repositories/odds-snapshots-repository.ts";
import { PredictionResultsRepository } from "../src/persistence/repositories/prediction-results-repository.ts";
import { PredictionsRepository } from "../src/persistence/repositories/predictions-repository.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "predictions repository round-trips a recorded prediction",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const repository = new PredictionsRepository();
    const predictionId = `test-prediction-${Date.now()}`;

    await repository.record({
      confidence: 0.62,
      edgePercent: 4.5,
      expectedValuePercent: 6.1,
      fairOdds: -140,
      gameId: "test-game-1",
      market: "moneyline",
      modelId: "prediction-engine-v1",
      modelProbability: 0.58,
      odds: -120,
      predictionId,
      recommendation: "Play",
      sportsbook: "OddsPipe",
      timestamp: new Date().toISOString(),
    });

    const found = await repository.findById(predictionId);

    assert.ok(found);
    assert.equal(found?.gameId, "test-game-1");
    assert.equal(found?.market, "moneyline");
    assert.equal(found?.recommendation, "Play");

    const byGame = await repository.findByGameId("test-game-1");

    assert.ok(byGame.some((p) => p.predictionId === predictionId));
  },
);

test(
  "prediction results repository round-trips a recorded result",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const repository = new PredictionResultsRepository();
    const predictionId = `test-result-${Date.now()}`;

    await repository.record({
      gameId: "test-game-2",
      market: "moneyline",
      moneylineWinnerTeamId: "team-lad",
      outcome: "win",
      predictionId,
      recordedAt: new Date().toISOString(),
    });

    const found = await repository.findByPredictionId(predictionId);

    assert.ok(found);
    assert.equal(found?.outcome, "win");
    assert.equal(found?.moneylineWinnerTeamId, "team-lad");
  },
);

test(
  "odds snapshots repository records and lists history for a record",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const repository = new OddsSnapshotsRepository();
    const recordId = `test-odds-${Date.now()}`;

    await repository.recordSnapshot(
      "oddspipe",
      [
        {
          americanOdds: -110,
          eventId: "test-event-1",
          homeTeam: "Dodgers",
          awayTeam: "Giants",
          id: recordId,
          impliedProbability: 0.524,
          market: "moneyline",
          selection: "Dodgers",
          side: "home",
          sportsbook: "OddsPipe",
          updatedAt: new Date().toISOString(),
        },
      ],
      new Date("2026-07-01T00:00:00Z"),
    );

    await repository.recordSnapshot(
      "oddspipe",
      [
        {
          americanOdds: -125,
          eventId: "test-event-1",
          homeTeam: "Dodgers",
          awayTeam: "Giants",
          id: recordId,
          impliedProbability: 0.556,
          market: "moneyline",
          selection: "Dodgers",
          side: "home",
          sportsbook: "OddsPipe",
          updatedAt: new Date().toISOString(),
        },
      ],
      new Date("2026-07-01T01:00:00Z"),
    );

    const history = await repository.findHistory("oddspipe", recordId);

    assert.equal(history.length, 2);
    assert.equal(history[0].americanOdds, -110);
    assert.equal(history[1].americanOdds, -125);
  },
);

test.after(async () => {
  if (hasDatabase) {
    await closeDb();
  }
});
