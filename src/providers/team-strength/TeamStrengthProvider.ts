import type { TeamStrength } from "../../models/mlb.ts";

export type TeamStrengthProviderMode = "live" | "mock" | "replay";

export type TeamStrengthRequest = {
  fallbackStrength?: TeamStrength;
  season: number;
  teamId: number;
};

export type TeamStrengthProviderResponse = {
  fetchedAt: string;
  mode: TeamStrengthProviderMode;
  provider: string;
  season: number;
  strength?: TeamStrength;
  teamId: number;
};

export interface TeamStrengthProvider {
  readonly id: string;
  getTeamStrength(
    request: TeamStrengthRequest,
  ): Promise<TeamStrengthProviderResponse>;
}
