import assert from "node:assert/strict";
import test from "node:test";

import { memoryCache } from "../src/cache/MemoryCache.ts";
import type { Pitcher, Team } from "../src/models/mlb.ts";
import { MockMatchupProvider } from "../src/providers/matchup/MockMatchupProvider.ts";
import { MatchupService } from "../src/services/matchup/MatchupService.ts";
import {
  buildMoneylineGameEvaluation,
  buildMoneylineIntelligenceViewModel,
} from "../src/features/moneyline-intelligence/service.ts";
import type {
  DailySlateGame,
  DailySlateViewModel,
} from "../src/services/daily-slate/types.ts";

test("builds moneyline game evaluation with fair odds, edge, factors, and reasons", async () => {
  const awayTeam = buildTeam("team-lad", "LAD", "Dodgers", 74);
  const homeTeam = buildTeam("team-atl", "ATL", "Braves", 62);
  const awayPitcher = buildPitcher("pitcher-yamamoto", "Yoshinobu Yamamoto", awayTeam.id, 2.9);
  const homePitcher = buildPitcher("pitcher-strider", "Spencer Strider", homeTeam.id, 3.4);
  const game = buildGame({ awayPitcher, awayTeam, homePitcher, homeTeam });
  const matchupService = new MatchupService(new MockMatchupProvider(), memoryCache);
  const [awayMatchup, homeMatchup] = await Promise.all([
    matchupService.getMatchupIntelligence({
      batterMlbIds: homeTeam.lineup?.players.map((player) => player.mlbId),
      batterNames: homeTeam.lineup?.players.map((player) => player.fullName),
      pitcherId: awayPitcher.id,
      pitcherMlbId: 2001,
      pitcherName: awayPitcher.fullName,
      season: 2026,
    }),
    matchupService.getMatchupIntelligence({
      batterMlbIds: awayTeam.lineup?.players.map((player) => player.mlbId),
      batterNames: awayTeam.lineup?.players.map((player) => player.fullName),
      pitcherId: homePitcher.id,
      pitcherMlbId: 2002,
      pitcherName: homePitcher.fullName,
      season: 2026,
    }),
  ]);

  const evaluation = buildMoneylineGameEvaluation({
    awayMatchup,
    game,
    homeMatchup,
  });

  assert.equal(evaluation.awayTeam.name, "Dodgers");
  assert.ok(evaluation.projectedWinner);
  assert.ok(evaluation.winProbability > 0);
  assert.ok(Number.isFinite(evaluation.fairOdds));
  assert.ok(Number.isFinite(evaluation.edgePercent));
  assert.ok(Number.isFinite(evaluation.expectedValuePercent));
  assert.equal(evaluation.factors.length, 7);
  assert.ok(evaluation.reasons.length > 0);
  assert.ok(evaluation.summary.includes("project as the winner"));

  const viewModel = buildMoneylineIntelligenceViewModel(buildSlate(game), [evaluation]);

  assert.equal(viewModel.games.length, 1);
  assert.equal(viewModel.slateMeta.gamesEvaluated, 1);
  assert.ok(viewModel.slateMeta.averageConfidence.endsWith("%"));
});

function buildTeam(
  id: string,
  abbreviation: string,
  name: string,
  strength: number,
): Team {
  return {
    abbreviation,
    city: name,
    division: "West",
    id,
    league: "NL",
    lineup: {
      averageOps: 0.76,
      averageStrikeoutRate: 0.22,
      averageWrcPlus: null,
      contactRating: strength,
      fetchedAt: "2026-06-22T12:00:00.000Z",
      handedness: {
        balanceRating: 70,
        left: 3,
        right: 5,
        switch: 1,
      },
      lineupConfidence: 85,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: strength,
      players: Array.from({ length: 3 }, (_, index) => ({
        battingAverage: 0.26,
        battingHand: index % 2 === 0 ? "L" : "R",
        battingOrder: index + 1,
        fullName: `${abbreviation} Hitter ${index + 1}`,
        homeRuns: 15,
        isPinchHitter: false,
        isStarting: true,
        mlbId: 1000 + index,
        onBasePercentage: 0.34,
        ops: 0.78,
        plateAppearances: 320,
        position: "OF",
        sluggingPercentage: 0.44,
        strikeoutRate: 0.22,
        wrcPlus: 112,
      })),
      powerRating: strength,
      replacementQuality: 60,
      source: "mock",
      status: "confirmed",
    },
    name,
    recentForm: {
      fetchedAt: "2026-06-22T12:00:00.000Z",
      momentum: { available: true, value: strength },
      rating: { available: true, value: strength },
      source: "mock",
      windows: {
        7: recentWindow(7, strength),
        14: recentWindow(14, strength),
        30: recentWindow(30, strength),
      },
    },
    strength: {
      bullpen: {
        available: true,
        era: 3.8,
        strikeoutRate: 25,
        value: strength,
        whip: 1.22,
        workloadRating: 45,
      },
      fetchedAt: "2026-06-22T12:00:00.000Z",
      offense: {
        available: true,
        battingAverage: 0.255,
        ops: 0.76,
        runsPerGame: 4.8,
        strikeoutRate: 21,
        value: strength,
        walkRate: 8,
      },
      overall: {
        available: true,
        runDifferential: 42,
        value: strength,
      },
      pitching: {
        available: true,
        era: 3.8,
        runsAllowedPerGame: 4,
        value: strength,
        whip: 1.2,
      },
      source: "mock",
    },
  };
}

function recentWindow(window: 7 | 14 | 30, strength: number) {
  return {
    available: true,
    battingAverage: 0.255,
    era: 3.8,
    gamesPlayed: window,
    losses: Math.round(window * 0.4),
    ops: 0.76,
    rating: { available: true, value: strength },
    runDifferential: window,
    runDifferentialPerGame: 1,
    runsAllowedPerGame: 4,
    runsPerGame: 4.8,
    whip: 1.2,
    winPercentage: 0.6,
    wins: Math.round(window * 0.6),
    window,
  };
}

function buildPitcher(id: string, fullName: string, teamId: string, era: number): Pitcher {
  return {
    arsenal: ["Four-seam", "Slider"],
    bats: "R",
    era,
    externalIds: { mlb: Number(id.replace(/\D/g, "")) },
    fullName,
    handedness: "R",
    homeRunsPer9: 0.9,
    id,
    inningsPitched: 80,
    position: "SP",
    strikeoutRate: 28,
    teamId,
    throws: "R",
    walksPer9: 2.4,
    whip: 1.1,
  };
}

function buildGame({
  awayPitcher,
  awayTeam,
  homePitcher,
  homeTeam,
}: {
  awayPitcher: Pitcher;
  awayTeam: Team;
  homePitcher: Pitcher;
  homeTeam: Team;
}): DailySlateGame {
  return {
    awayPitcher,
    awayTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: awayTeam.id,
      ballpark: {
        historicalConfidence: 90,
        hitterFriendlyRating: 55,
        name: "Test Park",
        overallParkRating: 55,
        runFactor: 104,
      },
      confidence: { label: "High", value: 76 },
      detail: "Test game",
      homePitcherId: homePitcher.id,
      homeTeamId: homeTeam.id,
      id: "game-lad-atl",
      modelProbability: 0.54,
      odds: {
        moneyline: {
          displayLine: "LAD -118 / ATL +102",
          id: "ml",
          line: -118,
          market: "moneyline",
          movement: "Flat",
          price: -118,
          sportsbook: "Consensus",
        },
        spread: {
          displayLine: "LAD -1.5",
          id: "spread",
          line: -1.5,
          market: "spread",
          movement: "Flat",
          price: 145,
          sportsbook: "Consensus",
        },
        total: {
          displayLine: "8.5",
          id: "total",
          line: 8.5,
          market: "total",
          movement: "Flat",
          price: -110,
          sportsbook: "Consensus",
        },
      },
      scheduledAt: "2026-06-22T23:20:00.000Z",
      status: "confirmed",
      venue: "Test Park",
      weatherId: "weather-test",
    },
    homePitcher,
    homeTeam,
    weather: {
      offenseEnvironment: 55,
      pitchingEnvironment: 48,
      runEnvironment: 56,
      summary: "76F, light wind",
      weatherApplicable: true,
    },
  } as DailySlateGame;
}

function buildSlate(game: DailySlateGame): DailySlateViewModel {
  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [game],
    injuries: [],
    kpiMetrics: [],
    propCategories: [],
    slateMeta: {
      averageConfidence: "76%",
      currentDate: "Monday, June 22",
      firstPitchCountdown: "2h",
      gamesToday: 1,
      lastUpdated: "12:00 PM ET",
    },
    weatherReports: [],
  };
}
