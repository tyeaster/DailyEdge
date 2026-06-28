import {
  Pill,
  ResearchCard,
  ResearchMetric,
  ResearchSectionHeader,
} from "@/src/components/research";

import { getComingSoonPage } from "./service";

export function ComingSoonPage({
  pageKey,
}: {
  pageKey: Parameters<typeof getComingSoonPage>[0];
}) {
  const page = getComingSoonPage(pageKey);

  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              {page.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {page.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              {page.summary}
            </p>
          </div>
          <Pill tone="neutral">Coming Soon</Pill>
        </header>

        <section className="mt-6">
          <ResearchCard className="overflow-hidden p-0">
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
              <div className="relative p-5 sm:p-6">
                <ResearchSectionHeader
                  eyebrow="Workflow"
                  title="Planned Research Surface"
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {page.cards.map((card) => (
                    <ResearchMetric
                      key={card.label}
                      label={card.label}
                      meta={card.description}
                      value={card.value}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ResearchCard>
        </section>
      </div>
    </main>
  );
}
