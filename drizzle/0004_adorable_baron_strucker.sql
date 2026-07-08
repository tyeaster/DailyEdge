CREATE TABLE "historical_market_results" (
	"actual_stat" double precision,
	"final_result" text,
	"market" text NOT NULL,
	"outcome" text NOT NULL,
	"result_id" text PRIMARY KEY NOT NULL,
	"settled_at" timestamp with time zone NOT NULL,
	"snapshot_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_market_snapshots" (
	"captured_at" timestamp with time zone NOT NULL,
	"closing_odds" double precision,
	"current_odds" double precision NOT NULL,
	"edge_percent" double precision,
	"expected_value_percent" double precision,
	"fair_odds" double precision,
	"game_id" text NOT NULL,
	"line" double precision,
	"market" text NOT NULL,
	"opening_odds" double precision NOT NULL,
	"player_id" text,
	"prediction_id" text,
	"provider" text NOT NULL,
	"selection" text,
	"snapshot_id" text PRIMARY KEY NOT NULL,
	"sportsbook" text NOT NULL,
	"team_id" text,
	"true_line_probability" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
