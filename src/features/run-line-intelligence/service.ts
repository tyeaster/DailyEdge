import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type { Team } from "../../models/mlb.ts";
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
import { RUN_LINE_CONFIG } from "./config.ts";

type RunLineRecommendation = "Elite" | "Strong Play" | "Play" | "Lean" | "Pass";
type RunLineSide = "away" | "home";

export interface RunLineFactor {
  details: Array<{ label: string; value: string }>;
  explanation: string;
  label: string;
  score: number;
  weight: string;
}

export interface RunLineCandidate {
  confidence: number;
  coverProbability: number;
  coverProbabilityDisplay: string;
  edgePercent: number;
  edgePercentDisplay: string;
  expectedValuePercent: number;
  expectedValueDisplay: string;
  factors: RunLineFactor[];
  fairSpread: number;
  fairSpreadDisplay: string;
  game: DailySlateGame;
  gameGrade: number;
  opponent: Team;
  projectedMargin: number;
  projectedMarginDisplay: string;
  ranked?: RankedBetCandidate;
  reasons: string[];
  recommendation: RunLineRecommendation;
  selectedTeam: Team;
  side: RunLineSide;
  sportsbookOdds: number;
  sportsbookOddsDisplay: string;
  sportsbookRunLine: number;
  sportsbookRunLineDisplay: string;
  trueLineRunLine: number;
  winProbability: number;
  winProbabilityDisplay: string;
}

export interface RunLineViewModel {
  candidates: RunLineCandidate[];
  slateMeta: {
    averageConfidence: string;
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
  };
  topCandidate?: RunLineCandidate;
}

interface GameContext {
  awayMatchup: MatchupIntelligenceResult;
  game: DailySlateGame;
  homeMatchup: MatchupIntelligenceResult;
}

interface CandidateContext extends GameContext {
  side: RunLineSide;
}

export class RunLineIntelligenceService {
  private readonly rankingEngine: RankingEngineService;

  constructor(rankingEngine = new RankingEngineService()) {
    this.rankingEngine = rankingEngine;
  }

  async getRunLineIntelligence(): Promise<RunLineViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();

    return this.getRunLineIntelligenceFromSlate(slate);
  }

  async getRunLineIntelligenceFromSlate(slate: DailySlateViewModel): Promise<RunLineViewModel> {
    const contexts = await Promise.all(slate.games.map(loadGameContext));
    const candidates = contexts.flatMap((context) => [
      buildRunLineCandidate({ ...context, side: "away" }),
      buildRunLineCandidate({ ...context, side: "home" }),
    ]);
    const enriched = rankRunLineCandidates(candidates, this.rankingEngine);

    return buildRunLineViewModel(slate, enriched);
  }
}

export const runLineIntelligenceService = new RunLineIntelligenceService();

export async function getRunLineIntelligence() {
  return runLineIntelligenceService.getRunLineIntelligence();
}

export function buildRunLineViewModel(
  slate: DailySlateViewModel,
  candidates: RunLineCandidate[],
): RunLineViewModel {
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

export function rankRunLineCandidates(
  candidates: RunLineCandidate[],
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

export function buildRunLineCandidate(context: CandidateContext): RunLineCandidate {
  const scores = calculateScores(context);
  const gameGrade = weightedScore(scores);
  const selectedTeam = context.side === "home" ? context.game.homeTeam : context.game.awayTeam;
  const opponent = context.side === "home" ? context.game.awayTeam : context.game.homeTeam;
  const projectedMargin = calculateProjectedMargin(context);
  const sportsbookRunLine = getSportsbookRunLine(context);
  const fairSpread = roundToHalf(-projectedMargin);
  const marginEdge = projectedMargin + sportsbookRunLine;
  const coverProbability = marginToCoverProbability(marginEdge, gameGrade);
  const winProbability = marginToWinProbability(projectedMargin);
  const sportsbookOdds =
    context.game.game.odds.spread.price || RUN_LINE_CONFIG.defaultRunLineOdds;
  const impliedProbability = americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent = calculateEdgePercent(coverProbability, impliedProbability);
  const expectedValuePercent = calculateExpectedValuePercent(coverProbability, sportsbookOdds);
  const confidence = calculateConfidence({
    edgePercent,
    gameGrade,
    marginEdge,
    context,
  });
  const recommendation = getRecommendation({
    edgePercent,
    expectedValuePercent,
    gameGrade,
  });
  const factors = buildFactors(context, scores);
  const reasons = buildReasons(context, scores, selectedTeam);

  return {
    confidence,
    coverProbability,
    coverProbabilityDisplay: formatPercent(coverProbability * 100),
    edgePercent,
    edgePercentDisplay: formatSignedPercent(edgePercent),
    expectedValuePercent,
    expectedValueDisplay: formatSignedPercent(expectedValuePercent),
    factors,
    fairSpread,
    fairSpreadDisplay: formatSpread(fairSpread),
    game: context.game,
    gameGrade,
    opponent,
    projectedMargin,
    projectedMarginDisplay: formatSignedRuns(projectedMargin),
    reasons,
    recommendation,
    selectedTeam,
    side: context.side,
    sportsbookOdds,
    sportsbookOddsDisplay: formatAmericanOdds(sportsbookOdds),
    sportsbookRunLine,
    sportsbookRunLineDisplay: formatSpread(sportsbookRunLine),
    trueLineRunLine: fairSpread,
    winProbability,
    winProbabilityDisplay: formatPercent(winProbability * 100),
  };
}

function toBetCandidate(candidate: RunLineCandidate): BetCandidate {
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
    marketType: "run-line",
    modelProbability: candidate.coverProbability,
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.spread.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: [
      factorForRanking("matchupStrength", "Run Line Grade", candidate.gameGrade, "Composite run-line scoring grade."),
      factorForRanking("bullpenImpact", "Bullpen Difference", findFactor(candidate, "Bullpen Difference")?.score ?? 50, "Bullpen quality and late-inning advantage."),
      factorForRanking("lineupCertainty", "Lineup Strength", findFactor(candidate, "Lineup Strength")?.score ?? 50, "Lineup strength and certainty."),
      factorForRanking("recentForm", "Recent Form", findFactor(candidate, "Recent Form")?.score ?? 50, "Recent offensive and run-differential form."),
      factorForRanking("weatherImpact", "Weather", findFactor(candidate, "Weather")?.score ?? 50, "Weather and park scoring environment."),
    ],
    team: {
      id: candidate.selectedTeam.id,
      name: candidate.selectedTeam.name,
    },
    timestamp: candidate.game.game.odds.spread.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 62,
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

  return { awayMatchup, game, homeMatchup };
}

function calculateScores(context: CandidateContext) {
  const { game, side } = context;
  const selected = side === "home" ? game.homeTeam : game.awayTeam;
  const opponent = side === "home" ? game.awayTeam : game.homeTeam;
  const selectedPitcher = side === "home" ? game.homePitcher : game.awayPitcher;
  const opponentPitcher = side === "home" ? game.awayPitcher : game.homePitcher;
  const selectedMatchup = side === "home" ? context.homeMatchup : context.awayMatchup;
  const opponentMatchup = side === "home" ? context.awayMatchup : context.homeMatchup;
  const projectedMargin = calculateProjectedMargin(context);
  const offenseDifference = offenseScore(selected) - offenseScore(opponent);
  const bullpenDifference = bullpenScore(selected) - bullpenScore(opponent);
  const starterDifference = starterScore(selectedPitcher) - starterScore(opponentPitcher);
  const matchupDifference = average([
    selectedMatchup.overallMatchupScore - opponentMatchup.overallMatchupScore,
    selectedMatchup.pitchTypeMatch.score - opponentMatchup.pitchTypeMatch.score,
    selectedMatchup.zoneMatch.score - opponentMatchup.zoneMatch.score,
  ]);

  return {
    ballpark: average([
      game.game.ballpark?.overallParkRating,
      game.game.ballpark?.runFactor ? normalizeRange(game.game.ballpark.runFactor, 88, 118) : undefined,
    ]),
    blowoutPotential: normalizeRange(Math.abs(projectedMargin), 0, 4.5) ?? 50,
    bullpenDifference: differenceToScore(bullpenDifference),
    homeField: side === "home" ? 58 : 50,
    lateInningAdvantage: differenceToScore(
      bullpenDifference + (selected.strength?.bullpen.workloadRating ? (50 - selected.strength.bullpen.workloadRating) / 4 : 0),
    ),
    lineupStrength: average([
      selected.lineup?.overallStrength,
      selected.lineup?.powerRating,
      selected.lineup?.contactRating,
      selected.lineup?.lineupConfidence,
    ]),
    matchup: differenceToScore(matchupDifference),
    offenseDifference: differenceToScore(offenseDifference),
    projectedMargin: normalizeRange(projectedMargin, -2.5, 4.5) ?? 50,
    recentForm: differenceToScore(
      average([
        selected.recentForm?.rating.value,
        normalizeRange(selected.recentForm?.windows[7].runDifferentialPerGame, -2, 2),
        normalizeRange(selected.recentForm?.windows[7].runsPerGame, 2.8, 6.5),
      ]) -
        average([
          opponent.recentForm?.rating.value,
          normalizeRange(opponent.recentForm?.windows[7].runDifferentialPerGame, -2, 2),
          normalizeRange(opponent.recentForm?.windows[7].runsPerGame, 2.8, 6.5),
        ]),
    ),
    startingPitching: differenceToScore(starterDifference),
    weather: average([
      game.weather.runEnvironment,
      game.weather.offenseEnvironment,
      game.weather.weatherConfidence,
      game.weather.weatherApplicable ? undefined : 50,
    ]),
  };
}

function weightedScore(scores: ReturnType<typeof calculateScores>) {
  const weights = RUN_LINE_CONFIG.scoreWeights;

  return Math.round(
    scores.projectedMargin * weights.projectedMargin +
      scores.startingPitching * weights.startingPitching +
      scores.bullpenDifference * weights.bullpenDifference +
      scores.offenseDifference * weights.offenseDifference +
      scores.matchup * weights.matchup +
      scores.homeField * weights.homeField +
      scores.recentForm * weights.recentForm +
      scores.weather * weights.weather +
      scores.ballpark * weights.ballpark +
      scores.lineupStrength * weights.lineupStrength +
      scores.lateInningAdvantage * weights.lateInningAdvantage +
      scores.blowoutPotential * weights.blowoutPotential,
  );
}

function calculateProjectedMargin(context: CandidateContext) {
  const awayRuns =
    context.game.game.prediction?.awayProjectedRuns ??
    context.game.awayTeam.strength?.offense.runsPerGame ??
    4.2;
  const homeRuns =
    context.game.game.prediction?.homeProjectedRuns ??
    context.game.homeTeam.strength?.offense.runsPerGame ??
    4.35;
  const awayMargin = awayRuns - homeRuns;

  return roundToTenth(context.side === "away" ? awayMargin : -awayMargin);
}

function getSportsbookRunLine(context: CandidateContext) {
  const awayLine = context.game.game.odds.spread.line || -1.5;

  return context.side === "away" ? awayLine : -awayLine;
}

function buildFactors(
  context: CandidateContext,
  scores: ReturnType<typeof calculateScores>,
): RunLineFactor[] {
  const weights = RUN_LINE_CONFIG.scoreWeights;

  return [
    factor("Projected Margin", scores.projectedMargin, weights.projectedMargin, "Projected run margin versus the posted spread.", [
      { label: "Projected Margin", value: formatSignedRuns(calculateProjectedMargin(context)) },
      { label: "Sportsbook Spread", value: formatSpread(getSportsbookRunLine(context)) },
    ]),
    factor("Starting Pitching", scores.startingPitching, weights.startingPitching, "Starter quality difference using ERA, WHIP, strikeout rate, and HR risk.", [
      { label: context.game.awayPitcher.fullName, value: `${context.game.awayPitcher.era.toFixed(2)} ERA` },
      { label: context.game.homePitcher.fullName, value: `${context.game.homePitcher.era.toFixed(2)} ERA` },
    ]),
    factor("Bullpen Difference", scores.bullpenDifference, weights.bullpenDifference, "Bullpen quality, workload, and late-inning run prevention.", [
      { label: context.game.awayTeam.abbreviation, value: formatScore(context.game.awayTeam.strength?.bullpen.value) },
      { label: context.game.homeTeam.abbreviation, value: formatScore(context.game.homeTeam.strength?.bullpen.value) },
    ]),
    factor("Offense Difference", scores.offenseDifference, weights.offenseDifference, "Offensive quality, runs per game, OPS, and discipline gap.", [
      { label: context.game.awayTeam.abbreviation, value: formatNumber(context.game.awayTeam.strength?.offense.runsPerGame) },
      { label: context.game.homeTeam.abbreviation, value: formatNumber(context.game.homeTeam.strength?.offense.runsPerGame) },
    ]),
    factor("Pitch/Zone Match", scores.matchup, weights.matchup, "Pitch Match and Zone Match difference for the selected side.", [
      { label: "Pitch Match", value: formatScore((context.side === "home" ? context.homeMatchup : context.awayMatchup).pitchTypeMatch.score) },
      { label: "Zone Match", value: formatScore((context.side === "home" ? context.homeMatchup : context.awayMatchup).zoneMatch.score) },
    ]),
    factor("Home Field", scores.homeField, weights.homeField, "Home-field context and road baseline.", [
      { label: "Side", value: context.side === "home" ? "Home" : "Away" },
    ]),
    factor("Recent Form", scores.recentForm, weights.recentForm, "Recent run differential, scoring, and momentum.", [
      { label: "Selected", value: formatScore((context.side === "home" ? context.game.homeTeam : context.game.awayTeam).recentForm?.rating.value) },
    ]),
    factor("Weather", scores.weather, weights.weather, "Weather and run environment context.", [
      { label: "Weather", value: context.game.weather.summary },
    ]),
    factor("Ballpark", scores.ballpark, weights.ballpark, "Park scoring context and run factor.", [
      { label: "Park", value: context.game.game.ballpark?.name ?? context.game.game.venue },
    ]),
    factor("Lineup Strength", scores.lineupStrength, weights.lineupStrength, "Lineup strength, contact, power, and confirmation quality.", [
      { label: "Lineup", value: (context.side === "home" ? context.game.homeTeam : context.game.awayTeam).lineup?.status ?? "unavailable" },
    ]),
    factor("Late Inning Advantage", scores.lateInningAdvantage, weights.lateInningAdvantage, "Bullpen edge and fatigue impact on spread-cover probability.", [
      { label: "Status", value: "Bullpen-derived" },
    ]),
    factor("Blowout Potential", scores.blowoutPotential, weights.blowoutPotential, "Whether the projected gap is large enough to support a run-line cover.", [
      { label: "Margin", value: formatSignedRuns(calculateProjectedMargin(context)) },
    ]),
  ];
}

function buildReasons(
  context: CandidateContext,
  scores: ReturnType<typeof calculateScores>,
  selectedTeam: Team,
) {
  const reasons: string[] = [];

  if (scores.startingPitching >= 68) reasons.push("Elite pitching mismatch");
  if (scores.bullpenDifference >= 68) reasons.push("Huge bullpen advantage");
  if (scores.offenseDifference >= 68) reasons.push("Top offense");
  if (scores.lateInningAdvantage >= 66) reasons.push("Weak opposing bullpen improves cover path");
  if (scores.projectedMargin >= 68) reasons.push("Large projected scoring gap");
  if (scores.matchup >= 68) reasons.push("Excellent matchup");
  if (scores.blowoutPotential >= 70) reasons.push("Blowout potential supports the spread");
  if (scores.lineupStrength >= 70) reasons.push("Strong lineup strength");
  if (context.side === "home") reasons.push("Home field supports run prevention and late scoring");

  return reasons.length > 0
    ? reasons.slice(0, 7)
    : [`${selectedTeam.name} run line is close to market with no major cover edge.`];
}

function calculateConfidence({
  context,
  edgePercent,
  gameGrade,
  marginEdge,
}: {
  context: CandidateContext;
  edgePercent: number;
  gameGrade: number;
  marginEdge: number;
}) {
  const weights = RUN_LINE_CONFIG.confidence;
  const inputQuality = average([
    context.game.game.prediction?.dataQuality.score,
    context.awayMatchup.confidence,
    context.homeMatchup.confidence,
    context.game.awayTeam.lineup?.lineupConfidence,
    context.game.homeTeam.lineup?.lineupConfidence,
  ]);
  const edgeScore = normalizeRange(edgePercent, -2, 8);
  const marginScore = normalizeRange(Math.abs(marginEdge), 0, 3);

  return Math.round(
    (edgeScore ?? 50) * weights.edgeWeight +
      gameGrade * weights.gradeWeight +
      inputQuality * weights.inputQualityWeight +
      (marginScore ?? 50) * weights.marginWeight,
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
}): RunLineRecommendation {
  const thresholds = RUN_LINE_CONFIG.thresholds;

  if (gameGrade >= thresholds.eliteGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Elite";
  if (gameGrade >= thresholds.strongGrade && edgePercent >= thresholds.strongEdge && expectedValuePercent > 0) return "Strong Play";
  if (gameGrade >= thresholds.playGrade && edgePercent >= thresholds.playEdge && expectedValuePercent > 0) return "Play";
  if (edgePercent >= thresholds.leanEdge) return "Lean";
  return "Pass";
}

function offenseScore(team: Team) {
  return average([
    team.strength?.offense.value,
    normalizeRange(team.strength?.offense.runsPerGame, 3.3, 5.9),
    normalizeRange(team.strength?.offense.ops, 0.64, 0.86),
    normalizeInverse(team.strength?.offense.strikeoutRate, 28, 17),
    normalizeRange(team.strength?.offense.walkRate, 6, 11),
    team.lineup?.overallStrength,
  ]);
}

function bullpenScore(team: Team) {
  return average([
    team.strength?.bullpen.value,
    normalizeInverse(team.strength?.bullpen.workloadRating, 85, 35),
    normalizeInverse(team.strength?.bullpen.era, 5.2, 2.8),
    normalizeInverse(team.strength?.bullpen.whip, 1.5, 1.05),
    normalizeRange(team.strength?.bullpen.strikeoutRate, 18, 32),
  ]);
}

function starterScore(pitcher: DailySlateGame["awayPitcher"]) {
  return average([
    normalizeInverse(pitcher.era, 5.6, 2.2),
    normalizeInverse(pitcher.whip, 1.55, 0.9),
    normalizeRange(pitcher.strikeoutRate, 17, 34),
    normalizeInverse(pitcher.homeRunsPer9, 1.8, 0.5),
  ]);
}

function marginToCoverProbability(marginEdge: number, grade: number) {
  return Math.max(0.05, Math.min(0.95, 0.5 + marginEdge * 0.1 + (grade - 50) / 400));
}

function marginToWinProbability(projectedMargin: number) {
  return Math.max(0.05, Math.min(0.95, 0.5 + projectedMargin * 0.08));
}

function differenceToScore(value: number) {
  return Math.max(0, Math.min(100, 50 + value * 1.25));
}

function getBetId(candidate: RunLineCandidate) {
  return `run-line-${candidate.game.game.id}-${candidate.side}`;
}

function findFactor(candidate: RunLineCandidate, label: string) {
  return candidate.factors.find((item) => item.label === label);
}

function factor(
  label: string,
  score: number,
  weight: number,
  explanation: string,
  details: Array<{ label: string; value: string }>,
): RunLineFactor {
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

function formatSpread(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatSignedRuns(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
