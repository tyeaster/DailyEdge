import type {
  PitcherStats,
  PitcherStatsProvider,
  PitcherStatsProviderResponse,
  PitcherStatsRequest,
} from "./PitcherStatsProvider.ts";
import { ReplayPitcherStatsProvider } from "./ReplayPitcherStatsProvider.ts";

const DEFAULT_MLB_PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people";

type MlbPitcherStat = {
  baseOnBalls?: number;
  battersFaced?: number;
  era?: string;
  gamesStarted?: number;
  homeRunsPer9?: string;
  inningsPitched?: string;
  losses?: number;
  strikeOuts?: number;
  strikeoutsPer9Inn?: string;
  walksPer9Inn?: string;
  whip?: string;
  wins?: number;
};

type MlbPitcherStatsResponse = {
  stats?: Array<{
    splits?: Array<{
      stat?: MlbPitcherStat;
    }>;
  }>;
};

export class MLBPitcherStatsProvider implements PitcherStatsProvider {
  readonly id = "mlb-stats";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayPitcherStatsProvider;

  constructor(
    endpoint = process.env.MLB_PEOPLE_API_URL ?? DEFAULT_MLB_PEOPLE_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayPitcherStatsProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getPitcherStats(
    request: PitcherStatsRequest,
  ): Promise<PitcherStatsProviderResponse> {
    const response = await this.fetcher(this.buildUrl(request));

    if (!response.ok) {
      throw new Error(`MLB pitcher stats request failed with ${response.status}`);
    }

    const raw = await response.json();
    const stats = normalizeMlbPitcherStatsResponse(raw);

    if (process.env.PITCHER_RECORD === "true") {
      await this.replayProvider.writeReplay({
        pitcherId: request.pitcherId,
        provider: this.id,
        raw,
        season: request.season,
        stats,
      });
    }

    return {
      fetchedAt: new Date().toISOString(),
      mode: "live",
      pitcherId: request.pitcherId,
      provider: this.id,
      season: request.season,
      stats,
    };
  }

  private buildUrl(request: PitcherStatsRequest) {
    const url = new URL(`${this.endpoint}/${request.pitcherId}/stats`);

    url.searchParams.set("stats", "season");
    url.searchParams.set("group", "pitching");
    url.searchParams.set("season", String(request.season));

    return url;
  }
}

export function normalizeMlbPitcherStatsResponse(
  raw: unknown,
): PitcherStats | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const response = raw as MlbPitcherStatsResponse;
  const stat = response.stats?.flatMap((group) => group.splits ?? [])[0]?.stat;

  if (!stat) {
    return undefined;
  }

  const strikeouts = toFiniteNumber(stat.strikeOuts);
  const battersFaced = toFiniteNumber(stat.battersFaced);

  return {
    era: toFiniteNumber(stat.era),
    gamesStarted: toFiniteNumber(stat.gamesStarted),
    homeRunsPer9: toFiniteNumber(stat.homeRunsPer9),
    inningsPitched: toFiniteNumber(stat.inningsPitched),
    losses: toFiniteNumber(stat.losses),
    strikeoutRate:
      battersFaced > 0 ? (strikeouts / battersFaced) * 100 : 0,
    strikeouts,
    strikeoutsPer9: toFiniteNumber(stat.strikeoutsPer9Inn),
    walksPer9: toFiniteNumber(stat.walksPer9Inn),
    whip: toFiniteNumber(stat.whip),
    wins: toFiniteNumber(stat.wins),
  };
}

function toFiniteNumber(value: number | string | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}
