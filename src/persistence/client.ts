import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.ts";

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Lazily creates a singleton Postgres connection driven by DATABASE_URL.
 * Any standard Postgres host works here (Neon, Supabase, Vercel Postgres,
 * self-hosted) — nothing in this layer is vendor-specific.
 */
export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to use the persistence layer");
    }

    sql = postgres(connectionString);
    db = drizzle(sql, { schema });
  }

  return db;
}

export async function closeDb() {
  await sql?.end();
  sql = undefined;
  db = undefined;
}
