import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Team } from "../src/models/mlb.ts";
import {
  calculateBullpenRating,
  calculateOffensiveRating,
  calculateOverallTeamRating,
  calculatePitchingRating,
  MLBTeamStrengthProvider,
  normalizeMlbTeamStrength,
} from "../src/providers/team-strength/MLBTeamStrengthProvider.ts";
import { MockTeamStrengthProvider } from "../src/providers/team-strength/MockTeamStrengthProvider.ts";
import { ReplayTeamStrengthProvider } from "../src/providers/team-strength/ReplayTeamStrengthProvider.ts";
import type {
  TeamStrengthProvider,
  TeamStrengthProviderResponse,
  TeamStrengthRequest,
} from "../src/providers/team-strength/TeamStrengthProvider.ts";
import { TeamStrengthService } from "../src/services/TeamStrengthService.ts";

const hittingRaw = {
  stats: [
    {
      splits: [
        {
          stat: {
            atBats: 2685,
            avg: ".261",
            baseOnBalls: 328,
            gamesPlayed: 80,
            ops: ".783",
            plateAppearances: 3085,
            runs: 419,
            strikeOuts: 633,
          },
        },
      ],
    },
  ],
};

const pitchingRaw = {
  stats: [
    {
      splits: [
        {
          stat: {
            era: "3.42",
            gamesPlayed: 80,
            runs: 276,
            whip: "1.10",
          },
        },
      ],
    },
  ],
};

test("normalizes MLB team statistics and calculates ratings", () => {
  const strength = normalizeMlbTeamStrength({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    hittingRaw,
    pitchingRaw,
    source: "live",
  });

  assert.ok(strength);
  assert.equal(strength.offense.runsPerGame, 5.2375);
  assert.equal(strength.offense.ops, 0.783);
  assert.equal(strength.offense.battingAverage, 0.261);
  assert.equal(Number(strength.offense.strikeoutRate.toFixed(3)), 0.205);
  assert.equal(Number(strength.offense.walkRate.toFixed(3)), 0.106);
  assert.equal(strength.offense.value, 70);
  assert.equal(Number(strength.pitching.runsAllowedPerGame.toFixed(2)), 3.45);
  assert.equal(strength.pitching.era, 3.42);
  assert.equal(strength.pitching.whip, 1.1);
  assert.equal(strength.pitching.value, 85);
  assert.equal(strength.overall.runDifferential, 143);
  assert.equal(strength.overall.value, 81);
  assert.equal(strength.bullpen.available, false);
});

test("rating calculators return neutral values for missing data", () => {
  const offense = calculateOffensiveRating(undefined);
  const pitching = calculatePitchingRating(undefined);
  const bullpen = calculateBullpenRating();
  const overall = calculateOverallTeamRating({
    bullpen,
    offense,
    pitching,
    runDifferential: 0,
  });

  assert.equal(offense.value, 50);
  assert.equal(pitching.value, 50);
  assert.equal(bullpen.value, 50);
  assert.equal(bullpen.available, false);
  assert.equal(overall.value, 50);
  assert.equal(overall.available, false);
});

test("live provider requests hitting and pitching season stats", async () => {
  const requestedUrls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    return new Response(
      JSON.stringify(url.includes("group=hitting") ? hittingRaw : pitchingRaw),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  };
  const provider = new MLBTeamStrengthProvider(
    "https://stats.example.test/teams",
    fetcher,
  );
  const response = await provider.getTeamStrength({
    season: 2026,
    teamId: 119,
  });

  assert.equal(response.mode, "live");
  assert.equal(response.strength?.overall.value, 81);
  assert.equal(requestedUrls.length, 2);
  assert.ok(requestedUrls.every((url) => url.includes("/119/stats")));
  assert.ok(requestedUrls.every((url) => url.includes("season=2026")));
});

test("mock provider returns supplied normalized team strength", async () => {
  const strength = normalizeMlbTeamStrength({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    hittingRaw,
    pitchingRaw,
    source: "mock",
  });
  const response = await new MockTeamStrengthProvider().getTeamStrength({
    fallbackStrength: strength,
    season: 2026,
    teamId: 119,
  });

  assert.equal(response.mode, "mock");
  assert.deepEqual(response.strength, strength);
});

test("replay provider reads recorded normalized team strength", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-team-strength-replay-"),
  );
  const provider = new ReplayTeamStrengthProvider(replayDir);
  const strength = normalizeMlbTeamStrength({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    hittingRaw,
    pitchingRaw,
    source: "live",
  });

  try {
    await provider.writeReplay({
      hittingRaw,
      pitchingRaw,
      provider: "mlb-team-stats",
      request: { season: 2026, teamId: 119 },
      strength,
    });

    const response = await provider.getTeamStrength({
      season: 2026,
      teamId: 119,
    });

    assert.equal(response.mode, "replay");
    assert.equal(response.strength?.source, "replay");
    assert.equal(response.strength?.overall.value, 81);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("team strength service caches repeated team-season lookups", async () => {
  let calls = 0;
  const strength = normalizeMlbTeamStrength({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    hittingRaw,
    pitchingRaw,
    source: "live",
  });
  const provider: TeamStrengthProvider = {
    id: "test-team-strength",
    async getTeamStrength(
      request: TeamStrengthRequest,
    ): Promise<TeamStrengthProviderResponse> {
      calls += 1;

      return {
        fetchedAt: "2026-06-24T12:00:00.000Z",
        mode: "live",
        provider: "test-team-strength",
        season: request.season,
        strength,
        teamId: request.teamId,
      };
    },
  };
  const service = new TeamStrengthService(provider, new MemoryCache());
  const team: Team = {
    abbreviation: "LAD",
    city: "Los Angeles",
    division: "West",
    externalIds: { mlb: 119 },
    id: "mlb-team-119",
    league: "NL",
    name: "Dodgers",
  };

  const first = await service.enrichTeam(team, 2026);
  const second = await service.enrichTeam(team, 2026);

  assert.equal(calls, 1);
  assert.equal(first.strength?.offense.value, 70);
  assert.equal(second.strength?.overall.value, 81);
  assert.equal(second.strength?.source, "live");
});
