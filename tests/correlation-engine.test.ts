import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCorrelationViewModel,
  ExposureAnalyzer,
} from "../src/features/correlation/service.ts";
import type { BestBetDisplayCandidate, BestBetsViewModel } from "../src/features/best-bets/service.ts";
import type { BetMarketType, RiskTier } from "../src/services/ranking/index.ts";

test("ExposureAnalyzer detects same player, team, game, sportsbook, and duplicate exposure", () => {
  const bets = buildBets();
  const analyzed = new ExposureAnalyzer().analyze(bets);
  const judgeHr = analyzed.find((item) => item.bet.id === "judge-hr");

  assert.ok(judgeHr);
  assert.ok(judgeHr.links.some((link) => link.type === "same-player"));
  assert.ok(judgeHr.links.some((link) => link.type === "same-team" || link.type === "same-offense"));
  assert.ok(judgeHr.links.some((link) => link.type === "same-sportsbook"));
  assert.ok(judgeHr.links.some((link) => link.type === "duplicate-exposure"));
});

test("exposure scoring calculates correlation diversification portfolio risk and conflicts", () => {
  const analyzed = new ExposureAnalyzer().analyze(buildBets());
  const gameUnder = analyzed.find((item) => item.bet.id === "game-under");

  assert.ok(gameUnder);
  assert.ok(gameUnder.metrics.exposureScore >= 0);
  assert.ok(gameUnder.metrics.correlationScore >= 0);
  assert.ok(gameUnder.metrics.diversificationScore <= 100);
  assert.ok(gameUnder.metrics.portfolioRisk >= 0);
  assert.ok(gameUnder.metrics.conflictScore > 0);
});

test("buildCorrelationViewModel generates exposure buckets and conflict warnings", () => {
  const viewModel = buildCorrelationViewModel(buildBestBets());

  assert.ok(viewModel.exposure.teams.some((bucket) => bucket.label === "Yankees"));
  assert.ok(viewModel.exposure.players.some((bucket) => bucket.label === "Aaron Judge"));
  assert.ok(viewModel.exposure.games.length > 0);
  assert.ok(viewModel.conflictWarnings.length > 0);
  assert.equal(viewModel.slateMeta.analyzedBets, buildBets().length);
});

test("portfolio generation returns diversified highest EV safest and aggressive portfolios", () => {
  const viewModel = buildCorrelationViewModel(buildBestBets());

  assert.ok(viewModel.diversifiedTop10.bets.length <= 10);
  assert.ok(viewModel.portfolios.highestEv.bets.length <= 10);
  assert.ok(viewModel.portfolios.safest.bets.length <= 10);
  assert.ok(viewModel.portfolios.aggressive.bets.length <= 10);
  assert.ok(viewModel.portfolios.highestEv.expectedValue >= viewModel.portfolios.safest.expectedValue);
});

test("view model separates highly correlated and independent bets", () => {
  const viewModel = buildCorrelationViewModel(buildBestBets());

  assert.ok(viewModel.highlyCorrelatedBets.length > 0);
  assert.ok(viewModel.independentBets.length > 0);
  assert.ok(viewModel.slateMeta.averageCorrelation.endsWith("%"));
  assert.ok(viewModel.slateMeta.averageExposure.endsWith("%"));
});

function buildBestBets(): BestBetsViewModel {
  const bets = buildBets();

  return {
    filters: {},
    marketSummary: [],
    slateMeta: {
      candidateCount: bets.length,
      dataSource: "mock",
      lastUpdated: "2026-06-22T16:00:00.000Z",
      markets: 6,
    },
    top10: bets.slice(0, 10),
    top25: bets,
    top50: bets,
  };
}

function buildBets(): BestBetDisplayCandidate[] {
  return [
    bet({
      id: "judge-hr",
      market: "home-runs",
      playerId: "judge",
      playerName: "Aaron Judge",
      rank: 1,
      teamId: "nyy",
      teamName: "Yankees",
      title: "Aaron Judge Home Run",
    }),
    bet({
      id: "judge-hit",
      market: "hits",
      playerId: "judge",
      playerName: "Aaron Judge",
      rank: 2,
      teamId: "nyy",
      teamName: "Yankees",
      title: "Aaron Judge Hits",
    }),
    bet({
      id: "judge-tb",
      market: "total-bases",
      playerId: "judge",
      playerName: "Aaron Judge",
      rank: 3,
      teamId: "nyy",
      teamName: "Yankees",
      title: "Aaron Judge Total Bases",
    }),
    bet({
      id: "nyy-tt",
      market: "team-total",
      rank: 4,
      teamId: "nyy",
      teamName: "Yankees",
      title: "Yankees Team Total",
    }),
    bet({
      id: "nyy-ml",
      market: "moneyline",
      rank: 5,
      teamId: "nyy",
      teamName: "Yankees",
      title: "Yankees Moneyline",
    }),
    bet({
      id: "game-over",
      market: "game-total",
      rank: 6,
      sportsbookLine: "Over 8.5",
      teamId: "nyy",
      teamName: "Yankees",
      title: "Yankees / Red Sox Over",
    }),
    bet({
      id: "game-under",
      market: "game-total",
      rank: 7,
      sportsbookLine: "Under 8.5",
      teamId: "bos",
      teamName: "Red Sox",
      title: "Yankees / Red Sox Under",
    }),
    bet({
      id: "mariners-k",
      market: "strikeouts",
      opponentId: "oak",
      opponentName: "Athletics",
      playerId: "kirby",
      playerName: "George Kirby",
      rank: 8,
      riskTier: "Low",
      teamId: "sea",
      teamName: "Mariners",
      title: "George Kirby Strikeouts",
    }),
  ];
}

function bet({
  id,
  market,
  opponentId = "bos",
  opponentName = "Red Sox",
  playerId,
  playerName,
  rank,
  riskTier = "Medium",
  sportsbookLine = "-110",
  teamId,
  teamName,
  title,
}: {
  id: string;
  market: BetMarketType;
  opponentId?: string;
  opponentName?: string;
  playerId?: string;
  playerName?: string;
  rank: number;
  riskTier?: RiskTier;
  sportsbookLine?: string;
  teamId: string;
  teamName: string;
  title: string;
}): BestBetDisplayCandidate {
  return {
    calibration: {
      clvDisplay: "+2.0%",
      confidenceCalibrationDisplay: "80.0%",
      historicalSimilarBets: "20",
      roiDisplay: "+5.0%",
      winRateDisplay: "55.0%",
    },
    display: {
      confidence: "75%",
      edge: "+5.0%",
      expectedValue: "+4.0%",
      fairLine: "-120",
      gameGrade: "75/100",
      odds: "-110",
      probability: "55.0%",
      sportsbookLine,
    },
    fairLine: "-120",
    gameGrade: 75,
    href: "/best-bets",
    id,
    market,
    marketLabel: market,
    opponent: { id: opponentId, name: opponentName },
    player: playerId && playerName ? { id: playerId, name: playerName } : undefined,
    ranked: {
      candidate: {
        betId: id,
        confidence: 75,
        dataQuality: 80,
        edgePercent: 5,
        expectedValuePercent: rank === 8 ? 2 : 6 - rank * 0.2,
        fairOdds: -120,
        marketType: market,
        modelProbability: 0.55,
        opponent: { id: opponentId, name: opponentName },
        player: playerId && playerName ? { id: playerId, name: playerName } : undefined,
        sportsbook: "DraftKings",
        sportsbookOdds: -110,
        supportingFactors: [],
        team: { id: teamId, name: teamName },
        timestamp: "2026-06-22T16:00:00.000Z",
        variance: market === "home-runs" ? 82 : 50,
      },
      confidenceTier: "High",
      explanations: ["Excellent value versus market"],
      grade: "B+",
      rank,
      recommendationTier: "Play",
      riskTier,
      trueLineScore: 90 - rank,
    },
    reasons: ["Test reason"],
    sportsbook: "DraftKings",
    sportsbookLine,
    team: { id: teamId, name: teamName },
    title,
  };
}
