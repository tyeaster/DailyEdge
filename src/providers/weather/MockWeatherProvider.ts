import { createWeatherUnavailable } from "./rating.ts";
import type {
  WeatherProvider,
  WeatherProviderResponse,
  WeatherRequest,
} from "./WeatherProvider.ts";

export class MockWeatherProvider implements WeatherProvider {
  readonly id = "weather-mock";

  async getWeather(
    request: WeatherRequest,
  ): Promise<WeatherProviderResponse> {
    const fetchedAt = new Date().toISOString();

    return {
      fetchedAt,
      gameId: request.gameId,
      mode: "mock",
      provider: this.id,
      weather:
        request.fallbackWeather ??
        createWeatherUnavailable({
          fetchedAt,
          gameId: request.gameId,
          stadium: request.stadium,
        }),
    };
  }
}
