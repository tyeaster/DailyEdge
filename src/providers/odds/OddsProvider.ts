import type { OddsMarket } from "@/src/models/mlb";

export type OddsProviderMode = "live" | "mock" | "replay";

export type OddsProviderRequest = {
  date?: string;
  eventIds?: string[];
  markets?: OddsMarket[];
  sport: "mlb";
};

export type NormalizedOddsRecord = {
  americanOdds: number;
  eventId?: string;
  id: string;
  line?: number;
  market: OddsMarket;
  selection: string;
  sportsbook: string;
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
