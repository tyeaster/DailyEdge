import { CACHE_TTL_SECONDS, type CacheProvider } from "../../cache/CacheProvider.ts";
import { memoryCache } from "../../cache/MemoryCache.ts";
import type { Pitcher, Player } from "../../models/mlb.ts";
import {
  MLBBatterGameLogProvider,
  MLBPitcherGameLogProvider,
  MockBatterGameLogProvider,
  MockPitcherGameLogProvider,
  ReplayBatterGameLogProvider,
  ReplayPitcherGameLogProvider,
  type BatterGameLog,
  type BatterGameLogProvider,
  type BatterGameLogRequest,
  type PitcherGameLog,
  type PitcherGameLogProvider,
  type PitcherGameLogRequest,
  type PlayerIntelligenceMode,
} from "../../providers/player-intelligence/index.ts";
import {
  analyzeBatterTrends,
  analyzePitcherTrends,
  buildBatterProfile,
  calculateBatterConsistency,
  calculateBatterRecentForm,
  calculateBatterRollingSummary,
  calculateConsistency,
  calculatePitcherRecentForm,
  calculateRollingSummary,
} from "./metrics.ts";
import type {
  BatterIntelligencePlaceholder,
  BatterIntelligence,
  BatterRecentFormScore,
  BatterConsistencyMetrics,
  BatterRollingSummary,
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

export interface BatterIntelligenceRequest {
  batter: Player;
  context?: PlayerContext;
  fallbackGameLogs?: BatterGameLog[];
  projectionContext?: ProjectionContext;
  season: number;
}

export class PlayerIntelligenceService {
  private readonly batterGameLogProvider: BatterGameLogProvider;
  private readonly cache: CacheProvider;
  private readonly gameLogProvider: PitcherGameLogProvider;

  constructor(
    gameLogProvider: PitcherGameLogProvider = getConfiguredPitcherGameLogProvider(),
    cache: CacheProvider = memoryCache,
    batterGameLogProvider: BatterGameLogProvider = getConfiguredBatterGameLogProvider(),
  ) {
    this.batterGameLogProvider = batterGameLogProvider;
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

  async getBatter(
    requestOrPlayer: BatterIntelligenceRequest | Player,
  ): Promise<BatterIntelligence | BatterIntelligencePlaceholder> {
    if (!("batter" in requestOrPlayer)) {
      return {
        available: false,
        player: requestOrPlayer,
        reason: "Batter Intelligence requires a season and MLB player ID.",
      };
    }

    const request = requestOrPlayer;
    const gameLogs = await this.getBatterGameLogs({
      batterId: request.batter.externalIds?.mlb ?? 0,
      fallbackLogs: request.fallbackGameLogs,
      season: request.season,
    });
    const trends = this.getBatterTrends(gameLogs);
    const rolling = this.getBatterRollingStats(gameLogs);
    const consistency = this.getBatterConsistency(gameLogs);
    const recentForm = this.getBatterRecentForm(gameLogs, trends);

    return {
      available: true,
      batter: request.batter,
      consistency,
      context: request.context ?? {},
      fetchedAt: new Date().toISOString(),
      gameLogs,
      player: request.batter,
      profile: buildBatterProfile(gameLogs),
      projectionContext: request.projectionContext ?? {},
      recentForm,
      rolling,
      source: gameLogs.length > 0 ? this.resolveBatterSource() : "unavailable",
      trends,
    };
  }

  async getBatterGameLogs(
    request: BatterGameLogRequest,
  ): Promise<BatterGameLog[]> {
    if (!request.batterId) {
      return request.fallbackLogs ?? [];
    }

    const cacheKey = [
      "batter-game-logs",
      this.batterGameLogProvider.id,
      request.batterId,
      request.season,
      request.asOfDate ?? "season",
    ].join(":");
    const cached = await this.cache.get<BatterGameLog[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.batterGameLogProvider.getBatterGameLogs(request);

      await this.cache.set(
        cacheKey,
        response.logs,
        CACHE_TTL_SECONDS.batterGameLogs,
      );

      return response.logs;
    } catch {
      return request.fallbackLogs ?? [];
    }
  }

  getBatterRollingStats(logs: BatterGameLog[]): BatterRollingSummary {
    return calculateBatterRollingSummary(logs);
  }

  getBatterTrends(logs: BatterGameLog[]): TrendSignal[] {
    return analyzeBatterTrends(logs);
  }

  getBatterConsistency(logs: BatterGameLog[]): BatterConsistencyMetrics {
    return calculateBatterConsistency(logs);
  }

  getBatterRecentForm(
    logs: BatterGameLog[],
    trends: TrendSignal[] = this.getBatterTrends(logs),
  ): BatterRecentFormScore {
    return calculateBatterRecentForm(logs, trends);
  }

  private resolveSource() {
    if (this.gameLogProvider.id.includes("mock")) return "mock";
    if (this.gameLogProvider.id.includes("replay")) return "replay";
    return "live";
  }

  private resolveBatterSource() {
    if (this.batterGameLogProvider.id.includes("mock")) return "mock";
    if (this.batterGameLogProvider.id.includes("replay")) return "replay";
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

export function getConfiguredBatterGameLogProvider(
  mode: PlayerIntelligenceMode = getPlayerIntelligenceMode(),
) {
  if (mode === "replay") {
    return new ReplayBatterGameLogProvider();
  }

  if (mode === "mock") {
    return new MockBatterGameLogProvider();
  }

  return new MLBBatterGameLogProvider();
}

export function getPlayerIntelligenceMode(): PlayerIntelligenceMode {
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
