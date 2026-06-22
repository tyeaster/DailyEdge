import {
  BetCard,
  DashboardCard,
  GameCard,
  InjuryCard,
  PropCard,
  SectionHeader,
  Sidebar,
  StatCard,
  TopNav,
  WeatherCard,
} from "@/src/components/dashboard";

import {
  dashboardNavItems,
  games,
  homeRunPicks,
  injuries,
  kpiMetrics,
  oddsRows,
  playerProps,
  pitcherProps,
  teamTrends,
  topBets,
  weatherReports,
} from "./mlb-dashboard-data";

const currentDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
}).format(new Date());

export function HomePage() {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <Sidebar items={dashboardNavItems} />

      <div className="min-h-screen md:pl-20 xl:pl-72">
        <TopNav currentDate={currentDate} />
        <MobileNavigation />

        <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
          <section
            id="dashboard"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            {kpiMetrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section id="slate" className="mt-8 space-y-4">
            <SectionHeader eyebrow="Section 1" title="Today's Slate" />
            <div className="grid gap-4 xl:grid-cols-4">
              {games.map((game) => (
                <GameCard game={game} key={`${game.awayTeam}-${game.homeTeam}`} />
              ))}
            </div>
          </section>

          <section id="best-bets" className="mt-8 space-y-4">
            <SectionHeader eyebrow="Section 2" title="Top Bets" />
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
              {topBets.map((bet) => (
                <BetCard bet={bet} key={`${bet.player}-${bet.betType}`} />
              ))}
            </div>
          </section>

          <section id="player-props" className="mt-8 space-y-4">
            <SectionHeader eyebrow="Player Props" title="Hitter Prop Watchlist" />
            <div className="grid gap-4 lg:grid-cols-3">
              {playerProps.map((prop) => (
                <ModelPanel
                  key={`${prop.player}-${prop.propType}`}
                  label={prop.player}
                  rows={[
                    ["Prop Type", prop.propType],
                    ["Sportsbook Line", prop.line],
                    ["Projection", prop.projection],
                    ["Edge", prop.edge],
                    ["Confidence", prop.confidence],
                  ]}
                />
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <DashboardCard id="home-run-model" className="p-5">
              <SectionHeader eyebrow="Section 3" title="Home Run Model" />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {homeRunPicks.map((pick) => (
                  <ModelPanel
                    key={pick.player}
                    label={pick.player}
                    rows={[
                      ["HR Probability", pick.hrProbability],
                      ["Pitcher", pick.pitcher],
                      ["Ballpark", pick.ballpark],
                      ["Wind", pick.wind],
                      ["Value Rating", pick.valueRating],
                    ]}
                  />
                ))}
              </div>
            </DashboardCard>

            <DashboardCard id="pitcher-props" className="p-5">
              <SectionHeader eyebrow="Section 4" title="Pitcher Props" />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {pitcherProps.map((prop) => (
                  <PropCard key={prop.pitcher} prop={prop} />
                ))}
              </div>
            </DashboardCard>
          </section>

          <section className="mt-8 grid gap-6 2xl:grid-cols-[1fr_0.85fr]">
            <DashboardCard id="weather" className="p-5">
              <SectionHeader eyebrow="Section 5" title="Weather" />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {weatherReports.map((report) => (
                  <WeatherCard key={report.stadium} report={report} />
                ))}
              </div>
            </DashboardCard>

            <DashboardCard id="injuries" className="p-5">
              <SectionHeader eyebrow="Section 6" title="Injuries" />
              <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {injuries.map((injury) => (
                  <InjuryCard key={`${injury.team}-${injury.player}`} injury={injury} />
                ))}
              </div>
            </DashboardCard>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <DashboardCard id="team-trends" className="p-5">
              <SectionHeader eyebrow="Market Context" title="Team Trends" />
              <div className="mt-5 space-y-3">
                {teamTrends.map((trend) => (
                  <DataRow
                    key={trend.label}
                    label={trend.label}
                    meta={trend.note}
                    value={trend.value}
                  />
                ))}
              </div>
            </DashboardCard>

            <DashboardCard id="odds" className="p-5">
              <SectionHeader eyebrow="Market Board" title="Odds Movement" />
              <div className="mt-5 space-y-3">
                {oddsRows.map((row) => (
                  <DataRow
                    key={row.market}
                    label={row.market}
                    meta={`Open ${row.open} - Move ${row.move}`}
                    value={row.bestPrice}
                  />
                ))}
              </div>
            </DashboardCard>
          </section>

          <section id="settings" className="mt-8">
            <DashboardCard className="p-5">
              <SectionHeader eyebrow="Workspace" title="Settings" />
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                Settings are mocked for now. Future controls will manage odds
                sources, unit preferences, table density, and alert thresholds.
              </p>
            </DashboardCard>
          </section>
        </div>
      </div>
    </main>
  );
}

function MobileNavigation() {
  return (
    <div className="border-b border-slate-800 bg-[#050915] px-4 py-3 md:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {dashboardNavItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex shrink-0 items-center gap-2 rounded-full border border-slate-800 bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ModelPanel({
  label,
  rows,
}: {
  label: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-white/[0.025] p-4">
      <h3 className="text-lg font-semibold text-white">{label}</h3>
      <div className="mt-4 space-y-2 text-sm">
        {rows.map(([rowLabel, value]) => (
          <div
            key={rowLabel}
            className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/60 px-3 py-2"
          >
            <span className="text-slate-500">{rowLabel}</span>
            <span className="text-right font-medium text-slate-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataRow({
  label,
  meta,
  value,
}: {
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-white/[0.025] p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{label}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{meta}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-blue-200">{value}</p>
    </div>
  );
}
