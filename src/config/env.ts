import { getBallparkMode } from "../services/BallparkService.ts";
import { getBacktestMode } from "../services/backtesting/providers.ts";
import { getBullpenMode } from "../services/BullpenService.ts";
import { getCalibrationMode } from "../services/calibration/providers.ts";
import { getLineupMode } from "../services/LineupService.ts";
import { getMatchupMode } from "../services/matchup/MatchupService.ts";
import { getOddsIntelligenceMode } from "../services/odds-intelligence/providers.ts";
import { getOddsMode } from "../services/OddsService.ts";
import { getPitcherMode } from "../services/PitcherService.ts";
import { getPlayerIntelligenceMode } from "../services/player-intelligence/PlayerIntelligenceService.ts";
import { getRankingMode } from "../services/ranking/providers.ts";
import { getRecentFormMode } from "../services/RecentFormService.ts";
import { getTeamStrengthMode } from "../services/TeamStrengthService.ts";
import { getWeatherMode } from "../services/WeatherService.ts";

export type ProviderMode = "live" | "replay" | "mock";

export type EnvIssueLevel = "error" | "warning";

export interface EnvIssue {
  domain: string;
  level: EnvIssueLevel;
  message: string;
}

interface DomainCheck {
  /** Env vars required when this domain resolves to "live" mode. */
  requiredWhenLive?: string[];
  getMode: () => ProviderMode;
  name: string;
}

/**
 * One entry per provider domain, reusing each service's own mode-resolution
 * function (including its fallback cascade to sibling domains) rather than
 * re-implementing that logic here. Only OddsPipe currently hard-requires a
 * secret to run live (verified: it's the only live provider that throws on
 * a missing key — Open-Meteo, MLB Stats API, and Statcast CSV are keyless
 * public endpoints).
 */
const domainChecks: DomainCheck[] = [
  { getMode: getOddsMode, name: "odds", requiredWhenLive: ["ODDSPIPE_API_KEY"] },
  { getMode: getWeatherMode, name: "weather" },
  { getMode: getBallparkMode, name: "ballparks" },
  { getMode: getBullpenMode, name: "bullpen" },
  { getMode: getLineupMode, name: "lineups" },
  { getMode: getPitcherMode, name: "pitchers" },
  { getMode: getTeamStrengthMode, name: "team-strength" },
  { getMode: getRecentFormMode, name: "recent-form" },
  { getMode: getPlayerIntelligenceMode, name: "player-intelligence" },
  { getMode: getMatchupMode, name: "matchup" },
  { getMode: getRankingMode, name: "ranking" },
  { getMode: getCalibrationMode, name: "calibration" },
  { getMode: getBacktestMode, name: "backtesting" },
  { getMode: getOddsIntelligenceMode, name: "odds-intelligence" },
];

/**
 * Resolves every provider domain's effective mode (respecting each
 * domain's own fallback cascade) and reports missing secrets for domains
 * running live, plus a few other startup sanity checks. Never throws —
 * callers decide how to act on the returned issues.
 */
export function validateEnvironment(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  for (const domain of domainChecks) {
    let mode: ProviderMode;

    try {
      mode = domain.getMode();
    } catch (error) {
      issues.push({
        domain: domain.name,
        level: "error",
        message: `Failed to resolve provider mode: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      continue;
    }

    if (mode !== "live" || !domain.requiredWhenLive) {
      continue;
    }

    for (const key of domain.requiredWhenLive) {
      if (!process.env[key]) {
        issues.push({
          domain: domain.name,
          level: "error",
          message: `${key} is not set, but the ${domain.name} domain is running in live mode and will fail on first request`,
        });
      }
    }
  }

  if (!process.env.DATABASE_URL) {
    issues.push({
      domain: "persistence",
      level: "warning",
      message:
        "DATABASE_URL is not set. src/persistence/* is not wired into any engine yet, so nothing needs it today, but it will throw immediately if used before this is set.",
    });
  }

  return issues;
}

/**
 * Logs every issue found by validateEnvironment(). Only throws in
 * production — local dev and CI builds should still work out of the box
 * against mock data even with no secrets configured, matching the rest of
 * the app's graceful-degradation behavior. Production boots fail fast
 * instead of serving a live-mode page that 500s on first request.
 */
export function assertValidEnvironment(): void {
  const issues = validateEnvironment();
  const errors = issues.filter((issue) => issue.level === "error");

  for (const issue of issues) {
    const prefix = `[env:${issue.level}]`;
    const line = `${prefix} ${issue.domain}: ${issue.message}`;

    if (issue.level === "error") {
      console.error(line);
    } else {
      console.warn(line);
    }
  }

  if (errors.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(
      `Environment validation failed with ${errors.length} error(s). See logs above.`,
    );
  }
}
