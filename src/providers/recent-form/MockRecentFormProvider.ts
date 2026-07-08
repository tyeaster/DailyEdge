import type {
  RecentFormProvider,
  RecentFormProviderResponse,
  RecentFormRequest,
} from "./RecentFormProvider.ts";

export class MockRecentFormProvider implements RecentFormProvider {
  readonly id = "recent-form-mock";

  async getRecentForm(
    request: RecentFormRequest,
  ): Promise<RecentFormProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: "mock",
      provider: this.id,
      recentForm: request.fallbackRecentForm,
      season: request.season,
      teamId: request.teamId,
    };
  }
}
