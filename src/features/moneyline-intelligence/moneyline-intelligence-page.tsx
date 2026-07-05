import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getMoneylineIntelligence,
  type MoneylineGameEvaluation,
  type MoneylineIntelligenceViewModel,
} from "./service";

export async function MoneylineIntelligencePage() {
  const viewModel = await getMoneylineIntelligence();

  return <MoneylineIntelligenceLayout viewModel={viewModel} />;
}

function MoneylineIntelligenceLayout({
  viewModel,
}: {
  viewModel: MoneylineIntelligenceViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Moneyline Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Moneyline Lab
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Complete game evaluation for which team should win and why, using
              team strength, starters, bullpens, matchup intelligence, weather,
              ballpark, and market pricing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.slateMeta.gamesEvaluated} Games</Pill>
            <Pill tone="neutral">Avg Confidence {viewModel.slateMeta.averageConfidence}</Pill>
            <Pill tone="neutral">Updated {viewModel.slateMeta.lastUpdated}</Pill>
          </div>
        </header>

        <section className="mt-6">
          <ResearchSectionHeader
            eyebrow="Ranked By Edge"
            title="Best moneyline evaluations"
          />
          <div className="mt-4 grid gap-4">
            {viewModel.games.map((game) => (
              <GameCard evaluation={game} key={game.game.game.id} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function GameCard({ evaluation }: { evaluation: MoneylineGameEvaluation }) {
  return (
    <ResearchCard>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">
            {evaluation.awayTeam.abbreviation} at {evaluation.homeTeam.abbreviation}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {evaluation.projectedWinner.name} projected to win
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            {evaluation.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={recommendationTone(evaluation.recommendation)}>
            {evaluation.recommendation}
          </Pill>
          <Pill tone="blue">Confidence {evaluation.confidence}%</Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <ResearchMetric
          indicatorTone={metricTone(evaluation.winProbability * 100)}
          label="Win %"
          meta="Projected winner"
          value={evaluation.winProbabilityDisplay}
        />
        <ResearchMetric
          label="Fair Odds"
          meta="TrueLine"
          value={evaluation.fairOddsDisplay}
        />
        <ResearchMetric
          label="Sportsbook Odds"
          meta={evaluation.game.game.odds.moneyline.sportsbook}
          value={evaluation.sportsbookOddsDisplay}
        />
        <ResearchMetric
          indicatorTone={evaluation.edgePercent > 0 ? "good" : "neutral"}
          label="Edge"
          meta="Probability gap"
          value={evaluation.edgePercentDisplay}
        />
        <ResearchMetric
          indicatorTone={evaluation.expectedValuePercent > 0 ? "good" : "neutral"}
          label="Expected Value"
          meta="Per unit risked"
          value={evaluation.expectedValueDisplay}
        />
        <ResearchMetric
          indicatorTone={metricTone(getWinnerGrade(evaluation))}
          label="Game Grade"
          meta="Winner side"
          value={`${getWinnerGrade(evaluation)}/100`}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <TeamPanel evaluation={evaluation} side="away" />
        <TeamPanel evaluation={evaluation} side="home" />
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Expandable Breakdown
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {evaluation.factors.map((factor) => (
            <details
              className="rounded-lg bg-slate-950/60 p-3"
              key={factor.label}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-200">{factor.label}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Weight {factor.weight}
                    </p>
                  </div>
                  <span className="text-sm text-slate-400">
                    {factor.awayScore} / {factor.homeScore}
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
                    <span className="font-medium text-slate-300">{detail.value}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Reasons
        </summary>
        <ul className="mt-3 grid gap-2">
          {evaluation.reasons.map((reason) => (
            <li className="text-sm text-slate-500" key={reason}>
              {reason}
            </li>
          ))}
        </ul>
      </details>
    </ResearchCard>
  );
}

function TeamPanel({
  evaluation,
  side,
}: {
  evaluation: MoneylineGameEvaluation;
  side: "away" | "home";
}) {
  const team = side === "away" ? evaluation.away : evaluation.home;
  const isWinner = evaluation.projectedWinner.id === team.team.id;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.025] p-4",
        isWinner ? "border-blue-300/20" : "border-white/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{team.team.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-600">
            {side === "away" ? "Away" : "Home"}
          </p>
        </div>
        {isWinner ? <Pill tone="blue">Projected Winner</Pill> : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniScore label="Grade" value={team.overallTeamGrade} />
        <MiniScore label="Runs" value={team.projectedRuns} compact />
        <MiniScore label="Offense" value={team.offenseScore} />
        <MiniScore label="Starter" value={team.startingPitchingScore} />
        <MiniScore label="Bullpen" value={team.bullpenScore} />
        <MiniScore label="Matchup" value={team.matchupScore} />
      </div>
    </div>
  );
}

function MiniScore({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className={cn("mt-2 font-semibold", compact ? "text-white" : scoreText(value))}>
        {compact ? value.toFixed(1) : `${Math.round(value)}/100`}
      </p>
    </div>
  );
}

function getWinnerGrade(evaluation: MoneylineGameEvaluation) {
  return evaluation.projectedWinner.id === evaluation.homeTeam.id
    ? evaluation.home.overallTeamGrade
    : evaluation.away.overallTeamGrade;
}

function metricTone(value: number) {
  if (value >= 58) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(recommendation: MoneylineGameEvaluation["recommendation"]) {
  if (recommendation === "Best Bet" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function scoreText(value: number) {
  if (value >= 68) return "text-emerald-200";
  if (value <= 42) return "text-rose-200";
  return "text-blue-100";
}
