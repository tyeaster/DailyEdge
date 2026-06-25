import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { BullpenRating, Team } from "../models/mlb.ts";
import {
  createUnavailableBullpen,
  MLBBullpenProvider,
  MockBullpenProvider,
  ReplayBullpenProvider,
  type BullpenProvider,
  type BullpenProviderMode,
} from "../providers/bullpen/index.ts";
import { calculateOverallTeamRating } from "../providers/team-strength/index.ts";

type CachedBullpen = {
  bullpen: BullpenRating;
  fetchedAt: string;
  mode: BullpenProviderMode;
};

export class BullpenService {
  private readonly cache: CacheProvider;
  private readonly provider: BullpenProvider;

  constructor(
    provider: BullpenProvider = getConfiguredBullpenProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichTeams(teams: Team[], season: number, asOfDate: string) {
    return Promise.all(
      teams.map((team) => this.enrichTeam(team, season, asOfDate)),
    );
  }

  async enrichTeam(
    team: Team,
    season: number,
    asOfDate: string,
  ): Promise<Team> {
    const teamId = team.externalIds?.mlb;

    if (!teamId || !team.strength) {
      return team;
    }

    const cacheKey = `bullpen:${this.provider.id}:${teamId}:${asOfDate}`;
    const cached = await this.cache.get<CachedBullpen>(cacheKey);

    if (cached) {
      return applyBullpen(team, {
        ...cached.bullpen,
        fetchedAt: cached.fetchedAt,
        source: cached.mode,
      });
    }

    try {
      const response = await this.provider.getBullpen({
        asOfDate,
        fallbackBullpen: team.strength.bullpen,
        season,
        teamId,
      });
      const bullpen =
        response.bullpen ?? createUnavailableBullpen(response.fetchedAt);

      await this.cache.set(
        cacheKey,
        {
          bullpen,
          fetchedAt: response.fetchedAt,
          mode: response.mode,
        } satisfies CachedBullpen,
        CACHE_TTL_SECONDS.bullpen,
      );

      return applyBullpen(team, {
        ...bullpen,
        fetchedAt: response.fetchedAt,
        source: response.mode,
      });
    } catch {
      return applyBullpen(team, createUnavailableBullpen());
    }
  }
}

export const bullpenService = new BullpenService();

export function getConfiguredBullpenProvider(
  mode: BullpenProviderMode = getBullpenMode(),
) {
  if (mode === "replay") {
    return new ReplayBullpenProvider();
  }

  if (mode === "mock") {
    return new MockBullpenProvider();
  }

  return new MLBBullpenProvider();
}

function getBullpenMode(): BullpenProviderMode {
  const explicitMode = process.env.BULLPEN_MODE;

  if (
    explicitMode === "live" ||
    explicitMode === "replay" ||
    explicitMode === "mock"
  ) {
    return explicitMode;
  }

  const teamStrengthMode = process.env.TEAM_STRENGTH_MODE;

  if (teamStrengthMode === "replay" || teamStrengthMode === "mock") {
    return teamStrengthMode;
  }

  return "live";
}

function applyBullpen(team: Team, bullpen: BullpenRating): Team {
  const strength = team.strength;

  if (!strength) {
    return team;
  }

  return {
    ...team,
    strength: {
      ...strength,
      bullpen,
      overall: calculateOverallTeamRating({
        bullpen,
        offense: strength.offense,
        pitching: strength.pitching,
        runDifferential: strength.overall.runDifferential,
      }),
    },
  };
}
