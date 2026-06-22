export type MlbLeague = "AL" | "NL";
export type MlbDivision = "East" | "Central" | "West";
export type BattingSide = "L" | "R" | "S";
export type ThrowingHand = "L" | "R";
export type GameStatus = "scheduled" | "confirmed" | "line-watch" | "weather-watch" | "roof-watch";
export type OddsMarket = "moneyline" | "spread" | "total" | "team-total" | "player-prop";
export type PlayerPropCategory =
  | "Strikeouts"
  | "Hits"
  | "Runs"
  | "RBI"
  | "Home Runs"
  | "Total Bases";

export interface ConfidenceScore {
  label: "Low" | "Medium" | "High" | "Elite";
  value: number;
}

export interface EdgeScore {
  percentage: number;
  rating: "S" | "A" | "B" | "C";
}

export interface Team {
  abbreviation: string;
  city: string;
  division: MlbDivision;
  id: string;
  league: MlbLeague;
  name: string;
}

export interface Player {
  bats: BattingSide;
  fullName: string;
  id: string;
  position: string;
  teamId: string;
  throws: ThrowingHand;
}

export interface Pitcher extends Player {
  arsenal: string[];
  era: number;
  handedness: ThrowingHand;
  inningsPitched: number;
  strikeoutRate: number;
  whip: number;
}

export interface Odds {
  displayLine: string;
  id: string;
  line: number;
  market: OddsMarket;
  movement: string;
  openingLine?: number;
  price: number;
  sportsbook: string;
}

export interface Weather {
  gameId: string;
  hitterFriendlyRating: number;
  humidityPercent: number | null;
  id: string;
  pitcherFriendlyRating: number;
  rainChancePercent: number;
  stadium: string;
  summary: string;
  temperatureF: number;
  windDirection: string;
  windMph: number;
}

export interface Injury {
  expectedReturn: string;
  id: string;
  impactRating: number;
  playerId: string;
  status: "Probable" | "Questionable" | "Day-to-day" | "10-day IL" | "15-day IL";
  teamId: string;
}

export interface Prediction {
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  market: OddsMarket;
  playerId?: string;
  projection: string;
  reasoning: string;
  teamId?: string;
}

export interface PlayerProp {
  category: PlayerPropCategory;
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  odds: Odds;
  playerId: string;
  projection: string;
  reasoning: string;
}

export interface BetRecommendation {
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  odds: Odds;
  playerId?: string;
  rank: number;
  recommendedUnits: number;
  selection: string;
  teamId?: string;
  prediction: Prediction;
}

export interface Game {
  awayPitcherId: string;
  awayTeamId: string;
  confidence: ConfidenceScore;
  detail: string;
  homePitcherId: string;
  homeTeamId: string;
  id: string;
  odds: {
    moneyline: Odds;
    spread: Odds;
    total: Odds;
  };
  scheduledAt: string;
  status: GameStatus;
  venue: string;
  weatherId: string;
}
