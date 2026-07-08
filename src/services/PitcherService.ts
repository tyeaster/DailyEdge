import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Pitcher } from "../models/mlb.ts";
import {
  MLBPitcherStatsProvider,
  MockPitcherStatsProvider,
  ReplayPitcherStatsProvider,
  type PitcherStats,
  type PitcherStatsProvider,
  type PitcherStatsProviderMode,
} from "../providers/pitchers/index.ts";

type CachedPitcherStats = {
  fetchedAt: string;
  mode: PitcherStatsProviderMode;
  stats: PitcherStats;
};

export class PitcherService {
  private readonly cache: CacheProvider;
  private readonly provider: PitcherStatsProvider;

  constructor(
    provider: PitcherStatsProvider = getConfiguredPitcherStatsProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichPitchers(pitchers: Pitcher[], season: number) {
    return Promise.all(
      pitchers.map((pitcher) => this.enrichPitcher(pitcher, season)),
    );
  }

  async enrichPitcher(pitcher: Pitcher, season: number): Promise<Pitcher> {
    const pitcherId = pitcher.externalIds?.mlb;

    if (!pitcherId) {
      return pitcher;
    }

    const cacheKey = `pitcher:${this.provider.id}:${pitcherId}:${season}`;
    const cached = await this.cache.get<CachedPitcherStats>(cacheKey);

    if (cached) {
      return applyPitcherStats(
        pitcher,
        cached.stats,
        cached.mode,
        cached.fetchedAt,
      );
    }

    try {
      const response = await this.provider.getPitcherStats({
        fallbackStats: toPitcherStats(pitcher),
        pitcherId,
        season,
      });

      if (!response.stats) {
        return {
          ...pitcher,
          statsSource: "unavailable",
          statsUpdatedAt: response.fetchedAt,
        };
      }

      await this.cache.set(
        cacheKey,
        {
          fetchedAt: response.fetchedAt,
          mode: response.mode,
          stats: response.stats,
        } satisfies CachedPitcherStats,
        CACHE_TTL_SECONDS.pitcher,
      );

      return applyPitcherStats(
        pitcher,
        response.stats,
        response.mode,
        response.fetchedAt,
      );
    } catch {
      return {
        ...pitcher,
        statsSource: "unavailable",
      };
    }
  }
}

export const pitcherService = new PitcherService();

export function getConfiguredPitcherStatsProvider(
  mode: PitcherStatsProviderMode = getPitcherMode(),
) {
  if (mode === "replay") {
    return new ReplayPitcherStatsProvider();
  }

  if (mode === "mock") {
    return new MockPitcherStatsProvider();
  }

  return new MLBPitcherStatsProvider();
}

export function getPitcherMode(): PitcherStatsProviderMode {
  const explicitMode = process.env.PITCHER_MODE;

  if (
    explicitMode === "live" ||
    explicitMode === "replay" ||
    explicitMode === "mock"
  ) {
    return explicitMode;
  }

  const oddsMode = process.env.ODDS_MODE;

  if (oddsMode === "replay" || oddsMode === "mock") {
    return oddsMode;
  }

  return "live";
}

function applyPitcherStats(
  pitcher: Pitcher,
  stats: PitcherStats,
  source: PitcherStatsProviderMode,
  updatedAt: string,
): Pitcher {
  return {
    ...pitcher,
    era: stats.era,
    gamesStarted: stats.gamesStarted,
    homeRunsPer9: stats.homeRunsPer9,
    inningsPitched: stats.inningsPitched,
    losses: stats.losses,
    statsSource: source,
    statsUpdatedAt: updatedAt,
    strikeoutRate: stats.strikeoutRate,
    strikeouts: stats.strikeouts,
    strikeoutsPer9: stats.strikeoutsPer9,
    walksPer9: stats.walksPer9,
    whip: stats.whip,
    wins: stats.wins,
  };
}

function toPitcherStats(pitcher: Pitcher): PitcherStats {
  return {
    era: pitcher.era,
    gamesStarted: pitcher.gamesStarted ?? 0,
    homeRunsPer9: pitcher.homeRunsPer9 ?? 0,
    inningsPitched: pitcher.inningsPitched,
    losses: pitcher.losses ?? 0,
    strikeoutRate: pitcher.strikeoutRate,
    strikeouts: pitcher.strikeouts ?? 0,
    strikeoutsPer9: pitcher.strikeoutsPer9 ?? 0,
    walksPer9: pitcher.walksPer9 ?? 0,
    whip: pitcher.whip,
    wins: pitcher.wins ?? 0,
  };
}
