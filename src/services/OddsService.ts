import { CACHE_TTL_SECONDS, type CacheProvider } from "@/src/cache/CacheProvider";
import { memoryCache } from "@/src/cache/MemoryCache";
import {
  MockOddsProvider,
  OddsPipeProvider,
  ReplayOddsProvider,
  type OddsProvider,
  type OddsProviderMode,
  type OddsProviderRequest,
  type OddsProviderResponse,
} from "@/src/providers/odds";

const defaultRequest: OddsProviderRequest = {
  sport: "mlb",
};

export class OddsService {
  constructor(
    private readonly provider: OddsProvider = getConfiguredOddsProvider(),
    private readonly cache: CacheProvider = memoryCache,
  ) {}

  async getOdds(request: OddsProviderRequest = defaultRequest) {
    const cacheKey = getCacheKey(this.provider.id, request);
    const cached = await this.cache.get<OddsProviderResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.provider.getOdds(request);

    await this.cache.set(cacheKey, response, CACHE_TTL_SECONDS.odds);

    return response;
  }
}

export const oddsService = new OddsService();

export function getConfiguredOddsProvider(mode: OddsProviderMode = getOddsMode()) {
  if (mode === "live") {
    return new OddsPipeProvider();
  }

  if (mode === "replay") {
    return new ReplayOddsProvider();
  }

  return new MockOddsProvider();
}

function getOddsMode(): OddsProviderMode {
  const mode = process.env.ODDS_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  return "live";
}

function getCacheKey(providerId: string, request: OddsProviderRequest) {
  return `odds:${providerId}:${JSON.stringify(request)}`;
}
