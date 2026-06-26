import { CACHE_TTL_SECONDS, type CacheProvider } from "../../cache/CacheProvider.ts";
import { memoryCache } from "../../cache/MemoryCache.ts";
import type { Pitcher, Player } from "../../models/mlb.ts";
import {
  MLBPitcherGameLogProvider,
  MockPitcherGameLogProvider,
  ReplayPitcherGameLogProvider,
  type PitcherGameLog,
  type PitcherGameLogProvider,
  type PitcherGameLogRequest,
  type PlayerIntelligenceMode,
} from "../../providers/player-intelligence/index.ts";
import {
  analyzePitcherTrends,
  calculateConsistency,
  calculatePitcherRecentForm,
  calculateRollingSummary,
} from "./metrics.ts";
import type {
  BatterIntelligencePlaceholder,
  PitcherIntelligence,
  PlayerContext,
  ProjectionContext,
  TrendSignal,
  PitcherRecentFormScore,
  ConsistencyMetrics,
  PitcherRollingSummary,
} from "./types.ts";

export interface PitcherIntelligenceRequest {
  context?: PlayerContext;
  fallbackGameLogs?: PitcherGameLog[];
  pitcher: Pitcher;
  projectionContext?: ProjectionContext;
  season: number;
}

export class PlayerIntelligenceService {
  private readonly cache: CacheProvider;
  private readonly gameLogProvider: PitcherGameLogProvider;

  constructor(
    gameLogProvider: PitcherGameLogProvider = getConfiguredPitcherGameLogProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.gameLogProvider = gameLogProvider;
    this.cache = cache;
  }

  async getPitcher(
    request: PitcherIntelligenceRequest,
  ): Promise<PitcherIntelligence> {
    const gameLogs = await this.getPitcherGameLogs({
      fallbackLogs: request.fallbackGameLogs,
      pitcherId: request.pitcher.externalIds?.mlb ?? 0,
      season: request.season,
    });
    const trends = this.getPitcherTrends(gameLogs);
    const rolling = calculateRollingSummary(gameLogs);
    const consistency = this.getPitcherConsistency(gameLogs);
    const recentForm = this.getPitcherRecentForm(gameLogs, trends);

    return {
      consistency,
      context: request.context ?? {},
      fetchedAt: new Date().toISOString(),
      gameLogs,
      pitcher: request.pitcher,
      profile: request.pitcher,
      projectionContext: request.projectionContext ?? {},
      recentForm,
      rolling,
      seasonStatistics: request.pitcher,
      source: gameLogs.length > 0 ? this.resolveSource() : "unavailable",
      trends,
    };
  }

  async getPitcherGameLogs(
    request: PitcherGameLogRequest,
  ): Promise<PitcherGameLog[]> {
    if (!request.pitcherId) {
      return request.fallbackLogs ?? [];
    }

    const cacheKey = [
      "pitcher-game-logs",
      this.gameLogProvider.id,
      request.pitcherId,
      request.season,
      request.asOfDate ?? "season",
    ].join(":");
    const cached = await this.cache.get<PitcherGameLog[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.gameLogProvider.getPitcherGameLogs(request);

      await this.cache.set(
        cacheKey,
        response.logs,
        CACHE_TTL_SECONDS.pitcherGameLogs,
      );

      return response.logs;
    } catch {
      return request.fallbackLogs ?? [];
    }
  }

  getPitcherTrends(logs: PitcherGameLog[]): TrendSignal[] {
    return analyzePitcherTrends(logs);
  }

  getPitcherRecentForm(
    logs: PitcherGameLog[],
    trends: TrendSignal[] = this.getPitcherTrends(logs),
  ): PitcherRecentFormScore {
    return calculatePitcherRecentForm(logs, trends);
  }

  getPitcherConsistency(logs: PitcherGameLog[]): ConsistencyMetrics {
    return calculateConsistency(logs, "strikeouts");
  }

  getPitcherRollingStats(logs: PitcherGameLog[]): PitcherRollingSummary {
    return calculateRollingSummary(logs);
  }

  getBatter(player: Player): BatterIntelligencePlaceholder {
    return {
      available: false,
      player,
      reason: "Batter Intelligence is reserved for the next player intelligence phase.",
    };
  }

  async getBatterGameLogs(): Promise<[]> {
    return [];
  }

  private resolveSource() {
    if (this.gameLogProvider.id.includes("mock")) return "mock";
    if (this.gameLogProvider.id.includes("replay")) return "replay";
    return "live";
  }
}

export const playerIntelligenceService = new PlayerIntelligenceService();

export function getConfiguredPitcherGameLogProvider(
  mode: PlayerIntelligenceMode = getPlayerIntelligenceMode(),
) {
  if (mode === "replay") {
    return new ReplayPitcherGameLogProvider();
  }

  if (mode === "mock") {
    return new MockPitcherGameLogProvider();
  }

  return new MLBPitcherGameLogProvider();
}

function getPlayerIntelligenceMode(): PlayerIntelligenceMode {
  const explicitMode =
    process.env.PLAYER_INTELLIGENCE_MODE ?? process.env.PITCHER_GAME_LOG_MODE;

  if (
    explicitMode === "live" ||
    explicitMode === "replay" ||
    explicitMode === "mock"
  ) {
    return explicitMode;
  }

  const pitcherMode = process.env.PITCHER_MODE;

  if (pitcherMode === "replay" || pitcherMode === "mock") {
    return pitcherMode;
  }

  return "live";
}

