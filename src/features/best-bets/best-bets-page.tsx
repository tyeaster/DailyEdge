import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getBestBets,
  type BestBetDisplayCandidate,
  type BestBetsViewModel,
} from "./service";

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
              TrueLine Ranking Engine.
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

        <BestBetSection bets={viewModel.top10} title="Top 10" />
        <BestBetSection bets={viewModel.top25} title="Top 25" compact />
        <BestBetSection bets={viewModel.top50} title="Top 50" compact />
      </div>
    </main>
  );
}

function BestBetSection({
  bets,
  compact = false,
  title,
}: {
  bets: BestBetDisplayCandidate[];
  compact?: boolean;
  title: string;
}) {
  return (
    <section className="mt-8">
      <ResearchSectionHeader eyebrow="Unified Ranking" title={title} />
      <div className={cn("mt-4 grid gap-4", compact ? "xl:grid-cols-2" : "2xl:grid-cols-2")}>
        {bets.map((bet) => (
          <BestBetCard bet={bet} compact={compact} key={`${title}-${bet.id}`} />
        ))}
      </div>
    </section>
  );
}

function BestBetCard({
  bet,
  compact,
}: {
  bet: BestBetDisplayCandidate;
  compact: boolean;
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">#{bet.ranked.rank}</Pill>
            <Pill tone="neutral">{bet.marketLabel}</Pill>
            <Pill tone={riskTone(bet.ranked.riskTier)}>{bet.ranked.riskTier} Risk</Pill>
            {bet.correlation && (
              <Pill tone={correlationTone(bet.correlation.badge)}>
                {bet.correlation.badge}
              </Pill>
            )}
            {bet.correlation && (
              <Pill tone={correlationTone(bet.correlation.exposureBadge)}>
                {bet.correlation.exposureBadge}
              </Pill>
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">{bet.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {bet.team?.name ?? "Team"} {bet.opponent ? `vs ${bet.opponent.name}` : ""} ·{" "}
            {bet.sportsbook ?? "Market"}
          </p>
        </div>
        <Pill tone={recommendationTone(bet.ranked.recommendationTier)}>
          {bet.ranked.recommendationTier}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResearchMetric
          indicatorTone={metricTone(bet.ranked.trueLineScore)}
          label="TrueLine Score"
          meta={bet.ranked.grade}
          value={`${bet.ranked.trueLineScore}/100`}
        />
        <ResearchMetric label="Sportsbook" meta={bet.sportsbook ?? "Market"} value={bet.display.sportsbookLine} />
        <ResearchMetric label="Fair Line" meta="TrueLine" value={bet.display.fairLine} />
        <ResearchMetric label="Probability" meta="Model" value={bet.display.probability} />
        <ResearchMetric
          indicatorTone={bet.ranked.candidate.edgePercent > 0 ? "good" : "neutral"}
          label="Edge"
          meta={bet.display.expectedValue}
          value={bet.display.edge}
        />
        <ResearchMetric
          indicatorTone={metricTone(bet.ranked.candidate.confidence)}
          label="Confidence"
          meta={bet.ranked.confidenceTier}
          value={bet.display.confidence}
        />
        <ResearchMetric label="ROI" meta="Historical" value={bet.calibration.roiDisplay} />
        <ResearchMetric label="CLV" meta="Odds Intel" value={bet.calibration.clvDisplay} />
        <ResearchMetric
          label="Portfolio Risk"
          meta="Correlation"
          value={bet.correlation?.portfolioRisk ?? "-"}
        />
      </div>

      {!compact && (
        <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
          <summary className="cursor-pointer list-none text-sm font-semibold text-white">
            Why It Ranked
          </summary>
          <ul className="mt-3 grid gap-2">
            {bet.reasons.map((reason) => (
              <li className="text-sm text-slate-500" key={reason}>
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Scoring Breakdown
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {bet.ranked.candidate.supportingFactors.map((factor) => (
            <div className="rounded-lg bg-slate-950/70 p-3" key={factor.key}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-200">{factor.label}</p>
                <span className="text-sm font-semibold text-blue-100">
                  {Math.round(factor.score)}/100
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{factor.summary}</p>
            </div>
          ))}
          <div className="rounded-lg bg-slate-950/70 p-3">
            <p className="font-semibold text-slate-200">Calibration</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Win rate {bet.calibration.winRateDisplay}; confidence calibration{" "}
              {bet.calibration.confidenceCalibrationDisplay}; historical similar
              bets {bet.calibration.historicalSimilarBets}.
            </p>
          </div>
          {bet.correlation && (
            <div className="rounded-lg bg-slate-950/70 p-3">
              <p className="font-semibold text-slate-200">Related Bets</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {bet.correlation.relatedBets.length > 0
                  ? bet.correlation.relatedBets.join(", ")
                  : "No major related bets detected."}
              </p>
            </div>
          )}
        </div>
      </details>
    </ResearchCard>
  );
}

function metricTone(value: number) {
  if (value >= 70) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(recommendation: BestBetDisplayCandidate["ranked"]["recommendationTier"]) {
  if (recommendation === "Elite" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function riskTone(risk: BestBetDisplayCandidate["ranked"]["riskTier"]) {
  if (risk === "Low") return "green";
  if (risk === "Medium") return "blue";
  return "neutral";
}

function correlationTone(label: string) {
  if (label.startsWith("High")) return "neutral";
  if (label.startsWith("Moderate")) return "blue";
  return "green";
}
