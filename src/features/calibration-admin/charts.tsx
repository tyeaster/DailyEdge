import { cn } from "@/src/lib/cn";

export interface ChartPoint {
  label: string;
  value: number;
}

export function BarChart({
  points,
  suffix = "%",
}: {
  points: ChartPoint[];
  suffix?: string;
}) {
  const max = Math.max(...points.map((point) => Math.abs(point.value)), 1);

  return (
    <div className="grid gap-3">
      {points.map((point) => (
        <div key={point.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">{point.label}</span>
            <span className="font-medium text-slate-200">
              {formatNumber(point.value)}
              {suffix}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-900">
            <div
              className={cn(
                "h-2 rounded-full",
                point.value >= 0 ? "bg-blue-300" : "bg-rose-300",
              )}
              style={{ width: `${Math.min(100, (Math.abs(point.value) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalibrationCurveChart({
  points,
}: {
  points: Array<{
    actualWinPercent: number;
    label: string;
    predictedWinPercent: number;
  }>;
}) {
  return (
    <div className="grid gap-3">
      {points.map((point) => (
        <div key={point.label} className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">{point.label}</span>
            <span className="text-slate-500">
              Actual {formatNumber(point.actualWinPercent)}%
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            <ProgressBar label="Predicted" value={point.predictedWinPercent} />
            <ProgressBar label="Actual" value={point.actualWinPercent} tone="green" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DistributionChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="flex h-48 items-end gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      {points.map((point) => (
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.label}>
          <div
            className="w-full rounded-t bg-blue-300/80"
            style={{ height: `${Math.max(5, (point.value / max) * 100)}%` }}
          />
          <span className="max-w-full truncate text-[10px] text-slate-600">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({
  label,
  tone = "blue",
  value,
}: {
  label: string;
  tone?: "blue" | "green";
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-600">
        <span>{label}</span>
        <span>{formatNumber(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-900">
        <div
          className={cn(
            "h-1.5 rounded-full",
            tone === "blue" ? "bg-blue-300" : "bg-emerald-300",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return value.toFixed(1);
}
