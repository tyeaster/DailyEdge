import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getRunLineIntelligence,
  type RunLineCandidate,
  type RunLineViewModel,
} from "./service";

export async function RunLineIntelligencePage() {
  const viewModel = await getRunLineIntelligence();

  return <RunLineIntelligenceLayout viewModel={viewModel} />;
}

function RunLineIntelligenceLayout({ viewModel }: { viewModel: RunLineViewModel }) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Run Line Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Run Line Lab
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Rank spread opportunities with projected margin, starter mismatch,
              bullpen edge, offense gap, pitch and zone matchups, late-inning
              advantage, lineups, recent form, weather, and park context.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.candidateCount} Sides</Pill>
            <Pill tone="neutral">Avg Confidence {viewModel.slateMeta.averageConfidence}</Pill>
            <Pill tone="neutral">Updated {viewModel.slateMeta.lastUpdated}</Pill>
          </div>
        </header>

        <section className="mt-6">
          <ResearchSectionHeader
            eyebrow="Ranked Run Lines"
            title="Best spread-cover opportunities"
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {viewModel.candidates.map((candidate) => (
              <RunLineCard
                candidate={candidate}
                key={`${candidate.game.game.id}-${candidate.side}`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function RunLineCard({ candidate }: { candidate: RunLineCandidate }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
            {candidate.game.awayTeam.abbreviation} at {candidate.game.homeTeam.abbreviation}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {candidate.selectedTeam.name} {candidate.sportsbookRunLineDisplay}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Rank #{candidate.ranked?.rank ?? "-"} · vs {candidate.opponent.name}
          </p>
        </div>
        <Pill tone={recommendationTone(candidate.recommendation)}>
          {candidate.recommendation}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResearchMetric
          indicatorTone={metricTone(candidate.gameGrade)}
          label="Game Grade"
          meta="Composite"
          value={`${candidate.gameGrade}/100`}
        />
        <ResearchMetric
          label="Projected Margin"
          meta="TrueLine"
          value={candidate.projectedMarginDisplay}
        />
        <ResearchMetric
          label="Sportsbook Spread"
          meta={candidate.game.game.odds.spread.sportsbook}
          value={candidate.sportsbookRunLineDisplay}
        />
        <ResearchMetric
          label="Fair Spread"
          meta="TrueLine"
          value={candidate.fairSpreadDisplay}
        />
        <ResearchMetric
          indicatorTone={metricTone(candidate.coverProbability * 100)}
          label="Cover %"
          meta={candidate.winProbabilityDisplay}
          value={candidate.coverProbabilityDisplay}
        />
        <ResearchMetric
          indicatorTone={candidate.edgePercent > 0 ? "good" : "neutral"}
          label="Edge"
          meta={candidate.expectedValueDisplay}
          value={candidate.edgePercentDisplay}
        />
        <ResearchMetric
          indicatorTone={metricTone(candidate.confidence)}
          label="Confidence"
          meta={candidate.sportsbookOddsDisplay}
          value={`${candidate.confidence}%`}
        />
        <ResearchMetric
          label="Recommendation"
          meta="Ranking adjusted"
          value={candidate.recommendation}
        />
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Reasons
        </summary>
        <ul className="mt-3 grid gap-2">
          {candidate.reasons.map((reason) => (
            <li className="text-sm text-slate-500" key={reason}>
              {reason}
            </li>
          ))}
        </ul>
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Scoring Breakdown
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {candidate.factors.map((factor) => (
            <div className="rounded-lg bg-slate-950/70 p-3" key={factor.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-200">{factor.label}</p>
                  <p className="mt-1 text-xs text-slate-600">Weight {factor.weight}</p>
                </div>
                <span className={cn("text-sm font-semibold", scoreText(factor.score))}>
                  {factor.score}/100
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {factor.explanation}
              </p>
              <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                {factor.details.map((detail) => (
                  <div
                    className="flex items-center justify-between gap-3 text-sm"
                    key={detail.label}
                  >
                    <span className="text-slate-600">{detail.label}</span>
                    <span className="font-medium text-slate-300">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </ResearchCard>
  );
}

function metricTone(value: number) {
  if (value >= 68) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(recommendation: RunLineCandidate["recommendation"]) {
  if (recommendation === "Elite" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function scoreText(score: number) {
  if (score >= 70) return "text-emerald-200";
  if (score <= 45) return "text-amber-200";
  return "text-blue-100";
}
