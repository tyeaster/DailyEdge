import type {
  BullpenRating,
  OffensiveRating,
  OverallTeamRating,
  PitchingRating,
  TeamStrength,
} from "../../models/mlb.ts";

import { TEAM_STRENGTH_RATING_CONFIG } from "./config.ts";
import type {
  TeamStrengthProvider,
  TeamStrengthProviderResponse,
  TeamStrengthRequest,
} from "./TeamStrengthProvider.ts";
import { ReplayTeamStrengthProvider } from "./ReplayTeamStrengthProvider.ts";

const DEFAULT_MLB_TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams";

type MlbHittingStat = {
  atBats?: number;
  avg?: string;
  baseOnBalls?: number;
  gamesPlayed?: number;
  ops?: string;
  plateAppearances?: number;
  runs?: number;
  strikeOuts?: number;
};

type MlbPitchingStat = {
  era?: string;
  gamesPlayed?: number;
  runs?: number;
  whip?: string;
};

type MlbTeamStatsResponse<TStat> = {
  stats?: Array<{
    splits?: Array<{
      stat?: TStat;
    }>;
  }>;
};

export class MLBTeamStrengthProvider implements TeamStrengthProvider {
  readonly id = "mlb-team-stats";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayTeamStrengthProvider;

  constructor(
    endpoint = process.env.MLB_TEAMS_API_URL ?? DEFAULT_MLB_TEAMS_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayTeamStrengthProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getTeamStrength(
    request: TeamStrengthRequest,
  ): Promise<TeamStrengthProviderResponse> {
    const [hittingResponse, pitchingResponse] = await Promise.all([
      this.fetcher(this.buildUrl(request, "hitting")),
      this.fetcher(this.buildUrl(request, "pitching")),
    ]);

    if (!hittingResponse.ok || !pitchingResponse.ok) {
      throw new Error(
        `MLB team stats request failed with ${hittingResponse.status}/${pitchingResponse.status}`,
      );
    }

    const [hittingRaw, pitchingRaw] = await Promise.all([
      hittingResponse.json(),
      pitchingResponse.json(),
    ]);
    const fetchedAt = new Date().toISOString();
    const strength = normalizeMlbTeamStrength({
      fetchedAt,
      hittingRaw,
      pitchingRaw,
      source: "live",
    });

    if (process.env.TEAM_STRENGTH_RECORD === "true") {
      await this.replayProvider.writeReplay({
        hittingRaw,
        pitchingRaw,
        provider: this.id,
        request,
        strength,
      });
    }

    return {
      fetchedAt,
      mode: "live",
      provider: this.id,
      season: request.season,
      strength,
      teamId: request.teamId,
    };
  }

  private buildUrl(request: TeamStrengthRequest, group: "hitting" | "pitching") {
    const url = new URL(`${this.endpoint}/${request.teamId}/stats`);

    url.searchParams.set("stats", "season");
    url.searchParams.set("group", group);
    url.searchParams.set("season", String(request.season));

    return url;
  }
}

export function normalizeMlbTeamStrength({
  fetchedAt,
  hittingRaw,
  pitchingRaw,
  source,
}: {
  fetchedAt: string;
  hittingRaw: unknown;
  pitchingRaw: unknown;
  source: TeamStrength["source"];
}): TeamStrength | undefined {
  const hitting = getFirstStat<MlbHittingStat>(hittingRaw);
  const pitching = getFirstStat<MlbPitchingStat>(pitchingRaw);

  if (!hitting && !pitching) {
    return undefined;
  }

  const offense = calculateOffensiveRating(hitting);
  const pitchingRating = calculatePitchingRating(pitching);
  const bullpen = calculateBullpenRating();
  const runDifferential =
    toFiniteNumber(hitting?.runs) - toFiniteNumber(pitching?.runs);
  const overall = calculateOverallTeamRating({
    bullpen,
    offense,
    pitching: pitchingRating,
    runDifferential,
  });

  return {
    bullpen,
    fetchedAt,
    offense,
    overall,
    pitching: pitchingRating,
    source,
  };
}

export function calculateOffensiveRating(
  stat: MlbHittingStat | undefined,
): OffensiveRating {
  if (!stat) {
    return {
      available: false,
      battingAverage: 0,
      ops: 0,
      runsPerGame: 0,
      strikeoutRate: 0,
      value: 50,
      walkRate: 0,
    };
  }

  const gamesPlayed = toFiniteNumber(stat.gamesPlayed);
  const plateAppearances =
    toFiniteNumber(stat.plateAppearances) || toFiniteNumber(stat.atBats);
  const runsPerGame =
    gamesPlayed > 0 ? toFiniteNumber(stat.runs) / gamesPlayed : 0;
  const strikeoutRate =
    plateAppearances > 0 ? toFiniteNumber(stat.strikeOuts) / plateAppearances : 0;
  const walkRate =
    plateAppearances > 0 ? toFiniteNumber(stat.baseOnBalls) / plateAppearances : 0;
  const config = TEAM_STRENGTH_RATING_CONFIG.offense;
  const value =
    normalizePositive(runsPerGame, config.runsPerGame) *
      config.runsPerGame.weight +
    normalizePositive(toFiniteNumber(stat.ops), config.ops) * config.ops.weight +
    normalizePositive(toFiniteNumber(stat.avg), config.battingAverage) *
      config.battingAverage.weight +
    normalizeInverse(strikeoutRate, config.strikeoutRate) *
      config.strikeoutRate.weight +
    normalizePositive(walkRate, config.walkRate) * config.walkRate.weight;

  return {
    available: true,
    battingAverage: toFiniteNumber(stat.avg),
    ops: toFiniteNumber(stat.ops),
    runsPerGame,
    strikeoutRate,
    value: roundRating(value),
    walkRate,
  };
}

export function calculatePitchingRating(
  stat: MlbPitchingStat | undefined,
): PitchingRating {
  if (!stat) {
    return {
      available: false,
      era: 0,
      runsAllowedPerGame: 0,
      value: 50,
      whip: 0,
    };
  }

  const gamesPlayed = toFiniteNumber(stat.gamesPlayed);
  const runsAllowedPerGame =
    gamesPlayed > 0 ? toFiniteNumber(stat.runs) / gamesPlayed : 0;
  const config = TEAM_STRENGTH_RATING_CONFIG.pitching;
  const value =
    normalizeInverse(toFiniteNumber(stat.era), config.era) * config.era.weight +
    normalizeInverse(runsAllowedPerGame, config.runsAllowedPerGame) *
      config.runsAllowedPerGame.weight +
    normalizeInverse(toFiniteNumber(stat.whip), config.whip) *
      config.whip.weight;

  return {
    available: true,
    era: toFiniteNumber(stat.era),
    runsAllowedPerGame,
    value: roundRating(value),
    whip: toFiniteNumber(stat.whip),
  };
}

export function calculateBullpenRating({
  era,
  whip,
}: {
  era?: number;
  whip?: number;
} = {}): BullpenRating {
  if (!era || !whip) {
    return {
      available: false,
      value: 50,
    };
  }

  const config = TEAM_STRENGTH_RATING_CONFIG.pitching;
  const value =
    normalizeInverse(era, config.era) * 0.6 +
    normalizeInverse(whip, config.whip) * 0.4;

  return {
    available: true,
    era,
    value: roundRating(value),
    whip,
  };
}

export function calculateOverallTeamRating({
  bullpen,
  offense,
  pitching,
  runDifferential,
}: {
  bullpen: BullpenRating;
  offense: OffensiveRating;
  pitching: PitchingRating;
  runDifferential: number;
}): OverallTeamRating {
  const config = TEAM_STRENGTH_RATING_CONFIG;
  const weightedRatings: Array<{ value: number; weight: number }> = [];

  if (offense.available) {
    weightedRatings.push({
      value: offense.value,
      weight: config.offenseWeight,
    });
  }

  if (pitching.available) {
    weightedRatings.push({
      value: pitching.value,
      weight: config.pitchingWeight,
    });
  }

  if (bullpen.available) {
    weightedRatings.push({
      value: bullpen.value,
      weight: config.bullpenWeight,
    });
  }

  weightedRatings.push({
    value: roundRating(
      normalizePositive(runDifferential, config.runDifferential),
    ),
    weight: config.runDifferential.weight,
  });
  const totalWeight = weightedRatings.reduce(
    (total, rating) => total + rating.weight,
    0,
  );
  const value =
    totalWeight > 0
      ? weightedRatings.reduce(
          (total, rating) => total + rating.value * rating.weight,
          0,
        ) / totalWeight
      : 50;

  return {
    available: offense.available || pitching.available || bullpen.available,
    runDifferential,
    value: Math.round(value),
  };
}

function getFirstStat<TStat>(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const response = raw as MlbTeamStatsResponse<TStat>;

  return response.stats?.flatMap((group) => group.splits ?? [])[0]?.stat;
}

function normalizePositive(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return clamp01((value - range.minimum) / (range.maximum - range.minimum));
}

function normalizeInverse(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return 1 - normalizePositive(value, range);
}

function roundRating(value: number) {
  return Math.round(clamp01(value) * 100);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function toFiniteNumber(value: number | string | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}
