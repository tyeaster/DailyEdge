import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "../../services/daily-slate/types.ts";
import type { Pitcher, Player, Team } from "../../models/mlb.ts";
import type {
  MatchupIntelligenceResult,
  PitchTypeMatch,
} from "../../services/matchup/index.ts";
import { matchupService } from "../../services/matchup/index.ts";
import {
  playerIntelligenceService,
  type BatterGameLog,
  type BatterIntelligence,
  type TrendSignal,
} from "../../services/player-intelligence/index.ts";
import type { RollingBatterStats } from "../../services/player-intelligence/types.ts";
import { buildMockBatterLogs } from "../../providers/player-intelligence/index.ts";

type HitterRecommendation = "Over" | "Lean Over" | "Pass" | "Lean Under" | "Under";

export interface HitterRecentGame {
  atBats: number;
  date: string;
  hits: number;
  opponent: string;
  overHitLine: boolean;
  overTotalBaseLine: boolean;
  plateAppearances: number;
  strikeouts: number;
  totalBases: number;
  walks: number;
}

export interface HitterResearchBreakdown {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  reasons: string[];
  score: number;
}

export interface HitterResearchFactor {
  details?: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  stars: number;
  weight: string;
}

export interface HitterResearchViewModel {
  batter: Player;
  ballpark: {
    hitterFriendly: string;
    name: string;
    powerFriendly: string;
    runEnvironment: string;
  };
  confidence: number;
  context: Array<{ label: string; value: string; meta?: string }>;
  dataConfidence: number;
  edge: string;
  factors: HitterResearchFactor[];
  game: DailySlateGame;
  gameTime: string;
  hitLine: number;
  hitProjection: number;
  hitProp?: DailySlateProp;
  matchup: {
    arsenal: Array<{
      groundBall: string;
      hardHitAllowed: string;
      pitchName: string;
      score: number;
      strike: string;
      usage: string;
      velocity: string;
      whiff: string;
    }>;
    breakdowns: {
      overall: HitterResearchBreakdown;
      pitchMatch: HitterResearchBreakdown;
      zoneMatch: HitterResearchBreakdown;
    };
    confidence: number;
    overallScore: number;
    pitchMatchScore: number;
    reasons: string[];
    source: string;
    zoneMatchScore: number;
  };
  modelExplanation: string;
  opponent: Team;
  opposingPitcher: Pitcher;
  overview: {
    confidence: string;
    edge: string;
    hitLine: string;
    matchupScore: string;
    projection: string;
    recommendation: HitterRecommendation;
    sportsbook: string;
    sportsbookOdds: string;
    totalBaseLine: string;
  };
  recentGames: HitterRecentGame[];
  rolling: Array<{
    average: string;
    barrelPercent: string;
    hardHitPercent: string;
    hits: string;
    label: string;
    onBasePlusSlugging: string;
    strikeoutPercent: string;
    totalBases: string;
    walkPercent: string;
  }>;
  team: Team;
  totalBaseLine: number;
  totalBaseProjection: number;
  totalBaseProp?: DailySlateProp;
  trends: TrendSignal[];
  weather: {
    runEnvironment: string;
    summary: string;
    temperature: string;
    wind: string;
  };
}

export async function getHitterResearch(
  batterId?: string,
): Promise<HitterResearchViewModel> {
  const { getDailySlate } = await import("../../services/daily-slate/service.ts");
  const slate = await getDailySlate();
  const base = buildHitterResearchViewModel(slate, batterId);
  const [batterIntelligence, matchupIntelligence] = await Promise.all([
    loadBatterIntelligence(base),
    loadMatchupIntelligence(base),
  ]);

  return buildHitterResearchViewModel(slate, batterId, {
    batterIntelligence: batterIntelligence?.available ? batterIntelligence : undefined,
    matchupIntelligence,
  });
}

export function buildHitterResearchViewModel(
  slate: DailySlateViewModel,
  batterId?: string,
  intelligence: {
    batterIntelligence?: BatterIntelligence;
    matchupIntelligence?: MatchupIntelligenceResult;
  } = {},
): HitterResearchViewModel {
  const hitProps = getProps(slate, "Hits");
  const totalBaseProps = getProps(slate, "Total Bases");
  const selectedProp =
    hitProps.find((prop) => prop.player.id === batterId) ??
    totalBaseProps.find((prop) => prop.player.id === batterId) ??
    hitProps[0] ??
    totalBaseProps[0];
  const selection = selectBatter({
    batterId,
    hitProps,
    slate,
    totalBaseProps,
  });
  const batter = selection.batter;
  const game = selection.game;
  const team = selection.team;
  const opponent = team.id === game.awayTeam.id ? game.homeTeam : game.awayTeam;
  const opposingPitcher =
    team.id === game.awayTeam.id ? game.homePitcher : game.awayPitcher;
  const hitProp =
    selectedProp?.player.id === batter.id && selectedProp.prop.category === "Hits"
      ? selectedProp
      : hitProps.find((prop) => prop.player.id === batter.id);
  const totalBaseProp =
    selectedProp?.player.id === batter.id &&
    selectedProp.prop.category === "Total Bases"
      ? selectedProp
      : totalBaseProps.find((prop) => prop.player.id === batter.id);
  const hitLine = hitProp?.prop.odds.line ?? 0.5;
  const totalBaseLine = totalBaseProp?.prop.odds.line ?? 1.5;
  const hitProjection =
    parseProjection(hitProp?.prop.projection) ??
    estimateHitProjection(intelligence.batterIntelligence, intelligence.matchupIntelligence);
  const totalBaseProjection =
    parseProjection(totalBaseProp?.prop.projection) ??
    estimateTotalBaseProjection(
      intelligence.batterIntelligence,
      intelligence.matchupIntelligence,
    );
  const primaryProjection = totalBaseProp ? totalBaseProjection : hitProjection;
  const primaryLine = totalBaseProp ? totalBaseLine : hitLine;
  const edgeValue = primaryProjection - primaryLine;
  const confidence = Math.round(
    average([
      hitProp?.prop.confidence.value,
      totalBaseProp?.prop.confidence.value,
      intelligence.batterIntelligence?.recentForm.score,
      intelligence.matchupIntelligence?.confidence,
      game.game.prediction?.dataQuality.score,
    ]),
  );
  const recentGames = buildRecentGames({
    batterIntelligence: intelligence.batterIntelligence,
    hitLine,
    totalBaseLine,
  });
  const matchup = buildMatchupSummary(intelligence.matchupIntelligence);
  const rolling = buildRollingSummary(intelligence.batterIntelligence);
  const recommendation = getRecommendation(edgeValue, confidence);
  const factors = buildFactors({
    batterIntelligence: intelligence.batterIntelligence,
    game,
    matchup,
    opponent,
    recentGames,
    team,
  });

  return {
    batter,
    ballpark: {
      hitterFriendly: formatRating(game.game.ballpark?.hitterFriendlyRating),
      name: game.game.ballpark?.name ?? game.game.venue,
      powerFriendly: formatRating(game.game.ballpark?.powerFriendlyRating),
      runEnvironment: formatEnvironment(game.game.ballpark?.overallParkRating ?? 50),
    },
    confidence,
    context: buildContext({
      batter,
      game,
      opponent,
      team,
    }),
    dataConfidence: Math.round(
      average([
        confidence,
        intelligence.batterIntelligence?.recentForm.score,
        intelligence.matchupIntelligence?.confidence,
      ]),
    ),
    edge: formatSigned(edgeValue),
    factors,
    game,
    gameTime: formatGameTime(game.game.scheduledAt),
    hitLine,
    hitProjection,
    hitProp,
    matchup,
    modelExplanation: buildModelExplanation({
      batter,
      edge: edgeValue,
      game,
      hitProjection,
      matchup,
      opposingPitcher,
      recommendation,
      totalBaseProjection,
    }),
    opponent,
    opposingPitcher,
    overview: {
      confidence: `${confidence}%`,
      edge: formatSigned(edgeValue),
      hitLine: hitProp?.prop.odds.displayLine ?? `Over ${hitLine.toFixed(1)}`,
      matchupScore: `${matchup.overallScore}/100`,
      projection: `${hitProjection.toFixed(2)} H / ${totalBaseProjection.toFixed(1)} TB`,
      recommendation,
      sportsbook:
        totalBaseProp?.prop.odds.sportsbook ??
        hitProp?.prop.odds.sportsbook ??
        "Current market",
      sportsbookOdds: formatAmericanOdds(
        totalBaseProp?.prop.odds.price ?? hitProp?.prop.odds.price,
      ),
      totalBaseLine:
        totalBaseProp?.prop.odds.displayLine ?? `Over ${totalBaseLine.toFixed(1)}`,
    },
    recentGames,
    rolling,
    team,
    totalBaseLine,
    totalBaseProjection,
    totalBaseProp,
    trends: intelligence.batterIntelligence?.trends ?? [],
    weather: {
      runEnvironment: formatEnvironment(game.weather.runEnvironment),
      summary: game.weather.summary,
      temperature: game.weather.weatherApplicable
        ? `${Math.round(game.weather.temperatureF)}°F`
        : "Indoor",
      wind: game.weather.weatherApplicable
        ? `${Math.round(game.weather.windMph)} MPH ${game.weather.relativeWindDirection}`
        : "Not Applicable",
    },
  };
}

async function loadBatterIntelligence({
  batter,
  game,
  hitProp,
  opponent,
  overview,
  team,
}: HitterResearchViewModel) {
  try {
    return await playerIntelligenceService.getBatter({
      batter,
      context: {
        ballpark: game.game.ballpark,
        game: game.game,
        lineup: team.lineup,
        opponent,
        prediction: game.game.prediction,
        team,
        weather: game.weather,
      },
      fallbackGameLogs: buildMockBatterLogs(),
      projectionContext: {
        marketLine: overview.hitLine,
        modelProjection: overview.projection,
        prop: hitProp?.prop,
      },
      season: getSeason(game.game.scheduledAt),
    });
  } catch {
    return undefined;
  }
}

async function loadMatchupIntelligence({
  batter,
  game,
  opposingPitcher,
  opponent,
  team,
}: HitterResearchViewModel) {
  try {
    return await matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: [batter.id],
        batterMlbIds: batter.externalIds?.mlb ? [batter.externalIds.mlb] : undefined,
        batterNames: [batter.fullName],
        pitcherId: opposingPitcher.id,
        pitcherMlbId: opposingPitcher.externalIds?.mlb,
        pitcherName: opposingPitcher.fullName,
        season: getSeason(game.game.scheduledAt),
      },
      {
        ballpark: game.game.ballpark,
        bullpen: opponent.strength?.bullpen,
        lineup: team.lineup,
        weather: game.weather,
      },
    );
  } catch {
    return undefined;
  }
}

function selectBatter({
  batterId,
  hitProps,
  slate,
  totalBaseProps,
}: {
  batterId?: string;
  hitProps: DailySlateProp[];
  slate: DailySlateViewModel;
  totalBaseProps: DailySlateProp[];
}) {
  const prop =
    hitProps.find((candidate) => candidate.player.id === batterId) ??
    totalBaseProps.find((candidate) => candidate.player.id === batterId) ??
    hitProps[0] ??
    totalBaseProps[0];

  if (prop) {
    const game = findGameById(slate, prop.prop.gameId);
    const team = prop.team;

    return {
      batter: prop.player as Player,
      game,
      team,
    };
  }

  const game = slate.games[0];
  const team = game.awayTeam.lineup?.players[0] ? game.awayTeam : game.homeTeam;
  const lineupPlayer = team.lineup?.players[0];

  const fallbackBatter: Player = lineupPlayer
    ? {
        bats: lineupPlayer.battingHand === "U" ? "R" : lineupPlayer.battingHand,
        externalIds: { mlb: lineupPlayer.mlbId },
        fullName: lineupPlayer.fullName,
        id: `mlb-player-${lineupPlayer.mlbId}`,
        position: lineupPlayer.position,
        teamId: team.id,
        throws: "R",
      }
    : {
        bats: "R",
        fullName: "Projected Hitter",
        id: "projected-hitter",
        position: "DH",
        teamId: team.id,
        throws: "R",
      };

  return {
    batter: fallbackBatter,
    game,
    team,
  };
}

function getProps(slate: DailySlateViewModel, label: "Hits" | "Total Bases") {
  return slate.propCategories.find((category) => category.label === label)?.props ?? [];
}

function findGameById(slate: DailySlateViewModel, gameId: string) {
  return slate.games.find((game) => game.game.id === gameId) ?? slate.games[0];
}

function buildRecentGames({
  batterIntelligence,
  hitLine,
  totalBaseLine,
}: {
  batterIntelligence?: BatterIntelligence;
  hitLine: number;
  totalBaseLine: number;
}): HitterRecentGame[] {
  const logs = batterIntelligence?.gameLogs.slice(0, 10) ?? buildMockBatterLogs().slice(0, 10);

  return logs.map((log) => buildRecentGame(log, hitLine, totalBaseLine));
}

function buildRecentGame(
  log: BatterGameLog,
  hitLine: number,
  totalBaseLine: number,
): HitterRecentGame {
  return {
    atBats: log.atBats,
    date: formatDate(log.date),
    hits: log.hits,
    opponent: log.opponent,
    overHitLine: log.hits > hitLine,
    overTotalBaseLine: log.totalBases > totalBaseLine,
    plateAppearances: log.plateAppearances,
    strikeouts: log.strikeouts,
    totalBases: log.totalBases,
    walks: log.walks,
  };
}

function buildRollingSummary(batterIntelligence?: BatterIntelligence) {
  const rolling = batterIntelligence?.rolling;

  return [
    rollingRow("Last 3", rolling?.last3),
    rollingRow("Last 5", rolling?.last5),
    rollingRow("Last 10", rolling?.last10),
    rollingRow("Season", rolling?.season),
  ];
}

function rollingRow(label: string, stats?: RollingBatterStats) {
  return {
    average: formatDecimal(stats?.battingAverage, 3),
    barrelPercent: formatPercent(stats?.barrelPercent),
    hardHitPercent: formatPercent(stats?.hardHitPercent),
    hits: stats ? String(stats.hits) : "0",
    label,
    onBasePlusSlugging: formatDecimal(stats?.onBasePlusSlugging, 3),
    strikeoutPercent: formatPercent(stats?.strikeoutPercent),
    totalBases: stats ? String(stats.totalBases) : "0",
    walkPercent: formatPercent(stats?.walkPercent),
  };
}

function buildMatchupSummary(
  matchupIntelligence?: MatchupIntelligenceResult,
): HitterResearchViewModel["matchup"] {
  const pitchMatches = matchupIntelligence?.pitchTypeMatch.matches ?? [];
  const arsenal =
    matchupIntelligence?.arsenal.profiles.map((profile) => ({
      groundBall: formatPercent(profile.groundBallPercent),
      hardHitAllowed: formatPercent(profile.hardHitPercent),
      pitchName: profile.pitchName,
      score: getPitchScore(profile.pitchType, pitchMatches),
      strike: formatPercent(profile.strikePercent),
      usage: formatPercent(profile.usagePercent),
      velocity: formatOptional(profile.averageVelocityMph, 1),
      whiff: formatPercent(profile.whiffPercent),
    })) ?? [];

  return {
    arsenal,
    breakdowns: {
      overall: {
        details: [
          { label: "Pitch Match", value: formatRating(matchupIntelligence?.pitchTypeMatch.score) },
          { label: "Zone Match", value: formatRating(matchupIntelligence?.zoneMatch.score) },
          { label: "Recent Match", value: formatRating(matchupIntelligence?.recentMatchup.score) },
          { label: "Confidence", value: formatRating(matchupIntelligence?.confidence) },
        ],
        explanation:
          matchupIntelligence?.reasons[0] ?? "Overall matchup profile is neutral.",
        label: "Overall Match",
        reasons: matchupIntelligence?.reasons ?? ["Overall matchup profile is neutral."],
        score: matchupIntelligence?.overallMatchupScore ?? 50,
      },
      pitchMatch: {
        details: pitchMatches.slice(0, 5).map((match) => ({
          label: match.pitchName,
          value: `${match.score}/100 · ${formatPercent(match.usagePercent)} usage`,
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
    overallScore: matchupIntelligence?.overallMatchupScore ?? 50,
    pitchMatchScore: matchupIntelligence?.pitchTypeMatch.score ?? 50,
    reasons: matchupIntelligence?.reasons ?? ["Overall matchup profile is neutral."],
    source: matchupIntelligence?.arsenal.source ?? "unavailable",
    zoneMatchScore: matchupIntelligence?.zoneMatch.score ?? 50,
  };
}

function buildFactors({
  batterIntelligence,
  game,
  matchup,
  opponent,
  recentGames,
  team,
}: {
  batterIntelligence?: BatterIntelligence;
  game: DailySlateGame;
  matchup: HitterResearchViewModel["matchup"];
  opponent: Team;
  recentGames: HitterRecentGame[];
  team: Team;
}): HitterResearchFactor[] {
  const hitRate =
    recentGames.filter((gameLog) => gameLog.overHitLine).length /
    Math.max(1, recentGames.length);
  const totalBaseRate =
    recentGames.filter((gameLog) => gameLog.overTotalBaseLine).length /
    Math.max(1, recentGames.length);
  const recentScore =
    batterIntelligence?.recentForm.score ??
    Math.round(((hitRate + totalBaseRate) / 2) * 100);
  const hardContactScore = normalizeRange(
    batterIntelligence?.profile.hardHitPercent ?? 35,
    20,
    55,
  );
  const parkScore = game.game.ballpark?.hitterFriendlyRating ?? 50;
  const bullpenScore =
    100 - (opponent.strength?.bullpen.workloadRating ?? opponent.strength?.bullpen.value ?? 50);
  const lineupScore = team.lineup?.overallStrength ?? 50;

  return [
    factor("Overall Match", "24%", matchup.overallScore, matchup.reasons[0] ?? "Overall matchup profile is neutral.", [
      { label: "Pitch Match", value: `${matchup.pitchMatchScore}/100` },
      { label: "Zone Match", value: `${matchup.zoneMatchScore}/100` },
      { label: "Confidence", value: `${matchup.confidence}%` },
    ]),
    factor("Recent Form", "20%", recentScore, batterIntelligence?.recentForm.explanation ?? "Recent batter form is unavailable.", [
      { label: "Last 10 Hit Overs", value: `${Math.round(hitRate * 100)}%` },
      { label: "Last 10 TB Overs", value: `${Math.round(totalBaseRate * 100)}%` },
      { label: "Consistency", value: formatRating(batterIntelligence?.consistency.consistencyScore) },
    ]),
    factor("Hard Contact", "16%", hardContactScore, "Quality of contact drives hit and total-base upside.", [
      { label: "Hard Hit", value: formatPercent(batterIntelligence?.profile.hardHitPercent) },
      { label: "Barrel", value: formatPercent(batterIntelligence?.profile.barrelPercent) },
      { label: "Avg EV", value: formatOptional(batterIntelligence?.profile.averageExitVelocityMph, 1) },
    ]),
    factor("Pitch Arsenal", "14%", matchup.pitchMatchScore, matchup.breakdowns.pitchMatch.explanation, matchup.breakdowns.pitchMatch.details),
    factor("Run Environment", "10%", Math.round(average([parkScore, game.weather.runEnvironment])), `${game.game.venue} and game weather shape hit probability.`, [
      { label: "Park", value: formatRating(parkScore) },
      { label: "Weather", value: formatRating(game.weather.runEnvironment) },
      { label: "Wind", value: game.weather.relativeWindDirection },
    ]),
    factor("Bullpen", "8%", bullpenScore, "Opponent bullpen quality affects later plate appearances.", [
      { label: "Opponent bullpen", value: formatRating(opponent.strength?.bullpen.value) },
      { label: "Workload", value: formatRating(opponent.strength?.bullpen.workloadRating) },
    ]),
    factor("Lineup Context", "8%", lineupScore, "Lineup quality and protection support plate appearances and run-scoring context.", [
      { label: "Lineup strength", value: formatRating(team.lineup?.overallStrength) },
      { label: "Lineup status", value: capitalize(team.lineup?.status ?? "unavailable") },
      { label: "Expected PA", value: estimatePlateAppearances(team) },
    ]),
  ];
}

function factor(
  label: string,
  weight: string,
  score: number,
  explanation: string,
  details: Array<{ label: string; value: string }> = [],
): HitterResearchFactor {
  return {
    details,
    explanation,
    label,
    score: Math.round(score),
    stars: Math.max(1, Math.min(5, Math.round(score / 20))),
    weight,
  };
}

function buildContext({
  batter,
  game,
  opponent,
  team,
}: {
  batter: Player;
  game: DailySlateGame;
  opponent: Team;
  team: Team;
}) {
  return [
    { label: "Weather", value: game.weather.summary },
    {
      label: "Wind",
      value: game.weather.weatherApplicable
        ? `${Math.round(game.weather.windMph)} MPH ${game.weather.relativeWindDirection}`
        : "Not Applicable",
    },
    {
      label: "Temperature",
      value: game.weather.weatherApplicable
        ? `${Math.round(game.weather.temperatureF)}F`
        : "Indoor",
    },
    {
      label: "Ballpark",
      meta: `Power ${formatRating(game.game.ballpark?.powerFriendlyRating)}`,
      value: game.game.ballpark?.name ?? game.game.venue,
    },
    {
      label: "Bullpen",
      meta: "Opponent relief context",
      value: formatRating(opponent.strength?.bullpen.value),
    },
    {
      label: "Lineup Quality",
      meta: capitalize(team.lineup?.status ?? "unavailable"),
      value: formatRating(team.lineup?.overallStrength),
    },
    {
      label: "Protection",
      value: getProtectionLabel(team, batter.id),
    },
    {
      label: "Expected PA",
      value: estimatePlateAppearances(team),
    },
  ];
}

function buildModelExplanation({
  batter,
  edge,
  game,
  hitProjection,
  matchup,
  opposingPitcher,
  recommendation,
  totalBaseProjection,
}: {
  batter: Player;
  edge: number;
  game: DailySlateGame;
  hitProjection: number;
  matchup: HitterResearchViewModel["matchup"];
  opposingPitcher: Pitcher;
  recommendation: HitterRecommendation;
  totalBaseProjection: number;
}) {
  const reasons = matchup.reasons.slice(0, 3).join(" ");

  return `TrueLine projects ${hitProjection.toFixed(2)} hits and ${totalBaseProjection.toFixed(1)} total bases for ${batter.fullName} against ${opposingPitcher.fullName}, creating a ${formatSigned(edge)} edge and a ${recommendation} recommendation. Overall Match grades ${matchup.overallScore}/100 with Pitch Match ${matchup.pitchMatchScore}/100 and Zone Match ${matchup.zoneMatchScore}/100. ${reasons} Context: ${game.weather.summary} at ${game.game.venue}.`;
}

function estimateHitProjection(
  batterIntelligence?: BatterIntelligence,
  matchupIntelligence?: MatchupIntelligenceResult,
) {
  const recentHits =
    batterIntelligence?.rolling.last5.hits && batterIntelligence.rolling.last5.games
      ? batterIntelligence.rolling.last5.hits / batterIntelligence.rolling.last5.games
      : 0.9;
  const matchupAdjustment = ((matchupIntelligence?.overallMatchupScore ?? 50) - 50) / 100;

  return roundToTenth(Math.max(0.2, recentHits + matchupAdjustment));
}

function estimateTotalBaseProjection(
  batterIntelligence?: BatterIntelligence,
  matchupIntelligence?: MatchupIntelligenceResult,
) {
  const recentTotalBases =
    batterIntelligence?.rolling.last5.totalBases && batterIntelligence.rolling.last5.games
      ? batterIntelligence.rolling.last5.totalBases /
        batterIntelligence.rolling.last5.games
      : 1.4;
  const matchupAdjustment = ((matchupIntelligence?.overallMatchupScore ?? 50) - 50) / 60;

  return roundToTenth(Math.max(0.3, recentTotalBases + matchupAdjustment));
}

function getPitchScore(pitchType: string, matches: PitchTypeMatch[]) {
  return matches.find((match) => match.pitchType === pitchType)?.score ?? 50;
}

function getProtectionLabel(team: Team, batterId: string) {
  const lineup = team.lineup?.players ?? [];
  const index = lineup.findIndex((player) => `mlb-player-${player.mlbId}` === batterId);
  const nearby = index >= 0 ? lineup.slice(Math.max(0, index - 1), index + 2) : lineup.slice(0, 3);
  const averageOps = average(nearby.map((player) => player.ops * 100));

  if (averageOps >= 80) return "Strong";
  if (averageOps >= 70) return "Solid";
  return "Neutral";
}

function estimatePlateAppearances(team: Team) {
  const strength = team.lineup?.overallStrength ?? 50;
  const estimate = 4.1 + (strength - 50) / 100;

  return estimate.toFixed(1);
}

function getRecommendation(edge: number, confidence: number): HitterRecommendation {
  if (edge >= 0.55 && confidence >= 75) return "Over";
  if (edge >= 0.2) return "Lean Over";
  if (edge <= -0.55 && confidence >= 75) return "Under";
  if (edge <= -0.2) return "Lean Under";
  return "Pass";
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

function formatRating(value: number | undefined) {
  return value === undefined || Number.isNaN(value) ? "—" : String(Math.round(value));
}

function formatOptional(value: number | null | undefined, digits: number) {
  return value === undefined || value === null ? "—" : value.toFixed(digits);
}

function formatPercent(value: number | null | undefined) {
  return value === undefined || value === null ? "—" : `${Math.round(value)}%`;
}

function formatDecimal(value: number | undefined, digits: number) {
  return value === undefined ? "—" : value.toFixed(digits);
}

function formatAmericanOdds(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }

  return value > 0 ? `+${value}` : String(value);
}

function formatEnvironment(value: number) {
  const difference = Math.round(value - 50);

  return `${difference >= 0 ? "+" : ""}${difference}`;
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: Array<number | undefined>) {
  const valid = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  );

  return valid.length === 0
    ? 50
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}

function normalizeRange(value: number, low: number, high: number) {
  return Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
}
