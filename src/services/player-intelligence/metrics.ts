import { PLAYER_INTELLIGENCE_CONFIG } from "./config.ts";
import type {
  ConsistencyMetrics,
  PitcherGameLog,
  PitcherRecentFormScore,
  PitcherRollingSummary,
  RollingPitcherStats,
  TrendSignal,
  TrendStrength,
} from "./types.ts";

const EMPTY_ROLLING: RollingPitcherStats = {
  averageBattersFaced: 0,
  averageInnings: 0,
  averagePitchCount: 0,
  averageStrikeouts: 0,
  era: 0,
  games: 0,
  oneHundredPitchPercent: 0,
  qualityStartPercent: 0,
  sixPlusInningPercent: 0,
  strikeouts: 0,
  walks: 0,
  whip: 0,
};

export function calculateRollingSummary(
  logs: PitcherGameLog[],
): PitcherRollingSummary {
  const sorted = sortLogs(logs);

  return {
    away: summarizeLogs(sorted.filter((log) => log.homeAway === "away")),
    day: summarizeLogs(sorted.filter((log) => isDayGame(log))),
    home: summarizeLogs(sorted.filter((log) => log.homeAway === "home")),
    last10: summarizeLogs(sorted.slice(0, 10)),
    last3: summarizeLogs(sorted.slice(0, 3)),
    last5: summarizeLogs(sorted.slice(0, 5)),
    night: summarizeLogs(sorted.filter((log) => !isDayGame(log))),
    season: summarizeLogs(sorted),
  };
}

export function summarizeLogs(logs: PitcherGameLog[]): RollingPitcherStats {
  if (logs.length === 0) {
    return { ...EMPTY_ROLLING };
  }

  const outs = logs.reduce((total, log) => total + inningsToOuts(log.inningsPitched), 0);
  const innings = outs / 3;
  const earnedRuns = sum(logs, (log) => log.earnedRuns);
  const walks = sum(logs, (log) => log.walks);
  const hits = sum(logs, (log) => log.hits);
  const qualityStarts = logs.filter(
    (log) => log.inningsPitched >= 6 && log.earnedRuns <= 3,
  ).length;

  return {
    averageBattersFaced: round(sum(logs, (log) => log.battersFaced) / logs.length, 1),
    averageInnings: round(sum(logs, (log) => log.inningsPitched) / logs.length, 1),
    averagePitchCount: round(sum(logs, (log) => log.pitchCount) / logs.length, 1),
    averageStrikeouts: round(sum(logs, (log) => log.strikeouts) / logs.length, 1),
    era: innings > 0 ? round((earnedRuns * 9) / innings, 2) : 0,
    games: logs.length,
    oneHundredPitchPercent: round(
      (logs.filter((log) => log.pitchCount >= 100).length / logs.length) * 100,
      1,
    ),
    qualityStartPercent: round((qualityStarts / logs.length) * 100, 1),
    sixPlusInningPercent: round(
      (logs.filter((log) => log.inningsPitched >= 6).length / logs.length) * 100,
      1,
    ),
    strikeouts: sum(logs, (log) => log.strikeouts),
    walks,
    whip: innings > 0 ? round((walks + hits) / innings, 2) : 0,
  };
}

export function analyzePitcherTrends(logs: PitcherGameLog[]): TrendSignal[] {
  const sorted = sortLogs(logs).slice(0, 10).reverse();

  return [
    trend("strikeouts", "Strikeouts", sorted.map((log) => log.strikeouts), "Strikeouts trending"),
    trend("pitchCount", "Pitch Count", sorted.map((log) => log.pitchCount), "Pitch count"),
    trend("walks", "Walks", sorted.map((log) => log.walks), "Walks"),
    trend("efficiency", "Efficiency", sorted.map((log) => log.battersFaced / Math.max(1, log.pitchCount)), "Efficiency"),
    trend("workload", "Recent Workload", sorted.map((log) => log.pitchCount + log.inningsPitched * 8), "Workload"),
  ];
}

export function calculateConsistency(
  logs: PitcherGameLog[],
  metric: keyof Pick<PitcherGameLog, "strikeouts" | "inningsPitched" | "pitchCount"> = "strikeouts",
): ConsistencyMetrics {
  const values = sortLogs(logs).map((log) => Number(log[metric])).filter(Number.isFinite);

  if (values.length === 0) {
    return {
      ceiling: 0,
      consistencyScore: 0,
      expectedRange: { high: 0, low: 0 },
      floor: 0,
      mean: 0,
      median: 0,
      metric,
      standardDeviation: 0,
    };
  }

  const mean = average(values);
  const median = getMedian(values);
  const standardDeviation = Math.sqrt(
    average(values.map((value) => (value - mean) ** 2)),
  );
  const floor = Math.min(...values);
  const ceiling = Math.max(...values);
  const consistencyScore = clampScore(100 - (standardDeviation / Math.max(1, mean)) * 100);

  return {
    ceiling,
    consistencyScore: Math.round(consistencyScore),
    expectedRange: {
      high: round(mean + standardDeviation, 1),
      low: round(Math.max(0, mean - standardDeviation), 1),
    },
    floor,
    mean: round(mean, 2),
    median: round(median, 2),
    metric,
    standardDeviation: round(standardDeviation, 2),
  };
}

export function calculatePitcherRecentForm(
  logs: PitcherGameLog[],
  trends: TrendSignal[] = analyzePitcherTrends(logs),
): PitcherRecentFormScore {
  const rolling = calculateRollingSummary(logs);
  const recent = rolling.last5;
  const weights = PLAYER_INTELLIGENCE_CONFIG.recentFormWeights;
  const trendScore = average(
    trends.map((signal) =>
      signal.direction === "up" ? 65 : signal.direction === "down" ? 38 : 50,
    ),
  );
  const score =
    normalizeRange(recent.averageStrikeouts, 3, 9) * weights.strikeouts +
    (100 - normalizeRange(recent.era, 2, 6)) * weights.era +
    (100 - normalizeRange(recent.whip, 0.9, 1.6)) * weights.whip +
    (100 - normalizeRange(recent.walks / Math.max(1, recent.games), 1, 4)) *
      weights.walks +
    normalizeRange(recent.averagePitchCount, 75, 105) * weights.pitchCount +
    normalizeRange(recent.averageInnings, 4.5, 7) * weights.innings +
    recent.qualityStartPercent * weights.qualityStarts +
    trendScore * weights.trends;

  return {
    explanation: `Last 5: ${recent.averageStrikeouts.toFixed(1)} K, ${recent.averageInnings.toFixed(1)} IP, ${recent.averagePitchCount.toFixed(1)} pitches, ${recent.era.toFixed(2)} ERA.`,
    score: Math.round(clampScore(score)),
  };
}

function trend(
  key: string,
  label: string,
  values: number[],
  prefix: string,
): TrendSignal {
  if (values.length < 3) {
    return {
      confidence: 0,
      direction: "flat",
      explanation: `${label} trend requires more game logs.`,
      key,
      label,
      strength: "weak",
    };
  }

  const slope = linearSlope(values);
  const absSlope = Math.abs(slope);
  const thresholds = PLAYER_INTELLIGENCE_CONFIG.trendThresholds;
  const strength: TrendStrength =
    absSlope >= thresholds.strongSlope
      ? "strong"
      : absSlope >= thresholds.moderateSlope
        ? "moderate"
        : "weak";
  const direction =
    absSlope < thresholds.moderateSlope / 2 ? "flat" : slope > 0 ? "up" : "down";
  const confidence = clampScore(
    thresholds.confidenceFloor + Math.min(45, absSlope * 30),
  );

  return {
    confidence: Math.round(confidence),
    direction,
    explanation:
      direction === "flat"
        ? `${prefix} is stable over the recent sample.`
        : `${prefix} is trending ${direction} with ${strength} strength.`,
    key,
    label,
    strength,
  };
}

function linearSlope(values: number[]) {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = average(values);
  const numerator = values.reduce(
    (total, value, index) => total + (index - meanX) * (value - meanY),
    0,
  );
  const denominator = values.reduce(
    (total, _value, index) => total + (index - meanX) ** 2,
    0,
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

function sortLogs(logs: PitcherGameLog[]) {
  return [...logs].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

function isDayGame(log: PitcherGameLog) {
  const hour = new Date(log.date).getUTCHours();

  return hour >= 16 && hour < 22;
}

function inningsToOuts(innings: number) {
  const whole = Math.trunc(innings);
  const fraction = Math.round((innings - whole) * 10);

  return whole * 3 + Math.min(2, Math.max(0, fraction));
}

function sum<T>(items: T[], select: (item: T) => number) {
  return items.reduce((total, item) => total + select(item), 0);
}

function getMedian(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeRange(value: number, low: number, high: number) {
  return clampScore(((value - low) / (high - low)) * 100);
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
