import type { HTMLAttributes } from "react";

import { cn } from "@/src/lib/cn";

type BadgeVariant = "brand" | "success" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  brand: "border-blue-300/20 bg-blue-400/10 text-blue-100",
  success: "bg-emerald-400/10 text-emerald-300",
  neutral: "border-white/10 bg-white/[0.04] text-slate-200",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "brand", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
