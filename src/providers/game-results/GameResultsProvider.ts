export type GameResultsProviderMode = "live" | "mock" | "replay";

export type GameResultsRequest = {
  /** ISO date (YYYY-MM-DD), matching MLB Stats API schedule date format. */
  date: string;
};

export type NormalizedGameResult = {
  awayScore: number;
  awayTeamId: string;
  completedAt: string;
  gameId: string;
  homeScore: number;
  homeTeamId: string;
  winningTeamId: string;
};

export type GameResultsProviderResponse = {
  fetchedAt: string;
  mode: GameResultsProviderMode;
  provider: string;
  results: NormalizedGameResult[];
};

export interface GameResultsProvider {
  readonly id: string;
  getResults(request: GameResultsRequest): Promise<GameResultsProviderResponse>;
}
