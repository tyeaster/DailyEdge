CREATE TABLE "odds_snapshots" (
	"american_odds" double precision NOT NULL,
	"away_team" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_id" text,
	"home_team" text,
	"id" text PRIMARY KEY NOT NULL,
	"implied_probability" double precision NOT NULL,
	"line" double precision,
	"market" text NOT NULL,
	"provider" text NOT NULL,
	"record_id" text NOT NULL,
	"selection" text NOT NULL,
	"side" text,
	"sportsbook" text NOT NULL,
	"team_name" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_results" (
	"actual_hits" integer,
	"actual_home_runs" integer,
	"actual_strikeouts" integer,
	"closing_edge_percent" double precision,
	"game_id" text NOT NULL,
	"market" text NOT NULL,
	"moneyline_winner_team_id" text,
	"outcome" text NOT NULL,
	"prediction_id" text PRIMARY KEY NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"confidence" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edge_percent" double precision NOT NULL,
	"expected_value_percent" double precision NOT NULL,
	"fair_odds" double precision NOT NULL,
	"game_id" text NOT NULL,
	"market" text NOT NULL,
	"model_id" text NOT NULL,
	"model_probability" double precision NOT NULL,
	"odds" double precision NOT NULL,
	"player_id" text,
	"prediction_id" text PRIMARY KEY NOT NULL,
	"recommendation" text NOT NULL,
	"sportsbook" text,
	"team_id" text,
	"timestamp" timestamp with time zone NOT NULL
);
