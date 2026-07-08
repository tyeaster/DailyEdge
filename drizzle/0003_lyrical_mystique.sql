CREATE TABLE "cache_entries" (
	"expires_at" timestamp with time zone NOT NULL,
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
