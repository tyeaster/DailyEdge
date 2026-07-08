import { mlbTeamCatalog } from "../../data/mlb-teams.ts";
import type { BallparkProfile } from "../../models/mlb.ts";
import type { BallparkProvider } from "../../providers/ballparks/index.ts";
import { createBallparkUnavailable } from "../../providers/ballparks/index.ts";
import { getConfiguredBallparkProvider } from "../../services/BallparkService.ts";

export interface BallparkDirectoryEntry {
  ballpark: BallparkProfile;
  homeTeam: {
    abbreviation: string;
    city: string;
    name: string;
  };
}

export async function getBallparkDirectory({
  provider = getConfiguredBallparkProvider(),
  season = new Date().getUTCFullYear(),
}: {
  provider?: BallparkProvider;
  season?: number;
} = {}): Promise<BallparkDirectoryEntry[]> {
  const entries = await Promise.all(
    mlbTeamCatalog.map(async (team) => {
      try {
        const response = await provider.getBallpark({
          league: team.league,
          season,
          venueId: team.venueId,
          venueName: team.venueName,
        });

        return {
          ballpark: response.ballpark,
          homeTeam: { abbreviation: team.abbreviation, city: team.city, name: team.name },
        };
      } catch {
        return {
          ballpark: createBallparkUnavailable({
            league: team.league,
            name: team.venueName,
            venueId: team.venueId,
          }),
          homeTeam: { abbreviation: team.abbreviation, city: team.city, name: team.name },
        };
      }
    }),
  );

  return entries.sort((a, b) => a.ballpark.name.localeCompare(b.ballpark.name));
}
