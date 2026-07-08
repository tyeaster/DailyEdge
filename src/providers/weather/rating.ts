import type {
  RoofStatus,
  WeatherProfile,
  WindRelativeDirection,
} from "../../models/mlb.ts";

import { WEATHER_RATING_CONFIG } from "./config.ts";

export interface WeatherObservation {
  airPressureHpa: number | null;
  cloudCoverPercent: number | null;
  dewPointF: number | null;
  forecastTime: string;
  gustMph: number;
  humidityPercent: number | null;
  precipitationInches: number;
  rainChancePercent: number;
  temperatureF: number;
  visibilityMiles: number | null;
  weatherCode: number | null;
  windDirectionDegrees: number | null;
  windMph: number;
}

export function buildWeatherProfile({
  azimuthDegrees,
  fetchedAt,
  gameId,
  observation,
  roofStatus,
  roofType,
  scheduledAt,
  source,
  stadium,
}: {
  azimuthDegrees: number | null;
  fetchedAt: string;
  gameId: string;
  observation: WeatherObservation;
  roofStatus: RoofStatus;
  roofType: string;
  scheduledAt: string;
  source: WeatherProfile["source"];
  stadium: string;
}): WeatherProfile {
  const indoor = isIndoor(roofStatus, roofType);

  if (indoor) {
    return createWeatherNotApplicable({
      fetchedAt,
      gameId,
      roofStatus: roofStatus === "unknown" ? "closed" : roofStatus,
      source,
      stadium,
    });
  }

  const airDensityKgM3 = calculateAirDensity({
    dewPointF: observation.dewPointF,
    pressureHpa: observation.airPressureHpa,
    temperatureF: observation.temperatureF,
  });
  const wind = calculateRelativeWind({
    azimuthDegrees,
    windDirectionDegrees: observation.windDirectionDegrees,
    windMph: observation.windMph,
  });
  const runEnvironment = calculateRunEnvironment({
    airDensityKgM3,
    humidityPercent: observation.humidityPercent,
    tailwindMph: wind.tailwindMph - wind.headwindMph,
    temperatureF: observation.temperatureF,
  });
  const homeRunEnvironment = calculateHomeRunEnvironment({
    airDensityKgM3,
    tailwindMph: wind.tailwindMph - wind.headwindMph,
    temperatureF: observation.temperatureF,
  });
  const stormRisk = calculateStormRisk(
    observation.weatherCode,
    observation.rainChancePercent,
  );
  const delayProbability = calculateDelayProbability(observation, stormRisk);
  const cancellationProbability = calculateCancellationProbability(
    observation,
    stormRisk,
  );
  const weatherSeverity = Math.round(
    clamp(
      delayProbability * 0.45 +
        cancellationProbability * 0.35 +
        stormRisk * 0.2,
      0,
      100,
    ),
  );
  const weatherConfidence = calculateWeatherConfidence({
    observation,
    scheduledAt,
  });
  const strikeoutEnvironment = Math.round(
    clamp(100 - runEnvironment, 0, 100),
  );
  const flyBallEnvironment = Math.round(
    clamp(homeRunEnvironment * 0.7 + runEnvironment * 0.3, 0, 100),
  );
  const groundBallEnvironment = Math.round(
    clamp(100 - flyBallEnvironment, 0, 100),
  );
  const offenseEnvironment = Math.round(
    clamp(runEnvironment * 0.65 + homeRunEnvironment * 0.35, 0, 100),
  );
  const pitchingEnvironment = Math.round(
    clamp(100 - offenseEnvironment, 0, 100),
  );

  return {
    airDensityKgM3:
      airDensityKgM3 === null ? null : round(airDensityKgM3, 3),
    airPressureHpa: observation.airPressureHpa,
    cancellationProbability,
    cloudCoverPercent: observation.cloudCoverPercent,
    crosswindMph: round(wind.crosswindMph, 1),
    delayProbability,
    dewPointF: observation.dewPointF,
    fetchedAt,
    flyBallEnvironment,
    gameId,
    groundBallEnvironment,
    gustMph: round(observation.gustMph, 1),
    headwindMph: round(wind.headwindMph, 1),
    hitterFriendlyRating: offenseEnvironment,
    homeRunEnvironment,
    humidityPercent: observation.humidityPercent,
    id: getWeatherId(gameId),
    indoor: false,
    offenseEnvironment,
    pitcherFriendlyRating: pitchingEnvironment,
    pitchingEnvironment,
    rainChancePercent: Math.round(observation.rainChancePercent),
    rainIntensityInchesPerHour: round(observation.precipitationInches, 3),
    relativeWindDirection: wind.relativeDirection,
    roofStatus,
    runEnvironment,
    source,
    stadium,
    stormRisk,
    strikeoutEnvironment,
    summary: buildWeatherSummary({
      relativeDirection: wind.relativeDirection,
      temperatureF: observation.temperatureF,
      windMph: observation.windMph,
    }),
    tailwindMph: round(wind.tailwindMph, 1),
    temperatureF: Math.round(observation.temperatureF),
    visibilityMiles: observation.visibilityMiles,
    weatherApplicable: true,
    weatherConfidence,
    weatherSeverity,
    windDirection: formatWindDirection(
      observation.windDirectionDegrees,
      wind.relativeDirection,
    ),
    windDirectionDegrees: observation.windDirectionDegrees,
    windMph: round(observation.windMph, 1),
  };
}

export function createWeatherUnavailable({
  fetchedAt = new Date().toISOString(),
  gameId,
  stadium,
}: {
  fetchedAt?: string;
  gameId: string;
  stadium: string;
}): WeatherProfile {
  return {
    ...createWeatherNotApplicable({
      fetchedAt,
      gameId,
      roofStatus: "unknown",
      source: "unavailable",
      stadium,
    }),
    indoor: false,
    summary: "Weather unavailable",
    weatherApplicable: true,
    weatherConfidence: 0,
  };
}

export function createWeatherNotApplicable({
  fetchedAt = new Date().toISOString(),
  gameId,
  roofStatus,
  source,
  stadium,
}: {
  fetchedAt?: string;
  gameId: string;
  roofStatus: RoofStatus;
  source: WeatherProfile["source"];
  stadium: string;
}): WeatherProfile {
  return {
    airDensityKgM3: null,
    airPressureHpa: null,
    cancellationProbability: 0,
    cloudCoverPercent: null,
    crosswindMph: 0,
    delayProbability: 0,
    dewPointF: null,
    fetchedAt,
    flyBallEnvironment: 50,
    gameId,
    groundBallEnvironment: 50,
    gustMph: 0,
    headwindMph: 0,
    hitterFriendlyRating: 50,
    homeRunEnvironment: 50,
    humidityPercent: null,
    id: getWeatherId(gameId),
    indoor: true,
    offenseEnvironment: 50,
    pitcherFriendlyRating: 50,
    pitchingEnvironment: 50,
    rainChancePercent: 0,
    rainIntensityInchesPerHour: 0,
    relativeWindDirection: "Not Applicable",
    roofStatus,
    runEnvironment: 50,
    source,
    stadium,
    stormRisk: 0,
    strikeoutEnvironment: 50,
    summary: "Weather Not Applicable",
    tailwindMph: 0,
    temperatureF: 0,
    visibilityMiles: null,
    weatherApplicable: false,
    weatherConfidence: 100,
    weatherSeverity: 0,
    windDirection: "Not Applicable",
    windDirectionDegrees: null,
    windMph: 0,
  };
}

export function calculateAirDensity({
  dewPointF,
  pressureHpa,
  temperatureF,
}: {
  dewPointF: number | null;
  pressureHpa: number | null;
  temperatureF: number;
}) {
  if (pressureHpa === null || pressureHpa <= 0) {
    return null;
  }

  const temperatureC = fahrenheitToCelsius(temperatureF);
  const dewPointC =
    dewPointF === null ? temperatureC - 10 : fahrenheitToCelsius(dewPointF);
  const vaporPressureHpa =
    6.112 *
    Math.exp((17.67 * dewPointC) / (dewPointC + 243.5));
  const dryPressurePa = (pressureHpa - vaporPressureHpa) * 100;
  const vaporPressurePa = vaporPressureHpa * 100;
  const temperatureKelvin = temperatureC + 273.15;

  return (
    dryPressurePa / (287.05 * temperatureKelvin) +
    vaporPressurePa / (461.495 * temperatureKelvin)
  );
}

function calculateRelativeWind({
  azimuthDegrees,
  windDirectionDegrees,
  windMph,
}: {
  azimuthDegrees: number | null;
  windDirectionDegrees: number | null;
  windMph: number;
}) {
  if (windMph < 1) {
    return {
      crosswindMph: 0,
      headwindMph: 0,
      relativeDirection: "Calm" as WindRelativeDirection,
      tailwindMph: 0,
    };
  }

  if (azimuthDegrees === null || windDirectionDegrees === null) {
    return {
      crosswindMph: windMph,
      headwindMph: 0,
      relativeDirection: "Crosswind" as WindRelativeDirection,
      tailwindMph: 0,
    };
  }

  const towardBearing = (windDirectionDegrees + 180) % 360;
  const deltaRadians =
    (normalizeDegrees(towardBearing - azimuthDegrees) * Math.PI) / 180;
  const forward = Math.cos(deltaRadians) * windMph;
  const lateral = Math.sin(deltaRadians) * windMph;
  const tailwindMph = Math.max(0, forward);
  const headwindMph = Math.max(0, -forward);
  const crosswindMph = Math.abs(lateral);
  let relativeDirection: WindRelativeDirection;

  if (Math.abs(forward) >= Math.abs(lateral)) {
    relativeDirection = forward >= 0 ? "Tailwind" : "Headwind";
  } else if (Math.abs(lateral) < windMph * 0.35) {
    relativeDirection = "Crosswind";
  } else {
    relativeDirection = lateral > 0 ? "Left to Right" : "Right to Left";
  }

  return { crosswindMph, headwindMph, relativeDirection, tailwindMph };
}

function calculateRunEnvironment({
  airDensityKgM3,
  humidityPercent,
  tailwindMph,
  temperatureF,
}: {
  airDensityKgM3: number | null;
  humidityPercent: number | null;
  tailwindMph: number;
  temperatureF: number;
}) {
  const config = WEATHER_RATING_CONFIG.runEnvironment;
  const temperature = normalize(temperatureF, 45, 95);
  const density =
    airDensityKgM3 === null ? 50 : normalizeInverse(airDensityKgM3, 0.95, 1.3);
  const wind = normalize(tailwindMph, -15, 15);
  const humidity =
    humidityPercent === null ? 50 : normalize(humidityPercent, 25, 90);

  return Math.round(
    clamp(
      temperature * config.temperatureWeight +
        density * config.densityWeight +
        wind * config.tailwindWeight +
        humidity * config.humidityWeight,
      0,
      100,
    ),
  );
}

function calculateHomeRunEnvironment({
  airDensityKgM3,
  tailwindMph,
  temperatureF,
}: {
  airDensityKgM3: number | null;
  tailwindMph: number;
  temperatureF: number;
}) {
  const config = WEATHER_RATING_CONFIG.homeRun;
  const temperature = normalize(temperatureF, 45, 95);
  const density =
    airDensityKgM3 === null ? 50 : normalizeInverse(airDensityKgM3, 0.95, 1.3);
  const wind = normalize(tailwindMph, -15, 15);

  return Math.round(
    clamp(
      temperature * config.temperatureWeight +
        density * config.densityWeight +
        wind * config.tailwindWeight,
      0,
      100,
    ),
  );
}

function calculateDelayProbability(
  observation: WeatherObservation,
  stormRisk: number,
) {
  const intensityScore = normalize(
    observation.precipitationInches,
    0,
    WEATHER_RATING_CONFIG.precipitation.delayIntensity,
  );

  return Math.round(
    clamp(
      observation.rainChancePercent * 0.55 +
        intensityScore * 0.25 +
        stormRisk * 0.2,
      0,
      100,
    ),
  );
}

function calculateCancellationProbability(
  observation: WeatherObservation,
  stormRisk: number,
) {
  const intensityScore = normalize(
    observation.precipitationInches,
    0,
    WEATHER_RATING_CONFIG.precipitation.cancellationIntensity,
  );
  const probabilityScore = normalize(
    observation.rainChancePercent,
    40,
    WEATHER_RATING_CONFIG.precipitation.cancellationProbability,
  );

  return Math.round(
    clamp(
      probabilityScore * 0.35 + intensityScore * 0.35 + stormRisk * 0.3,
      0,
      100,
    ),
  );
}

function calculateStormRisk(
  weatherCode: number | null,
  rainChancePercent: number,
) {
  if (weatherCode !== null && weatherCode >= 95) {
    return Math.round(clamp(70 + rainChancePercent * 0.3, 0, 100));
  }

  if (weatherCode !== null && weatherCode >= 80) {
    return Math.round(clamp(35 + rainChancePercent * 0.35, 0, 100));
  }

  return Math.round(clamp(rainChancePercent * 0.25, 0, 100));
}

function calculateWeatherConfidence({
  observation,
  scheduledAt,
}: {
  observation: WeatherObservation;
  scheduledAt: string;
}) {
  const hoursToGame = Math.max(
    0,
    (new Date(scheduledAt).getTime() - Date.now()) / 3_600_000,
  );
  const availableFields = [
    observation.airPressureHpa,
    observation.cloudCoverPercent,
    observation.dewPointF,
    observation.humidityPercent,
    observation.visibilityMiles,
    observation.windDirectionDegrees,
  ].filter((value) => value !== null).length;
  const completeness = availableFields / 6;
  const horizonScore = Math.max(
    WEATHER_RATING_CONFIG.forecastConfidence.minimum,
    WEATHER_RATING_CONFIG.forecastConfidence.base -
      hoursToGame * WEATHER_RATING_CONFIG.forecastConfidence.perHourPenalty,
  );

  return Math.round(clamp(horizonScore * 0.75 + completeness * 25, 0, 100));
}

function buildWeatherSummary({
  relativeDirection,
  temperatureF,
  windMph,
}: {
  relativeDirection: WindRelativeDirection;
  temperatureF: number;
  windMph: number;
}) {
  const wind =
    relativeDirection === "Calm"
      ? "calm wind"
      : `${Math.round(windMph)} MPH ${relativeDirection}`;

  return `${Math.round(temperatureF)}F, ${wind}`;
}

function formatWindDirection(
  degrees: number | null,
  relativeDirection: WindRelativeDirection,
) {
  if (degrees === null) {
    return relativeDirection;
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const cardinal = directions[Math.round(degrees / 45) % directions.length];

  return `${cardinal} (${relativeDirection})`;
}

function isIndoor(roofStatus: RoofStatus, roofType: string) {
  const normalizedRoof = roofType.toLowerCase();

  return (
    roofStatus === "closed" ||
    normalizedRoof.includes("dome") ||
    normalizedRoof.includes("fixed")
  );
}

function fahrenheitToCelsius(value: number) {
  return ((value - 32) * 5) / 9;
}

function getWeatherId(gameId: string) {
  return gameId.startsWith("game-")
    ? gameId.replace(/^game-/, "weather-")
    : `weather-${gameId}`;
}

function normalize(value: number, minimum: number, maximum: number) {
  return clamp(((value - minimum) / (maximum - minimum)) * 100, 0, 100);
}

function normalizeInverse(value: number, minimum: number, maximum: number) {
  return 100 - normalize(value, minimum, maximum);
}

function normalizeDegrees(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
