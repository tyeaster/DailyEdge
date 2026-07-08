import type {
  BatterMatchupProfile,
  MatchupProviderMode,
  MatchupProviderResponse,
  MatchupRequest,
  PitchArsenal,
} from "../../services/matchup/types.ts";

export type {
  BatterMatchupProfile,
  MatchupProviderMode,
  MatchupProviderResponse,
  MatchupRequest,
  PitchArsenal,
};

export interface MatchupProvider {
  readonly id: string;
  getMatchupData(request: MatchupRequest): Promise<MatchupProviderResponse>;
}
