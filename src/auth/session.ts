import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "trueline_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Creates a signed `expiresAt.signature` token. Not encryption — the
 * payload (just an expiry timestamp) is plainly readable, but the HMAC
 * signature means a client can't forge or extend one without knowing
 * AUTH_SECRET.
 */
export function createAdminSessionToken(): string {
  const secret = requireAuthSecret();
  const payload = String(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);

  return `${payload}.${sign(payload, secret)}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const secret = getAuthSecret();

  if (!secret) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  const expiresAt = Number(payload);

  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET;
}

function requireAuthSecret(): string {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET is required to create an admin session");
  }

  return secret;
}
