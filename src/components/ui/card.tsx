import type { HTMLAttributes } from "react";

import { cn } from "@/src/lib/cn";

type CardVariant = "default" | "elevated" | "accent";

const variantClasses: Record<CardVariant, string> = {
  default: "border-white/10 bg-white/[0.035]",
  elevated: "border-white/10 bg-slate-900/80 shadow-2xl shadow-blue-950/30",
  accent: "border-blue-300/40 bg-blue-400/10 shadow-2xl shadow-blue-950/30",
};

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
  variant?: CardVariant;
};

export function Card({
  as: Component = "div",
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <Component
      className={cn("rounded-2xl border", variantClasses[variant], className)}
      {...props}
    />
  );
}
