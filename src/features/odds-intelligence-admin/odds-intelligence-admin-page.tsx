import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { BarChart } from "@/src/features/calibration-admin/charts";
import {
  oddsIntelligenceService,
  type OddsIntelligenceDashboardViewModel,
  type OddsMovementViewModel,
} from "@/src/services/odds-intelligence";

export async function OddsIntelligenceAdminPage() {
  const viewModel = await oddsIntelligenceService.getDashboard();

  return <OddsIntelligenceAdminLayout viewModel={viewModel} />;
}

function OddsIntelligenceAdminLayout({
  viewModel,
}: {
  viewModel: OddsIntelligenceDashboardViewModel;
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
              Odds Intelligence
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Closing line value, market movement, steam alerts, and sportsbook
              agreement tracking. Measurement only; predictions are unchanged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{viewModel.movementHistory.length} Markets</Pill>
            <Pill tone="neutral">Mode {viewModel.mode}</Pill>
            <Pill tone="neutral">Provider {viewModel.provider}</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResearchMetric
            indicatorTone={viewModel.averageClv >= 0 ? "good" : "watch"}
            label="Average CLV"
            meta="Current vs close"
            value={formatSignedPercent(viewModel.averageClv)}
          />
          <ResearchMetric
            indicatorTone={metricTone(viewModel.marketAgreement)}
            label="Market Agreement"
            meta="Positive closing edge"
            value={formatPercent(viewModel.marketAgreement)}
          />
          <ResearchMetric
            indicatorTone={viewModel.bestClv ? "good" : "neutral"}
            label="Best CLV"
            meta={viewModel.bestClv?.predictionId ?? "No market"}
            value={viewModel.bestClv ? formatSignedPercent(viewModel.bestClv.analysis.clvPercent) : "-"}
          />
          <ResearchMetric
            indicatorTone={viewModel.worstClv ? "watch" : "neutral"}
            label="Worst CLV"
            meta={viewModel.worstClv?.predictionId ?? "No market"}
            value={viewModel.worstClv ? formatSignedPercent(viewModel.worstClv.analysis.clvPercent) : "-"}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <ResearchCard>
            <ResearchSectionHeader eyebrow="Movement History" title="CLV by market" />
            <div className="mt-5">
              <BarChart
                points={viewModel.movementHistory.map((market) => ({
                  label: market.predictionId,
                  value: market.analysis.clvPercent,
                }))}
              />
            </div>
          </ResearchCard>

          <ResearchCard>
            <ResearchSectionHeader eyebrow="Steam Alerts" title="Fast market movement" />
            <div className="mt-5 grid gap-3">
              {viewModel.steamAlerts.map((market) => (
                <MarketRow key={market.predictionId} market={market} />
              ))}
              {viewModel.steamAlerts.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-500">
                  No steam alerts detected.
                </p>
              ) : null}
            </div>
          </ResearchCard>
        </section>

        <section className="mt-6">
          <ResearchSectionHeader eyebrow="Markets" title="Odds movement details" />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {viewModel.movementHistory.map((market) => (
              <MarketCard key={market.predictionId} market={market} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MarketCard({ market }: { market: OddsMovementViewModel }) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200/70">
            {market.market} · {market.sportsbook}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {market.predictionId}
          </h2>
        </div>
        <Pill tone={market.analysis.clvPercent >= 0 ? "green" : "yellow"}>
          {market.analysis.movementType}
        </Pill>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MiniMetric label="CLV" value={formatSignedPercent(market.analysis.clvPercent)} />
        <MiniMetric label="Opening Edge" value={formatSignedPercent(market.analysis.opening.openingEdgePercent)} />
        <MiniMetric label="Closing Edge" value={formatSignedPercent(market.analysis.closingEdgePercent)} />
        <MiniMetric label="Market Drift" value={formatSignedPercent(market.analysis.marketDriftPercent)} />
        <MiniMetric label="Expected Close" value={formatSignedPercent(market.analysis.expectedClosingEdgePercent)} />
        <MiniMetric label="Closing Odds" value={formatOdds(market.closing?.closingOdds)} />
      </div>
      <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Timeline
        </summary>
        <div className="mt-3 grid gap-2">
          {market.timeline.map((point) => (
            <div
              className="flex items-center justify-between gap-3 text-sm"
              key={point.timestamp}
            >
              <span className="text-slate-500">{point.timestamp}</span>
              <span className="font-medium text-slate-200">
                {formatOdds(point.currentOdds)} · {formatSignedPercent(point.movementPercent)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </ResearchCard>
  );
}

function MarketRow({ market }: { market: OddsMovementViewModel }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="font-semibold text-white">{market.predictionId}</p>
      <p className="mt-2 text-sm text-slate-500">
        {market.analysis.steamAlert ?? "Steam move detected."}
      </p>
    </div>
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

function formatOdds(odds?: number) {
  if (odds === undefined) return "-";
  return odds > 0 ? `+${odds}` : String(odds);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function metricTone(value: number) {
  if (value >= 60) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}
