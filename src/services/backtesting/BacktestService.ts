import { DEFAULT_BACKTEST_REQUEST } from "./config.ts";
import { BacktestRunner } from "./BacktestRunner.ts";
import {
  getConfiguredHistoricalSlateProvider,
  type HistoricalSlateProvider,
} from "./providers.ts";
import type {
  BacktestDashboardViewModel,
  BacktestRequest,
} from "./types.ts";

export class BacktestService {
  private readonly provider: HistoricalSlateProvider;
  private readonly runner: BacktestRunner;

  constructor({
    provider = getConfiguredHistoricalSlateProvider(),
    runner = new BacktestRunner(),
  }: {
    provider?: HistoricalSlateProvider;
    runner?: BacktestRunner;
  } = {}) {
    this.provider = provider;
    this.runner = runner;
  }

  async runBacktest(
    request: BacktestRequest = DEFAULT_BACKTEST_REQUEST,
  ): Promise<BacktestDashboardViewModel> {
    const response = await this.provider.getSlates();
    const output = this.runner.run(response.slates, request);

    return {
      ...output,
      fetchedAt: response.fetchedAt,
      mode: response.mode,
      provider: response.provider,
      settings: request.settings,
    };
  }
}

export const backtestService = new BacktestService();
