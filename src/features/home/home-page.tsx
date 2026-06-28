import {
  BetCard,
  DashboardCard,
  GameCard,
  InjuryCard,
  PropCard,
  SectionHeader,
  StatCard,
  WeatherCard,
} from "@/src/components/dashboard";

import {
  getDailySlate,
  type DailySlateViewModel,
} from "@/src/services";

export async function HomePage() {
  const slate = await getDailySlate();

  return <DailySlatePage slate={slate} />;
}

function DailySlatePage({ slate }: { slate: DailySlateViewModel }) {
  return (
    <main className="min-h-screen bg-[#030812] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
          <section id="daily-slate" className="edge-panel">
            <DashboardCard className="overflow-hidden p-0">
              <div className="relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]" />
                <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_26rem] xl:p-8">
                  <div className="max-w-4xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/80">
                      Daily Slate Dashboard
                    </p>
                    {slate.dataSource === "mock" ? (
                      <div className="mt-4 inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                        {slate.slateMeta.dataSourceMessage ?? "Using Mock Data"}
                      </div>
                    ) : null}
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      Today&apos;s MLB Slate
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                      A focused command center for today&apos;s games, top model edges,
                      weather shifts, player props, and injury impact.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <HeroPill
                        label="Current date"
                        value={slate.slateMeta.currentDate}
                      />
                      <HeroPill
                        label="Games today"
                        value={String(slate.slateMeta.gamesToday)}
                      />
                      <HeroPill
                        label="First pitch"
                        value={slate.slateMeta.firstPitchCountdown}
                      />
                      <HeroPill
                        label="Last updated"
                        value={slate.slateMeta.lastUpdated}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Slate confidence</p>
                        <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                          {slate.slateMeta.averageConfidence}
                        </p>
                      </div>
                      <button
                        className="rounded-xl border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15"
                        type="button"
                      >
                        Quick Refresh
                      </button>
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-slate-900">
                      <div className="h-2 w-[74%] rounded-full bg-blue-300" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      {slate.error
                        ? `Live MLB schedule unavailable: ${slate.error}`
                        : "Live schedule refreshes automatically every 5 minutes."}
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {slate.kpiMetrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section id="games" className="mt-8 space-y-4">
            <SectionHeader
              eyebrow="Today's Games"
              title={`${slate.slateMeta.gamesToday} games on the board`}
            />
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {slate.games.map((game) => (
                <GameCard
                  awayPitcher={game.awayPitcher}
                  awayTeam={game.awayTeam}
                  game={game.game}
                  homePitcher={game.homePitcher}
                  homeTeam={game.homeTeam}
                  key={game.game.id}
                  weather={game.weather}
                />
              ))}
            </div>
          </section>

          <section id="best-bets" className="mt-8 space-y-4">
            <SectionHeader eyebrow="Best Bets" title="Top 10 model edges" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {slate.bets.map((bet) => (
                <BetCard
                  bet={bet.bet}
                  key={bet.bet.id}
                  player={bet.player}
                  team={bet.team}
                />
              ))}
            </div>
          </section>

          <section id="player-props" className="mt-8 space-y-4">
            <SectionHeader eyebrow="Player Props" title="Highest-edge prop board" />
            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
              {slate.propCategories.map((category) => (
                <div key={category.label} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">{category.label}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {category.props.length} signals
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {category.props.map((prop) => (
                      <PropCard
                        key={prop.prop.id}
                        player={prop.player}
                        prop={prop.prop}
                        team={prop.team}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 2xl:grid-cols-[1fr_0.72fr]">
            <section id="weather" className="space-y-4">
              <SectionHeader eyebrow="Weather Center" title="Conditions that matter" />
              <div className="grid gap-4 lg:grid-cols-2">
                {slate.weatherReports.map((weather) => (
                  <WeatherCard
                    awayTeam={weather.awayTeam}
                    game={weather.game}
                    homeTeam={weather.homeTeam}
                    key={weather.report.id}
                    report={weather.report}
                  />
                ))}
              </div>
            </section>

            <DashboardCard id="injuries" className="p-5">
              <SectionHeader eyebrow="Injury Tracker" title="Lineup impact watch" />
              <div className="mt-5 max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {slate.injuries.map((injury) => (
                  <InjuryCard
                    injury={injury.injury}
                    key={injury.injury.id}
                    player={injury.player}
                    team={injury.team}
                  />
                ))}
              </div>
            </DashboardCard>
          </section>
      </div>
    </main>
  );
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
