import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getHomeRunIntelligence,
  type HomeRunCandidate,
  type HomeRunIntelligenceViewModel,
} from "./service";

export async function HomeRunIntelligencePage() {
  const viewModel = await getHomeRunIntelligence();

  return <HomeRunIntelligenceLayout viewModel={viewModel} />;
}

function HomeRunIntelligenceLayout({
  viewModel,
}: {
  viewModel: HomeRunIntelligenceViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Home Run Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Home Run Lab
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Identify hitters with the strongest power profile, pitcher matchup,
              zone overlap, ballpark, weather, lineup, and bullpen context today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.candidateCount} Candidates</Pill>
            <Pill tone="neutral">Updated {viewModel.slateMeta.lastUpdated}</Pill>
            <Pill tone="neutral">Source {viewModel.slateMeta.dataSource}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Hero viewModel={viewModel} />
          <SlateContext viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <ResearchSectionHeader
            eyebrow="Top HR Candidates"
            title="Best home run environments and matchups"
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {viewModel.candidates.map((candidate) => (
              <CandidateCard candidate={candidate} key={candidate.batter.id} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Hero({ viewModel }: { viewModel: HomeRunIntelligenceViewModel }) {
  const top = viewModel.topCandidate;

  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader
            eyebrow="Current Leader"
            title={top ? top.batter.fullName : "No candidates loaded"}
          />
          {top ? (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {top.summary}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResearchMetric
                  indicatorTone={metricTone(top.overallHrScore)}
                  label="HR Score"
                  meta="Overall"
                  value={`${top.overallHrScore}/100`}
                />
                <ResearchMetric
                  indicatorTone="good"
                  label="HR Probability"
                  meta="Initial estimate"
                  value={top.hrProbabilityDisplay}
                />
                <ResearchMetric
                  label="Fair Odds"
                  meta="TrueLine"
                  value={top.fairOddsDisplay}
                />
                <ResearchMetric
                  indicatorTone={metricTone(top.confidence)}
                  label="Confidence"
                  meta={top.recommendation}
                  value={`${top.confidence}%`}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ResearchCard>
  );
}

function SlateContext({
  viewModel,
}: {
  viewModel: HomeRunIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Slate Context" title="Market Overview" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {viewModel.context.map((item) => (
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

function CandidateCard({ candidate }: { candidate: HomeRunCandidate }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
            {candidate.team.abbreviation} vs {candidate.opponent.abbreviation}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {candidate.batter.fullName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            vs {candidate.opponentPitcher.fullName} · Order{" "}
            {candidate.battingOrder} · {candidate.expectedPlateAppearances} PA
          </p>
        </div>
        <Pill tone={recommendationTone(candidate.recommendation)}>
          {candidate.recommendation}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ResearchMetric
          indicatorTone={metricTone(candidate.overallHrScore)}
          label="Overall HR Score"
          meta="Power + matchup + context"
          value={`${candidate.overallHrScore}/100`}
        />
        <ResearchMetric
          label="HR Probability"
          meta="Not calibrated"
          value={candidate.hrProbabilityDisplay}
        />
        <ResearchMetric
          label="Fair Odds"
          meta="TrueLine"
          value={candidate.fairOddsDisplay}
        />
        <ResearchMetric
          indicatorTone={metricTone(candidate.confidence)}
          label="Confidence"
          value={`${candidate.confidence}%`}
        />
        <ResearchMetric
          label="Sportsbook Odds"
          meta={candidate.sportsbook?.sportsbook ?? "Unavailable"}
          value={candidate.sportsbook?.oddsDisplay ?? "-"}
        />
        <ResearchMetric
          indicatorTone={
            candidate.edgePercent !== undefined && candidate.edgePercent > 0
              ? "good"
              : "neutral"
          }
          label="Edge"
          meta={candidate.sportsbook?.expectedValueDisplay ?? "No market price"}
          value={candidate.sportsbook?.edgeDisplay ?? "-"}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniScore label="Pitch Match" value={candidate.matchup.pitch} />
        <MiniScore label="Zone Match" value={candidate.matchup.zone} />
        <MiniScore label="Overall Match" value={candidate.matchup.overall} />
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Scoring Breakdown
        </summary>
        <div className="mt-4 grid gap-3">
          {candidate.factors.map((factor) => (
            <details
              className="rounded-lg bg-slate-950/60 p-3"
              key={factor.label}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {factor.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Weight {factor.weight}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold", scoreText(factor.score))}>
                    {factor.score}/100
                  </span>
                </div>
              </summary>
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
                    <span className="font-medium text-slate-300">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Why This Candidate
        </summary>
        <ul className="mt-3 grid gap-2">
          {candidate.explanations.map((explanation) => (
            <li className="text-sm text-slate-500" key={explanation}>
              {explanation}
            </li>
          ))}
        </ul>
      </details>
    </ResearchCard>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">
        {label}
      </p>
      <p className={cn("mt-2 text-lg font-semibold", scoreText(value))}>
        {value}/100
      </p>
    </div>
  );
}

function metricTone(value: number) {
  if (value >= 68) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(recommendation: HomeRunCandidate["recommendation"]) {
  if (recommendation === "Elite" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function scoreText(value: number) {
  if (value >= 72) return "text-emerald-200";
  if (value <= 42) return "text-rose-200";
  return "text-blue-100";
}
