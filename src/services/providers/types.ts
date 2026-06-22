import type {
  BetRecommendation,
  Game,
  Injury,
  Pitcher,
  Player,
  PlayerProp,
  Prediction,
  Team,
  Weather,
} from "@/src/models/mlb";
import type { SlateMeta } from "@/src/types/mlb-dashboard";

export interface DataProvider<TData extends { id: string }> {
  getById(id: string): Promise<TData | undefined>;
  list(): Promise<TData[]>;
}

export type GamesProvider = DataProvider<Game>;

export type TeamsProvider = DataProvider<Team>;

export interface PlayersProvider extends DataProvider<Player | Pitcher> {
  getPitcherById(id: string): Promise<Pitcher | undefined>;
  listPitchers(): Promise<Pitcher[]>;
}

export type PropsProvider = DataProvider<PlayerProp>;

export type PredictionsProvider = DataProvider<Prediction>;

export type WeatherProvider = DataProvider<Weather>;

export type InjuriesProvider = DataProvider<Injury>;

export type BetsProvider = DataProvider<BetRecommendation>;

export interface DailyEdgeDataProvider {
  bets: BetsProvider;
  games: GamesProvider;
  getSlateMeta(): Promise<SlateMeta>;
  injuries: InjuriesProvider;
  players: PlayersProvider;
  predictions: PredictionsProvider;
  props: PropsProvider;
  teams: TeamsProvider;
  weather: WeatherProvider;
}
