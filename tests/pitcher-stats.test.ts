import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Pitcher } from "../src/models/mlb.ts";
import {
  MLBPitcherStatsProvider,
  normalizeMlbPitcherStatsResponse,
} from "../src/providers/pitchers/MLBPitcherStatsProvider.ts";
import { MockPitcherStatsProvider } from "../src/providers/pitchers/MockPitcherStatsProvider.ts";
import type {
  PitcherStatsProvider,
  PitcherStatsProviderResponse,
  PitcherStatsRequest,
} from "../src/providers/pitchers/PitcherStatsProvider.ts";
import { ReplayPitcherStatsProvider } from "../src/providers/pitchers/ReplayPitcherStatsProvider.ts";
import { PitcherService } from "../src/services/PitcherService.ts";

const mlbResponse = {
  stats: [
    {
      splits: [
        {
          stat: {
            baseOnBalls: 26,
            battersFaced: 265,
            era: "2.66",
            gamesStarted: 11,
            homeRunsPer9: "0.98",
            inningsPitched: "64.1",
            losses: 2,
            strikeOuts: 63,
            strikeoutsPer9Inn: "8.81",
            walksPer9Inn: "3.64",
            whip: "1.17",
            wins: 3,
          },
        },
      ],
    },
  ],
};

const expectedStats = {
  era: 2.66,
  gamesStarted: 11,
  homeRunsPer9: 0.98,
  inningsPitched: 64.1,
  losses: 2,
  strikeoutRate: (63 / 265) * 100,
  strikeouts: 63,
  strikeoutsPer9: 8.81,
  walksPer9: 3.64,
  whip: 1.17,
  wins: 3,
};

test("normalizes MLB season pitching statistics", () => {
  const stats = normalizeMlbPitcherStatsResponse(mlbResponse);

  assert.deepEqual(stats, expectedStats);
});

test("returns undefined when MLB has no season pitching split", () => {
  assert.equal(normalizeMlbPitcherStatsResponse({ stats: [] }), undefined);
});

test("live provider requests the requested pitcher and season", async () => {
  let requestedUrl = "";
  const fetcher: typeof fetch = async (input) => {
    requestedUrl = String(input);

    return new Response(JSON.stringify(mlbResponse), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  const provider = new MLBPitcherStatsProvider(
    "https://stats.example.test/people",
    fetcher,
  );
  const response = await provider.getPitcherStats({
    pitcherId: 669203,
    season: 2025,
  });

  assert.equal(response.mode, "live");
  assert.deepEqual(response.stats, expectedStats);
  assert.match(requestedUrl, /people\/669203\/stats/);
  assert.match(requestedUrl, /season=2025/);
  assert.match(requestedUrl, /group=pitching/);
});

test("mock provider remains network-free and returns fallback stats", async () => {
  const provider = new MockPitcherStatsProvider();
  const response = await provider.getPitcherStats({
    fallbackStats: expectedStats,
    pitcherId: 669203,
    season: 2025,
  });

  assert.equal(response.mode, "mock");
  assert.deepEqual(response.stats, expectedStats);
});

test("replay provider returns a recorded pitcher response without network access", async () => {
  const replayDir = await mkdtemp(path.join(tmpdir(), "trueline-pitcher-replay-"));
  const provider = new ReplayPitcherStatsProvider(replayDir);

  try {
    await provider.writeReplay({
      pitcherId: 669203,
      provider: "mlb-stats",
      raw: mlbResponse,
      season: 2025,
      stats: expectedStats,
    });

    const response = await provider.getPitcherStats({
      pitcherId: 669203,
      season: 2025,
    });

    assert.equal(response.mode, "replay");
    assert.equal(response.pitcherId, 669203);
    assert.deepEqual(response.stats, expectedStats);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("pitcher service caches repeated pitcher-season lookups", async () => {
  let calls = 0;
  const provider: PitcherStatsProvider = {
    id: "test-pitchers",
    async getPitcherStats(
      request: PitcherStatsRequest,
    ): Promise<PitcherStatsProviderResponse> {
      calls += 1;

      return {
        fetchedAt: "2026-06-23T12:00:00.000Z",
        mode: "live",
        pitcherId: request.pitcherId,
        provider: "test-pitchers",
        season: request.season,
        stats: expectedStats,
      };
    },
  };
  const service = new PitcherService(provider, new MemoryCache());
  const pitcher: Pitcher = {
    arsenal: [],
    bats: "R",
    era: 0,
    externalIds: { mlb: 669203 },
    fullName: "Test Starter",
    handedness: "R",
    id: "mlb-pitcher-669203",
    inningsPitched: 0,
    position: "SP",
    strikeoutRate: 0,
    teamId: "mlb-team-109",
    throws: "R",
    whip: 0,
  };

  const first = await service.enrichPitcher(pitcher, 2025);
  const second = await service.enrichPitcher(pitcher, 2025);

  assert.equal(calls, 1);
  assert.equal(first.era, 2.66);
  assert.equal(second.strikeoutsPer9, 8.81);
  assert.equal(second.statsSource, "live");
});
