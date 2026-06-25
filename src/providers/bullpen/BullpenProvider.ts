import type { BullpenRating } from "../../models/mlb.ts";

export type BullpenProviderMode = "live" | "mock" | "replay";

export type BullpenRequest = {
  asOfDate: string;
  fallbackBullpen?: BullpenRating;
  season: number;
  teamId: number;
};

export type BullpenProviderResponse = {
  bullpen?: BullpenRating;
  fetchedAt: string;
  mode: BullpenProviderMode;
  provider: string;
  season: number;
  teamId: number;
};

export interface BullpenProvider {
  readonly id: string;
  getBullpen(request: BullpenRequest): Promise<BullpenProviderResponse>;
}
