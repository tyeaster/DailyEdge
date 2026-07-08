import type { BallparkProfile, MlbLeague } from "../../models/mlb.ts";

export type BallparkProviderMode = "live" | "mock" | "replay";

export interface BallparkRequest {
  fallbackBallpark?: BallparkProfile;
  league: MlbLeague;
  season: number;
  venueId: number;
  venueName: string;
}

export interface BallparkProviderResponse {
  ballpark: BallparkProfile;
  fetchedAt: string;
  mode: BallparkProviderMode;
  provider: string;
  venueId: number;
}

export interface BallparkProvider {
  readonly id: string;
  getBallpark(request: BallparkRequest): Promise<BallparkProviderResponse>;
}
