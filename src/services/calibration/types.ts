import type { BetMarketType } from "../ranking/types.ts";

export type CalibrationProviderMode = "live" | "mock" | "replay";

export type CalibrationOutcome = "win" | "loss" | "push" | "pending";

export interface RecordedPrediction {
  confidence: number;
  edgePercent: number;
  expectedValuePercent: number;
  fairOdds: number;
  gameId: string;
  market: BetMarketType;
  modelId: string;
  modelProbability: number;
  odds: number;
  playerId?: string;
  predictionId: string;
  recommendation: string;
  sportsbook?: string;
  teamId?: string;
  timestamp: string;
}

export interface PredictionResultRecord {
  actualHits?: number;
  actualHomeRuns?: number;
  actualStrikeouts?: number;
  closingEdgePercent?: number;
  gameId: string;
  market: BetMarketType;
  moneylineWinnerTeamId?: string;
  outcome: CalibrationOutcome;
  predictionId: string;
  recordedAt: string;
}

export interface CompletedPrediction {
  actualProbability: number;
  prediction: RecordedPrediction;
  result: PredictionResultRecord;
  stake: number;
}

export interface PredictionRecordInput {
  confidence: number;
  edgePercent: number;
  expectedValuePercent: number;
  fairOdds: number;
  gameId: string;
  market: BetMarketType;
  modelId?: string;
  modelProbability: number;
  odds: number;
  playerId?: string;
  predictionId?: string;
  recommendation: string;
  sportsbook?: string;
  teamId?: string;
  timestamp?: string;
}

export interface ResultRecordInput {
  actualHits?: number;
  actualHomeRuns?: number;
  actualStrikeouts?: number;
  closingEdgePercent?: number;
  gameId: string;
  market: BetMarketType;
  moneylineWinnerTeamId?: string;
  outcome: CalibrationOutcome;
  predictionId: string;
  recordedAt?: string;
}

export interface CalibrationMetricSummary {
  averageClv: number;
  averageClosingEdge: number;
  averageConfidence: number;
  averageEdge: number;
  averageEv: number;
  calibrationError: number;
  closingAccuracy: number;
  confidenceAccuracy: number;
  expectedValueAccuracy: number;
  predictionCount: number;
  predictionVsMarket: number;
  roi: number;
  winRate: number;
}

export interface PredictionAccuracyRecord {
  absoluteError: number;
  calibrationError: number;
  confidenceAccuracy: number;
  correct: boolean;
  expectedValueAccuracy: number;
  probabilityError: number;
  predictionId: string;
  profit: number;
  roi: number;
}

export interface ConfidenceBucket {
  actualWinPercent: number;
  calibrationScore: number;
  count: number;
  difference: number;
  label: string;
  predictedWinPercent: number;
  range: {
    max: number;
    min: number;
  };
}

export interface ModelScorecard {
  averageConfidence: number;
  averageEdge: number;
  averageEv: number;
  confidenceAccuracy: number;
  calibration: number;
  market: BetMarketType | "overall";
  modelId: string;
  predictionCount: number;
  roi: number;
  winRate: number;
}

export interface RecentAccuracyPoint {
  date: string;
  predictionCount: number;
  roi: number;
  winRate: number;
}

export interface CalibrationDashboardViewModel {
  bestModels: ModelScorecard[];
  confidenceCurve: ConfidenceBucket[];
  fetchedAt: string;
  marketPerformance: ModelScorecard[];
  mode: CalibrationProviderMode;
  overallMetrics: CalibrationMetricSummary;
  provider: string;
  recentAccuracy: RecentAccuracyPoint[];
  worstModels: ModelScorecard[];
}

export interface CalibrationProviderResponse {
  fetchedAt: string;
  mode: CalibrationProviderMode;
  predictions: RecordedPrediction[];
  provider: string;
  results: PredictionResultRecord[];
}
