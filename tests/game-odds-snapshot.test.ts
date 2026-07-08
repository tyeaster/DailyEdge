import assert from "node:assert/strict";
import test from "node:test";

import type { Game } from "../src/models/mlb.ts";
import { closeDb } from "../src/persistence/client.ts";
import { OddsSnapshotsRepository } from "../src/persistence/repositories/odds-snapshots-repository.ts";
import { recordGameOddsSnapshots } from "../src/services/OddsSnapshotRecorder.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

function buildGame(gameId: string, price: number): Game {
  return {
    id: gameId,
    odds: {
      moneyline: {
        displayLine: `${price > 0 ? "+" : ""}${price}`,
        id: `odds-${gameId}-moneyline`,
        line: 0,
        market: "moneyline",
        movement: "steady",
        price,
        sportsbook: "OddsPipe",
      },
    },
  } as unknown as Game;
}

test(
  "records a game-scoped moneyline snapshot with gameId populated",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-game-odds-${Date.now()}`;

    await recordGameOddsSnapshots([buildGame(gameId, -125)], "live");

    const repository = new OddsSnapshotsRepository();
    const history = await repository.findHistoryByGame(gameId, "moneyline");

    assert.equal(history.length, 1);
    assert.equal(history[0].americanOdds, -125);
    assert.equal(history[0].gameId, gameId);
  },
);

test(
  "does nothing for mock data source, even with a database configured",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const gameId = `test-game-odds-mock-${Date.now()}`;

    await recordGameOddsSnapshots([buildGame(gameId, -110)], "mock");

    const repository = new OddsSnapshotsRepository();
    const history = await repository.findHistoryByGame(gameId, "moneyline");

    assert.equal(history.length, 0);
  },
);

test("never throws even without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    await assert.doesNotReject(() =>
      recordGameOddsSnapshots([buildGame("test-no-db", -110)], "live"),
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
