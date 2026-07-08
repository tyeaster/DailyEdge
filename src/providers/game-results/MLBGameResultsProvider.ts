import type {
  GameResultsProvider,
  GameResultsRequest,
  GameResultsProviderResponse,
  NormalizedGameResult,
} from "./GameResultsProvider.ts";

const DEFAULT_MLB_API_URL = "https://statsapi.mlb.com/api/v1";
const SPORT_ID_MLB = 1;

type MlbScheduleTeamSide = {
  isWinner?: boolean;
  score?: number;
  team: { id: number };
};

type MlbScheduleGame = {
  gameDate: string;
  gamePk: number;
  linescore?: {
    teams?: {
      away?: { runs?: number };
      home?: { runs?: number };
    };
  };
  status: {
    abstractGameState?: string;
  };
  teams: {
    away: MlbScheduleTeamSide;
    home: MlbScheduleTeamSide;
  };
};

type MlbScheduleResponse = {
  dates?: {
    games?: MlbScheduleGame[];
  }[];
};

/**
 * Fetches completed games and their final scores from the MLB Stats API
 * schedule endpoint (hydrated with linescore).
 *
 * IMPORTANT: this parser follows the long-documented, stable MLB Stats API
 * schedule/linescore field shape, but it has NOT been exercised against a
 * live network call - this sandbox's outbound network policy blocks
 * statsapi.mlb.com. Run one real smoke test against a live date in an
 * environment with network access before relying on this in production.
 * Parsing is defensive (checks both the direct teams.{side}.score field and
 * the linescore.teams.{side}.runs hydration field) specifically because of
 * that unverified risk.
 */
export class MLBGameResultsProvider implements GameResultsProvider {
  readonly id = "mlb-schedule";
  private readonly endpoint: string;

  constructor(endpoint: string = process.env.MLB_API_URL ?? DEFAULT_MLB_API_URL) {
    this.endpoint = endpoint;
  }

  async getResults(
    request: GameResultsRequest,
  ): Promise<GameResultsProviderResponse> {
    const url = new URL(`${this.endpoint}/schedule`);

    url.searchParams.set("sportId", String(SPORT_ID_MLB));
    url.searchParams.set("date", request.date);
    url.searchParams.set("hydrate", "linescore");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MLB schedule request failed with ${response.status}`);
    }

    const raw = (await response.json()) as MlbScheduleResponse;

    return {
      fetchedAt: new Date().toISOString(),
      mode: "live",
      provider: this.id,
      results: normalizeMlbScheduleResults(raw),
    };
  }
}

export function normalizeMlbScheduleResults(
  raw: MlbScheduleResponse,
): NormalizedGameResult[] {
  const games = raw.dates?.flatMap((date) => date.games ?? []) ?? [];

  return games.flatMap((game) => {
    if (game.status.abstractGameState !== "Final") {
      return [];
    }

    const homeScore = game.teams.home.score ?? game.linescore?.teams?.home?.runs;
    const awayScore = game.teams.away.score ?? game.linescore?.teams?.away?.runs;

    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      return [];
    }

    const homeTeamId = `mlb-team-${game.teams.home.team.id}`;
    const awayTeamId = `mlb-team-${game.teams.away.team.id}`;
    const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;

    return [
      {
        awayScore,
        awayTeamId,
        completedAt: game.gameDate,
        gameId: `game-${game.gamePk}`,
        homeScore,
        homeTeamId,
        winningTeamId,
      },
    ];
  });
}
