import { ResearchSectionHeader } from "@/src/components/research";

import { TeamDirectory } from "./team-directory";
import { getTeamDirectory } from "./service";

export async function TeamResearchPage() {
  const teams = await getTeamDirectory();

  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
            Research
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Team Research
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            All 30 MLB franchises with current offense, pitching, and bullpen ratings. Search
            by name, city, or abbreviation, or filter by league and division.
          </p>
        </header>

        <section className="mt-6">
          <ResearchSectionHeader eyebrow="Directory" title="All Teams" />
          <div className="mt-5">
            <TeamDirectory teams={teams} />
          </div>
        </section>
      </div>
    </main>
  );
}
