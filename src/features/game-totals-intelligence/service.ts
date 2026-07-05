import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type { DailySlateGame, DailySlateViewModel } from "../../services/daily-slate/types.ts";
import {
  matchupService,
  type MatchupIntelligenceResult,
} from "../../services/matchup/index.ts";
import { calculateExpectedValuePercent } from "../../services/predictions/PredictionEngine.ts";
import {
  RankingEngineService,
  type BetCandidate,
  type RankedBetCandidate,
} from "../../services/ranking/index.ts";
import { GAME_TOTALS_CONFIG } from "./config.ts";

type GameTotalsRecommendation = "Elite" | "Strong Play" | "Play" | "Lean" | "Pass";
type GameTotalsSide = "Over" | "Under";

export interface GameTotalFactor {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  weight: string;
}

export interface GameTotalCandidate {
  confidence: number;
  edgePercent: number;
  edgePercentDisplay: string;
  expectedValuePercent: number;
  expectedValueDisplay: string;
  factors: GameTotalFactor[];
  fairTotal: number;
  fairTotalDisplay: string;
  game: DailySlateGame;
  gameGrade: number;
  projectedAwayRuns: number;
  projectedHomeRuns: number;
  projectedRuns: number;
  projectedRunsDisplay: string;
  ranked?: RankedBetCandidate;
  reasons: string[];
  recommendation: GameTotalsRecommendation;
  side: GameTotalsSide;
  sportsbookOdds: number;
  sportsbookOddsDisplay: string;
  sportsbookTotal: number;
  sportsbookTotalDisplay: string;
  trueLineTotal: number;
}

export interface GameTotalsViewModel {
  candidates: GameTotalCandidate[];
  slateMeta: {
    averageConfidence: string;
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
  };
  topCandidate?: GameTotalCandidate;
}

interface GameContext {
  awayMatchup: MatchupIntelligenceResult;
  game: DailySlateGame;
  homeMatchup: MatchupIntelligenceResult;
}

export class GameTotalsIntelligenceService {
  private readonly rankingEngine: RankingEngineService;

  constructor(rankingEngine = new RankingEngineService()) {
    this.rankingEngine = rankingEngine;
  }

  async getGameTotalsIntelligence(): Promise<GameTotalsViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();

    return this.getGameTotalsIntelligenceFromSlate(slate);
  }

  async getGameTotalsIntelligenceFromSlate(
    slate: DailySlateViewModel,
  ): Promise<GameTotalsViewModel> {
    const contexts = await Promise.all(slate.games.map(loadGameContext));
    const candidates = contexts.map(buildGameTotalCandidate);
    const enriched = rankGameTotalCandidates(candidates, this.rankingEngine);

    return buildGameTotalsViewModel(slate, enriched);
  }
}

export const gameTotalsIntelligenceService = new GameTotalsIntelligenceService();

export async function getGameTotalsIntelligence() {
  return gameTotalsIntelligenceService.getGameTotalsIntelligence();
}

export function buildGameTotalsViewModel(
  slate: DailySlateViewModel,
  candidates: GameTotalCandidate[],
): GameTotalsViewModel {
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

export function rankGameTotalCandidates(
  candidates: GameTotalCandidate[],
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

export function buildGameTotalCandidate(context: GameContext): GameTotalCandidate {
  const scores = calculateScores(context);
  const gameGrade = weightedScore(scores);
  const { awayRuns, homeRuns, totalRuns } = calculateProjectedRuns(context, scores);
  const sportsbookTotal = context.game.game.odds.total.line || totalRuns;
  const sportsbookOdds =
    context.game.game.odds.total.price || GAME_TOTALS_CONFIG.defaultGameTotalOdds;
  const edgeRuns = totalRuns - sportsbookTotal;
  const modelProbability = runsToProbability(Math.abs(edgeRuns));
  const impliedProbability = americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent = calculateEdgePercent(modelProbability, impliedProbability);
  const expectedValuePercent = calculateExpectedValuePercent(modelProbability, sportsbookOdds);
  const confidence = calculateConfidence({
    edgePercent,
    gameGrade,
    context,
  });
  const recommendation = getRecommendation({
    edgePercent,
    expectedValuePercent,
    gameGrade,
  });
  const factors = buildFactors(context, scores);
  const side: GameTotalsSide = edgeRuns >= 0 ? "Over" : "Under";
  const reasons = buildReasons(context, scores, side);

  return {
    confidence,
    edgePercent,
    edgePercentDisplay: formatSignedPercent(edgePercent),
    expectedValuePercent,
    expectedValueDisplay: formatSignedPercent(expectedValuePercent),
    factors,
    fairTotal: totalRuns,
    fairTotalDisplay: totalRuns.toFixed(1),
    game: context.game,
    gameGrade,
    projectedAwayRuns: awayRuns,
    projectedHomeRuns: homeRuns,
    projectedRuns: totalRuns,
    projectedRunsDisplay: totalRuns.toFixed(1),
    reasons,
    recommendation,
    side,
    sportsbookOdds,
    sportsbookOddsDisplay: formatAmericanOdds(sportsbookOdds),
    sportsbookTotal,
    sportsbookTotalDisplay: sportsbookTotal.toFixed(1),
    trueLineTotal: totalRuns,
  };
}

function toBetCandidate(candidate: GameTotalCandidate): BetCandidate {
  return {
    betId: getBetId(candidate),
    confidence: candidate.confidence,
    dataQuality: Math.round(
      average([
        candidate.gameGrade,
        candidate.game.game.prediction?.dataQuality.score,
        candidate.game.awayTeam.lineup?.lineupConfidence,
        candidate.game.homeTeam.lineup?.lineupConfidence,
      ]),
    ),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "game-total",
    modelProbability: runsToProbability(Math.abs(candidate.projectedRuns - candidate.sportsbookTotal)),
    opponent: {
      id: candidate.game.homeTeam.id,
      name: candidate.game.homeTeam.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.total.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: [
      factorForRanking("matchupStrength", "Game Total Matchup", candidate.gameGrade, "Composite game-total scoring grade."),
      factorForRanking("weatherImpact", "Weather", findFactor(candidate, "Weather")?.score ?? 50, "Weather and wind scoring context."),
      factorForRanking("bullpenImpact", "Bullpen", findFactor(candidate, "Bullpen Matchup")?.score ?? 50, "Combined bullpen quality and fatigue."),
      factorForRanking("lineupCertainty", "Lineups", findFactor(candidate, "Lineup Quality")?.score ?? 50, "Projected lineup strength and certainty."),
      factorForRanking("recentForm", "Recent Form", findFactor(candidate, "Recent Form")?.score ?? 50, "Recent run production and momentum."),
    ],
    team: {
      id: candidate.game.awayTeam.id,
      name: `${candidate.game.awayTeam.abbreviation}/${candidate.game.homeTeam.abbreviation}`,
    },
    timestamp: candidate.game.game.odds.total.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 58,
  };
}

async function loadGameContext(game: DailySlateGame): Promise<GameContext> {
  const season = new Date(game.game.scheduledAt).getUTCFullYear();
  const [awayMatchup, homeMatchup] = await Promise.all([
    matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: game.awayTeam.lineup?.players.map((player) => `mlb-player-${player.mlbId}`),
        batterMlbIds: game.awayTeam.lineup?.players.map((player) => player.mlbId),
        batterNames: game.awayTeam.lineup?.players.map((player) => player.fullName),
        pitcherId: game.homePitcher.id,
        pitcherMlbId: game.homePitcher.externalIds?.mlb,
        pitcherName: game.homePitcher.fullName,
        season,
      },
      {
        ballpark: game.game.ballpark,
        bullpen: game.homeTeam.strength?.bullpen,
        lineup: game.awayTeam.lineup,
        weather: game.weather,
      },
    ),
    matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: game.homeTeam.lineup?.players.map((player) => `mlb-player-${player.mlbId}`),
        batterMlbIds: game.homeTeam.lineup?.players.map((player) => player.mlbId),
        batterNames: game.homeTeam.lineup?.players.map((player) => player.fullName),
        pitcherId: game.awayPitcher.id,
        pitcherMlbId: game.awayPitcher.externalIds?.mlb,
        pitcherName: game.awayPitcher.fullName,
        season,
      },
      {
        ballpark: game.game.ballpark,
        bullpen: game.awayTeam.strength?.bullpen,
        lineup: game.homeTeam.lineup,
        weather: game.weather,
      },
    ),
  ]);

  return {
    awayMatchup,
    game,
    homeMatchup,
  };
}

function calculateScores({ awayMatchup, game, homeMatchup }: GameContext) {
  return {
    awayOffense: offenseScore(game.awayTeam),
    awayStarter: starterRunEnvironmentScore(game.awayPitcher),
    ballpark: average([
      game.game.ballpark?.hitterFriendlyRating,
      game.game.ballpark?.overallParkRating,
      normalizeRange(game.game.ballpark?.runFactor, 88, 118),
      normalizeRange(game.game.ballpark?.homeRunFactor, 82, 124),
    ]),
    bullpen: average([
      normalizeInverse(game.awayTeam.strength?.bullpen.value, 85, 30),
      normalizeRange(game.awayTeam.strength?.bullpen.workloadRating, 30, 85),
      normalizeInverse(game.homeTeam.strength?.bullpen.value, 85, 30),
      normalizeRange(game.homeTeam.strength?.bullpen.workloadRating, 30, 85),
    ]),
    homeAway: 54,
    homeOffense: offenseScore(game.homeTeam),
    homeStarter: starterRunEnvironmentScore(game.homePitcher),
    lineup: average([
      game.awayTeam.lineup?.overallStrength,
      game.awayTeam.lineup?.powerRating,
      game.awayTeam.lineup?.contactRating,
      game.homeTeam.lineup?.overallStrength,
      game.homeTeam.lineup?.powerRating,
      game.homeTeam.lineup?.contactRating,
      game.awayTeam.lineup?.lineupConfidence,
      game.homeTeam.lineup?.lineupConfidence,
    ]),
    matchup: average([
      awayMatchup.overallMatchupScore,
      awayMatchup.pitchTypeMatch.score,
      awayMatchup.zoneMatch.score,
      homeMatchup.overallMatchupScore,
      homeMatchup.pitchTypeMatch.score,
      homeMatchup.zoneMatch.score,
    ]),
    recentForm: average([
      game.awayTeam.recentForm?.rating.value,
      normalizeRange(game.awayTeam.recentForm?.windows[7].runsPerGame, 2.8, 6.5),
      normalizeRange(game.awayTeam.recentForm?.windows[7].ops, 0.6, 0.92),
      game.homeTeam.recentForm?.rating.value,
      normalizeRange(game.homeTeam.recentForm?.windows[7].runsPerGame, 2.8, 6.5),
      normalizeRange(game.homeTeam.recentForm?.windows[7].ops, 0.6, 0.92),
    ]),
    restTravel: 50,
    weather: average([
      game.weather.runEnvironment,
      game.weather.homeRunEnvironment,
      game.weather.offenseEnvironment,
      game.weather.hitterFriendlyRating,
      game.weather.tailwindMph ? normalizeRange(game.weather.tailwindMph, 0, 18) : undefined,
      normalizeRange(game.weather.temperatureF, 45, 92),
    ]),
  };
}

function weightedScore(scores: ReturnType<typeof calculateScores>) {
  const weights = GAME_TOTALS_CONFIG.scoreWeights;

  return Math.round(
    scores.homeOffense * weights.homeOffense +
      scores.awayOffense * weights.awayOffense +
      scores.homeStarter * weights.homeStarter +
      scores.awayStarter * weights.awayStarter +
      scores.bullpen * weights.bullpen +
      scores.matchup * weights.matchup +
      scores.weather * weights.weather +
      scores.ballpark * weights.ballpark +
      scores.lineup * weights.lineup +
      scores.recentForm * weights.recentForm +
      scores.restTravel * weights.restTravel +
      scores.homeAway * weights.homeAway,
  );
}

function calculateProjectedRuns(
  context: GameContext,
  scores: ReturnType<typeof calculateScores>,
) {
  const prediction = context.game.game.prediction;
  const baseAway =
    prediction?.awayProjectedRuns ??
    context.game.awayTeam.strength?.offense.runsPerGame ??
    context.game.awayTeam.recentForm?.windows[30].runsPerGame ??
    4.2;
  const baseHome =
    prediction?.homeProjectedRuns ??
    context.game.homeTeam.strength?.offense.runsPerGame ??
    context.game.homeTeam.recentForm?.windows[30].runsPerGame ??
    4.35;
  const sharedAdjustment =
    (weightedScore(scores) - 50) / 18 +
    (scores.weather - 50) / 80 +
    (scores.ballpark - 50) / 85 +
    (scores.bullpen - 50) / 110;
  const awayAdjustment =
    (scores.awayOffense - 50) / 70 +
    (scores.homeStarter - 50) / 90 +
    (scores.matchup - 50) / 120;
  const homeAdjustment =
    (scores.homeOffense - 50) / 70 +
    (scores.awayStarter - 50) / 90 +
    (scores.matchup - 50) / 120 +
    0.08;
  const awayRuns = clampRuns(baseAway + sharedAdjustment / 2 + awayAdjustment);
  const homeRuns = clampRuns(baseHome + sharedAdjustment / 2 + homeAdjustment);

  return {
    awayRuns,
    homeRuns,
    totalRuns: roundToTenth(awayRuns + homeRuns),
  };
}

function buildFactors(
  { awayMatchup, game, homeMatchup }: GameContext,
  scores: ReturnType<typeof calculateScores>,
): GameTotalFactor[] {
  const weights = GAME_TOTALS_CONFIG.scoreWeights;

  return [
    factor("Home Offense", scores.homeOffense, weights.homeOffense, "Home team offense, runs per game, OPS, strikeout rate, and walk rate.", [
      { label: "Team", value: game.homeTeam.name },
      { label: "Runs/Game", value: formatNumber(game.homeTeam.strength?.offense.runsPerGame) },
      { label: "OPS", value: game.homeTeam.strength?.offense.ops.toFixed(3) ?? "-" },
    ]),
    factor("Away Offense", scores.awayOffense, weights.awayOffense, "Away team offense, runs per game, OPS, strikeout rate, and walk rate.", [
      { label: "Team", value: game.awayTeam.name },
      { label: "Runs/Game", value: formatNumber(game.awayTeam.strength?.offense.runsPerGame) },
      { label: "OPS", value: game.awayTeam.strength?.offense.ops.toFixed(3) ?? "-" },
    ]),
    factor("Home Starter", scores.homeStarter, weights.homeStarter, "Home starter run environment from ERA, WHIP, strikeouts, and HR/9.", [
      { label: game.homePitcher.fullName, value: `${game.homePitcher.era.toFixed(2)} ERA` },
    ]),
    factor("Away Starter", scores.awayStarter, weights.awayStarter, "Away starter run environment from ERA, WHIP, strikeouts, and HR/9.", [
      { label: game.awayPitcher.fullName, value: `${game.awayPitcher.era.toFixed(2)} ERA` },
    ]),
    factor("Bullpen Matchup", scores.bullpen, weights.bullpen, "Combined bullpen quality and recent workload.", [
      { label: `${game.awayTeam.abbreviation} Bullpen`, value: formatScore(game.awayTeam.strength?.bullpen.value) },
      { label: `${game.homeTeam.abbreviation} Bullpen`, value: formatScore(game.homeTeam.strength?.bullpen.value) },
    ]),
    factor("Pitch/Zone Match", scores.matchup, weights.matchup, "Existing Pitch Match and Zone Match intelligence for both lineups.", [
      { label: `${game.awayTeam.abbreviation} Pitch Match`, value: formatScore(awayMatchup.pitchTypeMatch.score) },
      { label: `${game.homeTeam.abbreviation} Pitch Match`, value: formatScore(homeMatchup.pitchTypeMatch.score) },
      { label: "Zone Match", value: formatScore(average([awayMatchup.zoneMatch.score, homeMatchup.zoneMatch.score])) },
    ]),
    factor("Weather", scores.weather, weights.weather, "Temperature, wind, air density, home run environment, and run environment.", [
      { label: "Weather", value: game.weather.summary },
      { label: "Wind", value: `${game.weather.windMph} MPH ${game.weather.relativeWindDirection}` },
      { label: "Temperature", value: `${game.weather.temperatureF}°F` },
    ]),
    factor("Ballpark", scores.ballpark, weights.ballpark, "Run factor, home run factor, and hitter friendliness.", [
      { label: "Park", value: game.game.ballpark?.name ?? game.game.venue },
      { label: "Run Factor", value: game.game.ballpark?.runFactor?.toString() ?? "-" },
      { label: "HR Factor", value: game.game.ballpark?.homeRunFactor?.toString() ?? "-" },
    ]),
    factor("Lineup Quality", scores.lineup, weights.lineup, "Projected lineup strength, power, contact, and lineup certainty.", [
      { label: `${game.awayTeam.abbreviation} Lineup`, value: game.awayTeam.lineup?.status ?? "unavailable" },
      { label: `${game.homeTeam.abbreviation} Lineup`, value: game.homeTeam.lineup?.status ?? "unavailable" },
    ]),
    factor("Recent Form", scores.recentForm, weights.recentForm, "Recent run production, OPS, and offensive momentum.", [
      { label: `${game.awayTeam.abbreviation} Last 7 R/G`, value: formatNumber(game.awayTeam.recentForm?.windows[7].runsPerGame) },
      { label: `${game.homeTeam.abbreviation} Last 7 R/G`, value: formatNumber(game.homeTeam.recentForm?.windows[7].runsPerGame) },
    ]),
    factor("Rest/Travel", scores.restTravel, weights.restTravel, "Neutral placeholder until rest and travel providers are available.", [
      { label: "Status", value: "Placeholder" },
    ]),
    factor("Home Field", scores.homeAway, weights.homeAway, "Home field and bottom-of-ninth scoring context.", [
      { label: "Home Team", value: game.homeTeam.name },
    ]),
  ];
}

function buildReasons(
  context: GameContext,
  scores: ReturnType<typeof calculateScores>,
  side: GameTotalsSide,
) {
  const reasons: string[] = [];

  if (scores.homeOffense >= 70 && scores.awayOffense >= 70) reasons.push("Elite offenses");
  if (scores.bullpen >= 66) reasons.push("Weak bullpens or elevated bullpen fatigue");
  if (scores.weather >= 68) reasons.push("Wind blowing out and favorable run-scoring weather");
  if (scores.weather <= 38) reasons.push("Cold weather or suppressed run-scoring environment");
  if (scores.ballpark >= 68) reasons.push("Heavy HR environment and hitter-friendly park");
  if (scores.ballpark <= 38) reasons.push("Pitcher's park suppresses scoring");
  if (scores.matchup >= 70) reasons.push("Pitch and zone matchups favor contact quality");
  if (scores.matchup <= 38) reasons.push("Excellent strikeout matchup suppresses scoring");
  if (scores.lineup >= 70) reasons.push("High-quality lineups on both sides");
  if (scores.recentForm >= 68) reasons.push("Strong recent run-scoring form");
  if (side === "Under" && scores.bullpen <= 42) reasons.push("Bullpen strength supports the Under");

  return reasons.length > 0
    ? reasons.slice(0, 7)
    : [`${context.game.awayTeam.abbreviation}/${context.game.homeTeam.abbreviation} total is close to market with no major scoring edge.`];
}

function calculateConfidence({
  context,
  edgePercent,
  gameGrade,
}: {
  context: GameContext;
  edgePercent: number;
  gameGrade: number;
}) {
  const weights = GAME_TOTALS_CONFIG.confidence;
  const inputQuality = average([
    context.awayMatchup.confidence,
    context.homeMatchup.confidence,
    context.game.awayTeam.lineup?.lineupConfidence,
    context.game.homeTeam.lineup?.lineupConfidence,
    context.game.game.prediction?.dataQuality.score,
  ]);
  const edgeScore = normalizeRange(edgePercent, -2, 8);
  const matchupScore = average([
    context.awayMatchup.overallMatchupScore,
    context.homeMatchup.overallMatchupScore,
  ]);

  return Math.round(
    (edgeScore ?? 50) * weights.edgeWeight +
      gameGrade * weights.gradeWeight +
      inputQuality * weights.inputQualityWeight +
      matchupScore * weights.rankingWeight,
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
}) {
  const thresholds = GAME_TOTALS_CONFIG.thresholds;

  if (gameGrade >= thresholds.eliteGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Elite";
  if (gameGrade >= thresholds.strongGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Strong Play";
  if (gameGrade >= thresholds.playGrade && edgePercent >= thresholds.playEdge && expectedValuePercent > 0) return "Play";
  if (edgePercent >= thresholds.leanEdge) return "Lean";
  return "Pass";
}

function offenseScore(team: DailySlateGame["awayTeam"]) {
  return average([
    team.strength?.offense.value,
    normalizeRange(team.strength?.offense.runsPerGame, 3.3, 5.9),
    normalizeRange(team.strength?.offense.ops, 0.64, 0.86),
    normalizeInverse(team.strength?.offense.strikeoutRate, 28, 17),
    normalizeRange(team.strength?.offense.walkRate, 6, 11),
  ]);
}

function starterRunEnvironmentScore(pitcher: DailySlateGame["awayPitcher"]) {
  return average([
    normalizeInverse(pitcher.era, 5.6, 2.2),
    normalizeInverse(pitcher.whip, 1.55, 0.9),
    normalizeInverse(pitcher.strikeoutRate, 34, 17),
    normalizeRange(pitcher.homeRunsPer9, 0.5, 1.8),
  ]);
}

function runsToProbability(edgeRuns: number) {
  return Math.max(0.05, Math.min(0.95, 0.5 + edgeRuns * 0.12));
}

function getBetId(candidate: GameTotalCandidate) {
  return `game-total-${candidate.game.game.id}-${candidate.side.toLowerCase()}`;
}

function findFactor(candidate: GameTotalCandidate, label: string) {
  return candidate.factors.find((item) => item.label === label);
}

function factor(
  label: string,
  score: number,
  weight: number,
  explanation: string,
  details: Array<{ label: string; value: string }>,
): GameTotalFactor {
  return {
    details,
    explanation,
    label,
    score: Math.round(score),
    weight: `${Math.round(weight * 100)}%`,
  };
}

function factorForRanking(key: string, label: string, score: number, summary: string) {
  return {
    key,
    label,
    score,
    summary,
  };
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return 50;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function normalizeRange(value: number | null | undefined, low: number, high: number) {
  if (value === null || value === undefined) return undefined;
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

function normalizeInverse(value: number | null | undefined, bad: number, good: number) {
  if (value === null || value === undefined) return undefined;
  return normalizeRange(value, bad, good);
}

function clampRuns(value: number) {
  return roundToTenth(Math.max(1.8, Math.min(9.5, value)));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function formatNumber(value?: number) {
  return value === undefined ? "-" : value.toFixed(1);
}

function formatScore(value?: number) {
  return value === undefined ? "-" : `${Math.round(value)}/100`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
