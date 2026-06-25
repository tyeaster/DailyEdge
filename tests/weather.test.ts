import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Game } from "../src/models/mlb.ts";
import {
  normalizeOpenMeteoObservation,
  OpenMeteoWeatherProvider,
} from "../src/providers/weather/OpenMeteoWeatherProvider.ts";
import { MockWeatherProvider } from "../src/providers/weather/MockWeatherProvider.ts";
import { ReplayWeatherProvider } from "../src/providers/weather/ReplayWeatherProvider.ts";
import {
  buildWeatherProfile,
  calculateAirDensity,
  createWeatherNotApplicable,
} from "../src/providers/weather/rating.ts";
import type {
  WeatherProvider,
  WeatherProviderResponse,
  WeatherRequest,
} from "../src/providers/weather/WeatherProvider.ts";
import { WeatherService } from "../src/services/WeatherService.ts";

const scheduledAt = "2026-06-25T23:00:00.000Z";
const request: WeatherRequest = {
  azimuthDegrees: 0,
  gameId: "game-weather",
  latitude: 40,
  longitude: -75,
  roofStatus: "open",
  roofType: "Open",
  scheduledAt,
  stadium: "Test Park",
  venueId: 1,
};
const raw = {
  hourly: {
    cloud_cover: [25, 35],
    dew_point_2m: [58, 60],
    precipitation: [0, 0.12],
    precipitation_probability: [10, 70],
    relative_humidity_2m: [45, 62],
    surface_pressure: [1008, 1006],
    temperature_2m: [78, 82],
    time: [
      new Date("2026-06-25T22:00:00.000Z").getTime() / 1000,
      new Date(scheduledAt).getTime() / 1000,
    ],
    visibility: [52800, 26400],
    weather_code: [1, 95],
    wind_direction_10m: [180, 180],
    wind_gusts_10m: [12, 20],
    wind_speed_10m: [8, 12],
  },
};

test("normalizes the closest Open-Meteo hourly forecast", () => {
  const observation = normalizeOpenMeteoObservation(raw, scheduledAt);

  assert.equal(observation.temperatureF, 82);
  assert.equal(observation.rainChancePercent, 70);
  assert.equal(observation.visibilityMiles, 5);
  assert.equal(observation.windMph, 12);
});

test("calculates deterministic weather ratings and relative wind", () => {
  const observation = normalizeOpenMeteoObservation(raw, scheduledAt);
  const profile = buildWeatherProfile({
    azimuthDegrees: 0,
    fetchedAt: "2026-06-25T18:00:00.000Z",
    gameId: request.gameId,
    observation,
    roofStatus: "open",
    roofType: "Open",
    scheduledAt,
    source: "live",
    stadium: request.stadium,
  });

  assert.equal(profile.relativeWindDirection, "Tailwind");
  assert.ok(profile.homeRunEnvironment > 50);
  assert.ok(profile.runEnvironment > 50);
  assert.ok(profile.delayProbability > 50);
  assert.ok(profile.stormRisk > 70);
  assert.ok((profile.airDensityKgM3 ?? 0) > 1);
});

test("air density responds to temperature and pressure", () => {
  const cool = calculateAirDensity({
    dewPointF: 50,
    pressureHpa: 1015,
    temperatureF: 55,
  });
  const hot = calculateAirDensity({
    dewPointF: 65,
    pressureHpa: 1005,
    temperatureF: 90,
  });

  assert.ok(cool !== null && hot !== null);
  assert.ok(cool > hot);
});

test("closed-roof weather is neutral and not applicable", () => {
  const profile = createWeatherNotApplicable({
    gameId: "indoor",
    roofStatus: "closed",
    source: "live",
    stadium: "Indoor Park",
  });

  assert.equal(profile.weatherApplicable, false);
  assert.equal(profile.runEnvironment, 50);
  assert.equal(profile.weatherConfidence, 100);
  assert.equal(profile.summary, "Weather Not Applicable");
});

test("live provider requests hourly weather and normalizes it", async () => {
  const urls: string[] = [];
  const provider = new OpenMeteoWeatherProvider(
    "https://weather.example.test/forecast",
    async (input) => {
      urls.push(String(input));

      return new Response(JSON.stringify(raw), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    },
  );
  const response = await provider.getWeather(request);

  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes("surface_pressure"));
  assert.equal(response.mode, "live");
  assert.equal(response.weather.temperatureF, 82);
});

test("mock and replay weather providers preserve the contract", async () => {
  const replayDir = await mkdtemp(path.join(tmpdir(), "weather-replay-"));
  const live = await new OpenMeteoWeatherProvider(
    "https://weather.example.test/forecast",
    async () =>
      new Response(JSON.stringify(raw), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
  ).getWeather(request);
  const mock = await new MockWeatherProvider().getWeather({
    ...request,
    fallbackWeather: live.weather,
  });
  const replayProvider = new ReplayWeatherProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      provider: "open-meteo",
      raw,
      request,
      weather: live.weather,
    });
    const replay = await replayProvider.getWeather(request);

    assert.equal(mock.mode, "mock");
    assert.equal(replay.mode, "replay");
    assert.equal(replay.weather.source, "replay");
    assert.equal(replay.weather.temperatureF, 82);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("repository weather replay fixture runs without network access", async () => {
  const replay = await new ReplayWeatherProvider(
    path.resolve("replay/weather"),
  ).getWeather(request);

  assert.equal(replay.mode, "replay");
  assert.equal(replay.weather.source, "replay");
  assert.equal(replay.weather.runEnvironment, 61);
});

test("weather service caches and degrades without coordinates", async () => {
  let calls = 0;
  const weather = buildWeatherProfile({
    azimuthDegrees: 0,
    fetchedAt: "2026-06-25T18:00:00.000Z",
    gameId: request.gameId,
    observation: normalizeOpenMeteoObservation(raw, scheduledAt),
    roofStatus: "open",
    roofType: "Open",
    scheduledAt,
    source: "live",
    stadium: request.stadium,
  });
  const provider: WeatherProvider = {
    id: "test-weather",
    async getWeather(input): Promise<WeatherProviderResponse> {
      calls += 1;

      return {
        fetchedAt: weather.fetchedAt,
        gameId: input.gameId,
        mode: "live",
        provider: "test-weather",
        weather,
      };
    },
  };
  const service = new WeatherService(provider, new MemoryCache());
  const game = buildGame();

  await service.enrichGame(game);
  await service.enrichGame(game);
  const unavailable = await service.enrichGame({
    ...game,
    ballpark: { ...game.ballpark!, latitude: null },
  });

  assert.equal(calls, 1);
  assert.equal(unavailable.weather?.weatherConfidence, 0);
});

function buildGame(): Game {
  return {
    awayPitcherId: "away-pitcher",
    awayTeamId: "away",
    ballpark: {
      altitudeFeet: 100,
      azimuthDegrees: 0,
      babipFactor: 100,
      dimensions: {
        center: 400,
        leftCenter: 375,
        leftLine: 330,
        rightCenter: 375,
        rightLine: 330,
      },
      doublesFactor: 100,
      fetchedAt: "2026-06-25T12:00:00.000Z",
      flyBallFactor: null,
      foulTerritoryFactor: null,
      groundBallFactor: null,
      historicalConfidence: 90,
      hitterFriendlyRating: 50,
      homeRunFactor: 100,
      league: "NL",
      leftHandedHomeRunFactor: 100,
      latitude: 40,
      longitude: -75,
      name: "Test Park",
      outfieldSpeed: 50,
      overallParkRating: 50,
      pitcherFriendlyRating: 50,
      powerFriendlyRating: 50,
      rightHandedHomeRunFactor: 100,
      roofType: "Open",
      runFactor: 100,
      singlesFactor: 100,
      source: "live",
      speedFriendlyRating: 50,
      strikeoutFactor: 100,
      surface: "Grass",
      triplesFactor: 100,
      venueId: 1,
      walkFactor: 100,
    },
    confidence: { label: "Medium", value: 50 },
    detail: "",
    homePitcherId: "home-pitcher",
    homeTeamId: "home",
    id: request.gameId,
    modelProbability: 0.5,
    odds: {
      moneyline: {
        displayLine: "Pending",
        id: "ml",
        line: 0,
        market: "moneyline",
        movement: "",
        price: 0,
        sportsbook: "",
      },
      spread: {
        displayLine: "Pending",
        id: "spread",
        line: 0,
        market: "spread",
        movement: "",
        price: 0,
        sportsbook: "",
      },
      total: {
        displayLine: "8.5",
        id: "total",
        line: 8.5,
        market: "total",
        movement: "",
        price: -110,
        sportsbook: "",
      },
    },
    scheduledAt,
    status: "scheduled",
    venue: "Test Park",
    weatherId: "weather-game",
  };
}
