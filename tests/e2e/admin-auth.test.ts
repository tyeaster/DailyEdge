import assert from "node:assert/strict";
import test from "node:test";

import { BASE_URL, isServerReachable, launchBrowser } from "./helpers.ts";

const reachable = await isServerReachable();
const adminPassword = process.env.ADMIN_PASSWORD;
const skipReason = !reachable
  ? `no server reachable at ${BASE_URL}`
  : !adminPassword
    ? "ADMIN_PASSWORD not set (must match the running server's config)"
    : false;

test(
  "unauthenticated request to an admin route redirects to login",
  { skip: skipReason },
  async () => {
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();

      await page.goto(`${BASE_URL}/admin/backtesting`);

      assert.match(page.url(), /\/admin\/login\?from=%2Fadmin%2Fbacktesting/);
    } finally {
      await browser.close();
    }
  },
);

test(
  "full login -> access -> logout -> re-redirect cycle",
  { skip: skipReason },
  async () => {
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();

      await page.goto(`${BASE_URL}/admin/backtesting`, {
        waitUntil: "domcontentloaded",
      });

      // Wrong password: shows an error, stays on login, no cookie.
      await page.fill("#password", "definitely-wrong-password");
      await Promise.all([
        page.waitForURL((url) => url.searchParams.get("error") === "1"),
        page.click('button[type="submit"]'),
      ]);
      assert.equal(
        await page.locator("text=Incorrect password").count(),
        1,
      );

      // Correct password: session cookie set, lands on the originally
      // requested page.
      await page.fill("#password", adminPassword as string);
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/admin/backtesting"),
        page.click('button[type="submit"]'),
      ]);

      const cookies = await page.context().cookies();

      assert.ok(
        cookies.some(
          (cookie) => cookie.name === "trueline_admin_session" && cookie.httpOnly,
        ),
      );

      // Reload with the session: page loads, shows the logout control.
      await page.goto(`${BASE_URL}/admin/backtesting`);
      assert.equal(await page.locator("text=Log out").count(), 1);

      // Log out: cookie cleared, redirected to login.
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/admin/login"),
        page.click("text=Log out"),
      ]);

      const cookiesAfterLogout = await page.context().cookies();

      assert.ok(
        !cookiesAfterLogout.some((cookie) => cookie.name === "trueline_admin_session"),
      );

      // Subsequent request redirects to login again.
      await page.goto(`${BASE_URL}/admin/backtesting`);
      assert.match(page.url(), /\/admin\/login/);
    } finally {
      await browser.close();
    }
  },
);

test(
  "the other two admin routes also redirect when unauthenticated",
  { skip: skipReason },
  async () => {
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();

      await page.goto(`${BASE_URL}/admin/calibration`);
      assert.match(page.url(), /\/admin\/login/);

      await page.goto(`${BASE_URL}/admin/odds-intelligence`);
      assert.match(page.url(), /\/admin\/login/);
    } finally {
      await browser.close();
    }
  },
);
