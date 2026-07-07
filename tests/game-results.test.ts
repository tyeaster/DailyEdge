import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { GameResultsRepository } from "../src/persistence/repositories/game-results-repository.ts";
import { normalizeMlbScheduleResults } from "../src/providers/game-results/MLBGameResultsProvider.ts";
import { MockGameResultsProvider } from "../src/providers/game-results/MockGameResultsProvider.ts";
import { ingestGameResults } from "../src/services/GameResultsService.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test("MockGameResultsProvider returns deterministic completed games", async () => {
  const provider = new MockGameResultsProvider();
  const response = await provider.getResults({ date: "2026-06-20" });

  assert.equal(response.mode, "mock");
  assert.equal(response.results.length, 2);
  assert.equal(response.results[0].winningTeamId, "mlb-team-119");
});

test("normalizeMlbScheduleResults extracts final scores and skips unfinished games", () => {
  const results = normalizeMlbScheduleResults({
    dates: [
      {
        games: [
          {
            gameDate: "2026-06-20T23:10:00Z",
            gamePk: 746789,
            status: { abstractGameState: "Final" },
            teams: {
              away: { score: 3, team: { id: 137 } },
              home: { score: 5, team: { id: 119 } },
            },
          },
          {
            gameDate: "2026-06-20T20:10:00Z",
            gamePk: 746790,
            status: { abstractGameState: "Live" },
            teams: {
              away: { team: { id: 147 } },
              home: { team: { id: 111 } },
            },
          },
        ],
      },
    ],
  });

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    awayScore: 3,
    awayTeamId: "mlb-team-137",
    completedAt: "2026-06-20T23:10:00Z",
    gameId: "game-746789",
    homeScore: 5,
    homeTeamId: "mlb-team-119",
    winningTeamId: "mlb-team-119",
  });
});

test("normalizeMlbScheduleResults falls back to linescore runs when direct score is missing", () => {
  const results = normalizeMlbScheduleResults({
    dates: [
      {
        games: [
          {
            gameDate: "2026-06-20T23:10:00Z",
            gamePk: 746791,
            linescore: { teams: { away: { runs: 2 }, home: { runs: 4 } } },
            status: { abstractGameState: "Final" },
            teams: {
              away: { team: { id: 137 } },
              home: { team: { id: 119 } },
            },
          },
        ],
      },
    ],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].awayScore, 2);
  assert.equal(results[0].homeScore, 4);
});

test(
  "ingestGameResults persists mock results to game_results",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const provider = new MockGameResultsProvider();
    const { recorded } = await ingestGameResults({ date: "2026-06-20" }, provider);

    assert.equal(recorded, 2);

    const repository = new GameResultsRepository();
    const stored = await repository.findByGameId("game-mock-1");

    assert.ok(stored);
    assert.equal(stored?.homeScore, 5);
    assert.equal(stored?.winningTeamId, "mlb-team-119");
  },
);

test("ingestGameResults no-ops without a database instead of throwing", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const provider = new MockGameResultsProvider();
    const result = await ingestGameResults({ date: "2026-06-20" }, provider);

    assert.equal(result.recorded, 0);
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
