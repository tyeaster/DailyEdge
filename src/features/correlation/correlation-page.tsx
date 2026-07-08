import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getCorrelationAnalysis,
  type CorrelatedBet,
  type CorrelationViewModel,
  type ExposureBucket,
  type PortfolioRecommendation,
} from "./service";

export async function CorrelationPage() {
  const viewModel = await getCorrelationAnalysis();

  return <CorrelationLayout viewModel={viewModel} />;
}

function CorrelationLayout({ viewModel }: { viewModel: CorrelationViewModel }) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Correlation & Exposure
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Portfolio Risk Board
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Analyze relationships across the ranked Best Bets board, identify
              repeated player, team, game, sportsbook, and market exposure, and
              build diversified portfolios from the same recommendations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.analyzedBets} Bets</Pill>
            <Pill tone="neutral">Avg Correlation {viewModel.slateMeta.averageCorrelation}</Pill>
            <Pill tone="neutral">Avg Exposure {viewModel.slateMeta.averageExposure}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResearchMetric
            indicatorTone={metricTone(viewModel.diversifiedTop10.portfolioRisk)}
            label="Diversified Risk"
            meta="Top 10"
            value={`${viewModel.diversifiedTop10.portfolioRisk}/100`}
          />
          <ResearchMetric
            indicatorTone={metricTone(viewModel.portfolios.highestEv.portfolioRisk)}
            label="Highest EV Risk"
            meta={`${viewModel.portfolios.highestEv.expectedValue}% EV`}
            value={`${viewModel.portfolios.highestEv.portfolioRisk}/100`}
          />
          <ResearchMetric
            indicatorTone={metricTone(viewModel.portfolios.safest.portfolioRisk)}
            label="Safest Risk"
            meta="Portfolio"
            value={`${viewModel.portfolios.safest.portfolioRisk}/100`}
          />
          <ResearchMetric
            indicatorTone={metricTone(100 - viewModel.conflictWarnings.length * 10)}
            label="Warnings"
            meta="Conflicts"
            value={String(viewModel.conflictWarnings.length)}
          />
        </section>

        <section className="mt-8">
          <ResearchSectionHeader eyebrow="Warnings" title="Conflict warnings" />
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {(viewModel.conflictWarnings.length > 0
              ? viewModel.conflictWarnings
              : ["No major portfolio conflicts detected."]
            ).map((warning) => (
              <ResearchCard key={warning}>
                <p className="text-sm text-slate-300">{warning}</p>
              </ResearchCard>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          <ExposurePanel buckets={viewModel.exposure.teams} title="Team Exposure" />
          <ExposurePanel buckets={viewModel.exposure.players} title="Player Exposure" />
          <ExposurePanel buckets={viewModel.exposure.games} title="Game Exposure" />
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-2">
          <PortfolioCard portfolio={viewModel.diversifiedTop10} />
          <PortfolioCard portfolio={viewModel.portfolios.highestEv} />
          <PortfolioCard portfolio={viewModel.portfolios.safest} />
          <PortfolioCard portfolio={viewModel.portfolios.aggressive} />
        </section>

        <BetList bets={viewModel.highlyCorrelatedBets.slice(0, 12)} title="Highly Correlated Bets" />
        <BetList bets={viewModel.independentBets.slice(0, 12)} title="Independent Bets" />
      </div>
    </main>
  );
}

function ExposurePanel({
  buckets,
  title,
}: {
  buckets: ExposureBucket[];
  title: string;
}) {
  return (
    <ResearchCard>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 grid gap-3">
        {(buckets.length > 0 ? buckets : [{ count: 0, exposureScore: 0, id: "none", label: "No concentrated exposure", warnings: [] }]).map((bucket) => (
          <div className="rounded-lg bg-slate-950/70 p-3" key={bucket.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-200">{bucket.label}</p>
                <p className="mt-1 text-xs text-slate-600">{bucket.count} related bets</p>
              </div>
              <span className={cn("text-sm font-semibold", scoreText(bucket.exposureScore))}>
                {bucket.exposureScore}/100
              </span>
            </div>
            {bucket.warnings.length > 0 && (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {bucket.warnings.join(" ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function PortfolioCard({ portfolio }: { portfolio: PortfolioRecommendation }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{portfolio.label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{portfolio.description}</p>
        </div>
        <Pill tone={portfolio.portfolioRisk >= 70 ? "neutral" : portfolio.portfolioRisk >= 45 ? "blue" : "green"}>
          Risk {portfolio.portfolioRisk}/100
        </Pill>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ResearchMetric label="Bets" meta="Selected" value={String(portfolio.bets.length)} />
        <ResearchMetric label="Avg EV" meta="Portfolio" value={`${portfolio.expectedValue}%`} />
      </div>
      <ol className="mt-4 grid gap-2">
        {portfolio.bets.map((item) => (
          <li className="text-sm text-slate-500" key={item.bet.id}>
            #{item.bet.ranked.rank} {item.bet.title}
          </li>
        ))}
      </ol>
    </ResearchCard>
  );
}

function BetList({
  bets,
  title,
}: {
  bets: CorrelatedBet[];
  title: string;
}) {
  return (
    <section className="mt-8">
      <ResearchSectionHeader eyebrow="Correlation" title={title} />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {bets.map((item) => (
          <ResearchCard key={item.bet.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
                  #{item.bet.ranked.rank} {item.bet.marketLabel}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">{item.bet.title}</h2>
              </div>
              <Pill tone={item.metrics.portfolioRisk >= 70 ? "neutral" : item.metrics.portfolioRisk >= 45 ? "blue" : "green"}>
                Risk {item.metrics.portfolioRisk}/100
              </Pill>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResearchMetric label="Exposure" meta="Score" value={`${item.metrics.exposureScore}/100`} />
              <ResearchMetric label="Correlation" meta={`${item.links.length} links`} value={`${item.metrics.correlationScore}/100`} />
              <ResearchMetric label="Diversification" meta="Score" value={`${item.metrics.diversificationScore}/100`} />
              <ResearchMetric label="Conflict" meta="Score" value={`${item.metrics.conflictScore}/100`} />
            </div>
            <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-white">
                Related Bets
              </summary>
              <ul className="mt-3 grid gap-2">
                {(item.links.length > 0 ? item.links : [{ betId: "none", title: "No major related bets", market: "", score: 0, type: "positive" as const }]).map((link) => (
                  <li className="text-sm text-slate-500" key={link.betId}>
                    {link.title} {link.score > 0 ? `(${link.type}, ${link.score}/100)` : ""}
                  </li>
                ))}
              </ul>
            </details>
          </ResearchCard>
        ))}
      </div>
    </section>
  );
}

function metricTone(value: number) {
  if (value >= 70) return "watch";
  if (value <= 40) return "good";
  return "neutral";
}

function scoreText(score: number) {
  if (score >= 70) return "text-amber-200";
  if (score <= 35) return "text-emerald-200";
  return "text-blue-100";
}
