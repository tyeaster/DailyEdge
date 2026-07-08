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
              Daily Slate
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Today&apos;s Lock Zone
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              The strongest plays on today&apos;s slate and why the model likes
              them. Everything else lives one click away - the full board,
              market labs, and matchup research.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.gamesToday} Games</Pill>
            <Pill tone="green">{viewModel.lockZone.length} Locks</Pill>
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

        <LockZone bets={viewModel.lockZone} />

        <SlateExtremes viewModel={viewModel} />

        <AlertsThatMatter alerts={viewModel.actionableAlerts} />

        <FullBoard bets={viewModel.topBets} />

        <MarketShortcuts viewModel={viewModel} />
      </div>
    </main>
  );
}

function LockZone({ bets }: { bets: DailySlateRankedBet[] }) {
  if (bets.length === 0) {
    return (
      <section className="mt-6">
        <ResearchCard>
          <ResearchSectionHeader eyebrow="Lock Zone" title="No recommended plays today" />
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The model didn&apos;t find an edge worth recommending on today&apos;s
            slate. Check the full board below for everything it evaluated.
          </p>
        </ResearchCard>
      </section>
    );
  }

  const [headliner, ...rest] = bets;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader
          eyebrow="Lock Zone"
          title={`Today's ${bets.length} strongest plays`}
        />
        <Pill tone="green">Model-recommended only</Pill>
      </div>
      <div className="mt-4 grid gap-4">
        <LockCard bet={headliner} headliner />
        {rest.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rest.map((bet) => (
              <LockCard bet={bet} key={bet.ranked.candidate.betId} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LockCard({
  bet,
  headliner = false,
}: {
  bet: DailySlateRankedBet;
  headliner?: boolean;
}) {
  const candidate = bet.ranked.candidate;
  const reasons = bet.ranked.explanations.slice(0, headliner ? 4 : 3);

  return (
    <ResearchCard
      className={cn(
        "overflow-hidden p-0",
        headliner && "border-emerald-300/20",
      )}
    >
      <div className="relative">
        {headliner ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        ) : null}
        <div className="relative p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={headliner ? "green" : "blue"}>#{bet.ranked.rank}</Pill>
                <Pill tone="neutral">{marketLabel(candidate.marketType)}</Pill>
                <Pill tone={recommendationTone(bet.ranked.recommendationTier)}>
                  {bet.ranked.recommendationTier}
                </Pill>
              </div>
              <h2
                className={cn(
                  "mt-3 font-semibold text-white",
                  headliner ? "text-2xl sm:text-3xl" : "text-xl",
                )}
              >
                {bet.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{bet.subtitle}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-semibold",
                  headliner ? "text-3xl text-emerald-200" : "text-2xl text-blue-100",
                )}
              >
                {formatOdds(candidate.sportsbookOdds)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-600">
                {candidate.sportsbook ?? "Sportsbook"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric label="Score" value={`${bet.ranked.trueLineScore}/100 · ${bet.ranked.grade}`} />
            <MiniMetric label="Edge" value={formatSignedPercent(candidate.edgePercent)} />
            <MiniMetric label="Model Prob" value={formatProbability(candidate.modelProbability)} />
            <MiniMetric label="Confidence" value={`${candidate.confidence}%`} />
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Why it&apos;s a good bet
            </p>
            <ul className="mt-2 grid gap-1.5">
              {reasons.map((reason) => (
                <li className="flex gap-2 text-sm leading-6 text-slate-300" key={reason}>
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <Link
            className="mt-4 inline-flex rounded-xl border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15"
            href={bet.href}
          >
            Open full research
          </Link>
        </div>
      </div>
    </ResearchCard>
  );
}

function SlateExtremes({
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
    <section className="mt-6">
      <ResearchSectionHeader eyebrow="Market Summary" title="Slate extremes" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
    </section>
  );
}

function AlertsThatMatter({ alerts }: { alerts: DailySlateAlert[] }) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader eyebrow="Risk Flags" title="Alerts that matter" />
        {alerts.length > 0 ? <Pill tone="yellow">{alerts.length} flagged</Pill> : null}
      </div>
      {alerts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-slate-500">
          No weather, bullpen, or lineup risks flagged on today&apos;s slate.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.slice(0, 6).map((alert) => (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
              key={alert.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{alert.meta}</p>
                </div>
                <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", severityDot(alert.severity))} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{alert.summary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FullBoard({ bets }: { bets: DailySlateRankedBet[] }) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader
          eyebrow="Full Board"
          title={`All ${bets.length} ranked bets`}
        />
        <Link
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-blue-300/20 hover:text-blue-100"
          href="/best-bets"
        >
          Open Best Bets board
        </Link>
      </div>
      <ResearchCard className="mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-600">
              <tr>
                {["#", "Bet", "Market", "Score", "Odds", "Edge", "Call"].map((header) => (
                  <th className="border-b border-white/10 px-4 py-3" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <BoardRow bet={bet} key={bet.ranked.candidate.betId} />
              ))}
            </tbody>
          </table>
        </div>
        {bets.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No ranked bets loaded.</p>
        ) : null}
      </ResearchCard>
    </section>
  );
}

function BoardRow({ bet }: { bet: DailySlateRankedBet }) {
  const candidate = bet.ranked.candidate;
  const isPass = bet.ranked.recommendationTier === "Pass";

  return (
    <tr className={cn("border-b border-white/5", isPass && "opacity-55")}>
      <td className="px-4 py-3 font-semibold text-slate-400">{bet.ranked.rank}</td>
      <td className="px-4 py-3">
        <Link className="font-semibold text-white transition hover:text-blue-100" href={bet.href}>
          {bet.title}
        </Link>
        <p className="mt-0.5 text-xs text-slate-600">{bet.subtitle}</p>
      </td>
      <td className="px-4 py-3 text-slate-400">{marketLabel(candidate.marketType)}</td>
      <td className="px-4 py-3 text-slate-300">
        {bet.ranked.trueLineScore}/100 · {bet.ranked.grade}
      </td>
      <td className="px-4 py-3 text-slate-300">{formatOdds(candidate.sportsbookOdds)}</td>
      <td className={cn("px-4 py-3", candidate.edgePercent > 0 ? "text-emerald-200" : "text-slate-500")}>
        {formatSignedPercent(candidate.edgePercent)}
      </td>
      <td className="px-4 py-3">
        <Pill tone={recommendationTone(bet.ranked.recommendationTier)}>
          {bet.ranked.recommendationTier}
        </Pill>
      </td>
    </tr>
  );
}

function MarketShortcuts({
  viewModel,
}: {
  viewModel: DailySlateIntelligenceViewModel;
}) {
  const sections = [
    viewModel.strikeouts,
    viewModel.hits,
    viewModel.totalBases,
    viewModel.homeRuns,
    viewModel.moneyline,
  ];

  return (
    <section className="mt-8">
      <ResearchSectionHeader eyebrow="Go Deeper" title="Market labs" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {sections.map((section) => (
          <MarketShortcutCard key={section.label} section={section} />
        ))}
      </div>
    </section>
  );
}

function MarketShortcutCard({ section }: { section: DailySlateIntelligenceSection }) {
  const top = section.bets[0];

  return (
    <Link
      className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 transition hover:border-blue-300/25 hover:bg-blue-400/[0.05]"
      href={section.href}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
        {section.label}
      </p>
      {top ? (
        <>
          <p className="mt-2 truncate font-semibold text-white">{top.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Top play · {top.ranked.trueLineScore}/100 ·{" "}
            {formatSignedPercent(top.ranked.candidate.edgePercent)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No plays graded</p>
      )}
      <p className="mt-3 text-xs font-semibold text-blue-200">
        {section.bets.length} graded · Open lab
      </p>
    </Link>
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
