import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  createAdminSessionToken,
  isValidAdminSessionToken,
} from "../src/auth/session.ts";

test("rejects a token when AUTH_SECRET is unset", () => {
  const original = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;

  try {
    assert.equal(isValidAdminSessionToken("anything"), false);
  } finally {
    if (original !== undefined) {
      process.env.AUTH_SECRET = original;
    }
  }
});

test("creates a token that validates against the same secret", () => {
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-secret";

  try {
    const token = createAdminSessionToken();

    assert.equal(isValidAdminSessionToken(token), true);
  } finally {
    if (original === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = original;
    }
  }
});

test("rejects a token signed with a different secret", () => {
  process.env.AUTH_SECRET = "secret-a";
  const token = createAdminSessionToken();

  process.env.AUTH_SECRET = "secret-b";

  try {
    assert.equal(isValidAdminSessionToken(token), false);
  } finally {
    delete process.env.AUTH_SECRET;
  }
});

test("rejects an expired token", () => {
  process.env.AUTH_SECRET = "test-secret";

  try {
    const expiredPayload = String(Date.now() - 1000);
    const signature = createHmac("sha256", "test-secret")
      .update(expiredPayload)
      .digest("base64url");

    assert.equal(
      isValidAdminSessionToken(`${expiredPayload}.${signature}`),
      false,
    );
  } finally {
    delete process.env.AUTH_SECRET;
  }
});

test("rejects malformed tokens", () => {
  process.env.AUTH_SECRET = "test-secret";

  try {
    assert.equal(isValidAdminSessionToken(""), false);
    assert.equal(isValidAdminSessionToken("no-dot-here"), false);
    assert.equal(isValidAdminSessionToken(undefined), false);
  } finally {
    delete process.env.AUTH_SECRET;
  }
});
