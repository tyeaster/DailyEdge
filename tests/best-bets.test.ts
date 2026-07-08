import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBestBetsViewModel,
  type BestBetsViewModel,
} from "../src/features/best-bets/service.ts";
import type { GameTotalsViewModel } from "../src/features/game-totals-intelligence/service.ts";
import type { HomeRunIntelligenceViewModel } from "../src/features/home-run-intelligence/service.ts";
import type { MoneylineIntelligenceViewModel } from "../src/features/moneyline-intelligence/service.ts";
import type { RunLineViewModel } from "../src/features/run-line-intelligence/service.ts";
import type { TeamTotalsViewModel } from "../src/features/team-totals-intelligence/service.ts";
import type { TotalBasesViewModel } from "../src/features/total-bases-intelligence/service.ts";
import type { CalibrationDashboardViewModel } from "../src/services/calibration/index.ts";
import type { DailySlateViewModel } from "../src/services/daily-slate/types.ts";
import type { OddsIntelligenceDashboardViewModel } from "../src/services/odds-intelligence/types.ts";

test("buildBestBetsViewModel aggregates every supported market", () => {
  const viewModel = buildViewModel();
  const markets = new Set(viewModel.top50.map((bet) => bet.market));

  assert.ok(markets.has("strikeouts"));
  assert.ok(markets.has("hits"));
  assert.ok(markets.has("total-bases"));
  assert.ok(markets.has("home-runs"));
  assert.ok(markets.has("moneyline"));
  assert.ok(markets.has("team-total"));
  assert.ok(markets.has("game-total"));
  assert.ok(markets.has("run-line"));
  assert.equal(viewModel.slateMeta.markets, 8);
});

test("best bets ranking sorts by TrueLine score across markets", () => {
  const viewModel = buildViewModel();
  const scores = viewModel.top50.map((bet) => bet.ranked.trueLineScore);

  assert.ok(scores.length > 1);
  assert.deepEqual(scores, [...scores].sort((left, right) => right - left));
  assert.equal(viewModel.top10[0].ranked.rank, 1);
});

test("filters support market, confidence, edge, EV, sportsbook, and risk tier", () => {
  const marketFiltered = buildViewModel({ market: "run-line" });
  const confidenceFiltered = buildViewModel({ minimumConfidence: 80 });
  const edgeFiltered = buildViewModel({ minimumEdge: 4 });
  const evFiltered = buildViewModel({ minimumExpectedValue: 3 });
  const sportsbookFiltered = buildViewModel({ sportsbook: "DraftKings" });
  const riskFiltered = buildViewModel({ riskTier: "High" });

  assert.ok(marketFiltered.top50.every((bet) => bet.market === "run-line"));
  assert.ok(confidenceFiltered.top50.every((bet) => bet.ranked.candidate.confidence >= 80));
  assert.ok(edgeFiltered.top50.every((bet) => bet.ranked.candidate.edgePercent >= 4));
  assert.ok(evFiltered.top50.every((bet) => bet.ranked.candidate.expectedValuePercent >= 3));
  assert.ok(sportsbookFiltered.top50.every((bet) => bet.sportsbook === "DraftKings"));
  assert.ok(riskFiltered.top50.every((bet) => bet.ranked.riskTier === "High"));
});

test("view model exposes top 10, top 25, top 50, and market summary", () => {
  const viewModel = buildViewModel();

  assert.ok(viewModel.top10.length <= 10);
  assert.ok(viewModel.top25.length <= 25);
  assert.ok(viewModel.top50.length >= viewModel.top25.length);
  assert.ok(viewModel.marketSummary.length > 0);
  assert.ok(viewModel.slateMeta.candidateCount === viewModel.top50.length);
});

test("recommendations include ranking, calibration, historical performance, and CLV explanations", () => {
  const viewModel = buildViewModel();
  const top = viewModel.top10[0];

  assert.ok(top.reasons.some((reason) => reason.includes("Historical ROI")));
  assert.ok(top.reasons.some((reason) => reason.includes("CLV")));
  assert.ok(top.calibration.winRateDisplay.endsWith("%"));
  assert.ok(top.calibration.roiDisplay.includes("%"));
  assert.ok(top.ranked.explanations.length > 0);
});

function buildViewModel(filters: Parameters<typeof buildBestBetsViewModel>[0]["filters"] = {}): BestBetsViewModel {
  return buildBestBetsViewModel({
    calibration: buildCalibration(),
    filters,
    gameTotals: buildGameTotals(),
    homeRuns: buildHomeRuns(),
    moneyline: buildMoneyline(),
    oddsIntelligence: buildOddsIntelligence(),
    runLine: buildRunLine(),
    slate: buildSlate(),
    teamTotals: buildTeamTotals(),
    totalBases: buildTotalBases(),
  });
}

function buildSlate(): DailySlateViewModel {
  const team = buildTeam("team-phi", "Phillies", "PHI");
  const opponent = buildTeam("team-nym", "Mets", "NYM");

  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [
      {
        awayPitcher: buildPitcher("pitcher-phi", "Zack Wheeler", team.id),
        awayTeam: team,
        game: buildGame(team.id, opponent.id),
        homePitcher: buildPitcher("pitcher-nym", "Kodai Senga", opponent.id),
        homeTeam: opponent,
        weather: buildWeather(),
      },
    ],
    injuries: [],
    kpiMetrics: [],
    propCategories: [
      {
        label: "Strikeouts",
        props: [
          {
            player: buildPitcher("pitcher-phi", "Zack Wheeler", team.id),
            prop: buildProp("prop-k", "Strikeouts", "game-1", 5.5, -115, 6.8, 7.2, "Strikeout edge from matchup."),
            team,
          },
        ],
      },
      {
        label: "Hits",
        props: [
          {
            player: buildPlayer("player-hit", "Trea Turner", team.id),
            prop: buildProp("prop-hit", "Hits", "game-1", 0.5, -120, 4.2, 5.1, "Hit edge from matchup."),
            team,
          },
        ],
      },
      {
        label: "Total Bases",
        props: [
          {
            player: buildPlayer("player-tb", "Bryce Harper", team.id),
            prop: buildProp("prop-tb", "Total Bases", "game-1", 1.5, 105, 3.4, 4.0, "Total base edge from power profile."),
            team,
          },
        ],
      },
    ],
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
  } as unknown as DailySlateViewModel;
}

function buildHomeRuns(): HomeRunIntelligenceViewModel {
  return {
    candidates: [
      {
        batter: buildPlayer("player-hr", "Kyle Schwarber", "team-phi"),
        confidence: 78,
        edgePercent: 5.2,
        expectedValuePercent: 4.1,
        explanations: ["Elite barrel profile", "Positive weather"],
        fairOdds: 340,
        fairOddsDisplay: "+340",
        game: {
          awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
          game: buildGame("team-phi", "team-nym"),
          homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        },
        hrProbability: 0.23,
        matchup: { overall: 82, pitch: 80, zone: 78 },
        opponent: buildTeam("team-nym", "Mets", "NYM"),
        overallHrScore: 84,
        recommendation: "Strong Play",
        sportsbook: { odds: 420, oddsDisplay: "+420", sportsbook: "DraftKings" },
        summary: "HR matchup grades strongly.",
        team: buildTeam("team-phi", "Phillies", "PHI"),
      },
    ],
  } as unknown as HomeRunIntelligenceViewModel;
}

function buildMoneyline(): MoneylineIntelligenceViewModel {
  return {
    games: [
      {
        away: { overallTeamGrade: 78 },
        awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
        confidence: 74,
        edgePercent: 4.8,
        expectedValuePercent: 3.4,
        factors: [{ awayScore: 78, explanation: "Starting pitching advantage", homeScore: 54, label: "Starting Pitching" }],
        fairOdds: -145,
        fairOddsDisplay: "-145",
        game: {
          awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
          game: buildGame("team-phi", "team-nym"),
          homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        },
        home: { overallTeamGrade: 54 },
        homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        projectedWinner: buildTeam("team-phi", "Phillies", "PHI"),
        reasons: ["Starting pitching advantage"],
        recommendation: "Play",
        sportsbookOdds: -120,
        sportsbookOddsDisplay: "-120",
        winProbability: 0.59,
      },
    ],
  } as unknown as MoneylineIntelligenceViewModel;
}

function buildTeamTotals(): TeamTotalsViewModel {
  return {
    candidates: [
      {
        confidence: 76,
        edgePercent: 4.6,
        expectedValuePercent: 3.5,
        factors: [{ explanation: "Elite offense", label: "Offense Quality", score: 82 }],
        fairTotalDisplay: "5.4",
        game: {
          awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
          game: buildGame("team-phi", "team-nym"),
          homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        },
        gameGrade: 78,
        opponent: buildTeam("team-nym", "Mets", "NYM"),
        projectedRuns: 5.4,
        reasons: ["Elite offense"],
        recommendation: "Play",
        sportsbookOdds: -110,
        sportsbookTotal: 4.5,
        sportsbookTotalDisplay: "4.5",
        team: buildTeam("team-phi", "Phillies", "PHI"),
      },
    ],
  } as unknown as TeamTotalsViewModel;
}

function buildTotalBases(): TotalBasesViewModel {
  return {
    candidates: [
      {
        batter: buildPlayer("player-tb", "Bryce Harper", "team-phi"),
        confidence: 77,
        edgePercent: 4.9,
        expectedValuePercent: 3.8,
        factors: [{ explanation: "Strong total-base context", label: "Player Intelligence", score: 79 }],
        fairLineDisplay: "2.2",
        game: {
          awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
          game: buildGame("team-phi", "team-nym"),
          homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        },
        gameGrade: 79,
        matchup: { overall: 81, pitch: 78, zone: 77 },
        opponent: buildTeam("team-nym", "Mets", "NYM"),
        playerIntelligence: { recentForm: 78 },
        projectedTotalBases: 2.2,
        reasons: ["Pitch Match favors the hitter"],
        recommendation: "Play",
        sportsbookLine: 1.5,
        sportsbookLineDisplay: "Over 1.5 Total Bases",
        sportsbookOdds: 105,
        team: buildTeam("team-phi", "Phillies", "PHI"),
      },
    ],
  } as unknown as TotalBasesViewModel;
}

function buildGameTotals(): GameTotalsViewModel {
  return {
    candidates: [
      {
        confidence: 73,
        edgePercent: 3.8,
        expectedValuePercent: 2.7,
        factors: [{ explanation: "Wind blowing out", label: "Weather", score: 80 }],
        fairTotalDisplay: "9.4",
        game: {
          awayTeam: buildTeam("team-phi", "Phillies", "PHI"),
          game: buildGame("team-phi", "team-nym"),
          homeTeam: buildTeam("team-nym", "Mets", "NYM"),
        },
        gameGrade: 75,
        projectedRuns: 9.4,
        reasons: ["Wind blowing out"],
        recommendation: "Lean",
        side: "Over",
        sportsbookOdds: -110,
        sportsbookTotal: 8.5,
        sportsbookTotalDisplay: "8.5",
      },
    ],
  } as unknown as GameTotalsViewModel;
}

function buildRunLine(): RunLineViewModel {
  return {
    candidates: [
      {
        confidence: 75,
        coverProbability: 0.57,
        edgePercent: 4.1,
        expectedValuePercent: 3.1,
        factors: [{ explanation: "Large projected gap", label: "Projected Margin", score: 80 }],
        fairSpreadDisplay: "-2.0",
        game: { game: buildGame("team-phi", "team-nym") },
        gameGrade: 77,
        opponent: buildTeam("team-nym", "Mets", "NYM"),
        reasons: ["Large projected scoring gap"],
        recommendation: "Play",
        selectedTeam: buildTeam("team-phi", "Phillies", "PHI"),
        side: "away",
        sportsbookOdds: -110,
        sportsbookRunLineDisplay: "-1.5",
      },
    ],
  } as unknown as RunLineViewModel;
}

function buildCalibration(): CalibrationDashboardViewModel {
  const markets = ["strikeouts", "hits", "total-bases", "home-runs", "moneyline", "team-total", "game-total", "run-line"] as const;

  return {
    marketPerformance: markets.map((market) => ({
      averageConfidence: 72,
      averageEdge: 3.1,
      averageEv: 2.4,
      calibration: 84,
      confidenceAccuracy: 81,
      market,
      modelId: "trueline-v1",
      predictionCount: 42,
      roi: 6.5,
      winRate: 56.2,
    })),
    overallMetrics: { averageClv: 2.2 },
  } as unknown as CalibrationDashboardViewModel;
}

function buildOddsIntelligence(): OddsIntelligenceDashboardViewModel {
  return {
    movementHistory: [
      {
        analysis: { clvPercent: 3.4 },
        market: "run-line",
        predictionId: "run-line-game-1-away",
      },
    ],
  } as unknown as OddsIntelligenceDashboardViewModel;
}

function buildGame(awayTeamId: string, homeTeamId: string) {
  return {
    awayTeamId,
    homeTeamId,
    id: "game-1",
    odds: {
      moneyline: { price: -120, sportsbook: "DraftKings" },
      spread: { price: -110, sportsbook: "DraftKings" },
      total: { price: -110, sportsbook: "DraftKings" },
    },
    prediction: { dataQuality: { score: 82 } },
    scheduledAt: "2026-06-22T23:10:00.000Z",
  };
}

function buildProp(
  id: string,
  category: string,
  gameId: string,
  line: number,
  price: number,
  edge: number,
  confidence: number,
  reasoning: string,
) {
  return {
    category,
    confidence: { label: "High", value: confidence * 10 },
    edge: { percentage: edge, rating: "A" },
    gameId,
    id,
    odds: {
      displayLine: `${line}`,
      line,
      price,
      sportsbook: "DraftKings",
      updatedAt: "2026-06-22T16:00:00.000Z",
    },
    playerId: id,
    projection: `${line + 1}`,
    reasoning,
  };
}

function buildTeam(id: string, name: string, abbreviation: string) {
  return { abbreviation, id, name };
}

function buildPlayer(id: string, fullName: string, teamId: string) {
  return { fullName, id, teamId };
}

function buildPitcher(id: string, fullName: string, teamId: string) {
  return { fullName, id, teamId };
}

function buildWeather() {
  return { id: "weather-1" };
}
