import type {
  TeamStrengthProvider,
  TeamStrengthProviderResponse,
  TeamStrengthRequest,
} from "./TeamStrengthProvider.ts";

export class MockTeamStrengthProvider implements TeamStrengthProvider {
  readonly id = "team-strength-mock";

  async getTeamStrength(
    request: TeamStrengthRequest,
  ): Promise<TeamStrengthProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: "mock",
      provider: this.id,
      season: request.season,
      strength: request.fallbackStrength,
      teamId: request.teamId,
    };
  }
}
