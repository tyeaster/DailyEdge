import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Injury } from "../models/mlb.ts";
import {
  MLBInjuryProvider,
  MockInjuryProvider,
  type InjuryProvider,
  type InjuryProviderMode,
  type NormalizedInjury,
} from "../providers/injuries/index.ts";

export function getInjuriesMode(): InjuryProviderMode {
  const mode = process.env.INJURIES_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  return "live";
}

export function getConfiguredInjuryProvider(
  mode: InjuryProviderMode = getInjuriesMode(),
): InjuryProvider {
  if (mode === "mock") {
    return new MockInjuryProvider();
  }

  // No replay provider exists yet - "replay" and "live" both resolve to
  // the live provider until one is built.
  return new MLBInjuryProvider();
}

/**
 * Implements the DataProvider<Injury> shape (src/services/providers/types.ts)
 * so it can be dropped straight into TrueLineDataProvider.injuries, replacing
 * the hardcoded mock fallback that was there before.
 *
 * On a live fetch failure, degrades to an empty list rather than mock data -
 * an empty list honestly represents "no known injuries data available"
 * instead of silently mixing fabricated players into what's supposed to be
 * live data.
 */
export class InjuriesService {
  private readonly cache: CacheProvider;
  private readonly provider: InjuryProvider;

  constructor(
    provider: InjuryProvider = getConfiguredInjuryProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async list(date: string = new Date().toISOString().slice(0, 10)): Promise<Injury[]> {
    const cacheKey = `injuries:${this.provider.id}:${date}`;
    const cached = await this.cache.get<Injury[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.provider.getInjuries({ date });
      const injuries = response.injuries.map(toInjury);

      await this.cache.set(cacheKey, injuries, CACHE_TTL_SECONDS.injuries);

      return injuries;
    } catch (error) {
      console.error(
        "[injuries-service] failed to fetch injuries:",
        error instanceof Error ? error.message : error,
      );

      return [];
    }
  }

  async getById(id: string): Promise<Injury | undefined> {
    const injuries = await this.list();

    return injuries.find((injury) => injury.id === id);
  }
}

function toInjury(normalized: NormalizedInjury): Injury {
  return {
    expectedReturn: normalized.expectedReturn,
    id: normalized.id,
    impactRating: normalized.impactRating,
    playerId: normalized.playerId,
    status: normalized.status,
    teamId: normalized.teamId,
  };
}

export const injuriesService = new InjuriesService();
