import type {
  RecentFormWindow,
  RecentFormWindowStats,
  TeamRecentForm,
} from "../../models/mlb.ts";

import { RECENT_FORM_CONFIG } from "./config.ts";
import type {
  RecentFormProvider,
  RecentFormProviderResponse,
  RecentFormRequest,
} from "./RecentFormProvider.ts";
import { ReplayRecentFormProvider } from "./ReplayRecentFormProvider.ts";
import {
  buildTeamRecentForm,
  calculateRecentFormWindow,
} from "./rating.ts";

const DEFAULT_MLB_API_URL = "https://statsapi.mlb.com/api/v1";
const SHARED_WINDOW_TTL_MS = 30 * 60 * 1000;

type MlbHittingStat = {
  avg?: string;
  gamesPlayed?: number;
  ops?: string;
  runs?: number;
};

type MlbPitchingStat = {
  era?: string;
  gamesPlayed?: number;
  losses?: number;
  runs?: number;
  whip?: string;
  wins?: number;
};

type MlbStatsResponse = {
  stats?: Array<{
    group?: { displayName?: string };
    splits?: Array<{
      stat?: MlbHittingStat | MlbPitchingStat;
      team?: { id?: number };
    }>;
  }>;
};

export class MLBRecentFormProvider implements RecentFormProvider {
  readonly id = "mlb-recent-form";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayRecentFormProvider;
  private readonly windowPromises = new Map<
    string,
    { expiresAt: number; promise: Promise<unknown> }
  >();

  constructor(
    endpoint = process.env.MLB_API_URL ?? DEFAULT_MLB_API_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayRecentFormProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getRecentForm(
    request: RecentFormRequest,
  ): Promise<RecentFormProviderResponse> {
    const windowResponses = await Promise.all(
      RECENT_FORM_CONFIG.windows.map(async (window) => {
        return [
          window,
          await this.getWindowResponse(window, request.season),
        ] as const;
      }),
    );
    const rawByWindow = Object.fromEntries(windowResponses) as Partial<
      Record<RecentFormWindow, unknown>
    >;
    const fetchedAt = new Date().toISOString();
    const recentForm = normalizeMlbRecentForm({
      fetchedAt,
      rawByWindow,
      source: "live",
      teamId: request.teamId,
    });

    if (process.env.RECENT_FORM_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        rawByWindow: rawByWindow as Record<string, unknown>,
        recentForm,
        request,
      });
    }

    return {
      fetchedAt,
      mode: "live",
      provider: this.id,
      recentForm,
      season: request.season,
      teamId: request.teamId,
    };
  }

  private getWindowResponse(window: RecentFormWindow, season: number) {
    const key = `${season}:${window}`;
    const existing = this.windowPromises.get(key);

    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise;
    }

    const promise = this.fetchWindow(window, season).catch((error) => {
      this.windowPromises.delete(key);
      throw error;
    });
    this.windowPromises.set(key, {
      expiresAt: Date.now() + SHARED_WINDOW_TTL_MS,
      promise,
    });

    return promise;
  }

  private async fetchWindow(window: RecentFormWindow, season: number) {
    const offsets = Array.from(
      { length: Math.ceil(30 / window) },
      (_, index) => index * window,
    );
    const responses = await Promise.all(
      offsets.map(async (offset) => {
        const response = await this.fetcher(
          this.buildStatsUrl(window, season, offset),
        );

        if (!response.ok) {
          throw new Error(
            `MLB recent-form request failed with ${response.status}`,
          );
        }

        return (await response.json()) as MlbStatsResponse;
      }),
    );

    return mergeStatsResponses(responses);
  }

  private buildStatsUrl(
    window: RecentFormWindow,
    season: number,
    offset: number,
  ) {
    const url = new URL(`${this.endpoint}/teams/stats`);

    url.searchParams.set("stats", "lastXGames");
    url.searchParams.set("group", "hitting,pitching");
    url.searchParams.set("sportIds", "1");
    url.searchParams.set("season", String(season));
    url.searchParams.set("gameType", "R");
    url.searchParams.set("limit", String(window));
    url.searchParams.set("offset", String(offset));

    return url;
  }
}

function mergeStatsResponses(responses: MlbStatsResponse[]): MlbStatsResponse {
  const groups = ["hitting", "pitching"] as const;

  return {
    stats: groups.map((group) => ({
      group: { displayName: group },
      splits: responses.flatMap(
        (response) =>
          response.stats?.find(
            (entry) => entry.group?.displayName === group,
          )?.splits ?? [],
      ),
    })),
  };
}

export function normalizeMlbRecentForm({
  fetchedAt,
  rawByWindow,
  source,
  teamId,
}: {
  fetchedAt: string;
  rawByWindow: Partial<Record<RecentFormWindow, unknown>>;
  source: TeamRecentForm["source"];
  teamId?: number;
}): TeamRecentForm {
  const windows = Object.fromEntries(
    RECENT_FORM_CONFIG.windows.map((window) => [
      window,
      normalizeMlbRecentFormWindow(rawByWindow[window], window, teamId),
    ]),
  ) as Record<RecentFormWindow, RecentFormWindowStats>;

  return buildTeamRecentForm({ fetchedAt, source, windows });
}

export function normalizeMlbRecentFormWindow(
  raw: unknown,
  window: RecentFormWindow,
  teamId?: number,
) {
  const response = raw as MlbStatsResponse | undefined;
  const hitting = getGroupStat<MlbHittingStat>(response, "hitting", teamId);
  const pitching = getGroupStat<MlbPitchingStat>(
    response,
    "pitching",
    teamId,
  );

  return calculateRecentFormWindow({
    battingAverage: toNumber(hitting?.avg),
    era: toNumber(pitching?.era),
    gamesPlayed:
      toNumber(hitting?.gamesPlayed) || toNumber(pitching?.gamesPlayed),
    losses: toNumber(pitching?.losses),
    ops: toNumber(hitting?.ops),
    runsAllowed: toNumber(pitching?.runs),
    runsScored: toNumber(hitting?.runs),
    whip: toNumber(pitching?.whip),
    wins: toNumber(pitching?.wins),
    window,
  });
}

function getGroupStat<TStat>(
  response: MlbStatsResponse | undefined,
  group: "hitting" | "pitching",
  teamId?: number,
) {
  const splits = response?.stats?.find(
    (entry) => entry.group?.displayName === group,
  )?.splits;
  const split = teamId
    ? splits?.find((item) => item.team?.id === teamId)
    : splits?.[0];

  return split?.stat as TStat | undefined;
}

function toNumber(value: number | string | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;

  return Number.isFinite(parsed) ? Number(parsed) : 0;
}
