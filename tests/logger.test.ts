import assert from "node:assert/strict";
import test from "node:test";

import { errorFields, logger } from "../src/lib/logger.ts";

function captureConsole(method: "error" | "log" | "warn", fn: () => void): string {
  const original = console[method];
  let captured = "";

  console[method] = ((...args: unknown[]) => {
    captured = args.join(" ");
  }) as typeof console[typeof method];

  try {
    fn();
  } finally {
    console[method] = original;
  }

  return captured;
}

test("logger.error writes to console.error with domain and message", () => {
  const output = captureConsole("error", () => {
    logger.error("test-domain", "something failed");
  });

  assert.match(output, /test-domain/);
  assert.match(output, /something failed/);
});

test("logger.warn writes to console.warn", () => {
  const output = captureConsole("warn", () => {
    logger.warn("test-domain", "a warning");
  });

  assert.match(output, /a warning/);
});

test("logger.info writes to console.log", () => {
  const output = captureConsole("log", () => {
    logger.info("test-domain", "informational");
  });

  assert.match(output, /informational/);
});

test("production mode emits parseable JSON with all fields", () => {
  const env = process.env as Record<string, string | undefined>;
  const original = env.NODE_ENV;
  env.NODE_ENV = "production";

  try {
    const output = captureConsole("error", () => {
      logger.error("test-domain", "boom", { gameId: "game-1" });
    });

    const parsed = JSON.parse(output);

    assert.equal(parsed.domain, "test-domain");
    assert.equal(parsed.level, "error");
    assert.equal(parsed.message, "boom");
    assert.equal(parsed.gameId, "game-1");
    assert.ok(parsed.timestamp);
  } finally {
    env.NODE_ENV = original;
  }
});

test("errorFields extracts a message from an Error instance", () => {
  assert.deepEqual(errorFields(new Error("bad thing")), { error: "bad thing" });
});

test("errorFields stringifies non-Error values", () => {
  assert.deepEqual(errorFields("plain string"), { error: "plain string" });
});
