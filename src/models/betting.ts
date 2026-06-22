import type { SupportedSport } from "@/src/constants/sports";

export type BettingMarketType =
  | "moneyline"
  | "spread"
  | "total"
  | "player-prop"
  | "team-total";

export type BettingMarket = {
  id: string;
  label: string;
  sport: SupportedSport;
  type: BettingMarketType;
};

export type ModelEdge = {
  confidence: "low" | "medium" | "high";
  edgePercent: number;
  marketId: string;
  projection: number;
};
