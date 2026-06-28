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
  getHitterResearch,
  type HitterResearchViewModel,
} from "./service";

export async function HitterResearchPage({
  batterId,
}: {
  batterId?: string;
}) {
  const research = await getHitterResearch(batterId);

  return <HitterResearchLayout research={research} />;
}

function HitterResearchLayout({
  research,
}: {
  research: HitterResearchViewModel;
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
              Hits Lab
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {research.batter.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {research.team.name} vs {research.opponent.name} ·{" "}
              {research.opposingPitcher.fullName} · {research.gameTime}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={recommendationTone(research.overview.recommendation)}>
              {research.overview.recommendation}
            </Pill>
            <Pill tone="blue">Match {research.overview.matchupScore}</Pill>
            <Pill tone="neutral">Data {research.dataConfidence}%</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Overview research={research} />
          <ModelExplanation research={research} />
        </section>

        <section className="mt-6">
          <RecentPerformance research={research} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <RollingTrends research={research} />
          <MatchupIntelligence research={research} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <PitcherMatchup research={research} />
          <Context research={research} />
        </section>

        <section className="mt-6">
          <PredictionBreakdown research={research} />
        </section>
      </div>
    </main>
  );
}

function Overview({ research }: { research: HitterResearchViewModel }) {
  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader eyebrow="Top Summary" title="Hit And Total Bases Setup" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResearchMetric
              indicatorTone="neutral"
              label="Hit Line"
              meta={research.overview.sportsbook}
              value={research.overview.hitLine}
            />
            <ResearchMetric
              indicatorTone="neutral"
              label="TB Line"
              meta={`Odds ${research.overview.sportsbookOdds}`}
              value={research.overview.totalBaseLine}
            />
            <ResearchMetric
              indicatorTone="good"
              label="Projection"
              meta="Hits / total bases"
              value={research.overview.projection}
            />
            <ResearchMetric
              indicatorTone={research.edge.startsWith("+") ? "good" : "watch"}
              label="Edge"
              meta="Projection minus market"
              value={research.edge}
            />
            <ResearchMetric
              indicatorTone={research.confidence >= 75 ? "good" : "neutral"}
              label="Confidence"
              value={research.overview.confidence}
            />
            <ResearchMetric
              indicatorTone={research.matchup.overallScore >= 65 ? "good" : "neutral"}
              label="Overall Match"
              value={research.overview.matchupScore}
            />
            <ResearchMetric
              label="Opponent"
              value={research.opponent.abbreviation}
            />
            <ResearchMetric
              label="Pitcher"
              value={research.opposingPitcher.fullName}
            />
          </div>
        </div>
      </div>
    </ResearchCard>
  );
}

function RecentPerformance({
  research,
}: {
  research: HitterResearchViewModel;
}) {
  const maxTotalBases = Math.max(
    research.totalBaseLine + 2,
    ...research.recentGames.map((game) => game.totalBases),
  );
  const lineTop = 100 - (research.totalBaseLine / maxTotalBases) * 100;

  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Recent Performance"
          title="Last 10 Games"
        />
        <div className="flex flex-wrap gap-2">
          <Pill tone="neutral">Hit {research.hitLine.toFixed(1)}</Pill>
          <Pill tone="neutral">TB {research.totalBaseLine.toFixed(1)}</Pill>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/70 p-4">
        <div className="relative h-56">
          <div
            className="absolute left-0 right-0 border-t border-dashed border-blue-200/70"
            style={{ top: `${lineTop}%` }}
          >
            <span className="absolute -top-3 right-0 rounded-full bg-blue-300 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
              TB Line
            </span>
          </div>
          <div className="grid h-full grid-cols-10 items-end gap-2">
            {research.recentGames.map((game) => (
              <div className="flex h-full flex-col justify-end" key={`${game.date}-${game.opponent}`}>
                <div
                  className={cn(
                    "rounded-t-lg border border-white/10",
                    game.overTotalBaseLine
                      ? "bg-emerald-300/80"
                      : game.overHitLine
                        ? "bg-blue-300/75"
                        : "bg-slate-600/80",
                  )}
                  style={{
                    height: `${Math.max(12, (game.totalBases / maxTotalBases) * 100)}%`,
                  }}
                />
                <p className="mt-2 text-center text-xs font-semibold text-white">
                  {game.totalBases}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {research.recentGames.map((game) => (
          <div
            className="grid grid-cols-[0.7fr_0.65fr_0.5fr_0.6fr_0.6fr_0.6fr_0.6fr] items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2 text-sm"
            key={`${game.date}-${game.opponent}-row`}
          >
            <span className="text-slate-500">{game.date}</span>
            <span className="font-semibold text-white">{game.opponent}</span>
            <span className={game.overHitLine ? "font-semibold text-emerald-200" : "text-slate-300"}>
              {game.hits} H
            </span>
            <span className={game.overTotalBaseLine ? "font-semibold text-emerald-200" : "text-slate-300"}>
              {game.totalBases} TB
            </span>
            <span className="text-slate-300">{game.atBats} AB</span>
            <span className="text-slate-300">{game.strikeouts} K</span>
            <span className="text-slate-300">{game.walks} BB</span>
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function RollingTrends({ research }: { research: HitterResearchViewModel }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Rolling Trends"
          title="Batter Form Windows"
        />
        <Pill tone="neutral">Profile Source</Pill>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {research.rolling.map((row) => (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            key={row.label}
          >
            <p className="text-sm font-semibold text-white">{row.label}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <MetricRow label="Hits" value={row.hits} />
              <MetricRow label="Total Bases" value={row.totalBases} />
              <MetricRow label="AVG" value={row.average} />
              <MetricRow label="OPS" value={row.onBasePlusSlugging} />
              <MetricRow label="Hard Hit" value={row.hardHitPercent} />
              <MetricRow label="Barrel" value={row.barrelPercent} />
              <MetricRow label="K%" value={row.strikeoutPercent} />
              <MetricRow label="BB%" value={row.walkPercent} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {research.trends.length > 0 ? (
          research.trends.map((trend) => (
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
            Batter trends require game-log data.
          </p>
        )}
      </div>
    </ResearchCard>
  );
}

function MatchupIntelligence({
  research,
}: {
  research: HitterResearchViewModel;
}) {
  const breakdowns = research.matchup.breakdowns;

  return (
    <ResearchCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ResearchSectionHeader
          eyebrow="Matchup Intelligence"
          title="Pitcher Versus Batter"
        />
        <div className="flex flex-wrap gap-2">
          <Pill tone="blue">Confidence {research.matchup.confidence}%</Pill>
          <Pill tone="neutral">Source {capitalize(research.matchup.source)}</Pill>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <BreakdownCard breakdown={breakdowns.pitchMatch} />
        <BreakdownCard breakdown={breakdowns.zoneMatch} />
        <BreakdownCard breakdown={breakdowns.overall} />
      </div>
    </ResearchCard>
  );
}

function PitcherMatchup({ research }: { research: HitterResearchViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Pitcher Matchup"
        title={research.opposingPitcher.fullName}
      />
      <div className="mt-5 grid gap-2">
        {research.matchup.arsenal.length > 0 ? (
          research.matchup.arsenal.map((pitch) => (
            <div
              className="grid gap-2 rounded-lg bg-slate-950/60 px-3 py-2 text-sm sm:grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.7fr_0.7fr_0.7fr_0.5fr]"
              key={pitch.pitchName}
            >
              <span className="font-semibold text-white">{pitch.pitchName}</span>
              <span className="text-slate-300">{pitch.usage}</span>
              <span className="text-slate-300">{pitch.velocity} MPH</span>
              <span className="text-slate-300">{pitch.whiff}</span>
              <span className="text-slate-300">{pitch.strike}</span>
              <span className="text-slate-400">{pitch.groundBall}</span>
              <span className="text-slate-400">{pitch.hardHitAllowed}</span>
              <span className="font-semibold text-blue-100">{pitch.score}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            Pitch arsenal data is unavailable for this pitcher in the current mode.
          </p>
        )}
      </div>
    </ResearchCard>
  );
}

function Context({ research }: { research: HitterResearchViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Context" title="Game Environment" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {research.context.map((item) => (
          <ResearchMetric
            key={item.label}
            label={item.label}
            meta={item.meta}
            value={item.value}
          />
        ))}
      </div>
    </ResearchCard>
  );
}

function PredictionBreakdown({
  research,
}: {
  research: HitterResearchViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Explainability"
        title="Why The Model Leans This Way"
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
  research: HitterResearchViewModel;
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

function BreakdownCard({
  breakdown,
}: {
  breakdown: HitterResearchViewModel["matchup"]["breakdowns"]["overall"];
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
  recommendation: HitterResearchViewModel["overview"]["recommendation"],
) {
  if (recommendation === "Over") return "green";
  if (recommendation === "Lean Over") return "blue";
  if (recommendation === "Under") return "red";
  if (recommendation === "Lean Under") return "yellow";
  return "neutral";
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
