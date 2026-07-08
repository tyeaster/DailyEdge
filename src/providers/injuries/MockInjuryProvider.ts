import type {
  InjuryProvider,
  InjuryRequest,
  InjuryProviderResponse,
} from "./InjuryProvider.ts";

export class MockInjuryProvider implements InjuryProvider {
  readonly id = "injuries-mock";

  async getInjuries(request: InjuryRequest): Promise<InjuryProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      injuries: [
        {
          description: "Diamondbacks placed OF Corbin Carroll on the 10-day injured list.",
          effectiveDate: `${request.date}T00:00:00Z`,
          expectedReturn: "10-day IL",
          id: "injury-mock-1",
          impactRating: 50,
          playerId: "mlb-player-665742",
          playerName: "Corbin Carroll",
          status: "10-day IL",
          teamId: "mlb-team-109",
        },
        {
          description: "Rangers placed RHP Jacob deGrom on the 15-day injured list.",
          effectiveDate: `${request.date}T00:00:00Z`,
          expectedReturn: "15-day IL",
          id: "injury-mock-2",
          impactRating: 50,
          playerId: "mlb-player-594798",
          playerName: "Jacob deGrom",
          status: "15-day IL",
          teamId: "mlb-team-140",
        },
      ],
      mode: "mock",
      provider: this.id,
    };
  }
}
