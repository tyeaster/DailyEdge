import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeamTotalCandidate,
  buildTeamTotalsViewModel,
  rankTeamTotalCandidates,
} from "../src/features/team-totals-intelligence/service.ts";
import { BacktestRunner, buildMockHistoricalSlates } from "../src/services/backtesting/index.ts";
import { CalibrationCalculator, joinCompletedPredictions } from "../src/services/calibration/index.ts";
import type { DailySlateGame, DailySlateViewModel } from "../src/services/daily-slate/types.ts";
import type { MatchupIntelligenceResult } from "../src/services/matchup/index.ts";
import type { Pitcher, Team, Weather } from "../src/models/mlb.ts";

test("buildTeamTotalCandidate projects runs, edge, EV, confidence, and recommendation", () => {
  const context = buildContext();
  const candidate = buildTeamTotalCandidate(context);

  assert.equal(candidate.team.name, "Phillies");
  assert.ok(candidate.projectedRuns > 0);
  assert.ok(candidate.sportsbookTotal > 0);
  assert.ok(Number.isFinite(candidate.edgePercent));
  assert.ok(Number.isFinite(candidate.expectedValuePercent));
  assert.ok(candidate.confidence > 0);
  assert.ok(candidate.gameGrade > 0);
  assert.ok(candidate.reasons.length > 0);
});

test("team total scoring includes required factors and explanations", () => {
  const candidate = buildTeamTotalCandidate(buildContext());

  assert.ok(candidate.factors.some((factor) => factor.label === "Offense Quality"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Pitch/Zone Match"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Bullpen Strength"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Weather"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Opponent Defense"));
  assert.ok(candidate.reasons.some((reason) => reason.includes("offense") || reason.includes("matchup")));
});

test("rankTeamTotalCandidates integrates with RankingEngine", () => {
  const primary = buildTeamTotalCandidate(buildContext());
  const secondary = {
    ...buildTeamTotalCandidate(buildContext({ teamName: "Mets", teamId: "team-nym" })),
    confidence: 52,
    edgePercent: 0.5,
    expectedValuePercent: -1,
    gameGrade: 48,
  };
  const ranked = rankTeamTotalCandidates([secondary, primary]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].team.name, "Phillies");
  assert.equal(ranked[0].ranked?.rank, 1);
  assert.ok((ranked[0].ranked?.trueLineScore ?? 0) >= (ranked[1].ranked?.trueLineScore ?? 0));
});

test("buildTeamTotalsViewModel assembles slate metadata and top candidate", () => {
  const slate = buildSlate();
  const candidates = rankTeamTotalCandidates([buildTeamTotalCandidate(buildContext())]);
  const viewModel = buildTeamTotalsViewModel(slate, candidates);

  assert.equal(viewModel.slateMeta.candidateCount, 1);
  assert.equal(viewModel.topCandidate?.team.name, "Phillies");
  assert.ok(viewModel.slateMeta.averageConfidence.endsWith("%"));
});

test("calibration and backtesting support team-total market records generically", () => {
  const slates = buildMockHistoricalSlates();
  const extraSlate = {
    calibrationRecords: {
      predictions: [
        {
          confidence: 72,
          edgePercent: 4.8,
          expectedValuePercent: 3.4,
          fairOdds: -112,
          gameId: "game-team-total",
          market: "team-total" as const,
          modelId: "trueline-v1",
          modelProbability: 0.56,
          odds: -110,
          predictionId: "team-total-test",
          recommendation: "Play",
          sportsbook: "DraftKings",
          teamId: "team-phi",
          timestamp: "2026-06-22T16:00:00.000Z",
        },
      ],
      results: [
        {
          closingEdgePercent: 3.7,
          gameId: "game-team-total",
          market: "team-total" as const,
          outcome: "win" as const,
          predictionId: "team-total-test",
          recordedAt: "2026-06-22T23:00:00.000Z",
        },
      ],
    },
    date: "2026-06-22",
    slateId: "team-total-slate",
  };
  const completed = joinCompletedPredictions(
    extraSlate.calibrationRecords.predictions,
    extraSlate.calibrationRecords.results,
  );
  const summary = new CalibrationCalculator().calculateSummary(completed);
  const backtest = new BacktestRunner().run([...slates, extraSlate], {
    bankroll: { mode: "flat", startingBankroll: 1000, unitSize: 10 },
    settings: { market: "team-total" },
  });

  assert.equal(summary.predictionCount, 1);
  assert.ok(summary.roi > 0);
  assert.equal(backtest.summary.totalBets, 1);
  assert.equal(backtest.marketBreakdown[0].label, "team-total");
});

function buildContext(overrides: { teamId?: string; teamName?: string } = {}) {
  const team = buildTeam(overrides.teamId ?? "team-phi", "PHI", overrides.teamName ?? "Phillies", 78);
  const opponent = buildTeam("team-nym", "NYM", "Mets", 48);
  const game = buildGame(team, opponent);

  return {
    game,
    isHome: false,
    matchup: buildMatchup(),
    opponent,
    opponentPitcher: game.homePitcher,
    team,
  };
}

function buildSlate(): DailySlateViewModel {
  const team = buildTeam("team-phi", "PHI", "Phillies", 78);
  const opponent = buildTeam("team-nym", "NYM", "Mets", 48);
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

function buildGame(awayTeam: Team, homeTeam: Team): DailySlateGame {
  const awayPitcher = buildPitcher("pitcher-wheeler", "Zack Wheeler", awayTeam.id, 2.72);
  const homePitcher = buildPitcher("pitcher-senga", "Kodai Senga", homeTeam.id, 4.4);
  const weather = buildWeather();

  return {
    awayPitcher,
    awayTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: awayTeam.id,
      ballpark: {
        hitterFriendlyRating: 72,
        homeRunFactor: 108,
        name: "Citi Field",
        overallParkRating: 66,
        pitcherFriendlyRating: 42,
        runFactor: 110,
      },
      confidence: { label: "High", value: 78 },
      detail: "Mock game",
      homePitcherId: homePitcher.id,
      homeTeamId: homeTeam.id,
      id: "game-phi-nym",
      modelProbability: 0.56,
      odds: {
        moneyline: {
          displayLine: "PHI -120",
          id: "moneyline",
          line: -120,
          market: "moneyline",
          movement: "+4",
          price: -120,
          sportsbook: "DraftKings",
        },
        spread: {
          displayLine: "PHI -1.5",
          id: "spread",
          line: -1.5,
          market: "spread",
          movement: "0",
          price: 135,
          sportsbook: "DraftKings",
        },
        total: {
          displayLine: "8.5",
          id: "total",
          line: 8.5,
          market: "total",
          movement: "+0.5",
          price: -110,
          sportsbook: "DraftKings",
        },
      },
      prediction: {
        awayFairMoneyline: -130,
        awayProjectedRuns: 5.2,
        awayWinProbability: 0.56,
        confidenceScore: 78,
        dataQuality: { inputs: {}, missingInputs: [], score: 82 },
        edgePercent: 4,
        expectedValuePercent: 3,
        explanations: [],
        gameId: "game-phi-nym",
        homeFairMoneyline: 130,
        homeProjectedRuns: 3.8,
        homeWinProbability: 0.44,
        impliedSportsbookProbability: 0.52,
        modelBreakdown: { factors: {}, totalContributionPercent: 0 },
        predictedWinnerTeamId: awayTeam.id,
        predictionVersion: "v1",
        projectedTotalRuns: 9,
        recommendation: "Play",
        selectedFairMoneyline: -130,
        selectedTeamId: awayTeam.id,
        selectedWinProbability: 0.56,
        sportsbook: "DraftKings",
        sportsbookLine: "PHI -120",
        sportsbookMoneyline: -120,
      },
      scheduledAt: "2026-06-22T23:10:00.000Z",
      status: "scheduled",
      venue: "Citi Field",
      weather,
      weatherId: weather.id,
    },
    homePitcher,
    homeTeam,
    weather,
  } as unknown as DailySlateGame;
}

function buildTeam(id: string, abbreviation: string, name: string, strength: number): Team {
  return {
    abbreviation,
    city: name,
    division: "East",
    id,
    league: "NL",
    lineup: {
      averageOps: 0.82,
      averageStrikeoutRate: 0.2,
      averageWrcPlus: null,
      contactRating: strength,
      fetchedAt: "2026-06-22T16:00:00.000Z",
      handedness: { balanceRating: 70, left: 3, right: 5, switch: 1 },
      lineupConfidence: 84,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: strength,
      players: [],
      powerRating: strength,
      replacementQuality: 60,
      source: "mock",
      status: "confirmed",
    },
    name,
    recentForm: {
      fetchedAt: "2026-06-22T16:00:00.000Z",
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
        era: strength >= 70 ? 4.8 : 3.2,
        strikeoutRate: 22,
        value: strength >= 70 ? 42 : 72,
        whip: 1.35,
        workloadRating: strength >= 70 ? 78 : 38,
      },
      fetchedAt: "2026-06-22T16:00:00.000Z",
      offense: {
        available: true,
        battingAverage: 0.268,
        ops: strength >= 70 ? 0.82 : 0.69,
        runsPerGame: strength >= 70 ? 5.4 : 3.8,
        strikeoutRate: 19,
        value: strength,
        walkRate: 9,
      },
      overall: { available: true, runDifferential: strength, value: strength },
      pitching: { available: true, era: 4, runsAllowedPerGame: 4.2, value: strength, whip: 1.25 },
      source: "mock",
    },
  };
}

function buildPitcher(id: string, fullName: string, teamId: string, era: number): Pitcher {
  return {
    arsenal: ["Four-seam", "Slider"],
    bats: "R",
    era,
    fullName,
    handedness: "R",
    homeRunsPer9: era >= 4 ? 1.4 : 0.8,
    id,
    inningsPitched: 80,
    position: "SP",
    strikeoutRate: era >= 4 ? 20 : 30,
    teamId,
    throws: "R",
    whip: era >= 4 ? 1.35 : 1.02,
  };
}

function buildWeather(): Weather {
  return {
    airDensityKgM3: 1.14,
    airPressureHpa: 1008,
    cancellationProbability: 2,
    cloudCoverPercent: 25,
    crosswindMph: 2,
    delayProbability: 5,
    dewPointF: 63,
    fetchedAt: "2026-06-22T16:00:00.000Z",
    flyBallEnvironment: 76,
    gameId: "game-phi-nym",
    groundBallEnvironment: 46,
    gustMph: 18,
    headwindMph: 0,
    hitterFriendlyRating: 76,
    homeRunEnvironment: 78,
    humidityPercent: 60,
    id: "weather-1",
    indoor: false,
    offenseEnvironment: 74,
    pitchingEnvironment: 42,
    pitcherFriendlyRating: 38,
    rainChancePercent: 10,
    rainIntensityInchesPerHour: 0,
    relativeWindDirection: "Tailwind",
    roofStatus: "open",
    runEnvironment: 76,
    source: "mock",
    stadium: "Citi Field",
    stormRisk: 4,
    strikeoutEnvironment: 42,
    summary: "Warm, wind out",
    tailwindMph: 14,
    temperatureF: 84,
    visibilityMiles: 10,
    weatherApplicable: true,
    weatherConfidence: 88,
    weatherSeverity: 30,
    windDirection: "Out",
    windDirectionDegrees: 205,
    windMph: 14,
  };
}

function buildMatchup(): MatchupIntelligenceResult {
  return {
    arsenal: {} as MatchupIntelligenceResult["arsenal"],
    batterProfiles: [],
    confidence: 82,
    contextScores: [],
    fetchedAt: "2026-06-22T16:00:00.000Z",
    overallMatchupScore: 78,
    pitchMix: [],
    pitchTypeMatch: {
      explanation: "Fastball profile favors the lineup.",
      matches: [],
      score: 80,
      topAdvantages: ["Excellent pitch matchup"],
      topWeaknesses: [],
    },
    reasons: ["Excellent pitch matchup"],
    recentMatchup: { confidence: 80, explanation: "Strong recent form", score: 76 },
    zoneMatch: {
      reasons: ["Zone match favors hitters"],
      score: 76,
    },
  };
}

function recentWindow(window: 7 | 14 | 30, strength: number) {
  return {
    available: true,
    battingAverage: 0.265,
    era: 4,
    gamesPlayed: window,
    losses: Math.round(window * 0.4),
    ops: strength >= 70 ? 0.82 : 0.68,
    rating: { available: true, value: strength },
    runDifferential: strength,
    runDifferentialPerGame: 1,
    runsAllowedPerGame: 4,
    runsPerGame: strength >= 70 ? 5.8 : 3.7,
    whip: 1.25,
    winPercentage: 0.6,
    wins: Math.round(window * 0.6),
    window,
  };
}
