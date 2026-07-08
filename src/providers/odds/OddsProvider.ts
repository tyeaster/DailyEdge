import type { OddsMarket, PlayerPropCategory } from "@/src/models/mlb";

export type OddsProviderMode = "live" | "mock" | "replay";

export type OddsProviderRequest = {
  date?: string;
  eventIds?: string[];
  markets?: OddsMarket[];
  sport: "mlb";
};

export type NormalizedOddsRecord = {
  americanOdds: number;
  awayTeam?: string;
  eventId?: string;
  homeTeam?: string;
  id: string;
  impliedProbability: number;
  line?: number;
  market: OddsMarket;
  playerName?: string;
  propCategory?: PlayerPropCategory;
  selection: string;
  side?: "away" | "home" | "over" | "under";
  sportsbook: string;
  teamName?: string;
  updatedAt: string;
};

export type OddsProviderResponse = {
  fetchedAt: string;
  mode: OddsProviderMode;
  provider: string;
  records: NormalizedOddsRecord[];
};

export interface OddsProvider {
  readonly id: string;
  getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse>;
}
