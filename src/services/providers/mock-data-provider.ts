import {
  betRecommendations,
  games,
  injuries,
  pitchers,
  playerProps,
  players,
  predictions,
  slateMeta,
  teams,
  weatherReports,
} from "@/mock";
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

import type {
  BetsProvider,
  DailyEdgeDataProvider,
  DataProvider,
  GamesProvider,
  InjuriesProvider,
  PlayersProvider,
  PredictionsProvider,
  PropsProvider,
  TeamsProvider,
  WeatherProvider,
} from "./types";

class StaticDataProvider<TData extends { id: string }> implements DataProvider<TData> {
  constructor(private readonly records: TData[]) {}

  async getById(id: string) {
    return this.records.find((record) => record.id === id);
  }

  async list() {
    return [...this.records];
  }
}

class StaticPlayersProvider
  extends StaticDataProvider<Player | Pitcher>
  implements PlayersProvider
{
  constructor(
    private readonly hitterRecords: Player[],
    private readonly pitcherRecords: Pitcher[],
  ) {
    super([...hitterRecords, ...pitcherRecords]);
  }

  async getPitcherById(id: string) {
    return this.pitcherRecords.find((pitcher) => pitcher.id === id);
  }

  async listPitchers() {
    return [...this.pitcherRecords];
  }
}

export class MockDataProvider implements DailyEdgeDataProvider {
  readonly bets: BetsProvider = new StaticDataProvider<BetRecommendation>(
    betRecommendations,
  );

  readonly games: GamesProvider = new StaticDataProvider<Game>(games);

  readonly injuries: InjuriesProvider = new StaticDataProvider<Injury>(injuries);

  readonly players: PlayersProvider = new StaticPlayersProvider(players, pitchers);

  readonly predictions: PredictionsProvider = new StaticDataProvider<Prediction>(
    predictions,
  );

  readonly props: PropsProvider = new StaticDataProvider<PlayerProp>(playerProps);

  readonly teams: TeamsProvider = new StaticDataProvider<Team>(teams);

  readonly weather: WeatherProvider = new StaticDataProvider<Weather>(weatherReports);

  async getSlateMeta() {
    return slateMeta;
  }
}

export const mockDataProvider = new MockDataProvider();
