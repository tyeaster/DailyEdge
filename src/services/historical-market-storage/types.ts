import type {
  CalibrationOutcome,
  PredictionResultRecord,
  RecordedPrediction,
} from "../calibration/types.ts";
import type { OddsClosingRecord, OddsHistoryRecord } from "../odds-intelligence/types.ts";
import type { BetCandidate, BetMarketType } from "../ranking/types.ts";

export type HistoricalMarketStorageMode = "live" | "mock" | "replay";

export interface HistoricalMarketSnapshot {
  capturedAt: string;
  closingOdds?: number;
  currentOdds: number;
  edgePercent?: number;
  expectedValuePercent?: number;
  fairOdds?: number;
  gameId: string;
  line?: number;
  market: BetMarketType;
  openingOdds: number;
  playerId?: string;
  predictionId?: string;
  provider: string;
  selection?: string;
  snapshotId: string;
  sportsbook: string;
  teamId?: string;
  trueLineProbability?: number;
  updatedAt: string;
}

export interface HistoricalMarketResult {
  actualStat?: number;
  finalResult?: string;
  market: BetMarketType;
  outcome: CalibrationOutcome;
  resultId: string;
  settledAt: string;
  snapshotId: string;
}

export interface HistoricalMarketProviderResponse {
  fetchedAt: string;
  mode: HistoricalMarketStorageMode;
  provider: string;
  results: HistoricalMarketResult[];
  snapshots: HistoricalMarketSnapshot[];
}

export interface HistoricalMarketSnapshotInput {
  capturedAt?: string;
  closingOdds?: number;
  currentOdds: number;
  edgePercent?: number;
  expectedValuePercent?: number;
  fairOdds?: number;
  gameId: string;
  line?: number;
  market: BetMarketType;
  openingOdds?: number;
  playerId?: string;
  predictionId?: string;
  provider?: string;
  selection?: string;
  snapshotId?: string;
  sportsbook: string;
  teamId?: string;
  trueLineProbability?: number;
  updatedAt?: string;
}

export interface HistoricalMarketSettlementInput {
  actualStat?: number;
  finalResult?: string;
  outcome: CalibrationOutcome;
  resultId?: string;
  settledAt?: string;
  snapshotId: string;
}

export interface HistoricalMarketCalibrationHistory {
  predictions: RecordedPrediction[];
  results: PredictionResultRecord[];
}

export interface HistoricalMarketOddsHistory {
  closings: OddsClosingRecord[];
  history: OddsHistoryRecord[];
}

export interface HistoricalMarketRankingHistory {
  candidates: BetCandidate[];
}
