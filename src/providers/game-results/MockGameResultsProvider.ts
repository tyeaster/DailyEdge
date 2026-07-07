import type {
  GameResultsProvider,
  GameResultsRequest,
  GameResultsProviderResponse,
} from "./GameResultsProvider.ts";

export class MockGameResultsProvider implements GameResultsProvider {
  readonly id = "game-results-mock";

  async getResults(
    request: GameResultsRequest,
  ): Promise<GameResultsProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: "mock",
      provider: this.id,
      results: [
        {
          awayScore: 3,
          awayTeamId: "mlb-team-137",
          completedAt: `${request.date}T02:30:00.000Z`,
          gameId: "game-mock-1",
          homeScore: 5,
          homeTeamId: "mlb-team-119",
          winningTeamId: "mlb-team-119",
        },
        {
          awayScore: 6,
          awayTeamId: "mlb-team-147",
          completedAt: `${request.date}T23:45:00.000Z`,
          gameId: "game-mock-2",
          homeScore: 2,
          homeTeamId: "mlb-team-111",
          winningTeamId: "mlb-team-147",
        },
      ],
    };
  }
}
