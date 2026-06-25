import type { TeamRecentForm } from "../../models/mlb.ts";

export type RecentFormProviderMode = "live" | "mock" | "replay";

export type RecentFormRequest = {
  asOfDate: string;
  fallbackRecentForm?: TeamRecentForm;
  season: number;
  teamId: number;
};

export type RecentFormProviderResponse = {
  fetchedAt: string;
  mode: RecentFormProviderMode;
  provider: string;
  recentForm?: TeamRecentForm;
  season: number;
  teamId: number;
};

export interface RecentFormProvider {
  readonly id: string;
  getRecentForm(
    request: RecentFormRequest,
  ): Promise<RecentFormProviderResponse>;
}
