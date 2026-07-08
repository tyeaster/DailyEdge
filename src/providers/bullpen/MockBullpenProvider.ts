import type {
  BullpenProvider,
  BullpenProviderResponse,
  BullpenRequest,
} from "./BullpenProvider.ts";

export class MockBullpenProvider implements BullpenProvider {
  readonly id = "bullpen-mock";

  async getBullpen(
    request: BullpenRequest,
  ): Promise<BullpenProviderResponse> {
    return {
      bullpen: request.fallbackBullpen,
      fetchedAt: new Date().toISOString(),
      mode: "mock",
      provider: this.id,
      season: request.season,
      teamId: request.teamId,
    };
  }
}
