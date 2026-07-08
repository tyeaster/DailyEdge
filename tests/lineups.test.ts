import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Game, Team } from "../src/models/mlb.ts";
import {
  MLBLineupProvider,
  normalizeMlbLineup,
} from "../src/providers/lineups/MLBLineupProvider.ts";
import { MockLineupProvider } from "../src/providers/lineups/MockLineupProvider.ts";
import { ReplayLineupProvider } from "../src/providers/lineups/ReplayLineupProvider.ts";
import type {
  LineupProvider,
  LineupProviderResponse,
  LineupRequest,
} from "../src/providers/lineups/LineupProvider.ts";
import {
  buildLineupProfile,
  calculateContactRating,
  calculatePowerRating,
  createUnavailableLineup,
  type LineupPlayerInput,
} from "../src/providers/lineups/rating.ts";
import { LineupService } from "../src/services/LineupService.ts";

const previousHomeIds = [101, 102, 103, 104, 105, 106, 107, 108, 109];
const confirmedHomeIds = [101, 102, 103, 104, 105, 106, 107, 108, 110];
const awayIds = [201, 202, 203, 204, 205, 206, 207, 208, 209];
const currentScheduleRaw = buildScheduleRaw({
  awayIds,
  gameId: 9001,
  homeIds: confirmedHomeIds,
});
const projectedScheduleRaw = buildScheduleRaw({
  awayIds,
  gameId: 8999,
  homeIds: previousHomeIds,
});
const emptyCurrentScheduleRaw = buildScheduleRaw({
  awayIds: [],
  gameId: 9001,
  homeIds: [],
});
const homeRosterRaw = buildRosterRaw([
  ...previousHomeIds,
  110,
  111,
]);
const awayRosterRaw = buildRosterRaw(awayIds);

test("normalizes confirmed lineups with batting order and team metrics", () => {
  const lineup = normalizeMlbLineup({
    currentScheduleRaw,
    fetchedAt: "2026-06-25T18:00:00.000Z",
    gameId: 9001,
    recentScheduleRaw: projectedScheduleRaw,
    rosterRaw: homeRosterRaw,
    source: "live",
    teamId: 119,
  });

  assert.equal(lineup.status, "confirmed");
  assert.equal(lineup.lineupConfidence, 100);
  assert.equal(lineup.players.length, 9);
  assert.deepEqual(
    lineup.players.map((player) => player.battingOrder),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(lineup.players[0].battingHand, "L");
  assert.equal(lineup.players[0].isStarting, true);
  assert.equal(lineup.players[0].isPinchHitter, false);
  assert.deepEqual(lineup.missingStarterIds, [109]);
  assert.ok(lineup.averageOps > 0);
  assert.ok(lineup.contactRating > 0);
  assert.ok(lineup.powerRating > 0);
  assert.ok(lineup.overallStrength > 0);
  assert.equal(lineup.averageWrcPlus, null);
});

test("falls back to the latest official lineup as projected", () => {
  const lineup = normalizeMlbLineup({
    currentScheduleRaw: emptyCurrentScheduleRaw,
    fetchedAt: "2026-06-25T12:00:00.000Z",
    gameId: 9001,
    recentScheduleRaw: projectedScheduleRaw,
    rosterRaw: homeRosterRaw,
    source: "live",
    teamId: 119,
  });

  assert.equal(lineup.status, "projected");
  assert.equal(lineup.lineupConfidence, 65);
  assert.deepEqual(
    lineup.players.map((player) => player.mlbId),
    previousHomeIds,
  );
  assert.deepEqual(lineup.missingStarterIds, []);
});

test("lineup rating utilities remain neutral with missing data", () => {
  const unavailable = createUnavailableLineup(
    "2026-06-25T12:00:00.000Z",
  );
  const unknownPlayers = Array.from({ length: 9 }, (_, index) => ({
    battingAverage: 0,
    battingHand: "U" as const,
    battingOrder: index + 1,
    fullName: `Unknown Player ${index + 1}`,
    homeRuns: 0,
    mlbId: 300 + index,
    onBasePercentage: 0,
    ops: 0,
    plateAppearances: 0,
    position: "DH",
    sluggingPercentage: 0,
    strikeoutRate: 0,
  }));
  const confirmedWithoutStats = buildLineupProfile({
    baselinePlayerIds: unknownPlayers.map((player) => player.mlbId),
    fetchedAt: "2026-06-25T12:00:00.000Z",
    players: unknownPlayers,
    rosterPlayers: unknownPlayers,
    source: "live",
    status: "confirmed",
  });

  assert.equal(calculateContactRating([]), 50);
  assert.equal(calculatePowerRating([]), 50);
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.overallStrength, 50);
  assert.equal(unavailable.lineupConfidence, 0);
  assert.equal(confirmedWithoutStats.contactRating, 50);
  assert.equal(confirmedWithoutStats.powerRating, 50);
  assert.equal(confirmedWithoutStats.overallStrength, 50);
});

test("live provider shares schedule requests and caches roster responses", async () => {
  const requestedUrls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requestedUrls.push(url.toString());

    if (url.pathname.endsWith("/schedule")) {
      const startDate = url.searchParams.get("startDate");

      return new Response(
        JSON.stringify(
          startDate === "2026-06-25"
            ? currentScheduleRaw
            : projectedScheduleRaw,
        ),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify(
        url.pathname.includes("/119/") ? homeRosterRaw : awayRosterRaw,
      ),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  };
  const provider = new MLBLineupProvider(
    "https://stats.example.test/api/v1",
    fetcher,
  );
  const home = await provider.getLineup({
    asOfDate: "2026-06-25",
    gameId: 9001,
    season: 2026,
    teamId: 119,
  });
  const away = await provider.getLineup({
    asOfDate: "2026-06-25",
    gameId: 9001,
    season: 2026,
    teamId: 121,
  });

  assert.equal(requestedUrls.length, 4);
  assert.equal(
    requestedUrls.filter((url) => url.includes("/schedule?")).length,
    2,
  );
  assert.ok(requestedUrls.every((url) => !url.includes("wrc")));
  assert.equal(home.lineup?.status, "confirmed");
  assert.equal(away.lineup?.status, "confirmed");
});

test("mock and replay providers mirror the live lineup contract", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-lineup-replay-"),
  );
  const lineup = normalizeMlbLineup({
    currentScheduleRaw,
    fetchedAt: "2026-06-25T18:00:00.000Z",
    gameId: 9001,
    recentScheduleRaw: projectedScheduleRaw,
    rosterRaw: homeRosterRaw,
    source: "live",
    teamId: 119,
  });
  const request = {
    asOfDate: "2026-06-25",
    fallbackLineup: lineup,
    gameId: 9001,
    season: 2026,
    teamId: 119,
  };
  const mock = await new MockLineupProvider().getLineup(request);
  const replayProvider = new ReplayLineupProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      currentScheduleRaw,
      lineup,
      provider: "mlb-lineups",
      recentScheduleRaw: projectedScheduleRaw,
      request,
      rosterRaw: homeRosterRaw,
    });
    const replay = await replayProvider.getLineup(request);

    assert.equal(mock.mode, "mock");
    assert.deepEqual(mock.lineup, lineup);
    assert.equal(replay.mode, "replay");
    assert.equal(replay.lineup?.source, "replay");
    assert.equal(replay.lineup?.players.length, 9);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("repository replay fixture runs without a network request", async () => {
  const replay = await new ReplayLineupProvider(
    path.resolve("replay/lineups"),
  ).getLineup({
    asOfDate: "2026-06-25",
    gameId: 9001,
    season: 2026,
    teamId: 119,
  });

  assert.equal(replay.mode, "replay");
  assert.equal(replay.lineup?.status, "projected");
  assert.equal(replay.lineup?.players.length, 9);
  assert.equal(replay.lineup?.source, "replay");
});

test("lineup service caches repeated game-team lookups", async () => {
  let calls = 0;
  const lineup = createTestProfile("projected");
  const provider: LineupProvider = {
    id: "test-lineup",
    async getLineup(
      request: LineupRequest,
    ): Promise<LineupProviderResponse> {
      calls += 1;

      return {
        fetchedAt: "2026-06-25T12:00:00.000Z",
        gameId: request.gameId,
        lineup,
        mode: "live",
        provider: "test-lineup",
        season: request.season,
        teamId: request.teamId,
      };
    },
  };
  const service = new LineupService(provider, new MemoryCache());
  const team = buildTeam();
  const game = buildGame();
  const first = await service.enrichTeam(team, game, 2026, "2026-06-25");
  const second = await service.enrichTeam(team, game, 2026, "2026-06-25");

  assert.equal(calls, 1);
  assert.equal(first.lineup?.status, "projected");
  assert.equal(second.lineup?.source, "live");
});

function buildScheduleRaw({
  awayIds: gameAwayIds,
  gameId,
  homeIds: gameHomeIds,
}: {
  awayIds: number[];
  gameId: number;
  homeIds: number[];
}) {
  return {
    dates: [
      {
        games: [
          {
            gameDate: "2026-06-24T23:10:00.000Z",
            gamePk: gameId,
            lineups: {
              awayPlayers: gameAwayIds.map(buildSchedulePlayer),
              homePlayers: gameHomeIds.map(buildSchedulePlayer),
            },
            status: { abstractGameState: "Preview" },
            teams: {
              away: { team: { id: 121 } },
              home: { team: { id: 119 } },
            },
          },
        ],
      },
    ],
  };
}

function buildSchedulePlayer(id: number) {
  return {
    fullName: `Player ${id}`,
    id,
    primaryPosition: {
      abbreviation: id % 9 === 0 ? "C" : "IF",
    },
  };
}

function buildRosterRaw(ids: number[]) {
  return {
    roster: ids.map((id, index) => ({
      person: {
        batSide: { code: index % 3 === 0 ? "L" : "R" },
        fullName: `Player ${id}`,
        id,
        primaryPosition: { abbreviation: index === 8 ? "C" : "IF" },
        stats: [
          {
            splits: [
              {
                stat: {
                  avg: String(0.235 + index * 0.004),
                  homeRuns: 8 + index * 2,
                  obp: String(0.31 + index * 0.004),
                  ops: String(0.68 + index * 0.02),
                  plateAppearances: 250 + index * 10,
                  slg: String(0.37 + index * 0.015),
                  strikeOuts: 45 + index * 4,
                },
              },
            ],
          },
        ],
      },
      position: { abbreviation: index === 8 ? "C" : "IF" },
    })),
  };
}

function createTestProfile(status: "confirmed" | "projected") {
  const players = previousHomeIds.map((id, index): LineupPlayerInput => ({
    battingAverage: 0.25,
    battingHand: index % 3 === 0 ? "L" : "R",
    battingOrder: index + 1,
    fullName: `Player ${id}`,
    homeRuns: 12,
    mlbId: id,
    onBasePercentage: 0.33,
    ops: 0.75,
    plateAppearances: 300,
    position: "IF",
    sluggingPercentage: 0.42,
    strikeoutRate: 0.21,
  }));

  return buildLineupProfile({
    baselinePlayerIds: previousHomeIds,
    confirmedAt:
      status === "confirmed" ? "2026-06-25T12:00:00.000Z" : undefined,
    fetchedAt: "2026-06-25T12:00:00.000Z",
    players,
    rosterPlayers: players,
    source: "live",
    status,
  });
}

function buildTeam(): Team {
  return {
    abbreviation: "LAD",
    city: "Los Angeles",
    division: "West",
    externalIds: { mlb: 119 },
    id: "mlb-team-119",
    league: "NL",
    name: "Dodgers",
  };
}

function buildGame(): Game {
  return {
    awayPitcherId: "away",
    awayTeamId: "mlb-team-121",
    confidence: { label: "Medium", value: 50 },
    detail: "test",
    externalIds: { mlb: 9001 },
    homePitcherId: "home",
    homeTeamId: "mlb-team-119",
    id: "game-9001",
    modelProbability: 0.5,
    odds: {
      moneyline: {
        displayLine: "Pending",
        id: "ml",
        line: 0,
        market: "moneyline",
        movement: "Flat",
        price: 0,
        sportsbook: "Test",
      },
      spread: {
        displayLine: "Pending",
        id: "spread",
        line: 0,
        market: "spread",
        movement: "Flat",
        price: 0,
        sportsbook: "Test",
      },
      total: {
        displayLine: "8.5",
        id: "total",
        line: 8.5,
        market: "total",
        movement: "Flat",
        price: -110,
        sportsbook: "Test",
      },
    },
    scheduledAt: "2026-06-25T23:10:00.000Z",
    status: "scheduled",
    venue: "Test Park",
    weatherId: "weather",
  };
}
