import { Input } from "@/src/components/ui";

export function TopNav({ currentDate }: { currentDate: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#07101c]/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-sm font-black text-blue-100 md:hidden">
            DE
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/80">
              DailyEdge
            </p>
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
              MLB Command Center
            </h1>
          </div>
        </div>

        <div className="hidden min-w-48 flex-1 justify-center lg:flex">
          <div className="w-full max-w-xl">
            <Input placeholder="Search teams, players, props, markets..." />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">{currentDate}</span>
          <button
            className="rounded-xl border border-slate-800 bg-white/[0.035] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-300/30 hover:text-white"
            type="button"
          >
            Refresh
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-gradient-to-br from-blue-300/25 to-slate-800 text-sm font-semibold text-white">
            DE
          </div>
        </div>
      </div>
    </header>
  );
}
