import type {
  BatterGameLogProviderResponse,
  BatterGameLogRequest,
} from "../../services/player-intelligence/types.ts";

export type {
  BatterGameLog,
  BatterGameLogProviderResponse,
  BatterGameLogRequest,
  PlayerIntelligenceMode,
} from "../../services/player-intelligence/types.ts";

export interface BatterGameLogProvider {
  readonly id: string;
  getBatterGameLogs(
    request: BatterGameLogRequest,
  ): Promise<BatterGameLogProviderResponse>;
}
