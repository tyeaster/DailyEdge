import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Durable prediction records. Mirrors RecordedPrediction
 * (src/services/calibration/types.ts) field-for-field so calibration and
 * backtesting can eventually read/write through this table without
 * reshaping data.
 */
export const predictions = pgTable("predictions", {
  confidence: doublePrecision("confidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  edgePercent: doublePrecision("edge_percent").notNull(),
  expectedValuePercent: doublePrecision("expected_value_percent").notNull(),
  fairOdds: doublePrecision("fair_odds").notNull(),
  gameId: text("game_id").notNull(),
  market: text("market").notNull(),
  modelId: text("model_id").notNull(),
  modelProbability: doublePrecision("model_probability").notNull(),
  odds: doublePrecision("odds").notNull(),
  playerId: text("player_id"),
  predictionId: text("prediction_id").primaryKey(),
  recommendation: text("recommendation").notNull(),
  sportsbook: text("sportsbook"),
  teamId: text("team_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

/**
 * Durable results for previously recorded predictions. Mirrors
 * PredictionResultRecord (src/services/calibration/types.ts).
 */
export const predictionResults = pgTable("prediction_results", {
  actualHits: integer("actual_hits"),
  actualHomeRuns: integer("actual_home_runs"),
  actualStrikeouts: integer("actual_strikeouts"),
  closingEdgePercent: doublePrecision("closing_edge_percent"),
  gameId: text("game_id").notNull(),
  market: text("market").notNull(),
  moneylineWinnerTeamId: text("moneyline_winner_team_id"),
  outcome: text("outcome").notNull(),
  predictionId: text("prediction_id").primaryKey(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

/**
 * Durable odds history. Mirrors NormalizedOddsRecord
 * (src/providers/odds/OddsProvider.ts) plus a capturedAt timestamp so the
 * same (eventId, market, sportsbook, selection) tuple can have many rows
 * over time — this is what a real odds-history recorder (checklist item
 * "Durable odds-history recorder") writes to, and what closing-line/steam
 * detection reads from.
 */
export const oddsSnapshots = pgTable("odds_snapshots", {
  americanOdds: doublePrecision("american_odds").notNull(),
  awayTeam: text("away_team"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  eventId: text("event_id"),
  homeTeam: text("home_team"),
  id: text("id").primaryKey(),
  impliedProbability: doublePrecision("implied_probability").notNull(),
  line: doublePrecision("line"),
  market: text("market").notNull(),
  provider: text("provider").notNull(),
  recordId: text("record_id").notNull(),
  selection: text("selection").notNull(),
  side: text("side"),
  sportsbook: text("sportsbook").notNull(),
  teamName: text("team_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
