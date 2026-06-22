import type {
  BetRecommendation,
  Game,
  Injury,
  Pitcher,
  Player,
  PlayerProp,
  PlayerPropCategory,
  Team,
  Weather,
} from "@/src/models/mlb";
import type { DashboardNavItem, KpiMetric, SlateMeta } from "@/src/types/mlb-dashboard";

export interface DailySlateGame {
  awayPitcher: Pitcher;
  awayTeam: Team;
  game: Game;
  homePitcher: Pitcher;
  homeTeam: Team;
  weather: Weather;
}

export interface DailySlateBet {
  bet: BetRecommendation;
  player?: Player | Pitcher;
  team?: Team;
}

export interface DailySlateProp {
  player: Player | Pitcher;
  prop: PlayerProp;
  team: Team;
}

export interface DailySlatePropCategory {
  label: PlayerPropCategory;
  props: DailySlateProp[];
}

export interface DailySlateWeather {
  awayTeam: Team;
  game: Game;
  homeTeam: Team;
  report: Weather;
}

export interface DailySlateInjury {
  injury: Injury;
  player: Player | Pitcher;
  team: Team;
}

export interface DailySlateViewModel {
  bets: DailySlateBet[];
  dashboardNavItems: DashboardNavItem[];
  games: DailySlateGame[];
  injuries: DailySlateInjury[];
  kpiMetrics: KpiMetric[];
  propCategories: DailySlatePropCategory[];
  slateMeta: SlateMeta;
  weatherReports: DailySlateWeather[];
}
