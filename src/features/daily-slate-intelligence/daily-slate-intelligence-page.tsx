import Link from "next/link";

import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getDailySlateIntelligence,
  type DailySlateAlert,
  type DailySlateIntelligenceSection,
  type DailySlateIntelligenceViewModel,
  type DailySlateRankedBet,
} from "./service";

export async function DailySlateIntelligencePage() {
  const viewModel = await getDailySlateIntelligence();

  return <DailySlateIntelligenceLayout viewModel={viewModel} />;
}

function DailySlateIntelligenceLayout({
  viewModel,
}: {
  viewModel: DailySlateIntelligenceViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Daily Slate Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Today&apos;s MLB Slate
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Ranked betting opportunities, research links, market context,
              weather, bullpen, and lineup alerts from the existing TrueLine
              intelligence stack.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.gamesToday} Games</Pill>
            <Pill tone="green">{viewModel.slateMeta.rankedBetCount} Ranked Bets</Pill>
            <Pill tone="neutral">Updated {viewModel.slateMeta.lastUpdated}</Pill>
            <Pill tone={viewModel.dataSource === "mock" ? "yellow" : "neutral"}>
              Source {viewModel.dataSource}
            </Pill>
          </div>
        </header>

        {viewModel.error ? (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Live data fallback: {viewModel.error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Hero viewModel={viewModel} />
          <MarketSummary viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <ResearchSectionHeader
            eyebrow="Top Overall Bets"
            title="Top 25 ranked opportunities"
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {viewModel.topBets.map((bet) => (
              <RankedBetCard bet={bet} key={bet.ranked.candidate.betId} />
            ))}
          </div>
          {viewModel.topBets.length === 0 ? <EmptyState label="No ranked bets loaded" /> : null}
        </section>

        <section className="mt-8 grid gap-5 2xl:grid-cols-2">
          <BetSection section={viewModel.strikeouts} />
          <BetSection section={viewModel.hits} />
          <BetSection section={viewModel.totalBases} />
          <BetSection section={viewModel.homeRuns} />
          <BetSection section={viewModel.moneyline} />
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-3">
          <AlertPanel
            alerts={viewModel.weatherAlerts}
            eyebrow="Weather"
            title="Weather Alerts"
          />
          <AlertPanel
            alerts={viewModel.bullpenAlerts}
            eyebrow="Bullpen"
            title="Bullpen Alerts"
          />
          <AlertPanel
            alerts={viewModel.lineups}
            eyebrow="Lineups"
            title="Lineup Alerts"
          />
        </section>
      </div>
    </main>
  );
}

function Hero({ viewModel }: { viewModel: DailySlateIntelligenceViewModel }) {
  const top = viewModel.topBets[0];

  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader
            eyebrow="Slate Leader"
            title={top ? top.title : "No ranked bets loaded"}
          />
          {top ? (
            <>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {top.subtitle}. Ranked by the TrueLine Ranking Engine using edge,
                expected value, confidence, data quality, matchup context, risk,
                and variance.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResearchMetric
                  indicatorTone={metricTone(top.ranked.trueLineScore)}
                  label="TrueLine Score"
                  meta={top.ranked.grade}
                  value={`${top.ranked.trueLineScore}/100`}
                />
                <ResearchMetric
                  indicatorTone={top.ranked.candidate.edgePercent > 0 ? "good" : "neutral"}
                  label="Edge"
                  meta="Model vs market"
                  value={formatSignedPercent(top.ranked.candidate.edgePercent)}
                />
                <ResearchMetric
                  indicatorTone={top.ranked.candidate.expectedValuePercent > 0 ? "good" : "neutral"}
                  label="Expected Value"
                  meta="Per unit"
                  value={formatSignedPercent(top.ranked.candidate.expectedValuePercent)}
                />
                <ResearchMetric
                  indicatorTone={metricTone(top.ranked.candidate.confidence)}
                  label="Confidence"
                  meta={top.ranked.confidenceTier}
                  value={`${top.ranked.candidate.confidence}%`}
                />
              </div>
              <Link
                className="mt-5 inline-flex rounded-xl border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15"
                href={top.href}
              >
                Open Research
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </ResearchCard>
  );
}

function MarketSummary({
  viewModel,
}: {
  viewModel: DailySlateIntelligenceViewModel;
}) {
  const items = [
    ["Highest Edge", viewModel.marketSummary.highestEdge, "edge"],
    ["Highest Confidence", viewModel.marketSummary.highestConfidence, "confidence"],
    ["Highest EV", viewModel.marketSummary.highestExpectedValue, "ev"],
    ["Highest Risk", viewModel.marketSummary.highestRisk, "risk"],
    ["Most Undervalued", viewModel.marketSummary.biggestUndervaluedBet, "score"],
  ] as const;

  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Market Summary" title="Slate extremes" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map(([label, bet, metric]) => (
          <ResearchMetric
            indicatorTone={bet ? metricTone(summaryValue(bet, metric)) : "neutral"}
            key={label}
            label={label}
            meta={bet?.title ?? "No bet loaded"}
            value={bet ? summaryDisplay(bet, metric) : "-"}
          />
        ))}
      </div>
    </ResearchCard>
  );
}

function BetSection({ section }: { section: DailySlateIntelligenceSection }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader eyebrow={section.label} title={section.title} />
        <Link
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-blue-300/20 hover:text-blue-100"
          href={section.href}
        >
          Open Lab
        </Link>
      </div>
      <div className="mt-5 grid gap-3">
        {section.bets.map((bet) => (
          <CompactBetRow bet={bet} key={bet.ranked.candidate.betId} />
        ))}
      </div>
      {section.bets.length === 0 ? <EmptyState label="No recommendations loaded" /> : null}
    </ResearchCard>
  );
}

function RankedBetCard({ bet }: { bet: DailySlateRankedBet }) {
  const candidate = bet.ranked.candidate;

  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
            #{bet.ranked.rank} · {marketLabel(candidate.marketType)}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{bet.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{bet.subtitle}</p>
        </div>
        <Pill tone={recommendationTone(bet.ranked.recommendationTier)}>
          {bet.ranked.recommendationTier}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Score" value={`${bet.ranked.trueLineScore}/100`} />
        <MiniMetric label="Grade" value={bet.ranked.grade} />
        <MiniMetric label="Sportsbook Odds" value={formatOdds(candidate.sportsbookOdds)} />
        <MiniMetric label="Model Probability" value={formatProbability(candidate.modelProbability)} />
        <MiniMetric label="Edge" value={formatSignedPercent(candidate.edgePercent)} />
        <MiniMetric label="Expected Value" value={formatSignedPercent(candidate.expectedValuePercent)} />
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Expand Explanation
        </summary>
        <ul className="mt-3 grid gap-2">
          {bet.ranked.explanations.map((explanation) => (
            <li className="text-sm leading-6 text-slate-500" key={explanation}>
              {explanation}
            </li>
          ))}
        </ul>
        <Link
          className="mt-4 inline-flex text-sm font-semibold text-blue-200 transition hover:text-blue-100"
          href={bet.href}
        >
          Open detailed research
        </Link>
      </details>
    </ResearchCard>
  );
}

function CompactBetRow({ bet }: { bet: DailySlateRankedBet }) {
  const candidate = bet.ranked.candidate;

  return (
    <Link
      className="rounded-xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-blue-300/20 hover:bg-blue-400/[0.045]"
      href={bet.href}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{bet.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{bet.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-blue-100">
            {bet.ranked.trueLineScore}/100
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatSignedPercent(candidate.edgePercent)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function AlertPanel({
  alerts,
  eyebrow,
  title,
}: {
  alerts: DailySlateAlert[];
  eyebrow: string;
  title: string;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow={eyebrow} title={title} />
      <div className="mt-5 grid gap-3">
        {alerts.slice(0, 8).map((alert) => (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            key={alert.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{alert.title}</p>
                <p className="mt-1 text-xs text-slate-600">{alert.meta}</p>
              </div>
              <span className={cn("h-2.5 w-2.5 rounded-full", severityDot(alert.severity))} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{alert.summary}</p>
          </div>
        ))}
      </div>
      {alerts.length === 0 ? <EmptyState label="No alerts loaded" /> : null}
    </ResearchCard>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-500">
      {label}
    </div>
  );
}

function summaryValue(
  bet: DailySlateRankedBet,
  metric: "confidence" | "edge" | "ev" | "risk" | "score",
) {
  if (metric === "confidence") return bet.ranked.candidate.confidence;
  if (metric === "edge") return bet.ranked.candidate.edgePercent;
  if (metric === "ev") return bet.ranked.candidate.expectedValuePercent;
  if (metric === "risk") return bet.ranked.candidate.variance;

  return bet.ranked.trueLineScore;
}

function summaryDisplay(
  bet: DailySlateRankedBet,
  metric: "confidence" | "edge" | "ev" | "risk" | "score",
) {
  if (metric === "confidence") return `${bet.ranked.candidate.confidence}%`;
  if (metric === "edge") return formatSignedPercent(bet.ranked.candidate.edgePercent);
  if (metric === "ev") return formatSignedPercent(bet.ranked.candidate.expectedValuePercent);
  if (metric === "risk") return `${bet.ranked.candidate.variance}/100`;

  return `${bet.ranked.trueLineScore}/100`;
}

function formatOdds(odds?: number) {
  if (odds === undefined) return "-";

  return odds > 0 ? `+${odds}` : String(odds);
}

function formatProbability(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function marketLabel(marketType: DailySlateRankedBet["ranked"]["candidate"]["marketType"]) {
  const labels = {
    "game-total": "Game Total",
    "home-runs": "Home Run",
    hits: "Hits",
    moneyline: "Moneyline",
    "run-line": "Run Line",
    parlay: "Parlay",
    prizepicks: "PrizePicks",
    strikeouts: "Strikeouts",
    "team-total": "Team Total",
    "total-bases": "Total Bases",
  } as const;

  return labels[marketType];
}

function metricTone(value: number) {
  if (value >= 70) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(
  recommendation: DailySlateRankedBet["ranked"]["recommendationTier"],
) {
  if (recommendation === "Elite" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function severityDot(severity: DailySlateAlert["severity"]) {
  if (severity === "high") return "bg-rose-300";
  if (severity === "medium") return "bg-amber-300";
  return "bg-emerald-300";
}
