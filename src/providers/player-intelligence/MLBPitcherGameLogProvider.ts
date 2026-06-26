import type {
  PitcherGameLog,
  PitcherGameLogProvider,
  PitcherGameLogProviderResponse,
  PitcherGameLogRequest,
} from "./PitcherGameLogProvider.ts";
import { ReplayPitcherGameLogProvider } from "./ReplayPitcherGameLogProvider.ts";

const DEFAULT_MLB_PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people";

type MlbGameLogSplit = {
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
    airOuts?: number | string;
    baseOnBalls?: number | string;
    battersFaced?: number | string;
    decision?: string;
    earnedRuns?: number | string;
    gameScore?: number | string;
    groundOuts?: number | string;
    hits?: number | string;
    inningsPitched?: number | string;
    losses?: number | string;
    note?: string;
    numberOfPitches?: number | string;
    pitchesThrown?: number | string;
    strikeOuts?: number | string;
    wins?: number | string;
  };
};

type MlbGameLogResponse = {
  people?: Array<{
    stats?: Array<{
      splits?: MlbGameLogSplit[];
    }>;
  }>;
  stats?: Array<{
    splits?: MlbGameLogSplit[];
  }>;
};

export class MLBPitcherGameLogProvider implements PitcherGameLogProvider {
  readonly id = "mlb-pitcher-game-log";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayPitcherGameLogProvider;

  constructor(
    endpoint = process.env.MLB_PEOPLE_API_URL ?? DEFAULT_MLB_PEOPLE_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayPitcherGameLogProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getPitcherGameLogs(
    request: PitcherGameLogRequest,
  ): Promise<PitcherGameLogProviderResponse> {
    const response = await this.fetcher(this.buildUrl(request));

    if (!response.ok) {
      throw new Error(`MLB pitcher game log request failed with ${response.status}`);
    }

    const raw = await response.json();
    const logs = normalizeMlbPitcherGameLogResponse(raw);
    const fetchedAt = new Date().toISOString();

    if (process.env.PLAYER_INTELLIGENCE_RECORD === "true") {
      await this.replayProvider.writeReplay({
        logs,
        pitcherId: request.pitcherId,
        provider: this.id,
        raw,
        season: request.season,
      });
    }

    return {
      fetchedAt,
      logs,
      mode: "live",
      pitcherId: request.pitcherId,
      provider: this.id,
      season: request.season,
    };
  }

  private buildUrl(request: PitcherGameLogRequest) {
    const url = new URL(`${this.endpoint}/${request.pitcherId}`);

    url.searchParams.set(
      "hydrate",
      `stats(group=[pitching],type=[gameLog],season=${request.season})`,
    );

    return url;
  }
}

export function normalizeMlbPitcherGameLogResponse(
  raw: unknown,
): PitcherGameLog[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const response = raw as MlbGameLogResponse;
  const splits =
    response.people?.[0]?.stats?.flatMap((group) => group.splits ?? []) ??
    response.stats?.flatMap((group) => group.splits ?? []) ??
    [];

  return splits
    .map(normalizeSplit)
    .filter((log): log is PitcherGameLog => log !== undefined)
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
}

function normalizeSplit(split: MlbGameLogSplit): PitcherGameLog | undefined {
  const stat = split.stat;

  if (!stat) {
    return undefined;
  }

  return {
    battersFaced: number(stat.battersFaced),
    date: split.game?.gameDate ?? split.date ?? new Date().toISOString(),
    decision: stat.decision ?? inferDecision(stat),
    earnedRuns: number(stat.earnedRuns),
    flyBalls: nullableNumber(stat.airOuts),
    gameScore: nullableNumber(stat.gameScore),
    groundBalls: nullableNumber(stat.groundOuts),
    hits: number(stat.hits),
    homeAway:
      split.isHome === true ? "home" : split.isHome === false ? "away" : "unknown",
    inningsPitched: number(stat.inningsPitched),
    opponent: split.opponent?.abbreviation ?? split.opponent?.name ?? "UNK",
    pitchCount: number(stat.pitchesThrown ?? stat.numberOfPitches),
    result: split.game?.isTie ? "T" : split.isWin === true ? "W" : split.isWin === false ? "L" : null,
    strikeouts: number(stat.strikeOuts),
    walks: number(stat.baseOnBalls),
  };
}

function inferDecision(stat: NonNullable<MlbGameLogSplit["stat"]>) {
  if (number(stat.wins) > 0) return "W";
  if (number(stat.losses) > 0) return "L";

  return null;
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

