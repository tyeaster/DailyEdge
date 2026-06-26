import type { ReactNode } from "react";

import { cn } from "@/src/lib/cn";

export function ResearchCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-lg shadow-black/20 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ResearchSectionHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
        {title}
      </h2>
    </div>
  );
}

export function ResearchMetric({
  indicatorTone = "neutral",
  label,
  meta,
  value,
}: {
  indicatorTone?: "good" | "neutral" | "watch";
  label: string;
  meta?: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            indicatorTone === "good" && "bg-emerald-300",
            indicatorTone === "watch" && "bg-amber-300",
            indicatorTone === "neutral" && "bg-slate-500",
          )}
        />
      </div>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "neutral" | "red" | "yellow";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "blue" && "border-blue-300/20 bg-blue-400/10 text-blue-100",
        tone === "green" &&
          "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        tone === "yellow" &&
          "border-amber-300/20 bg-amber-400/10 text-amber-100",
        tone === "red" && "border-rose-300/20 bg-rose-400/10 text-rose-100",
        tone === "neutral" && "border-white/10 bg-white/[0.04] text-slate-200",
      )}
    >
      {children}
    </span>
  );
}

