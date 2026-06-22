import type { NavigationItem } from "@/src/types/navigation";

import { cn } from "@/src/lib/cn";

export type SidebarProps = {
  className?: string;
  items: NavigationItem[];
  title?: string;
};

export function Sidebar({ className, items, title = "DailyEdge" }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex min-h-screen w-64 flex-col border-r border-white/10 bg-slate-950/80 px-4 py-6 text-sm text-slate-300",
        className,
      )}
    >
      <div className="px-2 text-base font-semibold text-white">{title}</div>
      <nav className="mt-8 space-y-1">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="block rounded-lg px-3 py-2 transition hover:bg-white/[0.04] hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
