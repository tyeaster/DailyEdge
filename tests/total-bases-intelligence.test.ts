import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTotalBasesCandidate,
  buildTotalBasesViewModel,
  rankTotalBasesCandidates,
} from "../src/features/total-bases-intelligence/service.ts";
import type { DailySlateGame, DailySlateProp, DailySlateViewModel } from "../src/services/daily-slate/types.ts";
import type { MatchupIntelligenceResult } from "../src/services/matchup/index.ts";
import type { Pitcher, Player, Team, Weather } from "../src/models/mlb.ts";

test("buildTotalBasesCandidate calculates projection, edge, EV, confidence, and explanations", () => {
  const context = buildContext();
  const candidate = buildTotalBasesCandidate(context);

  assert.equal(candidate.batter.fullName, "Bryce Harper");
  assert.ok(candidate.projectedTotalBases > 0);
  assert.ok(candidate.fairLine > 0);
  assert.ok(Number.isFinite(candidate.edgePercent));
  assert.ok(Number.isFinite(candidate.expectedValuePercent));
  assert.ok(candidate.confidence > 0);
  assert.ok(candidate.gameGrade > 0);
  assert.ok(candidate.reasons.length > 0);
});

test("total bases scoring exposes player, matchup, pitch, zone, weather, bullpen, and lineup factors", () => {
  const candidate = buildTotalBasesCandidate(buildContext());

  assert.ok(candidate.factors.some((factor) => factor.label === "Player Intelligence"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Matchup Intelligence"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Pitch Intelligence"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Zone Intelligence"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Environment"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Bullpen Opportunity"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Lineup Opportunity"));
});

test("rankTotalBasesCandidates integrates with RankingEngine", () => {
  const primary = buildTotalBasesCandidate(buildContext());
  const secondary = {
    ...buildTotalBasesCandidate(buildContext({ batterId: "player-neutral", batterName: "Neutral Hitter", edge: 0.4 })),
    confidence: 35,
    edgePercent: -4,
    expectedValuePercent: -8,
    gameGrade: 32,
    recommendation: "Pass" as const,
  };
  const ranked = rankTotalBasesCandidates([secondary, primary]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].batter.fullName, "Bryce Harper");
  assert.equal(ranked[0].ranked?.rank, 1);
  assert.ok((ranked[0].ranked?.trueLineScore ?? 0) >= (ranked[1].ranked?.trueLineScore ?? 0));
});

test("buildTotalBasesViewModel assembles slate metadata and top candidate", () => {
  const slate = buildSlate();
  const candidates = rankTotalBasesCandidates([buildTotalBasesCandidate(buildContext())]);
  const viewModel = buildTotalBasesViewModel(slate, candidates);

  assert.equal(viewModel.slateMeta.candidateCount, 1);
  assert.equal(viewModel.topCandidate?.batter.fullName, "Bryce Harper");
  assert.ok(viewModel.slateMeta.averageConfidence.endsWith("%"));
});

function buildContext(overrides: { batterId?: string; batterName?: string; edge?: number } = {}) {
  const team = buildTeam("team-phi", "PHI", "Phillies");
  const opponent = buildTeam("team-nym", "NYM", "Mets");
  const batter = buildPlayer(
    overrides.batterId ?? "player-harper",
    overrides.batterName ?? "Bryce Harper",
    team.id,
  );
  const game = buildGame(team, opponent);
  const prop = buildProp({ batter, edge: overrides.edge ?? 4.4, game, team });

  return {
    matchup: buildMatchup(),
    selection: {
      batter,
      game,
      opponent,
      opponentPitcher: game.homePitcher,
      prop,
      team,
    },
  };
}

function buildSlate(): DailySlateViewModel {
  const team = buildTeam("team-phi", "PHI", "Phillies");
  const opponent = buildTeam("team-nym", "NYM", "Mets");
  const game = buildGame(team, opponent);

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
      currentDate: "June 22, 2026",
      dataSource: "mock",
      dataSourceMessage: "Using Mock Data",
      firstPitchCountdown: "2h",
      gamesToday: 1,
      lastUpdated: "2026-06-22T16:00:00.000Z",
    },
    weatherReports: [],
  };
}

function buildTeam(id: string, abbreviation: string, name: string): Team {
  return {
    abbreviation,
    city: name,
    division: "East",
    id,
    league: "NL",
    lineup: {
      averageOps: 0.78,
      averageStrikeoutRate: 0.22,
      averageWrcPlus: null,
      contactRating: 70,
      fetchedAt: "2026-06-22T16:00:00.000Z",
      handedness: { balanceRating: 68, left: 3, right: 5, switch: 1 },
      lineupConfidence: 86,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: 74,
      players: [
        {
          battingAverage: 0.286,
          battingHand: "L",
          battingOrder: 3,
          fullName: "Bryce Harper",
          homeRuns: 17,
          isPinchHitter: false,
          isStarting: true,
          mlbId: 547180,
          onBasePercentage: 0.39,
          ops: 0.88,
          plateAppearances: 330,
          position: "1B",
          sluggingPercentage: 0.49,
          strikeoutRate: 0.21,
          wrcPlus: null,
        },
      ],
      powerRating: 75,
      replacementQuality: 60,
      source: "mock",
      status: "confirmed",
    },
    name,
    strength: {
      bullpen: {
        available: true,
        recentPitches: id === "team-nym" ? 184 : 92,
        value: id === "team-nym" ? 42 : 68,
        workloadRating: id === "team-nym" ? 78 : 38,
      },
      fetchedAt: "2026-06-22T16:00:00.000Z",
      offense: { available: true, battingAverage: 0.255, ops: 0.76, runsPerGame: 4.7, strikeoutRate: 22, value: 68, walkRate: 8 },
      overall: { available: true, runDifferential: 24, value: 69 },
      pitching: { available: true, era: 3.9, runsAllowedPerGame: 4.1, value: 66, whip: 1.24 },
      source: "mock",
    },
  };
}

function buildPlayer(id: string, fullName: string, teamId: string): Player {
  return {
    bats: "L",
    externalIds: { mlb: 547180 },
    fullName,
    id,
    position: "1B",
    teamId,
    throws: "R",
  };
}

function buildPitcher(id: string, fullName: string, teamId: string): Pitcher {
  return {
    arsenal: ["Four-seam", "Slider", "Changeup"],
    bats: "R",
    era: 4.22,
    fullName,
    gamesStarted: 14,
    handedness: "R",
    homeRunsPer9: 1.18,
    id,
    inningsPitched: 78,
    position: "SP",
    strikeouts: 82,
    strikeoutsPer9: 9.5,
    strikeoutRate: 23.8,
    teamId,
    throws: "R",
    walksPer9: 3.1,
    whip: 1.31,
  };
}

function buildGame(awayTeam: Team, homeTeam: Team): DailySlateGame {
  const awayPitcher = buildPitcher("pitcher-wheeler", "Zack Wheeler", awayTeam.id);
  const homePitcher = buildPitcher("pitcher-senga", "Kodai Senga", homeTeam.id);

  return {
    awayPitcher,
    awayTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: awayTeam.id,
      ballpark: {
        doublesFactor: 110,
        historicalConfidence: 86,
        hitterFriendlyRating: 70,
        name: "Citi Field",
        overallParkRating: 64,
        powerFriendlyRating: 66,
        runFactor: 108,
      },
      homePitcherId: homePitcher.id,
      homeTeamId: homeTeam.id,
      id: "game-phi-nym",
      prediction: { dataQuality: { score: 82 } },
      scheduledAt: "2026-06-22T23:10:00.000Z",
      status: "scheduled",
      venue: "Citi Field",
    },
    homePitcher,
    homeTeam,
    weather: buildWeather(),
  } as DailySlateGame;
}

function buildProp({
  batter,
  edge,
  game,
  team,
}: {
  batter: Player;
  edge: number;
  game: DailySlateGame;
  team: Team;
}): DailySlateProp {
  return {
    player: batter,
    prop: {
      category: "Total Bases",
      confidence: { label: "High", value: 76 },
      edge: { percentage: edge, rating: "A" },
      gameId: game.game.id,
      id: "prop-harper-tb",
      odds: {
        displayLine: "Over 1.5 Total Bases",
        id: "odds-harper-tb",
        line: 1.5,
        market: "player-prop",
        movement: "+4",
        price: 105,
        sportsbook: "DraftKings",
        updatedAt: "2026-06-22T16:00:00.000Z",
      },
      playerId: batter.id,
      projection: "2.3",
      reasoning: "Total-base edge from hard contact and matchup.",
    },
    team,
  };
}

function buildWeather(): Weather {
  return {
    airDensityKgM3: 1.15,
    homeRunEnvironment: 74,
    id: "weather-1",
    offenseEnvironment: 72,
    relativeWindDirection: "Tailwind",
    runEnvironment: 70,
    summary: "Warm with wind out",
    temperatureF: 84,
    weatherApplicable: true,
    weatherConfidence: 86,
    windMph: 12,
  } as Weather;
}

function buildMatchup(): MatchupIntelligenceResult {
  return {
    arsenal: { profiles: [], source: "mock" },
    confidence: 84,
    overallMatchupScore: 82,
    pitchTypeMatch: {
      explanation: "Fastball and slider mix creates hitter-friendly total-base context.",
      matches: [
        {
          expectedDamageMatch: 82,
          pitchName: "Four-seam",
          pitchType: "FF",
          score: 84,
          usagePercent: 44,
          velocityMatch: 78,
        },
      ],
      score: 81,
      topAdvantages: ["Excellent fastball match"],
      topWeaknesses: [],
    },
    recentMatchup: { score: 76 },
    reasons: ["Excellent fastball match", "Recent contact trend is positive"],
    zoneMatch: {
      hotZones: [{ damageRating: 80 }],
      overlay: [{ classification: "risk" }],
      reasons: ["Damage zones overlap pitch locations."],
      score: 78,
    },
  } as unknown as MatchupIntelligenceResult;
}
