import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { OddsSnapshotsRepository } from "../src/persistence/repositories/odds-snapshots-repository.ts";
import { recordOddsSnapshot } from "../src/services/OddsSnapshotRecorder.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test("does nothing for non-live responses even when a database is configured", {
  skip: !hasDatabase && "DATABASE_URL not set",
}, async () => {
  const recordId = `test-mock-${Date.now()}`;

  await recordOddsSnapshot({
    fetchedAt: new Date().toISOString(),
    mode: "mock",
    provider: "mock-provider",
    records: [
      {
        americanOdds: -110,
        id: recordId,
        impliedProbability: 0.524,
        market: "moneyline",
        selection: "Dodgers",
        sportsbook: "MockBook",
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const repository = new OddsSnapshotsRepository();
  const history = await repository.findHistory("mock-provider", recordId);

  assert.equal(history.length, 0);
});

test("records live responses to the odds_snapshots table", {
  skip: !hasDatabase && "DATABASE_URL not set",
}, async () => {
  const recordId = `test-live-${Date.now()}`;

  await recordOddsSnapshot({
    fetchedAt: new Date("2026-07-08T00:00:00Z").toISOString(),
    mode: "live",
    provider: "oddspipe",
    records: [
      {
        americanOdds: -115,
        eventId: "test-event-2",
        homeTeam: "Dodgers",
        awayTeam: "Giants",
        id: recordId,
        impliedProbability: 0.535,
        market: "moneyline",
        selection: "Dodgers",
        side: "home",
        sportsbook: "OddsPipe",
        updatedAt: new Date("2026-07-08T00:00:00Z").toISOString(),
      },
    ],
  });

  const repository = new OddsSnapshotsRepository();
  const history = await repository.findHistory("oddspipe", recordId);

  assert.equal(history.length, 1);
  assert.equal(history[0].americanOdds, -115);
  assert.equal(history[0].market, "moneyline");
});

test("never throws even without a configured database", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    await assert.doesNotReject(() =>
      recordOddsSnapshot({
        fetchedAt: new Date().toISOString(),
        mode: "live",
        provider: "oddspipe",
        records: [],
      }),
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
