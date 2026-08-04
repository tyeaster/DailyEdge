import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildOddsPipeEndpoint,
  extractRateLimit,
} from "../src/providers/odds/OddsPipeProvider.ts";
import { normalizeOddsPipeResponse } from "../src/providers/odds/normalize-oddspipe.ts";
import type { OddsProviderRequest } from "../src/providers/odds/OddsProvider.ts";

const DEFAULT_REPLAY_DIR = "replay/odds";

async function main() {
  await loadLocalEnv();

  const apiKey = process.env.ODDSPIPE_API_KEY;

  if (!apiKey) {
    fail("ODDSPIPE_API_KEY is not set. Set it in .env.local or the shell.");
  }

  const request: OddsProviderRequest = {
    date: process.env.ODDSPIPE_VERIFY_DATE ?? today(),
    markets: ["moneyline", "spread", "total", "team-total", "player-prop"],
    sport: "mlb",
  };
  const endpoint = process.env.ODDSPIPE_API_URL
    ? process.env.ODDSPIPE_API_URL
    : buildOddsPipeEndpoint(
        process.env.ODDSPIPE_BASE_URL ?? "https://api.oddspipe.com",
      );
  const url = buildUrl(endpoint, request);
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const elapsedMs = Date.now() - startedAt;
  const rateLimit = extractRateLimit(response.headers);

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    fail(
      `OddsPipe verification failed: status=${response.status}; retryAfter=${
        rateLimit.retryAfter ?? "not-exposed"
      }; body=${body.slice(0, 240)}`,
    );
  }

  const raw = await response.json();
  const records = normalizeOddsPipeResponse(raw);

  if (records.length === 0) {
    fail("OddsPipe returned a successful response, but no supported odds records normalized.");
  }

  if (process.env.ODDS_RECORD === "true") {
    await writeReplay({ raw, rateLimit, records, request });
  }

  console.log(
    JSON.stringify(
      {
        authentication: "ok",
        endpoint: redactUrl(url),
        fetchedRecords: records.length,
        markets: [...new Set(records.map((record) => record.market))].sort(),
        provider: "oddspipe",
        rateLimit: {
          limit: rateLimit.limit ?? "not-exposed",
          remaining: rateLimit.remaining ?? "not-exposed",
          reset: rateLimit.reset ?? "not-exposed",
          retryAfter: rateLimit.retryAfter ?? "not-exposed",
        },
        responseTimeMs: elapsedMs,
        sample: records.slice(0, 3).map((record) => ({
          market: record.market,
          propCategory: record.propCategory,
          selection: record.selection,
          sportsbook: record.sportsbook,
        })),
        status: "ok",
      },
      null,
      2,
    ),
  );
}

async function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    await loadEnvFile(path.resolve(process.cwd(), file));
  }
}

async function loadEnvFile(filePath: string) {
  const contents = await readFile(filePath, "utf8").catch(() => "");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

function buildUrl(endpoint: string, request: OddsProviderRequest) {
  const url = new URL(endpoint);

  url.searchParams.set("sport", request.sport);

  if (request.date) {
    url.searchParams.set("date", request.date);
  }

  if (request.markets?.length) {
    url.searchParams.set("markets", request.markets.join(","));
  }

  return url;
}

async function writeReplay({
  raw,
  rateLimit,
  records,
  request,
}: {
  raw: unknown;
  rateLimit: ReturnType<typeof extractRateLimit>;
  records: ReturnType<typeof normalizeOddsPipeResponse>;
  request: OddsProviderRequest;
}) {
  const replayDir = path.resolve(
    process.cwd(),
    process.env.ODDS_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
  const fetchedAt = new Date().toISOString();
  const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-mlb-live-verification.json`;

  await mkdir(replayDir, { recursive: true });
  await writeFile(
    path.join(replayDir, fileName),
    JSON.stringify(
      {
        fetchedAt,
        provider: "oddspipe",
        rateLimit,
        raw,
        records,
        request,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function redactUrl(url: URL) {
  const clone = new URL(url);

  clone.searchParams.sort();

  return clone.toString();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

await main();
