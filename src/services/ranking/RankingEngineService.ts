import { RANKING_ENGINE_CONFIG } from "./config.ts";
import {
  getConfiguredRankingCandidateProvider,
  type RankingCandidateProvider,
} from "./providers.ts";
import type {
  BetCandidate,
  BetMarketType,
  ConfidenceTier,
  OverallGrade,
  RankedBetCandidate,
  RankingFilters,
  RankingOptions,
  RankingSortKey,
  RecommendationTier,
  RiskTier,
} from "./types.ts";

export class RankingEngineService {
  private readonly provider: RankingCandidateProvider;

  constructor(
    provider: RankingCandidateProvider = getConfiguredRankingCandidateProvider(),
  ) {
    this.provider = provider;
  }

  rankCandidates(
    candidates: BetCandidate[],
    options: RankingOptions = {},
  ): RankedBetCandidate[] {
    const filtered = applyFilters(candidates, options.filters);
    const ranked = filtered.map((candidate) => scoreCandidate(candidate));
    const sorted = sortRankedCandidates(ranked, options.sortBy ?? "trueLineScore")
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }));

    return options.filters?.topN ? sorted.slice(0, options.filters.topN) : sorted;
  }

  async rankFromProvider(options: RankingOptions = {}) {
    const response = await this.provider.getCandidates();

    return {
      fetchedAt: response.fetchedAt,
      mode: response.mode,
      provider: response.provider,
      rankings: this.rankCandidates(response.candidates, options),
    };
  }

  scoreCandidate(candidate: BetCandidate): RankedBetCandidate {
    return scoreCandidate(candidate);
  }
}

export const rankingEngineService = new RankingEngineService();

export function scoreCandidate(candidate: BetCandidate): RankedBetCandidate {
  const trueLineScore = calculateTrueLineScore(candidate);

  return {
    candidate,
    confidenceTier: getConfidenceTier(candidate.confidence),
    explanations: buildExplanations(candidate),
    grade: getOverallGrade(trueLineScore),
    historicalPerformance: candidate.historicalPerformance,
    rank: 0,
    recommendationTier: getRecommendationTier(trueLineScore),
    riskTier: getRiskTier(candidate),
    trueLineScore,
  };
}

export function calculateTrueLineScore(candidate: BetCandidate) {
  const weights = RANKING_ENGINE_CONFIG.scoreWeights;
  const factors = getFactorScores(candidate);

  return Math.round(
    normalizeEdge(candidate.edgePercent) * weights.edge +
      normalizeExpectedValue(candidate.expectedValuePercent) * weights.expectedValue +
      candidate.confidence * weights.confidence +
      candidate.dataQuality * weights.dataQuality +
      factors.matchupStrength * weights.matchupStrength +
      factors.weatherImpact * weights.weatherImpact +
      factors.bullpenImpact * weights.bullpenImpact +
      factors.lineupCertainty * weights.lineupCertainty +
      factors.recentForm * weights.recentForm +
      (100 - normalizeMarketRisk(candidate)) * weights.marketRisk +
      normalizeVariance(candidate.variance) * weights.variance,
  );
}

export function applyFilters(
  candidates: BetCandidate[],
  filters: RankingFilters = {},
) {
  return candidates.filter((candidate) => {
    if (
      filters.minimumConfidence !== undefined &&
      candidate.confidence < filters.minimumConfidence
    ) {
      return false;
    }

    if (
      filters.minimumEdge !== undefined &&
      candidate.edgePercent < filters.minimumEdge
    ) {
      return false;
    }

    if (filters.marketType && !matchesMarket(candidate.marketType, filters.marketType)) {
      return false;
    }

    if (filters.playerId && candidate.player?.id !== filters.playerId) {
      return false;
    }

    if (filters.teamId && candidate.team?.id !== filters.teamId) {
      return false;
    }

    if (filters.sportsbook && candidate.sportsbook !== filters.sportsbook) {
      return false;
    }

    return true;
  });
}

export function sortRankedCandidates(
  candidates: RankedBetCandidate[],
  sortBy: RankingSortKey,
) {
  return [...candidates].sort((left, right) => {
    return getSortValue(right, sortBy) - getSortValue(left, sortBy);
  });
}

export function getOverallGrade(score: number): OverallGrade {
  return (
    RANKING_ENGINE_CONFIG.gradeThresholds.find((threshold) => score >= threshold.score)
      ?.grade ?? "F"
  );
}

export function getConfidenceTier(confidence: number): ConfidenceTier {
  const tiers = RANKING_ENGINE_CONFIG.confidenceTiers;

  if (confidence >= tiers.elite) return "Elite";
  if (confidence >= tiers.high) return "High";
  if (confidence >= tiers.medium) return "Medium";
  return "Low";
}

export function getRiskTier(candidate: BetCandidate): RiskTier {
  const riskScore = candidate.variance + normalizeMarketRisk(candidate) * 0.35;
  const tiers = RANKING_ENGINE_CONFIG.riskTiers;

  if (riskScore >= tiers.high) return "High";
  if (riskScore <= tiers.low) return "Low";
  return "Medium";
}

export function getRecommendationTier(score: number): RecommendationTier {
  const thresholds = RANKING_ENGINE_CONFIG.recommendationThresholds;

  if (score >= thresholds.elite) return "Elite";
  if (score >= thresholds.strongPlay) return "Strong Play";
  if (score >= thresholds.play) return "Play";
  if (score >= thresholds.lean) return "Lean";
  return "Pass";
}

export function buildExplanations(candidate: BetCandidate) {
  const factors = getFactorScores(candidate);
  const thresholds = RANKING_ENGINE_CONFIG.explanationThresholds;
  const explanations: string[] = [];

  if (candidate.edgePercent >= thresholds.edge) {
    explanations.push("Excellent value versus market");
  }

  if (candidate.expectedValuePercent >= thresholds.expectedValue) {
    explanations.push("Positive expected value profile");
  }

  if (factors.matchupStrength >= thresholds.matchup) {
    explanations.push("Elite matchup");
  }

  if (factors.recentForm >= thresholds.recentForm) {
    explanations.push("Outstanding recent form");
  }

  if (candidate.dataQuality >= thresholds.dataQuality) {
    explanations.push("High confidence data");
  }

  if (factors.weatherImpact >= thresholds.weather) {
    explanations.push("Weather favorable");
  }

  if (factors.lineupCertainty >= thresholds.lineupCertainty) {
    explanations.push("Lineup confirmed");
  }

  if (factors.bullpenImpact >= thresholds.bullpenAdvantage) {
    explanations.push("Bullpen advantage");
  }

  if (candidate.variance <= thresholds.lowVariance) {
    explanations.push("Low variance");
  }

  return explanations.length > 0
    ? explanations
    : ["No standout edge; ranking is driven by balanced baseline inputs"];
}

function getFactorScores(candidate: BetCandidate) {
  return {
    bullpenImpact: getFactorScore(candidate, "bullpenImpact"),
    lineupCertainty: getFactorScore(candidate, "lineupCertainty"),
    matchupStrength: getFactorScore(candidate, "matchupStrength"),
    recentForm: getFactorScore(candidate, "recentForm"),
    weatherImpact: getFactorScore(candidate, "weatherImpact"),
  };
}

function getFactorScore(candidate: BetCandidate, key: string) {
  return candidate.supportingFactors.find((factor) => factor.key === key)?.score ?? 50;
}

function getSortValue(candidate: RankedBetCandidate, sortBy: RankingSortKey) {
  if (sortBy === "edge") return candidate.candidate.edgePercent;
  if (sortBy === "expectedValue") return candidate.candidate.expectedValuePercent;
  if (sortBy === "confidence") return candidate.candidate.confidence;
  if (sortBy === "probability") return candidate.candidate.modelProbability;

  return candidate.trueLineScore;
}

function matchesMarket(
  candidateMarket: BetMarketType,
  filter: BetMarketType | BetMarketType[],
) {
  return Array.isArray(filter)
    ? filter.includes(candidateMarket)
    : candidateMarket === filter;
}

function normalizeEdge(edgePercent: number) {
  return normalizeRange(edgePercent, -4, 10);
}

function normalizeExpectedValue(expectedValuePercent: number) {
  return normalizeRange(expectedValuePercent, -5, 12);
}

function normalizeMarketRisk(candidate: BetCandidate) {
  const baseRisk =
    candidate.marketType === "home-runs" || candidate.marketType === "parlay"
      ? 78
      : candidate.marketType === "prizepicks"
        ? 62
        : candidate.marketType === "moneyline"
          ? 36
          : 48;

  return baseRisk;
}

function normalizeVariance(variance: number) {
  return 100 - clamp(variance);
}

function normalizeRange(value: number, low: number, high: number) {
  return clamp(((value - low) / (high - low)) * 100);
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}
