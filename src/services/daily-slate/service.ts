import type {
  BetRecommendation,
  Game,
  Pitcher,
  PlayerPropCategory,
  Team,
  Weather,
} from "@/src/models/mlb";
import { buildValueAssessment } from "@/src/lib/odds";
import { oddsService } from "@/src/services/OddsService";
import { applyOddsToGames } from "@/src/services/odds";
import {
  applyPredictionsToGames,
  buildPredictionRecommendations,
  predictionEngine,
} from "@/src/services/predictions";
import { liveMLBProvider, mockDataProvider } from "@/src/services/providers";
import type { TrueLineDataProvider } from "@/src/services/providers";
import {
  recordGameOddsSnapshots,
  recordHistoricalGameMarkets,
  recordHistoricalPropMarkets,
} from "@/src/services/OddsSnapshotRecorder";
import { recordMoneylinePredictions } from "@/src/services/PredictionRecorder";
import type { DashboardNavItem, KpiMetric } from "@/src/types/mlb-dashboard";

import { resolveBets, resolveInjuries, resolveProps } from "./resolve";
import type {
  DailySlateGame,
  DailySlateViewModel,
  DailySlateWeather,
} from "./types";

const propCategoryOrder: PlayerPropCategory[] = [
  "Strikeouts",
  "Hits",
  "Runs",
  "RBI",
  "Home Runs",
  "Total Bases",
];

export async function getDailySlate(
  provider: TrueLineDataProvider = liveMLBProvider,
): Promise<DailySlateViewModel> {
  if (provider !== liveMLBProvider) {
    return buildDailySlate(provider, "mock");
  }

  try {
    return await buildDailySlate(provider, "live");
  } catch (error) {
    const fallbackSlate = await buildDailySlate(mockDataProvider, "mock");

    return {
      ...fallbackSlate,
      error: error instanceof Error ? error.message : "Live MLB data unavailable",
      slateMeta: {
        ...fallbackSlate.slateMeta,
        dataSource: "mock",
        dataSourceMessage: "Using Mock Data",
      },
    };
  }
}

async function buildDailySlate(
  provider: TrueLineDataProvider,
  dataSource: "live" | "mock",
): Promise<DailySlateViewModel> {
  const [
    slateMeta,
    games,
    teams,
    players,
    pitchers,
    props,
    weatherReports,
    injuries,
  ] = await Promise.all([
    provider.getSlateMeta(),
    provider.games.list(),
    provider.teams.list(),
    provider.players.list(),
    provider.players.listPitchers(),
    provider.props.list(),
    provider.weather.list(),
    provider.injuries.list(),
  ]);

  const teamById = toRecord(teams);
  const playerById = toRecord(players);
  const pitcherById = toRecord(pitchers);
  const weatherById = toRecord(weatherReports);
  const oddsRecords = await loadGameOddsRecords();
  const weatherBackedGames = games.map((game) => ({
    ...game,
    weather: weatherById[game.weatherId] ?? game.weather,
  }));
  const oddsBackedGames = applyOddsToGames({
    games: weatherBackedGames,
    oddsRecords,
    teamById,
  });

  if (dataSource === "live") {
    await recordGameOddsSnapshots(oddsBackedGames, dataSource);
  }

  const gamePredictions = predictionEngine.predictSlate({
    games: oddsBackedGames,
    pitcherById,
    teamById,
  });

  if (dataSource === "live") {
    await recordMoneylinePredictions(gamePredictions);
    await recordHistoricalGameMarkets({
      dataSource,
      games: oddsBackedGames,
      predictions: gamePredictions,
    });
    await recordHistoricalPropMarkets({
      dataSource,
      games: oddsBackedGames,
      playerById,
      props,
    });
  }

  const predictedGames = applyPredictionsToGames({
    games: oddsBackedGames,
    predictions: gamePredictions,
  });
  const valuedGames = predictedGames.map(addGameValue);
  const valuedBets = buildPredictionRecommendations({
    games: valuedGames,
    predictions: gamePredictions,
    teamById,
  }).map(addBetValue);
  const valuedGameById = toRecord(valuedGames);
  const averageConfidence = getAverageConfidence(valuedGames);

  return {
    bets: resolveBets(valuedBets, playerById, teamById),
    dashboardNavItems: buildDashboardNavItems(valuedGames.length, valuedBets.length),
    dataSource,
    games: buildGames(valuedGames, teamById, pitcherById, weatherById),
    injuries: resolveInjuries(injuries, playerById, teamById),
    kpiMetrics: buildKpis(averageConfidence, valuedGames, valuedBets),
    propCategories: resolveProps(propCategoryOrder, props, playerById, teamById),
    slateMeta: {
      ...slateMeta,
      averageConfidence,
      dataSource,
      gamesToday: valuedGames.length,
    },
    weatherReports: weatherReports.map((report): DailySlateWeather => {
      const game = getRequired(valuedGameById, report.gameId, "game");

      return {
        awayTeam: getRequired(teamById, game.awayTeamId, "team"),
        game,
        homeTeam: getRequired(teamById, game.homeTeamId, "team"),
        report,
      };
    }),
  };
}

function getAverageConfidence(games: Game[]) {
  if (games.length === 0) {
    return "0%";
  }

  const average =
    games.reduce((total, game) => total + game.confidence.value, 0) / games.length;

  return `${Math.round(average)}%`;
}

async function loadGameOddsRecords() {
  try {
    const response = await oddsService.getOdds({
      markets: ["moneyline", "spread", "total"],
      sport: "mlb",
    });

    return response.records;
  } catch {
    return [];
  }
}

function addGameValue(game: Game): Game {
  const prediction = game.prediction;

  return {
    ...game,
    value: buildValueAssessment({
      modelProbability:
        prediction?.selectedWinProbability ?? game.modelProbability,
      recommendation: prediction?.recommendation ?? "Pass",
      sportsbookLine:
        prediction?.sportsbookLine ?? game.odds.moneyline.displayLine,
      sportsbookOdds:
        prediction?.sportsbookMoneyline ?? game.odds.moneyline.price,
    }),
  };
}

function addBetValue(bet: BetRecommendation): BetRecommendation {
  return {
    ...bet,
    value: buildValueAssessment({
      modelProbability: bet.modelProbability,
      recommendation: `${bet.recommendedUnits.toFixed(2)}u`,
      sportsbookLine: bet.odds.displayLine,
      sportsbookOdds: bet.odds.price,
    }),
  };
}

function buildGames(
  games: Game[],
  teamById: Record<string, Team>,
  pitcherById: Record<string, Pitcher>,
  weatherById: Record<string, Weather>,
) {
  return games.map((game): DailySlateGame => {
    return {
      awayPitcher: getRequired(pitcherById, game.awayPitcherId, "pitcher"),
      awayTeam: getRequired(teamById, game.awayTeamId, "team"),
      game,
      homePitcher: getRequired(pitcherById, game.homePitcherId, "pitcher"),
      homeTeam: getRequired(teamById, game.homeTeamId, "team"),
      weather: getRequired(weatherById, game.weatherId, "weather"),
    };
  });
}

function buildDashboardNavItems(gamesToday: number, betsToday: number): DashboardNavItem[] {
  return [
    {
      active: true,
      badge: String(gamesToday),
      href: "#daily-slate",
      icon: "⌂",
      label: "Slate",
    },
    { badge: String(gamesToday), href: "#games", icon: "◆", label: "Games" },
    { badge: String(betsToday), href: "#best-bets", icon: "↗", label: "Best Bets" },
    { href: "#player-props", icon: "◎", label: "Props" },
    { badge: "3", href: "#weather", icon: "☁", label: "Weather" },
    { href: "#injuries", icon: "!", label: "Injuries" },
  ];
}

function buildKpis(
  averageConfidence: string,
  games: Game[],
  bets: BetRecommendation[],
): KpiMetric[] {
  const highestConfidence = maxBy(bets, (bet) => bet.confidence.value);
  const highestEv = maxBy(bets, (bet) => bet.edge.percentage);
  const bestPitcherProp = bets.find((bet) => bet.id === "bet-wheeler-k") ?? highestEv;
  const bestHomeRunPick = bets.find((bet) => bet.selection === "Home run") ?? highestEv;

  return [
    {
      label: "Games Today",
      meta: "Primary slate markets",
      tone: "blue",
      value: String(games.length),
    },
    {
      label: "Highest Confidence Bet",
      meta: highestConfidence?.selection ?? "No bet loaded",
      tone: "emerald",
      value: `${highestConfidence?.confidence.value ?? 0}%`,
    },
    {
      label: "Highest EV Bet",
      meta: highestEv?.selection ?? "No edge loaded",
      tone: "emerald",
      value: `+${(highestEv?.edge.percentage ?? 0).toFixed(1)}%`,
    },
    {
      label: "Best Pitcher Prop",
      meta: bestPitcherProp?.selection ?? "No prop loaded",
      tone: "blue",
      value: `+${(bestPitcherProp?.edge.percentage ?? 0).toFixed(1)}%`,
    },
    {
      label: "Best Home Run Pick",
      meta: bestHomeRunPick?.playerId ? "Aaron Judge +285" : "No HR pick loaded",
      tone: "amber",
      value: bestHomeRunPick?.prediction.projection ?? "0%",
    },
    {
      label: "Avg Model Confidence",
      meta: "Across top signals",
      tone: "blue",
      value: averageConfidence,
    },
  ];
}

function toRecord<TData extends { id: string }>(items: TData[]) {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<
    string,
    TData
  >;
}

function getRequired<TData>(
  records: Record<string, TData>,
  id: string,
  label: string,
) {
  const record = records[id];

  if (!record) {
    throw new Error(`Missing ${label}: ${id}`);
  }

  return record;
}

function maxBy<TData>(items: TData[], getValue: (item: TData) => number) {
  return items.reduce<TData | undefined>((best, item) => {
    if (!best || getValue(item) > getValue(best)) {
      return item;
    }

    return best;
  }, undefined);
}
