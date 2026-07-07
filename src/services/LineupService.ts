import { CACHE_TTL_SECONDS, type CacheProvider } from "../cache/CacheProvider.ts";
import { memoryCache } from "../cache/MemoryCache.ts";
import type { Game, LineupProfile, Team } from "../models/mlb.ts";
import {
  createUnavailableLineup,
  MLBLineupProvider,
  MockLineupProvider,
  ReplayLineupProvider,
  type LineupProvider,
  type LineupProviderMode,
} from "../providers/lineups/index.ts";

type CachedLineup = {
  fetchedAt: string;
  lineup: LineupProfile;
  mode: LineupProviderMode;
};

export class LineupService {
  private readonly cache: CacheProvider;
  private readonly provider: LineupProvider;

  constructor(
    provider: LineupProvider = getConfiguredLineupProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async enrichTeamsForGames(
    teams: Team[],
    games: Game[],
    season: number,
    asOfDate: string,
  ) {
    const gameByTeamId = new Map<string, Game>();

    for (const game of games) {
      gameByTeamId.set(game.awayTeamId, game);
      gameByTeamId.set(game.homeTeamId, game);
    }

    return Promise.all(
      teams.map((team) => {
        const game = gameByTeamId.get(team.id);

        return game
          ? this.enrichTeam(team, game, season, asOfDate)
          : Promise.resolve(team);
      }),
    );
  }

  async enrichTeam(
    team: Team,
    game: Game,
    season: number,
    asOfDate: string,
  ): Promise<Team> {
    const teamId = team.externalIds?.mlb;
    const gameId = game.externalIds?.mlb;

    if (!teamId || !gameId) {
      return team;
    }

    const cacheKey = `lineup:${this.provider.id}:${gameId}:${teamId}`;
    const cached = await this.cache.get<CachedLineup>(cacheKey);

    if (cached) {
      return {
        ...team,
        lineup: {
          ...cached.lineup,
          fetchedAt: cached.fetchedAt,
          source: cached.mode,
        },
      };
    }

    try {
      const response = await this.provider.getLineup({
        asOfDate,
        fallbackLineup: team.lineup,
        gameId,
        season,
        teamId,
      });
      const lineup =
        response.lineup ?? createUnavailableLineup(response.fetchedAt);
      const ttlSeconds =
        lineup.status === "confirmed"
          ? CACHE_TTL_SECONDS.lineupConfirmed
          : CACHE_TTL_SECONDS.lineupProjected;

      await this.cache.set(
        cacheKey,
        {
          fetchedAt: response.fetchedAt,
          lineup,
          mode: response.mode,
        } satisfies CachedLineup,
        ttlSeconds,
      );

      return {
        ...team,
        lineup: {
          ...lineup,
          fetchedAt: response.fetchedAt,
          source: response.mode,
        },
      };
    } catch {
      return {
        ...team,
        lineup: createUnavailableLineup(),
      };
    }
  }
}

export const lineupService = new LineupService();

export function getConfiguredLineupProvider(
  mode: LineupProviderMode = getLineupMode(),
) {
  if (mode === "replay") {
    return new ReplayLineupProvider();
  }

  if (mode === "mock") {
    return new MockLineupProvider();
  }

  return new MLBLineupProvider();
}

export function getLineupMode(): LineupProviderMode {
  const explicitMode = process.env.LINEUP_MODE;

  if (
    explicitMode === "live" ||
    explicitMode === "replay" ||
    explicitMode === "mock"
  ) {
    return explicitMode;
  }

  const bullpenMode = process.env.BULLPEN_MODE;

  if (bullpenMode === "replay" || bullpenMode === "mock") {
    return bullpenMode;
  }

  const teamStrengthMode = process.env.TEAM_STRENGTH_MODE;

  if (teamStrengthMode === "replay" || teamStrengthMode === "mock") {
    return teamStrengthMode;
  }

  return "live";
}
