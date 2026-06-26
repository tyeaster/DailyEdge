import { cn } from "@/src/lib/cn";

export function FactorRating({
  explanation,
  label,
  score,
  stars,
  weight,
}: {
  explanation: string;
  label: string;
  score: number;
  stars: number;
  weight: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500">Weight {weight}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-blue-100">{score}/100</p>
          <div aria-label={`${stars} out of 5 stars`} className="mt-1">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                className={cn(
                  "text-sm",
                  index < stars ? "text-amber-200" : "text-slate-700",
                )}
                key={index}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{explanation}</p>
    </div>
  );
}

