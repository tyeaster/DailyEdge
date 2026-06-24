import type {
  PitcherStatsProvider,
  PitcherStatsProviderResponse,
  PitcherStatsRequest,
} from "./PitcherStatsProvider.ts";

export class MockPitcherStatsProvider implements PitcherStatsProvider {
  readonly id = "pitcher-mock";

  async getPitcherStats(
    request: PitcherStatsRequest,
  ): Promise<PitcherStatsProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: "mock",
      pitcherId: request.pitcherId,
      provider: this.id,
      season: request.season,
      stats: request.fallbackStats,
    };
  }
}
