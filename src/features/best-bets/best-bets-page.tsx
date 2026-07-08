import { Pill, ResearchMetric } from "@/src/components/research";

import { BestBetsBoard } from "./best-bets-board";
import { getBestBets, type BestBetsViewModel } from "./service";

export async function BestBetsPage() {
  const viewModel = await getBestBets();

  return <BestBetsLayout viewModel={viewModel} />;
}

function BestBetsLayout({ viewModel }: { viewModel: BestBetsViewModel }) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Best Bets Engine
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Best Bets Board
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              One ranked board across strikeouts, hits, total bases, home runs,
              moneyline, run line, game totals, and team totals using the shared
              TrueLine Ranking Engine. Search, filter, and sort below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.candidateCount} Bets</Pill>
            <Pill tone="neutral">{viewModel.slateMeta.markets} Markets</Pill>
            <Pill tone="neutral">Updated {viewModel.slateMeta.lastUpdated}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {viewModel.marketSummary.slice(0, 8).map((market) => (
            <ResearchMetric
              indicatorTone={metricTone(market.topScore)}
              key={market.market}
              label={market.label}
              meta={`${market.count} candidates`}
              value={`${market.topScore}/100`}
            />
          ))}
        </section>

        <BestBetsBoard viewModel={viewModel} />
      </div>
    </main>
  );
}

function metricTone(value: number) {
  if (value >= 70) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}
