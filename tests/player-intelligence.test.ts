import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Pitcher } from "../src/models/mlb.ts";
import {
  MLBBatterGameLogProvider,
  normalizeMlbBatterGameLogResponse,
} from "../src/providers/player-intelligence/MLBBatterGameLogProvider.ts";
import {
  MLBPitcherGameLogProvider,
  normalizeMlbPitcherGameLogResponse,
} from "../src/providers/player-intelligence/MLBPitcherGameLogProvider.ts";
import {
  buildMockBatterLogs,
  MockBatterGameLogProvider,
} from "../src/providers/player-intelligence/MockBatterGameLogProvider.ts";
import {
  buildMockLogs,
  MockPitcherGameLogProvider,
} from "../src/providers/player-intelligence/MockPitcherGameLogProvider.ts";
import { ReplayBatterGameLogProvider } from "../src/providers/player-intelligence/ReplayBatterGameLogProvider.ts";
import { ReplayPitcherGameLogProvider } from "../src/providers/player-intelligence/ReplayPitcherGameLogProvider.ts";
import type {
  BatterGameLogProvider,
  BatterGameLogRequest,
  PitcherGameLogProvider,
  PitcherGameLogRequest,
} from "../src/providers/player-intelligence/index.ts";
import {
  analyzeBatterTrends,
  analyzePitcherTrends,
  buildBatterProfile,
  calculateBatterConsistency,
  calculateBatterRecentForm,
  calculateBatterRollingSummary,
  calculateConsistency,
  calculatePitcherRecentForm,
  calculateRollingSummary,
  PlayerIntelligenceService,
} from "../src/services/player-intelligence/index.ts";

const rawGameLog = {
  people: [
    {
      stats: [
        {
          splits: [
            {
              game: { gameDate: "2026-06-26T18:00:00.000Z" },
              isHome: true,
              isWin: true,
              opponent: { abbreviation: "HOU" },
              stat: {
                airOuts: 8,
                baseOnBalls: 1,
                battersFaced: 27,
                earnedRuns: 1,
                gameScore: 68,
                groundOuts: 9,
                hits: 4,
                inningsPitched: "6.1",
                pitchesThrown: 98,
                strikeOuts: 7,
                wins: 1,
              },
            },
            {
              game: { gameDate: "2026-06-21T00:00:00.000Z" },
              isHome: false,
              isWin: false,
              opponent: { abbreviation: "ATL" },
              stat: {
                airOuts: 7,
                baseOnBalls: 2,
                battersFaced: 24,
                earnedRuns: 2,
                gameScore: 59,
                groundOuts: 8,
                hits: 6,
                inningsPitched: "5.2",
                pitchesThrown: 91,
                strikeOuts: 6,
              },
            },
          ],
        },
      ],
    },
  ],
};

const rawBatterGameLog = {
  people: [
    {
      stats: [
        {
          splits: [
            {
              game: { gameDate: "2026-06-26T18:00:00.000Z" },
              isHome: true,
              opponent: { abbreviation: "HOU" },
              stat: {
                atBats: 4,
                baseOnBalls: 1,
                doubles: 1,
                hitByPitch: 0,
                hits: 2,
                homeRuns: 1,
                plateAppearances: 5,
                rbi: 3,
                runs: 2,
                stolenBases: 1,
                strikeOuts: 1,
                totalBases: 6,
                triples: 0,
              },
            },
            {
              game: { gameDate: "2026-06-24T00:00:00.000Z" },
              isHome: false,
              opponent: { abbreviation: "ATL" },
              stat: {
                atBats: 3,
                baseOnBalls: 0,
                doubles: 0,
                hitByPitch: 1,
                hits: 1,
                homeRuns: 0,
                plateAppearances: 4,
                rbi: 1,
                runs: 1,
                stolenBases: 0,
                strikeOuts: 2,
                totalBases: 1,
                triples: 0,
              },
            },
          ],
        },
      ],
    },
  ],
};

test("normalizes official MLB pitcher game logs", () => {
  const logs = normalizeMlbPitcherGameLogResponse(rawGameLog);

  assert.equal(logs.length, 2);
  assert.equal(logs[0].opponent, "HOU");
  assert.equal(logs[0].homeAway, "home");
  assert.equal(logs[0].inningsPitched, 6.1);
  assert.equal(logs[0].strikeouts, 7);
  assert.equal(logs[0].pitchCount, 98);
  assert.equal(logs[0].groundBalls, 9);
  assert.equal(logs[0].flyBalls, 8);
  assert.equal(logs[0].decision, "W");
});

test("live pitcher game-log provider requests MLB hydrate gameLog data", async () => {
  let requestedUrl = "";
  const provider = new MLBPitcherGameLogProvider(
    "https://stats.example.test/people",
    async (input) => {
      requestedUrl = String(input);

      return new Response(JSON.stringify(rawGameLog), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    },
  );
  const response = await provider.getPitcherGameLogs({
    pitcherId: 2002,
    season: 2026,
  });

  assert.equal(response.mode, "live");
  assert.equal(response.logs.length, 2);
  assert.match(requestedUrl, /people\/2002/);
  assert.match(requestedUrl, /gameLog/);
  assert.match(decodeURIComponent(requestedUrl), /season=2026/);
});

test("normalizes official MLB batter game logs", () => {
  const logs = normalizeMlbBatterGameLogResponse(rawBatterGameLog);

  assert.equal(logs.length, 2);
  assert.equal(logs[0].opponent, "HOU");
  assert.equal(logs[0].homeAway, "home");
  assert.equal(logs[0].atBats, 4);
  assert.equal(logs[0].plateAppearances, 5);
  assert.equal(logs[0].hits, 2);
  assert.equal(logs[0].singles, 0);
  assert.equal(logs[0].doubles, 1);
  assert.equal(logs[0].homeRuns, 1);
  assert.equal(logs[0].totalBases, 6);
  assert.equal(logs[0].opposingPitcherHand, "U");
});

test("live batter game-log provider requests MLB hitting gameLog data", async () => {
  let requestedUrl = "";
  const provider = new MLBBatterGameLogProvider(
    "https://stats.example.test/people",
    async (input) => {
      requestedUrl = String(input);

      return new Response(JSON.stringify(rawBatterGameLog), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    },
  );
  const response = await provider.getBatterGameLogs({
    batterId: 1001,
    season: 2026,
  });

  assert.equal(response.mode, "live");
  assert.equal(response.logs.length, 2);
  assert.match(requestedUrl, /people\/1001/);
  assert.match(requestedUrl, /gameLog/);
  assert.match(decodeURIComponent(requestedUrl), /group=\[hitting\]/);
});

test("mock and replay pitcher game-log providers preserve the contract", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-player-intelligence-replay-"),
  );
  const logs = buildMockLogs().slice(0, 3);
  const mock = await new MockPitcherGameLogProvider().getPitcherGameLogs({
    fallbackLogs: logs,
    pitcherId: 2002,
    season: 2026,
  });
  const replayProvider = new ReplayPitcherGameLogProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      logs,
      pitcherId: 2002,
      provider: "mlb-pitcher-game-log",
      raw: rawGameLog,
      season: 2026,
    });
    const replay = await replayProvider.getPitcherGameLogs({
      pitcherId: 2002,
      season: 2026,
    });

    assert.equal(mock.mode, "mock");
    assert.deepEqual(mock.logs, logs);
    assert.equal(replay.mode, "replay");
    assert.deepEqual(replay.logs, logs);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("mock and replay batter game-log providers preserve the contract", async () => {
  const replayDir = await mkdtemp(
    path.join(tmpdir(), "trueline-batter-intelligence-replay-"),
  );
  const logs = buildMockBatterLogs().slice(0, 3);
  const mock = await new MockBatterGameLogProvider().getBatterGameLogs({
    batterId: 1001,
    fallbackLogs: logs,
    season: 2026,
  });
  const replayProvider = new ReplayBatterGameLogProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      batterId: 1001,
      logs,
      provider: "mlb-batter-game-log",
      raw: rawBatterGameLog,
      season: 2026,
    });
    const replay = await replayProvider.getBatterGameLogs({
      batterId: 1001,
      season: 2026,
    });

    assert.equal(mock.mode, "mock");
    assert.deepEqual(mock.logs, logs);
    assert.equal(replay.mode, "replay");
    assert.deepEqual(replay.logs, logs);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("repository player-intelligence replay fixture runs without network access", async () => {
  const replay = await new ReplayPitcherGameLogProvider(
    path.resolve("replay/player-intelligence"),
  ).getPitcherGameLogs({
    pitcherId: 2002,
    season: 2026,
  });

  assert.equal(replay.mode, "replay");
  assert.equal(replay.logs.length, 3);
});

test("repository batter-intelligence replay fixture runs without network access", async () => {
  const replay = await new ReplayBatterGameLogProvider(
    path.resolve("replay/player-intelligence/batters"),
  ).getBatterGameLogs({
    batterId: 1001,
    season: 2026,
  });

  assert.equal(replay.mode, "replay");
  assert.equal(replay.logs.length, 3);
});

test("rolling pitcher metrics calculate windows and splits", () => {
  const summary = calculateRollingSummary(buildMockLogs());

  assert.equal(summary.last3.games, 3);
  assert.equal(summary.last5.games, 5);
  assert.equal(summary.last10.games, 10);
  assert.ok(summary.season.averageStrikeouts > 0);
  assert.ok(summary.home.games > 0);
  assert.ok(summary.away.games > 0);
  assert.ok(summary.last5.qualityStartPercent >= 0);
  assert.ok(summary.last5.oneHundredPitchPercent >= 0);
});

test("rolling batter metrics calculate windows, splits, and rate stats", () => {
  const summary = calculateBatterRollingSummary(buildMockBatterLogs());

  assert.equal(summary.last3.games, 3);
  assert.equal(summary.last5.games, 5);
  assert.equal(summary.last10.games, 10);
  assert.ok(summary.season.battingAverage > 0);
  assert.ok(summary.season.onBasePercentage > 0);
  assert.ok(summary.season.sluggingPercentage > 0);
  assert.ok(summary.home.games > 0);
  assert.ok(summary.away.games > 0);
  assert.ok(summary.vsLHP.games > 0);
  assert.ok(summary.vsRHP.games > 0);
});

test("trend engine returns deterministic direction, strength, confidence, and explanations", () => {
  const logs = buildMockLogs();
  const trends = analyzePitcherTrends(logs);
  const strikeoutTrend = trends.find((trend) => trend.key === "strikeouts");

  assert.ok(strikeoutTrend);
  assert.match(strikeoutTrend.explanation, /Strikeouts/);
  assert.ok(strikeoutTrend.confidence >= 0);
  assert.ok(["up", "down", "flat"].includes(strikeoutTrend.direction));
  assert.ok(["weak", "moderate", "strong"].includes(strikeoutTrend.strength));
});

test("batter trend engine returns power, contact, strikeout, and discipline signals", () => {
  const trends = analyzeBatterTrends(buildMockBatterLogs());

  assert.ok(trends.find((trend) => trend.key === "power"));
  assert.ok(trends.find((trend) => trend.key === "contact"));
  assert.ok(trends.find((trend) => trend.key === "strikeouts"));
  assert.ok(trends.find((trend) => trend.key === "discipline"));
  assert.ok(trends.every((trend) => trend.explanation.length > 0));
});

test("consistency engine calculates mean, median, range, and score", () => {
  const consistency = calculateConsistency(buildMockLogs(), "strikeouts");

  assert.equal(consistency.metric, "strikeouts");
  assert.ok(consistency.mean > 0);
  assert.ok(consistency.median > 0);
  assert.ok(consistency.standardDeviation >= 0);
  assert.ok(consistency.floor <= consistency.ceiling);
  assert.ok(consistency.consistencyScore >= 0);
  assert.ok(consistency.consistencyScore <= 100);
});

test("batter consistency engine calculates hit and total base ranges", () => {
  const consistency = calculateBatterConsistency(buildMockBatterLogs());

  assert.ok(consistency.expectedHitRange.high >= consistency.expectedHitRange.low);
  assert.ok(consistency.expectedTotalBaseRange.high >= consistency.expectedTotalBaseRange.low);
  assert.ok(consistency.floor <= consistency.ceiling);
  assert.ok(consistency.median >= 0);
  assert.ok(consistency.consistencyScore >= 0);
  assert.ok(consistency.consistencyScore <= 100);
});

test("recent form engine scores current pitcher form", () => {
  const logs = buildMockLogs();
  const recentForm = calculatePitcherRecentForm(logs, analyzePitcherTrends(logs));

  assert.ok(recentForm.score >= 0);
  assert.ok(recentForm.score <= 100);
  assert.match(recentForm.explanation, /Last 5/);
});

test("batter recent form and profile summarize current hitter quality", () => {
  const logs = buildMockBatterLogs();
  const trends = analyzeBatterTrends(logs);
  const recentForm = calculateBatterRecentForm(logs, trends);
  const profile = buildBatterProfile(logs);

  assert.ok(recentForm.score >= 0);
  assert.ok(recentForm.score <= 100);
  assert.match(recentForm.explanation, /Last 5/);
  assert.ok(profile.onBasePlusSlugging > 0);
  assert.ok(profile.isolatedPower >= 0);
  assert.ok(profile.averageExitVelocityMph);
});

test("player intelligence service caches and assembles pitcher intelligence", async () => {
  let calls = 0;
  const logs = buildMockLogs();
  const provider: PitcherGameLogProvider = {
    id: "test-player-intelligence",
    async getPitcherGameLogs(request: PitcherGameLogRequest) {
      calls += 1;

      return {
        fetchedAt: "2026-06-26T12:00:00.000Z",
        logs,
        mode: "live",
        pitcherId: request.pitcherId,
        provider: "test-player-intelligence",
        season: request.season,
      };
    },
  };
  const service = new PlayerIntelligenceService(provider, new MemoryCache());
  const pitcher = buildPitcher();

  const first = await service.getPitcher({ pitcher, season: 2026 });
  const second = await service.getPitcher({ pitcher, season: 2026 });

  assert.equal(calls, 1);
  assert.equal(first.pitcher.id, pitcher.id);
  assert.equal(first.gameLogs.length, logs.length);
  assert.equal(second.rolling.last5.games, 5);
  assert.ok(first.trends.length > 0);
  assert.ok(first.consistency.consistencyScore >= 0);
  assert.ok(first.recentForm.score >= 0);
});

test("player intelligence service caches and assembles batter intelligence", async () => {
  let calls = 0;
  const logs = buildMockBatterLogs();
  const provider: BatterGameLogProvider = {
    id: "test-batter-intelligence",
    async getBatterGameLogs(request: BatterGameLogRequest) {
      calls += 1;

      return {
        batterId: request.batterId,
        fetchedAt: "2026-06-26T12:00:00.000Z",
        logs,
        mode: "live",
        provider: "test-batter-intelligence",
        season: request.season,
      };
    },
  };
  const service = new PlayerIntelligenceService(
    new MockPitcherGameLogProvider(),
    new MemoryCache(),
    provider,
  );
  const batter = buildBatter();

  const first = await service.getBatter({ batter, season: 2026 });
  const second = await service.getBatter({ batter, season: 2026 });

  assert.equal(calls, 1);
  assert.equal(first.available, true);
  assert.equal(second.available, true);
  if (!first.available || !second.available) {
    throw new Error("Expected batter intelligence");
  }
  assert.equal(first.player.id, batter.id);
  assert.equal(first.gameLogs.length, logs.length);
  assert.equal(second.rolling.last5.games, 5);
  assert.ok(first.trends.length > 0);
  assert.ok(first.consistency.consistencyScore >= 0);
  assert.ok(first.recentForm.score >= 0);
});

test("player intelligence service gracefully falls back without MLB ID", async () => {
  const service = new PlayerIntelligenceService(
    new MockPitcherGameLogProvider(),
    new MemoryCache(),
  );
  const pitcher = { ...buildPitcher(), externalIds: undefined };
  const intelligence = await service.getPitcher({
    fallbackGameLogs: buildMockLogs().slice(0, 2),
    pitcher,
    season: 2026,
  });

  assert.equal(intelligence.gameLogs.length, 2);
});

test("player intelligence service gracefully falls back for batters without MLB ID", async () => {
  const service = new PlayerIntelligenceService(
    new MockPitcherGameLogProvider(),
    new MemoryCache(),
    new MockBatterGameLogProvider(),
  );
  const batter = { ...buildBatter(), externalIds: undefined };
  const intelligence = await service.getBatter({
    batter,
    fallbackGameLogs: buildMockBatterLogs().slice(0, 2),
    season: 2026,
  });

  if (!intelligence.available) {
    throw new Error("Expected batter intelligence");
  }
  assert.equal(intelligence.gameLogs.length, 2);
});

function buildPitcher(): Pitcher {
  return {
    arsenal: ["FF", "SL"],
    bats: "R",
    era: 3.2,
    externalIds: { mlb: 2002 },
    fullName: "Test Pitcher",
    handedness: "R",
    id: "pitcher-test",
    inningsPitched: 90,
    position: "SP",
    strikeoutRate: 27,
    teamId: "team-test",
    throws: "R",
    whip: 1.1,
  };
}

function buildBatter() {
  return {
    bats: "L",
    externalIds: { mlb: 1001 },
    fullName: "Test Batter",
    id: "batter-test",
    position: "OF",
    teamId: "team-test",
    throws: "R",
  } as const;
}
