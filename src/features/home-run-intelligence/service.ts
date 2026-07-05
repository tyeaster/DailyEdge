import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  calculateFairLine,
  formatAmericanOdds,
  formatPercentage,
} from "../../lib/odds.ts";
import type { Pitcher, Player, Team } from "../../models/mlb.ts";
import { calculateExpectedValuePercent } from "../../services/predictions/PredictionEngine.ts";
import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "../../services/daily-slate/types.ts";
import {
  matchupService,
  type MatchupIntelligenceResult,
} from "../../services/matchup/index.ts";
import {
  playerIntelligenceService,
  type BatterIntelligence,
  type PitcherIntelligence,
  type TrendSignal,
} from "../../services/player-intelligence/index.ts";
import { HOME_RUN_INTELLIGENCE_CONFIG } from "./config.ts";

type HomeRunRecommendation = "Elite" | "Strong Play" | "Play" | "Lean" | "Pass";

export interface HomeRunFactor {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  weight: string;
}

export interface HomeRunCandidate {
  batter: Player;
  battingOrder: string;
  confidence: number;
  edgePercent?: number;
  expectedPlateAppearances: string;
  expectedValuePercent?: number;
  explanations: string[];
  factors: HomeRunFactor[];
  fairOdds: number;
  fairOddsDisplay: string;
  game: DailySlateGame;
  hrProbability: number;
  hrProbabilityDisplay: string;
  matchup: {
    overall: number;
    pitch: number;
    zone: number;
  };
  opponent: Team;
  opponentPitcher: Pitcher;
  overallHrScore: number;
  prop?: DailySlateProp;
  recommendation: HomeRunRecommendation;
  sportsbook?: {
    edgeDisplay: string;
    expectedValueDisplay: string;
    impliedProbabilityDisplay: string;
    odds: number;
    oddsDisplay: string;
    sportsbook: string;
  };
  summary: string;
  team: Team;
}

export interface HomeRunIntelligenceViewModel {
  candidates: HomeRunCandidate[];
  context: Array<{ label: string; value: string; meta?: string }>;
  slateMeta: {
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
  };
  topCandidate?: HomeRunCandidate;
}

interface CandidateInput {
  batterIntelligence?: BatterIntelligence;
  matchup: MatchupIntelligenceResult;
  pitcherIntelligence?: PitcherIntelligence;
  selection: CandidateSelection;
}

interface CandidateSelection {
  batter: Player;
  game: DailySlateGame;
  opponent: Team;
  opponentPitcher: Pitcher;
  prop?: DailySlateProp;
  team: Team;
}

export class HomeRunIntelligenceService {
  async getHomeRunIntelligence(): Promise<HomeRunIntelligenceViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();
    const selections = selectCandidates(slate);
    const candidates = await Promise.all(
      selections.map((selection) => this.buildCandidate(selection)),
    );

    return buildHomeRunIntelligenceViewModel(slate, candidates);
  }

  async buildCandidate(selection: CandidateSelection): Promise<HomeRunCandidate> {
    const season = getSeason(selection.game.game.scheduledAt);
    const [batterIntelligence, pitcherIntelligence] = await Promise.all([
      loadBatterIntelligence(selection, season),
      loadPitcherIntelligence(selection, season),
    ]);
    const matchup = await matchupService.getMatchupIntelligence(
      {
        asOfDate: selection.game.game.scheduledAt.slice(0, 10),
        batterIds: [selection.batter.id],
        batterMlbIds: selection.batter.externalIds?.mlb
          ? [selection.batter.externalIds.mlb]
          : undefined,
        batterNames: [selection.batter.fullName],
        pitcherId: selection.opponentPitcher.id,
        pitcherMlbId: selection.opponentPitcher.externalIds?.mlb,
        pitcherName: selection.opponentPitcher.fullName,
        season,
      },
      {
        ballpark: selection.game.game.ballpark,
        bullpen: selection.opponent.strength?.bullpen,
        lineup: selection.team.lineup,
        pitcherIntelligence,
        weather: selection.game.weather,
      },
    );

    return buildHomeRunCandidate({
      batterIntelligence:
        batterIntelligence && "available" in batterIntelligence && batterIntelligence.available
          ? batterIntelligence
          : undefined,
      matchup,
      pitcherIntelligence,
      selection,
    });
  }
}

export const homeRunIntelligenceService = new HomeRunIntelligenceService();

export async function getHomeRunIntelligence() {
  return homeRunIntelligenceService.getHomeRunIntelligence();
}

export function buildHomeRunIntelligenceViewModel(
  slate: DailySlateViewModel,
  candidates: HomeRunCandidate[],
): HomeRunIntelligenceViewModel {
  const sorted = [...candidates].sort(
    (left, right) => right.overallHrScore - left.overallHrScore,
  );

  return {
    candidates: sorted,
    context: [
      {
        label: "Candidates",
        meta: "HR markets and lineup fallbacks",
        value: String(sorted.length),
      },
      {
        label: "Top Score",
        meta: sorted[0]?.batter.fullName ?? "No candidates",
        value: sorted[0] ? `${sorted[0].overallHrScore}/100` : "-",
      },
      {
        label: "Best Edge",
        meta:
          sorted.find((candidate) => candidate.edgePercent !== undefined)?.batter.fullName ??
          "No sportsbook HR odds",
        value: formatSignedPercent(
          Math.max(
            ...sorted
              .map((candidate) => candidate.edgePercent)
              .filter((value): value is number => value !== undefined),
            0,
          ),
        ),
      },
      {
        label: "Data Source",
        meta: "Daily Slate",
        value: slate.dataSource,
      },
    ],
    slateMeta: {
      candidateCount: sorted.length,
      dataSource: slate.dataSource,
      lastUpdated: slate.slateMeta.lastUpdated,
    },
    topCandidate: sorted[0],
  };
}

export function buildHomeRunCandidate({
  batterIntelligence,
  matchup,
  pitcherIntelligence,
  selection,
}: CandidateInput): HomeRunCandidate {
  const scores = calculateHomeRunScores({
    batterIntelligence,
    matchup,
    pitcherIntelligence,
    selection,
  });
  const overallHrScore = weightedScore(scores);
  const hrProbability = calculateHrProbability(overallHrScore, selection.prop);
  const fairOdds = calculateFairLine(hrProbability);
  const sportsbookOdds = selection.prop?.prop.odds.price;
  const sportsbookImpliedProbability =
    sportsbookOdds === undefined
      ? undefined
      : americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent =
    sportsbookImpliedProbability === undefined
      ? undefined
      : calculateEdgePercent(hrProbability, sportsbookImpliedProbability);
  const expectedValuePercent =
    sportsbookOdds === undefined
      ? undefined
      : calculateExpectedValuePercent(hrProbability, sportsbookOdds);
  const confidence = calculateConfidence({
    batterIntelligence,
    edgePercent,
    matchup,
    overallHrScore,
    pitcherIntelligence,
    selection,
  });
  const recommendation = getRecommendation({
    edgePercent,
    overallHrScore,
    sportsbookOdds,
  });
  const factors = buildFactors({ batterIntelligence, matchup, pitcherIntelligence, scores, selection });
  const explanations = buildExplanations({ batterIntelligence, matchup, pitcherIntelligence, scores, selection });

  return {
    batter: selection.batter,
    battingOrder: getBattingOrder(selection.team, selection.batter),
    confidence,
    edgePercent,
    expectedPlateAppearances: estimatePlateAppearances(selection.team),
    expectedValuePercent,
    explanations,
    factors,
    fairOdds,
    fairOddsDisplay: formatAmericanOdds(fairOdds),
    game: selection.game,
    hrProbability,
    hrProbabilityDisplay: formatPercentage(hrProbability * 100),
    matchup: {
      overall: matchup.overallMatchupScore,
      pitch: matchup.pitchTypeMatch.score,
      zone: matchup.zoneMatch.score,
    },
    opponent: selection.opponent,
    opponentPitcher: selection.opponentPitcher,
    overallHrScore,
    prop: selection.prop,
    recommendation,
    sportsbook:
      sportsbookOdds === undefined || sportsbookImpliedProbability === undefined
        ? undefined
        : {
            edgeDisplay: formatSignedPercent(edgePercent ?? 0),
            expectedValueDisplay: formatSignedPercent(expectedValuePercent ?? 0),
            impliedProbabilityDisplay: formatPercentage(sportsbookImpliedProbability * 100),
            odds: sportsbookOdds,
            oddsDisplay: formatAmericanOdds(sportsbookOdds),
            sportsbook: selection.prop?.prop.odds.sportsbook ?? "Market",
          },
    summary: buildSummary({
      edgePercent,
      hrProbability,
      matchup,
      overallHrScore,
      recommendation,
      selection,
    }),
    team: selection.team,
  };
}

function selectCandidates(slate: DailySlateViewModel): CandidateSelection[] {
  const hrProps =
    slate.propCategories.find((category) => category.label === "Home Runs")?.props ?? [];
  const propSelections = hrProps.map((prop) => {
    const game = findGameById(slate, prop.prop.gameId);
    const team = prop.team;
    const opponent = team.id === game.awayTeam.id ? game.homeTeam : game.awayTeam;
    const opponentPitcher =
      team.id === game.awayTeam.id ? game.homePitcher : game.awayPitcher;

    return {
      batter: prop.player as Player,
      game,
      opponent,
      opponentPitcher,
      prop,
      team,
    };
  });

  if (propSelections.length > 0) {
    return propSelections;
  }

  return slate.games
    .flatMap((game) => [buildLineupSelection(game, game.awayTeam), buildLineupSelection(game, game.homeTeam)])
    .filter((selection): selection is CandidateSelection => Boolean(selection))
    .slice(0, 12);
}

function buildLineupSelection(
  game: DailySlateGame,
  team: Team,
): CandidateSelection | undefined {
  const lineupPlayer = team.lineup?.players[0];

  if (!lineupPlayer) {
    return undefined;
  }

  const batter: Player = {
    bats: lineupPlayer.battingHand === "U" ? "R" : lineupPlayer.battingHand,
    externalIds: { mlb: lineupPlayer.mlbId },
    fullName: lineupPlayer.fullName,
    id: `mlb-player-${lineupPlayer.mlbId}`,
    position: lineupPlayer.position,
    teamId: team.id,
    throws: "R",
  };
  const opponent = team.id === game.awayTeam.id ? game.homeTeam : game.awayTeam;
  const opponentPitcher =
    team.id === game.awayTeam.id ? game.homePitcher : game.awayPitcher;

  return {
    batter,
    game,
    opponent,
    opponentPitcher,
    team,
  };
}

async function loadBatterIntelligence(
  selection: CandidateSelection,
  season: number,
) {
  try {
    return await playerIntelligenceService.getBatter({
      batter: selection.batter,
      context: {
        ballpark: selection.game.game.ballpark,
        game: selection.game.game,
        lineup: selection.team.lineup,
        opponent: selection.opponent,
        prediction: selection.game.game.prediction,
        team: selection.team,
        weather: selection.game.weather,
      },
      projectionContext: {
        marketLine: selection.prop?.prop.odds.displayLine,
        modelProjection: selection.prop?.prop.projection,
        prop: selection.prop?.prop,
      },
      season,
    });
  } catch {
    return undefined;
  }
}

async function loadPitcherIntelligence(
  selection: CandidateSelection,
  season: number,
) {
  try {
    return await playerIntelligenceService.getPitcher({
      context: {
        ballpark: selection.game.game.ballpark,
        game: selection.game.game,
        lineup: selection.opponent.lineup,
        opponent: selection.team,
        prediction: selection.game.game.prediction,
        team: selection.opponent,
        weather: selection.game.weather,
      },
      pitcher: selection.opponentPitcher,
      season,
    });
  } catch {
    return undefined;
  }
}

function calculateHomeRunScores({
  batterIntelligence,
  matchup,
  pitcherIntelligence,
  selection,
}: Omit<CandidateInput, "selection"> & { selection: CandidateSelection }) {
  const profile = batterIntelligence?.profile;
  const rolling = batterIntelligence?.rolling;
  const pitcher = selection.opponentPitcher;
  const weather = selection.game.weather;
  const ballpark = selection.game.game.ballpark;
  const lineup = selection.team.lineup;
  const bullpen = selection.opponent.strength?.bullpen;

  return {
    batterPower: average([
      normalizeRange(profile?.barrelPercent, 4, 20),
      normalizeRange(profile?.hardHitPercent, 28, 58),
      normalizeRange(profile?.sweetSpotPercent, 24, 45),
      normalizeRange(profile?.averageExitVelocityMph, 86, 96),
      normalizeIdeal(profile?.averageLaunchAngleDegrees, 18, 10, 34),
      normalizeRange(profile?.flyBallPercent, 24, 52),
      normalizeRange(profile?.pullPercent, 28, 52),
      normalizeRange(profile?.isolatedPower, 0.08, 0.32),
      normalizeRange(profile?.sluggingPercentage, 0.34, 0.62),
      normalizeRange(profile?.onBasePlusSlugging, 0.65, 0.98),
      normalizeRate(rolling?.last10.homeRuns, rolling?.last10.games, 0, 0.35),
      trendScore(batterIntelligence?.trends, ["Power", "Hard Hit", "Total Bases"]),
    ]),
    bullpenOpportunity: average([
      normalizeInverse(bullpen?.value, 35, 80),
      normalizeRange(bullpen?.workloadRating, 35, 85),
      normalizeRange(bullpen?.recentPitches, 60, 210),
      normalizeRange(bullpen?.recentInningsPitched, 5, 18),
    ]),
    environment: average([
      normalizeRange(ballpark?.homeRunFactor, 82, 125),
      selection.batter.bats === "L"
        ? normalizeRange(ballpark?.leftHandedHomeRunFactor, 82, 125)
        : normalizeRange(ballpark?.rightHandedHomeRunFactor, 82, 125),
      normalizeRange(ballpark?.powerFriendlyRating, 35, 85),
      normalizeRange(weather.homeRunEnvironment, 35, 85),
      normalizeRange(weather.runEnvironment, 35, 85),
      normalizeRange(weather.temperatureF, 50, 92),
      normalizeInverse(weather.airDensityKgM3, 1.28, 1.12),
      weather.relativeWindDirection === "Tailwind" ? 82 : weather.relativeWindDirection === "Headwind" ? 35 : 50,
      normalizeRange(weather.windMph, 0, 18),
    ]),
    lineupOpportunity: average([
      normalizeInverse(getBattingOrderNumber(selection.team, selection.batter), 9, 1),
      normalizeRange(lineup?.overallStrength, 35, 85),
      normalizeRange(lineup?.powerRating, 35, 85),
      normalizeRange(lineup?.lineupConfidence, 45, 100),
      normalizeRange(estimatePlateAppearancesNumber(selection.team), 3.6, 4.7),
      selection.batter.bats === "L"
        ? pitcher.throws === "R"
          ? 65
          : 48
        : pitcher.throws === "L"
          ? 65
          : 52,
    ]),
    pitchMatch: average([
      matchup.pitchTypeMatch.score,
      ...matchup.pitchTypeMatch.matches.map((match) => match.expectedDamageMatch),
      ...matchup.pitchTypeMatch.matches.map((match) => match.velocityMatch),
    ]),
    pitcherRisk: average([
      normalizeRange(pitcher.homeRunsPer9, 0.4, 1.8),
      normalizeRange(pitcher.whip, 0.9, 1.45),
      normalizeInverse(pitcher.era, 2.4, 5.2),
      normalizeRange(average(matchup.arsenal.profiles.map((pitch) => pitch.hardHitPercent ?? 40)), 28, 55),
      normalizeInverse(average(matchup.arsenal.profiles.map((pitch) => pitch.groundBallPercent ?? 43)), 55, 28),
      normalizeInverse(pitcherIntelligence?.recentForm.score, 35, 85),
    ]),
    zoneMatch: average([
      matchup.zoneMatch.score,
      ...matchup.zoneMatch.hotZones?.map((zone) => zone.damageRating) ?? [],
      ...matchup.zoneMatch.overlay?.map((cell) => (cell.classification === "risk" ? 75 : cell.classification === "advantage" ? 35 : 50)) ?? [],
    ]),
  };
}

function weightedScore(scores: ReturnType<typeof calculateHomeRunScores>) {
  const weights = HOME_RUN_INTELLIGENCE_CONFIG.scoreWeights;

  return Math.round(
    scores.batterPower * weights.batterPower +
      scores.pitcherRisk * weights.pitcherRisk +
      scores.pitchMatch * weights.pitchMatch +
      scores.zoneMatch * weights.zoneMatch +
      scores.environment * weights.environment +
      scores.lineupOpportunity * weights.lineupOpportunity +
      scores.bullpenOpportunity * weights.bullpenOpportunity,
  );
}

function calculateHrProbability(score: number, prop?: DailySlateProp) {
  const config = HOME_RUN_INTELLIGENCE_CONFIG.probability;
  const scoreProbability = config.startingBase + score * config.scoreMultiplier;
  const propProjection = parsePercentProjection(prop?.prop.projection);
  const probability =
    propProjection === undefined
      ? scoreProbability
      : scoreProbability * 0.65 + propProjection * 0.35;

  return Math.min(config.max, Math.max(config.min, probability));
}

function calculateConfidence({
  batterIntelligence,
  edgePercent,
  matchup,
  overallHrScore,
  pitcherIntelligence,
  selection,
}: {
  batterIntelligence?: BatterIntelligence;
  edgePercent?: number;
  matchup: MatchupIntelligenceResult;
  overallHrScore: number;
  pitcherIntelligence?: PitcherIntelligence;
  selection: CandidateSelection;
}) {
  const weights = HOME_RUN_INTELLIGENCE_CONFIG.confidence;
  const dataQuality = average([
    batterIntelligence ? 78 : 45,
    pitcherIntelligence ? 78 : 45,
    matchup.confidence,
    selection.team.lineup?.lineupConfidence,
    selection.game.weather.weatherConfidence,
    selection.game.game.ballpark?.historicalConfidence,
  ]);
  const edgeScore = edgePercent === undefined ? 50 : normalizeRange(edgePercent, -4, 8);
  const agreement = average([
    overallHrScore,
    matchup.pitchTypeMatch.score,
    matchup.zoneMatch.score,
    selection.game.weather.homeRunEnvironment,
    selection.game.game.ballpark?.powerFriendlyRating,
  ]);

  return Math.round(
    dataQuality * weights.dataQualityWeight +
      edgeScore * weights.edgeWeight +
      agreement * weights.inputAgreementWeight +
      overallHrScore * weights.scoreWeight,
  );
}

function getRecommendation({
  edgePercent,
  overallHrScore,
  sportsbookOdds,
}: {
  edgePercent?: number;
  overallHrScore: number;
  sportsbookOdds?: number;
}): HomeRunRecommendation {
  const thresholds = HOME_RUN_INTELLIGENCE_CONFIG.thresholds;

  if (
    overallHrScore >= thresholds.eliteScore &&
    (edgePercent === undefined || edgePercent >= thresholds.strongEdgePercent)
  ) {
    return "Elite";
  }

  if (
    overallHrScore >= thresholds.strongScore &&
    (edgePercent === undefined || edgePercent >= thresholds.playEdgePercent)
  ) {
    return "Strong Play";
  }

  if (
    sportsbookOdds !== undefined &&
    overallHrScore >= thresholds.playScore &&
    (edgePercent ?? -100) >= thresholds.playEdgePercent
  ) {
    return "Play";
  }

  if (overallHrScore >= thresholds.leanScore) {
    return "Lean";
  }

  return "Pass";
}

function buildFactors({
  batterIntelligence,
  matchup,
  pitcherIntelligence,
  scores,
  selection,
}: {
  batterIntelligence?: BatterIntelligence;
  matchup: MatchupIntelligenceResult;
  pitcherIntelligence?: PitcherIntelligence;
  scores: ReturnType<typeof calculateHomeRunScores>;
  selection: CandidateSelection;
}): HomeRunFactor[] {
  const weights = HOME_RUN_INTELLIGENCE_CONFIG.scoreWeights;
  const profile = batterIntelligence?.profile;
  const pitcher = selection.opponentPitcher;
  const weather = selection.game.weather;
  const ballpark = selection.game.game.ballpark;
  const bullpen = selection.opponent.strength?.bullpen;

  return [
    factor("Batter Power", weights.batterPower, scores.batterPower, "Barrel quality, hard contact, launch profile, and recent power trend.", [
      { label: "Barrel", value: formatNullablePercent(profile?.barrelPercent) },
      { label: "Hard Hit", value: formatNullablePercent(profile?.hardHitPercent) },
      { label: "ISO", value: formatDecimal(profile?.isolatedPower, 3) },
      { label: "Launch Angle", value: formatNumber(profile?.averageLaunchAngleDegrees, 1) },
    ]),
    factor("Pitcher HR Risk", weights.pitcherRisk, scores.pitcherRisk, "Pitcher contact profile and recent form influence long-ball risk.", [
      { label: "HR/9", value: formatNumber(pitcher.homeRunsPer9, 2) },
      { label: "WHIP", value: formatNumber(pitcher.whip, 2) },
      { label: "Recent Form", value: pitcherIntelligence ? `${pitcherIntelligence.recentForm.score}/100` : "-" },
      { label: "Hard Hit Allowed", value: formatNullablePercent(average(matchup.arsenal.profiles.map((pitch) => pitch.hardHitPercent ?? 40))) },
    ]),
    factor("Pitch Match", weights.pitchMatch, scores.pitchMatch, matchup.pitchTypeMatch.explanation, [
      { label: "Pitch Match", value: `${matchup.pitchTypeMatch.score}/100` },
      { label: "Top Pitch", value: matchup.pitchTypeMatch.matches[0]?.pitchName ?? "-" },
      { label: "Velocity Match", value: `${Math.round(average(matchup.pitchTypeMatch.matches.map((match) => match.velocityMatch)))}/100` },
    ]),
    factor("Zone Match", weights.zoneMatch, scores.zoneMatch, matchup.zoneMatch.reasons[0] ?? "Zone matchup is neutral.", [
      { label: "Zone Match", value: `${matchup.zoneMatch.score}/100` },
      { label: "Hot Zones", value: String(matchup.zoneMatch.hotZones?.length ?? 0) },
      { label: "Risk Cells", value: String(matchup.zoneMatch.overlay?.filter((cell) => cell.classification === "risk").length ?? 0) },
    ]),
    factor("Environment", weights.environment, scores.environment, "Park dimensions, air, wind, roof, and run environment shape HR probability.", [
      { label: "HR Factor", value: formatRating(ballpark?.homeRunFactor) },
      { label: "Power Rating", value: formatRating(ballpark?.powerFriendlyRating) },
      { label: "Weather HR", value: formatRating(weather.homeRunEnvironment) },
      { label: "Wind", value: `${Math.round(weather.windMph ?? 0)} MPH ${weather.relativeWindDirection}` },
    ]),
    factor("Lineup Opportunity", weights.lineupOpportunity, scores.lineupOpportunity, "Batting order, lineup quality, handedness, and plate appearances affect opportunity.", [
      { label: "Order", value: getBattingOrder(selection.team, selection.batter) },
      { label: "Expected PA", value: estimatePlateAppearances(selection.team) },
      { label: "Lineup Status", value: selection.team.lineup?.status ?? "-" },
      { label: "Handedness", value: `${selection.batter.bats} vs ${selection.opponentPitcher.throws}` },
    ]),
    factor("Bullpen Opportunity", weights.bullpenOpportunity, scores.bullpenOpportunity, "Fatigued or lower-rated bullpens can increase late-game HR opportunity.", [
      { label: "Bullpen Rating", value: formatRating(bullpen?.value) },
      { label: "Workload", value: formatRating(bullpen?.workloadRating) },
      { label: "Recent Pitches", value: formatRating(bullpen?.recentPitches) },
    ]),
  ];
}

function factor(
  label: string,
  weight: number,
  score: number,
  explanation: string,
  details: Array<{ label: string; value: string }>,
): HomeRunFactor {
  return {
    details,
    explanation,
    label,
    score: Math.round(score),
    weight: `${Math.round(weight * 100)}%`,
  };
}

function buildExplanations({
  batterIntelligence,
  matchup,
  scores,
  selection,
}: {
  batterIntelligence?: BatterIntelligence;
  matchup: MatchupIntelligenceResult;
  pitcherIntelligence?: PitcherIntelligence;
  scores: ReturnType<typeof calculateHomeRunScores>;
  selection: CandidateSelection;
}) {
  const explanations: string[] = [];
  const profile = batterIntelligence?.profile;

  if ((profile?.barrelPercent ?? 0) >= 10) explanations.push("Elite barrel profile");
  if ((profile?.hardHitPercent ?? 0) >= 45) explanations.push("Strong hard-contact foundation");
  if ((profile?.pullPercent ?? 0) >= 42) explanations.push("Strong pull-side power");
  if (selection.game.weather.relativeWindDirection === "Tailwind") explanations.push("Wind supports carry");
  if ((selection.game.game.ballpark?.powerFriendlyRating ?? 50) >= 60) explanations.push("Ballpark boosts power");
  if ((selection.opponentPitcher.homeRunsPer9 ?? 0) >= 1.1) explanations.push("Pitcher allows elevated home-run contact");
  if (matchup.pitchTypeMatch.score >= 62) explanations.push("Pitch-type match favors hitter");
  if (matchup.zoneMatch.score >= 62) explanations.push("Zone Match favors hitter");
  if (scores.bullpenOpportunity >= 62) explanations.push("Bullpen fatigue increases late-game HR chance");

  return [...explanations, ...matchup.reasons].slice(0, 8);
}

function buildSummary({
  edgePercent,
  hrProbability,
  matchup,
  overallHrScore,
  recommendation,
  selection,
}: {
  edgePercent?: number;
  hrProbability: number;
  matchup: MatchupIntelligenceResult;
  overallHrScore: number;
  recommendation: HomeRunRecommendation;
  selection: CandidateSelection;
}) {
  const edgeText =
    edgePercent === undefined
      ? "No sportsbook HR price is currently available"
      : `The sportsbook edge is ${formatSignedPercent(edgePercent)}`;

  return `${selection.batter.fullName} grades ${overallHrScore}/100 for home run opportunity against ${selection.opponentPitcher.fullName}. TrueLine estimates ${formatPercentage(hrProbability * 100)} HR probability with Pitch Match ${matchup.pitchTypeMatch.score}/100 and Zone Match ${matchup.zoneMatch.score}/100. ${edgeText}, producing a ${recommendation} recommendation.`;
}

function findGameById(slate: DailySlateViewModel, gameId: string) {
  return slate.games.find((game) => game.game.id === gameId) ?? slate.games[0];
}

function getSeason(scheduledAt: string) {
  return new Date(scheduledAt).getUTCFullYear();
}

function getBattingOrder(team: Team, batter: Player) {
  const order = getBattingOrderNumber(team, batter);

  return order ? String(order) : "Projected";
}

function getBattingOrderNumber(team: Team, batter: Player) {
  const mlbId = batter.externalIds?.mlb;
  const lineupPlayer = team.lineup?.players.find(
    (player) =>
      (mlbId && player.mlbId === mlbId) ||
      player.fullName.toLowerCase() === batter.fullName.toLowerCase(),
  );

  return lineupPlayer?.battingOrder;
}

function estimatePlateAppearances(team: Team) {
  return estimatePlateAppearancesNumber(team).toFixed(1);
}

function estimatePlateAppearancesNumber(team: Team) {
  const strength = team.lineup?.overallStrength ?? 50;

  return 4.1 + (strength - 50) / 100;
}

function parsePercentProjection(projection?: string) {
  if (!projection?.includes("%")) {
    return undefined;
  }

  const parsed = Number.parseFloat(projection);

  return Number.isFinite(parsed) ? parsed / 100 : undefined;
}

function trendScore(trends: TrendSignal[] | undefined, labels: string[]) {
  if (!trends?.length) {
    return 50;
  }

  const relevant = trends.filter((trend) =>
    labels.some((label) => trend.label.toLowerCase().includes(label.toLowerCase())),
  );

  if (relevant.length === 0) {
    return 50;
  }

  return average(
    relevant.map((trend) =>
      trend.direction === "up"
        ? trend.strength === "strong"
          ? 80
          : 65
        : trend.direction === "down"
          ? 35
          : 50,
    ),
  );
}

function normalizeRate(
  numerator: number | undefined,
  denominator: number | undefined,
  low: number,
  high: number,
) {
  if (!denominator) {
    return 50;
  }

  return normalizeRange((numerator ?? 0) / denominator, low, high);
}

function normalizeRange(value: number | null | undefined, low: number, high: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 50;
  }

  return clamp(((value - low) / (high - low)) * 100);
}

function normalizeInverse(value: number | null | undefined, low: number, high: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 50;
  }

  return 100 - normalizeRange(value, low, high);
}

function normalizeIdeal(
  value: number | null | undefined,
  ideal: number,
  low: number,
  high: number,
) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 50;
  }

  const distance = Math.abs(value - ideal);
  const maxDistance = Math.max(Math.abs(low - ideal), Math.abs(high - ideal));

  return clamp(100 - (distance / maxDistance) * 100);
}

function average(values: Array<number | undefined>) {
  const valid = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  );

  return valid.length === 0
    ? 50
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatNullablePercent(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${Math.round(value)}%`;
}

function formatNumber(value: number | null | undefined, digits: number) {
  return value === undefined || value === null ? "-" : value.toFixed(digits);
}

function formatDecimal(value: number | null | undefined, digits: number) {
  return value === undefined || value === null ? "-" : value.toFixed(digits);
}

function formatRating(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : String(Math.round(value));
}
