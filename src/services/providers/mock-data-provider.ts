import {
  betRecommendations,
  games,
  injuries,
  pitchers,
  playerProps,
  players,
  slateMeta,
  teams,
  weatherReports,
} from "@/mock";
import { formatAmericanOdds } from "@/src/lib/odds";
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
import { predictionEngine } from "@/src/services/predictions";

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
    buildMockPredictions(),
  );

  readonly props: PropsProvider = new StaticDataProvider<PlayerProp>(playerProps);

  readonly teams: TeamsProvider = new StaticDataProvider<Team>(teams);

  readonly weather: WeatherProvider = new StaticDataProvider<Weather>(weatherReports);

  async getSlateMeta() {
    return slateMeta;
  }
}

export const mockDataProvider = new MockDataProvider();

function buildMockPredictions(): Prediction[] {
  const teamById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const pitcherById = Object.fromEntries(
    pitchers.map((pitcher) => [pitcher.id, pitcher]),
  );

  return predictionEngine
    .predictSlate({
      games,
      pitcherById,
      teamById,
    })
    .map((result) => ({
      confidence: toConfidenceScore(result.confidenceScore),
      edge: {
        percentage: result.edgePercent,
        rating:
          result.edgePercent >= 8
            ? "S"
            : result.edgePercent >= 5
              ? "A"
              : result.edgePercent >= 3
                ? "B"
                : "C",
      },
      gameId: result.gameId,
      id: `prediction-${result.gameId}-${result.selectedTeamId}-moneyline`,
      market: "moneyline",
      projection: formatAmericanOdds(result.selectedFairMoneyline),
      reasoning: result.explanations.join(". "),
      teamId: result.selectedTeamId,
    }));
}

function toConfidenceScore(value: number): Prediction["confidence"] {
  if (value >= 82) {
    return { label: "Elite", value };
  }

  if (value >= 72) {
    return { label: "High", value };
  }

  if (value >= 58) {
    return { label: "Medium", value };
  }

  return { label: "Low", value };
}
