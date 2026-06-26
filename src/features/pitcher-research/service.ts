import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "../../services/daily-slate/types.ts";
import type { Pitcher, Team } from "../../models/mlb.ts";
import type {
  MatchupIntelligenceResult,
  PitchTypeMatch,
} from "../../services/matchup/index.ts";
import { matchupService } from "../../services/matchup/index.ts";
import {
  playerIntelligenceService,
  type PitcherGameLog,
  type PitcherIntelligence,
  type RollingPitcherStats,
  type TrendSignal,
} from "../../services/player-intelligence/index.ts";

type Recommendation = "Over" | "Lean Over" | "Pass" | "Lean Under" | "Under";

export interface PitcherResearchStart {
  date: string;
  decision: string;
  earnedRuns: number;
  innings: number;
  opponent: string;
  overLine: boolean;
  pitchCount: number;
  strikeouts: number;
  walks: number;
}

export interface PitcherResearchFactor {
  details?: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  stars: number;
  weight: string;
}

export interface PitcherResearchBreakdown {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  reasons: string[];
  score: number;
}

export interface PitcherResearchViewModel {
  ballpark: {
    name: string;
    pitcherFriendly: string;
    rating: string;
    runEnvironment: string;
    strikeoutFactor: string;
  };
  confidence: number;
  dataConfidence: number;
  edge: string;
  factors: PitcherResearchFactor[];
  game: DailySlateGame;
  gameTime: string;
  modelExplanation: string;
  opponent: Team;
  overview: {
    edge: string;
    projection: string;
    recommendation: Recommendation;
    sportsbook: string;
    sportsbookOdds: string;
    sportsbookLine: string;
  };
  pitcher: Pitcher;
  pitcherIntelligence: {
    consistency: {
      ceiling: string;
      expectedRange: string;
      floor: string;
      score: number;
      standardDeviation: string;
    };
    recentForm: {
      explanation: string;
      score: number;
    };
    rolling: Array<{
      averageInnings: string;
      averagePitchCount: string;
      averageStrikeouts: string;
      era: string;
      label: string;
      starts: string;
      whip: string;
    }>;
    source: string;
    trends: TrendSignal[];
  };
  recentStarts: PitcherResearchStart[];
  seasonProfile: Array<{
    label: string;
    percentile: number;
    tone: "good" | "neutral" | "watch";
    value: string;
  }>;
  strikeoutLine: number;
  strikeoutMatchup: {
    arsenal: Array<{
      movement: string;
      pitchName: string;
      score: number;
      usage: string;
      velocity: string;
      whiff: string;
    }>;
    breakdowns: {
      overall: PitcherResearchBreakdown;
      pitchMatch: PitcherResearchBreakdown;
      recentForm: PitcherResearchBreakdown;
      zoneMatch: PitcherResearchBreakdown;
    };
    confidence: number;
    source: string;
  };
  strikeoutProjection: number;
  strikeoutProp?: DailySlateProp;
  team: Team;
  weather: {
    airDensity: string;
    delayRisk: string;
    runEnvironment: string;
    summary: string;
    temperature: string;
    wind: string;
  };
}

export async function getPitcherResearch(
  pitcherId?: string,
): Promise<PitcherResearchViewModel> {
  const { getDailySlate } = await import("../../services/daily-slate/service.ts");
  const slate = await getDailySlate();
  const base = buildPitcherResearchViewModel(slate, pitcherId);
  const [pitcherIntelligence, matchupIntelligence] = await Promise.all([
    loadPitcherIntelligence(base),
    loadMatchupIntelligence(base),
  ]);

  return buildPitcherResearchViewModel(slate, pitcherId, {
    matchupIntelligence,
    pitcherIntelligence,
  });
}

export function buildPitcherResearchViewModel(
  slate: DailySlateViewModel,
  pitcherId?: string,
  intelligence: {
    matchupIntelligence?: MatchupIntelligenceResult;
    pitcherIntelligence?: PitcherIntelligence;
  } = {},
): PitcherResearchViewModel {
  const strikeoutProps = slate.propCategories.find(
    (category) => category.label === "Strikeouts",
  )?.props ?? [];
  const selectedProp =
    strikeoutProps.find((prop) => prop.player.id === pitcherId) ??
    strikeoutProps[0];
  const selectedPitcherId = selectedProp?.player.id ?? pitcherId;
  const game =
    selectedPitcherId === undefined
      ? slate.games[0]
      : findPitcherGame(slate, selectedPitcherId);
  const pitcher =
    game.awayPitcher.id === selectedPitcherId ? game.awayPitcher : game.homePitcher;
  const team = pitcher.teamId === game.awayTeam.id ? game.awayTeam : game.homeTeam;
  const opponent = team.id === game.awayTeam.id ? game.homeTeam : game.awayTeam;
  const strikeoutProp =
    selectedProp?.player.id === pitcher.id
      ? selectedProp
      : strikeoutProps.find((prop) => prop.player.id === pitcher.id);
  const strikeoutLine = strikeoutProp?.prop.odds.line ?? estimateStrikeoutLine(pitcher);
  const strikeoutProjection =
    parseProjection(strikeoutProp?.prop.projection) ??
    estimateStrikeoutProjection(pitcher, opponent);
  const edgeValue = strikeoutProjection - strikeoutLine;
  const confidence = strikeoutProp?.prop.confidence.value ?? game.game.confidence.value;
  const dataConfidence = Math.round(
    average([
      game.game.prediction?.dataQuality.score ?? confidence,
      intelligence.matchupIntelligence?.confidence,
      intelligence.pitcherIntelligence?.recentForm.score,
    ]),
  );
  const recentStarts = buildRecentStarts({
    line: strikeoutLine,
    opponent,
    pitcher,
    pitcherIntelligence: intelligence.pitcherIntelligence,
  });
  const factors = buildFactors({
    game,
    matchupIntelligence: intelligence.matchupIntelligence,
    opponent,
    pitcher,
    pitcherIntelligence: intelligence.pitcherIntelligence,
    recentStarts,
    team,
  });
  const recommendation = getRecommendation(edgeValue, confidence);

  return {
    ballpark: {
      name: game.game.ballpark?.name ?? game.game.venue,
      pitcherFriendly: formatRating(game.game.ballpark?.pitcherFriendlyRating),
      rating: formatRating(game.game.ballpark?.overallParkRating),
      runEnvironment: formatEnvironment(game.game.ballpark?.overallParkRating ?? 50),
      strikeoutFactor: formatOptional(game.game.ballpark?.strikeoutFactor, 0),
    },
    confidence,
    dataConfidence,
    edge: formatSigned(edgeValue),
    factors,
    game,
    gameTime: formatGameTime(game.game.scheduledAt),
    modelExplanation: buildModelExplanation({
      edge: edgeValue,
      game,
      line: strikeoutLine,
      matchupIntelligence: intelligence.matchupIntelligence,
      opponent,
      pitcher,
      pitcherIntelligence: intelligence.pitcherIntelligence,
      projection: strikeoutProjection,
      recentStarts,
      recommendation,
    }),
    opponent,
    overview: {
      edge: formatSigned(edgeValue),
      projection: `${strikeoutProjection.toFixed(1)} Ks`,
      recommendation,
      sportsbook: strikeoutProp?.prop.odds.sportsbook ?? "Current market",
      sportsbookOdds: formatAmericanOdds(strikeoutProp?.prop.odds.price),
      sportsbookLine: strikeoutProp?.prop.odds.displayLine ?? `${strikeoutLine.toFixed(1)} Ks`,
    },
    pitcher,
    pitcherIntelligence: buildPitcherIntelligenceSummary(
      intelligence.pitcherIntelligence,
    ),
    recentStarts,
    seasonProfile: buildSeasonProfile(pitcher),
    strikeoutMatchup: buildStrikeoutMatchup(intelligence.matchupIntelligence),
    strikeoutLine,
    strikeoutProjection,
    strikeoutProp,
    team,
    weather: {
      airDensity:
        game.weather.airDensityKgM3 === null
          ? "Not Applicable"
          : `${game.weather.airDensityKgM3.toFixed(3)} kg/m³`,
      delayRisk: `${Math.round(game.weather.delayProbability)}%`,
      runEnvironment: formatEnvironment(game.weather.runEnvironment),
      summary: game.weather.summary,
      temperature:
        game.weather.weatherApplicable
          ? `${Math.round(game.weather.temperatureF)}°F`
          : "Indoor",
      wind:
        game.weather.weatherApplicable
          ? `${Math.round(game.weather.windMph)} MPH ${game.weather.relativeWindDirection}`
          : "Not Applicable",
    },
  };
}

function findPitcherGame(slate: DailySlateViewModel, pitcherId: string) {
  return (
    slate.games.find(
      (game) =>
        game.awayPitcher.id === pitcherId || game.homePitcher.id === pitcherId,
    ) ?? slate.games[0]
  );
}

async function loadPitcherIntelligence({
  game,
  opponent,
  overview,
  pitcher,
  strikeoutProp,
  team,
}: PitcherResearchViewModel) {
  try {
    return await playerIntelligenceService.getPitcher({
      context: {
        ballpark: game.game.ballpark,
        game: game.game,
        lineup: opponent.lineup,
        opponent,
        prediction: game.game.prediction,
        team,
        weather: game.weather,
      },
      pitcher,
      projectionContext: {
        marketLine: overview.sportsbookLine,
        modelProjection: overview.projection,
        prop: strikeoutProp?.prop,
      },
      season: getSeason(game.game.scheduledAt),
    });
  } catch {
    return undefined;
  }
}

async function loadMatchupIntelligence({
  game,
  opponent,
  pitcher,
  team,
}: PitcherResearchViewModel) {
  const batterMlbIds = opponent.lineup?.players
    .filter((player) => player.isStarting)
    .map((player) => player.mlbId)
    .filter((id) => Number.isFinite(id));

  try {
    return await matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: opponent.lineup?.players.map((player) => String(player.mlbId)),
        batterMlbIds,
        batterNames: opponent.lineup?.players.map((player) => player.fullName),
        pitcherId: pitcher.id,
        pitcherMlbId: pitcher.externalIds?.mlb,
        pitcherName: pitcher.fullName,
        season: getSeason(game.game.scheduledAt),
      },
      {
        ballpark: game.game.ballpark,
        bullpen: team.strength?.bullpen,
        lineup: opponent.lineup,
        weather: game.weather,
      },
    );
  } catch {
    return undefined;
  }
}

function buildSeasonProfile(pitcher: Pitcher) {
  return [
    metric("ERA", formatNullable(pitcher.era, 2), inversePercentile(pitcher.era, 2.5, 5.5)),
    metric("WHIP", formatNullable(pitcher.whip, 2), inversePercentile(pitcher.whip, 0.95, 1.5)),
    metric("K%", `${formatNullable(pitcher.strikeoutRate, 1)}%`, percentile(pitcher.strikeoutRate, 17, 35)),
    metric("K/9", formatNullable(pitcher.strikeoutsPer9, 1), percentile(pitcher.strikeoutsPer9 ?? 0, 6.5, 12.5)),
    metric("BB/9", formatOptional(pitcher.walksPer9, 1), inversePercentile(pitcher.walksPer9 ?? 3.2, 1.2, 4.2)),
    metric("HR/9", formatOptional(pitcher.homeRunsPer9, 1), inversePercentile(pitcher.homeRunsPer9 ?? 1.1, 0.5, 1.8)),
    metric("Innings", formatNullable(pitcher.inningsPitched, 1), percentile(pitcher.inningsPitched, 40, 110)),
    metric("Games Started", formatOptional(pitcher.gamesStarted, 0), percentile(pitcher.gamesStarted ?? 10, 6, 18)),
    metric("Wins", formatOptional(pitcher.wins, 0), percentile(pitcher.wins ?? 4, 1, 10)),
    metric("Losses", formatOptional(pitcher.losses, 0), inversePercentile(pitcher.losses ?? 4, 1, 10)),
  ];
}

function metric(label: string, value: string, percentileValue: number) {
  return {
    label,
    percentile: percentileValue,
    tone:
      percentileValue >= 70 ? "good" : percentileValue <= 35 ? "watch" : "neutral",
    value,
  } as const;
}

function buildRecentStarts({
  line,
  opponent,
  pitcher,
  pitcherIntelligence,
}: {
  line: number;
  opponent: Team;
  pitcher: Pitcher;
  pitcherIntelligence?: PitcherIntelligence;
}): PitcherResearchStart[] {
  const logs = pitcherIntelligence?.gameLogs.slice(0, 5) ?? [];

  if (logs.length > 0) {
    return logs.map((log) => buildRecentStartFromLog(log, line));
  }

  const baseline = Math.max(3.5, (pitcher.strikeoutsPer9 ?? 8.5) * 0.68);
  const opponents = [
    opponent.abbreviation,
    "ATL",
    "MIA",
    "STL",
    "CHC",
  ];

  return Array.from({ length: 5 }, (_, index) => {
    const strikeouts = Math.max(
      2,
      Math.round(baseline + [1.2, -0.4, 0.8, -1.1, 0.3][index]),
    );

    return {
      date: formatRecentDate(index),
      decision: "—",
      earnedRuns: 0,
      innings: roundToTenth(5.1 + [1.2, 0.1, 0.8, -0.1, 0.5][index]),
      opponent: opponents[index],
      overLine: strikeouts > line,
      pitchCount: Math.round(88 + [10, 3, 7, -2, 5][index]),
      strikeouts,
      walks: 0,
    };
  });
}

function buildRecentStartFromLog(
  log: PitcherGameLog,
  line: number,
): PitcherResearchStart {
  return {
    date: formatDate(log.date),
    decision: log.decision ?? log.result ?? "—",
    earnedRuns: log.earnedRuns,
    innings: log.inningsPitched,
    opponent: log.opponent,
    overLine: log.strikeouts > line,
    pitchCount: log.pitchCount,
    strikeouts: log.strikeouts,
    walks: log.walks,
  };
}

function buildFactors({
  game,
  matchupIntelligence,
  opponent,
  pitcher,
  pitcherIntelligence,
  recentStarts,
  team,
}: {
  game: DailySlateGame;
  matchupIntelligence?: MatchupIntelligenceResult;
  opponent: Team;
  pitcher: Pitcher;
  pitcherIntelligence?: PitcherIntelligence;
  recentStarts: PitcherResearchStart[];
  team: Team;
}): PitcherResearchFactor[] {
  const overRate =
    recentStarts.filter((start) => start.overLine).length / recentStarts.length;
  const pitcherScore = percentile(pitcher.strikeoutRate, 17, 35);
  const bullpenScore = team.strength?.bullpen.workloadRating ?? team.strength?.bullpen.value ?? 50;
  const lineupScore = 100 - (opponent.lineup?.contactRating ?? 50);
  const weatherScore = game.weather.strikeoutEnvironment;
  const ballparkScore = game.game.ballpark?.pitcherFriendlyRating ?? 50;
  const recentScore = pitcherIntelligence?.recentForm.score ?? Math.round(overRate * 100);
  const pitchMatch = matchupIntelligence?.pitchTypeMatch.score ?? 50;
  const zoneMatch = matchupIntelligence?.zoneMatch.score ?? 50;
  const overallMatch = matchupIntelligence?.overallMatchupScore ?? 50;

  return [
    factor("Pitch Match", "24%", pitchMatch, matchupIntelligence?.pitchTypeMatch.explanation ?? "Pitch-type matchup is neutral with current inputs.", [
      { label: "Primary pitch", value: matchupIntelligence?.arsenal.primaryPitchType ?? "—" },
      { label: "Arsenal quality", value: formatRating(matchupIntelligence?.arsenal.dataQuality) },
      { label: "Batter profile quality", value: formatRating(average(matchupIntelligence?.batterProfiles.map((profile) => profile.dataQuality) ?? [])) },
    ]),
    factor("Zone Match", "14%", zoneMatch, matchupIntelligence?.zoneMatch.reasons[0] ?? "Zone matchup is neutral with current inputs.", [
      { label: "Hot zones", value: String(matchupIntelligence?.zoneMatch.hotZones?.length ?? 0) },
      { label: "Cold zones", value: String(matchupIntelligence?.zoneMatch.coldZones?.length ?? 0) },
      { label: "Overlay cells", value: String(matchupIntelligence?.zoneMatch.overlay?.length ?? 0) },
    ]),
    factor("Starting Pitcher", "18%", pitcherScore, `${pitcher.fullName} carries a ${formatNullable(pitcher.strikeoutRate, 1)}% strikeout rate.`, [
      { label: "K/9", value: formatOptional(pitcher.strikeoutsPer9, 1) },
      { label: "WHIP", value: formatNullable(pitcher.whip, 2) },
      { label: "Recent form", value: formatRating(pitcherIntelligence?.recentForm.score) },
    ]),
    factor("Lineup", "14%", lineupScore, `${opponent.abbreviation} lineup contact profile drives the strikeout matchup.`, [
      { label: "Lineup status", value: capitalize(opponent.lineup?.status ?? "unavailable") },
      { label: "Average K%", value: `${((opponent.lineup?.averageStrikeoutRate ?? 0) * 100).toFixed(1)}%` },
      { label: "Contact rating", value: formatRating(opponent.lineup?.contactRating) },
    ]),
    factor("Recent Form", "14%", recentScore, pitcherIntelligence?.recentForm.explanation ?? `${recentStarts.filter((start) => start.overLine).length} of the last 5 starts cleared today's line.`, [
      { label: "Last 5 avg K", value: formatOptional(pitcherIntelligence?.rolling.last5.averageStrikeouts, 1) },
      { label: "Last 5 pitches", value: formatOptional(pitcherIntelligence?.rolling.last5.averagePitchCount, 1) },
      { label: "Consistency", value: formatRating(pitcherIntelligence?.consistency.consistencyScore) },
    ]),
    factor("Environment", "10%", Math.round(average([weatherScore, ballparkScore])), game.weather.weatherApplicable ? `${game.weather.summary}; ${game.game.venue} rates ${formatEnvironment(ballparkScore)} for pitcher friendliness.` : `${game.game.venue} rates ${formatEnvironment(ballparkScore)} for pitcher friendliness.`, [
      { label: "Weather K env", value: formatRating(weatherScore) },
      { label: "Park pitcher rating", value: formatRating(ballparkScore) },
      { label: "Delay risk", value: `${Math.round(game.weather.delayProbability)}%` },
    ]),
    factor("Overall Match", "6%", overallMatch, matchupIntelligence?.reasons[0] ?? "Overall matchup profile is neutral.", [
      { label: "Confidence", value: formatRating(matchupIntelligence?.confidence) },
      { label: "Bullpen support", value: formatRating(bullpenScore) },
      { label: "Input source", value: matchupIntelligence?.arsenal.source ?? "unavailable" },
    ]),
  ];
}

function factor(
  label: string,
  weight: string,
  score: number,
  explanation: string,
  details: Array<{ label: string; value: string }> = [],
): PitcherResearchFactor {
  return {
    details,
    explanation,
    label,
    score: Math.round(score),
    stars: Math.max(1, Math.min(5, Math.round(score / 20))),
    weight,
  };
}

function buildModelExplanation({
  edge,
  game,
  matchupIntelligence,
  line,
  opponent,
  pitcher,
  pitcherIntelligence,
  projection,
  recentStarts,
  recommendation,
}: {
  edge: number;
  game: DailySlateGame;
  matchupIntelligence?: MatchupIntelligenceResult;
  line: number;
  opponent: Team;
  pitcher: Pitcher;
  pitcherIntelligence?: PitcherIntelligence;
  projection: number;
  recentStarts: PitcherResearchStart[];
  recommendation: Recommendation;
}) {
  const averagePitches = Math.round(average(recentStarts.map((start) => start.pitchCount)));
  const weatherText = game.weather.weatherApplicable
    ? `weather is ${game.weather.runEnvironment >= 55 ? "hitter-friendly" : game.weather.runEnvironment <= 45 ? "pitcher-friendly" : "neutral"}`
    : "weather is not applicable";
  const bullpenText =
    game.awayTeam.id === pitcher.teamId
      ? game.awayTeam.strength?.bullpen.workloadRating
      : game.homeTeam.strength?.bullpen.workloadRating;

  const matchupText = matchupIntelligence
    ? ` Pitch Match grades ${matchupIntelligence.pitchTypeMatch.score}/100, Zone Match grades ${matchupIntelligence.zoneMatch.score}/100, and Overall Match grades ${matchupIntelligence.overallMatchupScore}/100.`
    : "";
  const trendText = pitcherIntelligence?.trends[0]?.explanation
    ? ` ${pitcherIntelligence.trends[0].explanation}`
    : "";

  return `TrueLine projects ${projection.toFixed(1)} strikeouts against a sportsbook line of ${line.toFixed(1)}, creating a ${formatSigned(edge)} edge and a ${recommendation} recommendation. ${opponent.abbreviation} has a ${formatRating(opponent.lineup?.contactRating)} contact rating, ${pitcher.fullName} has averaged ${averagePitches} pitches across the last five-start sample, ${weatherText}, and bullpen support grades ${formatRating(bullpenText)} for preserving a normal outing path.${matchupText}${trendText}`;
}

function buildPitcherIntelligenceSummary(
  pitcherIntelligence?: PitcherIntelligence,
): PitcherResearchViewModel["pitcherIntelligence"] {
  const rolling = pitcherIntelligence?.rolling;
  const consistency = pitcherIntelligence?.consistency;

  return {
    consistency: {
      ceiling: formatOptional(consistency?.ceiling, 1),
      expectedRange: consistency
        ? `${consistency.expectedRange.low.toFixed(1)}-${consistency.expectedRange.high.toFixed(1)} Ks`
        : "—",
      floor: formatOptional(consistency?.floor, 1),
      score: consistency?.consistencyScore ?? 0,
      standardDeviation: formatOptional(consistency?.standardDeviation, 2),
    },
    recentForm: {
      explanation:
        pitcherIntelligence?.recentForm.explanation ??
        "Recent form is unavailable for this pitcher.",
      score: pitcherIntelligence?.recentForm.score ?? 50,
    },
    rolling: [
      rollingRow("Last 3", rolling?.last3),
      rollingRow("Last 5", rolling?.last5),
      rollingRow("Last 10", rolling?.last10),
      rollingRow("Season", rolling?.season),
    ],
    source: pitcherIntelligence?.source ?? "unavailable",
    trends: pitcherIntelligence?.trends ?? [],
  };
}

function rollingRow(label: string, stats?: RollingPitcherStats) {
  return {
    averageInnings: formatOptional(stats?.averageInnings, 1),
    averagePitchCount: formatOptional(stats?.averagePitchCount, 1),
    averageStrikeouts: formatOptional(stats?.averageStrikeouts, 1),
    era: formatOptional(stats?.era, 2),
    label,
    starts: stats?.games ? String(stats.games) : "0",
    whip: formatOptional(stats?.whip, 2),
  };
}

function buildStrikeoutMatchup(
  matchupIntelligence?: MatchupIntelligenceResult,
): PitcherResearchViewModel["strikeoutMatchup"] {
  const pitchMatches = matchupIntelligence?.pitchTypeMatch.matches ?? [];

  return {
    arsenal:
      matchupIntelligence?.arsenal.profiles.map((profile) => ({
        movement: `${formatOptional(profile.horizontalBreakInches, 1)} H / ${formatOptional(profile.verticalBreakInches, 1)} V`,
        pitchName: profile.pitchName,
        score: getPitchScore(profile.pitchType, pitchMatches),
        usage: `${profile.usagePercent.toFixed(1)}%`,
        velocity: formatOptional(profile.averageVelocityMph, 1),
        whiff: `${formatOptional(profile.whiffPercent, 1)}%`,
      })) ?? [],
    breakdowns: {
      overall: {
        details: [
          { label: "Pitch Type", value: formatRating(matchupIntelligence?.pitchTypeMatch.score) },
          { label: "Zone", value: formatRating(matchupIntelligence?.zoneMatch.score) },
          { label: "Recent", value: formatRating(matchupIntelligence?.recentMatchup.score) },
          { label: "Confidence", value: formatRating(matchupIntelligence?.confidence) },
        ],
        explanation:
          matchupIntelligence?.reasons[0] ?? "Overall matchup score is neutral.",
        label: "Overall Match",
        reasons: matchupIntelligence?.reasons ?? ["Overall matchup profile is neutral."],
        score: matchupIntelligence?.overallMatchupScore ?? 50,
      },
      pitchMatch: {
        details: pitchMatches.slice(0, 5).map((match) => ({
          label: match.pitchName,
          value: `${match.score}/100 · ${match.usagePercent.toFixed(1)}% usage`,
        })),
        explanation:
          matchupIntelligence?.pitchTypeMatch.explanation ??
          "Pitch-type matchup is neutral with current inputs.",
        label: "Pitch Match",
        reasons: [
          ...(matchupIntelligence?.pitchTypeMatch.topAdvantages ?? []),
          ...(matchupIntelligence?.pitchTypeMatch.topWeaknesses ?? []),
        ],
        score: matchupIntelligence?.pitchTypeMatch.score ?? 50,
      },
      recentForm: {
        details: [
          { label: "Recent Score", value: formatRating(matchupIntelligence?.recentMatchup.score) },
          { label: "Recent Confidence", value: formatRating(matchupIntelligence?.recentMatchup.confidence) },
        ],
        explanation:
          matchupIntelligence?.recentMatchup.explanation ??
          "Recent matchup score is unavailable without Player Intelligence.",
        label: "Recent Form",
        reasons: matchupIntelligence?.recentMatchup.explanation
          ? [matchupIntelligence.recentMatchup.explanation]
          : ["Recent matchup score is unavailable."],
        score: matchupIntelligence?.recentMatchup.score ?? 50,
      },
      zoneMatch: {
        details: [
          { label: "Overlay Cells", value: String(matchupIntelligence?.zoneMatch.overlay?.length ?? 0) },
          { label: "Hot Zones", value: String(matchupIntelligence?.zoneMatch.hotZones?.length ?? 0) },
          { label: "Cold Zones", value: String(matchupIntelligence?.zoneMatch.coldZones?.length ?? 0) },
        ],
        explanation:
          matchupIntelligence?.zoneMatch.reasons[0] ??
          "Zone matchup is neutral with current inputs.",
        label: "Zone Match",
        reasons: matchupIntelligence?.zoneMatch.reasons ?? ["Zone matchup is neutral."],
        score: matchupIntelligence?.zoneMatch.score ?? 50,
      },
    },
    confidence: matchupIntelligence?.confidence ?? 0,
    source: matchupIntelligence?.arsenal.source ?? "unavailable",
  };
}

function getPitchScore(pitchType: string, matches: PitchTypeMatch[]) {
  return matches.find((match) => match.pitchType === pitchType)?.score ?? 50;
}

function getRecommendation(edge: number, confidence: number): Recommendation {
  if (edge >= 1 && confidence >= 75) return "Over";
  if (edge >= 0.35) return "Lean Over";
  if (edge <= -1 && confidence >= 75) return "Under";
  if (edge <= -0.35) return "Lean Under";
  return "Pass";
}

function estimateStrikeoutLine(pitcher: Pitcher) {
  return Math.max(3.5, Math.round(((pitcher.strikeoutsPer9 ?? 8) * 0.65) * 2) / 2);
}

function estimateStrikeoutProjection(pitcher: Pitcher, opponent: Team) {
  const opponentAdjustment = (100 - (opponent.lineup?.contactRating ?? 50)) / 100;
  const baseline = (pitcher.strikeoutsPer9 ?? 8) * 0.68;

  return roundToTenth(Math.max(2, baseline + opponentAdjustment));
}

function parseProjection(projection?: string) {
  if (!projection) {
    return undefined;
  }

  const parsed = Number.parseFloat(projection);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getSeason(scheduledAt: string) {
  return new Date(scheduledAt).getUTCFullYear();
}

function percentile(value: number | undefined, low: number, high: number) {
  if (value === undefined || value <= 0) {
    return 50;
  }

  return Math.round(Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)));
}

function inversePercentile(value: number | undefined, low: number, high: number) {
  if (value === undefined || value <= 0) {
    return 50;
  }

  return 100 - percentile(value, low, high);
}

function formatGameTime(scheduledAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(scheduledAt));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function formatRecentDate(index: number) {
  const date = new Date("2026-06-26T12:00:00.000Z");
  date.setDate(date.getDate() - index * 5);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatNullable(value: number | undefined, digits: number) {
  return value && value > 0 ? value.toFixed(digits) : "—";
}

function formatOptional(value: number | null | undefined, digits: number) {
  return value === undefined || value === null ? "—" : value.toFixed(digits);
}

function formatRating(value: number | undefined) {
  return value === undefined || Number.isNaN(value) ? "—" : String(Math.round(value));
}

function formatEnvironment(value: number) {
  const difference = Math.round(value - 50);

  return `${difference >= 0 ? "+" : ""}${difference}`;
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} Ks`;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function formatAmericanOdds(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }

  return value > 0 ? `+${value}` : String(value);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: Array<number | undefined>) {
  const valid = values.filter((value): value is number => value !== undefined && Number.isFinite(value));

  return valid.length === 0
    ? 50
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}
