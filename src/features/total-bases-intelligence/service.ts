import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type { Pitcher, Player, Team } from "../../models/mlb.ts";
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
import { calculateExpectedValuePercent } from "../../services/predictions/PredictionEngine.ts";
import {
  RankingEngineService,
  type BetCandidate,
  type RankedBetCandidate,
} from "../../services/ranking/index.ts";
import { TOTAL_BASES_INTELLIGENCE_CONFIG } from "./config.ts";

type TotalBasesRecommendation = "Elite" | "Strong Play" | "Play" | "Lean" | "Pass";

export interface TotalBasesFactor {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  weight: string;
}

export interface TotalBasesCandidate {
  batter: Player;
  battingOrder: string;
  confidence: number;
  edgePercent: number;
  edgePercentDisplay: string;
  expectedPlateAppearances: string;
  expectedValueDisplay: string;
  expectedValuePercent: number;
  factors: TotalBasesFactor[];
  fairLine: number;
  fairLineDisplay: string;
  game: DailySlateGame;
  gameGrade: number;
  matchup: {
    overall: number;
    pitch: number;
    zone: number;
  };
  opponent: Team;
  opponentPitcher: Pitcher;
  playerIntelligence: {
    average: string;
    barrelPercent: string;
    hardHitPercent: string;
    ops: string;
    recentForm: number;
    slugging: string;
  };
  projectedTotalBases: number;
  projectedTotalBasesDisplay: string;
  prop?: DailySlateProp;
  ranked?: RankedBetCandidate;
  reasons: string[];
  recommendation: TotalBasesRecommendation;
  sportsbookLine: number;
  sportsbookLineDisplay: string;
  sportsbookOdds: number;
  sportsbookOddsDisplay: string;
  team: Team;
}

export interface TotalBasesViewModel {
  candidates: TotalBasesCandidate[];
  slateMeta: {
    averageConfidence: string;
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
  };
  topCandidate?: TotalBasesCandidate;
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

export class TotalBasesIntelligenceService {
  private readonly rankingEngine: RankingEngineService;

  constructor(rankingEngine = new RankingEngineService()) {
    this.rankingEngine = rankingEngine;
  }

  async getTotalBasesIntelligence(): Promise<TotalBasesViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();

    return this.getTotalBasesIntelligenceFromSlate(slate);
  }

  async getTotalBasesIntelligenceFromSlate(
    slate: DailySlateViewModel,
  ): Promise<TotalBasesViewModel> {
    const candidates = await Promise.all(
      selectCandidates(slate).map((selection) => this.buildCandidate(selection)),
    );
    const ranked = rankTotalBasesCandidates(candidates, this.rankingEngine);

    return buildTotalBasesViewModel(slate, ranked);
  }

  async buildCandidate(selection: CandidateSelection): Promise<TotalBasesCandidate> {
    const season = new Date(selection.game.game.scheduledAt).getUTCFullYear();
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

    return buildTotalBasesCandidate({
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

export const totalBasesIntelligenceService = new TotalBasesIntelligenceService();

export async function getTotalBasesIntelligence() {
  return totalBasesIntelligenceService.getTotalBasesIntelligence();
}

export function buildTotalBasesViewModel(
  slate: DailySlateViewModel,
  candidates: TotalBasesCandidate[],
): TotalBasesViewModel {
  const averageConfidence =
    candidates.length === 0
      ? 0
      : candidates.reduce((total, candidate) => total + candidate.confidence, 0) /
        candidates.length;

  return {
    candidates,
    slateMeta: {
      averageConfidence: `${Math.round(averageConfidence)}%`,
      candidateCount: candidates.length,
      dataSource: slate.dataSource,
      lastUpdated: slate.slateMeta.lastUpdated,
    },
    topCandidate: candidates[0],
  };
}

export function rankTotalBasesCandidates(
  candidates: TotalBasesCandidate[],
  rankingEngine = new RankingEngineService(),
) {
  const ranked = rankingEngine.rankCandidates(candidates.map(toBetCandidate));
  const rankedById = new Map(ranked.map((item) => [item.candidate.betId, item]));

  return candidates
    .map((candidate) => ({
      ...candidate,
      ranked: rankedById.get(getBetId(candidate)),
    }))
    .sort((left, right) => (right.ranked?.trueLineScore ?? 0) - (left.ranked?.trueLineScore ?? 0));
}

export function buildTotalBasesCandidate({
  batterIntelligence,
  matchup,
  pitcherIntelligence,
  selection,
}: CandidateInput): TotalBasesCandidate {
  const scores = calculateScores({
    batterIntelligence,
    matchup,
    pitcherIntelligence,
    selection,
  });
  const gameGrade = weightedScore(scores);
  const projectedTotalBases = calculateProjection(gameGrade, batterIntelligence, selection.prop);
  const sportsbookLine = selection.prop?.prop.odds.line ?? 1.5;
  const sportsbookOdds = selection.prop?.prop.odds.price ?? -110;
  const edgeBases = projectedTotalBases - sportsbookLine;
  const modelProbability = calculateOverProbability(gameGrade, edgeBases);
  const impliedProbability = americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent = calculateEdgePercent(modelProbability, impliedProbability);
  const expectedValuePercent = calculateExpectedValuePercent(modelProbability, sportsbookOdds);
  const confidence = calculateConfidence({
    batterIntelligence,
    edgePercent,
    gameGrade,
    matchup,
    selection,
  });
  const recommendation = getRecommendation({
    edgePercent,
    expectedValuePercent,
    gameGrade,
  });
  const factors = buildFactors({
    batterIntelligence,
    matchup,
    pitcherIntelligence,
    scores,
    selection,
  });
  const reasons = buildReasons({
    batterIntelligence,
    matchup,
    scores,
    selection,
  });

  return {
    batter: selection.batter,
    battingOrder: getBattingOrder(selection.team, selection.batter),
    confidence,
    edgePercent,
    edgePercentDisplay: formatSignedPercent(edgePercent),
    expectedPlateAppearances: estimatePlateAppearances(selection.team),
    expectedValueDisplay: formatSignedPercent(expectedValuePercent),
    expectedValuePercent,
    factors,
    fairLine: projectedTotalBases,
    fairLineDisplay: projectedTotalBases.toFixed(1),
    game: selection.game,
    gameGrade,
    matchup: {
      overall: matchup.overallMatchupScore,
      pitch: matchup.pitchTypeMatch.score,
      zone: matchup.zoneMatch.score,
    },
    opponent: selection.opponent,
    opponentPitcher: selection.opponentPitcher,
    playerIntelligence: {
      average: formatDecimal(batterIntelligence?.profile.battingAverage, 3),
      barrelPercent: formatPercent(batterIntelligence?.profile.barrelPercent),
      hardHitPercent: formatPercent(batterIntelligence?.profile.hardHitPercent),
      ops: formatDecimal(batterIntelligence?.profile.onBasePlusSlugging, 3),
      recentForm: batterIntelligence?.recentForm.score ?? 50,
      slugging: formatDecimal(batterIntelligence?.profile.sluggingPercentage, 3),
    },
    projectedTotalBases,
    projectedTotalBasesDisplay: projectedTotalBases.toFixed(1),
    prop: selection.prop,
    reasons,
    recommendation,
    sportsbookLine,
    sportsbookLineDisplay: selection.prop?.prop.odds.displayLine ?? `Over ${sportsbookLine.toFixed(1)}`,
    sportsbookOdds,
    sportsbookOddsDisplay: formatAmericanOdds(sportsbookOdds),
    team: selection.team,
  };
}

export function toTotalBasesBetCandidate(candidate: TotalBasesCandidate): BetCandidate {
  return toBetCandidate(candidate);
}

function toBetCandidate(candidate: TotalBasesCandidate): BetCandidate {
  return {
    betId: getBetId(candidate),
    confidence: candidate.confidence,
    dataQuality: Math.round(
      average([
        candidate.gameGrade,
        candidate.matchup.overall,
        candidate.playerIntelligence.recentForm,
        candidate.team.lineup?.lineupConfidence,
        candidate.game.game.prediction?.dataQuality.score,
      ]),
    ),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "total-bases",
    modelProbability: calculateOverProbability(
      candidate.gameGrade,
      candidate.projectedTotalBases - candidate.sportsbookLine,
    ),
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    player: {
      id: candidate.batter.id,
      name: candidate.batter.fullName,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.prop?.prop.odds.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: [
      rankingFactor("matchupStrength", "Overall Match", candidate.matchup.overall, "Pitch, zone, and recent matchup context."),
      rankingFactor("recentForm", "Recent Production", findFactor(candidate, "Recent Production")?.score ?? 50, "Recent hits and total-base output."),
      rankingFactor("weatherImpact", "Weather/Park", findFactor(candidate, "Environment")?.score ?? 50, "Weather and ballpark hit environment."),
      rankingFactor("bullpenImpact", "Bullpen", findFactor(candidate, "Bullpen Opportunity")?.score ?? 50, "Opponent bullpen quality and workload."),
      rankingFactor("lineupCertainty", "Lineup", findFactor(candidate, "Lineup Opportunity")?.score ?? 50, "Batting order and projected plate appearances."),
    ],
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.prop?.prop.odds.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 64,
  };
}

function selectCandidates(slate: DailySlateViewModel): CandidateSelection[] {
  const totalBaseProps =
    slate.propCategories.find((category) => category.label === "Total Bases")?.props ?? [];
  const propSelections = totalBaseProps.map((prop) => {
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
    .flatMap((game) => [
      buildLineupSelection(game, game.awayTeam),
      buildLineupSelection(game, game.homeTeam),
    ])
    .filter((selection): selection is CandidateSelection => Boolean(selection))
    .slice(0, 18);
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

async function loadBatterIntelligence(selection: CandidateSelection, season: number) {
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

async function loadPitcherIntelligence(selection: CandidateSelection, season: number) {
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

function calculateScores({
  batterIntelligence,
  matchup,
  pitcherIntelligence,
  selection,
}: Omit<CandidateInput, "selection"> & { selection: CandidateSelection }) {
  const profile = batterIntelligence?.profile;
  const rolling = batterIntelligence?.rolling;
  const weather = selection.game.weather;
  const ballpark = selection.game.game.ballpark;
  const bullpen = selection.opponent.strength?.bullpen;

  return {
    batterQuality: average([
      normalizeRange(profile?.battingAverage, 0.21, 0.33),
      normalizeRange(profile?.onBasePlusSlugging, 0.63, 0.98),
      normalizeRange(profile?.sluggingPercentage, 0.34, 0.62),
      normalizeRange(profile?.isolatedPower, 0.08, 0.3),
      normalizeRange(profile?.hardHitPercent, 28, 56),
      normalizeRange(profile?.barrelPercent, 3, 16),
      normalizeInverse(profile?.strikeoutPercent, 30, 12),
    ]),
    bullpenOpportunity: average([
      normalizeInverse(bullpen?.value, 35, 80),
      normalizeRange(bullpen?.workloadRating, 35, 85),
      normalizeRange(bullpen?.recentPitches, 60, 210),
    ]),
    environment: average([
      normalizeRange(ballpark?.hitterFriendlyRating, 35, 82),
      normalizeRange(ballpark?.runFactor, 85, 125),
      normalizeRange(ballpark?.doublesFactor, 85, 125),
      normalizeRange(weather.runEnvironment, 35, 85),
      normalizeRange(weather.offenseEnvironment, 35, 85),
      weather.weatherApplicable ? normalizeRange(weather.temperatureF, 48, 92) : 50,
    ]),
    lineupOpportunity: average([
      normalizeInverse(getBattingOrderNumber(selection.team, selection.batter), 9, 1),
      normalizeRange(selection.team.lineup?.overallStrength, 35, 85),
      normalizeRange(selection.team.lineup?.contactRating, 35, 85),
      normalizeRange(selection.team.lineup?.lineupConfidence, 45, 100),
      normalizeRange(estimatePlateAppearancesNumber(selection.team), 3.6, 4.7),
    ]),
    matchup: average([
      matchup.overallMatchupScore,
      matchup.pitchTypeMatch.score,
      matchup.zoneMatch.score,
      matchup.recentMatchup.score,
    ]),
    pitchIntelligence: average([
      matchup.pitchTypeMatch.score,
      ...matchup.pitchTypeMatch.matches.map((match) => match.score),
      ...matchup.pitchTypeMatch.matches.map((match) => match.expectedDamageMatch),
      normalizeInverse(selection.opponentPitcher.whip, 1.45, 0.9),
      normalizeInverse(pitcherIntelligence?.recentForm.score, 35, 85),
    ]),
    recentProduction: average([
      batterIntelligence?.recentForm.score,
      normalizeRate(rolling?.last5.totalBases, rolling?.last5.games, 0.6, 3.0),
      normalizeRate(rolling?.last10.totalBases, rolling?.last10.games, 0.6, 2.8),
      normalizeRate(rolling?.last10.hits, rolling?.last10.games, 0.4, 1.8),
      trendScore(batterIntelligence?.trends, ["Power", "Hard Hit", "Contact", "Total Bases"]),
    ]),
    zoneIntelligence: average([
      matchup.zoneMatch.score,
      ...matchup.zoneMatch.hotZones?.map((zone) => zone.damageRating) ?? [],
      ...matchup.zoneMatch.overlay?.map((cell) =>
        cell.classification === "risk"
          ? 75
          : cell.classification === "advantage"
            ? 35
            : 50,
      ) ?? [],
    ]),
  };
}

function weightedScore(scores: ReturnType<typeof calculateScores>) {
  const weights = TOTAL_BASES_INTELLIGENCE_CONFIG.scoreWeights;

  return Math.round(
    scores.batterQuality * weights.batterQuality +
      scores.recentProduction * weights.recentProduction +
      scores.matchup * weights.matchup +
      scores.pitchIntelligence * weights.pitchIntelligence +
      scores.zoneIntelligence * weights.zoneIntelligence +
      scores.environment * weights.environment +
      scores.lineupOpportunity * weights.lineupOpportunity +
      scores.bullpenOpportunity * weights.bullpenOpportunity,
  );
}

function calculateProjection(
  gameGrade: number,
  batterIntelligence: BatterIntelligence | undefined,
  prop?: DailySlateProp,
) {
  const config = TOTAL_BASES_INTELLIGENCE_CONFIG.projection;
  const modelProjection =
    config.base + (gameGrade - 50) * config.scoreMultiplier;
  const recentProjection =
    batterIntelligence?.rolling.last5.games
      ? batterIntelligence.rolling.last5.totalBases / batterIntelligence.rolling.last5.games
      : undefined;
  const propProjection = parseProjection(prop?.prop.projection);
  const projection = average([
    modelProjection,
    recentProjection,
    propProjection,
    propProjection,
  ]);

  return roundToTenth(Math.max(config.min, Math.min(config.max, projection)));
}

function calculateOverProbability(gameGrade: number, edgeBases: number) {
  const config = TOTAL_BASES_INTELLIGENCE_CONFIG.probability;
  const probability =
    config.startingBase + gameGrade * config.scoreMultiplier + edgeBases * 0.08;

  return Math.max(config.min, Math.min(config.max, probability));
}

function calculateConfidence({
  batterIntelligence,
  edgePercent,
  gameGrade,
  matchup,
  selection,
}: {
  batterIntelligence?: BatterIntelligence;
  edgePercent: number;
  gameGrade: number;
  matchup: MatchupIntelligenceResult;
  selection: CandidateSelection;
}) {
  const weights = TOTAL_BASES_INTELLIGENCE_CONFIG.confidence;
  const dataQuality = average([
    batterIntelligence ? 78 : 45,
    matchup.confidence,
    selection.team.lineup?.lineupConfidence,
    selection.game.weather.weatherConfidence,
    selection.game.game.prediction?.dataQuality.score,
  ]);
  const edgeScore = normalizeRange(edgePercent, -4, 8);
  const agreement = average([
    gameGrade,
    matchup.overallMatchupScore,
    matchup.pitchTypeMatch.score,
    matchup.zoneMatch.score,
    batterIntelligence?.recentForm.score,
  ]);

  return Math.round(
    dataQuality * weights.dataQualityWeight +
      edgeScore * weights.edgeWeight +
      agreement * weights.inputAgreementWeight +
      gameGrade * weights.scoreWeight,
  );
}

function getRecommendation({
  edgePercent,
  expectedValuePercent,
  gameGrade,
}: {
  edgePercent: number;
  expectedValuePercent: number;
  gameGrade: number;
}): TotalBasesRecommendation {
  const thresholds = TOTAL_BASES_INTELLIGENCE_CONFIG.thresholds;

  if (
    gameGrade >= thresholds.eliteScore &&
    edgePercent >= thresholds.eliteEdge &&
    expectedValuePercent > 0
  ) {
    return "Elite";
  }

  if (
    gameGrade >= thresholds.strongScore &&
    edgePercent >= thresholds.strongEdge &&
    expectedValuePercent > 0
  ) {
    return "Strong Play";
  }

  if (
    gameGrade >= thresholds.playScore &&
    edgePercent >= thresholds.playEdge &&
    expectedValuePercent > 0
  ) {
    return "Play";
  }

  if (edgePercent >= thresholds.leanEdge || gameGrade >= thresholds.playScore) {
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
  scores: ReturnType<typeof calculateScores>;
  selection: CandidateSelection;
}): TotalBasesFactor[] {
  const weights = TOTAL_BASES_INTELLIGENCE_CONFIG.scoreWeights;
  const profile = batterIntelligence?.profile;
  const rolling = batterIntelligence?.rolling;
  const bullpen = selection.opponent.strength?.bullpen;

  return [
    factor("Player Intelligence", weights.batterQuality, scores.batterQuality, "Batter profile blends average, slugging, OPS, hard contact, barrel rate, and strikeout avoidance.", [
      { label: "AVG", value: formatDecimal(profile?.battingAverage, 3) },
      { label: "SLG", value: formatDecimal(profile?.sluggingPercentage, 3) },
      { label: "OPS", value: formatDecimal(profile?.onBasePlusSlugging, 3) },
      { label: "Hard Hit", value: formatPercent(profile?.hardHitPercent) },
    ]),
    factor("Recent Production", weights.recentProduction, scores.recentProduction, batterIntelligence?.recentForm.explanation ?? "Recent total-base form is neutral with current inputs.", [
      { label: "Last 5 TB/G", value: formatNumber(rate(rolling?.last5.totalBases, rolling?.last5.games), 2) },
      { label: "Last 10 TB/G", value: formatNumber(rate(rolling?.last10.totalBases, rolling?.last10.games), 2) },
      { label: "Consistency", value: formatRating(batterIntelligence?.consistency.consistencyScore) },
    ]),
    factor("Matchup Intelligence", weights.matchup, scores.matchup, matchup.reasons[0] ?? "Overall matchup is neutral.", [
      { label: "Overall Match", value: `${matchup.overallMatchupScore}/100` },
      { label: "Pitch Match", value: `${matchup.pitchTypeMatch.score}/100` },
      { label: "Recent Match", value: `${matchup.recentMatchup.score}/100` },
    ]),
    factor("Pitch Intelligence", weights.pitchIntelligence, scores.pitchIntelligence, matchup.pitchTypeMatch.explanation, [
      { label: "Top Pitch", value: matchup.pitchTypeMatch.matches[0]?.pitchName ?? "-" },
      { label: "Pitcher WHIP", value: formatNumber(selection.opponentPitcher.whip, 2) },
      { label: "Pitcher Form", value: pitcherIntelligence ? `${pitcherIntelligence.recentForm.score}/100` : "-" },
    ]),
    factor("Zone Intelligence", weights.zoneIntelligence, scores.zoneIntelligence, matchup.zoneMatch.reasons[0] ?? "Zone overlap is neutral.", [
      { label: "Zone Match", value: `${matchup.zoneMatch.score}/100` },
      { label: "Hot Zones", value: String(matchup.zoneMatch.hotZones?.length ?? 0) },
      { label: "Overlay Cells", value: String(matchup.zoneMatch.overlay?.length ?? 0) },
    ]),
    factor("Environment", weights.environment, scores.environment, "Ballpark, weather, wind, and run environment influence extra-base-hit conditions.", [
      { label: "Ballpark", value: selection.game.game.ballpark?.name ?? selection.game.game.venue },
      { label: "Run Factor", value: formatRating(selection.game.game.ballpark?.runFactor) },
      { label: "Weather", value: `${selection.game.weather.runEnvironment}/100` },
      { label: "Wind", value: `${Math.round(selection.game.weather.windMph ?? 0)} MPH ${selection.game.weather.relativeWindDirection}` },
    ]),
    factor("Lineup Opportunity", weights.lineupOpportunity, scores.lineupOpportunity, "Batting order, lineup strength, and lineup certainty drive expected plate appearances.", [
      { label: "Order", value: getBattingOrder(selection.team, selection.batter) },
      { label: "Expected PA", value: estimatePlateAppearances(selection.team) },
      { label: "Lineup Status", value: selection.team.lineup?.status ?? "-" },
    ]),
    factor("Bullpen Opportunity", weights.bullpenOpportunity, scores.bullpenOpportunity, "Opponent bullpen quality and workload can improve later plate appearances.", [
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
): TotalBasesFactor {
  return {
    details,
    explanation,
    label,
    score: Math.round(score),
    weight: `${Math.round(weight * 100)}%`,
  };
}

function buildReasons({
  batterIntelligence,
  matchup,
  scores,
  selection,
}: {
  batterIntelligence?: BatterIntelligence;
  matchup: MatchupIntelligenceResult;
  scores: ReturnType<typeof calculateScores>;
  selection: CandidateSelection;
}) {
  const profile = batterIntelligence?.profile;
  const reasons: string[] = [];

  if ((profile?.onBasePlusSlugging ?? 0) >= 0.8) reasons.push("Strong OPS foundation");
  if ((profile?.hardHitPercent ?? 0) >= 42) reasons.push("Hard-hit profile supports total-base upside");
  if ((profile?.sluggingPercentage ?? 0) >= 0.45) reasons.push("Slugging profile grades above neutral");
  if (matchup.pitchTypeMatch.score >= 62) reasons.push("Pitch Match favors the hitter");
  if (matchup.zoneMatch.score >= 62) reasons.push("Zone Match favors the hitter");
  if (scores.recentProduction >= 62) reasons.push("Recent total-base production is positive");
  if ((selection.game.game.ballpark?.hitterFriendlyRating ?? 50) >= 62) reasons.push("Ballpark supports hitter production");
  if ((selection.team.lineup?.lineupConfidence ?? 0) >= 75) reasons.push("Lineup context is reliable");
  if (scores.bullpenOpportunity >= 62) reasons.push("Bullpen context improves late-game opportunity");

  return [...reasons, ...matchup.reasons].slice(0, 8);
}

function findGameById(slate: DailySlateViewModel, gameId: string) {
  return slate.games.find((game) => game.game.id === gameId) ?? slate.games[0];
}

function getBetId(candidate: TotalBasesCandidate) {
  return `total-bases-${candidate.batter.id}-${candidate.game.game.id}`;
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

function parseProjection(projection?: string) {
  if (!projection) {
    return undefined;
  }

  const parsed = Number.parseFloat(projection);

  return Number.isFinite(parsed) ? parsed : undefined;
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

function rankingFactor(
  key: string,
  label: string,
  score: number,
  summary: string,
) {
  return {
    key,
    label,
    score: clamp(score),
    summary,
  };
}

function findFactor(candidate: TotalBasesCandidate, label: string) {
  return candidate.factors.find((factor) => factor.label.includes(label));
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

function rate(numerator: number | undefined, denominator: number | undefined) {
  if (!denominator) {
    return undefined;
  }

  return (numerator ?? 0) / denominator;
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

function average(values: Array<number | undefined | null>) {
  const valid = values.filter(
    (value): value is number => value !== undefined && value !== null && Number.isFinite(value),
  );

  return valid.length === 0
    ? 50
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPercent(value: number | null | undefined) {
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
