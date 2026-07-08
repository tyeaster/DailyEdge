import { ResearchSectionHeader } from "@/src/components/research";

import { BallparkDirectory } from "./ballpark-directory";
import { getBallparkDirectory } from "./service";

export async function BallparkResearchPage() {
  const ballparks = await getBallparkDirectory();

  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
            Research
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ballpark Research
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            All 30 MLB ballparks with park factors and hitter/pitcher/power ratings. Search by
            park, team, or city.
          </p>
        </header>

        <section className="mt-6">
          <ResearchSectionHeader eyebrow="Directory" title="All Ballparks" />
          <div className="mt-5">
            <BallparkDirectory ballparks={ballparks} />
          </div>
        </section>
      </div>
    </main>
  );
}
