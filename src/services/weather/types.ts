export type WeatherCondition = {
  description: string;
  temperatureF: number;
  windMph: number;
};

export type VenueWeather = {
  gameId: string;
  updatedAt: string;
  weather: WeatherCondition;
};
