import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import {
  getZoneIntelligence,
  type ZoneCellViewModel,
  type ZoneIntelligenceViewModel,
} from "./service";

export async function ZoneIntelligencePage({
  batterId,
  pitcherId,
}: {
  batterId?: string;
  pitcherId?: string;
}) {
  const viewModel = await getZoneIntelligence({ batterId, pitcherId });

  return <ZoneIntelligenceLayout viewModel={viewModel} />;
}

function ZoneIntelligenceLayout({
  viewModel,
}: {
  viewModel: ZoneIntelligenceViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Zone Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {viewModel.pitcher.fullName} vs {viewModel.batter.fullName}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              {viewModel.pitcherTeam.abbreviation} pitcher against{" "}
              {viewModel.batterTeam.abbreviation} hitter at {viewModel.game.game.venue} ·{" "}
              {viewModel.gameTime}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={scoreTone(viewModel.matchup.overallMatch)}>
              Overall {viewModel.matchup.overallMatch}/100
            </Pill>
            <Pill tone={scoreTone(viewModel.matchup.zoneMatch)}>
              Zone {viewModel.matchup.zoneMatch}/100
            </Pill>
            <Pill tone="blue">Confidence {viewModel.matchup.confidence}%</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <HeroSummary viewModel={viewModel} />
          <Explainability viewModel={viewModel} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <PitchUsage viewModel={viewModel} />
          <PitchArsenal viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <BatterPitchComparison viewModel={viewModel} />
        </section>

        <section className="mt-6 grid gap-4 2xl:grid-cols-3">
          <ZoneMapCard
            cells={viewModel.pitcherHeatCells}
            legend="Pitch frequency by strike-zone bucket"
            title="Pitch Heat Map"
            variant="frequency"
          />
          <ZoneMapCard
            cells={viewModel.zoneDamageCells}
            legend="Batter damage rating by zone"
            title="Damage Heat Map"
            variant="damage"
          />
          <ZoneMapCard
            cells={viewModel.overlayCells}
            legend="Pitcher location pressure over batter damage zones"
            title="Overlay"
            variant="overlay"
          />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <PitchTypeBreakdown viewModel={viewModel} />
          <Context viewModel={viewModel} />
        </section>
      </div>
    </main>
  );
}

function HeroSummary({ viewModel }: { viewModel: ZoneIntelligenceViewModel }) {
  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader
            eyebrow="Matchup Command Center"
            title="Pitcher Versus Batter"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.overallMatch)}
              label="Overall Match"
              meta="Weighted matchup score"
              value={`${viewModel.matchup.overallMatch}/100`}
            />
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.pitchMatch)}
              label="Pitch Match"
              meta="Pitch-type compatibility"
              value={`${viewModel.matchup.pitchMatch}/100`}
            />
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.zoneMatch)}
              label="Zone Match"
              meta="Location overlap"
              value={`${viewModel.matchup.zoneMatch}/100`}
            />
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.confidence)}
              label="Confidence"
              meta={viewModel.dataSources.join(", ") || "unavailable"}
              value={`${viewModel.matchup.confidence}%`}
            />
            <ResearchMetric
              label="Recent Match"
              meta="Player Intelligence"
              value={`${viewModel.matchup.recentMatch}/100`}
            />
            <ResearchMetric
              label="Primary Prop"
              meta={viewModel.selectedProp?.prop.odds.sportsbook ?? "Market"}
              value={viewModel.selectedProp?.prop.odds.displayLine ?? "-"}
            />
            <ResearchMetric
              label="Pitcher"
              meta={viewModel.pitcherTeam.name}
              value={viewModel.pitcher.throws}
            />
            <ResearchMetric
              label="Batter"
              meta={viewModel.batterTeam.name}
              value={viewModel.batter.bats}
            />
          </div>
        </div>
      </div>
    </ResearchCard>
  );
}

function Explainability({
  viewModel,
}: {
  viewModel: ZoneIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader eyebrow="Explainability" title="Model Readout" />
        <Pill tone="neutral">Every Score Explains Itself</Pill>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-300">{viewModel.summary}</p>
      <div className="mt-5 grid gap-2">
        {[...viewModel.reasons, ...viewModel.zoneReasons].slice(0, 6).map((reason) => (
          <div
            className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-slate-400"
            key={reason}
          >
            {reason}
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function PitchUsage({ viewModel }: { viewModel: ZoneIntelligenceViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Pitch Usage" title="Arsenal Mix" />
      <div className="mt-5 grid gap-4">
        {viewModel.pitchUsage.map((pitch) => (
          <div key={pitch.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-200">{pitch.label}</span>
              <span className="text-slate-500">{pitch.value}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-900">
              <div
                className="h-2 rounded-full bg-blue-300"
                style={{ width: `${Math.max(4, pitch.value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function PitchArsenal({
  viewModel,
}: {
  viewModel: ZoneIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Pitcher Section" title="Pitch Arsenal" />
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-600">
            <tr>
              {[
                "Pitch",
                "Usage",
                "Velo",
                "Spin",
                "VB",
                "HB",
                "Release",
                "Whiff",
                "Put Away",
                "Strike",
                "Zone",
                "GB",
                "Hard Hit",
              ].map((header) => (
                <th className="border-b border-white/10 px-3 py-3" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewModel.pitchArsenalRows.map((pitch) => (
              <tr className="border-b border-white/5" key={pitch.pitchName}>
                <TableCell primary>{pitch.pitchName}</TableCell>
                <TableCell>{pitch.usagePercent}</TableCell>
                <TableCell>{pitch.velocity}</TableCell>
                <TableCell>{pitch.spinRate}</TableCell>
                <TableCell>{pitch.verticalBreak}</TableCell>
                <TableCell>{pitch.horizontalBreak}</TableCell>
                <TableCell>{pitch.release}</TableCell>
                <TableCell>{pitch.whiffPercent}</TableCell>
                <TableCell>{pitch.putAwayPercent}</TableCell>
                <TableCell>{pitch.strikePercent}</TableCell>
                <TableCell>{pitch.zonePercent}</TableCell>
                <TableCell>{pitch.groundBallPercent}</TableCell>
                <TableCell>{pitch.hardHitAllowed}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResearchCard>
  );
}

function BatterPitchComparison({
  viewModel,
}: {
  viewModel: ZoneIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Batter Section"
        title={`Damage Profile: ${viewModel.batter.fullName}`}
      />
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-600">
            <tr>
              {[
                "Pitch",
                "AVG",
                "xBA",
                "SLG",
                "xSLG",
                "Hard Hit",
                "Barrel",
                "Whiff",
                "Run Value",
                "Damage",
              ].map((header) => (
                <th className="border-b border-white/10 px-3 py-3" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewModel.batterPitchRows.map((pitch) => (
              <tr className="border-b border-white/5" key={pitch.pitchName}>
                <TableCell primary>{pitch.pitchName}</TableCell>
                <TableCell>{pitch.average}</TableCell>
                <TableCell>{pitch.expectedAverage}</TableCell>
                <TableCell>{pitch.slugging}</TableCell>
                <TableCell>{pitch.expectedSlugging}</TableCell>
                <TableCell>{pitch.hardHitPercent}</TableCell>
                <TableCell>{pitch.barrelPercent}</TableCell>
                <TableCell>{pitch.whiffPercent}</TableCell>
                <TableCell>{pitch.runValue}</TableCell>
                <TableCell>
                  <span className={cn("font-semibold", scoreText(pitch.damageScore))}>
                    {pitch.damageScore}
                  </span>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResearchCard>
  );
}

function ZoneMapCard({
  cells,
  legend,
  title,
  variant,
}: {
  cells: ZoneCellViewModel[];
  legend: string;
  title: string;
  variant: "damage" | "frequency" | "overlay";
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ResearchSectionHeader eyebrow="Zone Intelligence" title={title} />
        <Pill tone="neutral">{legend}</Pill>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
        {cells.map((cell) => (
          <div
            className={cn(
              "aspect-square rounded-xl border p-3 transition",
              cell.classification === "advantage" &&
                "border-emerald-300/30 bg-emerald-400/10",
              cell.classification === "risk" && "border-rose-300/30 bg-rose-400/10",
              (!cell.classification || cell.classification === "neutral") &&
                "border-white/10 bg-white/[0.025]",
            )}
            key={cell.zone}
            style={{ boxShadow: getCellShadow(cell, variant) }}
          >
            <div className="flex h-full flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Zone {cell.zone}
              </span>
              <div>
                <p className="text-2xl font-semibold text-white">{cell.label}</p>
                <p className="mt-1 text-xs text-slate-500">{cell.meta}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ResearchCard>
  );
}

function PitchTypeBreakdown({
  viewModel,
}: {
  viewModel: ZoneIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Pitch-Type Comparison"
        title="Score Breakdown"
      />
      <div className="mt-5 grid gap-3">
        {viewModel.pitchComparisons.map((pitch) => (
          <details
            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            key={pitch.pitchName}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{pitch.pitchName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Usage {pitch.usagePercent}
                  </p>
                </div>
                <Pill tone={scoreTone(pitch.score)}>{pitch.score}/100</Pill>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MiniScore label="Contact" value={pitch.contactMatch} />
              <MiniScore label="Velocity" value={pitch.velocityMatch} />
              <MiniScore label="Movement" value={pitch.movementMatch} />
              <MiniScore label="Zone" value={pitch.zoneMatch} />
              <MiniScore label="Damage" value={pitch.expectedDamageMatch} />
            </div>
            <ul className="mt-4 grid gap-2 border-t border-white/10 pt-4">
              {pitch.reasons.map((reason) => (
                <li className="text-sm text-slate-500" key={reason}>
                  {reason}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </ResearchCard>
  );
}

function Context({ viewModel }: { viewModel: ZoneIntelligenceViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Context" title="Game Environment" />
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
      {viewModel.pitcherIntelligence ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-white">Pitcher Intelligence</p>
          <p className="mt-2 text-sm text-slate-500">
            Recent form {viewModel.pitcherIntelligence.recentForm}/100 ·{" "}
            {viewModel.pitcherIntelligence.trendCount} trend signals · source{" "}
            {viewModel.pitcherIntelligence.source}
          </p>
        </div>
      ) : null}
    </ResearchCard>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold", scoreText(value))}>
        {value}/100
      </p>
    </div>
  );
}

function TableCell({
  children,
  primary = false,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 text-slate-300",
        primary && "font-semibold text-white",
      )}
    >
      {children}
    </td>
  );
}

function metricTone(value: number) {
  if (value >= 65) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function scoreTone(value: number) {
  if (value >= 70) return "green";
  if (value >= 58) return "blue";
  if (value <= 42) return "red";
  return "neutral";
}

function scoreText(value: number) {
  if (value >= 70) return "text-emerald-200";
  if (value <= 42) return "text-rose-200";
  return "text-blue-100";
}

function getCellShadow(cell: ZoneCellViewModel, variant: string) {
  const alpha = Math.min(0.28, Math.max(0.04, cell.intensity / 360));

  if (variant === "overlay") {
    if (cell.classification === "advantage") {
      return `inset 0 0 0 999px rgba(16, 185, 129, ${alpha})`;
    }

    if (cell.classification === "risk") {
      return `inset 0 0 0 999px rgba(244, 63, 94, ${alpha})`;
    }
  }

  if (variant === "damage") {
    return `inset 0 0 0 999px rgba(251, 191, 36, ${alpha})`;
  }

  return `inset 0 0 0 999px rgba(96, 165, 250, ${alpha})`;
}
