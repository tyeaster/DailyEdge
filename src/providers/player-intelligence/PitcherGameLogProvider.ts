import type {
  PitcherGameLogProviderResponse,
  PitcherGameLogRequest,
} from "../../services/player-intelligence/types.ts";

export type {
  PitcherGameLog,
  PitcherGameLogProviderResponse,
  PitcherGameLogRequest,
  PlayerIntelligenceMode,
} from "../../services/player-intelligence/types.ts";

export interface PitcherGameLogProvider {
  readonly id: string;
  getPitcherGameLogs(
    request: PitcherGameLogRequest,
  ): Promise<PitcherGameLogProviderResponse>;
}
