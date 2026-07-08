import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRunLineCandidate,
  buildRunLineViewModel,
  rankRunLineCandidates,
} from "../src/features/run-line-intelligence/service.ts";
import { BacktestRunner, buildMockHistoricalSlates } from "../src/services/backtesting/index.ts";
import { CalibrationCalculator, joinCompletedPredictions } from "../src/services/calibration/index.ts";
import type { DailySlateGame, DailySlateViewModel } from "../src/services/daily-slate/types.ts";
import type { MatchupIntelligenceResult } from "../src/services/matchup/index.ts";
import type { Pitcher, Team, Weather } from "../src/models/mlb.ts";

test("buildRunLineCandidate calculates margin, spread, cover probability, edge, EV, and confidence", () => {
  const candidate = buildRunLineCandidate({ ...buildContext(), side: "away" });

  assert.equal(candidate.selectedTeam.name, "Phillies");
  assert.ok(Number.isFinite(candidate.projectedMargin));
  assert.ok(Number.isFinite(candidate.sportsbookRunLine));
  assert.ok(Number.isFinite(candidate.fairSpread));
  assert.ok(candidate.coverProbability > 0 && candidate.coverProbability < 1);
  assert.ok(candidate.winProbability > 0 && candidate.winProbability < 1);
  assert.ok(Number.isFinite(candidate.edgePercent));
  assert.ok(Number.isFinite(candidate.expectedValuePercent));
  assert.ok(candidate.confidence > 0);
  assert.ok(candidate.gameGrade > 0);
});

test("run line scoring includes required factors and explanations", () => {
  const candidate = buildRunLineCandidate({ ...buildContext(), side: "away" });

  assert.ok(candidate.factors.some((factor) => factor.label === "Projected Margin"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Starting Pitching"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Bullpen Difference"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Offense Difference"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Pitch/Zone Match"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Late Inning Advantage"));
  assert.ok(candidate.factors.some((factor) => factor.label === "Blowout Potential"));
  assert.ok(candidate.reasons.length > 0);
});

test("rankRunLineCandidates integrates with RankingEngine", () => {
  const primary = buildRunLineCandidate({ ...buildContext(), side: "away" });
  const secondary = {
    ...buildRunLineCandidate({ ...buildContext({ awayStrength: 44, homeStrength: 76 }), side: "home" }),
    confidence: 45,
    edgePercent: 0.4,
    expectedValuePercent: -2,
    gameGrade: 42,
  };
  const ranked = rankRunLineCandidates([secondary, primary]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].selectedTeam.name, "Phillies");
  assert.equal(ranked[0].ranked?.rank, 1);
  assert.ok((ranked[0].ranked?.trueLineScore ?? 0) >= (ranked[1].ranked?.trueLineScore ?? 0));
});

test("buildRunLineViewModel assembles slate metadata and top candidate", () => {
  const slate = buildSlate();
  const candidates = rankRunLineCandidates([
    buildRunLineCandidate({ ...buildContext(), side: "away" }),
    buildRunLineCandidate({ ...buildContext(), side: "home" }),
  ]);
  const viewModel = buildRunLineViewModel(slate, candidates);

  assert.equal(viewModel.slateMeta.candidateCount, 2);
  assert.equal(viewModel.topCandidate?.selectedTeam.name, "Phillies");
  assert.ok(viewModel.slateMeta.averageConfidence.endsWith("%"));
});

test("calibration and backtesting support run-line market records generically", () => {
  const slates = buildMockHistoricalSlates();
  const extraSlate = {
    calibrationRecords: {
      predictions: [
        {
          confidence: 73,
          edgePercent: 4.4,
          expectedValuePercent: 3.1,
          fairOdds: -108,
          gameId: "run-line-test",
          market: "run-line" as const,
          modelId: "trueline-v1",
          modelProbability: 0.56,
          odds: -110,
          predictionId: "run-line-test",
          recommendation: "Play",
          sportsbook: "DraftKings",
          teamId: "team-phi",
          timestamp: "2026-06-22T16:00:00.000Z",
        },
      ],
      results: [
        {
          closingEdgePercent: 2.9,
          gameId: "run-line-test",
          market: "run-line" as const,
          outcome: "win" as const,
          predictionId: "run-line-test",
          recordedAt: "2026-06-22T23:00:00.000Z",
        },
      ],
    },
    date: "2026-06-22",
    slateId: "run-line-slate",
  };
  const completed = joinCompletedPredictions(
    extraSlate.calibrationRecords.predictions,
    extraSlate.calibrationRecords.results,
  );
  const summary = new CalibrationCalculator().calculateSummary(completed);
  const backtest = new BacktestRunner().run([...slates, extraSlate], {
    bankroll: { mode: "flat", startingBankroll: 1000, unitSize: 10 },
    settings: { market: "run-line" },
  });

  assert.equal(summary.predictionCount, 1);
  assert.ok(summary.roi > 0);
  assert.equal(backtest.summary.totalBets, 1);
  assert.equal(backtest.marketBreakdown[0].label, "run-line");
});

function buildContext(
  overrides: {
    awayStrength?: number;
    homeStrength?: number;
  } = {},
) {
  const awayTeam = buildTeam("team-phi", "PHI", "Phillies", overrides.awayStrength ?? 78);
  const homeTeam = buildTeam("team-nym", "NYM", "Mets", overrides.homeStrength ?? 48);
  const game = buildGame(awayTeam, homeTeam);

  return {
    awayMatchup: buildMatchup(82),
    game,
    homeMatchup: buildMatchup(48),
  };
}

function buildSlate(): DailySlateViewModel {
  const awayTeam = buildTeam("team-phi", "PHI", "Phillies", 78);
  const homeTeam = buildTeam("team-nym", "NYM", "Mets", 48);
  const game = buildGame(awayTeam, homeTeam);

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
  const homePitcher = buildPitcher("pitcher-senga", "Kodai Senga", homeTeam.id, 4.6);
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
          price: -110,
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
        awayFairMoneyline: -160,
        awayProjectedRuns: 5.4,
        awayWinProbability: 0.61,
        confidenceScore: 78,
        dataQuality: { inputs: {}, missingInputs: [], score: 82 },
        edgePercent: 4,
        expectedValuePercent: 3,
        explanations: [],
        gameId: "game-phi-nym",
        homeFairMoneyline: 145,
        homeProjectedRuns: 3.4,
        homeWinProbability: 0.39,
        impliedSportsbookProbability: 0.52,
        modelBreakdown: { factors: {}, totalContributionPercent: 0 },
        predictedWinnerTeamId: awayTeam.id,
        predictionVersion: "v1",
        projectedTotalRuns: 8.8,
        recommendation: "Play",
        selectedFairMoneyline: -160,
        selectedTeamId: awayTeam.id,
        selectedWinProbability: 0.61,
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
      averageOps: strength >= 70 ? 0.82 : 0.68,
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
        era: strength >= 70 ? 3.2 : 4.8,
        strikeoutRate: 24,
        value: strength,
        whip: strength >= 70 ? 1.1 : 1.38,
        workloadRating: strength >= 70 ? 38 : 78,
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

function buildMatchup(score: number): MatchupIntelligenceResult {
  return {
    arsenal: {} as MatchupIntelligenceResult["arsenal"],
    batterProfiles: [],
    confidence: 82,
    contextScores: [],
    fetchedAt: "2026-06-22T16:00:00.000Z",
    overallMatchupScore: score,
    pitchMix: [],
    pitchTypeMatch: {
      explanation: "Fastball profile favors the lineup.",
      matches: [],
      score,
      topAdvantages: ["Excellent pitch matchup"],
      topWeaknesses: [],
    },
    reasons: ["Excellent pitch matchup"],
    recentMatchup: { confidence: 80, explanation: "Strong recent form", score },
    zoneMatch: {
      reasons: ["Zone match favors hitters"],
      score: score - 4,
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
    runDifferentialPerGame: strength >= 70 ? 1.4 : -1.2,
    runsAllowedPerGame: 4,
    runsPerGame: strength >= 70 ? 5.8 : 3.7,
    whip: 1.25,
    winPercentage: 0.6,
    wins: Math.round(window * 0.6),
    window,
  };
}
