import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailySlateIntelligenceViewModel,
  DailySlateOrchestratorService,
} from "../src/features/daily-slate-intelligence/service.ts";
import type {
  HomeRunCandidate,
  HomeRunIntelligenceViewModel,
} from "../src/features/home-run-intelligence/service.ts";
import type {
  MoneylineGameEvaluation,
  MoneylineIntelligenceViewModel,
} from "../src/features/moneyline-intelligence/service.ts";
import type { DailySlateViewModel } from "../src/services/daily-slate/types.ts";
import type { Pitcher, Player, Team, Weather } from "../src/models/mlb.ts";

test("builds Daily Slate Intelligence sections from existing service outputs", () => {
  const slate = buildSlate();
  const homeRuns = buildHomeRuns(slate);
  const moneyline = buildMoneyline(slate);
  const viewModel = buildDailySlateIntelligenceViewModel({
    homeRuns,
    moneyline,
    slate,
  });

  assert.ok(viewModel.topBets.length > 0);
  assert.ok(viewModel.topBets.length <= 25);
  assert.ok(viewModel.strikeouts.bets.length > 0);
  assert.ok(viewModel.hits.bets.length > 0);
  assert.equal(viewModel.homeRuns.bets.length, 1);
  assert.equal(viewModel.moneyline.bets.length, 1);
  assert.equal(viewModel.slateMeta.sectionsPopulated, 4);
});

test("uses RankingEngineService output for ranks grades and explanations", () => {
  const slate = buildSlate();
  const viewModel = buildDailySlateIntelligenceViewModel({
    homeRuns: buildHomeRuns(slate),
    moneyline: buildMoneyline(slate),
    slate,
  });
  const top = viewModel.topBets[0];

  assert.equal(top.ranked.rank, 1);
  assert.ok(top.ranked.trueLineScore >= viewModel.topBets[1].ranked.trueLineScore);
  assert.match(top.ranked.grade, /^[A-F][+-]?$/);
  assert.ok(top.ranked.explanations.length > 0);
  assert.ok(top.href.startsWith("/"));
});

test("generates weather bullpen and lineup alerts from normalized slate context", () => {
  const slate = buildSlate();
  const viewModel = buildDailySlateIntelligenceViewModel({
    homeRuns: buildHomeRuns(slate),
    moneyline: buildMoneyline(slate),
    slate,
  });

  assert.ok(viewModel.weatherAlerts.length > 0);
  assert.ok(viewModel.bullpenAlerts.length > 0);
  assert.ok(viewModel.lineups.length > 0);
  assert.ok(viewModel.alerts.length >= viewModel.weatherAlerts.length);
});

test("handles empty slate inputs without failing", () => {
  const viewModel = buildDailySlateIntelligenceViewModel({
    homeRuns: {
      candidates: [],
      context: [],
      slateMeta: {
        candidateCount: 0,
        dataSource: "mock",
        lastUpdated: "2026-06-22T16:00:00.000Z",
      },
      topCandidate: undefined,
    },
    moneyline: {
      games: [],
      slateMeta: {
        averageConfidence: "0%",
        dataSource: "mock",
        gamesEvaluated: 0,
        lastUpdated: "2026-06-22T16:00:00.000Z",
      },
    },
    slate: buildEmptySlate(),
  });

  assert.equal(viewModel.topBets.length, 0);
  assert.equal(viewModel.strikeouts.bets.length, 0);
  assert.equal(viewModel.slateMeta.sectionsPopulated, 0);
  assert.equal(viewModel.marketSummary.highestEdge, undefined);
  assert.equal(viewModel.marketSummary.highestConfidence, undefined);
});

test("orchestrator loads slate once and reuses it for dependent services", async () => {
  let slateCalls = 0;
  let homeRunCalls = 0;
  let moneylineCalls = 0;
  const slate = buildSlate();
  const service = new DailySlateOrchestratorService({
    loadHomeRuns: async (loadedSlate) => {
      homeRunCalls += 1;
      assert.equal(loadedSlate, slate);

      return buildHomeRuns(loadedSlate);
    },
    loadMoneyline: async (loadedSlate) => {
      moneylineCalls += 1;
      assert.equal(loadedSlate, slate);

      return buildMoneyline(loadedSlate);
    },
    loadSlate: async () => {
      slateCalls += 1;

      return slate;
    },
  });
  const viewModel = await service.getDailySlateIntelligence();

  assert.equal(slateCalls, 1);
  assert.equal(homeRunCalls, 1);
  assert.equal(moneylineCalls, 1);
  assert.ok(viewModel.topBets.length > 0);
});

function buildSlate(): DailySlateViewModel {
  const awayTeam = buildTeam("team-phi", "PHI", "Phillies");
  const homeTeam = buildTeam("team-nym", "NYM", "Mets");
  const pitcher = buildPitcher("pitcher-wheeler", "Zack Wheeler", awayTeam.id);
  const homePitcher = buildPitcher("pitcher-senga", "Kodai Senga", homeTeam.id);
  const hitter = buildPlayer("player-harper", "Bryce Harper", awayTeam.id);
  const weather = buildWeather();
  const game = {
    awayPitcher: pitcher,
    awayTeam,
    game: {
      awayPitcherId: pitcher.id,
      awayTeamId: awayTeam.id,
      ballpark: {
        historicalConfidence: 82,
        hitterFriendlyRating: 58,
        homeRunFactor: 104,
        name: "Citi Field",
        overallParkRating: 54,
        pitcherFriendlyRating: 57,
        powerFriendlyRating: 55,
        runFactor: 101,
        source: "mock",
        strikeoutFactor: 102,
      },
      confidence: { label: "High", value: 78 },
      detail: "Mock slate game",
      homePitcherId: homePitcher.id,
      homeTeamId: homeTeam.id,
      id: "game-phi-nym",
      modelProbability: 0.57,
      odds: {
        moneyline: {
          displayLine: "PHI -118",
          id: "odds-moneyline",
          line: -118,
          market: "moneyline",
          movement: "+4",
          price: -118,
          sportsbook: "DraftKings",
          updatedAt: "2026-06-22T16:00:00.000Z",
        },
        spread: {
          displayLine: "PHI -1.5",
          id: "odds-spread",
          line: -1.5,
          market: "spread",
          movement: "0",
          price: 135,
          sportsbook: "DraftKings",
        },
        total: {
          displayLine: "8.0",
          id: "odds-total",
          line: 8,
          market: "total",
          movement: "0",
          price: -110,
          sportsbook: "DraftKings",
        },
      },
      prediction: {
        awayFairMoneyline: -142,
        awayProjectedRuns: 4.7,
        awayWinProbability: 0.58,
        confidenceScore: 79,
        dataQuality: {
          inputs: {},
          missingInputs: [],
          score: 84,
        },
        edgePercent: 6.2,
        expectedValuePercent: 5.4,
        explanations: ["Starting pitching advantage."],
        gameId: "game-phi-nym",
        homeFairMoneyline: 142,
        homeProjectedRuns: 3.9,
        homeWinProbability: 0.42,
        impliedSportsbookProbability: 0.52,
        modelBreakdown: {
          factors: {},
          totalContributionPercent: 0,
        },
        predictedWinnerTeamId: awayTeam.id,
        predictionVersion: "v1",
        projectedTotalRuns: 8.6,
        recommendation: "Play",
        selectedFairMoneyline: -142,
        selectedTeamId: awayTeam.id,
        selectedWinProbability: 0.58,
        sportsbook: "DraftKings",
        sportsbookLine: "PHI -118",
        sportsbookMoneyline: -118,
      },
      scheduledAt: "2026-06-22T23:10:00.000Z",
      status: "weather-watch",
      venue: "Citi Field",
      weather,
      weatherId: weather.id,
    },
    homePitcher,
    homeTeam,
    weather,
  } as unknown as DailySlateViewModel["games"][number];

  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [game],
    injuries: [],
    kpiMetrics: [],
    propCategories: [
      {
        label: "Strikeouts",
        props: [
          {
            player: pitcher,
            prop: {
              category: "Strikeouts",
              confidence: { label: "High", value: 84 },
              edge: { percentage: 7.1, rating: "A" },
              gameId: game.game.id,
              id: "prop-wheeler-k",
              odds: {
                displayLine: "Over 6.5 Ks",
                id: "odds-wheeler-k",
                line: 6.5,
                market: "player-prop",
                movement: "+0.5",
                price: 104,
                sportsbook: "DraftKings",
                updatedAt: "2026-06-22T16:00:00.000Z",
              },
              playerId: pitcher.id,
              projection: "7.4 Ks",
              reasoning: "Opponent strikeout profile is favorable.",
            },
            team: awayTeam,
          },
        ],
      },
      {
        label: "Hits",
        props: [
          {
            player: hitter,
            prop: {
              category: "Hits",
              confidence: { label: "Medium", value: 74 },
              edge: { percentage: 4.8, rating: "B" },
              gameId: game.game.id,
              id: "prop-harper-hit",
              odds: {
                displayLine: "Over 0.5 Hits",
                id: "odds-harper-hit",
                line: 0.5,
                market: "player-prop",
                movement: "+2",
                price: -155,
                sportsbook: "DraftKings",
                updatedAt: "2026-06-22T16:00:00.000Z",
              },
              playerId: hitter.id,
              projection: "1.2 Hits",
              reasoning: "Contact profile supports the hit line.",
            },
            team: awayTeam,
          },
        ],
      },
      {
        label: "Home Runs",
        props: [],
      },
    ],
    slateMeta: {
      averageConfidence: "78%",
      currentDate: "June 22, 2026",
      dataSource: "mock",
      dataSourceMessage: "Using Mock Data",
      firstPitchCountdown: "2h 18m",
      gamesToday: 1,
      lastUpdated: "2026-06-22T16:00:00.000Z",
    },
    weatherReports: [
      {
        awayTeam,
        game: game.game,
        homeTeam,
        report: weather,
      },
    ],
  };
}

function buildHomeRuns(slate: DailySlateViewModel): HomeRunIntelligenceViewModel {
  const game = slate.games[0];
  const prop = slate.propCategories
    .find((category) => category.label === "Home Runs")
    ?.props[0];
  const batter = prop?.player ?? slate.propCategories[1].props[0].player;
  const candidate = {
    batter,
    battingOrder: "3",
    confidence: 77,
    edgePercent: 5.2,
    expectedPlateAppearances: "4.3",
    expectedValuePercent: 4.4,
    explanations: ["Power profile and weather are favorable."],
    factors: [
      {
        details: [],
        explanation: "Batter power profile is above average.",
        label: "Batter Power",
        score: 78,
        weight: "24%",
      },
      {
        details: [],
        explanation: "Environment supports carry.",
        label: "Environment",
        score: 74,
        weight: "14%",
      },
    ],
    fairOdds: 245,
    fairOddsDisplay: "+245",
    game,
    hrProbability: 0.29,
    hrProbabilityDisplay: "29%",
    matchup: {
      overall: 82,
      pitch: 80,
      zone: 84,
    },
    opponent: game.homeTeam.id === batter.teamId ? game.awayTeam : game.homeTeam,
    opponentPitcher:
      game.homeTeam.id === batter.teamId ? game.awayPitcher : game.homePitcher,
    overallHrScore: 81,
    prop,
    recommendation: "Play",
    sportsbook: {
      edgeDisplay: "+5.2%",
      expectedValueDisplay: "+4.4%",
      impliedProbabilityDisplay: "24%",
      odds: 285,
      oddsDisplay: "+285",
      sportsbook: "DraftKings",
    },
    summary: "A strong home run candidate from existing Home Run Intelligence.",
    team: game.homeTeam.id === batter.teamId ? game.homeTeam : game.awayTeam,
  } satisfies HomeRunCandidate;

  return {
    candidates: [candidate],
    context: [],
    slateMeta: {
      candidateCount: 1,
      dataSource: slate.dataSource,
      lastUpdated: slate.slateMeta.lastUpdated,
    },
    topCandidate: candidate,
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
      averageStrikeoutRate: 0.23,
      averageWrcPlus: null,
      contactRating: 68,
      fetchedAt: "2026-06-22T16:00:00.000Z",
      handedness: {
        balanceRating: 66,
        left: 3,
        right: 5,
        switch: 1,
      },
      lineupConfidence: 82,
      missingStarPlayerIds: id === "team-nym" ? [1004] : [],
      missingStarterIds: [],
      overallStrength: 70,
      players: [],
      powerRating: 72,
      replacementQuality: 60,
      source: "mock",
      status: id === "team-phi" ? "confirmed" : "projected",
    },
    name,
    strength: {
      bullpen: {
        available: true,
        era: 3.72,
        recentPitches: id === "team-nym" ? 184 : 92,
        strikeoutRate: 24,
        value: id === "team-nym" ? 42 : 68,
        whip: 1.21,
        workloadRating: id === "team-nym" ? 78 : 38,
      },
      fetchedAt: "2026-06-22T16:00:00.000Z",
      offense: {
        available: true,
        battingAverage: 0.255,
        ops: 0.76,
        runsPerGame: 4.7,
        strikeoutRate: 22,
        value: 68,
        walkRate: 8,
      },
      overall: {
        available: true,
        runDifferential: 24,
        value: 69,
      },
      pitching: {
        available: true,
        era: 3.9,
        runsAllowedPerGame: 4.1,
        value: 66,
        whip: 1.24,
      },
      source: "mock",
    },
  };
}

function buildPitcher(id: string, fullName: string, teamId: string): Pitcher {
  return {
    arsenal: ["Four-seam", "Slider", "Curve"],
    bats: "R",
    era: 2.72,
    fullName,
    gamesStarted: 15,
    handedness: "R",
    homeRunsPer9: 0.82,
    id,
    inningsPitched: 91.1,
    position: "SP",
    strikeouts: 112,
    strikeoutsPer9: 11.0,
    strikeoutRate: 30.1,
    teamId,
    throws: "R",
    walksPer9: 2.2,
    whip: 0.98,
  };
}

function buildPlayer(id: string, fullName: string, teamId: string): Player {
  return {
    bats: "L",
    fullName,
    id,
    position: "1B",
    teamId,
    throws: "R",
  };
}

function buildWeather(): Weather {
  return {
    airDensityKgM3: 1.15,
    airPressureHpa: 1009,
    cancellationProbability: 3,
    cloudCoverPercent: 40,
    crosswindMph: 4,
    delayProbability: 32,
    dewPointF: 63,
    fetchedAt: "2026-06-22T16:00:00.000Z",
    flyBallEnvironment: 76,
    gameId: "game-phi-nym",
    groundBallEnvironment: 48,
    gustMph: 20,
    headwindMph: 0,
    hitterFriendlyRating: 72,
    homeRunEnvironment: 82,
    humidityPercent: 62,
    id: "weather-phi-nym",
    indoor: false,
    offenseEnvironment: 71,
    pitchingEnvironment: 43,
    pitcherFriendlyRating: 41,
    rainChancePercent: 44,
    rainIntensityInchesPerHour: 0.02,
    relativeWindDirection: "Tailwind",
    roofStatus: "open",
    runEnvironment: 69,
    source: "mock",
    stadium: "Citi Field",
    stormRisk: 12,
    strikeoutEnvironment: 44,
    summary: "Warm with wind out",
    tailwindMph: 14,
    temperatureF: 89,
    visibilityMiles: 10,
    weatherApplicable: true,
    weatherConfidence: 86,
    weatherSeverity: 42,
    windDirection: "Out to left",
    windDirectionDegrees: 205,
    windMph: 14,
  };
}

function buildMoneyline(slate: DailySlateViewModel): MoneylineIntelligenceViewModel {
  const game = slate.games[0];
  const evaluation = {
    away: {
      bullpenScore: 66,
      defenseScore: 50,
      environmentScore: 58,
      homeFieldScore: 50,
      matchupScore: 69,
      offenseScore: 71,
      overallTeamGrade: 73,
      projectedRunDifferential: 0.8,
      projectedRuns: 4.9,
      startingPitchingScore: 72,
      team: game.awayTeam,
    },
    awayTeam: game.awayTeam,
    confidence: 79,
    edgePercent: 6.4,
    edgePercentDisplay: "+6.4%",
    expectedValuePercent: 5.5,
    expectedValueDisplay: "+5.5%",
    factors: [
      {
        awayScore: 72,
        details: [],
        explanation: "Starting pitching advantage.",
        homeScore: 61,
        label: "Starting Pitching",
        winner: "away",
        weight: "25%",
      },
      {
        awayScore: 68,
        details: [],
        explanation: "Bullpen advantage.",
        homeScore: 55,
        label: "Bullpen",
        winner: "away",
        weight: "15%",
      },
    ],
    fairOdds: -142,
    fairOddsDisplay: "-142",
    game,
    home: {
      bullpenScore: 55,
      defenseScore: 50,
      environmentScore: 58,
      homeFieldScore: 57,
      matchupScore: 61,
      offenseScore: 64,
      overallTeamGrade: 64,
      projectedRunDifferential: -0.8,
      projectedRuns: 4.1,
      startingPitchingScore: 61,
      team: game.homeTeam,
    },
    homeTeam: game.homeTeam,
    impliedSportsbookProbability: 0.51,
    projectedWinner: game.awayTeam,
    reasons: ["Starting pitching advantage", "Bullpen advantage"],
    recommendation: "Play",
    sportsbookOdds: 112,
    sportsbookOddsDisplay: "+112",
    summary: "Existing Moneyline Intelligence projects an away-side edge.",
    winProbability: 0.58,
    winProbabilityDisplay: "58%",
  } satisfies MoneylineGameEvaluation;

  return {
    games: [evaluation],
    slateMeta: {
      averageConfidence: "79%",
      dataSource: slate.dataSource,
      gamesEvaluated: 1,
      lastUpdated: slate.slateMeta.lastUpdated,
    },
  };
}

function buildEmptySlate(): DailySlateViewModel {
  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [],
    injuries: [],
    kpiMetrics: [],
    propCategories: [],
    slateMeta: {
      averageConfidence: "0%",
      currentDate: "June 22, 2026",
      dataSource: "mock",
      dataSourceMessage: "Using Mock Data",
      firstPitchCountdown: "No games",
      gamesToday: 0,
      lastUpdated: "2026-06-22T16:00:00.000Z",
    },
    weatherReports: [],
  };
}
