import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  calculateFairLine,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type {
  BetRecommendation,
  ConfidenceScore,
  EdgeScore,
  Game,
  Pitcher,
  Prediction,
  PredictionRecommendation,
  PredictionResult,
  Team,
} from "../../models/mlb.ts";

import { PREDICTION_ENGINE_V1_CONFIG } from "./config.ts";

export type PredictionEngineGameInput = {
  awayPitcher?: Pitcher;
  awayTeam: Team;
  game: Game;
  homePitcher?: Pitcher;
  homeTeam: Team;
};

export type PredictionEngineInput = {
  games: Game[];
  pitcherById: Record<string, Pitcher>;
  teamById: Record<string, Team>;
};

export type PredictionModelFactors = {
  homeField: number;
  sportsbook: number;
  startingPitcher: number;
  teamRecord: number;
};

export class PredictionEngine {
  predictSlate({ games, pitcherById, teamById }: PredictionEngineInput) {
    return games.flatMap((game) => {
      const awayTeam = teamById[game.awayTeamId];
      const homeTeam = teamById[game.homeTeamId];

      if (!awayTeam || !homeTeam) {
        return [];
      }

      return [
        this.predictGame({
          awayPitcher: pitcherById[game.awayPitcherId],
          awayTeam,
          game,
          homePitcher: pitcherById[game.homePitcherId],
          homeTeam,
        }),
      ];
    });
  }

  predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  }: PredictionEngineGameInput): PredictionResult {
    const factors = buildFactors({
      awayPitcher,
      awayTeam,
      game,
      homePitcher,
      homeTeam,
    });
    const homeWinProbability = clampProbability(weightFactors(factors));
    const awayWinProbability = 1 - homeWinProbability;
    const predictedHomeWinner = homeWinProbability >= awayWinProbability;
    const predictedWinnerTeamId = predictedHomeWinner ? homeTeam.id : awayTeam.id;
    const sportsbookHomeProbability = getSportsbookHomeProbability(game);
    const sportsbookAwayProbability =
      getMoneylineOutcome(game, "away")?.impliedProbability ??
      1 - sportsbookHomeProbability;
    const homeEdgePercent = calculateEdgePercent(
      homeWinProbability,
      sportsbookHomeProbability,
    );
    const awayEdgePercent = calculateEdgePercent(
      awayWinProbability,
      sportsbookAwayProbability,
    );
    const selectHomeSide = homeEdgePercent >= awayEdgePercent;
    const selectedTeamId = selectHomeSide ? homeTeam.id : awayTeam.id;
    const selectedWinProbability = selectHomeSide
      ? homeWinProbability
      : awayWinProbability;
    const impliedSportsbookProbability = selectHomeSide
      ? sportsbookHomeProbability
      : sportsbookAwayProbability;
    const selectedOutcome = getMoneylineOutcome(
      game,
      selectHomeSide ? "home" : "away",
    );
    const sportsbookMoneyline = getSelectedSportsbookMoneyline({
      game,
      selectHomeSide,
      sportsbookAwayProbability,
    });
    const edgePercent = selectHomeSide ? homeEdgePercent : awayEdgePercent;
    const expectedValuePercent = calculateExpectedValuePercent(
      selectedWinProbability,
      sportsbookMoneyline,
    );
    const confidenceScore = calculateConfidence({
      edgePercent,
      factors,
      homeWinProbability,
    });
    const recommendation = getRecommendation({
      confidenceScore,
      edgePercent,
      expectedValuePercent,
    });
    const projectedTotalRuns = getProjectedTotalRuns(game);
    const homeProjectedRuns = roundToTenth(projectedTotalRuns * homeWinProbability);
    const awayProjectedRuns = roundToTenth(projectedTotalRuns - homeProjectedRuns);
    const homeFairMoneyline = calculateFairLine(homeWinProbability);
    const awayFairMoneyline = calculateFairLine(awayWinProbability);

    return {
      awayFairMoneyline,
      awayProjectedRuns,
      awayWinProbability,
      confidenceScore,
      edgePercent: roundToTenth(edgePercent),
      expectedValuePercent: roundToTenth(expectedValuePercent),
      explanations: buildExplanations({
        awayPitcher,
        awayTeam,
        factors,
        homePitcher,
        homeTeam,
        selectHomeSide,
      }),
      gameId: game.id,
      homeFairMoneyline,
      homeProjectedRuns,
      homeWinProbability,
      impliedSportsbookProbability,
      predictedWinnerTeamId,
      projectedTotalRuns,
      recommendation,
      selectedFairMoneyline: selectHomeSide
        ? homeFairMoneyline
        : awayFairMoneyline,
      selectedTeamId,
      selectedWinProbability,
      sportsbook: selectedOutcome?.sportsbook ?? game.odds.moneyline.sportsbook,
      sportsbookLine: game.odds.moneyline.displayLine,
      sportsbookMoneyline,
      sportsbookUpdatedAt:
        selectedOutcome?.updatedAt ?? game.odds.moneyline.updatedAt,
    };
  }
}

export const predictionEngine = new PredictionEngine();

export function calculateExpectedValuePercent(
  modelProbability: number,
  americanOdds: number,
) {
  if (americanOdds === 0) {
    return 0;
  }

  // Expected value per one unit risked:
  // EV = (win probability * profit if won) - (loss probability * 1 unit).
  const profitPerUnit =
    americanOdds > 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);

  return (
    (modelProbability * profitPerUnit - (1 - modelProbability)) *
    100
  );
}

export function calculateConfidence({
  edgePercent,
  factors,
  homeWinProbability,
}: {
  edgePercent: number;
  factors: PredictionModelFactors;
  homeWinProbability: number;
}) {
  const clarity = Math.min(1, Math.abs(homeWinProbability - 0.5) / 0.2);
  const edgeStrength = Math.min(1, Math.max(0, edgePercent) / 10);
  const factorDirections = Object.values(factors).map((factor) => {
    if (Math.abs(factor - 0.5) < 0.02) {
      return 0;
    }

    return factor > 0.5 ? 1 : -1;
  });
  const positiveFactors = factorDirections.filter((direction) => direction > 0).length;
  const negativeFactors = factorDirections.filter((direction) => direction < 0).length;
  const agreement =
    factorDirections.length === 0
      ? 0
      : Math.abs(positiveFactors - negativeFactors) / factorDirections.length;
  const config = PREDICTION_ENGINE_V1_CONFIG.confidence;

  return Math.round(
    Math.min(
      100,
      config.base +
        clarity * config.clarityWeight +
        edgeStrength * config.edgeWeight +
        agreement * config.agreementWeight,
    ),
  );
}

export function getRecommendation({
  confidenceScore,
  edgePercent,
  expectedValuePercent,
}: {
  confidenceScore: number;
  edgePercent: number;
  expectedValuePercent: number;
}): PredictionRecommendation {
  for (const threshold of PREDICTION_ENGINE_V1_CONFIG.recommendationThresholds) {
    if (
      edgePercent >= threshold.minimumEdgePercent &&
      expectedValuePercent >= threshold.minimumExpectedValuePercent &&
      confidenceScore >= threshold.minimumConfidence
    ) {
      return threshold.recommendation;
    }
  }

  return "Pass";
}

export function applyPredictionsToGames({
  games,
  predictions,
}: {
  games: Game[];
  predictions: PredictionResult[];
}) {
  const predictionByGameId = Object.fromEntries(
    predictions.map((prediction) => [prediction.gameId, prediction]),
  );

  return games.map((game) => {
    const prediction = predictionByGameId[game.id];

    if (!prediction) {
      return game;
    }

    return {
      ...game,
      confidence: toConfidenceScore(prediction.confidenceScore),
      detail: prediction.explanations.join(". "),
      modelProbability: prediction.selectedWinProbability,
      prediction,
    };
  });
}

export function buildPredictionRecommendations({
  games,
  predictions,
  teamById,
}: {
  games: Game[];
  predictions: PredictionResult[];
  teamById: Record<string, Team>;
}): BetRecommendation[] {
  const gameById = Object.fromEntries(games.map((game) => [game.id, game]));
  const recommendations: BetRecommendation[] = [];

  for (const result of predictions) {
    const game = gameById[result.gameId];
    const team = teamById[result.selectedTeamId];

    if (!game || !team) {
      continue;
    }

    const confidence = toConfidenceScore(result.confidenceScore);
    const edge = buildEdgeScore(result.edgePercent);
    const prediction: Prediction = {
      confidence,
      edge,
      gameId: game.id,
      id: `prediction-${game.id}-${team.id}-moneyline`,
      market: "moneyline",
      projection: formatAmericanOdds(result.selectedFairMoneyline),
      reasoning: result.explanations.join(". "),
      teamId: team.id,
    };

    recommendations.push({
      confidence,
      edge,
      gameId: game.id,
      id: `bet-${game.id}-${team.id}-moneyline`,
      modelProbability: result.selectedWinProbability,
      odds: {
        ...game.odds.moneyline,
        price: result.sportsbookMoneyline,
      },
      prediction,
      rank: 0,
      recommendedUnits: getRecommendedUnits(result.recommendation),
      selection: `${team.abbreviation} moneyline`,
      teamId: team.id,
    });
  }

  return recommendations
    .sort((left, right) => right.edge.percentage - left.edge.percentage)
    .map((bet, index) => ({
      ...bet,
      rank: index + 1,
    }));
}

function buildFactors({
  awayPitcher,
  awayTeam,
  game,
  homePitcher,
  homeTeam,
}: PredictionEngineGameInput): PredictionModelFactors {
  return {
    homeField: PREDICTION_ENGINE_V1_CONFIG.homeFieldWinProbability,
    sportsbook: getSportsbookHomeProbability(game),
    startingPitcher: getStartingPitcherHomeProbability(
      homePitcher,
      awayPitcher,
    ),
    teamRecord: getTeamRecordHomeProbability(homeTeam, awayTeam),
  };
}

function weightFactors(factors: PredictionModelFactors) {
  const weights = PREDICTION_ENGINE_V1_CONFIG.weights;
  const totalWeight = Object.values(weights).reduce(
    (total, weight) => total + weight,
    0,
  );

  return (
    (factors.startingPitcher * weights.startingPitcher +
      factors.teamRecord * weights.teamRecord +
      factors.homeField * weights.homeField +
      factors.sportsbook * weights.sportsbook) /
    totalWeight
  );
}

function getStartingPitcherHomeProbability(
  homePitcher: Pitcher | undefined,
  awayPitcher: Pitcher | undefined,
) {
  const homeScore = getPitcherScore(homePitcher);
  const awayScore = getPitcherScore(awayPitcher);

  return clamp01(0.5 + (homeScore - awayScore) * 0.25);
}

function getPitcherScore(pitcher: Pitcher | undefined) {
  if (!isKnownStarter(pitcher)) {
    return 0.5;
  }

  const availableScores: number[] = [];

  if (pitcher.era > 0) {
    availableScores.push(clamp01((5 - pitcher.era) / 3));
  }

  if (pitcher.whip > 0) {
    availableScores.push(clamp01((1.5 - pitcher.whip) / 0.7));
  }

  if (pitcher.strikeoutRate > 0) {
    availableScores.push(clamp01((pitcher.strikeoutRate - 15) / 20));
  }

  if (availableScores.length === 0) {
    return 0.5;
  }

  return (
    availableScores.reduce((total, score) => total + score, 0) /
    availableScores.length
  );
}

function getTeamRecordHomeProbability(homeTeam: Team, awayTeam: Team) {
  const homeRecord = homeTeam.record?.winPercentage ?? 0.5;
  const awayRecord = awayTeam.record?.winPercentage ?? 0.5;
  const combined = homeRecord + awayRecord;

  return combined > 0 ? homeRecord / combined : 0.5;
}

function getSportsbookHomeProbability(game: Game) {
  const homeOutcome = getMoneylineOutcome(game, "home");

  if (homeOutcome) {
    return homeOutcome.impliedProbability;
  }

  if (game.odds.moneyline.price === 0) {
    return 0.5;
  }

  return (
    game.odds.moneyline.impliedProbability ??
    americanOddsToImpliedProbability(game.odds.moneyline.price)
  );
}

function getSelectedSportsbookMoneyline({
  game,
  selectHomeSide,
  sportsbookAwayProbability,
}: {
  game: Game;
  selectHomeSide: boolean;
  sportsbookAwayProbability: number;
}) {
  const selectedOutcome = getMoneylineOutcome(
    game,
    selectHomeSide ? "home" : "away",
  );

  if (selectedOutcome) {
    return selectedOutcome.price;
  }

  if (selectHomeSide || game.odds.moneyline.price === 0) {
    return game.odds.moneyline.price;
  }

  return calculateFairLine(sportsbookAwayProbability);
}

function getMoneylineOutcome(game: Game, side: "away" | "home") {
  return game.odds.moneyline.outcomes?.find((outcome) => outcome.side === side);
}

function getProjectedTotalRuns(game: Game) {
  return roundToTenth(
    game.odds.total.line > 0
      ? game.odds.total.line
      : PREDICTION_ENGINE_V1_CONFIG.neutralProjectedRuns,
  );
}

function buildExplanations({
  awayPitcher,
  awayTeam,
  factors,
  homePitcher,
  homeTeam,
  selectHomeSide,
}: {
  awayPitcher?: Pitcher;
  awayTeam: Team;
  factors: PredictionModelFactors;
  homePitcher?: Pitcher;
  homeTeam: Team;
  selectHomeSide: boolean;
}) {
  const selectedTeam = selectHomeSide ? homeTeam : awayTeam;
  const explanations: string[] = [];

  if (Math.abs(factors.startingPitcher - 0.5) >= 0.02) {
    explanations.push(
      factors.startingPitcher > 0.5
        ? `Starting pitcher advantage: ${homePitcher?.fullName ?? homeTeam.abbreviation}`
        : `Starting pitcher advantage: ${awayPitcher?.fullName ?? awayTeam.abbreviation}`,
    );
  } else {
    explanations.push("Starting pitcher input is neutral or incomplete");
  }

  if (Math.abs(factors.teamRecord - 0.5) >= 0.02) {
    explanations.push(
      factors.teamRecord > 0.5
        ? `Better team record: ${homeTeam.abbreviation}`
        : `Better team record: ${awayTeam.abbreviation}`,
    );
  } else {
    explanations.push("Team records are closely matched");
  }

  explanations.push(`Home field advantage: ${homeTeam.abbreviation}`);
  explanations.push(
    `Sportsbook probability is used as a low-weight market reference`,
  );
  explanations.push(`Value side: ${selectedTeam.abbreviation}`);

  return explanations;
}

function buildEdgeScore(edgePercent: number): EdgeScore {
  const percentage = roundToTenth(edgePercent);

  if (percentage >= 8) {
    return { percentage, rating: "S" };
  }

  if (percentage >= 5) {
    return { percentage, rating: "A" };
  }

  if (percentage >= 3) {
    return { percentage, rating: "B" };
  }

  return { percentage, rating: "C" };
}

function toConfidenceScore(value: number): ConfidenceScore {
  if (value >= 82) {
    return { label: "Elite", value };
  }

  if (value >= 72) {
    return { label: "High", value };
  }

  if (value >= 58) {
    return { label: "Medium", value };
  }

  return { label: "Low", value };
}

function getRecommendedUnits(recommendation: PredictionRecommendation) {
  if (recommendation === "Best Bet") {
    return 1.5;
  }

  if (recommendation === "Strong Play") {
    return 1;
  }

  if (recommendation === "Play") {
    return 0.75;
  }

  if (recommendation === "Lean") {
    return 0.25;
  }

  return 0;
}

function isKnownStarter(pitcher: Pitcher | undefined): pitcher is Pitcher {
  return Boolean(pitcher && pitcher.fullName !== "Probable starter TBD");
}

function clampProbability(probability: number) {
  const bounds = PREDICTION_ENGINE_V1_CONFIG.probabilityBounds;

  return Math.min(bounds.maximum, Math.max(bounds.minimum, probability));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}
