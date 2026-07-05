export type BetMarketType =
  | "strikeouts"
  | "hits"
  | "total-bases"
  | "home-runs"
  | "moneyline"
  | "run-line"
  | "team-total"
  | "game-total"
  | "prizepicks"
  | "parlay";

export type RankingSortKey =
  | "confidence"
  | "edge"
  | "expectedValue"
  | "probability"
  | "trueLineScore";

export type OverallGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "D"
  | "F";

export type ConfidenceTier = "Low" | "Medium" | "High" | "Elite";
export type RiskTier = "Low" | "Medium" | "High";
export type RecommendationTier =
  | "Elite"
  | "Strong Play"
  | "Play"
  | "Lean"
  | "Pass";

export interface BetSupportingFactor {
  key: string;
  label: string;
  score: number;
  summary: string;
  weight?: number;
}

export interface BetCandidate {
  betId: string;
  confidence: number;
  dataQuality: number;
  edgePercent: number;
  expectedValuePercent: number;
  fairOdds: number;
  historicalPerformance?: HistoricalRankingPerformance;
  marketType: BetMarketType;
  modelProbability: number;
  opponent?: {
    id: string;
    name: string;
  };
  player?: {
    id: string;
    name: string;
  };
  recommendation?: string;
  sportsbook?: string;
  sportsbookOdds?: number;
  supportingFactors: BetSupportingFactor[];
  team?: {
    id: string;
    name: string;
  };
  timestamp: string;
  variance: number;
}

export interface HistoricalRankingPerformance {
  calibration: number;
  roi: number;
  winRate: number;
}

export interface RankedBetCandidate {
  candidate: BetCandidate;
  confidenceTier: ConfidenceTier;
  explanations: string[];
  grade: OverallGrade;
  historicalPerformance?: HistoricalRankingPerformance;
  rank: number;
  recommendationTier: RecommendationTier;
  riskTier: RiskTier;
  trueLineScore: number;
}

export interface RankingFilters {
  marketType?: BetMarketType | BetMarketType[];
  minimumConfidence?: number;
  minimumEdge?: number;
  playerId?: string;
  sportsbook?: string;
  teamId?: string;
  topN?: number;
}

export interface RankingOptions {
  filters?: RankingFilters;
  sortBy?: RankingSortKey;
}

export interface RankingProviderResponse {
  candidates: BetCandidate[];
  fetchedAt: string;
  mode: RankingProviderMode;
  provider: string;
}

export type RankingProviderMode = "live" | "mock" | "replay";
