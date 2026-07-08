import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Game, WeatherProfile } from "../models/mlb.ts";
import {
  createWeatherUnavailable,
  MockWeatherProvider,
  OpenMeteoWeatherProvider,
  ReplayWeatherProvider,
  type WeatherProvider,
  type WeatherProviderMode,
} from "../providers/weather/index.ts";

export class WeatherService {
  private readonly cache: CacheProvider;
  private readonly provider: WeatherProvider;

  constructor(
    provider: WeatherProvider = getConfiguredWeatherProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichGames(games: Game[]) {
    return Promise.all(games.map((game) => this.enrichGame(game)));
  }

  async enrichGame(game: Game): Promise<Game> {
    const ballpark = game.ballpark;
    const latitude = ballpark?.latitude;
    const longitude = ballpark?.longitude;

    if (
      !ballpark ||
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return {
        ...game,
        weather: createWeatherUnavailable({
          gameId: game.id,
          stadium: game.venue,
        }),
      };
    }

    const cacheKey = `weather:${this.provider.id}:${game.id}:${game.scheduledAt}`;
    const cached = await this.cache.get<WeatherProfile>(cacheKey);

    if (cached) {
      return { ...game, weather: cached };
    }

    try {
      const response = await this.provider.getWeather({
        azimuthDegrees: ballpark.azimuthDegrees,
        fallbackWeather: game.weather,
        gameId: game.id,
        latitude,
        longitude,
        roofStatus: inferRoofStatus(ballpark.roofType),
        roofType: ballpark.roofType,
        scheduledAt: game.scheduledAt,
        stadium: game.venue,
        venueId: ballpark.venueId,
      });
      const ttlSeconds = response.weather.weatherApplicable
        ? CACHE_TTL_SECONDS.weather
        : 3600;

      await this.cache.set(cacheKey, response.weather, ttlSeconds);

      return { ...game, weather: response.weather };
    } catch {
      return {
        ...game,
        weather: createWeatherUnavailable({
          gameId: game.id,
          stadium: game.venue,
        }),
      };
    }
  }
}

export const weatherService = new WeatherService();

export function getConfiguredWeatherProvider(
  mode: WeatherProviderMode = getWeatherMode(),
) {
  if (mode === "replay") {
    return new ReplayWeatherProvider();
  }

  if (mode === "mock") {
    return new MockWeatherProvider();
  }

  return new OpenMeteoWeatherProvider();
}

export function getWeatherMode(): WeatherProviderMode {
  const mode = process.env.WEATHER_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  return "live";
}

function inferRoofStatus(roofType: string): WeatherProfile["roofStatus"] {
  const normalized = roofType.toLowerCase();

  if (normalized.includes("dome") || normalized.includes("fixed")) {
    return "closed";
  }

  if (normalized.includes("open")) {
    return "open";
  }

  return "unknown";
}
