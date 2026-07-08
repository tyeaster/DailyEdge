CREATE TABLE "game_results" (
	"away_score" integer NOT NULL,
	"away_team_id" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"game_id" text PRIMARY KEY NOT NULL,
	"home_score" integer NOT NULL,
	"home_team_id" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"winning_team_id" text NOT NULL
);
