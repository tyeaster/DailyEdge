import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Game, MlbLeague } from "../models/mlb.ts";
import {
  createBallparkUnavailable,
  MLBBallparkProvider,
  MockBallparkProvider,
  ReplayBallparkProvider,
  type BallparkProvider,
  type BallparkProviderMode,
} from "../providers/ballparks/index.ts";

export class BallparkService {
  private readonly cache: CacheProvider;
  private readonly provider: BallparkProvider;

  constructor(
    provider: BallparkProvider = getConfiguredBallparkProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichGames(
    games: Game[],
    leagueByHomeTeamId: Record<string, MlbLeague>,
    season: number,
  ) {
    return Promise.all(
      games.map((game) =>
        this.enrichGame(
          game,
          leagueByHomeTeamId[game.homeTeamId] ?? "AL",
          season,
        ),
      ),
    );
  }

  async enrichGame(game: Game, league: MlbLeague, season: number) {
    const venueId = game.externalIds?.venueMlb;

    if (!venueId) {
      return {
        ...game,
        ballpark: createBallparkUnavailable({
          league,
          name: game.venue,
          venueId: 0,
        }),
      };
    }

    const cacheKey = `ballpark:${this.provider.id}:${venueId}:${season}`;
    const cached = await this.cache.get<Game["ballpark"]>(cacheKey);

    if (cached) {
      return { ...game, ballpark: cached };
    }

    try {
      const response = await this.provider.getBallpark({
        fallbackBallpark: game.ballpark,
        league,
        season,
        venueId,
        venueName: game.venue,
      });

      await this.cache.set(
        cacheKey,
        response.ballpark,
        CACHE_TTL_SECONDS.ballpark,
      );

      return { ...game, ballpark: response.ballpark };
    } catch {
      return {
        ...game,
        ballpark: createBallparkUnavailable({
          league,
          name: game.venue,
          venueId,
        }),
      };
    }
  }
}

export const ballparkService = new BallparkService();

export function getConfiguredBallparkProvider(
  mode: BallparkProviderMode = getBallparkMode(),
) {
  if (mode === "replay") {
    return new ReplayBallparkProvider();
  }

  if (mode === "mock") {
    return new MockBallparkProvider();
  }

  return new MLBBallparkProvider();
}

export function getBallparkMode(): BallparkProviderMode {
  const mode = process.env.BALLPARK_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  const weatherMode = process.env.WEATHER_MODE;

  if (weatherMode === "replay" || weatherMode === "mock") {
    return weatherMode;
  }

  return "live";
}
