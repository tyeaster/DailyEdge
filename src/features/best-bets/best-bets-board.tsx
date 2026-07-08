"use client";

import { useMemo, useState } from "react";

import { Pill, ResearchCard, ResearchMetric, ResearchSectionHeader } from "@/src/components/research";

import type { BestBetDisplayCandidate, BestBetsViewModel } from "./service";

type SortKey = "confidence" | "edge" | "expectedValue" | "trueLineScore";

const sortLabels: Record<SortKey, string> = {
  confidence: "Confidence",
  edge: "Edge",
  expectedValue: "Expected Value",
  trueLineScore: "TrueLine Score",
};

export function BestBetsBoard({ viewModel }: { viewModel: BestBetsViewModel }) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<"ALL" | BestBetDisplayCandidate["market"]>("ALL");
  const [riskTier, setRiskTier] = useState<"ALL" | BestBetDisplayCandidate["ranked"]["riskTier"]>("ALL");
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("trueLineScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<10 | 25 | 50>(10);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = viewModel.top50.filter((bet) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        bet.title.toLowerCase().includes(normalizedQuery) ||
        bet.team?.name.toLowerCase().includes(normalizedQuery) ||
        bet.opponent?.name.toLowerCase().includes(normalizedQuery) ||
        bet.player?.name.toLowerCase().includes(normalizedQuery);
      const matchesMarket = market === "ALL" || bet.market === market;
      const matchesRisk = riskTier === "ALL" || bet.ranked.riskTier === riskTier;
      const matchesConfidence = bet.ranked.candidate.confidence >= minConfidence;

      return matchesQuery && matchesMarket && matchesRisk && matchesConfidence;
    });

    const sorted = [...matches].sort((left, right) => {
      const leftValue = sortValue(left, sortKey);
      const rightValue = sortValue(right, sortKey);

      return sortDirection === "desc" ? rightValue - leftValue : leftValue - rightValue;
    });

    return sorted.slice(0, limit);
  }, [viewModel.top50, query, market, riskTier, minConfidence, sortKey, sortDirection, limit]);

  return (
    <div>
      <section className="mt-6">
        <ResearchSectionHeader eyebrow="Filters" title="Narrow the Board" />
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-300/40 focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search player, team, or bet title..."
            type="text"
            value={query}
          />
          <FilterSelect
            label="Market"
            onChange={(value) => setMarket(value as typeof market)}
            options={["ALL", ...viewModel.marketSummary.map((item) => item.market)]}
            renderLabel={(value) =>
              value === "ALL" ? "All" : viewModel.marketSummary.find((item) => item.market === value)?.label ?? value
            }
            value={market}
          />
          <FilterSelect
            label="Risk"
            onChange={(value) => setRiskTier(value as typeof riskTier)}
            options={["ALL", "Low", "Medium", "High"]}
            value={riskTier}
          />
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Min Confidence</span>
            <input
              className="w-16 bg-transparent text-white focus:outline-none"
              max={100}
              min={0}
              onChange={(event) => setMinConfidence(Number(event.target.value) || 0)}
              type="number"
              value={minConfidence}
            />
            <span className="text-slate-500">%</span>
          </label>
          <FilterSelect
            label="Sort By"
            onChange={(value) => setSortKey(value as SortKey)}
            options={Object.keys(sortLabels)}
            renderLabel={(value) => sortLabels[value as SortKey]}
            value={sortKey}
          />
          <button
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-400/10"
            onClick={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
            type="button"
          >
            {sortDirection === "desc" ? "High to Low" : "Low to High"}
          </button>
          <FilterSelect
            label="Show"
            onChange={(value) => setLimit(Number(value) as typeof limit)}
            options={["10", "25", "50"]}
            value={String(limit)}
          />
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
          {filtered.length} of {viewModel.top50.length} bets shown
        </p>
      </section>

      <section className="mt-6">
        <div className="grid gap-4 2xl:grid-cols-2">
          {filtered.map((bet) => (
            <BestBetCard bet={bet} compact={false} key={bet.id} />
          ))}
        </div>
        {filtered.length === 0 ? (
          <ResearchCard className="mt-4">
            <p className="text-sm text-slate-400">No bets match the current filters.</p>
          </ResearchCard>
        ) : null}
      </section>
    </div>
  );
}

function sortValue(bet: BestBetDisplayCandidate, key: SortKey) {
  if (key === "trueLineScore") return bet.ranked.trueLineScore;
  if (key === "edge") return bet.ranked.candidate.edgePercent;
  if (key === "confidence") return bet.ranked.candidate.confidence;
  return bet.ranked.candidate.expectedValuePercent;
}

function FilterSelect({
  label,
  onChange,
  options,
  renderLabel,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  renderLabel?: (value: string) => string;
  value: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        className="bg-transparent text-white focus:outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option className="bg-slate-900" key={option} value={option}>
            {renderLabel ? renderLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function BestBetCard({
  bet,
  compact,
}: {
  bet: BestBetDisplayCandidate;
  compact: boolean;
}) {
  return (
    <ResearchCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">#{bet.ranked.rank}</Pill>
            <Pill tone="neutral">{bet.marketLabel}</Pill>
            <Pill tone={riskTone(bet.ranked.riskTier)}>{bet.ranked.riskTier} Risk</Pill>
            {bet.correlation && (
              <Pill tone={correlationTone(bet.correlation.badge)}>{bet.correlation.badge}</Pill>
            )}
            {bet.correlation && (
              <Pill tone={correlationTone(bet.correlation.exposureBadge)}>
                {bet.correlation.exposureBadge}
              </Pill>
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">{bet.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {bet.team?.name ?? "Team"} {bet.opponent ? `vs ${bet.opponent.name}` : ""} ·{" "}
            {bet.sportsbook ?? "Market"}
          </p>
        </div>
        <Pill tone={recommendationTone(bet.ranked.recommendationTier)}>
          {bet.ranked.recommendationTier}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResearchMetric
          indicatorTone={metricTone(bet.ranked.trueLineScore)}
          label="TrueLine Score"
          meta={bet.ranked.grade}
          value={`${bet.ranked.trueLineScore}/100`}
        />
        <ResearchMetric label="Sportsbook" meta={bet.sportsbook ?? "Market"} value={bet.display.sportsbookLine} />
        <ResearchMetric label="Fair Line" meta="TrueLine" value={bet.display.fairLine} />
        <ResearchMetric label="Probability" meta="Model" value={bet.display.probability} />
        <ResearchMetric
          indicatorTone={bet.ranked.candidate.edgePercent > 0 ? "good" : "neutral"}
          label="Edge"
          meta={bet.display.expectedValue}
          value={bet.display.edge}
        />
        <ResearchMetric
          indicatorTone={metricTone(bet.ranked.candidate.confidence)}
          label="Confidence"
          meta={bet.ranked.confidenceTier}
          value={bet.display.confidence}
        />
        <ResearchMetric label="ROI" meta="Historical" value={bet.calibration.roiDisplay} />
        <ResearchMetric label="CLV" meta="Odds Intel" value={bet.calibration.clvDisplay} />
        <ResearchMetric
          label="Portfolio Risk"
          meta="Correlation"
          value={bet.correlation?.portfolioRisk ?? "-"}
        />
      </div>

      {!compact && (
        <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" open>
          <summary className="cursor-pointer list-none text-sm font-semibold text-white">
            Why It Ranked
          </summary>
          <ul className="mt-3 grid gap-2">
            {bet.reasons.map((reason, index) => (
              <li className="text-sm text-slate-500" key={`${reason}-${index}`}>
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Scoring Breakdown
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {bet.ranked.candidate.supportingFactors.map((factor, index) => (
            <div className="rounded-lg bg-slate-950/70 p-3" key={`${factor.key}-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-200">{factor.label}</p>
                <span className="text-sm font-semibold text-blue-100">
                  {Math.round(factor.score)}/100
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{factor.summary}</p>
            </div>
          ))}
          <div className="rounded-lg bg-slate-950/70 p-3">
            <p className="font-semibold text-slate-200">Calibration</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Win rate {bet.calibration.winRateDisplay}; confidence calibration{" "}
              {bet.calibration.confidenceCalibrationDisplay}; historical similar bets{" "}
              {bet.calibration.historicalSimilarBets}.
            </p>
          </div>
          {bet.correlation && (
            <div className="rounded-lg bg-slate-950/70 p-3">
              <p className="font-semibold text-slate-200">Related Bets</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {bet.correlation.relatedBets.length > 0
                  ? bet.correlation.relatedBets.join(", ")
                  : "No major related bets detected."}
              </p>
            </div>
          )}
        </div>
      </details>
    </ResearchCard>
  );
}

function metricTone(value: number) {
  if (value >= 70) return "good";
  if (value <= 45) return "watch";
  return "neutral";
}

function recommendationTone(recommendation: BestBetDisplayCandidate["ranked"]["recommendationTier"]) {
  if (recommendation === "Elite" || recommendation === "Strong Play") return "green";
  if (recommendation === "Play" || recommendation === "Lean") return "blue";
  return "neutral";
}

function riskTone(risk: BestBetDisplayCandidate["ranked"]["riskTier"]) {
  if (risk === "Low") return "green";
  if (risk === "Medium") return "blue";
  return "neutral";
}

function correlationTone(label: string) {
  if (label.startsWith("High")) return "neutral";
  if (label.startsWith("Moderate")) return "blue";
  return "green";
}
