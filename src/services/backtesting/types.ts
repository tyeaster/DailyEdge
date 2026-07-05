import type {
  PredictionResultRecord,
  RecordedPrediction,
} from "../calibration/types.ts";
import type { BetMarketType, RecommendationTier } from "../ranking/types.ts";

export type BacktestProviderMode = "live" | "mock" | "replay";
export type BankrollMode =
  | "custom-stake"
  | "fixed-percent"
  | "flat"
  | "fractional-kelly"
  | "kelly";

export interface HistoricalSlate {
  calibrationRecords: {
    predictions: RecordedPrediction[];
    results: PredictionResultRecord[];
  };
  date: string;
  slateId: string;
}

export interface HistoricalSlateProviderResponse {
  fetchedAt: string;
  mode: BacktestProviderMode;
  provider: string;
  slates: HistoricalSlate[];
}

export interface BacktestSettings {
  ballparkMin?: number;
  dateFrom?: string;
  dateTo?: string;
  favoriteOnly?: boolean;
  homeOnly?: boolean;
  market?: BetMarketType;
  markets?: BetMarketType[];
  maximumBetsPerDay?: number;
  minimumConfidence?: number;
  minimumEdge?: number;
  minimumEv?: number;
  pitchMatchMin?: number;
  playerId?: string;
  recommendationTier?: RecommendationTier;
  sportsbook?: string;
  teamId?: string;
  underdogOnly?: boolean;
  awayOnly?: boolean;
  weatherMin?: number;
  zoneMatchMin?: number;
}

export interface BankrollSettings {
  customStake?: number;
  fixedPercent?: number;
  fractionalKelly?: number;
  kellyPercent?: number;
  mode: BankrollMode;
  startingBankroll: number;
  unitSize?: number;
}

export interface BacktestRequest {
  bankroll: BankrollSettings;
  settings: BacktestSettings;
}

export interface BacktestBet {
  closingEdgePercent?: number;
  confidence: number;
  date: string;
  edgePercent: number;
  equityAfter: number;
  expectedValuePercent: number;
  gameId: string;
  market: BetMarketType;
  modelProbability: number;
  odds: number;
  outcome: "loss" | "push" | "win";
  playerId?: string;
  predictionId: string;
  profit: number;
  resultRecordedAt: string;
  sportsbook?: string;
  stake: number;
  teamId?: string;
  unitsWon: number;
}

export interface EquityPoint {
  date: string;
  bankroll: number;
  drawdown: number;
  profit: number;
}

export interface DailyBacktestBreakdown {
  date: string;
  endingBankroll: number;
  losses: number;
  profit: number;
  pushes: number;
  roi: number;
  startingBankroll: number;
  totalStake: number;
  wins: number;
}

export interface BacktestSummary {
  averageDailyProfit: number;
  averageOdds: number;
  finalBankroll: number;
  longestLosingStreak: number;
  longestWinStreak: number;
  lossPercent: number;
  maximumDrawdown: number;
  profit: number;
  pushPercent: number;
  roi: number;
  sharpeStyleReturnScore: number;
  startingBankroll: number;
  totalBets: number;
  totalStake: number;
  unitsWon: number;
  winPercent: number;
}

export interface BacktestChartPoint {
  label: string;
  value: number;
}

export interface BacktestOutput {
  betHistory: BacktestBet[];
  dailyBreakdown: DailyBacktestBreakdown[];
  equityCurve: EquityPoint[];
  marketBreakdown: BacktestChartPoint[];
  monthlyPerformance: BacktestChartPoint[];
  summary: BacktestSummary;
  topFilters: BacktestChartPoint[];
  worstFilters: BacktestChartPoint[];
}

export interface BacktestDashboardViewModel extends BacktestOutput {
  fetchedAt: string;
  mode: BacktestProviderMode;
  provider: string;
  settings: BacktestSettings;
}
