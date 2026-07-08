import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import {
  backtestService,
  DEFAULT_BACKTEST_REQUEST,
  type BacktestChartPoint,
  type BacktestDashboardViewModel,
} from "@/src/services/backtesting";
import { BarChart, DistributionChart } from "@/src/features/calibration-admin/charts";

export async function BacktestingAdminPage() {
  const viewModel = await backtestService.runBacktest({
    ...DEFAULT_BACKTEST_REQUEST,
    settings: {
      ...DEFAULT_BACKTEST_REQUEST.settings,
      minimumEdge: 2,
      minimumEv: 1,
    },
  });

  return <BacktestingAdminLayout viewModel={viewModel} />;
}

function BacktestingAdminLayout({
  viewModel,
}: {
  viewModel: BacktestDashboardViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Backtesting Engine
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Historical strategy replay for bankroll, ROI, drawdown, market
              breakdowns, and filter performance. Evaluation only; no model
              weights are optimized here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.summary.totalBets} Bets</Pill>
            <Pill tone="neutral">Mode {viewModel.mode}</Pill>
            <Pill tone="neutral">Provider {viewModel.provider}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResearchMetric
            indicatorTone={viewModel.summary.roi >= 0 ? "good" : "watch"}
            label="ROI"
            meta="Total stake"
            value={formatSignedPercent(viewModel.summary.roi)}
          />
          <ResearchMetric
            indicatorTone={viewModel.summary.profit >= 0 ? "good" : "watch"}
            label="Profit"
            meta="Backtest period"
            value={formatCurrency(viewModel.summary.profit)}
          />
          <ResearchMetric
            indicatorTone={metricTone(viewModel.summary.winPercent)}
            label="Win Rate"
            meta="All simulated bets"
            value={formatPercent(viewModel.summary.winPercent)}
          />
          <ResearchMetric
            label="Bankroll"
            meta={`Start ${formatCurrency(viewModel.summary.startingBankroll)}`}
            value={formatCurrency(viewModel.summary.finalBankroll)}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <ResearchCard>
            <ResearchSectionHeader eyebrow="Equity Curve" title="Bankroll over time" />
            <div className="mt-5">
              <BarChart
                points={viewModel.equityCurve.map((point, index) => ({
                  label: `${point.date} #${index + 1}`,
                  value: point.bankroll,
                }))}
                suffix=""
              />
            </div>
          </ResearchCard>

          <ResearchCard>
            <ResearchSectionHeader eyebrow="Risk" title="Drawdown and streaks" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ResearchMetric
                indicatorTone={viewModel.summary.maximumDrawdown > 0 ? "watch" : "good"}
                label="Max Drawdown"
                value={formatCurrency(viewModel.summary.maximumDrawdown)}
              />
              <ResearchMetric
                label="Return Score"
                meta="Sharpe-style"
                value={viewModel.summary.sharpeStyleReturnScore.toFixed(2)}
              />
              <ResearchMetric
                label="Win Streak"
                value={String(viewModel.summary.longestWinStreak)}
              />
              <ResearchMetric
                label="Losing Streak"
                value={String(viewModel.summary.longestLosingStreak)}
              />
            </div>
          </ResearchCard>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ChartPanel points={viewModel.monthlyPerformance} title="Monthly Performance" />
          <ChartPanel points={viewModel.marketBreakdown} title="Market Breakdown" />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ChartPanel points={viewModel.topFilters} title="Top Filters" />
          <ChartPanel points={viewModel.worstFilters} title="Worst Filters" />
        </section>

        <section className="mt-6">
          <ResearchSectionHeader eyebrow="Bet History" title="Simulated bets" />
          <div className="mt-4 grid gap-3">
            {viewModel.betHistory.slice(0, 25).map((bet) => (
              <div
                className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[1fr_repeat(5,auto)] md:items-center"
                key={bet.predictionId}
              >
                <div>
                  <p className="font-semibold text-white">{bet.market}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {bet.date} · {bet.sportsbook ?? "Market"} · {bet.predictionId}
                  </p>
                </div>
                <SmallStat label="Odds" value={formatOdds(bet.odds)} />
                <SmallStat label="Stake" value={formatCurrency(bet.stake)} />
                <SmallStat label="Outcome" value={bet.outcome} />
                <SmallStat label="Profit" value={formatCurrency(bet.profit)} />
                <SmallStat label="Bankroll" value={formatCurrency(bet.equityAfter)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ChartPanel({
  points,
  title,
}: {
  points: BacktestChartPoint[];
  title: string;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Performance" title={title} />
      <div className="mt-5">
        {points.length > 0 ? (
          <DistributionChart points={points} />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-500">
            No data loaded.
          </div>
        )}
      </div>
    </ResearchCard>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left md:text-right">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : String(odds);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function metricTone(value: number) {
  if (value >= 55) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}
