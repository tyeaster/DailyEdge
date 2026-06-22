import { Card, type CardProps } from "@/src/components/ui";
import { cn } from "@/src/lib/cn";

export function DashboardCard({ className, ...props }: CardProps) {
  return (
    <Card
      className={cn(
        "border-slate-800/90 bg-slate-950/65 shadow-lg shadow-black/20 transition hover:border-slate-700/90",
        className,
      )}
      {...props}
    />
  );
}
