import type { BettingMarket } from "@/src/models";

export type Sportsbook = {
  id: string;
  name: string;
};

export type OddsQuote = {
  market: BettingMarket;
  price: number;
  sportsbook: Sportsbook;
  updatedAt: string;
};
