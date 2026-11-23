import { test } from "@playwright/test";
import path from "node:path";

const SHOTS = path.resolve(__dirname, "../../../docs/screenshots");

// One frame from the middle of the home demo loop, per theme and width. The loop starts about
// 1.7 s after load; about 8.6 s after load the second sentence and its chip are arriving.
// (The end-state frames are the ordinary home screenshots, taken with reduced motion.)
for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`home mid-loop ${theme} ${width}px`, async ({ browser }) => {
      test.setTimeout(30_000);
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(8600);
      await page.screenshot({ path: path.join(SHOTS, `home-loop-mid-${theme}-${width}.png`) });
      await context.close();
    });
  }
}
