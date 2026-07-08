import type { LineupProfile } from "../../models/mlb.ts";

export type LineupProviderMode = "live" | "mock" | "replay";

export type LineupRequest = {
  asOfDate: string;
  fallbackLineup?: LineupProfile;
  gameId: number;
  season: number;
  teamId: number;
};

export type LineupProviderResponse = {
  fetchedAt: string;
  gameId: number;
  lineup?: LineupProfile;
  mode: LineupProviderMode;
  provider: string;
  season: number;
  teamId: number;
};

export interface LineupProvider {
  readonly id: string;
  getLineup(request: LineupRequest): Promise<LineupProviderResponse>;
}
