import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

import { PAGES, THEMES, VIEWPORTS } from "./pages";

const SHOTS = path.resolve(__dirname, "../../../docs/screenshots");

// Every page, in both colour modes, at desktop and phone width: screenshot it, run axe on it,
// and check nothing makes the page scroll sideways.
for (const page of PAGES) {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      test(`${page.name} ${theme} ${viewport.name}px`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme, // the site starts from the system setting
          reducedMotion: "reduce", // finish the hero animation instantly so shots are stable
        });
        const tab = await context.newPage();
        await tab.goto(page.path);
        await tab.evaluate(() => document.fonts.ready);
        await expect(tab.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);

        const overflow = await tab.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);

        await tab.screenshot({
          path: path.join(SHOTS, `${page.name}-${theme}-${viewport.name}.png`),
          fullPage: true,
        });

        const results = await new AxeBuilder({ page: tab })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const bad = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          bad.map(
            (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
          ),
        ).toEqual([]);
        await context.close();
      });
    }
  }
}
