export const WEATHER_RATING_CONFIG = {
  forecastConfidence: {
    base: 95,
    perHourPenalty: 0.8,
    minimum: 45,
  },
  homeRun: {
    densityWeight: 0.4,
    tailwindWeight: 0.35,
    temperatureWeight: 0.25,
  },
  precipitation: {
    cancellationIntensity: 0.35,
    cancellationProbability: 85,
    delayIntensity: 0.08,
    delayProbability: 55,
  },
  runEnvironment: {
    densityWeight: 0.3,
    humidityWeight: 0.1,
    tailwindWeight: 0.25,
    temperatureWeight: 0.35,
  },
} as const;
