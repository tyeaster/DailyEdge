export type DashboardNavItem = {
  active?: boolean;
  badge?: string;
  href: string;
  icon: string;
  label: string;
};

export type SlateMeta = {
  averageConfidence: string;
  currentDate: string;
  firstPitchCountdown: string;
  gamesToday: number;
  lastUpdated: string;
};

export type KpiMetric = {
  label: string;
  meta: string;
  tone?: "blue" | "emerald" | "amber";
  value: string;
};

export type GamePreview = {
  awayPitcher: string;
  awayTeam: string;
  confidence: number;
  detail: string;
  gameTime: string;
  homePitcher: string;
  homeTeam: string;
  moneyline: string;
  spread: string;
  status: "Confirmed" | "Line Watch" | "Weather Watch" | "Roof Watch";
  total: string;
  venue: string;
  weather: string;
};

export type BetPreview = {
  bet: string;
  confidence: number;
  edge: string;
  modelProjection: string;
  player: string;
  reasoning: string;
  recommendedUnits: string;
  sportsbookLine: string;
};

export type PropCategory =
  | "Strikeouts"
  | "Hits"
  | "Runs"
  | "RBI"
  | "Home Runs"
  | "Total Bases";

export type PlayerProp = {
  category: PropCategory;
  confidence: number;
  edge: string;
  line: string;
  player: string;
  projection: string;
  reasoning: string;
  team: string;
};

export type WeatherReport = {
  game: string;
  hitterFriendlyRating: number;
  humidity: string;
  pitcherFriendlyRating: number;
  rainChance: string;
  stadium: string;
  temperature: string;
  windDirection: string;
  windSpeed: string;
};

export type InjuryReport = {
  expectedReturn: string;
  impactRating: number;
  player: string;
  status: string;
  team: string;
};
