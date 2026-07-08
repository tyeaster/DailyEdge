import type {
  BattingSide,
  LineupProfile,
} from "../../models/mlb.ts";

import { LINEUP_RATING_CONFIG } from "./config.ts";
import type {
  LineupProvider,
  LineupProviderResponse,
  LineupRequest,
} from "./LineupProvider.ts";
import {
  buildLineupProfile,
  createUnavailableLineup,
  type LineupPlayerInput,
} from "./rating.ts";
import { ReplayLineupProvider } from "./ReplayLineupProvider.ts";

const DEFAULT_MLB_API_URL = "https://statsapi.mlb.com/api/v1";
const CURRENT_SCHEDULE_TTL_MS = 60 * 1000;
const PROJECTED_SCHEDULE_TTL_MS = 5 * 60 * 1000;
const ROSTER_TTL_MS = 60 * 60 * 1000;

type MlbLineupPerson = {
  fullName?: string;
  id?: number;
  primaryPosition?: {
    abbreviation?: string;
  };
};

type MlbScheduleGame = {
  gamePk?: number;
  gameDate?: string;
  lineups?: {
    awayPlayers?: MlbLineupPerson[];
    homePlayers?: MlbLineupPerson[];
  };
  status?: {
    abstractGameState?: string;
  };
  teams?: {
    away?: { team?: { id?: number } };
    home?: { team?: { id?: number } };
  };
};

type MlbScheduleResponse = {
  dates?: Array<{
    games?: MlbScheduleGame[];
  }>;
};

type MlbHittingStat = {
  atBats?: number;
  avg?: string;
  homeRuns?: number;
  obp?: string;
  ops?: string;
  plateAppearances?: number;
  slg?: string;
  strikeOuts?: number;
};

type MlbRosterEntry = {
  person?: {
    batSide?: { code?: BattingSide };
    fullName?: string;
    id?: number;
    primaryPosition?: { abbreviation?: string };
    stats?: Array<{
      splits?: Array<{
        stat?: MlbHittingStat;
      }>;
    }>;
  };
  position?: {
    abbreviation?: string;
  };
};

type MlbRosterResponse = {
  roster?: MlbRosterEntry[];
};

export class MLBLineupProvider implements LineupProvider {
  readonly id = "mlb-lineups";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayLineupProvider;
  private readonly sharedResponses = new Map<
    string,
    { expiresAt: number; promise: Promise<unknown> }
  >();

  constructor(
    endpoint = process.env.MLB_API_URL ?? DEFAULT_MLB_API_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayLineupProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getLineup(
    request: LineupRequest,
  ): Promise<LineupProviderResponse> {
    const recentStartDate = addDays(
      request.asOfDate,
      -LINEUP_RATING_CONFIG.recentProjectionDays,
    );
    const recentEndDate = addDays(request.asOfDate, -1);
    const [currentScheduleRaw, recentScheduleRaw, rosterRaw] =
      await Promise.all([
        this.getSharedResponse(
          `current:${request.asOfDate}`,
          CURRENT_SCHEDULE_TTL_MS,
          () =>
            this.fetchJson(
              this.buildScheduleUrl(request.asOfDate, request.asOfDate),
            ),
        ),
        this.getSharedResponse(
          `recent:${recentStartDate}:${recentEndDate}`,
          PROJECTED_SCHEDULE_TTL_MS,
          () =>
            this.fetchJson(
              this.buildScheduleUrl(recentStartDate, recentEndDate),
            ),
        ),
        this.getSharedResponse(
          `roster:${request.teamId}:${request.season}`,
          ROSTER_TTL_MS,
          () => this.fetchJson(this.buildRosterUrl(request)),
        ),
      ]);
    const fetchedAt = new Date().toISOString();
    const lineup = normalizeMlbLineup({
      currentScheduleRaw,
      fetchedAt,
      gameId: request.gameId,
      recentScheduleRaw,
      rosterRaw,
      source: "live",
      teamId: request.teamId,
    });

    if (process.env.LINEUP_RECORD === "true") {
      await this.replayProvider.writeReplay({
        currentScheduleRaw,
        lineup,
        provider: this.id,
        recentScheduleRaw,
        request,
        rosterRaw,
      });
    }

    return {
      fetchedAt,
      gameId: request.gameId,
      lineup,
      mode: "live",
      provider: this.id,
      season: request.season,
      teamId: request.teamId,
    };
  }

  private getSharedResponse(
    key: string,
    ttlMs: number,
    load: () => Promise<unknown>,
  ) {
    const existing = this.sharedResponses.get(key);

    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise;
    }

    const promise = load().catch((error) => {
      this.sharedResponses.delete(key);
      throw error;
    });
    this.sharedResponses.set(key, {
      expiresAt: Date.now() + ttlMs,
      promise,
    });

    return promise;
  }

  private async fetchJson(url: URL) {
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`MLB lineup request failed with ${response.status}`);
    }

    return response.json();
  }

  private buildScheduleUrl(startDate: string, endDate: string) {
    const url = new URL(`${this.endpoint}/schedule`);

    url.searchParams.set("sportId", "1");
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("hydrate", "lineups");

    return url;
  }

  private buildRosterUrl(request: LineupRequest) {
    const url = new URL(`${this.endpoint}/teams/${request.teamId}/roster`);

    url.searchParams.set("rosterType", "active");
    url.searchParams.set(
      "hydrate",
      `person(stats(group=[hitting],type=[season],season=${request.season}))`,
    );

    return url;
  }
}

export function normalizeMlbLineup({
  currentScheduleRaw,
  fetchedAt,
  gameId,
  recentScheduleRaw,
  rosterRaw,
  source,
  teamId,
}: {
  currentScheduleRaw: unknown;
  fetchedAt: string;
  gameId: number;
  recentScheduleRaw: unknown;
  rosterRaw: unknown;
  source: LineupProfile["source"];
  teamId: number;
}) {
  const rosterPlayers = normalizeRoster(rosterRaw);
  const currentGame = getGames(currentScheduleRaw).find(
    (game) => game.gamePk === gameId,
  );
  const confirmedPeople = getTeamLineup(currentGame, teamId);
  const baselinePeople = getLatestTeamLineup(recentScheduleRaw, teamId);
  const lineupPeople =
    confirmedPeople.length >= 9 ? confirmedPeople : baselinePeople;
  const status =
    confirmedPeople.length >= 9
      ? "confirmed"
      : baselinePeople.length >= 9
        ? "projected"
        : "unavailable";

  if (status === "unavailable") {
    return createUnavailableLineup(fetchedAt);
  }

  const rosterById = new Map(
    rosterPlayers.map((player) => [player.mlbId, player]),
  );
  const lineupPlayers = lineupPeople.map((person, index) => {
    const rosterPlayer = rosterById.get(person.id ?? 0);

    return {
      ...(rosterPlayer ?? createFallbackPlayer(person)),
      battingOrder: index + 1,
      fullName: person.fullName ?? rosterPlayer?.fullName ?? "Unknown player",
      mlbId: person.id ?? rosterPlayer?.mlbId ?? 0,
      position:
        person.primaryPosition?.abbreviation ??
        rosterPlayer?.position ??
        "DH",
    };
  });

  return buildLineupProfile({
    baselinePlayerIds: baselinePeople
      .map((person) => person.id)
      .filter((id): id is number => Boolean(id)),
    confirmedAt: status === "confirmed" ? fetchedAt : undefined,
    fetchedAt,
    players: lineupPlayers,
    rosterPlayers,
    source,
    status,
  });
}

function normalizeRoster(raw: unknown): LineupPlayerInput[] {
  const response = raw as MlbRosterResponse | undefined;

  return (response?.roster ?? []).flatMap((entry) => {
    const person = entry.person;

    if (!person?.id || !person.fullName) {
      return [];
    }

    const stat = person.stats?.flatMap((group) => group.splits ?? [])[0]?.stat;
    const plateAppearances =
      finite(stat?.plateAppearances) || finite(stat?.atBats);

    return [
      {
        battingAverage: numberValue(stat?.avg),
        battingHand: person.batSide?.code ?? "U",
        battingOrder: 0,
        fullName: person.fullName,
        homeRuns: finite(stat?.homeRuns),
        mlbId: person.id,
        onBasePercentage: numberValue(stat?.obp),
        ops: numberValue(stat?.ops),
        plateAppearances,
        position:
          entry.position?.abbreviation ??
          person.primaryPosition?.abbreviation ??
          "DH",
        sluggingPercentage: numberValue(stat?.slg),
        strikeoutRate:
          plateAppearances > 0
            ? finite(stat?.strikeOuts) / plateAppearances
            : 0,
      },
    ];
  });
}

function createFallbackPlayer(person: MlbLineupPerson): LineupPlayerInput {
  return {
    battingAverage: 0,
    battingHand: "U",
    battingOrder: 0,
    fullName: person.fullName ?? "Unknown player",
    homeRuns: 0,
    mlbId: person.id ?? 0,
    onBasePercentage: 0,
    ops: 0,
    plateAppearances: 0,
    position: person.primaryPosition?.abbreviation ?? "DH",
    sluggingPercentage: 0,
    strikeoutRate: 0,
  };
}

function getLatestTeamLineup(raw: unknown, teamId: number) {
  const games = getGames(raw)
    .filter((game) => getTeamLineup(game, teamId).length >= 9)
    .sort((left, right) =>
      String(right.gameDate ?? "").localeCompare(String(left.gameDate ?? "")),
    );

  return getTeamLineup(games[0], teamId);
}

function getTeamLineup(game: MlbScheduleGame | undefined, teamId: number) {
  if (game?.teams?.home?.team?.id === teamId) {
    return game.lineups?.homePlayers ?? [];
  }

  if (game?.teams?.away?.team?.id === teamId) {
    return game.lineups?.awayPlayers ?? [];
  }

  return [];
}

function getGames(raw: unknown) {
  const response = raw as MlbScheduleResponse | undefined;

  return response?.dates?.flatMap((date) => date.games ?? []) ?? [];
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function numberValue(value: number | string | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;

  return Number.isFinite(parsed) ? Number(parsed) : 0;
}

function finite(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}
