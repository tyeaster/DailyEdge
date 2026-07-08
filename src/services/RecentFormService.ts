import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Team, TeamRecentForm } from "../models/mlb.ts";
import {
  createUnavailableRecentForm,
  MLBRecentFormProvider,
  MockRecentFormProvider,
  ReplayRecentFormProvider,
  type RecentFormProvider,
  type RecentFormProviderMode,
} from "../providers/recent-form/index.ts";

type CachedRecentForm = {
  fetchedAt: string;
  mode: RecentFormProviderMode;
  recentForm: TeamRecentForm;
};

export class RecentFormService {
  private readonly cache: CacheProvider;
  private readonly provider: RecentFormProvider;

  constructor(
    provider: RecentFormProvider = getConfiguredRecentFormProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichTeams(teams: Team[], asOfDate: string) {
    const season = new Date(`${asOfDate}T12:00:00Z`).getUTCFullYear();

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

    if (!teamId) {
      return team;
    }

    const cacheKey = `recent-form:${this.provider.id}:${teamId}:${asOfDate}`;
    const cached = await this.cache.get<CachedRecentForm>(cacheKey);

    if (cached) {
      return {
        ...team,
        recentForm: {
          ...cached.recentForm,
          fetchedAt: cached.fetchedAt,
          source: cached.mode,
        },
      };
    }

    try {
      const response = await this.provider.getRecentForm({
        asOfDate,
        fallbackRecentForm: team.recentForm,
        season,
        teamId,
      });
      const recentForm =
        response.recentForm ?? createUnavailableRecentForm(response.fetchedAt);

      await this.cache.set(
        cacheKey,
        {
          fetchedAt: response.fetchedAt,
          mode: response.mode,
          recentForm,
        } satisfies CachedRecentForm,
        CACHE_TTL_SECONDS.recentForm,
      );

      return {
        ...team,
        recentForm: {
          ...recentForm,
          fetchedAt: response.fetchedAt,
          source: response.mode,
        },
      };
    } catch {
      return {
        ...team,
        recentForm: createUnavailableRecentForm(),
      };
    }
  }
}

export const recentFormService = new RecentFormService();

export function getConfiguredRecentFormProvider(
  mode: RecentFormProviderMode = getRecentFormMode(),
) {
  if (mode === "replay") {
    return new ReplayRecentFormProvider();
  }

  if (mode === "mock") {
    return new MockRecentFormProvider();
  }

  return new MLBRecentFormProvider();
}

export function getRecentFormMode(): RecentFormProviderMode {
  const explicitMode = process.env.RECENT_FORM_MODE;

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

  const pitcherMode = process.env.PITCHER_MODE;

  if (pitcherMode === "replay" || pitcherMode === "mock") {
    return pitcherMode;
  }

  return "live";
}
