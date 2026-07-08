import { chromium, type Browser } from "playwright";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * E2E tests assume a server is already running at BASE_URL (npm run dev,
 * or npm run build && npm start in another step) - they don't manage
 * server lifecycle themselves, matching how most CI pipelines separate
 * "start the app" from "run e2e tests against it" into distinct steps.
 * This keeps the tests simple and avoids a self-managed dev-server
 * process being a second source of flakiness on top of the browser
 * automation itself.
 */
export async function isServerReachable(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });

    return response.status < 500;
  } catch {
    return false;
  }
}

/**
 * PLAYWRIGHT_CHROMIUM_PATH is only ever needed in sandboxed environments
 * where Playwright's default browser download location doesn't match
 * what's actually installed - leave it unset for a normal `npx playwright
 * install` setup (CI, local dev).
 */
export async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

  return chromium.launch(executablePath ? { executablePath } : undefined);
}
