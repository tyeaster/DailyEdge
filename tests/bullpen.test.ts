import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Team } from "../src/models/mlb.ts";
import {
  aggregateTeamBullpen,
  MLBBullpenProvider,
  normalizeMlbBullpen,
} from "../src/providers/bullpen/MLBBullpenProvider.ts";
import { MockBullpenProvider } from "../src/providers/bullpen/MockBullpenProvider.ts";
import { ReplayBullpenProvider } from "../src/providers/bullpen/ReplayBullpenProvider.ts";
import type {
  BullpenProvider,
  BullpenProviderResponse,
  BullpenRequest,
} from "../src/providers/bullpen/BullpenProvider.ts";
import {
  calculateBullpenRating,
  createUnavailableBullpen,
} from "../src/providers/bullpen/rating.ts";
import { BullpenService } from "../src/services/BullpenService.ts";

const seasonRaw = buildRaw([
  {
    teamId: 119,
    playerId: 1,
    stat: {
      baseOnBalls: 20,
      battersFaced: 210,
      earnedRuns: 15,
      gamesPlayed: 30,
      hits: 42,
      numberOfPitches: 820,
      outs: 150,
      strikeOuts: 62,
    },
  },
  {
    teamId: 119,
    playerId: 2,
    stat: {
      baseOnBalls: 12,
      battersFaced: 135,
      earnedRuns: 9,
      gamesPlayed: 24,
      hits: 27,
      numberOfPitches: 510,
      outs: 96,
      strikeOuts: 39,
    },
  },
  {
    teamId: 121,
    playerId: 3,
    stat: {
      baseOnBalls: 30,
      battersFaced: 240,
      earnedRuns: 28,
      gamesPlayed: 35,
      hits: 58,
      numberOfPitches: 980,
      outs: 165,
      strikeOuts: 50,
    },
  },
]);

const recentRaw = buildRaw([
  {
    teamId: 119,
    playerId: 1,
    stat: {
      battersFaced: 7,
      gamesPlayed: 2,
      numberOfPitches: 24,
      outs: 6,
    },
  },
  {
    teamId: 119,
    playerId: 2,
    stat: {
      battersFaced: 4,
      gamesPlayed: 1,
      numberOfPitches: 16,
      outs: 3,
    },
  },
]);

test("aggregates bullpen counts before calculating rate statistics", () => {
  const aggregate = aggregateTeamBullpen(seasonRaw, 119);
  const bullpen = normalizeMlbBullpen({
    fetchedAt: "2026-06-25T12:00:00.000Z",
    recentRaw,
    seasonRaw,
    source: "live",
    teamId: 119,
  });

  assert.equal(aggregate.outs, 246);
  assert.equal(aggregate.relieversUsed, 2);
  assert.equal(aggregate.strikeouts, 101);
  assert.equal(bullpen.available, true);
  assert.equal(bullpen.inningsPitched, 82);
  assert.equal(bullpen.era, 2.63);
  assert.equal(bullpen.whip, 1.23);
  assert.equal(bullpen.strikeoutRate, 0.293);
  assert.equal(bullpen.recentInningsPitched, 3);
  assert.equal(bullpen.recentPitches, 40);
  assert.equal(bullpen.relieversUsed, 2);
  assert.ok((bullpen.workloadRating ?? 0) > 70);
});

test("bullpen rating remains neutral when no relief innings are available", () => {
  const bullpen = calculateBullpenRating({
    fetchedAt: "2026-06-25T12:00:00.000Z",
    recent: emptyAggregate(),
    season: emptyAggregate(),
    source: "live",
  });

  assert.deepEqual(
    bullpen,
    createUnavailableBullpen("2026-06-25T12:00:00.000Z"),
  );
});

test("live provider shares season and workload requests across teams", async () => {
  const requestedUrls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    return new Response(
      JSON.stringify(url.includes("byDateRange") ? recentRaw : seasonRaw),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  };
  const provider = new MLBBullpenProvider(
    "https://stats.example.test/api/v1/stats",
    fetcher,
  );
  const first = await provider.getBullpen({
    asOfDate: "2026-06-25",
    season: 2026,
    teamId: 119,
  });
  const second = await provider.getBullpen({
    asOfDate: "2026-06-25",
    season: 2026,
    teamId: 121,
  });

  assert.equal(requestedUrls.length, 2);
  assert.ok(requestedUrls.every((url) => url.includes("position=RP")));
  assert.ok(requestedUrls.every((url) => url.includes("playerPool=ALL")));
  assert.equal(first.bullpen?.source, "live");
  assert.equal(second.bullpen?.available, true);
});

test("mock and replay providers return normalized bullpen data", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-bullpen-replay-"),
  );
  const bullpen = normalizeMlbBullpen({
    fetchedAt: "2026-06-25T12:00:00.000Z",
    recentRaw,
    seasonRaw,
    source: "live",
    teamId: 119,
  });
  const request = {
    asOfDate: "2026-06-25",
    fallbackBullpen: bullpen,
    season: 2026,
    teamId: 119,
  };
  const mockResponse = await new MockBullpenProvider().getBullpen(request);
  const replayProvider = new ReplayBullpenProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      bullpen,
      provider: "mlb-bullpen",
      recentRaw,
      request,
      seasonRaw,
    });
    const replayResponse = await replayProvider.getBullpen(request);

    assert.equal(mockResponse.mode, "mock");
    assert.deepEqual(mockResponse.bullpen, bullpen);
    assert.equal(replayResponse.mode, "replay");
    assert.equal(replayResponse.bullpen?.source, "replay");
    assert.equal(replayResponse.bullpen?.era, 2.63);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("bullpen service caches and enriches team strength", async () => {
  let calls = 0;
  const bullpen = normalizeMlbBullpen({
    fetchedAt: "2026-06-25T12:00:00.000Z",
    recentRaw,
    seasonRaw,
    source: "live",
    teamId: 119,
  });
  const provider: BullpenProvider = {
    id: "test-bullpen",
    async getBullpen(
      request: BullpenRequest,
    ): Promise<BullpenProviderResponse> {
      calls += 1;

      return {
        bullpen,
        fetchedAt: "2026-06-25T12:00:00.000Z",
        mode: "live",
        provider: "test-bullpen",
        season: request.season,
        teamId: request.teamId,
      };
    },
  };
  const service = new BullpenService(provider, new MemoryCache());
  const team = buildTeam();
  const first = await service.enrichTeam(team, 2026, "2026-06-25");
  const second = await service.enrichTeam(team, 2026, "2026-06-25");

  assert.equal(calls, 1);
  assert.equal(first.strength?.bullpen.era, 2.63);
  assert.equal(second.strength?.bullpen.source, "live");
  assert.ok(
    (first.strength?.overall.value ?? 0) >
      (team.strength?.overall.value ?? 0),
  );
});

function buildTeam(): Team {
  return {
    abbreviation: "LAD",
    city: "Los Angeles",
    division: "West",
    externalIds: { mlb: 119 },
    id: "mlb-team-119",
    league: "NL",
    name: "Dodgers",
    strength: {
      bullpen: { available: false, value: 50 },
      fetchedAt: "2026-06-25T12:00:00.000Z",
      offense: {
        available: true,
        battingAverage: 0.26,
        ops: 0.78,
        runsPerGame: 5,
        strikeoutRate: 0.2,
        value: 70,
        walkRate: 0.1,
      },
      overall: { available: true, runDifferential: 80, value: 68 },
      pitching: {
        available: true,
        era: 3.5,
        runsAllowedPerGame: 4,
        value: 72,
        whip: 1.2,
      },
      source: "live",
    },
  };
}

function buildRaw(
  splits: Array<{
    playerId: number;
    stat: Record<string, number>;
    teamId: number;
  }>,
) {
  return {
    stats: [
      {
        splits: splits.map((split) => ({
          player: { id: split.playerId },
          stat: split.stat,
          team: { id: split.teamId },
        })),
      },
    ],
  };
}

function emptyAggregate() {
  return {
    appearances: 0,
    battersFaced: 0,
    earnedRuns: 0,
    hits: 0,
    outs: 0,
    pitches: 0,
    relieversUsed: 0,
    strikeouts: 0,
    walks: 0,
  };
}
