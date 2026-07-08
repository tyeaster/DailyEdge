import assert from "node:assert/strict";
import test from "node:test";

import { BASE_URL, isServerReachable, launchBrowser } from "./helpers.ts";

const reachable = await isServerReachable();
const skipReason = !reachable && `no server reachable at ${BASE_URL}`;

// Not exhaustive - a representative sample across the app's main
// sections (dashboard, betting markets, research, matchups) rather than
// all 25+ routes, to keep this fast while still catching a broken build
// across the app's different route groups.
const routesToCheck = [
  "/best-bets",
  "/betting/moneyline",
  "/pitching/strikeouts",
  "/hitting/home-runs",
  "/matchups/zone-intelligence",
  "/matchups/pitch-intelligence",
  "/analysis/correlation",
  "/research/teams",
  "/research/ballparks",
  "/research/players",
];

for (const route of routesToCheck) {
  test(
    `${route} loads without a server error`,
    { skip: skipReason },
    async () => {
      const browser = await launchBrowser();

      try {
        const page = await browser.newPage();
        const response = await page.goto(`${BASE_URL}${route}`);

        assert.ok(
          response && response.status() < 500,
          `expected < 500, got ${response?.status()}`,
        );

        const bodyText = await page.locator("body").innerText();

        assert.doesNotMatch(bodyText, /failed to compile|application error/i);
      } finally {
        await browser.close();
      }
    },
  );
}
