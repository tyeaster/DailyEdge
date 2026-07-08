import type { BetMarketType } from "../ranking/types.ts";

export type OddsIntelligenceProviderMode = "live" | "mock" | "replay";
export type MovementType =
  | "late-injury-movement"
  | "market-stable"
  | "reverse-line-movement"
  | "sharp-agreement"
  | "sharp-disagreement"
  | "steam-move"
  | "weather-movement";

export interface OddsHistoryRecord {
  currentOdds: number;
  currentLine?: number;
  fairOdds: number;
  gameId: string;
  market: BetMarketType;
  openingOdds: number;
  openingLine?: number;
  playerId?: string;
  predictionId: string;
  probability: number;
  sportsbook: string;
  teamId?: string;
  timestamp: string;
}

export interface OddsClosingRecord {
  closingOdds: number;
  closingLine?: number;
  predictionId: string;
  timestamp: string;
}

export interface OddsTimelinePoint {
  closingEdgePercent?: number;
  clvPercent?: number;
  currentOdds: number;
  currentLine?: number;
  movementPercent: number;
  openingEdgePercent: number;
  timestamp: string;
}

export interface OddsMovementAnalysis {
  averageClv: number;
  closingEdgePercent: number;
  clvPercent: number;
  current: OddsTimelinePoint;
  expectedClosingEdgePercent: number;
  marketDriftPercent: number;
  movementGraph: OddsTimelinePoint[];
  movementType: MovementType;
  opening: OddsTimelinePoint;
  predictionId: string;
  steamAlert?: string;
}

export interface OddsMovementViewModel {
  analysis: OddsMovementAnalysis;
  closing?: OddsClosingRecord;
  market: BetMarketType;
  predictionId: string;
  sportsbook: string;
  timeline: OddsTimelinePoint[];
}

export interface OddsIntelligenceDashboardViewModel {
  averageClv: number;
  bestClv?: OddsMovementViewModel;
  fetchedAt: string;
  marketAgreement: number;
  mode: OddsIntelligenceProviderMode;
  movementHistory: OddsMovementViewModel[];
  provider: string;
  steamAlerts: OddsMovementViewModel[];
  worstClv?: OddsMovementViewModel;
}

export interface OddsIntelligenceProviderResponse {
  closings: OddsClosingRecord[];
  fetchedAt: string;
  history: OddsHistoryRecord[];
  mode: OddsIntelligenceProviderMode;
  provider: string;
}
