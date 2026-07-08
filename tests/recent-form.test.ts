import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type {
  RecentFormWindow,
  RecentFormWindowStats,
  Team,
} from "../src/models/mlb.ts";
import {
  MLBRecentFormProvider,
  normalizeMlbRecentForm,
} from "../src/providers/recent-form/MLBRecentFormProvider.ts";
import { MockRecentFormProvider } from "../src/providers/recent-form/MockRecentFormProvider.ts";
import { ReplayRecentFormProvider } from "../src/providers/recent-form/ReplayRecentFormProvider.ts";
import type {
  RecentFormProvider,
  RecentFormProviderResponse,
  RecentFormRequest,
} from "../src/providers/recent-form/RecentFormProvider.ts";
import {
  buildTeamRecentForm,
  calculateMomentumScore,
  calculateRecentFormRating,
  calculateRecentFormWindow,
  createUnavailableRecentForm,
} from "../src/providers/recent-form/rating.ts";
import { RecentFormService } from "../src/services/RecentFormService.ts";

const recentStatsRaw = {
  stats: [
    {
      group: { displayName: "hitting" },
      splits: [
        {
          stat: {
            avg: ".271",
            gamesPlayed: 7,
            ops: ".821",
            runs: 42,
          },
          team: { id: 119 },
        },
      ],
    },
    {
      group: { displayName: "pitching" },
      splits: [
        {
          stat: {
            era: "3.21",
            gamesPlayed: 7,
            losses: 2,
            runs: 24,
            whip: "1.12",
            wins: 5,
          },
          team: { id: 119 },
        },
      ],
    },
  ],
};

test("normalizes MLB recent-form metrics and ratings", () => {
  const recentForm = normalizeMlbRecentForm({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    rawByWindow: {
      7: recentStatsRaw,
      14: recentStatsRaw,
      30: recentStatsRaw,
    },
    source: "live",
  });
  const lastSeven = recentForm.windows[7];

  assert.equal(lastSeven.gamesPlayed, 7);
  assert.equal(lastSeven.wins, 5);
  assert.equal(lastSeven.losses, 2);
  assert.equal(lastSeven.winPercentage, 5 / 7);
  assert.equal(lastSeven.runsPerGame, 6);
  assert.equal(Number(lastSeven.runsAllowedPerGame.toFixed(3)), 3.429);
  assert.equal(lastSeven.runDifferential, 18);
  assert.equal(lastSeven.ops, 0.821);
  assert.equal(lastSeven.battingAverage, 0.271);
  assert.equal(lastSeven.era, 3.21);
  assert.equal(lastSeven.whip, 1.12);
  assert.ok(lastSeven.rating.value > 70);
  assert.ok(recentForm.rating.value > 70);
});

test("momentum rewards underlying short-window improvement", () => {
  const windows = buildWindows({
    baselineEra: 4.4,
    baselineOps: 0.72,
    baselineWhip: 1.34,
    shortEra: 3.1,
    shortOps: 0.82,
    shortWhip: 1.12,
  });
  const improving = calculateMomentumScore(windows);
  const declining = calculateMomentumScore(
    buildWindows({
      baselineEra: 3.1,
      baselineOps: 0.82,
      baselineWhip: 1.12,
      shortEra: 4.4,
      shortOps: 0.72,
      shortWhip: 1.34,
    }),
  );

  assert.ok(improving.value > 50);
  assert.ok(improving.value > declining.value);
});

test("missing recent-form data remains neutral", () => {
  const recentForm = createUnavailableRecentForm(
    "2026-06-24T12:00:00.000Z",
  );

  assert.equal(recentForm.rating.value, 50);
  assert.equal(recentForm.rating.available, false);
  assert.equal(recentForm.momentum.value, 50);
  assert.equal(recentForm.momentum.available, false);
  assert.equal(recentForm.windows[7].available, false);
});

test("live provider shares exact 7, 14, and 30-game team requests", async () => {
  const requestedUrls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    return new Response(JSON.stringify(recentStatsRaw), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  const provider = new MLBRecentFormProvider(
    "https://stats.example.test/api/v1",
    fetcher,
  );
  const response = await provider.getRecentForm({
    asOfDate: "2026-06-24",
    season: 2026,
    teamId: 119,
  });
  await provider.getRecentForm({
    asOfDate: "2026-06-24",
    season: 2026,
    teamId: 121,
  });

  assert.equal(response.mode, "live");
  assert.equal(requestedUrls.length, 9);
  assert.ok(
    requestedUrls.every(
      (url) =>
        url.includes("/teams/stats") &&
        url.includes("stats=lastXGames") &&
        url.includes("group=hitting%2Cpitching"),
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      ["7", "14", "30"].map((limit) => [
        limit,
        requestedUrls.filter(
          (url) => new URL(url).searchParams.get("limit") === limit,
        ).length,
      ]),
    ),
    { 7: 5, 14: 3, 30: 1 },
  );
  assert.equal(response.recentForm?.windows[7].wins, 5);
});

test("mock and replay modes return normalized recent form without live requests", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-recent-form-replay-"),
  );
  const recentForm = buildRecentForm();
  const request = {
    asOfDate: "2026-06-24",
    fallbackRecentForm: recentForm,
    season: 2026,
    teamId: 119,
  };
  const mockResponse = await new MockRecentFormProvider().getRecentForm(
    request,
  );
  const replayProvider = new ReplayRecentFormProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      provider: "mlb-recent-form",
      rawByWindow: { 7: recentStatsRaw, 14: recentStatsRaw, 30: recentStatsRaw },
      recentForm,
      request,
    });
    const replayResponse = await replayProvider.getRecentForm(request);

    assert.equal(mockResponse.mode, "mock");
    assert.deepEqual(mockResponse.recentForm, recentForm);
    assert.equal(replayResponse.mode, "replay");
    assert.equal(replayResponse.recentForm?.source, "replay");
    assert.equal(replayResponse.recentForm?.rating.value, recentForm.rating.value);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("recent-form service caches repeated team-date lookups", async () => {
  let calls = 0;
  const recentForm = buildRecentForm();
  const provider: RecentFormProvider = {
    id: "test-recent-form",
    async getRecentForm(
      request: RecentFormRequest,
    ): Promise<RecentFormProviderResponse> {
      calls += 1;

      return {
        fetchedAt: "2026-06-24T12:00:00.000Z",
        mode: "live",
        provider: "test-recent-form",
        recentForm,
        season: request.season,
        teamId: request.teamId,
      };
    },
  };
  const service = new RecentFormService(provider, new MemoryCache());
  const team: Team = {
    abbreviation: "LAD",
    city: "Los Angeles",
    division: "West",
    externalIds: { mlb: 119 },
    id: "mlb-team-119",
    league: "NL",
    name: "Dodgers",
  };

  const first = await service.enrichTeam(team, 2026, "2026-06-24");
  const second = await service.enrichTeam(team, 2026, "2026-06-24");

  assert.equal(calls, 1);
  assert.equal(first.recentForm?.windows[7].wins, 5);
  assert.equal(second.recentForm?.source, "live");
});

function buildRecentForm() {
  const windows = buildWindows({
    baselineEra: 4.1,
    baselineOps: 0.74,
    baselineWhip: 1.3,
    shortEra: 3.21,
    shortOps: 0.821,
    shortWhip: 1.12,
  });

  return buildTeamRecentForm({
    fetchedAt: "2026-06-24T12:00:00.000Z",
    source: "live",
    windows,
  });
}

function buildWindows({
  baselineEra,
  baselineOps,
  baselineWhip,
  shortEra,
  shortOps,
  shortWhip,
}: {
  baselineEra: number;
  baselineOps: number;
  baselineWhip: number;
  shortEra: number;
  shortOps: number;
  shortWhip: number;
}) {
  const windows = {
    7: calculateRecentFormWindow({
      battingAverage: 0.27,
      era: shortEra,
      gamesPlayed: 7,
      losses: 2,
      ops: shortOps,
      runsAllowed: 24,
      runsScored: 42,
      whip: shortWhip,
      wins: 5,
      window: 7,
    }),
    14: calculateRecentFormWindow({
      battingAverage: 0.255,
      era: (shortEra + baselineEra) / 2,
      gamesPlayed: 14,
      losses: 6,
      ops: (shortOps + baselineOps) / 2,
      runsAllowed: 58,
      runsScored: 72,
      whip: (shortWhip + baselineWhip) / 2,
      wins: 8,
      window: 14,
    }),
    30: calculateRecentFormWindow({
      battingAverage: 0.245,
      era: baselineEra,
      gamesPlayed: 30,
      losses: 15,
      ops: baselineOps,
      runsAllowed: 126,
      runsScored: 132,
      whip: baselineWhip,
      wins: 15,
      window: 30,
    }),
  } satisfies Record<RecentFormWindow, RecentFormWindowStats>;

  assert.equal(calculateRecentFormRating(windows).available, true);

  return windows;
}
