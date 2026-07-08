import type { WeatherProfile } from "../../models/mlb.ts";

export type WeatherProviderMode = "live" | "mock" | "replay";

export interface WeatherRequest {
  azimuthDegrees: number | null;
  fallbackWeather?: WeatherProfile;
  gameId: string;
  latitude: number;
  longitude: number;
  roofStatus: WeatherProfile["roofStatus"];
  roofType: string;
  scheduledAt: string;
  stadium: string;
  venueId: number;
}

export interface WeatherProviderResponse {
  fetchedAt: string;
  gameId: string;
  mode: WeatherProviderMode;
  provider: string;
  weather: WeatherProfile;
}

export interface WeatherProvider {
  readonly id: string;
  getWeather(request: WeatherRequest): Promise<WeatherProviderResponse>;
}
