import type {
  BatterGameLog,
  BatterGameLogProvider,
  BatterGameLogProviderResponse,
  BatterGameLogRequest,
} from "./BatterGameLogProvider.ts";
import { ReplayBatterGameLogProvider } from "./ReplayBatterGameLogProvider.ts";

const DEFAULT_MLB_PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people";

type MlbBatterGameLogSplit = {
  date?: string;
  game?: {
    gameDate?: string;
    isTie?: boolean;
    pk?: number;
  };
  isHome?: boolean;
  isWin?: boolean;
  opponent?: {
    abbreviation?: string;
    name?: string;
  };
  stat?: {
    atBats?: number | string;
    baseOnBalls?: number | string;
    doubles?: number | string;
    hitByPitch?: number | string;
    hits?: number | string;
    homeRuns?: number | string;
    plateAppearances?: number | string;
    rbi?: number | string;
    runs?: number | string;
    stolenBases?: number | string;
    strikeOuts?: number | string;
    totalBases?: number | string;
    triples?: number | string;
  };
};

type MlbBatterGameLogResponse = {
  people?: Array<{
    stats?: Array<{
      splits?: MlbBatterGameLogSplit[];
    }>;
  }>;
  stats?: Array<{
    splits?: MlbBatterGameLogSplit[];
  }>;
};

export class MLBBatterGameLogProvider implements BatterGameLogProvider {
  readonly id = "mlb-batter-game-log";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayBatterGameLogProvider;

  constructor(
    endpoint = process.env.MLB_PEOPLE_API_URL ?? DEFAULT_MLB_PEOPLE_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayBatterGameLogProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getBatterGameLogs(
    request: BatterGameLogRequest,
  ): Promise<BatterGameLogProviderResponse> {
    const response = await this.fetcher(this.buildUrl(request));

    if (!response.ok) {
      throw new Error(`MLB batter game log request failed with ${response.status}`);
    }

    const raw = await response.json();
    const logs = normalizeMlbBatterGameLogResponse(raw);
    const fetchedAt = new Date().toISOString();

    if (process.env.PLAYER_INTELLIGENCE_RECORD === "true") {
      await this.replayProvider.writeReplay({
        batterId: request.batterId,
        logs,
        provider: this.id,
        raw,
        season: request.season,
      });
    }

    return {
      batterId: request.batterId,
      fetchedAt,
      logs,
      mode: "live",
      provider: this.id,
      season: request.season,
    };
  }

  private buildUrl(request: BatterGameLogRequest) {
    const url = new URL(`${this.endpoint}/${request.batterId}`);

    url.searchParams.set(
      "hydrate",
      `stats(group=[hitting],type=[gameLog],season=${request.season})`,
    );

    return url;
  }
}

export function normalizeMlbBatterGameLogResponse(
  raw: unknown,
): BatterGameLog[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const response = raw as MlbBatterGameLogResponse;
  const splits =
    response.people?.[0]?.stats?.flatMap((group) => group.splits ?? []) ??
    response.stats?.flatMap((group) => group.splits ?? []) ??
    [];

  return splits
    .map(normalizeSplit)
    .filter((log): log is BatterGameLog => log !== undefined)
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
}

function normalizeSplit(
  split: MlbBatterGameLogSplit,
): BatterGameLog | undefined {
  const stat = split.stat;

  if (!stat) {
    return undefined;
  }

  const hits = number(stat.hits);
  const doubles = number(stat.doubles);
  const triples = number(stat.triples);
  const homeRuns = number(stat.homeRuns);

  return {
    atBats: number(stat.atBats),
    averageExitVelocityMph: null,
    averageLaunchAngleDegrees: null,
    barrels: null,
    date: split.game?.gameDate ?? split.date ?? new Date().toISOString(),
    doubles,
    hardHits: null,
    hbp: number(stat.hitByPitch),
    hits,
    homeAway:
      split.isHome === true ? "home" : split.isHome === false ? "away" : "unknown",
    homeRuns,
    opponent: split.opponent?.abbreviation ?? split.opponent?.name ?? "UNK",
    opposingPitcherHand: "U",
    plateAppearances: number(stat.plateAppearances),
    rbi: number(stat.rbi),
    runs: number(stat.runs),
    singles: Math.max(0, hits - doubles - triples - homeRuns),
    stolenBases: number(stat.stolenBases),
    strikeouts: number(stat.strikeOuts),
    totalBases: number(stat.totalBases),
    triples,
    walks: number(stat.baseOnBalls),
  };
}

function nullableNumber(value: number | string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function number(value: number | string | undefined) {
  return nullableNumber(value) ?? 0;
}
