import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Team, TeamStrength } from "../models/mlb.ts";
import {
  MLBTeamStrengthProvider,
  MockTeamStrengthProvider,
  ReplayTeamStrengthProvider,
  type TeamStrengthProvider,
  type TeamStrengthProviderMode,
} from "../providers/team-strength/index.ts";

type CachedTeamStrength = {
  fetchedAt: string;
  mode: TeamStrengthProviderMode;
  strength: TeamStrength;
};

export class TeamStrengthService {
  private readonly cache: CacheProvider;
  private readonly provider: TeamStrengthProvider;

  constructor(
    provider: TeamStrengthProvider = getConfiguredTeamStrengthProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichTeams(teams: Team[], season: number) {
    return Promise.all(teams.map((team) => this.enrichTeam(team, season)));
  }

  async enrichTeam(team: Team, season: number): Promise<Team> {
    const teamId = team.externalIds?.mlb;

    if (!teamId) {
      return team;
    }

    const cacheKey = `team-strength:${this.provider.id}:${teamId}:${season}`;
    const cached = await this.cache.get<CachedTeamStrength>(cacheKey);

    if (cached) {
      return {
        ...team,
        strength: {
          ...cached.strength,
          fetchedAt: cached.fetchedAt,
          source: cached.mode,
        },
      };
    }

    try {
      const response = await this.provider.getTeamStrength({
        fallbackStrength: team.strength,
        season,
        teamId,
      });

      if (!response.strength) {
        return {
          ...team,
          strength: createUnavailableTeamStrength(response.fetchedAt),
        };
      }

      await this.cache.set(
        cacheKey,
        {
          fetchedAt: response.fetchedAt,
          mode: response.mode,
          strength: response.strength,
        } satisfies CachedTeamStrength,
        CACHE_TTL_SECONDS.teamStrength,
      );

      return {
        ...team,
        strength: {
          ...response.strength,
          fetchedAt: response.fetchedAt,
          source: response.mode,
        },
      };
    } catch {
      return {
        ...team,
        strength: createUnavailableTeamStrength(new Date().toISOString()),
      };
    }
  }
}

export const teamStrengthService = new TeamStrengthService();

export function getConfiguredTeamStrengthProvider(
  mode: TeamStrengthProviderMode = getTeamStrengthMode(),
) {
  if (mode === "replay") {
    return new ReplayTeamStrengthProvider();
  }

  if (mode === "mock") {
    return new MockTeamStrengthProvider();
  }

  return new MLBTeamStrengthProvider();
}

function getTeamStrengthMode(): TeamStrengthProviderMode {
  const explicitMode = process.env.TEAM_STRENGTH_MODE;

  if (
    explicitMode === "live" ||
    explicitMode === "replay" ||
    explicitMode === "mock"
  ) {
    return explicitMode;
  }

  const pitcherMode = process.env.PITCHER_MODE;

  if (pitcherMode === "replay" || pitcherMode === "mock") {
    return pitcherMode;
  }

  const oddsMode = process.env.ODDS_MODE;

  if (oddsMode === "replay" || oddsMode === "mock") {
    return oddsMode;
  }

  return "live";
}

function createUnavailableTeamStrength(fetchedAt: string): TeamStrength {
  return {
    bullpen: { available: false, value: 50 },
    fetchedAt,
    offense: {
      available: false,
      battingAverage: 0,
      ops: 0,
      runsPerGame: 0,
      strikeoutRate: 0,
      value: 50,
      walkRate: 0,
    },
    overall: {
      available: false,
      runDifferential: 0,
      value: 50,
    },
    pitching: {
      available: false,
      era: 0,
      runsAllowedPerGame: 0,
      value: 50,
      whip: 0,
    },
    source: "unavailable",
  };
}
