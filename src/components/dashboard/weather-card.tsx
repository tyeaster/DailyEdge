import type { Game, Team, Weather } from "@/src/models/mlb";

import { DashboardCard } from "./dashboard-card";

export function WeatherCard({
  awayTeam,
  homeTeam,
  report,
}: {
  awayTeam: Team;
  game: Game;
  homeTeam: Team;
  report: Weather;
}) {
  const delayRisk =
    report.delayProbability >= 60
      ? "High"
      : report.delayProbability >= 30
        ? "Moderate"
        : "Low";

  return (
    <DashboardCard as="article" className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">{report.stadium}</h3>
          <p className="mt-1 truncate text-sm text-slate-400">
            {awayTeam.name} at {homeTeam.name}
          </p>
        </div>
        <p className="text-right text-lg font-semibold text-white">
          {report.weatherApplicable ? `${report.temperatureF}F` : "Indoor"}
        </p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <WeatherLine
          label="Wind"
          value={
            report.weatherApplicable
              ? `${report.windMph} MPH ${report.relativeWindDirection}`
              : "Not Applicable"
          }
        />
        <WeatherLine label="Roof" value={formatLabel(report.roofStatus)} />
        <WeatherLine
          label="Humidity"
          value={
            report.weatherApplicable && report.humidityPercent !== null
              ? `${report.humidityPercent}%`
              : "Not Applicable"
          }
        />
        <WeatherLine
          label="Delay risk"
          value={
            report.weatherApplicable
              ? `${delayRisk} (${report.delayProbability}%)`
              : "None"
          }
        />
        <WeatherLine
          label="Run environment"
          value={formatEnvironment(report.runEnvironment)}
        />
        <WeatherLine
          label="HR environment"
          value={formatEnvironment(report.homeRunEnvironment)}
        />
      </div>
    </DashboardCard>
  );
}

function formatEnvironment(value: number) {
  const difference = value - 50;

  return `${difference >= 0 ? "+" : ""}${Math.round(difference)}%`;
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function WeatherLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}
