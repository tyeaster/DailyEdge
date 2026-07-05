export {
  calculateTrueLineScore,
  RankingEngineService,
  rankingEngineService,
  scoreCandidate,
  applyFilters,
  sortRankedCandidates,
  getConfidenceTier,
  getOverallGrade,
  getRecommendationTier,
  getRiskTier,
  buildExplanations,
} from "./RankingEngineService.ts";
export { RANKING_ENGINE_CONFIG } from "./config.ts";
export {
  getConfiguredRankingCandidateProvider,
  MockRankingCandidateProvider,
  ReplayRankingCandidateProvider,
  StaticRankingCandidateProvider,
  type RankingCandidateProvider,
} from "./providers.ts";
export type {
  BetCandidate,
  BetMarketType,
  BetSupportingFactor,
  ConfidenceTier,
  OverallGrade,
  RankedBetCandidate,
  RankingFilters,
  RankingOptions,
  RankingProviderMode,
  RankingProviderResponse,
  RankingSortKey,
  RecommendationTier,
  RiskTier,
} from "./types.ts";
