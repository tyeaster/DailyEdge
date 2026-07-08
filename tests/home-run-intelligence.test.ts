import assert from "node:assert/strict";
import test from "node:test";

import { memoryCache } from "../src/cache/MemoryCache.ts";
import type { Pitcher, Player, Team } from "../src/models/mlb.ts";
import { MockMatchupProvider } from "../src/providers/matchup/MockMatchupProvider.ts";
import { MatchupService } from "../src/services/matchup/MatchupService.ts";
import {
  buildHomeRunCandidate,
  buildHomeRunIntelligenceViewModel,
} from "../src/features/home-run-intelligence/service.ts";
import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "../src/services/daily-slate/types.ts";

test("builds home run candidates with score, probability, fair odds, edge, and explanations", async () => {
  const batterTeam = buildTeam("team-nyy", "NYY", "Yankees");
  const pitcherTeam = buildTeam("team-bos", "BOS", "Red Sox");
  const batter: Player = {
    bats: "R",
    externalIds: { mlb: 1001 },
    fullName: "Aaron Judge",
    id: "player-judge",
    position: "RF",
    teamId: batterTeam.id,
    throws: "R",
  };
  const pitcher: Pitcher = {
    arsenal: ["Four-seam", "Slider", "Changeup"],
    bats: "R",
    era: 4.12,
    externalIds: { mlb: 2001 },
    fullName: "Brayan Bello",
    handedness: "R",
    homeRunsPer9: 1.28,
    id: "pitcher-bello",
    inningsPitched: 70.2,
    position: "SP",
    strikeoutRate: 21.7,
    teamId: pitcherTeam.id,
    throws: "R",
    whip: 1.32,
  };
  const game = buildGame({ batterTeam, pitcher, pitcherTeam });
  const prop = buildHomeRunProp({ batter, game, team: batterTeam });
  const matchup = await new MatchupService(
    new MockMatchupProvider(),
    memoryCache,
  ).getMatchupIntelligence(
    {
      asOfDate: "2026-06-22",
      batterIds: [batter.id],
      batterMlbIds: [1001],
      batterNames: [batter.fullName],
      pitcherId: pitcher.id,
      pitcherMlbId: 2001,
      pitcherName: pitcher.fullName,
      season: 2026,
    },
    {
      ballpark: game.game.ballpark,
      bullpen: pitcherTeam.strength?.bullpen,
      lineup: batterTeam.lineup,
      weather: game.weather,
    },
  );
  const candidate = buildHomeRunCandidate({
    matchup,
    selection: {
      batter,
      game,
      opponent: pitcherTeam,
      opponentPitcher: pitcher,
      prop,
      team: batterTeam,
    },
  });

  assert.equal(candidate.batter.fullName, "Aaron Judge");
  assert.equal(candidate.opponentPitcher.fullName, "Brayan Bello");
  assert.ok(candidate.overallHrScore > 0);
  assert.ok(candidate.hrProbability > 0);
  assert.ok(Number.isFinite(candidate.fairOdds));
  assert.ok(candidate.sportsbook);
  assert.ok(candidate.edgePercent !== undefined);
  assert.ok(candidate.expectedValuePercent !== undefined);
  assert.equal(candidate.factors.length, 7);
  assert.ok(candidate.explanations.length > 0);
  assert.ok(candidate.summary.includes("TrueLine estimates"));

  const viewModel = buildHomeRunIntelligenceViewModel(buildSlate(game, prop), [
    candidate,
  ]);

  assert.equal(viewModel.candidates.length, 1);
  assert.equal(viewModel.topCandidate?.batter.fullName, "Aaron Judge");
  assert.equal(viewModel.slateMeta.candidateCount, 1);
});

function buildTeam(id: string, abbreviation: string, name: string): Team {
  return {
    abbreviation,
    city: name,
    division: "East",
    id,
    league: "AL",
    lineup: {
      averageOps: 0.79,
      averageStrikeoutRate: 0.23,
      averageWrcPlus: null,
      contactRating: 64,
      fetchedAt: "2026-06-22T12:00:00.000Z",
      handedness: {
        balanceRating: 70,
        left: 3,
        right: 5,
        switch: 1,
      },
      lineupConfidence: 88,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: 72,
      players: [
        {
          battingAverage: 0.282,
          battingHand: "R",
          battingOrder: 2,
          fullName: "Aaron Judge",
          homeRuns: 28,
          isPinchHitter: false,
          isStarting: true,
          mlbId: 1001,
          onBasePercentage: 0.392,
          ops: 0.972,
          plateAppearances: 360,
          position: "RF",
          sluggingPercentage: 0.58,
          strikeoutRate: 0.25,
          wrcPlus: 172,
        },
      ],
      powerRating: 78,
      replacementQuality: 60,
      source: "mock",
      status: "confirmed",
    },
    name,
    strength: {
      bullpen: {
        available: true,
        recentPitches: 174,
        value: 48,
        workloadRating: 72,
      },
    },
  } as unknown as Team;
}

function buildGame({
  batterTeam,
  pitcher,
  pitcherTeam,
}: {
  batterTeam: Team;
  pitcher: Pitcher;
  pitcherTeam: Team;
}): DailySlateGame {
  const awayPitcher = {
    ...pitcher,
    fullName: "Gerrit Cole",
    id: "pitcher-cole",
    teamId: batterTeam.id,
  };

  return {
    awayPitcher,
    awayTeam: batterTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: batterTeam.id,
      ballpark: {
        historicalConfidence: 90,
        homeRunFactor: 118,
        name: "Fenway Park",
        overallParkRating: 62,
        powerFriendlyRating: 72,
        rightHandedHomeRunFactor: 121,
        runFactor: 108,
      },
      homePitcherId: pitcher.id,
      homeTeamId: pitcherTeam.id,
      id: "game-nyy-bos",
      scheduledAt: "2026-06-22T23:10:00.000Z",
      status: "weather-watch",
      venue: "Fenway Park",
    },
    homePitcher: pitcher,
    homeTeam: pitcherTeam,
    weather: {
      airDensityKgM3: 1.16,
      homeRunEnvironment: 78,
      relativeWindDirection: "Tailwind",
      runEnvironment: 72,
      summary: "78F, 12 MPH Tailwind",
      temperatureF: 78,
      weatherApplicable: true,
      weatherConfidence: 86,
      windMph: 12,
    },
  } as DailySlateGame;
}

function buildHomeRunProp({
  batter,
  game,
  team,
}: {
  batter: Player;
  game: DailySlateGame;
  team: Team;
}): DailySlateProp {
  return {
    player: batter,
    prop: {
      category: "Home Runs",
      confidence: { label: "High", value: 72 },
      edge: { percentage: 4.9, rating: "A" },
      gameId: game.game.id,
      id: "prop-judge-hr",
      odds: {
        displayLine: "+285",
        id: "odds-judge-hr",
        line: 0.5,
        market: "player-prop",
        movement: "+18 cents",
        price: 285,
        sportsbook: "DraftKings",
      },
      playerId: batter.id,
      projection: "18.4%",
      reasoning: "Power environment supports the HR path.",
    },
    team,
  };
}

function buildSlate(game: DailySlateGame, prop: DailySlateProp): DailySlateViewModel {
  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [game],
    injuries: [],
    kpiMetrics: [],
    propCategories: [{ label: "Home Runs", props: [prop] }],
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
