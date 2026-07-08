import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import { getPitchIntelligence, type PitchIntelligenceViewModel } from "./service";

export async function PitchIntelligencePage({
  batterId,
  pitcherId,
}: {
  batterId?: string;
  pitcherId?: string;
}) {
  const viewModel = await getPitchIntelligence({ batterId, pitcherId });

  return <PitchIntelligenceLayout viewModel={viewModel} />;
}

function PitchIntelligenceLayout({
  viewModel,
}: {
  viewModel: PitchIntelligenceViewModel;
}) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Pitch Intelligence
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
            <Pill tone={scoreTone(viewModel.matchup.pitchMatch)}>
              Pitch Match {viewModel.matchup.pitchMatch}/100
            </Pill>
            <Pill tone={scoreTone(viewModel.matchup.overallMatch)}>
              Overall {viewModel.matchup.overallMatch}/100
            </Pill>
            <Pill tone="blue">Confidence {viewModel.matchup.confidence}%</Pill>
          </div>
        </header>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <HeroSummary viewModel={viewModel} />
          <Explainability viewModel={viewModel} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <PitchMix viewModel={viewModel} />
          <ArsenalTable viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <DisciplineTable viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <PitchScoutingReport viewModel={viewModel} />
        </section>

        <section className="mt-6">
          <ContextScores viewModel={viewModel} />
        </section>
      </div>
    </main>
  );
}

function HeroSummary({ viewModel }: { viewModel: PitchIntelligenceViewModel }) {
  return (
    <ResearchCard className="overflow-hidden p-0">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
        <div className="relative p-5 sm:p-6">
          <ResearchSectionHeader
            eyebrow="Pitch Intelligence Command Center"
            title="Pitch-Level Scouting"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.pitchMatch)}
              label="Pitch Match"
              meta="Arsenal-vs-hitter compatibility"
              value={`${viewModel.matchup.pitchMatch}/100`}
            />
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.overallMatch)}
              label="Overall Match"
              meta="Weighted matchup score"
              value={`${viewModel.matchup.overallMatch}/100`}
            />
            <ResearchMetric
              indicatorTone={metricTone(viewModel.matchup.confidence)}
              label="Confidence"
              meta="Data quality"
              value={`${viewModel.matchup.confidence}%`}
            />
            <ResearchMetric
              label="Primary Pitch"
              meta="Most-used offering"
              value={viewModel.primaryPitchType ?? "-"}
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
            <ResearchMetric
              label="Arsenal Size"
              meta="Distinct pitch types"
              value={String(viewModel.arsenalRows.length)}
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
  viewModel: PitchIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResearchSectionHeader eyebrow="Explainability" title="Model Readout" />
        <Pill tone="neutral">Every Score Explains Itself</Pill>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-300">{viewModel.explanation}</p>
      {viewModel.topAdvantages.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
            Top Advantages
          </p>
          <div className="mt-2 grid gap-2">
            {viewModel.topAdvantages.map((advantage) => (
              <div
                className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100"
                key={advantage}
              >
                {advantage}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {viewModel.topWeaknesses.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300/80">
            Top Weaknesses
          </p>
          <div className="mt-2 grid gap-2">
            {viewModel.topWeaknesses.map((weakness) => (
              <div
                className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100"
                key={weakness}
              >
                {weakness}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </ResearchCard>
  );
}

function PitchMix({ viewModel }: { viewModel: PitchIntelligenceViewModel }) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Pitch Usage" title="Arsenal Mix" />
      <div className="mt-5 grid gap-4">
        {viewModel.pitchMix.map((pitch) => (
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

function ArsenalTable({
  viewModel,
}: {
  viewModel: PitchIntelligenceViewModel;
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
                "Whiff",
                "Put Away",
                "Strike",
                "Zone",
                "GB",
                "Hard Hit",
                "Sample",
              ].map((header) => (
                <th className="border-b border-white/10 px-3 py-3" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewModel.arsenalRows.map((pitch) => (
              <tr className="border-b border-white/5" key={pitch.pitchName}>
                <TableCell primary>{pitch.pitchName}</TableCell>
                <TableCell>{pitch.usagePercent}</TableCell>
                <TableCell>{pitch.velocity}</TableCell>
                <TableCell>{pitch.spinRate}</TableCell>
                <TableCell>{pitch.verticalBreak}</TableCell>
                <TableCell>{pitch.horizontalBreak}</TableCell>
                <TableCell>{pitch.whiffPercent}</TableCell>
                <TableCell>{pitch.putAwayPercent}</TableCell>
                <TableCell>{pitch.strikePercent}</TableCell>
                <TableCell>{pitch.zonePercent}</TableCell>
                <TableCell>{pitch.groundBallPercent}</TableCell>
                <TableCell>{pitch.hardHitAllowed}</TableCell>
                <TableCell>{pitch.sampleSize}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResearchCard>
  );
}

function DisciplineTable({
  viewModel,
}: {
  viewModel: PitchIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader
        eyebrow="Batter Section"
        title={`Plate Discipline: ${viewModel.batter.fullName}`}
      />
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-600">
            <tr>
              {["Pitch", "Swing", "Contact", "Chase", "Take", "Whiff", "Strikeout"].map(
                (header) => (
                  <th className="border-b border-white/10 px-3 py-3" key={header}>
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {viewModel.disciplineRows.map((pitch) => (
              <tr className="border-b border-white/5" key={pitch.pitchName}>
                <TableCell primary>{pitch.pitchName}</TableCell>
                <TableCell>{pitch.swingPercent}</TableCell>
                <TableCell>{pitch.contactPercent}</TableCell>
                <TableCell>{pitch.chasePercent}</TableCell>
                <TableCell>{pitch.takePercent}</TableCell>
                <TableCell>{pitch.whiffPercent}</TableCell>
                <TableCell>{pitch.strikeoutPercent}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResearchCard>
  );
}

function PitchScoutingReport({
  viewModel,
}: {
  viewModel: PitchIntelligenceViewModel;
}) {
  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Pitch-Type Comparison" title="Scouting Report" />
      <div className="mt-5 grid gap-3">
        {viewModel.pitchScouting.map((pitch) => (
          <details
            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            key={pitch.pitchName}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{pitch.pitchName}</p>
                  <p className="mt-1 text-xs text-slate-500">Usage {pitch.usagePercent}</p>
                </div>
                <Pill tone={scoreTone(pitch.score)}>{pitch.score}/100</Pill>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniScore label="Contact" value={pitch.contactMatch} />
              <MiniScore label="Velocity" value={pitch.velocityMatch} />
              <MiniScore label="Movement" value={pitch.movementMatch} />
              <MiniScore label="Damage" value={pitch.expectedDamageMatch} />
            </div>
            {pitch.topAdvantages.length > 0 || pitch.topWeaknesses.length > 0 ? (
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                {pitch.topAdvantages.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                      Advantages
                    </p>
                    <ul className="mt-2 grid gap-1">
                      {pitch.topAdvantages.map((advantage) => (
                        <li className="text-sm text-emerald-100/90" key={advantage}>
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {pitch.topWeaknesses.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300/80">
                      Weaknesses
                    </p>
                    <ul className="mt-2 grid gap-1">
                      {pitch.topWeaknesses.map((weakness) => (
                        <li className="text-sm text-rose-100/90" key={weakness}>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
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

function ContextScores({
  viewModel,
}: {
  viewModel: PitchIntelligenceViewModel;
}) {
  if (viewModel.contextScores.length === 0 && !viewModel.pitcherIntelligence) {
    return null;
  }

  return (
    <ResearchCard>
      <ResearchSectionHeader eyebrow="Context" title="Situational Factors" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {viewModel.contextScores.map((context) => (
          <ResearchMetric
            key={context.label}
            label={context.label}
            meta={context.explanation}
            value={`${context.score}/100`}
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
      <p className={cn("mt-2 text-lg font-semibold", scoreText(value))}>{value}/100</p>
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
