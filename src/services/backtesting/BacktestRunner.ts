import { StrategyEvaluator } from "./StrategyEvaluator.ts";
import { BankrollSimulator } from "./BankrollSimulator.ts";
import { average, standardDeviation } from "./math.ts";
import type {
  BacktestBet,
  BacktestOutput,
  BacktestRequest,
  DailyBacktestBreakdown,
  EquityPoint,
  HistoricalSlate,
} from "./types.ts";

export class BacktestRunner {
  private readonly bankrollSimulator: BankrollSimulator;
  private readonly strategyEvaluator: StrategyEvaluator;

  constructor({
    bankrollSimulator = new BankrollSimulator(),
    strategyEvaluator = new StrategyEvaluator(),
  }: {
    bankrollSimulator?: BankrollSimulator;
    strategyEvaluator?: StrategyEvaluator;
  } = {}) {
    this.bankrollSimulator = bankrollSimulator;
    this.strategyEvaluator = strategyEvaluator;
  }

  run(slates: HistoricalSlate[], request: BacktestRequest): BacktestOutput {
    const selections = this.strategyEvaluator.selectBets(slates, request.settings);
    const betHistory = this.bankrollSimulator.simulate(selections, request.bankroll);
    const dailyBreakdown = buildDailyBreakdown(betHistory, request.bankroll.startingBankroll);
    const equityCurve = buildEquityCurve(betHistory, request.bankroll.startingBankroll);

    return {
      betHistory,
      dailyBreakdown,
      equityCurve,
      marketBreakdown: buildMarketBreakdown(betHistory),
      monthlyPerformance: buildMonthlyPerformance(dailyBreakdown),
      summary: buildSummary(betHistory, dailyBreakdown, request.bankroll.startingBankroll),
      topFilters: buildFilterPerformance(betHistory, true),
      worstFilters: buildFilterPerformance(betHistory, false),
    };
  }
}

function buildSummary(
  bets: BacktestBet[],
  daily: DailyBacktestBreakdown[],
  startingBankroll: number,
) {
  const wins = bets.filter((bet) => bet.outcome === "win").length;
  const losses = bets.filter((bet) => bet.outcome === "loss").length;
  const pushes = bets.filter((bet) => bet.outcome === "push").length;
  const profit = bets.reduce((total, bet) => total + bet.profit, 0);
  const totalStake = bets.reduce((total, bet) => total + bet.stake, 0);
  const dailyProfits = daily.map((day) => day.profit);
  const dailyAverage = average(dailyProfits);
  const dailyStd = standardDeviation(dailyProfits);

  return {
    averageDailyProfit: dailyAverage,
    averageOdds: average(bets.map((bet) => bet.odds)),
    finalBankroll: startingBankroll + profit,
    longestLosingStreak: longestStreak(bets, "loss"),
    longestWinStreak: longestStreak(bets, "win"),
    lossPercent: bets.length === 0 ? 0 : (losses / bets.length) * 100,
    maximumDrawdown: Math.max(...buildEquityCurve(bets, startingBankroll).map((point) => point.drawdown), 0),
    profit,
    pushPercent: bets.length === 0 ? 0 : (pushes / bets.length) * 100,
    roi: totalStake === 0 ? 0 : (profit / totalStake) * 100,
    sharpeStyleReturnScore: dailyStd === 0 ? 0 : dailyAverage / dailyStd,
    startingBankroll,
    totalBets: bets.length,
    totalStake,
    unitsWon: bets.reduce((total, bet) => total + bet.unitsWon, 0),
    winPercent: bets.length === 0 ? 0 : (wins / bets.length) * 100,
  };
}

function buildDailyBreakdown(bets: BacktestBet[], startingBankroll: number) {
  const byDate = new Map<string, BacktestBet[]>();
  let bankroll = startingBankroll;

  for (const bet of bets) {
    byDate.set(bet.date, [...(byDate.get(bet.date) ?? []), bet]);
  }

  return [...byDate.entries()].map(([date, values]) => {
    const dayStart = bankroll;
    const profit = values.reduce((total, bet) => total + bet.profit, 0);
    const totalStake = values.reduce((total, bet) => total + bet.stake, 0);
    bankroll += profit;

    return {
      date,
      endingBankroll: bankroll,
      losses: values.filter((bet) => bet.outcome === "loss").length,
      profit,
      pushes: values.filter((bet) => bet.outcome === "push").length,
      roi: totalStake === 0 ? 0 : (profit / totalStake) * 100,
      startingBankroll: dayStart,
      totalStake,
      wins: values.filter((bet) => bet.outcome === "win").length,
    };
  });
}

function buildEquityCurve(bets: BacktestBet[], startingBankroll: number): EquityPoint[] {
  let peak = startingBankroll;

  return bets.map((bet) => {
    peak = Math.max(peak, bet.equityAfter);

    return {
      date: bet.date,
      bankroll: bet.equityAfter,
      drawdown: peak - bet.equityAfter,
      profit: bet.equityAfter - startingBankroll,
    };
  });
}

function buildMarketBreakdown(bets: BacktestBet[]) {
  const markets = new Map<string, BacktestBet[]>();
  for (const bet of bets) markets.set(bet.market, [...(markets.get(bet.market) ?? []), bet]);

  return [...markets.entries()].map(([label, values]) => ({
    label,
    value: values.reduce((total, bet) => total + bet.profit, 0),
  }));
}

function buildMonthlyPerformance(daily: DailyBacktestBreakdown[]) {
  const months = new Map<string, number>();
  for (const day of daily) {
    const month = day.date.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + day.profit);
  }

  return [...months.entries()].map(([label, value]) => ({ label, value }));
}

function buildFilterPerformance(bets: BacktestBet[], best: boolean) {
  const groups = [
    { label: "Favorites", values: bets.filter((bet) => bet.odds < 0) },
    { label: "Underdogs", values: bets.filter((bet) => bet.odds > 0) },
    { label: "EV > 5%", values: bets.filter((bet) => bet.expectedValuePercent > 5) },
    { label: "Confidence > 70%", values: bets.filter((bet) => bet.confidence > 70) },
  ].map((group) => ({
    label: group.label,
    value: group.values.reduce((total, bet) => total + bet.profit, 0),
  }));

  return groups.sort((left, right) => best ? right.value - left.value : left.value - right.value);
}

function longestStreak(bets: BacktestBet[], outcome: BacktestBet["outcome"]) {
  let longest = 0;
  let current = 0;

  for (const bet of bets) {
    if (bet.outcome === outcome) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (bet.outcome !== "push") {
      current = 0;
    }
  }

  return longest;
}
