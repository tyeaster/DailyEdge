import { createBallparkUnavailable } from "./rating.ts";
import type {
  BallparkProvider,
  BallparkProviderResponse,
  BallparkRequest,
} from "./BallparkProvider.ts";

export class MockBallparkProvider implements BallparkProvider {
  readonly id = "ballpark-mock";

  async getBallpark(
    request: BallparkRequest,
  ): Promise<BallparkProviderResponse> {
    const fetchedAt = new Date().toISOString();

    return {
      ballpark:
        request.fallbackBallpark ??
        createBallparkUnavailable({
          fetchedAt,
          league: request.league,
          name: request.venueName,
          venueId: request.venueId,
        }),
      fetchedAt,
      mode: "mock",
      provider: this.id,
      venueId: request.venueId,
    };
  }
}
