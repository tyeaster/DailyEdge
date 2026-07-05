import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { calibrationService } from "@/src/services/calibration";
import type {
  CalibrationDashboardViewModel,
  ModelScorecard,
} from "@/src/services/calibration";

import { BarChart, CalibrationCurveChart, DistributionChart } from "./charts";

export async function CalibrationAdminPage() {
  const viewModel = await calibrationService.getDashboard();

  return <CalibrationAdminLayout viewModel={viewModel} />;
}

function CalibrationAdminLayout({
  viewModel,
}: {
  viewModel: CalibrationDashboardViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Calibration Engine
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Model measurement for prediction accuracy, confidence calibration,
              ROI, win rate, and market performance. This page measures existing
              models only; it does not adjust weights.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.overallMetrics.predictionCount} Predictions</Pill>
            <Pill tone="neutral">Mode {viewModel.mode}</Pill>
            <Pill tone="neutral">Provider {viewModel.provider}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResearchMetric
            indicatorTone={metricTone(viewModel.overallMetrics.winRate)}
            label="Win Rate"
            meta="Completed predictions"
            value={formatPercent(viewModel.overallMetrics.winRate)}
          />
          <ResearchMetric
            indicatorTone={viewModel.overallMetrics.roi >= 0 ? "good" : "watch"}
            label="ROI"
            meta="Flat stake"
            value={formatSignedPercent(viewModel.overallMetrics.roi)}
          />
          <ResearchMetric
            indicatorTone={metricTone(viewModel.overallMetrics.confidenceAccuracy)}
            label="Confidence Accuracy"
            meta="100 minus confidence error"
            value={formatPercent(viewModel.overallMetrics.confidenceAccuracy)}
          />
          <ResearchMetric
            indicatorTone={metricTone(100 - viewModel.overallMetrics.calibrationError)}
            label="Calibration"
            meta="Probability alignment"
            value={formatPercent(100 - viewModel.overallMetrics.calibrationError)}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <ResearchCard>
            <ResearchSectionHeader
              eyebrow="Confidence Calibration"
              title="Predicted win rate vs actual win rate"
            />
            <div className="mt-5">
              <CalibrationCurveChart points={viewModel.confidenceCurve} />
            </div>
          </ResearchCard>

          <ResearchCard>
            <ResearchSectionHeader eyebrow="Prediction Volume" title="Confidence buckets" />
            <div className="mt-5">
              <DistributionChart
                points={viewModel.confidenceCurve.map((bucket) => ({
                  label: bucket.label,
                  value: bucket.count,
                }))}
              />
            </div>
          </ResearchCard>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ResearchCard>
            <ResearchSectionHeader eyebrow="ROI Over Time" title="Recent accuracy" />
            <div className="mt-5">
              <BarChart
                points={viewModel.recentAccuracy.map((point) => ({
                  label: point.date,
                  value: point.roi,
                }))}
              />
            </div>
          </ResearchCard>

          <ResearchCard>
            <ResearchSectionHeader eyebrow="Win Rate" title="Recent win rate" />
            <div className="mt-5">
              <BarChart
                points={viewModel.recentAccuracy.map((point) => ({
                  label: point.date,
                  value: point.winRate,
                }))}
              />
            </div>
          </ResearchCard>
        </section>

        <section className="mt-6">
          <ResearchSectionHeader
            eyebrow="Model Scorecards"
            title="Market performance by model"
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            {viewModel.marketPerformance.map((scorecard) => (
              <ScorecardCard
                key={`${scorecard.modelId}-${scorecard.market}`}
                scorecard={scorecard}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ScorecardList scorecards={viewModel.bestModels} title="Best Models" />
          <ScorecardList scorecards={viewModel.worstModels} title="Worst Models" />
        </section>
      </div>
    </main>
  );
}

function ScorecardCard({ scorecard }: { scorecard: ModelScorecard }) {
  return (
    <ResearchCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200/70">
            {scorecard.modelId}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {marketLabel(scorecard.market)}
          </h2>
        </div>
        <Pill tone={scorecard.roi >= 0 ? "green" : "yellow"}>
          {formatSignedPercent(scorecard.roi)}
        </Pill>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniMetric label="Predictions" value={String(scorecard.predictionCount)} />
        <MiniMetric label="Win Rate" value={formatPercent(scorecard.winRate)} />
        <MiniMetric label="Avg EV" value={formatSignedPercent(scorecard.averageEv)} />
        <MiniMetric label="Avg Edge" value={formatSignedPercent(scorecard.averageEdge)} />
        <MiniMetric label="Calibration" value={formatPercent(scorecard.calibration)} />
        <MiniMetric
          label="Confidence Accuracy"
          value={formatPercent(scorecard.confidenceAccuracy)}
        />
      </div>
    </ResearchCard>
  );
}

function ScorecardList({
  scorecards,
  title,
}: {
  scorecards: ModelScorecard[];
  title: string;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Scorecard" title={title} />
      <div className="mt-5 grid gap-3">
        {scorecards.map((scorecard) => (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"
            key={`${title}-${scorecard.modelId}-${scorecard.market}`}
          >
            <div>
              <p className="font-semibold text-white">{marketLabel(scorecard.market)}</p>
              <p className="mt-1 text-xs text-slate-600">
                {scorecard.modelId} · {scorecard.predictionCount} predictions
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-blue-100">
                {formatSignedPercent(scorecard.roi)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {formatPercent(scorecard.winRate)} win
              </p>
            </div>
          </div>
        ))}
      </div>
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

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function metricTone(value: number) {
  if (value >= 65) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function marketLabel(market: ModelScorecard["market"]) {
  if (market === "home-runs") return "Home Runs";
  if (market === "team-total") return "Team Totals";
  if (market === "game-total") return "Game Totals";
  if (market === "total-bases") return "Total Bases";

  return market.charAt(0).toUpperCase() + market.slice(1);
}
