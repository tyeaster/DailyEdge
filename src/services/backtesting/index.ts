export { BankrollSimulator, calculateStake } from "./BankrollSimulator.ts";
export { BacktestRunner } from "./BacktestRunner.ts";
export { BacktestService, backtestService } from "./BacktestService.ts";
export { StrategyEvaluator } from "./StrategyEvaluator.ts";
export { DEFAULT_BACKTEST_REQUEST } from "./config.ts";
export {
  MockHistoricalSlateProvider,
  ReplayHistoricalSlateProvider,
  StaticHistoricalSlateProvider,
  buildMockHistoricalSlates,
  getConfiguredHistoricalSlateProvider,
  type HistoricalSlateProvider,
} from "./providers.ts";
export type {
  BacktestBet,
  BacktestChartPoint,
  BacktestDashboardViewModel,
  BacktestOutput,
  BacktestProviderMode,
  BacktestRequest,
  BacktestSettings,
  BacktestSummary,
  BankrollMode,
  BankrollSettings,
  DailyBacktestBreakdown,
  EquityPoint,
  HistoricalSlate,
  HistoricalSlateProviderResponse,
} from "./types.ts";
