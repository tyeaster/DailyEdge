import type {
  LineupProvider,
  LineupProviderResponse,
  LineupRequest,
} from "./LineupProvider.ts";

export class MockLineupProvider implements LineupProvider {
  readonly id = "lineup-mock";

  async getLineup(
    request: LineupRequest,
  ): Promise<LineupProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      gameId: request.gameId,
      lineup: request.fallbackLineup,
      mode: "mock",
      provider: this.id,
      season: request.season,
      teamId: request.teamId,
    };
  }
}
