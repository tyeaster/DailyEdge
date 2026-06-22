import type { DashboardNavItem } from "@/src/types/mlb-dashboard";

import { cn } from "@/src/lib/cn";

export function Sidebar({ items }: { items: DashboardNavItem[] }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-slate-800 bg-[#050915]/95 px-3 py-4 backdrop-blur md:flex xl:w-72">
      <div className="flex w-full flex-col">
        <a href="#dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-sm font-black text-blue-100">
            DE
          </span>
          <span className="hidden text-lg font-semibold tracking-tight text-white xl:inline">
            DailyEdge
          </span>
        </a>

        <nav className="mt-8 space-y-1">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-white",
                item.active &&
                  "border border-blue-300/20 bg-blue-400/10 text-blue-100 shadow-lg shadow-blue-950/20",
              )}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-sm transition group-hover:bg-white/[0.08]">
                {item.icon}
              </span>
              <span className="hidden min-w-0 flex-1 xl:inline">{item.label}</span>
              {item.badge ? (
                <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300 xl:inline">
                  {item.badge}
                </span>
              ) : null}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
