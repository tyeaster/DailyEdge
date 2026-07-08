import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type { Pitcher, Team } from "../../models/mlb.ts";
import type { DailySlateGame, DailySlateViewModel } from "../../services/daily-slate/types.ts";
import {
  matchupService,
  type MatchupIntelligenceResult,
} from "../../services/matchup/index.ts";
import {
  RankingEngineService,
  type BetCandidate,
  type RankedBetCandidate,
} from "../../services/ranking/index.ts";
import { calculateExpectedValuePercent } from "../../services/predictions/PredictionEngine.ts";
import { TEAM_TOTALS_CONFIG } from "./config.ts";

type TeamTotalsRecommendation = "Elite" | "Strong Play" | "Play" | "Lean" | "Pass";

export interface TeamTotalFactor {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  weight: string;
}

export interface TeamTotalCandidate {
  confidence: number;
  edgePercent: number;
  edgePercentDisplay: string;
  expectedValuePercent: number;
  expectedValueDisplay: string;
  factors: TeamTotalFactor[];
  fairTotal: number;
  fairTotalDisplay: string;
  game: DailySlateGame;
  gameGrade: number;
  opponent: Team;
  opponentPitcher: Pitcher;
  projectedRuns: number;
  projectedRunsDisplay: string;
  ranked?: RankedBetCandidate;
  reasons: string[];
  recommendation: TeamTotalsRecommendation;
  sportsbookOdds: number;
  sportsbookOddsDisplay: string;
  sportsbookTotal: number;
  sportsbookTotalDisplay: string;
  team: Team;
  trueLineTotal: number;
}

export interface TeamTotalsViewModel {
  candidates: TeamTotalCandidate[];
  slateMeta: {
    averageConfidence: string;
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
  };
  topCandidate?: TeamTotalCandidate;
}

interface CandidateContext {
  game: DailySlateGame;
  isHome: boolean;
  matchup: MatchupIntelligenceResult;
  opponent: Team;
  opponentPitcher: Pitcher;
  team: Team;
}

export class TeamTotalsIntelligenceService {
  private readonly rankingEngine: RankingEngineService;

  constructor(rankingEngine = new RankingEngineService()) {
    this.rankingEngine = rankingEngine;
  }

  async getTeamTotalsIntelligence(): Promise<TeamTotalsViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();

    return this.getTeamTotalsIntelligenceFromSlate(slate);
  }

  async getTeamTotalsIntelligenceFromSlate(
    slate: DailySlateViewModel,
  ): Promise<TeamTotalsViewModel> {
    const contexts = (await Promise.all(slate.games.map((game) => loadGameContexts(game)))).flat();
    const candidates = contexts.map(buildTeamTotalCandidate);
    const enriched = rankTeamTotalCandidates(candidates, this.rankingEngine);

    return buildTeamTotalsViewModel(slate, enriched);
  }
}

export function rankTeamTotalCandidates(
  candidates: TeamTotalCandidate[],
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

export const teamTotalsIntelligenceService = new TeamTotalsIntelligenceService();

export async function getTeamTotalsIntelligence() {
  return teamTotalsIntelligenceService.getTeamTotalsIntelligence();
}

export function buildTeamTotalsViewModel(
  slate: DailySlateViewModel,
  candidates: TeamTotalCandidate[],
): TeamTotalsViewModel {
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

export function buildTeamTotalCandidate(context: CandidateContext): TeamTotalCandidate {
  const scores = calculateScores(context);
  const gameGrade = weightedScore(scores);
  const projectedRuns = calculateProjectedRuns(context, scores);
  const sportsbookTotal = estimateSportsbookTeamTotal(context);
  const sportsbookOdds =
    context.game.game.odds.total.price || TEAM_TOTALS_CONFIG.defaultTeamTotalOdds;
  const edgeRuns = projectedRuns - sportsbookTotal;
  const modelProbability = runsToProbability(edgeRuns);
  const impliedProbability = americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent = calculateEdgePercent(modelProbability, impliedProbability);
  const expectedValuePercent = calculateExpectedValuePercent(modelProbability, sportsbookOdds);
  const confidence = calculateConfidence({
    edgePercent,
    gameGrade,
    matchup: context.matchup,
    team: context.team,
  });
  const recommendation = getRecommendation({
    edgePercent,
    expectedValuePercent,
    gameGrade,
  });
  const factors = buildFactors(context, scores);
  const reasons = buildReasons(context, scores);

  return {
    confidence,
    edgePercent,
    edgePercentDisplay: formatSignedPercent(edgePercent),
    expectedValuePercent,
    expectedValueDisplay: formatSignedPercent(expectedValuePercent),
    factors,
    fairTotal: projectedRuns,
    fairTotalDisplay: projectedRuns.toFixed(1),
    game: context.game,
    gameGrade,
    opponent: context.opponent,
    opponentPitcher: context.opponentPitcher,
    projectedRuns,
    projectedRunsDisplay: projectedRuns.toFixed(1),
    reasons,
    recommendation,
    sportsbookOdds,
    sportsbookOddsDisplay: formatAmericanOdds(sportsbookOdds),
    sportsbookTotal,
    sportsbookTotalDisplay: sportsbookTotal.toFixed(1),
    team: context.team,
    trueLineTotal: projectedRuns,
  };
}

function toBetCandidate(candidate: TeamTotalCandidate): BetCandidate {
  return {
    betId: getBetId(candidate),
    confidence: candidate.confidence,
    dataQuality: Math.round(
      average([
        candidate.gameGrade,
        candidate.team.lineup?.lineupConfidence,
        candidate.game.game.prediction?.dataQuality.score,
      ]),
    ),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "team-total",
    modelProbability: runsToProbability(candidate.projectedRuns - candidate.sportsbookTotal),
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.total.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: [
      factorForRanking("matchupStrength", "Team Total Matchup", candidate.gameGrade, "Composite team-total scoring grade."),
      factorForRanking("weatherImpact", "Weather", findFactor(candidate, "Weather")?.score ?? 50, "Weather and wind run-scoring context."),
      factorForRanking("bullpenImpact", "Bullpen", findFactor(candidate, "Bullpen Strength")?.score ?? 50, "Opponent bullpen quality and fatigue."),
      factorForRanking("lineupCertainty", "Lineup", findFactor(candidate, "Lineup")?.score ?? 50, "Projected lineup strength and certainty."),
      factorForRanking("recentForm", "Recent Form", findFactor(candidate, "Recent Form")?.score ?? 50, "Recent offensive production."),
    ],
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.game.game.odds.total.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 54,
  };
}

async function loadGameContexts(game: DailySlateGame): Promise<CandidateContext[]> {
  const season = new Date(game.game.scheduledAt).getUTCFullYear();
  const [awayMatchup, homeMatchup] = await Promise.all([
    loadMatchup({
      game,
      opponentPitcher: game.homePitcher,
      pitchingTeam: game.homeTeam,
      season,
      team: game.awayTeam,
    }),
    loadMatchup({
      game,
      opponentPitcher: game.awayPitcher,
      pitchingTeam: game.awayTeam,
      season,
      team: game.homeTeam,
    }),
  ]);

  return [
    {
      game,
      isHome: false,
      matchup: awayMatchup,
      opponent: game.homeTeam,
      opponentPitcher: game.homePitcher,
      team: game.awayTeam,
    },
    {
      game,
      isHome: true,
      matchup: homeMatchup,
      opponent: game.awayTeam,
      opponentPitcher: game.awayPitcher,
      team: game.homeTeam,
    },
  ];
}

async function loadMatchup({
  game,
  opponentPitcher,
  pitchingTeam,
  season,
  team,
}: {
  game: DailySlateGame;
  opponentPitcher: Pitcher;
  pitchingTeam: Team;
  season: number;
  team: Team;
}) {
  return matchupService.getMatchupIntelligence(
    {
      asOfDate: game.game.scheduledAt.slice(0, 10),
      batterIds: team.lineup?.players.map((player) => `mlb-player-${player.mlbId}`),
      batterMlbIds: team.lineup?.players.map((player) => player.mlbId),
      batterNames: team.lineup?.players.map((player) => player.fullName),
      pitcherId: opponentPitcher.id,
      pitcherMlbId: opponentPitcher.externalIds?.mlb,
      pitcherName: opponentPitcher.fullName,
      season,
    },
    {
      ballpark: game.game.ballpark,
      bullpen: pitchingTeam.strength?.bullpen,
      lineup: team.lineup,
      weather: game.weather,
    },
  );
}

function calculateScores(context: CandidateContext) {
  return {
    ballpark: average([
      context.game.game.ballpark?.hitterFriendlyRating,
      context.game.game.ballpark?.overallParkRating,
      normalizeRange(context.game.game.ballpark?.runFactor, 88, 118),
    ]),
    bullpenFatigue: normalizeRange(context.opponent.strength?.bullpen.workloadRating, 30, 85) ?? 50,
    bullpenStrength: normalizeInverse(context.opponent.strength?.bullpen.value, 85, 30) ?? 50,
    homeAway: context.isHome ? 58 : 50,
    lineup: average([
      context.team.lineup?.overallStrength,
      context.team.lineup?.contactRating,
      context.team.lineup?.powerRating,
      context.team.lineup?.averageOps ? normalizeRange(context.team.lineup.averageOps, 0.62, 0.9) : undefined,
    ]),
    matchup: average([
      context.matchup.overallMatchupScore,
      context.matchup.pitchTypeMatch.score,
      context.matchup.zoneMatch.score,
    ]),
    offense: average([
      context.team.strength?.offense.value,
      normalizeRange(context.team.strength?.offense.runsPerGame, 3.3, 5.9),
      normalizeRange(context.team.strength?.offense.ops, 0.64, 0.86),
      normalizeInverse(context.team.strength?.offense.strikeoutRate, 28, 17),
      normalizeRange(context.team.strength?.offense.walkRate, 6, 11),
    ]),
    opponentDefense: 50,
    recentForm: average([
      context.team.recentForm?.rating.value,
      normalizeRange(context.team.recentForm?.windows[7].runsPerGame, 2.8, 6.5),
      normalizeRange(context.team.recentForm?.windows[7].ops, 0.6, 0.92),
      normalizeRange(context.team.recentForm?.momentum.value, 35, 85),
    ]),
    restTravel: 50,
    starter: average([
      normalizeInverse(context.opponentPitcher.era, 5.6, 2.2),
      normalizeInverse(context.opponentPitcher.whip, 1.55, 0.9),
      normalizeInverse(context.opponentPitcher.strikeoutRate, 34, 17),
      normalizeRange(context.opponentPitcher.homeRunsPer9, 0.5, 1.8),
    ]),
    weather: average([
      context.game.weather.runEnvironment,
      context.game.weather.offenseEnvironment,
      context.game.weather.hitterFriendlyRating,
      context.game.weather.tailwindMph ? normalizeRange(context.game.weather.tailwindMph, 0, 18) : undefined,
      normalizeRange(context.game.weather.temperatureF, 45, 92),
    ]),
  };
}

function weightedScore(scores: ReturnType<typeof calculateScores>) {
  const weights = TEAM_TOTALS_CONFIG.scoreWeights;

  return Math.round(
    scores.offense * weights.offense +
      scores.lineup * weights.lineup +
      scores.starter * weights.starter +
      scores.matchup * weights.matchup +
      scores.bullpenStrength * weights.bullpenStrength +
      scores.bullpenFatigue * weights.bullpenFatigue +
      scores.ballpark * weights.ballpark +
      scores.weather * weights.weather +
      scores.recentForm * weights.recentForm +
      scores.homeAway * weights.homeAway +
      scores.restTravel * weights.restTravel +
      scores.opponentDefense * weights.opponentDefense,
  );
}

function calculateProjectedRuns(
  context: CandidateContext,
  scores: ReturnType<typeof calculateScores>,
) {
  const predictionRuns = context.isHome
    ? context.game.game.prediction?.homeProjectedRuns
    : context.game.game.prediction?.awayProjectedRuns;
  const base =
    predictionRuns ??
    context.team.strength?.offense.runsPerGame ??
    context.team.recentForm?.windows[30].runsPerGame ??
    4.3;
  const scoringAdjustment =
    (weightedScore(scores) - 50) / 28 +
    (scores.weather - 50) / 120 +
    (scores.ballpark - 50) / 110;

  return roundToTenth(Math.max(1.8, Math.min(8.5, base + scoringAdjustment)));
}

function estimateSportsbookTeamTotal(context: CandidateContext) {
  const gameTotal = context.game.game.odds.total.line || context.game.game.prediction?.projectedTotalRuns || 8.5;
  const predictedTeamRuns = context.isHome
    ? context.game.game.prediction?.homeProjectedRuns
    : context.game.game.prediction?.awayProjectedRuns;
  const predictedTotal = context.game.game.prediction?.projectedTotalRuns;

  if (predictedTeamRuns !== undefined && predictedTotal) {
    return roundToHalf(gameTotal * (predictedTeamRuns / predictedTotal));
  }

  return roundToHalf(context.isHome ? gameTotal / 2 + 0.15 : gameTotal / 2 - 0.15);
}

function buildFactors(
  context: CandidateContext,
  scores: ReturnType<typeof calculateScores>,
): TeamTotalFactor[] {
  const weights = TEAM_TOTALS_CONFIG.scoreWeights;

  return [
    factor("Offense Quality", scores.offense, weights.offense, "Season offense, runs per game, OPS, strikeout rate, and walk rate.", [
      { label: "Runs/Game", value: formatNumber(context.team.strength?.offense.runsPerGame) },
      { label: "OPS", value: context.team.strength?.offense.ops.toFixed(3) ?? "-" },
    ]),
    factor("Lineup", scores.lineup, weights.lineup, "Projected lineup strength, contact, power, and lineup certainty.", [
      { label: "Status", value: context.team.lineup?.status ?? "unavailable" },
      { label: "Strength", value: formatScore(context.team.lineup?.overallStrength) },
    ]),
    factor("Starting Pitcher Matchup", scores.starter, weights.starter, "Opponent starter run-prevention risk from ERA, WHIP, strikeouts, and HR/9.", [
      { label: context.opponentPitcher.fullName, value: `${context.opponentPitcher.era.toFixed(2)} ERA` },
    ]),
    factor("Pitch/Zone Match", scores.matchup, weights.matchup, "Existing Pitch Match and Zone Match intelligence.", [
      { label: "Pitch Match", value: formatScore(context.matchup.pitchTypeMatch.score) },
      { label: "Zone Match", value: formatScore(context.matchup.zoneMatch.score) },
    ]),
    factor("Bullpen Strength", scores.bullpenStrength, weights.bullpenStrength, "Opponent bullpen quality from existing bullpen intelligence.", [
      { label: "Bullpen", value: formatScore(context.opponent.strength?.bullpen.value) },
    ]),
    factor("Bullpen Fatigue", scores.bullpenFatigue, weights.bullpenFatigue, "Opponent bullpen workload and fatigue.", [
      { label: "Workload", value: formatScore(context.opponent.strength?.bullpen.workloadRating) },
    ]),
    factor("Park Factor", scores.ballpark, weights.ballpark, "Run factor, hitter friendliness, and overall park environment.", [
      { label: "Park", value: context.game.game.ballpark?.name ?? context.game.game.venue },
    ]),
    factor("Weather", scores.weather, weights.weather, "Temperature, wind, air density, and run environment.", [
      { label: "Weather", value: context.game.weather.summary },
      { label: "Wind", value: `${context.game.weather.windMph} MPH ${context.game.weather.relativeWindDirection}` },
    ]),
    factor("Recent Form", scores.recentForm, weights.recentForm, "Recent runs, OPS, and momentum.", [
      { label: "Last 7 Runs/Game", value: formatNumber(context.team.recentForm?.windows[7].runsPerGame) },
    ]),
    factor("Home/Away", scores.homeAway, weights.homeAway, "Home field included; rest and travel stay neutral placeholders.", [
      { label: "Side", value: context.isHome ? "Home" : "Away" },
    ]),
    factor("Opponent Defense", scores.opponentDefense, weights.opponentDefense, "Placeholder-neutral until a defense provider is available.", [
      { label: "Status", value: "Placeholder" },
    ]),
  ];
}

function buildReasons(context: CandidateContext, scores: ReturnType<typeof calculateScores>) {
  const reasons: string[] = [];

  if (scores.offense >= 72) reasons.push("Elite offense");
  if (scores.lineup >= 72) reasons.push("Top lineup form");
  if (scores.starter >= 68) reasons.push("Favorable starting pitcher matchup");
  if (scores.matchup >= 72) reasons.push("Excellent pitch matchup");
  if (scores.bullpenStrength >= 66) reasons.push("Weak opposing bullpen");
  if (scores.bullpenFatigue >= 66) reasons.push("Bullpen fatigue increases scoring opportunity");
  if (scores.weather >= 66) reasons.push("Positive wind and weather run environment");
  if (scores.ballpark >= 66) reasons.push("Favorable park factor");
  if (scores.recentForm >= 68) reasons.push("Strong recent run-scoring form");
  if (context.isHome) reasons.push("Home plate appearance floor");

  return reasons.length > 0 ? reasons.slice(0, 7) : ["Market appears efficient with no major scoring edge."];
}

function calculateConfidence({
  edgePercent,
  gameGrade,
  matchup,
  team,
}: {
  edgePercent: number;
  gameGrade: number;
  matchup: MatchupIntelligenceResult;
  team: Team;
}) {
  const weights = TEAM_TOTALS_CONFIG.confidence;
  const inputQuality = average([
    matchup.confidence,
    team.lineup?.lineupConfidence,
    team.strength?.overall.value,
  ]);
  const edgeScore = normalizeRange(edgePercent, -2, 8);

  return Math.round(
    (edgeScore ?? 50) * weights.edgeWeight +
      gameGrade * weights.gradeWeight +
      inputQuality * weights.inputQualityWeight +
      matchup.overallMatchupScore * weights.rankingWeight,
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
}): TeamTotalsRecommendation {
  const thresholds = TEAM_TOTALS_CONFIG.thresholds;

  if (gameGrade >= thresholds.eliteGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Elite";
  if (gameGrade >= thresholds.strongGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Strong Play";
  if (gameGrade >= thresholds.playGrade && edgePercent >= thresholds.playEdge && expectedValuePercent > 0) return "Play";
  if (edgePercent >= thresholds.leanEdge) return "Lean";
  return "Pass";
}

function runsToProbability(edgeRuns: number) {
  return Math.max(0.05, Math.min(0.95, 0.5 + edgeRuns * 0.12));
}

function getBetId(candidate: TeamTotalCandidate) {
  return `team-total-${candidate.game.game.id}-${candidate.team.id}`;
}

function findFactor(candidate: TeamTotalCandidate, label: string) {
  return candidate.factors.find((item) => item.label === label);
}

function factor(
  label: string,
  score: number,
  weight: number,
  explanation: string,
  details: Array<{ label: string; value: string }>,
): TeamTotalFactor {
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

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
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
