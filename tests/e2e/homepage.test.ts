import assert from "node:assert/strict";
import test from "node:test";

import { BASE_URL, isServerReachable, launchBrowser } from "./helpers.ts";

const reachable = await isServerReachable();

test(
  "homepage loads and renders the daily slate",
  { skip: !reachable && `no server reachable at ${BASE_URL}` },
  async () => {
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();
      const response = await page.goto(BASE_URL);

      assert.equal(response?.status(), 200);

      const bodyText = await page.locator("body").innerText();

      assert.match(bodyText, /TrueLine/i);
      assert.doesNotMatch(bodyText, /failed to compile|application error/i);
    } finally {
      await browser.close();
    }
  },
);
