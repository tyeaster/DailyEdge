import type { BullpenRating } from "../../models/mlb.ts";

import { BULLPEN_RATING_CONFIG } from "./config.ts";
import type {
  BullpenProvider,
  BullpenProviderResponse,
  BullpenRequest,
} from "./BullpenProvider.ts";
import {
  calculateBullpenRating,
  type BullpenAggregate,
} from "./rating.ts";
import { ReplayBullpenProvider } from "./ReplayBullpenProvider.ts";

const DEFAULT_MLB_STATS_URL = "https://statsapi.mlb.com/api/v1/stats";
const SHARED_RESPONSE_TTL_MS = 30 * 60 * 1000;

type MlbPitchingStat = {
  baseOnBalls?: number;
  battersFaced?: number;
  earnedRuns?: number;
  gamesPlayed?: number;
  gamesStarted?: number;
  hits?: number;
  numberOfPitches?: number;
  outs?: number;
  outsPitched?: number;
  strikeOuts?: number;
};

type MlbStatsResponse = {
  stats?: Array<{
    splits?: Array<{
      player?: { id?: number };
      stat?: MlbPitchingStat;
      team?: { id?: number };
    }>;
  }>;
};

export class MLBBullpenProvider implements BullpenProvider {
  readonly id = "mlb-bullpen";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayBullpenProvider;
  private readonly responsePromises = new Map<
    string,
    { expiresAt: number; promise: Promise<unknown> }
  >();

  constructor(
    endpoint = process.env.MLB_STATS_API_URL ?? DEFAULT_MLB_STATS_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayBullpenProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getBullpen(
    request: BullpenRequest,
  ): Promise<BullpenProviderResponse> {
    const recentStartDate = addDays(
      request.asOfDate,
      -BULLPEN_RATING_CONFIG.recentDays,
    );
    const recentEndDate = addDays(request.asOfDate, -1);
    const [seasonRaw, recentRaw] = await Promise.all([
      this.getSharedResponse(`season:${request.season}`, () =>
        this.fetchStats(this.buildSeasonUrl(request.season)),
      ),
      this.getSharedResponse(
        `recent:${recentStartDate}:${recentEndDate}`,
        () =>
          this.fetchStats(
            this.buildRecentUrl(
              request.season,
              recentStartDate,
              recentEndDate,
            ),
          ),
      ),
    ]);
    const fetchedAt = new Date().toISOString();
    const bullpen = normalizeMlbBullpen({
      fetchedAt,
      recentRaw,
      seasonRaw,
      source: "live",
      teamId: request.teamId,
    });

    if (process.env.BULLPEN_RECORD === "true") {
      await this.replayProvider.writeReplay({
        bullpen,
        provider: this.id,
        recentRaw,
        request,
        seasonRaw,
      });
    }

    return {
      bullpen,
      fetchedAt,
      mode: "live",
      provider: this.id,
      season: request.season,
      teamId: request.teamId,
    };
  }

  private getSharedResponse(key: string, load: () => Promise<unknown>) {
    const existing = this.responsePromises.get(key);

    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise;
    }

    const promise = load().catch((error) => {
      this.responsePromises.delete(key);
      throw error;
    });
    this.responsePromises.set(key, {
      expiresAt: Date.now() + SHARED_RESPONSE_TTL_MS,
      promise,
    });

    return promise;
  }

  private async fetchStats(url: URL) {
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`MLB bullpen request failed with ${response.status}`);
    }

    return response.json();
  }

  private buildSeasonUrl(season: number) {
    const url = this.buildBaseUrl(season);

    url.searchParams.set("stats", "season");

    return url;
  }

  private buildRecentUrl(
    season: number,
    startDate: string,
    endDate: string,
  ) {
    const url = this.buildBaseUrl(season);

    url.searchParams.set("stats", "byDateRange");
    url.searchParams.set("startDate", formatMlbDate(startDate));
    url.searchParams.set("endDate", formatMlbDate(endDate));

    return url;
  }

  private buildBaseUrl(season: number) {
    const url = new URL(this.endpoint);

    url.searchParams.set("group", "pitching");
    url.searchParams.set("sportIds", "1");
    url.searchParams.set("season", String(season));
    url.searchParams.set("gameType", "R");
    url.searchParams.set("position", "RP");
    url.searchParams.set("playerPool", "ALL");
    url.searchParams.set("limit", "1000");

    return url;
  }
}

export function normalizeMlbBullpen({
  fetchedAt,
  recentRaw,
  seasonRaw,
  source,
  teamId,
}: {
  fetchedAt: string;
  recentRaw: unknown;
  seasonRaw: unknown;
  source: BullpenRating["source"];
  teamId: number;
}) {
  return calculateBullpenRating({
    fetchedAt,
    recent: aggregateTeamBullpen(recentRaw, teamId, true),
    season: aggregateTeamBullpen(seasonRaw, teamId),
    source,
  });
}

export function aggregateTeamBullpen(
  raw: unknown,
  teamId: number,
  excludeStartedSplits = false,
): BullpenAggregate {
  const response = raw as MlbStatsResponse | undefined;
  const splits =
    response?.stats
      ?.flatMap((group) => group.splits ?? [])
      .filter(
        (split) =>
          split.team?.id === teamId &&
          (!excludeStartedSplits || finite(split.stat?.gamesStarted) === 0),
      ) ?? [];
  const playerIds = new Set<number>();
  const aggregate = splits.reduce<BullpenAggregate>(
    (result, split) => {
      const stat = split.stat;

      result.appearances += finite(stat?.gamesPlayed);
      result.battersFaced += finite(stat?.battersFaced);
      result.earnedRuns += finite(stat?.earnedRuns);
      result.hits += finite(stat?.hits);
      result.outs += finite(stat?.outs ?? stat?.outsPitched);
      result.pitches += finite(stat?.numberOfPitches);
      result.strikeouts += finite(stat?.strikeOuts);
      result.walks += finite(stat?.baseOnBalls);

      if (split.player?.id) {
        playerIds.add(split.player.id);
      }

      return result;
    },
    {
      appearances: 0,
      battersFaced: 0,
      earnedRuns: 0,
      hits: 0,
      outs: 0,
      pitches: 0,
      relieversUsed: 0,
      strikeouts: 0,
      walks: 0,
    },
  );

  return {
    ...aggregate,
    relieversUsed: playerIds.size,
  };
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatMlbDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-");

  return `${month}/${day}/${year}`;
}

function finite(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}
