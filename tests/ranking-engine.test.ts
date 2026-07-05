import assert from "node:assert/strict";
import test from "node:test";

import {
  applyFilters,
  buildExplanations,
  calculateTrueLineScore,
  getConfidenceTier,
  getOverallGrade,
  getRecommendationTier,
  getRiskTier,
  MockRankingCandidateProvider,
  RankingEngineService,
  ReplayRankingCandidateProvider,
  sortRankedCandidates,
  StaticRankingCandidateProvider,
  type BetCandidate,
} from "../src/services/ranking/index.ts";

test("scores and ranks normalized bet candidates deterministically", () => {
  const candidates = [buildCandidate("low", { edgePercent: 1, expectedValuePercent: 1 }), buildCandidate("high")];
  const service = new RankingEngineService(new StaticRankingCandidateProvider(candidates));
  const firstRun = service.rankCandidates(candidates);
  const secondRun = service.rankCandidates(candidates);

  assert.equal(firstRun.length, 2);
  assert.equal(firstRun[0].candidate.betId, "high");
  assert.equal(firstRun[0].rank, 1);
  assert.deepEqual(firstRun, secondRun);
  assert.ok(firstRun[0].trueLineScore > firstRun[1].trueLineScore);
});

test("sorts ranked candidates by supported ranking keys", () => {
  const ranked = [
    new RankingEngineService().scoreCandidate(
      buildCandidate("confidence", {
        confidence: 96,
        edgePercent: 2,
        expectedValuePercent: 2,
        modelProbability: 0.51,
      }),
    ),
    new RankingEngineService().scoreCandidate(
      buildCandidate("edge", {
        confidence: 70,
        edgePercent: 9,
        expectedValuePercent: 7,
        modelProbability: 0.49,
      }),
    ),
  ];

  assert.equal(sortRankedCandidates(ranked, "confidence")[0].candidate.betId, "confidence");
  assert.equal(sortRankedCandidates(ranked, "edge")[0].candidate.betId, "edge");
  assert.equal(sortRankedCandidates(ranked, "expectedValue")[0].candidate.betId, "edge");
  assert.equal(sortRankedCandidates(ranked, "probability")[0].candidate.betId, "confidence");
});

test("filters candidates by confidence edge market player team sportsbook and topN", () => {
  const candidates = [
    buildCandidate("one", {
      marketType: "strikeouts",
      player: { id: "player-one", name: "One" },
      sportsbook: "DraftKings",
      team: { id: "team-one", name: "One Team" },
    }),
    buildCandidate("two", {
      confidence: 52,
      edgePercent: 1,
      marketType: "home-runs",
      player: { id: "player-two", name: "Two" },
      sportsbook: "FanDuel",
      team: { id: "team-two", name: "Two Team" },
    }),
  ];

  assert.equal(applyFilters(candidates, { minimumConfidence: 70 }).length, 1);
  assert.equal(applyFilters(candidates, { minimumEdge: 4 }).length, 1);
  assert.equal(applyFilters(candidates, { marketType: "strikeouts" }).length, 1);
  assert.equal(applyFilters(candidates, { marketType: ["strikeouts", "hits"] }).length, 1);
  assert.equal(applyFilters(candidates, { playerId: "player-one" }).length, 1);
  assert.equal(applyFilters(candidates, { teamId: "team-one" }).length, 1);
  assert.equal(applyFilters(candidates, { sportsbook: "DraftKings" }).length, 1);

  const service = new RankingEngineService();
  assert.equal(service.rankCandidates(candidates, { filters: { topN: 1 } }).length, 1);
});

test("generates grades tiers and explanations from score inputs", () => {
  const candidate = buildCandidate("elite", {
    confidence: 91,
    dataQuality: 90,
    edgePercent: 8,
    expectedValuePercent: 8,
    marketType: "moneyline",
    variance: 10,
  });
  const score = calculateTrueLineScore(candidate);

  assert.ok(score >= 80);
  assert.equal(getOverallGrade(93), "A+");
  assert.equal(getOverallGrade(51), "C");
  assert.equal(getConfidenceTier(90), "Elite");
  assert.equal(getConfidenceTier(56), "Medium");
  assert.equal(getRiskTier(candidate), "Low");
  assert.equal(getRecommendationTier(89), "Elite");
  assert.equal(getRecommendationTier(59), "Lean");
  assert.ok(buildExplanations(candidate).includes("Excellent value versus market"));
  assert.ok(buildExplanations(candidate).includes("High confidence data"));
});

test("penalizes naturally risky markets and high variance candidates", () => {
  const stable = buildCandidate("stable", {
    marketType: "moneyline",
    variance: 20,
  });
  const volatile = buildCandidate("volatile", {
    marketType: "home-runs",
    variance: 82,
  });

  assert.ok(calculateTrueLineScore(stable) > calculateTrueLineScore(volatile));
  assert.equal(getRiskTier(volatile), "High");
});

test("loads mock and replay ranking candidates through provider adapters", async () => {
  const mockService = new RankingEngineService(new MockRankingCandidateProvider());
  const mockResponse = await mockService.rankFromProvider();

  assert.equal(mockResponse.mode, "mock");
  assert.equal(mockResponse.provider, "ranking-mock");
  assert.ok(mockResponse.rankings.length >= 2);

  const replayService = new RankingEngineService(new ReplayRankingCandidateProvider());
  const replayResponse = await replayService.rankFromProvider();

  assert.equal(replayResponse.mode, "replay");
  assert.equal(replayResponse.provider, "ranking-replay");
  assert.equal(replayResponse.rankings.length, 2);
  assert.equal(replayResponse.rankings[0].rank, 1);
});

function buildCandidate(
  betId: string,
  overrides: Partial<BetCandidate> = {},
): BetCandidate {
  return {
    betId,
    confidence: 84,
    dataQuality: 86,
    edgePercent: 6,
    expectedValuePercent: 5.5,
    fairOdds: -122,
    marketType: "strikeouts",
    modelProbability: 0.55,
    opponent: { id: "team-b", name: "Opponent" },
    player: { id: "player-a", name: "Player A" },
    recommendation: "Play",
    sportsbook: "DraftKings",
    sportsbookOdds: 110,
    supportingFactors: [
      {
        key: "matchupStrength",
        label: "Matchup Strength",
        score: 84,
        summary: "Strong matchup.",
      },
      {
        key: "weatherImpact",
        label: "Weather Impact",
        score: 70,
        summary: "Weather supports the bet.",
      },
      {
        key: "bullpenImpact",
        label: "Bullpen Impact",
        score: 68,
        summary: "Bullpen context is favorable.",
      },
      {
        key: "lineupCertainty",
        label: "Lineup Certainty",
        score: 82,
        summary: "Lineup is confirmed.",
      },
      {
        key: "recentForm",
        label: "Recent Form",
        score: 80,
        summary: "Recent form is strong.",
      },
    ],
    team: { id: "team-a", name: "Team A" },
    timestamp: "2026-06-22T16:00:00.000Z",
    variance: 34,
    ...overrides,
  };
}
