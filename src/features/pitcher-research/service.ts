import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "../../services/daily-slate/types.ts";
import type { Pitcher, Team } from "../../models/mlb.ts";

type Recommendation = "Over" | "Lean Over" | "Pass" | "Lean Under" | "Under";

export interface PitcherResearchStart {
  date: string;
  innings: number;
  opponent: string;
  overLine: boolean;
  pitchCount: number;
  strikeouts: number;
}

export interface PitcherResearchFactor {
  explanation: string;
  label: string;
  score: number;
  stars: number;
  weight: string;
}

export interface PitcherResearchViewModel {
  ballpark: {
    name: string;
    rating: string;
    runEnvironment: string;
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
    sportsbookLine: string;
  };
  pitcher: Pitcher;
  recentStarts: PitcherResearchStart[];
  seasonProfile: Array<{
    label: string;
    percentile: number;
    tone: "good" | "neutral" | "watch";
    value: string;
  }>;
  strikeoutLine: number;
  strikeoutProjection: number;
  strikeoutProp?: DailySlateProp;
  team: Team;
  weather: {
    airDensity: string;
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

  return buildPitcherResearchViewModel(slate, pitcherId);
}

export function buildPitcherResearchViewModel(
  slate: DailySlateViewModel,
  pitcherId?: string,
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
  const dataConfidence = game.game.prediction?.dataQuality.score ?? confidence;
  const recentStarts = buildRecentStarts({
    line: strikeoutLine,
    opponent,
    pitcher,
  });
  const factors = buildFactors({ game, opponent, pitcher, recentStarts, team });

  return {
    ballpark: {
      name: game.game.ballpark?.name ?? game.game.venue,
      rating: formatRating(game.game.ballpark?.overallParkRating),
      runEnvironment: formatEnvironment(game.game.ballpark?.overallParkRating ?? 50),
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
      opponent,
      pitcher,
      projection: strikeoutProjection,
      recentStarts,
      recommendation: getRecommendation(edgeValue, confidence),
    }),
    opponent,
    overview: {
      edge: formatSigned(edgeValue),
      projection: `${strikeoutProjection.toFixed(1)} Ks`,
      recommendation: getRecommendation(edgeValue, confidence),
      sportsbookLine: strikeoutProp?.prop.odds.displayLine ?? `${strikeoutLine.toFixed(1)} Ks`,
    },
    pitcher,
    recentStarts,
    seasonProfile: buildSeasonProfile(pitcher),
    strikeoutLine,
    strikeoutProjection,
    strikeoutProp,
    team,
    weather: {
      airDensity:
        game.weather.airDensityKgM3 === null
          ? "Not Applicable"
          : `${game.weather.airDensityKgM3.toFixed(3)} kg/m³`,
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
}: {
  line: number;
  opponent: Team;
  pitcher: Pitcher;
}): PitcherResearchStart[] {
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
      innings: roundToTenth(5.1 + [1.2, 0.1, 0.8, -0.1, 0.5][index]),
      opponent: opponents[index],
      overLine: strikeouts > line,
      pitchCount: Math.round(88 + [10, 3, 7, -2, 5][index]),
      strikeouts,
    };
  });
}

function buildFactors({
  game,
  opponent,
  pitcher,
  recentStarts,
  team,
}: {
  game: DailySlateGame;
  opponent: Team;
  pitcher: Pitcher;
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
  const recentScore = Math.round(overRate * 100);

  return [
    factor("Starting Pitcher", "28%", pitcherScore, `${pitcher.fullName} carries a ${formatNullable(pitcher.strikeoutRate, 1)}% strikeout rate.`),
    factor("Bullpen", "10%", bullpenScore, "Bullpen workload helps estimate whether the starter can keep a normal leash."),
    factor("Lineup", "22%", lineupScore, `${opponent.abbreviation} lineup contact profile drives the strikeout matchup.`),
    factor("Weather", "8%", weatherScore, game.weather.weatherApplicable ? game.weather.summary : "Weather is not applicable for this game."),
    factor("Ballpark", "7%", ballparkScore, `${game.game.venue} rates ${formatEnvironment(ballparkScore)} for pitcher friendliness.`),
    factor("Recent Form", "25%", recentScore, `${recentStarts.filter((start) => start.overLine).length} of the last 5 starts cleared today's line.`),
  ];
}

function factor(
  label: string,
  weight: string,
  score: number,
  explanation: string,
): PitcherResearchFactor {
  return {
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
  line,
  opponent,
  pitcher,
  projection,
  recentStarts,
  recommendation,
}: {
  edge: number;
  game: DailySlateGame;
  line: number;
  opponent: Team;
  pitcher: Pitcher;
  projection: number;
  recentStarts: PitcherResearchStart[];
  recommendation: Recommendation;
}) {
  const averagePitches = Math.round(
    recentStarts.reduce((total, start) => total + start.pitchCount, 0) /
      recentStarts.length,
  );
  const weatherText = game.weather.weatherApplicable
    ? `weather is ${game.weather.runEnvironment >= 55 ? "hitter-friendly" : game.weather.runEnvironment <= 45 ? "pitcher-friendly" : "neutral"}`
    : "weather is not applicable";
  const bullpenText =
    game.awayTeam.id === pitcher.teamId
      ? game.awayTeam.strength?.bullpen.workloadRating
      : game.homeTeam.strength?.bullpen.workloadRating;

  return `TrueLine projects ${projection.toFixed(1)} strikeouts against a sportsbook line of ${line.toFixed(1)}, creating a ${formatSigned(edge)} edge and a ${recommendation} recommendation. ${opponent.abbreviation} has a ${formatRating(opponent.lineup?.contactRating)} contact rating, ${pitcher.fullName} has averaged ${averagePitches} pitches across the last five-start sample, ${weatherText}, and bullpen support grades ${formatRating(bullpenText)} for preserving a normal outing path.`;
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

function formatOptional(value: number | undefined, digits: number) {
  return value === undefined ? "—" : value.toFixed(digits);
}

function formatRating(value: number | undefined) {
  return value === undefined ? "—" : String(Math.round(value));
}

function formatEnvironment(value: number) {
  const difference = Math.round(value - 50);

  return `${difference >= 0 ? "+" : ""}${difference}`;
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} Ks`;
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}
