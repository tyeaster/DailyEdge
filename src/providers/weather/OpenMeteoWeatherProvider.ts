import type {
  WeatherProvider,
  WeatherProviderResponse,
  WeatherRequest,
} from "./WeatherProvider.ts";
import {
  buildWeatherProfile,
  createWeatherNotApplicable,
  type WeatherObservation,
} from "./rating.ts";
import { ReplayWeatherProvider } from "./ReplayWeatherProvider.ts";

const DEFAULT_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoResponse = {
  hourly?: Record<string, Array<number | null>>;
};

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly id = "open-meteo";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayWeatherProvider;

  constructor(
    endpoint = process.env.OPEN_METEO_API_URL ?? DEFAULT_OPEN_METEO_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayWeatherProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getWeather(
    request: WeatherRequest,
  ): Promise<WeatherProviderResponse> {
    const fetchedAt = new Date().toISOString();

    if (
      request.roofStatus === "closed" ||
      request.roofType.toLowerCase().includes("dome") ||
      request.roofType.toLowerCase().includes("fixed")
    ) {
      return {
        fetchedAt,
        gameId: request.gameId,
        mode: "live",
        provider: this.id,
        weather: createWeatherNotApplicable({
          fetchedAt,
          gameId: request.gameId,
          roofStatus:
            request.roofStatus === "unknown" ? "closed" : request.roofStatus,
          source: "live",
          stadium: request.stadium,
        }),
      };
    }

    const url = buildOpenMeteoUrl(this.endpoint, request);
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with ${response.status}`);
    }

    const raw = (await response.json()) as OpenMeteoResponse;
    const observation = normalizeOpenMeteoObservation(raw, request.scheduledAt);
    const weather = buildWeatherProfile({
      azimuthDegrees: request.azimuthDegrees,
      fetchedAt,
      gameId: request.gameId,
      observation,
      roofStatus: request.roofStatus,
      roofType: request.roofType,
      scheduledAt: request.scheduledAt,
      source: "live",
      stadium: request.stadium,
    });

    if (process.env.WEATHER_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        raw,
        request,
        weather,
      });
    }

    return {
      fetchedAt,
      gameId: request.gameId,
      mode: "live",
      provider: this.id,
      weather,
    };
  }
}

export function normalizeOpenMeteoObservation(
  raw: unknown,
  scheduledAt: string,
): WeatherObservation {
  const response = raw as OpenMeteoResponse;
  const hourly = response.hourly ?? {};
  const times = hourly.time ?? [];
  const scheduledSeconds = new Date(scheduledAt).getTime() / 1000;
  const index = findClosestIndex(times, scheduledSeconds);

  if (index < 0) {
    throw new Error("Open-Meteo response did not include hourly forecast data");
  }

  return {
    airPressureHpa: nullableNumber(hourly.surface_pressure?.[index]),
    cloudCoverPercent: nullableNumber(hourly.cloud_cover?.[index]),
    dewPointF: nullableNumber(hourly.dew_point_2m?.[index]),
    forecastTime: new Date(number(hourly.time?.[index]) * 1000).toISOString(),
    gustMph: number(hourly.wind_gusts_10m?.[index]),
    humidityPercent: nullableNumber(hourly.relative_humidity_2m?.[index]),
    precipitationInches: number(hourly.precipitation?.[index]),
    rainChancePercent: number(hourly.precipitation_probability?.[index]),
    temperatureF: number(hourly.temperature_2m?.[index]),
    visibilityMiles:
      nullableNumber(hourly.visibility?.[index]) === null
        ? null
        : round(number(hourly.visibility?.[index]) / 5280, 1),
    weatherCode: nullableNumber(hourly.weather_code?.[index]),
    windDirectionDegrees: nullableNumber(
      hourly.wind_direction_10m?.[index],
    ),
    windMph: number(hourly.wind_speed_10m?.[index]),
  };
}

function buildOpenMeteoUrl(endpoint: string, request: WeatherRequest) {
  const url = new URL(endpoint);

  url.searchParams.set("latitude", String(request.latitude));
  url.searchParams.set("longitude", String(request.longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "visibility",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("forecast_days", "7");

  if (process.env.OPEN_METEO_API_KEY) {
    url.searchParams.set("apikey", process.env.OPEN_METEO_API_KEY);
  }

  return url;
}

function findClosestIndex(values: Array<number | null>, target: number) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      return;
    }

    const distance = Math.abs(value - target);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function nullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function number(value: number | null | undefined) {
  return nullableNumber(value) ?? 0;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
