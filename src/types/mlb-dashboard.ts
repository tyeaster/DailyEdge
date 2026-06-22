export type DashboardNavItem = {
  active?: boolean;
  href: string;
  icon: string;
  label: string;
};

export type KpiMetric = {
  label: string;
  meta: string;
  value: string;
};

export type GamePreview = {
  awayTeam: string;
  confidence: string;
  homeTeam: string;
  moneyline: string;
  spread: string;
  starters: string;
  time: string;
  total: string;
  weatherIcon: string;
};

export type BetPreview = {
  betType: string;
  confidence: string;
  edge: string;
  modelProjection: string;
  player: string;
  recommendedUnits: string;
  sportsbookLine: string;
};

export type HomeRunPick = {
  ballpark: string;
  hrProbability: string;
  pitcher: string;
  player: string;
  valueRating: string;
  wind: string;
};

export type PlayerProp = {
  confidence: string;
  edge: string;
  line: string;
  player: string;
  projection: string;
  propType: string;
};

export type PitcherProp = {
  confidence: string;
  edge: string;
  opponentKRate: string;
  pitcher: string;
  projection: string;
  vegasLine: string;
};

export type WeatherReport = {
  environment: "Hitter Friendly" | "Pitcher Friendly" | "Neutral";
  rainChance: string;
  stadium: string;
  temperature: string;
  windDirection: string;
  windSpeed: string;
};

export type InjuryReport = {
  expectedReturn: string;
  player: string;
  status: string;
  team: string;
};

export type TrendRow = {
  label: string;
  note: string;
  value: string;
};

export type OddsRow = {
  bestPrice: string;
  market: string;
  move: string;
  open: string;
};
