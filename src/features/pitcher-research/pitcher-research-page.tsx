import Link from "next/link";

import {
  FactorRating,
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getPitcherResearch,
  type PitcherResearchViewModel,
} from "./service";

export async function PitcherResearchPage({
  pitcherId,
}: {
  pitcherId?: string;
}) {
  const research = await getPitcherResearch(pitcherId);

  return <PitcherResearchLayout research={research} />;
}

function PitcherResearchLayout({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              className="text-sm font-medium text-slate-400 transition hover:text-white"
              href="/"
            >
              Back to Daily Slate
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Strikeout Lab
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {research.pitcher.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {research.team.name} vs {research.opponent.name} ·{" "}
              {research.game.game.venue} · {research.gameTime}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={recommendationTone(research.overview.recommendation)}>
              {research.overview.recommendation}
            </Pill>
            <Pill tone="blue">Data {research.dataConfidence}%</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Overview research={research} />
          <ModelExplanation research={research} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <SeasonProfile research={research} />
          <RecentPerformance research={research} />
        </section>

        <section className="mt-6">
          <PitcherIntelligence research={research} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <TodaysMatchup research={research} />
          <PredictionBreakdown research={research} />
        </section>

        <section className="mt-6">
          <MatchupIntelligence research={research} />
        </section>
      </div>
    </main>
  );
}

function Overview({ research }: { research: PitcherResearchViewModel }) {
  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader eyebrow="Overview" title="Strikeout Prop Setup" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResearchMetric
              indicatorTone="neutral"
              label="Sportsbook Line"
              meta={research.overview.sportsbook}
              value={research.overview.sportsbookLine}
            />
            <ResearchMetric
              indicatorTone="good"
              label="TrueLine Projection"
              meta="Prop model display"
              value={research.overview.projection}
            />
            <ResearchMetric
              indicatorTone={research.edge.startsWith("+") ? "good" : "watch"}
              label="Edge"
              meta="Projection minus line"
              value={research.edge}
            />
            <ResearchMetric
              indicatorTone={research.confidence >= 75 ? "good" : "neutral"}
              label="Confidence"
              meta={`Odds ${research.overview.sportsbookOdds}`}
              value={`${research.confidence}%`}
            />
          </div>
        </div>
      </div>
    </ResearchCard>
  );
}

function SeasonProfile({ research }: { research: PitcherResearchViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Season Profile" title="Pitcher Baseline" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
        {research.seasonProfile.map((metric) => (
          <ResearchMetric
            indicatorTone={metric.tone}
            key={metric.label}
            label={metric.label}
            meta={`Pctl ${metric.percentile}`}
            value={metric.value}
          />
        ))}
      </div>
    </ResearchCard>
  );
}

function RecentPerformance({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  const maxStrikeouts = Math.max(
    research.strikeoutLine + 2,
    ...research.recentStarts.map((start) => start.strikeouts),
  );
  const lineTop = 100 - (research.strikeoutLine / maxStrikeouts) * 100;

  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Recent Performance"
          title="Last 5 Starts"
        />
        <Pill tone="neutral">Line {research.strikeoutLine.toFixed(1)} Ks</Pill>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/70 p-4">
        <div className="relative h-56">
          <div
            className="absolute left-0 right-0 border-t border-dashed border-blue-200/70"
            style={{ top: `${lineTop}%` }}
          >
            <span className="absolute -top-3 right-0 rounded-full bg-blue-300 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
              Line
            </span>
          </div>
          <div className="grid h-full grid-cols-5 items-end gap-3">
            {research.recentStarts.map((start) => (
              <div className="flex h-full flex-col justify-end" key={start.date}>
                <div
                  className={cn(
                    "rounded-t-lg border border-white/10",
                    start.overLine
                      ? "bg-emerald-300/80"
                      : "bg-slate-600/80",
                  )}
                  style={{
                    height: `${Math.max(12, (start.strikeouts / maxStrikeouts) * 100)}%`,
                  }}
                />
                <p className="mt-2 text-center text-xs font-semibold text-white">
                  {start.strikeouts}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {research.recentStarts.map((start) => (
          <div
            className="grid grid-cols-[0.8fr_0.7fr_0.8fr_0.8fr_0.8fr] items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2 text-sm"
            key={`${start.date}-${start.opponent}`}
          >
            <span className="text-slate-500">{start.date}</span>
            <span className="font-semibold text-white">{start.opponent}</span>
            <span
              className={cn(
                "font-semibold",
                start.overLine ? "text-emerald-200" : "text-slate-300",
              )}
            >
              {start.strikeouts} K
            </span>
            <span className="text-slate-300">{start.pitchCount} pitches</span>
            <span className="text-slate-300">
              {start.innings.toFixed(1)} IP · {start.walks} BB
            </span>
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function PitcherIntelligence({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Player Intelligence"
          title="Rolling Form And Trends"
        />
        <Pill tone="neutral">Source {capitalize(research.pitcherIntelligence.source)}</Pill>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {research.pitcherIntelligence.rolling.map((row) => (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            key={row.label}
          >
            <p className="text-sm font-semibold text-white">{row.label}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <MetricRow label="Starts" value={row.starts} />
              <MetricRow label="K Avg" value={row.averageStrikeouts} />
              <MetricRow label="Pitch Avg" value={row.averagePitchCount} />
              <MetricRow label="IP Avg" value={row.averageInnings} />
              <MetricRow label="ERA" value={row.era} />
              <MetricRow label="WHIP" value={row.whip} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-white">Consistency</p>
          <div className="mt-3 grid gap-2 text-sm">
            <MetricRow
              label="Score"
              value={`${research.pitcherIntelligence.consistency.score}/100`}
            />
            <MetricRow
              label="Expected Range"
              value={research.pitcherIntelligence.consistency.expectedRange}
            />
            <MetricRow
              label="Floor"
              value={research.pitcherIntelligence.consistency.floor}
            />
            <MetricRow
              label="Ceiling"
              value={research.pitcherIntelligence.consistency.ceiling}
            />
            <MetricRow
              label="Std Dev"
              value={research.pitcherIntelligence.consistency.standardDeviation}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-white">Trend Signals</p>
          <div className="mt-3 grid gap-2">
            {research.pitcherIntelligence.trends.length > 0 ? (
              research.pitcherIntelligence.trends.map((trend) => (
                <div
                  className="rounded-lg bg-slate-950/60 px-3 py-2"
                  key={trend.key}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-200">
                      {trend.label}
                    </p>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {trend.direction} · {trend.strength} · {trend.confidence}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {trend.explanation}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Trend signals require live pitcher game logs.
              </p>
            )}
          </div>
        </div>
      </div>
    </ResearchCard>
  );
}

function TodaysMatchup({ research }: { research: PitcherResearchViewModel }) {
  const opponent = research.opponent;
  const lineupStatus = opponent.lineup?.status ?? "unavailable";

  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Today's Matchup" title="Input Quality" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ResearchMetric
          indicatorTone="neutral"
          label="Opponent K%"
          value={`${((opponent.lineup?.averageStrikeoutRate ?? 0) * 100).toFixed(1)}%`}
        />
        <ResearchMetric
          indicatorTone="neutral"
          label="Opponent OPS"
          value={opponent.lineup?.averageOps.toFixed(3) ?? "—"}
        />
        <ResearchMetric
          indicatorTone={lineupStatus === "confirmed" ? "good" : "watch"}
          label="Lineup Status"
          value={capitalize(lineupStatus)}
        />
        <ResearchMetric
          indicatorTone="neutral"
          label="Bullpen Support"
          value={formatRating(research.team.strength?.bullpen.workloadRating)}
        />
        <ResearchMetric
          indicatorTone="neutral"
          label="Weather"
          value={research.weather.summary}
        />
        <ResearchMetric label="Wind" value={research.weather.wind} />
        <ResearchMetric label="Temperature" value={research.weather.temperature} />
        <ResearchMetric label="Air Density" value={research.weather.airDensity} />
        <ResearchMetric
          label="Delay Risk"
          value={research.weather.delayRisk}
        />
        <ResearchMetric label="Ballpark" value={research.ballpark.rating} />
        <ResearchMetric
          indicatorTone="neutral"
          label="Run Environment"
          value={research.weather.runEnvironment}
        />
        <ResearchMetric
          indicatorTone="neutral"
          label="Park K Factor"
          value={research.ballpark.strikeoutFactor}
        />
        <ResearchMetric
          indicatorTone={research.dataConfidence >= 75 ? "good" : "watch"}
          label="Data Confidence"
          value={`${research.dataConfidence}%`}
        />
      </div>
    </ResearchCard>
  );
}

function PredictionBreakdown({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Prediction Breakdown"
        title="Why The Model Leans This Way"
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {research.factors.map((factor) => (
          <FactorRating key={factor.label} {...factor} />
        ))}
      </div>
    </ResearchCard>
  );
}

function ModelExplanation({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Model Explanation" title="Readout" />
      <p className="mt-5 text-sm leading-7 text-slate-300">
        {research.modelExplanation}
      </p>
    </ResearchCard>
  );
}

function MatchupIntelligence({
  research,
}: {
  research: PitcherResearchViewModel;
}) {
  const breakdowns = research.strikeoutMatchup.breakdowns;
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Strikeout Lab"
          title="Matchup Intelligence"
        />
        <div className="flex flex-wrap gap-2">
          <Pill tone="blue">
            Confidence {research.strikeoutMatchup.confidence}%
          </Pill>
          <Pill tone="neutral">Source {capitalize(research.strikeoutMatchup.source)}</Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BreakdownCard breakdown={breakdowns.pitchMatch} />
        <BreakdownCard breakdown={breakdowns.zoneMatch} />
        <BreakdownCard breakdown={breakdowns.recentForm} />
        <BreakdownCard breakdown={breakdowns.overall} />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">Pitch Arsenal</p>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Usage · Velo · Whiff · Movement
          </span>
        </div>
        <div className="mt-4 grid gap-2">
          {research.strikeoutMatchup.arsenal.length > 0 ? (
            research.strikeoutMatchup.arsenal.map((pitch) => (
              <div
                className="grid gap-2 rounded-lg bg-slate-950/60 px-3 py-2 text-sm sm:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_1fr_0.5fr]"
                key={pitch.pitchName}
              >
                <span className="font-semibold text-white">{pitch.pitchName}</span>
                <span className="text-slate-300">{pitch.usage}</span>
                <span className="text-slate-300">{pitch.velocity} MPH</span>
                <span className="text-slate-300">{pitch.whiff}</span>
                <span className="text-slate-400">{pitch.movement}</span>
                <span className="font-semibold text-blue-100">{pitch.score}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Pitch arsenal data is unavailable for this pitcher in the current mode.
            </p>
          )}
        </div>
      </div>
    </ResearchCard>
  );
}

function BreakdownCard({
  breakdown,
}: {
  breakdown: PitcherResearchViewModel["strikeoutMatchup"]["breakdowns"]["overall"];
}) {
  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{breakdown.label}</p>
            <p className="mt-1 text-xs text-slate-500">Expandable breakdown</p>
          </div>
          <p className="text-lg font-semibold text-blue-100">
            {breakdown.score}/100
          </p>
        </div>
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {breakdown.explanation}
      </p>
      <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
        {breakdown.details.map((detail) => (
          <MetricRow key={detail.label} {...detail} />
        ))}
      </div>
      {breakdown.reasons.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {breakdown.reasons.slice(0, 4).map((reason) => (
            <li className="text-sm text-slate-500" key={reason}>
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

function recommendationTone(
  recommendation: PitcherResearchViewModel["overview"]["recommendation"],
) {
  if (recommendation === "Over") return "green";
  if (recommendation === "Lean Over") return "blue";
  if (recommendation === "Under") return "red";
  if (recommendation === "Lean Under") return "yellow";
  return "neutral";
}

function formatRating(value: number | undefined) {
  return value === undefined ? "—" : String(Math.round(value));
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
